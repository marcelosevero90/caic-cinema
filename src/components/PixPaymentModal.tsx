import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  QrCode,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Crown,
  Smartphone,
} from 'lucide-react';
import { mercadoPagoService, type CreatePixResponse } from '../services/mercadoPagoService';
import { userService } from '../services/userService';

interface PixPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  planType: 'individual' | 'family';
  billingCycle: 'monthly' | 'annual';
  onSuccess?: () => void;
}

export const PixPaymentModal: React.FC<PixPaymentModalProps> = ({
  isOpen,
  onClose,
  planType,
  billingCycle,
  onSuccess,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [pixData, setPixData] = useState<CreatePixResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isKeyError, setIsKeyError] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isApproved, setIsApproved] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(30 * 60); // 30 minutos em segundos

  const pollIntervalRef = useRef<any>(null);
  const timerIntervalRef = useRef<any>(null);

  const isFamily = planType === 'family';
  const price = isFamily
    ? (billingCycle === 'annual' ? 29.90 : 9.90)
    : (billingCycle === 'annual' ? 19.90 : 5.90);

  const planTitle = isFamily
    ? (billingCycle === 'annual' ? 'Plano Família Anual' : 'Plano Família Mensal')
    : (billingCycle === 'annual' ? 'Plano Individual Anual' : 'Plano Individual Mensal');

  const priceLabel = `R$ ${price.toFixed(2).replace('.', ',')}`;
  const periodLabel = billingCycle === 'annual' ? '/ano' : '/mês';

  // Inicia a geração do Pix
  const generatePix = async () => {
    setLoading(true);
    setErrorMessage(null);
    setIsKeyError(false);
    setIsApproved(false);

    const account = userService.getAccount();
    const userEmail = account.email && account.email !== 'visitante@caic.com.br'
      ? account.email
      : (localStorage.getItem('CAIC_LAST_EMAIL') || 'assinante@caiccinema.com.br');
    const userName = account.name || 'Assinante CAIC';

    try {
      const response = await mercadoPagoService.createPixPayment({
        amount: price,
        description: `CAIC Cinema - ${planTitle}`,
        email: userEmail,
        name: userName,
        planType,
        billingCycle,
      });

      if (response.success && response.paymentId) {
        setPixData(response);
        setCountdown(30 * 60);
        try { localStorage.setItem('CAIC_PENDING_PIX_ID', String(response.paymentId)); } catch {}
      } else {
        const msg = response.message || 'Erro ao gerar o código Pix no Mercado Pago.';
        setErrorMessage(msg);
        if (
          msg.toLowerCase().includes('collector user without key') ||
          msg.toLowerCase().includes('chave pix') ||
          JSON.stringify(response.details || '').includes('13253')
        ) {
          setIsKeyError(true);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro de conexão ao gerar o Pix.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      generatePix();
    } else {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      setPixData(null);
      setIsApproved(false);
      setErrorMessage(null);
    }
  }, [isOpen, planType, billingCycle]);

  // Timer regressivo de expiração
  useEffect(() => {
    if (!isOpen || !pixData || isApproved) return;

    timerIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isOpen, pixData, isApproved]);

  // Polling automático a cada 3 segundos
  useEffect(() => {
    if (!isOpen || !pixData?.paymentId || isApproved) return;

    const checkStatus = async () => {
      if (!pixData.paymentId) return;
      try {
        const res = await mercadoPagoService.checkPixStatus(pixData.paymentId);
        if (res.success && res.isApproved) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setIsApproved(true);

          // Efetiva o pagamento e ativa a assinatura no UserService
          userService.confirmPixPayment(pixData.paymentId, planType, billingCycle, price);

          if (onSuccess) onSuccess();

          setTimeout(() => {
            onClose();
          }, 3000);
        }
      } catch (e) {
        console.warn('[Pix Polling Check Warning]', e);
      }
    };

    pollIntervalRef.current = setInterval(checkStatus, 3000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isOpen, pixData?.paymentId, isApproved]);

  const handleCopyCode = async () => {
    if (!pixData?.qrCode) return;
    try {
      await navigator.clipboard.writeText(pixData.qrCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = pixData.qrCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/95 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-950 dark:text-white">
                  Pagamento via Pix
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800">
                  Instantâneo
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Mercado Pago Checkout Transparente
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Resumo do Plano */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-50 to-indigo-50 dark:from-slate-800/60 dark:to-slate-850/60 border border-cyan-100 dark:border-slate-700/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-cyan-700 dark:text-cyan-400 tracking-wider">
                Assinatura Selecionada
              </span>
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 mt-0.5">
                {isFamily ? <Crown className="w-4 h-4 text-amber-500" /> : <Sparkles className="w-4 h-4 text-cyan-500" />}
                <span>{planTitle}</span>
              </h4>
            </div>
            <div className="text-right">
              <span className="text-lg font-black text-slate-950 dark:text-white">
                {priceLabel}
              </span>
              <span className="text-xs text-slate-500 ml-0.5">{periodLabel}</span>
            </div>
          </div>

          {/* Estado: Carregando */}
          {loading && (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Gerando QR Code Pix Seguro...
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Conectando à API do Mercado Pago para gerar seu QR Code dinâmico com confirmação automática.
              </p>
            </div>
          )}

          {/* Estado: Pagamento Aprovado com Sucesso */}
          {isApproved && (
            <div className="py-8 text-center space-y-4 animate-fadeIn">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-lg border border-emerald-300 dark:border-emerald-700">
                <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
              </div>
              <div>
                <h4 className="text-lg font-black text-slate-950 dark:text-white">
                  🎉 Pagamento Aprovado com Sucesso!
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-sm mx-auto">
                  Sua assinatura do <strong>{planTitle}</strong> foi ativada instantaneamente.
                  Acesso liberado a todos os filmes e à IA!
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                <Sparkles className="w-4 h-4" />
                <span>Atualizando seu acesso...</span>
              </div>
            </div>
          )}

          {/* Estado: Erro */}
          {!loading && !isApproved && errorMessage && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Não foi possível gerar a cobrança Pix</span>
                </div>
                <p className="leading-relaxed">{errorMessage}</p>
              </div>

              {/* Alerta Específico se a Conta não tiver Chave Pix */}
              {isKeyError && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-xs text-amber-950 dark:text-amber-200 space-y-3">
                  <div className="flex items-center gap-2 font-extrabold text-amber-900 dark:text-amber-100">
                    <Smartphone className="w-4 h-4 text-amber-600" />
                    <span>Como Resolver (Requisito do Mercado Pago):</span>
                  </div>
                  <p className="leading-relaxed text-[11px]">
                    Para que o Mercado Pago emita QR Codes Dinâmicos de cobrança, a sua conta de vendedor precisa ter <strong>pelo menos 1 Chave Pix cadastrada</strong> na carteira.
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-amber-900/90 dark:text-amber-200/90 font-medium pl-1">
                    <li>Abra o aplicativo do <strong>Mercado Pago</strong> no celular (ou acesse <em>mercadopago.com.br</em>).</li>
                    <li>Acesse o menu <strong>Área Pix</strong> &gt; <strong>Minhas Chaves</strong>.</li>
                    <li>Cadastre qualquer chave (ex: <strong>Chave Aleatória</strong> ou CPF).</li>
                    <li>Pronto! Volte aqui e clique no botão abaixo para gerar o QR Code.</li>
                  </ol>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={generatePix}
                  className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Tentar Novamente</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  Voltar
                </button>
              </div>
            </div>
          )}

          {/* Estado: QR Code Gerado com Sucesso */}
          {!loading && !isApproved && pixData && (
            <div className="space-y-4 animate-fadeIn">
              {/* QR Code Imagem */}
              <div className="text-center space-y-3">
                <div className="relative inline-block p-3 rounded-2xl bg-white border-2 border-slate-200 shadow-md">
                  {pixData.qrCodeBase64 ? (
                    <img
                      src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                      alt="QR Code Pix Mercado Pago"
                      className="w-52 h-52 sm:w-60 sm:h-60 object-contain mx-auto rounded-lg"
                    />
                  ) : (
                    <div className="w-52 h-52 sm:w-60 sm:h-60 flex items-center justify-center bg-slate-50 text-slate-400">
                      <QrCode className="w-16 h-16 opacity-40" />
                    </div>
                  )}
                </div>

                {/* Timer e Status de Polling */}
                <div className="flex items-center justify-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>Expira em: <strong>{formatTime(countdown)}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>Aguardando pagamento...</span>
                  </div>
                </div>
              </div>

              {/* Botão Pix Copia e Cola */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Pix Copia e Cola:
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Cole no app de qualquer banco
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={pixData.qrCode || ''}
                    className="w-full pl-3 pr-28 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-400 font-mono truncate focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className={`absolute right-1 top-1 bottom-1 px-3.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                      copied
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm shadow-cyan-600/20'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Código</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Instruções de Pagamento */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                  <Smartphone className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Passo a passo rápido:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[11px] pl-1 leading-relaxed">
                  <li>Abra o aplicativo do seu banco (Nubank, Itaú, Inter, Bradesco, etc.).</li>
                  <li>Escolha a opção <strong>Pix</strong> e selecione <strong>Ler QR Code</strong> ou <strong>Pix Copia e Cola</strong>.</li>
                  <li>Confirme o pagamento de <strong>{priceLabel}</strong> para o CAIC Cinema.</li>
                  <li>Assim que você pagar, esta tela confirmará <strong>automaticamente</strong> em poucos segundos!</li>
                </ol>
              </div>

              {/* Selo de Segurança */}
              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 pt-1">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Transação 100% segura processada pelo Mercado Pago</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
