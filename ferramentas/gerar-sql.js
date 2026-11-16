#!/usr/bin/env node
/* Gera os scripts de dados para a base de dados Supabase a partir dos ficheiros do site:
     supabase/02-catalogo.sql  ← js/data.js + js/alteracoes.js (produtos, agricultores, caixas, restaurantes, dias Colhe Connosco)
     supabase/03-contas.sql    ← js/auth.js (contas de demonstração, subscrições, encomendas e pedidos de exemplo)
   Corra a partir da pasta do site:   node ferramentas/gerar-sql.js
   Volte a correr sempre que mudar o catálogo em data.js e queira passar essas mudanças para a base de dados
   (o 02 atualiza os produtos existentes e acrescenta os novos; não apaga nada). */
const fs = require('fs'), path = require('path');
const SITE = path.resolve(__dirname, '..'), OUT = path.join(SITE, 'supabase');
const read = f => fs.readFileSync(path.join(SITE, 'js', f), 'utf8');
const mem = {};
const env = {
  document: { body: { dataset: {} } },
  localStorage: { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } }
};
const code = ['data.js', 'alteracoes.js', 'catalogo.js'].map(read).join('\n') + '\nconst NUVEM = { on: false, isAdmin: () => false };\n' + read('auth.js') +
  '\nreturn { PRODUCTS, FARMERS, RESTAURANTS, HARVEST_DAYS, BOX_SIZES, seedAccounts, seedOrders, seedRequests, SEED_DOMAIN, normPhone };';
const D = new Function('document', 'localStorage', code)(env.document, env.localStorage);

const q = v => v == null ? 'null' : `'${String(v).replace(/'/g, "''")}'`;
const qn = v => (v == null || v === '' ? 'null' : q(v));
const num = v => (v == null || v === '' || isNaN(+v) ? 'null' : String(+v));
const bool = v => (v ? 'true' : 'false');
const js = v => `${q(JSON.stringify(v == null ? null : v))}::jsonb`;
const arr = (a, type = 'text') => (a && a.length ? `array[${a.map(x => (type === 'int' ? num(x) : q(x))).join(', ')}]::${type}[]` : `'{}'::${type}[]`);
const head = (n, what) => `-- =====================================================================================
-- Daqui — ${n} de 3: ${what}
-- Gerado por ferramentas/gerar-sql.js em ${new Date().toISOString().slice(0, 16).replace('T', ' ')}. Não edite à mão: mude js/data.js e volte a gerar.
-- Onde: Supabase → SQL Editor → New query → colar este ficheiro inteiro → Run.
-- =====================================================================================
`;

/* ---------- 02: catálogo ---------- */
const known = { farmer: ['id', 'name', 'farm', 'place', 'region', 'lat', 'lon', 'since', 'crop', 'seed', 'story', 'isNew'],
  rest: ['id', 'name', 'lat', 'lon', 'kind', 'area', 'dish', 'since', 'dishes', 'isNew'],
  prod: ['id', 'cat', 'name', 'price', 'unit', 'farmer', 'art', 'icon', 'season', 'harvest', 'essential', 'organic', 'outOfStock', 'split', 'desc', 'isNew'] };
const extra = (o, k) => Object.fromEntries(Object.entries(o).filter(([key]) => !known[k].includes(key)));
let s = head(2, 'CATÁLOGO (agricultores, produtos, caixas, restaurantes, dias Colhe Connosco)');
s += '\n-- agricultores\ninsert into public.agricultores (id, nome, quinta, localidade, regiao, lat, lon, desde, cultura, semente, historia_pt, historia_en, extra, ordem) values\n';
s += D.FARMERS.map((f, i) => `  (${q(f.id)}, ${q(f.name)}, ${q(f.farm)}, ${q(f.place)}, ${q(f.region)}, ${num(f.lat)}, ${num(f.lon)}, ${num(f.since)}, ${qn(f.crop)}, ${num(f.seed || 0)}, ${q((f.story || {}).pt || '')}, ${q((f.story || {}).en || '')}, ${js(extra(f, 'farmer'))}, ${i})`).join(',\n');
s += `\non conflict (id) do update set nome = excluded.nome, quinta = excluded.quinta, localidade = excluded.localidade, regiao = excluded.regiao, lat = excluded.lat, lon = excluded.lon,
  desde = excluded.desde, cultura = excluded.cultura, semente = excluded.semente, historia_pt = excluded.historia_pt, historia_en = excluded.historia_en, extra = excluded.extra, ordem = excluded.ordem;\n`;
