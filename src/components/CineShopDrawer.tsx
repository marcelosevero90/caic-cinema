import React, { useState } from 'react';
import {
  X,
  ShoppingBag,
  ExternalLink,
  AlertCircle,
  Sparkles,
  Loader2,
  Send,
  ShoppingBag as BagIcon,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import type { Movie, SceneShoppingAnalysis } from '../types/movie';

interface CineShopDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  movie: Movie;
  analyses: SceneShoppingAnalysis[];
  isAnalyzing: boolean;
  onSearchItem: (query: string) => Promise<void> | void;
}

const QUICK_FASHION_SUGGESTIONS = [
  { label: 'Brinco da atriz', query: 'brinco da atriz', icon: '💎' },
  { label: 'Sapato / Salto', query: 'sapato ou salto da atriz', icon: '👠' },
  { label: 'Bolsa da cena', query: 'bolsa de mão da cena', icon: '👜' },
  { label: 'Jaqueta de couro', query: 'jaqueta de couro do personagem', icon: '🧥' },
  { label: 'Óculos escuros', query: 'óculos de sol do filme', icon: '🕶️' },
  { label: 'Relógio de pulso', query: 'relógio de pulso da cena', icon: '⌚' },
  { label: 'Vestido da cena', query: 'vestido da atriz', icon: '👗' },
  { label: 'Colar ou Jóia', query: 'colar ou acessório no pescoço', icon: '✨' },
];

