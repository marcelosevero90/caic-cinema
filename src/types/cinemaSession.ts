export type SessionThemeColor = 'amber' | 'cyan' | 'rose' | 'emerald' | 'purple';

export interface CinemaSession {
  id: string;
  title: string;
  subtitle: string;
  dateBadge: string;
  highlightTag: string;
  accentColor: SessionThemeColor;
  icon: 'car' | 'flame' | 'sparkles' | 'gift' | 'swords' | 'clapperboard' | 'star';
  themeGradient: string;
  bannerBackdropUrl?: string;
  movieIds: string[];
  searchKeywords?: string[];
  active: boolean;
}
