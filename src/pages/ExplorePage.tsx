import { useState, useEffect, useCallback, useRef } from 'react';
import { Mixtape } from '../types';
import { searchPublicMixtapes } from '../utils/database';
import { formatDuration } from '../utils/timeUtils';
import NavBar from '../components/ui/NavBar';
import HomeFooter from '../components/home/HomeFooter';
import '../styles/LibraryPage.css';
import '../styles/SearchBar.css';

interface ExplorePageProps {
  onGoHome: () => void;
  onOpenAuth: () => void;
  onOpenLibrary: () => void;
  onOpenMixtape: (id: string) => void;
}

const PAGE_SIZE = 24;

const SkeletonTapeCard = () => (
  <div className="lib-skeleton-tape">
    <div className="lib-skeleton-header" />
    <div className="lib-skeleton-body">
      <div className="lib-skeleton-line" />
      <div className="lib-skeleton-line lib-skeleton-line--short" />
      <div className="lib-skeleton-line lib-skeleton-line--short" />
    </div>
    <div className="lib-skeleton-footer" />
  </div>
);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

const totalDuration = (m: Mixtape) =>
  [...m.sideA, ...m.sideB].reduce((s, t) => s + t.duration, 0);

const ExplorePage = ({ onGoHome, onOpenAuth, onOpenLibrary, onOpenMixtape }: ExplorePageProps) => {
  const [query, setQuery] = useState('');
  const [tapes, setTapes] = useState<Mixtape[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback((q: string) => {
    setLoading(true);
    setError(null);
    searchPublicMixtapes(q, PAGE_SIZE, 0)
      .then(results => {
        setTapes(results);
        setHasMore(results.length === PAGE_SIZE);
      })
      .catch(() => setError('Failed to load public mixtapes'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { runSearch(''); }, [runSearch]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(value), 300);
  };

  const loadMore = () => {
    setLoadingMore(true);
    searchPublicMixtapes(query, PAGE_SIZE, tapes.length)
      .then(results => {
        setTapes(prev => [...prev, ...results]);
        setHasMore(results.length === PAGE_SIZE);
      })
      .catch(() => setError('Failed to load more mixtapes'))
      .finally(() => setLoadingMore(false));
  };

  return (
    <div className="lib-page">
      <NavBar onGoHome={onGoHome} onOpenAuth={onOpenAuth} onOpenLibrary={onOpenLibrary}>
        <button className="lp-nav-link" onClick={onGoHome}>◀ Home</button>
        <span className="lp-nav-sep">/</span>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--color-text)' }}>Explore</span>
      </NavBar>

      <div className="lib-header">
        <div className="lib-header-inner">
          <div>
            <div className="lib-page-eyebrow">◆ COMMUNITY MIXTAPES</div>
            <h1 className="lib-page-title">Explore</h1>
          </div>
        </div>
      </div>

      <div className="lib-content">
        <div className="lib-section-stack">
          <section className="lib-section">
            <div className="explore-search-window">
              <form className="search-form" onSubmit={e => { e.preventDefault(); runSearch(query); }}>
                <input
                  type="text"
                  value={query}
                  onChange={e => handleQueryChange(e.target.value)}
                  placeholder="song, artist…"
                  className="search-input"
                />
                <button type="submit" disabled={loading} className="btn btn-search">
                  {loading ? '…' : '⌕'}
                </button>
              </form>
              {!loading && !error && (
                <div className="search-status-row">
                  <div className="search-status">
                    {tapes.length} result{tapes.length === 1 ? '' : 's'}
                  </div>
                </div>
              )}
            </div>

            {loading && (
              <div className="lib-cards-grid">
                {[1, 2, 3, 4, 5, 6].map(n => <SkeletonTapeCard key={n} />)}
              </div>
            )}

            {!loading && error && (
              <div className="lib-error-state">
                <span className="lib-error-icon">⚠</span>
                <span className="lib-error-msg">{error}</span>
                <button className="lp-btn lp-btn-mustard" onClick={() => runSearch(query)}>↻ Retry</button>
              </div>
            )}

            {!loading && !error && tapes.length === 0 && (
              <div className="lib-empty">
                <div className="lib-empty-icon">📼</div>
                <p>No public mixtapes found.</p>
              </div>
            )}

            {!loading && !error && tapes.length > 0 && (
              <>
                <div className="lib-cards-grid">
                  {tapes.map(tape => (
                    <div
                      key={tape.id}
                      className="lib-tape-card"
                      onClick={() => onOpenMixtape(tape.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && onOpenMixtape(tape.id)}
                    >
                      <div className="lib-tape-card-header">
                        <span className="lib-tape-card-title">{tape.title}</span>
                      </div>
                      <div className="lib-tape-card-body">
                        <div className="lib-tape-row">
                          <span className="lib-tape-label">Side A</span>
                          <span className="lib-tape-value">{tape.sideA.length} tracks</span>
                        </div>
                        <div className="lib-tape-row">
                          <span className="lib-tape-label">Side B</span>
                          <span className="lib-tape-value">{tape.sideB.length} tracks</span>
                        </div>
                        <div className="lib-tape-row">
                          <span className="lib-tape-label">Total</span>
                          <span className="lib-tape-value">{formatDuration(totalDuration(tape))}</span>
                        </div>
                      </div>
                      <div className="lib-tape-card-footer">
                        <span className="lib-tape-length">C-{tape.cassetteLength}</span>
                        <span className="lib-tape-date">{fmtDate(tape.updatedAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {hasMore && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
                    <button className="lp-btn lp-btn-mustard" onClick={loadMore} disabled={loadingMore}>
                      {loadingMore ? 'Loading…' : 'Load more'}
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
      <HomeFooter />
    </div>
  );
};

export default ExplorePage;
