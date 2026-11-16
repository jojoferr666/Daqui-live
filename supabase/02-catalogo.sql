-- =====================================================================================
-- Daqui — 2 de 3: CATÁLOGO (agricultores, produtos, caixas, restaurantes, dias Colhe Connosco)
-- Gerado por ferramentas/gerar-sql.js em 2026-11-16 04:07. Não edite à mão: mude js/data.js e volte a gerar.
-- Onde: Supabase → SQL Editor → New query → colar este ficheiro inteiro → Run.
-- =====================================================================================

-- agricultores
insert into public.agricultores (id, nome, quinta, localidade, regiao, lat, lon, desde, cultura, semente, historia_pt, historia_en, extra, ordem) values
  ('joaquim', 'Joaquim Santos', 'Quinta do Casal Novo', 'Cadaval', 'oeste', 39.243, -9.103, 1987, 'pera', 0, 'Terceira geração a cultivar Pera Rocha no Cadaval. Durante anos vendeu tudo a um armazenista que decidia o preço no fim da campanha. Na Daqui vê, em cada pera, quanto do preço fica com ele.', 'Third generation growing Rocha pears in Cadaval. For years he sold his whole crop to a packer who set the price at the end of the season. With Daqui he can see how much of each pear''s price stays with him.', '{}'::jsonb, 0),
  ('duarte', 'Rosa e Manuel Duarte', 'Pomar dos Duarte', 'Alcobaça', 'oeste', 39.552, -8.977, 1995, 'macaGala', 1, 'Um pomar familiar de maçã Gala, Golden, Fuji e Reineta, e alguns marmeleiros. A maçã é colhida no fim do verão e guardada nas câmaras frigoríficas da Daqui.', 'A family orchard of Gala, Golden, Fuji and Reineta apples, plus a few quince trees. The apples are picked at the end of summer and kept in Daqui''s cold rooms.', '{}'::jsonb, 1),
  ('pereira', 'Família Pereira', 'Horta da Ribeira', 'Lourinhã', 'oeste', 39.242, -9.312, 2004, 'alface', 2, 'Três irmãos que trocaram a venda ao intermediário pela venda direta. Alfaces, couves e ervas aromáticas colhidas na véspera da entrega.', 'Three siblings who swapped selling to a middleman for selling direct. Lettuce, cabbage and herbs picked the day before delivery.', '{}'::jsonb, 2),
  ('antonio', 'António Marques', 'Terras da Gândara', 'Vagos', 'aveiro', 40.556, -8.683, 1979, 'batata', 3, 'Os solos arenosos da Gândara dão uma batata de pele fina e sabor intenso. O Sr. António não usa a internet: um agente de campo da Daqui regista os produtos dele por telefone.', 'The sandy soils of the Gândara give a thin-skinned, full-flavoured potato. Mr António does not use the internet: a Daqui field agent lists his produce over the phone.', '{}'::jsonb, 3),
  ('ines', 'Inês Carvalho', 'Horta Viva', 'Mira', 'aveiro', 40.428, -8.736, 2019, 'alhoFrances', 4, 'Jovem agricultora em modo de produção biológico. Escolheu a Daqui para vender sem embalagens de plástico e para conhecer as pessoas que comem o que ela planta.', 'A young organic grower. She chose Daqui to sell without plastic packaging and to meet the people who eat what she plants.', '{}'::jsonb, 4),
  ('luis', 'Luís Fonseca', 'Quinta da Várzea', 'Oliveira do Bairro', 'aveiro', 40.515, -8.494, 2008, 'kiwi', 5, 'Kiwi e dióspiro a poucos quilómetros do armazém da Daqui. Abre a quinta nos dias Colhe Connosco.', 'Kiwis and persimmons a few kilometres from the Daqui warehouse. He opens the farm on Join the Harvest days.', '{}'::jsonb, 5),
  ('rui', 'Rui Tavares', 'Bagas do Vouga', 'Sever do Vouga', 'aveiro', 40.733, -8.367, 2014, 'mirtilo', 6, 'Trocou um emprego em Lisboa pelos mirtilos da terra dos avós. No verão também tem framboesas e amoras.', 'He swapped a job in Lisbon for blueberries on his grandparents'' land. In summer he also grows raspberries and blackberries.', '{}'::jsonb, 6),
  ('teresa', 'Teresa Gomes', 'Casal das Hortas', 'Torres Vedras', 'oeste', 39.091, -9.259, 1999, 'abobora', 7, 'Abóboras, tomate, pimentos e batata-doce. Gosta de sugerir receitas e é ela quem escolhe muitas das Descobertas da Estação.', 'Pumpkins, tomatoes, peppers and sweet potatoes. She loves suggesting recipes and picks many of our Seasonal Discoveries.', '{}'::jsonb, 7),
  ('carlos', 'Carlos Ribeiro', 'Quinta do Vale Tejo', 'Almeirim', 'ribatejo', 39.209, -8.627, 1991, 'melancia', 8, 'Na lezíria do Tejo cultiva melão, melancia, morango e leguminosas. As favas e as ervilhas anunciam a primavera.', 'On the Tagus floodplain he grows melons, watermelons, strawberries and pulses. Broad beans and peas announce the spring.', '{}'::jsonb, 8),
  ('ana', 'Ana Mendes', 'Pomar da Gardunha', 'Fundão', 'beiras', 40.139, -7.501, 2001, 'cereja', 9, 'Cereja do Fundão, pêssego, ameixa e figo na encosta da Gardunha. A cereja chega em maio e acaba depressa.', 'Fundão cherries, peaches, plums and figs on the slopes of the Gardunha. Cherries arrive in May and are gone quickly.', '{}'::jsonb, 9),
  ('jose', 'José Lopes', 'Quinta da Esmolfe', 'Penalva do Castelo', 'beiras', 40.676, -7.693, 1983, 'macaBravo', 10, 'Guarda as macieiras Bravo de Esmolfe que o pai plantou, uma maçã pequena, perfumada e protegida por Denominação de Origem.', 'He looks after the Bravo de Esmolfe trees his father planted, a small, fragrant apple with protected designation of origin.', '{}'::jsonb, 10),
  ('maria', 'Maria Calado', 'Monte da Vinha', 'Vidigueira', 'alentejo', 38.209, -7.8, 2010, 'uvaBranca', 11, 'Uva de mesa branca e tinta no calor do Baixo Alentejo, colhida à mão de agosto a outubro.', 'White and red table grapes in the heat of the Lower Alentejo, picked by hand from August to October.', '{}'::jsonb, 11),
  ('paulo', 'Paulo Viegas', 'Pomar do Arade', 'Silves', 'algarve', 37.189, -8.438, 1996, 'laranja', 12, 'Laranjas, tangerinas, limões e abacates no barrocal algarvio. A laranja é colhida só quando a encomenda está feita.', 'Oranges, mandarins, lemons and avocados in the Algarve hills. Oranges are only picked once the order is in.', '{}'::jsonb, 12),
  ('helena', 'Helena Morais', 'Souto da Lombada', 'Vinhais', 'tras', 41.835, -7, 1988, 'castanha', 13, 'Castanha e noz de soutos centenários em Trás-os-Montes. O outono é a época mais trabalhosa e a mais bonita.', 'Chestnuts and walnuts from century-old groves in Trás-os-Montes. Autumn is the busiest season and the most beautiful.', '{}'::jsonb, 13),
  ('freitas', 'Família Freitas', 'Fajã do Sol', 'Ponta do Sol, Madeira', 'madeira', 32.68, -17.1, 1975, 'banana', 14, 'Banana da Madeira em socalcos virados ao mar, maracujá e anona. Chega ao continente de barco, uma vez por semana.', 'Madeira bananas on terraces facing the sea, plus passion fruit and custard apples. They reach the mainland by boat once a week.', '{"island":"madeira"}'::jsonb, 14)
