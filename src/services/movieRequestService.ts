import type { Movie } from '../types/movie';
import { catalogService } from './catalogService';
import { geminiCurationService } from './geminiCurationService';

export interface MovieRequest {
  id: string;
  title: string;
  year?: number;
  userNotes?: string;
  suggestedBy: string;
  userEmail?: string;
  youtubeUrl?: string;
  status: 'pending' | 'searching' | 'added' | 'not_found';
  requestDate: string;
  upvotes: number;
  adminNotes?: string;
  addedMovieId?: string;
  foundVideoId?: string;
}

const STORAGE_KEY = 'CINEAI_MOVIE_REQUESTS_V2';

const INITIAL_REQUESTS: MovieRequest[] = [
  {
    id: 'req-panico-floresta',
    title: 'Pânico na Floresta',
    year: 2003,
    userNotes: 'Filme clássico de terror na mata com jovens em perigo.',
    suggestedBy: 'Marcelo Silva',
    status: 'pending',
    requestDate: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    upvotes: 8,
  },
  {
    id: 'req-cidade-de-deus',
    title: 'Cidade de Deus',
    year: 2002,
    userNotes: 'Marco do cinema brasileiro e internacional.',
    suggestedBy: 'Ana Clara',
    status: 'pending',
    requestDate: new Date(Date.now() - 3600000 * 24 * 4).toISOString(),
    upvotes: 12,
  },
  {
    id: 'req-john-wick',
    title: 'John Wick: De Volta ao Jogo',
    year: 2014,
    userNotes: 'Ação pura com Keanu Reeves.',
    suggestedBy: 'Rafael Costa',
    status: 'pending',
    requestDate: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
    upvotes: 6,
  },
];

