#!/usr/bin/env node
/* =====================================================================================
   Daqui — cria img/produtos/lista.json com todos os ícones (.svg) da pasta img/produtos.
   O site e a app usam esta lista para mostrar os ícones que se podem escolher para um produto.
   Corra na pasta do site, sempre que acrescentar ícones:   node ferramentas/listar-icones.js
   (No site publicado no GitHub Pages os ícones novos aparecem mesmo sem correr isto; na app, o
   "npm run atualizar" da pasta daqui-android também cria a lista.)
   ===================================================================================== */
const fs = require('fs');
const path = require('path');
function listarIcones(pasta) {
  return fs.readdirSync(pasta).filter(f => /\.svg$/i.test(f)).sort().map(f => {
    const txt = fs.readFileSync(path.join(pasta, f), 'utf8').slice(0, 400);
    const m = /ícone de ([^.<]+)\./i.exec(txt);           // <!-- Daqui: ícone de Pêssego paraguaio. …
    return { f: f.replace(/\.svg$/i, ''), n: m ? m[1].trim() : '' };
  });
}
if (require.main === module) {
  const pasta = path.resolve(process.argv[2] || path.join(__dirname, '..', 'img', 'produtos'));
  const lista = listarIcones(pasta);
  fs.writeFileSync(path.join(pasta, 'lista.json'), JSON.stringify(lista, null, 1) + '\n');
  console.log(`  ✓ ${lista.length} ícones em ${path.join(pasta, 'lista.json')}`);
}
module.exports = { listarIcones };