on conflict (id) do update set nome = excluded.nome, quinta = excluded.quinta, localidade = excluded.localidade, regiao = excluded.regiao, lat = excluded.lat, lon = excluded.lon,
  desde = excluded.desde, cultura = excluded.cultura, semente = excluded.semente, historia_pt = excluded.historia_pt, historia_en = excluded.historia_en, extra = excluded.extra, ordem = excluded.ordem;

-- produtos de fruta e legumes
insert into public.produtos (id, categoria, nome_pt, nome_en, preco, unidade, agricultor, desenho, icone, epoca_inicio, epoca_fim, colheita, essencial, biologico, fora_stock, divisao, desc_pt, desc_en, extra, ordem) values
  ('pera-rocha', 'fruta', 'Pera Rocha do Oeste', 'Rocha pear from the Oeste', 1.89, 'kg', 'joaquim', 'pera', null, 8, 5, '08-27', true, false, false, null, 'Sumarenta, doce e de polpa firme.', 'Juicy, sweet and firm.', '{}'::jsonb, 0),
  ('maca-gala', 'fruta', 'Maçã Gala de Alcobaça', 'Gala apple from Alcobaça', 1.69, 'kg', 'duarte', 'macaGala', null, 8, 6, '09-08', true, false, false, null, 'Crocante e doce, a preferida dos mais novos.', 'Crunchy and sweet, a favourite with children.', '{}'::jsonb, 1),
  ('maca-golden', 'fruta', 'Maçã Golden', 'Golden apple', 1.59, 'kg', 'duarte', 'macaGolden', null, 9, 6, '09-20', false, false, false, null, 'Doce e suave, boa para comer e para compotas.', 'Sweet and mellow, good to eat or for jam.', '{}'::jsonb, 2),
  ('maca-fuji', 'fruta', 'Maçã Fuji', 'Fuji apple', 1.99, 'kg', 'duarte', 'macaFuji', null, 10, 6, '10-12', false, false, false, null, 'Muito doce e estaladiça.', 'Very sweet and crisp.', '{}'::jsonb, 3),
  ('maca-reineta', 'fruta', 'Maçã Reineta', 'Reineta apple', 1.79, 'kg', 'duarte', 'macaReineta', null, 9, 3, '10-03', false, false, false, null, 'Ácida e aromática, ideal para assar.', 'Tart and aromatic, ideal for baking.', '{}'::jsonb, 4),
  ('maca-bravo-esmolfe', 'fruta', 'Maçã Bravo de Esmolfe DOP', 'Bravo de Esmolfe apple (PDO)', 2.79, 'kg', 'jose', 'macaBravo', null, 9, 2, '09-25', false, false, false, null, 'Pequena, perfumada e de polpa branca.', 'Small, fragrant and white-fleshed.', '{}'::jsonb, 5),
  ('marmelo', 'fruta', 'Marmelo', 'Quince', 1.49, 'kg', 'duarte', 'marmelo', null, 9, 12, '10-05', false, false, false, null, 'Para marmelada e para assar no forno.', 'For quince paste or roasting.', '{}'::jsonb, 6),
  ('kiwi', 'fruta', 'Kiwi', 'Kiwi', 2.49, 'kg', 'luis', 'kiwi', null, 11, 5, '11-10', false, false, false, null, 'Deixe amadurecer um ou dois dias à temperatura ambiente.', 'Let it ripen for a day or two at room temperature.', '{}'::jsonb, 7),
  ('diospiro', 'fruta', 'Dióspiro', 'Persimmon', 2.19, 'kg', 'luis', 'diospiro', null, 10, 12, '3', false, false, false, null, 'Doce como mel quando bem maduro.', 'Sweet as honey when fully ripe.', '{}'::jsonb, 8),
  ('laranja', 'fruta', 'Laranja do Algarve', 'Algarve orange', 1.39, 'kg', 'paulo', 'laranja', null, 11, 6, '4', true, false, false, null, 'Para sumo ou para comer à dentada.', 'For juice or to eat as it is.', '{}'::jsonb, 9),
  ('tangerina', 'fruta', 'Tangerina', 'Mandarin', 1.79, 'kg', 'paulo', 'tangerina', null, 11, 2, '4', false, false, false, null, 'Casca fina, fácil de descascar.', 'Thin skin, easy to peel.', '{}'::jsonb, 10),
  ('clementina', 'fruta', 'Clementina', 'Clementine', 1.99, 'kg', 'paulo', 'clementina', null, 10, 1, '4', false, false, false, null, 'Sem grainhas e muito doce.', 'Seedless and very sweet.', '{}'::jsonb, 11),
  ('limao', 'fruta', 'Limão', 'Lemon', 1.89, 'kg', 'paulo', 'limao', null, 1, 12, '6', false, false, false, null, 'Para temperar, para chá e para sobremesas.', 'For seasoning, tea and desserts.', '{}'::jsonb, 12),
  ('abacate', 'fruta', 'Abacate do Algarve', 'Algarve avocado', 4.49, 'kg', 'paulo', 'abacate', null, 10, 5, '6', false, false, false, null, 'Pronto a comer quando cede ligeiramente ao toque.', 'Ready when it yields slightly to the touch.', '{}'::jsonb, 13),
  ('roma', 'fruta', 'Romã', 'Pomegranate', 2.99, 'kg', 'paulo', 'roma', null, 9, 12, '6', false, false, false, null, 'Bagos sumarentos para saladas e sobremesas.', 'Juicy seeds for salads and desserts.', '{}'::jsonb, 14),
  ('nespera', 'fruta', 'Nêspera', 'Loquat', 3.49, 'kg', 'paulo', 'nespera', null, 4, 6, '2', false, false, false, null, 'Fruta de primavera, delicada e ácida.', 'A delicate, tangy spring fruit.', '{}'::jsonb, 15),
  ('banana-madeira', 'fruta', 'Banana da Madeira', 'Madeira banana', 1.79, 'kg', 'freitas', 'banana', null, 1, 12, '8', true, false, false, null, 'Pequena, doce e aromática.', 'Small, sweet and fragrant.', '{}'::jsonb, 16),
  ('maracuja', 'fruta', 'Maracujá', 'Passion fruit', 6.9, 'kg', 'freitas', 'maracuja', null, 7, 12, '6', false, false, false, null, 'Está pronto quando a casca enruga.', 'Ready when the skin wrinkles.', '{}'::jsonb, 17),
  ('anona', 'fruta', 'Anona da Madeira', 'Madeira custard apple', 4.9, 'kg', 'freitas', 'anona', null, 11, 4, '6', false, false, false, null, 'Polpa cremosa, come-se à colher.', 'Creamy flesh, eaten with a spoon.', '{}'::jsonb, 18),
  ('cereja', 'fruta', 'Cereja do Fundão', 'Fundão cherry', 7.9, 'kg', 'ana', 'cereja', null, 5, 7, '2', false, false, false, null, 'Escura, firme e muito doce.', 'Dark, firm and very sweet.', '{}'::jsonb, 19),
  ('pessego', 'fruta', 'Pêssego', 'Peach', 2.49, 'kg', 'ana', 'pessego', null, 6, 9, '2', false, false, false, null, 'Polpa amarela e sumarenta.', 'Juicy yellow flesh.', '{}'::jsonb, 20),
  ('nectarina', 'fruta', 'Nectarina', 'Nectarine', 2.69, 'kg', 'ana', 'nectarina', null, 6, 9, '2', false, false, false, null, 'Pele lisa e polpa doce.', 'Smooth skin, sweet flesh.', '{}'::jsonb, 21),
  ('ameixa', 'fruta', 'Ameixa', 'Plum', 2.29, 'kg', 'ana', 'ameixa', null, 6, 9, '2', false, false, false, null, 'Para comer fresca ou fazer doce.', 'Eat fresh or make jam.', '{}'::jsonb, 22),
  ('alperce', 'fruta', 'Alperce', 'Apricot', 2.99, 'kg', 'ana', 'alperce', null, 5, 7, '2', false, false, false, null, 'Aveludado e perfumado.', 'Velvety and fragrant.', '{}'::jsonb, 23),
  ('figo', 'fruta', 'Figo', 'Fig', 4.5, 'kg', 'ana', 'figo', null, 8, 10, '1', false, false, false, null, 'Muito delicado: coma no próprio dia.', 'Very delicate: eat it the same day.', '{}'::jsonb, 24),
  ('melao', 'fruta', 'Melão', 'Melon', 1.49, 'kg', 'carlos', 'melao', null, 6, 10, '3', false, false, false, null, 'Doce e refrescante.', 'Sweet and refreshing.', '{}'::jsonb, 25),
  ('meloa', 'fruta', 'Meloa', 'Cantaloupe', 1.79, 'kg', 'carlos', 'meloa', null, 6, 9, '3', false, false, false, null, 'Polpa cor de laranja, muito aromática.', 'Orange flesh, very fragrant.', '{}'::jsonb, 26),
  ('melancia', 'fruta', 'Melancia', 'Watermelon', 0.89, 'kg', 'carlos', 'melancia', null, 6, 9, '3', false, false, false, null, 'Vendida inteira ou às metades.', 'Sold whole or in halves.', '{}'::jsonb, 27),
  ('uva-branca', 'fruta', 'Uva de mesa branca', 'White table grapes', 2.49, 'kg', 'maria', 'uvaBranca', null, 8, 10, '2', false, false, false, null, 'Bago grande e estaladiço.', 'Large, crisp grapes.', '{}'::jsonb, 28),
  ('uva-tinta', 'fruta', 'Uva de mesa tinta', 'Red table grapes', 2.69, 'kg', 'maria', 'uvaTinta', null, 8, 10, '2', false, false, false, null, 'Doce, com notas de frutos vermelhos.', 'Sweet, with red-berry notes.', '{}'::jsonb, 29),
  ('morango', 'fruta', 'Morango', 'Strawberries', 2.99, 'cuv', 'carlos', 'morango', null, 3, 6, '1', false, false, false, null, 'Cuvete de 500 g.', '500 g punnet.', '{}'::jsonb, 30),
  ('mirtilo', 'fruta', 'Mirtilo', 'Blueberries', 3.49, 'cuv', 'rui', 'mirtilo', null, 6, 9, '1', false, true, false, null, 'Cuvete de 250 g.', '250 g punnet.', '{}'::jsonb, 31),
  ('framboesa', 'fruta', 'Framboesa', 'Raspberries', 3.29, 'cuv', 'rui', 'framboesa', null, 6, 10, '1', false, true, false, null, 'Cuvete de 125 g.', '125 g punnet.', '{}'::jsonb, 32),
  ('amora', 'fruta', 'Amora', 'Blackberries', 2.99, 'cuv', 'rui', 'amora', null, 7, 9, '1', false, true, false, null, 'Cuvete de 125 g.', '125 g punnet.', '{}'::jsonb, 33),
  ('castanha', 'fruta', 'Castanha de Trás-os-Montes', 'Chestnuts from Trás-os-Montes', 4.9, 'kg', 'helena', 'castanha', null, 10, 12, '10-20', false, false, false, null, 'Para assar ou cozer com erva-doce.', 'Roast them or boil with fennel seeds.', '{}'::jsonb, 34),
  ('noz', 'fruta', 'Noz', 'Walnuts', 7.9, 'kg', 'helena', 'noz', null, 10, 3, '10-05', false, false, false, null, 'Com casca, secas ao ar.', 'In shell, air-dried.', '{}'::jsonb, 35),
  ('lima', 'fruta', 'Lima', 'Lime', 3.49, 'kg', 'paulo', 'lima', null, 9, 3, '5', false, false, false, null, 'Sumo perfumado para limonadas e marinadas.', 'Fragrant juice for lemonades and marinades.', '{}'::jsonb, 36),
  ('toranja', 'fruta', 'Toranja', 'Grapefruit', 1.99, 'kg', 'paulo', 'toranja', null, 11, 5, '5', false, false, false, null, 'Agridoce, ótima ao pequeno-almoço.', 'Bittersweet, great at breakfast.', '{}'::jsonb, 37),
  ('ameixa-rainha-claudia', 'fruta', 'Ameixa Rainha-Cláudia', 'Greengage plum', 3.49, 'kg', 'ana', 'ameixaRC', null, 7, 8, '2', false, false, false, null, 'Pequena, verde-dourada e muito doce.', 'Small, golden-green and very sweet.', '{}'::jsonb, 38),
  ('uva-moscatel', 'fruta', 'Uva moscatel', 'Muscat grapes', 2.99, 'kg', 'maria', 'uvaMoscatel', null, 8, 10, '2', false, false, false, null, 'Aroma intenso a moscatel.', 'Intense muscat aroma.', '{}'::jsonb, 39),
  ('physalis', 'fruta', 'Physalis', 'Physalis', 3.9, 'cuv', 'freitas', 'physalis', null, 9, 5, '5', false, false, false, null, 'Cuvete de 100 g, ácida e doce.', '100 g punnet, tangy and sweet.', '{}'::jsonb, 40),
  ('medronho', 'fruta', 'Medronho', 'Strawberry-tree fruit', 6.9, 'cuv', 'paulo', 'medronho', null, 10, 12, '2', false, false, false, null, 'Fruto silvestre do Algarve, em cuvete de 250 g.', 'Wild Algarve fruit, in a 250 g punnet.', '{}'::jsonb, 41),
  ('batata', 'legumes', 'Batata da Gândara', 'Gândara potato', 0.95, 'kg', 'antonio', 'batata', null, 1, 12, '09-12', true, false, false, null, 'Boa para cozer, assar ou fritar.', 'Good for boiling, roasting or frying.', '{}'::jsonb, 42),
  ('batata-vermelha', 'legumes', 'Batata vermelha', 'Red potato', 1.19, 'kg', 'antonio', 'batataVermelha', null, 1, 12, '09-12', false, false, false, null, 'Polpa firme, ideal para assar.', 'Firm flesh, ideal for roasting.', '{}'::jsonb, 43),
  ('batata-doce', 'legumes', 'Batata-doce', 'Sweet potato', 1.89, 'kg', 'teresa', 'batataDoce', null, 9, 3, '10-27', false, true, false, null, 'Polpa alaranjada e doce.', 'Sweet orange flesh.', '{}'::jsonb, 44),
  ('cebola', 'legumes', 'Cebola', 'Onion', 1.39, 'kg', 'antonio', 'cebola', null, 1, 12, '08-20', true, false, false, null, 'Curada ao ar, de sabor doce.', 'Air-cured, with a sweet flavour.', '{}'::jsonb, 45),
  ('cebola-roxa', 'legumes', 'Cebola roxa', 'Red onion', 1.69, 'kg', 'antonio', 'cebolaRoxa', null, 1, 12, '08-20', false, false, false, null, 'Suave, boa para saladas.', 'Mild, good for salads.', '{}'::jsonb, 46),
  ('alho', 'legumes', 'Alho', 'Garlic', 4.9, 'kg', 'antonio', 'alho', null, 1, 12, '07-10', false, false, false, null, 'Cabeças secas ao sol.', 'Sun-dried bulbs.', '{}'::jsonb, 47),
  ('alho-frances', 'legumes', 'Alho-francês', 'Leek', 1.69, 'kg', 'ines', 'alhoFrances', null, 9, 4, '2', false, true, false, null, 'Perfeito para sopas e quiches.', 'Perfect for soups and quiches.', '{}'::jsonb, 48),
  ('cenoura', 'legumes', 'Cenoura', 'Carrot', 0.99, 'kg', 'ines', 'cenoura', null, 1, 12, '4', true, true, false, null, 'Doce e estaladiça.', 'Sweet and crunchy.', '{}'::jsonb, 49),
  ('beterraba', 'legumes', 'Beterraba', 'Beetroot', 1.49, 'kg', 'ines', 'beterraba', null, 1, 12, '4', false, true, false, null, 'Crua ralada ou assada no forno.', 'Grated raw or roasted.', '{}'::jsonb, 50),
  ('nabo', 'legumes', 'Nabo', 'Turnip', 1.29, 'kg', 'ines', 'nabo', null, 10, 3, '3', false, false, false, null, 'Para o cozido e para sopas.', 'For stews and soups.', '{}'::jsonb, 51),
  ('rabanete', 'legumes', 'Rabanete', 'Radishes', 0.99, 'molho', 'ines', 'rabanete', null, 1, 12, '2', false, false, false, null, 'Picante e estaladiço.', 'Peppery and crunchy.', '{}'::jsonb, 52),
  ('nabicas', 'legumes', 'Nabiças', 'Turnip greens', 1.19, 'molho', 'ines', 'nabicas', null, 10, 3, '2', false, false, false, null, 'Salteadas com alho ou na sopa.', 'Sautéed with garlic or in soup.', '{}'::jsonb, 53),
  ('grelos', 'legumes', 'Grelos', 'Turnip tops', 1.49, 'molho', 'ines', 'grelos', null, 11, 3, '2', false, false, false, null, 'Um clássico de inverno.', 'A winter classic.', '{}'::jsonb, 54),
  ('espinafres', 'legumes', 'Espinafres', 'Spinach', 1.49, 'molho', 'pereira', 'espinafres', null, 10, 5, '1', false, false, false, null, 'Folha tenra para saladas e esparregado.', 'Tender leaves for salads or creamed spinach.', '{}'::jsonb, 55),
  ('agriao', 'legumes', 'Agrião', 'Watercress', 1.19, 'molho', 'pereira', 'agriao', null, 10, 5, '1', false, false, false, null, 'Para a sopa de agrião.', 'For watercress soup.', '{}'::jsonb, 56),
  ('rucula', 'legumes', 'Rúcula', 'Rocket', 1.29, 'molho', 'pereira', 'rucula', null, 1, 12, '1', false, false, false, null, 'Folha picante para saladas.', 'Peppery salad leaves.', '{}'::jsonb, 57),
  ('salsa', 'legumes', 'Salsa', 'Parsley', 0.79, 'molho', 'pereira', 'salsa', null, 1, 12, '1', false, false, false, null, 'Molho fresco.', 'Fresh bunch.', '{}'::jsonb, 58),
  ('coentros', 'legumes', 'Coentros', 'Coriander', 0.79, 'molho', 'pereira', 'coentros', null, 1, 12, '1', false, false, false, null, 'Indispensável na açorda.', 'Essential in açorda.', '{}'::jsonb, 59),
  ('hortela', 'legumes', 'Hortelã', 'Mint', 0.89, 'molho', 'pereira', 'hortela', null, 1, 12, '1', false, false, false, null, 'Para chás, saladas e caldos.', 'For teas, salads and broths.', '{}'::jsonb, 60),
  ('alface', 'legumes', 'Alface frisada', 'Curly lettuce', 0.79, 'un', 'pereira', 'alface', null, 1, 12, '1', true, false, false, null, 'Colhida na véspera da entrega.', 'Picked the day before delivery.', '{}'::jsonb, 61),
  ('alface-romana', 'legumes', 'Alface romana', 'Romaine lettuce', 0.89, 'un', 'pereira', 'alfaceRomana', null, 1, 12, '1', false, false, false, null, 'Folhas longas e crocantes.', 'Long, crunchy leaves.', '{}'::jsonb, 62),
  ('alface-iceberg', 'legumes', 'Alface iceberg', 'Iceberg lettuce', 0.99, 'un', 'pereira', 'alfaceIceberg', null, 1, 12, '1', false, false, false, null, 'Compacta e fresca.', 'Compact and crisp.', '{}'::jsonb, 63),
  ('couve-portuguesa', 'legumes', 'Couve-portuguesa', 'Portuguese cabbage', 1.29, 'un', 'pereira', 'couve', null, 9, 4, '1', false, false, false, null, 'Para o cozido à portuguesa.', 'For Portuguese boiled dinner.', '{}'::jsonb, 64),
  ('couve-galega', 'legumes', 'Couve-galega', 'Galician kale', 1.19, 'molho', 'pereira', 'couveGalega', null, 1, 12, '1', false, false, false, null, 'A couve do caldo verde.', 'The kale for caldo verde.', '{}'::jsonb, 65),
  ('couve-coracao', 'legumes', 'Couve-coração', 'Pointed cabbage', 1.19, 'un', 'pereira', 'couveCoracao', null, 1, 12, '2', false, false, false, null, 'Tenra e doce, boa salteada.', 'Tender and sweet, good sautéed.', '{}'::jsonb, 66),
  ('couve-lombarda', 'legumes', 'Couve-lombarda', 'Savoy cabbage', 1.39, 'un', 'pereira', 'couveLombarda', null, 10, 3, '2', false, false, false, null, 'Folhas enrugadas, para sopas e arroz.', 'Crinkly leaves for soups and rice.', '{}'::jsonb, 67),
  ('couve-roxa', 'legumes', 'Couve-roxa', 'Red cabbage', 1.49, 'un', 'pereira', 'couveRoxa', null, 9, 3, '2', false, false, false, null, 'Crua em salada ou estufada.', 'Raw in salads or braised.', '{}'::jsonb, 68),
  ('couve-flor', 'legumes', 'Couve-flor', 'Cauliflower', 1.99, 'un', 'pereira', 'couveFlor', null, 10, 4, '2', false, false, false, null, 'Cabeça branca e firme.', 'White, firm head.', '{}'::jsonb, 69),
  ('brocolos', 'legumes', 'Brócolos', 'Broccoli', 2.39, 'kg', 'pereira', 'brocolos', null, 10, 4, '2', false, true, false, null, 'Cabeças compactas e verdes.', 'Compact green heads.', '{}'::jsonb, 70),
  ('tomate', 'legumes', 'Tomate coração-de-boi', 'Oxheart tomato', 2.49, 'kg', 'teresa', 'tomate', null, 6, 11, '3', false, false, false, null, 'Carnudo e com poucas sementes.', 'Meaty, with few seeds.', '{}'::jsonb, 71),
  ('tomate-cherry', 'legumes', 'Tomate cherry', 'Cherry tomatoes', 2.29, 'cuv', 'teresa', 'tomateCherry', null, 1, 12, '3', false, false, false, null, 'Cuvete de 500 g, de estufa fria.', '500 g punnet, from a cold greenhouse.', '{}'::jsonb, 72),
  ('tomate-chucha', 'legumes', 'Tomate chucha', 'Plum tomato', 1.99, 'kg', 'carlos', 'tomateChucha', null, 6, 10, '3', false, false, false, null, 'Para molhos e conservas.', 'For sauces and preserves.', '{}'::jsonb, 73),
  ('abobora', 'legumes', 'Abóbora-menina', 'Pumpkin', 1.19, 'kg', 'teresa', 'abobora', null, 9, 2, '10-18', false, false, false, null, 'Vendida às fatias ou inteira.', 'Sold in slices or whole.', '{}'::jsonb, 74),
  ('abobora-manteiga', 'legumes', 'Abóbora-manteiga', 'Butternut squash', 1.49, 'kg', 'teresa', 'aboboraManteiga', null, 9, 2, '10-10', false, false, false, null, 'Doce e cremosa, para sopas e assados.', 'Sweet and creamy, for soups and roasts.', '{}'::jsonb, 75),
  ('courgette', 'legumes', 'Courgette', 'Courgette', 1.79, 'kg', 'teresa', 'courgette', null, 5, 10, '2', false, false, false, null, 'Grelhada, salteada ou na sopa.', 'Grilled, sautéed or in soup.', '{}'::jsonb, 76),
  ('pepino', 'legumes', 'Pepino', 'Cucumber', 1.49, 'kg', 'teresa', 'pepino', null, 5, 10, '2', false, false, false, null, 'Fresco para saladas e gaspacho.', 'Fresh for salads and gazpacho.', '{}'::jsonb, 77),
  ('beringela', 'legumes', 'Beringela', 'Aubergine', 2.29, 'kg', 'teresa', 'beringela', null, 6, 10, '2', false, false, false, null, 'Assada ou em moussaka.', 'Roasted or in moussaka.', '{}'::jsonb, 78),
  ('pimento-verde', 'legumes', 'Pimento verde', 'Green pepper', 2.49, 'kg', 'teresa', 'pimentoVerde', null, 6, 10, '2', false, false, false, null, 'Para assar na brasa.', 'For grilling.', '{}'::jsonb, 79),
  ('pimento-vermelho', 'legumes', 'Pimento vermelho', 'Red pepper', 2.99, 'kg', 'teresa', 'pimentoVermelho', null, 7, 11, '4', false, false, false, null, 'Doce e carnudo.', 'Sweet and meaty.', '{}'::jsonb, 80),
  ('feijao-verde', 'legumes', 'Feijão-verde', 'Green beans', 3.49, 'kg', 'carlos', 'feijaoVerde', null, 5, 10, '2', false, false, false, null, 'Fino e sem fios.', 'Fine and stringless.', '{}'::jsonb, 81),
  ('ervilhas', 'legumes', 'Ervilhas', 'Peas', 3.99, 'kg', 'carlos', 'ervilhas', null, 3, 6, '1', false, false, false, null, 'Em vagem, para descascar.', 'In the pod, ready to shell.', '{}'::jsonb, 82),
  ('favas', 'legumes', 'Favas', 'Broad beans', 2.99, 'kg', 'carlos', 'favas', null, 2, 5, '1', false, false, false, null, 'Para favas à portuguesa.', 'For Portuguese-style broad beans.', '{}'::jsonb, 83),
  ('milho-doce', 'legumes', 'Milho doce', 'Sweetcorn', 0.69, 'un', 'carlos', 'milho', null, 7, 9, '1', false, false, false, null, 'Cozido ou na brasa.', 'Boiled or grilled.', '{}'::jsonb, 84),
  ('espargos', 'legumes', 'Espargos verdes', 'Green asparagus', 3.49, 'molho', 'carlos', 'espargos', null, 3, 5, '1', false, false, false, null, 'Molho de 250 g.', '250 g bunch.', '{}'::jsonb, 85),
  ('aipo', 'legumes', 'Aipo', 'Celery', 1.49, 'un', 'pereira', 'aipo', null, 9, 5, '3', false, false, false, null, 'Para sopas, caldos e sumos.', 'For soups, stocks and juices.', '{}'::jsonb, 86),
  ('funcho', 'legumes', 'Funcho', 'Fennel', 1.99, 'un', 'ines', 'funcho', null, 10, 4, '3', false, true, false, null, 'Anisado, cru ou assado.', 'Aniseed flavour, raw or roasted.', '{}'::jsonb, 87),
  ('pimento-amarelo', 'legumes', 'Pimento amarelo', 'Yellow pepper', 2.99, 'kg', 'teresa', 'pimentoAmarelo', null, 7, 11, '4', false, false, false, null, 'Doce, bom cru em saladas.', 'Sweet, good raw in salads.', '{}'::jsonb, 88),
  ('malagueta', 'legumes', 'Malagueta', 'Chilli pepper', 1.49, 'cuv', 'teresa', 'malagueta', null, 7, 11, '4', false, false, false, null, 'Cuvete de 100 g. Muito picante.', '100 g punnet. Very hot.', '{}'::jsonb, 89),
  ('couve-de-bruxelas', 'legumes', 'Couve-de-bruxelas', 'Brussels sprouts', 3.29, 'kg', 'pereira', 'couveBruxelas', null, 10, 3, '2', false, false, false, null, 'Pequenas e firmes, ótimas assadas.', 'Small and firm, great roasted.', '{}'::jsonb, 90),
  ('acelga', 'legumes', 'Acelga', 'Swiss chard', 1.39, 'molho', 'pereira', 'acelga', null, 1, 12, '1', false, false, false, null, 'Folhas e talos para salteados e sopas.', 'Leaves and stalks for stir-fries and soups.', '{}'::jsonb, 91),
  ('chuchu', 'legumes', 'Chuchu', 'Chayote', 1.99, 'kg', 'freitas', 'chuchu', null, 9, 4, '6', false, false, false, null, 'Da Madeira, para sopas e saladas.', 'From Madeira, for soups and salads.', '{}'::jsonb, 92),
  ('manjericao', 'legumes', 'Manjericão', 'Basil', 0.99, 'molho', 'pereira', 'manjericao', null, 5, 10, '1', false, false, false, null, 'Perfumado, para molhos e saladas.', 'Fragrant, for sauces and salads.', '{}'::jsonb, 93)
