import React, { useState, useEffect, useRef } from 'react';
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  KeyRound,
} from 'lucide-react';
import { emailVerificationService } from '../services/emailVerificationService';

interface EmailVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  userName: string;
  initialSandboxCode?: string;
  onVerificationSuccess: () => void;
}

export const EmailVerificationModal: React.FC<EmailVerificationModalProps> = ({
  isOpen,
  onClose,
  email,
  userName,
  initialSandboxCode,
  onVerificationSuccess,
}) => {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [resendCountdown, setResendCountdown] = useState(60);
  const [sandboxCode, setSandboxCode] = useState<string | undefined>(initialSandboxCode);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (initialSandboxCode) {
      setSandboxCode(initialSandboxCode);
    }
  }, [initialSandboxCode]);

  useEffect(() => {
    if (isOpen) {
      setDigits(['', '', '', '', '', '']);
      setErrorMsg('');
      setSuccessMsg('');
      setResendCountdown(60);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 150);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, resendCountdown]);

  if (!isOpen) return null;

  const maskEmail = (val: string) => {
    if (!val) return '';
    const parts = val.split('@');
    if (parts.length !== 2) return val;
    const name = parts[0];
    const domain = parts[1];
    const maskedName = name.length > 2 ? `${name.slice(0, 2)}***${name.slice(-1)}` : `${name}***`;
    return `${maskedName}@${domain}`;
  };

  const handleDigitChange = (index: number, value: string) => {
    setErrorMsg('');
    const clean = value.replace(/\D/g, '');
    if (!clean) {
      const copy = [...digits];
      copy[index] = '';
      setDigits(copy);
      return;
    }

    const lastChar = clean[clean.length - 1];
    const copy = [...digits];
    copy[index] = lastChar;
    setDigits(copy);

    if (index < 5 && lastChar) {
      inputRefs.current[index + 1]?.focus();
    }

    const fullCode = copy.join('');
    if (fullCode.length === 6 && !copy.includes('')) {
      executeVerification(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasteData) return;

    const copy = [...digits];
    for (let i = 0; i < 6; i++) {
      copy[i] = pasteData[i] || '';
    }
    setDigits(copy);

    if (pasteData.length === 6) {
      inputRefs.current[5]?.focus();
      executeVerification(pasteData);
    } else {
      const nextIdx = Math.min(pasteData.length, 5);
      inputRefs.current[nextIdx]?.focus();
    }
  };

  const fillSandboxCode = () => {
    if (!sandboxCode) return;
    const chars = sandboxCode.split('').slice(0, 6);
    setDigits(chars);
    executeVerification(sandboxCode);
  };

  const executeVerification = (codeToVerify?: string) => {
    const code = codeToVerify || digits.join('');
    if (code.length !== 6) {
      setErrorMsg('Por favor, informe todos os 6 dígitos do código.');
      return;
    }

    setIsVerifying(true);
    setErrorMsg('');

    try {
      const res = emailVerificationService.verifyCode(email, code);

      if (res.success) {
        setSuccessMsg('E-mail confirmado com sucesso! Ativando seus 7 Dias Grátis...');
        setTimeout(() => {
          onVerificationSuccess();
          onClose();
        }, 1200);
      } else {
        setErrorMsg(res.message);
      }
    } catch {
      setErrorMsg('Erro ao validar código. Tente novamente.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCountdown > 0 || isResending) return;

    setIsResending(true);
    setErrorMsg('');

    try {
      const res = await emailVerificationService.sendVerificationCode(email, userName);
      if (res.success) {
        setResendCountdown(60);
        if (res.sandboxCode) {
          setSandboxCode(res.sandboxCode);
        }
        setSuccessMsg(res.message);
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setErrorMsg(res.message || 'Erro ao reenviar código.');
      }
    } catch {
      setErrorMsg('Falha de conexão ao reenviar código.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8">
        
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 p-0.5 shadow-lg shadow-cyan-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[14px] flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <Mail className="w-7 h-7" />
            </div>
          </div>

          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800">
              Validação de Segurança
            </span>
            <h3 className="text-xl font-black text-slate-950 dark:text-white mt-1.5">
              Confirme seu E-mail
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-xs mx-auto">
              Enviamos um código de 6 dígitos para{' '}
              <strong className="text-slate-900 dark:text-white font-semibold">
                {maskEmail(email)}
              </strong>
            </p>
          </div>
        </div>

        {/* Banner Modo Sandbox (para facilitar testes locais sem bloqueios) */}
        {sandboxCode && (
          <div className="mt-4 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/80 text-amber-900 dark:text-amber-200 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Ambiente de Testes / Sandbox:
              </span>
              <span className="font-mono font-black text-sm tracking-wider px-2 py-0.5 bg-amber-200 dark:bg-amber-900 rounded-lg">
                {sandboxCode}
              </span>
            </div>
            <button
              type="button"
              onClick={fillSandboxCode}
              className="w-full py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] shadow-sm transition flex items-center justify-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Preencher Código de Teste Automaticamente</span>
            </button>
          </div>
        )}

        {/* Inputs de 6 Dígitos */}
        <div className="mt-6">
          <div className="flex items-center justify-center gap-2 sm:gap-2.5" onPaste={handlePaste}>
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => { inputRefs.current[idx] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className={`w-11 h-13 sm:w-12 sm:h-14 text-center font-mono text-2xl font-black rounded-2xl border-2 transition outline-none ${
                  digit
                    ? 'border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/30 text-slate-950 dark:text-white shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:border-cyan-500'
                }`}
              />
            ))}
          </div>

          {/* Mensagens de Erro e Sucesso */}
          {errorMsg && (
            <div className="mt-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Botão de Verificação Manual */}
        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={() => executeVerification()}
            disabled={isVerifying || digits.includes('')}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs tracking-wide shadow-lg shadow-cyan-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Validando Código...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Confirmar e Ativar 7 Dias Grátis</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>

          {/* Reenviar Código */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={handleResendCode}
              disabled={resendCountdown > 0 || isResending}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {resendCountdown > 0 ? (
                <span>Reenviar código em <strong>{resendCountdown}s</strong></span>
              ) : isResending ? (
                <span className="flex items-center justify-center gap-1.5">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Reenviando...
                </span>
              ) : (
                <span>Não recebeu o código? <strong>Clique para reenviar</strong></span>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
