import { test, expect } from '@playwright/test';

// Instrument actual browser decoding and source playback, without replacing audio APIs.
async function probeAudio(page) {
  await page.addInitScript(() => {
    const NativeAudio = window.AudioContext;
    const types = new WeakMap();
    const active = new Set();
    window.audioProbe = { decoded: [], samples: [], tones: [], overlaps: 0, failures: 0 };
    window.decodedSamples = {};
    function track(source, kind) {
      const start = source.start.bind(source), stop = source.stop.bind(source);
      source.start = (...args) => {
        if (active.size) window.audioProbe.overlaps++;
        active.add(source);
        if (kind === 'sample') window.audioProbe.samples.push({ type: types.get(source.buffer), time: performance.now() });
        else window.audioProbe.tones.push(source.frequency.value);
        return start(...args);
      };
      source.stop = (...args) => { active.delete(source); return stop(...args); };
      source.addEventListener('ended', () => active.delete(source));
      return source;
    }
    window.AudioContext = class extends NativeAudio {
      async decodeAudioData(bytes) {
        const type = bytes.byteLength === 488264 ? 'start' : bytes.byteLength === 325128 ? 'minute' : 'unknown';
        try {
          const buffer = await super.decodeAudioData(bytes);
          types.set(buffer, type); window.decodedSamples[type] = buffer;
          window.audioProbe.decoded.push({ type, duration: buffer.duration, channels: buffer.numberOfChannels });
          return buffer;
        } catch (error) { window.audioProbe.failures++; throw error; }
      }
      createBufferSource() { return track(super.createBufferSource(), 'sample'); }
      createOscillator() { return track(super.createOscillator(), 'tone'); }
    };
  });
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
}
async function startAndDecode(page) {
  await page.getByRole('button', { name: 'Start Workout', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.audioProbe.decoded.length)).toBe(2);
  await expect(page.getByRole('button', { name: 'Sound: On' })).toBeVisible();
  const decoded = await page.evaluate(() => window.audioProbe.decoded);
  expect(decoded.find(b => b.type === 'start').duration).toBeCloseTo(1.844989, 3);
  expect(decoded.find(b => b.type === 'minute').duration).toBeCloseTo(1.842880, 3);
  expect(decoded.every(b => b.channels === 2)).toBe(true);
}
for (const id of ['hybrid-001-strength-sweat', 'focus-001-upper-abs']) {
  test(`original WAV playback at start, minutes 1–19 and completion: ${id}`, async ({ page }) => {
    await probeAudio(page); await page.goto(`./#workout/${id}/1`); await startAndDecode(page);
    await page.clock.runFor(3000);
    let samples = await page.evaluate(() => window.audioProbe.samples);
    expect(samples.map(s => s.type)).toEqual(['start']);
    const startTime = samples[0].time;
    for (let minute = 1; minute <= 20; minute++) {
      // Skip old events, then tick across the exact boundary as a foreground browser.
      await page.clock.fastForward(59900); await page.clock.runFor(100);
      samples = await page.evaluate(() => window.audioProbe.samples);
      expect(samples.filter(s => s.type === 'start')).toHaveLength(1);
      expect(samples.filter(s => s.type === 'minute')).toHaveLength(Math.min(minute, 19));
      if (minute < 20) expect(samples.at(-1).time - startTime).toBe(minute * 60000);
    }
    await expect(page.getByRole('heading', { name: 'Workout Complete', exact: true })).toBeVisible();
    expect(await page.evaluate(() => window.audioProbe.tones)).toEqual([1320]);
    expect(await page.evaluate(() => window.audioProbe.overlaps)).toBe(0);
    // Render the real decoded PCM through a real audio graph, independent of speakers.
    const peaks = await page.evaluate(async () => {
      const result = [];
      for (const buffer of Object.values(window.decodedSamples)) {
        const context = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
        const source = context.createBufferSource(); source.buffer = buffer; source.connect(context.destination); source.start();
        const output = await context.startRendering();
        let peak = 0; for (const sample of output.getChannelData(0)) peak = Math.max(peak, Math.abs(sample));
        result.push(peak);
      }
      return result;
    });
    expect(peaks).toHaveLength(2); expect(peaks.every(peak => peak > 0 && Number.isFinite(peak))).toBe(true);
  });
}
test('both originals are precached, decoded and played offline; mute and pause do not replay', async ({ page, context }) => {
  await probeAudio(page); await page.goto('./#workout/hybrid-001-strength-sweat/1');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true)); await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  const cached = await page.evaluate(async () => {
    const cache = await caches.open('kb2-static-v9');
    return Promise.all(['start', 'minute'].map(async name => {
      const response = await cache.match(new URL(`./assets/audio/${name}.wav`, location.href));
      return response?.ok ? (await response.arrayBuffer()).byteLength : 0;
    }));
  });
  expect(cached).toEqual([488264, 325128]);
  await context.setOffline(true); await page.reload(); await startAndDecode(page);
  await page.clock.runFor(3000); expect(await page.evaluate(() => window.audioProbe.samples.length)).toBe(1);
  await page.getByRole('button', { name: 'Pause', exact: true }).click(); await page.clock.fastForward(300000);
  await page.getByRole('button', { name: 'Resume', exact: true }).click(); expect(await page.evaluate(() => window.audioProbe.samples.length)).toBe(1);
  await page.getByRole('button', { name: 'Sound: On' }).click();
  await page.clock.fastForward(59900); await page.clock.runFor(100); expect(await page.evaluate(() => window.audioProbe.samples.length)).toBe(1);
  await page.getByRole('button', { name: 'Sound: Off' }).click(); await page.clock.runFor(100);
  expect(await page.evaluate(() => window.audioProbe.samples.length)).toBe(1);
  await page.clock.fastForward(59800); await page.clock.runFor(100);
  expect(await page.evaluate(() => window.audioProbe.samples.map(s => s.type))).toEqual(['start', 'minute']);
  await context.setOffline(false);
});
test.describe('invalid WAV fallback', () => {
  test.use({ serviceWorkers: 'block' });
  test('decoder failure falls back to one synthesized cue without affecting time', async ({ page }) => {
    await probeAudio(page);
    await page.route('**/assets/audio/*.wav', route => route.fulfill({ contentType: 'audio/wav', body: 'invalid WAV test response' }));
    await page.goto('./#workout/hybrid-001-strength-sweat/1');
    await page.getByRole('button', { name: 'Start Workout', exact: true }).click();
    await expect.poll(() => page.evaluate(() => window.audioProbe.failures)).toBe(2);
    await page.clock.runFor(3000); expect(await page.evaluate(() => window.audioProbe.tones)).toEqual([880]);
    await page.clock.fastForward(59900); await page.clock.runFor(100);
    expect(await page.evaluate(() => window.audioProbe.tones)).toEqual([880, 980]);
    expect(await page.evaluate(() => window.audioProbe.samples)).toEqual([]);
    await expect(page.locator('.total-time')).toHaveText('Total remaining: 19:00');
  });
});
