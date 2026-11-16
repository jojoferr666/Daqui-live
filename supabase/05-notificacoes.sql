-- =====================================================================================
-- Daqui — 5: NOTIFICAÇÕES NO TELEMÓVEL (mesmo com a app fechada)
-- Corra este ficheiro DEPOIS de criar a função "notificar" no Supabase (LEIA-ME-APP.md do projeto daqui-android, parte B).
-- Antes de correr, substitua as DUAS linhas marcadas com  <<<  mais abaixo.
-- Pode ser corrido mais do que uma vez (por exemplo, para mudar o segredo).
--
-- Como funciona: quando algo muda na base de dados (encomenda nova, estado mudado, pedido aprovado…),
-- estas funções escrevem as mensagens em português ou inglês (conforme a língua de cada telemóvel)
-- e entregam-nas à função "notificar", que as envia pelo Firebase. Todos os dias às 18h (UTC)
-- envia também os lembretes do dia seguinte.
-- =====================================================================================

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- ---------- configuração (só legível pelas funções, nunca pelo site) ----------
create table if not exists public.daqui_config (chave text primary key, valor text not null);
alter table public.daqui_config enable row level security;
insert into public.daqui_config (chave, valor) values
  ('url_notificar', 'https://O-SEU-PROJETO.supabase.co/functions/v1/notificar'),   -- <<< o endereço da função notificar
  ('segredo',       'TROQUE-POR-UM-SEGREDO-LONGO')                                -- <<< o mesmo valor que pôs em DAQUI_SEGREDO
on conflict (chave) do update set valor = excluded.valor;

-- ---------- mensagens ----------
-- uma mensagem por telemóvel das contas indicadas, na língua de cada telemóvel
create or replace function public.daqui_msgs(p_users uuid[], p_pt_titulo text, p_pt_texto text, p_en_titulo text, p_en_texto text, p_rota text)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('token', d.token,
           'titulo', case when d.lingua = 'en' then p_en_titulo else p_pt_titulo end,
           'texto',  case when d.lingua = 'en' then p_en_texto  else p_pt_texto  end,
           'rota', coalesce(p_rota, ''))), '[]'::jsonb)
    from public.dispositivos d where d.user_id = any(p_users);
$$;

-- entrega as mensagens à função "notificar"; nunca faz falhar a operação que a chamou
create or replace function public.daqui_enviar(p_msgs jsonb) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare u text; s text;
begin
  if p_msgs is null or jsonb_array_length(p_msgs) = 0 then return; end if;
  select valor into u from public.daqui_config where chave = 'url_notificar';
  select valor into s from public.daqui_config where chave = 'segredo';
  if coalesce(u, '') = '' or u like '%O-SEU-PROJETO%' then return; end if;
  perform net.http_post(url := u, body := jsonb_build_object('mensagens', p_msgs),
                        headers := jsonb_build_object('Content-Type', 'application/json', 'x-daqui-segredo', coalesce(s, '')));
exception when others then
  raise warning 'Daqui: notificação não enviada: %', sqlerrm;
end $$;

create or replace function public.daqui_admins() returns uuid[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(id), '{}') from public.perfis where papel = 'admin';
$$;
create or replace function public.daqui_euros(v numeric, l text) returns text language sql immutable as $$
  select case when l = 'en' then '€' || to_char(coalesce(v, 0), 'FM999990.00') else replace(to_char(coalesce(v, 0), 'FM999990.00'), '.', ',') || ' €' end;
$$;
create or replace function public.daqui_data(d date, l text) returns text language sql immutable as $$
  select case when l = 'en'
    then (array['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'])[extract(dow from d)::int + 1] || ' ' || extract(day from d)::int || '/' || extract(month from d)::int
    else (array['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'])[extract(dow from d)::int + 1] || ', ' || extract(day from d)::int || '/' || extract(month from d)::int end;
$$;

