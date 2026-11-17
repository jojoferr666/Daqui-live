-- =====================================================================================
-- Daqui — 07-colhe-e-produtos.sql  (versão 9 do site e da app)
--
-- Onde: Supabase → SQL Editor → New query → colar este ficheiro inteiro → Run.
-- Quando: ANTES de enviar a versão 9 do site para o GitHub (o site novo já usa estas colunas e funções).
-- Precisa de: 01 a 06 já corridos. Pode ser corrido mais do que uma vez. Não apaga dados.
-- Depois de correr este ficheiro, NÃO volte a correr o 06 (voltaria a pôr as regras antigas do Colhe Connosco).
--
-- O que muda:
--   1. Colhe Connosco: vários dias na mesma data (em quintas diferentes). Cada dia passa a ter um id;
--      as inscrições ficam ligadas ao id do dia (e não à data).
--   2. A avaliação de um dia Colhe Connosco só se envia uma vez.
--   3. Registo da colheita com valor pago e identificador (CC-aammdd-nnnn); o aviso ao cliente mostra-os.
--   4. Agricultor: "Deixar de vender" um produto. Sem nenhum produtor, o produto fica sem stock.
--   5. Produtos novos com fotografia: coluna "foto" e pasta pública "produtos" no Storage.
-- =====================================================================================

-- =====================================================================================
-- 1. COLHE CONNOSCO: um id por dia (pode haver vários dias na mesma data)
-- =====================================================================================
alter table public.dias_colhe add column if not exists id text;
update public.dias_colhe set id = to_char(dia, 'YYYY-MM-DD') || '-' || agricultor where id is null;
alter table public.dias_colhe alter column id set not null;
alter table public.dias_colhe alter column id set default ('c-' || substr(md5(random()::text || clock_timestamp()::text), 1, 10));

alter table public.inscricoes_colhe add column if not exists dia_id text;
update public.inscricoes_colhe i set dia_id = d.id from public.dias_colhe d where i.dia_id is null and d.dia = i.dia;

-- troca das chaves: só da primeira vez (enquanto a chave dos dias ainda é a data)
do $$
declare c record;
begin
  if exists (select 1 from pg_constraint where conrelid = 'public.dias_colhe'::regclass and contype = 'p' and pg_get_constraintdef(oid) = 'PRIMARY KEY (dia)') then
    delete from public.inscricoes_colhe where dia_id is null;   -- inscrições num dia que já não existe (antes de mexer nas chaves)
    for c in select conname from pg_constraint where conrelid = 'public.inscricoes_colhe'::regclass and contype in ('f', 'p') loop
      execute format('alter table public.inscricoes_colhe drop constraint %I', c.conname);
    end loop;
    for c in select conname from pg_constraint where conrelid = 'public.dias_colhe'::regclass and contype = 'p' loop
      execute format('alter table public.dias_colhe drop constraint %I', c.conname);
    end loop;
    alter table public.dias_colhe add constraint dias_colhe_pkey primary key (id);
    alter table public.dias_colhe add constraint dias_colhe_dia_agricultor unique (dia, agricultor);
    alter table public.inscricoes_colhe alter column dia_id set not null;
    alter table public.inscricoes_colhe add constraint inscricoes_colhe_pkey primary key (user_id, dia_id);
    alter table public.inscricoes_colhe add constraint inscricoes_colhe_dia_id_fkey foreign key (dia_id) references public.dias_colhe(id) on update cascade on delete cascade;
    alter table public.inscricoes_colhe add constraint inscricoes_colhe_user_id_fkey foreign key (user_id) references public.perfis(id) on delete cascade;
    raise notice 'Daqui: dias Colhe Connosco passaram a ter id.';
  end if;
end $$;

