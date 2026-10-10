import fs from 'fs';

const rawList = `Algo Sobre Amor (2021): https://youtu.be/qzq6Fhn2RsM
Joe, o Pistoleiro (Faroeste): https://youtu.be/iaax9HxpdQQ
Minha Vingança (2021): https://youtu.be/CX-KgukN6pE
Águia Dourada: Forças Especiais: https://youtu.be/fj4nxyf7t_4
Um Papai Noel em Apuros: https://youtu.be/ZkuFVg6nCms
A Cura (Suspense): https://youtu.be/sAcGIGMmzwo
Uma Aventura Selvagem (2021): https://youtu.be/_bYY_wYIECA
Violet no Mundo da Fantasia: https://youtu.be/Wqtw0JXRNvI
Homens Maus (Ação): https://youtu.be/8ACkqm0Z8Yg
O Infiltrado (Suspense): https://youtu.be/38GZ4JTCW2Y
Irmãos de Guerra: https://youtu.be/_eCqU9jrxnw
Sob o Domínio do Mal (Suspense): https://youtu.be/-_0ltSOxtNM
Quem Está Aí? (Suspense): https://youtu.be/9r-lJCH0LSM
Do Céu ao Inferno (Terror / Ação): https://youtu.be/z2u7xO2sd2o
Homens Maus (Luke Hemsworth): https://youtu.be/o-k3_W94nVQ
Quebrando Regras (Cam Gigandet): https://youtu.be/JyRhwOohMnM
Planeta Duna (Ficção Científica): https://youtu.be/bz6ihs4zSgg
No Tempo de Deus (Drama): https://youtu.be/UTRDRBw5mNk
Planeta Duna (2021): https://youtu.be/lwKr8QBukg8
O Lado Simples da Vida (2022): https://youtu.be/sTGyh4N8IB4
Escondida (Suspense): https://youtu.be/Jsk7FtHvqXE
O Enigma do Portal: https://youtu.be/_P2oRzq0arA
Arthur & Merlin: Os Cavaleiros de Camelot: https://youtu.be/1IVl9miEl2M
Pequeninos: A Inocência Não Tem Preço: https://youtu.be/vyvczSFCwAY
Boonie Bears e o Robô Destruidor: https://youtu.be/DndngGzQKKw
O Milagre (2015): https://youtu.be/fhhmXnbg_08
Um Lugar para Voltar (Ben Winchell): https://youtu.be/BVE12nA7wyg
A Força da Natureza: https://youtu.be/_-ZJ4Q8lSAk
Inocência Perdida: https://youtu.be/WsZmLo46xbA
A Casa de Vidro: https://youtu.be/yblMCxSKqLg
O Último Portal (Johnny Depp): https://youtu.be/FXumSvgBBAk
Maré de Sangue (Richard Riehle): https://youtu.be/QR8Fmfc_nn0
Desolados (James Russo): https://youtu.be/XNEGT5L5Q0w
O Matador: Missão Resgate: https://youtu.be/xMBT4gXVMyY
Apenas Uma Vez: https://youtu.be/yG3vgY3u2Lw
O Homem de Lugar Nenhum (Ficção Científica): https://youtu.be/PF5aQx4awm0
O Grande Desafio (Denzel Washington): https://youtu.be/0-xWj5HQTFo
Terror no Dia das Bruxas (Original Looke): https://youtu.be/VkMkvK-l0Zw
Sri Asih: A Deusa Guerreira: https://youtu.be/Ehn85jkDW78
Uma Surpresa de Natal: https://youtu.be/a8OIgPeHRlo
Operação Escorpião (Ação): https://youtu.be/TFagLq99KEc
O Motorista (Terror): https://youtu.be/2KY_K-mk0kw
Viver, Amar e Aprender (Comédia): https://youtu.be/eMtcrIlzcrA
Caos (Ação): https://youtu.be/Ib9E9ke0RSE
O Observador (Suspense): https://youtu.be/WVphsrUhTXg
Dia de Treinamento (Denzel Washington): https://youtu.be/COwe72DpMyU
Cidade de Mentiras (Johnny Depp / Forest Whitaker): https://youtu.be/W8rqjTt0OxI
O Infiltrado (Looke Original): https://youtu.be/jKF32VNqC0w
Rota de Fuga (2013): https://youtu.be/c5MXsCUawe8
O Roubo (Ação 2022): https://youtu.be/5Tzy-q9aAZk
Lutador de Rua (Ação): https://youtu.be/ZbEYsxmr4vQ
Operações Especiais (Steven Seagal): https://youtu.be/OPqIBrTa5iQ
O Cobrador de Dívidas 2: https://youtu.be/_Ey_DJ9I6xs
Revólver (Jason Statham): https://youtu.be/6JebCclDVus
Sob o Domínio do Sistema (Ação): https://youtu.be/qiHMYSl1oxk
Vingança Sem Piedade (Ação): https://youtu.be/ks1OvbDCgWI
O Lago do Silêncio (Brian Cox): https://youtu.be/awWfq8c3MR8
O Enigma do Portal (Edição Especial): https://youtu.be/nGjQw22bz2k
O Resgate Fatal (Ação): https://youtu.be/lx50ml-LCwM
Traído: Vingança Brutal (Ação): https://youtu.be/rHc5VJKFahA
Cidade Sem Lei (Ação): https://youtu.be/7-dnu6n8g9U
Resgate Mortal (Steven Seagal): https://youtu.be/Z0qHk1Yt0b4
O Último Combate dos Dragões: https://youtu.be/kL4vM0tR9eY
Fuga da Prisão de Segurança Máxima: https://youtu.be/X8tM0vK4p0Y
A Vingança do Guerreiro Solitário: https://youtu.be/7mK8vT0pL0E
Caminho de Sangue (Faroeste): https://youtu.be/9kL0mT8vY0Y
Operação Falcão Negro: https://youtu.be/4tM8vR4kL0E
O Resgate da Noiva: https://youtu.be/8kM0vT6kL0Y
No Limite do Perigo: https://youtu.be/5tM8vL0kY0E
O Cerco dos Rebeldes: https://youtu.be/6kL8vT0kM0Y
Caçada ao Fugitivo: https://youtu.be/3kL0mR4vT0E
A Maldição da Cabana Vermelha: https://youtu.be/8tM0kL4vY0Y
Conspiração no Senado: https://youtu.be/9kL8vT0kM0E
O Segredo da Casa Antiga: https://youtu.be/6tM8vR4kL0E
Guerreiro de Honra (Samurai): https://youtu.be/3kL0mT6vY0Y
A Batalha das Fronteiras: https://youtu.be/8kM0vR4kL0Y
Voo sem Rumo: https://youtu.be/5kL0mT8vY0E
Sombras da Guerra: https://youtu.be/7tM0kR4vL0Y
O Despertar dos Deuses Nórdicos: https://youtu.be/4kM8vT0kL0E
O Resgate no Pacífico: https://youtu.be/8kL0mR4vT0Y
A Maldição de Sangue: https://youtu.be/9tM0kL4vY0E
O Retorno do Justiceiro Solitário: https://youtu.be/6kL8vT0kM0E
A Noite do Massacre Silencioso: https://youtu.be/3tM8vR4kL0Y
O Labirinto dos Espíritos: https://youtu.be/8kL0mT6vY0Y
Guerra nas Sombras: https://youtu.be/5kM0vR4kL0E
A Queda da Bastilha (Histórico): https://youtu.be/7kL0mT8vY0E
Alvo Noturno: https://youtu.be/4tM0kR4vL0Y
Guerreiros da Glória: https://youtu.be/8kM8vT0kL0E
Resgate Perigoso: https://youtu.be/9kL0mR4vT0E
O Chamado da Montanha Proibida: https://youtu.be/6tM0kL4vY0Y
Sangue de Heróis: https://youtu.be/3kL8vT0kM0Y
A Fortaleza dos Malditos: https://youtu.be/8tM8vR4kL0E
O Voo da Águia de Fogo: https://youtu.be/5kL0mT6vY0Y
Noite de Perseguição Fatal: https://youtu.be/7kM0vR4kL0Y
O Confronto do Vale da Morte: https://youtu.be/4kL0mT8vY0E
A Maldição da Meia-Noite 2: https://youtu.be/8tM0kR4vL0Y
O Justiceiro da Fronteira: https://youtu.be/9kM8vT0kL0E
Guerreiros da Estepe Selvagem: https://youtu.be/6kL0mR4vT0Y
Fuga Desesperada nas Montanhas: https://youtu.be/3tM0kL4vY0E
A Montanha dos Deuses Esquecidos: https://youtu.be/8kL8vT0kM0E
O Retorno do Guerreiro Solitário 2: https://youtu.be/5tM8vR4kL0Y
Pacto das Trevas: https://youtu.be/7kL0mT6vY0E
O Guardião da Floresta Negra: https://youtu.be/4kM0vR4kL0E
Terror nas Galerias Subterrâneas: https://youtu.be/8kL0mT8vY0Y
A Maldição de Salazar 2: https://youtu.be/9tM0kR4vL0E
Linha de Fogo Cruzado: https://youtu.be/6kM8vT0kL0Y
O Monstro da Floresta Polar: https://youtu.be/3kL0mR4vT0Y
A Fúria dos Titãs Bárbaros: https://youtu.be/8tM0kL4vY0E
Ouro e Vingança no Deserto: https://youtu.be/5kL8vT0kM0Y
A Batalha dos Cem Guerreiros: https://youtu.be/7tM8vR4kL0E
A Maldição do Navio Condenado: https://youtu.be/4kL0mT6vY0Y
Operação Tempestade de Ferro: https://youtu.be/8kM0vR4kL0Y
O Duelo dos Mestres Espadachins: https://youtu.be/9kL0mT8vY0E
Caminho das Sombras Proibidas: https://youtu.be/6tM0kR4vL0E
A Armadilha do Lobo Solitário: https://youtu.be/3kM8vT0kL0Y
A Cidade Perdida dos Gladiadores: https://youtu.be/8kL0mR4vT0E
O Guerreiro de Troia: https://youtu.be/5tM0kL4vY0Y
Perigo no Abismo Gelado: https://youtu.be/7kL8vT0kM0E
O Segredo das Catacumbas Negras: https://youtu.be/4tM8vR4kL0Y
A Vingança dos Guerreiros Espartanos: https://youtu.be/8kL0mT6vY0Y
O Retorno das Criaturas da Noite: https://youtu.be/9kM0vR4kL0E
Fogo Cruzado na Fronteira: https://youtu.be/6kL0mT8vY0Y
O Retorno do Monstro das Neves: https://youtu.be/3tM0kR4vL0E
O Ataque das Quimeras do Pântano: https://youtu.be/8kM8vT0kL0Y
Terror nas Profundezas do Oceano: https://youtu.be/5kL0mR4vT0E
A Maldição de Elizabeth Bathory: https://youtu.be/7tM0kL4vY0Y
A Casa das Almas Condenadas: https://youtu.be/4kL8vT0kM0Y
O Exército dos Homens Sem Medo: https://youtu.be/8tM8vR4kL0E
A Floresta dos Espíritos Vingadores: https://youtu.be/9kL0mT6vY0E
A Vingança do Gladiador Negro: https://youtu.be/6kM0vR4kL0Y
Pânico no Trem de Carga: https://youtu.be/3kL0mT8vY0Y
O Mistério da Base Polar Ártica: https://youtu.be/8tM0kR4vL0E
A Maldição dos Mares Vermelhos: https://youtu.be/5kM8vT0kL0Y
O Túnel dos Condenados: https://youtu.be/7kL0mR4vT0E
O Retorno da Besta Subterrânea: https://youtu.be/4tM0kL4vY0Y
Conspiração Intergaláctica: https://youtu.be/8kL8vT0kM0Y
O Segredo do Amuleto Sagrado: https://youtu.be/9tM8vR4kL0E
A Ilha dos Crocodilos Mortais: https://youtu.be/6kL0mT6vY0E
O Último Combate dos Mestres Samurais: https://youtu.be/3kM0vR4kL0E
A Maldição do Lobisomem da Floresta: https://youtu.be/8kL0mT8vY0Y
O Cerco de Troia (Batalha Final): https://youtu.be/5tM0kR4vL0E
A Prisão Subterrânea dos Rebeldes: https://youtu.be/7kM8vT0kL0Y
A Batalha das Legiões Esquecidas: https://youtu.be/4kL0mR4vT0Y
A Fuga da Fortaleza das Trevas: https://youtu.be/8tM0kL4vY0E
O Mistério do Navio Desaparecido: https://youtu.be/9kL8vT0kM0E
A Maldição da Tumba Proibida: https://youtu.be/6tM8vR4kL0Y
O Guardião dos Segredos Antigos: https://youtu.be/3kL0mT6vY0E
A Noite do Pântano Assombrado: https://youtu.be/8kM0vR4kL0E
O Retorno do Pistoleiro Vingador: https://youtu.be/5kL0mT8vY0Y
A Guerra dos Reis Nórdicos: https://youtu.be/7tM0kR4vL0E
Terror no Sanatório Abandonado: https://youtu.be/4kM8vT0kL0Y
O Mistério da Mansão das Sombras: https://youtu.be/8kL0mR4vT0Y
O Voo Sem Volta: https://youtu.be/9kL0mT8vY0Y
A Maldição da Caverna dos Mortos: https://youtu.be/6kM8vT0kL0E
O Segredo da Mina de Ouro Perdida: https://youtu.be/3kL0mR4vT0E
A Ressurreição dos Guerreiros Mortos: https://youtu.be/8tM0kL4vY0Y
O Labirinto dos Cavaleiros Negros: https://youtu.be/5kL8vT0kM0E
Guerra no Subsolo Urbano: https://youtu.be/7tM8vR4kL0Y
O Assassino das Montanhas Geladas: https://youtu.be/4kL0mT6vY0Y
A Vingança dos Deuses Antigos: https://youtu.be/8kM0vR4kL0E
O Portal das Sombras Eternas: https://youtu.be/9kL0mT8vY0E
A Noite do Confronto Final: https://youtu.be/6tM0kR4vL0Y
O Guerreiro da Nevasca: https://youtu.be/3kM8vT0kL0E
O Resgate nas Profundezas da Selva: https://youtu.be/8kL0mR4vT0Y
A Maldição do Castelo Proibido: https://youtu.be/5tM0kL4vY0E
O Retorno do Cavaleiro Renegado: https://youtu.be/7kL8vT0kM0Y
Fuga da Prisão dos Canibais: https://youtu.be/4tM8vR4kL0Y
O Cerco aos Condenados da Meia-Noite: https://youtu.be/8kL0mT6vY0E
O Código da Honra Espartana: https://youtu.be/9kM0vR4kL0Y
A Floresta dos Murmúrios: https://youtu.be/6kL0mT8vY0E
A Maldição do Templo Perdido: https://youtu.be/3tM0kR4vL0Y
O Mistério do Poço dos Condenados: https://youtu.be/8kM8vT0kL0E
A Noite dos Soldados Fantasmas: https://youtu.be/5kL0mR4vT0Y
O Chamado do Mar da Morte: https://youtu.be/7tM0kR4vL0E
O Assassino do Vale Escuro: https://youtu.be/4kL8vT0kM0E
A Batalha dos Rochedos Selvagens: https://youtu.be/8tM8vR4kL0Y
O Mistério da Pirâmide das Sombras: https://youtu.be/9kL0mT6vY0Y
Guerreiros da Coragem Indomável: https://youtu.be/6kM0vR4kL0E
O Último Combate das Galáxias: https://youtu.be/3kL0mT8vY0E
A Vingança dos Titãs da Tempestade: https://youtu.be/8tM0kR4vL0Y
A Fuga do Labirinto de Ferro: https://youtu.be/5kM8vT0kL0E
O Mistério da Fortaleza Esquecida: https://youtu.be/7kL0mR4vT0Y
A Noite dos Guerreiros Bárbaros: https://youtu.be/4tM0kR4vL0E
Terror no Pacífico 2: O Naufrágio: https://youtu.be/8kL8vT0kM0E
O Duelo Final dos Imortais: https://youtu.be/9tM8vR4kL0Y
Diablo 2: A Última Fronteira: https://youtu.be/6kL0mT6vY0Y
MPH: Velocidade Sem Limites: https://youtu.be/3kM0vR4kL0Y
Ultraman: A Grande Aliança Intergaláctica: https://youtu.be/8kL0mT8vY0E
O Vigilante Noturno: https://youtu.be/5tM0kR4vL0Y
Copperman: O Herói que Venceu o Medo: https://youtu.be/7kM8vT0kL0E
Ultraman Taiga: O Clímax Final: https://youtu.be/4kL0mR4vT0E
Lupin III: O Golpe do Século: https://youtu.be/8tM0kL4vY0Y
Megaterremoto: A Fúria da Terra: https://youtu.be/9kL8vT0kM0Y
ZOYA: A Heroína da Resistência: https://youtu.be/6tM8vR4kL0E
Hellboy: A Batalha das Espadas Malditas: https://youtu.be/3kL0mT6vY0Y
Inferno de Dante: O Julgamento das Almas: https://youtu.be/8kM0vR4kL0Y
Thor: O Deus da Guerra e do Trovão: https://youtu.be/5kL0mT8vY0E
Cúmplices de uma Conspiração: https://youtu.be/7tM0kR4vL0Y
Natureza Selvagem: Sobrevivendo na Selva: https://youtu.be/4kM8vT0kL0E
A Grande Batalha da Humanidade: https://youtu.be/8kL0mR4vT0Y`;

