/**
 * Configuração de URL base para chamadas de API.
 * Em ambiente Web nativo (Vercel ou Vite dev), as rotas são relativas ('/api/...').
 * Em ambiente Android (Capacitor nativo no Celular ou Box TV), o app roda localmente (localhost),
 * portanto direciona as requisições para a API de produção da Vercel ('https://caic-cinema.vercel.app').
 */

export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return '';

  // Se houver uma variável de ambiente explícita
  if (import.meta.env.VITE_API_BASE_URL) {
    return (import.meta.env.VITE_API_BASE_URL as string).replace(/\/+$/, '');
  }

  // Detecta se está executando dentro de container nativo Capacitor (Android/iOS)
  const isCapacitor =
    Boolean((window as any).Capacitor) ||
    window.location.protocol === 'capacitor:' ||
    (window.location.hostname === 'localhost' && !window.location.port) ||
    (window.location.hostname === '127.0.0.1' && !window.location.port);

  if (isCapacitor) {
    return 'https://caic-cinema.vercel.app';
  }

  return '';
}

export function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}
