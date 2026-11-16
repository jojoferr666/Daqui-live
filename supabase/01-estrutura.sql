-- =====================================================================================
-- Daqui — 1 de 3: ESTRUTURA DA BASE DE DADOS
-- Onde: Supabase → SQL Editor → New query → colar este ficheiro inteiro → Run.
-- Cria as tabelas, as regras de acesso (RLS), as funções e o tempo real.
--
-- ATENÇÃO: pode ser corrido outra vez, mas APAGA e volta a criar as tabelas da Daqui
-- (perde produtos, contas, encomendas e pedidos). Depois corra outra vez o 2 e o 3.
-- =====================================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------- limpar uma instalação anterior ----------
drop view if exists public.colhe_ocupacao;
drop table if exists public.pedidos, public.encomendas, public.inscricoes_colhe, public.subscricoes,
  public.perfis, public.dias_colhe, public.restaurantes, public.caixas_precos, public.produtos, public.agricultores cascade;

-- =====================================================================================
-- CATÁLOGO (toda a gente pode ler; só a gestão altera, com exceções para os parceiros)
-- =====================================================================================
create table public.agricultores (
  id          text primary key,                 -- ex.: 'joaquim' (usado nos endereços /agricultores/joaquim)
  nome        text not null,
  quinta      text not null,
  localidade  text not null default '',
  regiao      text not null default 'aveiro',   -- oeste, aveiro, beiras, ribatejo, alentejo, algarve, tras, madeira
  lat         double precision,
  lon         double precision,
  desde       int,
  cultura     text,                             -- desenho da quinta (chave de ART em js/art.js)
  semente     int not null default 0,
  historia_pt text not null default '',
  historia_en text not null default '',
  extra       jsonb not null default '{}',      -- outros campos (ex.: {"island": "madeira"})
  ordem       int not null default 0
);

create table public.produtos (
  id           text primary key,                -- ex.: 'pera-rocha'
  categoria    text not null check (categoria in ('fruta', 'legumes')),
  nome_pt      text not null,
  nome_en      text not null,
  preco        numeric(8,2) not null check (preco >= 0),
  unidade      text not null default 'kg',      -- kg, un, molho, cuv
  agricultor   text references public.agricultores(id) on update cascade on delete set null,
  desenho      text,                            -- chave de ART em js/art.js
  icone        text,                            -- ficheiro img/produtos/<icone>.svg (vazio = id do produto)
  epoca_inicio int not null default 1 check (epoca_inicio between 1 and 12),
  epoca_fim    int not null default 12 check (epoca_fim between 1 and 12),
  colheita     text,                            -- 'MM-DD' da última colheita, ou n.º de dias desde a colheita
  essencial    boolean not null default false,  -- entra na Caixa Essencial
  biologico    boolean not null default false,
  fora_stock   boolean not null default false,
  divisao      int[] check (divisao is null or (cardinality(divisao) = 3 and divisao[1] + divisao[2] + divisao[3] = 100)),
  desc_pt      text not null default '',
  desc_en      text not null default '',
  extra        jsonb not null default '{}',
  ordem        int not null default 0,
  atualizado   timestamptz not null default now()
);

create table public.caixas_precos (
  caixa   text not null,                        -- caixa-mista, caixa-essencial, caixa-fruta, caixa-legumes
  tamanho text not null,                        -- P, M, G
  kg      numeric not null,
  preco   numeric(8,2) not null check (preco >= 0),
  ordem   int not null default 0,
  primary key (caixa, tamanho)
);

create table public.restaurantes (
  id       text primary key,
  nome     text not null,
  lat      double precision,
  lon      double precision,
  tipo_pt  text not null default '', tipo_en  text not null default '',
  zona_pt  text not null default '', zona_en  text not null default '',
  prato_pt text not null default '', prato_en text not null default '',
  desde    text,                                -- 'AAAA-MM'
  pratos   jsonb not null default '[]',         -- [{"pt": "...", "en": "..."}]
  extra    jsonb not null default '{}',
  ordem    int not null default 0
);