-- ---------- encomendas: estado mudado (cliente) e novidades (gestão) ----------
create or replace function public.daqui_notificar_encomenda() returns trigger
language plpgsql security definer set search_path = public as $$
declare pt_e text; en_e text; pt_t text; en_t text; quem uuid := auth.uid(); onde text;
begin
  if tg_op = 'INSERT' then
    onde := case when new.entrega = 'pickup' then coalesce(new.ponto, '') else coalesce(new.morada, '') end;
    perform public.daqui_enviar(public.daqui_msgs(public.daqui_admins(),
      'Nova encomenda ' || new.num, new.nome || ', ' || public.daqui_euros(new.total, 'pt') || ', ' || public.daqui_data(new.data_entrega, 'pt') || '. ' || onde,
      'New order ' || new.num,      new.nome || ', ' || public.daqui_euros(new.total, 'en') || ', ' || public.daqui_data(new.data_entrega, 'en') || '. ' || onde,
      '#/g/encomendas'));
    return new;
  end if;
  if new.estado is not distinct from old.estado and new.etapa is not distinct from old.etapa then return new; end if;
  if new.estado = 'cancelada' then
    pt_e := 'Cancelada'; en_e := 'Cancelled'; pt_t := 'A encomenda foi cancelada.'; en_t := 'The order was cancelled.';
  elsif new.etapa is null then return new;
  elsif new.etapa = 0 then pt_e := 'Recebida'; en_e := 'Received'; pt_t := 'Recebemos a sua encomenda.'; en_t := 'We received your order.';
  elsif new.etapa = 1 then pt_e := 'Em preparação'; en_e := 'Being packed'; pt_t := 'Já estamos a preparar a sua encomenda.'; en_t := 'We are packing your order.';
  elsif new.etapa = 2 and new.entrega = 'pickup' then
    pt_e := 'Pronta para levantar'; en_e := 'Ready to collect';
    pt_t := 'Pode levantar em ' || coalesce(new.ponto, '') || '. No ponto de recolha, deslize para confirmar.';
    en_t := 'Collect it at ' || coalesce(new.ponto, '') || '. At the collection point, swipe to confirm.';
  elsif new.etapa = 2 then pt_e := 'Em distribuição'; en_e := 'Out for delivery';
    pt_t := 'Vai a caminho' || coalesce(', ' || nullif(new.janela, ''), '') || '.'; en_t := 'On its way' || coalesce(', ' || nullif(new.janela, ''), '') || '.';
  else
    pt_e := case when new.entrega = 'pickup' then 'Levantada' else 'Entregue' end; en_e := case when new.entrega = 'pickup' then 'Collected' else 'Delivered' end;
    pt_t := 'Bom proveito! Se algo não estiver bem, diga-nos na app.'; en_t := 'Enjoy! If anything is wrong, tell us in the app.';
  end if;
  -- o cliente é avisado quando a mudança não foi feita por ele
  if new.user_id is not null and quem is distinct from new.user_id then
    perform public.daqui_enviar(public.daqui_msgs(array[new.user_id],
      'Encomenda ' || new.num || ': ' || pt_e, pt_t, 'Order ' || new.num || ': ' || en_e, en_t, '#/encomenda/' || new.num));
  end if;
  -- a gestão é avisada quando o cliente cancela ou confirma o levantamento
  if quem is not null and quem = new.user_id and (new.estado = 'cancelada' or new.etapa = 3) then
    perform public.daqui_enviar(public.daqui_msgs(public.daqui_admins(),
      'Encomenda ' || new.num || ': ' || pt_e, new.nome || case when new.estado = 'cancelada' then ' cancelou a encomenda.' else ' confirmou o levantamento.' end,
      'Order ' || new.num || ': ' || en_e, new.nome || case when new.estado = 'cancelada' then ' cancelled the order.' else ' confirmed collection.' end,
      '#/g/encomendas'));
  end if;
  return new;
