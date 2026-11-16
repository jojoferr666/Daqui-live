-- =====================================================================================
-- Daqui — 3 de 3: CONTAS DE DEMONSTRAÇÃO e atividade de exemplo
-- Gerado por ferramentas/gerar-sql.js em 2026-11-16 04:07. Não edite à mão: mude js/data.js e volte a gerar.
-- Onde: Supabase → SQL Editor → New query → colar este ficheiro inteiro → Run.
-- =====================================================================================
-- Cria 27 contas (palavras-passe abaixo), com o perfil, as subscrições, as inscrições no Colhe Connosco,
-- três encomendas e quatro pedidos de exemplo. Se uma conta já existir, não é criada outra vez.
-- As contas usam e-mails fictícios <utilizador>@contas.daqui.pt: entra-se com o nome de utilizador ou o telemóvel.
--
--   maria                      912 345 678  daqui2026
--   joao                       913 222 111  daqui2026
--   anarocha                   936 555 444  daqui2026
--   gestao                     234 000 000  gestao2026
--   agr.joaquim                914 000 101  daqui2026
--   agr.duarte                 914 000 102  daqui2026
--   agr.pereira                914 000 103  daqui2026
--   agr.antonio                914 000 104  daqui2026
--   agr.ines                   914 000 105  daqui2026
--   agr.luis                   914 000 106  daqui2026
--   agr.rui                    914 000 107  daqui2026
--   agr.teresa                 914 000 108  daqui2026
--   agr.carlos                 914 000 109  daqui2026
--   agr.ana                    914 000 110  daqui2026
--   agr.jose                   914 000 111  daqui2026
--   agr.maria                  914 000 112  daqui2026
--   agr.paulo                  914 000 113  daqui2026
--   agr.helena                 914 000 114  daqui2026
--   agr.freitas                914 000 115  daqui2026
--   rest.mesa-da-ria           234 000 101  daqui2026
--   rest.tasca-da-horta        234 000 102  daqui2026
--   rest.moliceiro-verde       234 000 103  daqui2026
--   rest.sal-e-campo           234 000 104  daqui2026
--   rest.fonte-nova            234 000 105  daqui2026
--   rest.cantina-do-parque     234 000 106  daqui2026
--   rest.cafe-campus           234 000 107  daqui2026
--   rest.estacao-74            234 000 108  daqui2026

