import { describe, expect, it, vi } from 'vitest';
import { D1PhoneDataStore } from './d1-store';
import { phoneRepository } from './repository';
import type { IngestionCandidate } from './ingestion/records';

class StatementMock {
  values: unknown[] = [];
  constructor(readonly sql: string) {}
  bind(...values: unknown[]) {
    this.values = values;
    return this;
  }
  run = vi.fn(async () => ({ success: true }));
  first = vi.fn(async () => null);
  all = vi.fn(async () => ({ results: [] }));
}

class DatabaseMock {
  statements: StatementMock[] = [];
  prepare = vi.fn((sql: string) => {
    const statement = new StatementMock(sql);
    this.statements.push(statement);

    return statement;
  });
  batch = vi.fn(async (_statements: unknown[]) => []);
}

const candidate = (): IngestionCandidate => {
  const phone = { ...phoneRepository.getPhone('apple', 'iphone-17')!, publicationState: 'needs-review' as const };
  return {
    phone,
    source: {
      id: 'source-1',
      phoneId: phone.id,
      manufacturer: 'Apple',
      officialUrl: phone.source.officialUrl,
      region: 'AE',
      sourceHash: 'hash',
      retrievedAt: '2026-09-04T00:00:00.000Z',
      lastChangedAt: '2026-09-04T00:00:00.000Z',
      contentType: 'text/html',
    },
    provenance: [
      {
        phoneId: phone.id,
        fieldPath: 'display.sizeInches',
        sourceId: 'source-1',
        sourceSection: 'Display',
        sourceText: '6.3-inch',
        verifiedAt: '2026-09-04T00:00:00.000Z',
        parserVersion: phone.parserVersion,
      },
    ],
    run: {
      id: 'run-1',
      brand: 'apple',
      model: 'iphone-17',
      startedAt: '2026-09-04T00:00:00.000Z',
      completedAt: '2026-09-04T00:01:00.000Z',
      status: 'awaiting-review',
      httpStatus: 200,
      parserVersion: phone.parserVersion,
      validationIssues: [],
    },
    changes: [
      {
        runId: 'run-1',
        phoneId: phone.id,
        fieldPath: 'display.sizeInches',
        previousValue: 6.1,
        newValue: 6.3,
        sourceId: 'source-1',
        reviewStatus: 'pending',
      },
    ],
  };
};

describe('D1PhoneDataStore', () => {
  it('writes one reviewed ingestion unit with parameterized statements', async () => {
    const database = new DatabaseMock();
    const store = new D1PhoneDataStore(database as unknown as D1Database);
    await store.writeIngestion(candidate());

    expect(database.batch).toHaveBeenCalledOnce();

    const batch = database.batch.mock.calls[0][0] as unknown as StatementMock[];
    expect(batch.map((statement) => statement.sql.trim().split(/\s+/).slice(0, 3).join(' '))).toEqual([
      'INSERT INTO phone_sources',
      'INSERT INTO phones',
      'INSERT INTO field_provenance',
      'INSERT INTO ingestion_changes',
      'UPDATE ingestion_runs SET',
    ]);
    expect(database.statements.every((statement) => !statement.sql.includes('iphone-17'))).toBe(true);
    expect(batch[1].values).toContain('needs-review');
  });

  it('records a failed run when the atomic batch rejects', async () => {
    const database = new DatabaseMock();
    database.batch.mockRejectedValueOnce(new Error('batch failed'));

    const store = new D1PhoneDataStore(database as unknown as D1Database);
    await expect(store.writeIngestion(candidate())).rejects.toThrow('batch failed');

    const failed = database.statements.find((statement) => statement.sql.includes("status = 'failed'"));
    expect(failed?.run).toHaveBeenCalledOnce();
  });
});
