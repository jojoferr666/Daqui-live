-- =====================================================================================
-- Daqui — 4: APP PARA TELEMÓVEL
-- Onde: Supabase → SQL Editor → New query → colar este ficheiro inteiro → Run (depois do 01, 02 e 03).
-- Pode ser corrido mais do que uma vez.
--   - dispositivos: os telemóveis que recebem notificações (um por sessão iniciada na app);
--   - fotografias das incidências (tiradas com a câmara da app ou escolhidas no site);
--   - "deslizar para confirmar o levantamento" no ponto de recolha.
-- =====================================================================================

-- ---------- telemóveis que recebem notificações ----------
create table if not exists public.dispositivos (
  token      text primary key,                  -- código do telemóvel dado pelo Firebase
  user_id    uuid not null references public.perfis(id) on delete cascade,
  plataforma text not null default 'android',
  lingua     text not null default 'pt' check (lingua in ('pt', 'en')),
  atualizado timestamptz not null default now()
);
alter table public.dispositivos enable row level security;   -- sem regras: só as funções abaixo lhe mexem
create index if not exists dispositivos_user_id on public.dispositivos (user_id);

-- a app chama esta função quando o telemóvel recebe o código; se o telemóvel mudar de conta, passa para a nova
create or replace function public.registar_dispositivo(p_token text, p_plataforma text default 'android', p_lingua text default 'pt') returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or coalesce(p_token, '') = '' then return; end if;
  insert into public.dispositivos (token, user_id, plataforma, lingua) values (p_token, auth.uid(), coalesce(p_plataforma, 'android'), case when p_lingua = 'en' then 'en' else 'pt' end)
  on conflict (token) do update set user_id = excluded.user_id, plataforma = excluded.plataforma, lingua = excluded.lingua, atualizado = now();
end $$;
create or replace function public.remover_dispositivo(p_token text) returns void
language sql security definer set search_path = public as $$
  delete from public.dispositivos where token = p_token and user_id = auth.uid();
$$;
grant execute on function public.registar_dispositivo(text, text, text), public.remover_dispositivo(text) to authenticated;

-- ---------- fotografias das incidências (pasta pública "incidencias" do Storage) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('incidencias', 'incidencias', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "incidencias: enviar fotografias" on storage.objects;
create policy "incidencias: enviar fotografias" on storage.objects for insert to anon, authenticated with check (bucket_id = 'incidencias');

-- ---------- levantamento: o cliente confirma no ponto de recolha ----------
-- regra nova: além de mudar o dia ou cancelar, o cliente pode marcar como "Levantada" (etapa 3)
-- uma encomenda de levantamento sua, ativa, no dia (ou depois) ou quando a gestão a pôs "Pronta para levantar"
create or replace function public.proteger_encomenda() returns trigger
language plpgsql set search_path = public as $$
declare d date := new.data_entrega; dd text := new.dia; e text := new.estado; et int := new.etapa;
begin
  new.atualizada := now();
  if not public.vem_do_site() or public.eh_admin() then return new; end if;
  if tg_op = 'INSERT' then new.estado := 'ativa'; new.etapa := null; new.criada := now(); return new; end if;
  new := old; new.data_entrega := d; new.dia := dd; new.atualizada := now();
  if e = 'cancelada' then new.estado := 'cancelada'; end if;
  if et = 3 and old.entrega = 'pickup' and old.estado = 'ativa' and (old.data_entrega <= current_date or old.etapa = 2) then new.etapa := 3; end if;
  return new;
end $$;

-- o mesmo para quem encomendou sem conta (número + telemóvel)
create or replace function public.confirmar_levantamento(p_num text, p_tel text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r public.encomendas;
begin
  update public.encomendas set etapa = 3
   where num = upper(p_num) and telemovel = p_tel and entrega = 'pickup' and estado = 'ativa'
     and (data_entrega <= current_date or etapa = 2)
  returning * into r;
  if r.num is null then return null; end if;
  return to_jsonb(r) - 'user_id';
end $$;
grant execute on function public.confirmar_levantamento(text, text) to anon, authenticated;


-- Fim. As notificações precisam também do 05-notificacoes.sql (ver LEIA-ME-APP.md).
