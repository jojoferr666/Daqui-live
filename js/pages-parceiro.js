/* ===== Daqui — área de parceiro (/parceiro) para contas de agricultor e de restaurante =====
   Agricultor: perfil da quinta, stock dos seus produtos, propor produtos novos e dias Colhe Connosco, pedir armazenamento em frio.
   Restaurante: estado do Selo Daqui, perfil, prato da semana e pratos do menu com produtos Daqui.
   O que é publicado diretamente (perfil, stock, prato) usa saveCatalog(); o resto vai para os pedidos da gestão. */
PAGES.parceiro = () => {
  const u = currentUser();
  if (!u) { location.replace(href('entrar', 'next=parceiro')); return { title: T('Entrar', 'Sign in'), html: '' }; }
  if (!u.partner) return { title: T('Área de parceiro', 'Partner area'), html: `${crumbs([[T('Área de parceiro', 'Partner area'), 'parceiro']])}<div class="wrap page-head"><h1>${T('Área de parceiro', 'Partner area')}</h1>
    <p class="lead">${T('Esta área é para agricultores e restaurantes parceiros. Crie uma conta de parceiro para vender na Daqui ou pedir o Selo Daqui.', 'This area is for partner farmers and restaurants. Create a partner account to sell on Daqui or apply for the Daqui seal.')}</p>
    <div class="row-btns mt"><a class="btn btn-green" href="${href('entrar', 'modo=registo&tipo=agricultor')}">${T('Sou agricultor', 'I\'m a farmer')}</a><a class="btn btn-green" href="${href('entrar', 'modo=registo&tipo=restaurante')}">${T('Tenho um restaurante', 'I run a restaurant')}</a><a class="btn btn-line c-campo" href="${href('conta')}">${T('A minha conta', 'My account')}</a></div></div><div class="spacer"></div>` };
  const pt = u.partner, farmer = pt.kind === 'agricultor';
  const status = pt.approved
    ? `<p class="note done">${icon('check', 22)}<span><b>${farmer ? T('Quinta parceira aprovada.', 'Approved partner farm.') : T('Selo Daqui atribuído.', 'Daqui seal awarded.')}</b> ${T('O que publicar aqui aparece logo no site.', 'What you publish here shows on the site straight away.')}</span></p>`
    : `<p class="note">${icon('clock', 22)}<span><b>${T('Pedido em análise pela equipa Daqui.', 'Application under review by the Daqui team.')}</b> ${T('Já pode preparar o seu perfil. Fica visível no site depois da aprovação.', 'You can already prepare your profile. It becomes visible on the site once approved.')}</span></p>`;
  const html = `${crumbs([[T('Área de parceiro', 'Partner area'), 'parceiro']])}
  <div class="wrap page-head row-between"><div><h1>${farmer ? esc(pt.farm) : esc(pt.name)}</h1><p class="muted">${farmer ? T('Área do agricultor', 'Farmer area') : T('Área do restaurante', 'Restaurant area')}. ${esc(u.name)} (${esc(u.username)})</p></div>
    <div class="row-btns"><a class="btn btn-line c-campo" href="${href('conta')}">${T('Encomendas e conta', 'Orders and account')}</a><button class="btn btn-line c-campo" data-logout>${icon('logout', 18)}${T('Terminar sessão', 'Sign out')}</button></div></div>
  <div class="wrap account">${status}${farmer ? farmerArea(u) : restaurantArea(u)}</div><div class="spacer"></div>`;
  return { title: T('Área de parceiro', 'Partner area'), html };
};

function myRequests(u, type) { return REQUESTS.filter(r => r.partnerUser === u.username && r.type === type).sort((a, b) => b.created.localeCompare(a.created)); }
function reqStatus(r) { return r.approved ? `<span class="status ativa">${T('Aprovado', 'Approved')}</span>` : r.status === 'tratado' ? `<span class="status pausada">${T('Analisado', 'Reviewed')}</span>` : `<span class="status prog">${T('Em análise', 'Under review')}</span>`; }