create table public.dias_colhe (
  dia        date primary key,
  agricultor text not null references public.agricultores(id) on update cascade,
  cultura    text,
  produto_pt text not null default '',
  produto_en text not null default '',
  horario    text not null default '10h–13h',
  lugares    int not null check (lugares > 0)
);

-- =====================================================================================
-- PESSOAS E ATIVIDADE
-- =====================================================================================
create table public.perfis (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text not null unique check (username ~ '^[a-z0-9._-]{3,30}$'),
  telemovel  text unique,
  nome       text not null default '',
  email      text,
  papel      text not null default 'cliente' check (papel in ('cliente', 'agricultor', 'restaurante', 'admin')),
  criado     date not null default current_date,
  morada     jsonb,                             -- {"street": "...", "postal": "3800-000", "town": "Aveiro"}
  favoritos  text[] not null default '{}',      -- ids de produtos
  excluidos  text[] not null default '{}',      -- produtos que não quer receber nas caixas
  avisos     text[] not null default '{}',      -- "avisar-me quando voltar à época"
  parceiro   jsonb,                             -- agricultor: {kind, farm, place, region, farmerId, approved}; restaurante: {kind, name, place, restId, approved}
  atualizado timestamptz not null default now()
);

create table public.subscricoes (
  id             text primary key,
  user_id        uuid not null references public.perfis(id) on delete cascade,
  caixa          text not null,
  tamanho        text not null,
  kg             numeric,
  frequencia     text not null default 'sem' check (frequencia in ('sem', 'quinz', 'mens')),
  dia            text not null default 'qui',
  entrega        text not null default 'pickup' check (entrega in ('home', 'pickup')),
  ponto          text not null default '',
  morada         text not null default '',
  descoberta     boolean not null default true,
  pagamento      text,
  preco_guardado numeric(8,2) not null,         -- preço garantido durante 12 meses
  inicio         date not null,
  primeira       date not null,
  estado         text not null default 'ativa' check (estado in ('ativa', 'pausada')),
  baixou         boolean not null default false,
  criada         timestamptz not null default now()
);
create index on public.subscricoes (user_id);

create table public.inscricoes_colhe (
  user_id uuid not null references public.perfis(id) on delete cascade,
  dia     date not null references public.dias_colhe(dia) on update cascade on delete cascade,
  pessoas int not null default 1 check (pessoas between 1 and 10),
  criada  timestamptz not null default now(),
  primary key (user_id, dia)
);

create table public.encomendas (
  num          text primary key check (num ~ '^DQ[0-9]{6}$'),
  user_id      uuid references public.perfis(id) on delete set null,
  username     text,
  nome         text not null,
  telemovel    text not null,
  email        text,
  criada       timestamptz not null default now(),
  data_entrega date not null,
  dia          text,
  entrega      text not null check (entrega in ('home', 'pickup')),
  janela       text,
  ponto        text,
  morada       text,
  artigos      jsonb not null default '[]',     -- [{"id": "pera-rocha", "qty": 2, "price": 1.89, "size": "P"}]
  subtotal     numeric(8,2),
  taxa         numeric(8,2),
  total        numeric(8,2),
  pagamento    text,
  notas        text,
  estado       text not null default 'ativa' check (estado in ('ativa', 'cancelada')),
  etapa        int check (etapa between 0 and 3), -- vazio = automático pela data; 0 recebida … 3 entregue
  preferencias jsonb,                           -- caixas: {"exclude": [...], "favs": [...]} do cliente
  atualizada   timestamptz not null default now()
);
create index on public.encomendas (user_id);

