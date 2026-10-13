import type { Movie, SearchFilters } from '../types/movie';
import { INITIAL_CATALOG } from '../data/catalog';
import { deriveMovieSubgenres, deriveMovieCast } from '../data/genreTaxonomy';
import { userService } from './userService';

const STORAGE_KEY = 'CINEAI_CUSTOM_MOVIES';
const CATALOG_VERSION_KEY = 'CINEAI_CATALOG_VERSION_V5';
const DELETED_MOVIES_KEY = 'CINEAI_DELETED_MOVIE_IDS_V5';
const INACTIVE_MOVIES_KEY = 'CINEAI_INACTIVE_MOVIE_IDS_V5';

const HARDCODED_DELETED_IDS = ['movie-uqskiEQPmYo', 'uqskiEQPmYo']; // O Justiceiro das Sombras removido permanentemente


const STOP_WORDS = new Set([
  'de', 'do', 'da', 'dos', 'das',
  'o', 'a', 'os', 'as',
  'um', 'uma', 'uns', 'umas',
  'e', 'ou', 'se', 'que',
  'em', 'no', 'na', 'nos', 'nas',
  'por', 'para', 'pra', 'com', 'sem', 'sob', 'sobre',
  'como', 'tipo', 'estilo', 'qual', 'quais',
  'filme', 'filmes', 'cinema', 'quero', 'ver', 'assistir',
  'recomende', 'indique', 'busque', 'procure', 'mostre',
  'me', 'te', 'lhe', 'nos', 'tem', 'algo', 'algum', 'alguma'
]);

