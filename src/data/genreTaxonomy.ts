import type { Movie } from '../types/movie';

export interface MoodOption {
  id: string;
  label: string;
  emoji: string;
  description: string;
}

export const MOOD_OPTIONS: MoodOption[] = [
  { id: 'divertido', label: 'Para Rir', emoji: '😂', description: 'Comédias leves e diversão' },
  { id: 'adrenalina', label: 'Pura Adrenalina', emoji: '⚡', description: 'Ação rápida, combates e perseguições' },
  { id: 'tenso', label: 'Tensão & Suspense', emoji: '😱', description: 'Suspense sufocante e mistério' },
  { id: 'emocionante', label: 'Emocionante', emoji: '🥺', description: 'Dramas tocantes e superação' },
  { id: 'romantico', label: 'Romântico', emoji: '❤️', description: 'Amor, paixão e relacionamentos' },
  { id: 'pensar', label: 'Para Refletir', emoji: '🧠', description: 'Enredos inteligentes e reviravoltas' },
  { id: 'familia', label: 'Leve & Família', emoji: '🍿', description: 'Diversão para toda a família' },
  { id: 'inspirador', label: 'Fé & Inspiração', emoji: '✨', description: 'Histórias edificantes e espirituais' },
  { id: 'curioso', label: 'Mundos & Sci-Fi', emoji: '🔮', description: 'Ficção científica e futuro fascinante' },
];

/**
 * Taxonomia Oficial de Gêneros e Subgêneros do CineAI
 * Exemplo: Comédia -> Comédia Romântica, Comédia Adolescente / Pastelão, etc.
 */
export const GENRE_TAXONOMY: Record<string, string[]> = {
  'Comédia': [
    'Comédia Romântica',
    'Comédia Adolescente / Pastelão',
    'Comédia Familiar',
    'Sátira & Humor Negro',
    'Comédia de Ação'
  ],
  'Ação': [
    'Artes Marciais',
    'Perseguição & Velocidade',
    'Policial & Crime',
    'Guerra & Militar',
    'Ação & Sobrevivência',
    'Super-Heróis & Vigilantes'
  ],
  'Drama': [
    'Drama Bíblico & Fé',
    'Drama Histórico & Épico',
    'Drama Emocionante & Superação',
    'Romance & Paixão',
    'Drama Familiar'
  ],
  'Terror': [
    'Terror Sobrenatural & Exorcismo',
    'Monstros & Criaturas',
    'Slasher & Assassinos',
    'Terror Psicológico',
    'Zumbis & Apocalipse'
  ],
  'Ficção Científica': [
    'Viagem no Tempo & Multiverso',
    'Cyberpunk & Hackers',
    'Distopia & Apocalipse',
    'Monstros Espaciais & Alienígenas'
  ],
  'Suspense': [
    'Suspense Psicológico & Tensão',
    'Investigação & Mistério',
    'Golpe & Conspiração',
    'Máfia & Crime Organizado'
  ],
  'Aventura & Fantasia': [
    'Fantasia Medieval & Magia',
    'Vikings & Mitologia',
    'Dragões & Espadas',
    'Caça ao Tesouro'
  ],
  'Família & Animação': [
    'Animais & Pets',
    'Animação Infantil',
    'Aventura Mágica',
    'Natal & Festas'
  ]
};

/**
 * Principais atores renomados do cinema mundial e dos títulos presentes no catálogo
 */
