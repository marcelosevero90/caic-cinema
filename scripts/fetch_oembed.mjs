import fs from 'fs';

const rawList = [
  { rawTitle: "Chico Xavier O Filme", url: "https://youtu.be/BXbOYxZLNbk" },
  { rawTitle: "RedBad - A Invasão dos Francos", url: "https://youtu.be/Ml5F9hxkxQc" },
  { rawTitle: "Vamps - A Morte Não Existe para o Amor", url: "https://youtu.be/S2_sUT9pVoo" },
  { rawTitle: "Sobreviventes", url: "https://youtu.be/nN6J9agXgls" },
  { rawTitle: "Queda Mortal (2013)", url: "https://youtu.be/SFvyR4KzyNc" },
  { rawTitle: "O Massacre", url: "https://youtu.be/bHWHQQbeCsA" },
  { rawTitle: "Um Papai Noel Em Apuros", url: "https://youtu.be/gihd4osx7UE" },
  { rawTitle: "Lobo Guerreiro 2", url: "https://youtu.be/u_iBMAWrvXs" },
  { rawTitle: "A Hora do Acerto (Jackie Chan)", url: "https://youtu.be/DKM-2QPYROA" },
  { rawTitle: "Crônicas da Tribo Fantasma", url: "https://youtu.be/ksrgx_YfLOo" },
  { rawTitle: "Trafficked (2017)", url: "https://youtu.be/7CtJFEL-zJc" },
  { rawTitle: "Uma Amizade Verdadeira", url: "https://youtu.be/I4AAGQfxocE" },
  { rawTitle: "Os Sobreviventes", url: "https://youtu.be/K_gNseIAmpo" },
  { rawTitle: "Congelado", url: "https://youtu.be/NaCgFZviCuU" },
  { rawTitle: "Príncipe de Ferro", url: "https://youtu.be/JHvfiOofHno" },
  { rawTitle: "Sobrevivendo Às Festas Com Os Parentes", url: "https://youtu.be/1KDJkXNeVG8" },
  { rawTitle: "Invasores - Nenhum Sistema Está Salvo", url: "https://youtu.be/-ovLuuBiwY8" },
  { rawTitle: "Código da Máfia", url: "https://youtu.be/K-omv5HNdkE" },
  { rawTitle: "Hacker - Todo Crime tem um Início", url: "https://youtu.be/OGGhF5_j2l8" },
  { rawTitle: "Arlo - O Porquinho Travesso", url: "https://youtu.be/hmgTvsfCg98" },
  { rawTitle: "Halloween - A Lenda de Jack", url: "https://youtu.be/VmMoC0VDvVE" },
  { rawTitle: "Davi e Golias", url: "https://youtu.be/5NEeduD4O24" },
  { rawTitle: "Um Punhado de Chumbo", url: "https://youtu.be/4ul1Aj2rYy4" },
  { rawTitle: "O Anel do Rei - A Última Batalha", url: "https://youtu.be/7cFWzdihDKU" },
  { rawTitle: "Santos ou Soldados: Missão Berlim", url: "https://youtu.be/tvqe5pWG4uY" },
  { rawTitle: "Ragnarok", url: "https://youtu.be/2J3CHLSYkiE" },
  { rawTitle: "Santa Barbara", url: "https://youtu.be/U9Bcqbun3fc" },
  { rawTitle: "Mega Shark vs Crocosaurus", url: "https://youtu.be/WPsNVUUkYF0" },
  { rawTitle: "A Sereia Assassina (2014)", url: "https://youtu.be/FoCGZomnghY" },
  { rawTitle: "Halloween 2", url: "https://youtu.be/oCYhEg1zaSs" },
  { rawTitle: "Um Pedido de Natal", url: "https://youtu.be/PiWXZT1XC7Q" },
  { rawTitle: "A Era dos Dragões", url: "https://youtu.be/c0hSkMKdUeo" },
  { rawTitle: "Hitman - O Rei dos Assassinos (Jet Li)", url: "https://youtu.be/tLQyWu6P5WY" },
  { rawTitle: "Código 60 (2011)", url: "https://youtu.be/P8sKi3RM1ac" },
  { rawTitle: "O Pequeno Gângster", url: "https://youtu.be/Pz38iUKS4go" },
  { rawTitle: "O Caçador de Dragões", url: "https://youtu.be/JFNgu8GGKmY" },
  { rawTitle: "Bodyguard: Resgate de Risco (2016)", url: "https://youtu.be/LYvYWW-6660" },
  { rawTitle: "Clara e Francisco - Parte 1", url: "https://youtu.be/1bCKpZbQ45w" },
  { rawTitle: "Enviado do Céu", url: "https://youtu.be/m8fdM7mbUdI" },
  { rawTitle: "Saga: A Maldição das Sombras (2013)", url: "https://youtu.be/xiridcp_6FU" },
  { rawTitle: "Street Racer (2008)", url: "https://youtu.be/lnxyUyleckM" },
  { rawTitle: "Vulcão: O Apocalipse", url: "https://youtu.be/KKloY69644A" },
  { rawTitle: "Em Busca da Carta Proibida", url: "https://youtu.be/TXnCpe0Txec" },
  { rawTitle: "Megalodon", url: "https://youtu.be/oMjc-3OiU-E" },
  { rawTitle: "O Preço da Sedução (2020)", url: "https://youtu.be/0yyBlq9GnjM" },
  { rawTitle: "As Aventuras de Petey e Seus Amigos", url: "https://youtu.be/TAOyUg-iSvU" },
  { rawTitle: "2012: O Ano da Profecia", url: "https://youtu.be/iqBgKBpbsZI" },
  { rawTitle: "O Senhor dos Mares", url: "https://youtu.be/JE7DVgtzPvo" },
  { rawTitle: "Rampage 2: A Punição", url: "https://youtu.be/OAkRO7x31v8" },
  { rawTitle: "Três Ladrões e um Bebê (2006)", url: "https://youtu.be/Snzj_eqQJG0" },
  { rawTitle: "Um Amor do Passado", url: "https://youtu.be/dPNGC1L-bMo" },
  { rawTitle: "Assassinos de Aluguel (2013)", url: "https://youtu.be/QaJ21eKY71U" },
  { rawTitle: "Hospedagem Mortal", url: "https://youtu.be/DzPh6z-TwHk" },
  { rawTitle: "Safari: Predadores Mortais (2013)", url: "https://youtu.be/gl4_Wqro85Q" },
  { rawTitle: "A Batalha das Ardenas", url: "https://youtu.be/81UmA2Q06HU" },
  { rawTitle: "Inferno na Ilha", url: "https://youtu.be/vG6MRuRI05U" },
  { rawTitle: "O Último Homem", url: "https://youtu.be/kBLkn9oAh00" },
  { rawTitle: "Apocalipse Zumbi", url: "https://youtu.be/hLNg8hF-j-I" },
  { rawTitle: "Mega Shark vs Colosso", url: "https://youtu.be/HI8JljtZ6VE" },
  { rawTitle: "O Som da Alma", url: "https://youtu.be/vi8rzI9azN4" },
  { rawTitle: "Um Novo Recomeço", url: "https://youtu.be/WLlUFDnu3J4" },
  { rawTitle: "Um Verão Inesquecível", url: "https://youtu.be/zOlor2d4FxM" },
  { rawTitle: "Aterro Maldito", url: "https://youtu.be/xjCSAs-Hp80" },
  { rawTitle: "Não Adianta Rezar", url: "https://youtu.be/zpAfxdrrAt0" },
  { rawTitle: "O Vigilante Mascarado", url: "https://youtu.be/L3yP5zi3SHU" },
  { rawTitle: "O Grito da Morte", url: "https://youtu.be/87WOy99X_Ic" },
  { rawTitle: "Meu Cão da Guarda", url: "https://youtu.be/pMVYsbldRao" },
  { rawTitle: "O Garoto Formiga 3 (2016)", url: "https://youtu.be/KSuxp71TXks" },
  { rawTitle: "Deixados Para Trás - O Filme", url: "https://youtu.be/GfOklH5PwaE" },
  { rawTitle: "A Fuga (1994)", url: "https://youtu.be/TgMuCz43WOY" },
  { rawTitle: "100 Milhões Antes de Cristo (2008)", url: "https://youtu.be/tfHlpA3dzEo" },
  { rawTitle: "Sem Retorno (2020)", url: "https://youtu.be/Qx8itZO6Vb8" },
  { rawTitle: "Em Busca do Paraíso", url: "https://youtu.be/jCrXzE0l2AA" },
  { rawTitle: "Clara e Francisco - Parte 2", url: "https://youtu.be/77RulHUBYnI" },
  { rawTitle: "O Tesouro Perdido (2020)", url: "https://youtu.be/jF0E7chY7PU" },
  { rawTitle: "Quebrando Correntes (2021)", url: "https://youtu.be/OEFVeYr1G38" },
  { rawTitle: "Padre Pio 1", url: "https://youtu.be/tqHoceU41jY" },
  { rawTitle: "Merlin e a Guerra Dos Dragões", url: "https://youtu.be/2xqTxp1ZUXM" },
  { rawTitle: "Astro Boy", url: "https://youtu.be/WLVfGNixby8" },
  { rawTitle: "Punhos da Vingança", url: "https://youtu.be/b8YXNHEil3I" },
  { rawTitle: "Deixados Para Trás 3 - Mundo em Guerra", url: "https://youtu.be/nW1OiXll_C0" },
  { rawTitle: "O Matador - Missão Resgate (2022)", url: "https://youtu.be/ZBSRGVxHNVg" },
  { rawTitle: "Sobibor: A Revolta que Mudou os Rumos da Humanidade", url: "https://youtu.be/_ZHXyMbIdwo" },
  { rawTitle: "À Beira do Abismo (2024)", url: "https://youtu.be/oZZgoICmRa4" },
  { rawTitle: "Jill e Joy - O Segredo do Orfanato", url: "https://youtu.be/XN5prS32hek" },
  { rawTitle: "Um Acampamento do Barulho", url: "https://youtu.be/cPf9nUf9ctE" },
  { rawTitle: "As Aventuras De Uma Super Professora", url: "https://youtu.be/UM8Wa0rLo9M" },
  { rawTitle: "O Segredo da Floresta", url: "https://youtu.be/TPtzhf5VaP0" },
  { rawTitle: "Limbo: Entre o Céu e Inferno", url: "https://youtu.be/T-4JVBN30Ts" },
  { rawTitle: "Viagem ao Centro da Terra (2008)", url: "https://youtu.be/RM71h8J1kj4" },
  { rawTitle: "Mega Pítons vs Jacarés Gigantes", url: "https://youtu.be/z1W1993nBB8" },
  { rawTitle: "A Contaminação", url: "https://youtu.be/UsXYF4gTfIM" },
  { rawTitle: "Marcado Pela Fé", url: "https://youtu.be/XZvTqxmy67A" },
  { rawTitle: "O Clã das Adagas", url: "https://youtu.be/Jbm8azD3Y6I" },
  { rawTitle: "Vingador (2010)", url: "https://youtu.be/NXxyzypvzI0" },
  { rawTitle: "KV1: Almas de Ferro", url: "https://youtu.be/OJkZ-WQ0lRE" },
  { rawTitle: "O Horror Entre Nós", url: "https://youtu.be/H6xio03z7_w" },
  { rawTitle: "Espião por Acaso (2016)", url: "https://youtu.be/O_2CRM-hEdU" },
  { rawTitle: "Príncipe de Ferro (A Batalha)", url: "https://youtu.be/yPvJJYNPwR4" },
  { rawTitle: "O Último Desafio", url: "https://youtu.be/-hCg_Suw470" }
];

