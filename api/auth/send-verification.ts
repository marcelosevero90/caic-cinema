import type { IncomingMessage, ServerResponse } from 'node:http';
import nodemailer from 'nodemailer';

const GMAIL_USER = process.env.GMAIL_USER || 'caic.cinema.app@gmail.com';
const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD || Buffer.from('Z2huanRhbGlwa2R4a3p3dQ==', 'base64').toString('utf-8');

function getVerificationHtml(name: string, code: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirme seu cadastro - CAIC Streaming</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #020617; color: #0f172a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #020617; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background: linear-gradient(135deg, #0891b2 0%, #4f46e5 100%); padding: 36px 32px; text-align: center;">
              <div style="font-size: 38px; margin-bottom: 8px;">🎬✨</div>
              <h1 style="color: #ffffff; font-size: 26px; margin: 0; font-weight: 900; letter-spacing: -0.5px;">
                CAIC - Cinema &amp; IA
              </h1>
              <p style="color: #cffafe; font-size: 13px; margin: 6px 0 0 0; font-weight: 500;">
                Streaming Inteligente Multiplataforma
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 36px 32px;">
              <h2 style="color: #0f172a; font-size: 19px; margin: 0 0 12px 0; font-weight: 700;">
                Olá, ${name || 'seja bem-vindo(a)'}! 👋
              </h2>
              <p style="color: #475569; font-size: 14px; line-height: 22px; margin: 0 0 24px 0;">
                Estamos felizes em ter você no <strong>CAIC</strong>! Para confirmar seu e-mail e ativar seus <strong>7 Dias Grátis</strong> com curadoria em tempo real de Inteligência Artificial e mais de 800 filmes completos, utilize o código de 6 dígitos abaixo:
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center" style="background-color: #ecfeff; border: 2px dashed #06b6d4; border-radius: 16px; padding: 24px 16px;">
                    <div style="color: #0891b2; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 800; margin-bottom: 8px;">
                      Seu Código de Confirmação CAIC
                    </div>
                    <div style="color: #0e7490; font-size: 36px; font-weight: 900; letter-spacing: 8px; font-family: monospace;">
                      ${code}
                    </div>
                    <div style="color: #64748b; font-size: 11px; margin-top: 8px; font-weight: 600;">
                      Válido por 30 minutos
                    </div>
                  </td>
                </tr>
              </table>

              <p style="color: #64748b; font-size: 13px; line-height: 20px; margin: 0 0 16px 0;">
                Digite esse código no aplicativo para liberar a reprodução de filmes e todos os recursos de IA.
              </p>

              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 14px; border-radius: 8px;">
                <p style="color: #92400e; font-size: 12px; line-height: 18px; margin: 0;">
                  🔒 <strong>Segurança:</strong> Nunca compartilhe este código. Se você não solicitou este cadastro no CAIC, pode ignorar esta mensagem com total segurança.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 32px; text-align: center;">
              <p style="color: #94a3b8; font-size: 11px; line-height: 16px; margin: 0;">
                Este é um e-mail transacional automático enviado pela plataforma CAIC.<br>
                © ${new Date().getFullYear()} CAIC - Cinema &amp; IA. Todos os direitos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export default async function handler(req: IncomingMessage & { body?: any }, res: ServerResponse) {
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
    res.end(JSON.stringify({ success: false, message: 'Método não permitido.' }));
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

    const { email, name, code } = bodyData;

    if (!email || !code) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, message: 'E-mail e código são obrigatórios.' }));
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (name || 'Usuário').trim();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const html = getVerificationHtml(cleanName, code);

    const info = await transporter.sendMail({
      from: `"CAIC - Cinema & IA" <${GMAIL_USER}>`,
      to: cleanEmail,
      subject: `Código de Confirmação CAIC: ${code}`,
      html,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: true,
      delivered: true,
      messageId: info.messageId,
      message: 'Código de confirmação enviado com sucesso para o seu e-mail!'
    }));
  } catch (error: any) {
    console.error('Erro ao enviar e-mail de verificação via Gmail:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: false,
      delivered: false,
      error: error.message || 'Falha ao enviar e-mail.',
      message: 'Não foi possível enviar o e-mail de confirmação. Verifique seu endereço.'
    }));
  }
}
