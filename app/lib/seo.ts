import type { ToolDefinition } from './tools/types';
import { categories, tools } from './tools/registry';
import { platformConfig } from '~/config/platform';

export type ContentStatus = 'published' | 'draft' | 'planned';

export type ToolSeo = {
  slug: string;
  canonicalPath: string;
  category: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  searchIntent: 'task' | 'informational-task' | 'conversion' | 'business';
  title: string;
  description: string;
  h1: string;
  intro: string;
  relatedTools: string[];
  faq: ToolDefinition['faq'];
  structuredDataType: 'WebApplication';
  indexable: boolean;
  lastMeaningfulContentUpdate: string;
  contentStatus: ContentStatus;
};

const intentFor = (tool: ToolDefinition): ToolSeo['searchIntent'] => {
  if (tool.category === 'business') return 'business';
  if (tool.name.toLowerCase().includes('to ') || tool.name.toLowerCase().includes('converter')) return 'conversion';
  if (tool.category === 'calculator') return 'informational-task';
  return 'task';
};

const currentDate = '2026-09-18';

export const isIndexableTool = (tool: ToolDefinition) => tool.engine === 'browser' && !tool.requiresAuth;

export const getToolSeo = (tool: ToolDefinition): ToolSeo => ({
  slug: tool.slug,
  canonicalPath: `/${tool.slug}`,
  category: tool.category,
  primaryKeyword: tool.name.toLowerCase(),
  secondaryKeywords: tool.keywords,
  searchIntent: intentFor(tool),
  title: `${tool.name} | ${platformConfig.name}`,
  description: `${tool.description} Works locally in your browser with no account required.`,
  h1: tool.name,
  intro: tool.description,
  relatedTools: relatedToolsFor(tool).map((item) => item.slug),
  faq: tool.faq,
  structuredDataType: 'WebApplication',
  indexable: isIndexableTool(tool),
  lastMeaningfulContentUpdate: currentDate,
  contentStatus: isIndexableTool(tool) ? 'published' : 'planned',
});

export const relatedToolsFor = (tool: ToolDefinition, limit = 5) =>
  tools
    .filter((candidate) => isIndexableTool(candidate) && candidate.id !== tool.id)
    .map((candidate) => {
      const overlap = candidate.keywords.filter((keyword) => tool.keywords.includes(keyword)).length;
      const sameCategory = candidate.category === tool.category ? 10 : 0;
      return { candidate, score: sameCategory + overlap };
    })
    .sort((a, b) => b.score - a.score || a.candidate.name.localeCompare(b.candidate.name))
    .slice(0, limit)
    .map(({ candidate }) => candidate);

export const publicIndexableTools = tools.filter(isIndexableTool);
export const publicIndexableCategories = categories.filter((category) => publicIndexableTools.some((tool) => tool.category === category.id));

export const absoluteUrl = (path: string) => (platformConfig.url ? `${platformConfig.url}${path === '/' ? '' : path}` : undefined);

export const breadcrumbSchema = (items: { name: string; path?: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    ...(item.path && absoluteUrl(item.path) ? { item: absoluteUrl(item.path) } : {}),
  })),
});
