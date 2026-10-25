const CACHE = 'kb2-static-v12';
const AUDIO = ['./assets/audio/start.wav', './assets/audio/minute.wav'];
const ASSETS = ['./src/data/monday-paranoid-v2.js', './src/data/monday-paranoid.js', './src/cloud/config.js', './src/cloud/identity.js', './src/cloud/auth.js', './src/cloud/api.js', './src/cloud/sync.js', './src/cloud/runtime.js', './src/ui/account.js', './src/data/focus-002-lower-abs.js', './src/data/hybrid-002-full-body-engine.js', './src/domain/continuous-results.js', './', './index.html', './styles/app.css', './src/main.js', './src/data/catalog.js', './src/data/hybrid-001-v2.js', './src/domain/hybrid-results.js', './src/domain/result-schemas.js', './src/ui/block-training.js', './src/ui/block-result-form.js', './src/data/focus-001-v2.js', './src/storage/session-store.js', './src/domain/focus-results.js', './src/ui/focus-result-form.js', './src/ui/focus-training.js', './src/ui/session-history.js', './src/data/hybrid-001-strength-sweat.js', './src/data/focus-001-upper-abs.js', './src/data/demo-workouts.js', './src/domain/planning.js', './src/domain/workout-timer.js', './src/domain/workout-cues.js', './src/storage/weight-preferences.js', './src/ui/weight-field.js', './src/platform/workout-audio.js', './src/platform/audio-samples.js', './src/ui/exercise-prescription.js', './src/ui/active-workout.js', './src/storage/weekly-plan.js', './src/ui/components.js', './src/ui/views.js', './src/ui/workout-details.js', './manifest.webmanifest', './icon-192.png', './icon-512.png', ...AUDIO];
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
