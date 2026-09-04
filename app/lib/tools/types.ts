export type ToolCategory = 'pdf' | 'image' | 'video' | 'audio' | 'business' | 'developer' | 'ai' | 'web' | 'calculator';
export type EngineStatus = 'browser' | 'planned';

export type ToolDefinition = {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: ToolCategory;
  icon: string;
  keywords: string[];
  featured?: boolean;
  new?: boolean;
  requiresAuth: boolean;
  premium: boolean;
  engine: EngineStatus;
  accept?: string;
  faq: { question: string; answer: string }[];
};

export type CategoryDefinition = {
  id: ToolCategory;
  name: string;
  description: string;
  icon: string;
};
