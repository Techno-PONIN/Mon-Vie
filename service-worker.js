/* Service worker : met l'application en cache pour qu'elle fonctionne hors ligne.
   ➜ Quand tu modifies un fichier, change le numéro de version ci-dessous. */
const CACHE = 'centre-v2';
const FILES = ['./', 'index.html', 'manifest.json', 'css/style.css',
  ...['core', 'database', 'priority', 'ui', 'calendar', 'tasks', 'teacher', 'budget', 'shopping', 'meals', 'family', 'association', 'projects', 'notes', 'routines', 'home', 'assistant', 'notifications', 'weather', 'search', 'settings', 'demo', 'app'].map(n => `js/${n}.js`),
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => {
    const net = fetch(req).then(res => { if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; }).catch(() => hit || caches.match('index.html'));
    return hit || net;
  }));
});