create table public.pedidos (
  id         text primary key,
  tipo       text not null,                     -- selo, agricultor, produto, colhe, frio, gerir, seguimento, incidencia, contacto, fundador
  criado     timestamptz not null default now(),
  estado     text not null default 'novo' check (estado in ('novo', 'tratado')),
  user_id    uuid references public.perfis(id) on delete set null,
  username   text,
  parceiro   text,                              -- username do parceiro que fez o pedido
  encomenda  text,
  aprovado   boolean not null default false,
  produto_id text,
  campos     jsonb not null default '{}'
);
create index on public.pedidos (user_id);

-- =====================================================================================
-- FUNÇÕES DE APOIO ÀS REGRAS
-- =====================================================================================
create or replace function public.eh_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis where id = auth.uid() and papel = 'admin');
$$;

create or replace function public.meu_agricultor() returns text
language sql stable security definer set search_path = public as $$
  select parceiro->>'farmerId' from public.perfis
   where id = auth.uid() and papel = 'agricultor' and coalesce((parceiro->>'approved')::boolean, false);
$$;

create or replace function public.meu_restaurante() returns text
language sql stable security definer set search_path = public as $$
  select parceiro->>'restId' from public.perfis
   where id = auth.uid() and papel = 'restaurante' and coalesce((parceiro->>'approved')::boolean, false);
$$;

-- verdadeiro quando a alteração vem do site (anon/authenticated) e não do SQL Editor ou de uma função interna
create or replace function public.vem_do_site() returns boolean
language sql stable as $$ select current_user in ('anon', 'authenticated'); $$;

-- =====================================================================================
-- TRIGGERS: criar o perfil ao registar e proteger campos que só a gestão pode mudar
-- =====================================================================================
-- cria o perfil de uma conta a partir dos dados do registo (nome de utilizador, telemóvel, tipo de conta…)
create or replace function public.criar_perfil(p_id uuid, p_email text, p_dados jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare m jsonb := coalesce(p_dados, '{}'::jsonb);
        un text := lower(coalesce(m->>'username', ''));
begin
  if un !~ '^[a-z0-9._-]{3,30}$' then un := 'u' || substr(replace(p_id::text, '-', ''), 1, 10); end if;
  insert into public.perfis (id, username, telemovel, nome, email, papel, parceiro)
  values (p_id, un, nullif(m->>'telemovel', ''), coalesce(m->>'nome', ''), p_email,
          case when m->>'papel' in ('agricultor', 'restaurante') then m->>'papel' else 'cliente' end,
          case when jsonb_typeof(m->'parceiro') = 'object' then (m->'parceiro') - 'farmerId' - 'restId' || '{"approved": false}'::jsonb end)
  on conflict do nothing;
end $$;
revoke all on function public.criar_perfil(uuid, text, jsonb) from public, anon, authenticated;

create or replace function public.novo_utilizador() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.criar_perfil(new.id, new.email, new.raw_user_meta_data);
  return new;
end $$;
-- o trigger em auth.users só é criado na primeira vez (as vezes seguintes usam a função atualizada acima)
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'daqui_novo_utilizador' and tgrelid = 'auth.users'::regclass) then
    create trigger daqui_novo_utilizador after insert on auth.users for each row execute function public.novo_utilizador();
  end if;
end $$;

create or replace function public.proteger_perfil() returns trigger
language plpgsql set search_path = public as $$
begin
  new.atualizado := now();
  if not public.vem_do_site() or public.eh_admin() then return new; end if;
  new.id := old.id; new.username := old.username; new.papel := old.papel; new.criado := old.criado;
  if old.parceiro is null then new.parceiro := null;
  else
    new.parceiro := (coalesce(new.parceiro, '{}'::jsonb) - 'approved' - 'farmerId' - 'restId')
      || jsonb_strip_nulls(jsonb_build_object('approved', old.parceiro->'approved', 'farmerId', old.parceiro->'farmerId', 'restId', old.parceiro->'restId'));
  end if;
  return new;
