import React, { useState } from 'react';
import { X, Smartphone, Copy, Check, Wifi, ExternalLink, Globe, ShieldCheck, Edit3 } from 'lucide-react';

interface MobileAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  networkUrl?: string;
  externalUrl?: string;
  onUpdateExternalUrl?: (url: string) => void;
}

export const MobileAccessModal: React.FC<MobileAccessModalProps> = ({
  isOpen,
  onClose,
  networkUrl = 'http://192.168.0.3:5173/',
  externalUrl = 'https://rosa-reactions-baby-italic.trycloudflare.com',
  onUpdateExternalUrl,
}) => {
  const [selectedMode, setSelectedMode] = useState<'external' | 'local'>('external');
  const [copied, setCopied] = useState(false);
  const [currentExternalUrl, setCurrentExternalUrl] = useState(externalUrl);
  const [isEditingUrl, setIsEditingUrl] = useState(false);

  if (!isOpen) return null;

  const activeUrl = selectedMode === 'external' ? currentExternalUrl : networkUrl;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSaveCustomUrl = (newUrl: string) => {
    const trimmed = newUrl.trim();
    setCurrentExternalUrl(trimmed);
    localStorage.setItem('CINEAI_EXTERNAL_TUNNEL_URL', trimmed);
    if (onUpdateExternalUrl) onUpdateExternalUrl(trimmed);
    setIsEditingUrl(false);
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(activeUrl)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl text-center flex flex-col">
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-full transition"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Ícone & Título */}
        <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-cyan-100 dark:bg-cyan-950/80 text-cyan-600 dark:text-cyan-400 border border-cyan-300 dark:border-cyan-800 flex items-center justify-center shadow-md">
          <Smartphone className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Acessar CAIC no Celular</h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-md mx-auto">
          Use o <strong>Link Externo</strong> para abrir direto de qualquer smartphone (4G, 5G ou Wi-Fi) sem bloqueios de firewall.
        </p>

        {/* Seletor de Modo: Externo vs Local */}
        <div className="grid grid-cols-2 gap-2 mt-4 p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setSelectedMode('external')}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition ${
              selectedMode === 'external'
                ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-300 shadow-sm font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Link Externo (Recomendado)</span>
          </button>

          <button
            onClick={() => setSelectedMode('local')}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition ${
              selectedMode === 'local'
                ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-300 shadow-sm font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Wifi className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Rede Local (Wi-Fi)</span>
          </button>
        </div>

        {/* Informação do modo selecionado */}
        <div className="mt-3 px-3 py-2 rounded-xl text-[11px] flex items-center justify-center gap-1.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
          {selectedMode === 'external' ? (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span className="text-slate-700 dark:text-slate-300">
                HTTPS Ativo • Funciona no 4G/5G ou Wi-Fi (Sem bloqueio de Firewall)
              </span>
            </>
          ) : (
            <>
              <Wifi className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <span className="text-slate-700 dark:text-slate-300">
                IP Local • Requer celular no mesmo Wi-Fi e porta 5173 liberada no Firewall
              </span>
            </>
          )}
        </div>

        {/* QR Code Container */}
        <div className="my-4 p-3.5 bg-white inline-block mx-auto rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-md">
          <img
            src={qrCodeUrl}
            alt="QR Code de Acesso pelo Celular"
            className="w-44 h-44 object-contain mx-auto"
          />
        </div>

        {/* URL Box com Copiar e Abrir */}
        <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl mb-3">
          {selectedMode === 'external' ? (
            <Globe className="w-4 h-4 text-cyan-600 dark:text-cyan-400 flex-shrink-0 ml-1" />
          ) : (
            <Wifi className="w-4 h-4 text-cyan-600 dark:text-cyan-400 flex-shrink-0 ml-1" />
          )}

          <input
            type="text"
            readOnly={!isEditingUrl}
            value={activeUrl}
            onChange={(e) => {
              if (selectedMode === 'external') {
                setCurrentExternalUrl(e.target.value);
              }
            }}
            className="w-full bg-transparent text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 focus:outline-none truncate"
          />

          {selectedMode === 'external' && !isEditingUrl && (
            <button
              onClick={() => setIsEditingUrl(true)}
              title="Editar URL externa"
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}

          {isEditingUrl && (
            <button
              onClick={() => handleSaveCustomUrl(currentExternalUrl)}
              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium"
            >
              Salvar
            </button>
          )}

          <button
            onClick={handleCopy}
            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-sm"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiado!' : 'Copiar'}</span>
          </button>
        </div>

        {/* Link direto clicável */}
        <div className="flex items-center justify-center gap-2 text-xs">
          <a
            href={activeUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 hover:underline font-semibold"
          >
            <span>Testar abrindo em nova aba</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default MobileAccessModal;