export const FAMOUS_ACTORS: string[] = [
  'Jean-Claude Van Damme',
  'Jackie Chan',
  'Jet Li',
  'Dolph Lundgren',
  'Antonio Banderas',
  'Russell Crowe',
  'Kirsten Dunst',
  'Amy Adams',
  'Diane Kruger',
  'Léa Seydoux',
  'Nelson Xavier',
  'Rodrigo Santoro',
  'Keanu Reeves',
  'Nicolas Cage',
  'Sylvester Stallone',
  'Arnold Schwarzenegger',
  'Jason Statham',
  'Tom Cruise',
  'Leonardo DiCaprio',
  'Brad Pitt',
  'Morgan Freeman',
  'Will Smith',
  'Clive Owen',
  'Edward Norton',
  'Robert De Niro',
  'Scarlett Johansson',
  'Chris Evans',
  'Mads Mikkelsen',
  'Alicia Vikander',
  'Christian Bale',
  'Jim Carrey',
  'Amy Schumer',
  'Robert Pattinson',
  'Forest Whitaker',
  'Mel Gibson',
  'Tobey Maguire',
  'Jake Gyllenhaal',
  'Natalie Portman',
  'Pierce Brosnan',
  'Julianne Moore',
  'Seth Rogen',
  'Elizabeth Banks',
  'Kate Hudson',
  'Jennifer Love Hewitt',
  'Clint Eastwood',
  'Charles Bronson',
  'Julia Roberts',
  'Richard Gere',
  'Patrick Swayze',
  'Christopher Reeve',
  'Steve Martin',
  'Benicio del Toro',
  'Lindsay Lohan',
  'Jennifer Aniston',
  'Angelina Jolie',
  'Emma Roberts',
  'Quentin Tarantino',
  'Sergio Leone',
  'Kevin Costner',
  'Kevin Kline',
  'William Holden',
  'Ryan Reynolds',
  'Scott Adkins',
  'Danny Trejo',
  'Ethan Hawke',
  'Brian Cox',
  'Alicia Silverstone'
];

/**
 * Atribui / infere subgêneros dinamicamente com base nos metadados da obra
 */