end $$;
create trigger proteger_perfil before update on public.perfis for each row execute function public.proteger_perfil();

-- agricultor parceiro: só pode mudar "fora de stock" nos seus produtos
create or replace function public.proteger_produto() returns trigger
language plpgsql set search_path = public as $$
declare fs boolean := new.fora_stock;
begin
  new.atualizado := now();
  if not public.vem_do_site() or public.eh_admin() then return new; end if;
  new := old; new.fora_stock := fs; new.atualizado := now();
  return new;
end $$;
create trigger proteger_produto before update on public.produtos for each row execute function public.proteger_produto();

-- agricultor parceiro: só muda nome da quinta, localidade e história
create or replace function public.proteger_agricultor() returns trigger
language plpgsql set search_path = public as $$
declare q text := new.quinta; l text := new.localidade; hp text := new.historia_pt; he text := new.historia_en;
begin
  if not public.vem_do_site() or public.eh_admin() then return new; end if;
  new := old; new.quinta := q; new.localidade := l; new.historia_pt := hp; new.historia_en := he;
  return new;
end $$;
create trigger proteger_agricultor before update on public.agricultores for each row execute function public.proteger_agricultor();

-- restaurante parceiro: só muda tipo de cozinha, zona, prato da semana e pratos
create or replace function public.proteger_restaurante() returns trigger
language plpgsql set search_path = public as $$
declare a text := new.tipo_pt; b text := new.tipo_en; c text := new.zona_pt; d text := new.zona_en;
        e text := new.prato_pt; f text := new.prato_en; g jsonb := new.pratos;
begin
  if not public.vem_do_site() or public.eh_admin() then return new; end if;
  new := old; new.tipo_pt := a; new.tipo_en := b; new.zona_pt := c; new.zona_en := d; new.prato_pt := e; new.prato_en := f; new.pratos := g;
  return new;
end $$;
create trigger proteger_restaurante before update on public.restaurantes for each row execute function public.proteger_restaurante();

-- cliente: só pode mudar o dia de entrega ou cancelar; o estado (etapa) é da gestão
create or replace function public.proteger_encomenda() returns trigger
language plpgsql set search_path = public as $$
declare d date := new.data_entrega; dd text := new.dia; e text := new.estado;
begin
  new.atualizada := now();
  if not public.vem_do_site() or public.eh_admin() then return new; end if;
  if tg_op = 'INSERT' then new.estado := 'ativa'; new.etapa := null; new.criada := now(); return new; end if;
  new := old; new.data_entrega := d; new.dia := dd; new.atualizada := now();
  if e = 'cancelada' then new.estado := 'cancelada'; end if;
  return new;
end $$;
create trigger proteger_encomenda before insert or update on public.encomendas for each row execute function public.proteger_encomenda();

create or replace function public.proteger_pedido() returns trigger
language plpgsql set search_path = public as $$
begin
  if public.vem_do_site() and not public.eh_admin() then new.estado := 'novo'; new.aprovado := false; new.criado := now(); end if;
  return new;
end $$;
create trigger proteger_pedido before insert on public.pedidos for each row execute function public.proteger_pedido();

-- Colhe Connosco: não deixa passar o número máximo de participantes
create or replace function public.verificar_lugares() returns trigger
language plpgsql security definer set search_path = public as $$
declare maximo int; usados int;
begin
  select lugares into maximo from public.dias_colhe where dia = new.dia;
  select coalesce(sum(pessoas), 0) into usados from public.inscricoes_colhe where dia = new.dia and user_id <> new.user_id;
  if maximo is not null and usados + new.pessoas > maximo then
    raise exception 'Só restam % lugares neste dia', greatest(maximo - usados, 0) using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger verificar_lugares before insert or update on public.inscricoes_colhe for each row execute function public.verificar_lugares();

