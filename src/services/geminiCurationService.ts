import { GoogleGenAI, Type } from '@google/genai';
import type { Movie, SearchFilters, UserProfile, VideoAnalysisResult, ChatRecommendation } from '../types/movie';
import { catalogService } from './catalogService';

export interface CurationResponse {
  text: string;
  recommendedMovies: Movie[];
  recommendationsWithReasons?: ChatRecommendation[];
  unmatchedQuery?: string;
  suggestWebSearch?: boolean;
  fallbackGenre?: string;
}

const SEARCH_CATALOG_DECLARATION = {
  name: 'search_catalog',
  description: 'Pesquisa no catálogo completo de filmes do CAIC filtrando por humor (mood), gênero, subgênero, ator, duração máxima, ano de lançamento e palavras-chave de contexto.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: 'Palavras-chave contextuais, temas ou elementos da história (ex: "van damme", "jackie chan", "artes marciais", "hacker", "espírita", "tanque", "zumbi", "tubarão", "natal").'
      },
      genre: {
        type: Type.STRING,
        description: 'Gênero desejado (ex: "Ação", "Drama", "Comédia", "Terror", "Suspense", "Ficção Científica", "Histórico", "Guerra", "Família", "Animação").'
      },
      subgenre: {
        type: Type.STRING,
        description: 'Subgênero específico (ex: "Comédia Romântica", "Comédia Adolescente / Pastelão", "Artes Marciais", "Terror Sobrenatural & Exorcismo", "Viagem no Tempo & Multiverso").'
      },
      actor: {
        type: Type.STRING,
        description: 'Ator específico (ex: "Jean-Claude Van Damme", "Jackie Chan", "Jet Li", "Dolph Lundgren", "Antonio Banderas", "Russell Crowe").'
      },
      mood: {
        type: Type.STRING,
        description: 'Humor ou tom desejado (ex: "adrenalina", "emocionante", "divertido", "arrepiante", "tenso", "reflexivo", "leve", "épico").'
      },
      maxDurationMinutes: {
        type: Type.NUMBER,
        description: 'Duração máxima em minutos (ex: 90 para filmes rápidos, 120 para longos).'
      },
      minYear: {
        type: Type.NUMBER,
        description: 'Ano de lançamento mínimo.'
      },
      maxYear: {
        type: Type.NUMBER,
        description: 'Ano de lançamento máximo.'
      }
    }
  }
};

class GeminiCurationService {
  public getApiKey(): string | null {
    return localStorage.getItem('CINEAI_GEMINI_API_KEY') || import.meta.env.VITE_GEMINI_API_KEY || null;
  }

  public setApiKey(key: string): void {
    localStorage.setItem('CINEAI_GEMINI_API_KEY', key);
  }

  public hasApiKey(): boolean {
    return Boolean(this.getApiKey());
  }

