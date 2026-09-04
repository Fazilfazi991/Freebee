export const phoneIngestionPolicy = {
  schedulingEnabled: false,
  tiers: {
    recent: { intervalDays: 2 },
    current: { intervalDays: 7 },
    archive: { intervalDays: 30 },
  },
  maxRequestsPerRun: 10,
  perDomainDelayMs: 10_000,
  concurrency: 1,
  retryCap: 1,
  stopHttpStatuses: [403, 429] as const,
  changedRecordsRequireReview: true,
} as const;
