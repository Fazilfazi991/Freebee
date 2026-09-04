import type { CategoryDefinition, ToolCategory, ToolDefinition } from './types';

export const categories: CategoryDefinition[] = [
  { id: 'pdf', name: 'PDF', description: 'Organize, convert, and prepare documents.', icon: 'FileText' },
  { id: 'image', name: 'Images', description: 'Resize, convert, extract, and enhance images.', icon: 'Image' },
  { id: 'video', name: 'Video', description: 'Convert and optimize video for any destination.', icon: 'Clapperboard' },
  { id: 'audio', name: 'Audio', description: 'Convert, trim, and prepare sound files.', icon: 'AudioLines' },
  {
    id: 'business',
    name: 'Business',
    description: 'Create practical assets for daily work.',
    icon: 'BriefcaseBusiness',
  },
  { id: 'developer', name: 'Developer', description: 'Inspect, format, and generate developer data.', icon: 'Braces' },
  { id: 'ai', name: 'AI', description: 'Focused assistants for creative and knowledge work.', icon: 'Sparkles' },
  {
    id: 'web',
    name: 'Web / Development',
    description: 'Build, test, and ship better web experiences.',
    icon: 'CodeXml',
  },
];

const commonFaq = (name: string, browser = false) => [
  {
    question: `How does ${name} work?`,
    answer: browser
      ? 'This tool runs in your browser. Follow the workspace prompts to complete the task.'
      : 'The interface is ready, but the processing engine is not connected yet. No output is fabricated.',
  },
  {
    question: 'Do I need an account?',
    answer: 'No account is required for the basic browser tools currently available.',
  },
  {
    question: 'What happens to my files?',
    answer: browser
      ? 'Files used by this tool stay in your browser for the current session.'
      : 'Files are not uploaded or processed while this preview engine is unavailable.',
  },
];

export const tools: ToolDefinition[] = [
  {
    id: 'compress-pdf',
    name: 'Compress PDF',
    slug: 'compress-pdf',
    description: 'Reduce PDF file size with clear quality controls.',
    category: 'pdf',
    icon: 'FileArchive',
    keywords: ['pdf', 'compress', 'reduce', 'size'],
    featured: true,
    requiresAuth: false,
    premium: false,
    engine: 'planned',
    accept: '.pdf,application/pdf',
    faq: commonFaq('Compress PDF'),
  },
  {
    id: 'merge-pdf',
    name: 'Merge PDF',
    slug: 'merge-pdf',
    description: 'Arrange and combine PDF files into one document.',
    category: 'pdf',
    icon: 'Files',
    keywords: ['pdf', 'merge', 'combine', 'join'],
    featured: true,
    requiresAuth: false,
    premium: false,
    engine: 'planned',
    accept: '.pdf,application/pdf',
    faq: commonFaq('Merge PDF'),
  },
  {
    id: 'jpg-to-pdf',
    name: 'JPG to PDF',
    slug: 'jpg-to-pdf',
    description: 'Turn JPG images into an ordered PDF document.',
    category: 'pdf',
    icon: 'FileImage',
    keywords: ['jpg', 'jpeg', 'image', 'pdf', 'convert'],
    featured: true,
    requiresAuth: false,
    premium: false,
    engine: 'planned',
    accept: 'image/jpeg',
    faq: commonFaq('JPG to PDF'),
  },
  {
    id: 'compress-image',
    name: 'Compress Image',
    slug: 'compress-image',
    description: 'Make images lighter for sharing and the web.',
    category: 'image',
    icon: 'Minimize2',
    keywords: ['image', 'jpg', 'png', 'compress', 'optimize'],
    featured: true,
    requiresAuth: false,
    premium: false,
    engine: 'planned',
    accept: 'image/*',
    faq: commonFaq('Compress Image'),
  },
  {
    id: 'image-to-text',
    name: 'Image to Text',
    slug: 'image-to-text',
    description: 'Extract readable text from screenshots and photos.',
    category: 'image',
    icon: 'ScanText',
    keywords: ['image', 'ocr', 'text', 'extract'],
    featured: true,
    new: true,
    requiresAuth: false,
    premium: false,
    engine: 'planned',
    accept: 'image/*',
    faq: commonFaq('Image to Text'),
  },
  {
    id: 'mp4-to-mp3',
    name: 'MP4 to MP3',
    slug: 'mp4-to-mp3',
    description: 'Extract an audio track from an MP4 video.',
    category: 'video',
    icon: 'FileAudio',
    keywords: ['mp4', 'mp3', 'video', 'audio', 'convert'],
    featured: true,
    requiresAuth: false,
    premium: false,
    engine: 'planned',
    accept: 'video/mp4',
    faq: commonFaq('MP4 to MP3'),
  },
  {
    id: 'qr-generator',
    name: 'QR Generator',
    slug: 'qr-generator',
    description: 'Create a downloadable QR code for a link or text.',
    category: 'business',
    icon: 'QrCode',
    keywords: ['qr', 'code', 'link', 'generator'],
    featured: true,
    requiresAuth: false,
    premium: false,
    engine: 'browser',
    faq: commonFaq('QR Generator', true),
  },
  {
    id: 'json-formatter',
    name: 'JSON Formatter',
    slug: 'json-formatter',
    description: 'Format, validate, and minify JSON in your browser.',
    category: 'developer',
    icon: 'Braces',
    keywords: ['json', 'format', 'validate', 'minify', 'developer'],
    featured: true,
    requiresAuth: false,
    premium: false,
    engine: 'browser',
    faq: commonFaq('JSON Formatter', true),
  },
  {
    id: 'remove-background',
    name: 'Remove Background',
    slug: 'remove-background',
    description: 'Prepare clean cut-outs from product and portrait images.',
    category: 'image',
    icon: 'Layers',
    keywords: ['image', 'background', 'remove', 'transparent'],
    featured: true,
    requiresAuth: false,
    premium: true,
    engine: 'planned',
    accept: 'image/*',
    faq: commonFaq('Remove Background'),
  },
  {
    id: 'ai-image-generator',
    name: 'AI Image Generator',
    slug: 'ai-image-generator',
    description: 'Create original visuals from a written brief.',
    category: 'ai',
    icon: 'WandSparkles',
    keywords: ['ai', 'image', 'generate', 'creative'],
    featured: true,
    requiresAuth: true,
    premium: true,
    engine: 'planned',
    faq: commonFaq('AI Image Generator'),
  },
  {
    id: 'uuid-generator',
    name: 'UUID Generator',
    slug: 'uuid-generator',
    description: 'Generate unique identifiers for apps and test data.',
    category: 'developer',
    icon: 'Fingerprint',
    keywords: ['uuid', 'guid', 'developer', 'generate'],
    requiresAuth: false,
    premium: false,
    engine: 'planned',
    faq: commonFaq('UUID Generator'),
  },
];

export const toolBySlug = (slug: string) => tools.find((tool) => tool.slug === slug);
export const categoryBySlug = (slug: string) => categories.find((category) => category.id === slug);
export const toolsForCategory = (category: ToolCategory) => tools.filter((tool) => tool.category === category);
export const searchTools = (query: string) => {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return tools;
  }

  return tools.filter((tool) =>
    [tool.name, tool.description, tool.category, ...tool.keywords].join(' ').toLowerCase().includes(normalized),
  );
};