function farmerArea(u) {
  const pt = u.partner, f = pt.farmerId ? F(pt.farmerId) : null, story = f ? f.story : (pt.story || { pt: '', en: '' });
  const mine = f ? PRODUCTS.filter(p => p.farmer === f.id) : [];
  const days = f ? HARVEST_DAYS.filter(d => d.farmer === f.id) : [];
  return `
  <section class="acc-sec"><div class="row-between mb-s"><h2>${T('Perfil da quinta', 'Farm profile')}</h2>${f ? `<a class="link" href="${farmerHref(f)}">${T('Ver a minha página pública', 'See my public page')}</a>` : ''}</div>
    <form class="form" data-farm-profile novalidate>
      <div class="row"><div class="field"><label for="fp-farm">${T('Nome da quinta', 'Farm name')}</label><input id="fp-farm" value="${esc(f ? f.farm : pt.farm)}" required></div><div class="field"><label for="fp-place">${T('Localidade', 'Town')}</label><input id="fp-place" value="${esc(f ? f.place : pt.place)}" required></div></div>
      <div class="row"><div class="field"><label for="fp-spt">${T('A nossa história (português)', 'Our story (Portuguese)')}</label><textarea id="fp-spt" rows="4">${esc(story.pt)}</textarea></div><div class="field"><label for="fp-sen">${T('A nossa história (inglês)', 'Our story (English)')}</label><textarea id="fp-sen" rows="4">${esc(story.en)}</textarea></div></div>
      <p class="err" hidden></p><button class="btn btn-green btn-sm" type="submit">${T('Guardar perfil', 'Save profile')}</button></form></section>
  <section class="acc-sec"><h2>${T('Os meus produtos', 'My produce')}</h2>
    ${mine.length ? `<p class="muted mt-s mb-s">${T('Marque um produto como fora de stock quando não tiver colheita para a semana. O preço é acordado com a Daqui.', 'Mark a product as out of stock when you have no harvest for the week. Prices are agreed with Daqui.')}</p>
      <ul class="prodlist">${mine.map(p => `<li><span class="thumb">${artFor(p)}</span><span><a href="${productHref(p)}"><b>${esc(L(p.name))}</b></a><br><span class="small muted">${money(p.price)}${unitLabel(p.unit)}, ${T('época', 'season')} ${seasonText(p)}</span></span>
        ${inSeason(p) ? `<button class="btn btn-sm ${p.outOfStock ? 'btn-green' : 'btn-line c-tomato'}" data-my-stock="${p.id}">${p.outOfStock ? T('Repor stock', 'Back in stock') : T('Marcar fora de stock', 'Mark out of stock')}</button>` : `<span class="small muted">${T('Fora de época', 'Out of season')}</span>`}</li>`).join('')}</ul>`
      : `<p class="muted mt-s">${pt.approved ? T('Ainda não tem produtos publicados. Proponha o primeiro abaixo.', 'No products published yet. Propose your first one below.') : T('Os seus produtos aparecem aqui depois de a quinta ser aprovada.', 'Your products appear here once the farm is approved.')}</p>`}
    <details class="panel mt"><summary class="lbl">${icon('plus', 18)} ${T('Propor um produto novo', 'Propose a new product')}</summary>
      <form class="form mt-s" data-prop-prod novalidate>
        <div class="row"><div class="field"><label for="pp-pt">${T('Nome em português', 'Name in Portuguese')}</label><input id="pp-pt" required></div><div class="field"><label for="pp-en">${T('Nome em inglês', 'Name in English')}</label><input id="pp-en" required></div></div>
        <div class="row"><div class="field"><label for="pp-cat">${T('Categoria', 'Category')}</label><select id="pp-cat"><option value="fruta">${T('Fruta', 'Fruit')}</option><option value="legumes">${T('Legumes', 'Vegetables')}</option></select></div><div class="field"><label for="pp-price">${T('Preço sugerido (€)', 'Suggested price (€)')}</label><input id="pp-price" type="number" step="0.01" min="0" required></div></div>
        <div class="row"><div class="field"><label for="pp-unit">${T('Unidade', 'Unit')}</label><select id="pp-unit">${UNIT_OPTS('kg')}</select></div><div class="field"><span class="lbl">${T('Época', 'Season')}</span><div class="row-gap"><select id="pp-s0" class="sel sm" aria-label="${T('De', 'From')}">${monthOpts(1)}</select>–<select id="pp-s1" class="sel sm" aria-label="${T('Até', 'To')}">${monthOpts(12)}</select></div></div></div>
        <div class="row"><div class="field"><label for="pp-dpt">${T('Descrição em português', 'Description in Portuguese')}</label><textarea id="pp-dpt" rows="2"></textarea></div><div class="field"><label for="pp-den">${T('Descrição em inglês', 'Description in English')}</label><textarea id="pp-den" rows="2"></textarea></div></div>
        <p class="err" hidden></p><button class="btn btn-green btn-sm" type="submit">${T('Enviar proposta', 'Send proposal')}</button></form></details>
    ${myRequests(u, 'produto').length ? `<h3 class="mt">${T('As minhas propostas', 'My proposals')}</h3><ul class="hlist mt-s">${myRequests(u, 'produto').map(r => `<li class="hrow"><span>${icon('leaf', 20)}</span><div><b>${esc(r.fields.namePt)}</b> / ${esc(r.fields.nameEn || '')}<br><span class="small muted">${fdate(r.created)}, ${money(+r.fields.price || 0)}</span></div>${reqStatus(r)}</li>`).join('')}</ul>` : ''}</section>
  <section class="acc-sec"><h2>${JTH()}</h2>
    ${days.length ? `<ul class="hlist mt-s">${days.map(d => `<li class="hrow"><div class="date sm"><b>${fdate(d.date, { day: 'numeric' })}</b><span>${fdate(d.date, { month: 'short' })}</span></div><div><b>${esc(L(d.what))}</b><br><span class="small muted">${d.time}. ${harvestPeople(d.date)} ${T('de', 'of')} ${d.spots} ${T('lugares ocupados', 'places taken')}.</span></div></li>`).join('')}</ul>` : `<p class="muted mt-s">${T('Ainda não tem dias Colhe Connosco.', 'No Join the Harvest days yet.')}</p>`}
    <details class="panel mt"><summary class="lbl">${icon('calendar', 18)} ${T('Propor um dia Colhe Connosco', 'Propose a Join the Harvest day')}</summary>
      <form class="form mt-s" data-prop-day novalidate>
        <div class="row"><div class="field"><label for="pd-date">${T('Data', 'Date')}</label><input id="pd-date" type="date" min="${iso(today())}" required></div><div class="field"><label for="pd-time">${T('Horário', 'Time')}</label><select id="pd-time">${TIME_OPTS.map(t => `<option>${t}</option>`).join('')}</select></div></div>
        <div class="row"><div class="field"><label for="pd-prod">${T('Produto a colher', 'Produce to pick')}</label>${mine.length ? `<select id="pd-prod">${mine.map(p => `<option value="${p.id}">${esc(L(p.name))}</option>`).join('')}</select>` : `<input id="pd-prod" required>`}</div><div class="field"><label for="pd-spots">${T('Máximo de participantes', 'Maximum participants')}</label><input id="pd-spots" type="number" min="1" value="25" required></div></div>
        <p class="err" hidden></p><button class="btn btn-green btn-sm" type="submit">${T('Enviar proposta', 'Send proposal')}</button></form></details></section>
  <section class="acc-sec"><h2>${T('Armazenamento em frio', 'Cold storage')}</h2>
    <p class="muted mt-s">${T('Não tem câmaras frigoríficas? Peça espaço no armazém da Daqui.', 'No cold rooms of your own? Ask for space in the Daqui warehouse.')}</p>
    <form class="form mt-s" data-cold novalidate><div class="row"><div class="field"><label for="cd-what">${T('Produto', 'Product')}</label><input id="cd-what" required></div><div class="field"><label for="cd-qty">${T('Quantidade (kg)', 'Quantity (kg)')}</label><input id="cd-qty" type="number" min="1" required></div></div>
      <div class="field"><label for="cd-period">${T('Período', 'Period')}</label><input id="cd-period" placeholder="${T('Ex.: setembro a março', 'E.g. September to March')}" required></div>
      <p class="err" hidden></p><button class="btn btn-green btn-sm" type="submit">${T('Pedir espaço', 'Request space')}</button></form></section>`;
}

