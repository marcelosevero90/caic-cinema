import { apiUrl } from './apiConfig';

export interface CreatePixParams {
  amount: number;
  description?: string;
  email: string;
  name?: string;
  planType?: 'individual' | 'family';
  billingCycle?: 'monthly' | 'annual';
}

export interface CreatePixResponse {
  success: boolean;
  paymentId?: number | string;
  status?: string;
  statusDetail?: string;
  amount?: number;
  qrCode?: string;
  qrCodeBase64?: string;
  ticketUrl?: string;
  expirationDate?: string;
  message?: string;
  details?: any;
}

export interface CheckPixStatusResponse {
  success: boolean;
  paymentId?: number | string;
  status?: string;
  statusDetail?: string;
  isApproved?: boolean;
  amount?: number;
  payerEmail?: string;
  dateApproved?: string;
  message?: string;
}

export interface VerifySubscriptionResponse {
  success: boolean;
  hasActiveSubscription?: boolean;
  paymentId?: number | string;
  status?: string;
  amount?: number;
  plan?: string;
  subscriptionPlan?: 'individual' | 'family';
  billingCycle?: 'monthly' | 'annual';
  dateApproved?: string;
  expiresAt?: string;
  payerEmail?: string;
  description?: string;
  message?: string;
}

class MercadoPagoService {
  /**
   * Cria uma nova cobrança Pix Dinâmico no Mercado Pago via /api/payments/create-pix
   */
  public async createPixPayment(params: CreatePixParams): Promise<CreatePixResponse> {
    try {
      const response = await fetch(apiUrl('/api/payments/create-pix'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const data: CreatePixResponse = await response.json();
      return data;
    } catch (error: any) {
      console.error('[MercadoPagoService createPixPayment error]', error);
      return {
        success: false,
        message: error?.message || 'Falha de conexão com o servidor ao gerar Pix.',
      };
    }
  }

  /**
   * Consulta o status da transação Pix (aprovado, pendente, etc.) via /api/payments/status
   */
  public async checkPixStatus(paymentId: string | number): Promise<CheckPixStatusResponse> {
    try {
      const response = await fetch(apiUrl(`/api/payments/status?paymentId=${encodeURIComponent(paymentId)}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data: CheckPixStatusResponse = await response.json();
      return data;
    } catch (error: any) {
      console.error('[MercadoPagoService checkPixStatus error]', error);
      return {
        success: false,
        message: error?.message || 'Falha ao consultar status do Pix.',
      };
    }
  }

  /**
   * Verifica se há assinatura ativa no Mercado Pago para o e-mail ou paymentId
   */
  public async verifySubscription(email?: string, paymentId?: string | number): Promise<VerifySubscriptionResponse> {
    try {
      const params = new URLSearchParams();
      if (email) params.set('email', email);
      if (paymentId) params.set('paymentId', String(paymentId));
      const response = await fetch(apiUrl(`/api/payments/verify-subscription?${params.toString()}`));
      const data: VerifySubscriptionResponse = await response.json();
      return data;
    } catch (error: any) {
      console.error('[MercadoPagoService verifySubscription error]', error);
      return {
        success: false,
        message: error?.message || 'Falha ao verificar assinatura.',
      };
    }
  }
}

export const mercadoPagoService = new MercadoPagoService();
