import { oldschoolWorkout } from './oldschool.js';

export const oldschoolSailor = oldschoolWorkout({
  "id": "oldschool-sailor",
  "code": "HM/KB WOD 005",
  "name": "Oldschool Sailor",
  "category": "Full Body / Oldschool Strength",
  "exercises": [
    {
      "id": "floor-press",
      "name": "KB Floor Press",
      "equipment": "kettlebell"
    },
    {
      "id": "bent-over-row",
      "name": "KB Bent-Over Row",
      "equipment": "kettlebell"
    },
    {
      "id": "strict-shoulder-press",
      "name": "KB Strict Shoulder Press",
      "equipment": "kettlebell"
    },
    {
      "id": "biceps-curl",
      "name": "KB Biceps Curl",
      "equipment": "kettlebell"
    },
    {
      "id": "lying-triceps-extension",
      "name": "KB Lying Triceps Extension",
      "equipment": "kettlebell"
    },
    {
      "id": "crunch",
      "name": "KB Crunch",
      "equipment": "kettlebell"
    },
    {
      "id": "russian-twist",
      "name": "KB Russian Twist",
      "equipment": "kettlebell"
    },
    {
      "id": "plank",
      "name": "Plank",
      "equipment": "bodyweight"
    },
    {
      "id": "reverse-crunch",
      "name": "Reverse Crunch",
      "equipment": "bodyweight"
    },
    {
      "id": "dead-bug",
      "name": "KB Dead Bug",
      "equipment": "kettlebell"
    },
    {
      "id": "goblet-squat",
      "name": "KB Goblet Squat",
      "equipment": "kettlebell"
    },
    {
      "id": "conventional-deadlift",
      "name": "KB Conventional Deadlift",
      "equipment": "kettlebell"
    },
    {
      "id": "reverse-lunge",
      "name": "KB Reverse Lunge",
      "equipment": "kettlebell",
      "note": "Distribute the 45-second WORK period between both sides; switch manually within the interval."
    },
    {
      "id": "glute-bridge",
      "name": "KB Glute Bridge",
      "equipment": "kettlebell"
    },
    {
      "id": "standing-calf-raise",
      "name": "KB Standing Calf Raise",
      "equipment": "kettlebell"
    },
    {
      "id": "swing",
      "name": "KB Swing",
      "equipment": "kettlebell"
    },
    {
      "id": "burpees",
      "name": "Burpees",
      "equipment": "bodyweight"
    }
  ],
  "blocks": [
    [
      "floor-press",
      "bent-over-row",
      "strict-shoulder-press",
      "biceps-curl",
      "lying-triceps-extension"
    ],
    [
      "crunch",
      "russian-twist",
      "plank",
      "reverse-crunch",
      "dead-bug"
    ],
    [
      "goblet-squat",
      "conventional-deadlift",
      "reverse-lunge",
      "glute-bridge",
      "standing-calf-raise"
    ],
    [
      "floor-press",
      "bent-over-row",
      "goblet-squat",
      "swing",
      "burpees"
    ]
  ]
});
