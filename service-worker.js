const CACHE = 'kb2-static-v38';
const AUDIO = ['./assets/audio/start.wav', './assets/audio/minute.wav'];
const ASSETS = ['./', './index.html', './src/cloud/api.js', './src/cloud/auth.js', './src/cloud/config.js', './src/cloud/identity.js', './src/cloud/runtime.js', './src/cloud/sync.js', './src/data/catalog.js', './src/data/classic-iron.js', './src/domain/classic-iron-progress.js', './src/domain/classic-iron-results.js', './src/domain/planning.js', './src/domain/progress-analytics.js', './src/domain/round-amrap-timer.js', './src/domain/workout-timer.js', './src/main.js', './src/platform/workout-audio.js', './src/platform/workspace-lock.js', './src/storage/session-store.js', './src/storage/weekly-plan.js', './src/ui/account.js', './src/ui/active-presentation.js', './src/ui/components.js', './src/ui/exercise-prescription.js', './src/ui/progress.js', './src/ui/round-amrap-presentation.js', './src/ui/round-amrap-training.js', './src/ui/round-times.js', './src/ui/session-history.js', './src/ui/views.js', './src/ui/workout-details.js', './src/ui/workout-presentation.js', './styles/app.css', './styles/hm-active.css', './styles/hm-details.css', './styles/hm-footer.css', './styles/hm-header.css', './styles/hm-library.css', './styles/hm-progress.css', './styles/hm-round-amrap.css', './styles/hm-today.css', './styles/hm-tokens.css', './manifest.webmanifest', './icon-192.png', './icon-512.png', './assets/branding/hmkblogo001.png', './assets/icons/hmkb-apple-touch-v2-180.png', './assets/icons/hmkb-favicon-v2-32.png', './assets/icons/hmkb-icon-v2-192.png', './assets/icons/hmkb-icon-v2-512.png', './assets/icons/hmkb-maskable-v2-512.png', ...AUDIO];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))));
// Keep prototype caches untouched. A new worker waits for existing tabs to close.
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('kb2-static-') && key !== CACHE).map(key => caches.delete(key))))));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Hash routes identify UI state, not a different cached HTML resource.
  url.hash = '';
  const known = ASSETS.some(path => new URL(path, self.registration.scope).href === url.href);
  if (!known) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(url.href);
    return cached || fetch(event.request);
  }));
});