const prods = D.PRODUCTS.filter(p => p.cat !== 'caixas');
s += '\n-- produtos de fruta e legumes\ninsert into public.produtos (id, categoria, nome_pt, nome_en, preco, unidade, agricultor, desenho, icone, epoca_inicio, epoca_fim, colheita, essencial, biologico, fora_stock, divisao, desc_pt, desc_en, extra, ordem) values\n';
s += prods.map((p, i) => `  (${q(p.id)}, ${q(p.cat)}, ${q(p.name.pt)}, ${q(p.name.en)}, ${num(p.price)}, ${q(p.unit)}, ${qn(p.farmer)}, ${qn(p.art)}, ${qn(p.icon)}, ${num(p.season[0])}, ${num(p.season[1])}, ${p.harvest == null ? 'null' : q(p.harvest)}, ${bool(p.essential)}, ${bool(p.organic)}, ${bool(p.outOfStock)}, ${Array.isArray(p.split) ? arr(p.split, 'int') : 'null'}, ${q((p.desc || {}).pt || '')}, ${q((p.desc || {}).en || '')}, ${js(extra(p, 'prod'))}, ${i})`).join(',\n');
s += `\non conflict (id) do update set categoria = excluded.categoria, nome_pt = excluded.nome_pt, nome_en = excluded.nome_en, preco = excluded.preco, unidade = excluded.unidade,
  agricultor = excluded.agricultor, desenho = excluded.desenho, icone = excluded.icone, epoca_inicio = excluded.epoca_inicio, epoca_fim = excluded.epoca_fim, colheita = excluded.colheita,
  essencial = excluded.essencial, biologico = excluded.biologico, fora_stock = excluded.fora_stock, divisao = excluded.divisao, desc_pt = excluded.desc_pt, desc_en = excluded.desc_en, extra = excluded.extra, ordem = excluded.ordem;\n`;
s += '\n-- preços das caixas por tamanho\ninsert into public.caixas_precos (caixa, tamanho, kg, preco, ordem) values\n';
s += Object.entries(D.BOX_SIZES).flatMap(([b, sizes]) => sizes.map((z, i) => `  (${q(b)}, ${q(z.s)}, ${num(z.kg)}, ${num(z.price)}, ${i})`)).join(',\n');
s += '\non conflict (caixa, tamanho) do update set kg = excluded.kg, preco = excluded.preco, ordem = excluded.ordem;\n';
s += '\n-- restaurantes parceiros\ninsert into public.restaurantes (id, nome, lat, lon, tipo_pt, tipo_en, zona_pt, zona_en, prato_pt, prato_en, desde, pratos, extra, ordem) values\n';
s += D.RESTAURANTS.map((r, i) => `  (${q(r.id)}, ${q(r.name)}, ${num(r.lat)}, ${num(r.lon)}, ${q((r.kind || {}).pt || '')}, ${q((r.kind || {}).en || '')}, ${q((r.area || {}).pt || '')}, ${q((r.area || {}).en || '')}, ${q((r.dish || {}).pt || '')}, ${q((r.dish || {}).en || '')}, ${qn(r.since)}, ${js(r.dishes || [])}, ${js(extra(r, 'rest'))}, ${i})`).join(',\n');
s += `\non conflict (id) do update set nome = excluded.nome, lat = excluded.lat, lon = excluded.lon, tipo_pt = excluded.tipo_pt, tipo_en = excluded.tipo_en, zona_pt = excluded.zona_pt,
  zona_en = excluded.zona_en, prato_pt = excluded.prato_pt, prato_en = excluded.prato_en, desde = excluded.desde, pratos = excluded.pratos, extra = excluded.extra, ordem = excluded.ordem;\n`;