function restaurantArea(u) {
  const pt = u.partner, r = pt.restId ? RESTAURANTS.find(x => x.id === pt.restId) : null, src = r || pt.draft || {};
  const v = (k, l) => esc((src[k] && src[k][l]) || '');
  const dishes = (r ? r.dishes : (pt.draft || {}).dishes) || [];
  const myOrders = ORDERS.filter(o => o.user === u.username);
  return `
  <section class="acc-sec"><div class="row-between mb-s"><h2>${T('Selo Daqui', 'Daqui seal')}</h2>${r ? `<a class="link" href="${href('restaurantes')}#${r.id}">${T('Ver no mapa de restaurantes', 'See it on the restaurants map')}</a>` : ''}</div>
    <div class="row-gap">${sealSVG('part', lang).replace('<svg', '<svg style="width:88px;height:88px"')}<div><p><b>${r ? T(`Selo ativo desde ${fdate(r.since + '-15', { month: 'long', year: 'numeric' })}.`, `Seal active since ${fdate(r.since + '-15', { month: 'long', year: 'numeric' })}.`) : T('O selo é atribuído depois da aprovação.', 'The seal is awarded once you are approved.')}</b></p>
      <p class="small muted">${T('Mostre o selo à porta e no menu. Os clientes veem o seu restaurante no mapa da Daqui.', 'Show the seal on your door and menu. Diners see your restaurant on the Daqui map.')}</p></div></div></section>
  <section class="acc-sec"><h2>${T('O que aparece no site', 'What shows on the site')}</h2>
    <form class="form mt-s" data-rest-profile novalidate>
      <div class="row"><div class="field"><label for="rp-kpt">${T('Tipo de cozinha (português)', 'Cuisine (Portuguese)')}</label><input id="rp-kpt" value="${v('kind', 'pt')}"></div><div class="field"><label for="rp-ken">${T('Tipo de cozinha (inglês)', 'Cuisine (English)')}</label><input id="rp-ken" value="${v('kind', 'en')}"></div></div>
      <div class="row"><div class="field"><label for="rp-apt">${T('Zona ou morada (português)', 'Area or address (Portuguese)')}</label><input id="rp-apt" value="${v('area', 'pt')}"></div><div class="field"><label for="rp-aen">${T('Zona ou morada (inglês)', 'Area or address (English)')}</label><input id="rp-aen" value="${v('area', 'en')}"></div></div>
      <div class="row"><div class="field"><label for="rp-dpt">${T('Prato da semana (português)', 'Dish of the week (Portuguese)')}</label><input id="rp-dpt" value="${v('dish', 'pt')}" required></div><div class="field"><label for="rp-den">${T('Prato da semana (inglês)', 'Dish of the week (English)')}</label><input id="rp-den" value="${v('dish', 'en')}" required></div></div>
      <p class="small muted">${T('Dica: diga de que quinta vem o ingrediente, por exemplo "com couve da Família Pereira".', 'Tip: say which farm the ingredient comes from, e.g. "with the Pereira family\'s kale".')}</p>
      <p class="err" hidden></p><button class="btn btn-green btn-sm" type="submit">${T('Publicar', 'Publish')}</button></form></section>
  <section class="acc-sec"><h2>${T('Pratos do menu com produtos Daqui', 'Menu dishes with Daqui produce')}</h2>
    ${dishes.length ? `<ul class="hlist mt-s">${dishes.map((x, i) => `<li class="hrow"><span>${icon('utensils', 20)}</span><div><b>${esc(x.pt)}</b><br><span class="small muted">${esc(x.en)}</span></div><button class="link" data-dish-rm="${i}">${T('Remover', 'Remove')}</button></li>`).join('')}</ul>` : `<p class="muted mt-s">${T('Ainda não acrescentou pratos.', 'No dishes added yet.')}</p>`}
    <form class="form mt" data-dish-add novalidate><div class="row"><div class="field"><label for="ds-pt">${T('Prato (português)', 'Dish (Portuguese)')}</label><input id="ds-pt" required></div><div class="field"><label for="ds-en">${T('Prato (inglês)', 'Dish (English)')}</label><input id="ds-en" required></div></div>
      <p class="err" hidden></p><button class="btn btn-green btn-sm" type="submit">${T('Acrescentar prato', 'Add dish')}</button></form></section>
  <section class="acc-sec"><h2>${T('Encomendas para a cozinha', 'Orders for the kitchen')}</h2>
    <p class="muted mt-s">${T(`Encomende na loja como qualquer cliente. Entregamos à quinta-feira e ao sábado. Já fez ${myOrders.length} ${myOrders.length === 1 ? 'encomenda' : 'encomendas'}.`, `Order in the shop like any customer. We deliver on Thursdays and Saturdays. You have placed ${myOrders.length} ${myOrders.length === 1 ? 'order' : 'orders'}.`)}</p>
    <div class="row-btns mt-s"><a class="btn btn-green btn-sm" href="${href('produtos')}">${T('Ir à loja', 'Go to the shop')}</a><a class="btn btn-line btn-sm c-campo" href="${href('conta', 'sec=encomendas')}">${T('Histórico de encomendas', 'Order history')}</a></div></section>`;
}

