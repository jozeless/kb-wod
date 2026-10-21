# User-provided audio — pending files

Expected files: `start.wav` and `minute.wav`, retaining their original names and bytes.

These WAV attachments were not included with the supplied text request. No replacement WAVs have been generated. Add the user's actual files here before considering custom audio delivery complete. Their format, duration, decoding and audible playback still require verification.

The application preloads these local URLs and attempts to decode them after Start Workout unlocks Web Audio. A missing, undecodable or late sample uses the existing synthesized cue, once, without delayed replay. The PWA caches available WAVs opportunistically; a missing file does not prevent installation of the application shell. After adding the actual files, bump the PWA cache version and verify both are cached and playable offline.