s += '\n-- dias Colhe Connosco\ninsert into public.dias_colhe (dia, agricultor, cultura, produto_pt, produto_en, horario, lugares) values\n';
s += D.HARVEST_DAYS.map(d => `  (${q(d.date)}, ${q(d.farmer)}, ${qn(d.crop)}, ${q(d.what.pt)}, ${q(d.what.en)}, ${q(d.time)}, ${num(d.spots)})`).join(',\n');
s += '\non conflict (dia) do update set agricultor = excluded.agricultor, cultura = excluded.cultura, produto_pt = excluded.produto_pt, produto_en = excluded.produto_en, horario = excluded.horario, lugares = excluded.lugares;\n';
s += `\n-- Fim: ${D.FARMERS.length} agricultores, ${prods.length} produtos, ${D.RESTAURANTS.length} restaurantes, ${D.HARVEST_DAYS.length} dias Colhe Connosco. Agora corra 03-contas.sql.\n`;
fs.writeFileSync(path.join(OUT, '02-catalogo.sql'), s);

/* ---------- 03: contas e atividade de exemplo ---------- */
const accts = D.seedAccounts();
let c = head(3, 'CONTAS DE DEMONSTRAÇÃO e atividade de exemplo') + `-- Cria ${accts.length} contas (palavras-passe abaixo), com o perfil, as subscrições, as inscrições no Colhe Connosco,
-- três encomendas e quatro pedidos de exemplo. Se uma conta já existir, não é criada outra vez.
-- As contas usam e-mails fictícios <utilizador>@${D.SEED_DOMAIN}: entra-se com o nome de utilizador ou o telemóvel.
--
${accts.map(a => `--   ${a.username.padEnd(26)} ${a.phone.padEnd(12)} ${a.pass}`).join('\n')}

create or replace function public.daqui_criar_conta(p_username text, p_pass text, p_nome text, p_tel text, p_papel text, p_parceiro jsonb, p_dados jsonb)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid; mail text := lower(p_username) || '@${D.SEED_DOMAIN}';
begin
  select id into uid from auth.users where lower(email) = mail;
  if uid is null then
    uid := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                            created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', mail, crypt(p_pass, gen_salt('bf')), now(),
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            jsonb_build_object('username', lower(p_username), 'nome', p_nome, 'telemovel', p_tel, 'email_verified', true),
            now(), now(), '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), uid, uid::text, jsonb_build_object('sub', uid::text, 'email', mail, 'email_verified', true), 'email', now(), now(), now());
  end if;
  perform public.criar_perfil(uid, mail, jsonb_build_object('username', lower(p_username), 'nome', p_nome, 'telemovel', p_tel));
  update public.perfis set nome = p_nome, telemovel = p_tel, email = mail, papel = p_papel, parceiro = p_parceiro,
         morada = p_dados->'morada',
         favoritos = array(select jsonb_array_elements_text(coalesce(p_dados->'favoritos', '[]'))),
         excluidos = array(select jsonb_array_elements_text(coalesce(p_dados->'excluidos', '[]'))),
         avisos = array(select jsonb_array_elements_text(coalesce(p_dados->'avisos', '[]')))
   where id = uid;
  return uid;
end $$;
revoke all on function public.daqui_criar_conta(text, text, text, text, text, jsonb, jsonb) from public, anon, authenticated;

-- próximo dia de distribuição (quinta ou sábado) depois de uma data
create or replace function public.daqui_proximo_dia(base date) returns date language sql as $$
  select d::date from generate_series(base + 2, base + 9, interval '1 day') d where extract(dow from d) in (4, 6) order by d limit 1;
$$;

-- contas
`;
for (const a of accts) {
  const x = a.extra || {};
  c += `select public.daqui_criar_conta(${q(a.username)}, ${q(a.pass)}, ${q(a.name)}, ${q(D.normPhone(a.phone))}, ${q(x.role || 'cliente')}, ${x.partner ? js(x.partner) : 'null'}, ${js({ morada: x.address || null, favoritos: x.favs || [], excluidos: x.exclude || [], avisos: x.notify || [] })});\n`;
}
const uid = un => `(select id from public.perfis where username = ${q(un)})`;
c += '\n-- subscrições\n';
for (const a of accts) for (const sb of (a.extra || {}).subs || []) {
  c += `insert into public.subscricoes (id, user_id, caixa, tamanho, kg, frequencia, dia, entrega, ponto, morada, descoberta, pagamento, preco_guardado, inicio, primeira, estado)
  values (${q(sb.id)}, ${uid(a.username)}, ${q(sb.box)}, ${q(sb.size)}, ${num(sb.kg)}, ${q(sb.freq)}, ${q(sb.day)}, ${q(sb.deliver)}, ${q(sb.point || '')}, ${q(sb.address || '')}, ${bool(sb.discovery)}, ${qn(sb.pay)}, ${num(sb.locked)}, ${q(sb.start)}, ${q(sb.first)}, ${q(sb.status)})
  on conflict (id) do nothing;\n`;
}
c += '\n-- inscrições no Colhe Connosco (só se o dia existir)\n';
for (const a of accts) for (const h of (a.extra || {}).harvests || []) {
  c += `insert into public.inscricoes_colhe (user_id, dia, pessoas) select ${uid(a.username)}, dia, ${num(h.people)} from public.dias_colhe where dia = ${q(h.date)} on conflict do nothing;\n`;
}
c += '\n-- encomendas de exemplo (datas relativas ao dia em que corre este script)\n';
const DAY = 864e5, now = Date.now();
for (const o of D.seedOrders()) {
  const ago = Math.round((now - new Date(o.created)) / DAY);
  c += `insert into public.encomendas (num, user_id, username, nome, telemovel, criada, data_entrega, dia, entrega, janela, ponto, morada, artigos, subtotal, taxa, total, pagamento, notas, estado)
  select ${q(o.num)}, ${uid(o.user)}, ${q(o.user)}, ${q(o.name)}, ${q(o.phone)}, now() - interval '${ago} days', d, case extract(dow from d) when 4 then 'qui' else 'sab' end,
         ${q(o.deliver)}, ${q(o.window)}, ${q(o.point)}, ${q(o.address)}, ${js(o.items)}, ${num(o.subtotal)}, ${num(o.fee)}, ${num(o.total)}, ${q(o.pay)}, '', 'ativa'
    from (select public.daqui_proximo_dia(current_date - ${ago}) d) x
  on conflict (num) do nothing;\n`;
}
c += '\n-- pedidos de exemplo para o painel de gestão\n';
for (const r of D.seedRequests()) {
  const ago = Math.round((now - new Date(r.created)) / DAY);
  c += `insert into public.pedidos (id, tipo, criado, estado, user_id, username, parceiro, encomenda, campos)
  values (${q(r.id)}, ${q(r.type)}, now() - interval '${ago} days', ${q(r.status)}, ${r.user ? uid(r.user) : 'null'}, ${qn(r.user)}, ${qn(r.partnerUser)}, ${qn(r.order)}, ${js(r.fields)})
  on conflict (id) do nothing;\n`;
}
c += `
drop function public.daqui_criar_conta(text, text, text, text, text, jsonb, jsonb);
drop function public.daqui_proximo_dia(date);

-- Fim. Confirme em Table Editor → perfis: devem aparecer ${accts.length} contas.
-- Para dar acesso de gestão a outra conta:  update public.perfis set papel = 'admin' where username = 'o-seu-utilizador';
`;
fs.writeFileSync(path.join(OUT, '03-contas.sql'), c);
console.log(`supabase/02-catalogo.sql: ${D.FARMERS.length} agricultores, ${prods.length} produtos, ${D.RESTAURANTS.length} restaurantes, ${D.HARVEST_DAYS.length} dias`);
console.log(`supabase/03-contas.sql: ${accts.length} contas, ${D.seedOrders().length} encomendas, ${D.seedRequests().length} pedidos`);
