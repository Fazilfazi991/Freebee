export function parsePageRanges(input: string, pageCount: number): number[] {
  if (!input.trim()) {
    throw new Error('Enter at least one page number or range.');
  }

  const pages = new Set<number>();

  for (const part of input.split(',').map((value) => value.trim())) {
    if (!/^\d+(?:-\d+)?$/.test(part)) {
      throw new Error(`“${part}” is not a valid page or range.`);
    }

    const [start, end = start] = part.split('-').map(Number);

    if (start < 1 || end < start || end > pageCount) {
      throw new Error(`Range ${part} must be between 1 and ${pageCount}.`);
    }

    for (let page = start; page <= end; page++) {
      pages.add(page - 1);
    }
  }

  return [...pages];
}