on conflict (id) do update set categoria = excluded.categoria, nome_pt = excluded.nome_pt, nome_en = excluded.nome_en, preco = excluded.preco, unidade = excluded.unidade,
  agricultor = excluded.agricultor, desenho = excluded.desenho, icone = excluded.icone, epoca_inicio = excluded.epoca_inicio, epoca_fim = excluded.epoca_fim, colheita = excluded.colheita,
  essencial = excluded.essencial, biologico = excluded.biologico, fora_stock = excluded.fora_stock, divisao = excluded.divisao, desc_pt = excluded.desc_pt, desc_en = excluded.desc_en, extra = excluded.extra, ordem = excluded.ordem;

-- preços das caixas por tamanho
insert into public.caixas_precos (caixa, tamanho, kg, preco, ordem) values
  ('caixa-mista', 'P', 4, 11.9, 0),
  ('caixa-mista', 'G', 8, 21.9, 1),
  ('caixa-essencial', 'P', 4, 9.9, 0),
  ('caixa-essencial', 'G', 8, 17.9, 1),
  ('caixa-fruta', 'P', 3, 8.9, 0),
  ('caixa-fruta', 'M', 5, 13.9, 1),
  ('caixa-fruta', 'G', 8, 20.9, 2),
  ('caixa-legumes', 'P', 3, 6.9, 0),
  ('caixa-legumes', 'M', 5, 10.9, 1),
  ('caixa-legumes', 'G', 8, 16.9, 2)
