# Original user-provided workout audio

The two original WAV files are included unchanged. No conversion, trimming, normalization or substitute audio was applied.

| File | Format | Duration | Bytes |
| --- | --- | --- | --- |
| `start.wav` | PCM, stereo, 44,100 Hz, 24-bit | 1.844989 s | 488,264 |
| `minute.wav` | PCM, stereo, 44,100 Hz, 16-bit | 1.842880 s | 325,128 |

SHA-256:

- `start.wav`: `10db17f455eb883818acd2867c33ab111bada25ce4c18a8c82c99aa08b131cbe`
- `minute.wav`: `a6815b6d4261b29a3da6cdbaf4d66b81439935a0c1e872f165001ae1f10ba71e`

These files are retained as historical assets only. Current workout cues are synthesized entirely in JavaScript with Web Audio; neither file is preloaded, decoded or played by the active timer. The archived preloader utility remains in the repository for historical compatibility/testing.

The static cache `kb2-static-v14` still retains these repository assets; playback itself has no WAV or network dependency. See [the six synthesized signal patterns](../../docs/TIMER_AUDIO.md) for current event semantics, envelopes, cancellation and validation. No new audio files, external sound downloads or audio library are introduced.