-- a data guardada na inscrição acompanha sempre a do dia (e as versões antigas do site, que só mandam a data, continuam a funcionar)
create or replace function public.daqui_dia_inscricao() returns trigger
language plpgsql security definer set search_path = public as $$
declare d public.dias_colhe;
begin
  if new.dia_id is null and new.dia is not null then
    select id into new.dia_id from public.dias_colhe where dia = new.dia order by id limit 1;
  end if;
  select * into d from public.dias_colhe where id = new.dia_id;
  if d.id is not null then new.dia := d.dia; end if;
  return new;
end $$;
drop trigger if exists daqui_dia_inscricao on public.inscricoes_colhe;
create trigger daqui_dia_inscricao before insert or update on public.inscricoes_colhe for each row execute function public.daqui_dia_inscricao();

create or replace function public.daqui_dia_mudou() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.dia is distinct from old.dia then update public.inscricoes_colhe set dia = new.dia where dia_id = new.id; end if;
  return new;
end $$;
drop trigger if exists daqui_dia_mudou on public.dias_colhe;
create trigger daqui_dia_mudou after update on public.dias_colhe for each row execute function public.daqui_dia_mudou();

-- lugares ocupados por dia (só totais, sem nomes); a coluna dia_id é nova, no fim
create or replace view public.colhe_ocupacao as
  select dia, sum(pessoas)::int as pessoas, dia_id from public.inscricoes_colhe group by dia_id, dia;
grant select on public.colhe_ocupacao to anon, authenticated;

-- número máximo de participantes, por dia
create or replace function public.verificar_lugares() returns trigger
language plpgsql security definer set search_path = public as $$
declare maximo int; usados int;
begin
  select lugares into maximo from public.dias_colhe where id = new.dia_id;
  select coalesce(sum(pessoas), 0) into usados from public.inscricoes_colhe where dia_id = new.dia_id and user_id <> new.user_id;
  if maximo is not null and usados + new.pessoas > maximo then
    raise exception 'Só restam % lugares neste dia', greatest(maximo - usados, 0) using errcode = 'P0001';
  end if;
  return new;
end $$;

-- cliente: avalia uma só vez, entre o início do dia e 48 h depois do fim; não mexe no registo nem muda de dia
create or replace function public.proteger_inscricao() returns trigger
language plpgsql set search_path = public as $$
declare d public.dias_colhe; ini timestamptz; fim timestamptz;
begin
  if not public.vem_do_site() or public.eh_admin() then
    if new.avaliacao is distinct from (case when tg_op = 'UPDATE' then old.avaliacao end) then new.avaliado := now(); end if;
    return new;
  end if;
  if tg_op = 'INSERT' then new.avaliacao := null; new.comentario := null; new.avaliado := null; new.registo := null; return new; end if;
  select * into d from public.dias_colhe where id = old.dia_id;
  select j.inicio, j.fim into ini, fim from public.daqui_janela_colhe(d.dia, d.horario) as j;
  new.registo := old.registo; new.dia_id := old.dia_id;
  if new.avaliacao is distinct from old.avaliacao or new.comentario is distinct from old.comentario then
    if old.avaliacao is not null or now() < ini or now() > fim + interval '48 hours' then
      new.avaliacao := old.avaliacao; new.comentario := old.comentario; new.avaliado := old.avaliado;
    else
      new.avaliado := now(); new.comentario := left(new.comentario, 600);
    end if;
  end if;
  if new.pessoas is distinct from old.pessoas and now() >= ini then new.pessoas := old.pessoas; end if;
  return new;
end $$;

