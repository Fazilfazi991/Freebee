import { Link, useNavigate } from '@remix-run/react';
import { Search, ArrowUpRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { searchTools } from '~/lib/tools/registry';
import { track } from '~/lib/analytics';
import { ToolIcon } from './Icon';

export function GlobalToolSearch({ autoFocus = false, onSelect }: { autoFocus?: boolean; onSelect?: () => void }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const results = useMemo(() => searchTools(query).slice(0, 6), [query]);
  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const firstResult = results[0];
    if (firstResult) {
      track('search', { query });
      navigate(`/${firstResult.slug}`);
      onSelect?.();
    }
  };

  return (
    <form className="tp-search-wrap" onSubmit={submitSearch} role="search">
      <Search aria-hidden="true" />
      <input
        autoFocus={autoFocus}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          track('search', { query: e.target.value });
        }}
        placeholder="Search tools…"
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
    </form>
  );
}
