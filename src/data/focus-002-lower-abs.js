// Immutable workout version 1; prescribed targets, never measured results.
export const focus002LowerAbs = {
  "version": 1,
  "durationSeconds": 1200,
  "demo": false,
  "archived": false,
  "image": null,
  "warmup": {
    "included": false,
    "note": "Warm-up is separate from the 20-minute workout."
  },
  "equipment": {
    "name": "Kettlebell",
    "availableMinKg": 4,
    "availableMaxKg": 24,
    "requiredWeightKg": null
  },
  "execution": {
    "mode": "continuous-results"
  },
  "id": "focus-002-lower-abs",
  "code": "KB Focus 002",
  "name": "Lower Body + ABS",
  "suggestedDay": "Thursday",
  "type": "focus",
  "category": "Strength and core",
  "purpose": "Complete the continuous 20-minute workout, then record actual results.",
  "exercises": [
    {
      "id": "goblet-squat",
      "name": "KB Goblet Squat",
      "target": {
        "min": 8,
        "max": 10,
        "unit": "reps"
      }
    },
    {
      "id": "romanian-deadlift",
      "name": "KB Romanian Deadlift (bilateral)",
      "target": {
        "min": 8,
        "max": 10,
        "unit": "reps"
      }
    },
    {
      "id": "reverse-lunges",
      "name": "KB Reverse Lunges",
      "target": {
        "min": 5,
        "max": 5,
        "unit": "reps per leg"
      }
    },
    {
      "id": "glute-bridge",
      "name": "KB Glute Bridge",
      "target": {
        "min": 10,
        "max": 12,
        "unit": "reps"
      }
    },
    {
      "id": "standing-calf-raises",
      "name": "KB Standing Calf Raises",
      "target": {
        "min": 12,
        "max": 15,
        "unit": "reps"
      }
    },
    {
      "id": "suitcase-march",
      "name": "KB Suitcase March",
      "target": {
        "min": 40,
        "max": 40,
        "unit": "seconds (20 seconds per side)"
      }
    },
    {
      "id": "plank-drag",
      "name": "KB Plank Drag",
      "target": {
        "min": 40,
        "max": 40,
        "unit": "seconds"
      }
    },
    {
      "id": "standing-wood-chop",
      "name": "KB Standing Wood Chop",
      "target": {
        "min": 40,
        "max": 40,
        "unit": "seconds (20 seconds per direction)"
      }
    },
    {
      "id": "reverse-crunch-hold",
      "name": "KB Reverse Crunch + Hold",
      "target": {
        "min": 40,
        "max": 40,
        "unit": "seconds"
      }
    },
    {
      "id": "figure-8-pass",
      "name": "KB Figure-8 Pass",
      "target": {
        "min": 40,
        "max": 40,
        "unit": "seconds"
      }
    }
  ],
  "phases": [
    {
      "id": "legs",
      "name": "LEGS",
      "durationSeconds": 600,
      "format": "emom",
      "timer": {
        "intervalSeconds": 60,
        "intervals": 10
      },
      "exerciseIds": [
        "goblet-squat",
        "romanian-deadlift",
        "reverse-lunges",
        "glute-bridge",
        "standing-calf-raises"
      ],
      "instructions": "Start one movement each minute in order; recover during the remaining seconds.",
      "objectives": [
        "Record actual weights and completed counts after all 20 active minutes."
      ],
      "rounds": 2
    },
    {
      "id": "abs",
      "name": "ABS",
      "durationSeconds": 600,
      "format": "intervals",
      "timer": {
        "workSeconds": 40,
        "restSeconds": 20,
        "intervals": 10
      },
      "exerciseIds": [
        "suitcase-march",
        "plank-drag",
        "standing-wood-chop",
        "reverse-crunch-hold",
        "figure-8-pass"
      ],
      "instructions": "Follow the ordered exercises twice: 40 seconds work, then 20 seconds rest including the last interval. Side changes are guidance only, with no additional automatic transitions.",
      "objectives": [
        "Record actual weights and completed counts after all 20 active minutes."
      ],
      "rounds": 2
    }
  ],
  "resultFields": [
    {
      "id": "legs",
      "type": "emom",
      "fields": [
        "weightKg",
        "round1",
        "round2"
      ]
    },
    {
      "id": "abs",
      "type": "intervals",
      "fields": [
        "weightKg",
        "intervalsCompleted"
      ]
    }
  ]
};
