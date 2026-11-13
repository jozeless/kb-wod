# Classic Iron — additional repetitions

This document records the partial-repetition release. The [automatic round-times extension](CLASSIC_IRON_ROUND_TIMES.md) additionally records `roundTimesMs` in new results while retaining older payloads unchanged.

Branch: `feature/classic-iron-partial-reps`, based on merged main `95c3c97` (PR #33).

This extends Classic Iron v1 results without changing its definition, identity, version, timer, round button, rest periods, audio or active Focus Mode. Progress charts, other workout schemas, storage and cloud implementations remain unchanged.

## Behavior

After the complete 20-minute workout, automatically captured completed rounds remain read-only. **Additional repetitions** is a numeric field defaulting to 0, with the explanation “Repetitions completed in your final unfinished round.”

Only whole-number entries from 0 through 69 are accepted. Blank, signed, fractional, scientific-notation, malformed and out-of-range entries are rejected with an inline “Enter a whole number from 0 to 69.” message. Invalid entries remain in the control; the application never clears or replaces them. The browser's native numeric editing rules still apply. Editing this field never adjusts completed rounds or converts repetitions into rounds.

Save remains explicit and completed-only. The only saved performance fields are `completedRounds` and `partialReps`. The existing session metadata, UUID, immutable snapshot, ownership check and idempotent transaction are retained. Both the field and Save button are disabled during an attempt; storage failure re-enables them while retaining the same rounds, entry and UUID for retry. No draft, checkpoint or automatic write is introduced.

History displays both values. A historical result lacking `partialReps` displays zero; rendering does not mutate, rewrite or delete the record. Existing JSONB transport carries the new field without SQL, schema or synchronization changes.

## Files

- `src/domain/classic-iron-results.js`: strict raw-input validation and the two-field result payload.
- `src/ui/round-amrap-training.js`: additional-repetition field, accessible inline feedback and Save integration; active timing/control code is untouched.
- `src/ui/session-history.js`: additional repetitions and read-only historical fallback.
- `service-worker.js`: v34 → v35; all 98 previous precache resources remain unchanged.
- `tests/classic-iron.test.js` and `tests/classic-iron.spec.js`: validation, read-only rounds, 8 + 20, bounds, duplicate Save, storage failure/retry, historical records, offline operation, responsive results and mocked synchronization.
- Existing cache assertions: expected version updated to v35; no unrelated regression assertions removed.
- One existing Oldschool navigation assertion now waits for the same ordered exercise texts, avoiding a read before the hash navigation finishes rendering. Its expected exercises and count are unchanged.

Existing baseline hashes continue to protect legacy data, engines, audio, storage, cloud and styles. Additional hashes specifically protect Classic Iron's definition, AMRAP timer/cues, active presentation and scoped stylesheet against changes in this extension.

## Verification

Layout evidence is available under `/workspace/artifacts/classic-iron-partial-reps/`, covering 320, 390, 768 and 1280 px at normal and 200% text. Cloud tests use a mocked transport and do not write to production.

- `npm test`: **143 passed**, no failures.
- `npx playwright test --workers=2`: **410 passed**, no failures (11.8 minutes), mobile and desktop Chromium.
- Targeted recheck of Oldschool navigation and the final 8 + 20 results layout: **4 passed**.
- `git diff --check`: clean.

The complete suite covers the seven existing public WODs, historical versions, timers, audio, Focus Mode, saved sessions, ownership, synchronization fixtures, History, monthly activity and offline resources. No production writes, data deletion, merge or deployment are included.
