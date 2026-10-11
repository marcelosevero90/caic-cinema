import type { IncomingMessage, ServerResponse } from 'node:http';

export default async function handler(req: IncomingMessage & { body?: any; query?: any }, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  // Mercado Pago pode enviar webhooks via GET (validação) ou POST (notificação de evento)
  if (req.method === 'GET') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ status: 'ok', service: 'CAIC Cinema Mercado Pago Webhook' }));
    return;
  }

  try {
    let bodyData = req.body;
    if (!bodyData) {
      const buffers: Buffer[] = [];
      for await (const chunk of req) {
        buffers.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      const raw = Buffer.concat(buffers).toString('utf-8');
      bodyData = raw ? JSON.parse(raw) : {};
    }

    const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const queryId = url.searchParams.get('data.id') || url.searchParams.get('id');
    const paymentId = queryId || bodyData?.data?.id || bodyData?.id;
    const action = bodyData?.action || url.searchParams.get('topic') || url.searchParams.get('type');

    console.log('[Mercado Pago Webhook Received]', { paymentId, action });

    if (paymentId) {
      const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.VITE_MERCADO_PAGO_ACCESS_TOKEN;
      if (accessToken) {
        try {
          const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${accessToken}` },
          });
          if (mpRes.ok) {
            const paymentDetails = await mpRes.json();
            console.log('[Mercado Pago Webhook Payment Verified]', {
              id: paymentDetails.id,
              status: paymentDetails.status,
              email: paymentDetails.payer?.email,
              amount: paymentDetails.transaction_amount,
            });
          }
        } catch (verifyErr) {
          console.warn('[Mercado Pago Webhook Verification Warning]', verifyErr);
        }
      }
    }

    // Mercado Pago exige resposta rápida 200/201 para confirmar o recebimento
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ received: true, paymentId }));
  } catch (err: any) {
    console.error('[Mercado Pago Webhook Handler Error]', err);
    res.statusCode = 200; // Sempre retorna 200 para não travar reenvios de loop do webhook
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ received: true, error: err?.message }));
  }
}
