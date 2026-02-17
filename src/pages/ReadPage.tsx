/**
 * Read Page - Infinite Article Reader
 * 
 * This is your main page for the infinite scroll article reader.
 * 
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { fetchArticles } from '../api/client';
import type { ArticleListItem } from '../types';
import './ReadPage.css';

export default function ReadPage() {
  const { articleId } = useParams();
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [active, setActive] = useState('');
  const [filter, setFilter] = useState('');

  const loadArticles = useCallback(async (cursor: string | null = null) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetchArticles({
        cursor,
        limit: 10,
        q: debouncedQuery || null,
        f: filter || null
      });
      setArticles(prev => cursor ? [...prev, ...response.items] : response.items);
      setNextCursor(response.nextCursor);
      setHasMore(response.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load articles');
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, filter]);


  const STORAGE_KEY = "haveUheard@boutupdog?";
  const restoreRef = useRef(false);

  // reset page using session storage
  useEffect(() => {
    const old_data = sessionStorage.getItem(STORAGE_KEY);
    if (!old_data) {
      return;
    }

    const parsed = JSON.parse(old_data);

    setSearchQuery(parsed.searchQuery ?? '');
    setArticles(parsed.articles ?? []);
    setDebouncedQuery(parsed.debouncedQuery ?? '');
    setNextCursor(parsed.nextCursor ?? null);
    setHasMore(parsed.hasMore ?? true);

    if ((parsed.articles?.length ?? 0) > 0) {
      setLoading(false);
    }

    const y = parsed.scrollY ?? 0;
    requestAnimationFrame(() => window.scrollTo(0, y));
    restoreRef.current = (parsed.articles?.length ?? 0) > 0;
  }, []);

  // update session storage for each article update
  useEffect(() => {
    const data = {
      searchQuery,
      articles,
      debouncedQuery,
      nextCursor,
      hasMore,
      scrollY: window.scrollY
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));

  }, [searchQuery, articles, debouncedQuery, nextCursor, hasMore]);

  // update scroll session storage every time the user loads
  useEffect(() => {
    const onScroll = () => {
      const old_data = sessionStorage.getItem(STORAGE_KEY);
      if (old_data) {
        const parsed = JSON.parse(old_data);
        parsed.scrollY = window.scrollY;
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      }
    }

    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);  // cleanup
  }, []);

  

  // load first batch of articles
  useEffect(() => {
    if (restoreRef.current) {
      restoreRef.current = false;
      return;
    }
    loadArticles();
  }, [loadArticles]);

  // start observing the sentinel (updates cursor every article load)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && hasMore) {
          loadArticles(nextCursor)
        }
      }, {threshold: 0.1});
      
    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }
    return () => observer.disconnect()
  }, [loadArticles, loading, nextCursor, hasMore]);

  // wait 300ms to set the debounced query
  useEffect(() => {
    const wait = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(wait);
  }, [searchQuery]
  );

  // reference for sentinel object
  const sentinelRef = useRef(null);

  return (
    <div>
      <nav className="navbar"> 
        <div className="nav-logo">The Harvard Crimson</div>
        
        <div className="nav-align-bar">
          <ul className="nav-links">
            {["Science", "Technology", "Business", "Health", 
              "Culture", "Politics", "Innovation", "Society"].map((name) => (
                <li key={name}> 
                  <button
                    type = "button"
                    className={active == name ? "nav-link-active" : "nav-link"}
                    onClick={() => {
                        if (active == name) {
                          setActive("");
                          setFilter("");
                        } else {
                          setActive(name);
                          setFilter(name);
                        }
                      }
                    }
                    >
                      {name}
                  </button>
                </li>
              ))}
            
          </ul>
        </div>
      </nav>
      <div className="read-page">
        
        <header className="read-header">
          <h1>Crimson Article Reader</h1>
          <input type="search" 
            className="search-input"
            placeholder="Search for anything"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} />
        </header>
        
        <main className="read-content">
          {loading && articles.length === 0 && (
            <div className="loading-state">Loading articles...</div>
          )}
          
          {error && (
            <div className="error-state">
              <p>Error: {error}</p>
              <button onClick={() => loadArticles()}>Retry</button>
            </div>
          )}
          
          {articles.length === 0 && !loading && !error && (
            <div className="empty-state">
              <p>No articles found.</p>
            </div>
          )}

          <div className="articles-list">
            {articles.map((article) => (
              <article key={article.id} className="article-card">
                <h2>{article.title}</h2>
                <p className="article-dek">{article.dek}</p>
                <div className="article-meta">
                  <span>By&nbsp;</span>
                  <span className="article-author">{article.author}</span>
                  <span className="article-spacer">•</span>
                  <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                  <span className="article-spacer">•</span>
                  <span className="article-reading-time">{article.readingTimeMins} min read</span>
                </div>
                <div className="article-content">{article.contentHtml.replace(/<\/?p>/g, "")}</div>
              </article>
            ))}
          </div>

          <div ref={sentinelRef}></div>

          {loading && articles.length > 0 && (
            <div className="loading-more">Loading more articles...</div>
          )}
          
          {!hasMore && articles.length > 0 && (
            <div className="end-state">You're all caught up!</div>
          )}
        </main>
      </div>
    </div>
  );
}
