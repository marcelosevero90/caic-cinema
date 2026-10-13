export type ContentRating = 'Livre' | '10' | '12' | '14' | '16' | '18';
export type MovieLanguage = 'Dublado' | 'Legendado' | 'Nacional';

export interface Movie {
  id: string;
  youtubeVideoId: string;
  title: string;
  originalTitle?: string;
  synopsis: string;
  genres: string[];
  subgenres?: string[];
  cast?: string[];
  tags: string[];
  moods: string[];
  releaseYear: number;
  durationMinutes: number;
  posterUrl: string;
  backdropUrl: string;
  channelName: string;
  channelUrl?: string;
  contentRating: ContentRating;
  language: MovieLanguage;
  featured?: boolean;
  ratingScore: number;
  badge?: string;
  source?: 'youtube' | 'jellyfin';
  jellyfinItemId?: string;
  streamUrl?: string;
  addedBy?: string; // ID do perfil que adicionou o filme
  addedAt?: string;
  status?: 'active' | 'inactive'; // Situação do filme na plataforma
  isActive?: boolean; // Booleano facilitador: true = ativo (visível), false = inativo (oculto)
}

export interface SearchFilters {
  query?: string;
  genre?: string;
  subgenre?: string;
  actor?: string;
  mood?: string;
  maxDurationMinutes?: number;
  minYear?: number;
  maxYear?: number;
  language?: MovieLanguage;
  channelName?: string;
}

export interface ChatRecommendation {
  movie: Movie;
  reason?: string;
  matchScore?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  recommendedMovies?: Movie[];
  recommendationsWithReasons?: ChatRecommendation[];
  isThinking?: boolean;
  unmatchedQuery?: string;
  suggestWebSearch?: boolean;
  fallbackGenre?: string;
  webSearchInitiated?: boolean;
  quickReplies?: string[];
  isOffTopic?: boolean;
}

export type SubscriptionPlan = 'free' | 'individual' | 'family' | 'monthly' | 'annual';
export type BillingCycle = 'monthly' | 'annual';
export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'canceled';

export interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  plan: string;
  status: 'paid' | 'pending';
  method: string;
}

export interface ActivePlaybackSession {
  sessionId: string;
  accountId: string;
  profileId?: string;
  email: string;
  userName?: string;
  movieTitle: string;
  movieId: string;
  deviceName: string;
  deviceType: 'mobile' | 'tv' | 'desktop';
  startedAt: string;
  lastHeartbeat: number;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  password?: string;
  phone?: string;
  plan: string;
  subscriptionPlan?: SubscriptionPlan;
  billingCycle?: BillingCycle;
  subscriptionStatus?: SubscriptionStatus;
  trialStartDate?: string;
  trialEndDate?: string;
  subscriptionExpiresAt?: string;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  paymentMethod?: string;
  paymentHistory?: PaymentRecord[];
  createdAt: string;
  avatar: string;
  isAuthenticated: boolean;
}

export type EraPreference = 'todos' | 'classicos' | 'anos2000' | 'recentes';
export type PacingPreference = 'qualquer' | 'rapido' | 'epico';

export interface UserTasteQuiz {
  favoriteGenres: string[];
  favoriteActorsAndStyles: string[];
  eraPreference: EraPreference;
  pacingPreference: PacingPreference;
  moodVibePreference: string[];
  hasAnsweredQuiz?: boolean;
  updatedAt?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  avatar: string; // URL ou identificador do avatar (estilo Netflix/Prime)
  isKid?: boolean;
  favoriteMovieIds: string[];
  watchedMovieIds?: string[];
  watchHistory: {
    movieId: string;
    watchedAt: string;
    progressPercentage?: number;
  }[];
  preferredGenres: string[];
  preferredMoods: string[];
  tasteQuiz?: UserTasteQuiz;
}

export interface VideoAnalysisResult {
  title: string;
  originalTitle?: string;
  synopsis: string;
  genres: string[];
  subgenres?: string[];
  cast?: string[];
  tags: string[];
  moods: string[];
  releaseYear: number;
  durationMinutes: number;
  contentRating: ContentRating;
  language: MovieLanguage;
  badge?: string;
  channelName?: string;
  ratingScore?: number;
}