-- =====================================================================================
-- REGRAS DE ACESSO (Row Level Security)
-- =====================================================================================
alter table public.agricultores     enable row level security;
alter table public.produtos         enable row level security;
alter table public.caixas_precos    enable row level security;
alter table public.restaurantes     enable row level security;
alter table public.dias_colhe       enable row level security;
alter table public.perfis           enable row level security;
alter table public.subscricoes      enable row level security;
alter table public.inscricoes_colhe enable row level security;
alter table public.encomendas       enable row level security;
alter table public.pedidos          enable row level security;

-- catálogo: leitura pública, escrita da gestão
create policy "catálogo: todos leem" on public.agricultores  for select using (true);
create policy "catálogo: todos leem" on public.produtos      for select using (true);
create policy "catálogo: todos leem" on public.caixas_precos for select using (true);
create policy "catálogo: todos leem" on public.restaurantes  for select using (true);
create policy "catálogo: todos leem" on public.dias_colhe    for select using (true);
create policy "gestão altera" on public.agricultores  for all to authenticated using (public.eh_admin()) with check (public.eh_admin());
create policy "gestão altera" on public.produtos      for all to authenticated using (public.eh_admin()) with check (public.eh_admin());
create policy "gestão altera" on public.caixas_precos for all to authenticated using (public.eh_admin()) with check (public.eh_admin());
create policy "gestão altera" on public.restaurantes  for all to authenticated using (public.eh_admin()) with check (public.eh_admin());
create policy "gestão altera" on public.dias_colhe    for all to authenticated using (public.eh_admin()) with check (public.eh_admin());
-- parceiros aprovados
create policy "agricultor: stock dos seus produtos" on public.produtos for update to authenticated
  using (agricultor = public.meu_agricultor()) with check (agricultor = public.meu_agricultor());
create policy "agricultor: a sua quinta" on public.agricultores for update to authenticated
  using (id = public.meu_agricultor()) with check (id = public.meu_agricultor());
create policy "restaurante: o seu perfil" on public.restaurantes for update to authenticated
  using (id = public.meu_restaurante()) with check (id = public.meu_restaurante());

-- perfis: cada pessoa vê e muda o seu; a gestão vê e muda todos
create policy "perfil: o próprio ou a gestão" on public.perfis for select to authenticated using (id = auth.uid() or public.eh_admin());
create policy "perfil: atualizar"             on public.perfis for update to authenticated using (id = auth.uid() or public.eh_admin()) with check (id = auth.uid() or public.eh_admin());
create policy "perfil: gestão apaga"          on public.perfis for delete to authenticated using (public.eh_admin());

create policy "subscrições: o próprio ou a gestão" on public.subscricoes for all to authenticated
  using (user_id = auth.uid() or public.eh_admin()) with check (user_id = auth.uid() or public.eh_admin());
create policy "colhe: o próprio ou a gestão" on public.inscricoes_colhe for all to authenticated
  using (user_id = auth.uid() or public.eh_admin()) with check (user_id = auth.uid() or public.eh_admin());

-- encomendas: qualquer visitante pode encomendar; cada conta vê as suas; a gestão vê todas
create policy "encomendas: criar" on public.encomendas for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid() or public.eh_admin());
create policy "encomendas: ver"   on public.encomendas for select to authenticated using (user_id = auth.uid() or public.eh_admin());
create policy "encomendas: mudar" on public.encomendas for update to authenticated using (user_id = auth.uid() or public.eh_admin()) with check (user_id = auth.uid() or public.eh_admin());
create policy "encomendas: gestão apaga" on public.encomendas for delete to authenticated using (public.eh_admin());

-- pedidos e mensagens: qualquer visitante envia; cada conta vê os seus; a gestão trata
create policy "pedidos: enviar" on public.pedidos for insert to anon, authenticated with check (user_id is null or user_id = auth.uid());
create policy "pedidos: ver"    on public.pedidos for select to authenticated using (user_id = auth.uid() or public.eh_admin());
create policy "pedidos: gestão trata" on public.pedidos for update to authenticated using (public.eh_admin()) with check (public.eh_admin());
create policy "pedidos: gestão apaga" on public.pedidos for delete to authenticated using (public.eh_admin());