-- agricultor (ou gestão): editar um dia antes de começar (agora pelo id do dia)
drop function if exists public.editar_dia_colhe(date, date, text, int, text, text, text);
create or replace function public.editar_dia_colhe(p_id text, p_novo_dia date, p_horario text, p_lugares int, p_produto_pt text, p_produto_en text, p_cultura text default null) returns void
language plpgsql security definer set search_path = public as $$
declare d public.dias_colhe; ini timestamptz; ocupados int;
begin
  select * into d from public.dias_colhe where id = p_id;
  if d.id is null then raise exception 'Dia Colhe Connosco não encontrado' using errcode = 'P0001'; end if;
  if not public.eh_admin() and d.agricultor is distinct from public.meu_agricultor() then raise exception 'Este dia não é da sua quinta' using errcode = '42501'; end if;
  select j.inicio into ini from public.daqui_janela_colhe(d.dia, d.horario) as j;
  if not public.eh_admin() and now() >= ini then raise exception 'Este dia já começou: já não pode ser alterado' using errcode = 'P0001'; end if;
  if p_novo_dia < current_date then raise exception 'Escolha uma data a partir de hoje' using errcode = 'P0001'; end if;
  if p_novo_dia <> d.dia and exists (select 1 from public.dias_colhe where dia = p_novo_dia and agricultor = d.agricultor and id <> d.id) then
    raise exception 'A sua quinta já tem um dia Colhe Connosco nessa data' using errcode = 'P0001';
  end if;
  select coalesce(sum(pessoas), 0) into ocupados from public.inscricoes_colhe where dia_id = p_id;
  update public.dias_colhe
     set dia = p_novo_dia, horario = coalesce(nullif(p_horario, ''), horario), lugares = greatest(coalesce(p_lugares, lugares), ocupados, 1),
         produto_pt = coalesce(nullif(p_produto_pt, ''), produto_pt), produto_en = coalesce(nullif(p_produto_en, ''), produto_en), cultura = coalesce(p_cultura, cultura)
   where id = p_id;
end $$;
grant execute on function public.editar_dia_colhe(text, date, text, int, text, text, text) to authenticated;

-- agricultor: resumo dos seus dias (participantes, avaliações sem nomes, quilos e valor registados)
drop function if exists public.colhe_resumo_agricultor();
create function public.colhe_resumo_agricultor() returns table (dia date, pessoas int, n int, media numeric, kg numeric, comentarios jsonb, dia_id text)
language sql stable security definer set search_path = public as $$
  select d.dia, coalesce(sum(i.pessoas), 0)::int, count(i.avaliacao)::int, round(avg(i.avaliacao)::numeric, 2),
         coalesce(sum(nullif(i.registo->>'kg', '')::numeric), 0),
         coalesce(jsonb_agg(jsonb_build_object('rating', i.avaliacao, 'comment', coalesce(i.comentario, ''))) filter (where i.avaliacao is not null), '[]'::jsonb),
         d.id
    from public.dias_colhe d left join public.inscricoes_colhe i on i.dia_id = d.id
   where d.agricultor = public.meu_agricultor()
   group by d.id, d.dia;
$$;
grant execute on function public.colhe_resumo_agricultor() to authenticated;

-- avisos: dia alterado (inscritos desse dia), registo da colheita (participante) e lembrete para avaliar
create or replace function public.daqui_notificar_dia() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.dia is not distinct from old.dia and new.horario is not distinct from old.horario and new.produto_pt is not distinct from old.produto_pt then return new; end if;
  perform public.daqui_avisar(array(select user_id from public.inscricoes_colhe where dia_id = new.id),
    'Colhe Connosco: houve alterações', 'Agora: ' || to_char(new.dia, 'DD/MM') || ', ' || new.horario || '. ' || new.produto_pt || '.',
    'Join the Harvest: something changed', 'Now: ' || to_char(new.dia, 'DD/MM') || ', ' || new.horario || '. ' || new.produto_en || '.', '#/conta/colhe');
  return new;
end $$;

