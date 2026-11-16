/* ===== Daqui — páginas: Entrar / Criar conta, A minha conta, Painel de gestão ===== */

/* ---------------- ENTRAR (/entrar) ---------------- */
let authMode = QS.get('modo') === 'registo' ? 'registo' : 'entrar';
let authErr = {}, authVals = {};
let authRole = ['agricultor', 'restaurante'].includes(QS.get('tipo')) ? QS.get('tipo') : 'cliente';
const NEXT = (() => { const n = QS.get('next') || ''; return /^[a-z0-9\-/]*$/.test(n) ? n : ''; })();
function afterLogin() {
  const pending = store.get('daqui-pending-sub', null);
  if (NEXT.startsWith('subscricao/') && pending) return go(NEXT, 'retomar=1');
  const u = currentUser(); go(NEXT || (u && u.partner ? 'parceiro' : 'conta'));
}
PAGES.entrar = () => {
  const u = currentUser();
  const errMsg = { req: T('Campo obrigatório.', 'Required.'), fmt: { username: T('Use 3 a 30 letras minúsculas, números, ponto ou hífen.', 'Use 3 to 30 lowercase letters, numbers, dots or hyphens.'), phone: T('Indique um número português com 9 dígitos.', 'Enter a 9-digit Portuguese number.'), email: T('Indique um e-mail válido, por exemplo nome@gmail.com.', 'Enter a valid email, for example name@gmail.com.') }, taken: { username: T('Este nome de utilizador já existe.', 'This username is taken.'), phone: T('Já existe uma conta com este número.', 'There is already an account with this number.'), email: T('Já existe uma conta com este e-mail.', 'There is already an account with this email.') }, short: T('Mínimo de 8 caracteres.', 'At least 8 characters.'), weak: T('Palavra-passe recusada: escolha outra mais longa ou mais difícil.', 'Password refused: choose a longer or harder one.'), match: T('As palavras-passe não coincidem.', 'Passwords don\'t match.'), confirm: T('Conta criada. Abra o e-mail de confirmação que enviámos e depois entre.', 'Account created. Open the confirmation email we sent, then sign in.') };
  const msg = k => { const c = authErr[k]; if (!c) return ''; const m = errMsg[c]; return `<span class="err" id="e-${k}">${typeof m === 'object' ? m[k] : m}</span>`; };
  const fld = (k, label, type = 'text', ac = '', hint = '') => `<div class="field"><label for="a-${k}">${label}</label>
    ${type === 'password' ? `<div class="pw"><input id="a-${k}" name="${k}" type="password" autocomplete="${ac}" value="${esc(authVals[k] || '')}"${authErr[k] ? ` aria-invalid="true" aria-describedby="e-${k}"` : ''}><button type="button" class="pw-t" data-pw="a-${k}" aria-label="${T('Mostrar palavra-passe', 'Show password')}">${icon('eye', 20)}</button></div>`
      : `<input id="a-${k}" name="${k}" type="${type}" autocomplete="${ac}" value="${esc(authVals[k] || '')}"${authErr[k] ? ` aria-invalid="true" aria-describedby="e-${k}"` : ''}>`}${hint ? `<span class="small muted">${hint}</span>` : ''}${msg(k)}</div>`;
  const html = `${crumbs([[T('Entrar', 'Sign in'), 'entrar']])}
  <div class="wrap auth">
    <div class="panel auth-box">
      ${u ? `<h1>${T('Já tem sessão iniciada', 'You are already signed in')}</h1><p class="lead mt-s">${T('Conta de', 'Account of')} <b>${esc(u.name)}</b> (${esc(u.username)}).</p>
        <div class="row-btns mt"><a class="btn btn-green" href="${href(u.partner ? 'parceiro' : 'conta')}">${u.partner ? T('Ir para a área de parceiro', 'Go to the partner area') : T('Ir para a minha conta', 'Go to my account')}</a><button class="btn btn-line c-campo" data-logout>${T('Terminar sessão', 'Sign out')}</button></div>` : `
      <div class="tabs" role="tablist"><button role="tab" data-auth="entrar" aria-selected="${authMode === 'entrar'}">${T('Entrar', 'Sign in')}</button><button role="tab" data-auth="registo" aria-selected="${authMode === 'registo'}">${T('Criar conta', 'Create account')}</button></div>
      ${NEXT.startsWith('subscricao/') ? `<p class="note small">${icon('repeat', 20)}<span>${T('Guardámos as escolhas da sua subscrição. Depois de entrar, só falta confirmar.', 'We saved your subscription choices. Once you sign in, you just need to confirm.')}</span></p>` : ''}
      ${authMode === 'entrar' ? `<form class="form" data-auth-form="entrar" novalidate>
          <h1 class="h2">${T('Entrar na sua conta', 'Sign in to your account')}</h1>
          ${fld('login', NUVEM.on ? T('Nome de utilizador, telemóvel ou e-mail', 'Username, mobile number or email') : T('Nome de utilizador ou telemóvel', 'Username or mobile number'), 'text', 'username')}
          ${fld('pass', T('Palavra-passe', 'Password'), 'password', 'current-password')}
          ${authErr.auth ? `<p class="err" role="alert">${T('Utilizador ou palavra-passe incorretos.', 'Incorrect username or password.')}</p>` : ''}
          ${authErr.net ? `<p class="err" role="alert">${T('Não foi possível ligar à base de dados. Verifique a internet e tente outra vez.', 'Could not reach the database. Check your connection and try again.')}</p>` : ''}
          <button class="btn btn-green btn-block" type="submit">${T('Entrar', 'Sign in')}</button>
          <p class="small muted ta-c">${T('Esqueceu-se da palavra-passe? Ligue para o', 'Forgot your password? Call')} ${PHONE}.</p></form>`
      : `<form class="form" data-auth-form="registo" novalidate>
          <h1 class="h2">${T('Criar conta', 'Create an account')}</h1>
          <fieldset class="plain"><legend class="lbl">${T('Tipo de conta', 'Account type')}</legend><div class="roles">${[['cliente', 'user', T('Cliente', 'Customer'), T('Compro fruta e legumes', 'I buy fruit and veg')], ['agricultor', 'tractor', T('Agricultor', 'Farmer'), T('Vendo o que produzo', 'I sell what I grow')], ['restaurante', 'utensils', T('Restaurante', 'Restaurant'), T('Quero o Selo Daqui', 'I want the Daqui seal')]].map(([k, i, n, dsc]) => `<label class="role"><span class="role-top"><input type="radio" name="role" value="${k}"${authRole === k ? ' checked' : ''}>${icon(i, 22)}<b>${n}</b></span><span class="small muted">${dsc}</span></label>`).join('')}</div></fieldset>
          ${fld('name', authRole === 'cliente' ? T('Nome', 'Name') : T('O seu nome', 'Your name'), 'text', 'name')}
          ${authRole === 'agricultor' ? `${fld('farm', T('Nome da quinta', 'Farm name'))}<div class="row">${fld('place', T('Localidade', 'Town'))}<div class="field"><label for="a-region">${T('Região', 'Region')}</label><select id="a-region" name="region">${Object.keys(REGIONS).map(r => `<option value="${r}"${authVals.region === r ? ' selected' : ''}>${regionName(r)}</option>`).join('')}</select></div></div>${fld('crops', T('O que produz', 'What you grow'))}` : ''}
          ${authRole === 'restaurante' ? `${fld('restName', T('Nome do restaurante', 'Restaurant name'))}<div class="row">${fld('place', T('Localidade', 'Town'))}${fld('kind', T('Tipo de cozinha', 'Cuisine'))}</div>` : ''}
          <div class="row">${fld('username', T('Nome de utilizador', 'Username'), 'text', 'username')}${fld('phone', T('Telemóvel', 'Mobile'), 'tel', 'tel')}</div>
          ${fld('email', NUVEM.on ? T('E-mail', 'Email') : T('E-mail (opcional)', 'Email (optional)'), 'email', 'email', NUVEM.on ? T('Também pode entrar com o e-mail.', 'You can also sign in with your email.') : '')}
          ${fld('pass', T('Palavra-passe', 'Password'), 'password', 'new-password', T('Mínimo de 8 caracteres.', 'At least 8 characters.'))}
          ${fld('pass2', T('Repetir palavra-passe', 'Repeat password'), 'password', 'new-password')}
          ${authRole !== 'cliente' ? `<p class="note small">${icon('shield', 20)}<span>${T('A equipa Daqui analisa o pedido. Enquanto isso, já pode preparar o seu perfil na área de parceiro.', 'The Daqui team reviews your application. Meanwhile, you can already prepare your profile in the partner area.')}</span></p>` : ''}
          ${authErr.net ? `<p class="err" role="alert">${T('Não foi possível ligar à base de dados. Verifique a internet e tente outra vez.', 'Could not reach the database. Check your connection and try again.')}</p>` : ''}
          <button class="btn btn-green btn-block" type="submit">${T('Criar conta', 'Create account')}</button></form>`}`}
    </div>
    <aside class="auth-side">
      <h2 class="h3">${T('Contas de demonstração', 'Demo accounts')}</h2>
      <ul class="demo-acc">
        <li><b>maria</b> ${T('ou', 'or')} 912 345 678<br><span class="muted">${T('Palavra-passe', 'Password')}: daqui2026</span><br><span class="small">${T('Caixa Mista semanal, inscrita num Colhe Connosco', 'Weekly Mixed Box, signed up for Join the Harvest')}</span></li>
        <li><b>joao</b> ${T('ou', 'or')} 913 222 111<br><span class="muted">${T('Palavra-passe', 'Password')}: daqui2026</span><br><span class="small">${T('Caixa de Fruta quinzenal, cujo preço baixou', 'Fortnightly Fruit Box whose price went down')}</span></li>
        <li><b>gestao</b><br><span class="muted">${T('Palavra-passe', 'Password')}: gestao2026</span><br><span class="small">${T('Equipa Daqui: pedidos, estado das encomendas, catálogo, preços, caixas, Colhe Connosco e contas', 'Daqui team: requests, order status, catalogue, prices, boxes, Join the Harvest and accounts')}</span></li>
        <li><b>agr.joaquim</b> ${T('ou', 'or')} 914 000 101<br><span class="muted">${T('Palavra-passe', 'Password')}: daqui2026</span><br><span class="small">${T('Agricultor: área de parceiro com produtos, stock e Colhe Connosco', 'Farmer: partner area with produce, stock and Join the Harvest')}</span></li>
        <li><b>rest.mesa-da-ria</b> ${T('ou', 'or')} 234 000 101<br><span class="muted">${T('Palavra-passe', 'Password')}: daqui2026</span><br><span class="small">${T('Restaurante Mesa da Ria: prato da semana e menu', 'Mesa da Ria restaurant: dish of the week and menu')}</span></li>
      </ul>
      <details class="demo-more mt-s"><summary class="link">${T('Contas de todas as quintas e restaurantes', 'Accounts for every farm and restaurant')}</summary>
        <p class="small muted mt-s">${T('Palavra-passe de todas: daqui2026. Também pode entrar com o telemóvel.', 'Password for all of them: daqui2026. You can also sign in with the mobile number.')}</p>
        <table class="tbl small"><tbody>${seedAccounts().filter(a => a.extra.partner).map(a => `<tr><td><b>${a.username}</b></td><td>${esc(a.extra.partner.farm || a.extra.partner.name)}</td><td class="nowrap">${a.phone}</td></tr>`).join('')}</tbody></table></details>
      <p class="note small mt">${icon('alert', 20)}<span>${NUVEM.on ? T('As contas ficam na base de dados da Daqui: a mesma conta funciona em qualquer computador ou telemóvel. É uma demonstração: não use uma palavra-passe verdadeira.', 'Accounts are stored in the Daqui database: the same account works on any computer or phone. This is a demo: don\'t use a real password.') : T('Demonstração: as contas ficam guardadas apenas neste navegador. Não use uma palavra-passe verdadeira.', 'Demo: accounts are stored only in this browser. Don\'t use a real password.')}</span></p>
    </aside>
  </div><div class="spacer"></div>`;
  return { title: authMode === 'registo' ? T('Criar conta', 'Create account') : T('Entrar', 'Sign in'), html };
};
PAGE_EVENTS.click.push((e, t, d) => {
  if (d.auth) { authMode = d.auth; authErr = {}; render(); $(`[data-auth="${d.auth}"]`)?.focus(); return true; }
  if (d.pw) { const i = document.getElementById(d.pw); const show = i.type === 'password'; i.type = show ? 'text' : 'password'; t.setAttribute('aria-label', show ? T('Esconder palavra-passe', 'Hide password') : T('Mostrar palavra-passe', 'Show password')); return true; }
  if ('logout' in d) { signOut(); toast(T('Sessão terminada', 'Signed out')); setTimeout(() => go(''), 400); return true; }
});
PAGE_EVENTS.change.push((e, t) => {
  if (PAGE === 'entrar' && t.name === 'role') { const f = t.closest('form'); authVals = Object.assign({}, authVals, Object.fromEntries(new FormData(f).entries()), { pass: '', pass2: '' }); authRole = t.value; authErr = {}; render(); $(`input[name="role"][value="${t.value}"]`)?.focus(); }
});
PAGE_EVENTS.submit.push((e, f) => {
  if (!f.matches('[data-auth-form]')) return; e.preventDefault();
  const v = Object.fromEntries(new FormData(f).entries()); authVals = { ...v, pass: '', pass2: '' };
  const btn = $('button[type="submit"]', f); btn.disabled = true; btn.classList.add('busy');
  const fail = err => { console.error(err); authErr = { net: 1 }; render(); };
  if (f.dataset.authForm === 'entrar') {
    Promise.resolve(signIn(v.login, v.pass)).then(u => { if (u) { authErr = {}; afterLogin(); } else { authErr = { auth: 1 }; render(); $('#a-login')?.focus(); } }, fail);
  } else {
    Promise.resolve(register(v)).then(r => {
      if (r.user) { authErr = {}; toast(T('Conta criada', 'Account created')); setTimeout(afterLogin, 300); }
      else if (r.errors.email === 'confirm') { authMode = 'entrar'; authErr = {}; render(); toast(T('Conta criada. Confirme o e-mail e depois entre.', 'Account created. Confirm your email, then sign in.')); }
      else { authErr = r.errors; render(); $('[aria-invalid="true"]')?.focus(); }
    }, fail);
  }
  return true;
});

