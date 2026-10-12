import type { Movie, UserAccount, UserProfile, ActivePlaybackSession } from '../types/movie';
import { apiUrl } from './apiConfig';

const LOCAL_STORAGE_KEY = 'CAIC_ACTIVE_PLAYBACK_SESSION_V1';
const BROADCAST_CHANNEL_NAME = 'caic_playback_channel_v1';

class PlaybackSessionService {
  private currentSessionId: string = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  private heartbeatInterval: any = null;
  private currentAccount: UserAccount | null = null;
  private currentMovie: Movie | null = null;
  private terminatedListeners: Array<(session?: ActivePlaybackSession) => void> = [];
  private broadcastChannel: BroadcastChannel | null = null;

  constructor() {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        this.broadcastChannel.onmessage = (event) => {
          this.handleBroadcastMessage(event.data);
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel não suportado neste navegador:', e);
    }
  }

  public getDeviceDetails(): { name: string; type: 'mobile' | 'tv' | 'desktop' } {
    if (typeof window === 'undefined') {
      return { name: 'Computador', type: 'desktop' };
    }

    const ua = navigator.userAgent.toLowerCase();
    const isTvParam = window.location.hash.includes('tv') || localStorage.getItem('CAIC_TV_MODE') === 'true';
    const isTvUA = ua.includes('tv') || ua.includes('tizen') || ua.includes('webos') || ua.includes('googletv') || ua.includes('android tv') || ua.includes('box');

    if (isTvParam || isTvUA) {
      return { name: 'Box TV / Smart TV', type: 'tv' };
    }

    const isMobile = /android|iphone|ipad|ipod|mobile/i.test(ua) || (window.innerWidth < 768 && 'ontouchstart' in window);
    if (isMobile) {
      const isApple = /iphone|ipad|ipod/i.test(ua);
      return { name: isApple ? 'iPhone / iPad' : 'Celular Android', type: 'mobile' };
    }

    return { name: 'Computador (Navegador)', type: 'desktop' };
  }

  public async requestPlayback(
    movie: Movie,
    account: UserAccount,
    profile?: UserProfile
  ): Promise<{ allowed: boolean; activeSession?: ActivePlaybackSession; message?: string }> {
    this.currentAccount = account;
    this.currentMovie = movie;

    const device = this.getDeviceDetails();
    const payload = {
      sessionId: this.currentSessionId,
      accountId: account.id,
      email: account.email.toLowerCase().trim(),
      profileId: profile?.id,
      userName: profile?.name || account.name,
      movieTitle: movie.title,
      movieId: movie.id,
      deviceName: device.name,
      deviceType: device.type,
      startedAt: new Date().toISOString(),
    };

    // 1. Verificação via Servidor Backend (Cross-device: celular vs TV box via rede)
    try {
      const res = await fetch(apiUrl('/api/playback/start'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.allowed) {
          this.startHeartbeatLoop();
          this.broadcastStart(payload as ActivePlaybackSession);
          return { allowed: true };
        } else {
          return {
            allowed: false,
            activeSession: data.activeSession,
            message: data.message,
          };
        }
      }
    } catch {
      // Fallback local caso servidor não responda
    }

    // 2. Fallback via LocalStorage / Broadcast (mesmo navegador / abas)
    const stored = this.getLocalSession(account.email);
    if (stored && stored.sessionId !== this.currentSessionId && Date.now() - stored.lastHeartbeat < 14000) {
      return {
        allowed: false,
        activeSession: stored,
        message: `Limite de 1 acesso por vez: O aparelho "${stored.deviceName}" já está assistindo ao filme "${stored.movieTitle}".`,
      };
    }

    this.setLocalSession({ ...payload, lastHeartbeat: Date.now() } as ActivePlaybackSession);
    this.startHeartbeatLoop();
    this.broadcastStart({ ...payload, lastHeartbeat: Date.now() } as ActivePlaybackSession);
    return { allowed: true };
  }

