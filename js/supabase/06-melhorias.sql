-- =====================================================================================
-- Daqui — 06-melhorias.sql  (versão 7 do site e da app)
--
-- Onde: Supabase → SQL Editor → New query → colar este ficheiro inteiro → Run.
-- Quando: ANTES de enviar a versão 7 do site para o GitHub (o site novo já usa estas colunas e tabelas).
-- Pode ser corrido mais do que uma vez. Não apaga dados. Não é preciso voltar a correr 01 a 05.
--
-- O que acrescenta:
--   1. Produtos com vários produtores e escolha convencional / biológico (+20%); juntar produtos repetidos.
--   2. Pedidos de parceiros: "Aprovar e publicar" ou "Rejeitar", com mensagem para o parceiro.
--   3. Colhe Connosco: o agricultor edita os seus dias até começarem; avaliações dos participantes
--      (abrem no início do dia e fecham 48 h depois do fim); registo da colheita de cada participante.
--   4. "Falar com a Daqui": mensagens entre clientes (com ou sem conta) e a gestão.
--   5. Notificações para tudo isto (só são enviadas se já correu 05-notificacoes.sql e a função notificar existe).
-- =====================================================================================

-- =====================================================================================
-- 1. PRODUTOS: vários produtores, convencional / biológico, produtos juntados
-- =====================================================================================
alter table public.produtos add column if not exists produtores jsonb;          -- [{"farmer": "joaquim", "organic": false, "outOfStock": false}, …]
alter table public.produtos add column if not exists aliases text[] not null default '{}';   -- ids de produtos que foram juntados a este
update public.produtos
   set produtores = case when agricultor is null then '[]'::jsonb
                         else jsonb_build_array(jsonb_build_object('farmer', agricultor, 'organic', biologico, 'outOfStock', fora_stock)) end
 where produtores is null;
alter table public.produtos alter column produtores set default '[]'::jsonb;

-- produtores de um produto (para produtos antigos sem a lista, o agricultor principal)
create or replace function public.daqui_ofertas(p public.produtos) returns jsonb language sql immutable as $$
  select coalesce(nullif(p.produtores, '[]'::jsonb),
                  case when p.agricultor is null then '[]'::jsonb
                       else jsonb_build_array(jsonb_build_object('farmer', p.agricultor, 'organic', p.biologico, 'outOfStock', p.fora_stock)) end);