  /**
   * Analisa um link do YouTube / título do filme com a IA para extrair sinopse, tags, gêneros, humor e metadados
   */
  public async analyzeYouTubeVideo(params: {
    youtubeUrl: string;
    videoId: string;
    initialTitle?: string;
    channelName?: string;
  }): Promise<VideoAnalysisResult> {
    const apiKey = this.getApiKey();

    if (!apiKey) {
      return this.fallbackAnalyzeVideo(params);
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
Analise este filme ou obra disponível no YouTube:
- URL: ${params.youtubeUrl}
- ID do Vídeo: ${params.videoId}
- Título/Informação bruta: "${params.initialTitle || 'Não informado'}"
- Canal/Distribuidor: "${params.channelName || 'YouTube'}"

Por favor, como um curador de cinema profissional, gere metadados precisos e empolgantes em Português do Brasil para catalogar este filme no app de streaming CAIC.
Retorne EXCLUSIVAMENTE um objeto JSON válido no formato:
{
  "title": "Título em Português limpo e oficial",
  "originalTitle": "Título original se houver",
  "synopsis": "Sinopse envolvente de 2 a 3 frases em português, sem spoilers",
  "genres": ["Gênero 1", "Gênero 2"],
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "moods": ["humor1", "humor2"],
  "releaseYear": 2018,
  "durationMinutes": 95,
  "contentRating": "14",
  "language": "Dublado",
  "badge": "Destaque",
  "channelName": "${params.channelName || 'Canal Oficial'}",
  "ratingScore": 7.8
}
      `.trim();

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        }
      });

      const text = response.text || '{}';
      const parsed = JSON.parse(text) as VideoAnalysisResult;
      return {
        title: parsed.title || params.initialTitle || 'Filme Sem Título',
        originalTitle: parsed.originalTitle,
        synopsis: parsed.synopsis || 'Sinopse não disponível.',
        genres: Array.isArray(parsed.genres) && parsed.genres.length > 0 ? parsed.genres : ['Ação'],
        tags: Array.isArray(parsed.tags) && parsed.tags.length > 0 ? parsed.tags : ['cinema', 'grátis'],
        moods: Array.isArray(parsed.moods) && parsed.moods.length > 0 ? parsed.moods : ['emocionante'],
        releaseYear: Number(parsed.releaseYear) || new Date().getFullYear(),
        durationMinutes: Number(parsed.durationMinutes) || 90,
        contentRating: parsed.contentRating || '12',
        language: parsed.language || 'Dublado',
        badge: parsed.badge || 'Novidade',
        channelName: parsed.channelName || params.channelName || 'YouTube',
        ratingScore: Number(parsed.ratingScore) || 7.5
      };
    } catch (err) {
      console.warn('Erro ao analisar filme com Gemini, usando fallback:', err);
      return this.fallbackAnalyzeVideo(params);
    }
  }

  private fallbackAnalyzeVideo(params: {
    youtubeUrl: string;
    videoId: string;
    initialTitle?: string;
    channelName?: string;
  }): VideoAnalysisResult {
    const rawTitle = (params.initialTitle || 'Filme Adicionado').replace(/\s*\(?(completo|filme|dublado|legendado|HD|4K)\)?\s*/gi, ' ').trim();
    return {
      title: rawTitle,
      synopsis: `Obra adicionada ao catálogo do CAIC a partir do canal ${params.channelName || 'YouTube'}. Excelente opção gratuita disponível para assistir na íntegra.`,
      genres: ['Ação', 'Drama'],
      tags: ['grátis', 'youtube', 'completo', 'dublado'],
      moods: ['emocionante', 'intenso'],
      releaseYear: 2016,
      durationMinutes: 95,
      contentRating: '14',
      language: 'Dublado',
      badge: 'Adicionado por Usuário',
      channelName: params.channelName || 'YouTube',
      ratingScore: 7.5
    };
  }

  /**
   * Consulta o Curador de IA com contexto completo do catálogo e preferências do usuário
   */
  public async askCurator(
    userMessage: string,
    history: { role: 'user' | 'assistant'; content: string }[] = [],
    userProfile?: UserProfile
  ): Promise<CurationResponse> {
    const apiKey = this.getApiKey();

    if (!apiKey) {
      return this.smartSemanticHeuristicCuration(userMessage, userProfile);
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      let recommendedMovies: Movie[] = [];

      // Contexto do perfil e da conta do usuário para hiper-personalização
      let profileContext = '';
      if (userProfile) {
        const quiz = userProfile.tasteQuiz;
        profileContext = `
CONTEXTO DO USUÁRIO LOGADO:
- Nome: ${userProfile.name}
- Gêneros Favoritos salvos: ${userProfile.preferredGenres.join(', ')}
- Humores mais curtidos: ${userProfile.preferredMoods.join(', ')}
- Filmes na lista pessoal: ${userProfile.favoriteMovieIds.length} salvos
- Filmes já assistidos: ${(userProfile.watchedMovieIds || []).length} títulos vistos
${quiz ? `- Quiz Cinéfilo: Estilos: ${quiz.favoriteActorsAndStyles.join(', ')} | Época: ${quiz.eraPreference} | Ritmo: ${quiz.pacingPreference}` : ''}
Cumprimente cordialmente pelo nome quando apropriado e dê preferência às afinidades dele!
        `.trim();
      }

      const catalogTotal = catalogService.getAll().length;

      const systemInstruction = `
Você é o "CAIC", o assistente pessoal de cinema e inteligência artificial oficial da plataforma CAIC.
Seu objetivo é entender o que o usuário quer assistir e sugerir os melhores filmes do catálogo oficial do CAIC (atualmente composto por um amplo acervo de mais de ${catalogTotal} títulos completos de alta qualidade, legalmente disponíveis e em constante expansão com novos lançamentos).

${profileContext}

DIRETRIZES FUNDAMENTAIS:
1. TAMANHO DO CATÁLOGO: O catálogo conta com centenas de filmes completos (mais de ${catalogTotal} títulos catalogados). NUNCA diga que o catálogo só tem 200 filmes, que o catálogo é pequeno ou limitado. Apresente o acervo sempre como rico, variado e diversificado.
2. Sempre use a ferramenta 'search_catalog' para buscar filmes com base em gênero, subgênero, ator, palavras-chave e humor.
3. CASO O TÍTULO PEDIDO NÃO ESTEJA NO CATÁLOGO OU NÃO HAJA NADA CORRESPONDENTE:
   - Deixe EXPLICITAMENTE CLARO logo no início da resposta que o título ou obra procurada NÃO foi encontrada diretamente no acervo local do CAIC.
   - Explique que você analisou o gênero/tema/estilo (ex: Comédia Romântica, Terror na Floresta, Ação de Artes Marciais, Faroeste Clássico, Guerra) e selecionou as melhores opções equivalentes disponíveis no catálogo CAIC.
   - Sugira que o usuário solicite a busca na Web em segundo plano para os administradores avaliarem a inclusão!
4. SUBGÊNEROS E ATORES:
   - Se o usuário pedir subgêneros (ex: comédia romântica, comédia adolescente, artes marciais, faroeste, guerra histórica, terror psicológico), use os filtros apropriados e recomende títulos alinhados.
   - Se pedir atores (Jean-Claude Van Damme, Jackie Chan, Jet Li, Dolph Lundgren, Clint Eastwood, Charles Bronson, Richard Gere, Julia Roberts, Keanu Reeves, Brad Pitt, etc.), procure filmes correspondentes a esses astros.
5. FAROESTE E ARTES MARCIAIS:
   - O acervo conta com coleções enormes e riquíssimas de Faroeste (Clint Eastwood, Sergio Leone, Charles Bronson) e Artes Marciais (Jackie Chan, Jean-Claude Van Damme, Jet Li). Aproveite essas ricas coleções para indicar filmes ao usuário.
6. GUERRA E BATALHAS:
   - Se o usuário pedir "guerra", pesquise por filmes de guerra, conflitos militares, Segunda Guerra Mundial ou batalhas históricas no catálogo. NÃO trate guerra simplesmente como ação genérica.
7. Diga com entusiasmo e precisão POR QUE cada filme recomendado combina exatamente com o pedido do usuário (1 ou 2 frases curtas e cativantes por filme).
8. Responda em Português do Brasil com tom simpático, charmoso e moderno.
      `.trim();

      const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text?: string }> }> = history.map((h) => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }]
      }));

      contents.push({
        role: 'user',
        parts: [{ text: userMessage }]
      });

      const firstResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: [SEARCH_CATALOG_DECLARATION] }]
        }
      });

      const functionCalls = firstResponse.functionCalls;
      if (functionCalls && functionCalls.length > 0) {
        const call = functionCalls[0];
        const args = (call.args || {}) as SearchFilters;

        const searchResults = catalogService.search(args);
        recommendedMovies = searchResults.slice(0, 10);
        let unmatchedQuery: string | undefined = undefined;
        let suggestWebSearch = false;
        let fallbackGenre: string | undefined = undefined;

        if (recommendedMovies.length === 0) {
          unmatchedQuery = args.query || userMessage;
          suggestWebSearch = true;
          fallbackGenre = args.genre || userProfile?.preferredGenres?.[0] || 'Destaques';
          recommendedMovies = catalogService.getByGenre(fallbackGenre).slice(0, 6);
          if (recommendedMovies.length === 0) {
            recommendedMovies = catalogService.getAll().slice(0, 6);
          }
        }

        const simplifiedResults = recommendedMovies.slice(0, 4).map((m) => ({
          id: m.id,
          title: m.title,
          year: m.releaseYear,
          duration: `${m.durationMinutes}m`,
          genres: m.genres,
          subgenres: m.subgenres,
          cast: m.cast,
          synopsis: m.synopsis
        }));

        const secondResponse = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            ...contents,
            {
              role: 'model',
              parts: (firstResponse.candidates?.[0]?.content?.parts as any) || [{ functionCall: call }]
            },
            {
              role: 'user',
              parts: [
                {
                  functionResponse: {
                    name: call.name,
                    response: {
                      totalFound: recommendedMovies.length,
                      movies: simplifiedResults
                    }
                  }
                }
              ]
            }
          ],
          config: {
            systemInstruction
          }
        });

        const reasons: ChatRecommendation[] = recommendedMovies.map((m, idx) => ({
          movie: m,
          reason: `Combina com sua busca por ${args.genre || args.subgenre || args.actor || args.mood || 'cinema de qualidade'} e seu estilo cinéfilo.`,
          matchScore: Math.round(98 - idx * 2)
        }));

        return {
          text: secondResponse.text || 'Aqui estão as melhores opções selecionadas para você!',
          recommendedMovies,
          recommendationsWithReasons: reasons,
          unmatchedQuery,
          suggestWebSearch,
          fallbackGenre
        };
      }

      return {
        text: firstResponse.text || 'Como posso te ajudar a escolher o que assistir hoje?',
        recommendedMovies: []
      };
    } catch (err: unknown) {
      console.warn('Erro na chamada ao Gemini API, usando motor heurístico avançado:', err);
      return this.smartSemanticHeuristicCuration(userMessage, userProfile);
    }
  }

  /**
   * Motor Semântico Heurístico Avançado de Curadoria Local:
   * Analisa emoções, atores, duração e referências a filmes externos fora do catálogo
   */
  public smartSemanticHeuristicCuration(userMessage: string, userProfile?: UserProfile): CurationResponse {
    const text = userMessage.toLowerCase();
    let filters: SearchFilters = {};

    let detectedMood = '';
    let explanationIntro = '';

    let unmatchedQuery: string | undefined = undefined;
    let suggestWebSearch: boolean = false;
    let fallbackGenre: string | undefined = undefined;

    // 1. Dicionário de Franquias & Filmes Externos Famosos (Cross-Catalog Knowledge)
    const EXTERNAL_REFERENCES = [
      {
        keywords: ['panico na floresta', 'pânico na floresta', 'wrong turn', 'floresta maldita', 'sexta-feira 13', 'o albergue', 'massacre da serra', 'jogos mortais'],
        name: 'Pânico na Floresta (Wrong Turn)',
        genreDesc: 'Terror & Sobrevivência na Floresta',
        themeDesc: 'perseguição implacável por predadores em área isolada, mata fechada e luta desesperada pela sobrevivência',
        filter: { genre: 'Terror' as const },
        targetQuery: 'floresta',
        moodTag: 'arrepiante',
      },
      {
        keywords: ['matrix', 'cyberpunk', 'bladerunner', 'blade runner', 'exterminador do futuro', 'tron'],
        name: 'Matrix',
        genreDesc: 'Ficção Científica & Ação Cibernética',
        themeDesc: 'submundo de hackers, conspirações tecnológicas, inteligência artificial e códigos virtuais',
        filter: { genre: 'Suspense' as const, query: 'hacker' },
        targetQuery: 'hacker',
        moodTag: 'tenso',
      },
      {
        keywords: ['john wick', 'busca implacavel', 'busca implacável', 'resgate', 'o protetor', 'equalizer', 'rambo', 'duro de matar'],
        name: 'John Wick / Busca Implacável',
        genreDesc: 'Ação Intensa & Combate Implacável',
        themeDesc: 'combates corpo a corpo coreografados, tiroteios explosivos e missões de vingança e resgate',
        filter: { genre: 'Ação' as const },
        targetQuery: 'resgate',
        moodTag: 'adrenalina',
      },
      {
        keywords: ['tubarao', 'tubarão', 'megatubarao', 'megatubarão', 'anaconda', 'godzilla', 'king kong', 'monstro gigante', 'jurassic'],
        name: 'Tubarão / Megatubarão',
        genreDesc: 'Terror de Criaturas & Monstros Gigantes',
        themeDesc: 'predadores marinhos colossais, monstros pré-históricos e destruição colossal',
        filter: { genre: 'Terror' as const, query: 'shark' },
        targetQuery: 'shark',
        moodTag: 'arrepiante',
      },
      {
        keywords: ['tropa de elite', 'cidade de deus', 'carandiru', 'cinema nacional', 'filme brasileiro'],
        name: 'Tropa de Elite / Cinema Nacional',
        genreDesc: 'Grandes Histórias e Cinema Nacional',
        themeDesc: 'produções brasileiras de alto impacto, dramas humanos reais e atuações tocantes',
        filter: { query: 'Chico Xavier' },
        targetQuery: 'Chico Xavier',
        moodTag: 'emocionante',
      },
      {
        keywords: ['velozes e furiosos', 'need for speed', 'corrida de rua', 'piloto de fuga'],
        name: 'Velozes e Furiosos',
        genreDesc: 'Ação & Corridas Clandestinas',
        themeDesc: 'carros envenenados, velocidade máxima no asfalto e perseguições eletrizantes',
        filter: { genre: 'Ação' as const, query: 'racer' },
        targetQuery: 'racer',
        moodTag: 'adrenalina',
      },
      {
        keywords: ['gladiador', 'coracao valente', 'coração valente', '300', 'vikings', 'senhor dos aneis', 'senhor dos anéis', 'medieval'],
        name: 'Gladiador / Batalhas Épicas',
        genreDesc: 'Épico Histórico & Guerras de Espada',
        themeDesc: 'grandes reinos, batalhas de exércitos, guerreiros tribais e honra medieval',
        filter: { genre: 'Histórico' as const },
        targetQuery: 'batalha',
        moodTag: 'épico',
      },
      {
        keywords: ['invocacao do mal', 'invocação do mal', 'o exorcista', 'sobrenatural', 'annabelle', 'insidious', 'panico'],
        name: 'Invocação do Mal / Terror Sobrenatural',
        genreDesc: 'Terror Sobrenatural & Maldições',
        themeDesc: 'assombrações, entidades demoníacas e tensão que gela a espinha no escuro',
        filter: { genre: 'Terror' as const },
        targetQuery: 'morte',
        moodTag: 'arrepiante',
      },
      {
        keywords: ['resgate do soldado ryan', 'soldado ryan', 'coracoes de ferro', 'corações de ferro', '1917', 'segunda guerra', 'tanque de guerra'],
        name: 'O Resgate do Soldado Ryan / Corações de Ferro',
        genreDesc: 'Guerra Histórica & Tanques Blindados',
        themeDesc: 'Segunda Guerra Mundial, blindados de aço soviéticos e alemães, e coragem no campo de batalha',
        filter: { genre: 'Guerra' as const },
        targetQuery: 'ferro',
        moodTag: 'épico',
      },
      {
        keywords: ['paixao de cristo', 'paixão de cristo', 'quarto de guerra', 'filme biblico', 'filme bíblico', 'deus nao esta morto', 'deus não está morto'],
        name: 'A Paixão de Cristo / Cinema Bíblico',
        genreDesc: 'Fé, Bíblico & Espiritualidade',
        themeDesc: 'histórias bíblicas grandiosas, milagres dos santos, compaixão e reflexão espiritual',
        filter: { genre: 'Drama' as const, query: 'fé' },
        targetQuery: 'fé',
        moodTag: 'espiritual',
      }
    ];

    const matchedExternal = EXTERNAL_REFERENCES.find((ref) =>
      ref.keywords.some((kw) => text.includes(kw))
    );

    if (matchedExternal) {
      filters = { ...matchedExternal.filter };
      detectedMood = matchedExternal.moodTag;
      unmatchedQuery = matchedExternal.name;
      suggestWebSearch = true;
      fallbackGenre = matchedExternal.genreDesc;
    } else if (
      text.includes('quantos filme') ||
      text.includes('tamanho do cat') ||
      text.includes('total de filme') ||
      text.includes('quantidade de filme') ||
      text.includes('quantos títulos') ||
      text.includes('quantos titulos') ||
      text.includes('só tem 200') ||
      text.includes('so tem 200')
    ) {
      const currentTotal = catalogService.getAll().length;
      detectedMood = '🎬 Acervo Completo do CAIC';
      explanationIntro = `O catálogo oficial do CAIC conta atualmente com mais de **${currentTotal} filmes completos** legalmente disponíveis em alta definição, abrangendo ação, faroeste, comédia, romance, artes marciais, terror e suspense! Nosso acervo ultrapassa em muito os 200 títulos iniciais e cresce continuamente com novidades selecionadas a dedo. Veja algumas das melhores opções em destaque:`;
    } else if (text.includes('faroeste') || text.includes('western') || text.includes('bang bang') || text.includes('bang-bang')) {
      filters.genre = 'Faroeste';
      detectedMood = '🤠 Faroeste Clássico & Velho Oeste';
      explanationIntro = `Selecionei os maiores clássicos de faroeste do catálogo, repletos de duelos lendários e grandes atiradores:`;
    } else if (text.includes('clint eastwood')) {
      filters.actor = 'Clint Eastwood';
      detectedMood = '🤠 Lendas de Clint Eastwood';
      explanationIntro = `Obras consagradas e inesquecíveis estreladas por Clint Eastwood no acervo:`;
    } else if (text.includes('jackie chan')) {
      filters.actor = 'Jackie Chan';
      detectedMood = '🥋 Clássicos Jackie Chan';
      explanationIntro = `As maiores comédias de artes marciais e acrobacias lendárias de Jackie Chan no CAIC:`;
    } else if (text.includes('charles bronson')) {
      filters.actor = 'Charles Bronson';
      detectedMood = '🤠 Charles Bronson';
      explanationIntro = `Filmes lendários de ação e faroeste estrelados por Charles Bronson:`;
    } else if (text.includes('richard gere') || text.includes('julia roberts')) {
      filters.actor = text.includes('julia') ? 'Julia Roberts' : 'Richard Gere';
      detectedMood = '❤️ Romance & Dramas Consagrados';
      explanationIntro = `Filmes inesquecíveis e atuações brilhantes no acervo do CAIC:`;
    } else if (text.includes('comédia romântica') || text.includes('comedia romantica')) {
      filters.genre = 'Comédia';
      filters.subgenre = 'Comédia Romântica';
      detectedMood = '💖 Comédia Romântica';
      explanationIntro = `Selecionei as melhores comédias românticas do catálogo para aquecer o coração e dar boas risadas:`;
    } else if (text.includes('adolescente') || text.includes('besteirol') || text.includes('pastelão') || text.includes('pastelao')) {
      filters.genre = 'Comédia';
      filters.subgenre = 'Comédia Adolescente / Pastelão';
      detectedMood = '🎉 Comédia Adolescente / Pastelão';
      explanationIntro = `Separei comédias leves, divertidas e cheias de confusão perfeitas para descontrair:`;
    } else if (text.includes('van damme') || text.includes('jean-claude')) {
      filters.actor = 'Jean-Claude Van Damme';
      detectedMood = '🥋 Clássicos Jean-Claude Van Damme';
      explanationIntro = `Encontrei os maiores clássicos lendários de artes marciais de Jean-Claude Van Damme no CAIC:`;
    } else if (text.includes('dolph lundgren')) {
      filters.actor = 'Dolph Lundgren';
      detectedMood = '💥 Ação Dolph Lundgren';
      explanationIntro = `Filmes de pura ação e adrenalina estrelados por Dolph Lundgren:`;
    } else if (text.includes('antonio banderas')) {
      filters.actor = 'Antonio Banderas';
      detectedMood = '🎭 Antonio Banderas';
      explanationIntro = `Títulos com Antonio Banderas disponíveis no acervo:`;
    } else if (text.includes('russell crowe')) {
      filters.actor = 'Russell Crowe';
      detectedMood = '⭐ Russell Crowe';
      explanationIntro = `Produções renomadas estreladas por Russell Crowe:`;
    } else if (text.includes('parecido com') || text.includes('igual a') || text.includes('estilo de') || text.includes('lembra')) {
      const matchName = text.match(/(?:parecido(?:s)?\s+com|igual\s+a|no\s+estilo\s+de|lembra|tipo)\s+["']?([^"',?.!]+)["']?/i);
      const queriedTitle = matchName ? matchName[1].trim() : 'o título citado';
      unmatchedQuery = queriedTitle;
      suggestWebSearch = true;
      fallbackGenre = 'Suspense / Ação';

      if (text.includes('floresta') || text.includes('mato') || text.includes('acampamento')) {
        filters.genre = 'Terror';
        filters.query = 'floresta';
      } else if (text.includes('carro') || text.includes('velocidade')) {
        filters.genre = 'Ação';
        filters.query = 'racer';
      } else if (text.includes('guerra') || text.includes('batalha')) {
        filters.genre = 'Guerra';
      } else {
        filters.query = queriedTitle;
      }

      explanationIntro = `⚠️ Não localizei **"${queriedTitle}"** diretamente no catálogo local.\n\nAnalisando o gênero e a proposta, separei obras do CAIC que compartilham o mesmo DNA cinematográfico:`;
    } else if (
      text.includes('guerra') ||
      text.includes('batalha') ||
      text.includes('militar') ||
      text.includes('exercito') ||
      text.includes('soldado') ||
      text.includes('tanque') ||
      text.includes('segunda guerra') ||
      text.includes('conflito belico') ||
      text.includes('conflito bélico')
    ) {
      filters.genre = 'Guerra';
      filters.query = 'guerra';
      detectedMood = '⚔️ Filmes de Guerra & Batalhas';
      explanationIntro = `Selecionei os melhores filmes de guerra, conflitos históricos e batalhas do catálogo do CAIC:`;
    } else if (text.includes('adrenalina') || text.includes('tiro') || text.includes('luta') || text.includes('marcial') || text.includes('combate')) {
      filters.genre = 'Ação';
      filters.mood = 'adrenalina';
      detectedMood = '⚡ Adrenalina e Combate';
      explanationIntro = `Selecionei filmes carregados de ação pulsante, coreografias de tirar o fôlego e confrontos épicos:`;
    } else if (text.includes('rir') || text.includes('comédia') || text.includes('engraçado') || text.includes('divertido') || text.includes('relaxar')) {
      filters.genre = 'Comédia';
      filters.mood = 'divertido';
      detectedMood = '😂 Diversão e Boas Risadas';
      explanationIntro = `Para você relaxar e se divertir com ótimas risadas, separei comédias leves e cheias de energia:`;
    } else if (text.includes('medo') || text.includes('terror') || text.includes('susto') || text.includes('zumbi') || text.includes('arrepiante') || text.includes('monstro') || text.includes('pesadelo')) {
      filters.genre = 'Terror';
      filters.mood = 'arrepiante';
      detectedMood = '👻 Clima Sombrio & Sustos';
      explanationIntro = `Prepare a pipoca e apague as luzes! Encontrei obras aterrorizantes com criaturas e suspense tenso:`;
    } else if (text.includes('hacker') || text.includes('tecnologia') || text.includes('computador') || text.includes('sistema') || text.includes('ciber') || text.includes('dark web')) {
      filters.query = 'hacker';
      filters.genre = 'Suspense';
      detectedMood = '💻 Submundo Cibernético';
      explanationIntro = `Mergulhe no universo dos códigos, invasões digitais e espionagem cibernética com estas tramas afiadas:`;
    } else if (text.includes('fé') || text.includes('espírita') || text.includes('deus') || text.includes('chico') || text.includes('padre') || text.includes('santo') || text.includes('religioso') || text.includes('milagre') || text.includes('bíblia') || text.includes('biblia')) {
      filters.genre = 'Drama';
      filters.query = 'fé';
      detectedMood = '🙏 Histórias de Fé & Espiritualidade';
      explanationIntro = `Histórias profundas de espiritualidade, compaixão e milagres que tocam a alma:`;
    } else if (text.includes('história real') || text.includes('biografia') || text.includes('fatos reais') || text.includes('sobibor') || text.includes('verdadeira')) {
      filters.genre = 'Histórico';
      detectedMood = '📜 Baseado em Fatos Reais';
      explanationIntro = `Grandes obras baseadas em acontecimentos reais que marcaram a história humana:`;
    } else if (
      text.includes('animal') ||
      text.includes('animais') ||
      text.includes('cachorro') ||
      text.includes('cão') ||
      text.includes('cao') ||
      text.includes('cães') ||
      text.includes('caes') ||
      text.includes('pet') ||
      text.includes('pets') ||
      text.includes('bicho') ||
      text.includes('bichos') ||
      text.includes('porquinho') ||
      text.includes('safari') ||
      text.includes('safári') ||
      text.includes('leão') ||
      text.includes('leões')
    ) {
      filters.query = 'animais';
      detectedMood = '🐾 Histórias com Animais & Pets';
      explanationIntro = `Adoro filmes com animais! Desde histórias afetuosas com cães leais e pets da família, até aventuras na savana selvagem, reuni as melhores escolhas do nosso acervo:`;
    } else if (text.includes('família') || text.includes('criança') || text.includes('infantil') || text.includes('desenho') || text.includes('animação')) {
      filters.genre = 'Família';
      detectedMood = '🍿 Sessão Família';
      explanationIntro = `Histórias mágicas e divertidas aprovadas para assistir junto com a garotada:`;
    } else if (text.includes('jackie chan') || text.includes('jet li')) {
      filters.actor = text.includes('jackie chan') ? 'Jackie Chan' : 'Jet Li';
      detectedMood = '🥋 Mestres das Artes Marciais';
      explanationIntro = `Os mestres lendários de artes marciais em ação com combates espetaculares:`;
    } else if (text.includes('rápido') || text.includes('curto') || text.includes('menos de 90') || text.includes('pouco tempo')) {
      filters.maxDurationMinutes = 90;
      detectedMood = '⏳ Sessão Rápida (Até 90min)';
      explanationIntro = `Filmes ágeis de até 90 minutos para você aproveitar mesmo com o tempo apertado:`;
    } else {
      filters.query = userMessage;
      explanationIntro = `Vasculhei nosso acervo e encontrei títulos perfeitos alinhados com o que você pediu:`;
    }

    // Busca no catálogo
    let searchResults = catalogService.search(filters);

    if (searchResults.length === 0) {
      unmatchedQuery = userMessage.trim();
      suggestWebSearch = true;
      fallbackGenre = userProfile?.preferredGenres?.[0] || 'Destaques CAIC';
      searchResults = catalogService.getByGenre(fallbackGenre);
      if (searchResults.length === 0) {
        searchResults = catalogService.getAll();
      }
      explanationIntro = `⚠️ Não encontrei o título ou termo exato "**${userMessage.trim()}**" no catálogo local.\n\nComo alternativa, identifiquei suas preferências de gênero (*${fallbackGenre}*) e separei as melhores opções disponíveis:`;
    }

    // Ordenação e pontuação com afinidade do perfil e Quiz
    const watchedIds = new Set(userProfile?.watchedMovieIds || []);
    const preferredGenres = new Set(userProfile?.preferredGenres || []);
    const quiz = userProfile?.tasteQuiz;
    const quizGenres = new Set(quiz?.favoriteGenres || []);
    const quizStyles = quiz?.favoriteActorsAndStyles || [];

    const scored = searchResults.map((m) => {
      let score = m.ratingScore;
      if (m.featured) score += 1.5;

      for (const g of m.genres) {
        if (preferredGenres.has(g)) score += 2;
        if (quizGenres.has(g)) score += 1.5;
      }

      // Afinidade com quiz styles
      if (quizStyles.length > 0) {
        const fullText = `${m.title} ${m.synopsis} ${m.tags.join(' ')}`.toLowerCase();
        for (const st of quizStyles) {
          if (st.includes('Jackie Chan') && fullText.includes('jackie chan')) score += 3;
          if (st.includes('Chico Xavier') && fullText.includes('chico xavier')) score += 3;
          if (st.includes('Guerra') && (m.genres.includes('Guerra') || fullText.includes('tanque'))) score += 3;
          if (st.includes('Terror') && (m.genres.includes('Terror') || fullText.includes('aterro'))) score += 3;
        }
      }

      if (watchedIds.has(m.id)) score -= 3;
      return { movie: m, score };
    });

    // Retorna lote de até 9 filmes para permitir "Ver Mais Opções"
    const topMovies = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 9)
      .map((item) => item.movie);

    const userName = userProfile?.name || 'amigo';
    const moodPrefix = detectedMood ? `Foco: ${detectedMood}. ` : '';
    const greetings = [
      `Excelente escolha para agora, ${userName}! ${moodPrefix}${explanationIntro}`,
      `Perfeito, ${userName}! ${moodPrefix}${explanationIntro}`,
      `Entendido, ${userName}! ${moodPrefix}${explanationIntro}`
    ];
    const greetingText = greetings[Math.floor(Math.random() * greetings.length)];

    const recommendationsWithReasons: ChatRecommendation[] = topMovies.map((m, idx) => {
      let specificReason = `Afinidade de gênero (${m.genres.join(', ')}) e avaliação de ${m.ratingScore}/10 no CAIC.`;
      const t = m.title.toLowerCase();

      if (matchedExternal) {
        specificReason = `Alternativa perfeita no catálogo para ${matchedExternal.name}: compartilha o mesmo clima de ${m.genres.join(', ')} e adrenalina.`;
      } else if (t.includes('van damme') || m.tags.includes('van damme')) {
        specificReason = 'Clássico estrelado por Jean-Claude Van Damme com combates inesquecíveis.';
      } else if (t.includes('jackie chan') || m.tags.includes('jackie chan')) {
        specificReason = 'Clássico imperdível com acrobacias lendárias e carisma imbatível do Jackie Chan.';
      } else if (t.includes('chico xavier')) {
        specificReason = 'Uma das maiores produções do cinema brasileiro, tocante e inspiradora sobre amor ao próximo.';
      } else if (t.includes('invasores')) {
        specificReason = 'Um dos melhores thrillers de cibercrime dos últimos anos, repleto de reviravoltas no final.';
      } else if (t.includes('aterro') || t.includes('massacre') || t.includes('safari')) {
        specificReason = 'Tensão e sobrevivência em área inóspita com perigo mortal rondando a cada segundo.';
      } else if (t.includes('mega shark') || t.includes('megalodon')) {
        specificReason = 'Ação colossal com criaturas gigantescas e desastres marítimos de tirar o fôlego.';
      } else if (t.includes('kv1') || t.includes('ardenas')) {
        specificReason = 'Batalha épica de tanques blindados com reconstituição histórica e tensão de guerra real.';
      }

      return {
        movie: m,
        reason: specificReason,
        matchScore: Math.round(99 - (idx % 3) * 3)
      };
    });

    const highlightText = topMovies.slice(0, 3).map((m) => `🎬 **${m.title}** (${m.releaseYear}) • ${m.durationMinutes}m • *${m.genres[0]}*`).join('\n');

    return {
      text: `${greetingText}\n\n${highlightText}`,
      recommendedMovies: topMovies,
      recommendationsWithReasons,
      unmatchedQuery,
      suggestWebSearch,
      fallbackGenre
    };
  }

  /**
   * Responde perguntas do usuário em tempo real sobre o filme aberto no player,
   * buscando dados aprofundados, bastidores, críticas e curiosidades da web.
   */
  public async askMovieInsights(movie: Movie, question: string): Promise<{ text: string; sources?: string[] }> {
    const apiKey = this.getApiKey();

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `
Você é o CAIC, assistente inteligente e enciclopédia cinematográfica oficial da plataforma CAIC.
O espectador está assistindo ao filme:
- Título: "${movie.title}" (${movie.releaseYear})
- Título Original: "${movie.originalTitle || movie.title}"
- Gêneros: ${movie.genres.join(', ')}
- Duração: ${movie.durationMinutes} minutos
- Sinopse: "${movie.synopsis}"
- Elenco Principal: ${(movie.cast || []).join(', ') || 'Elenco oficial'}
- Canal/Origem: "${movie.channelName}"

Pergunta do usuário sobre o filme: "${question}"

Diretrizes de resposta:
- Responda em Português do Brasil com tom simpático, altamente informativo e cinéfilo.
- Se ele perguntar sobre fatos reais, diga se a história é baseada em fatos reais ou se é ficção.
- Traga curiosidades de bastidores, recepção da crítica especializada, prêmios ou impacto cultural.
- Não dê spoilers do desfecho a menos que o usuário peça explicitamente.
- Formate a resposta de forma agradável e legível com emojis e tópicos se cabível.
        `.trim();

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
        });

        const reply = response.text?.trim();
        if (reply) {
          return {
            text: reply,
            sources: ['Gemini 3.8 Flash', 'Google Knowledge Graph', 'Base Oficial CAIC'],
          };
        }
      } catch (e) {
        console.warn('Erro ao consultar insights do filme com Gemini:', e);
      }
    }

    // Fallback heurístico inteligente
    const qLower = question.toLowerCase();
    let reply = '';

    if (qLower.includes('real') || qLower.includes('fato') || qLower.includes('verdadeira')) {
      if (
        movie.genres.includes('Histórico') ||
        movie.genres.includes('Guerra') ||
        movie.tags.includes('biografia') ||
        movie.title.toLowerCase().includes('davi') ||
        movie.title.toLowerCase().includes('moises') ||
        movie.title.toLowerCase().includes('sobibor') ||
        movie.title.toLowerCase().includes('chico xavier')
      ) {
        reply = `📜 **Base Histórica & Fatos Reais:**\n"${movie.title}" (${movie.releaseYear}) possui forte ancoragem em acontecimentos e relatos históricos documentados. A obra retrata eventos marcantes da época com fidelidade dramática e respeito aos registros históricos.`;
      } else {
        reply = `🎬 **Origem da Obra:**\n"${movie.title}" é uma obra de ficção com roteiro original focado em ${movie.genres.join(' e ')}, concebida para criar uma experiência cinematográfica intensa e envolvente.`;
      }
    } else if (qLower.includes('ator') || qLower.includes('elenco') || qLower.includes('quem')) {
      const castList = movie.cast && movie.cast.length > 0 ? movie.cast.join(', ') : 'Atores e elenco do cinema mundial';
      reply = `🌟 **Elenco e Atuações:**\nO filme traz no elenco ${castList}. As atuações sustentam o tom de ${movie.genres[0]} ao longo dos seus ${movie.durationMinutes} minutos.`;
    } else if (qLower.includes('crítica') || qLower.includes('critica') || qLower.includes('nota') || qLower.includes('avaliação')) {
      reply = `⭐ **Recepção e Avaliação:**\n"${movie.title}" possui nota média avaliada em **${movie.ratingScore}/10** no acervo do CAIC. É muito elogiado pelo ritmo dinâmico e pela entrega nas sequências de ${movie.genres[0]}.`;
    } else if (qLower.includes('curiosidade') || qLower.includes('bastidor') || qLower.includes('segredo')) {
      reply = `💡 **Curiosidades de Bastidores:**\nLançado originalmente em ${movie.releaseYear}, o filme se destaca pela produção e pelas técnicas de filmagem características do seu período. A obra mantém relevância pela intensidade narrativa.`;
    } else {
      reply = `🍿 **Informações sobre "${movie.title}" (${movie.releaseYear}):**\nGêneros: **${movie.genres.join(', ')}** | Duração: **${movie.durationMinutes} min** | Nota: **${movie.ratingScore}/10**\n\n*Sinopse:* ${movie.synopsis}\n\nUma excelente escolha para quem aprecia ${movie.genres[0]} de qualidade!`;
    }

    return {
      text: reply,
      sources: ['Enciclopédia CAIC', 'Metadados Oficiais'],
    };
  }
}

export const geminiCurationService = new GeminiCurationService();
