/**
 * Serviço de Verificação de E-mail com Token (OTP) via Resend
 * Baseado na arquitetura do AppServiços com suporte a Sandbox e Envio Real
 */

const RESEND_API_KEY = (import.meta as any).env?.VITE_RESEND_API_KEY || '';
const SENDER_EMAIL = (import.meta as any).env?.VITE_RESEND_FROM_EMAIL || 'CAIC Streaming <onboarding@resend.dev>';
const STORAGE_VERIF_KEY = 'CAIC_EMAIL_VERIFICATIONS';

export interface VerificationRecord {
  email: string;
  code: string;
  expiresAt: number; // timestamp
  name: string;
  verified: boolean;
}

export function createCAICVerificationEmailHtml(name: string, code: string): string {
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
          <!-- Cabeçalho CAIC -->
          <tr>
            <td style="background: linear-gradient(135deg, #0891b2 0%, #4f46e5 100%); padding: 36px 32px; text-align: center;">
              <div style="font-size: 38px; margin-bottom: 8px;">🎬✨</div>
              <h1 style="color: #ffffff; font-size: 26px; margin: 0; font-weight: 900; letter-spacing: -0.5px;">
                CAIC - Cinema &amp; IA
              </h1>
              <p style="color: #cffafe; font-size: 13px; margin: 6px 0 0 0; font-weight: 500;">
                Sua Nova Experiência de Streaming Inteligente
              </p>
            </td>
          </tr>

          <!-- Conteúdo -->
          <tr>
            <td style="padding: 36px 32px;">
              <h2 style="color: #0f172a; font-size: 19px; margin: 0 0 12px 0; font-weight: 700;">
                Olá, ${name || 'seja bem-vindo(a)'}! 👋
              </h2>
              <p style="color: #475569; font-size: 14px; line-height: 22px; margin: 0 0 24px 0;">
                Estamos felizes em ter você no <strong>CAIC</strong>! Para ativar seu acesso e liberar seus <strong>7 Dias Grátis</strong> com curadoria em tempo real do Gemini 3.8 Flash, utilize o código de validação de 6 dígitos abaixo:
              </p>

              <!-- Caixa do Código -->
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

          <!-- Rodapé -->
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

class EmailVerificationService {
  private getStoredTokens(): Record<string, VerificationRecord> {
    try {
      const raw = localStorage.getItem(STORAGE_VERIF_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private saveStoredTokens(tokens: Record<string, VerificationRecord>): void {
    try {
      localStorage.setItem(STORAGE_VERIF_KEY, JSON.stringify(tokens));
    } catch {
      // ignore
    }
  }

  /**
   * Envia o código de verificação para o e-mail informado
   */
  public async sendVerificationCode(email: string, name: string): Promise<{
    success: boolean;
    message: string;
    sandboxCode?: string;
    delivered?: boolean;
  }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim() || 'Usuário CAIC';

    // Gera código numérico de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 30 * 60 * 1000; // 30 minutos

    // Salva localmente para conferência
    const stored = this.getStoredTokens();
    stored[cleanEmail] = {
      email: cleanEmail,
      code,
      expiresAt,
      name: cleanName,
      verified: false,
    };
    this.saveStoredTokens(stored);

    // 1. Tenta enviar pela API local do Vite (/api/auth/send-verification)
    try {
      const res = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, name: cleanName, code })
      });

      if (res.ok) {
        const data = await res.json();
        return {
          success: true,
          message: data.message || 'Código de verificação enviado!',
          sandboxCode: data.sandboxCode || code,
          delivered: data.delivered,
        };
      }
    } catch (e) {
      console.warn('API local de e-mail indisponível, usando envio direto/simulado:', e);
    }

    // 2. Se a rota do Vite não respondeu (ex: build estático), tenta chamada direta à API do Resend
    try {
      const html = createCAICVerificationEmailHtml(cleanName, code);
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: SENDER_EMAIL,
          to: [cleanEmail],
          subject: `Código de Validação CAIC: ${code}`,
          html,
        }),
      });

      if (resendRes.ok) {
        return {
          success: true,
          message: 'Código enviado com sucesso para o seu e-mail!',
          delivered: true,
        };
      } else {
        const errorData = await resendRes.json().catch(() => ({}));
        console.info('[Resend Info]', errorData);
        // Se houver restrição sandbox do Resend (domínio teste só envia para email da conta Resend),
        // fornecemos o sandboxCode para nunca bloquear o usuário em ambiente local/demonstração.
        return {
          success: true,
          message: 'Código gerado com sucesso! (Modo Demonstração / Sandbox)',
          sandboxCode: code,
          delivered: false,
        };
      }
    } catch {
      // Fallback gracioso garantido para testes locais
      return {
        success: true,
        message: 'Código gerado com sucesso! (Modo Demonstração)',
        sandboxCode: code,
        delivered: false,
      };
    }
  }

  /**
   * Valida o código digitado pelo usuário
   */
  public verifyCode(email: string, code: string): { success: boolean; message: string } {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    const stored = this.getStoredTokens();
    const record = stored[cleanEmail];

    if (!record) {
      return { success: false, message: 'Nenhum código pendente para este e-mail. Solicite um novo código.' };
    }

    if (Date.now() > record.expiresAt) {
      return { success: false, message: 'O código de confirmação expirou. Por favor, solicite um novo código.' };
    }

    if (record.code !== cleanCode) {
      return { success: false, message: 'Código incorreto. Por favor, verifique os 6 dígitos digitados.' };
    }

    record.verified = true;
    this.saveStoredTokens(stored);
    return { success: true, message: 'E-mail validado com sucesso!' };
  }
}

export const emailVerificationService = new EmailVerificationService();
