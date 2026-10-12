import type { IncomingMessage, ServerResponse } from 'node:http';

export default async function handler(req: IncomingMessage & { query?: any }, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  try {
    const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const paymentId = url.searchParams.get('paymentId') || (req.query && req.query.paymentId);

    if (!paymentId) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, message: 'paymentId é obrigatório.' }));
      return;
    }

    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.VITE_MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, message: 'MERCADO_PAGO_ACCESS_TOKEN não configurado.' }));
      return;
    }

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data: any = await mpRes.json();

    if (!mpRes.ok) {
      res.statusCode = mpRes.status;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, message: data.message || 'Erro ao consultar pagamento.', details: data }));
      return;
    }

    const isApproved = data.status === 'approved';

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: true,
      paymentId: data.id,
      status: data.status,
      statusDetail: data.status_detail,
      isApproved,
      amount: data.transaction_amount,
      payerEmail: data.payer?.email,
      dateApproved: data.date_approved,
    }));
  } catch (error: any) {
    console.error('[API Check Pix Status Exception]', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: false,
      message: error?.message || 'Erro interno ao consultar status do Pix.',
    }));
  }
}
