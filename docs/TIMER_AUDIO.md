# Synthesized timer signals

All relevant workout controllers use the same semantic cue tracker and Web Audio synthesizer. No workout definition, timer duration, session/result format or backend behavior is changed. Sounds are generated with sine oscillators, not WAV/MP3 playback. The original audio files and preloader utility remain archived in the repository; the current runtime does not preload, decode or play them.

| Event | Pattern | Frequency | Beep length(s) | Silent gap |
| --- | --- | --- | --- | --- |
| START | One strong medium beep after initial 3–2–1 | 640 Hz | 380 ms | — |
| MINUTE | One short beep at a new EMOM exercise/minute | 760 Hz | 120 ms | — |
| REST | Two short beeps when WORK ends | 520 Hz | 110 + 110 ms | 100 ms |
| WORK | One strong higher beep when REST ends / a block starts | 1040 Hz | 230 ms | — |
| FINISHER | Two short beeps, then a longer beep at the final Thruster minute | 880 Hz | 110 + 110 + 360 ms | 100 ms |
| COMPLETE | Two longer beeps at whole-workout completion | 620 Hz | 400 + 400 ms | 160 ms |

Each beep has a 12 ms attack, a held level, and 35 ms release to zero. Peak gain is 0.22–0.28 with no concurrently mixed pattern voices. Cancellation fades an already audible note over 15 ms, stops all pending notes, and schedules a replacement after the fade; future notes cannot leak after pause/mute/exit. A 20 ms cleanup timeout closes a disposed context after its fade; no JavaScript timeout schedules audio playback. All note timing uses the Web Audio clock.

## Event priority and silence

- One event produces one pattern, whose two/three beeps are sub-notes of that pattern.
- At a segment boundary: FINISHER for the single-exercise AMRAP-reps phase; REST for entry into a 20-second rest; WORK for entry into a work interval or a new training block; MINUTE for another exercise/minute in the same EMOM phase. Whole-workout COMPLETE wins at the final boundary.
- There is no independent elapsed-minute alarm during intervals, AMRAP or transitions, so MINUTE cannot coincide with REST/WORK. There are no final-three-second tick sounds.
- Entering either five-second transition is silent. Its visual 5–4–3–2–1 remains unchanged. Exactly one WORK cue sounds when the next Upper/ABS/Legs block starts; entering the final KB Thruster minute produces FINISHER only.
- A stopped intermediate results screen is silent. Saving final results lets the already scheduled COMPLETE pattern finish; explicit mute/pause/exit still cancels it. A manual Continue and its later lead-in produce WORK at the next block, never another START or an intermediate COMPLETE.
- Muted, paused, hidden, restored or delayed updates still consume event positions. Boundaries missed by more than 1.5 seconds are skipped rather than queued, including a missed completion. Resume/re-enable never replay an old pattern.

## Browser support and failure isolation

Start Workout, Sound and Resume keep gesture-based AudioContext unlocking. A recovered Sound On can be turned Off before Resume without unlocking or replaying the initial signal. Missing/blocked/suspended Web Audio never blocks the timer or save flow. A resume promise that never settles is bounded to 250 ms of initialization; the countdown then starts with Sound Off. This guard never changes workout/countdown durations. Disposed audio objects cannot be re-enabled by a late callback. Existing Sound preferences remain unchanged.

The static worker is `kb2-static-v15`. Historical local WAV assets remain in the repository and static precache, but all current workout signals work without fetching/decoding those files at runtime and without an external audio library. Close old app tabs to allow the waiting worker to activate after a separately authorized release. No deploy or merge is performed by this change.

## Tests and practical limits

Node tests cover semantic priority, no ticks/global-minute noise, no delayed-event replay, exact pattern shapes, cancellation of scheduled notes, mute/unlock/dispose races and failure isolation. Browser tests drive the real timeline/controllers at **every segment and elapsed-minute boundary** for legacy Focus, Focus v2, Hybrid v2, Focus 002, Hybrid 002 and Monday Paranoid v1/v2/v3, including stopped result forms and the two automatic five-second transitions.

Native Chromium tests use actual oscillators, inspect replacement scheduling for non-overlap and render every pattern through OfflineAudioContext to verify audible finite peaks, zero-ended envelopes and silent gaps. They check offline playback, pause/mute/re-enable/recovery and the absence of runtime WAV dependency. All non-audio workout/history/cloud/UI regressions remain enabled.

Physical loudness depends on the device, OS volume, speaker and mobile browser. Peaks are deliberately bounded and pitches avoid very high/sharp tones; speaker audibility and iOS/Android autoplay/lock behavior still need device checks. Browser suspension can prevent a sound at its intended time; missed signals are intentionally not replayed. No timer or duration workaround is introduced for locked-screen execution.