create or replace function public.daqui_criar_conta(p_username text, p_pass text, p_nome text, p_tel text, p_papel text, p_parceiro jsonb, p_dados jsonb)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid; mail text := lower(p_username) || '@contas.daqui.pt';
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
select public.daqui_criar_conta('maria', 'daqui2026', 'Maria Silva', '912345678', 'cliente', null, '{"morada":{"street":"Rua do Carmo 21, 2.º Esq.","postal":"3800-127","town":"Aveiro"},"favoritos":["pera-rocha","laranja","alho-frances"],"excluidos":["beterraba"],"avisos":["cereja"]}'::jsonb);
select public.daqui_criar_conta('joao', 'daqui2026', 'João Costa', '913222111', 'cliente', null, '{"morada":null,"favoritos":[],"excluidos":[],"avisos":[]}'::jsonb);
select public.daqui_criar_conta('anarocha', 'daqui2026', 'Ana Rocha', '936555444', 'cliente', null, '{"morada":null,"favoritos":[],"excluidos":["nabo"],"avisos":[]}'::jsonb);
select public.daqui_criar_conta('gestao', 'gestao2026', 'Equipa Daqui', '234000000', 'admin', null, '{"morada":null,"favoritos":[],"excluidos":[],"avisos":[]}'::jsonb);
select public.daqui_criar_conta('agr.joaquim', 'daqui2026', 'Joaquim Santos', '914000101', 'agricultor', '{"kind":"agricultor","farmerId":"joaquim","farm":"Quinta do Casal Novo","place":"Cadaval","region":"oeste","approved":true}'::jsonb, '{"morada":null,"favoritos":[],"excluidos":[],"avisos":[]}'::jsonb);
select public.daqui_criar_conta('agr.duarte', 'daqui2026', 'Rosa e Manuel Duarte', '914000102', 'agricultor', '{"kind":"agricultor","farmerId":"duarte","farm":"Pomar dos Duarte","place":"Alcobaça","region":"oeste","approved":true}'::jsonb, '{"morada":null,"favoritos":[],"excluidos":[],"avisos":[]}'::jsonb);
select public.daqui_criar_conta('agr.pereira', 'daqui2026', 'Família Pereira', '914000103', 'agricultor', '{"kind":"agricultor","farmerId":"pereira","farm":"Horta da Ribeira","place":"Lourinhã","region":"oeste","approved":true}'::jsonb, '{"morada":null,"favoritos":[],"excluidos":[],"avisos":[]}'::jsonb);
select public.daqui_criar_conta('agr.antonio', 'daqui2026', 'António Marques', '914000104', 'agricultor', '{"kind":"agricultor","farmerId":"antonio","farm":"Terras da Gândara","place":"Vagos","region":"aveiro","approved":true}'::jsonb, '{"morada":null,"favoritos":[],"excluidos":[],"avisos":[]}'::jsonb);
select public.daqui_criar_conta('agr.ines', 'daqui2026', 'Inês Carvalho', '914000105', 'agricultor', '{"kind":"agricultor","farmerId":"ines","farm":"Horta Viva","place":"Mira","region":"aveiro","approved":true}'::jsonb, '{"morada":null,"favoritos":[],"excluidos":[],"avisos":[]}'::jsonb);
select public.daqui_criar_conta('agr.luis', 'daqui2026', 'Luís Fonseca', '914000106', 'agricultor', '{"kind":"agricultor","farmerId":"luis","farm":"Quinta da Várzea","place":"Oliveira do Bairro","region":"aveiro","approved":true}'::jsonb, '{"morada":null,"favoritos":[],"excluidos":[],"avisos":[]}'::jsonb);
select public.daqui_criar_conta('agr.rui', 'daqui2026', 'Rui Tavares', '914000107', 'agricultor', '{"kind":"agricultor","farmerId":"rui","farm":"Bagas do Vouga","place":"Sever do Vouga","region":"aveiro","approved":true}'::jsonb, '{"morada":null,"favoritos":[],"excluidos":[],"avisos":[]}'::jsonb);
select public.daqui_criar_conta('agr.teresa', 'daqui2026', 'Teresa Gomes', '914000108', 'agricultor', '{"kind":"agricultor","farmerId":"teresa","farm":"Casal das Hortas","place":"Torres Vedras","region":"oeste","approved":true}'::jsonb, '{"morada":null,"favoritos":[],"excluidos":[],"avisos":[]}'::jsonb);
select public.daqui_criar_conta('agr.carlos', 'daqui2026', 'Carlos Ribeiro', '914000109', 'agricultor', '{"kind":"agricultor","farmerId":"carlos","farm":"Quinta do Vale Tejo","place":"Almeirim","region":"ribatejo","approved":true}'::jsonb, '{"morada":null,"favoritos":[],"excluidos":[],"avisos":[]}'::jsonb);
select public.daqui_criar_conta('agr.ana', 'daqui2026', 'Ana Mendes', '914000110', 'agricultor', '{"kind":"agricultor","farmerId":"ana","farm":"Pomar da Gardunha","place":"Fundão","region":"beiras","approved":true}'::jsonb, '{"morada":null,"favoritos":[],"excluidos":[],"avisos":[]}'::jsonb);
select public.daqui_criar_conta('agr.jose', 'daqui2026', 'José Lopes', '914000111', 'agricultor', '{"kind":"agricultor","farmerId":"jose","farm":"Quinta da Esmolfe","place":"Penalva do Castelo","region":"beiras","approved":true}'::jsonb, '{"morada":null,"favoritos":[],"excluidos":[],"avisos":[]}'::jsonb);
select public.daqui_criar_conta('agr.maria', 'daqui2026', 'Maria Calado', '914000112', 'agricultor', '{"kind":"agricultor","farmerId":"maria","farm":"Monte da Vinha","place":"Vidigueira","region":"alentejo","approved":true}'::jsonb, '{"morada":null,"favoritos":[],"excluidos":[],"avisos":[]}'::jsonb);
select public.daqui_criar_conta('agr.paulo', 'daqui2026', 'Paulo Viegas', '914000113', 'agricultor', '{"kind":"agricultor","farmerId":"paulo","farm":"Pomar do Arade","place":"Silves","region":"algarve","approved":true}'::jsonb, '{"morada":null,"favoritos":[],"excluidos":[],"avisos":[]}'::jsonb);
select public.daqui_criar_conta('agr.helena', 'daqui2026', 'Helena Morais', '914000114', 'agricultor', '{"kind":"agricultor","farmerId":"helena","farm":"Souto da Lombada","place":"Vinhais","region":"tras","approved":true}'::jsonb, '{"morada":null,"favoritos":[],"excluidos":[],"avisos":[]}'::jsonb);
select public.daqui_criar_conta('agr.freitas', 'daqui2026', 'Família Freitas', '914000115', 'agricultor', '{"kind":"agricultor","farmerId":"freitas","farm":"Fajã do Sol","place":"Ponta do Sol, Madeira","region":"madeira","approved":true}'::jsonb, '{"morada":null,"favoritos":[],"excluidos":[],"avisos":[]}'::jsonb);
select public.daqui_criar_conta('rest.mesa-da-ria', 'daqui2026', 'Carla Neves', '234000101', 'restaurante', '{"kind":"restaurante","restId":"mesa-da-ria","name":"Mesa da Ria","place":"Aveiro","approved":true}'::jsonb, '{"morada":null,"favoritos":[],"excluidos":[],"avisos":[]}'::jsonb);
select public.daqui_criar_conta('rest.tasca-da-horta', 'daqui2026', 'Sofia Marques', '234000102', 'restaurante', '{"kind":"restaurante","restId":"tasca-da-horta","name":"Tasca da Horta","place":"Aveiro","approved":true}'::jsonb, '{"morada":null,"favoritos":[],"excluidos":[],"avisos":[]}'::jsonb);
select public.daqui_criar_conta('rest.moliceiro-verde', 'daqui2026', 'Tiago Lopes', '234000103', 'restaurante', '{"kind":"restaurante","restId":"moliceiro-verde","name":"Moliceiro Verde","place":"Aveiro","approved":true}'::jsonb, '{"morada":null,"favoritos":[],"excluidos":[],"avisos":[]}'::jsonb);
select public.daqui_criar_conta('rest.sal-e-campo', 'daqui2026', 'Inês Barros', '234000104', 'restaurante', '{"kind":"restaurante","restId":"sal-e-campo","name":"Sal & Campo","place":"Aveiro","approved":true}'::jsonb, '{"morada":null,"favoritos":[],"excluidos":[],"avisos":[]}'::jsonb);
select public.daqui_criar_conta('rest.fonte-nova', 'daqui2026', 'Pedro Faria', '234000105', 'restaurante', '{"kind":"restaurante","restId":"fonte-nova","name":"Bistrô Fonte Nova","place":"Aveiro","approved":true}'::jsonb, '{"morada":null,"favoritos":[],"excluidos":[],"avisos":[]}'::jsonb);
select public.daqui_criar_conta('rest.cantina-do-parque', 'daqui2026', 'Marta Simões', '234000106', 'restaurante', '{"kind":"restaurante","restId":"cantina-do-parque","name":"Cantina do Parque","place":"Aveiro","approved":true}'::jsonb, '{"morada":null,"favoritos":[],"excluidos":[],"avisos":[]}'::jsonb);
select public.daqui_criar_conta('rest.cafe-campus', 'daqui2026', 'Hugo Rebelo', '234000107', 'restaurante', '{"kind":"restaurante","restId":"cafe-campus","name":"Café Campus","place":"Aveiro","approved":true}'::jsonb, '{"morada":null,"favoritos":[],"excluidos":[],"avisos":[]}'::jsonb);
select public.daqui_criar_conta('rest.estacao-74', 'daqui2026', 'Beatriz Lima', '234000108', 'restaurante', '{"kind":"restaurante","restId":"estacao-74","name":"Estação 74","place":"Aveiro","approved":true}'::jsonb, '{"morada":null,"favoritos":[],"excluidos":[],"avisos":[]}'::jsonb);

