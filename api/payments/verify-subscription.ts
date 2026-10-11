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
    const emailParam = (url.searchParams.get('email') || (req.query && req.query.email) || '').trim().toLowerCase();
    const paymentIdParam = (url.searchParams.get('paymentId') || (req.query && req.query.paymentId) || '').trim();

    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.VITE_MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, message: 'MERCADO_PAGO_ACCESS_TOKEN não configurado.' }));
      return;
    }

    // Busca os pagamentos mais recentes no Mercado Pago
    const mpRes = await fetch('https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&limit=30', {
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
      res.end(JSON.stringify({ success: false, message: data.message || 'Erro ao buscar pagamentos no Mercado Pago.', details: data }));
      return;
    }

    const results: any[] = Array.isArray(data.results) ? data.results : [];
    const now = Date.now();

    // Filtra pagamentos aprovados da plataforma CAIC Cinema
    const approvedPayments = results.filter((p: any) => {
      if (p.status !== 'approved') return false;
      const desc = (p.description || '').toLowerCase();
      const isCaic = desc.includes('caic cinema') || desc.includes('caic');
      return isCaic;
    });

    // 1. Tenta encontrar por paymentId específico se fornecido
    let matchedPayment = paymentIdParam ? approvedPayments.find((p) => String(p.id) === String(paymentIdParam)) : null;

    // 2. Tenta encontrar por e-mail ou external_reference
    if (!matchedPayment && emailParam) {
      matchedPayment = approvedPayments.find((p) => {
        const payerEmail = (p.payer?.email || '').toLowerCase();
        const extRef = (p.external_reference || '').toLowerCase();
        return payerEmail === emailParam || extRef.includes(emailParam);
      });
    }

    // 3. Se ainda não casou, pega o pagamento aprovado mais recente válido
    if (!matchedPayment && approvedPayments.length > 0) {
      matchedPayment = approvedPayments[0];
    }

    if (matchedPayment) {
      const isAnnual = (matchedPayment.description || '').toLowerCase().includes('anual') || matchedPayment.transaction_amount >= 19.0;
      const durationDays = isAnnual ? 365 : 30;
      const approvedDate = matchedPayment.date_approved ? new Date(matchedPayment.date_approved).getTime() : now;
      const expiresAtMs = approvedDate + durationDays * 86400000;
      const isActive = expiresAtMs > now;

      const isFamily = (matchedPayment.description || '').toLowerCase().includes('família') || (matchedPayment.description || '').toLowerCase().includes('familia');
      const planName = isFamily
        ? (isAnnual ? 'Plano Família Anual (R$ 29,90/ano)' : 'Plano Família Mensal (R$ 9,90/mês)')
        : (isAnnual ? 'Plano Individual Anual (R$ 19,90/ano)' : 'Plano Individual Mensal (R$ 5,90/mês)');

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        success: true,
        hasActiveSubscription: isActive,
        paymentId: matchedPayment.id,
        status: matchedPayment.status,
        amount: matchedPayment.transaction_amount,
        plan: planName,
        subscriptionPlan: isFamily ? 'family' : 'individual',
        billingCycle: isAnnual ? 'annual' : 'monthly',
        dateApproved: matchedPayment.date_approved,
        expiresAt: new Date(expiresAtMs).toISOString(),
        payerEmail: matchedPayment.payer?.email,
        description: matchedPayment.description,
      }));
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: true,
      hasActiveSubscription: false,
      message: 'Nenhum pagamento aprovado recente localizado.',
    }));
  } catch (error: any) {
    console.error('[API Verify Subscription Exception]', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: false,
      message: error?.message || 'Erro interno ao verificar assinatura.',
    }));
  }
}
