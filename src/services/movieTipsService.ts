import type { Movie } from '../types/movie';

export interface MovieTipHighlight {
  icon: string;
  label: string;
}

export interface MovieTip {
  badge: MovieTipHighlight;
  highlights: MovieTipHighlight[];
  reason: string;
}

/**
 * Analisador inteligente de Dicas Cinéfilas CAIC
 * Gera destaques rápidos (ex: "Filme Animado", "Com Animais") e o motivo
 * de por que vale a pena assistir à obra.
 */
export function getMovieTips(movie: Movie): MovieTip {
  const titleLower = (movie.title || '').toLowerCase();
  const synLower = (movie.synopsis || '').toLowerCase();
  const genresLower = (movie.genres || []).map((g) => g.toLowerCase());
  const subgenresLower = (movie.subgenres || []).map((g) => g.toLowerCase());
  const castLower = (movie.cast || []).map((c) => c.toLowerCase());
  const allText = `${titleLower} ${synLower} ${genresLower.join(' ')} ${subgenresLower.join(' ')} ${castLower.join(' ')}`;

  const highlights: MovieTipHighlight[] = [];

  // 1. ANIMAÇÃO
  const isAnimation =
    genresLower.includes('animação') ||
    subgenresLower.includes('animação') ||
    allText.includes('animação') ||
    allText.includes('animado') ||
    allText.includes('desenho animado') ||
    allText.includes('kung food') ||
    allText.includes('anime');

  if (isAnimation) {
    highlights.push({ icon: '🎨', label: 'Filme Animado' });
  }

  // 2. COM ANIMAIS
  const animalWords = [
    'animal',
    'animais',
    'cachorro',
    'cão',
    'cães',
    'gato',
    'gatos',
    'lobo',
    'lobos',
    'cavalo',
    'cavalos',
    'leão',
    'leões',
    'tigre',
    'urso',
    'ursos',
    'tubarão',
    'tubarões',
    'bicho',
    'bichos',
    'panda',
    'dragão',
    'dragões',
    'pássaro',
    'abutres',
    'hiena',
    'macaco',
    'lobisomem',
    'selvagem',
    'floresta',
  ];

  const hasAnimals = animalWords.some((w) => allText.includes(w));
  if (hasAnimals) {
    highlights.push({ icon: '🐾', label: 'Com Animais' });
  }

  // 3. JACKIE CHAN / ARTES MARCIAIS
  const isJackieChan = allText.includes('jackie chan');
  const isMartialArts =
    isJackieChan ||
    allText.includes('artes marciais') ||
    allText.includes('kung fu') ||
    allText.includes('karatê') ||
    allText.includes('karate') ||
    allText.includes('kickboxer') ||
    allText.includes('mestre bêbado') ||
    allText.includes('jet li') ||
    allText.includes('sammo hung');

  if (isJackieChan) {
    highlights.push({ icon: '🥋', label: 'Jackie Chan' });
  } else if (isMartialArts) {
    highlights.push({ icon: '🥋', label: 'Artes Marciais' });
  }

  // 4. FAROESTE / WESTERN
  const isWestern =
    genresLower.includes('faroeste') ||
    subgenresLower.includes('faroeste') ||
    allText.includes('faroeste') ||
    allText.includes('western') ||
    allText.includes('pistoleiro') ||
    allText.includes('clint eastwood') ||
    allText.includes('sergio leone') ||
    allText.includes('gatilho') ||
    allText.includes('xerife');

  if (isWestern) {
    highlights.push({ icon: '🤠', label: 'Faroeste Clássico' });
  }

  // 5. ASTROS DE HOLLYWOOD
  if (allText.includes('keanu reeves') || allText.includes('patrick swayze')) {
    highlights.push({ icon: '🌟', label: 'Keanu Reeves' });
  } else if (allText.includes('clint eastwood')) {
    highlights.push({ icon: '⭐', label: 'Clint Eastwood' });
  } else if (allText.includes('brad pitt') || allText.includes('angelina jolie')) {
    highlights.push({ icon: '✨', label: 'Brad Pitt & Angelina Jolie' });
  } else if (allText.includes('richard gere') || allText.includes('julia roberts')) {
    highlights.push({ icon: '💖', label: 'Richard Gere & Julia Roberts' });
  } else if (allText.includes('christopher reeve') || allText.includes('superman')) {
    highlights.push({ icon: '🦸', label: 'Superman Clássico' });
  } else if (allText.includes('nicolas cage')) {
    highlights.push({ icon: '🎬', label: 'Nicolas Cage' });
  } else if (allText.includes('christian bale')) {
    highlights.push({ icon: '🎭', label: 'Christian Bale' });
  } else if (allText.includes('quentin tarantino')) {
    highlights.push({ icon: '🎥', label: 'Quentin Tarantino' });
  } else if (allText.includes('christopher nolan')) {
    highlights.push({ icon: '🧠', label: 'Christopher Nolan' });
  } else if (allText.includes('david lynch')) {
    highlights.push({ icon: '🌌', label: 'David Lynch' });
  }

  // 6. GÊNEROS PRINCIPAIS
  if (genresLower.includes('comédia') || subgenresLower.includes('comédia')) {
    highlights.push({ icon: '😂', label: 'Comédia' });
  }
  if (genresLower.includes('romance') || subgenresLower.includes('romance')) {
    highlights.push({ icon: '❤️', label: 'Romance' });
  }
  if (genresLower.includes('suspense') || subgenresLower.includes('mistério') || genresLower.includes('policial')) {
    highlights.push({ icon: '🔍', label: 'Suspense & Mistério' });
  }
  if (genresLower.includes('ficção científica') || allText.includes('ficção científica') || allText.includes('sci-fi')) {
    highlights.push({ icon: '🚀', label: 'Ficção Científica' });
  }
  if (genresLower.includes('terror') || subgenresLower.includes('terror')) {
    highlights.push({ icon: '👻', label: 'Terror & Arrepios' });
  }
  if (genresLower.includes('ação') && !isMartialArts && !isWestern) {
    highlights.push({ icon: '💥', label: 'Ação Eletrizante' });
  }

  // Se tem poucos destaques, adiciona baseados em nota ou fatos reais
  if (allText.includes('fatos reais') || allText.includes('baseado em fatos')) {
    highlights.push({ icon: '📜', label: 'Fatos Reais' });
  }

  if (movie.ratingScore >= 8.5) {
    highlights.push({ icon: '🏆', label: 'Aclamado pelo Público' });
  }

  // Garante de 2 a 4 tags
  const cleanHighlights = highlights.slice(0, 3);
  if (cleanHighlights.length === 0) {
    cleanHighlights.push({ icon: '🍿', label: movie.genres[0] || 'Cinema' });
    cleanHighlights.push({ icon: '✨', label: `${movie.durationMinutes} min` });
  }

  // GERAÇÃO DO MOTIVO "VALE A PENA ASSISTIR PORQUE..."
  let reason = '';

  // Casos especiais específicos por filme/obra icônica
  if (titleLower.includes('caçadores de emoção')) {
    reason =
      'Clássico absoluto dos anos 90 com Keanu Reeves e Patrick Swayze, adrenalina pura com surfe, salto de paraquedas e perseguições eletrizantes.';
  } else if (titleLower.includes('uma linda mulher')) {
    reason =
      'Uma das histórias de amor mais amadas do cinema, com a química inesquecível entre Julia Roberts e Richard Gere e trilha sonora marcante.';
  } else if (titleLower.includes('superman - o filme')) {
    reason =
      'O filme definitivo que definiu o gênero de super-heróis, com a interpretação lendária e emocionante de Christopher Reeve.';
  } else if (titleLower.includes('amn') || titleLower.includes('memento')) {
    reason =
      'Obra-prima revolucionária de Christopher Nolan contada de trás para frente, com um mistério fascinante que explode a mente do espectador.';
  } else if (titleLower.includes('sr. & sra. smith') || titleLower.includes('senhor e senhora smith')) {
    reason =
      'Ação ágil e comédia inteligente com a química lendária de Brad Pitt e Angelina Jolie vivendo um casal de assassinos de aluguel rivais.';
  } else if (titleLower.includes('era uma vez no oeste')) {
    reason =
      'Uma das maiores obras-primas da história do cinema, dirigida por Sergio Leone e com a trilha sonora épica de Ennio Morricone.';
  } else if (titleLower.includes('duna') && movie.releaseYear < 2000) {
    reason =
      'Viagem cinematográfica visionária dirigida pelo mestre David Lynch, com estética cult inesquecível e ambientação espacial grandiosa.';
  } else if (titleLower.includes('lobisomem') && titleLower.includes('londres')) {
    reason =
      'Marco revolucionário do cinema de terror e efeitos práticos de maquiagem, equilibrando humor sarcástico e arrepios genuínos.';
  } else if (titleLower.includes('kung food')) {
    reason =
      'Animação vibrante e dinâmica com guerreiros alimentos e bichos divertidos, cheia de lições sobre amizade, coragem e superação.';
  } else if (titleLower.includes('ela é o cara')) {
    reason =
      'Comédia clássica dos anos 2000 super divertida e alto-astral inspirada em Shakespeare, garantia de ótimas risadas do início ao fim.';
  } else if (isJackieChan) {
    reason =
      'Coreografias lendárias de artes marciais realizadas pelo próprio Jackie Chan sem dublês, com acrobacias inacreditáveis e humor físico genial.';
  } else if (isAnimation && hasAnimals) {
    reason =
      'Animação cativante com personagens animais carismáticos, visual expressivo e história leve ideal para curtir com toda a família.';
  } else if (isAnimation) {
    reason =
      'Visual dinâmico e criativo com ritmo leve e divertido, perfeito para relaxar, se inspirar e reunir crianças e adultos.';
  } else if (isWestern && (allText.includes('clint eastwood') || movie.ratingScore >= 8)) {
    reason =
      'Duelos tensos sob o sol do deserto, clima épico de honra e vingança e atuações fortes que definiram a era de ouro do faroeste.';
  } else if (isWestern) {
    reason =
      'Ambientação autêntica do velho oeste com tiroteios estratégicos, personagens durões e o ritmo clássico dos grandes duelos.';
  } else if (genresLower.includes('comédia')) {
    reason =
      'Ritmo leve, atuações divertidas e diálogos engraçados, uma escolha certeira para descontrair a mente e dar boas gargalhadas.';
  } else if (genresLower.includes('romance')) {
    reason =
      'Uma narrativa doce e envolvente com conexões emocionais genuínas, perfeita para quem busca se emocionar com uma linda história de amor.';
  } else if (genresLower.includes('suspense') || genresLower.includes('policial')) {
    reason =
      'Enredo tenso e inteligente com segredos e reviravoltas que desafiam o raciocínio e prendem a atenção até o último minuto.';
  } else if (genresLower.includes('terror')) {
    reason =
      'Atmosfera pesada de mistério e suspense constante, ideal para quem gosta de sentir aquele frio na espinha com sustos bem construídos.';
  } else if (genresLower.includes('ficção científica')) {
    reason =
      'Conceitos fascinantes sobre o futuro e o desconhecido, estimulando a imaginação com ambientações imersivas e reflexivas.';
  } else if (genresLower.includes('drama')) {
    reason =
      'Uma história comovente e profunda que explora dilemas humanos reais com atuações de grande peso emocional.';
  } else {
    reason =
      'Excelente escolha de entretenimento no acervo: ritmo ágil, elenco carismático e uma trama envolvente que vale cada minuto.';
  }

  return {
    badge: cleanHighlights[0],
    highlights: cleanHighlights,
    reason,
  };
}
