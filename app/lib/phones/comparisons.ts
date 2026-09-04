export const curatedComparisons = [
  { pair: 'iphone-17-vs-galaxy-s26', a: 'iphone-17', b: 'galaxy-s26', reviewedAt: '2026-09-04' },
] as const;
export const curatedComparison = (pair: string) => curatedComparisons.find((item) => item.pair === pair);
