import type { CinemaSession } from '../types/cinemaSession';
import type { Movie } from '../types/movie';

const STORAGE_KEY = 'CINEAI_SPECIAL_CINEMA_SESSION_V1';

export const SESSION_PRESETS: CinemaSession[] = [
  {
    id: 'velozes_furiosos',
    title: 'Sessão Velozes & Furiosos: Mestres do Asfalto',
    subtitle: 'Maratona especial de adrenalina pura, carros tunados, corridas clandestinas e perseguições eletrizantes!',
    dateBadge: 'Especial 13/10',
    highlightTag: 'MARATONA EM SEQUÊNCIA',
    accentColor: 'amber',
    icon: 'car',
    themeGradient: 'from-amber-500 via-orange-600 to-red-600',
    bannerBackdropUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=1600&auto=format&fit=crop&q=80',
    movieIds: [
      'movie-lnxyUyleckM', // Street Racer: Velocidade Máxima
      'movie-wnnihlYh-5o', // Carga Explosiva: O Legado (Audi S8 / Perseguições)
      'movie-R77ESxgaSUE', // Biker Boyz: Velocidade em Duas Rodas
      'movie-Y8tM6jK4p0Y', // Perseguição Implacável 2
      'movie-_UQYaSQpNO4', // Fúria (Nicolas Cage)
      'movie-wIYoRWE8tfs', // Correndo Contra o Vento
    ],
    searchKeywords: ['carros', 'velocidade', 'corrida', 'adrenalina', 'street racer', 'asfalto'],
    active: true,
  },
  {
    id: 'jackie_chan',
    title: 'Sessão Cinema: Mestre Jackie Chan',
    subtitle: 'Os maiores sucessos do mestre das artes marciais, combates acrobáticos e humor eletrizante em sequência!',
    dateBadge: 'Especial Jackie Chan',
    highlightTag: 'RETROSPECTIVA DE OURO',
    accentColor: 'cyan',
    icon: 'swords',
    themeGradient: 'from-cyan-500 via-blue-600 to-indigo-700',
    bannerBackdropUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=1600&auto=format&fit=crop&q=80',
    movieIds: [
      'movie-Y0d7cGFCKXs', // A Hora do Rush
      'movie-2GrhDaC5pJs', // A Hora do Rush 2
      'movie-RHTMw1ZcS48', // A Hora do Rush 3
      'movie-rZTTROXIhR0', // O Mestre Bêbado
      'movie-qMfi-wl94uY', // Operação Condor
      'movie-EPZzk-H0iew', // Operação Zodíaco
      'movie-BXKRGn1sVp0', // City Hunter: O Caçador de Encrencas
      'movie-IGjT3Vnu8hY', // Police Story: A Guerra das Drogas
      'movie-ZBzCkGGNOjo', // O Reino Proibido
      'movie-rzCX71fed30', // Karatê Kid: O Legado
    ],
    searchKeywords: ['jackie chan', 'artes marciais', 'kung fu', 'hora do rush', 'mestre bebado'],
    active: false,
  },
  {
    id: 'natal',
    title: 'Sessão Cinema: Especial de Natal',
    subtitle: 'Histórias mágicas, comédias festivas e emoção para reunir toda a família no clima de fim de ano!',
    dateBadge: 'Temporada de Natal',
    highlightTag: 'ESPECIAL DE NATAL',
    accentColor: 'emerald',
    icon: 'gift',
    themeGradient: 'from-emerald-600 via-teal-600 to-rose-700',
    bannerBackdropUrl: 'https://images.unsplash.com/photo-1543258103-a62bdc069871?w=1600&auto=format&fit=crop&q=80',
    movieIds: [
      'movie-PiWXZT1XC7Q', // Um Pedido de Natal
      'movie-a8OIgPeHRlo', // Uma Surpresa de Natal
      'movie-L_c0xT88JtA', // Um Natal de Descobertas
      'movie-QDMA8qO5Aj8', // Natal em Hollywood
      'movie-gihd4osx7UE', // Um Papai Noel Em Apuros
      'movie-FSDt6kTuz_s', // Transmissão de Natal
    ],
    searchKeywords: ['natal', 'papai noel', 'familia', 'fim de ano', 'magia'],
    active: false,
  },
  {
    id: 'classicos_acao',
    title: 'Sessão Cinema: Clássicos de Ação 80 & 90',
    subtitle: 'Nostalgia pura com Jean-Claude Van Damme, tiroteios clássicos, vingança e combate visceral da era de ouro!',
    dateBadge: 'Nostalgia dos Clássicos',
    highlightTag: 'AÇÃO RETRÔ',
    accentColor: 'purple',
    icon: 'clapperboard',
    themeGradient: 'from-purple-600 via-indigo-600 to-cyan-600',
    bannerBackdropUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1600&auto=format&fit=crop&q=80',
    movieIds: [
      'movie-wnnihlYh-5o',
      'movie-_UQYaSQpNO4',
      'movie-lnxyUyleckM',
      'movie-R77ESxgaSUE',
      'movie-Y8tM6jK4p0Y',
    ],
    searchKeywords: ['van damme', 'retro', 'luta', 'policial', 'artes marciais'],
    active: false,
  },
];

