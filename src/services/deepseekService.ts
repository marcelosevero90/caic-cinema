import type { Movie, UserProfile, VideoAnalysisResult, ChatRecommendation } from '../types/movie';
import type { CurationResponse } from './geminiCurationService';
import { catalogService } from './catalogService';
import {
  isOffTopicQuery,
  buildOffTopicResponse,
  isFollowUpMovieInquiry,
  shouldAttachMovieCards,
  DEFAULT_MOVIE_QUICK_REPLIES,
  FOLLOW_UP_MOVIE_REPLIES
} from './curatorGuardrails';
import { apiUrl } from './apiConfig';

export interface DeepSeekChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

class DeepSeekService {
  public getApiKey(): string {
    return (
      (typeof window !== 'undefined' ? localStorage.getItem('CINEAI_DEEPSEEK_API_KEY') : null) ||
      import.meta.env.VITE_DEEPSEEK_API_KEY ||
      ''
    );
  }

  public setApiKey(key: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('CINEAI_DEEPSEEK_API_KEY', key);
    }
  }

  public isAvailable(): boolean {
    // Disponível se houver chave no frontend OU se a rota serverless /api/ai/deepseek estiver operando
    return true;
  }

  /**
   * Executa chamada de completude de chat no DeepSeek
   * Tenta primeiro o proxy serverless (/api/ai/deepseek) para evitar restrições de CORS
   * Se falhar, tenta chamada direta à API oficial (https://api.deepseek.com)
   */
  public async chatCompletion(
    messages: DeepSeekChatMessage[],
    options: {
      temperature?: number;
      max_tokens?: number;
      jsonMode?: boolean;
    } = {}
  ): Promise<string> {
    const apiKey = this.getApiKey();
    const payload = {
      model: 'deepseek-chat',
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 1800,
      ...(options.jsonMode ? { response_format: { type: 'json_object' } } : {}),
    };

    // 1. Tentar endpoint interno /api/ai/deepseek
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
      const proxyRes = await fetch(apiUrl('/api/ai/deepseek'), {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (proxyRes.ok) {
        const data = await proxyRes.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) return content;
      }
    } catch {
      // Ignora e tenta chamada direta
    }

    // 2. Chamada direta ao endpoint oficial da DeepSeek
    const directRes = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!directRes.ok) {
      const errBody = await directRes.text();
      throw new Error(`DeepSeek API error (${directRes.status}): ${errBody}`);
    }

    const data = await directRes.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('DeepSeek retornou resposta vazia.');
    }

    return content;
  }

  /**
   * Curador de Filmes via DeepSeek (Fallback quando cota do Gemini esgota)
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

    const catalog = catalogService.getAll();
    const catalogTotal = catalog.length;

    // Se houver filmes em discussão, prioriza-os no topo dos candidatos
    let candidates: Movie[] = [];
    if (recentMovies && recentMovies.length > 0) {
      candidates.push(...recentMovies);
    }

    // Busca preliminar de candidatos no catálogo local
    const candidateResults = catalogService.search({
      query: userMessage,
    });
    for (const m of candidateResults) {
      if (!candidates.some((c) => c.id === m.id)) {
        candidates.push(m);
      }
    }

    // Completa com filmes do acervo até 16
    for (const m of catalog) {
      if (candidates.length >= 16) break;
      if (!candidates.some((c) => c.id === m.id)) {
        candidates.push(m);
      }
    }

    const candidatesSummary = candidates.map((m) => ({
      id: m.id,
      title: m.title,
      originalTitle: m.originalTitle || m.title,
      year: m.releaseYear,
      duration: `${m.durationMinutes}m`,
      genres: m.genres,
      subgenres: m.subgenres,
      channelName: m.channelName,
      cast: (m.cast || []).slice(0, 4),
      synopsis: m.synopsis.slice(0, 160) + '...',
    }));

    let profileContext = '';
    if (userProfile) {
      const quiz = userProfile.tasteQuiz;
      profileContext = `
CONTEXTO DO USUÁRIO LOGADO:
- Nome: ${userProfile.name}
- Gêneros Favoritos: ${userProfile.preferredGenres.join(', ')}
- Humores preferidos: ${userProfile.preferredMoods.join(', ')}
${quiz ? `- Preferências do Quiz: ${quiz.favoriteActorsAndStyles.join(', ')} | Época: ${quiz.eraPreference}` : ''}
Trate cordialmente pelo nome quando adequado.
      `.trim();
    }

    let focalMovieContext = '';
    if (recentMovies && recentMovies.length > 0) {
      focalMovieContext = `
FILME(S) ATUALMENTE EM DISCUSSÃO / RECOMENDADOS NA CONVERSA:
${recentMovies.slice(0, 3).map((m, idx) => `
[Filme ${idx + 1}] "${m.title}" (${m.releaseYear}) - Estúdio/Canal oficial no CAIC: "${m.channelName}" - Gêneros: ${m.genres.join(', ')} - Duração: ${m.durationMinutes}m - Áudio: ${m.language}
Sinopse: "${m.synopsis}"
STATUS: ESTE FILME ESTÁ CONFIRMADO E PRESENTE NO CATÁLOGO DO CAIC! (ID: "${m.id}")
`).join('\n')}

DIRETRIZES CRÍTICAS PARA PERGUNTAS DE FOLLOW-UP:
- Se o usuário perguntar sobre o filme em discussão (estúdio, canal, produtora, diretor, elenco, sinopse, se é bom, história, etc.):
  1. O filme ESTÁ confirmado no catálogo do CAIC! NUNCA diga que não faz parte do catálogo e NUNCA peça desculpas por ausência!
  2. Responda diretamente em "message" à dúvida do usuário em texto amigável. Se perguntar qual o estúdio ou produtora, informe que no CAIC ele é licenciado/distribuído pelo canal parceiro "${focalMovie?.channelName || recentMovies[0].channelName}".
  3. Mantenha "unmatchedQuery": "" e "suggestWebSearch": false.
  4. Para perguntas conceituais ou dúvidas pontuais sobre o filme, defina "recommendedMovieIds": [] e "reasons": [] (não é necessário reexibir cards repetidos).
      `.trim();
    }

    const systemPrompt = `
Você é o "CAIC", assistente inteligente de cinema e inteligência artificial oficial da plataforma de streaming CAIC.
Seu objetivo é orientar o usuário e sugerir os melhores filmes disponíveis no catálogo oficial do CAIC (que conta com mais de ${catalogTotal} filmes completos de alta qualidade).

${profileContext}

${focalMovieContext}

DIRETRIZES:
1. ESCOPO E FILTRO ESTRITO - SOMENTE CINEMA E FILMES (REGRA INEGOCIÁVEL):
   - Você é EXCLUSIVAMENTE um curador e assistente de cinema e filmes do CAIC.
   - SE O USUÁRIO FIZER QUALQUER PERGUNTA OU PEDIDO FORA DE CINEMA/FILMES (receitas, programação de computadores, matemática, política, cotações financeiras, tarefas escolares, etc.):
     * "isOffTopic": true
     * "message": "Meu foco no CAIC é 100% exclusivo para a sétima arte e o universo do cinema! Não consigo responder sobre outros assuntos fora de filmes, mas sou especialista em encontrar a obra perfeita para a sua sessão. Que tipo de filme você gostaria de assistir hoje?"
     * "recommendedMovieIds": [] (lista VAZIA)
     * "quickReplies": ["Comédia Leve", "Ação & Adrenalina", "Sessão em Família", "Suspense Inteligente"]
2. REGRA ABSOLUTA DE CATÁLOGO (CATÁLOGO FECHADO):
   - Você SÓ PODE RECOMENDAR títulos que constem na LISTA DE FILMES DISPONÍVEIS NO ACERVO abaixo ou no contexto de discussão.
   - NUNCA invente títulos ou recomende filmes de fora que não existam nessa lista.
3. PERGUNTAS PONTUAIS OU DÚVIDAS SOBRE UM FILME EM DISCUSSÃO:
   - Se o usuário perguntar sobre o filme em discussão (estúdio, diretor, elenco, duração, sinopse) ou fizer uma pergunta informativa:
     * RESPONDA DIRETAMENTE À DÚVIDA EM TEXTO em "message".
     * Defina "recommendedMovieIds": [] e "reasons": [], para responder pontualmente sem sobrecarregar a tela com novos cards.
4. CONVERSA ITERATIVA: Se o usuário estiver indeciso, faça 1 ou 2 perguntas chaves (companhia, energia/clima, tempo disponível).
5. Quando sugerir filmes, diga com clareza e entusiasmo por que cada filme recomendado combina com o que o usuário pediu (1 a 2 frases por filme).
6. Responda EXCLUSIVAMENTE em formato JSON com o seguinte schema:
{
  "isOffTopic": false,
  "message": "Texto caloroso da resposta em Português com introdução e comentários dos filmes...",
  "recommendedMovieIds": ["id1", "id2", "id3"],
  "reasons": [
    { "movieId": "id1", "reason": "Frase explicando por que combina com o pedido" }
  ],
  "unmatchedQuery": "Se o usuário pediu um título específico NOVO que NÃO existe no catálogo, coloque aqui o nome do filme",
  "suggestWebSearch": false,
  "quickReplies": ["Opção 1", "Opção 2"]
}

LISTA DE FILMES DISPONÍVEIS NO ACERVO:
${JSON.stringify(candidatesSummary, null, 2)}
    `.trim();

    const messages: DeepSeekChatMessage[] = [
      { role: 'system', content: systemPrompt },
    ];

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
              text: `Aqui estão os filmes com o botão **▶ Assistir** para você dar o play direto! Basta tocar no botão de qualquer um dos cards abaixo para começar a assistir agora:`,
              recommendedMovies: extractedFromPrev,
              recommendationsWithReasons: reasons,
              quickReplies: DEFAULT_MOVIE_QUICK_REPLIES.slice(0, 5)
            };
          }
        }
      }
    }

    // Inclui histórico recente de até 4 mensagens
    const recentHistory = history.slice(-4);
    for (const h of recentHistory) {
      messages.push({
        role: h.role === 'assistant' ? 'assistant' : 'user',
        content: h.content,
      });
    }

    messages.push({
      role: 'user',
      content: userMessage,
    });

    const responseText = await this.chatCompletion(messages, {
      temperature: 0.7,
      max_tokens: 1800,
    });

    const attachCards = shouldAttachMovieCards(userMessage);

    try {
      // Tenta extrair JSON da resposta
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        if (parsed.isOffTopic) {
          return {
            text: parsed.message || 'Meu foco é 100% dedicado aos filmes do catálogo do CAIC! O que você gostaria de assistir hoje?',
            recommendedMovies: [],
            isOffTopic: true,
            quickReplies: DEFAULT_MOVIE_QUICK_REPLIES.slice(0, 5),
          };
        }

        const matchedMovies: Movie[] = [];
        const reasonsList: ChatRecommendation[] = [];

        if (attachCards && Array.isArray(parsed.recommendedMovieIds)) {
          for (let i = 0; i < parsed.recommendedMovieIds.length; i++) {
            const id = parsed.recommendedMovieIds[i];
            const found = catalog.find((m) => m.id === id);
            if (found) {
              matchedMovies.push(found);
              const customReason = parsed.reasons?.find((r: any) => r.movieId === id)?.reason;
              reasonsList.push({
                movie: found,
                reason: customReason || (isFollowUp && focalMovie && found.id === focalMovie.id ? `Filme em discussão no catálogo: ${found.title} (${found.channelName})` : `Combina com o estilo e gênero procurado.`),
                matchScore: Math.round(98 - i * 2),
              });
            }
          }
        }

        let finalMovies = attachCards ? (matchedMovies.length > 0 ? matchedMovies : candidates.slice(0, 4)) : [];

        // Se veio sem filmes mas o texto mencionou filmes do catálogo, extrai
        if (finalMovies.length === 0) {
          const mentioned = catalogService.findMoviesMentionedInText(parsed.message || responseText);
          if (mentioned.length > 0) {
            finalMovies = mentioned.slice(0, 4);
          }
        }

        return {
          text: parsed.message || responseText,
          recommendedMovies: finalMovies,
          recommendationsWithReasons: (attachCards || finalMovies.length > 0) && reasonsList.length > 0
            ? reasonsList
            : (finalMovies.length > 0
              ? finalMovies.map((m, idx) => ({
                  movie: m,
                  reason: `Disponível para assistir com 1 toque no catálogo CAIC.`,
                  matchScore: Math.round(98 - idx * 2)
                }))
              : undefined),
          unmatchedQuery: attachCards ? parsed.unmatchedQuery : undefined,
          suggestWebSearch: attachCards ? Boolean(parsed.suggestWebSearch || parsed.unmatchedQuery) : false,
          quickReplies: Array.isArray(parsed.quickReplies) && parsed.quickReplies.length > 0
            ? parsed.quickReplies
            : (isFollowUp ? FOLLOW_UP_MOVIE_REPLIES : DEFAULT_MOVIE_QUICK_REPLIES.slice(0, 5)),
        };
      }
    } catch {
      // Caso não seja um JSON perfeito, usa o texto puro e os candidatos pré-selecionados
    }

    // Fallback de extração se não veio JSON estrito
    let fallbackMovies = attachCards
      ? (isFollowUp && recentMovies && recentMovies.length > 0 ? recentMovies : candidates.slice(0, 4))
      : [];

    if (fallbackMovies.length === 0) {
      const mentioned = catalogService.findMoviesMentionedInText(responseText);
      if (mentioned.length > 0) {
        fallbackMovies = mentioned.slice(0, 4);
      }
    }

    return {
      text: responseText,
      recommendedMovies: fallbackMovies,
      recommendationsWithReasons: (attachCards || fallbackMovies.length > 0) ? fallbackMovies.map((m, idx) => ({
        movie: m,
        reason: isFollowUp && focalMovie && m.id === focalMovie.id
          ? `Filme em discussão no catálogo: ${m.title} (${m.channelName})`
          : `Selecionado pelo curador inteligente com base no seu pedido.`,
        matchScore: Math.round(98 - idx * 2),
      })) : undefined,
      quickReplies: isFollowUp ? FOLLOW_UP_MOVIE_REPLIES : DEFAULT_MOVIE_QUICK_REPLIES.slice(0, 5),
    };

  }

  /**
   * Análise de Vídeo do YouTube via DeepSeek (extração de metadados)
   */
  public async analyzeYouTubeVideo(params: {
    youtubeUrl: string;
    videoId: string;
    initialTitle?: string;
    channelName?: string;
  }): Promise<VideoAnalysisResult> {
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
  "moods": ["emocionante", "intenso"],
  "releaseYear": 2020,
  "durationMinutes": 95,
  "contentRating": "14",
  "language": "Dublado",
  "badge": "Lançamento",
  "ratingScore": 7.8,
  "cast": ["Ator Principal 1", "Ator Principal 2"]
}
    `.trim();

    const response = await this.chatCompletion(
      [
        { role: 'system', content: 'Você é um catalogador cinéfilo profissional. Retorne apenas JSON.' },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.3, max_tokens: 1000 }
    );

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Resposta de análise não continha JSON válido.');
    }

    const data = JSON.parse(jsonMatch[0]);
    return {
      title: data.title || params.initialTitle || 'Filme Catalogado',
      originalTitle: data.originalTitle,
      synopsis: data.synopsis || 'Uma incrível obra disponível no acervo oficial.',
      genres: Array.isArray(data.genres) && data.genres.length > 0 ? data.genres : ['Ação'],
      tags: Array.isArray(data.tags) ? data.tags : ['cinema', 'completo'],
      moods: Array.isArray(data.moods) ? data.moods : ['empolgante'],
      releaseYear: Number(data.releaseYear) || 2020,
      durationMinutes: Number(data.durationMinutes) || 90,
      contentRating: data.contentRating || '14',
      language: (data.language as any) || 'Dublado',
      badge: data.badge || 'Destaque',
      channelName: params.channelName || 'YouTube',
      ratingScore: Number(data.ratingScore) || 7.5,
      cast: Array.isArray(data.cast) ? data.cast : [],
    };
  }

  /**
   * Resposta a perguntas sobre filmes (trivia, bastidores, elenco)
   */
  public async askMovieInsights(
    movie: Movie,
    question: string
  ): Promise<{ text: string; sources?: string[] }> {
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
- Se perguntar sobre fatos reais, esclareça se a história é baseada em fatos reais ou ficção.
- Traga curiosidades de bastidores, recepção da crítica especializada ou impacto cultural.
- Não dê spoilers do desfecho a menos que solicitado expressamente.
- Formate a resposta de forma agradável e legível com emojis e tópicos se cabível.
    `.trim();

    const reply = await this.chatCompletion(
      [
        { role: 'system', content: 'Você é um enciclopedista e crítico de cinema experiente.' },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.7, max_tokens: 1200 }
    );

    return {
      text: reply.trim(),
      sources: ['Inteligência Artificial CAIC', 'Base Oficial CAIC'],
    };
  }
}

export const deepseekService = new DeepSeekService();
