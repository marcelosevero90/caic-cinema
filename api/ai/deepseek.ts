import type { IncomingMessage, ServerResponse } from 'node:http';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  let body = '';
  for await (const chunk of req) {
    body += chunk;
  }

  try {
    const payload = JSON.parse(body || '{}');
    const apiKey =
      process.env.DEEPSEEK_API_KEY ||
      process.env.VITE_DEEPSEEK_API_KEY ||
      '';

    if (!apiKey) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'DEEPSEEK_API_KEY não configurada nas variáveis de ambiente.' }));
      return;
    }

    const dsResponse = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: payload.model || 'deepseek-chat',
        messages: payload.messages || [],
        temperature: payload.temperature ?? 0.7,
        max_tokens: payload.max_tokens ?? 1800,
        response_format: payload.response_format,
      }),
    });

    const data = await dsResponse.json();
    res.statusCode = dsResponse.status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
  } catch (error: any) {
    console.error('Erro no proxy DeepSeek:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: error.message || 'Erro interno no proxy DeepSeek' }));
  }
}
