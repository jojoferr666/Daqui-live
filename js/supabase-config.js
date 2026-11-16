/* ===== Daqui — ligação à base de dados Supabase =====
   Com estes dois campos preenchidos, contas, encomendas, pedidos e o catálogo passam a viver na base de dados:
   a mesma conta funciona em qualquer computador ou telemóvel e a gestão vê tudo em tempo real.
   Deixe-os vazios ('') para o site funcionar como antes, com os dados guardados só no navegador.

   Onde encontrar os valores: Supabase → o seu projeto → botão "Connect" (ou Project Settings → API Keys / Data API)
     SUPABASE_URL  → "Project URL", ex.: 'https://abcdefghijklmno.supabase.co'
     SUPABASE_KEY  → a chave pública: "anon public" (começa por eyJ…) ou "publishable" (começa por sb_publishable_…)

   Esta chave pode estar no site: só dá o acesso que as regras da base de dados (01-estrutura.sql) permitem.
   NUNCA ponha aqui a chave "service_role" nem a "secret" (sb_secret_…): essas dão acesso total. */
const SUPABASE_URL = 'https://lcinpdjxoiahdzljxqts.supabase.co';
const SUPABASE_KEY = 'sb_publishable_E6jlAnSlqQjGtjbAH2VLVg_ed11xnO1';

/* Quando o tempo real não está disponível, o site volta a ler a base de dados de quantos em quantos segundos
   (só com sessão iniciada e com a página visível). */
const SUPABASE_ATUALIZAR_SEGUNDOS = 30;
