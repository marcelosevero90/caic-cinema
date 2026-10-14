import { GoogleGenAI, Type } from '@google/genai';
import type { Movie, SearchFilters, UserProfile, VideoAnalysisResult, ChatRecommendation, SceneShoppingAnalysis, SceneProductStore } from '../types/movie';
import { catalogService } from './catalogService';
import { deepseekService } from './deepseekService';

import {
  isOffTopicQuery,
  buildOffTopicResponse,
  isFollowUpMovieInquiry,
  shouldAttachMovieCards,
  DEFAULT_MOVIE_QUICK_REPLIES,
  FOLLOW_UP_MOVIE_REPLIES
} from './curatorGuardrails';

export interface CurationResponse {
  text: string;
  recommendedMovies: Movie[];
  recommendationsWithReasons?: ChatRecommendation[];
  unmatchedQuery?: string;
  suggestWebSearch?: boolean;
  fallbackGenre?: string;
  quickReplies?: string[];
  isOffTopic?: boolean;
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
      if (deepseekService.isAvailable()) {
        try {
          return await deepseekService.analyzeYouTubeVideo(params);
        } catch {
          // segue para fallback local
        }
      }
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
      console.warn('Erro ao analisar filme com Gemini, tentando DeepSeek:', err);
      try {
        if (deepseekService.isAvailable()) {
          return await deepseekService.analyzeYouTubeVideo(params);
        }
      } catch (dsErr) {
        console.warn('Fallback DeepSeek também indisponível:', dsErr);
      }
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
    userProfile?: UserProfile,
    recentMovies?: Movie[]
  ): Promise<CurationResponse> {
    // 1. Guardrail Imediato: Perguntas fora do contexto de cinema não devem seguir
    if (isOffTopicQuery(userMessage)) {
      return buildOffTopicResponse();
    }

    const isFollowUp = isFollowUpMovieInquiry(userMessage);
    const focalMovie = recentMovies && recentMovies.length > 0 ? recentMovies[0] : undefined;

    const apiKey = this.getApiKey();

    if (!apiKey) {
      if (deepseekService.isAvailable()) {
        try {
          return await deepseekService.askCurator(userMessage, history, userProfile, recentMovies);
        } catch (dsErr) {
          console.warn('DeepSeek indisponível, usando motor heurístico:', dsErr);
        }
      }
      return this.smartSemanticHeuristicCuration(userMessage, userProfile, recentMovies);
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

      // Contexto de filme(s) recentemente apresentados ou em discussão
      let focalMovieContext = '';
      if (recentMovies && recentMovies.length > 0) {
        focalMovieContext = `
FILME(S) ATUALMENTE EM DISCUSSÃO / RECOMENDADOS NA CONVERSA:
${recentMovies.slice(0, 3).map((m, idx) => `
[Filme ${idx + 1}] "${m.title}" (Título Original: "${m.originalTitle || m.title}")
- Ano: ${m.releaseYear} | Duração: ${m.durationMinutes} min | Áudio: ${m.language} | Classificação: ${m.contentRating}
- Gêneros: ${m.genres.join(', ')} ${m.subgenres ? `| Subgêneros: ${m.subgenres.join(', ')}` : ''}
- Canal/Distribuidora/Estúdio oficial no CAIC: "${m.channelName}"
- Elenco: ${(m.cast || []).join(', ') || 'Elenco oficial'}
- Sinopse: "${m.synopsis}"
- STATUS: CONFIRMADO E PRESENTE NO CATÁLOGO DO CAIC! (ID: ${m.id})
`).join('\n')}

DIRETRIZES ESSENCIAIS DE CONTINUIDADE E SEGUIMENTO (FOLLOW-UP):
- SE O USUÁRIO FIZER PERGUNTAS SOBRE O FILME ACIMA (ex: estúdio, canal, produtora, diretor, elenco, sinopse, se é bom, história, áudio):
  1. O FILME FAZ PARTE DO CATÁLOGO DO CAIC! NUNCA DIGA QUE ELE NÃO ESTÁ NO CATÁLOGO E NUNCA PEÇA DESCULPAS DIZENDO QUE NÃO O TEMOS!
  2. Responda diretamente e com precisão cinéfila à dúvida do usuário. Se a pergunta for sobre estúdio ou produtora, esclareça que no CAIC ele é distribuído/licenciado pelo parceiro oficial "${focalMovie?.channelName || recentMovies[0].channelName}", e contextualize a produção.
  3. NÃO acione a ferramenta search_catalog para perguntas conceituais sobre o filme em discussão, pois ele já está selecionado e confirmado no catálogo. Apenas responda naturalmente mantendo a conversa!
  4. Somente invoque search_catalog se o usuário pedir expressamente para procurar OUTROS filmes ou mudar de gênero/tema.
        `.trim();
      }

      const catalogTotal = catalogService.getAll().length;

      const systemInstruction = `
Você é o "CAIC", o assistente pessoal de cinema e inteligência artificial oficial da plataforma CAIC.
Seu objetivo é entender com precisão o que o usuário quer assistir e sugerir os melhores filmes do catálogo oficial do CAIC (atualmente composto por um amplo acervo de mais de ${catalogTotal} títulos completos de alta qualidade, legalmente disponíveis e em constante expansão com novos lançamentos).

${profileContext}

${focalMovieContext}

DIRETRIZES FUNDAMENTAIS:
1. ESCOPO E FILTRO ESTRITO - SOMENTE CINEMA E FILMES (REGRA INEGOCIÁVEL):
   - Você é EXCLUSIVAMENTE o consultor de filmes, séries e cinema da plataforma CAIC.
   - SE O USUÁRIO FIZER QUALQUER PERGUNTA OU PEDIDO FORA DO CONTEXTO DE CINEMA, FILMES, ATORES, DIRETORES, GÊNEROS OU ENTRETENIMENTO AUDIOVISUAL:
     * VOCÊ DEVE RECUSAR EDUCADAMENTE E COM SIMPATIA responder ao tema alheio!
     * Diga claramente: "Meu foco no CAIC é 100% exclusivo para a sétima arte e o universo do cinema! Não consigo responder sobre outros assuntos fora de filmes, mas sou especialista em encontrar a obra perfeita para a sua sessão."
     * NUNCA chame a ferramenta 'search_catalog' e NUNCA retorne recomendações de filmes para perguntas fora de tópico!
     * Traga o usuário de volta com uma pergunta chave de cinema.

2. REGRA ABSOLUTA DE CATÁLOGO (CATÁLOGO FECHADO DO CAIC):
   - Você SÓ PODE RECOMENDAR títulos que constem no catálogo do CAIC e que sejam retornados pela ferramenta 'search_catalog' ou fornecidos no contexto acima.
   - NUNCA invente títulos e NUNCA cite filmes externos populares da sua memória geral (como Titanic, Vingadores, Avatar, Interestelar, etc.) afirmando que estão no catálogo do CAIC, a menos que venham da busca.
   - Sempre que o usuário pedir recomendações ou perguntar o que assistir, você DEVE OBRIGATORIAMENTE acionar a ferramenta 'search_catalog' para obter os títulos reais do acervo.

3. PERGUNTAS PONTUAIS OU DÚVIDAS SOBRE UM FILME EM DISCUSSÃO (SEM ANEXAR NOVOS FILMES):
   - Se o usuário perguntar sobre o filme em discussão (qual estúdio, qual diretor, elenco, resumo da história, sinopse, se vale a pena, duração, áudio dublado):
     * O filme FAZ PARTE DO CATÁLOGO DO CAIC! NUNCA diga que não está no catálogo e NUNCA peça desculpas dizendo que não o temos!
     * Esclareça que no CAIC ele é licenciado e distribuído pelo canal oficial parceiro indicado (ex: ${focalMovie?.channelName || recentMovies?.[0]?.channelName || 'Parceiros Oficiais'}).
     * RESPONDA DIRETAMENTE À DÚVIDA EM TEXTO com riqueza de detalhes cinéfilos.
     * NÃO acione search_catalog para buscar outros filmes e NÃO apresente listas de outros filmes a menos que o usuário peça explicitamente para ver outras opções.

4. CONVERSA ITERATIVA E PERGUNTAS CHAVES:
   - Seja um concierge de cinema atencioso, caloroso e proativo.
   - Quando o usuário fizer pedidos genéricos ou amplos (ex: "o que assistir?", "me indica algo", "não sei o que ver"), faça perguntas chaves para descobrir a preferência do dia:
     * Com quem está assistindo? (sozinho, casal, família com crianças, amigos)
     * Qual o clima ou energia procura? (dar risadas, adrenalina, suspense com reviravoltas, susto no escuro, história emocionante de fé)
     * Quanto tempo tem disponível? (filme rápido de até 90min ou longa-metragem padrão)

5. TAMANHO DO CATÁLOGO: O catálogo conta com centenas de filmes completos (mais de ${catalogTotal} títulos catalogados). NUNCA diga que o catálogo só tem 200 filmes, que o catálogo é pequeno ou limitado. Apresente o acervo sempre como rico, variado e diversificado.

6. CASO O USUÁRIO PEÇA UM TÍTULO ESPECÍFICO EXTERNO QUE NÃO EXISTA NO CATÁLOGO:
   - Se for um filme novo que não existe no acervo, explique com simpatia que esse título específico não está disponível no momento e apresente opções do catálogo CAIC que compartilham o mesmo DNA, tema ou atores.

7. Responda em Português do Brasil com tom simpático, charmoso e moderno.

8. REGRA DE OURO PARA LINKS E BOTÃO "ASSISTIR" (NUNCA RECUSE LINKS):
   - No CAIC, os filmes recomendados SEMPRE aparecem como cards visuais interativos que incluem o botão "▶ Assistir" para o usuário dar play direto!
   - NUNCA, sob hipótese alguma, diga "eu não consigo enviar links diretos", "não mando links por aqui" ou mande o usuário pesquisar manualmente!
   - Quando o usuário pedir: "me manda o link dos filmes", "manda o link", "links", "onde clico", "quero a lista", "me passa umas dicas de comédia", "lista de filmes":
     Você DEVE acionar a ferramenta search_catalog ou citar os filmes do catálogo em negrito (**Título (Ano)**), e dizer: "Aqui estão os filmes com o botão de Assistir prontos para dar o play! Basta tocar no botão **Assistir** abaixo para começar a assistir."
       `.trim();

      // Interceptação imediata para pedidos de links / "Me manda o link dos filmes":
      const isLinkRequest = /(link|links|manda o link|manda os links|passa o link|link dos filmes|links dos filmes|onde clico|onde assistir|quero assistir|quero o link|bota o link|cade os filmes|cadê os filmes)/i.test(userMessage);
      if (isLinkRequest && history && history.length > 0) {
        for (let i = history.length - 1; i >= 0; i--) {
          const h = history[i];
          if (h.role === 'assistant' && h.content) {
            const extractedFromPrev = catalogService.findMoviesMentionedInText(h.content);
            if (extractedFromPrev.length > 0) {
              const reasons = extractedFromPrev.map((m, idx) => ({
                movie: m,
                reason: `Disponível para assistir agora no catálogo CAIC com 1 toque!`,
                matchScore: Math.round(98 - idx * 2)
              }));
              return {
                text: `Aqui estão os filmes com o botão **▶ Assistir** para você dar o play direto! Basta tocar no botão de qualquer um dos cards abaixo para começar a assistir agora mesmo:`,
                recommendedMovies: extractedFromPrev,
                recommendationsWithReasons: reasons,
                quickReplies: DEFAULT_MOVIE_QUICK_REPLIES.slice(0, 5)
              };
            }
          }
        }
      }

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

      const attachCards = shouldAttachMovieCards(userMessage);

      const functionCalls = firstResponse.functionCalls;
      if (functionCalls && functionCalls.length > 0) {
        const call = functionCalls[0];
        const args = (call.args || {}) as SearchFilters;

        let searchResults = catalogService.search(args);

        // Se a busca não achou nada por palavra-chave conceitual (ex: "qual estudio"), mas é uma pergunta sobre o filme em discussão
        if (searchResults.length === 0 && isFollowUp && recentMovies && recentMovies.length > 0) {
          searchResults = recentMovies;
        }

        // Filtra para garantir que apenas filmes ativos do catálogo façam parte das recomendações
        const activeCatalogMap = new Map(catalogService.getAll().map((m) => [m.id, m]));
        recommendedMovies = searchResults.filter((m) => activeCatalogMap.has(m.id)).slice(0, 10);

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
          channelName: m.channelName,
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

        // Somente anexa cards visuais de filmes se o usuário pediu sugestões ou se o contexto exigir recomendações
        let finalMovies = attachCards ? recommendedMovies.slice(0, 4) : [];
        if (attachCards && finalMovies.length === 0 && secondResponse.text) {
          const mentioned = catalogService.findMoviesMentionedInText(secondResponse.text);
          if (mentioned.length > 0) {
            finalMovies = mentioned.slice(0, 4);
          }
        }

        const reasons: ChatRecommendation[] | undefined = (attachCards && finalMovies.length > 0)
          ? finalMovies.map((m, idx) => ({
              movie: m,
              reason: isFollowUp && focalMovie && m.id === focalMovie.id
                ? `Filme em discussão: ${m.title} (${m.channelName})`
                : `Combina com sua busca por ${args.genre || args.subgenre || args.actor || args.mood || 'cinema de qualidade'} e seu estilo cinéfilo.`,
              matchScore: Math.round(98 - idx * 2)
            }))
          : undefined;

        return {
          text: secondResponse.text || 'Aqui estão as melhores opções selecionadas para você!',
          recommendedMovies: finalMovies,
          recommendationsWithReasons: reasons,
          unmatchedQuery: attachCards ? unmatchedQuery : undefined,
          suggestWebSearch: attachCards ? suggestWebSearch : false,
          fallbackGenre: attachCards ? fallbackGenre : undefined,
          quickReplies: isFollowUp ? FOLLOW_UP_MOVIE_REPLIES : DEFAULT_MOVIE_QUICK_REPLIES.slice(0, 5)
        };
      }

      // Se a IA respondeu diretamente em texto sem chamar search_catalog:
      let fallbackCards: Movie[] = [];
      let fallbackReasons: ChatRecommendation[] | undefined = undefined;

      if (attachCards) {
        // 1. Extrai automaticamente os filmes que a IA citou no texto (ex: **A Hora do Rush (1998)**)
        const mentionedMovies = catalogService.findMoviesMentionedInText(firstResponse.text || '');
        if (mentionedMovies.length > 0) {
          fallbackCards = mentionedMovies.slice(0, 4);
        } else {
          // Se foi um pedido explícito de recomendação, assegura que filmes ativos do catálogo sejam exibidos
          const searched = catalogService.search({ query: userMessage });
          fallbackCards = searched.slice(0, 4);
          if (fallbackCards.length === 0) {
            fallbackCards = catalogService.getAll().slice(0, 4);
          }
        }

        if (fallbackCards.length > 0) {
          fallbackReasons = fallbackCards.map((m, idx) => ({
            movie: m,
            reason: `Disponível no catálogo CAIC. Toque em Assistir para dar o play!`,
            matchScore: Math.round(98 - idx * 2)
          }));
        }
      }

      return {
        text: firstResponse.text || 'Como posso te ajudar a escolher o que assistir hoje?',
        recommendedMovies: fallbackCards,
        recommendationsWithReasons: fallbackReasons,
        quickReplies: (isFollowUp && recentMovies && recentMovies.length > 0)
          ? FOLLOW_UP_MOVIE_REPLIES
          : DEFAULT_MOVIE_QUICK_REPLIES.slice(0, 5)
      };
    } catch (err: unknown) {
      console.warn('Gemini API atingiu cota ou indisponível. Acionando fallback transparente DeepSeek...', err);
      try {
        if (deepseekService.isAvailable()) {
          return await deepseekService.askCurator(userMessage, history, userProfile, recentMovies);
        }
      } catch (dsErr) {
        console.warn('DeepSeek também indisponível, usando motor heurístico local:', dsErr);
      }
      return this.smartSemanticHeuristicCuration(userMessage, userProfile, recentMovies);
    }
  }

  /**
   * Motor Semântico Heurístico Avançado de Curadoria Local:
   * Analisa emoções, atores, duração e referências a filmes externos fora do catálogo
   */
  public smartSemanticHeuristicCuration(
    userMessage: string,
    userProfile?: UserProfile,
    recentMovies?: Movie[]
  ): CurationResponse {
    if (isOffTopicQuery(userMessage)) {
      return buildOffTopicResponse();
    }

    // Interceptação direta para pedidos de links para os filmes recém-discutidos
    const isLinkRequest = /(link|links|manda o link|manda os links|passa o link|link dos filmes|links dos filmes|onde clico|onde assistir|quero assistir|quero o link|bota o link|cade os filmes|cadê os filmes)/i.test(userMessage);
    if (isLinkRequest && recentMovies && recentMovies.length > 0) {
      return {
        text: `Aqui estão os filmes com o botão **▶ Assistir** para você dar o play direto no CAIC! Basta tocar no botão de qualquer um dos cards abaixo para começar a assistir agora:`,
        recommendedMovies: recentMovies.slice(0, 4),
        recommendationsWithReasons: recentMovies.slice(0, 4).map((m, idx) => ({
          movie: m,
          reason: `Disponível para assistir com 1 clique agora no catálogo CAIC!`,
          matchScore: Math.round(98 - idx * 2)
        })),
        quickReplies: DEFAULT_MOVIE_QUICK_REPLIES.slice(0, 5)
      };
    }

    const focalMovie = recentMovies && recentMovies.length > 0 ? recentMovies[0] : undefined;
    const isFollowUp = isFollowUpMovieInquiry(userMessage);
    const attachCards = shouldAttachMovieCards(userMessage);

    // Resposta imediata e inteligente para perguntas de continuidade sobre o filme em discussão
    if (isFollowUp && focalMovie) {
      const textLower = userMessage.toLowerCase();
      let replyText = '';

      if (
        textLower.includes('estudio') ||
        textLower.includes('estúdio') ||
        textLower.includes('produtora') ||
        textLower.includes('distribuidora') ||
        textLower.includes('distribuidor') ||
        textLower.includes('canal')
      ) {
        replyText = `🎬 **Estúdio e Distribuição de "${focalMovie.title}":**\n\nNo catálogo oficial do CAIC, "${focalMovie.title}" (${focalMovie.releaseYear}) é licenciado e distribuído pelo canal parceiro oficial **${focalMovie.channelName}**.\n\nTrata-se de uma produção independente de ${focalMovie.genres.join(' e ')}, com ${focalMovie.durationMinutes} minutos de duração e áudio ${focalMovie.language}.\n\nDeseja dar o play agora para assistir?`;
      } else if (
        textLower.includes('diretor') ||
        textLower.includes('diretora') ||
        textLower.includes('dirigiu') ||
        textLower.includes('direcao') ||
        textLower.includes('direção')
      ) {
        replyText = `🎬 **Direção e Produção:**\n\nA direção de "${focalMovie.title}" (${focalMovie.releaseYear}) foca na construção dramática e nos dilemas de ${focalMovie.genres.join(' / ')}.\n\nDistribuição oficial no CAIC via parceiro **${focalMovie.channelName}**. Deseja dar o play agora?`;
      } else if (
        textLower.includes('elenco') ||
        textLower.includes('ator') ||
        textLower.includes('atriz') ||
        textLower.includes('atores') ||
        textLower.includes('quem atua') ||
        textLower.includes('quem participa')
      ) {
        const castList = focalMovie.cast && focalMovie.cast.length > 0 ? focalMovie.cast.join(', ') : 'Elenco de atores do cinema internacional';
        replyText = `⭐ **Elenco Principal de "${focalMovie.title}":**\n\nO filme traz no elenco: ${castList}.\n\nEles conduzem a narrativa com intensidade. Quer que eu inicie a reprodução?`;
      } else if (
        textLower.includes('dublado') ||
        textLower.includes('audio') ||
        textLower.includes('áudio') ||
        textLower.includes('idioma') ||
        textLower.includes('legendado')
      ) {
        replyText = `🔊 **Áudio e Idioma:**\n\n"${focalMovie.title}" está disponível no CAIC em versão **${focalMovie.language}**, com ótima mixagem de som e resolução em alta definição!`;
      } else {
        replyText = `🎬 **Sobre "${focalMovie.title}" (${focalMovie.releaseYear}):**\n\n${focalMovie.synopsis}\n\n• **Duração:** ${focalMovie.durationMinutes} min\n• **Gênero:** ${focalMovie.genres.join(', ')}\n• **Distribuição no CAIC:** ${focalMovie.channelName}\n• **Classificação:** ${focalMovie.contentRating}\n\nO filme está confirmado e disponível no catálogo! Deseja assistir agora?`;
      }

      const moviesToKeep = attachCards ? (recentMovies && recentMovies.length > 0 ? recentMovies : [focalMovie]) : [];
      return {
        text: replyText,
        recommendedMovies: moviesToKeep,
        recommendationsWithReasons: attachCards ? moviesToKeep.map((m) => ({
          movie: m,
          reason: `Filme em discussão no catálogo do CAIC: ${m.title} (${m.channelName})`,
          matchScore: 99
        })) : undefined,
        quickReplies: FOLLOW_UP_MOVIE_REPLIES
      };
    }

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
    const finalTopMovies = attachCards ? topMovies : [];

    return {
      text: attachCards ? `${greetingText}\n\n${highlightText}` : greetingText,
      recommendedMovies: finalTopMovies,
      recommendationsWithReasons: attachCards ? recommendationsWithReasons : undefined,
      unmatchedQuery: attachCards ? unmatchedQuery : undefined,
      suggestWebSearch: attachCards ? suggestWebSearch : false,
      fallbackGenre: attachCards ? fallbackGenre : undefined,
      quickReplies: isFollowUp ? FOLLOW_UP_MOVIE_REPLIES : DEFAULT_MOVIE_QUICK_REPLIES.slice(0, 5)
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
        console.warn('Erro ao consultar insights do filme com Gemini, tentando DeepSeek:', e);
      }
    }

    // Tentar fallback DeepSeek se Gemini falhar ou não tiver chave
    try {
      if (deepseekService.isAvailable()) {
        const dsResult = await deepseekService.askMovieInsights(movie, question);
        if (dsResult && dsResult.text) {
          return dsResult;
        }
      }
    } catch (dsErr) {
      console.warn('Fallback DeepSeek também indisponível para insights:', dsErr);
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

  /**
   * Constrói links diretos para busca de compras nas principais plataformas de e-commerce brasileiras
   */
  public buildStoreLinks(query: string): SceneProductStore[] {
    const encoded = encodeURIComponent(query);
    const mlSlug = encodeURIComponent(query.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));

    return [
      {
        name: 'Mercado Livre',
        url: `https://lista.mercadolivre.com.br/${mlSlug || encoded}`,
        type: 'mercadolivre',
        badge: 'Entrega Rápida'
      },
      {
        name: 'Amazon Brasil',
        url: `https://www.amazon.com.br/s?k=${encoded}`,
        type: 'amazon',
        badge: 'Mais Vendidos'
      },
      {
        name: 'Shopee Brasil',
        url: `https://shopee.com.br/search?keyword=${encoded}`,
        type: 'shopee',
        badge: 'Cupons & Descontos'
      },
      {
        name: 'Google Shopping',
        url: `https://www.google.com.br/search?tbm=shop&q=${encoded}`,
        type: 'google',
        badge: 'Comparar Preços'
      }
    ];
  }

  /**
   * Analisa um objeto, roupa, acessório ou look da cena com a IA Gemini e gera opções de compra direta
   */
  public async analyzeSceneShopping(movie: Movie, query: string): Promise<SceneShoppingAnalysis> {
    const cleanQuery = query.trim();
    const nowTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (!cleanQuery) {
      return {
        id: `shop-${Date.now()}`,
        found: false,
        message: 'Por favor, digite o que você gostou na cena (ex: sapato preto da atriz, brinco de pérola, jaqueta de couro).',
        requestedQuery: query,
        timestamp: nowTimestamp
      };
    }

    const apiKey = this.getApiKey();

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `
Você é o consultor oficial de moda, figurino e compras "CineShop IA" da plataforma de streaming CAIC.
O usuário está assistindo a um filme no CAIC, pausou a reprodução e viu algo no filme que gostou muito e deseja comprar.

DADOS DO FILME:
- Título: "${movie.title}" (${movie.releaseYear})
- Título Original: "${movie.originalTitle || movie.title}"
- Gêneros: ${movie.genres.join(', ')}
- Subgêneros: ${(movie.subgenres || []).join(', ') || 'Geral'}
- Sinopse: "${movie.synopsis}"
- Elenco Principal: ${(movie.cast || []).join(', ') || 'Elenco do filme'}
- Canal/Origem: "${movie.channelName}"

SOLICITAÇÃO DO USUÁRIO / OBJETO QUE ELE QUER:
"${cleanQuery}"

SUAS REGRAS DE ANÁLISE:
1. Avalie se a solicitação se refere a um item de vestuário, figurino, sapato, calçado, acessório, jóia, óculos, relógio, bolsa ou objeto característico do contexto deste filme (${movie.releaseYear}, ${movie.genres.join(', ')}).
2. Se a solicitação for compreensível e plausível no contexto:
   - "found": true
   - "productName": Crie um nome comercial e atraente para o produto em Português do Brasil (ex: "Brinco Gota Pérola Barroca Banhado a Ouro", "Sapato Scarpin Salto Fino Clássico", "Jaqueta Masculina Couro Biker Preta", "Relógio Militar Vintage Couro").
   - "category": Categoria do produto (ex: "Jóias & Acessórios", "Calçados Femininos", "Moda & Vestuário", "Relógios").
   - "brandOrStyle": Marca de referência, grife ou estilo estético de época (ex: "Estilo Vintage Anos 40 / Inspiração Tiffany", "Estilo Cafe Racer / Inspiração Schott NYC", "Estilo Sofisticado").
   - "color": Cor e tonalidades exatas (ex: "Dourado com Pérola Branca", "Preto Clássico").
   - "model": Modelo e formato específico (ex: "Gota articulada com fecho clássico", "Corte slim fit com zíperes metálicos").
   - "material": Material predominante (ex: "Semijóia banhada a ouro 18k e madrepérola", "Couro legítimo ou PU resinado").
   - "estimatedPrice": Faixa de preço média estimada no e-commerce brasileiro em R$ (ex: "R$ 79,90 a R$ 199,00").
   - "description": 2 frases elegantes explicando a peça e como ela traduz o charme cinematográfico da cena e do personagem.
   - "searchQuery": Termos de busca em português limpos e diretos para encontrar exatamente essa peça em lojas virtuais (ex: "brinco gota perola dourada feminino vintage").
   - "message": Comentário descontraído e cinéfilo apresentando o item encontrado.
3. Se o usuário digitar algo incoerente, sem sentido com o filme, ou for impossível identificar o item ou analisar o contexto:
   - "found": false
   - "message": Mensagem cortês e amigável avisando que não foi possível identificar o objeto na cena deste filme, explicando brevemente e convidando o usuário a detalhar melhor (ex: cor, material, formato ou qual personagem estava usando).

RETORNE EXCLUSIVAMENTE UM OBJETO JSON VÁLIDO no seguinte formato:
{
  "found": true,
  "productName": "Nome do Produto",
  "category": "Categoria",
  "brandOrStyle": "Estilo ou Inspiração",
  "color": "Cor",
  "model": "Modelo",
  "material": "Material",
  "estimatedPrice": "Faixa de Preço",
  "description": "Descrição envolvente",
  "searchQuery": "termos para busca em lojas",
  "message": "Comentário da IA"
}
        `.trim();

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          }
        });

        const rawText = response.text?.trim() || '{}';
        const parsed = JSON.parse(rawText);

        if (parsed && typeof parsed.found === 'boolean') {
          if (!parsed.found) {
            return {
              id: `shop-${Date.now()}`,
              found: false,
              message: parsed.message || `Não consegui identificar com precisão este item na cena de "${movie.title}". Experimente descrever a cor, tipo de peça ou quem estava usando!`,
              requestedQuery: cleanQuery,
              timestamp: nowTimestamp
            };
          }

          const sq = (parsed.searchQuery || parsed.productName || cleanQuery).trim();
          const stores = this.buildStoreLinks(sq);

          return {
            id: `shop-${Date.now()}`,
            found: true,
            productName: parsed.productName || 'Peça Inspirada no Figurino do Filme',
            category: parsed.category || 'Moda & Figurino',
            brandOrStyle: parsed.brandOrStyle || 'Estilo de Cinema',
            color: parsed.color || 'Conforme a cena',
            model: parsed.model || 'Design original do filme',
            material: parsed.material || 'Material refinado',
            estimatedPrice: parsed.estimatedPrice || 'Consulte ofertas nas lojas',
            description: parsed.description || `Peça inspirada no figurino de "${movie.title}".`,
            searchQuery: sq,
            stores,
            message: parsed.message || `Encontrei opções elegantes para o figurino de "${movie.title}"! Veja abaixo onde comprar com os melhores preços:`,
            requestedQuery: cleanQuery,
            timestamp: nowTimestamp
          };
        }
      } catch (err) {
        console.warn('Erro ao consultar CineShop com Gemini, tentando DeepSeek:', err);
      }
    }

    // Tentar fallback DeepSeek se Gemini falhar ou não tiver chave
    try {
      if (deepseekService.isAvailable()) {
        const dsPrompt = `
Você é o consultor de compras "CineShop IA" do app CAIC.
O usuário pausou o filme "${movie.title}" (${movie.releaseYear}, ${movie.genres.join(', ')}) e pediu: "${cleanQuery}".
Retorne EXCLUSIVAMENTE um JSON no formato:
{
  "found": true ou false,
  "productName": "Nome do produto em português",
  "category": "Categoria",
  "brandOrStyle": "Estilo/Marca inspirada",
  "color": "Cor",
  "model": "Modelo",
  "material": "Material",
  "estimatedPrice": "R$ ... a R$ ...",
  "description": "Explicação da peça no filme",
  "searchQuery": "termos de busca em lojas",
  "message": "Mensagem para o usuário"
}
Se não for possível identificar o item, defina found=false e envie uma mensagem explicativa em "message".
        `.trim();

        const dsRaw = await deepseekService.chatCompletion([
          { role: 'system', content: 'Você é um assistente de moda cinematográfica que responde exclusivamente em JSON válido.' },
          { role: 'user', content: dsPrompt }
        ], { jsonMode: true, temperature: 0.3 });

        if (dsRaw) {
          const dsParsed = JSON.parse(dsRaw);
          if (dsParsed && typeof dsParsed.found === 'boolean') {
            if (!dsParsed.found) {
              return {
                id: `shop-${Date.now()}`,
                found: false,
                message: dsParsed.message || `Não consegui identificar este item na cena de "${movie.title}". Tente especificar cor, formato ou quem estava usando.`,
                requestedQuery: cleanQuery,
                timestamp: nowTimestamp
              };
            }
            const sq = (dsParsed.searchQuery || dsParsed.productName || cleanQuery).trim();
            return {
              id: `shop-${Date.now()}`,
              found: true,
              productName: dsParsed.productName || 'Item de Cena',
              category: dsParsed.category || 'Moda & Figurino',
              brandOrStyle: dsParsed.brandOrStyle || 'Estilo de Filme',
              color: dsParsed.color || 'Conforme a cena',
              model: dsParsed.model || 'Clássico',
              material: dsParsed.material || 'Material refinado',
              estimatedPrice: dsParsed.estimatedPrice || 'Consulte nas lojas',
              description: dsParsed.description || `Peça inspirada no figurino de "${movie.title}".`,
              searchQuery: sq,
              stores: this.buildStoreLinks(sq),
              message: dsParsed.message || `Encontrei o item de "${movie.title}"! Veja onde comprar:`,
              requestedQuery: cleanQuery,
              timestamp: nowTimestamp
            };
          }
        }
      }
    } catch (dsErr) {
      console.warn('Fallback DeepSeek também indisponível para CineShop:', dsErr);
    }

    // Heurística de fallback inteligente (100% offline-ready)
    return this.fallbackAnalyzeSceneShopping(movie, cleanQuery, nowTimestamp);
  }

  /**
   * Fallback heurístico resiliente para análise de itens e figurinos
   */
  private fallbackAnalyzeSceneShopping(movie: Movie, query: string, timestamp: string): SceneShoppingAnalysis {
    const q = query.toLowerCase();

    // Detecção de termos de vestuário e acessórios
    const isFashionOrItem = /(sapato|brinco|bolsa|jaqueta|casaco|rel[oó]gio|vestido|anel|colar|óculos|oculos|bota|camisa|terno|chap[eé]u|gravata|salto|cal[çc]a|saia|cinto|roupa)/i.test(q);

    if (!isFashionOrItem) {
      return {
        id: `shop-${Date.now()}`,
        found: false,
        message: `Não consegui identificar com precisão esse item no filme "${movie.title}". Como se trata de um filme de ${movie.releaseYear}, experimente descrever o tipo de peça (ex: "sapato de salto da atriz", "brinco dourado", "jaqueta de couro do protagonista") ou a cor!`,
        requestedQuery: query,
        timestamp
      };
    }

    let category = 'Acessórios & Moda';
    let productName = 'Peça Inspirada no Figurino do Filme';
    let color = 'Paleta clássica da cena';
    let model = 'Estilo cinematográfico';
    let material = 'Material de alta qualidade';
    let estimatedPrice = 'R$ 69,90 a R$ 199,00';
    let searchQuery = `${query} ${movie.genres[0] || ''}`.trim();

    if (q.includes('brinco')) {
      category = 'Jóias & Semijóias';
      productName = 'Brinco Sofisticado Estilo Cinema Clássico';
      color = q.includes('ouro') || q.includes('dourad') ? 'Dourado' : (q.includes('prata') ? 'Prata' : 'Dourado com Pérola');
      model = 'Pendente articulado em gota';
      material = 'Semijóia banhada a ouro 18k e pérola sintética';
      estimatedPrice = 'R$ 49,90 a R$ 159,00';
      searchQuery = `brinco gota perola ${color} feminino vintage`;
    } else if (q.includes('sapato') || q.includes('salto') || q.includes('bota')) {
      category = 'Calçados';
      productName = 'Sapato Scarpin Salto Fino Clássico de Cinema';
      color = q.includes('pret') ? 'Preto' : (q.includes('vermelh') ? 'Vermelho' : 'Preto Clássico');
      model = 'Scarpin bico fino salto médio elegante';
      material = 'Couro sintético verniz ou napa premium';
      estimatedPrice = 'R$ 99,90 a R$ 249,00';
      searchQuery = `sapato scarpin ${color} salto fino feminino`;
    } else if (q.includes('bolsa')) {
      category = 'Bolsas & Malas';
      productName = 'Bolsa Estruturada de Mão Clássica';
      color = 'Tons neutros sofisticados';
      model = 'Estruturada média com alça de mão e transversal';
      material = 'Material sintético premium estruturado';
      estimatedPrice = 'R$ 89,90 a R$ 229,00';
      searchQuery = 'bolsa feminina estruturada classica luxo';
    } else if (q.includes('jaqueta') || q.includes('casaco')) {
      category = 'Vestuário';
      productName = 'Jaqueta de Couro Biker Estilo Filme de Ação';
      color = 'Preto clássico';
      model = 'Biker com zíperes transversais e gola padre';
      material = 'Couro sintético resinado de alta densidade';
      estimatedPrice = 'R$ 149,90 a R$ 389,00';
      searchQuery = 'jaqueta couro masculina biker preta';
    } else if (q.includes('relógio') || q.includes('relogio')) {
      category = 'Relógios';
      productName = 'Relógio de Pulso Analógico Militar/Vintage';
      color = 'Caixa prata/chumbo com pulseira escura';
      model = 'Analógico quartzo com mostrador clássico';
      material = 'Caixa de aço com pulseira de couro';
      estimatedPrice = 'R$ 120,00 a R$ 350,00';
      searchQuery = 'relogio masculino analogico couro vintage militar';
    } else if (q.includes('vestido')) {
      category = 'Vestuário Feminino';
      productName = 'Vestido Longo Elegante de Noite';
      color = 'Conforme paleta de cores da cena';
      model = 'Caimento fluido acinturado';
      material = 'Tecido encorpado com caimento premium';
      estimatedPrice = 'R$ 119,90 a R$ 299,00';
      searchQuery = 'vestido feminino longo elegante festa cinema';
    } else if (q.includes('óculos') || q.includes('oculos')) {
      category = 'Acessórios';
      productName = 'Óculos Escuros Estilo Clássico';
      color = 'Preto com lentes fumê polarizadas';
      model = 'Wayfarer ou Aviador vintage';
      material = 'Acetato resistente com proteção UV400';
      estimatedPrice = 'R$ 59,90 a R$ 180,00';
      searchQuery = 'oculos de sol retro vintage polarizado';
    }

    return {
      id: `shop-${Date.now()}`,
      found: true,
      productName,
      category,
      brandOrStyle: `Figurino de ${movie.releaseYear} • ${movie.title}`,
      color,
      model,
      material,
      estimatedPrice,
      description: `Peça semelhante ao figurino marcante de "${movie.title}", ideal para compor um look autêntico com estilo de cinema.`,
      searchQuery,
      stores: this.buildStoreLinks(searchQuery),
      message: `Encontrei opções inspiradas no figurino de "${movie.title}"! Veja onde comprar com entrega e desconto:`,
      requestedQuery: query,
      timestamp
    };
  }
}


export const geminiCurationService = new GeminiCurationService();