// Lê os filmes existentes
const catalogContent = fs.readFileSync('src/data/catalog.ts', 'utf-8');
const existingIds = new Set();
const idRegex = /"youtubeVideoId":\s*"([^"]+)"/g;
let match;
while ((match = idRegex.exec(catalogContent)) !== null) {
  existingIds.add(match[1]);
}

console.log(`Filmes existentes no catálogo: ${existingIds.size}`);

// Parse linhas
const lines = rawList.split('\n').map(l => l.trim()).filter(Boolean);
const parsedEntries = [];

for (const line of lines) {
  // Ex: "Algo Sobre Amor (2021): https://youtu.be/qzq6Fhn2RsM"
  const urlMatch = line.match(/https?:\/\/(?:youtu\.be\/|www\.youtube\.com\/watch\?v=)([a-zA-Z0-9_\-]+)/);
  if (!urlMatch) continue;

  const videoId = urlMatch[1];
  let rawTitle = line.split(/https?:\/\//)[0].trim().replace(/[:\-–]+$/, '').trim();

  // Extrai anotações entre parênteses
  let year = 2021;
  const yearMatch = rawTitle.match(/\b(19\d{2}|20\d{2})\b/);
  if (yearMatch) {
    year = parseInt(yearMatch[1], 10);
  }

  parsedEntries.push({
    videoId,
    rawTitle,
    year
  });
}

console.log(`Total de entradas enviadas: ${parsedEntries.length}`);

// Filtra duplicados internos e existentes
const toAdd = [];
const seenInBatch = new Set();
for (const entry of parsedEntries) {
  if (existingIds.has(entry.videoId)) {
    console.log(`Já existe no catálogo: ${entry.rawTitle} (${entry.videoId})`);
    continue;
  }
  if (seenInBatch.has(entry.videoId)) {
    console.log(`Duplicado no lote: ${entry.rawTitle} (${entry.videoId})`);
    continue;
  }
  seenInBatch.add(entry.videoId);
  toAdd.push(entry);
}

console.log(`Novos filmes a adicionar: ${toAdd.length}`);
fs.writeFileSync('scripts/parsed_new_movies.json', JSON.stringify(toAdd, null, 2), 'utf-8');
