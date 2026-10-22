# Original user-provided workout audio

The two original WAV files are included unchanged. No conversion, trimming, normalization or substitute audio was applied.

| File | Format | Duration | Bytes |
| --- | --- | --- | --- |
| `start.wav` | PCM, stereo, 44,100 Hz, 24-bit | 1.844989 s | 488,264 |
| `minute.wav` | PCM, stereo, 44,100 Hz, 16-bit | 1.842880 s | 325,128 |

SHA-256:

- `start.wav`: `10db17f455eb883818acd2867c33ab111bada25ce4c18a8c82c99aa08b131cbe`
- `minute.wav`: `a6815b6d4261b29a3da6cdbaf4d66b81439935a0c1e872f165001ae1f10ba71e`

The application preloads local URLs and unlocks Web Audio from Start Workout. Start plays once at the end of the 3-second lead-in; minute plays at elapsed minutes 1–19. At 20:00 the existing completion tone takes precedence. Sound On/Off, pause and single-voice cleanup prevent replay and overlap. Missing, undecodable or not-yet-ready samples fall back to existing synthesized tones without delaying the workout or playing a stale sample later.

Both WAVs are mandatory precache assets in `kb2-static-v6`, so a worker installs only after caching both files along with the application shell. The existing waiting-worker lifecycle is retained: close older app tabs to allow an installed update to activate. Synthesized fallback remains available at runtime if sample fetching/decoding fails.

`tests/custom-audio.spec.js` uses the actual files and native Chromium Web Audio decoding, buffer-source playback and offline audio rendering. It checks scheduled playback at start and all 19 minute boundaries for Hybrid and Focus, completion priority, non-overlap, mute/pause, corrupt-WAV fallback and cached offline playback. Hardware audibility, iOS/Android autoplay policies and locked-screen behavior still need real-device validation.