  public async forceTakeover(
    movie: Movie,
    account: UserAccount,
    profile?: UserProfile
  ): Promise<boolean> {
    this.currentAccount = account;
    this.currentMovie = movie;
    const device = this.getDeviceDetails();

    const payload = {
      sessionId: this.currentSessionId,
      accountId: account.id,
      email: account.email.toLowerCase().trim(),
      profileId: profile?.id,
      userName: profile?.name || account.name,
      movieTitle: movie.title,
      movieId: movie.id,
      deviceName: device.name,
      deviceType: device.type,
      startedAt: new Date().toISOString(),
    };

    try {
      await fetch(apiUrl('/api/playback/takeover'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {}

    const sessionObj = { ...payload, lastHeartbeat: Date.now() } as ActivePlaybackSession;
    this.setLocalSession(sessionObj);
    this.broadcastStart(sessionObj);
    this.startHeartbeatLoop();
    return true;
  }

  public async stopPlayback(): Promise<void> {
    this.stopHeartbeatLoop();

    if (this.currentAccount) {
      const payload = {
        sessionId: this.currentSessionId,
        accountId: this.currentAccount.id,
        email: this.currentAccount.email.toLowerCase().trim(),
      };

      try {
        await fetch(apiUrl('/api/playback/stop'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch {}

      this.removeLocalSession(this.currentAccount.email);
      this.broadcastStop();
    }

    this.currentMovie = null;
  }

  private startHeartbeatLoop(): void {
    this.stopHeartbeatLoop();
    this.heartbeatInterval = setInterval(async () => {
      if (!this.currentAccount || !this.currentMovie) return;

      const device = this.getDeviceDetails();
      const payload = {
        sessionId: this.currentSessionId,
        accountId: this.currentAccount.id,
        email: this.currentAccount.email.toLowerCase().trim(),
        deviceName: device.name,
        deviceType: device.type,
        movieTitle: this.currentMovie.title,
        movieId: this.currentMovie.id,
      };

      // Atualiza localmente
      this.setLocalSession({ ...payload, startedAt: '', lastHeartbeat: Date.now() } as ActivePlaybackSession);

      try {
        const res = await fetch(apiUrl('/api/playback/heartbeat'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data = await res.json();
          if (!data.allowed && data.reason === 'taken_over') {
            this.notifyTerminated(data.activeSession);
          }
        }
      } catch {}
    }, 4000);
  }

  private stopHeartbeatLoop(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  public onTerminated(callback: (session?: ActivePlaybackSession) => void): () => void {
    this.terminatedListeners.push(callback);
    return () => {
      this.terminatedListeners = this.terminatedListeners.filter((cb) => cb !== callback);
    };
  }

  private notifyTerminated(session?: ActivePlaybackSession): void {
    this.stopHeartbeatLoop();
    this.terminatedListeners.forEach((cb) => cb(session));
  }

  private getLocalSession(email: string): ActivePlaybackSession | null {
    try {
      const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${email.toLowerCase().trim()}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private setLocalSession(session: ActivePlaybackSession): void {
    try {
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_${session.email.toLowerCase().trim()}`, JSON.stringify(session));
    } catch {}
  }

  private removeLocalSession(email: string): void {
    try {
      localStorage.removeItem(`${LOCAL_STORAGE_KEY}_${email.toLowerCase().trim()}`);
    } catch {}
  }

  private broadcastStart(session: ActivePlaybackSession): void {
    try {
      this.broadcastChannel?.postMessage({ type: 'SESSION_START', session });
    } catch {}
  }

  private broadcastStop(): void {
    try {
      this.broadcastChannel?.postMessage({ type: 'SESSION_STOP', sessionId: this.currentSessionId });
    } catch {}
  }

  private handleBroadcastMessage(data: any): void {
    if (data?.type === 'SESSION_START' && data.session) {
      if (
        this.currentAccount &&
        this.currentAccount.email.toLowerCase().trim() === data.session.email.toLowerCase().trim() &&
        data.session.sessionId !== this.currentSessionId
      ) {
        // Outro aparelho no mesmo navegador/canal assumiu
        this.notifyTerminated(data.session);
      }
    }
  }
}

export const playbackSessionService = new PlaybackSessionService();
