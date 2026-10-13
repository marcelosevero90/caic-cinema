/**
 * Guardrail e detector de perguntas fora do contexto de cinema para o assistente CAIC.
 */

export interface KeyQuestionOption {
  id: string;
  category: 'company' | 'mood' | 'duration' | 'style';
  label: string;
  prompt: string;
  emoji: string;
}

export const KEY_QUESTIONS: {
  title: string;
  category: KeyQuestionOption['category'];
  options: KeyQuestionOption[];
}[] = [
  {
    title: 'Com quem você vai assistir hoje?',
    category: 'company',
    options: [
      { id: 'c-sozinho', category: 'company', label: 'Sozinho(a)', prompt: 'Estou assistindo sozinho(a), quero uma experiência imersiva e envolvente hoje!', emoji: '🍿' },
      { id: 'c-casal', category: 'company', label: 'Em Casal', prompt: 'Vou assistir em casal hoje, me recomende algo romântico, envolvente ou um suspense empolgante para ver a dois!', emoji: '💑' },
      { id: 'c-familia', category: 'company', label: 'Com a Família', prompt: 'Estou reunido com a família e crianças, preciso de um filme divertido e seguro para todas as idades!', emoji: '👨‍👩‍👧‍👦' },
      { id: 'c-amigos', category: 'company', label: 'Com Amigos', prompt: 'Estou com amigos, queremos um filme movimentado com muita risada ou ação eletrizante!', emoji: '🍻' },
    ]
  },
  {
    title: 'Qual energia ou clima você busca no momento?',
    category: 'mood',
    options: [
      { id: 'm-rir', category: 'mood', label: 'Rir & Relaxar', prompt: 'Quero relaxar e dar boas risadas! Me recomende a melhor comédia leve e divertida do catálogo.', emoji: '😂' },
      { id: 'm-acao', category: 'mood', label: 'Muita Ação & Adrenalina', prompt: 'Quero adrenalina pura, combates, perseguições e muita ação explosiva!', emoji: '⚡' },
      { id: 'm-suspense', category: 'mood', label: 'Suspense com Reviravoltas', prompt: 'Quero um suspense inteligente, com mistério e reviravoltas de explodir a cabeça!', emoji: '🧩' },
      { id: 'm-terror', category: 'mood', label: 'Susto no Escuro', prompt: 'Quero tomar susto! Me indique um filme de terror com monstros, zumbis ou tensão no escuro.', emoji: '👻' },
      { id: 'm-fe', category: 'mood', label: 'Fé & Emoção Real', prompt: 'Quero uma história emocionante de fé, superação humana ou baseada em fatos reais.', emoji: '🙏' },
      { id: 'm-guerra', category: 'mood', label: 'Guerra & Batalhas', prompt: 'Quero um filme histórico de guerra com tanques blindados ou grandes batalhas militares!', emoji: '🎖️' },
      { id: 'm-artes', category: 'mood', label: 'Artes Marciais', prompt: 'Quero lutas lendárias de artes marciais no estilo Jackie Chan, Van Damme ou Jet Li!', emoji: '🥋' },
      { id: 'm-faroeste', category: 'mood', label: 'Faroeste & Duelo', prompt: 'Quero um faroeste clássico de tiros, pistoleiros e duelos ao pôr do sol!', emoji: '🤠' },
    ]
  },
  {
    title: 'Quanto tempo você tem disponível?',
    category: 'duration',
    options: [
      { id: 'd-curto', category: 'duration', label: 'Rápido (Até 90min)', prompt: 'Tenho pouco tempo hoje, me recomende filmes com no máximo 90 minutos de duração!', emoji: '⏳' },
      { id: 'd-padrao', category: 'duration', label: 'Filme Completo (~2h)', prompt: 'Tenho a noite livre, pode me recomendar um grande filme completo sem pressa!', emoji: '🎬' },
    ]
  }
];

export const DEFAULT_MOVIE_QUICK_REPLIES = [
  '😂 Quero uma Comédia Leve',
  '⚡ Quero Ação & Adrenalina',
  '🍿 Sessão em Família',
  '🧩 Suspense Inteligente',
  '⏳ Filme Curto (Até 90min)',
  '🥋 Artes Marciais',
  '🤠 Faroeste Clássico',
  '🙏 História de Fé & Emoção',
];