async function main() {
  console.log(`Buscando metadados de ${rawList.length} vídeos no YouTube oEmbed...`);
  const results = [];

  for (let i = 0; i < rawList.length; i += 5) {
    const batch = rawList.slice(i, i + 5);
    await Promise.all(
      batch.map(async (item) => {
        const videoId = item.url.split('/').pop().trim();
        try {
          const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
          if (res.ok) {
            const data = await res.json();
            results.push({
              rawTitle: item.rawTitle,
              url: item.url,
              videoId,
              ytTitle: data.title || item.rawTitle,
              authorName: data.author_name || 'YouTube',
              thumbnailUrl: data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
            });
          } else {
            results.push({
              rawTitle: item.rawTitle,
              url: item.url,
              videoId,
              ytTitle: item.rawTitle,
              authorName: 'YouTube',
              thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
            });
          }
        } catch (e) {
          results.push({
            rawTitle: item.rawTitle,
            url: item.url,
            videoId,
            ytTitle: item.rawTitle,
            authorName: 'YouTube',
            thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
          });
        }
      })
    );
    process.stdout.write(`Processados ${Math.min(i + 5, rawList.length)}/${rawList.length}\r`);
  }

  fs.writeFileSync('scripts/oembed_results.json', JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\nSalvo em scripts/oembed_results.json com sucesso! Total: ${results.length}`);
}

main();
