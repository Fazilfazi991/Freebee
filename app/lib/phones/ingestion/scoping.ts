export class ModelScopeError extends Error {}

export function scopeByExplicitModel(html: string, model?: string) {
  if (!model) {
    return { html, evidence: 'Single-model document scope', ambiguous: false };
  }

  const escaped = model.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tagged = new RegExp(
    `<(?:section|article|div)[^>]+(?:data-(?:model|product)|id)=["'][^"']*${escaped}[^"']*["'][^>]*>([\\s\\S]*?)<\\/(?:section|article|div)>`,
    'i',
  ).exec(html);

  if (tagged) {
    return { html: tagged[0], evidence: tagged[0].slice(0, 180), ambiguous: false };
  }

  const headingSource = `<(?:h1|h2|h3)[^>]*>\\s*${escaped}\\s*<\\/(?:h1|h2|h3)>`;
  const matches = [...html.matchAll(new RegExp(headingSource, 'gi'))];

  if (matches.length !== 1) {
    throw new ModelScopeError(`Expected one explicit ${model} marker; found ${matches.length}.`);
  }

  const start = matches[0].index!;
  const contentStart = start + matches[0][0].length;
  const rest = html.slice(contentStart);
  const nextHeading = rest.search(/<(?:h1|h2|h3)[^>]*>[^<]+<\/(?:h1|h2|h3)>/i);

  return {
    html: html.slice(start, nextHeading < 0 ? undefined : contentStart + nextHeading),
    evidence: matches[0][0],
    ambiguous: false,
  };
}

export const toPlainText = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#xA0;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