function normalizeStr(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

const SEMANTIC_CLUSTERS: Record<string, string[]> = {
  animais: ['animal', 'animais', 'pet', 'pets', 'cao', 'caes', 'cachorro', 'cachorros', 'porquinho', 'safari', 'leao', 'leoes', 'predador', 'predadores', 'fauna', 'selvagem', 'pastor alemao'],
  animal: ['animais', 'pet', 'cao', 'caes', 'cachorro', 'porquinho', 'safari', 'leao', 'predador'],
  pet: ['pets', 'animais', 'animal', 'cao', 'cachorro', 'porquinho'],
  pets: ['pet', 'animais', 'animal', 'cao', 'cachorro', 'porquinho'],
  cachorro: ['cao', 'caes', 'cachorros', 'pet', 'animais', 'animal', 'pastor alemao'],
  cao: ['cao', 'caes', 'cachorro', 'cachorros', 'pet', 'animais', 'animal'],
  caes: ['cao', 'cachorro', 'pet', 'animais', 'animal'],
  gato: ['gatos', 'felino', 'pet', 'animais'],
  porco: ['porquinho', 'animais', 'pet', 'arlo'],
  porquinho: ['porco', 'animais', 'animal', 'pet', 'arlo'],
  safari: ['safari', 'leoes', 'leao', 'animais', 'savana', 'predadores'],
  leao: ['leoes', 'safari', 'animais', 'predadores'],
  tubarao: ['tubarao', 'shark', 'megalodon', 'crocosaurus', 'predador', 'marinho', 'animais'],
  guerra: ['guerra', 'batalha', 'exercito', 'militar', 'tanque', 'soldado', 'berlim', 'segunda guerra', 'almas de ferro', 'ardenas', 'conflito', 'combate', 'trincheiras', 'sobibor', 'guerras', 'guerreiro', 'cruzada'],
  batalha: ['guerra', 'batalhas', 'exercito', 'militar', 'tanque', 'combate', 'conflito', 'soldado'],
  militar: ['guerra', 'exercito', 'tanque', 'soldado', 'batalha'],
  hacker: ['computador', 'ciber', 'sistema', 'invasores', 'dark web', 'tecnologia', 'codigo'],
  fe: ['fe', 'espiritual', 'espirita', 'chico xavier', 'padre pio', 'clara e francisco', 'biblico', 'biblia', 'deus', 'milagre', 'sagrada', 'moises', 'davi', 'abraao', 'salomao', 'paulo', 'esther'],
  biblia: ['biblico', 'sagrada', 'davi', 'abraao', 'esther', 'jaco', 'jeremias', 'salomao', 'moises', 'paulo', 'sansao', 'deus', 'fe', 'religioso', 'evangelho'],
  biblico: ['biblia', 'sagrada', 'davi', 'abraao', 'esther', 'salomao', 'moises', 'fe', 'deus', 'religioso'],
  religioso: ['biblia', 'biblico', 'fe', 'deus', 'cristao', 'evangelho', 'sagrada', 'chico xavier', 'padre pio'],
  espirita: ['chico xavier', 'fe', 'espiritual', 'alma', 'deus'],
  carro: ['carros', 'velocidade', 'street racer', 'corrida', 'asfalto'],
  luta: ['artes marciais', 'jackie chan', 'jet li', 'van damme', 'combate', 'punhos', 'kung fu', 'acao', 'karate', 'kickboxing', 'street fighter'],
  vandamme: ['van damme', 'jean-claude van damme', 'timecop', 'legionario', 'retroceder', 'artes marciais', 'luta'],
  terror: ['horror', 'assustador', 'medo', 'ouija', 'exorcismo', 'hellraiser', 'paranormal', 'atividade paranormal', 'candyman', 'duende assassino', 'maldicao', 'pesadelo'],
  fantasia: ['magia', 'merlin', 'dragao', 'espada', 'rei arthur', 'viking', 'cavaleiro', 'reino'],
  viking: ['vikings', 'ragnarok', 'nordico', 'espada', 'batalha', 'medieval'],
  ficcao: ['sci-fi', 'futuro', 'cubo', 'viagem no tempo', 'timecop', 'espaco', 'dimensao'],
  lancamentos: ['lancamento', 'lancamentos', 'novidade', 'novidades', 'novos', 'recente', 'recentes', 'novo', 'estreia', 'estreias'],
  novidades: ['lancamento', 'lancamentos', 'novidade', 'novidades', 'novos', 'recente', 'recentes', 'novo', 'estreia', 'estreias'],
};

export const GENRE_ALIASES: Record<string, string[]> = {
  lancamentos: ['lancamento', 'lancamentos', 'novidade', 'novidades', 'novo', 'novos', 'recente', 'recentes', 'estreia', 'estreias'],
  lancamento: ['lancamento', 'lancamentos', 'novidade', 'novidades', 'novo', 'novos', 'recente', 'recentes', 'estreia', 'estreias'],
  novidades: ['lancamento', 'lancamentos', 'novidade', 'novidades', 'novo', 'novos', 'recente', 'recentes', 'estreia', 'estreias'],
  acao: ['acao', 'action'],
  suspense: ['suspense', 'thriller', 'misterio', 'mystery'],
  comedia: ['comedia', 'comedy'],
  terror: ['terror', 'horror'],
  'ficcao cientifica': ['ficcao', 'sci-fi', 'science fiction', 'ficcao cientifica'],
  ficcao: ['ficcao', 'sci-fi', 'science fiction', 'ficcao cientifica'],
  animacao: ['animacao', 'animation', 'anime'],
  aventura: ['aventura', 'adventure'],
  romance: ['romance', 'romantico'],
  drama: ['drama'],
  guerra: ['guerra', 'war', 'militar', 'batalha'],
  policial: ['policial', 'crime'],
  crime: ['crime', 'policial'],
  faroeste: ['faroeste', 'western'],
  familia: ['familia', 'family'],
  biografia: ['biografia', 'biography'],
  historico: ['historico', 'history', 'historica'],
};

import { jellyfinService } from './jellyfinService';

class CatalogService {
  private catalog: Movie[] = [];
  private jellyfinMovies: Movie[] = [];
  private listeners: Array<() => void> = [];

  constructor() {
    this.loadCatalog();
    if (jellyfinService.getConfig().enabled) {
      try {
        const cached = localStorage.getItem('CINEAI_JELLYFIN_CACHE_V4');
        if (cached) {
          this.jellyfinMovies = JSON.parse(cached);
        }
      } catch {
        // ignore
      }
    } else {
      this.jellyfinMovies = [];
      try {
        localStorage.removeItem('CINEAI_JELLYFIN_CACHE_V4');
      } catch {}
    }
    this.syncJellyfinMovies();
    jellyfinService.subscribe(() => {
      this.syncJellyfinMovies();
    });
  }

  public async syncJellyfinMovies(): Promise<void> {
    const config = jellyfinService.getConfig();
    if (!config.enabled) {
      this.jellyfinMovies = [];
      try {
        localStorage.removeItem('CINEAI_JELLYFIN_CACHE_V4');
      } catch {}
      this.notify();
      return;
    }

    try {
      const jMovies = await jellyfinService.fetchMovies();
      if (Array.isArray(jMovies) && jMovies.length > 0) {
        this.jellyfinMovies = jMovies;
        try {
          localStorage.setItem('CINEAI_JELLYFIN_CACHE_V4', JSON.stringify(jMovies));
        } catch {}
        this.notify();
      }
    } catch (err) {
      console.warn('Erro ao sincronizar filmes do Jellyfin:', err);
    }
  }

  private loadCatalog(): void {
    try {
      const currentVer = localStorage.getItem(CATALOG_VERSION_KEY);
      if (currentVer !== '5.0') {
        // Limpa resquícios de filmes mock antigos e atualiza para versão 5.0 com mais de 800 títulos
        localStorage.removeItem(STORAGE_KEY);
        localStorage.setItem(CATALOG_VERSION_KEY, '5.0');
      }

      const deletedStored = localStorage.getItem(DELETED_MOVIES_KEY);
      const deletedIds = new Set<string>([
        ...(deletedStored ? JSON.parse(deletedStored) : []),
        ...HARDCODED_DELETED_IDS,
      ]);

      const inactiveStored = localStorage.getItem(INACTIVE_MOVIES_KEY);
      const inactiveIds = new Set<string>(inactiveStored ? JSON.parse(inactiveStored) : []);

      // Remove imediatamente O Justiceiro das Sombras e outros filmes deletados das listas de histórico de todos os usuários
      HARDCODED_DELETED_IDS.forEach((did) => {
        userService.removeMovieFromAllProfiles(did);
      });

      const stored = localStorage.getItem(STORAGE_KEY);
      const customMovies: Movie[] = stored ? JSON.parse(stored) : [];
      // Mescla filmes customizados com catálogo oficial e exclui permanentemente filmes deletados
      const raw = [...customMovies, ...INITIAL_CATALOG].filter(
        (m) => !deletedIds.has(m.id) && !deletedIds.has(m.youtubeVideoId)
      );
      this.catalog = raw.map((m) => {
        const isInactive =
          inactiveIds.has(m.id) ||
          inactiveIds.has(m.youtubeVideoId) ||
          m.status === 'inactive' ||
          m.isActive === false;
        return {
          ...m,
          status: isInactive ? 'inactive' : 'active',
          isActive: !isInactive,
          subgenres: m.subgenres && m.subgenres.length > 0 ? m.subgenres : deriveMovieSubgenres(m),
          cast: m.cast && m.cast.length > 0 ? m.cast : deriveMovieCast(m),
        };
      });
    } catch {
      const deletedStored = typeof window !== 'undefined' ? localStorage.getItem(DELETED_MOVIES_KEY) : null;
      const deletedIds = new Set<string>([
        ...(deletedStored ? JSON.parse(deletedStored) : []),
        ...HARDCODED_DELETED_IDS,
      ]);
      const inactiveStored = typeof window !== 'undefined' ? localStorage.getItem(INACTIVE_MOVIES_KEY) : null;
      const inactiveIds = new Set<string>(inactiveStored ? JSON.parse(inactiveStored) : []);

      HARDCODED_DELETED_IDS.forEach((did) => {
        userService.removeMovieFromAllProfiles(did);
      });

      this.catalog = INITIAL_CATALOG.filter(
        (m) => !deletedIds.has(m.id) && !deletedIds.has(m.youtubeVideoId)
      ).map((m) => {
        const isInactive =
          inactiveIds.has(m.id) ||
          inactiveIds.has(m.youtubeVideoId) ||
          m.status === 'inactive' ||
          m.isActive === false;
        return {
          ...m,
          status: isInactive ? 'inactive' : 'active',
          isActive: !isInactive,
          subgenres: m.subgenres && m.subgenres.length > 0 ? m.subgenres : deriveMovieSubgenres(m),
          cast: m.cast && m.cast.length > 0 ? m.cast : deriveMovieCast(m),
        };
      });
    }
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

  /**
   * Retorna os filmes do catálogo.
   * Por padrão (includeInactive = false), retorna APENAS os filmes ATIVOS.
   * Filmes com status 'inactive' ou isActive: false são ocultados de toda a plataforma (Home, busca, carrosséis, IA).
   */
  public getAll(includeInactive = false): Movie[] {
    const all = [...this.jellyfinMovies, ...this.catalog];
    if (includeInactive) return all;
    return all.filter((m) => m.status !== 'inactive' && m.isActive !== false);
  }

  /**
   * Retorna o catálogo completo incluindo filmes inativos (para uso no painel Admin).
   */
  public getAllForAdmin(): Movie[] {
    return this.getAll(true);
  }

  public getJellyfinMovies(): Movie[] {
    return [...this.jellyfinMovies];
  }

  public getFeatured(): Movie[] {
    return this.getAll().filter((m) => m.featured);
  }

  public getById(id: string, includeInactive = false): Movie | undefined {
    return this.getAll(includeInactive).find((m) => m.id === id);
  }

  /**
   * Altera a situação do filme entre 'active' (visível) e 'inactive' (oculto).
   * Persiste a alteração no localStorage para manter a escolha do administrador.
   */
  public setMovieStatus(id: string, status: 'active' | 'inactive'): Movie | undefined {
    const index = this.catalog.findIndex((m) => m.id === id);
    if (index === -1) return undefined;

    const isInactive = status === 'inactive';
    const updated: Movie = {
      ...this.catalog[index],
      status,
      isActive: !isInactive,
    };
    this.catalog[index] = updated;

    try {
      const stored = localStorage.getItem(INACTIVE_MOVIES_KEY);
      let list: string[] = stored ? JSON.parse(stored) : [];
      if (isInactive) {
        if (!list.includes(id)) list.push(id);
        if (updated.youtubeVideoId && !list.includes(updated.youtubeVideoId)) {
          list.push(updated.youtubeVideoId);
        }
      } else {
        list = list.filter((x) => x !== id && x !== updated.youtubeVideoId);
      }
      localStorage.setItem(INACTIVE_MOVIES_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Erro ao salvar status de filme inativo:', e);
    }

    // Se for filme customizado, persiste no STORAGE_KEY
    try {
      const storedCustom = localStorage.getItem(STORAGE_KEY);
      if (storedCustom) {
        const customMovies: Movie[] = JSON.parse(storedCustom);
        const cIdx = customMovies.findIndex((m) => m.id === id);
        if (cIdx >= 0) {
          customMovies[cIdx] = updated;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(customMovies));
        }
      }
    } catch {}

    // Se tornado inativo, remove também das listas de visualização de perfil
    if (isInactive) {
      userService.removeMovieFromAllProfiles(id);
      if (updated.youtubeVideoId) {
        userService.removeMovieFromAllProfiles(updated.youtubeVideoId);
      }
    }

    this.notify();
    return updated;
  }

  /**
   * Alterna a situação do filme: se ativo -> inativa; se inativo -> ativa.
   */
  public toggleMovieStatus(id: string): Movie | undefined {
    const movie = this.catalog.find((m) => m.id === id);
    if (!movie) return undefined;
    const nextStatus = movie.status === 'inactive' || movie.isActive === false ? 'active' : 'inactive';
    return this.setMovieStatus(id, nextStatus);
  }

  public isMovieActive(id: string): boolean {
    const movie = this.catalog.find((m) => m.id === id);
    if (!movie) return false;
    return movie.status !== 'inactive' && movie.isActive !== false;
  }

  /**
   * Retorna os filmes mais recentes que entraram no catálogo (Lançamentos e Novidades).
   * Ordena preferencialmente pela data de adição (addedAt) decrescente,
   * seguida pelo ano de lançamento (releaseYear) e nota/relevância.
   */
  public getRecentReleases(limit?: number): Movie[] {
    const all = this.getAll();
    const sorted = [...all].sort((a, b) => {
      // 1. Data de entrada no catálogo (mais recente adicionado primeiro)
      if (a.addedAt && b.addedAt) {
        const timeA = new Date(a.addedAt).getTime();
        const timeB = new Date(b.addedAt).getTime();
        if (timeA !== timeB) return timeB - timeA;
      } else if (a.addedAt && !b.addedAt) {
        return -1;
      } else if (!a.addedAt && b.addedAt) {
        return 1;
      }

      // 2. Ano de lançamento do filme (mais novo primeiro)
      if (b.releaseYear !== a.releaseYear) {
        return b.releaseYear - a.releaseYear;
      }

      // 3. Nota / Avaliação
      return (b.ratingScore || 0) - (a.ratingScore || 0);
    });

    return limit ? sorted.slice(0, limit) : sorted;
  }

  public getByGenre(genre: string): Movie[] {
    const gTerm = normalizeStr(genre);
    if (gTerm === 'lancamentos' || gTerm === 'lancamento' || gTerm === 'novidades') {
      return this.getRecentReleases();
    }
    if (gTerm === 'jellyfin' || gTerm === 'local') {
      return [...this.jellyfinMovies];
    }
    const aliases = GENRE_ALIASES[gTerm] || [gTerm];
    return this.getAll().filter((m) =>
      m.genres.some((g) => {
        const normG = normalizeStr(g);
        return aliases.some((al) => normG.includes(al) || al.includes(normG));
      }) ||
      (gTerm === 'guerra' && (
        m.tags.some((t) => normalizeStr(t).includes('guerra') || normalizeStr(t).includes('batalha') || normalizeStr(t).includes('militar')) ||
        normalizeStr(m.title).includes('guerra') ||
        normalizeStr(m.title).includes('batalha') ||
        normalizeStr(m.title).includes('soldado')
      ))
    );
  }

  public addMovie(movie: Movie): Movie {
    const isInactive = movie.status === 'inactive' || movie.isActive === false;
    // Garante que o filme receba timestamp de adição ao entrar no catálogo
    const movieWithDate: Movie = {
      ...movie,
      status: isInactive ? 'inactive' : 'active',
      isActive: !isInactive,
      addedAt: movie.addedAt || new Date().toISOString(),
    };

    // Evita duplicatas pelo ID do YouTube
    const existingIndex = this.catalog.findIndex((m) => m.youtubeVideoId === movieWithDate.youtubeVideoId);
    if (existingIndex >= 0) {
      this.catalog[existingIndex] = movieWithDate;
    } else {
      this.catalog.unshift(movieWithDate);
    }

    if (isInactive) {
      try {
        const stored = localStorage.getItem(INACTIVE_MOVIES_KEY);
        let list: string[] = stored ? JSON.parse(stored) : [];
        if (!list.includes(movieWithDate.id)) list.push(movieWithDate.id);
        if (movieWithDate.youtubeVideoId && !list.includes(movieWithDate.youtubeVideoId)) {
          list.push(movieWithDate.youtubeVideoId);
        }
        localStorage.setItem(INACTIVE_MOVIES_KEY, JSON.stringify(list));
      } catch {}
    }

    // Persiste apenas os customizados
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const customMovies: Movie[] = stored ? JSON.parse(stored) : [];
      const updatedCustom = [movieWithDate, ...customMovies.filter((m) => m.youtubeVideoId !== movieWithDate.youtubeVideoId)];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCustom));
    } catch (e) {
      console.warn('Erro ao salvar filme no localStorage:', e);
    }

    this.notify();
    return movieWithDate;
  }

  public updateMovie(id: string, updates: Partial<Movie>): Movie | undefined {
    const index = this.catalog.findIndex((m) => m.id === id);
    if (index === -1) return undefined;

    const updated = { ...this.catalog[index], ...updates };

    if (updates.status !== undefined || updates.isActive !== undefined) {
      const isInactive = updates.status === 'inactive' || updates.isActive === false;
      updated.status = isInactive ? 'inactive' : 'active';
      updated.isActive = !isInactive;
      try {
        const stored = localStorage.getItem(INACTIVE_MOVIES_KEY);
        let list: string[] = stored ? JSON.parse(stored) : [];
        if (isInactive) {
          if (!list.includes(id)) list.push(id);
          if (updated.youtubeVideoId && !list.includes(updated.youtubeVideoId)) {
            list.push(updated.youtubeVideoId);
          }
        } else {
          list = list.filter((x) => x !== id && x !== updated.youtubeVideoId);
        }
        localStorage.setItem(INACTIVE_MOVIES_KEY, JSON.stringify(list));
      } catch {}
    }

    this.catalog[index] = updated;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const customMovies: Movie[] = stored ? JSON.parse(stored) : [];
      const customIndex = customMovies.findIndex((m) => m.id === id);
      if (customIndex >= 0) {
        customMovies[customIndex] = updated;
      } else {
        // Se era um filme inicial modificado, adiciona à lista de customizados para persistir
        customMovies.unshift(updated);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customMovies));
    } catch (e) {
      console.warn('Erro ao atualizar filme no localStorage:', e);
    }

    this.notify();
    return updated;
  }

  public removeMovie(id: string): void {
    const target = this.catalog.find((m) => m.id === id);
    this.catalog = this.catalog.filter((m) => m.id !== id);

    // 1. Persiste na lista de filmes deletados permanentemente para nunca reaparecer
    try {
      const stored = localStorage.getItem(DELETED_MOVIES_KEY);
      const list: string[] = stored ? JSON.parse(stored) : [];
      if (!list.includes(id)) list.push(id);
      if (target?.youtubeVideoId && !list.includes(target.youtubeVideoId)) {
        list.push(target.youtubeVideoId);
      }
      localStorage.setItem(DELETED_MOVIES_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Erro ao salvar ID deletado:', e);
    }

    // 2. Remove de customMovies se aplicável
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const customMovies: Movie[] = JSON.parse(stored);
        const filtered = customMovies.filter((m) => m.id !== id && m.youtubeVideoId !== target?.youtubeVideoId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      }
    } catch (e) {
      console.warn('Erro ao remover filme do localStorage:', e);
    }

    // 3. Remove imediatamente da lista de visualização do usuário (assistidos, favoritos e histórico)
    userService.removeMovieFromAllProfiles(id);
    if (target?.youtubeVideoId) {
      userService.removeMovieFromAllProfiles(target.youtubeVideoId);
    }

    this.notify();
  }

  public getDeletedMovieIds(): Set<string> {
    try {
      const stored = localStorage.getItem(DELETED_MOVIES_KEY);
      return new Set<string>(stored ? JSON.parse(stored) : []);
    } catch {
      return new Set<string>();
    }
  }

  public search(filters: SearchFilters): Movie[] {
    let results = this.getAll();

    if (filters.genre) {
      const gTerm = normalizeStr(filters.genre);
      if (gTerm === 'lancamentos' || gTerm === 'lancamento' || gTerm === 'novidades') {
        results = this.getRecentReleases();
      } else if (gTerm === 'jellyfin' || gTerm === 'local' || gTerm === 'servidor local') {
        results = results.filter((m) => m.source === 'jellyfin');
      } else {
        const aliases = GENRE_ALIASES[gTerm] || [gTerm];
        results = results.filter((m) =>
          m.genres.some((g) => {
            const normG = normalizeStr(g);
            return aliases.some((al) => normG.includes(al) || al.includes(normG));
          }) ||
          (gTerm === 'guerra' && (
            m.tags.some((t) => normalizeStr(t).includes('guerra') || normalizeStr(t).includes('batalha') || normalizeStr(t).includes('militar')) ||
            normalizeStr(m.title).includes('guerra') ||
            normalizeStr(m.title).includes('batalha') ||
            normalizeStr(m.title).includes('soldado') ||
            normalizeStr(m.synopsis).includes('guerra')
          ))
        );
      }
    }

    if (filters.subgenre) {
      const sgTerm = normalizeStr(filters.subgenre);
      results = results.filter((m) =>
        (m.subgenres || []).some((sg) => normalizeStr(sg).includes(sgTerm)) ||
        m.tags.some((t) => normalizeStr(t).includes(sgTerm)) ||
        normalizeStr(m.badge || '').includes(sgTerm) ||
        normalizeStr(m.synopsis).includes(sgTerm) ||
        m.genres.some((g) => normalizeStr(g).includes(sgTerm))
      );
    }

    if (filters.actor) {
      const aTerm = normalizeStr(filters.actor);
      results = results.filter((m) =>
        (m.cast || []).some((act) => normalizeStr(act).includes(aTerm)) ||
        normalizeStr(m.title).includes(aTerm) ||
        normalizeStr(m.synopsis).includes(aTerm) ||
        m.tags.some((t) => normalizeStr(t).includes(aTerm))
      );
    }

    if (filters.mood) {
      const mTerm = normalizeStr(filters.mood);
      const MOOD_MAP: Record<string, string[]> = {
        divertido: ['divertido', 'engracado', 'comedia', 'riso', 'descontraido', 'alegre'],
        rir: ['divertido', 'engracado', 'comedia', 'riso', 'descontraido', 'alegre'],
        adrenalina: ['adrenalina', 'eletrizante', 'acao', 'combate', 'tiroteio', 'velocidade', 'luta', 'artes marciais'],
        tenso: ['tenso', 'suspense', 'assustador', 'medo', 'terror', 'misterio', 'sombrio', 'frio'],
        emocionante: ['emocionante', 'inspirador', 'tocante', 'superacao', 'drama', 'lagrimas', 'emocao'],
        romantico: ['romantico', 'amor', 'paixao', 'romance', 'casal', 'namoro'],
        pensar: ['reflexivo', 'intrigante', 'misterio', 'filosofico', 'futurista', 'complexo', 'pensar'],
        familia: ['familia', 'infantil', 'leve', 'descontraido', 'animais', 'amizade', 'animacao'],
        inspirador: ['inspirador', 'fe', 'espiritual', 'esperanca', 'superacao', 'milagre', 'biblico'],
        curioso: ['curioso', 'fascinante', 'ficcao', 'sci-fi', 'futurista', 'espacial', 'alien']
      };
      const moodKeywords = MOOD_MAP[mTerm] || [mTerm];
      results = results.filter((m) =>
        m.moods.some((mood) => moodKeywords.some(k => normalizeStr(mood).includes(k))) ||
        m.tags.some((t) => moodKeywords.some(k => normalizeStr(t).includes(k))) ||
        m.genres.some((g) => moodKeywords.some(k => normalizeStr(g).includes(k))) ||
        (m.subgenres || []).some((sg) => moodKeywords.some(k => normalizeStr(sg).includes(k)))
      );
    }

    if (filters.maxDurationMinutes) {
      results = results.filter((m) => m.durationMinutes <= (filters.maxDurationMinutes || 999));
    }

    if (filters.minYear) {
      results = results.filter((m) => m.releaseYear >= (filters.minYear || 0));
    }

    if (filters.maxYear) {
      results = results.filter((m) => m.releaseYear <= (filters.maxYear || 9999));
    }

    if (filters.language) {
      results = results.filter((m) => m.language === filters.language);
    }

    if (filters.query && filters.query.trim().length > 0) {
      const rawTokens = normalizeStr(filters.query).split(/[^\w\d]+/).filter(Boolean);
      // Filtra stop-words apenas se sobrarem palavras significativas
      const meaningfulTokens = rawTokens.filter((t) => !STOP_WORDS.has(t) && t.length > 1);
      const queryTokens = meaningfulTokens.length > 0 ? meaningfulTokens : rawTokens;

      // Expande termos semanticamente
      const expandedTerms = new Set<string>();
      for (const token of queryTokens) {
        expandedTerms.add(token);
        if (SEMANTIC_CLUSTERS[token]) {
          SEMANTIC_CLUSTERS[token].forEach((syn) => expandedTerms.add(normalizeStr(syn)));
        }
      }

      results = results
        .map((movie) => {
          let score = 0;
          const normTitle = normalizeStr(movie.title);
          const normOriginal = normalizeStr(movie.originalTitle || '');
          const normTags = movie.tags.map((t) => normalizeStr(t));
          const normMoods = movie.moods.map((m) => normalizeStr(m));
          const normGenres = movie.genres.map((g) => normalizeStr(g));
          const normSynopsis = normalizeStr(movie.synopsis);

          const normSubgenres = (movie.subgenres || []).map((s) => normalizeStr(s));
          const normCast = (movie.cast || []).map((c) => normalizeStr(c));

          // 0. Bônus forte para match da frase inteira digitada
          const fullQueryNorm = normalizeStr(filters.query || '');
          if (normTitle.includes(fullQueryNorm)) {
            score += 100;
          }
          if (normOriginal.includes(fullQueryNorm)) {
            score += 80;
          }
          if (normCast.some((c) => c.includes(fullQueryNorm))) {
            score += 90;
          }
          if (normTags.some((t) => t.includes(fullQueryNorm))) {
            score += 50;
          }
          if (normSynopsis.includes(fullQueryNorm)) {
            score += 40;
          }

          // 1. Pontuação para termos diretos da busca do usuário
          for (const token of queryTokens) {
            // Pontuações fortes para o título
            if (normTitle === token) {
              score += 50;
            } else if (new RegExp(`(^|\\s)${token}(\\s|$)`, 'i').test(normTitle)) {
              score += 35;
            } else if (normTitle.includes(token)) {
              score += 20;
            }

            // Atores / Elenco
            if (normCast.some((c) => c === token || c.includes(token))) {
              score += 45;
            }

            // Subgêneros
            if (normSubgenres.some((sg) => sg === token || sg.includes(token))) {
              score += 25;
            }

            // Tags (palavras-chave diretas)
            if (normTags.some((t) => t === token || new RegExp(`(^|\\s)${token}(\\s|$)`, 'i').test(t))) {
              score += 28;
            } else if (normTags.some((t) => t.includes(token))) {
              score += 15;
            }

            // Gêneros
            if (normGenres.some((g) => g === token || new RegExp(`(^|\\s)${token}(\\s|$)`, 'i').test(g))) {
              score += 20;
            }

            // Impulso prioritário para temas específicos solicitados como Guerra
            if (token === 'guerra' || token === 'guerras') {
              if (normTitle.includes('guerra') || normTitle.includes('batalha')) score += 55;
              if (normGenres.some((g) => g.includes('guerra'))) score += 50;
              if (normTags.some((t) => t.includes('guerra') || t.includes('segunda guerra') || t.includes('militar'))) score += 40;
            }

            // Humores / Moods
            if (normMoods.some((m) => m === token || new RegExp(`(^|\\s)${token}(\\s|$)`, 'i').test(m))) {
              score += 18;
            }

            // Sinopse
            if (new RegExp(`(^|\\s)${token}(\\s|$)`, 'i').test(normSynopsis)) {
              score += 10;
            } else if (normSynopsis.includes(token)) {
              score += 4;
            }

            // Título Original
            if (normOriginal.includes(token)) {
              score += 5;
            }
          }

          // 2. Pontuação adicional para sinônimos do cluster semântico
          for (const expTerm of expandedTerms) {
            if (queryTokens.includes(expTerm)) continue; // já pontuado

            if (normTitle.includes(expTerm)) {
              score += 15;
            }
            if (normCast.some((c) => c.includes(expTerm))) {
              score += 20;
            }
            if (normSubgenres.some((s) => s.includes(expTerm))) {
              score += 15;
            }
            if (normTags.some((t) => t.includes(expTerm))) {
              score += 14;
            }
            if (normMoods.some((m) => m.includes(expTerm))) {
              score += 10;
            }
            if (normGenres.some((g) => g.includes(expTerm))) {
              score += 8;
            }
            if (normSynopsis.includes(expTerm)) {
              score += 6;
            }
          }

          return { movie, score };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((item) => item.movie);
    }

    return results;
  }

  public getBySubgenre(subgenre: string): Movie[] {
    const sTerm = normalizeStr(subgenre);
    return this.getAll().filter((m) =>
      (m.subgenres || []).some((s) => normalizeStr(s).includes(sTerm))
    );
  }

  public getByActor(actor: string): Movie[] {
    const aTerm = normalizeStr(actor);
    return this.getAll().filter((m) =>
      (m.cast || []).some((a) => normalizeStr(a).includes(aTerm)) ||
      normalizeStr(m.title).includes(aTerm) ||
      normalizeStr(m.synopsis).includes(aTerm)
    );
  }
}

export const catalogService = new CatalogService();
