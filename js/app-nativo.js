/* ===== Daqui — funções do telemóvel (só na app Android, através do Capacitor) =====
   Na web app e no site, NATIVO.isNative é false e tudo isto é ignorado.
   Plugins usados (instalados no projeto daqui-android): @capacitor/app, @capacitor/splash-screen,
   @capacitor/push-notifications, @capacitor/camera, @capacitor/geolocation, @capacitor/browser
   e o SystemBars, que já vem com o @capacitor/core 8. */
const NATIVO = (() => {
  const C = window.Capacitor;
  const isNative = !!(C && typeof C.isNativePlatform === 'function' && C.isNativePlatform());
  const P = isNative ? C.Plugins || {} : {};
  const N = { isNative, pushState: 'off' };

  /* arranque: esconder o ecrã de arranque, cor da barra de estado, botão "voltar" do Android */
  N.ready = () => {
    if (!isNative) return;
    try { P.SplashScreen && P.SplashScreen.hide(); } catch (e) {}
    // barras do sistema (Capacitor 8): ícones claros em cima (barra verde da app), escuros em baixo (separadores claros)
    try { if (P.SystemBars) { P.SystemBars.setStyle({ style: 'LIGHT', bar: 'NavigationBar' }).catch(() => {}); N.bars(!!$('.a-pdp-hero')); } } catch (e) {}
    if (P.App) P.App.addListener('backButton', () => {
      if ($('#modal').classList.contains('on')) return closeModal();
      if ($('#drawer').classList.contains('on')) return closeCart();
      if (!appBack()) P.App.exitApp();
    });
    if (P.App) P.App.addListener('resume', () => { if (NUVEM.on) NUVEM.refresh(); });
    N.pushStart();
  };

  /* cor dos ícones da barra de estado: claros sobre o verde da app, escuros sobre um topo claro (ficha de produto) */
  let lightTop = null;
  N.bars = light => {
    if (!isNative || !P.SystemBars || light === lightTop) return;
    lightTop = light;
    P.SystemBars.setStyle({ style: light ? 'LIGHT' : 'DARK', bar: 'StatusBar' }).catch(() => {});
  };

  /* notificações push (Firebase): só com APP_CONFIG.notificacoes = true, base de dados ligada e sessão iniciada */
  let listening = false;
  N.pushAvailable = () => isNative && !!P.PushNotifications && APP_CONFIG.notificacoes && NUVEM.on;
  N.pushStart = async (ask = false) => {
    if (!N.pushAvailable() || !NUVEM.hasSession()) return;
    const PN = P.PushNotifications;
    try {
      let st = await PN.checkPermissions();
      if (st.receive === 'prompt' || st.receive === 'prompt-with-rationale') { if (!ask && store.get('daqui-push-perguntado', false)) return; store.set('daqui-push-perguntado', true); st = await PN.requestPermissions(); }
      if (st.receive !== 'granted') { N.pushState = 'denied'; return; }
      await PN.createChannel({ id: 'daqui', name: 'Daqui', description: T('Encomendas, pedidos e lembretes', 'Orders, requests and reminders'), importance: 4, visibility: 1, lights: true, lightColor: '#3C6104', vibration: true }).catch(() => {});
      if (!listening) {
        listening = true;
        PN.addListener('registration', t => { N.pushState = 'on'; NUVEM.pushToken = t.value; store.set('daqui-push-token', t.value); NUVEM.registerDevice(t.value, 'android').catch(e => console.warn(e)); });
        PN.addListener('registrationError', e => { N.pushState = 'error'; console.warn('push', e); });
        PN.addListener('pushNotificationReceived', n => { toast(`${n.title || 'Daqui'}: ${n.body || ''}`); NUVEM.refresh(); });
        PN.addListener('pushNotificationActionPerformed', a => { const r = a.notification && a.notification.data && a.notification.data.rota; if (r) location.hash = r; });
      }
      await PN.register();
    } catch (e) { N.pushState = 'error'; console.warn('push', e); }
  };
  /* a língua das notificações acompanha a da app */
  N.pushLanguage = () => { const t = store.get('daqui-push-token', ''); if (t && NUVEM.on && NUVEM.hasSession()) NUVEM.registerDevice(t, 'android').catch(() => {}); };

  /* câmara: devolve um Blob com a fotografia, ou null se a pessoa cancelar.
     origem: 'camera' (tirar fotografia) ou 'photos' (escolher da galeria).
     @capacitor/camera 8.1+ usa takePhoto/chooseFromGallery; versões anteriores usam getPhoto. */
  N.photo = async (origem = 'camera') => {
    if (!isNative || !P.Camera) return null;
    const Cam = P.Camera, gal = origem === 'photos';
    const toBlob = async r => {
      if (!r) return null;
      if (r.dataUrl) return (await fetch(r.dataUrl)).blob();
      const path = r.webPath || (r.uri && C.convertFileSrc ? C.convertFileSrc(r.uri) : '');
      if (path) { try { return await (await fetch(path)).blob(); } catch (e) {} }
      if (r.thumbnail) return (await fetch('data:image/jpeg;base64,' + r.thumbnail)).blob();
      return null;
    };
    try {
      if (typeof Cam.takePhoto === 'function' && typeof Cam.chooseFromGallery === 'function') {
        if (gal) { const r = await Cam.chooseFromGallery({ mediaType: 0, allowMultipleSelection: false, quality: 80 }); return toBlob(r && r.results && r.results[0]); }
        return toBlob(await Cam.takePhoto({ quality: 80, saveToGallery: false, correctOrientation: true }));
      }
      return toBlob(await Cam.getPhoto({ quality: 75, width: 1600, resultType: 'dataUrl', source: gal ? 'PHOTOS' : 'CAMERA', saveToGallery: false, correctOrientation: true }));
    } catch (e) {
      if (/cancel|canceled|cancelled|no image|no photo/i.test(String(e && (e.message || e)))) return null;
      throw e;
    }
  };

  /* localização (para "Perto de mim" e o mapa) */
  N.position = async () => {
    if (isNative && P.Geolocation) {
      const perm = await P.Geolocation.checkPermissions().catch(() => ({}));
      if (perm.location !== 'granted') { const r = await P.Geolocation.requestPermissions(); if (r.location !== 'granted' && r.coarseLocation !== 'granted') throw new Error('denied'); }
      const p = await P.Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 12000 });
      return { lat: p.coords.latitude, lon: p.coords.longitude };
    }
    return new Promise((ok, ko) => {
      if (!navigator.geolocation) return ko(new Error('unsupported'));
      navigator.geolocation.getCurrentPosition(p => ok({ lat: p.coords.latitude, lon: p.coords.longitude }), ko, { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 });
    });
  };

  /* abrir PDF e endereços externos fora da app (no navegador do telemóvel) */
  N.openExternal = url => { if (isNative && P.Browser) P.Browser.open({ url, toolbarColor: '#3C6104' }); else window.open(url, '_blank', 'noopener'); };
  if (isNative) document.addEventListener('click', e => {
    const a = e.target.closest('a[href]'); if (!a) return;
    const h = a.getAttribute('href');
    if (/\.pdf($|\?)/i.test(h)) { e.preventDefault(); if (!APP_CONFIG.sitePublico) return toast(T('O boletim em PDF está no site da Daqui.', 'The PDF report is on the Daqui website.')); N.openExternal(APP_CONFIG.sitePublico.replace(/\/?$/, '/') + h.replace(/^(\.\.\/|\.\/)+/, '')); }
    else if (/^https?:/i.test(h) && !h.startsWith(location.origin)) { e.preventDefault(); N.openExternal(h); }
  }, true);
  return N;
})();