-- subscrições
insert into public.subscricoes (id, user_id, caixa, tamanho, kg, frequencia, dia, entrega, ponto, morada, descoberta, pagamento, preco_guardado, inicio, primeira, estado)
  values ('s-maria-1', (select id from public.perfis where username = 'maria'), 'caixa-mista', 'P', 4, 'sem', 'qui', 'pickup', 'Aveiro, Rossio', '', true, 'mbway', 11.5, '2026-06-10', '2026-06-11', 'ativa')
  on conflict (id) do nothing;
insert into public.subscricoes (id, user_id, caixa, tamanho, kg, frequencia, dia, entrega, ponto, morada, descoberta, pagamento, preco_guardado, inicio, primeira, estado)
  values ('s-joao-1', (select id from public.perfis where username = 'joao'), 'caixa-fruta', 'M', 5, 'quinz', 'sab', 'home', '', 'Rua do Campo 12, 3810 Aveiro', true, 'mb', 14.5, '2026-03-02', '2026-03-07', 'ativa')
  on conflict (id) do nothing;
insert into public.subscricoes (id, user_id, caixa, tamanho, kg, frequencia, dia, entrega, ponto, morada, descoberta, pagamento, preco_guardado, inicio, primeira, estado)
  values ('s-ana-1', (select id from public.perfis where username = 'anarocha'), 'caixa-legumes', 'G', 8, 'mens', 'qui', 'pickup', 'Ílhavo', '', false, 'entrega', 16.9, '2026-09-01', '2026-09-03', 'pausada')
  on conflict (id) do nothing;

