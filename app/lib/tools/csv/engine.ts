export async function csvToJson(input: string, header = true, delimiter = '') {
  const { default: papa } = await import('papaparse');
  const result = papa.parse(input, { header, delimiter, skipEmptyLines: true });

  return {
    rows: result.data,
    delimiter: result.meta.delimiter,
    warnings: result.errors.map((error) => `Row ${error.row ?? '?'}: ${error.message}`),
  };
}

export async function jsonToCsv(input: string, delimiter = ',') {
  const value: unknown = JSON.parse(input);

  if (!Array.isArray(value) || value.some((row) => !row || typeof row !== 'object' || Array.isArray(row))) {
    throw new Error('Enter a JSON array of objects.');
  }

  for (const row of value as Record<string, unknown>[]) {
    if (Object.values(row).some((field) => field !== null && typeof field === 'object')) {
      throw new Error('Nested objects and arrays are not supported.');
    }
  }

  const { default: papa } = await import('papaparse');

  return papa.unparse(value as Record<string, unknown>[], { delimiter, escapeFormulae: true });
}
