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

export type PriorityPageContent = {
  howToUse: string[];
  method: string;
  example: string;
  limitations: string[];
};

const priorityFaq: Record<string, ToolDefinition['faq']> = {
  'merge-pdf': [
    { question: 'How do I merge PDF files?', answer: 'Select the PDFs in the order you want them combined, review the selection, and run the merge when the tool provides the output action.' },
    { question: 'Is there a file upload?', answer: 'This tool is designed for browser-side processing. Your privacy note explains the processing boundary before you begin.' },
    { question: 'What order will the pages use?', answer: 'The output follows the file order shown in the workspace, so arrange the files before creating the merged document.' },
  ],
  'jpg-to-pdf': [
    { question: 'How do I convert JPG images to PDF?', answer: 'Choose one or more JPG images, check their order, and create a PDF when the conversion action is available.' },
    { question: 'Can I convert more than one image?', answer: 'Yes. Multiple images can be selected and combined into a single PDF in the selected order.' },
    { question: 'Will image quality change?', answer: 'The final PDF depends on the source dimensions and encoding. Review the output for print quality when exact resolution matters.' },
  ],
  'invoice-generator': [
    { question: 'What should an invoice include?', answer: 'Include the seller and customer details, invoice number, issue date, line items, taxes or discounts, payment terms, and the total due.' },
    { question: 'Is this an accounting system?', answer: 'No. Use the generated document as a starting point and confirm tax, numbering, and retention requirements for your jurisdiction.' },
    { question: 'Can I customize the invoice?', answer: 'Enter your business, customer, line-item, and payment details, then review the document before sharing it.' },
  ],
  'quotation-generator': [
    { question: 'What is a quotation used for?', answer: 'A quotation sets out proposed goods or services, pricing, assumptions, and validity before a customer accepts the work.' },
    { question: 'Does a quotation create an invoice?', answer: 'No. A quotation is a proposal; an invoice requests payment for goods or services that have been supplied or agreed.' },
    { question: 'What should I check before sending it?', answer: 'Check scope, quantities, taxes, expiry date, payment terms, customer details, and any exclusions or assumptions.' },
  ],
};

export const priorityPageContent: Partial<Record<string, PriorityPageContent>> = {
  'discount-calculator': {
    howToUse: ['Enter the original price.', 'Enter the discount percentage.', 'Review the discount amount and final price.'],
    method: 'The discount amount is original price × discount rate. The final price is original price − discount amount.',
    example: 'For a $100 item at 20% off, the discount is $20 and the final price is $80 before any tax or shipping.',
    limitations: ['Taxes, shipping, and stacked promotions are not included unless you add them separately.', 'Confirm the merchant’s rounding rules for exact checkout totals.'],
  },
  'concrete-calculator': {
    howToUse: ['Measure the slab length and width.', 'Enter the thickness using the same unit system.', 'Review the volume and add a practical waste allowance.'],
    method: 'Slab volume is length × width × thickness. The result is converted to the selected volume unit so it can be compared with supplier quantities.',
    example: 'A 10 ft × 12 ft slab that is 4 in thick is 40 cubic feet before waste; add a modest allowance for uneven ground and spillage.',
    limitations: ['This is an estimate, not a structural specification or ordering guarantee.', 'Footings, reinforcement, sub-base, slopes, and local mix requirements need separate assessment.'],
  },
  'merge-pdf': {
    howToUse: ['Choose the PDF files.', 'Arrange them in the required order.', 'Review the selection and create the merged document.'],
    method: 'The tool combines the selected PDF page streams in sequence while keeping the input order visible to you before processing.',
    example: 'Select a cover, report, and appendix to produce one document in that order instead of sending three attachments.',
    limitations: ['Encrypted or damaged PDFs may not combine successfully.', 'Always review page order, orientation, and bookmarks in the final document.'],
  },
  'jpg-to-pdf': {
    howToUse: ['Select one or more JPG images.', 'Arrange the images in reading order.', 'Create and review the PDF output.'],
    method: 'Each selected image becomes a PDF page, with the image order determining the page order.',
    example: 'A three-page scanned receipt can be converted from three JPG files into one PDF for sharing or archiving.',
    limitations: ['Large images can produce large PDFs.', 'The output cannot restore detail that was absent from the source image.'],
  },
  'invoice-generator': {
    howToUse: ['Add your business and customer details.', 'Enter line items, quantities, prices, taxes, and payment terms.', 'Review the totals and document details before sharing.'],
    method: 'The document totals each line item, applies the entered adjustments, and presents the amount due with the details you supplied.',
    example: 'For two services at $250 each with a 10% discount, the subtotal is $500, the discount is $50, and the pre-tax total is $450.',
    limitations: ['Tax treatment, invoice numbering, and retention rules vary by jurisdiction.', 'This tool does not replace accounting, tax, or legal advice.'],
  },
  'quotation-generator': {
    howToUse: ['Describe the proposed work or products.', 'Add quantities, prices, terms, validity, and assumptions.', 'Check the scope and total before sending the quotation.'],
    method: 'The document presents proposed line items and terms as a customer-facing estimate; it does not record payment or delivery.',
    example: 'A web project quotation can separate discovery, design, and implementation so the customer can review scope and pricing before acceptance.',
    limitations: ['A quotation is not automatically a contract or invoice.', 'Confirm local tax, consumer-protection, and acceptance requirements.'],
  },
  'pdf-to-jpg': {
    howToUse: ['Choose the PDF.', 'Select the pages or output settings available.', 'Review the generated JPG images for legibility.'],
    method: 'Each selected PDF page is rasterized into an image at the chosen output resolution.',
    example: 'Convert a single page from a PDF into a JPG when a platform accepts images but not document uploads.',
    limitations: ['Text becomes pixels and is no longer directly selectable.', 'Higher resolution increases output dimensions and file size.'],
  },
};

export const getPriorityPageContent = (slug: string) => priorityPageContent[slug];

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
  faq: priorityFaq[tool.slug] ?? tool.faq,
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
