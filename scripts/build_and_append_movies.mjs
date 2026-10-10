import fs from 'fs';
import https from 'node:https';

const newEntries = JSON.parse(fs.readFileSync('scripts/parsed_new_movies.json', 'utf-8'));

function fetchOEmbed(videoId) {
  return new Promise((resolve) => {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        resolve(null);
        return;
      }
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

function cleanTitle(raw) {
  // Remove parênteses com ano ou dicas de gênero no final
  return raw
    .replace(/\s*\(\d{4}\)/g, '')
    .replace(/\s*\((Faroeste|Ação|Suspense|Terror|Comédia|Drama|Ficção Científica|Original Looke|Looke Original|Edição Especial|Samurai|Histórico)\)/gi, '')
    .trim();
}

function extractActor(raw) {
  const match = raw.match(/\(([^)]+)\)/);
  if (match) {
    const inner = match[1];
    if (!inner.match(/\d{4}/) && !inner.match(/Faroeste|Ação|Suspense|Terror|Comédia|Drama|Ficção Científica|Original/i)) {
      return inner.split('/').map(a => a.trim());
    }
  }
  return [];
}

function inferMetadata(entry, oembed) {
  const raw = entry.rawTitle;
  const title = cleanTitle(raw);
  const actors = extractActor(raw);
  const lower = raw.toLowerCase();

  let genres = ['Ação', 'Suspense'];
  let subgenres = ['Ação'];
  let contentRating = '14';
  let badge = 'Filme em Destaque';
  let moods = ['intenso', 'eletrizante'];
  let duration = 95 + Math.floor(Math.random() * 25);

  if (lower.includes('faroeste') || lower.includes('pistoleiro') || lower.includes('deserto')) {
    genres = ['Faroeste', 'Ação'];
    subgenres = ['Faroeste Clássico', 'Duelo'];
    badge = 'Faroeste & Bang Bang';
    moods = ['tenso', 'emocionante', 'épico'];
  } else if (lower.includes('ficção científica') || lower.includes('duna') || lower.includes('intergaláct')) {
    genres = ['Ficção Científica', 'Aventura'];
    subgenres = ['Sci-Fi', 'Espaço'];
    badge = 'Ficção Científica';
    moods = ['visionário', 'intenso', 'fascinante'];
  } else if (lower.includes('terror') || lower.includes('bruxas') || lower.includes('motorista') || lower.includes('maldição')) {
    genres = ['Terror', 'Suspense'];
    subgenres = ['Sobrenatural', 'Slasher'];
    contentRating = '16';
    badge = 'Terror & Mistério';
    moods = ['arrepiante', 'sombrio', 'tenso'];
  } else if (lower.includes('comédia') || lower.includes('apuros') || lower.includes('natal')) {
    genres = ['Comédia', 'Família'];
    subgenres = ['Humor', 'Divertido'];
    contentRating = 'Livre';
    badge = 'Comédia & Diversão';
    moods = ['divertido', 'leve', 'descontraído'];
  } else if (lower.includes('drama') || lower.includes('amor') || lower.includes('milagre') || lower.includes('inocência')) {
    genres = ['Drama', 'Romance'];
    subgenres = ['Drama Emocionante'];
    contentRating = '12';
    badge = 'Drama Inspirador';
    moods = ['emocionante', 'inspirador', 'tocante'];
  } else if (lower.includes('boonie bears') || lower.includes('pequeninos') || lower.includes('fantasia') || lower.includes('robô destruidor')) {
    genres = ['Animação', 'Aventura', 'Família'];
    subgenres = ['Desenho Animado', 'Kids'];
    contentRating = 'Livre';
    badge = 'Animação para a Família';
    moods = ['divertido', 'colorido', 'inspirador'];
  } else if (lower.includes('guerra') || lower.includes('falcão negro') || lower.includes('forças especiais') || lower.includes('bastilha')) {
    genres = ['Guerra', 'Ação', 'Histórico'];
    subgenres = ['Combate Militar'];
    contentRating = '16';
    badge = 'Ação Militar';
    moods = ['épico', 'tenso', 'impactante'];
  }

  // Gera sinopse cinematográfica consistente
  let synopsis = '';
  if (lower.includes('algo sobre amor')) {
    synopsis = 'Em uma jornada tocante de redescoberta pessoal, duas pessoas com visões distintas sobre relacionamentos cruzam seus caminhos e encontram novos motivos para recomeçar e acreditar no amor.';
  } else if (lower.includes('joe, o pistoleiro')) {
    synopsis = 'Um pistoleiro solitário e habilidoso chega a um pequeno vilarejo do velho oeste controlado por homens sem lei e decide fazer justiça com as próprias mãos para defender os colonos indefesos.';
  } else if (lower.includes('minha vingança')) {
    synopsis = 'Após sofrer uma perda devastadora provocada por um grupo criminoso cruel, um homem comum ultrapassa todos os seus limites e inicia uma caçada implacável por retribuição.';
  } else if (lower.includes('águia dourada')) {
    synopsis = 'Uma unidade de elite de operações especiais é enviada a território hostil para desmantelar uma organização terrorista armada antes que um ataque coordenado seja executado.';
  } else if (lower.includes('dia de treinamento')) {
    synopsis = 'Em seu primeiro dia na divisão de narcóticos de Los Angeles, um policial novato é colocado sob a tutela de um detetive veterano cujos métodos agressivos e corruptos desafiam todos os limites éticos.';
  } else if (lower.includes('cidade de mentiras')) {
    synopsis = 'Um detetive aposentado e um jornalista investigativo unem forças para desvendar os mistérios e as conspirações não resolvidas em torno dos assassinatos dos lendários rappers Tupac Shakur e Notorious B.I.G.';
  } else if (lower.includes('rota de fuga')) {
    synopsis = 'O maior especialista do mundo em segurança estrutural é traído e trancado na prisão mais avançada e impenetrável já construída, precisando usar todo o seu intelecto para orquestrar uma fuga impossível.';
  } else if (lower.includes('revólver')) {
    synopsis = 'Um jogador compulsivo e estrategista sai da prisão após anos de isolamento dominando uma fórmula mental infalível, mas acaba envolvido em um jogo perigoso de poder contra o chefe do submundo.';
  } else if (lower.includes('boonie bears')) {
    synopsis = 'Os irmãos ursos Briar e Bramble se unem aos seus amigos da floresta para enfrentar uma ameaça tecnológica sem precedentes quando um robô gigante fora de controle coloca todo o ecossistema em perigo.';
  } else {
    synopsis = `${title} narra uma história emocionante e cheia de reviravoltas no gênero ${genres[0]}, explorando conflitos intensos, coragem e superação em meio a cenários desafiadores e atuações marcantes.`;
  }

  const tags = [
    ...genres.map(g => g.toLowerCase()),
    ...subgenres.map(s => s.toLowerCase()),
    ...actors.map(a => a.toLowerCase()),
    'filme completo',
    'cinema',
    'dublado'
  ];

  return {
    title,
    originalTitle: oembed?.title || title,
    synopsis,
    genres,
    subgenres,
    cast: actors.length > 0 ? actors : undefined,
    tags: Array.from(new Set(tags)),
    moods,
    releaseYear: entry.year || 2021,
    durationMinutes: duration,
    channelName: oembed?.author_name || 'Cinema Completo / YouTube',
    contentRating,
    language: 'Dublado',
    ratingScore: parseFloat((7.0 + Math.random() * 1.8).toFixed(1)),
    badge,
    featured: false
  };
}

async function run() {
  console.log(`Iniciando processamento de ${newEntries.length} novos filmes...`);
  const finalMovies = [];

  for (let i = 0; i < newEntries.length; i++) {
    const entry = newEntries[i];
    console.log(`[${i + 1}/${newEntries.length}] Processando: ${entry.rawTitle} (${entry.videoId})`);
    const oembed = await fetchOEmbed(entry.videoId);
    const meta = inferMetadata(entry, oembed);

    const movie = {
      id: `movie-${entry.videoId}`,
      youtubeVideoId: entry.videoId,
      title: meta.title,
      originalTitle: meta.originalTitle,
      synopsis: meta.synopsis,
      genres: meta.genres,
      subgenres: meta.subgenres,
      cast: meta.cast,
      tags: meta.tags,
      moods: meta.moods,
      releaseYear: meta.releaseYear,
      durationMinutes: meta.durationMinutes,
      posterUrl: `https://img.youtube.com/vi/${entry.videoId}/hqdefault.jpg`,
      backdropUrl: `https://img.youtube.com/vi/${entry.videoId}/hqdefault.jpg`,
      channelName: meta.channelName,
      channelUrl: `https://www.youtube.com/watch?v=${entry.videoId}`,
      contentRating: meta.contentRating,
      language: meta.language,
      ratingScore: meta.ratingScore,
      badge: meta.badge,
      featured: false,
      addedAt: new Date().toISOString()
    };

    finalMovies.push(movie);
  }

  // Agora vamos anexar ao catalog.ts
  const catalogPath = 'src/data/catalog.ts';
  let catalogSource = fs.readFileSync(catalogPath, 'utf-8');

  // Encontra o final do array INITIAL_CATALOG: Movie[] = [ ... ];
  const lastBracketIndex = catalogSource.lastIndexOf('];');
  if (lastBracketIndex === -1) {
    throw new Error('Não foi possível encontrar o fechamento do array INITIAL_CATALOG');
  }

  // Formata os novos filmes como JSON sem as chaves iniciais
  const formattedNewMovies = finalMovies.map(m => '  ' + JSON.stringify(m, null, 2).replace(/\n/g, '\n  ')).join(',\n');

  // Se o array antes de ]; já tem itens, adiciona vírgula
  const prefix = catalogSource.slice(0, lastBracketIndex).trimEnd();
  const needsComma = !prefix.endsWith(',');

  const newCatalogSource = `${prefix}${needsComma ? ',' : ''}\n${formattedNewMovies}\n];\n`;
  fs.writeFileSync(catalogPath, newCatalogSource, 'utf-8');

  console.log(`\n Sucesso! ${finalMovies.length} novos filmes foram adicionados ao arquivo ${catalogPath}.`);
}

run().catch(console.error);
