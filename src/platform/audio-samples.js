// User-supplied files only. No generated substitutes are shipped as these WAVs.
export const sampleUrls = {
  start: new URL('../../assets/audio/start.wav', import.meta.url).href,
  minute: new URL('../../assets/audio/minute.wav', import.meta.url).href,
};
export function createSamplePreloader(fetcher = (...args) => fetch(...args)) {
  const requests = {};
  function preload() {
    for (const [type, url] of Object.entries(sampleUrls)) {
      requests[type] ??= Promise.resolve().then(() => fetcher(url)).then(response => response.ok ? response.arrayBuffer() : null).catch(() => null);
    }
  }
  return {
    preload,
    async get(type) { preload(); return requests[type] ? requests[type] : null; },
  };
}
export const audioSamples = createSamplePreloader();