create or replace function public.daqui_notificar_registo() returns trigger
language plpgsql security definer set search_path = public as $$
declare kg text; eur numeric; ref text;
begin
  if new.registo is null or new.registo is not distinct from old.registo then return new; end if;
  kg := nullif(new.registo->>'kg', ''); eur := nullif(new.registo->>'price', '')::numeric; ref := nullif(new.registo->>'id', '');
  perform public.daqui_avisar(array[new.user_id], 'Registo do Colhe Connosco' || coalesce(' ' || ref, ''),
    coalesce(nullif(concat_ws(' · ', replace(kg, '.', ',') || ' kg colhidos', replace(to_char(eur, 'FM999990.00'), '.', ',') || ' € pagos'), '') || '. ', '') || 'Aparece nas suas encomendas.',
    'Join the Harvest record' || coalesce(' ' || ref, ''),
    coalesce(nullif(concat_ws(' · ', kg || ' kg picked', '€' || to_char(eur, 'FM999990.00') || ' paid'), '') || '. ', '') || 'It shows in your orders.', '#/conta/encomendas');
  return new;
end $$;

create or replace function public.daqui_lembrete_avaliar() returns void
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in select d.id, array_agg(i.user_id) as quem from public.dias_colhe d join public.inscricoes_colhe i on i.dia_id = d.id
            where d.dia = current_date and i.avaliacao is null group by d.id loop
    perform public.daqui_avisar(r.quem, 'Como correu o Colhe Connosco?', 'Avalie o dia na app até daqui a 2 dias. A avaliação só se envia uma vez.',
      'How was Join the Harvest?', 'Review the day in the app within the next 2 days. You can send it once.', '#/conta/colhe');
  end loop;
end $$;

-- lembretes diários de 05-notificacoes.sql: o Colhe Connosco de amanhã passa a ser por dia (pode haver vários na mesma data)
do $do$
begin
  if to_regprocedure('public.daqui_lembretes()') is null or to_regprocedure('public.daqui_enviar(jsonb)') is null then return; end if;
  execute $fn$
create or replace function public.daqui_lembretes() returns void
language plpgsql security definer set search_path = public as $$
declare r record; amanha date := current_date + 1; m int := extract(month from current_date)::int;
begin
  for r in select * from public.encomendas where data_entrega = amanha and estado = 'ativa' and coalesce(etapa, 0) < 3 and user_id is not null loop
    perform public.daqui_enviar(public.daqui_msgs(array[r.user_id],
      'Amanhã: encomenda ' || r.num,
      case when r.entrega = 'pickup' then 'Levantamento em ' || coalesce(r.ponto, '') || case when extract(dow from amanha) = 4 then ', 16h–20h.' else ', 9h–13h.' end
           else 'Entrega em casa' || coalesce(', ' || nullif(r.janela, ''), '') || '.' end,
      'Tomorrow: order ' || r.num,
      case when r.entrega = 'pickup' then 'Collect it at ' || coalesce(r.ponto, '') || case when extract(dow from amanha) = 4 then ', 4–8 pm.' else ', 9 am–1 pm.' end
           else 'Home delivery' || coalesce(', ' || nullif(r.janela, ''), '') || '.' end,
      '#/encomenda/' || r.num));
  end loop;
  for r in select s.*, case s.caixa when 'caixa-mista' then 'Caixa Mista' when 'caixa-essencial' then 'Caixa Essencial' when 'caixa-fruta' then 'Caixa de Fruta' else 'Caixa de Legumes' end as nome_pt,
                  case s.caixa when 'caixa-mista' then 'Mixed Box' when 'caixa-essencial' then 'Essentials Box' when 'caixa-fruta' then 'Fruit Box' else 'Vegetable Box' end as nome_en
             from public.subscricoes s
            where s.estado = 'ativa' and amanha >= s.primeira
              and (amanha - s.primeira) % (case s.frequencia when 'quinz' then 14 when 'mens' then 28 else 7 end) = 0 loop
    perform public.daqui_enviar(public.daqui_msgs(array[r.user_id],
      'Amanhã chega a sua ' || r.nome_pt, case when r.entrega = 'pickup' then 'Levantamento em ' || r.ponto || '.' else 'Entrega em casa.' end || ' Ainda pode mudar as preferências na app.',
      'Your ' || r.nome_en || ' arrives tomorrow', case when r.entrega = 'pickup' then 'Collect it at ' || r.ponto || '.' else 'Home delivery.' end || ' You can still change your preferences in the app.',
      '#/conta/subscricoes'));
  end loop;
  for r in select d.id, d.horario, d.produto_pt, d.produto_en, a.quinta, array_agg(i.user_id) as quem
             from public.dias_colhe d join public.inscricoes_colhe i on i.dia_id = d.id left join public.agricultores a on a.id = d.agricultor
            where d.dia = amanha group by d.id, d.horario, d.produto_pt, d.produto_en, a.quinta loop
    perform public.daqui_enviar(public.daqui_msgs(r.quem,
      'Amanhã: Colhe Connosco', coalesce(r.quinta, '') || ', ' || r.horario || '. Vamos colher ' || lower(r.produto_pt) || '.',
      'Tomorrow: Join the Harvest', coalesce(r.quinta, '') || ', ' || r.horario || '. We are picking ' || lower(r.produto_en) || '.',
      '#/conta/colhe'));
  end loop;
  if extract(day from current_date) = 1 then
    for r in select * from public.produtos where epoca_inicio = m and not fora_stock loop
      perform public.daqui_enviar(public.daqui_msgs(array(select id from public.perfis where r.id = any(avisos)),
        'Voltou à época: ' || r.nome_pt, 'Já pode encomendar na Daqui.', 'Back in season: ' || r.nome_en, 'You can order it on Daqui now.', '#/produto/' || r.id));
    end loop;
  end if;