/* ---------------- A MINHA CONTA (/conta) ---------------- */
PAGES.conta = () => {
  const u = currentUser();
  if (!u) { location.replace(href('entrar', 'next=conta')); return { title: T('Entrar', 'Sign in'), html: '' }; }
  let changed = false; (u.subs || []).forEach(s => { if (refreshSub(s).changed) changed = true; }); if (changed) saveUsers();
  const nova = (u.subs || []).find(s => s.id === QS.get('nova'));
  const subCard = s => {
    const p = P(s.box), cur = boxCurrentPrice(s.box, s.size), lockEnd = addDays(parseISO(s.start), 365), fee = s.deliver === 'home' ? DELIVERY_FEE : 0;
    const exclude = (u.exclude || []).map(id => P(id) ? L(P(id).name) : id).join(', ');
    return `<article class="subcard${s.status === 'pausada' ? ' paused' : ''}">
      <div class="sc-art">${artFor(p)}</div>
      <div class="sc-body">
        <div class="row-between"><h3>${esc(L(p.name))}</h3><span class="status ${s.status}">${s.status === 'ativa' ? T('Ativa', 'Active') : T('Pausada', 'Paused')}</span></div>
        <dl class="dl cols2">
          <div><dt>${T('Tamanho', 'Size')}</dt><dd>${sizeName(s.size)}, ${s.kg} kg</dd></div>
          <div><dt>${T('Frequência', 'Frequency')}</dt><dd><select data-sub-freq="${s.id}" aria-label="${T('Frequência', 'Frequency')}">${['sem', 'quinz', 'mens'].map(f => `<option value="${f}"${s.freq === f ? ' selected' : ''}>${freqName(f)}</option>`).join('')}</select></dd></div>
          <div><dt>${T('Dia', 'Day')}</dt><dd>${dayName(s.day)}</dd></div>
          <div><dt>${s.deliver === 'home' ? T('Entrega em casa', 'Home delivery') : T('Levantamento', 'Pick-up')}</dt><dd>${esc(s.deliver === 'home' ? s.address : s.point)}</dd></div>
          <div><dt>${T('Próxima entrega', 'Next delivery')}</dt><dd>${s.status === 'ativa' ? slotLabel(nextDelivery(s)) : T('Em pausa', 'On hold')}</dd></div>
          <div><dt>${T('Por entrega', 'Per delivery')}</dt><dd><b>${money(s.locked + fee)}</b>${fee ? ` <span class="small muted">(${T('inclui entrega', 'incl. delivery')})</span>` : ''}</dd></div>
        </dl>
        <p class="note small">${icon('lock', 20)}<span>${T(`Preço guardado: ${money(s.locked)} até ${fdate(lockEnd, { day: 'numeric', month: 'long', year: 'numeric' })}.`, `Saved price: ${money(s.locked)} until ${fdate(lockEnd, { day: 'numeric', month: 'long', year: 'numeric' })}.`)}
          ${cur > s.locked ? T(` O preço atual é ${money(cur)}: poupa ${money(cur - s.locked)} por entrega.`, ` The current price is ${money(cur)}: you save ${money(cur - s.locked)} per delivery.`) : s.lowered && cur === s.locked ? T(' O preço baixou e o seu preço guardado baixou com ele.', ' The price went down and your saved price went down with it.') : ''}</span></p>
        <p class="small muted">${exclude ? `${T('Não recebe', 'Not included')}: ${esc(exclude)}.` : T('Recebe todos os produtos da época.', 'Gets every seasonal product.')} <a class="link" href="#preferencias">${T('Alterar preferências', 'Change preferences')}</a></p>
        <div class="row-btns"><button class="btn btn-line btn-sm c-campo" data-sub-pause="${s.id}">${s.status === 'ativa' ? icon('pause', 16) + T('Pausar', 'Pause') : icon('play', 16) + T('Retomar', 'Resume')}</button>
          <button class="btn btn-line btn-sm c-tomato" data-sub-cancel="${s.id}">${T('Cancelar subscrição', 'Cancel subscription')}</button></div>
      </div></article>`;
  };
  const myOrders = ORDERS.filter(o => o.user === u.username).sort((a, b) => b.created.localeCompare(a.created));
  const orderCard = o => { const names = o.items.map(i => P(i.id) ? L(P(i.id).name) : i.id); const st = orderStage(o);
    return `<article class="ordcard"><div class="oc-thumbs">${o.items.slice(0, 3).map(i => P(i.id) ? `<span class="thumb">${artFor(P(i.id))}</span>` : '').join('')}</div>
      <div><div class="row-gap"><b>${o.num}</b><span class="status ${st === 4 ? 'pausada' : st === 3 ? 'ativa' : 'prog'}">${stageName(o)}</span></div>
        <p class="small muted">${T('Feita a', 'Placed on')} ${fdate(o.created, { day: 'numeric', month: 'long', year: 'numeric' })}. ${o.deliver === 'home' ? T('Entrega', 'Delivery') : T('Levantamento', 'Pick-up')}: ${slotLabel(o.slot)}.</p>
        <p class="small">${esc(names.slice(0, 4).join(', '))}${names.length > 4 ? ` ${T('e mais', 'and')} ${names.length - 4}` : ''}</p></div>
      <div class="oc-side"><b>${money(o.total)}</b><a class="btn btn-line btn-sm c-campo" href="${href('contacto', 'encomenda=' + o.num)}">${T('Seguir', 'Track')}</a><button class="link small" data-reorder="${o.num}">${T('Repetir encomenda', 'Order again')}</button></div></article>`; };
  const harvRows = (u.harvests || []).slice().sort((a, b) => a.date.localeCompare(b.date)).map(h => { const dd = HARVEST_DAYS.find(x => x.date === h.date); if (!dd) return ''; const f = F(dd.farmer);
    return `<li class="hrow"><div class="date sm"><b>${fdate(dd.date, { day: 'numeric' })}</b><span>${fdate(dd.date, { month: 'short' })}</span></div><div><b>${esc(L(dd.what))}</b><br><span class="small muted">${esc(f.farm)}, ${esc(f.place)}. ${dd.time}. ${h.people} ${h.people > 1 ? T('pessoas', 'people') : T('pessoa', 'person')}.</span></div><button class="link" data-harv-cancel="${dd.date}">${T('Cancelar', 'Cancel')}</button></li>`; }).join('');
  const notif = (u.notify || []).map(P).filter(Boolean), favs = (u.favs || []).map(P).filter(Boolean), excl = (u.exclude || []).map(P).filter(Boolean);
  const prodOptions = keep => ['fruta', 'legumes'].map(c => `<optgroup label="${catName(c)}">${PRODUCTS.filter(p => p.cat === c && keep(p)).sort((a, b) => L(a.name).localeCompare(L(b.name))).map(p => `<option value="${p.id}">${esc(L(p.name))}</option>`).join('')}</optgroup>`).join('');
  const addr = u.address;
  const html = `${crumbs([[T('A minha conta', 'My account'), 'conta']])}
  <div class="wrap page-head row-between">
    <div><h1>${T('Olá', 'Hello')}, ${esc(u.name.split(' ')[0])}</h1><p class="muted">${esc(u.username)}, ${esc(u.phone.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3'))}</p></div>
    <div class="row-btns">${u.partner ? `<a class="btn btn-green" href="${href('parceiro')}">${u.partner.kind === 'agricultor' ? T('A minha quinta', 'My farm') : T('O meu restaurante', 'My restaurant')}</a>` : ''}<button class="btn btn-line c-campo" data-logout>${icon('logout', 18)}${T('Terminar sessão', 'Sign out')}</button></div>
  </div>
  <div class="wrap account">
    ${nova ? `<p class="note done" role="status">${icon('check', 22)}<span><b>${T('Subscrição confirmada', 'Subscription confirmed')}: ${esc(L(P(nova.box).name))}.</b> ${T('Primeira entrega', 'First delivery')}: ${slotLabel(nova.first)}. ${T('Preço guardado durante 12 meses.', 'Price saved for 12 months.')}</span></p>` : ''}
    ${u.role === 'admin' ? adminPanel() : `
    <nav class="acc-nav" aria-label="${T('Secções da conta', 'Account sections')}">${[['encomendas', T('Encomendas', 'Orders')], ['subscricoes', T('Subscrições', 'Subscriptions')], ['colhe', JTH()], ['preferencias', T('Favoritos e exclusões', 'Favourites and exclusions')], ['dados', T('Dados e morada', 'Details and address')]].map(([k, n]) => `<a class="chip" href="#${k}">${n}</a>`).join('')}</nav>
    <section class="acc-sec" id="encomendas"><div class="row-between mb-s"><h2>${T('Histórico de encomendas', 'Order history')}</h2><a class="btn btn-green btn-sm" href="${href('produtos')}">${T('Nova encomenda', 'New order')}</a></div>
      ${myOrders.length ? myOrders.map(orderCard).join('') : `<p class="muted">${T('Ainda não fez nenhuma encomenda com esta conta.', 'You haven\'t placed any orders with this account yet.')}</p>`}</section>
    <section class="acc-sec" id="subscricoes"><div class="row-between mb-s"><h2>${T('As minhas subscrições', 'My subscriptions')}</h2><a class="btn btn-green btn-sm" href="${href('subscricao')}">${T('Nova subscrição', 'New subscription')}</a></div>
      ${(u.subs || []).length ? u.subs.map(subCard).join('') : `<div class="empty"><h3>${T('Ainda não tem subscrições', 'No subscriptions yet')}</h3><p class="muted">${T('Escolha uma Caixa da Estação e receba todas as semanas, com preço garantido durante 12 meses.', 'Pick a Seasonal Box and get it every week, with a 12-month price guarantee.')}</p><a class="btn btn-green" href="${href('subscricao')}">${T('Ver caixas', 'See boxes')}</a></div>`}</section>
    <section class="acc-sec" id="colhe"><div class="row-between mb-s"><h2>${JTH()}</h2><a class="btn btn-line btn-sm c-campo" href="${href('colhe-connosco')}">${T('Ver próximos dias', 'See upcoming days')}</a></div>
      ${harvRows ? `<ul class="hlist">${harvRows}</ul>` : `<p class="muted">${T('Ainda não está inscrito em nenhum dia.', 'You are not signed up for any day yet.')}</p>`}</section>
    <section class="acc-sec" id="preferencias"><h2>${T('Preferências para as caixas', 'Box preferences')}</h2>
      <p class="muted mt-s">${T('Valem para todas as caixas que receber: nas subscrições e nas caixas que comprar uma vez. A equipa Daqui vê estas preferências em cada encomenda de caixa.', 'They apply to every box you get: subscriptions and one-off box orders. The Daqui team sees these preferences on every box order.')}</p>
      ${BACK ? `<p class="note small mt-s">${icon('repeat', 20)}<span>${T('Quando terminar, volte para confirmar a subscrição.', 'When you are done, go back to confirm your subscription.')} <a class="btn btn-green btn-sm" href="${href(BACK, 'retomar=1')}">${T('Voltar à subscrição', 'Back to the subscription')}</a></span></p>` : ''}
      <div class="prefs-grid mt">
        <div><h3>${icon('heart', 20)} ${T('Favoritos', 'Favourites')}</h3>
          <p class="small muted mb-s">${T('Entram primeiro nas caixas quando estão na época. Também pode marcá-los com o coração em cada produto.', 'They go into your boxes first when in season. You can also mark them with the heart on any product.')}</p>
          ${favs.length ? `<ul class="favlist">${favs.map(p => `<li><span class="thumb">${artFor(p)}</span><span><a href="${productHref(p)}"><b>${esc(L(p.name))}</b></a><br><span class="small muted">${inSeason(p) ? T('Na época', 'In season') : T('Volta em', 'Back in') + ' ' + monthName(p.season[0])}</span></span><button class="rm" data-fav-rm="${p.id}" aria-label="${T('Remover', 'Remove')} ${esc(L(p.name))}">${icon('trash', 18)}</button></li>`).join('')}</ul>` : `<p class="muted">${T('Ainda não escolheu favoritos.', 'No favourites yet.')}</p>`}
          <div class="row-gap mt-s"><label class="sr" for="fav-add">${T('Adicionar favorito', 'Add a favourite')}</label><select id="fav-add" class="sel">${prodOptions(p => !favs.includes(p) && !(u.exclude || []).includes(p.id))}</select><button class="btn btn-green btn-sm" data-fav-add>${icon('heart', 16)}${T('Adicionar', 'Add')}</button></div></div>
        <div><h3>${icon('close', 20)} ${T('Não quero receber', 'I\'d rather not get')}</h3>
          <p class="small muted mb-s">${T('Escolha quantos quiser. Substituímos por outros produtos da época.', 'Pick as many as you like. We swap them for other seasonal produce.')}</p>
          ${excl.length ? `<ul class="favlist">${excl.map(p => `<li><span class="thumb">${artFor(p)}</span><span><b>${esc(L(p.name))}</b><br><span class="small muted">${catName(p.cat)}</span></span><button class="rm" data-excl-rm="${p.id}" aria-label="${T('Remover', 'Remove')} ${esc(L(p.name))}">${icon('trash', 18)}</button></li>`).join('')}</ul>${excl.length > 15 ? `<p class="note small">${icon('alert', 20)}<span>${T('Excluiu muitos produtos: as caixas podem repetir mais vezes os mesmos.', 'You excluded a lot: boxes may repeat the same produce more often.')}</span></p>` : ''}` : `<p class="muted">${T('Recebe todos os produtos da época.', 'You get every seasonal product.')}</p>`}
          <div class="row-gap mt-s"><label class="sr" for="excl-add">${T('Produto que não quer receber', 'Product you\'d rather not get')}</label><select id="excl-add" class="sel">${prodOptions(p => !(u.exclude || []).includes(p.id) && !favs.includes(p))}</select><button class="btn btn-line btn-sm c-campo" data-excl-add>${T('Não quero receber', 'Exclude')}</button></div></div>
      </div></section>
    <section class="acc-sec"><h2 class="mb-s">${T('Avisos de época', 'Season reminders')}</h2>
      ${notif.length ? `<ul class="hlist">${notif.map(p => `<li class="hrow"><span class="thumb">${artFor(p)}</span><div><a href="${href('produtos/' + p.id)}"><b>${esc(L(p.name))}</b></a><br><span class="small muted">${inSeason(p) ? T('Já está disponível', 'Available now') : T('Volta em', 'Back in') + ' ' + monthName(p.season[0])}</span></div><button class="link" data-notify-rm="${p.id}">${T('Remover', 'Remove')}</button></li>`).join('')}</ul>` : `<p class="muted">${T('Nos produtos fora de época, carregue em "Avisar-me" para saber quando voltam.', 'On out-of-season products, tap "Notify me" to know when they\'re back.')}</p>`}</section>`}
    <section class="acc-sec" id="dados"><h2 class="mb-s">${T('Dados da conta', 'Account details')}</h2>
      <dl class="dl cols2"><div><dt>${T('Nome', 'Name')}</dt><dd>${esc(u.name)}</dd></div><div><dt>${T('Nome de utilizador', 'Username')}</dt><dd>${esc(u.username)}</dd></div><div><dt>${T('Telemóvel', 'Mobile')}</dt><dd>${esc(u.phone)}</dd></div><div><dt>${T('Cliente desde', 'Customer since')}</dt><dd>${fdate(u.created, { day: 'numeric', month: 'long', year: 'numeric' })}</dd></div></dl>
      ${u.role === 'admin' ? '' : `<h3 class="mt">${T('Morada de entrega', 'Delivery address')}</h3>
      <p class="small muted">${T('É usada nas encomendas e subscrições com entrega em casa.', 'Used for orders and subscriptions with home delivery.')}</p>
      <form class="form mt-s" data-addr-form novalidate>
        <div class="field"><label for="ad-street">${T('Rua, número e andar', 'Street, number and floor')}</label><input id="ad-street" value="${esc(addr?.street || '')}" required autocomplete="street-address"></div>
        <div class="row"><div class="field"><label for="ad-postal">${T('Código postal', 'Postcode')}</label><input id="ad-postal" value="${esc(addr?.postal || '')}" required placeholder="3810-000"></div><div class="field"><label for="ad-town">${T('Localidade', 'Town')}</label><input id="ad-town" value="${esc(addr?.town || '')}" required></div></div>
        <p class="err" hidden></p>
        <div class="row-btns"><button class="btn btn-green btn-sm" type="submit">${addr ? T('Atualizar morada', 'Update address') : T('Guardar morada', 'Save address')}</button>${addr ? `<button type="button" class="btn btn-line btn-sm c-tomato" data-addr-rm>${T('Apagar morada', 'Delete address')}</button>` : ''}</div>
      </form>`}</section>
  </div><div class="spacer"></div>`;
  return { title: T('A minha conta', 'My account'), html, after: () => { const sec = QS.get('sec'); if (sec) setTimeout(() => document.getElementById(sec)?.scrollIntoView(), 60); } };
};
const BACK = (() => { const b = QS.get('voltar') || ''; return /^subscricao\/[a-z0-9-]+$/.test(b) ? b : ''; })();
function rerenderKeep(sel) { const y = scrollY; render(); scrollTo(0, y); if (sel) $(sel)?.focus(); }
PAGE_EVENTS.click.push((e, t, d) => {
  if (PAGE !== 'conta') return; const u = currentUser(); if (!u) return;
  const sub = id => (u.subs || []).find(s => s.id === id);
  if (d.subPause) { const s = sub(d.subPause); s.status = s.status === 'ativa' ? 'pausada' : 'ativa'; saveUsers(); toast(s.status === 'ativa' ? T('Subscrição retomada', 'Subscription resumed') : T('Subscrição em pausa', 'Subscription paused')); rerenderKeep(`[data-sub-pause="${s.id}"]`); return true; }
  if (d.subCancel) { const s = sub(d.subCancel); openModal(`<div class="mbody"><h2>${T('Cancelar subscrição?', 'Cancel subscription?')}</h2><p>${T(`A ${L(P(s.box).name)} deixa de ser entregue. Se voltar a subscrever, o preço será o do dia.`, `The ${L(P(s.box).name)} will stop being delivered. If you subscribe again, you'll pay that day's price.`)}</p><div class="row-btns"><button class="btn btn-green" data-modal-close>${T('Manter subscrição', 'Keep subscription')}</button><button class="btn btn-line c-tomato" data-sub-cancel-ok="${s.id}">${T('Cancelar subscrição', 'Cancel subscription')}</button></div></div>`, T('Cancelar subscrição', 'Cancel subscription')); return true; }
  if (d.subCancelOk) { u.subs = u.subs.filter(s => s.id !== d.subCancelOk); saveUsers(); closeModal(); toast(T('Subscrição cancelada', 'Subscription cancelled')); rerenderKeep(); return true; }
  if (d.notifyRm) { u.notify = (u.notify || []).filter(x => x !== d.notifyRm); saveUsers(); rerenderKeep(); return true; }
  if (d.favRm) { u.favs = (u.favs || []).filter(x => x !== d.favRm); saveUsers(); rerenderKeep('#fav-add'); return true; }
  if (d.exclRm) { u.exclude = (u.exclude || []).filter(x => x !== d.exclRm); saveUsers(); rerenderKeep('#excl-add'); return true; }
  if ('exclAdd' in d) { const id = $('#excl-add').value; if (id) { u.exclude = [...(u.exclude || []), id]; u.favs = (u.favs || []).filter(x => x !== id); saveUsers(); toast(T(`Não vai receber: ${L(P(id).name)}`, `You won't get: ${L(P(id).name)}`)); rerenderKeep('#excl-add'); } return true; }
  if ('favAdd' in d) { const id = $('#fav-add').value; if (id) { u.favs = [...(u.favs || []), id]; u.exclude = (u.exclude || []).filter(x => x !== id); saveUsers(); toast(T(`Adicionado aos favoritos: ${L(P(id).name)}`, `Added to favourites: ${L(P(id).name)}`)); rerenderKeep('#fav-add'); } return true; }
  if (d.reorder) { const o = findOrder(d.reorder); o.items.forEach(i => { if (P(i.id) && (inSeason(P(i.id)) || P(i.id).cat === 'caixas')) addToCart(i.id, i.size ? { size: i.size } : {}, i.qty); }); openCart(); return true; }
  if ('addrRm' in d) { u.address = null; saveUsers(); toast(T('Morada apagada', 'Address deleted')); rerenderKeep(); return true; }
});
PAGE_EVENTS.change.push((e, t) => {
  if (PAGE !== 'conta' || !t.dataset.subFreq) return; const u = currentUser(); const s = (u.subs || []).find(x => x.id === t.dataset.subFreq);
  s.freq = t.value; saveUsers(); toast(T('Frequência alterada', 'Frequency updated')); rerenderKeep(`[data-sub-freq="${s.id}"]`);
});
PAGE_EVENTS.submit.push((e, f) => {
  if (!f.matches('[data-addr-form]')) return; e.preventDefault(); if (!validate(f)) return true;
  const pc = $('#ad-postal').value.trim(); if (!/^\d{4}-\d{3}$/.test(pc)) { const err = $('.err', f); err.hidden = false; err.textContent = T('O código postal deve ter o formato 3810-000.', 'The postcode must look like 3810-000.'); $('#ad-postal').focus(); return true; }
  const u = currentUser(); u.address = { street: $('#ad-street').value.trim(), postal: pc, town: $('#ad-town').value.trim() }; saveUsers(); toast(T('Morada guardada', 'Address saved')); rerenderKeep(); return true;
});
