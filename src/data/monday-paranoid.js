import { hybrid002 } from './hybrid-001-v2.js';
// New immutable identity. Reuse the approved Hybrid block/result contract,
// while keeping assignments, preferences and historical sessions independent.
export const mondayParanoid = {
  ...structuredClone(hybrid002),
  id: 'monday-paranoid', version: 1, code: 'KB Monday Paranoid', name: 'Monday Paranoid',
  suggestedDay: 'Monday',
  purpose: 'Strength, conditioning and a combo finisher, with actual results recorded between blocks.',
  presentation: { cardStyle: 'hm-kb', subtitle: 'Strength · Sweat · Chaos' },
};