end $$;
$fn$;
  execute 'revoke all on function public.daqui_lembretes() from public, anon, authenticated';
end $do$;

-- =====================================================================================
-- 4. PRODUTOS: o agricultor deixa de vender um produto
-- =====================================================================================
create or replace function public.deixar_produto(p_produto text) returns void
language plpgsql security definer set search_path = public as $$
declare f text := public.meu_agricultor(); r public.produtos; ofs jsonb;
begin
  if f is null then raise exception 'Só agricultores aprovados' using errcode = '42501'; end if;
  select * into r from public.produtos where id = p_produto;
  if r.id is null then raise exception 'Produto não encontrado' using errcode = 'P0001'; end if;
  ofs := public.daqui_ofertas(r);
  if not exists (select 1 from jsonb_array_elements(ofs) as e(v) where v->>'farmer' = f) then raise exception 'Este produto não é seu' using errcode = '42501'; end if;
  select coalesce(jsonb_agg(v order by n), '[]'::jsonb) into ofs from jsonb_array_elements(ofs) with ordinality as e(v, n) where v->>'farmer' is distinct from f;
  update public.produtos
     set produtores = ofs,
         agricultor = case when exists (select 1 from jsonb_array_elements(ofs) as e(v) where v->>'farmer' = r.agricultor) then r.agricultor else ofs->0->>'farmer' end,
         biologico  = exists (select 1 from jsonb_array_elements(ofs) as e(v) where coalesce((v->>'organic')::boolean, false)),
         fora_stock = jsonb_array_length(ofs) = 0 or not exists (select 1 from jsonb_array_elements(ofs) as e(v) where not coalesce((v->>'outOfStock')::boolean, false))
   where id = p_produto;
end $$;
grant execute on function public.deixar_produto(text) to authenticated;

-- =====================================================================================
-- 5. PRODUTOS NOVOS COM FOTOGRAFIA
-- =====================================================================================
alter table public.produtos add column if not exists foto text;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('produtos', 'produtos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "produtos: enviar fotografias" on storage.objects;
create policy "produtos: enviar fotografias" on storage.objects for insert to authenticated with check (bucket_id = 'produtos');

notify pgrst, 'reload schema';
-- Fim. Já pode enviar a versão 9 do site para o GitHub.
