import { Link, NavLink } from '@remix-run/react';
import { Menu, Search, X } from 'lucide-react';
import { useState } from 'react';
import { platformConfig } from '~/config/platform';
import { GlobalToolSearch } from './ToolSearch';
import stylesUrl from '~/styles/platform.css?url';
import type { LinksFunction } from '@remix-run/cloudflare';

export const platformLinks: LinksFunction = () => [{ rel: 'stylesheet', href: stylesUrl }];

export function PlatformLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="tp-shell">
      <a className="tp-skip" href="#main">
        Skip to content
      </a>
      <header className="tp-header">
        <Link to="/" className="tp-brand" aria-label={`${platformConfig.name} home`}>
          <span className="tp-mark"><img src={platformConfig.icon} alt="" width="32" height="32" /></span>
          <span>{platformConfig.name}</span>
          {platformConfig.beta && <small className="tp-beta">Beta</small>}
        </Link>
        <nav className={`tp-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
          <NavLink to="/tools">Tools</NavLink>
          <NavLink to="/pdf">PDF</NavLink>
          <NavLink to="/image">Images</NavLink>
          <NavLink to="/calculator">Calculators</NavLink>
        </nav>
        <div className="tp-header-actions">
          <button
            className="tp-icon-button"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="Search tools"
            aria-expanded={searchOpen}
          >
            <Search size={19} />
          </button>
          <button className="tp-text-button" disabled title="Authentication is coming later">
            Sign in
          </button>
          <button
            className="tp-menu-button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label="Toggle navigation"
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
        {searchOpen && (
          <div className="tp-header-search">
            <GlobalToolSearch autoFocus onSelect={() => setSearchOpen(false)} />
          </div>
        )}
      </header>
      <main id="main">{children}</main>
      <footer className="tp-footer">
        <div>
          <Link to="/" className="tp-brand">
            <span className="tp-mark"><img src={platformConfig.icon} alt="" width="32" height="32" /></span>
            <span>{platformConfig.name}</span>
          </Link>
          <p>{platformConfig.tagline}</p>
        </div>
        <div className="tp-footer-links">
          <Link to="/tools">All tools</Link>
          <Link to="/pdf">PDF</Link>
          <Link to="/image">Images</Link>
          <Link to="/calculator">Calculators</Link>
          <Link to="/developer">Developer</Link>
          <Link to="/builder">AI Builder</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/cookies">Cookies</Link>
          <button type="button" className="tp-footer-setting" onClick={() => window.dispatchEvent(new CustomEvent('tool-platform:open-consent-settings'))}>
            Cookie settings
          </button>
          {platformConfig.feedbackUrl && <a href={platformConfig.feedbackUrl}>Send feedback</a>}
        </div>
        <p className="tp-fine">
          © {new Date().getFullYear()} {platformConfig.company}. {platformConfig.tagline}
        </p>
      </footer>
    </div>
  );
}
