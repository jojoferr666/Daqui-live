/* ===== Daqui — app para telemóvel (web app em /app e app Android) =====
   Usa os mesmos dados e funções do site (data.js, nuvem.js, auth.js, app.js e as páginas) com outro aspeto:
   uma página única com ecrãs (#/inicio, #/loja, #/produto/kiwi…), barra de separadores em baixo e o cabaz num botão.

   Como está organizada
   - href() passa a devolver endereços da app (#/…): os links das páginas do site levam aos ecrãs certos.
   - render() passa a ser appRender(): desenha o ecrã do endereço atual.
   - Ecrãs próprios da app: boas-vindas, início, loja, produto, mapa, conta, encomenda (com "deslizar para confirmar"),
     incidência (com câmara) e os separadores de agricultor, restaurante e gestão.
   - Ecrãs que reaproveitam páginas do site (com o aspeto da app): entrar, finalizar, subscrever, caixas, Colhe Connosco,
     agricultor, sobre, FAQ, políticas, contacto, secções da conta, área de parceiro e painel de gestão. */

const INTRO_KEY = 'daqui-app-boas-vindas';
const PICKUP_COORDS = { 'Armazém Daqui, Vagos': [40.5545, -8.6826], 'Aveiro, Rossio': [40.6424, -8.6553], 'Ílhavo': [40.6003, -8.6667], 'Oliveira do Bairro': [40.5146, -8.4937], 'Mira': [40.4286, -8.7373], 'Águeda': [40.5747, -8.4448] };
const AVEIRO = { lat: 40.6405, lon: -8.6538 };
let appPos = store.get('daqui-app-posicao', null);   // { lat, lon } da última vez que deu a localização
let lojaCat = 'tudo', lojaQ = '', mapaV = 'recolha', introStep = 0, detQty = 1, detSize = '', incPhoto = null, incPhotoUrl = '';

