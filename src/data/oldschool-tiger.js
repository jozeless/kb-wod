import { oldschoolWorkout } from './oldschool.js';

export const oldschoolTiger = oldschoolWorkout({
  "id": "oldschool-tiger",
  "code": "HM/KB WOD 006",
  "name": "Oldschool Tiger",
  "category": "Full Body / Oldschool Strength",
  "exercises": [
    {
      "id": "crush-press",
      "name": "KB Crush Press",
      "equipment": "kettlebell"
    },
    {
      "id": "staggered-stance-row",
      "name": "KB Staggered-Stance Row",
      "equipment": "kettlebell",
      "note": "Distribute the 45-second WORK period between both sides; switch manually within the interval."
    },
    {
      "id": "half-kneeling-press",
      "name": "KB Half-Kneeling Press",
      "equipment": "kettlebell",
      "note": "Distribute the 45-second WORK period between both sides; switch manually within the interval."
    },
    {
      "id": "hammer-curl",
      "name": "KB Hammer Curl",
      "equipment": "kettlebell"
    },
    {
      "id": "overhead-triceps-extension",
      "name": "KB Overhead Triceps Extension",
      "equipment": "kettlebell"
    },
    {
      "id": "weighted-sit-up",
      "name": "KB Weighted Sit-Up",
      "equipment": "kettlebell"
    },
    {
      "id": "standing-wood-chop",
      "name": "KB Standing Wood Chop",
      "equipment": "kettlebell"
    },
    {
      "id": "side-plank",
      "name": "Side Plank",
      "equipment": "bodyweight",
      "note": "Distribute the 45-second WORK period between both sides; switch manually within the interval."
    },
    {
      "id": "hollow-hold",
      "name": "Hollow Hold",
      "equipment": "bodyweight"
    },
    {
      "id": "tall-kneeling-press-out",
      "name": "KB Tall-Kneeling Press-Out",
      "equipment": "kettlebell"
    },
    {
      "id": "front-rack-squat",
      "name": "KB Front Rack Squat",
      "equipment": "kettlebell"
    },
    {
      "id": "sumo-deadlift",
      "name": "KB Sumo Deadlift",
      "equipment": "kettlebell"
    },
    {
      "id": "lateral-lunge",
      "name": "KB Lateral Lunge",
      "equipment": "kettlebell",
      "note": "Distribute the 45-second WORK period between both sides; switch manually within the interval."
    },
    {
      "id": "hip-thrust",
      "name": "KB Hip Thrust",
      "equipment": "kettlebell"
    },
    {
      "id": "seated-calf-raise",
      "name": "KB Seated Calf Raise",
      "equipment": "kettlebell"
    },
    {
      "id": "farmers-march",
      "name": "KB Farmer's March",
      "equipment": "kettlebell"
    },
    {
      "id": "mountain-climbers",
      "name": "Mountain Climbers",
      "equipment": "bodyweight"
    }
  ],
  "blocks": [
    [
      "crush-press",
      "staggered-stance-row",
      "half-kneeling-press",
      "hammer-curl",
      "overhead-triceps-extension"
    ],
    [
      "weighted-sit-up",
      "standing-wood-chop",
      "side-plank",
      "hollow-hold",
      "tall-kneeling-press-out"
    ],
    [
      "front-rack-squat",
      "sumo-deadlift",
      "lateral-lunge",
      "hip-thrust",
      "seated-calf-raise"
    ],
    [
      "crush-press",
      "staggered-stance-row",
      "front-rack-squat",
      "farmers-march",
      "mountain-climbers"
    ]
  ]
});