end $$;
drop trigger if exists daqui_notificar_encomenda on public.encomendas;
create trigger daqui_notificar_encomenda after insert or update on public.encomendas for each row execute function public.daqui_notificar_encomenda();

-- ---------- pedidos: novos (gestão) e aprovados (parceiro) ----------
create or replace function public.daqui_notificar_pedido() returns trigger
language plpgsql security definer set search_path = public as $$
declare tpt text; ten text; quem text; alvo uuid; rota text;
begin
  tpt := case new.tipo when 'selo' then 'Pedido de Selo Daqui' when 'agricultor' then 'Adesão de agricultor' when 'produto' then 'Proposta de produto'
    when 'colhe' then 'Proposta de Colhe Connosco' when 'frio' then 'Armazenamento em frio' when 'gerir' then 'Gerir encomenda' when 'incidencia' then 'Incidência'
    when 'contacto' then 'Mensagem' when 'fundador' then 'Membro fundador' else new.tipo end;
  ten := case new.tipo when 'selo' then 'Daqui seal application' when 'agricultor' then 'Farmer sign-up' when 'produto' then 'Product proposal'
    when 'colhe' then 'Join the Harvest proposal' when 'frio' then 'Cold storage' when 'gerir' then 'Manage order' when 'incidencia' then 'Problem report'
    when 'contacto' then 'Message' when 'fundador' then 'Founding member' else new.tipo end;
  if tg_op = 'INSERT' then
    -- os registos de "ver o estado da encomenda" não geram aviso
    if new.tipo = 'seguimento' or (new.tipo = 'gerir' and coalesce(new.campos->>'action', '') = '') then return new; end if;
    quem := coalesce(new.campos->>'restaurant', new.campos->>'farm', new.campos->>'name', new.campos->>'person', new.username, '');
    perform public.daqui_enviar(public.daqui_msgs(public.daqui_admins(),
      tpt || ' (' || new.id || ')', trim(both ' ,' from quem || coalesce(', ' || new.encomenda, '') || coalesce(', ' || left(coalesce(new.campos->>'what', new.campos->>'message', new.campos->>'namePt'), 80), '')),
      ten || ' (' || new.id || ')', trim(both ' ,' from quem || coalesce(', ' || new.encomenda, '') || coalesce(', ' || left(coalesce(new.campos->>'what', new.campos->>'message', new.campos->>'nameEn', new.campos->>'namePt'), 80), '')),
      '#/g/pedidos'));
    return new;
  end if;
  if new.aprovado and not old.aprovado and new.parceiro is not null then
    select id into alvo from public.perfis where username = new.parceiro;
    if alvo is null then return new; end if;
    rota := case new.tipo when 'selo' then '#/r/perfil' when 'colhe' then '#/p/colhe' else '#/p/produtos' end;
    perform public.daqui_enviar(public.daqui_msgs(array[alvo],
      case new.tipo when 'agricultor' then 'A sua quinta foi aprovada' when 'selo' then 'Selo Daqui atribuído' when 'produto' then 'Produto aprovado' when 'colhe' then 'Dia Colhe Connosco aprovado' else 'Pedido aprovado' end,
      case new.tipo when 'agricultor' then 'Já aparece no mapa da Daqui. Pode publicar os seus produtos.' when 'selo' then 'O seu restaurante já está no mapa da Daqui.'
        when 'produto' then coalesce(new.campos->>'namePt', '') || ' já está na loja.' when 'colhe' then 'O dia ' || coalesce(new.campos->>'date', '') || ' já está aberto a inscrições.' else '' end,
      case new.tipo when 'agricultor' then 'Your farm was approved' when 'selo' then 'Daqui seal awarded' when 'produto' then 'Product approved' when 'colhe' then 'Join the Harvest day approved' else 'Request approved' end,
      case new.tipo when 'agricultor' then 'It is now on the Daqui map. You can publish your produce.' when 'selo' then 'Your restaurant is now on the Daqui map.'
        when 'produto' then coalesce(new.campos->>'nameEn', new.campos->>'namePt', '') || ' is now in the shop.' when 'colhe' then 'The day ' || coalesce(new.campos->>'date', '') || ' is open for sign-ups.' else '' end,
      rota));
  end if;
  return new;