on conflict (caixa, tamanho) do update set kg = excluded.kg, preco = excluded.preco, ordem = excluded.ordem;

-- restaurantes parceiros
insert into public.restaurantes (id, nome, lat, lon, tipo_pt, tipo_en, zona_pt, zona_en, prato_pt, prato_en, desde, pratos, extra, ordem) values
  ('mesa-da-ria', 'Mesa da Ria', 40.6446, -8.6562, 'Peixe e marisco', 'Fish and seafood', 'Bairro da Beira-Mar, junto à Praça do Peixe', 'Beira-Mar quarter, by Praça do Peixe', 'Robalo grelhado com batata da Gândara', 'Grilled sea bass with Gândara potatoes', '2026-09', '[]'::jsonb, '{}'::jsonb, 0),
  ('tasca-da-horta', 'Tasca da Horta', 40.6424, -8.6553, 'Cozinha portuguesa', 'Portuguese cooking', 'Rossio', 'Rossio', 'Caldo verde com couve-galega da Família Pereira', 'Caldo verde with the Pereira family''s kale', '2026-10', '[]'::jsonb, '{}'::jsonb, 1),
  ('moliceiro-verde', 'Moliceiro Verde', 40.643, -8.6598, 'Vegetariano', 'Vegetarian', 'Canal Central', 'Canal Central', 'Risoto de abóbora-manteiga e alho-francês', 'Butternut squash and leek risotto', '2026-09', '[]'::jsonb, '{}'::jsonb, 2),
  ('sal-e-campo', 'Sal & Campo', 40.6478, -8.6566, 'Bistrô', 'Bistro', 'Canal de São Roque', 'Canal de São Roque', 'Salada de rúcula, pera Rocha e noz', 'Rocket, Rocha pear and walnut salad', '2026-11', '[]'::jsonb, '{}'::jsonb, 3),
  ('fonte-nova', 'Bistrô Fonte Nova', 40.6408, -8.6466, 'Cozinha de autor', 'Chef''s cuisine', 'Canal do Cojo, junto ao Centro de Congressos', 'Canal do Cojo, by the Congress Centre', 'Cachaço de porco com castanhas de Vinhais', 'Pork with Vinhais chestnuts', '2026-10', '[]'::jsonb, '{}'::jsonb, 4),
  ('cantina-do-parque', 'Cantina do Parque', 40.6358, -8.6488, 'Almoços e pastelaria', 'Lunches and pastries', 'Parque Infante D. Pedro', 'Infante D. Pedro park', 'Tarte de maçã Reineta', 'Reineta apple tart', '2026-11', '[]'::jsonb, '{}'::jsonb, 5),
  ('cafe-campus', 'Café Campus', 40.6318, -8.6578, 'Café e refeições rápidas', 'Café and quick meals', 'Universidade de Aveiro', 'University of Aveiro', 'Sopa do dia com legumes da Horta Viva', 'Soup of the day with Horta Viva vegetables', '2026-10', '[]'::jsonb, '{}'::jsonb, 6),
  ('estacao-74', 'Estação 74', 40.6431, -8.6418, 'Petiscos', 'Small plates', 'Junto à estação', 'By the railway station', 'Pimentos assados de Torres Vedras', 'Roast peppers from Torres Vedras', '2026-11', '[]'::jsonb, '{}'::jsonb, 7)