class CinemaSessionService {
  private currentSession: CinemaSession;
  private listeners: Array<() => void> = [];

  constructor() {
    this.currentSession = this.load();
  }

  private load(): CinemaSession {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.title) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    // Padrão atual: Sessão Velozes & Furiosos (Especial 13/10)
    return { ...SESSION_PRESETS[0] };
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.currentSession));
    } catch (e) {
      console.warn('Erro ao salvar sessão cinema:', e);
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

  public getActiveSession(): CinemaSession {
    return { ...this.currentSession };
  }

  public getPresets(): CinemaSession[] {
    return [...SESSION_PRESETS];
  }

  public setPreset(presetId: string): CinemaSession {
    const preset = SESSION_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      this.currentSession = { ...preset, active: true };
      this.save();
    }
    return this.getActiveSession();
  }

  public updateSession(data: Partial<CinemaSession>): CinemaSession {
    this.currentSession = {
      ...this.currentSession,
      ...data,
      active: data.active !== undefined ? data.active : true,
    };
    this.save();
    return this.getActiveSession();
  }

  /**
   * Retorna os filmes em ordem sequencial para a Sessão Cinema ativa.
   * Prioriza a lista de movieIds configurada na sessão e, se necessário,
   * completa com filmes do catálogo que combinem com as palavras-chave.
   */
  public getResolvedMovies(session: CinemaSession, catalog: Movie[]): Movie[] {
    if (!catalog || catalog.length === 0) return [];

    const movieMap = new Map<string, Movie>();
    catalog.forEach((m) => movieMap.set(m.id, m));

    const resolved: Movie[] = [];
    const usedIds = new Set<string>();

    // 1. Filmes explicitamente ordenados por ID
    for (const id of session.movieIds || []) {
      const movie = movieMap.get(id);
      if (movie && !usedIds.has(movie.id)) {
        resolved.push(movie);
        usedIds.add(movie.id);
      }
    }

    // 2. Se a lista tiver menos de 10 filmes e tiver searchKeywords, complementa
    if (resolved.length < 10 && session.searchKeywords && session.searchKeywords.length > 0) {
      const keywords = session.searchKeywords.map((k) => k.toLowerCase().trim());
      for (const m of catalog) {
        if (resolved.length >= 12) break;
        if (usedIds.has(m.id)) continue;

        const textToMatch = `${m.title} ${m.synopsis} ${(m.genres || []).join(' ')} ${(m.tags || []).join(' ')} ${(m.cast || []).join(' ')}`.toLowerCase();
        const matches = keywords.some((kw) => textToMatch.includes(kw));
        if (matches) {
          resolved.push(m);
          usedIds.add(m.id);
        }
      }
    }

    return resolved;
  }
}

export const cinemaSessionService = new CinemaSessionService();