export function deriveMovieSubgenres(movie: Partial<Movie>): string[] {
  if (movie.subgenres && movie.subgenres.length > 0) {
    return movie.subgenres;
  }

  const detected = new Set<string>();
  const text = `${movie.title || ''} ${movie.synopsis || ''} ${(movie.tags || []).join(' ')} ${(movie.moods || []).join(' ')} ${movie.badge || ''}`.toLowerCase();
  const genres = (movie.genres || []).map((g) => g.toLowerCase());

  // Comédia
  if (genres.some((g) => g.includes('comédia'))) {
    if (text.includes('amor') || text.includes('romance') || text.includes('casamento') || text.includes('namor') || text.includes('paixão')) {
      detected.add('Comédia Romântica');
    }
    if (text.includes('jovem') || text.includes('adolescente') || text.includes('confusão') || text.includes('festa') || text.includes('garoto') || text.includes('playboy')) {
      detected.add('Comédia Adolescente / Pastelão');
    }
    if (text.includes('família') || text.includes('criança') || text.includes('natal') || text.includes('porquinho') || text.includes('bebê') || text.includes('pet')) {
      detected.add('Comédia Familiar');
    }
    if (detected.size === 0) {
      detected.add('Comédia Familiar');
    }
  }

  // Ação
  if (genres.some((g) => g.includes('ação') || g.includes('luta'))) {
    if (text.includes('marcial') || text.includes('kung fu') || text.includes('karate') || text.includes('luta') || text.includes('combate') || text.includes('van damme') || text.includes('chan') || text.includes('jet li')) {
      detected.add('Artes Marciais');
    }
    if (text.includes('corrida') || text.includes('carro') || text.includes('velocidade') || text.includes('racer') || text.includes('asfalto')) {
      detected.add('Perseguição & Velocidade');
    }
    if (text.includes('guerra') || text.includes('batalha') || text.includes('tanque') || text.includes('soldado') || text.includes('berlim') || text.includes('militar')) {
      detected.add('Guerra & Militar');
    }
    if (text.includes('polícia') || text.includes('crime') || text.includes('máfia') || text.includes('assassino') || text.includes('golpe')) {
      detected.add('Policial & Crime');
    }
    if (detected.size === 0) {
      detected.add('Ação & Sobrevivência');
    }
  }

  // Drama
  if (genres.some((g) => g.includes('drama') || g.includes('biografia') || g.includes('histórico') || g.includes('guerra') || g.includes('nacional'))) {
    if (text.includes('bíblia') || text.includes('sagrada') || text.includes('fé') || text.includes('deus') || text.includes('espírita') || text.includes('chico') || text.includes('padre') || text.includes('santo') || text.includes('milagre') || text.includes('moisés') || text.includes('davi') || text.includes('abraão')) {
      detected.add('Drama Bíblico & Fé');
    }
    if (text.includes('rei') || text.includes('rainha') || text.includes('império') || text.includes('século') || text.includes('cruzada') || text.includes('história') || text.includes('frança')) {
      detected.add('Drama Histórico & Épico');
    }
    if (text.includes('romance') || text.includes('paixão') || text.includes('amor') || text.includes('desejo') || text.includes('sedução')) {
      detected.add('Romance & Paixão');
    }
    if (detected.size === 0) {
      detected.add('Drama Emocionante & Superação');
    }
  }

  // Terror
  if (genres.some((g) => g.includes('terror') || g.includes('horror'))) {
    if (text.includes('ouija') || text.includes('exorcismo') || text.includes('fantasma') || text.includes('espírito') || text.includes('sobrenatural') || text.includes('hellraiser') || text.includes('lago') || text.includes('paranormal') || text.includes('maldição')) {
      detected.add('Terror Sobrenatural & Exorcismo');
    }
    if (text.includes('tubarão') || text.includes('shark') || text.includes('megalodon') || text.includes('crocosaurus') || text.includes('monstro') || text.includes('predador') || text.includes('sereia')) {
      detected.add('Monstros & Criaturas');
    }
    if (text.includes('halloween') || text.includes('massacre') || text.includes('candyman') || text.includes('slasher') || text.includes('assassino')) {
      detected.add('Slasher & Assassinos');
    }
    if (text.includes('cubo') || text.includes('quarto') || text.includes('psicológico') || text.includes('labirinto')) {
      detected.add('Terror Psicológico');
    }
    if (text.includes('zumbi') || text.includes('apocalipse')) {
      detected.add('Zumbis & Apocalipse');
    }
    if (detected.size === 0) {
      detected.add('Terror Sobrenatural & Exorcismo');
    }
  }

  // Ficção Científica
  if (genres.some((g) => g.includes('ficção'))) {
    if (text.includes('tempo') || text.includes('timecop') || text.includes('portal') || text.includes('futuro') || text.includes('viagem')) {
      detected.add('Viagem no Tempo & Multiverso');
    }
    if (text.includes('hacker') || text.includes('código') || text.includes('computador') || text.includes('sistema') || text.includes('invasores')) {
      detected.add('Cyberpunk & Hackers');
    }
    if (text.includes('apocalipse') || text.includes('fim do mundo') || text.includes('distopia') || text.includes('2012')) {
      detected.add('Distopia & Apocalipse');
    }
    if (detected.size === 0) {
      detected.add('Viagem no Tempo & Multiverso');
    }
  }

  // Aventura & Fantasia
  if (genres.some((g) => g.includes('fantasia') || g.includes('aventura'))) {
    if (text.includes('viking') || text.includes('ragnarok') || text.includes('nórdico')) {
      detected.add('Vikings & Mitologia');
    }
    if (text.includes('arthur') || text.includes('merlin') || text.includes('excalibur') || text.includes('dragão') || text.includes('espada') || text.includes('magia')) {
      detected.add('Fantasia Medieval & Magia');
    }
    if (text.includes('tesouro') || text.includes('expedição')) {
      detected.add('Caça ao Tesouro');
    }
    if (detected.size === 0) {
      detected.add('Fantasia Medieval & Magia');
    }
  }

  // Família & Animação
  if (genres.some((g) => g.includes('família') || g.includes('infantil') || g.includes('animação'))) {
    if (text.includes('cão') || text.includes('cachorro') || text.includes('animal') || text.includes('pet') || text.includes('porquinho') || text.includes('safari') || text.includes('arlo')) {
      detected.add('Animais & Pets');
    }
    if (text.includes('natal') || text.includes('papai noel')) {
      detected.add('Natal & Festas');
    }
    if (detected.size === 0) {
      detected.add('Animação Infantil');
    }
  }

  // Suspense
  if (genres.some((g) => g.includes('suspense') || g.includes('policial'))) {
    if (text.includes('hacker') || text.includes('mistério') || text.includes('investigação') || text.includes('detetive')) {
      detected.add('Investigação & Mistério');
    }
    if (text.includes('máfia') || text.includes('gangster') || text.includes('crime') || text.includes('golpe')) {
      detected.add('Golpe & Conspiração');
    }
    if (detected.size === 0) {
      detected.add('Suspense Psicológico & Tensão');
    }
  }

  return Array.from(detected);
}

