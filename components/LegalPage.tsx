import React, { useEffect, useState } from 'react';

type LegalTab = 'privacy' | 'terms';

// Allowlist-based conversion of fetched HTML into React elements (no raw HTML injection).
const ALLOWED_TAGS = new Set([
  'main', 'section', 'article', 'header', 'footer', 'div', 'span', 'p', 'br', 'hr',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'u',
  'small', 'a', 'blockquote', 'code', 'pre', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
]);
const VOID_TAGS = new Set(['br', 'hr']);

const isSafeHref = (href: string): boolean => {
  const trimmed = href.trim();
  if (trimmed.startsWith('#') || trimmed.startsWith('/')) return !trimmed.startsWith('//');
  try {
    const url = new URL(trimmed, window.location.origin);
    return ['http:', 'https:', 'mailto:'].includes(url.protocol);
  } catch {
    return false;
  }
};

const toReact = (node: Node, key: number): React.ReactNode => {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent;
  if (node.nodeType !== Node.ELEMENT_NODE) return null;
  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  const children = Array.from(el.childNodes).map((c, i) => toReact(c, i));
  if (!ALLOWED_TAGS.has(tag)) {
    // Drop dangerous containers entirely; unwrap other unknown tags.
    if (['script', 'style', 'iframe', 'object', 'embed', 'template', 'noscript'].includes(tag)) return null;
    return <React.Fragment key={key}>{children}</React.Fragment>;
  }
  const props: Record<string, unknown> = { key };
  const cls = el.getAttribute('class');
  if (cls) props.className = cls;
  const id = el.getAttribute('id');
  if (id) props.id = id;
  if (tag === 'a') {
    const href = el.getAttribute('href');
    if (href && isSafeHref(href)) props.href = href;
    if (el.getAttribute('target') === '_blank') {
      props.target = '_blank';
      props.rel = 'noopener noreferrer';
    }
  }
  if (VOID_TAGS.has(tag)) return React.createElement(tag, props);
  return React.createElement(tag, props, ...children);
};

const htmlToReact = (html: string): React.ReactNode => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return Array.from(doc.body.childNodes).map((c, i) => toReact(c, i));
};

interface LegalPageProps {
  initialTab?: LegalTab;
  translations: {
    legal: string;
    privacyPolicy: string;
    termsOfService: string;
  };
}

export const LegalPage: React.FC<LegalPageProps> = ({ initialTab = 'privacy', translations }) => {
  const [tab, setTab] = useState<LegalTab>(initialTab);
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const path = tab === 'privacy' ? '/privacy.html' : '/terms.html';
        const res = await fetch(path);
        const html = await res.text();
        // Extract only the <main>...</main> contents to embed inside the app
        const mainStart = html.indexOf('<main');
        const mainEnd = html.indexOf('</main>');
        if (mainStart !== -1 && mainEnd !== -1) {
          const mainHtml = html.substring(mainStart, mainEnd + '</main>'.length);
          setContent(mainHtml);
        } else {
          setContent(`<div class=\"prose max-w-none\">${html}</div>`);
        }
      } catch (e) {
        setContent('<p class="text-red-600">Failed to load document.</p>');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tab]);

  return (
    <div className="max-w-3xl mx-auto p-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{translations.legal}</h2>
      </div>

      <div className="inline-flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1 mb-4">
        <button
          onClick={() => setTab('privacy')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            tab === 'privacy' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-300'
          }`}
        >
          {translations.privacyPolicy}
        </button>
        <button
          onClick={() => setTab('terms')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            tab === 'terms' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-300'
          }`}
        >
          {translations.termsOfService}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 min-h-[50vh]">
        {loading ? (
          <div className="text-center text-gray-500">Loading…</div>
        ) : (
          <div className="prose prose-sm md:prose lg:prose-lg dark:prose-invert max-w-none">
            {htmlToReact(content)}
          </div>
        )}
      </div>
    </div>
  );
};


