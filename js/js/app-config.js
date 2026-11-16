/* ===== Daqui — definições da app para telemóvel =====
   Usado pela web app (pasta app/ do site) e pela app Android (projeto daqui-android).
   A ligação à base de dados está em js/supabase-config.js, igual para o site e para a app. */
const APP_CONFIG = {
  /* Endereço público do site (GitHub Pages), terminado em "/". Serve para abrir os boletins de análises (PDF)
     a partir da app Android, ex.: 'https://o-seu-utilizador.github.io/daqui/'. Vazio = a app só mostra o resumo. */
  sitePublico: '',

  /* Notificações push na app Android. Ponha true DEPOIS de copiar o google-services.json do Firebase
     para daqui-android/android/app/ (LEIA-ME-APP.md, passo 6). Com false a app não pede notificações. */
  notificacoes: false
};
