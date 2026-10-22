// Immutable workout version 1; prescribed targets, never measured results.
export const hybrid002FullBodyEngine = {
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
  "id": "hybrid-002-full-body-engine",
  "code": "KB Hybrid 002",
  "name": "Full Body Engine",
  "suggestedDay": "Friday",
  "type": "hybrid",
  "category": "Strength and conditioning",
  "purpose": "Complete the continuous 20-minute workout, then record actual results.",
  "exercises": [
    {
      "id": "floor-press",
      "name": "KB Floor Press",
      "target": {
        "min": 6,
        "max": 6,
        "unit": "reps per side"
      }
    },
    {
      "id": "sumo-deadlift",
      "name": "KB Sumo Deadlift",
      "target": {
        "min": 8,
        "max": 10,
        "unit": "reps"
      }
    },
    {
      "id": "swing",
      "name": "KB Swing",
      "target": {
        "min": 40,
        "max": 40,
        "unit": "seconds"
      }
    },
    {
      "id": "front-rack-march",
      "name": "KB Front Rack March",
      "target": {
        "min": 40,
        "max": 40,
        "unit": "seconds (20 seconds per side)"
      }
    },
    {
      "id": "chest-level-crossover",
      "name": "KB Chest-Level Crossover",
      "target": {
        "min": 40,
        "max": 40,
        "unit": "seconds"
      }
    },
    {
      "id": "lateral-lunges",
      "name": "KB Lateral Lunges",
      "target": {
        "min": 40,
        "max": 40,
        "unit": "seconds"
      }
    },
    {
      "id": "cleans",
      "name": "KB Cleans",
      "target": {
        "min": 6,
        "max": 6,
        "unit": "reps (3 per side)"
      }
    },
    {
      "id": "push-ups",
      "name": "Push-Ups",
      "target": {
        "min": 6,
        "max": 6,
        "unit": "controlled reps"
      }
    },
    {
      "id": "goblet-squats",
      "name": "KB Goblet Squats",
      "target": {
        "min": 8,
        "max": 8,
        "unit": "reps"
      }
    }
  ],
  "phases": [
    {
      "id": "strength",
      "name": "Strength",
      "durationSeconds": 480,
      "format": "emom",
      "timer": {
        "intervalSeconds": 60,
        "intervals": 8
      },
      "exerciseIds": [
        "floor-press",
        "sumo-deadlift"
      ],
      "instructions": "Start one movement each minute in order; recover during the remaining seconds.",
      "objectives": [
        "Record actual weights and completed counts after all 20 active minutes."
      ],
      "rounds": 4
    },
    {
      "id": "conditioning",
      "name": "Conditioning",
      "durationSeconds": 480,
      "format": "intervals",
      "timer": {
        "workSeconds": 40,
        "restSeconds": 20,
        "intervals": 8
      },
      "exerciseIds": [
        "swing",
        "front-rack-march",
        "chest-level-crossover",
        "lateral-lunges"
      ],
      "instructions": "Follow the ordered exercises twice: 40 seconds work, then 20 seconds rest including the last interval. Side changes are guidance only, with no additional automatic transitions.",
      "objectives": [
        "Record actual weights and completed counts after all 20 active minutes."
      ],
      "rounds": 2
    },
    {
      "id": "combo-finisher",
      "name": "Combo Finisher",
      "durationSeconds": 240,
      "format": "amrap",
      "timer": {
        "durationSeconds": 240
      },
      "exerciseIds": [
        "cleans",
        "push-ups",
        "goblet-squats"
      ],
      "instructions": "Repeat the complete circuit at your own pace. No automatic exercise transitions or rests.",
      "objectives": [
        "Record actual weights and completed counts after all 20 active minutes."
      ]
    }
  ],
  "resultFields": [
    {
      "id": "strength",
      "type": "emom",
      "fields": [
        "weightKg",
        "round1",
        "round2",
        "round3",
        "round4"
      ]
    },
    {
      "id": "conditioning",
      "type": "intervals",
      "fields": [
        "weightKg",
        "intervalsCompleted"
      ]
    },
    {
      "id": "combo-finisher",
      "type": "amrap",
      "fields": [
        "weightKg",
        "fullRounds",
        "partialReps"
      ]
    }
  ]
};
