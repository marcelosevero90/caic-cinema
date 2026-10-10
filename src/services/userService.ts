import type { UserProfile, Movie, UserAccount, UserTasteQuiz, PaymentRecord } from '../types/movie';

const ACCOUNT_STORAGE_KEY = 'CAIC_USER_ACCOUNT_V4';
const PROFILES_STORAGE_KEY = 'CAIC_USER_PROFILES_V4';
const ACTIVE_PROFILE_ID_KEY = 'CAIC_ACTIVE_PROFILE_ID_V4';
const ALL_ACCOUNTS_STORAGE_KEY = 'CAIC_ALL_ACCOUNTS_V4';

export const AVATAR_PRESETS = [
  { id: 'cine-1', label: 'Herói Animado', url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=ShadowHero&backgroundColor=b6e3f4,c0aede,d1d4f9' },
  { id: 'cine-2', label: 'Robô Cinéfilo', url: 'https://api.dicebear.com/9.x/bottts/svg?seed=CinemaBot&backgroundColor=ffd5dc,ffdfbf,d1d4f9' },
  { id: 'cine-3', label: 'Maga Estelar', url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=StarMage&backgroundColor=c0aede,ffd5dc' },
  { id: 'cine-4', label: 'Cyborg Sci-Fi', url: 'https://api.dicebear.com/9.x/bottts/svg?seed=NexusCyborg&backgroundColor=b6e3f4,d1d4f9' },
  { id: 'cine-5', label: 'Guerreira Fantasia', url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Valkyrie&backgroundColor=ffd5dc,c0aede' },
  { id: 'cine-6', label: 'Droide Pipoca', url: 'https://api.dicebear.com/9.x/bottts/svg?seed=PopcornDroid&backgroundColor=ffdfbf,ffd5dc' },
  { id: 'cine-7', label: 'Ninja Cósmico', url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=CosmicNinja&backgroundColor=b6e3f4,c0aede' },
  { id: 'cine-8', label: 'Detetive Toon', url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=ToonSherlock&backgroundColor=ffdfbf,d1d4f9' },
  { id: 'cine-9', label: 'Guardião Galáctico', url: 'https://api.dicebear.com/9.x/bottts/svg?seed=GalacticGuardian&backgroundColor=d1d4f9,b6e3f4' },
  { id: 'cine-10', label: 'Aventureiro Épico', url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=EpicExplorer&backgroundColor=ffd5dc,ffdfbf' },
  { id: 'cine-11', label: 'Capitão Espacial', url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=SpaceCaptain&backgroundColor=b6e3f4,ffd5dc' },
  { id: 'cine-12', label: 'Androide IA', url: 'https://api.dicebear.com/9.x/bottts/svg?seed=GeminiAI&backgroundColor=c0aede,b6e3f4' },
  { id: 'cine-13', label: 'Piloto Veloz', url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=SkyAce&backgroundColor=ffdfbf,b6e3f4' },
  { id: 'cine-14', label: 'Mestre da Animação', url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=PixarStyle&backgroundColor=d1d4f9,ffd5dc' },
];

export function normalizeAvatar(url?: string): string {
  if (!url || url.includes('images.unsplash.com')) {
    return AVATAR_PRESETS[0].url;
  }
  return url;
}

// Registros de demonstração removidos conforme solicitação do usuário para testes 100% limpos
export const DEMO_ACCOUNTS: Array<{ account: UserAccount; profiles: UserProfile[] }> = [];

const GUEST_ACCOUNT: UserAccount = {
  id: 'guest',
  name: 'Visitante',
  email: 'visitante@caic.com.br',
  plan: 'Gratuito',
  subscriptionPlan: 'free',
  subscriptionStatus: 'trial',
  trialStartDate: new Date().toISOString(),
  trialEndDate: new Date(Date.now() + 7 * 86400000).toISOString(),
  createdAt: new Date().toISOString(),
  avatar: AVATAR_PRESETS[0].url,
  isAuthenticated: false,
};

const GUEST_PROFILE: UserProfile = {
  id: 'guest-profile',
  name: 'Visitante',
  avatar: AVATAR_PRESETS[0].url,
  favoriteMovieIds: [],
  watchedMovieIds: [],
  watchHistory: [],
  preferredGenres: ['Ação', 'Guerra', 'Comédia', 'Drama'],
  preferredMoods: ['divertido', 'emocionante'],
};

class UserService {
  private currentAccount: UserAccount = GUEST_ACCOUNT;
  private profiles: UserProfile[] = [GUEST_PROFILE];
  private activeProfileId: string = GUEST_PROFILE.id;
  private allAccounts: UserAccount[] = [];
  private listeners: Array<() => void> = [];

  constructor() {
    this.loadState();
    this.syncFromSharedDb();
  }

  private async syncToSharedDb(): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        await fetch('/api/admin/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accounts: this.allAccounts }),
        });
      }
    } catch {
      // Falha silenciosa em dev ou offline
    }
  }

  private async syncFromSharedDb(): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        const res = await fetch('/api/admin/db');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.accounts) && data.accounts.length > 0) {
            let changed = false;
            for (const remoteAcc of data.accounts) {
              const idx = this.allAccounts.findIndex(
                (a) => a.id === remoteAcc.id || a.email.toLowerCase() === remoteAcc.email.toLowerCase()
              );
              if (idx >= 0) {
                this.allAccounts[idx] = { ...this.allAccounts[idx], ...remoteAcc };
              } else {
                this.allAccounts.push(remoteAcc);
                changed = true;
              }
            }
            if (changed) {
              try {
                localStorage.setItem(ALL_ACCOUNTS_STORAGE_KEY, JSON.stringify(this.allAccounts));
              } catch {}
              this.notify();
            }
          }
        }
      }
    } catch {}
  }

  private loadState(): void {
    try {
      // Limpar chaves legadas obsoletas
      ['CAIC_USER_ACCOUNT_V3', 'CAIC_USER_PROFILES_V3', 'CAIC_ACTIVE_PROFILE_ID_V3', 'CAIC_ALL_ACCOUNTS_V3',
       'CAIC_USER_ACCOUNT_V2', 'CAIC_USER_PROFILES_V2'].forEach(k => {
        try { localStorage.removeItem(k); } catch {}
      });

      // 1. Carrega a lista geral de contas cadastradas
      const storedAll = localStorage.getItem(ALL_ACCOUNTS_STORAGE_KEY);
      if (storedAll) {
        const list = JSON.parse(storedAll) as UserAccount[];
        // Remove apenas contas demo mockadas legadas
        this.allAccounts = list.filter(
          (a) => a.email !== 'marcelo@caic.com.br' && a.email !== 'familia@caic.com.br' && a.email !== 'carlos.cine@gmail.com'
        );
      } else {
        this.allAccounts = [];
      }

      // 2. Carrega a conta atualmente autenticada (sessão persistente)
      const storedAccount = localStorage.getItem(ACCOUNT_STORAGE_KEY);
      if (storedAccount) {
        const parsed = JSON.parse(storedAccount);
        if (parsed && parsed.isAuthenticated && parsed.id !== 'guest') {
          this.currentAccount = parsed;
          this.syncAccountIntoAllList(this.currentAccount);
        } else {
          this.currentAccount = GUEST_ACCOUNT;
        }
      } else {
        this.currentAccount = GUEST_ACCOUNT;
      }

      // 3. Carrega os perfis e quiz da conta
      if (this.currentAccount.isAuthenticated && this.currentAccount.id !== 'guest') {
        const storedProfiles = localStorage.getItem(PROFILES_STORAGE_KEY);
        const perAccountProfiles = localStorage.getItem(`CAIC_PROFILES_${this.currentAccount.id}`);
        
        let loadedProfiles: UserProfile[] | null = null;
        if (storedProfiles) {
          try {
            const parsed = JSON.parse(storedProfiles);
            if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id !== 'guest-profile') {
              loadedProfiles = parsed;
            }
          } catch {}
        }
        
        if (!loadedProfiles && perAccountProfiles) {
          try {
            const parsed = JSON.parse(perAccountProfiles);
            if (Array.isArray(parsed) && parsed.length > 0) {
              loadedProfiles = parsed;
            }
          } catch {}
        }

        if (loadedProfiles) {
          this.profiles = loadedProfiles;
        } else {
          this.profiles = [{
            id: `prof-${this.currentAccount.id}`,
            name: this.currentAccount.name,
            avatar: this.currentAccount.avatar || AVATAR_PRESETS[0].url,
            favoriteMovieIds: [],
            watchedMovieIds: [],
            watchHistory: [],
            preferredGenres: ['Ação', 'Guerra', 'Comédia', 'Drama'],
            preferredMoods: ['divertido', 'emocionante'],
          }];
        }
      } else {
        this.profiles = [GUEST_PROFILE];
      }

      // 4. Perfil ativo
      const storedActiveId = localStorage.getItem(ACTIVE_PROFILE_ID_KEY);
      this.activeProfileId = storedActiveId && this.profiles.some(p => p.id === storedActiveId)
        ? storedActiveId
        : this.profiles[0]?.id || GUEST_PROFILE.id;

      // Normaliza avatares antigos (substitui fotos reais por avatares animados)
      if (this.currentAccount) {
        this.currentAccount.avatar = normalizeAvatar(this.currentAccount.avatar);
      }
      this.profiles.forEach(p => {
        p.avatar = normalizeAvatar(p.avatar);
      });
      this.allAccounts.forEach(a => {
        a.avatar = normalizeAvatar(a.avatar);
      });
    } catch {
      this.currentAccount = GUEST_ACCOUNT;
      this.profiles = [GUEST_PROFILE];
      this.activeProfileId = GUEST_PROFILE.id;
      this.allAccounts = [];
    }
  }

  private syncAccountIntoAllList(account: UserAccount): void {
    if (!account || account.id === 'guest') return;
    const idx = this.allAccounts.findIndex((a) => a.id === account.id || a.email.toLowerCase() === account.email.toLowerCase());
    if (idx >= 0) {
      this.allAccounts[idx] = { ...this.allAccounts[idx], ...account };
    } else {
      this.allAccounts.push(account);
    }
  }

  private saveState(): void {
    try {
      if (this.currentAccount.isAuthenticated && this.currentAccount.id !== 'guest') {
        localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(this.currentAccount));
        localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(this.profiles));
        localStorage.setItem(ACTIVE_PROFILE_ID_KEY, this.activeProfileId);
        localStorage.setItem(`CAIC_PROFILES_${this.currentAccount.id}`, JSON.stringify(this.profiles));
        this.syncAccountIntoAllList(this.currentAccount);
      } else {
        localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(GUEST_ACCOUNT));
        localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify([GUEST_PROFILE]));
        localStorage.setItem(ACTIVE_PROFILE_ID_KEY, GUEST_PROFILE.id);
      }
      localStorage.setItem(ALL_ACCOUNTS_STORAGE_KEY, JSON.stringify(this.allAccounts));
    } catch (e) {
      console.warn('Erro ao salvar estado do usuário:', e);
    }
    this.syncToSharedDb();
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

  // ===== GERENCIAMENTO DE CONTA & LOGIN/LOGOFF =====

  public getAccount(): UserAccount {
    return { ...this.currentAccount };
  }

  public isAuthenticated(): boolean {
    return Boolean(this.currentAccount.isAuthenticated);
  }

  public loginWithDemo(_accountIndex: number): void {
    // Modo demo desabilitado para testes reais
  }

  public login(email: string, _password?: string): { success: boolean; message: string } {
    const normalized = email.trim().toLowerCase();
    const found = this.allAccounts.find((a) => a.email.toLowerCase() === normalized);

    if (found) {
      this.currentAccount = { ...found, isAuthenticated: true };
      const storedProfiles = localStorage.getItem(`CAIC_PROFILES_${found.id}`);
      if (storedProfiles) {
        try {
          this.profiles = JSON.parse(storedProfiles);
          this.activeProfileId = this.profiles[0]?.id || `prof-${found.id}`;
        } catch {
          this.profiles = [{
            id: `prof-${found.id}`,
            name: found.name,
            avatar: found.avatar || AVATAR_PRESETS[0].url,
            favoriteMovieIds: [],
            watchedMovieIds: [],
            watchHistory: [],
            preferredGenres: ['Ação', 'Guerra', 'Drama'],
            preferredMoods: ['emocionante', 'adrenalina'],
          }];
          this.activeProfileId = this.profiles[0].id;
        }
      } else {
        this.profiles = [{
          id: `prof-${found.id}`,
          name: found.name,
          avatar: found.avatar || AVATAR_PRESETS[0].url,
          favoriteMovieIds: [],
          watchedMovieIds: [],
          watchHistory: [],
          preferredGenres: ['Ação', 'Guerra', 'Drama'],
          preferredMoods: ['emocionante', 'adrenalina'],
        }];
        this.activeProfileId = this.profiles[0].id;
      }
      this.saveState();
      return { success: true, message: `Bem-vindo de volta, ${this.currentAccount.name}!` };
    }

    // Se a conta não existe, realiza cadastro automático no Plano Individual com 7 dias grátis
    const username = email.split('@')[0] || 'Usuário';
    const capitalized = username.charAt(0).toUpperCase() + username.slice(1);
    return this.register(capitalized, normalized, _password, 'individual');
  }

  public register(
    name: string,
    email: string,
    _password?: string,
    planType: 'individual' | 'family' | 'monthly' | 'annual' = 'individual',
    billingCycle: 'monthly' | 'annual' = 'monthly',
    phone?: string
  ): { success: boolean; message: string } {
    const trimmedName = name.trim() || 'Usuário CAIC';
    const isFamily = planType === 'family' || planType === 'annual';
    const chosenPlan: 'individual' | 'family' = isFamily ? 'family' : 'individual';
    const planName = isFamily
      ? (billingCycle === 'annual' ? 'Plano Família Anual (R$ 29,90/ano)' : 'Plano Família Mensal (R$ 9,90/mês)')
      : (billingCycle === 'annual' ? 'Plano Individual Anual (R$ 19,90/ano)' : 'Plano Individual Mensal (R$ 5,90/mês)');
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 7 * 86400000);

    const newAccount: UserAccount = {
      id: `acc-${Date.now()}`,
      name: trimmedName,
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || undefined,
      plan: planName,
      subscriptionPlan: chosenPlan,
      billingCycle,
      subscriptionStatus: 'trial',
      trialStartDate: now.toISOString(),
      trialEndDate: trialEnd.toISOString(),
      paymentMethod: 'Cartão de Crédito (7 Dias Grátis)',
      lastPaymentAmount: 0,
      paymentHistory: [
        {
          id: `pay-trial-${Date.now()}`,
          date: now.toISOString(),
          amount: 0,
          plan: `${planName} (7 Dias Grátis de Teste)`,
          status: 'paid',
          method: 'Período de Teste'
        }
      ],
      createdAt: now.toISOString(),
      avatar: AVATAR_PRESETS[0].url,
      isAuthenticated: true,
    };

    const initialProfile: UserProfile = {
      id: `prof-${Date.now()}`,
      name: trimmedName,
      avatar: AVATAR_PRESETS[0].url,
      favoriteMovieIds: [],
      watchedMovieIds: [],
      watchHistory: [],
      preferredGenres: ['Ação', 'Guerra', 'Drama', 'Comédia'],
      preferredMoods: ['emocionante', 'divertido'],
    };

    this.currentAccount = newAccount;
    this.profiles = [initialProfile];
    this.activeProfileId = initialProfile.id;
    this.saveState();
    return { success: true, message: `Conta criada com sucesso! Aproveite seus 7 dias grátis no CAIC (${planName}).` };
  }

  public subscribePlan(
    planType: 'individual' | 'family' | 'monthly' | 'annual',
    billingCycle: 'monthly' | 'annual' = 'monthly',
    paymentMethod = 'Cartão de Crédito'
  ): { success: boolean; message: string } {
    const isFamily = planType === 'family' || planType === 'annual';
    const chosenPlan: 'individual' | 'family' = isFamily ? 'family' : 'individual';
    const cycle = billingCycle;
    const price = isFamily ? (cycle === 'annual' ? 29.90 : 9.90) : (cycle === 'annual' ? 19.90 : 5.90);
    const planName = isFamily
      ? (cycle === 'annual' ? 'Plano Família Anual (R$ 29,90/ano)' : 'Plano Família Mensal (R$ 9,90/mês)')
      : (cycle === 'annual' ? 'Plano Individual Anual (R$ 19,90/ano)' : 'Plano Individual Mensal (R$ 5,90/mês)');
    const now = new Date();
    const isNewTrial = !this.currentAccount.trialStartDate;
    const durationDays = cycle === 'annual' ? 365 : 30;

    if (isNewTrial) {
      const trialEnd = new Date(now.getTime() + 7 * 86400000);
      this.currentAccount = {
        ...this.currentAccount,
        plan: planName,
        subscriptionPlan: chosenPlan,
        billingCycle: cycle,
        subscriptionStatus: 'trial',
        trialStartDate: now.toISOString(),
        trialEndDate: trialEnd.toISOString(),
        paymentMethod,
        lastPaymentAmount: 0,
        paymentHistory: [
          ...(this.currentAccount.paymentHistory || []),
          {
            id: `pay-trial-${Date.now()}`,
            date: now.toISOString(),
            amount: 0,
            plan: `${planName} - 7 Dias Grátis`,
            status: 'paid',
            method: paymentMethod
          }
        ]
      };
      this.saveState();
      return { success: true, message: `Parabéns! Seus 7 dias grátis do ${planName} foram ativados com sucesso.` };
    } else {
      const expires = new Date(now.getTime() + durationDays * 86400000);
      this.currentAccount = {
        ...this.currentAccount,
        plan: planName,
        subscriptionPlan: chosenPlan,
        billingCycle: cycle,
        subscriptionStatus: 'active',
        subscriptionExpiresAt: expires.toISOString(),
        lastPaymentDate: now.toISOString(),
        lastPaymentAmount: price,
        paymentMethod,
        paymentHistory: [
          ...(this.currentAccount.paymentHistory || []),
          {
            id: `pay-${Date.now()}`,
            date: now.toISOString(),
            amount: price,
            plan: planName,
            status: 'paid',
            method: paymentMethod
          }
        ]
      };
      this.saveState();
      return { success: true, message: `Assinatura do ${planName} confirmada com sucesso!` };
    }
  }

  public getMaxProfilesAllowed(): number {
    if (this.currentAccount.subscriptionPlan === 'family') {
      return 3;
    }
    return 1;
  }

  public canCreateProfile(): { allowed: boolean; reason?: string } {
    if (!this.currentAccount.isAuthenticated) {
      return { allowed: false, reason: 'Faça login ou crie sua conta para gerenciar perfis.' };
    }
    const max = this.getMaxProfilesAllowed();
    if (this.profiles.length >= max) {
      if (max === 1) {
        return {
          allowed: false,
          reason: 'O Plano Individual permite 1 perfil. Faça o upgrade para o Plano Família (R$ 9,90/mês ou R$ 29,90/ano) para criar até 3 perfis!'
        };
      }
      return {
        allowed: false,
        reason: 'Limite de 3 perfis atingido para o Plano Família.'
      };
    }
    return { allowed: true };
  }

  public updateAccountAvatar(avatarUrl: string): void {
    this.currentAccount = { ...this.currentAccount, avatar: avatarUrl };
    if (this.profiles.length > 0) {
      this.profiles[0] = { ...this.profiles[0], avatar: avatarUrl };
    }
    this.saveState();
  }

  public updateProfileAvatar(profileId: string, avatarUrl: string): void {
    const idx = this.profiles.findIndex(p => p.id === profileId);
    if (idx >= 0) {
      this.profiles[idx] = { ...this.profiles[idx], avatar: avatarUrl };
      if (this.currentAccount.isAuthenticated && idx === 0) {
        this.currentAccount = { ...this.currentAccount, avatar: avatarUrl };
      }
      this.saveState();
    }
  }

  public updateAccountPhone(phone: string): void {
    this.currentAccount.phone = phone.trim();
    this.syncAccountIntoAllList(this.currentAccount);
    this.saveState();
  }

  public getTrialDaysRemaining(): number {
    if (this.currentAccount.subscriptionStatus !== 'trial' || !this.currentAccount.trialEndDate) {
      return 0;
    }
    const end = new Date(this.currentAccount.trialEndDate).getTime();
    const diff = end - Date.now();
    return Math.max(0, Math.ceil(diff / 86400000));
  }

  public cancelSubscription(): { success: boolean; message: string } {
    this.currentAccount = {
      ...this.currentAccount,
      subscriptionStatus: 'canceled',
    };
    this.saveState();
    return { success: true, message: 'Assinatura cancelada com sucesso.' };
  }

  public getAllAccounts(): UserAccount[] {
    return [...this.allAccounts];
  }

  public adminUpdateAccount(accountId: string, updates: Partial<UserAccount>): void {
    const idx = this.allAccounts.findIndex((a) => a.id === accountId);
    if (idx >= 0) {
      this.allAccounts[idx] = { ...this.allAccounts[idx], ...updates };
      if (this.currentAccount.id === accountId) {
        this.currentAccount = { ...this.currentAccount, ...updates };
      }
      this.saveState();
    }
  }

  public adminRecordPayment(accountId: string, amount: number, method: string, plan: string, durationDays?: number): void {
    const idx = this.allAccounts.findIndex((a) => a.id === accountId);
    if (idx >= 0) {
      const acc = this.allAccounts[idx];
      const now = new Date();
      const isAnnual = plan.includes('Anual') || (durationDays && durationDays >= 365);
      const days = durationDays || (isAnnual ? 365 : 30);
      const expires = new Date(now.getTime() + days * 86400000);
      const newRecord: PaymentRecord = {
        id: `admin-pay-${Date.now()}`,
        date: now.toISOString(),
        amount,
        plan,
        status: 'paid',
        method,
      };

      const isFam = plan.includes('Família') || plan.includes('family');
      const updated: UserAccount = {
        ...acc,
        plan,
        subscriptionPlan: isFam ? 'family' : 'individual',
        billingCycle: isAnnual ? 'annual' : 'monthly',
        subscriptionStatus: 'active',
        subscriptionExpiresAt: expires.toISOString(),
        lastPaymentDate: now.toISOString(),
        lastPaymentAmount: amount,
        paymentMethod: method,
        paymentHistory: [newRecord, ...(acc.paymentHistory || [])],
      };

      this.allAccounts[idx] = updated;
      if (this.currentAccount.id === accountId) {
        this.currentAccount = updated;
      }
      this.saveState();
    }
  }

  public logout(): void {
    if (this.currentAccount.isAuthenticated && this.currentAccount.id !== 'guest') {
      try {
        localStorage.setItem(`CAIC_PROFILES_${this.currentAccount.id}`, JSON.stringify(this.profiles));
      } catch {}
    }
    this.currentAccount = { ...GUEST_ACCOUNT };
    this.profiles = [{ ...GUEST_PROFILE }];
    this.activeProfileId = GUEST_PROFILE.id;
    this.saveState();
  }

  // ===== GERENCIAMENTO DE PERFIS =====

  public getProfiles(): UserProfile[] {
    return [...this.profiles];
  }

  public getActiveProfile(): UserProfile {
    const found = this.profiles.find((p) => p.id === this.activeProfileId);
    const prof = found || this.profiles[0] || GUEST_PROFILE;
    return {
      ...prof,
      favoriteMovieIds: Array.isArray(prof.favoriteMovieIds) ? prof.favoriteMovieIds : [],
      watchedMovieIds: Array.isArray(prof.watchedMovieIds) ? prof.watchedMovieIds : [],
      watchHistory: Array.isArray(prof.watchHistory) ? prof.watchHistory : [],
      preferredGenres: Array.isArray(prof.preferredGenres) && prof.preferredGenres.length > 0 ? prof.preferredGenres : ['Ação', 'Drama'],
      preferredMoods: Array.isArray(prof.preferredMoods) && prof.preferredMoods.length > 0 ? prof.preferredMoods : ['emocionante', 'divertido'],
    };
  }

  public setActiveProfile(profileId: string): void {
    if (this.profiles.some((p) => p.id === profileId)) {
      this.activeProfileId = profileId;
      this.saveState();
    }
  }

  public createProfile(name: string, avatarUrl: string, isKid = false): UserProfile | null {
    const check = this.canCreateProfile();
    if (!check.allowed) {
      return null;
    }
    const newProfile: UserProfile = {
      id: `profile-${Date.now()}`,
      name: name.trim(),
      avatar: avatarUrl || AVATAR_PRESETS[0].url,
      isKid,
      favoriteMovieIds: [],
      watchedMovieIds: [],
      watchHistory: [],
      preferredGenres: isKid ? ['Comédia', 'Família', 'Animação'] : ['Ação', 'Suspense', 'Drama'],
      preferredMoods: isKid ? ['divertido', 'leve', 'encantador'] : ['adrenalina', 'intenso'],
    };
    this.profiles.push(newProfile);
    this.saveState();
    return newProfile;
  }

  public deleteProfile(profileId: string): boolean {
    if (this.profiles.length <= 1) return false;
    this.profiles = this.profiles.filter((p) => p.id !== profileId);
    if (this.activeProfileId === profileId) {
      this.activeProfileId = this.profiles[0].id;
    }
    this.saveState();
    return true;
  }

  public updateProfile(id: string, updates: Partial<UserProfile>): void {
    const index = this.profiles.findIndex((p) => p.id === id);
    if (index >= 0) {
      this.profiles[index] = { ...this.profiles[index], ...updates };
      this.saveState();
    }
  }

  // ===== FAVORITOS & ASSISTIDOS =====

  public isFavorite(movieId: string): boolean {
    const active = this.getActiveProfile();
    return active.favoriteMovieIds.includes(movieId);
  }

  public toggleFavorite(movieId: string): boolean {
    const active = this.getActiveProfile();
    const isFav = active.favoriteMovieIds.includes(movieId);
    let updatedFavorites: string[];

    if (isFav) {
      updatedFavorites = active.favoriteMovieIds.filter((id) => id !== movieId);
    } else {
      updatedFavorites = [movieId, ...active.favoriteMovieIds];
    }

    this.updateProfile(active.id, { favoriteMovieIds: updatedFavorites });
    return !isFav;
  }

  public isWatched(movieId: string): boolean {
    const active = this.getActiveProfile();
    const watched = active.watchedMovieIds || [];
    return watched.includes(movieId);
  }

  public toggleWatched(movieId: string): boolean {
    const active = this.getActiveProfile();
    const watched = active.watchedMovieIds || [];
    const hasWatched = watched.includes(movieId);
    let updated: string[];

    if (hasWatched) {
      updated = watched.filter((id) => id !== movieId);
    } else {
      updated = [movieId, ...watched];
      this.recordWatch(movieId);
    }

    this.updateProfile(active.id, { watchedMovieIds: updated });
    return !hasWatched;
  }

  public recordWatch(movieId: string): void {
    const active = this.getActiveProfile();
    const existingHistory = active.watchHistory.filter((item) => item.movieId !== movieId);
    const updatedHistory = [
      { movieId, watchedAt: new Date().toISOString() },
      ...existingHistory,
    ].slice(0, 50);

    const watched = active.watchedMovieIds || [];
    const updatedWatched = watched.includes(movieId) ? watched : [movieId, ...watched];

    this.updateProfile(active.id, {
      watchHistory: updatedHistory,
      watchedMovieIds: updatedWatched,
    });
  }

  public updateTaste(genres: string[], moods: string[]): void {
    const active = this.getActiveProfile();
    this.updateProfile(active.id, {
      preferredGenres: genres,
      preferredMoods: moods,
    });
  }

  public updateTasteQuiz(quiz: UserTasteQuiz): void {
    const active = this.getActiveProfile();
    const newGenres = quiz.favoriteGenres && quiz.favoriteGenres.length > 0
      ? Array.from(new Set([...quiz.favoriteGenres, ...active.preferredGenres]))
      : active.preferredGenres;
    const newMoods = quiz.moodVibePreference && quiz.moodVibePreference.length > 0
      ? Array.from(new Set([...quiz.moodVibePreference, ...active.preferredMoods]))
      : active.preferredMoods;

    this.updateProfile(active.id, {
      tasteQuiz: {
        ...quiz,
        hasAnsweredQuiz: true,
        updatedAt: new Date().toISOString(),
      },
      preferredGenres: newGenres,
      preferredMoods: newMoods,
    });
  }

  /**
   * Algoritmo de recomendação personalizada estilo Netflix/Prime & IA:
   * Pontuação hiper-personalizada baseada em:
   * - Quiz de Preferências Cinéfilas (Gêneros, Atores/Estilos, Época, Duração, Sensações)
   * - Gêneros preferidos (+14 por match)
   * - Humores preferidos (+10 por match)
   * - Gêneros de filmes favoritados (+7)
   * - Atores e Estilos marcantes (+16)
   * - Época e Duração (+12 / +10)
   * - Filmes já assistidos são rebaixados (-25) para priorizar novidades
   * - Bônus para filmes em destaque de alta avaliação (+5)
   */
  public getPersonalizedRecommendations(allMovies: Movie[]): Movie[] {
    const active = this.getActiveProfile();
    const watchedIds = new Set(active.watchedMovieIds || []);
    const favoriteIds = new Set(active.favoriteMovieIds || []);

    // Gêneros dos filmes que o usuário já favoritou
    const favoriteGenres = new Set(
      allMovies
        .filter((m) => favoriteIds.has(m.id))
        .flatMap((m) => m.genres)
    );

    const quiz = active.tasteQuiz;
    const quizGenres = new Set(quiz?.favoriteGenres || []);
    const quizActorsAndStyles = quiz?.favoriteActorsAndStyles || [];
    const era = quiz?.eraPreference || 'todos';
    const pacing = quiz?.pacingPreference || 'qualquer';
    const quizMoods = new Set(quiz?.moodVibePreference || []);

    const scored = allMovies.map((movie) => {
      let score = movie.ratingScore * 2; // Qualidade base

      if (movie.featured) score += 4;

      // Preferências de Gênero
      for (const genre of movie.genres) {
        if (active.preferredGenres.includes(genre)) score += 12;
        if (quizGenres.has(genre)) score += 8;
        if (favoriteGenres.has(genre)) score += 6;
      }

      // Sensações e Humores
      for (const mood of movie.moods) {
        if (active.preferredMoods.includes(mood)) score += 9;
        if (quizMoods.has(mood)) score += 6;
      }

      // Pontuação Especial: Atores, Ícones & Estilos do Quiz
      if (quizActorsAndStyles.length > 0) {
        const fullMovieText = `${movie.title} ${movie.synopsis} ${movie.tags.join(' ')} ${movie.genres.join(' ')}`.toLowerCase();

        for (const style of quizActorsAndStyles) {
          if (style.includes('Jackie Chan') || style.includes('Jet Li') || style.includes('Artes Marciais')) {
            if (fullMovieText.includes('jackie chan') || fullMovieText.includes('jet li') || fullMovieText.includes('marciais') || fullMovieText.includes('luta') || fullMovieText.includes('kung fu') || movie.genres.includes('Ação')) {
              score += 16;
            }
          }
          if (style.includes('Chico Xavier') || style.includes('Nacional')) {
            if (fullMovieText.includes('chico xavier') || movie.language === 'Nacional' || fullMovieText.includes('brasileiro') || fullMovieText.includes('brasil')) {
              score += 18;
            }
          }
          if (style.includes('Guerra') || style.includes('Militar')) {
            if (movie.genres.includes('Guerra') || movie.genres.includes('Histórico') || fullMovieText.includes('tanque') || fullMovieText.includes('batalha') || fullMovieText.includes('guerra')) {
              score += 16;
            }
          }
          if (style.includes('Monstros') || style.includes('Criaturas')) {
            if (fullMovieText.includes('tubarão') || fullMovieText.includes('shark') || fullMovieText.includes('megalodon') || fullMovieText.includes('dragão') || fullMovieText.includes('crocosaurus') || fullMovieText.includes('monstro') || fullMovieText.includes('criatura')) {
              score += 16;
            }
          }
          if (style.includes('Hackers') || style.includes('Espionagem')) {
            if (fullMovieText.includes('hacker') || fullMovieText.includes('sistema') || fullMovieText.includes('computador') || fullMovieText.includes('invasores') || fullMovieText.includes('máfia')) {
              score += 16;
            }
          }
          if (style.includes('Fé') || style.includes('Espiritualidade') || style.includes('Bíblico')) {
            if (fullMovieText.includes('padre pio') || fullMovieText.includes('davi e golias') || fullMovieText.includes('clara e francisco') || fullMovieText.includes('deixados para trás') || fullMovieText.includes('fé') || fullMovieText.includes('milagre')) {
              score += 18;
            }
          }
          if (style.includes('Terror') || style.includes('Sobrevivência')) {
            if (movie.genres.includes('Terror') || fullMovieText.includes('aterro') || fullMovieText.includes('massacre') || fullMovieText.includes('sobrevivente') || fullMovieText.includes('pânico') || fullMovieText.includes('mortal')) {
              score += 16;
            }
          }
        }
      }

      // Preferência de Época
      if (era === 'classicos' && movie.releaseYear < 2000) {
        score += 12;
      } else if (era === 'anos2000' && movie.releaseYear >= 2000 && movie.releaseYear <= 2015) {
        score += 12;
      } else if (era === 'recentes' && movie.releaseYear >= 2016) {
        score += 12;
      }

      // Preferência de Ritmo & Duração
      if (pacing === 'rapido' && movie.durationMinutes <= 95) {
        score += 10;
      } else if (pacing === 'epico' && movie.durationMinutes >= 110) {
        score += 10;
      }

      // Se já assistiu, rebaixa da fileira de "Para Você" (mas continua acessível em "Assistir Novamente")
      if (watchedIds.has(movie.id)) {
        score -= 25;
      }

      // Fator dinâmico de rotação a cada acesso: renova os destaques mantendo rigorosamente os gostos do perfil
      const dynamicJitter = Math.random() * 8;

      return { movie, score: score + dynamicJitter };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .map((item) => item.movie);
  }
}

export const userService = new UserService();
