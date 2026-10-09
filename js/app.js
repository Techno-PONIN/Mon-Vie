'use strict';
/* =====================================================================
   app.js — démarrage de l'application
   ===================================================================== */
async function init() {
  await loadState();
  if (!S.flags.installed) S.flags.installed = today();
  applyTheme(); buildNav();
  const h = location.hash.replace('#', ''); if (h && VIEWS[h]) UI.view = h;
  render();
  if (FIRST_RUN) {
    loadDemo(); save(); render();
    openModal(`<h2>👋 Bienvenue dans ton Centre de commande</h2>
      <p>Tout reste <b>sur cet appareil</b> : pas de compte, pas de serveur, pas de publicité.</p>
      <p>Pour que tu puisses explorer, des <b>données de démonstration</b> sont chargées. Quand tu es prêt : <b>Paramètres → Effacer les données de démonstration</b>.</p>
      <div class="mact"><button class="btn" data-act="clearDemoClose">Commencer à vide</button><span class="sp"></span><button class="btn primary" data-act="closeModal">Découvrir</button></div>`);
  }
  setTimeout(checkNotifs, 1500); setInterval(checkNotifs, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { render(); checkNotifs(); } });
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('service-worker.js').catch(() => { });
}
ACT.clearDemoClose = () => { closeModal(); ACT.clearDemo(); };
window.addEventListener('error', e => { try { toast('⚠️ Erreur : ' + e.message); } catch (x) { } });
init();