-- inscrições no Colhe Connosco (só se o dia existir)
insert into public.inscricoes_colhe (user_id, dia, pessoas) select (select id from public.perfis where username = 'maria'), dia, 2 from public.dias_colhe where dia = '2026-11-28' on conflict do nothing;
insert into public.inscricoes_colhe (user_id, dia, pessoas) select (select id from public.perfis where username = 'joao'), dia, 4 from public.dias_colhe where dia = '2026-11-28' on conflict do nothing;
insert into public.inscricoes_colhe (user_id, dia, pessoas) select (select id from public.perfis where username = 'joao'), dia, 1 from public.dias_colhe where dia = '2026-12-05' on conflict do nothing;
insert into public.inscricoes_colhe (user_id, dia, pessoas) select (select id from public.perfis where username = 'anarocha'), dia, 3 from public.dias_colhe where dia = '2026-12-12' on conflict do nothing;

-- encomendas de exemplo (datas relativas ao dia em que corre este script)
insert into public.encomendas (num, user_id, username, nome, telemovel, criada, data_entrega, dia, entrega, janela, ponto, morada, artigos, subtotal, taxa, total, pagamento, notas, estado)
  select 'DQ104851', (select id from public.perfis where username = 'maria'), 'maria', 'Maria Silva', '912345678', now() - interval '18 days', d, case extract(dow from d) when 4 then 'qui' else 'sab' end,
         'home', '17h–21h', '', 'Rua do Carmo 21, 2.º Esq., 3800-127 Aveiro', '[{"id":"pera-rocha","qty":2,"price":1.89},{"id":"maca-gala","qty":2,"price":1.69},{"id":"alface","qty":1,"price":0.79},{"id":"cenoura","qty":1,"price":0.99},{"id":"laranja","qty":3,"price":1.39}]'::jsonb, 13.11, 2.9, 16.01, 'mbway', '', 'ativa'
    from (select public.daqui_proximo_dia(current_date - 18) d) x
  on conflict (num) do nothing;
