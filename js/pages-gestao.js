/* ===== Daqui — painel da conta de gestão (aparece em /conta quando entra a conta "gestao") =====
   Separadores: Pedidos, Encomendas, Catálogo, Caixas, Colhe Connosco, Subscrições, Exportar.
   As alterações ao catálogo usam saveCatalog() (js/catalogo.js): ficam neste navegador até serem
   exportadas para js/alteracoes.js. */
const REQ_TYPES = () => ({ selo: T('Pedido de Selo Daqui', 'Daqui seal application'), agricultor: T('Adesão de agricultor', 'Farmer sign-up'), produto: T('Proposta de produto', 'Product proposal'),
  colhe: T('Proposta de Colhe Connosco', 'Join the Harvest proposal'), frio: T('Armazenamento em frio', 'Cold storage'), gerir: T('Gerir encomenda', 'Manage order'), seguimento: T('Seguimento', 'Tracking'),
  incidencia: T('Incidência', 'Problem report'), contacto: T('Mensagem', 'Message'), fundador: T('Membro fundador', 'Founding member') });
const ADMIN_TABS = ['pedidos', 'encomendas', 'catalogo', 'caixas', 'colhe', 'subscricoes', 'contas', 'exportar'];
let adminTab = ADMIN_TABS.includes(QS.get('tab')) ? QS.get('tab') : 'pedidos';
let inboxFilter = 'novo', catQuery = '', catFilter = 'all', accFilter = 'all';
const monthOpts = sel => Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}"${+sel === i + 1 ? ' selected' : ''}>${monthName(i + 1, 'short')}</option>`).join('');
const UNIT_OPTS = sel => [['kg', 'kg'], ['un', T('unidade', 'each')], ['molho', T('molho', 'bunch')], ['cuv', T('cuvete', 'punnet')]].map(([v, n]) => `<option value="${v}"${sel === v ? ' selected' : ''}>${n}</option>`).join('');
const TIME_OPTS = ['9h30–12h30', '10h–13h', '15h–18h', '16h–19h'];

function adminPanel() {
  const clients = Object.values(USERS).filter(x => x.role !== 'admin');
  const subs = clients.flatMap(c => (c.subs || []).map(s => ({ c, s })));
  const nNew = REQUESTS.filter(r => r.status === 'novo').length;
  const names = { pedidos: T('Pedidos e avisos', 'Requests'), encomendas: T('Encomendas', 'Orders'), catalogo: T('Catálogo', 'Catalogue'), caixas: T('Caixas e preços', 'Boxes and prices'), colhe: JTH(), subscricoes: T('Subscrições', 'Subscriptions'), contas: T('Contas', 'Accounts'), exportar: T('Guardar alterações', 'Save changes') };
  const body = { pedidos: tabPedidos, encomendas: tabEncomendas, catalogo: tabCatalogo, caixas: tabCaixas, colhe: tabColhe, subscricoes: tabSubs, contas: tabContas, exportar: tabExportar }[adminTab]();
  return `<section class="acc-sec"><div class="row-between"><h2>${T('Painel de gestão', 'Management panel')}</h2>${NUVEM.badge()}</div>
    <div class="kpis"><div><strong>${nNew}</strong><span>${T('pedidos novos', 'new requests')}</span></div><div><strong>${ORDERS.filter(o => orderStage(o) < 3).length}</strong><span>${T('encomendas por entregar', 'orders to deliver')}</span></div><div><strong>${subs.filter(x => x.s.status === 'ativa').length}</strong><span>${T('subscrições ativas', 'active subscriptions')}</span></div><div><strong>${clients.length}</strong><span>${T('contas registadas', 'registered accounts')}</span></div></div>
    <nav class="admin-tabs" role="tablist" aria-label="${T('Secções do painel', 'Panel sections')}">${ADMIN_TABS.map(k => `<button role="tab" data-admin-tab="${k}" aria-selected="${adminTab === k}">${names[k]}${k === 'pedidos' && nNew ? ` <span class="count-in">${nNew}</span>` : ''}${k === 'exportar' && catalogChangeCount() ? ` <span class="count-in">${catalogChangeCount()}</span>` : ''}</button>`).join('')}</nav></section>
  ${body}`;
}