/* ---------- endereços: caminhos do site → ecrãs da app ---------- */
href = function (path = '', query = '') {
  const qs = new URLSearchParams(query), parts = String(path).split('/').filter(Boolean), [a, b] = parts;
  let r;
  if (!a) r = 'inicio';
  else if (a === 'produtos') { const id = b || qs.get('id'); qs.delete('id'); r = id ? 'produto/' + id : 'loja'; }
  else if (a === 'subscricao') r = b ? 'subscrever/' + b : 'caixas';
  else if (a === 'agricultores') { const id = b || qs.get('id'); qs.delete('id'); if (id) r = 'agricultor/' + id; else { r = 'mapa'; qs.set('v', 'quintas'); } }
  else if (a === 'restaurantes') { r = 'mapa'; qs.set('v', 'restaurantes'); }
  else if (a === 'colhe-connosco') r = 'colhe';
  else if (a === 'conta') { if (qs.get('tab')) { r = 'g/' + qs.get('tab'); qs.delete('tab'); } else { const s = qs.get('sec'); qs.delete('sec'); r = s ? 'conta/' + s : 'conta'; } }
  else if (a === 'parceiro') r = roleHome();
  else if (a === 'finalizar') { const n = qs.get('encomenda'); if (n) { qs.delete('encomenda'); qs.set('nova', '1'); r = 'encomenda/' + n; } else r = 'finalizar'; }
  else if (a === 'contacto' && qs.get('encomenda')) { r = 'encomenda/' + qs.get('encomenda'); qs.delete('encomenda'); }
  else if (a === 'entrar') r = 'entrar';
  else r = 'info/' + a;
  const s = qs.toString();
  return '#/' + r + (s ? '?' + s : '');
};
const appHash = () => { const h = location.hash.replace(/^#\/?/, ''), i = h.indexOf('?'); return { path: i < 0 ? h : h.slice(0, i), query: new URLSearchParams(i < 0 ? '' : h.slice(i + 1)) }; };
const roleOf = (u = currentUser()) => (!u ? 'cliente' : u.role === 'admin' ? 'admin' : u.partner && u.role === 'agricultor' ? 'agricultor' : u.partner && u.role === 'restaurante' ? 'restaurante' : 'cliente');
const roleHome = (u = currentUser()) => ({ cliente: 'inicio', agricultor: 'p/produtos', restaurante: 'r/perfil', admin: 'g/pedidos' }[roleOf(u)]);
const TABS = () => ({
  cliente: [['inicio', 'home', T('Início', 'Home')], ['loja', 'basket', T('Loja', 'Shop')], ['mapa', 'map', T('Mapa', 'Map')], ['conta', 'user', T('Conta', 'Account')]],
  agricultor: [['p/produtos', 'leaf', T('Produtos', 'Produce')], ['p/colhe', 'sprout', T('Colhe', 'Harvest')], ['p/propostas', 'inbox', T('Propostas', 'Proposals')], ['p/conta', 'user', T('Conta', 'Account')]],
  restaurante: [['r/perfil', 'utensils', T('Perfil', 'Profile')], ['r/pratos', 'list', T('Pratos', 'Dishes')], ['loja', 'basket', T('Loja', 'Shop')], ['r/conta', 'user', T('Conta', 'Account')]],
  admin: [['g/pedidos', 'inbox', T('Pedidos', 'Requests')], ['g/encomendas', 'box', T('Encomendas', 'Orders')], ['g/catalogo', 'leaf', T('Catálogo', 'Catalogue')], ['g/mais', 'menu', T('Mais', 'More')]]
});
function activeTab(path, role) {
  const tabs = TABS()[role].map(t => t[0]), first = path.split('/')[0];
  if (tabs.includes(path)) return path;
  if (/^(produto|caixas|subscrever|finalizar)/.test(path)) return tabs.includes('loja') ? 'loja' : '';
  if (/^(agricultor|colhe)/.test(path) && role === 'cliente') return path.startsWith('colhe') ? 'inicio' : 'mapa';
  if (first === 'g') return 'g/mais';
  return tabs.find(t => t.endsWith('conta')) || '';
}
/* histórico dentro da app: para o botão "voltar" (da app e do Android) */
const appStack = [location.hash];
let appReplacing = false;
const appReplace = h => { appReplacing = true; location.replace(h); };
const isTabRoot = () => { const p = appHash().path; return Object.values(TABS()).some(l => l.some(t => t[0] === p)); };
const appCanGoBack = () => appStack.length > 1 && !isTabRoot();
/* devolve false quando já está no início do seu tipo de conta (o Android fecha então a app) */
function appBack() {
  if (appCanGoBack()) { history.back(); return true; }
  const home = '#/' + roleHome(); if (location.hash !== home) { location.hash = home; return true; }
  return false;
}

/* ---------- utilitários ---------- */
function distKm(a, b) { const R = 6371, r = x => x * Math.PI / 180, dLa = r(b.lat - a.lat), dLo = r(b.lon - a.lon); const h = Math.sin(dLa / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); }
const fmtKm = km => (km < 1 ? `${Math.round(km * 1000)} m` : `${km < 10 ? km.toFixed(1).replace('.', lang === 'en' ? '.' : ',') : Math.round(km)} km`);
const here = () => appPos || AVEIRO;
function pickupList() { return PICKUP_POINTS.map(n => { const c = PICKUP_COORDS[n] || [AVEIRO.lat, AVEIRO.lon]; return { name: n, lat: c[0], lon: c[1], km: distKm(here(), { lat: c[0], lon: c[1] }) }; }).sort((a, b) => a.km - b.km); }
function restList() { return RESTAURANTS.map(r => Object.assign({ km: distKm(here(), r) }, r)).sort((a, b) => a.km - b.km); }
function farmList() { return FARMERS.map(f => Object.assign({ km: distKm(here(), f) }, f)).sort((a, b) => a.km - b.km); }
function askPosition() {
  NATIVO.position().then(p => { appPos = p; store.set('daqui-app-posicao', p); toast(T('Localização atualizada', 'Location updated')); rerenderKeep(); },
    () => toast(T('Sem acesso à localização: usamos o centro de Aveiro.', 'No location access: using Aveiro city centre.')));
}
const greeting = () => { const h = new Date().getHours(); return h < 13 ? T('Bom dia', 'Good morning') : h < 20 ? T('Boa tarde', 'Good afternoon') : T('Boa noite', 'Good evening'); };
const myOrders = u => ORDERS.filter(o => (u ? o.user === u.username : !o.user)).sort((a, b) => String(b.created).localeCompare(String(a.created)));
const pickupHours = day => (DISTRIBUTION.days[day] || {}).pickup || '';
const canSwipe = o => o.deliver === 'pickup' && o.status !== 'cancelada' && orderStage(o) === 2;
const sec = (title, body, extra = '') => `<section class="a-sec"><div class="a-sec-h"><h2>${title}</h2>${extra}</div>${body}</section>`;

/* ---------- cartões ---------- */
function prodCard(p) {
  const on = inSeason(p), box = p.cat === 'caixas', f = p.farmer ? F(p.farmer) : null;
  const action = box ? `<a class="a-add" href="${productHref(p)}" aria-label="${T('Escolher tamanho', 'Choose size')}: ${esc(L(p.name))}">${icon('chevR', 20)}</a>`
    : available(p) ? `<button class="a-add" data-add="${p.id}" aria-label="${T('Adicionar ao cabaz', 'Add to basket')}: ${esc(L(p.name))}">${icon('plus', 20)}</button>`
    : `<button class="a-add off" data-notify="${p.id}" aria-pressed="${notifyOn(p.id)}" aria-label="${T('Avisar-me', 'Notify me')}: ${esc(L(p.name))}">${icon('bell', 18)}</button>`;
  return `<article class="a-card${on && !p.outOfStock ? '' : ' is-off'}">
    <a class="a-card-img${box ? ' box' : ''}" href="${productHref(p)}">${artFor(p)}${!on ? `<span class="a-flag">${T('Volta em', 'Back in')} ${monthName(p.season[0], 'short')}</span>` : p.outOfStock ? `<span class="a-flag">${T('Esgotado', 'Sold out')}</span>` : p.organic ? `<span class="a-flag bio">${T('Bio', 'Organic')}</span>` : ''}</a>
    ${favBtn(p.id)}
    <a class="a-card-body" href="${productHref(p)}"><b>${esc(L(p.name))}</b><span class="muted">${box ? `${p.kg} kg, ${T('vários agricultores', 'several farmers')}` : f ? esc(f.place) : ''}</span>
      <span class="a-price">${box ? T('desde', 'from') + ' ' : ''}${money(p.price)}<small>${box ? '' : unitLabel(p.unit)}</small></span></a>${action}</article>`;
}
function boxCard(b) {
  const next = slotOptions()[0];
  return `<a class="a-box" href="${productHref(b)}"><span class="a-box-art">${crateSVG(b.box || 'mista')}</span>
    <span class="a-box-body"><b>${esc(L(b.name))}</b><span class="muted small">${esc(L(b.desc)).slice(0, 90)}${L(b.desc).length > 90 ? '…' : ''}</span>
    <span class="a-box-foot"><span class="a-price">${T('desde', 'from')} ${money(b.price)}</span>${next ? `<span class="a-chip">${icon('calendar', 14)}${slotLabel(next.date)}</span>` : ''}</span></span></a>`;
}
function orderMini(o) {
  const st = orderStage(o);
  return `<a class="a-order" href="#/encomenda/${o.num}"><span class="a-order-ic">${icon(o.deliver === 'home' ? 'truck' : 'store', 22)}</span>
    <span><b>${o.num}</b><span class="muted small">${slotLabel(o.slot)}${o.deliver === 'pickup' ? `, ${esc(o.point)}` : ''}</span></span>
    <span class="status ${st === 4 ? 'pausada' : st === 3 ? 'ativa' : 'prog'}">${stageName(o)}</span></a>`;
}
function stepsBar(o) { const st = orderStage(o); if (st === 4) return ''; return `<div class="a-steps" aria-hidden="true">${[0, 1, 2, 3].map(i => `<i class="${i <= st ? 'on' : ''}"></i>`).join('')}</div>`; }

/* ---------- ecrãs próprios da app ---------- */
function scrIntro() {
  const slides = [
    { art: farmSVG(0, 'pera'), t: T('Do campo para sua casa', 'From the field to your home'), p: T('Fruta e legumes de agricultores portugueses, colhidos na época e entregues em poucos dias.', 'Fruit and veg from Portuguese farmers, picked in season and delivered within days.') },
    { art: `<div class="a-intro-split">${splitBar({ cat: 'fruta', split: [60, 10, 30] }, false)}<p><b>60%</b> ${T('do preço fica com quem produz', 'of the price goes to the grower')}</p></div>`, t: T('Preço justo, à vista', 'A fair price, in the open'), p: T('Em cada produto vê quanto fica com o agricultor, com a conservação e com a Daqui.', 'On every product you see how much goes to the farmer, to storage and to Daqui.') },
    { art: crateSVG('mista'), t: T('Caixas da Estação', 'Seasonal Boxes'), p: T('Escolha os favoritos e o que não quer receber. Levante num ponto perto de si ou receba em casa.', 'Pick your favourites and what you\'d rather not get. Collect nearby or get it delivered.') }
  ];
  if (introStep === 0) return { title: 'Daqui', bare: true, html: `<div class="a-intro a-intro-lang"><img class="a-intro-logo" src="${LOGO_GOLD}" alt="Daqui">
    <h1>Olá! / Hello!</h1><p>Escolha a língua / Choose your language</p>
    <div class="a-intro-langs"><button class="a-big-btn" data-intro-lang="pt" lang="pt">Português</button><button class="a-big-btn" data-intro-lang="en" lang="en">English</button></div></div>` };
  const s = slides[introStep - 1], last = introStep === slides.length;
  return { title: 'Daqui', bare: true, html: `<div class="a-intro"><button class="a-intro-skip link" data-intro-end>${T('Saltar', 'Skip')}</button>
    <div class="a-intro-art">${s.art}</div><h1>${s.t}</h1><p>${s.p}</p>
    <div class="a-dots" aria-hidden="true">${slides.map((x, i) => `<i class="${i === introStep - 1 ? 'on' : ''}"></i>`).join('')}</div>
    ${last ? `<button class="a-big-btn" data-intro-end>${T('Começar a explorar', 'Start exploring')}</button><button class="a-big-btn ghost" data-intro-end="entrar">${T('Já tenho conta', 'I have an account')}</button>`
      : `<button class="a-big-btn" data-intro-next>${T('Seguinte', 'Next')}</button>`}</div>` };
}

function scrInicio(u) {
  const orders = myOrders(u).filter(o => orderStage(o) < 3), next = orders.sort((a, b) => a.slot.localeCompare(b.slot))[0];
  const subs = u ? (u.subs || []).filter(s => s.status === 'ativa') : [];
  const days = next ? Math.max(0, Math.round((parseISO(next.slot) - today()) / 864e5)) : null;
  const nextCard = next ? `<a class="a-next" href="#/encomenda/${next.num}">
      <span class="a-next-top"><span class="muted small">${T('Próxima entrega', 'Next delivery')}</span><span class="status prog">${stageName(next)}</span></span>
      <b class="a-next-day">${days === 0 ? T('Hoje', 'Today') : days === 1 ? T('Amanhã', 'Tomorrow') : T(`Daqui a ${days} dias`, `In ${days} days`)}, ${slotLabel(next.slot)}</b>
      <span class="small">${next.num}, ${next.deliver === 'pickup' ? `${T('levantamento em', 'collect at')} ${esc(next.point)} (${pickupHours(next.day)})` : `${T('entrega em casa', 'home delivery')}${next.window ? ', ' + next.window : ''}`}</span>
      ${stepsBar(next)}${canSwipe(next) ? `<span class="a-next-cta">${T('Já está pronta: deslize para confirmar no ponto de recolha', 'Ready now: swipe to confirm at the collection point')} ${icon('chevR', 16)}</span>` : ''}</a>`
    : subs.length ? `<a class="a-next" href="${href('conta', 'sec=subscricoes')}"><span class="a-next-top"><span class="muted small">${T('A sua subscrição', 'Your subscription')}</span><span class="status ativa">${T('Ativa', 'Active')}</span></span>
      <b class="a-next-day">${esc(L(P(subs[0].box).name))}</b><span class="small">${T('Próxima entrega', 'Next delivery')}: ${slotLabel(nextDelivery(subs[0]))}</span></a>`
    : `<div class="a-next empty"><b class="a-next-day">${T('A primeira caixa é a mais fácil', 'Your first box is the easiest')}</b><span class="small">${T('Escolha uma Caixa da Estação e levante-a num ponto perto de si.', 'Pick a Seasonal Box and collect it near you.')}</span><a class="btn btn-green btn-sm mt-s" href="#/caixas">${T('Ver caixas', 'See boxes')}</a></div>`;
  const boxes = PRODUCTS.filter(p => p.cat === 'caixas');
  const near = pickupList().slice(0, 2), rests = restList().slice(0, 2);
  const favs = u ? (u.favs || []).map(P).filter(p => p && available(p)) : [];
  const season = favs.length ? favs : PRODUCTS.filter(p => p.cat !== 'caixas' && p.essential && available(p)).slice(0, 8);
  return { title: T('Início', 'Home'), hero: true, html: `
    <header class="a-hero"><div class="a-hero-in"><img src="${LOGO_GOLD}" alt="Daqui" class="a-hero-logo"><div class="a-hero-actions">${langToggle()}</div></div>
      <h1>${greeting()}${u ? ', ' + esc(u.name.split(' ')[0]) : ''}</h1><p>${T('Fruta e legumes da época, do campo para si.', 'Seasonal fruit and veg, from the field to you.')}</p></header>
    <div class="a-pad a-next-wrap">${nextCard}</div>
    ${sec(T('Caixas da semana', 'This week\'s boxes'), `<div class="a-rail">${boxes.map(boxCard).join('')}</div>`, `<a class="link small" href="#/caixas">${T('Subscrever', 'Subscribe')}</a>`)}
    ${sec(T('Perto de si', 'Near you'), `<div class="a-list">${near.map(p => `<a class="a-row" href="#/mapa?v=recolha"><span class="a-row-ic">${icon('store', 20)}</span><span><b>${esc(p.name)}</b><span class="muted small">${T('Ponto de recolha', 'Collection point')}, ${T('qui.', 'Thu')} ${pickupHours('qui')}, ${T('sáb.', 'Sat')} ${pickupHours('sab')}</span></span><span class="a-km">${fmtKm(p.km)}</span></a>`).join('')}
      ${rests.map(r => `<a class="a-row" href="#/mapa?v=restaurantes"><span class="a-row-ic gold">${icon('utensils', 20)}</span><span><b>${esc(r.name)}</b><span class="muted small">${esc(L(r.dish))}</span></span><span class="a-km">${fmtKm(r.km)}</span></a>`).join('')}</div>
      ${appPos ? '' : `<button class="a-locate" data-app-locate>${icon('locate', 18)}${T('Usar a minha localização', 'Use my location')}</button>`}`, `<a class="link small" href="#/mapa">${T('Mapa', 'Map')}</a>`)}
    ${sec(favs.length ? T('Os seus favoritos na época', 'Your favourites in season') : T('Essenciais da época', 'Seasonal essentials'), `<div class="a-rail small">${season.map(prodCard).join('')}</div>`, `<a class="link small" href="#/loja">${T('Ver loja', 'Shop')}</a>`)}
    ${sec(JTH(), `<a class="a-banner" href="#/colhe"><span>${farmSVG(5, 'diospiro')}</span><span><b>${T('Venha colher connosco', 'Come and pick with us')}</b><span class="small">${HARVEST_DAYS.filter(d => d.date >= iso(today())).length} ${T('dias abertos', 'open days')}</span></span>${icon('chevR', 20)}</a>`)}` };
}

function scrLoja(u) {
  const q = norm(lojaQ.trim());
  const favs = u ? u.favs || [] : [];
  const cats = [['tudo', T('Tudo', 'All')], ['caixas', T('Caixas', 'Boxes')], ['fruta', T('Fruta', 'Fruit')], ['legumes', T('Legumes', 'Veg')], ['bio', T('Biológico', 'Organic')], ['favoritos', T('Favoritos', 'Favourites')]];
  const list = PRODUCTS.filter(p => (lojaCat === 'tudo' || p.cat === lojaCat || (lojaCat === 'bio' && p.organic) || (lojaCat === 'favoritos' && favs.includes(p.id))) && (!q || norm(`${p.name.pt} ${p.name.en} ${p.farmer ? F(p.farmer).place + ' ' + F(p.farmer).name : ''}`).includes(q)))
    .sort((a, b) => (a.cat === 'caixas' ? 0 : available(a) ? 1 : 2) - (b.cat === 'caixas' ? 0 : available(b) ? 1 : 2));
  return { title: T('Loja', 'Shop'), fab: true, html: `
    <div class="a-sticky"><label class="a-search">${icon('search', 20)}<span class="sr">${T('Procurar', 'Search')}</span><input type="search" id="a-q" value="${esc(lojaQ)}" placeholder="${T('Procurar fruta, legumes, quinta…', 'Search fruit, veg, farm…')}" autocomplete="off"></label>
      <div class="a-chips" role="group" aria-label="${T('Categorias', 'Categories')}">${cats.map(([k, n]) => `<button class="a-chip-btn" data-loja-cat="${k}" aria-pressed="${lojaCat === k}">${n}</button>`).join('')}</div></div>
    <div class="a-pad"><p class="muted small mb-s">${list.length} ${T('produtos', 'products')}. ${T('Distribuímos à quinta-feira e ao sábado.', 'We deliver on Thursdays and Saturdays.')}</p>
    ${list.length ? `<div class="a-grid">${list.map(prodCard).join('')}</div>` : `<div class="a-empty">${icon('search', 30)}<p>${lojaCat === 'favoritos' && !u ? T('Entre na sua conta para ver os favoritos.', 'Sign in to see your favourites.') : T('Nada encontrado. Experimente outra palavra.', 'Nothing found. Try another word.')}</p></div>`}</div>` };
}

function scrProduto(id, u) {
  const p = P(id);
  if (!p) return { title: T('Produto', 'Product'), back: true, html: `<div class="a-empty">${icon('leaf', 30)}<p>${T('Este produto já não existe.', 'This product no longer exists.')}</p><a class="btn btn-green" href="#/loja">${T('Ver loja', 'Shop')}</a></div>` };
  const box = p.cat === 'caixas', on = inSeason(p), f = p.farmer ? F(p.farmer) : null, h = harvestOf(p), a = typeof ANALYSES !== 'undefined' ? ANALYSES[p.id] : null;
  const [sa, sb, sc] = splitOf(p), sizes = box ? BOX_SIZES[p.id] : null;
  if (box && !sizes.some(s => s.s === detSize)) detSize = sizes[0].s;
  const unit = box ? sizes.find(s => s.s === detSize).price : p.price, total = unit * detQty;
  const months = Array.from({ length: 12 }, (_, i) => { const m = i + 1, [x, y] = p.season || [1, 12], inS = x <= y ? m >= x && m <= y : m >= x || m <= y; return `<i class="${inS ? 'on' : ''}${m === NOW_M ? ' now' : ''}" title="${monthName(m)}">${monthName(m, 'narrow')}</i>`; }).join('');
  const pool = box ? PRODUCTS.filter(x => x.cat !== 'caixas' && available(x) && (p.id === 'caixa-essencial' ? x.essential : p.id === 'caixa-fruta' ? x.cat === 'fruta' : p.id === 'caixa-legumes' ? x.cat === 'legumes' : true) && !(u && (u.exclude || []).includes(x.id))) : [];
  const sample = p.id === 'caixa-mista' ? pool.filter(x => x.cat === 'fruta').slice(0, 4).concat(pool.filter(x => x.cat === 'legumes').slice(0, 4)) : pool.slice(0, 8);
  return { title: L(p.name), back: true, noBar: true, html: `
    <div class="a-pdp-hero${box ? ' box' : ''}"><button class="a-round" data-app-back aria-label="${T('Voltar', 'Back')}">${icon('chevL', 24)}</button>${favBtn(p.id, true)}${box ? crateSVG(p.box || 'mista') : artFor(p)}</div>
    <div class="a-pdp">
      <h1>${esc(L(p.name))}</h1>
      ${f ? `<a class="a-farm" href="${farmerHref(f)}"><span class="a-farm-art">${farmSVG(f.seed || 0, f.crop || 'pera')}</span><span><b>${esc(f.farm)}</b><span class="muted small">${esc(f.name)}, ${esc(f.place)}</span></span>${icon('chevR', 18)}</a>` : `<p class="muted">${T('Vários agricultores; a composição muda todas as semanas.', 'Several farmers; the selection changes every week.')}</p>`}
      <div class="a-pdp-price"><b>${money(unit)}</b><span>${box ? `${sizes.find(s => s.s === detSize).kg} kg` : unitLabel(p.unit)}</span>${badges(p)}</div>
      ${box ? `<fieldset class="a-sizes"><legend class="lbl">${T('Tamanho', 'Size')}</legend>${sizes.map(s => `<button type="button" data-det-size="${s.s}" aria-pressed="${detSize === s.s}"><b>${sizeName(s.s)}</b><span>${s.kg} kg, ${money(s.price)}</span></button>`).join('')}</fieldset>
        <a class="a-sub-cta" href="#/subscrever/${p.id}?tamanho=${detSize}">${icon('repeat', 20)}<span><b>${T('Receber todas as semanas', 'Get it every week')}</b><span class="small">${T('Subscrição com preço garantido durante 12 meses', 'Subscription with a 12-month price guarantee')}</span></span>${icon('chevR', 18)}</a>` : ''}
      <p class="a-lead">${esc(L(p.desc))}</p>
      ${box && sample.length ? `<h2 class="a-h2">${T('Esta semana pode levar', 'This week it may include')}</h2><div class="a-tags">${sample.map(x => `<span>${esc(L(x.name))}</span>`).join('')}</div>${u ? `<p class="small muted">${T('Respeita os produtos que não quer receber.', 'Respects the products you\'d rather not get.')} <a class="link" href="#/conta/preferencias">${T('Preferências', 'Preferences')}</a></p>` : ''}` : ''}
      ${!box ? `<h2 class="a-h2">${T('Época', 'Season')}</h2><div class="a-months">${months}</div>
        <p class="small muted">${h ? `${T('Colheita', 'Harvested')}: ${fdate(h)}${isStored(p) ? T(', conservada em frio', ', cold-stored') : ''}.` : T(`Fora de época. Volta em ${monthName(p.season[0])}.`, `Out of season. Back in ${monthName(p.season[0])}.`)}</p>` : ''}
      <h2 class="a-h2">${T('Para onde vai o seu dinheiro', 'Where your money goes')}</h2>
      ${splitBar(p, false)}<div class="a-split-cap"><span><i class="k1"></i>${T('Agricultor', 'Farmer')} ${sa}%</span><span><i class="k2"></i>${T('Conservação', 'Storage')} ${sb}%</span><span><i class="k3"></i>Daqui ${sc}%</span></div>
      ${a ? `<details class="a-acc"><summary>${icon('shield', 18)}${T('Análises de laboratório', 'Lab analyses')}</summary><p class="small">${T(`Boletim n.º ${a.n}, de ${fdate(a.date, { day: 'numeric', month: 'long', year: 'numeric' })}: resíduos de pesticidas, metais pesados e açúcar (brix) dentro dos limites.`, `Report no. ${a.n}, ${fdate(a.date, { day: 'numeric', month: 'long', year: 'numeric' })}: pesticide residues, heavy metals and sugar (brix) within limits.`)}</p><a class="link small" href="${R}docs/analises/${p.id}.pdf">${T('Abrir o boletim (PDF)', 'Open the report (PDF)')}</a></details>` : ''}
      <details class="a-acc"><summary>${icon('truck', 18)}${T('Entrega e levantamento', 'Delivery and collection')}</summary><p class="small">${T(`Distribuímos à quinta-feira e ao sábado. Encomendas para quinta-feira até terça às 18h; para sábado até quinta às 18h. Levantamento grátis em ${PICKUP_POINTS.length} pontos ou entrega em casa por ${money(DELIVERY_FEE)}.`, `We deliver on Thursdays and Saturdays. Order by Tuesday 6 pm for Thursday, by Thursday 6 pm for Saturday. Free collection at ${PICKUP_POINTS.length} points or home delivery for ${money(DELIVERY_FEE)}.`)}</p></details>
    </div>
    <div class="a-buy">${available(p) || box ? `<div class="qty"><button data-det-qty="-1" aria-label="${T('Menos um', 'One less')}">${icon('minus', 16)}</button><span aria-live="polite">${detQty}</span><button data-det-qty="1" aria-label="${T('Mais um', 'One more')}">${icon('plus', 16)}</button></div>
      <button class="a-big-btn" data-det-add="${p.id}">${T('Adicionar', 'Add')} · ${money(total)}</button>`
      : `<button class="a-big-btn ghost" data-notify="${p.id}" aria-pressed="${notifyOn(p.id)}">${icon('bell', 18)} ${notifyOn(p.id) ? T('Aviso ativo', 'Reminder on') : on ? T('Esgotado: avisar-me', 'Sold out: notify me') : T('Avisar-me quando voltar', 'Notify me when it\'s back')}</button>`}</div>` };
}

function scrMapa() {
  const views = [['recolha', T('Recolha', 'Collection')], ['restaurantes', T('Restaurantes', 'Restaurants')], ['quintas', T('Quintas', 'Farms')]];
  let body = '';
  if (mapaV === 'recolha') body = `<div class="a-list">${pickupList().map(p => `<div class="a-row"><span class="a-row-ic">${icon('store', 20)}</span><span><b>${esc(p.name)}</b><span class="muted small">${T('Quinta-feira', 'Thursday')} ${pickupHours('qui')}, ${T('sábado', 'Saturday')} ${pickupHours('sab')}</span></span><span class="a-km">${fmtKm(p.km)}</span></div>`).join('')}</div>
    <p class="small muted mt-s">${T('Escolhe o ponto de recolha ao finalizar a encomenda ou na subscrição.', 'You choose the collection point at checkout or in your subscription.')}</p>`;
  if (mapaV === 'restaurantes') body = `<div class="a-map">${aveiroMapSVG(RESTAURANTS, lang, '')}</div><div class="a-list">${restList().map(r => `<div class="a-row" id="${r.id}" tabindex="-1"><span class="a-row-ic gold">${icon('utensils', 20)}</span><span><b>${esc(r.name)}</b><span class="muted small">${esc(L(r.kind))}. ${esc(L(r.dish))}</span></span><span class="a-km">${fmtKm(r.km)}</span></div>`).join('')}</div>`;
  if (mapaV === 'quintas') body = `<div class="a-map pt">${portugalMapSVG(farmersForMap(), lang, '')}</div><div class="a-list">${farmList().map(f => `<a class="a-row" href="${farmerHref(f)}"><span class="a-row-ic">${icon('tractor', 20)}</span><span><b>${esc(f.farm)}</b><span class="muted small">${esc(f.name)}, ${esc(f.place)}</span></span><span class="a-km">${fmtKm(f.km)}</span></a>`).join('')}</div>`;
  return { title: T('Mapa', 'Map'), fab: true, html: `<div class="a-sticky"><div class="a-seg" role="tablist">${views.map(([k, n]) => `<button role="tab" data-mapa="${k}" aria-selected="${mapaV === k}">${n}</button>`).join('')}</div></div>
    <div class="a-pad">${appPos ? `<p class="small muted mb-s">${icon('locate', 14)} ${T('Distâncias a partir da sua localização.', 'Distances from your location.')} <button class="link" data-app-locate>${T('Atualizar', 'Update')}</button></p>` : `<button class="a-locate mb-s" data-app-locate>${icon('locate', 18)}${T('Usar a minha localização', 'Use my location')}</button><p class="small muted mb-s">${T('Sem localização, as distâncias contam a partir do centro de Aveiro.', 'Without your location, distances are from Aveiro city centre.')}</p>`}${body}</div>` };
}

function scrConta(u) {
  const rows = (list) => `<div class="a-menu">${list.map(([h, ic, t, sub]) => `<a class="a-row" href="${h}"><span class="a-row-ic">${icon(ic, 20)}</span><span><b>${t}</b>${sub ? `<span class="muted small">${sub}</span>` : ''}</span>${icon('chevR', 18)}</a>`).join('')}</div>`;
  const help = rows([['#/info/contacto', 'phone', T('Contacto e ajuda', 'Contact and help')], ['#/info/faq', 'help', T('Perguntas frequentes', 'FAQ')], ['#/info/sobre', 'leaf', T('Sobre a Daqui', 'About Daqui')], ['#/info/politicas', 'shield', T('Políticas', 'Policies')]]);
  const langRow = `<div class="a-row"><span class="a-row-ic">${icon('globe', 20)}</span><span><b>${T('Língua', 'Language')}</b></span>${langToggle()}</div>`;
  const pushRow = NATIVO.pushAvailable() && u ? `<button class="a-row" data-push-on><span class="a-row-ic">${icon('bell', 20)}</span><span><b>${T('Notificações', 'Notifications')}</b><span class="muted small">${NATIVO.pushState === 'on' ? T('Ativas neste telemóvel', 'On for this phone') : T('Toque para ativar', 'Tap to turn on')}</span></span>${icon('chevR', 18)}</button>` : '';
  if (!u) return { title: T('Conta', 'Account'), fab: true, html: `<div class="a-pad"><div class="a-guest">${icon('user', 34)}<h2>${T('Entre ou crie conta', 'Sign in or create an account')}</h2><p class="muted">${T('Para seguir encomendas, guardar favoritos e subscrever caixas.', 'To track orders, save favourites and subscribe to boxes.')}</p>
    <a class="a-big-btn" href="#/entrar">${T('Entrar', 'Sign in')}</a><a class="a-big-btn ghost" href="#/entrar?modo=registo">${T('Criar conta', 'Create account')}</a></div>
    ${myOrders(null).length ? sec(T('Encomendas feitas neste telemóvel', 'Orders placed on this phone'), `<div class="a-list">${myOrders(null).map(orderMini).join('')}</div>`) : ''}
    <div class="a-menu">${langRow}</div>${rows([['#/info/contacto', 'route', T('Seguir uma encomenda', 'Track an order'), T('Com o número e o telemóvel', 'With the number and mobile')]])}${help}</div>` };
  const orders = myOrders(u), nova = (u.subs || []).find(s => s.id === QS.get('nova'));
  return { title: T('Conta', 'Account'), fab: roleOf(u) === 'cliente', html: `<div class="a-pad">
    ${nova ? `<p class="note done">${icon('check', 22)}<span><b>${T('Subscrição confirmada', 'Subscription confirmed')}: ${esc(L(P(nova.box).name))}.</b> ${T('Primeira entrega', 'First delivery')}: ${slotLabel(nova.first)}.</span></p>` : ''}
    <div class="a-profile"><span class="a-avatar">${esc(u.name.split(' ').map(x => x[0]).slice(0, 2).join(''))}</span><span><b>${esc(u.name)}</b><span class="muted small">${esc(u.username)}, ${esc(u.phone)}</span></span></div>
    ${orders.length ? sec(T('Encomendas', 'Orders'), `<div class="a-list">${orders.slice(0, 3).map(orderMini).join('')}</div>`, orders.length > 3 ? `<a class="link small" href="#/conta/encomendas">${T('Ver todas', 'See all')} (${orders.length})</a>` : '') : ''}
    ${rows([['#/conta/encomendas', 'box', T('Encomendas', 'Orders'), `${orders.length} ${orders.length === 1 ? T('encomenda', 'order') : T('encomendas', 'orders')}`], ['#/conta/subscricoes', 'repeat', T('Subscrições', 'Subscriptions'), (n => `${n} ${n === 1 ? T('ativa', 'active') : T('ativas', 'active')}`)((u.subs || []).filter(s => s.status === 'ativa').length)],
      ['#/conta/preferencias', 'heart', T('Favoritos e exclusões', 'Favourites and exclusions'), `${(u.favs || []).length} ${(u.favs || []).length === 1 ? T('favorito', 'favourite') : T('favoritos', 'favourites')}, ${(u.exclude || []).length} ${T('excluídos', 'excluded')}`], ['#/conta/colhe', 'sprout', JTH(), (n => `${n} ${n === 1 ? T('inscrição', 'sign-up') : T('inscrições', 'sign-ups')}`)((u.harvests || []).length)], ['#/conta/dados', 'user', T('Dados e morada', 'Details and address')]])}
    <div class="a-menu">${langRow}${pushRow}</div>${help}
    <button class="a-big-btn ghost danger" data-logout>${icon('logout', 18)} ${T('Terminar sessão', 'Sign out')}</button></div>` };
}

function scrEncomendas(u) {
  const list = myOrders(u);
  return { title: T('Encomendas', 'Orders'), back: true, html: `<div class="a-pad">${list.length ? `<div class="a-list">${list.map(orderMini).join('')}</div>` : `<div class="a-empty">${icon('box', 30)}<p>${T('Ainda não fez encomendas.', 'No orders yet.')}</p><a class="btn btn-green" href="#/loja">${T('Ir à loja', 'Go to the shop')}</a></div>`}
    <p class="small muted mt">${T('Procura uma encomenda feita sem conta?', 'Looking for an order placed without an account?')} <button class="link" data-help="track">${T('Procurar com o número', 'Find it by number')}</button></p></div>` };
}

function scrEncomenda(num, u) {
  const o = findOrder(num);
  if (!o) return { title: num, back: true, html: `<div class="a-pad"><div class="a-empty">${icon('route', 30)}<p>${T('Não encontrámos esta encomenda neste telemóvel. Procure-a com o número e o telemóvel usado.', 'We couldn\'t find this order on this phone. Look it up with its number and the mobile used.')}</p><button class="btn btn-green" data-help="track" data-num="${esc(num)}">${T('Procurar encomenda', 'Find order')}</button></div></div>` };
  const st = orderStage(o), nova = QS.get('nova');
  return { title: o.num, back: !nova, html: `<div class="a-pad">
    ${nova ? `<div class="a-done">${icon('check', 34)}<h2>${T('Encomenda confirmada', 'Order confirmed')}</h2><p class="muted">${T('Guarde o número para seguir ou alterar a encomenda.', 'Keep the number to track or change the order.')}</p></div>` : ''}
    ${canSwipe(o) ? `<div class="a-swipe-box"><p><b>${T('A sua encomenda está pronta', 'Your order is ready')}</b><br><span class="small">${esc(o.point)}, ${pickupHours(o.day)}. ${T('Deslize quando a receber no ponto de recolha.', 'Swipe when you receive it at the collection point.')}</span></p>
      <div class="a-swipe" data-swipe="${o.num}"><span class="a-swipe-label">${T('Deslize para confirmar o levantamento', 'Swipe to confirm collection')}</span><button class="a-swipe-knob" data-swipe-knob="${o.num}" aria-label="${T('Confirmar o levantamento', 'Confirm collection')}">${icon('chevR', 26)}</button></div></div>` : ''}
    ${st === 3 && o.deliver === 'pickup' ? `<p class="note done">${icon('check', 22)}<span><b>${T('Levantada', 'Collected')}.</b> ${T('Bom proveito!', 'Enjoy!')}</span></p>` : ''}
    <div class="a-panel">${trackHTML(o)}</div>
    <div class="a-panel"><h2 class="a-h2">${T('Artigos', 'Items')}</h2><div class="a-items">${o.items.map(i => { const p = P(i.id); return `<div class="a-item"><span class="thumb">${p ? artFor(p) : ''}</span><span>${i.qty} × ${esc(p ? L(p.name) : i.id)}${i.size ? ` (${sizeName(i.size)})` : ''}</span><b>${money(i.price * i.qty)}</b></div>`; }).join('')}</div>
      <div class="sum"><span>${T('Entrega', 'Delivery')}</span><span>${o.fee ? money(o.fee) : T('Grátis', 'Free')}</span></div><div class="sum tot"><span>Total</span><span>${money(o.total)}</span></div>
      ${o.prefs ? `<p class="small muted mt-s">${T('Nas caixas não vai', 'Boxes will leave out')}: ${(o.prefs.exclude || []).map(P).filter(Boolean).map(p => esc(L(p.name))).join(', ') || T('nada', 'nothing')}.</p>` : ''}</div>
    <div class="a-actions">${st === 0 && o.status !== 'cancelada' ? `<button class="a-big-btn ghost" data-app-manage="${o.num}">${icon('calendar', 18)} ${T('Mudar o dia ou cancelar', 'Change the day or cancel')}</button>` : ''}
      ${st >= 2 && st < 4 ? `<a class="a-big-btn ghost" href="#/incidencia/${o.num}">${icon('camera', 18)} ${T('Comunicar um problema', 'Report a problem')}</a>` : ''}
      <button class="a-big-btn ghost" data-app-reorder="${o.num}">${icon('repeat', 18)} ${T('Repetir encomenda', 'Order again')}</button>
      ${nova ? `<a class="a-big-btn" href="#/inicio">${T('Voltar ao início', 'Back to home')}</a>` : ''}</div></div>` };
}

function scrIncidencia(num) {
  const o = findOrder(num);
  if (!o) return scrEncomenda(num);
  return { title: T('Comunicar um problema', 'Report a problem'), back: true, html: `<form class="a-pad form" data-app-incident="${o.num}" novalidate>
    <p class="muted">${T('Diga-nos o que aconteceu com a encomenda', 'Tell us what happened with order')} ${o.num}. ${T('Substituímos o produto ou devolvemos o valor.', 'We replace the item or refund you.')}</p>
    <div class="field"><label for="ai-prod">${T('Produto', 'Product')}</label><select id="ai-prod">${o.items.map(i => P(i.id)).filter(Boolean).map(p => `<option value="${p.id}">${esc(L(p.name))}</option>`).join('')}</select></div>
    <div class="field"><label for="ai-what">${T('O que aconteceu?', 'What happened?')}</label><textarea id="ai-what" rows="3" required></textarea></div>
    <div class="field"><span class="lbl">${T('Fotografia', 'Photo')}</span>
      <div class="a-photo">${incPhotoUrl ? `<img src="${incPhotoUrl}" alt="${T('Fotografia escolhida', 'Chosen photo')}"><button type="button" class="link" data-photo-rm>${T('Remover', 'Remove')}</button>` : ''}
        ${NATIVO.isNative ? `<div class="a-photo-btns"><button type="button" class="a-big-btn ghost" data-photo-take="camera">${icon('camera', 20)} ${incPhotoUrl ? T('Tirar outra', 'Take another') : T('Tirar fotografia', 'Take a photo')}</button><button type="button" class="a-big-btn ghost" data-photo-take="photos">${icon('grid', 20)} ${T('Galeria', 'Gallery')}</button></div>`
          : `<label class="a-big-btn ghost">${icon('camera', 20)} ${incPhotoUrl ? T('Tirar outra', 'Take another') : T('Tirar fotografia', 'Take a photo')}<input type="file" id="ai-file" accept="image/*" capture="environment" class="sr"></label>`}</div></div>
    <div class="field"><span class="lbl">${T('Prefere', 'You prefer')}</span><div class="radios"><label><input type="radio" name="ai-pref" value="sub" checked>${T('Substituir na próxima entrega', 'A replacement next delivery')}</label><label><input type="radio" name="ai-pref" value="ref">${T('Reembolso', 'A refund')}</label></div></div>
    <p class="err" hidden></p><button class="a-big-btn" type="submit">${T('Enviar', 'Send')}</button></form>` };
}

/* ---------- ecrãs que reaproveitam páginas do site ---------- */
/* o conteúdo reaproveitado fica dentro de <div data-site-page="…">: assim os eventos das páginas do site sabem a que página pertencem */
const wrapSite = (key, html) => `<div data-site-page="${key}">${html}</div>`;
function sitePage(key, pid) { PAGE = key; if (pid !== undefined) PID = pid; const o = PAGES[key](); return Object.assign({}, o, { html: wrapSite(key, o.html) }); }
function contaSection(id) {
  PAGE = 'conta'; const out = PAGES.conta(), t = document.createElement('template'); t.innerHTML = out.html;
  const s = t.content.querySelector('#' + id); return s ? wrapSite('conta', s.outerHTML) : '';
}
function partnerTab(u, idx) {
  PAGE = 'parceiro'; const s = partnerSections(u), pt = u.partner;
  const pend = pt.approved ? '' : `<p class="note">${icon('clock', 22)}<span><b>${T('Pedido em análise pela equipa Daqui.', 'Application under review by the Daqui team.')}</b> ${T('Já pode preparar o seu perfil; fica visível depois da aprovação.', 'You can already prepare your profile; it becomes visible once approved.')}</span></p>`;
  return wrapSite('parceiro', pend + idx.map(i => s[i] || '').join(''));
}
function myProposals(u) {
  const types = REQ_TYPES(), list = REQUESTS.filter(r => r.partnerUser === u.username || r.user === u.username).sort((a, b) => b.created.localeCompare(a.created));
  return `<section class="acc-sec"><h2>${T('As minhas propostas e pedidos', 'My proposals and requests')}</h2>${list.length ? `<ul class="hlist mt-s">${list.map(r => `<li class="hrow"><span>${icon(r.type === 'produto' ? 'leaf' : r.type === 'colhe' ? 'calendar' : r.type === 'frio' ? 'snow' : 'inbox', 20)}</span><div><b>${types[r.type] || r.type}</b><br><span class="small muted">${esc(r.fields.namePt || r.fields.product || r.fields.date || r.fields.farm || r.fields.restaurant || '')} ${fdate(r.created)}</span></div>${reqStatus(r)}</li>`).join('')}</ul>` : `<p class="muted mt-s">${T('Ainda não fez propostas.', 'No proposals yet.')}</p>`}</section>`;
}
function adminMais() {
  const kp = `<div class="kpis"><div><strong>${REQUESTS.filter(r => r.status === 'novo').length}</strong><span>${T('pedidos novos', 'new requests')}</span></div><div><strong>${ORDERS.filter(o => orderStage(o) < 3).length}</strong><span>${T('por entregar', 'to deliver')}</span></div><div><strong>${Object.values(USERS).flatMap(c => c.subs || []).filter(s => s.status === 'ativa').length}</strong><span>${T('subscrições', 'subscriptions')}</span></div><div><strong>${Object.values(USERS).filter(x => x.role !== 'admin').length}</strong><span>${T('contas', 'accounts')}</span></div></div>`;
  const rows = [['#/g/caixas', 'box', T('Caixas e preços', 'Boxes and prices')], ['#/g/colhe', 'sprout', JTH()], ['#/g/subscricoes', 'repeat', T('Subscrições', 'Subscriptions')], ['#/g/contas', 'users', T('Contas', 'Accounts')], ['#/g/dados', 'app', NUVEM.on ? T('Base de dados', 'Database') : T('Guardar alterações', 'Save changes')]];
  return `<div class="a-pad">${NUVEM.badge()}${kp}<div class="a-menu">${rows.map(([h, ic, t]) => `<a class="a-row" href="${h}"><span class="a-row-ic">${icon(ic, 20)}</span><span><b>${t}</b></span>${icon('chevR', 18)}</a>`).join('')}</div>
    <div class="a-menu"><div class="a-row"><span class="a-row-ic">${icon('globe', 20)}</span><span><b>${T('Língua', 'Language')}</b></span>${langToggle()}</div></div>
    <button class="a-big-btn ghost danger" data-logout>${icon('logout', 18)} ${T('Terminar sessão', 'Sign out')}</button></div>`;
}
function partnerConta(u, extra) {
  return `<div class="a-profile"><span class="a-avatar">${esc(u.name.split(' ').map(x => x[0]).slice(0, 2).join(''))}</span><span><b>${esc(u.name)}</b><span class="muted small">${esc(u.username)}, ${esc(u.phone)}</span></span></div>
    ${extra}${contaSection('dados')}
    <div class="a-menu"><div class="a-row"><span class="a-row-ic">${icon('globe', 20)}</span><span><b>${T('Língua', 'Language')}</b></span>${langToggle()}</div>${NATIVO.pushAvailable() ? `<button class="a-row" data-push-on><span class="a-row-ic">${icon('bell', 20)}</span><span><b>${T('Notificações', 'Notifications')}</b><span class="muted small">${NATIVO.pushState === 'on' ? T('Ativas neste telemóvel', 'On for this phone') : T('Toque para ativar', 'Tap to turn on')}</span></span>${icon('chevR', 18)}</button>` : ''}
      <a class="a-row" href="#/conta/encomendas"><span class="a-row-ic">${icon('box', 20)}</span><span><b>${T('Encomendas', 'Orders')}</b></span>${icon('chevR', 18)}</a></div>
    <button class="a-big-btn ghost danger" data-logout>${icon('logout', 18)} ${T('Terminar sessão', 'Sign out')}</button>`;
}

/* ---------- escolher o ecrã ---------- */
function appScreen(path, u) {
  const role = roleOf(u), [a, b] = path.split('/');
  PAGE = 'app';
  if ((a === 'g' && role !== 'admin') || (a === 'p' && role !== 'agricultor') || (a === 'r' && role !== 'restaurante')) return { redirect: roleHome(u) };
  if (a === 'boas-vindas') return scrIntro();
  if (a === 'inicio') return scrInicio(u);
  if (a === 'loja') return scrLoja(u);
  if (a === 'produto') return scrProduto(b, u);
  if (a === 'mapa') { if (QS.get('v')) mapaV = QS.get('v'); return scrMapa(); }
  if (a === 'conta' && !b) return scrConta(u);
  if (a === 'conta' && b === 'encomendas') return scrEncomendas(u);
  if (a === 'conta') { if (!u) return { redirect: 'entrar?next=conta' }; BACK = /^subscricao\/[a-z0-9-]+$/.test(QS.get('voltar') || '') ? QS.get('voltar') : ''; const names = { subscricoes: T('Subscrições', 'Subscriptions'), preferencias: T('Favoritos e exclusões', 'Favourites and exclusions'), colhe: JTH(), dados: T('Dados e morada', 'Details and address') };
    return { title: names[b] || T('Conta', 'Account'), back: true, html: `<div class="a-pad">${contaSection(b) || ''}</div>` }; }
  if (a === 'encomenda') return scrEncomenda(b, u);
  if (a === 'incidencia') return scrIncidencia(b);
  if (a === 'caixas') { const o = sitePage('subscricao'); return { title: T('Caixas da Estação', 'Seasonal boxes'), back: true, fab: true, html: o.html, after: o.after }; }
  if (a === 'subscrever') { PAGE = 'subscrever'; PID = b; cfg = makeCfg(); const o = PAGES.subscrever(); return { title: T('Subscrever', 'Subscribe'), back: true, html: wrapSite('subscrever', o.html) }; }
  if (a === 'finalizar') { const o = sitePage('finalizar'); return { title: T('Finalizar encomenda', 'Check out'), back: true, html: o.html, after: o.after }; }
  if (a === 'entrar') { if (QS.get('modo')) authMode = QS.get('modo') === 'registo' ? 'registo' : 'entrar'; if (QS.get('tipo')) authRole = QS.get('tipo'); NEXT = /^[a-z0-9\-/]*$/.test(QS.get('next') || '') ? QS.get('next') || '' : ''; const o = sitePage('entrar'); return { title: T('Entrar', 'Sign in'), back: true, html: o.html }; }
  if (a === 'colhe') { const o = sitePage('colhe-connosco'); return { title: JTH(), back: true, html: o.html, after: o.after }; }
  if (a === 'agricultor') { const o = sitePage('agricultor', b); return { title: o.title, back: true, html: o.html, after: o.after }; }
  if (a === 'info' && PAGES[b]) { const o = sitePage(b); return { title: o.title, back: true, html: o.html, after: o.after }; }
  /* agricultor */
  if (path === 'p/produtos') return { title: T('Os meus produtos', 'My produce'), html: `<div class="a-pad">${partnerTab(u, [1])}</div>` };
  if (path === 'p/colhe') return { title: JTH(), html: `<div class="a-pad">${partnerTab(u, [2])}</div>` };
  if (path === 'p/propostas') return { title: T('Propostas', 'Proposals'), html: `<div class="a-pad">${myProposals(u)}${partnerTab(u, [3])}</div>` };
  if (path === 'p/conta') return { title: T('Conta', 'Account'), html: `<div class="a-pad">${partnerConta(u, partnerTab(u, [0]))}</div>` };
  /* restaurante */
  if (path === 'r/perfil') return { title: esc(u.partner.name || T('Restaurante', 'Restaurant')), html: `<div class="a-pad">${partnerTab(u, [0, 1])}</div>` };
  if (path === 'r/pratos') return { title: T('Pratos', 'Dishes'), html: `<div class="a-pad">${partnerTab(u, [2])}</div>` };
  if (path === 'r/conta') return { title: T('Conta', 'Account'), html: `<div class="a-pad">${partnerConta(u, '')}</div>` };
  /* gestão: as funções do painel do site (js/pages-gestao.js) */
  if (a === 'g') {
    PAGE = 'conta';
    const map = { pedidos: [tabPedidos, T('Pedidos', 'Requests')], encomendas: [tabEncomendas, T('Encomendas', 'Orders')], catalogo: [tabCatalogo, T('Catálogo', 'Catalogue')], caixas: [tabCaixas, T('Caixas e preços', 'Boxes and prices')],
      colhe: [tabColhe, JTH()], subscricoes: [tabSubs, T('Subscrições', 'Subscriptions')], contas: [tabContas, T('Contas', 'Accounts')], dados: [tabExportar, NUVEM.on ? T('Base de dados', 'Database') : T('Guardar alterações', 'Save changes')] };
    if (b === 'mais') return { title: T('Gestão', 'Management'), html: adminMais() };
    const [fn, title] = map[b] || map.pedidos;
    return { title, back: !['pedidos', 'encomendas', 'catalogo'].includes(b), html: `<div class="a-pad">${wrapSite('conta', fn())}</div>` };
  }
  return { redirect: roleHome(u) };
}

/* ---------- desenhar ---------- */
let APP_READY = false;   // só desenha depois de ler a base de dados (js/nuvem.js)
render = function appRender() {
  if (!APP_READY) return;
  document.documentElement.lang = lang === 'en' ? 'en' : 'pt-PT';
  const { path, query } = appHash(); QS = query;
  if (!store.get(INTRO_KEY, false) && path !== 'boas-vindas') { appReplace('#/boas-vindas'); return; }
  const u = currentUser();
  if (!path) { appReplace('#/' + roleHome(u)); return; }
  const scr = appScreen(path, u);
  if (scr.redirect) { appReplace('#/' + scr.redirect); return; }
  const role = roleOf(u), tabs = TABS()[role], act = activeTab(path, role);
  const count = cart.reduce((n, i) => n + i.qty, 0), newReq = role === 'admin' ? REQUESTS.filter(r => r.status === 'novo').length : 0;
  const bar = scr.bare || scr.hero || scr.noBar ? '' : `<header class="a-bar"><div class="a-bar-in">${scr.back ? `<button class="a-bar-btn" data-app-back aria-label="${T('Voltar', 'Back')}">${icon('chevL', 26)}</button>` : `<img class="a-bar-logo" src="${LOGO_GOLD}" alt="Daqui">`}
    <h1 class="a-bar-title">${scr.title}</h1>${role === 'admin' && path.startsWith('g/') ? `<button class="a-bar-btn" data-app-refresh aria-label="${T('Atualizar', 'Refresh')}">${icon('repeat', 22)}</button>` : ''}</div></header>`;
  const nav = scr.bare ? '' : `<nav class="a-tabs" aria-label="${T('Secções', 'Sections')}">${tabs.map(([r, ic, n]) => `<a href="#/${r}"${act === r ? ' aria-current="page"' : ''}>${icon(ic, 24)}<span>${n}</span>${r === 'g/pedidos' && newReq ? `<i class="a-dot">${newReq}</i>` : ''}</a>`).join('')}</nav>`;
  const fab = scr.fab && role !== 'admin' && role !== 'agricultor' ? `<button class="a-fab" data-cart-open aria-label="${T('Abrir cabaz', 'Open basket')}, ${count} ${T('artigos', 'items')}">${icon('basket', 26)}${count ? `<span class="count">${count}</span>` : ''}</button>` : '';
  $('#app').innerHTML = `${NUVEM.banner()}${bar}<main id="main" class="a-main${scr.hero ? ' has-hero' : ''}${scr.noBar ? ' no-bar' : ''}${scr.bare ? ' bare' : ''}" tabindex="-1">${scr.html}</main>${fab}${nav}`;
  document.title = `Daqui | ${String(scr.title).replace(/<[^>]+>/g, '')}`;
  document.body.classList.toggle('a-has-buy', !!$('.a-buy'));
  tableCards(); if (scr.after) try { scr.after(); } catch (e) { console.warn(e); }
  NATIVO.bars(!!$('.a-pdp-hero'));   // ícones escuros na barra de estado quando o topo do ecrã é claro
};
/* tabelas largas (painel de gestão) viram cartões no telemóvel: cada célula recebe o nome da coluna */
function tableCards() { $$('#main table.tbl').forEach(t => { const hs = $$('thead th', t).map(th => (th.firstChild ? th.firstChild.textContent : '').trim()); $$('tbody tr', t).forEach(tr => $$('td', tr).forEach((td, i) => { if (hs[i]) td.dataset.label = hs[i]; })); t.classList.add('a-cards'); }); }

/* ---------- navegação ---------- */
window.addEventListener('hashchange', () => {
  const h = location.hash;
  if (appReplacing) { appStack[appStack.length - 1] = h; appReplacing = false; }
  else if (appStack.length > 1 && appStack[appStack.length - 2] === h) appStack.pop();
  else appStack.push(h);
  if ($('#modal').classList.contains('on')) closeModal(); if ($('#drawer').classList.contains('on')) closeCart();
  render(); scrollTo(0, 0);
});
/* eventos das páginas do site reaproveitadas: PAGE passa a ser a página de onde veio o clique */
['click', 'change', 'input', 'submit'].forEach(ev => document.addEventListener(ev, e => {
  const w = e.target.closest && e.target.closest('[data-site-page]'); if (w) PAGE = w.dataset.sitePage;
  if (ev === 'click') {   /* âncoras do site (#id) dentro da app: deslizar até ao elemento, sem mudar de ecrã */
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (a && !a.getAttribute('href').startsWith('#/')) { e.preventDefault(); const el = document.getElementById(a.getAttribute('href').slice(1)); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('a-flash'); setTimeout(() => el.classList.remove('a-flash'), 1600); } }
  }
}, true));
afterLogin = function () {
  const pending = store.get('daqui-pending-sub', null);
  if (NEXT.startsWith('subscricao/') && pending) return go(NEXT, 'retomar=1');
  NATIVO.pushStart();
  if (NEXT && NEXT !== 'conta') return go(NEXT);
  location.hash = '#/' + roleHome();
};
const _setLang = setLang;
setLang = function (l) { _setLang(l); NATIVO.pushLanguage(); };

/* ---------- eventos ---------- */
PAGE_EVENTS.click.push((e, t, d) => {
  if ('appBack' in d) { appBack(); return true; }
  if ('appRefresh' in d) { if (NUVEM.on) NUVEM.refresh(); toast(T('A atualizar…', 'Refreshing…')); return true; }
  if (d.introLang) { store.set('daqui-lang', d.introLang); lang = d.introLang; introStep = 1; render(); return true; }
  if ('introNext' in d) { introStep++; render(); return true; }
  if ('introEnd' in d) { store.set(INTRO_KEY, true); introStep = 0; appReplace(d.introEnd === 'entrar' ? '#/entrar' : '#/' + roleHome()); return true; }
  if (d.lojaCat) { lojaCat = d.lojaCat; rerenderKeep(`[data-loja-cat="${d.lojaCat}"]`); return true; }
  if (d.mapa) { mapaV = d.mapa; history.replaceState(null, '', '#/mapa?v=' + d.mapa); render(); return true; }
  if ('appLocate' in d) { askPosition(); return true; }
  if (d.detSize) { detSize = d.detSize; rerenderKeep(`[data-det-size="${d.detSize}"]`); return true; }
  if (d.detQty) { detQty = Math.max(1, Math.min(20, detQty + +d.detQty)); rerenderKeep(`[data-det-qty="${d.detQty}"]`); return true; }
  if (d.detAdd) { const p = P(d.detAdd); addToCart(p.id, p.cat === 'caixas' ? { size: detSize } : {}, detQty); detQty = 1; const f = $('.a-fab'); if (f) { f.classList.remove('bump'); void f.offsetWidth; f.classList.add('bump'); } return true; }
  if (d.appManage) { showOrder('order', findOrder(d.appManage), false); return true; }
  if (d.appReorder) { const o = findOrder(d.appReorder); o.items.forEach(i => { const p = P(i.id); if (p && (available(p) || p.cat === 'caixas')) addToCart(i.id, i.size ? { size: i.size } : {}, i.qty); }); openCart(); return true; }
  if ('swipeKnob' in d && e.detail === 0) { confirmPickup(d.swipeKnob); return true; }   // teclado: Enter/Espaço no botão
  if ('photoTake' in d) { NATIVO.photo(d.photoTake).then(blob => { if (blob) setPhoto(blob); }).catch(err => { if (!/cancel/i.test(String(err))) toast(T('Não foi possível usar a câmara.', 'The camera could not be used.')); }); return true; }
  if ('photoRm' in d) { setPhoto(null); return true; }
  if ('pushOn' in d) { NATIVO.pushStart(true).then(() => rerenderKeep()); return true; }
});
PAGE_EVENTS.input.push((e, t) => { if (t.id === 'a-q') { lojaQ = t.value; const y = scrollY; render(); scrollTo(0, y); const i = $('#a-q'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); } });
PAGE_EVENTS.change.push((e, t) => { if (t.id === 'ai-file' && t.files[0]) setPhoto(t.files[0]); });
PAGE_EVENTS.submit.push((e, f) => {
  if (!f.matches('[data-app-incident]')) return;
  e.preventDefault(); if (!validate(f)) return true;
  const o = findOrder(f.dataset.appIncident), btn = $('button[type="submit"]', f); btn.disabled = true;
  const send = photo => {
    const r = addRequest('incidencia', { product: $('#ai-prod').value, what: $('#ai-what').value.trim(), remedy: $('input[name="ai-pref"]:checked').value, photo }, { order: o.num });
    setPhoto(null);
    $('#main').innerHTML = `<div class="a-pad"><div class="a-done">${icon('check', 34)}<h2>${T('Problema comunicado', 'Problem reported')}</h2><p>${T('Referência', 'Reference')} <b>${r.id}</b>. ${T('A equipa responde em 24 horas úteis.', 'The team replies within one working day.')}</p><a class="a-big-btn" href="#/encomenda/${o.num}">${T('Voltar à encomenda', 'Back to the order')}</a></div></div>`;
  };
  if (incPhoto && NUVEM.on) NUVEM.uploadPhoto(incPhoto, (incPhoto.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')).then(send, err => { console.error(err); toast(T('A fotografia não foi enviada; o problema segue sem ela.', 'The photo was not sent; the report goes without it.')); send(''); });
  else send(incPhoto ? (incPhoto.name || 'foto.jpg') : '');
  return true;
});
function setPhoto(blob) { if (incPhotoUrl) URL.revokeObjectURL(incPhotoUrl); incPhoto = blob; incPhotoUrl = blob ? URL.createObjectURL(blob) : ''; const what = $('#ai-what')?.value || ''; rerenderKeep(); if ($('#ai-what')) $('#ai-what').value = what; }

/* deslizar para confirmar o levantamento */
function confirmPickup(num) {
  const o = findOrder(num); if (!o || !canSwipe(o)) return;
  o.stage = 3; saveOrders();
  toast(T('Levantamento confirmado. Bom proveito!', 'Collection confirmed. Enjoy!')); rerenderKeep();
}
document.addEventListener('pointerdown', e => {
  const knob = e.target.closest('.a-swipe-knob'); if (!knob) return;
  const track = knob.parentElement, max = track.clientWidth - knob.offsetWidth - 8, x0 = e.clientX; let dx = 0;
  knob.setPointerCapture(e.pointerId); track.classList.add('dragging');
  const move = ev => { dx = Math.max(0, Math.min(max, ev.clientX - x0)); knob.style.transform = `translateX(${dx}px)`; track.style.setProperty('--p', (dx / max).toFixed(2)); };
  const up = () => { knob.removeEventListener('pointermove', move); knob.removeEventListener('pointerup', up); knob.removeEventListener('pointercancel', up); track.classList.remove('dragging');
    if (dx >= max * 0.85) { knob.style.transform = `translateX(${max}px)`; confirmPickup(knob.dataset.swipeKnob); } else { knob.style.transform = ''; track.style.setProperty('--p', 0); } };
  knob.addEventListener('pointermove', move); knob.addEventListener('pointerup', up); knob.addEventListener('pointercancel', up);
});

/* ---------- arranque ---------- */
document.addEventListener('DOMContentLoaded', () => {
  $('#drawer').setAttribute('inert', '');
  $('#app').innerHTML = `<div class="loading-page" role="status"><img src="${LOGO_GOLD}" alt="Daqui" width="140"><p>${T('A carregar…', 'Loading…')}</p></div>`;
  const first = () => { APP_READY = true; render(); NATIVO.ready(); };
  (NUVEM.configured ? NUVEM.start() : Promise.resolve()).then(first, first);
  if ('serviceWorker' in navigator && !NATIVO.isNative && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
});