class MovieRequestService {
  private requests: MovieRequest[] = [];
  private listeners: Array<() => void> = [];

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.requests = JSON.parse(stored);
      } else {
        this.requests = [...INITIAL_REQUESTS];
        this.save();
      }
    } catch {
      this.requests = [...INITIAL_REQUESTS];
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.requests));
    } catch (e) {
      console.warn('Erro ao salvar pedidos de filmes:', e);
    }
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  public getAll(): MovieRequest[] {
    return [...this.requests];
  }

  public getPendingCount(): number {
    return this.requests.filter((r) => r.status === 'pending' || r.status === 'searching').length;
  }

  public upvote(id: string): void {
    const req = this.requests.find((r) => r.id === id);
    if (req) {
      req.upvotes = (req.upvotes || 0) + 1;
      this.save();
    }
  }

  public updateStatus(id: string, status: MovieRequest['status'], adminNotes?: string, addedMovieId?: string): void {
    const req = this.requests.find((r) => r.id === id);
    if (req) {
      req.status = status;
      if (adminNotes !== undefined) req.adminNotes = adminNotes;
      if (addedMovieId !== undefined) req.addedMovieId = addedMovieId;
      this.save();
    }
  }

  public remove(id: string): void {
    this.requests = this.requests.filter((r) => r.id !== id);
    this.save();
  }

  /**
   * Processa uma sugestão do usuário:
   * 1. Verifica se já está no catálogo
   * 2. Se o usuário forneceu link do YouTube, tenta analisar e adicionar imediatamente
   * 3. Caso contrário, registra na fila para curadoria do Administrador
   */
  public async submitSuggestion(params: {
    title: string;
    year?: number;
    userNotes?: string;
    suggestedBy: string;
    userEmail?: string;
    youtubeUrl?: string;
  }): Promise<{
    success: boolean;
    autoAdded: boolean;
    movie?: Movie;
    request: MovieRequest;
    message: string;
  }> {
    const cleanTitle = params.title.trim();

    // 1. Verifica se já existe filme idêntico ou muito parecido no catálogo
    const catalogMatch = catalogService.search({ query: cleanTitle });
    const exactMatch = catalogMatch.find(
      (m) => m.title.toLowerCase().includes(cleanTitle.toLowerCase()) ||
             cleanTitle.toLowerCase().includes(m.title.toLowerCase())
    );

    if (exactMatch && !params.youtubeUrl) {
      const existingReq: MovieRequest = {
        id: `req-existing-${Date.now()}`,
        title: exactMatch.title,
        suggestedBy: params.suggestedBy,
        userNotes: params.userNotes,
        status: 'added',
        requestDate: new Date().toISOString(),
        upvotes: 1,
        addedMovieId: exactMatch.id,
      };
      return {
        success: true,
        autoAdded: false,
        movie: exactMatch,
        request: existingReq,
        message: `Ótima notícia! O filme "${exactMatch.title}" já está disponível para assistir no CAIC!`,
      };
    }

    // 2. Se tem URL do YouTube informada, faz auto-importação com IA
    if (params.youtubeUrl && params.youtubeUrl.trim().length > 0) {
      try {
        const url = params.youtubeUrl.trim();
        const videoMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
        const videoId = videoMatch ? videoMatch[1] : (url.length === 11 ? url : '');

        if (videoId) {
          const aiData = await geminiCurationService.analyzeYouTubeVideo({
            youtubeUrl: url,
            videoId,
            initialTitle: cleanTitle,
          });

          const newMovie: Movie = {
            id: `custom-user-${videoId}-${Date.now()}`,
            youtubeVideoId: videoId,
            title: aiData.title || cleanTitle,
            originalTitle: aiData.originalTitle,
            synopsis: aiData.synopsis || `Filme sugerido pela comunidade (${params.suggestedBy}).`,
            genres: aiData.genres.length > 0 ? aiData.genres : ['Cinema', 'Destaque'],
            tags: aiData.tags.length > 0 ? aiData.tags : ['comunidade', 'sugestão'],
            moods: aiData.moods.length > 0 ? aiData.moods : ['emocionante'],
            releaseYear: aiData.releaseYear || params.year || 2020,
            durationMinutes: aiData.durationMinutes || 95,
            posterUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            backdropUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            channelName: aiData.channelName || 'YouTube Comunidade',
            contentRating: aiData.contentRating || '14',
            language: aiData.language || 'Dublado',
            ratingScore: 7.8,
            badge: 'Sugerido por Usuário',
            addedAt: new Date().toISOString(),
          };

          catalogService.addMovie(newMovie);

          const newReq: MovieRequest = {
            id: `req-${Date.now()}`,
            title: newMovie.title,
            year: newMovie.releaseYear,
            userNotes: params.userNotes,
            suggestedBy: params.suggestedBy,
            userEmail: params.userEmail,
            youtubeUrl: url,
            status: 'added',
            requestDate: new Date().toISOString(),
            upvotes: 1,
            addedMovieId: newMovie.id,
            foundVideoId: videoId,
          };

          this.requests.unshift(newReq);
          this.save();

          return {
            success: true,
            autoAdded: true,
            movie: newMovie,
            request: newReq,
            message: `Filme "${newMovie.title}" localizado e integrado com sucesso ao catálogo pelo CAIC!`,
          };
        }
      } catch (err) {
        console.warn('Erro ao auto-adicionar filme via YouTube:', err);
      }
    }

    // 3. Adiciona à lista de pedidos para moderação dos Administradores
    const newReq: MovieRequest = {
      id: `req-${Date.now()}`,
      title: cleanTitle,
      year: params.year,
      userNotes: params.userNotes,
      suggestedBy: params.suggestedBy,
      userEmail: params.userEmail,
      youtubeUrl: params.youtubeUrl,
      status: 'pending',
      requestDate: new Date().toISOString(),
      upvotes: 1,
    };

    this.requests.unshift(newReq);
    this.save();

    return {
      success: true,
      autoAdded: false,
      request: newReq,
      message: `Pedido registrado com sucesso! O título "${cleanTitle}" foi enviado para a Lista de Pedidos dos Administradores para localização e inclusão no catálogo.`,
    };
  }
}

export const movieRequestService = new MovieRequestService();