/* ---------- Pedidos ---------- */
function canApprove(r) { return !r.approved && r.partnerUser && USERS[r.partnerUser] && ['agricultor', 'selo', 'produto', 'colhe'].includes(r.type); }
function approveLabel(r) { return { agricultor: T('Aprovar e pôr a quinta no mapa', 'Approve and add the farm to the map'), selo: T('Aprovar e atribuir o selo', 'Approve and award the seal'), produto: T('Aprovar e publicar o produto', 'Approve and publish the product'), colhe: T('Aprovar e criar o dia', 'Approve and create the day') }[r.type]; }
function tabPedidos() {
  const types = REQ_TYPES(), all = REQUESTS.slice().sort((a, b) => b.created.localeCompare(a.created)), labels = REQ_LABELS();
  const counts = k => k === 'novo' ? all.filter(r => r.status === 'novo').length : k === 'all' ? all.length : all.filter(r => r.type === k).length;
  const shown = all.filter(r => inboxFilter === 'all' ? true : inboxFilter === 'novo' ? r.status === 'novo' : r.type === inboxFilter);
  const who = r => { const uu = r.user && USERS[r.user]; return uu ? `${esc(uu.name)} (${esc(uu.username)})` : esc(r.fields?.name || r.fields?.person || T('Visitante sem conta', 'Guest')); };
  const card = r => `<article class="req${r.status === 'novo' ? ' is-new' : ''}">
    <div class="row-between"><div class="row-gap"><span class="rtype t-${r.type}">${types[r.type] || r.type}</span><b>${r.id}</b>${r.order ? `<span class="small">${T('Encomenda', 'Order')} ${r.order}</span>` : ''}${r.approved ? `<span class="status ativa">${T('Aprovado', 'Approved')}</span>` : ''}</div>
      <span class="small muted">${fdate(r.created, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></div>
    <p class="small mt-s">${T('De', 'From')}: ${who(r)}</p>
    <dl class="req-f">${Object.entries(r.fields || {}).map(([k, v]) => `<div><dt>${esc(labels[k] || k)}</dt><dd>${k === 'photo' && /^https?:\/\//.test(v) ? `<a href="${esc(v)}" target="_blank" rel="noopener"><img class="req-photo" src="${esc(v)}" alt="${T('Fotografia da incidência', 'Problem photo')}"></a>` : esc(reqValue(k, v))}</dd></div>`).join('')}</dl>
    <div class="row-btns">${canApprove(r) ? `<button class="btn btn-green btn-sm" data-approve="${r.id}">${icon('check', 16)}${approveLabel(r)}</button>` : ''}
      <button class="btn btn-line btn-sm ${r.status === 'novo' ? 'c-campo' : ''}" data-req-toggle="${r.id}">${r.status === 'novo' ? T('Marcar como tratado', 'Mark as handled') : T('Reabrir', 'Reopen')}</button></div></article>`;
  return `<section class="acc-sec"><h2>${T('Pedidos e avisos', 'Requests and alerts')}</h2>
    <p class="muted mt-s">${T('Tudo o que é submetido no site: pedidos de selo, adesões de agricultores e restaurantes, propostas de produtos e de dias Colhe Connosco, incidências, gestão e seguimento de encomendas, mensagens e membros fundadores.', 'Everything submitted on the site: seal and farmer applications, product and Join the Harvest proposals, problem reports, order management and tracking, messages and founding members.')}</p>
    <div class="chips mt-s mb-s" role="group" aria-label="${T('Filtrar pedidos', 'Filter requests')}">${[['novo', T('Novos', 'New')], ['all', T('Todos', 'All')], ...Object.entries(types)].map(([k, n]) => `<button class="chip" data-inbox="${k}" aria-pressed="${inboxFilter === k}">${n} <span class="small muted">${counts(k)}</span></button>`).join('')}</div>
    <div class="inbox">${shown.length ? shown.map(card).join('') : `<p class="muted">${T('Nada por tratar aqui.', 'Nothing to handle here.')}</p>`}</div></section>`;
}
function uniqueId(base, list) { let id = slugify(base) || 'novo', n = 2; while (list.some(x => x.id === id)) id = `${slugify(base)}-${n++}`; return id; }
function approveRequest(r) {
  const u = USERS[r.partnerUser], f = r.fields || {};
  if (r.type === 'agricultor') {
    const id = uniqueId(u.partner.farm, FARMERS), c = REGION_CENTER[u.partner.region] || REGION_CENTER.aveiro, j = () => (Math.random() - .5) * .3;
    const nf = { id, name: u.name, farm: u.partner.farm, place: u.partner.place, region: u.partner.region, lat: +(c[0] + j()).toFixed(3), lon: +(c[1] + j()).toFixed(3), since: new Date().getFullYear(), crop: 'alface', seed: Math.floor(Math.random() * 14),
      story: u.partner.story || { pt: `${u.partner.farm}, em ${u.partner.place}. Nova quinta parceira da Daqui.`, en: `${u.partner.farm} in ${u.partner.place}. A new Daqui partner farm.` } };
    if (u.partner.region === 'madeira') nf.island = 'madeira';
    saveCatalog(ch => { ch.newFarmers = (ch.newFarmers || []).concat(nf); }); u.partner.farmerId = id; u.partner.approved = true;
  } else if (r.type === 'selo') {
    const id = uniqueId(u.partner.name, RESTAURANTS), y = new Date();
    const nr = { id, name: u.partner.name, lat: +(40.637 + Math.random() * .009).toFixed(4), lon: +(-8.659 + Math.random() * .013).toFixed(4), kind: { pt: u.partner.kind2 || 'Restaurante', en: u.partner.kind2 || 'Restaurant' }, area: { pt: u.partner.place, en: u.partner.place }, dish: { pt: 'Em breve', en: 'Coming soon' }, since: `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}` };
    Object.assign(nr, u.partner.draft || {}); delete u.partner.draft;
    saveCatalog(ch => { ch.newRestaurants = (ch.newRestaurants || []).concat(nr); }); u.partner.restId = id; u.partner.approved = true;
  } else if (r.type === 'produto') {
    if (!u.partner.farmerId) { toast(T('Aprove primeiro a quinta deste agricultor.', 'Approve this farmer\'s farm first.')); return false; }
    const [a, b] = String(f.season || '1-12').split('-').map(Number), id = uniqueId(f.namePt, PRODUCTS);
    const np = { id, cat: f.cat === 'legumes' ? 'legumes' : 'fruta', name: { pt: f.namePt, en: f.nameEn || f.namePt }, price: +f.price || 1, unit: f.unit || 'kg', farmer: u.partner.farmerId, icon: '_novo', season: [a || 1, b || 12], harvest: 2, essential: false, organic: false, desc: { pt: f.desc || '', en: f.descEn || f.desc || '' } };
    saveCatalog(ch => { ch.newProducts = (ch.newProducts || []).concat(np); }); r.productId = id;
  } else if (r.type === 'colhe') {
    if (!u.partner.farmerId) { toast(T('Aprove primeiro a quinta deste agricultor.', 'Approve this farmer\'s farm first.')); return false; }
    const p = P(f.product); const day = { date: f.date, farmer: u.partner.farmerId, crop: p ? (p.art || 'alface') : 'alface', what: p ? { pt: p.name.pt, en: p.name.en } : { pt: f.product, en: f.product }, time: f.time || '10h–13h', spots: +f.spots || 20 };
    saveCatalog(ch => { ch.harvestDays = HARVEST_DAYS.map(d => Object.assign({}, d)).concat(day); });
  }
  r.approved = true; r.status = 'tratado'; saveUsers(); saveRequests(); return true;
}

/* ---------- Encomendas ---------- */
function tabEncomendas() {
  const orders = ORDERS.slice().sort((a, b) => b.created.localeCompare(a.created)), stages = [...STAGES()];
  const val = o => o.status === 'cancelada' ? 'cancel' : typeof o.stage === 'number' ? String(o.stage) : 'auto';
  const auto = o => { const x = Object.assign({}, o, { stage: undefined, status: 'ativa' }); return stageName(x); };
  return `<section class="acc-sec"><h2>${T('Encomendas', 'Orders')}</h2>
    <p class="muted mt-s mb-s">${T('O estado muda sozinho conforme o dia de entrega ("Automático"). Pode também escolher o estado à mão: o cliente vê-o no seguimento e no histórico.', 'The status changes by itself according to the delivery day ("Automatic"). You can also set it by hand: the customer sees it in tracking and in their history.')}</p>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>${T('Número', 'Number')}</th><th>${T('Cliente', 'Customer')}</th><th>${T('Entrega', 'Delivery')}</th><th>${T('Artigos', 'Items')}</th><th>Total</th><th>${T('Estado', 'Status')}</th></tr></thead><tbody>
    ${orders.map(o => `<tr><td><b>${o.num}</b><br><span class="small muted">${fdate(o.created)}</span></td><td>${esc(o.name)}${o.user ? '' : ` <span class="small muted">(${T('sem conta', 'guest')})</span>`}<br><span class="small muted">${esc(o.phone)}</span></td>
      <td>${o.deliver === 'home' ? `${T('Casa', 'Home')}: ${esc(o.address)}` : esc(o.point)}<br><span class="small muted">${slotLabel(o.slot)}${o.window ? ', ' + o.window : ''}</span></td>
      <td class="small">${o.items.map(i => `${i.qty} × ${esc(P(i.id) ? L(P(i.id).name) : i.id)}${i.size ? ` (${sizeName(i.size)})` : ''}`).join('<br>')}${boxPrefs(o)}</td><td>${money(o.total)}</td>
      <td><label class="sr" for="os-${o.num}">${T('Estado de', 'Status of')} ${o.num}</label><select id="os-${o.num}" class="sel sm" data-order-stage="${o.num}">
        <option value="auto"${val(o) === 'auto' ? ' selected' : ''}>${T('Automático', 'Automatic')} (${auto(o)})</option>${stages.map((n, i) => `<option value="${i}"${val(o) === String(i) ? ' selected' : ''}>${o.deliver === 'home' ? n : STAGES_PICK()[i]}</option>`).join('')}<option value="cancel"${val(o) === 'cancel' ? ' selected' : ''}>${T('Cancelada', 'Cancelled')}</option></select></td></tr>`).join('')}
    </tbody></table></div></section>`;
}

/* preferências do cliente nas encomendas com caixas: as guardadas na encomenda ou, se não houver, as atuais da conta */
function prefsLines(prefs) {
  const names = l => (l || []).map(P).filter(Boolean).map(p => esc(L(p.name))).join(', ');
  const ex = names(prefs.exclude), fv = names(prefs.favs);
  return `<div class="prefs-mini"><span class="c-tomato"><b>${T('Não incluir', 'Leave out')}:</b> ${ex || T('nada', 'nothing')}</span><br><span><b>${T('Favoritos', 'Favourites')}:</b> ${fv || T('nenhum', 'none')}</span></div>`;
}
function boxPrefs(o) {
  if (!o.items.some(i => P(i.id) && P(i.id).cat === 'caixas')) return '';
  const u = o.user && USERS[o.user], prefs = o.prefs || (u ? { exclude: u.exclude, favs: u.favs } : null);
  return prefs ? prefsLines(prefs) : `<div class="prefs-mini muted">${T('Cliente sem conta: sem preferências', 'Guest customer: no preferences')}</div>`;
}

/* ---------- Catálogo ---------- */
function catRows() {
  const q = norm(catQuery), ch = NUVEM.on ? {} : LOCAL_CHANGES.products || {}, newIds = NUVEM.on ? PRODUCTS.filter(p => p.isNew).map(p => p.id) : (LOCAL_CHANGES.newProducts || []).map(x => x.id);
  return PRODUCTS.filter(p => p.cat !== 'caixas').filter(p => !q || norm(`${p.name.pt} ${p.name.en} ${p.id}`).includes(q))
    .filter(p => catFilter === 'all' || p.cat === catFilter || (catFilter === 'changed' && (ch[p.id] || newIds.includes(p.id))) || (catFilter === 'nostock' && p.outOfStock))
    .map(p => { const [a, b] = p.season, sp = splitOf(p), changed = ch[p.id] || newIds.includes(p.id);
      return `<tr data-row="${p.id}"><td><div class="row-gap nowrap"><span class="thumb">${artFor(p)}</span><span><a href="${productHref(p)}">${esc(L(p.name))}</a><br><span class="small muted">${p.id}${changed ? ` · <b class="c-campo">${T('alterado', 'edited')}</b>` : ''}${p.isNew ? ` · ${T('novo', 'new')}` : ''}</span></span></div></td>
        <td><input class="num" type="number" step="0.01" min="0" value="${p.price}" data-cat-edit="${p.id}" data-f="price" aria-label="${T('Preço de', 'Price of')} ${esc(L(p.name))}"><span class="small muted">${unitLabel(p.unit)}</span></td>
        <td class="nowrap"><select class="sel sm" data-cat-edit="${p.id}" data-f="s0" aria-label="${T('Início da época', 'Season start')}">${monthOpts(a)}</select> – <select class="sel sm" data-cat-edit="${p.id}" data-f="s1" aria-label="${T('Fim da época', 'Season end')}">${monthOpts(b)}</select></td>
        <td class="nowrap">${['sp0', 'sp1', 'sp2'].map((f, i) => `<input class="num pct" type="number" min="0" max="100" value="${sp[i]}" data-cat-edit="${p.id}" data-f="${f}" aria-label="${[T('Agricultor', 'Farmer'), T('Conservação e embalamento', 'Storage and packing'), 'Daqui'][i]} %">`).join('')}</td>
        <td><label class="switch sm"><input type="checkbox" data-cat-edit="${p.id}" data-f="stock"${p.outOfStock ? ' checked' : ''}>${T('Fora de stock', 'Out of stock')}</label>${inSeason(p) ? '' : `<br><span class="small muted">${T('fora de época', 'out of season')}</span>`}</td>
        <td>${newIds.includes(p.id) ? `<button class="rm" data-del-prod="${p.id}" aria-label="${T('Apagar', 'Delete')} ${esc(L(p.name))}">${icon('trash', 18)}</button>` : ''}</td></tr>`; }).join('');
}
function tabCatalogo() {
  const icons = PRODUCTS.filter(p => !p.isNew).map(p => p.id).sort();
  return `<section class="acc-sec"><h2>${T('Catálogo de produtos', 'Product catalogue')}</h2>
    <p class="muted mt-s">${T('Altere preços, meses da época, a divisão do preço (agricultor / conservação e embalamento / Daqui, a somar 100%) e marque produtos da época como fora de stock. Cada alteração é aplicada logo no site, neste navegador.', 'Change prices, season months, the price split (farmer / storage and packing / Daqui, adding up to 100%) and mark in-season products as out of stock. Every change applies to the site straight away, in this browser.')}</p>
    <details class="panel mt"><summary class="lbl">${icon('plus', 18)} ${T('Adicionar produto novo', 'Add a new product')}</summary>
      <form class="form mt-s" data-newprod novalidate>
        <div class="row"><div class="field"><label for="np-pt">${T('Nome em português', 'Name in Portuguese')}</label><input id="np-pt" required></div><div class="field"><label for="np-en">${T('Nome em inglês', 'Name in English')}</label><input id="np-en" required></div></div>
        <div class="row"><div class="field"><label for="np-cat">${T('Categoria', 'Category')}</label><select id="np-cat"><option value="fruta">${T('Fruta', 'Fruit')}</option><option value="legumes">${T('Legumes', 'Vegetables')}</option></select></div>
          <div class="field"><label for="np-farmer">${T('Agricultor', 'Farmer')}</label><select id="np-farmer">${FARMERS.map(f => `<option value="${f.id}">${esc(f.name)} (${esc(f.place)})</option>`).join('')}</select></div></div>
        <div class="row"><div class="field"><label for="np-price">${T('Preço (€)', 'Price (€)')}</label><input id="np-price" type="number" step="0.01" min="0" required></div><div class="field"><label for="np-unit">${T('Unidade', 'Unit')}</label><select id="np-unit">${UNIT_OPTS('kg')}</select></div></div>
        <div class="row"><div class="field"><label for="np-s0">${T('Época: de', 'Season: from')}</label><select id="np-s0">${monthOpts(1)}</select></div><div class="field"><label for="np-s1">${T('até', 'to')}</label><select id="np-s1">${monthOpts(12)}</select></div></div>
        <div class="row"><div class="field"><label for="np-icon">${T('Ícone (ficheiro em img/produtos)', 'Icon (file in img/produtos)')}</label><select id="np-icon"><option value="_novo">${T('Provisório', 'Placeholder')} (_novo.svg)</option>${icons.map(i => `<option value="${i}">${i}.svg</option>`).join('')}</select></div>
          <div class="field"><span class="lbl">${T('Etiquetas', 'Tags')}</span><label class="switch sm"><input type="checkbox" id="np-ess">${T('Essencial', 'Essential')}</label><label class="switch sm"><input type="checkbox" id="np-bio">${T('Biológico', 'Organic')}</label></div></div>
        <div class="row"><div class="field"><label for="np-dpt">${T('Descrição em português', 'Description in Portuguese')}</label><textarea id="np-dpt" rows="2"></textarea></div><div class="field"><label for="np-den">${T('Descrição em inglês', 'Description in English')}</label><textarea id="np-den" rows="2"></textarea></div></div>
        <p class="err" hidden></p><button class="btn btn-green" type="submit">${T('Adicionar ao catálogo', 'Add to catalogue')}</button>
      </form></details>
    <div class="row-gap mt mb-s"><label class="sr" for="cat-q">${T('Procurar produto', 'Find a product')}</label><input id="cat-q" class="sel" type="search" placeholder="${T('Procurar produto…', 'Find a product…')}" value="${esc(catQuery)}" data-catq>
      <label class="sr" for="cat-f">${T('Filtro', 'Filter')}</label><select id="cat-f" class="sel" data-catf>${[['all', T('Todos', 'All')], ['fruta', T('Fruta', 'Fruit')], ['legumes', T('Legumes', 'Vegetables')], ['changed', NUVEM.on ? T('Produtos novos', 'New products') : T('Alterados neste navegador', 'Edited in this browser')], ['nostock', T('Fora de stock', 'Out of stock')]].map(([v, n]) => `<option value="${v}"${catFilter === v ? ' selected' : ''}>${n}</option>`).join('')}</select></div>
    <div class="tbl-wrap"><table class="tbl cat-tbl"><thead><tr><th>${T('Produto', 'Product')}</th><th>${T('Preço (€)', 'Price (€)')}</th><th>${T('Época', 'Season')}</th><th>${T('Divisão do preço (%)', 'Price split (%)')}<br><span class="small muted">${T('agricultor / frio / Daqui', 'farmer / cold / Daqui')}</span></th><th>Stock</th><th></th></tr></thead><tbody id="cat-body">${catRows()}</tbody></table></div></section>`;
}

/* ---------- Caixas ---------- */
function tabCaixas() {
  const subsOf = id => Object.values(USERS).flatMap(c => (c.subs || []).filter(s => s.box === id).map(s => ({ c, s })));
  return `<section class="acc-sec"><h2>${T('Caixas e preços das subscrições', 'Boxes and subscription prices')}</h2>
    <p class="muted mt-s">${T('Mude o preço atual de cada tamanho para testar o preço garantido: se subir, os subscritores continuam a pagar o preço guardado; se descer, passam a pagar o mais baixo e esse fica guardado.', 'Change the current price of each size to test the price guarantee: if it goes up, subscribers keep paying their saved price; if it goes down, they pay the lower price and it becomes their saved price.')}</p>
    ${BOXES.map(b => { const list = subsOf(b.id); return `<div class="box-row">
      <div class="row-gap"><span class="thumb lg">${artFor(b)}</span><h3>${esc(L(b.name))}</h3></div>
      <div class="row-gap mt-s">${BOX_SIZES[b.id].map(s => `<label class="field inl"><span class="lbl">${sizeName(s.s)}, ${s.kg} kg (€)</span><input class="num" type="number" step="0.10" min="0" value="${s.price}" data-box-price="${b.id}:${s.s}"></label>`).join('')}</div>
      ${list.length ? `<table class="tbl mt-s"><thead><tr><th>${T('Subscritor', 'Subscriber')}</th><th>${T('Tamanho', 'Size')}</th><th>${T('Preço guardado', 'Saved price')}</th><th>${T('Preço atual', 'Current price')}</th><th>${T('Paga por caixa', 'Pays per box')}</th></tr></thead><tbody>${list.map(({ c, s }) => { refreshSub(s); const cur = boxCurrentPrice(s.box, s.size); return `<tr><td>${esc(c.name)}</td><td>${sizeName(s.size)}</td><td>${money(s.locked)}</td><td>${money(cur)}</td><td><b>${money(Math.min(cur, s.locked))}</b>${cur > s.locked ? ` <span class="small muted">(${T('poupa', 'saves')} ${money(cur - s.locked)})</span>` : ''}</td></tr>`; }).join('')}</tbody></table>` : `<p class="small muted mt-s">${T('Sem subscritores.', 'No subscribers.')}</p>`}
    </div>`; }).join('')}</section>`;
}

/* ---------- Colhe Connosco ---------- */
function tabColhe() {
  const f0 = FARMERS[0];
  const prodOpts = fid => PRODUCTS.filter(p => p.farmer === fid).map(p => `<option value="${p.id}">${esc(L(p.name))}</option>`).join('');
  return `<section class="acc-sec"><h2>${JTH()}</h2>
    <p class="muted mt-s mb-s">${T('Altere o número máximo de participantes, apague dias ou crie dias novos numa quinta parceira.', 'Change the maximum number of participants, delete days or create new days on a partner farm.')}</p>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>${T('Dia', 'Day')}</th><th>${T('Quinta e produto', 'Farm and produce')}</th><th>${T('Horário', 'Time')}</th><th>${T('Máximo', 'Maximum')}</th><th>${T('Inscritos', 'Signed up')}</th><th></th></tr></thead><tbody>
    ${HARVEST_DAYS.map(d => { const f = F(d.farmer), list = harvestList(d.date), n = harvestPeople(d.date); return `<tr><td>${slotLabel(d.date)}</td><td>${f ? esc(f.farm) : d.farmer}<br><span class="small muted">${esc(L(d.what))}</span></td><td>${d.time}</td>
      <td><input class="num" type="number" min="${n}" value="${d.spots}" data-day-spots="${d.date}" aria-label="${T('Máximo de participantes', 'Maximum participants')}"></td>
      <td>${n}${list.length ? `<details><summary class="small link">${T('ver lista', 'see list')}</summary><ul class="small plain-ul">${list.map(x => `<li>${esc(x.user.name)}, ${esc(x.user.phone)} (${x.people})</li>`).join('')}</ul></details>` : ''}</td>
      <td><button class="rm" data-day-del="${d.date}" aria-label="${T('Apagar dia', 'Delete day')}">${icon('trash', 18)}</button></td></tr>`; }).join('')}</tbody></table></div>
    <form class="form panel mt" data-newday novalidate><h3>${T('Adicionar dia', 'Add a day')}</h3>
      <div class="row"><div class="field"><label for="nd-date">${T('Data', 'Date')}</label><input id="nd-date" type="date" min="${iso(today())}" required></div>
        <div class="field"><label for="nd-time">${T('Horário', 'Time')}</label><select id="nd-time">${TIME_OPTS.map(t => `<option>${t}</option>`).join('')}</select></div></div>
      <div class="row"><div class="field"><label for="nd-farm">${T('Quinta', 'Farm')}</label><select id="nd-farm" data-nd-farm>${FARMERS.map(f => `<option value="${f.id}">${esc(f.farm)} (${esc(f.name)})</option>`).join('')}</select></div>
        <div class="field"><label for="nd-prod">${T('Produto a colher', 'Produce to pick')}</label><select id="nd-prod">${prodOpts(f0.id)}</select></div></div>
      <div class="field"><label for="nd-spots">${T('Máximo de participantes', 'Maximum participants')}</label><input id="nd-spots" type="number" min="1" value="30" required></div>
      <p class="err" hidden></p><button class="btn btn-green" type="submit">${T('Criar dia', 'Create day')}</button></form></section>`;
}

/* ---------- Subscrições ---------- */
function tabSubs() {
  const subs = Object.values(USERS).filter(x => x.role !== 'admin').flatMap(c => (c.subs || []).map(s => ({ c, s })));
  return `<section class="acc-sec"><h2 class="mb-s">${T('Todas as subscrições', 'All subscriptions')}</h2>
    ${subs.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>${T('Cliente', 'Customer')}</th><th>${T('Caixa', 'Box')}</th><th>${T('Tamanho', 'Size')}</th><th>${T('Frequência', 'Frequency')}</th><th>${T('Preço guardado', 'Saved price')}</th><th>${T('Estado', 'Status')}</th><th>${T('Preferências', 'Preferences')}</th></tr></thead><tbody>${subs.map(({ c, s }) => { refreshSub(s); return `<tr><td>${esc(c.name)}</td><td>${esc(L(P(s.box).name))}</td><td>${sizeName(s.size)}</td><td>${freqName(s.freq)}</td><td>${money(s.locked)}</td><td>${s.status === 'ativa' ? T('Ativa', 'Active') : T('Pausada', 'Paused')}</td><td class="small">${prefsLines({ exclude: c.exclude, favs: c.favs })}</td></tr>`; }).join('')}</tbody></table></div>` : `<p class="muted">${T('Sem subscrições.', 'No subscriptions.')}</p>`}</section>`;
}

/* ---------- Contas ---------- */
const ROLE_NAMES = () => ({ cliente: T('Cliente', 'Customer'), agricultor: T('Agricultor', 'Farmer'), restaurante: T('Restaurante', 'Restaurant'), admin: T('Gestão', 'Management') });
function tabContas() {
  const all = Object.values(USERS).sort((a, b) => (a.role + a.username).localeCompare(b.role + b.username)), roles = ROLE_NAMES();
  const shown = all.filter(u => accFilter === 'all' || u.role === accFilter || (accFilter === 'pendente' && u.partner && !u.partner.approved));
  const partnerOf = u => !u.partner ? '' : u.partner.kind === 'agricultor' ? (u.partner.farmerId && F(u.partner.farmerId) ? `<a href="${farmerHref(F(u.partner.farmerId))}">${esc(F(u.partner.farmerId).farm)}</a>` : esc(u.partner.farm || '')) : esc(u.partner.name || '');
  return `<section class="acc-sec"><h2>${T('Contas', 'Accounts')}</h2>
    <p class="muted mt-s">${NUVEM.on ? T('Todas as contas da base de dados. Cada quinta e cada restaurante tem a sua conta de parceiro. Para dar acesso de gestão a uma conta, veja o LEIA-ME (secção Supabase).', 'Every account in the database. Each farm and restaurant has its own partner account. To give an account management access, see the README (Supabase section).') : T('Contas guardadas neste navegador.', 'Accounts stored in this browser.')}</p>
    <div class="chips mt-s mb-s" role="group" aria-label="${T('Filtrar contas', 'Filter accounts')}">${[['all', T('Todas', 'All')], ...Object.entries(roles), ['pendente', T('Parceiros por aprovar', 'Partners to approve')]].map(([k, n]) => `<button class="chip" data-acc-filter="${k}" aria-pressed="${accFilter === k}">${n} <span class="small muted">${k === 'all' ? all.length : k === 'pendente' ? all.filter(u => u.partner && !u.partner.approved).length : all.filter(u => u.role === k).length}</span></button>`).join('')}</div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>${T('Nome', 'Name')}</th><th>${T('Utilizador e contactos', 'Username and contacts')}</th><th>${T('Tipo', 'Type')}</th><th>${T('Quinta ou restaurante', 'Farm or restaurant')}</th><th>${T('Atividade', 'Activity')}</th></tr></thead><tbody>
    ${shown.map(u => { const nOrd = ORDERS.filter(o => o.user === u.username).length, nSub = (u.subs || []).filter(s => s.status === 'ativa').length, nH = (u.harvests || []).length;
      return `<tr><td><b>${esc(u.name)}</b><br><span class="small muted">${T('desde', 'since')} ${fdate(u.created)}</span></td><td>${esc(u.username)}<br><span class="small muted">${esc(u.phone)}${u.email && !u.email.endsWith('@' + SEED_DOMAIN) ? ', ' + esc(u.email) : ''}</span></td>
        <td>${roles[u.role] || u.role}${u.partner ? `<br><span class="status ${u.partner.approved ? 'ativa' : 'prog'}">${u.partner.approved ? T('Aprovado', 'Approved') : T('Por aprovar', 'To approve')}</span>` : ''}</td><td>${partnerOf(u)}</td>
        <td class="small">${nOrd} ${T('encomendas', 'orders')}<br>${nSub} ${T('subscrições ativas', 'active subscriptions')}<br>${nH} ${T('inscrições Colhe Connosco', 'Join the Harvest sign-ups')}</td></tr>`; }).join('')}
    </tbody></table></div></section>`;
}

/* ---------- Exportar ---------- */
function tabExportar() {
  if (NUVEM.on) return `<section class="acc-sec"><h2>${T('Base de dados', 'Database')}</h2>
    <div class="prose mt-s"><p>${T('O site está ligado à base de dados Supabase. Tudo o que muda neste painel, nas contas e nas áreas de parceiro fica guardado logo, para toda a gente e em todos os dispositivos.', 'The site is connected to the Supabase database. Everything changed in this panel, in accounts and in partner areas is saved straight away, for everyone and on every device.')}</p>
      <p>${T('A versão sem base de dados (por exemplo no OnionShare) usa o ficheiro <code>js/alteracoes.js</code>. Para que mostre o catálogo atual, descarregue o ficheiro e substitua o da pasta do site.', 'The version without a database (for example on OnionShare) uses <code>js/alteracoes.js</code>. To make it show the current catalogue, download the file and replace the one in the site folder.')}</p></div>
    <div class="row-btns mt-s"><button class="btn btn-green" data-export-dl>${icon('box', 18)}${T('Descarregar alteracoes.js', 'Download alteracoes.js')}</button><button class="btn btn-line c-campo" data-export-copy>${T('Copiar o código', 'Copy the code')}</button></div>
    <label class="sr" for="export-code">${T('Código do ficheiro', 'File code')}</label><textarea id="export-code" class="code mt-s" rows="8" readonly>${esc(exportChangesFile())}</textarea></section>`;
  const n = catalogChangeCount();
  return `<section class="acc-sec"><h2>${T('Guardar as alterações no site', 'Save changes to the site')}</h2>
    <div class="prose mt-s">
      <p>${T('As alterações feitas neste painel ficam guardadas <b>neste navegador</b>. Não mudam os ficheiros do site: se abrir o site noutro navegador ou computador, ou se partilhar a pasta, elas não aparecem.', 'Changes made in this panel are stored <b>in this browser</b>. They don\'t change the site\'s files: in another browser or computer, or if you share the folder, they won\'t appear.')}</p>
      <p>${T('Para as tornar permanentes, descarregue o ficheiro <code>alteracoes.js</code> e substitua com ele o ficheiro <code>js/alteracoes.js</code> da pasta do site. A partir daí, as alterações fazem parte do site para toda a gente.', 'To make them permanent, download <code>alteracoes.js</code> and use it to replace <code>js/alteracoes.js</code> in the site folder. From then on, the changes are part of the site for everyone.')}</p>
      <p class="small muted">${T('Inclui: preços, épocas, stock, divisão do preço, produtos novos, preços das caixas, dias do Colhe Connosco, quintas e restaurantes aprovados e os perfis editados pelos parceiros. Contas, encomendas e pedidos são dados dos utilizadores e não entram no ficheiro (precisariam de um servidor).', 'Includes: prices, seasons, stock, price split, new products, box prices, Join the Harvest days, approved farms and restaurants and profiles edited by partners. Accounts, orders and requests are user data and are not in the file (they would need a server).')}</p></div>
    <p class="mt"><b>${n}</b> ${T('alterações neste navegador que ainda não estão no ficheiro.', 'changes in this browser not yet in the file.')}</p>
    <div class="row-btns mt-s"><button class="btn btn-green" data-export-dl>${icon('box', 18)}${T('Descarregar alteracoes.js', 'Download alteracoes.js')}</button><button class="btn btn-line c-campo" data-export-copy>${T('Copiar o código', 'Copy the code')}</button></div>
    <label class="sr" for="export-code">${T('Código do ficheiro', 'File code')}</label><textarea id="export-code" class="code mt-s" rows="10" readonly>${esc(exportChangesFile())}</textarea>
    <h3 class="mt-l">${T('Desfazer', 'Undo')}</h3>
    <div class="row-btns mt-s"><button class="btn btn-line btn-sm c-tomato" data-catalog-reset>${T('Desfazer as alterações ao catálogo deste navegador', 'Undo this browser\'s catalogue changes')}</button><button class="btn btn-line btn-sm c-tomato" data-reset-demo>${T('Repor contas, encomendas e pedidos de demonstração', 'Reset demo accounts, orders and requests')}</button></div></section>`;
}

/* ---------- eventos do painel ---------- */
const adminOnly = () => PAGE === 'conta' && currentUser()?.role === 'admin';
PAGE_EVENTS.click.push((e, t, d) => {
  if (!adminOnly()) return;
  if (d.adminTab) { adminTab = d.adminTab; rerenderKeep(`[data-admin-tab="${d.adminTab}"]`); return true; }
  if (d.accFilter) { accFilter = d.accFilter; rerenderKeep(`[data-acc-filter="${d.accFilter}"]`); return true; }
  if (d.inbox) { inboxFilter = d.inbox; rerenderKeep(`[data-inbox="${d.inbox}"]`); return true; }
  if (d.reqToggle) { const r = REQUESTS.find(x => x.id === d.reqToggle); r.status = r.status === 'novo' ? 'tratado' : 'novo'; saveRequests(); rerenderKeep(); return true; }
  if (d.approve) { const r = REQUESTS.find(x => x.id === d.approve); if (approveRequest(r)) toast(T('Aprovado e publicado no site', 'Approved and published on the site')); rerenderKeep(); return true; }
  if (d.delProd && NUVEM.on) { NUVEM.deleteProduct(d.delProd); const i = PRODUCTS.findIndex(p => p.id === d.delProd); if (i >= 0) PRODUCTS.splice(i, 1); toast(T('Produto apagado', 'Product deleted')); rerenderKeep(); return true; }
  if (d.delProd) { saveCatalog(ch => { ch.newProducts = (ch.newProducts || []).filter(x => x.id !== d.delProd); if (ch.products) delete ch.products[d.delProd]; }); const i = PRODUCTS.findIndex(p => p.id === d.delProd); if (i >= 0 && !(SAVED_CHANGES.newProducts || []).some(x => x.id === d.delProd)) PRODUCTS.splice(i, 1); toast(T('Produto apagado', 'Product deleted')); rerenderKeep(); return true; }
  if (d.dayDel) { const n = harvestPeople(d.dayDel); if (n && !t.dataset.confirm) { t.dataset.confirm = '1'; toast(T(`Este dia tem ${n} inscritos. Carregue outra vez para apagar.`, `This day has ${n} people signed up. Click again to delete.`)); return true; }
    saveCatalog(ch => { ch.harvestDays = HARVEST_DAYS.filter(x => x.date !== d.dayDel).map(x => Object.assign({}, x)); }); toast(T('Dia apagado', 'Day deleted')); rerenderKeep(); return true; }
  if ('exportDl' in d) { const blob = new Blob([exportChangesFile()], { type: 'text/javascript' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'alteracoes.js'; document.body.appendChild(a); a.click(); a.remove(); toast(T('Ficheiro descarregado: substitua js/alteracoes.js', 'File downloaded: replace js/alteracoes.js')); return true; }
  if ('exportCopy' in d) { const ta = $('#export-code'); ta.select(); try { navigator.clipboard.writeText(ta.value).then(() => toast(T('Código copiado', 'Code copied')), () => { document.execCommand('copy'); toast(T('Código copiado', 'Code copied')); }); } catch (err) { document.execCommand('copy'); toast(T('Código copiado', 'Code copied')); } return true; }
  if ('catalogReset' in d) { resetCatalog(); location.reload(); return true; }
  if ('resetDemo' in d) { resetDemo(); store.set(SESSION_KEY, 'gestao'); toast(T('Dados de demonstração repostos', 'Demo data reset')); rerenderKeep(); return true; }
});
PAGE_EVENTS.change.push((e, t) => {
  if (!adminOnly()) return;
  const d = t.dataset;
  if (d.orderStage) { const o = findOrder(d.orderStage); if (t.value === 'cancel') { o.status = 'cancelada'; delete o.stage; } else { o.status = 'ativa'; if (t.value === 'auto') delete o.stage; else o.stage = +t.value; } saveOrders(); toast(`${o.num}: ${stageName(o)}`); return; }
  if (d.catEdit) {
    const id = d.catEdit, p = P(id), row = t.closest('tr');
    if (d.f === 'price') { const v = Math.max(0, +t.value || 0); saveCatalog(ch => { ch.products = ch.products || {}; ch.products[id] = Object.assign(ch.products[id] || {}, { price: +v.toFixed(2) }); }); toast(T(`Preço de ${L(p.name)}: ${money(v)}`, `${L(p.name)} price: ${money(v)}`)); }
    if (d.f === 's0' || d.f === 's1') { const a = +$('[data-f="s0"]', row).value, b = +$('[data-f="s1"]', row).value; saveCatalog(ch => { ch.products = ch.products || {}; ch.products[id] = Object.assign(ch.products[id] || {}, { season: [a, b] }); }); toast(T(`Época de ${L(p.name)}: ${monthName(a, 'short')}–${monthName(b, 'short')}`, `${L(p.name)} season: ${monthName(a, 'short')}–${monthName(b, 'short')}`)); }
    if (d.f.startsWith('sp')) { const sp = ['sp0', 'sp1', 'sp2'].map(k => Math.round(+$(`[data-f="${k}"]`, row).value || 0)); const sum = sp.reduce((x, y) => x + y, 0);
      $$('.pct', row).forEach(i => i.toggleAttribute('aria-invalid', sum !== 100));
      if (sum !== 100) { toast(T(`A soma dá ${sum}%: tem de dar 100%`, `The total is ${sum}%: it must be 100%`)); return; }
      saveCatalog(ch => { ch.products = ch.products || {}; ch.products[id] = Object.assign(ch.products[id] || {}, { split: sp }); }); toast(T(`Divisão de ${L(p.name)}: ${sp.join(' / ')}`, `${L(p.name)} split: ${sp.join(' / ')}`)); }
    if (d.f === 'stock') { saveCatalog(ch => { ch.products = ch.products || {}; ch.products[id] = Object.assign(ch.products[id] || {}, { outOfStock: t.checked }); }); toast(t.checked ? T(`${L(p.name)}: fora de stock`, `${L(p.name)}: out of stock`) : T(`${L(p.name)}: com stock`, `${L(p.name)}: in stock`)); }
    return;
  }
  if (d.catf !== undefined && t.id === 'cat-f') { catFilter = t.value; $('#cat-body').innerHTML = catRows(); return; }
  if (d.boxPrice) { const [id, sz] = d.boxPrice.split(':'), v = Math.max(0, +t.value || 0); saveCatalog(ch => { ch.boxes = ch.boxes || {}; ch.boxes[id] = Object.assign(ch.boxes[id] || {}, { [sz]: +v.toFixed(2) }); }); Object.values(USERS).forEach(c => (c.subs || []).forEach(sb => refreshSub(sb))); saveUsers(); toast(T('Preço da caixa atualizado', 'Box price updated')); rerenderKeep(`[data-box-price="${d.boxPrice}"]`); return; }
  if (d.daySpots) { const v = Math.max(+t.min || 1, +t.value || 1); saveCatalog(ch => { ch.harvestDays = HARVEST_DAYS.map(x => Object.assign({}, x, x.date === d.daySpots ? { spots: v } : {})); }); toast(T(`Máximo de participantes: ${v}`, `Maximum participants: ${v}`)); return; }
  if (d.ndFarm !== undefined && t.id === 'nd-farm') { $('#nd-prod').innerHTML = PRODUCTS.filter(p => p.farmer === t.value).map(p => `<option value="${p.id}">${esc(L(p.name))}</option>`).join(''); return; }
});
PAGE_EVENTS.input.push((e, t) => { if (adminOnly() && t.id === 'cat-q') { catQuery = t.value; $('#cat-body').innerHTML = catRows(); } });
PAGE_EVENTS.submit.push((e, f) => {
  if (!adminOnly()) return;
  if (f.matches('[data-newprod]')) {
    e.preventDefault(); if (!validate(f)) return true;
    const id = uniqueId($('#np-pt').value, PRODUCTS);
    const np = { id, cat: $('#np-cat').value, name: { pt: $('#np-pt').value.trim(), en: $('#np-en').value.trim() }, price: +(+$('#np-price').value).toFixed(2), unit: $('#np-unit').value, farmer: $('#np-farmer').value, icon: $('#np-icon').value,
      season: [+$('#np-s0').value, +$('#np-s1').value], harvest: 2, essential: $('#np-ess').checked, organic: $('#np-bio').checked, desc: { pt: $('#np-dpt').value.trim(), en: $('#np-den').value.trim() } };
    saveCatalog(ch => { ch.newProducts = (ch.newProducts || []).concat(np); }); catFilter = 'changed'; toast(T(`Produto adicionado: ${np.name.pt}`, `Product added: ${np.name.en}`)); rerenderKeep('#cat-q'); return true;
  }
  if (f.matches('[data-newday]')) {
    e.preventDefault(); if (!validate(f)) return true;
    const p = P($('#nd-prod').value), date = $('#nd-date').value;
    if (HARVEST_DAYS.some(x => x.date === date)) { const err = $('.err', f); err.hidden = false; err.textContent = T('Já existe um dia Colhe Connosco nessa data.', 'There is already a Join the Harvest day on that date.'); return true; }
    const day = { date, farmer: $('#nd-farm').value, crop: p ? p.art || 'alface' : 'alface', what: p ? { pt: p.name.pt, en: p.name.en } : { pt: '-', en: '-' }, time: $('#nd-time').value, spots: +$('#nd-spots').value || 20 };
    saveCatalog(ch => { ch.harvestDays = HARVEST_DAYS.map(x => Object.assign({}, x)).concat(day); }); toast(T('Dia Colhe Connosco criado', 'Join the Harvest day created')); rerenderKeep(); return true;
  }
});
