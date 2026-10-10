import type { Movie, ContentRating, MovieLanguage } from '../types/movie';
import { deriveMovieSubgenres, deriveMovieCast } from '../data/genreTaxonomy';

export interface JellyfinConfig {
  serverUrl: string;
  apiKey: string;
  userId: string;
  enabled: boolean;
  maxMovies: number;
}

const STORAGE_KEY = 'CINEAI_JELLYFIN_CONFIG_V6';

const DEFAULT_CONFIG: JellyfinConfig = {
  serverUrl: 'https://filme.manerostream.com.br',
  apiKey: '523e1d075fc0450caa0d7c1e862df424',
  userId: '6f398b88cffa4147b029cfffed37b390',
  enabled: false,
  maxMovies: 100,
};

export class JellyfinService {
  private config: JellyfinConfig;
  private listeners: Array<() => void> = [];

  constructor() {
    this.config = this.loadConfig();
    this.syncFromSharedDb();
  }

  private loadConfig(): JellyfinConfig {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Erro ao carregar configurações do Jellyfin:', e);
    }
    return { ...DEFAULT_CONFIG };
  }

  private async syncFromSharedDb(): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        const res = await fetch('/api/admin/db');
        if (res.ok) {
          const data = await res.json();
          if (data.jellyfinConfig && data.jellyfinConfig.serverUrl) {
            const remote = data.jellyfinConfig;
            let changed = false;
            if (remote.serverUrl && remote.serverUrl !== this.config.serverUrl) {
              this.config.serverUrl = remote.serverUrl;
              this.config.userId = ''; // Reset userId for new server
              changed = true;
            }
            if (remote.apiKey !== undefined && remote.apiKey !== this.config.apiKey) {
              this.config.apiKey = remote.apiKey;
              changed = true;
            }
            if (remote.userId) {
              this.config.userId = remote.userId;
            }
            if (remote.maxMovies !== undefined && remote.maxMovies !== this.config.maxMovies) {
              this.config.maxMovies = remote.maxMovies;
              changed = true;
            }
            if (remote.enabled !== undefined && remote.enabled !== this.config.enabled) {
              this.config.enabled = remote.enabled;
              changed = true;
            }
            if (changed) {
              try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
              } catch {}
              this.notifyListeners();
            }
          }
        }
      }
    } catch {}
  }

  private async syncToSharedDb(): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        await fetch('/api/admin/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jellyfinConfig: this.config }),
        });
      }
    } catch {}
  }

  public getConfig(): JellyfinConfig {
    return { ...this.config };
  }

  public saveConfig(newConfig: Partial<JellyfinConfig>): void {
    const urlChanged = newConfig.serverUrl && newConfig.serverUrl !== this.config.serverUrl;
    const keyChanged = newConfig.apiKey !== undefined && newConfig.apiKey !== this.config.apiKey;

    this.config = {
      ...this.config,
      ...newConfig,
      // Se mudou de servidor ou de chave, limpa o userId antigo para re-descobrir
      ...(urlChanged || keyChanged ? { userId: newConfig.userId || '' } : {}),
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
    } catch (e) {
      console.error('Erro ao salvar configuração do Jellyfin:', e);
    }
    this.syncToSharedDb();
    this.notifyListeners();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Erro em listener do JellyfinService:', err);
      }
    });
  }

  public getCleanUrl(): string {
    let url = (this.config.serverUrl || '').trim().replace(/\/+$/, '');
    if (!url) return '';
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `http://${url}`;
    }
    return url;
  }

  private getAuthHeader(): string {
    const token = (this.config.apiKey || '').trim();
    return `MediaBrowser Client="CineAI", Device="Web", DeviceId="CineAI-Web", Version="1.0.0", Token="${token}"`;
  }

  /**
   * Executa requisição para o Jellyfin, com fallback transparente pelo proxy do Vite
   * caso ocorra bloqueio de CORS no navegador para servidores remotos/outros IPs.
   */
  private async fetchJellyfin(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const cleanUrl = this.getCleanUrl();
    const token = (this.config.apiKey || '').trim();
    const sep = endpoint.includes('?') ? '&' : '?';
    const endpointWithToken = token ? `${endpoint}${sep}api_key=${encodeURIComponent(token)}` : endpoint;
    const fullUrl = `${cleanUrl}${endpointWithToken.startsWith('/') ? endpointWithToken : '/' + endpointWithToken}`;
    const authHeader = this.getAuthHeader();

    const headers: Record<string, string> = {
      ...(options.headers as any || {}),
      Authorization: authHeader,
      'X-Emby-Token': token,
    };

    const isRemote = !cleanUrl.includes('localhost') && !cleanUrl.includes('127.0.0.1');

    // 1. Para servidores remotos HTTPS, prefere imediatamente o proxy local para evitar CORS / SSL leaf errors no browser
    if (isRemote) {
      try {
        const proxyUrl = `/api/jellyfin/proxy?url=${encodeURIComponent(fullUrl)}`;
        const proxyRes = await fetch(proxyUrl, { ...options, headers });
        if (proxyRes.ok) return proxyRes;
      } catch {}
    }

    // 2. Tenta direto
    try {
      const res = await fetch(fullUrl, { ...options, headers });
      if (res.ok) return res;
      const proxyUrl = `/api/jellyfin/proxy?url=${encodeURIComponent(fullUrl)}`;
      return await fetch(proxyUrl, { ...options, headers });
    } catch {
      const proxyUrl = `/api/jellyfin/proxy?url=${encodeURIComponent(fullUrl)}`;
      return await fetch(proxyUrl, { ...options, headers });
    }
  }

  /**
   * Descobre e armazena o userId válido no servidor Jellyfin conectado
   */
  public async discoverUserId(): Promise<string> {
    try {
      const usersRes = await this.fetchJellyfin('/Users');
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        if (Array.isArray(usersData) && usersData.length > 0) {
          const adminUser = usersData.find((u: any) => u.Policy?.IsAdministrator);
          const selected = adminUser || usersData[0];
          const id = selected.Id;
          if (id) {
            this.config.userId = id;
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
            } catch {}
            this.syncToSharedDb();
            return id;
          }
        }
      }
    } catch {}

    // Fallback: /Users/Public
    try {
      const pubRes = await this.fetchJellyfin('/Users/Public');
      if (pubRes.ok) {
        const pubData = await pubRes.json();
        if (Array.isArray(pubData) && pubData.length > 0) {
          const id = pubData[0].Id;
          if (id) {
            this.config.userId = id;
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
            } catch {}
            this.syncToSharedDb();
            return id;
          }
        }
      }
    } catch {}

    return '';
  }

  /**
   * Testa a conectividade com o servidor Jellyfin
   */
  public async checkConnection(): Promise<{ connected: boolean; serverName?: string; version?: string; message: string }> {
    const cleanUrl = this.getCleanUrl();
    if (!cleanUrl) {
      return { connected: false, message: 'URL do servidor não configurada.' };
    }

    try {
      const response = await this.fetchJellyfin('/System/Info');

      if (response.status === 401) {
        return { connected: false, message: 'Não autorizado: verifique a Chave de API (API Key) do Jellyfin.' };
      }

      if (!response.ok) {
        return { connected: false, message: `Erro ao conectar: status ${response.status} (${response.statusText})` };
      }

      const data = await response.json();

      // Já descobre e atualiza o userId válido para este servidor em background
      this.discoverUserId().catch(() => {});

      return {
        connected: true,
        serverName: data.ServerName || 'Jellyfin Server',
        version: data.Version || 'Desconhecida',
        message: `Conectado com sucesso ao servidor "${data.ServerName}" (v${data.Version})!`,
      };
    } catch (err: any) {
      return {
        connected: false,
        message: `Não foi possível acessar o Jellyfin em ${cleanUrl}. Verifique se o servidor está ativo. (${err.message || err})`,
      };
    }
  }

  /**
   * Obtém a URL direta de streaming de vídeo para o player HTML5
   */
  public getStreamUrl(itemId: string): string {
    const cleanUrl = this.getCleanUrl();
    const token = encodeURIComponent((this.config.apiKey || '').trim());
    const rawUrl = `${cleanUrl}/Videos/${itemId}/stream?static=true&api_key=${token}`;
    if (!cleanUrl.includes('localhost') && !cleanUrl.includes('127.0.0.1')) {
      return `/api/jellyfin/proxy?url=${encodeURIComponent(rawUrl)}`;
    }
    return rawUrl;
  }

  /**
   * Obtém a URL do pôster / capa do filme
   */
  public getPosterUrl(itemId: string): string {
    const cleanUrl = this.getCleanUrl();
    const apiKey = (this.config.apiKey || '').trim();
    const authParam = apiKey ? `&api_key=${encodeURIComponent(apiKey)}` : '';
    const rawUrl = `${cleanUrl}/Items/${itemId}/Images/Primary?fillWidth=400&quality=90${authParam}`;
    if (!cleanUrl.includes('localhost') && !cleanUrl.includes('127.0.0.1')) {
      return `/api/jellyfin/proxy?url=${encodeURIComponent(rawUrl)}`;
    }
    return rawUrl;
  }

  /**
   * Obtém a URL do backdrop / banner de fundo do filme
   */
  public getBackdropUrl(itemId: string): string {
    const cleanUrl = this.getCleanUrl();
    const apiKey = (this.config.apiKey || '').trim();
    const authParam = apiKey ? `&api_key=${encodeURIComponent(apiKey)}` : '';
    const rawUrl = `${cleanUrl}/Items/${itemId}/Images/Backdrop?fillWidth=1280&quality=80${authParam}`;
    if (!cleanUrl.includes('localhost') && !cleanUrl.includes('127.0.0.1')) {
      return `/api/jellyfin/proxy?url=${encodeURIComponent(rawUrl)}`;
    }
    return rawUrl;
  }

  /**
   * Busca os filmes cadastrados no servidor Jellyfin e converte para o modelo do CineAI
   */
  public async fetchMovies(): Promise<Movie[]> {
    // 1. Tenta carregar primeiro através da API interna do Vite (/api/jellyfin/movies)
    try {
      if (typeof window !== 'undefined') {
        const backendRes = await fetch('/api/jellyfin/movies');
        if (backendRes.ok) {
          const backendData = await backendRes.json();
          if (Array.isArray(backendData.movies) && backendData.movies.length > 0) {
            return backendData.movies;
          }
        }
      }
    } catch {}

    const cleanUrl = this.getCleanUrl();
    if (!this.config.enabled || !cleanUrl) {
      return [];
    }

    const limit = this.config.maxMovies > 0 ? this.config.maxMovies : 100;

    try {
      // 2. Tenta obter o userId válido do servidor
      let userId = (this.config.userId || '').trim();
      if (!userId) {
        userId = await this.discoverUserId();
      }

      // 2. Monta a URL de consulta de filmes
      let itemsEndpoint = userId
        ? `/Users/${userId}/Items?IncludeItemTypes=Movie&Recursive=true&Fields=Overview,Genres,People,MediaSources,RunTimeTicks,ProductionYear,CommunityRating,Taglines,OriginalTitle&SortBy=DateCreated&SortOrder=Descending&Limit=${limit}`
        : `/Items?IncludeItemTypes=Movie&Recursive=true&Fields=Overview,Genres,People,MediaSources,RunTimeTicks,ProductionYear,CommunityRating,Taglines,OriginalTitle&SortBy=DateCreated&SortOrder=Descending&Limit=${limit}`;

      let res = await this.fetchJellyfin(itemsEndpoint);

      // 3. Se deu 404 (provavelmente o userId era do servidor antigo), redescobre os usuários
      if (res.status === 404 && userId) {
        userId = await this.discoverUserId();
        itemsEndpoint = userId
          ? `/Users/${userId}/Items?IncludeItemTypes=Movie&Recursive=true&Fields=Overview,Genres,People,MediaSources,RunTimeTicks,ProductionYear,CommunityRating,Taglines,OriginalTitle&SortBy=DateCreated&SortOrder=Descending&Limit=${limit}`
          : `/Items?IncludeItemTypes=Movie&Recursive=true&Fields=Overview,Genres,People,MediaSources,RunTimeTicks,ProductionYear,CommunityRating,Taglines,OriginalTitle&SortBy=DateCreated&SortOrder=Descending&Limit=${limit}`;
        res = await this.fetchJellyfin(itemsEndpoint);
      }

      // 4. Se ainda assim não retornou 200, tenta rota pública geral /Items
      if (!res.ok) {
        res = await this.fetchJellyfin(`/Items?IncludeItemTypes=Movie&Recursive=true&Fields=Overview,Genres,People,MediaSources,RunTimeTicks,ProductionYear,CommunityRating,Taglines,OriginalTitle&SortBy=DateCreated&SortOrder=Descending&Limit=${limit}`);
      }

      if (!res.ok) {
        console.warn(`Jellyfin API respondeu com status ${res.status}`);
        return [];
      }

      const data = await res.json();
      const items: any[] = data.Items || [];

      // 5. Converte itens do Jellyfin para o formato Movie do CineAI / CAIC
      const mappedMovies: Movie[] = items.map((item) => {
        const runTimeMinutes = item.RunTimeTicks
          ? Math.max(1, Math.round(item.RunTimeTicks / 600000000))
          : 90;

        const actors: string[] = (item.People || [])
          .filter((p: any) => p.Type === 'Actor')
          .slice(0, 6)
          .map((p: any) => p.Name);

        const genresList: string[] = (item.Genres && item.Genres.length > 0)
          ? item.Genres
          : ['Cinema'];

        const hasPrimary = Boolean(item.ImageTags?.Primary);
        const hasBackdrop = Boolean(item.BackdropImageTags && item.BackdropImageTags.length > 0);
        const defaultPlaceholder = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80';

        const primaryPoster = hasPrimary ? this.getPosterUrl(item.Id) : defaultPlaceholder;
        const backdrop = hasBackdrop ? this.getBackdropUrl(item.Id) : primaryPoster;

        const candidateMovie: Partial<Movie> = {
          id: `jellyfin_${item.Id}`,
          title: item.Name || 'Filme sem título',
          originalTitle: item.OriginalTitle || undefined,
          synopsis: item.Overview || 'Filme do acervo local Jellyfin.',
          genres: genresList,
          cast: actors,
          tags: item.Taglines && item.Taglines.length > 0 ? item.Taglines : ['acervo local', 'jellyfin'],
          moods: ['cinema em casa'],
          releaseYear: item.ProductionYear || new Date().getFullYear(),
          durationMinutes: runTimeMinutes,
          posterUrl: primaryPoster,
          backdropUrl: backdrop,
          channelName: 'Servidor Jellyfin',
          contentRating: (item.OfficialRating as ContentRating) || '14',
          language: 'Dublado' as MovieLanguage,
          ratingScore: item.CommunityRating ? Math.round(item.CommunityRating * 10) / 10 : 8.5,
          badge: 'Jellyfin Local',
          source: 'jellyfin',
          jellyfinItemId: item.Id,
          streamUrl: this.getStreamUrl(item.Id),
          youtubeVideoId: '',
          featured: false,
        };

        const subgenres = deriveMovieSubgenres(candidateMovie);
        const cast = deriveMovieCast(candidateMovie);

        return {
          ...candidateMovie,
          subgenres,
          cast: Array.from(new Set([...actors, ...cast])),
        } as Movie;
      });

      return mappedMovies;
    } catch (err) {
      console.error('Erro ao buscar filmes do Jellyfin:', err);
      return [];
    }
  }
}

export const jellyfinService = new JellyfinService();