end $$;
drop trigger if exists daqui_notificar_pedido on public.pedidos;
create trigger daqui_notificar_pedido after insert or update on public.pedidos for each row execute function public.daqui_notificar_pedido();

-- ---------- produto voltou ao stock: quem carregou em "Avisar-me" ----------
create or replace function public.daqui_notificar_produto() returns trigger
language plpgsql security definer set search_path = public as $$
declare m int := extract(month from current_date)::int; epoca boolean;
begin
  if not (old.fora_stock and not new.fora_stock) then return new; end if;
  epoca := case when new.epoca_inicio <= new.epoca_fim then m between new.epoca_inicio and new.epoca_fim else m >= new.epoca_inicio or m <= new.epoca_fim end;
  if not epoca then return new; end if;
  perform public.daqui_enviar(public.daqui_msgs(array(select id from public.perfis where new.id = any(avisos)),
    'Já há ' || new.nome_pt, 'Voltou a estar disponível na Daqui.', new.nome_en || ' is back', 'It is available again on Daqui.', '#/produto/' || new.id));
  return new;
end $$;
drop trigger if exists daqui_notificar_produto on public.produtos;
create trigger daqui_notificar_produto after update on public.produtos for each row execute function public.daqui_notificar_produto();

-- ---------- lembretes diários (véspera) ----------
create or replace function public.daqui_lembretes() returns void
language plpgsql security definer set search_path = public as $$
declare r record; amanha date := current_date + 1; m int := extract(month from current_date)::int;
begin
  -- encomendas para amanhã
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
  -- caixas das subscrições ativas que chegam amanhã
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
  -- Colhe Connosco amanhã
  for r in select d.*, a.quinta, array_agg(i.user_id) as quem from public.dias_colhe d join public.inscricoes_colhe i on i.dia = d.dia left join public.agricultores a on a.id = d.agricultor
            where d.dia = amanha group by d.dia, a.quinta loop
    perform public.daqui_enviar(public.daqui_msgs(r.quem,
      'Amanhã: Colhe Connosco', coalesce(r.quinta, '') || ', ' || r.horario || '. Vamos colher ' || lower(r.produto_pt) || '.',
      'Tomorrow: Join the Harvest', coalesce(r.quinta, '') || ', ' || r.horario || '. We are picking ' || lower(r.produto_en) || '.',
      '#/conta/colhe'));
  end loop;
  -- no dia 1 de cada mês: produtos que voltam à época, para quem pediu "Avisar-me"
  if extract(day from current_date) = 1 then
    for r in select * from public.produtos where epoca_inicio = m and not fora_stock loop
      perform public.daqui_enviar(public.daqui_msgs(array(select id from public.perfis where r.id = any(avisos)),
        'Voltou à época: ' || r.nome_pt, 'Já pode encomendar na Daqui.', 'Back in season: ' || r.nome_en, 'You can order it on Daqui now.', '#/produto/' || r.id));
    end loop;
  end if;
end $$;

-- todos os dias às 18h00 UTC (18h em Portugal no inverno, 19h no verão)
select cron.unschedule(jobid) from cron.job where jobname = 'daqui-lembretes';
select cron.schedule('daqui-lembretes', '0 18 * * *', 'select public.daqui_lembretes()');

revoke all on function public.daqui_enviar(jsonb), public.daqui_msgs(uuid[], text, text, text, text, text), public.daqui_lembretes() from public, anon, authenticated;

-- Fim. Para experimentar já os lembretes:  select public.daqui_lembretes();