function saveRest(u, patch) {
  const pt = u.partner;
  if (pt.restId) saveCatalog(ch => { ch.restaurants = ch.restaurants || {}; ch.restaurants[pt.restId] = Object.assign(ch.restaurants[pt.restId] || {}, patch); });
  else { pt.draft = Object.assign(pt.draft || {}, patch); saveUsers(); }
}
PAGE_EVENTS.click.push((e, t, d) => {
  if (PAGE !== 'parceiro') return; const u = currentUser(); if (!u || !u.partner) return;
  if (d.myStock) { const p = P(d.myStock), v = !p.outOfStock; saveCatalog(ch => { ch.products = ch.products || {}; ch.products[p.id] = Object.assign(ch.products[p.id] || {}, { outOfStock: v }); }); toast(v ? T(`${L(p.name)}: fora de stock`, `${L(p.name)}: out of stock`) : T(`${L(p.name)}: com stock`, `${L(p.name)}: in stock`)); rerenderKeep(`[data-my-stock="${p.id}"]`); return true; }
  if (d.dishRm !== undefined) { const r = RESTAURANTS.find(x => x.id === u.partner.restId); const list = ((r ? r.dishes : (u.partner.draft || {}).dishes) || []).filter((_, i) => i !== +d.dishRm); saveRest(u, { dishes: list }); rerenderKeep(); return true; }
});
PAGE_EVENTS.submit.push((e, f) => {
  if (PAGE !== 'parceiro') return; const u = currentUser(); if (!u || !u.partner) return;
  const done = msg => { toast(msg); rerenderKeep(); return true; };
  if (f.matches('[data-farm-profile]')) { e.preventDefault(); if (!validate(f)) return true;
    const patch = { farm: $('#fp-farm').value.trim(), place: $('#fp-place').value.trim(), story: { pt: $('#fp-spt').value.trim(), en: $('#fp-sen').value.trim() || $('#fp-spt').value.trim() } };
    u.partner.farm = patch.farm; u.partner.place = patch.place; u.partner.story = patch.story; saveUsers();
    if (u.partner.farmerId) saveCatalog(ch => { ch.farmers = ch.farmers || {}; ch.farmers[u.partner.farmerId] = Object.assign(ch.farmers[u.partner.farmerId] || {}, patch); });
    return done(T('Perfil guardado', 'Profile saved')); }
  if (f.matches('[data-prop-prod]')) { e.preventDefault(); if (!validate(f)) return true;
    addRequest('produto', { namePt: $('#pp-pt').value.trim(), nameEn: $('#pp-en').value.trim(), cat: $('#pp-cat').value, price: $('#pp-price').value, unit: $('#pp-unit').value, season: `${$('#pp-s0').value}-${$('#pp-s1').value}`, desc: $('#pp-dpt').value.trim(), descEn: $('#pp-den').value.trim() }, { partnerUser: u.username });
    return done(T('Proposta enviada à equipa Daqui', 'Proposal sent to the Daqui team')); }
  if (f.matches('[data-prop-day]')) { e.preventDefault(); if (!validate(f)) return true;
    addRequest('colhe', { date: $('#pd-date').value, product: $('#pd-prod').value, time: $('#pd-time').value, spots: $('#pd-spots').value }, { partnerUser: u.username });
    return done(T('Proposta enviada à equipa Daqui', 'Proposal sent to the Daqui team')); }
  if (f.matches('[data-cold]')) { e.preventDefault(); if (!validate(f)) return true;
    addRequest('frio', { product: $('#cd-what').value.trim(), qty: $('#cd-qty').value + ' kg', period: $('#cd-period').value.trim() }, { partnerUser: u.username });
    return done(T('Pedido de armazenamento enviado', 'Storage request sent')); }
  if (f.matches('[data-rest-profile]')) { e.preventDefault(); if (!validate(f)) return true;
    saveRest(u, { kind: { pt: $('#rp-kpt').value.trim(), en: $('#rp-ken').value.trim() }, area: { pt: $('#rp-apt').value.trim(), en: $('#rp-aen').value.trim() }, dish: { pt: $('#rp-dpt').value.trim(), en: $('#rp-den').value.trim() } });
    return done(u.partner.restId ? T('Publicado no mapa de restaurantes', 'Published on the restaurants map') : T('Guardado: fica visível depois da aprovação', 'Saved: visible once approved')); }
  if (f.matches('[data-dish-add]')) { e.preventDefault(); if (!validate(f)) return true;
    const r = RESTAURANTS.find(x => x.id === u.partner.restId); const list = ((r ? r.dishes : (u.partner.draft || {}).dishes) || []).concat({ pt: $('#ds-pt').value.trim(), en: $('#ds-en').value.trim() });
    saveRest(u, { dishes: list }); return done(T('Prato acrescentado', 'Dish added')); }
});