export const FOLLOW_UP_MOVIE_REPLIES = [
  '🔄 Ver Outras Opções',
  '⏳ Algo mais curto (até 90min)',
  '😂 Quero algo mais leve/engraçado',
  '⚡ Quero mais ação/tiroteio',
  '🇧🇷 Apenas Dublados',
  '💡 Me conte mais sobre o 1º filme',
];

/**
 * Detecta se a mensagem do usuário é fora do contexto de cinema / filmes / entretenimento.
 */
export function isOffTopicQuery(rawText: string): boolean {
  if (!rawText) return false;
  const text = rawText.trim().toLowerCase();

  // Saudações curtas não são off-topic
  const greetings = [
    'oi', 'ola', 'olá', 'bom dia', 'boa tarde', 'boa noite', 'e ai', 'e aí',
    'fala', 'opa', 'salve', 'ajuda', 'menu', 'iniciar', 'começar', 'comecar',
    'obrigado', 'valeu', 'show', 'legal', 'top', 'blz', 'beleza', 'sim', 'nao', 'não',
    'qualquer um', 'surpreenda', 'me surpreenda', 'recomende', 'indique'
  ];
  if (greetings.includes(text) || (text.length <= 4 && !/\d/.test(text))) {
    return false;
  }

  // Palavras-chave fortemente cinematográficas/audiovisuais
  const movieKeywords = [
    'filme', 'filmes', 'cinema', 'assistir', 'ver', 'assisti', 'série', 'series', 'episódio', 'episodio',
    'ator', 'atriz', 'atores', 'diretor', 'diretora', 'gênero', 'genero', 'sinopse', 'trailer', 'elenco',
    'dublado', 'legendado', 'áudio', 'audio', 'idioma', 'duração', 'duracao', 'minutos', 'tempo',
    'ação', 'acao', 'comédia', 'comedia', 'terror', 'suspense', 'drama', 'romance', 'romântico', 'romantico',
    'ficção', 'ficcao', 'sci-fi', 'fantasia', 'animação', 'animacao', 'desenho', 'infantil', 'criança', 'crianca',
    'família', 'familia', 'guerra', 'faroeste', 'western', 'artes marciais', 'luta', 'tanque', 'zumbi', 'alien',
    'monstro', 'tubarão', 'tubarao', 'cachorro', 'cão', 'cao', 'animal', 'animais', 'policial', 'crime',
    'hacker', 'cibercrime', 'natal', 'espírita', 'espirita', 'bíblico', 'biblico', 'evangélico', 'evangelico',
    'documentário', 'documentario', 'biografia', 'baseado em fatos', 'história real', 'historia real',
    'recomenda', 'recomendação', 'recomendacao', 'indica', 'indicação', 'indicacao', 'sugere', 'sugestão', 'sugestao',
    'catálogo', 'catalogo', 'streaming', 'caic', 'pipoca', 'sessão', 'sessao', 'tela', 'player',
    'hollywood', 'oscar', 'van damme', 'jackie chan', 'jet li', 'clint eastwood', 'charles bronson',
    'keanu reeves', 'tom cruise', 'brad pitt', 'dicaprio', 'chico xavier', 'matrix', 'john wick',
    'marvel', 'dc', 'batman', 'superman', 'disney', 'pixar', 'netflix', 'prime video', 'hbo',
    'o que assistir', 'me indica', 'tem algum', 'qual filme', 'assistindo', 'indicação', 'indique'
  ];

  for (const kw of movieKeywords) {
    if (text.includes(kw)) {
      return false; // É sobre cinema!
    }
  }

  // Gatilhos explícitos de fora de tópico
  const offTopicTriggers = [
    'receita', 'bolo', 'cozinhar', 'ingredientes', 'almoço', 'almoco', 'jantar', 'sobremesa', 'pão', 'pao',
    'previsão do tempo', 'previsao do tempo', 'vai chover', 'temperatura amanhã', 'temperatura hoje', 'clima em',
    'código', 'codigo', 'programar', 'programação', 'programacao', 'python', 'javascript', 'typescript',
    'java', 'c++', 'html', 'css', 'react', 'sql', 'bug', 'função em', 'algoritmo',
    'matemática', 'matematica', 'raiz quadrada', 'equação', 'equacao', 'quanto é', 'quanto e', 'calcule',
    'exercício', 'exercicio', 'tarefa de', 'dever de casa', 'trabalho escolar',
    'política', 'politica', 'eleição', 'eleicao', 'presidente', 'deputado', 'senador', 'voto', 'governo', 'lula', 'bolsonaro',
    'dólar', 'dolar', 'euro', 'bitcoin', 'criptomoeda', 'bolsa de valores', 'investir', 'investimento',
    'ações da', 'renda fixa', 'empréstimo', 'financiamento',
    'remédio', 'remedio', 'sintoma', 'sintomas', 'doença', 'doenca', 'dor de cabeça', 'médico', 'medico',
    'diagnóstico', 'diagnostico', 'tratamento para', 'pressão alta',
    'capital da', 'capital do', 'geografia', 'população de', 'país da', 'quantos habitantes',
    'consertar carro', 'trocar pneu', 'motor de carro', 'encanamento', 'eletricidade',
    'piada sobre papagaio', 'fofoca', 'horóscopo', 'horoscopo', 'signo de', 'astrologia',
    'redação sobre', 'escreva um texto sobre', 'como emagrecer', 'treino de academia'
  ];

  for (const trigger of offTopicTriggers) {
    if (text.includes(trigger)) {
      return true;
    }
  }

  // Padrões de início de perguntas conceituais alheias sem contexto de filme
  if (
    /^(como fazer|como criar|como programar|como cozinhar|qual a capital|quem descobriu|quanto custa|qual a distância|como consertar|qual o segredo)\b/.test(text)
  ) {
    return true;
  }

  return false;
}

