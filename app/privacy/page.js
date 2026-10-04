'use client';
import { useEffect, useState } from 'react';
import { sanitizeBlogHtml } from '@/lib/sanitize-html';

export default function PrivacyPolicyPage() {
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/custom-pages/privacy')
      .then(r => r.json())
      .then(d => { if (d.page) setPage(d.page); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

  const title = page?.title || 'Privacy Policy';
  const content = page?.content || '<p>Privacy policy content coming soon.</p>';

  return (
    <div className="page-container fade-in" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px 80px' }}>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '32px' }}>{title}</h1>
      <div className="policy-content" dangerouslySetInnerHTML={{ __html: sanitizeBlogHtml(content) }} />
    </div>
  );
}
