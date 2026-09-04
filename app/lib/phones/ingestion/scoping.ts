export class ModelScopeError extends Error {}

const normalizedLabel = (value: string) =>
  toPlainText(value)
    .replace(/&amp;/gi, '&')
    .replace(/&#43;|&plus;/gi, '+')
    .toLowerCase();

function samsungPanels(html: string, model: string) {
  const wanted = normalizedLabel(model);
  const controls = [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)]
    .filter((match) => {
      const label = normalizedLabel(match[2]);
      return label === wanted || label.startsWith(`${wanted} (`);
    })
    .map((match) => /aria-controls=["']([^"']+)["']/i.exec(match[1])?.[1])
    .filter((value): value is string => Boolean(value));

  const panels = [...new Set(controls)].flatMap((id) => {
    const marker = new RegExp(`<div\\b[^>]*id=["']${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`, 'i').exec(
      html,
    );

    if (!marker?.index && marker?.index !== 0) {
      return [];
    }

    const start = marker.index;
    const rest = html.slice(start + marker[0].length);
    const next = rest.search(/<div\b[^>]*class=["'][^"']*specification-tab__container/i);

    return [html.slice(start, next < 0 ? undefined : start + marker[0].length + next)];
  });

  return controls.length && panels.length
    ? {
        html: panels.join('\n'),
        evidence: `Samsung aria-controls panels: ${[...new Set(controls)].join(', ')}`,
        ambiguous: false,
      }
    : undefined;
}

export function scopeByExplicitModel(html: string, model?: string) {
  if (!model) {
    return { html, evidence: 'Single-model document scope', ambiguous: false };
  }

  if (/^Galaxy\s/i.test(model)) {
    const panels = samsungPanels(html, model);

    if (panels) {
      return panels;
    }
  }

  const escaped = model.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tagged = new RegExp(
    `<(?:section|article|div)[^>]+(?:data-(?:model|product)|id)=["'][^"']*${escaped}[^"']*["'][^>]*>([\\s\\S]*?)<\\/(?:section|article|div)>`,
    'i',
  ).exec(html);

  if (tagged) {
    return { html: tagged[0], evidence: tagged[0].slice(0, 180), ambiguous: false };
  }

  const headings = [...html.matchAll(/<(h1|h2|h3)\b[^>]*>([\s\S]*?)<\/\1>/gi)];
  const wanted = normalizedLabel(model);
  const matches = headings.filter((match) => {
    const label = normalizedLabel(match[2]);
    return (
      label === wanted || label === `${wanted} technical specifications` || label.includes(`${wanted} specs & hardware`)
    );
  });

  if (!matches.length) {
    throw new ModelScopeError(`Expected one explicit ${model} marker; found ${matches.length}.`);
  }

  if (matches.some((match) => !match.index && match.index !== 0)) {
    throw new ModelScopeError(`Explicit ${model} marker had no document position.`);
  }

  const start = matches[0].index!;

  return {
    html: html.slice(start),
    evidence: `Explicit document heading: ${normalizedLabel(matches[0][2])}`,
    ambiguous: false,
  };
}

export const toPlainText = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#xA0;/gi, ' ')
    .replace(/&#x2011;|&#x2010;|&#x2013;|&ndash;/gi, '-')
    .replace(/&#xD7;|&times;/gi, '×')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