grant usage on schema public to anon, authenticated;
grant select on public.agricultores, public.produtos, public.caixas_precos, public.restaurantes, public.dias_colhe to anon, authenticated;
grant insert, update, delete on public.agricultores, public.produtos, public.caixas_precos, public.restaurantes, public.dias_colhe to authenticated;
grant select, insert, update, delete on public.perfis, public.subscricoes, public.inscricoes_colhe, public.encomendas, public.pedidos to authenticated;
grant insert on public.encomendas, public.pedidos to anon;

-- lugares ocupados em cada dia Colhe Connosco (só totais, sem nomes)
create view public.colhe_ocupacao as
  select dia, sum(pessoas)::int as pessoas from public.inscricoes_colhe group by dia;
grant select on public.colhe_ocupacao to anon, authenticated;

-- =====================================================================================
-- FUNÇÕES CHAMADAS PELO SITE
-- =====================================================================================
-- entrar com nome de utilizador, telemóvel ou e-mail: devolve o e-mail da conta
create or replace function public.email_para_login(p_login text, p_tel text default '') returns text
language sql stable security definer set search_path = public as $$
  select email from public.perfis
   where username = lower(trim(p_login)) or lower(email) = lower(trim(p_login))
      or (coalesce(p_tel, '') <> '' and telemovel = p_tel)
   limit 1;
$$;

-- antes de criar conta: o nome de utilizador, o telemóvel e o e-mail estão livres?
create or replace function public.login_disponivel(p_username text, p_tel text, p_email text default '') returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'username',  not exists (select 1 from public.perfis where username = lower(trim(p_username))),
    'telemovel', not exists (select 1 from public.perfis where telemovel = p_tel),
    'email',     not exists (select 1 from auth.users where lower(email) = lower(trim(p_email))));
$$;

-- visitante sem conta: ver uma encomenda com o número e o telemóvel
create or replace function public.encomenda_por_numero(p_num text, p_tel text) returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(e) - 'user_id' from public.encomendas e where e.num = upper(p_num) and e.telemovel = p_tel;
$$;

-- visitante sem conta: mudar o dia ou cancelar (só antes de a encomenda entrar em preparação)
create or replace function public.gerir_encomenda(p_num text, p_tel text, p_data date default null, p_dia text default null, p_cancelar boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r public.encomendas;
begin
  update public.encomendas
     set data_entrega = coalesce(p_data, data_entrega), dia = coalesce(p_dia, dia),
         estado = case when p_cancelar then 'cancelada' else estado end
   where num = upper(p_num) and telemovel = p_tel and estado = 'ativa' and coalesce(etapa, 0) = 0
  returning * into r;
  if r.num is null then return null; end if;
  return to_jsonb(r) - 'user_id';
end $$;

grant execute on function public.email_para_login(text, text), public.login_disponivel(text, text, text),
  public.encomenda_por_numero(text, text), public.gerir_encomenda(text, text, date, text, boolean),
  public.eh_admin(), public.meu_agricultor(), public.meu_restaurante() to anon, authenticated;

-- =====================================================================================
-- TEMPO REAL: o site recebe um aviso sempre que estas tabelas mudam
-- =====================================================================================
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.agricultores, public.produtos, public.caixas_precos,
      public.restaurantes, public.dias_colhe, public.perfis, public.subscricoes, public.inscricoes_colhe,
      public.encomendas, public.pedidos;
  end if;
end $$;

-- se este ficheiro foi corrido outra vez, as contas que já existiam voltam a ter perfil
select public.criar_perfil(id, email, raw_user_meta_data) from auth.users;

-- Fim. Agora corra 02-catalogo.sql e depois 03-contas.sql.
