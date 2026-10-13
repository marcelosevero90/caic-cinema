import fs from 'fs';
import path from 'path';

// Permite passar o caminho do arquivo via argumento ou usa o mega pacote por padrão
const defaultFile = 'scripts/mega_expansion_catalog.json';
const argFile = process.argv[2];
const targetBatchPath = path.resolve(argFile || defaultFile);
const catalogPath = path.resolve('src/data/catalog.ts');

if (!fs.existsSync(targetBatchPath)) {
  console.error('Arquivo de lote não encontrado:', targetBatchPath);
  process.exit(1);
}

const stagedMovies = JSON.parse(fs.readFileSync(targetBatchPath, 'utf-8'));
let catalogSource = fs.readFileSync(catalogPath, 'utf-8');

console.log(`Carregando lote de: ${targetBatchPath} (${stagedMovies.length} títulos)...`);

// Verifica duplicatas estritas
const existingIds = new Set();
const idMatches = catalogSource.matchAll(/"youtubeVideoId":\s*"([^"]+)"/g);
for (const match of idMatches) {
  existingIds.add(match[1]);
}

const toAdd = stagedMovies.filter(m => !existingIds.has(m.youtubeVideoId));
console.log(`Títulos no catálogo atual: ${existingIds.size}. Inéditos a adicionar: ${toAdd.length}.`);

if (toAdd.length === 0) {
  console.log('Nenhum título inédito a adicionar.');
  process.exit(0);
}

// Localiza o fechamento do último lote de filmes antes do export final
const exportIndex = catalogSource.indexOf('export const INITIAL_CATALOG');
let targetCloseIndex = exportIndex !== -1 ? catalogSource.lastIndexOf('];', exportIndex) : catalogSource.lastIndexOf('];');

if (targetCloseIndex === -1) {
  console.error('Não foi possível localizar o ponto de inserção no catálogo em catalog.ts');
  process.exit(1);
}

const prefix = catalogSource.slice(0, targetCloseIndex).trimEnd();
const suffix = catalogSource.slice(targetCloseIndex);
const needsComma = !prefix.endsWith(',');

const formattedMovies = toAdd
  .map(m => {
    const movieWithStatus = {
      ...m,
      status: m.status || 'active',
      isActive: m.isActive !== undefined ? m.isActive : true
    };
    return '  ' + JSON.stringify(movieWithStatus, null, 2).replace(/\n/g, '\n  ');
  })
  .join(',\n');

const newCatalogSource = `${prefix}${needsComma ? ',' : ''}\n${formattedMovies}\n];\n`;

fs.writeFileSync(catalogPath, newCatalogSource, 'utf-8');
console.log(`\n🎉 SUCESSO! ${toAdd.length} novos títulos de filmes e séries foram adicionados ao catálogo oficial da CAIC (${catalogPath})!`);
console.log(`Novo total de títulos no catálogo: ${existingIds.size + toAdd.length}.`);
