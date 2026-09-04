export const parseNumberUnit = (text: string, unit: string) => {
  const m = text.replace(/,/g, '').match(new RegExp(`([0-9]+(?:\\.[0-9]+)?)\\s*${unit}`, 'i'));
  return m ? Number(m[1]) : undefined;
};
export const parseResolution = (text: string) => {
  const m = text.match(/(\d{3,4})\s*(?:x|×|by)\s*(\d{3,4})/i);
  return m ? { width: Number(m[1]), height: Number(m[2]) } : undefined;
};
export const parseStorageOptions = (text: string) =>
  [...text.matchAll(/(\d+(?:\.\d+)?)\s*(GB|TB)/gi)]
    .map((m) => Math.round(Number(m[1]) * (m[2].toUpperCase() === 'TB' ? 1024 : 1)))
    .filter((v, i, a) => a.indexOf(v) === i);
export const parseRefreshRate = (text: string) => {
  const range = text.match(/(\d+)\s*[-–]\s*(\d+)\s*Hz/i);

  if (range) {
    return { min: Number(range[1]), max: Number(range[2]), adaptive: true };
  }

  const max = text.match(/(?:up to\s*)?(\d+)\s*Hz/i);

  return max ? { max: Number(max[1]), adaptive: /adaptive|up to/i.test(text) } : undefined;
};
export interface AiNormalizationProposal {
  values: Record<string, unknown>;
  confidence: number;
  evidence: string;
}
export async function normalizeSpecText(): Promise<AiNormalizationProposal> {
  throw new Error('AI normalization provider is intentionally not implemented.');
}