on conflict (id) do update set nome = excluded.nome, lat = excluded.lat, lon = excluded.lon, tipo_pt = excluded.tipo_pt, tipo_en = excluded.tipo_en, zona_pt = excluded.zona_pt,
  zona_en = excluded.zona_en, prato_pt = excluded.prato_pt, prato_en = excluded.prato_en, desde = excluded.desde, pratos = excluded.pratos, extra = excluded.extra, ordem = excluded.ordem;

-- dias Colhe Connosco
insert into public.dias_colhe (dia, agricultor, cultura, produto_pt, produto_en, horario, lugares) values
  ('2026-11-28', 'luis', 'diospiro', 'Dióspiros', 'Persimmons', '9h30–12h30', 40),
  ('2026-12-05', 'luis', 'kiwi', 'Kiwis', 'Kiwis', '9h30–12h30', 40),
  ('2026-12-12', 'ines', 'alhoFrances', 'Alho-francês e cenoura', 'Leeks and carrots', '10h–13h', 25),
  ('2026-12-19', 'paulo', 'laranja', 'Laranjas e tangerinas', 'Oranges and mandarins', '10h–13h', 30),
  ('2027-01-16', 'pereira', 'couve', 'Couves e brócolos', 'Cabbage and broccoli', '10h–13h', 30)
on conflict (dia) do update set agricultor = excluded.agricultor, cultura = excluded.cultura, produto_pt = excluded.produto_pt, produto_en = excluded.produto_en, horario = excluded.horario, lugares = excluded.lugares;

-- Fim: 15 agricultores, 94 produtos, 8 restaurantes, 5 dias Colhe Connosco. Agora corra 03-contas.sql.
