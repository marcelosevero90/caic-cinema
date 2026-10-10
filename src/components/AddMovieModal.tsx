import React, { useState } from 'react';
import { X, Sparkles, Plus, Film, Link as LinkIcon, Check, Loader2, Play } from 'lucide-react';
import { geminiCurationService } from '../services/geminiCurationService';
import { catalogService } from '../services/catalogService';
import type { Movie, ContentRating, MovieLanguage } from '../types/movie';

interface AddMovieModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMovieAdded: (movie: Movie) => void;
}

export const AddMovieModal: React.FC<AddMovieModalProps> = ({ isOpen, onClose, onMovieAdded }) => {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [title, setTitle] = useState('');
  const [originalTitle, setOriginalTitle] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [genres, setGenres] = useState<string>('Suspense, Cinema');
  const [tags, setTags] = useState<string>('cult, clássico, grátis');
  const [moods, setMoods] = useState<string>('intrigante, reflexivo');
  const [releaseYear, setReleaseYear] = useState<number>(1970);
  const [durationMinutes, setDurationMinutes] = useState<number>(90);
  const [channelName, setChannelName] = useState<string>('Canal do YouTube');
  const [contentRating, setContentRating] = useState<ContentRating>('12');
  const [language, setLanguage] = useState<MovieLanguage>('Dublado');
  const [badge, setBadge] = useState<string>('Adicionado');
  const [ratingScore, setRatingScore] = useState<number>(7.8);
  const [posterUrl, setPosterUrl] = useState<string>('');

  const [analyzing, setAnalyzing] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  // Extrai o ID do vídeo do YouTube
  const extractVideoId = (url: string): string => {
    const trimmed = url.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }
    const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : '';
  };

  const videoId = extractVideoId(youtubeUrl);
  const derivedPoster = posterUrl || (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '');

  // Análise Automática com o Agente de IA (Gemini 3.8 Flash)
  const handleAnalyzeWithAI = async () => {
    if (!videoId) {
      alert('Por favor, insira um link válido do YouTube primeiro.');
      return;
    }

    setAnalyzing(true);
    try {
      // Tenta obter informações básicas do oEmbed do YouTube
      let oembedTitle = title;
      let oembedAuthor = channelName;
      try {
        const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.title) oembedTitle = data.title;
          if (data.author_name) oembedAuthor = data.author_name;
        }
      } catch {
        // Ignora falha de oEmbed e prossegue com a IA
      }

      const result = await geminiCurationService.analyzeYouTubeVideo({
        youtubeUrl,
        videoId,
        initialTitle: oembedTitle || title,
        channelName: oembedAuthor !== 'Canal do YouTube' ? oembedAuthor : undefined,
      });

      setTitle(result.title);
      if (result.originalTitle) setOriginalTitle(result.originalTitle);
      setSynopsis(result.synopsis);
      setGenres(result.genres.join(', '));
      setTags(result.tags.join(', '));
      setMoods(result.moods.join(', '));
      setReleaseYear(result.releaseYear);
      setDurationMinutes(result.durationMinutes);
      setContentRating(result.contentRating);
      setLanguage(result.language);
      if (result.badge) setBadge(result.badge);
      if (result.channelName) setChannelName(result.channelName);
      if (result.ratingScore) setRatingScore(result.ratingScore);
      if (!posterUrl) {
        setPosterUrl(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`);
      }
    } catch (err) {
      console.error('Falha ao analisar vídeo:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoId || !title.trim()) {
      alert('Insira o link do YouTube e o título do filme.');
      return;
    }

    const newMovie: Movie = {
      id: `custom-${videoId}-${Date.now()}`,
      youtubeVideoId: videoId,
      title: title.trim(),
      originalTitle: originalTitle.trim() || undefined,
      synopsis: synopsis.trim() || 'Filme adicionado ao catálogo pelo usuário.',
      genres: genres.split(',').map((g) => g.trim()).filter(Boolean),
      tags: tags.split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean),
      moods: moods.split(',').map((m) => m.trim()).filter(Boolean),
      releaseYear: Number(releaseYear) || new Date().getFullYear(),
      durationMinutes: Number(durationMinutes) || 90,
      posterUrl: derivedPoster || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80',
      backdropUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      channelName: channelName.trim() || 'YouTube',
      contentRating,
      language,
      badge: badge.trim() || 'Novo',
      ratingScore: Number(ratingScore) || 7.5,
      featured: false,
      addedAt: new Date().toISOString(),
    };

    catalogService.addMovie(newMovie);
    setSavedSuccess(true);
    setTimeout(() => {
      onMovieAdded(newMovie);
      setSavedSuccess(false);
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-0.5 flex items-center justify-center shadow-md shadow-cyan-500/20">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center text-cyan-400">
                <Plus className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Adicionar Filme ao Catálogo</h3>
              <p className="text-xs text-slate-400">Insira o link do YouTube e deixe o Agente IA analisar</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="tv-focusable p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* YouTube Link Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Link do YouTube ou ID do Vídeo
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... ou https://youtu.be/..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
                  required
                />
              </div>

              {/* Botão de Análise com Agente de IA */}
              <button
                type="button"
                onClick={handleAnalyzeWithAI}
                disabled={!videoId || analyzing}
                className="tv-focusable px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-fuchsia-600 hover:from-cyan-400 hover:to-fuchsia-500 text-white font-semibold text-xs flex items-center gap-2 shadow-md shadow-cyan-500/20 disabled:opacity-50 transition"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analisando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Analisar com IA</span>
                  </>
                )}
              </button>
            </div>
            {videoId && (
              <p className="text-[11px] text-cyan-400 mt-1.5 flex items-center gap-1">
                <Check className="w-3 h-3" /> Vídeo ID detectado: <code className="bg-slate-950 px-1 py-0.5 rounded">{videoId}</code>
              </p>
            )}
          </div>

          {/* Preview Container se tiver ID */}
          {videoId && (
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center gap-4">
              <div className="relative w-28 aspect-video rounded-lg overflow-hidden bg-black flex-shrink-0">
                <img
                  src={derivedPoster}
                  alt="Thumbnail"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Play className="w-5 h-5 text-white/90 fill-white" />
                </div>
              </div>
              <div className="min-w-0 flex-1 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400">Prévia do Vídeo</span>
                <h4 className="font-semibold text-white truncate">{title || 'Título será preenchido...'}</h4>
                <p className="text-[11px] text-slate-400 truncate">{channelName}</p>
              </div>
            </div>
          )}

          {/* Grid de Campos Extraídos/Editáveis */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Título do Filme</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Metropolis"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Título Original (Opcional)</label>
              <input
                type="text"
                value={originalTitle}
                onChange={(e) => setOriginalTitle(e.target.value)}
                placeholder="Ex: Metropolis (1927)"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Sinopse Curada pela IA</label>
            <textarea
              rows={3}
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              placeholder="Sinopse curta e atraente..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400 leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Gêneros (separados por vírgula)</label>
              <input
                type="text"
                value={genres}
                onChange={(e) => setGenres(e.target.value)}
                placeholder="Suspense, Drama"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Humores (Moods)</label>
              <input
                type="text"
                value={moods}
                onChange={(e) => setMoods(e.target.value)}
                placeholder="tenso, reflexivo"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Tags Temáticas</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="anos 90, noir, robôs"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Ano</label>
              <input
                type="number"
                value={releaseYear}
                onChange={(e) => setReleaseYear(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Duração (min)</label>
              <input
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Áudio</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as MovieLanguage)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="Dublado">Dublado</option>
                <option value="Legendado">Legendado</option>
                <option value="Nacional">Nacional</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Classificação</label>
              <select
                value={contentRating}
                onChange={(e) => setContentRating(e.target.value as ContentRating)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="Livre">Livre</option>
                <option value="10">10</option>
                <option value="12">12</option>
                <option value="14">14</option>
                <option value="16">16</option>
                <option value="18">18</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Canal Distribuidor</label>
              <input
                type="text"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="Ex: NetMovies, FilmRise, Clássicos"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Selo / Badge</label>
              <input
                type="text"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder="Ex: Clássico, Obra Cult, Estreia"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium text-xs transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!videoId || !title.trim()}
              className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition disabled:opacity-50"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4" /> Filme Salvo no Catálogo!
                </>
              ) : (
                <>
                  <Film className="w-4 h-4" /> Salvar no Catálogo CAIC
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
