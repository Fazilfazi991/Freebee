import { useMemo, useState } from 'react';
import type { CategoryDefinition } from '~/lib/tools/types';
import { toolsForCategory } from '~/lib/tools/registry';
import { ToolCard } from './ToolCard';
import { Search } from 'lucide-react';

export function CategoryPage({ category }: { category: CategoryDefinition }) {
  const [query, setQuery] = useState('');
  const categoryTools = toolsForCategory(category.id);
  const visible = useMemo(
    () =>
      categoryTools.filter((tool) =>
        `${tool.name} ${tool.description} ${tool.keywords.join(' ')}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [categoryTools, query],
  );
  const calculatorGroups = [
    ['Date & time', ['age-calculator', 'date-calculator', 'date-difference-calculator', 'time-calculator']],
    [
      'Health & fitness',
      [
        'bmi-calculator',
        'calorie-calculator',
        'pace-calculator',
        'body-fat-calculator',
        'ideal-weight-calculator',
        'water-intake-calculator',
        'due-date-calculator',
        'pregnancy-calculator',
      ],
    ],
    ['Math', ['percentage-calculator', 'fraction-calculator', 'average-calculator']],
    ['Construction', ['square-footage-calculator', 'concrete-calculator', 'paint-calculator']],
    [
      'Finance',
      [
        'simple-interest-calculator',
        'compound-interest-calculator',
        'loan-calculator',
        'emi-calculator',
        'mortgage-calculator',
        'investment-calculator',
        'car-loan-calculator',
        'amortization-calculator',
        'discount-calculator',
        'profit-margin-calculator',
        'markup-calculator',
        'savings-calculator',
        'savings-goal-calculator',
        'retirement-calculator',
        'debt-payoff-calculator',
        'credit-card-payoff-calculator',
        'fuel-cost-calculator',
      ],
    ],
  ] as const;

  return (
    <div className="tp-page">
      <section className="tp-category-head">
        <p>
          <a href="/tools">All tools</a> / {category.name}
        </p>
        <h1>{category.name} tools, kept simple.</h1>
        <span>{category.description} Choose a focused utility and get straight to work.</span>
      </section>
      <section className="tp-catalog">
        <label className="tp-filter">
          <Search size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${category.name.toLowerCase()} tools`}
          />
        </label>
        {category.id === 'calculator' && !query ? (
          calculatorGroups.map(([name, ids]) => (
            <section className="tp-catalog-group" key={name}>
              <h2>{name}</h2>
              <div className="tp-tool-grid">
                {visible
                  .filter((tool) => ids.includes(tool.id as never))
                  .map((tool) => (
                    <ToolCard key={tool.id} tool={tool} />
                  ))}
              </div>
            </section>
          ))
        ) : (
          <div className="tp-tool-grid">
            {visible.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        )}
        {!visible.length && (
          <div className="tp-empty">
            <h2>No matching tools</h2>
            <p>Try a shorter or more general search.</p>
          </div>
        )}
      </section>
    </div>
  );
}