$$;
-- nome sem "biológico", para encontrar produtos repetidos ("Cenoura" e "Cenoura biológica")
create or replace function public.daqui_nome_base(t text) returns text language sql immutable as $$
  select trim(regexp_replace(regexp_replace(regexp_replace(
           translate(lower(coalesce(t, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
           '\m(biologic[oa]s?|bio|organic[oa]?s?)\M', ' ', 'g'), '[^a-z0-9]+', ' ', 'g'), '\s+', ' ', 'g'));
$$;

-- gestão: juntar o produto p_juntar ao produto p_manter (produtores, favoritos, exclusões, avisos e o id antigo)
create or replace function public.juntar_produtos(p_manter text, p_juntar text) returns void
language plpgsql security definer set search_path = public as $$
declare k public.produtos; d public.produtos; ofs jsonb; o jsonb; conv_k boolean; conv_d boolean;
begin
  if public.vem_do_site() and not public.eh_admin() then raise exception 'Só a gestão pode juntar produtos' using errcode = '42501'; end if;
  select * into k from public.produtos where id = p_manter;
  select * into d from public.produtos where id = p_juntar;
  if k.id is null or d.id is null or k.id = d.id then return; end if;
  ofs := public.daqui_ofertas(k);
  conv_k := exists (select 1 from jsonb_array_elements(ofs) as e(v) where not coalesce((v->>'organic')::boolean, false));
  conv_d := exists (select 1 from jsonb_array_elements(public.daqui_ofertas(d)) as e(v) where not coalesce((v->>'organic')::boolean, false));
  for o in select v from jsonb_array_elements(public.daqui_ofertas(d)) as e(v) loop
    if not exists (select 1 from jsonb_array_elements(ofs) as e(v)
                    where v->>'farmer' = o->>'farmer' and coalesce((v->>'organic')::boolean, false) = coalesce((o->>'organic')::boolean, false)) then
      ofs := ofs || jsonb_build_array(o);
    end if;
  end loop;
  update public.produtos
     set produtores = ofs,
         agricultor = coalesce(k.agricultor, d.agricultor),
         biologico  = exists (select 1 from jsonb_array_elements(ofs) as e(v) where coalesce((v->>'organic')::boolean, false)),
         fora_stock = case when jsonb_array_length(ofs) = 0 then k.fora_stock
                           else not exists (select 1 from jsonb_array_elements(ofs) as e(v) where not coalesce((v->>'outOfStock')::boolean, false)) end,
         preco      = case when conv_k then k.preco when conv_d then d.preco else k.preco end,   -- o preço guardado é o do convencional, quando há
         aliases    = array(select distinct x from unnest(k.aliases || array[d.id] || d.aliases) as x)
   where id = k.id;
  update public.perfis set favoritos = array(select distinct case when x = d.id then k.id else x end from unnest(favoritos) as x) where d.id = any(favoritos);
  update public.perfis set excluidos = array(select distinct case when x = d.id then k.id else x end from unnest(excluidos) as x) where d.id = any(excluidos);
  update public.perfis set avisos    = array(select distinct case when x = d.id then k.id else x end from unnest(avisos) as x)    where d.id = any(avisos);
  update public.pedidos set produto_id = k.id where produto_id = d.id;
  delete from public.produtos where id = d.id;
end $$;

-- agricultor: marcar a SUA parte de um produto como fora de stock (o produto fica esgotado quando todos os produtores estão sem stock)
create or replace function public.definir_stock(p_produto text, p_fora boolean) returns void
language plpgsql security definer set search_path = public as $$
declare f text := public.meu_agricultor(); r public.produtos; ofs jsonb;
begin
  if f is null then raise exception 'Só agricultores aprovados' using errcode = '42501'; end if;
  select * into r from public.produtos where id = p_produto;
  if r.id is null then raise exception 'Produto não encontrado'; end if;
  ofs := public.daqui_ofertas(r);
  if not exists (select 1 from jsonb_array_elements(ofs) as e(v) where v->>'farmer' = f) then raise exception 'Este produto não é seu' using errcode = '42501'; end if;
  select jsonb_agg(case when v->>'farmer' = f then v || jsonb_build_object('outOfStock', p_fora) else v end order by n) into ofs
    from jsonb_array_elements(ofs) with ordinality as e(v, n);
  update public.produtos
     set produtores = ofs,
         fora_stock = not exists (select 1 from jsonb_array_elements(ofs) as e(v) where not coalesce((v->>'outOfStock')::boolean, false))
   where id = p_produto;
end $$;
grant execute on function public.definir_stock(text, boolean) to authenticated;
grant execute on function public.juntar_produtos(text, text) to authenticated;

-- =====================================================================================
-- 2. PEDIDOS: decisão da gestão e mensagem para o parceiro
-- =====================================================================================
alter table public.pedidos add column if not exists decisao  text check (decisao in ('aprovado', 'rejeitado'));
alter table public.pedidos add column if not exists resposta text;
alter table public.pedidos add column if not exists decidido timestamptz;
create or replace function public.proteger_pedido() returns trigger
language plpgsql set search_path = public as $$
begin
  if public.vem_do_site() and not public.eh_admin() then
    new.estado := 'novo'; new.aprovado := false; new.criado := now(); new.decisao := null; new.resposta := null; new.decidido := null;
  end if;
  return new;
end $$;

-- =====================================================================================
-- 3. COLHE CONNOSCO: editar dias, avaliações e registo da colheita
-- =====================================================================================
alter table public.inscricoes_colhe add column if not exists avaliacao  int check (avaliacao between 1 and 5);
alter table public.inscricoes_colhe add column if not exists comentario text;
alter table public.inscricoes_colhe add column if not exists avaliado   timestamptz;
alter table public.inscricoes_colhe add column if not exists registo    jsonb;      -- {"kg": 3.5, "note": "…", "at": "…"} (só a gestão escreve)

-- início e fim de um dia, a partir do horário ("9h30–12h30"), na hora de Portugal
create or replace function public.daqui_janela_colhe(p_dia date, p_horario text, out inicio timestamptz, out fim timestamptz)
language plpgsql stable as $$
declare m text[];
begin
  m := regexp_match(coalesce(p_horario, ''), '(\d{1,2})h(\d{2})?\D+(\d{1,2})h(\d{2})?');
  if m is null then
    inicio := p_dia::timestamp at time zone 'Europe/Lisbon'; fim := (p_dia + 1)::timestamp at time zone 'Europe/Lisbon'; return;
  end if;
  inicio := (p_dia + make_time(m[1]::int, coalesce(m[2], '0')::int, 0)) at time zone 'Europe/Lisbon';
  fim    := (p_dia + make_time(m[3]::int, coalesce(m[4], '0')::int, 0)) at time zone 'Europe/Lisbon';
end $$;

-- cliente: só avalia entre o início do dia e 48 h depois do fim; não mexe no registo; não muda o n.º de pessoas depois de começar
create or replace function public.proteger_inscricao() returns trigger
language plpgsql set search_path = public as $$
declare h text; ini timestamptz; fim timestamptz;
begin
  if not public.vem_do_site() or public.eh_admin() then
    if new.avaliacao is distinct from (case when tg_op = 'UPDATE' then old.avaliacao end) then new.avaliado := now(); end if;
    return new;
  end if;
  if tg_op = 'INSERT' then new.avaliacao := null; new.comentario := null; new.avaliado := null; new.registo := null; return new; end if;
  select horario into h from public.dias_colhe where dia = new.dia;
  select j.inicio, j.fim into ini, fim from public.daqui_janela_colhe(new.dia, h) as j;
  new.registo := old.registo;
  if new.avaliacao is distinct from old.avaliacao or new.comentario is distinct from old.comentario then
    if now() < ini or now() > fim + interval '48 hours' then
      new.avaliacao := old.avaliacao; new.comentario := old.comentario; new.avaliado := old.avaliado;
    else
      new.avaliado := now(); new.comentario := left(new.comentario, 600);
    end if;
  end if;
  if new.pessoas is distinct from old.pessoas and now() >= ini then new.pessoas := old.pessoas; end if;
  return new;
end $$;
drop trigger if exists proteger_inscricao on public.inscricoes_colhe;
create trigger proteger_inscricao before insert or update on public.inscricoes_colhe for each row execute function public.proteger_inscricao();
-- o limite de lugares só é verificado quando muda o número de pessoas (não quando se avalia)
drop trigger if exists verificar_lugares on public.inscricoes_colhe;
create trigger verificar_lugares before insert or update of pessoas on public.inscricoes_colhe for each row execute function public.verificar_lugares();

-- agricultor (ou gestão): editar um dia antes de começar; as inscrições mudam de data com ele
create or replace function public.editar_dia_colhe(p_dia date, p_novo_dia date, p_horario text, p_lugares int, p_produto_pt text, p_produto_en text, p_cultura text default null) returns void
language plpgsql security definer set search_path = public as $$
declare d public.dias_colhe; ini timestamptz; ocupados int;
begin
  select * into d from public.dias_colhe where dia = p_dia;
  if d.dia is null then raise exception 'Dia Colhe Connosco não encontrado' using errcode = 'P0001'; end if;
  if not public.eh_admin() and d.agricultor is distinct from public.meu_agricultor() then raise exception 'Este dia não é da sua quinta' using errcode = '42501'; end if;
  select j.inicio into ini from public.daqui_janela_colhe(d.dia, d.horario) as j;
  if not public.eh_admin() and now() >= ini then raise exception 'Este dia já começou: já não pode ser alterado' using errcode = 'P0001'; end if;
  if p_novo_dia < current_date then raise exception 'Escolha uma data a partir de hoje' using errcode = 'P0001'; end if;
  if p_novo_dia <> p_dia and exists (select 1 from public.dias_colhe where dia = p_novo_dia) then raise exception 'Já existe um dia Colhe Connosco nessa data' using errcode = 'P0001'; end if;
  select coalesce(sum(pessoas), 0) into ocupados from public.inscricoes_colhe where dia = p_dia;
  update public.dias_colhe
     set dia = p_novo_dia, horario = coalesce(nullif(p_horario, ''), horario), lugares = greatest(coalesce(p_lugares, lugares), ocupados, 1),
         produto_pt = coalesce(nullif(p_produto_pt, ''), produto_pt), produto_en = coalesce(nullif(p_produto_en, ''), produto_en), cultura = coalesce(p_cultura, cultura)
   where dia = p_dia;
end $$;
grant execute on function public.editar_dia_colhe(date, date, text, int, text, text, text) to authenticated;

-- agricultor: resumo dos seus dias (participantes, avaliações sem nomes e quilos registados)
create or replace function public.colhe_resumo_agricultor() returns table (dia date, pessoas int, n int, media numeric, kg numeric, comentarios jsonb)
language sql stable security definer set search_path = public as $$
  select d.dia, coalesce(sum(i.pessoas), 0)::int, count(i.avaliacao)::int, round(avg(i.avaliacao)::numeric, 2),
         coalesce(sum(nullif(i.registo->>'kg', '')::numeric), 0),
         coalesce(jsonb_agg(jsonb_build_object('rating', i.avaliacao, 'comment', coalesce(i.comentario, ''))) filter (where i.avaliacao is not null), '[]'::jsonb)
    from public.dias_colhe d left join public.inscricoes_colhe i on i.dia = d.dia
   where d.agricultor = public.meu_agricultor()
   group by d.dia;
$$;
grant execute on function public.colhe_resumo_agricultor() to authenticated;

-- =====================================================================================
-- 4. FALAR COM A DAQUI: mensagens
-- =====================================================================================
create table if not exists public.mensagens (
  id        bigint generated always as identity primary key,
  conversa  text not null,                                         -- id da conta, ou código do visitante sem conta
  user_id   uuid references public.perfis(id) on delete cascade,   -- dono da conversa (vazio para visitantes)
  nome      text,
  contacto  text,
  autor     text not null check (autor in ('cliente', 'gestao')),
  texto     text not null check (length(texto) between 1 and 2000),
  criada    timestamptz not null default now(),
  lida      boolean not null default false
);
create index if not exists mensagens_conversa on public.mensagens (conversa, criada);
create index if not exists mensagens_user on public.mensagens (user_id);
alter table public.mensagens enable row level security;
drop policy if exists "mensagens: ver" on public.mensagens;
drop policy if exists "mensagens: escrever" on public.mensagens;
drop policy if exists "mensagens: gestão muda" on public.mensagens;
drop policy if exists "mensagens: gestão apaga" on public.mensagens;
create policy "mensagens: ver" on public.mensagens for select to authenticated using (user_id = auth.uid() or public.eh_admin());
create policy "mensagens: escrever" on public.mensagens for insert to authenticated
  with check (public.eh_admin() or (autor = 'cliente' and user_id = auth.uid() and conversa = auth.uid()::text));
create policy "mensagens: gestão muda" on public.mensagens for update to authenticated using (public.eh_admin()) with check (public.eh_admin());
create policy "mensagens: gestão apaga" on public.mensagens for delete to authenticated using (public.eh_admin());
grant select, insert, update, delete on public.mensagens to authenticated;

create or replace function public.proteger_mensagem() returns trigger
language plpgsql set search_path = public as $$
begin
  if public.vem_do_site() and not public.eh_admin() then new.autor := 'cliente'; new.lida := false; new.criada := now(); end if;
  return new;
end $$;
drop trigger if exists proteger_mensagem on public.mensagens;
create trigger proteger_mensagem before insert on public.mensagens for each row execute function public.proteger_mensagem();

-- visitante sem conta: escreve e lê a sua conversa com o código guardado no navegador
create or replace function public.enviar_mensagem_convidado(p_conversa text, p_nome text, p_contacto text, p_texto text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(p_conversa, '') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     or exists (select 1 from public.perfis where id::text = p_conversa)
     or exists (select 1 from public.mensagens where conversa = p_conversa and user_id is not null) then
    raise exception 'Conversa inválida' using errcode = 'P0001';
  end if;
  if length(trim(coalesce(p_texto, ''))) = 0 then return; end if;
  insert into public.mensagens (conversa, user_id, nome, contacto, autor, texto)
  values (p_conversa, null, left(coalesce(p_nome, ''), 80), left(coalesce(p_contacto, ''), 120), 'cliente', left(p_texto, 2000));
end $$;
create or replace function public.mensagens_convidado(p_conversa text) returns setof public.mensagens
language sql stable security definer set search_path = public as $$
  select * from public.mensagens
   where conversa = p_conversa and user_id is null and p_conversa ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   order by criada;
$$;
-- marcar como lidas: a gestão lê as do cliente; o cliente (ou visitante) lê as da gestão
create or replace function public.marcar_lidas(p_conversa text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.eh_admin() then
    update public.mensagens set lida = true where conversa = p_conversa and autor = 'cliente' and not lida;
  elsif auth.uid() is not null and auth.uid()::text = p_conversa then
    update public.mensagens set lida = true where conversa = p_conversa and autor = 'gestao' and user_id = auth.uid() and not lida;
  elsif auth.uid() is null then
    update public.mensagens set lida = true where conversa = p_conversa and user_id is null and autor = 'gestao' and not lida;
  end if;
end $$;
grant execute on function public.enviar_mensagem_convidado(text, text, text, text), public.mensagens_convidado(text), public.marcar_lidas(text) to anon, authenticated;

-- tempo real: o painel da gestão recebe as mensagens logo
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'mensagens') then
    alter publication supabase_realtime add table public.mensagens;
  end if;
end $$;

-- =====================================================================================
-- 5. NOTIFICAÇÕES (só funcionam depois de 05-notificacoes.sql; sem ele, estes avisos não fazem nada)
-- =====================================================================================
create or replace function public.daqui_avisar(p_quem uuid[], p_tpt text, p_cpt text, p_ten text, p_cen text, p_rota text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_quem is null or cardinality(p_quem) = 0 then return; end if;
  if to_regprocedure('public.daqui_enviar(jsonb)') is null or to_regprocedure('public.daqui_msgs(uuid[],text,text,text,text,text)') is null then return; end if;
  execute 'select public.daqui_enviar(public.daqui_msgs($1, $2, $3, $4, $5, $6))' using p_quem, p_tpt, p_cpt, p_ten, p_cen, p_rota;
exception when others then
  raise warning 'Daqui: aviso não enviado: %', sqlerrm;
end $$;
revoke all on function public.daqui_avisar(uuid[], text, text, text, text, text) from public, anon, authenticated;
create or replace function public.daqui_gestores() returns uuid[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(id), '{}') from public.perfis where papel = 'admin';
$$;

-- pedidos: novos (gestão) e decisões (parceiro, com a mensagem escrita pela gestão)
create or replace function public.daqui_notificar_pedido() returns trigger
language plpgsql security definer set search_path = public as $$
declare tpt text; ten text; quem text; alvo uuid; rota text; ok boolean; ttl_pt text; ttl_en text; txt_pt text; txt_en text;
begin
  tpt := case new.tipo when 'selo' then 'Pedido de Selo Daqui' when 'agricultor' then 'Adesão de agricultor' when 'produto' then 'Pedido de produto'
    when 'colhe' then 'Proposta de Colhe Connosco' when 'frio' then 'Armazenamento em frio' when 'gerir' then 'Gerir encomenda' when 'incidencia' then 'Incidência'
    when 'contacto' then 'Mensagem' when 'fundador' then 'Membro fundador' else new.tipo end;
  ten := case new.tipo when 'selo' then 'Daqui seal application' when 'agricultor' then 'Farmer sign-up' when 'produto' then 'Product request'
    when 'colhe' then 'Join the Harvest proposal' when 'frio' then 'Cold storage' when 'gerir' then 'Manage order' when 'incidencia' then 'Problem report'
    when 'contacto' then 'Message' when 'fundador' then 'Founding member' else new.tipo end;
  if tg_op = 'INSERT' then
    if new.tipo = 'seguimento' or (new.tipo = 'gerir' and coalesce(new.campos->>'action', '') = '') then return new; end if;
    quem := coalesce(new.campos->>'restaurant', new.campos->>'farm', new.campos->>'name', new.campos->>'person', new.username, '');
    perform public.daqui_avisar(public.daqui_gestores(),
      tpt || ' (' || new.id || ')', trim(both ' ,' from quem || coalesce(', ' || new.encomenda, '') || coalesce(', ' || left(coalesce(new.campos->>'what', new.campos->>'message', new.campos->>'namePt'), 80), '')),
      ten || ' (' || new.id || ')', trim(both ' ,' from quem || coalesce(', ' || new.encomenda, '') || coalesce(', ' || left(coalesce(new.campos->>'what', new.campos->>'message', new.campos->>'nameEn', new.campos->>'namePt'), 80), '')),
      '#/g/pedidos');
    return new;
  end if;
  if new.decisao is not null and new.decisao is distinct from old.decisao then ok := new.decisao = 'aprovado';
  elsif new.decisao is null and new.aprovado and not old.aprovado then ok := true;   -- versões antigas do site
  else return new; end if;
  alvo := coalesce(new.user_id, (select id from public.perfis where username = new.parceiro));
  if alvo is null then return new; end if;
  rota := case new.tipo when 'selo' then '#/r/perfil' when 'colhe' then '#/p/colhe' when 'produto' then '#/p/propostas' else '#/p/produtos' end;
  ttl_pt := case when ok then case new.tipo when 'agricultor' then 'A sua quinta foi aprovada' when 'selo' then 'Selo Daqui atribuído' when 'produto' then 'Produto aprovado' when 'colhe' then 'Dia Colhe Connosco aprovado' else 'Pedido aprovado' end
                 else case new.tipo when 'agricultor' then 'Adesão não aprovada' when 'selo' then 'Selo Daqui não atribuído' when 'produto' then 'Produto não aprovado' when 'colhe' then 'Dia Colhe Connosco não aprovado' else 'Pedido não aprovado' end end;
  ttl_en := case when ok then case new.tipo when 'agricultor' then 'Your farm was approved' when 'selo' then 'Daqui seal awarded' when 'produto' then 'Product approved' when 'colhe' then 'Join the Harvest day approved' else 'Request approved' end
                 else case new.tipo when 'agricultor' then 'Sign-up not approved' when 'selo' then 'Daqui seal not awarded' when 'produto' then 'Product not approved' when 'colhe' then 'Join the Harvest day not approved' else 'Request not approved' end end;
  txt_pt := coalesce(nullif(trim(new.resposta), ''), case when ok then case new.tipo when 'agricultor' then 'Já aparece no mapa da Daqui. Pode publicar os seus produtos.' when 'selo' then 'O seu restaurante já está no mapa da Daqui.'
      when 'produto' then coalesce(new.campos->>'namePt', '') || ' já está na loja.' when 'colhe' then 'O dia ' || coalesce(new.campos->>'date', '') || ' já está aberto a inscrições.' else '' end
    else 'Veja os detalhes na app ou fale connosco.' end);
  txt_en := coalesce(nullif(trim(new.resposta), ''), case when ok then case new.tipo when 'agricultor' then 'It is now on the Daqui map. You can publish your produce.' when 'selo' then 'Your restaurant is now on the Daqui map.'
      when 'produto' then coalesce(new.campos->>'nameEn', new.campos->>'namePt', '') || ' is now in the shop.' when 'colhe' then 'The day ' || coalesce(new.campos->>'date', '') || ' is open for sign-ups.' else '' end
    else 'See the details in the app or talk to us.' end);
  perform public.daqui_avisar(array[alvo], ttl_pt, txt_pt, ttl_en, txt_en, rota);
  return new;
end $$;
drop trigger if exists daqui_notificar_pedido on public.pedidos;
create trigger daqui_notificar_pedido after insert or update on public.pedidos for each row execute function public.daqui_notificar_pedido();

-- dia Colhe Connosco alterado: avisa os inscritos
create or replace function public.daqui_notificar_dia() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.dia is not distinct from old.dia and new.horario is not distinct from old.horario and new.produto_pt is not distinct from old.produto_pt then return new; end if;
  perform public.daqui_avisar(array(select user_id from public.inscricoes_colhe where dia = new.dia),
    'Colhe Connosco: houve alterações', 'Agora: ' || to_char(new.dia, 'DD/MM') || ', ' || new.horario || '. ' || new.produto_pt || '.',
    'Join the Harvest: something changed', 'Now: ' || to_char(new.dia, 'DD/MM') || ', ' || new.horario || '. ' || new.produto_en || '.', '#/conta/colhe');
  return new;
end $$;
drop trigger if exists daqui_notificar_dia on public.dias_colhe;
create trigger daqui_notificar_dia after update on public.dias_colhe for each row execute function public.daqui_notificar_dia();

-- registo da colheita feito pela gestão: avisa o participante
create or replace function public.daqui_notificar_registo() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.registo is null or new.registo is not distinct from old.registo then return new; end if;
  perform public.daqui_avisar(array[new.user_id], 'O seu registo do Colhe Connosco',
    coalesce(replace(nullif(new.registo->>'kg', ''), '.', ',') || ' kg colhidos. ', '') || 'Veja os detalhes e avalie o dia na app.',
    'Your Join the Harvest record', coalesce(nullif(new.registo->>'kg', '') || ' kg picked. ', '') || 'See the details and review the day in the app.', '#/conta/colhe');
  return new;
end $$;
drop trigger if exists daqui_notificar_registo on public.inscricoes_colhe;
create trigger daqui_notificar_registo after update on public.inscricoes_colhe for each row execute function public.daqui_notificar_registo();

-- mensagens: cliente → gestão; gestão → cliente
create or replace function public.daqui_notificar_mensagem() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.autor = 'cliente' then
    perform public.daqui_avisar(public.daqui_gestores(), 'Mensagem de ' || coalesce(nullif(new.nome, ''), 'um visitante'), left(new.texto, 140),
      'Message from ' || coalesce(nullif(new.nome, ''), 'a visitor'), left(new.texto, 140), '#/g/mensagens');
  elsif new.user_id is not null then
    perform public.daqui_avisar(array[new.user_id], 'Resposta da Daqui', left(new.texto, 140), 'Reply from Daqui', left(new.texto, 140), '#/mensagens');
  end if;
  return new;
end $$;
drop trigger if exists daqui_notificar_mensagem on public.mensagens;
create trigger daqui_notificar_mensagem after insert on public.mensagens for each row execute function public.daqui_notificar_mensagem();

-- todos os dias: quem participou hoje num Colhe Connosco e ainda não avaliou
create or replace function public.daqui_lembrete_avaliar() returns void
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in select d.dia, array_agg(i.user_id) as quem from public.dias_colhe d join public.inscricoes_colhe i on i.dia = d.dia
            where d.dia = current_date and i.avaliacao is null group by d.dia loop
    perform public.daqui_avisar(r.quem, 'Como correu o Colhe Connosco?', 'Avalie o dia na app até daqui a 2 dias.',
      'How was Join the Harvest?', 'Review the day in the app within the next 2 days.', '#/conta/colhe');
  end loop;
end $$;
do $$ begin
  if to_regclass('cron.job') is not null then
    perform cron.unschedule(jobid) from cron.job where jobname = 'daqui-avaliacoes';
    perform cron.schedule('daqui-avaliacoes', '30 18 * * *', 'select public.daqui_lembrete_avaliar()');
  end if;
end $$;

-- =====================================================================================
-- 6. JUNTAR PRODUTOS REPETIDOS QUE JÁ EXISTAM (mesmo nome sem "biológico" e a mesma unidade)
--    Fica o mais antigo; os outros passam a ser produtores dele (o preço guardado é o do convencional, se houver).
-- =====================================================================================
do $$
declare g record; x text;
begin
  for g in
    with p as (
      select id, ordem, unidade, public.daqui_nome_base(nome_pt) as base,
             exists (select 1 from jsonb_array_elements(public.daqui_ofertas(pr)) as e(v) where not coalesce((v->>'organic')::boolean, false)) as conv
        from public.produtos pr)
    select base, unidade, array_agg(id order by ordem, conv desc, id) as ids from p where base <> '' group by base, unidade having count(*) > 1
  loop
    foreach x in array g.ids[2:] loop perform public.juntar_produtos(g.ids[1], x); end loop;
    raise notice 'Daqui: juntados em %: %', g.ids[1], g.ids[2:];
  end loop;
end $$;

-- Fim. Já pode enviar a versão 7 do site para o GitHub.