/**
 * Atribui / infere elenco principal de atores famosos
 */
export function deriveMovieCast(movie: Partial<Movie>): string[] {
  if (movie.cast && movie.cast.length > 0) {
    return movie.cast;
  }

  const cast = new Set<string>();
  const text = `${movie.title || ''} ${movie.synopsis || ''} ${(movie.tags || []).join(' ')}`.toLowerCase();

  if (text.includes('van damme') || text.includes('jean-claude') || text.includes('timecop') || text.includes('legionário') || text.includes('retroceder nunca')) {
    cast.add('Jean-Claude Van Damme');
  }
  if (text.includes('jackie chan') || text.includes('hora do acerto') || text.includes('três ladrões e um bebê')) {
    cast.add('Jackie Chan');
  }
  if (text.includes('jet li') || text.includes('hitman - o rei dos assassinos')) {
    cast.add('Jet Li');
  }
  if (text.includes('dolph lundgren') || text.includes('missão explosiva')) {
    cast.add('Dolph Lundgren');
  }
  if (text.includes('antonio banderas') || text.includes('prenda-me se puder')) {
    cast.add('Antonio Banderas');
  }
  if (text.includes('russell crowe') || text.includes('um golpe perfeito')) {
    cast.add('Russell Crowe');
  }
  if (text.includes('kirsten dunst')) {
    cast.add('Kirsten Dunst');
  }
  if (text.includes('amy adams')) {
    cast.add('Amy Adams');
  }
  if (text.includes('diane kruger')) {
    cast.add('Diane Kruger');
  }
  if (text.includes('léa seydoux') || text.includes('lea seydoux')) {
    cast.add('Léa Seydoux');
  }
  if (text.includes('chico xavier') || text.includes('nelson xavier')) {
    cast.add('Nelson Xavier');
  }
  if (text.includes('nicolas cage') || text.includes('deixados para trás')) {
    cast.add('Nicolas Cage');
  }
  if (text.includes('keanu reeves')) {
    cast.add('Keanu Reeves');
  }
  if (text.includes('sylvester stallone')) {
    cast.add('Sylvester Stallone');
  }
  if (text.includes('arnold schwarzenegger')) {
    cast.add('Arnold Schwarzenegger');
  }
  if (text.includes('jason statham')) {
    cast.add('Jason Statham');
  }

  // Extrai nome entre parênteses do título se for padrão de ator
  const parenMatch = (movie.title || '').match(/\(([^)]+)\)/);
  if (parenMatch) {
    const candidate = parenMatch[1].trim();
    if (
      !/^\d{4}$/.test(candidate) && // não é ano como (2013)
      !candidate.toLowerCase().includes('parte') &&
      !candidate.toLowerCase().includes('filme') &&
      !candidate.toLowerCase().includes('o filme')
    ) {
      if (candidate.includes('/')) {
        candidate.split('/').forEach((part) => cast.add(part.trim()));
      } else {
        cast.add(candidate);
      }
    }
  }

  return Array.from(cast);
}