export const CineShopDrawer: React.FC<CineShopDrawerProps> = ({
  isOpen,
  onClose,
  movie,
  analyses,
  isAnalyzing,
  onSearchItem,
}) => {
  const [inputValue, setInputValue] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = inputValue.trim();
    if (!q || isAnalyzing) return;
    onSearchItem(q);
    setInputValue('');
  };

  const handleQuickClick = (query: string) => {
    if (isAnalyzing) return;
    onSearchItem(query);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-fadeIn select-none">
      {/* Backdrop para fechar ao tocar fora no mobile */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Painel Lateral / Drawer Deslizante */}
      <div className="relative w-full sm:w-[440px] md:w-[480px] h-full bg-slate-950 text-white flex flex-col shadow-2xl border-l border-slate-800 z-10 animate-slideLeft">
        {/* Header do CineShop */}
        <div className="px-5 py-4 border-b border-slate-800/80 bg-slate-900/95 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/20">
              <ShoppingBag className="w-5 h-5 fill-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white tracking-wide">CineShop IA</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Gemini AI
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Compre o look e objetos da cena
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            title="Fechar CineShop (Voltar ao filme)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filme em Reprodução */}
        <div className="px-5 py-2.5 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-950 border-b border-slate-800/60 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-slate-400">Filme:</span>
            <strong className="text-white truncate">{movie.title}</strong>
            <span className="text-slate-400">({movie.releaseYear})</span>
          </div>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono shrink-0">
            Pausado
          </span>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Card Explicativo / Boas-vindas */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs space-y-2">
            <p className="text-slate-200 leading-relaxed font-medium">
              Gostou do <strong className="text-emerald-400">sapato</strong>, do <strong className="text-cyan-400">brinco</strong>, da <strong className="text-amber-400">bolsa</strong>, da <strong className="text-orange-400">jaqueta</strong> ou de qualquer outro detalhe do personagem?
            </p>
            <p className="text-slate-400 text-[11px]">
              Diga o que você quer e o Gemini analisa o figurino do filme para localizar as melhores opções para comprar online com preço e entrega no Brasil.
            </p>
          </div>

          {/* Sugestões Rápidas de Peças */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" /> Ideias rápidas para identificar:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_FASHION_SUGGESTIONS.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleQuickClick(item.query)}
                  disabled={isAnalyzing}
                  className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/60 text-slate-300 hover:text-emerald-300 transition shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Feedback de Carregamento da IA */}
          {isAnalyzing && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-cyan-950/60 border border-emerald-500/40 text-center space-y-2.5 animate-pulse">
              <div className="w-10 h-10 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-emerald-300">
                  CineShop IA analisando figurino e cena...
                </p>
                <p className="text-[11px] text-slate-400">
                  Identificando marca, cor, estilo e localizando ofertas no Mercado Livre, Amazon e Shopee.
                </p>
              </div>
            </div>
          )}

          {/* Lista de Resultados das Análises */}
          <div className="space-y-3">
            {analyses.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition-all ${
                  item.found
                    ? 'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                    : 'bg-amber-950/20 border-amber-500/40'
                }`}
              >
                {/* Cabeçalho do Item */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5 mb-2.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] text-slate-400">Você pediu:</span>
                    <span className="text-xs font-semibold text-slate-200 truncate">
                      "{item.requestedQuery}"
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 shrink-0">{item.timestamp}</span>
                </div>

                {item.found ? (
                  <div className="space-y-3">
                    {/* Tag de Sucesso e Nome do Produto */}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500 text-slate-950 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Look Identificado
                        </span>
                        {item.category && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-cyan-300 border border-slate-700">
                            {item.category}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-extrabold text-white leading-snug">
                        {item.productName}
                      </h4>
                    </div>

                    {/* Especificações da Peça */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {item.color && (
                        <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                          <span className="text-[10px] text-slate-400 block">🎨 Cor:</span>
                          <span className="font-bold text-slate-200 text-[11px] truncate block">
                            {item.color}
                          </span>
                        </div>
                      )}
                      {item.model && (
                        <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                          <span className="text-[10px] text-slate-400 block">🏷️ Modelo:</span>
                          <span className="font-bold text-slate-200 text-[11px] truncate block">
                            {item.model}
                          </span>
                        </div>
                      )}
                      {item.material && (
                        <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                          <span className="text-[10px] text-slate-400 block">🧵 Material:</span>
                          <span className="font-bold text-slate-200 text-[11px] truncate block">
                            {item.material}
                          </span>
                        </div>
                      )}
                      {item.brandOrStyle && (
                        <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                          <span className="text-[10px] text-slate-400 block">✨ Estilo/Marca:</span>
                          <span className="font-bold text-slate-200 text-[11px] truncate block">
                            {item.brandOrStyle}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Preço Estimado */}
                    {item.estimatedPrice && (
                      <div className="p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/30 flex items-center justify-between">
                        <span className="text-xs text-emerald-300 font-medium">💰 Faixa de Preço Estimada:</span>
                        <strong className="text-xs font-extrabold text-emerald-200">{item.estimatedPrice}</strong>
                      </div>
                    )}

                    {/* Descrição / Relação com a Cena */}
                    {item.description && (
                      <p className="text-xs text-slate-300 leading-relaxed font-normal bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80">
                        {item.description}
                      </p>
                    )}

                    {/* Botões de Compra Direta em Lojas Parceiras */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1">
                        <BagIcon className="w-3.5 h-3.5 text-emerald-400" /> Onde Comprar Agora:
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        {(item.stores || []).map((store) => (
                          <a
                            key={store.name}
                            href={store.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition transform hover:scale-[1.02] active:scale-95 shadow-sm cursor-pointer ${
                              store.type === 'mercadolivre'
                                ? 'bg-amber-400 text-slate-950 border-amber-500 hover:bg-amber-300'
                                : store.type === 'amazon'
                                ? 'bg-slate-900 text-amber-400 border-amber-500/50 hover:bg-slate-800'
                                : store.type === 'shopee'
                                ? 'bg-orange-600 text-white border-orange-700 hover:bg-orange-500'
                                : 'bg-blue-600 text-white border-blue-700 hover:bg-blue-500'
                            }`}
                          >
                            <div className="flex flex-col text-left leading-tight">
                              <span className="font-extrabold">{store.name}</span>
                              {store.badge && (
                                <span className="text-[9px] font-medium opacity-85">{store.badge}</span>
                              )}
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 shrink-0 ml-1 opacity-90" />
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Item Não Identificado ou Inconclusivo */
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-amber-300">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Item não localizado com certeza</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed font-normal">
                      {item.message}
                    </p>
                    <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-[11px] text-amber-300/95 space-y-1">
                      <p className="font-semibold flex items-center gap-1">
                        <HelpCircle className="w-3.5 h-3.5" /> Como obter um resultado melhor:
                      </p>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                        <li>Diga a peça (ex: sapato scarpin, brinco de argola, jaqueta de couro)</li>
                        <li>Indique a cor ou quem estava usando (ex: atriz loira, detetive)</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {analyses.length === 0 && !isAnalyzing && (
              <div className="p-6 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-900 text-slate-500 flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-slate-300">
                  Nenhum objeto analisado ainda nesta sessão
                </p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Toque em uma das ideias rápidas acima ou digite abaixo o que você mais gostou na cena!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Barra de Entrada de Texto Fixa no Rodapé */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/95 shrink-0">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ex: gostei do sapato da atriz, brinco de pérola..."
              disabled={isAnalyzing}
              className="flex-1 px-3.5 py-2.5 rounded-xl text-xs bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition shadow-inner"
            />
            <button
              type="submit"
              disabled={isAnalyzing || !inputValue.trim()}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs transition flex items-center gap-1.5 shadow-md shadow-emerald-500/20 disabled:opacity-40 cursor-pointer shrink-0"
              title="Pedir para a IA analisar e buscar lojas"
            >
              {isAnalyzing ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 fill-slate-950" />
                  <span className="hidden sm:inline">Analisar</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