export function buildOffTopicResponse(): {
  text: string;
  recommendedMovies: any[];
  isOffTopic: boolean;
  quickReplies: string[];
} {
  return {
    text: `🎬 **Sou o CAIC, seu assistente exclusivo de Cinema & Streaming!** 🍿\n\nMeu foco é **100% dedicado à sétima arte** e a ajudar você a encontrar o filme perfeito no nosso catálogo.\n\n⚠️ **Não respondo sobre outros assuntos** (como receitas culinárias, códigos, cálculos matemáticos, política ou dúvidas gerais).\n\n**Que tal escolhermos o filme perfeito para hoje?** Me diga: com quem você vai assistir ou que gênero você prefere?`,
    recommendedMovies: [],
    isOffTopic: true,
    quickReplies: DEFAULT_MOVIE_QUICK_REPLIES.slice(0, 5)
  };
}

/**
 * Detecta se a mensagem do usuário é uma pergunta de acompanhamento sobre um filme
 * que já está em discussão no histórico da conversa (ex: estúdio, diretor, elenco, sinopse, dublagem).
 */
export function isFollowUpMovieInquiry(rawText: string): boolean {
  if (!rawText) return false;
  const t = rawText.trim().toLowerCase();

  const triggers = [
    'estudio', 'estúdio', 'produtora', 'distribuidora', 'distribuidor',
    'diretor', 'diretora', 'dirigiu', 'direcao', 'direção',
    'ator', 'atores', 'atriz', 'atrizes', 'elenco', 'quem atua', 'quem fez', 'quem participa',
    'fale mais', 'conta mais', 'conte mais', 'resumo', 'sinopse', 'enredo', 'trama',
    'história desse', 'historia desse', 'história deste', 'historia deste',
    'sobre esse filme', 'sobre este filme', 'desse filme', 'deste filme', 'esse filme', 'este filme',
    'o final', 'final do filme', 'spoiler',
    'é dublado', 'e dublado', 'dublagem', 'idioma', 'áudio', 'audio', 'legendado',
    'qual o ano', 'ano de lançamento', 'ano de lancamento', 'quando foi lançado', 'quando foi lancado',
    'quantos minutos', 'duração', 'duracao', 'tempo de filme',
    'onde foi gravado', 'onde se passa', 'vale a pena', 'é bom', 'e bom', 'recomenda mesmo',
    'tem continuação', 'tem continuacao', 'parte 2', 'segunda parte', 'quem morre', 'quem vence'
  ];

  for (const trigger of triggers) {
    if (t.includes(trigger)) {
      return true;
    }
  }

  // Perguntas curtas sobre "qual...", "quem...", "onde...", quando em diálogo
  if (/^(qual|quem|onde|como|por que|porque|quando)\b/i.test(t) && t.length < 50) {
    return true;
  }

  return false;
}

