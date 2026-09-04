import { describe, expect, it } from 'vitest';
import { csvToJson, jsonToCsv } from './engine';

describe('CSV engine', () => {
  it('parses quoted commas, escaped quotes, multiline and empty fields', async () => {
    const result = await csvToJson('name,note,empty\n"Doe, Jane","said ""hello""\nagain",');
    expect(result.rows[0]).toEqual({ name: 'Doe, Jane', note: 'said "hello"\nagain', empty: '' });
  });
  it('supports custom delimiters and safe serialization', async () =>
    expect(await jsonToCsv('[{"a":"x;y","b":2}]', ';')).toContain('"x;y";2'));
  it('rejects nested JSON', async () => expect(jsonToCsv('[{"a":{"b":1}}]')).rejects.toThrow('Nested'));
});
