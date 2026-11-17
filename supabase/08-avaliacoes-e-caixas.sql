-- =====================================================================================
-- Daqui — 08-avaliacoes-e-caixas.sql  (versão 10 do site e da app)
--
-- Onde: Supabase → SQL Editor → New query → colar este ficheiro inteiro → Run.
-- Quando: ANTES de enviar a versão 10 do site para o GitHub.
-- Precisa de: 01 a 07 já corridos. Pode ser corrido mais do que uma vez. Não apaga dados.
--
-- O que muda:
--   1. Colhe Connosco: a gestão pode responder aos comentários dos dias passados (o participante recebe aviso).
--   2. Lista pública das avaliações dos dias passados (primeiro nome, estrelas, comentário, resposta), sem dados pessoais.
--   3. Caixas novas criadas na gestão (ex.: frutos secos, aromáticas, fruta exótica): tabela "caixas".
-- =====================================================================================

-- =====================================================================================
-- 1. RESPOSTAS DA GESTÃO AOS COMENTÁRIOS DO COLHE CONNOSCO
-- =====================================================================================
alter table public.inscricoes_colhe add column if not exists resposta text;
alter table public.inscricoes_colhe add column if not exists respondido timestamptz;

-- cliente: avalia uma só vez (entre o início do dia e 48 h depois do fim); não mexe no registo, na resposta nem no dia
create or replace function public.proteger_inscricao() returns trigger
language plpgsql set search_path = public as $$
declare d public.dias_colhe; ini timestamptz; fim timestamptz;
begin
  if not public.vem_do_site() or public.eh_admin() then
    if new.avaliacao is distinct from (case when tg_op = 'UPDATE' then old.avaliacao end) then new.avaliado := now(); end if;
    if new.resposta is distinct from (case when tg_op = 'UPDATE' then old.resposta end) then
      new.resposta := nullif(left(btrim(new.resposta), 600), ''); new.respondido := case when new.resposta is null then null else now() end;
    end if;
    return new;
  end if;
  if tg_op = 'INSERT' then new.avaliacao := null; new.comentario := null; new.avaliado := null; new.registo := null; new.resposta := null; new.respondido := null; return new; end if;
  select * into d from public.dias_colhe where id = old.dia_id;
  select j.inicio, j.fim into ini, fim from public.daqui_janela_colhe(d.dia, d.horario) as j;
  new.registo := old.registo; new.dia_id := old.dia_id; new.resposta := old.resposta; new.respondido := old.respondido;
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

-- avaliações públicas dos dias Colhe Connosco: só o primeiro nome, as estrelas, o comentário e a resposta da Daqui
drop function if exists public.colhe_avaliacoes();
create function public.colhe_avaliacoes() returns table (dia_id text, nome text, avaliacao int, comentario text, resposta text, avaliado timestamptz)
language sql stable security definer set search_path = public as $$
  select i.dia_id, split_part(btrim(coalesce(p.nome, '')), ' ', 1), i.avaliacao, coalesce(i.comentario, ''), coalesce(i.resposta, ''), i.avaliado
    from public.inscricoes_colhe i left join public.perfis p on p.id = i.user_id
   where i.avaliacao is not null
   order by i.avaliado desc nulls last;
$$;
grant execute on function public.colhe_avaliacoes() to anon, authenticated;

-- aviso ao participante quando a gestão responde ao seu comentário (precisa do 05/06 para as notificações)
create or replace function public.daqui_notificar_resposta_colhe() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.resposta is null or new.resposta is not distinct from old.resposta then return new; end if;
  if to_regprocedure('public.daqui_avisar(uuid[], text, text, text, text, text)') is null then return new; end if;
  perform public.daqui_avisar(array[new.user_id], 'A Daqui respondeu ao seu comentário', left(new.resposta, 140),
    'Daqui replied to your comment', left(new.resposta, 140), '#/colhe');
  return new;
end $$;
drop trigger if exists daqui_notificar_resposta_colhe on public.inscricoes_colhe;
create trigger daqui_notificar_resposta_colhe after update of resposta on public.inscricoes_colhe for each row execute function public.daqui_notificar_resposta_colhe();

-- =====================================================================================
-- 2. CAIXAS NOVAS CRIADAS NA GESTÃO
--    (as 4 caixas da Daqui continuam definidas em js/data.js; os preços de todas estão em caixas_precos)
-- =====================================================================================
create table if not exists public.caixas (
  id        text primary key,                    -- ex.: 'caixa-de-frutos-secos'
  nome_pt   text not null,
  nome_en   text not null default '',
  desc_pt   text not null default '',
  desc_en   text not null default '',
  produtos  text[] not null default '{}',       -- produtos que a caixa pode levar (cada semana, os da época)
  icone     text,                                -- ficheiro img/produtos/<icone>.svg (vazio = desenho com os produtos)
  ordem     int not null default 0,
  criada    timestamptz not null default now()
);
alter table public.caixas enable row level security;
drop policy if exists "caixas: todos leem" on public.caixas;
create policy "caixas: todos leem" on public.caixas for select using (true);
drop policy if exists "caixas: gestão altera" on public.caixas;
create policy "caixas: gestão altera" on public.caixas for all to authenticated using (public.eh_admin()) with check (public.eh_admin());
grant select on public.caixas to anon, authenticated;
grant insert, update, delete on public.caixas to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'caixas') then
    alter publication supabase_realtime add table public.caixas;
  end if;
end $$;

notify pgrst, 'reload schema';
-- Fim. Já pode enviar a versão 10 do site para o GitHub.
