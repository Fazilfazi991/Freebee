import { Link } from '@remix-run/react';
import { Search, ArrowUpRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { searchTools } from '~/lib/tools/registry';
import { track } from '~/lib/analytics';
import { ToolIcon } from './Icon';

export function GlobalToolSearch({ autoFocus = false, onSelect }: { autoFocus?: boolean; onSelect?: () => void }) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchTools(query).slice(0, 6), [query]);

  return (
    <div className="tp-search-wrap">
      <Search aria-hidden="true" />
      <input
        autoFocus={autoFocus}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          track('search', { query: e.target.value });
        }}
        placeholder="Search PDF, image, QR, JSON…"
        aria-label="Search all tools"
      />
      {query && (
        <div className="tp-search-results" aria-live="polite">
          {results.length ? (
            results.map((tool) => (
              <Link key={tool.id} to={`/${tool.slug}`} onClick={onSelect}>
                <span className="tp-tool-mini">
                  <ToolIcon name={tool.icon} />
                  <span>
                    <strong>{tool.name}</strong>
                    <small>{tool.category}</small>
                  </span>
                </span>
                <ArrowUpRight size={17} />
              </Link>
            ))
          ) : (
            <p>No tools match “{query}”.</p>
          )}
        </div>
      )}
    </div>
  );
}
