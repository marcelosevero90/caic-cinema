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

class MercadoPagoService {
  /**
   * Cria uma nova cobrança Pix Dinâmico no Mercado Pago via /api/payments/create-pix
   */
  public async createPixPayment(params: CreatePixParams): Promise<CreatePixResponse> {
    try {
      const response = await fetch('/api/payments/create-pix', {
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
      const response = await fetch(`/api/payments/status?paymentId=${encodeURIComponent(paymentId)}`, {
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
}

export const mercadoPagoService = new MercadoPagoService();
