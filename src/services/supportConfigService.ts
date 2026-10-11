export interface SupportConfig {
  whatsappPhone: string;
  whatsappMessage: string;
  supportEmail: string;
  supportHoursText: string;
  enabled: boolean;
}

const STORAGE_KEY = 'CAIC_SUPPORT_CONFIG';

const DEFAULT_SUPPORT_CONFIG: SupportConfig = {
  whatsappPhone: '49 9 88595465',
  whatsappMessage: 'Olá! Preciso de suporte com o aplicativo CAIC Cinema.',
  supportEmail: 'caic.cinema.app@gmail.com',
  supportHoursText: 'Atendimento via WhatsApp e E-mail todos os dias',
  enabled: true,
};

type SupportListener = (config: SupportConfig) => void;
const listeners: Set<SupportListener> = new Set();

export const supportConfigService = {
  getConfig(): SupportConfig {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...DEFAULT_SUPPORT_CONFIG,
          ...parsed,
        };
      }
    } catch (e) {
      console.warn('Erro ao carregar suporte do localStorage:', e);
    }
    return { ...DEFAULT_SUPPORT_CONFIG };
  },

  saveConfig(newConfig: Partial<SupportConfig>): SupportConfig {
    const current = this.getConfig();
    const updated: SupportConfig = {
      ...current,
      ...newConfig,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Erro ao salvar suporte no localStorage:', e);
    }
    listeners.forEach((listener) => {
      try {
        listener(updated);
      } catch (err) {
        console.error('Erro no listener de suporte:', err);
      }
    });
    return updated;
  },

  resetDefaults(): SupportConfig {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn(e);
    }
    listeners.forEach((listener) => listener({ ...DEFAULT_SUPPORT_CONFIG }));
    return { ...DEFAULT_SUPPORT_CONFIG };
  },

  subscribe(listener: SupportListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  getCleanWhatsAppDigits(phone: string): string {
    const digitsOnly = phone.replace(/\D/g, '');
    if (!digitsOnly) return '5549988595465';

    // Se tiver 10 ou 11 dígitos (ex: 49988595465), adiciona 55 (Brasil)
    if (digitsOnly.length === 10 || digitsOnly.length === 11) {
      return `55${digitsOnly}`;
    }
    return digitsOnly;
  },

  formatDisplayPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (!digits) return phone;

    // Se tiver 10 dígitos (DDD + 8 dígitos)
    if (digits.length === 10) {
      const ddd = digits.slice(0, 2);
      const part1 = digits.slice(2, 6);
      const part2 = digits.slice(6);
      return `(${ddd}) ${part1}-${part2}`;
    }

    // Se tiver 11 dígitos (DDD + 9 dígitos)
    if (digits.length === 11) {
      const ddd = digits.slice(0, 2);
      const part1 = digits.slice(2, 7);
      const part2 = digits.slice(7);
      return `(${ddd}) ${part1}-${part2}`;
    }

    // Se tiver 13 dígitos (DDI 55 + DDD + 9 dígitos)
    if (digits.length === 13 && digits.startsWith('55')) {
      const ddd = digits.slice(2, 4);
      const part1 = digits.slice(4, 9);
      const part2 = digits.slice(9);
      return `+55 (${ddd}) ${part1}-${part2}`;
    }

    return phone;
  },

  getWhatsAppUrl(phone?: string, message?: string): string {
    const current = this.getConfig();
    const targetPhone = phone || current.whatsappPhone;
    const targetMsg = message !== undefined ? message : current.whatsappMessage;
    const digits = this.getCleanWhatsAppDigits(targetPhone);
    const encoded = encodeURIComponent(targetMsg);
    return `https://wa.me/${digits}?text=${encoded}`;
  },

  getEmailUrl(email?: string, subject?: string): string {
    const current = this.getConfig();
    const targetEmail = email || current.supportEmail;
    const targetSubject = subject || 'Suporte CAIC Cinema';
    return `mailto:${targetEmail}?subject=${encodeURIComponent(targetSubject)}`;
  },
};
