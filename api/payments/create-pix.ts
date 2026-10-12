import type { IncomingMessage, ServerResponse } from 'node:http';

interface CreatePixBody {
  amount: number;
  description: string;
  email: string;
  name: string;
  planType?: 'individual' | 'family';
  billingCycle?: 'monthly' | 'annual';
}

export default async function handler(req: IncomingMessage & { body?: any; query?: any }, res: ServerResponse) {
  // Configura cabeçalhos de CORS e JSON
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, message: 'Método não permitido. Use POST.' }));
    return;
  }

  try {
    // Lê o corpo da requisição (compatível com Vercel Serverless e Node nativo)
    let bodyData = req.body;
    if (!bodyData) {
      const buffers: Buffer[] = [];
      for await (const chunk of req) {
        buffers.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      const raw = Buffer.concat(buffers).toString('utf-8');
      bodyData = raw ? JSON.parse(raw) : {};
    }

    const { amount, description, email, name, planType, billingCycle }: CreatePixBody = bodyData;

    if (!amount || !email) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, message: 'Valor (amount) e e-mail são obrigatórios.' }));
      return;
    }

    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.VITE_MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        success: false,
        message: 'MERCADO_PAGO_ACCESS_TOKEN não configurado no ambiente da Vercel ou .env.',
      }));
      return;
    }

    const nameParts = (name || 'Assinante CAIC').trim().split(' ');
    const firstName = nameParts[0] || 'Assinante';
    const lastName = nameParts.slice(1).join(' ') || 'CAIC';

    // Cria a transação Pix no Mercado Pago
    const idempotencyKey = `caic-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const mpPayload = {
      transaction_amount: Number(amount),
      description: description || `Assinatura CAIC Cinema (${planType || 'Plano'} - ${billingCycle || 'mensal'})`,
      payment_method_id: 'pix',
      payer: {
        email: email.trim().toLowerCase(),
        first_name: firstName,
        last_name: lastName,
      },
    };

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(mpPayload),
    });

    const mpData: any = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error('[Mercado Pago Pix Error]', mpData);

      let userFriendlyMessage = mpData.message || 'Erro ao gerar cobrança Pix no Mercado Pago.';
      if (mpData.message?.includes('Collector user without key enabled for QR render')) {
        userFriendlyMessage =
          'Sua conta do Mercado Pago precisa ter pelo menos 1 Chave Pix cadastrada para emitir cobranças. Abra o app do Mercado Pago e cadastre uma Chave Aleatória ou CPF no menu Pix.';
      }

      res.statusCode = mpResponse.status || 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        success: false,
        message: userFriendlyMessage,
        details: mpData,
      }));
      return;
    }

    const qrCode = mpData.point_of_interaction?.transaction_data?.qr_code;
    const qrCodeBase64 = mpData.point_of_interaction?.transaction_data?.qr_code_base64;
    const ticketUrl = mpData.point_of_interaction?.transaction_data?.ticket_url;
    const expirationDate = mpData.date_of_expiration;

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: true,
      paymentId: mpData.id,
      status: mpData.status,
      statusDetail: mpData.status_detail,
      amount: mpData.transaction_amount,
      qrCode,
      qrCodeBase64,
      ticketUrl,
      expirationDate,
    }));
  } catch (error: any) {
    console.error('[API Create Pix Exception]', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: false,
      message: error?.message || 'Erro interno ao processar Pix.',
    }));
  }
}
