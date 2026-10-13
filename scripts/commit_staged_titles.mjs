import fs from 'fs';
import path from 'path';

const stagedPath = path.resolve('scripts/full_expansion_candidates.json');
const catalogPath = path.resolve('src/data/catalog.ts');

if (!fs.existsSync(stagedPath)) {
  console.error('Arquivo de expansão não encontrado:', stagedPath);
  process.exit(1);
}

const stagedMovies = JSON.parse(fs.readFileSync(stagedPath, 'utf-8'));
let catalogSource = fs.readFileSync(catalogPath, 'utf-8');

// Verifica duplicatas estritas
const existingIds = new Set();
const idMatches = catalogSource.matchAll(/"youtubeVideoId":\s*"([^"]+)"/g);
for (const match of idMatches) {
  existingIds.add(match[1]);
}

const toAdd = stagedMovies.filter(m => !existingIds.has(m.youtubeVideoId));
console.log(`Títulos no pacote de expansão: ${stagedMovies.length}. Inéditos a adicionar: ${toAdd.length}.`);

if (toAdd.length === 0) {
  console.log('Nenhum título inédito a adicionar.');
  process.exit(0);
}

// Localiza o fechamento do array INITIAL_CATALOG
const lastBracketIndex = catalogSource.lastIndexOf('];');
if (lastBracketIndex === -1) {
  console.error('Não foi possível localizar o final do array INITIAL_CATALOG em catalog.ts');
  process.exit(1);
}

const prefix = catalogSource.slice(0, lastBracketIndex).trimEnd();
const needsComma = !prefix.endsWith(',');

const formattedMovies = toAdd
  .map(m => '  ' + JSON.stringify(m, null, 2).replace(/\n/g, '\n  '))
  .join(',\n');

const newCatalogSource = `${prefix}${needsComma ? ',' : ''}\n${formattedMovies}\n];\n`;

fs.writeFileSync(catalogPath, newCatalogSource, 'utf-8');
console.log(`\n🎉 SUCESSO! ${toAdd.length} novos títulos de filmes e séries foram adicionados ao catálogo oficial da CAIC (${catalogPath})!`);
