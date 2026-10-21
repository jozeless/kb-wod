const CACHE = 'kb2-static-v5';
const ASSETS = ['./', './index.html', './styles/app.css', './src/main.js', './src/data/catalog.js', './src/data/hybrid-001-strength-sweat.js', './src/data/focus-001-upper-abs.js', './src/data/demo-workouts.js', './src/domain/planning.js', './src/domain/workout-timer.js', './src/domain/workout-cues.js', './src/storage/weight-preferences.js', './src/ui/weight-field.js', './src/platform/workout-audio.js', './src/platform/audio-samples.js', './src/ui/exercise-prescription.js', './src/ui/active-workout.js', './src/storage/weekly-plan.js', './src/ui/components.js', './src/ui/views.js', './src/ui/workout-details.js', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
const AUDIO = ['./assets/audio/start.wav', './assets/audio/minute.wav'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(async cache => {
  await cache.addAll(ASSETS);
  // Audio is optional: missing user attachments must not break the app's offline shell.
  await Promise.all(AUDIO.map(async path => {
    try {
      const url = new URL(path, self.registration.scope);
      const response = await fetch(url);
      if (response.ok) await cache.put(url.href, response);
    } catch { /* The existing local tones remain available offline. */ }
  }));
})));
// Keep prototype caches untouched. A new worker waits for existing tabs to close.
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('kb2-static-') && key !== CACHE).map(key => caches.delete(key))))));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Hash routes identify UI state, not a different cached HTML resource.
  url.hash = '';
  const known = [...ASSETS, ...AUDIO].some(path => new URL(path, self.registration.scope).href === url.href);
  if (!known) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(url.href);
    return cached || fetch(event.request);
  }));
});