insert into public.encomendas (num, user_id, username, nome, telemovel, criada, data_entrega, dia, entrega, janela, ponto, morada, artigos, subtotal, taxa, total, pagamento, notas, estado)
  select 'DQ104858', (select id from public.perfis where username = 'joao'), 'joao', 'João Costa', '913222111', now() - interval '9 days', d, case extract(dow from d) when 4 then 'qui' else 'sab' end,
         'pickup', '', 'Aveiro, Rossio', '', '[{"id":"batata","qty":3,"price":0.95},{"id":"cebola","qty":1,"price":1.39},{"id":"couve-portuguesa","qty":1,"price":1.29},{"id":"kiwi","qty":1,"price":2.49}]'::jsonb, 8.02, 0, 8.02, 'mbway', '', 'ativa'
    from (select public.daqui_proximo_dia(current_date - 9) d) x
  on conflict (num) do nothing;
insert into public.encomendas (num, user_id, username, nome, telemovel, criada, data_entrega, dia, entrega, janela, ponto, morada, artigos, subtotal, taxa, total, pagamento, notas, estado)
  select 'DQ104866', (select id from public.perfis where username = 'maria'), 'maria', 'Maria Silva', '912345678', now() - interval '1 days', d, case extract(dow from d) when 4 then 'qui' else 'sab' end,
         'home', '17h–21h', '', 'Rua do Carmo 21, 2.º Esq., 3800-127 Aveiro', '[{"id":"diospiro","qty":1,"price":2.19},{"id":"tangerina","qty":2,"price":1.79},{"id":"alho-frances","qty":1,"price":1.69},{"id":"castanha","qty":1,"price":4.9}]'::jsonb, 12.36, 2.9, 15.26, 'mbway', '', 'ativa'
    from (select public.daqui_proximo_dia(current_date - 1) d) x
  on conflict (num) do nothing;

-- pedidos de exemplo para o painel de gestão
insert into public.pedidos (id, tipo, criado, estado, user_id, username, parceiro, encomenda, campos)
  values ('P-1001', 'incidencia', now() - interval '15 days', 'tratado', (select id from public.perfis where username = 'maria'), 'maria', null, 'DQ104851', '{"product":"pera-rocha","what":"Duas peras chegaram tocadas.","remedy":"sub","photo":""}'::jsonb)
  on conflict (id) do nothing;
insert into public.pedidos (id, tipo, criado, estado, user_id, username, parceiro, encomenda, campos)
  values ('P-1002', 'selo', now() - interval '2 days', 'novo', null, null, null, null, '{"restaurant":"Taberna do Moliço","person":"Rui Pinho","phone":"918765432","town":"Ílhavo"}'::jsonb)
  on conflict (id) do nothing;
insert into public.pedidos (id, tipo, criado, estado, user_id, username, parceiro, encomenda, campos)
  values ('P-1003', 'agricultor', now() - interval '1 days', 'novo', null, null, null, null, '{"name":"Carla Matos","phone":"965432100","town":"Sever do Vouga","area":"1-5","crops":"Mirtilo, kiwi"}'::jsonb)
  on conflict (id) do nothing;
insert into public.pedidos (id, tipo, criado, estado, user_id, username, parceiro, encomenda, campos)
  values ('P-1004', 'produto', now() - interval '1 days', 'novo', (select id from public.perfis where username = 'agr.joaquim'), 'agr.joaquim', 'agr.joaquim', null, '{"namePt":"Pera Rocha biológica","nameEn":"Organic Rocha pear","cat":"fruta","price":"2.49","unit":"kg","season":"8-4","desc":"Pequena produção em modo biológico."}'::jsonb)
  on conflict (id) do nothing;

drop function public.daqui_criar_conta(text, text, text, text, text, jsonb, jsonb);
drop function public.daqui_proximo_dia(date);

-- Fim. Confirme em Table Editor → perfis: devem aparecer 27 contas.
-- Para dar acesso de gestão a outra conta:  update public.perfis set papel = 'admin' where username = 'o-seu-utilizador';
