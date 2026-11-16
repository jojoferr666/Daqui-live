#!/usr/bin/env node
/* Desenha os ícones dos produtos a partir dos desenhos em js/art.js (objeto ART).
   Corra a partir da pasta do site:
     node ferramentas/exportar-icones.js            cria só os ícones que faltam
     node ferramentas/exportar-icones.js --todos    volta a desenhar todos (apaga as suas edições!)
     node ferramentas/exportar-icones.js pimento-amarelo malagueta   só estes produtos
   O desenho usado é o 6.º argumento de prod(...) em js/data.js (ex.: 'pera', 'pimentoAmarelo').
   As caixas (caixa-*.svg) e o _novo.svg não são tocados. */
const fs = require('fs'), path = require('path');
const SITE = path.resolve(__dirname, '..'), OUT = path.join(SITE, 'img', 'produtos');
const src = ['art', 'data'].map(f => fs.readFileSync(path.join(SITE, 'js', f + '.js'), 'utf8')).join('\n');
const { ART, PRODUCTS } = new Function('document', src + '\nreturn { ART, PRODUCTS };')({ body: { dataset: {} } });

const args = process.argv.slice(2), all = args.includes('--todos'), only = args.filter(a => !a.startsWith('--'));
let made = 0, skipped = 0;
for (const p of PRODUCTS) {
  if (p.cat === 'caixas' || (only.length && !only.includes(p.id))) continue;
  const file = path.join(OUT, p.id + '.svg');
  if (fs.existsSync(file) && !all && !only.length) { skipped++; continue; }
  if (!ART[p.art]) { console.log(`Sem desenho "${p.art}" em js/art.js para ${p.id}: fica o ícone atual ou o provisório.`); continue; }
  const name = p.name.pt.replace(/--/g, '-');
  fs.writeFileSync(file, `<!-- Daqui: ícone de ${name}. Pode editar este ficheiro ou substituí-lo por outro SVG com o mesmo nome. -->\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">${ART[p.art]}</svg>\n`);
  made++;
}
console.log(`${made} ícones escritos em img/produtos, ${skipped} já existiam.`);
