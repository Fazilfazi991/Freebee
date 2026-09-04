import { Link } from '@remix-run/react';
import { ArrowUpRight } from 'lucide-react';
import type { ToolDefinition } from '~/lib/tools/types';
import { ToolIcon } from './Icon';

export function ToolCard({ tool }: { tool: ToolDefinition }) {
  return (
    <Link className="tp-tool-card" to={`/${tool.slug}`}>
      <span className="tp-card-icon">
        <ToolIcon name={tool.icon} />
      </span>
      <span className="tp-card-copy">
        <span className="tp-card-title">
          <strong>{tool.name}</strong>
          {tool.new && <em>New</em>}
          {tool.premium && <em className="muted">Premium</em>}
        </span>
        <span>{tool.description}</span>
      </span>
      <ArrowUpRight className="tp-card-arrow" size={18} />
    </Link>
  );
}
