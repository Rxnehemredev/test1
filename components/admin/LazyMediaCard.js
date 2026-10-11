import React, { useState, useEffect, useRef } from 'react';
import { safeHref } from '@/lib/security/safeUrl';
import { DownloadIcon, TrashIcon } from '@/components/admin/AdminIcons';

export default function LazyMediaCard({ m, onPreview, onDelete, selectionMode, selected, onToggleSelect }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { rootMargin: '120px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const isUserImage = m.category === 'user_images';

  return (
    <div ref={ref} className="admin-card" style={{ padding: 0, overflow: 'hidden', position: 'relative', outline: selected ? '2px solid var(--accent)' : 'none', outlineOffset: '-2px' }}>
      {selectionMode && (
        <div
          style={{ position: 'absolute', top: 6, left: 6, zIndex: 10, cursor: 'pointer' }}
          onClick={e => { e.stopPropagation(); onToggleSelect(m.path); }}
        >
          <div style={{
            width: 20, height: 20, borderRadius: 4,
            background: selected ? 'var(--accent)' : 'rgba(0,0,0,0.6)',
            border: '2px solid #fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.75rem', color: '#fff', fontWeight: 700
          }}>
            {selected ? '✓' : ''}
          </div>
        </div>
      )}
      <div
        style={{
          width: '100%', height: 130, background: 'var(--bg-tertiary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', overflow: 'hidden', position: 'relative'
        }}
        onClick={onPreview}
      >
        {visible ? (
          <img
            src={m.path}
            alt={m.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            decoding="async"
            loading="lazy"
            onError={e => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement.innerHTML = '<span style="font-size:0.75rem;color:var(--text-muted);padding:8px;text-align:center;">Görsel yüklenemedi</span>';
            }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>...</span>
          </div>
        )}
        {isUserImage && (
          <span style={{
            position: 'absolute', top: 6, right: 6,
            background: 'rgba(0,0,0,0.7)', color: '#fbbf24',
            fontSize: '0.65rem', padding: '2px 6px', borderRadius: 4,
            fontWeight: 600
          }}>
            Kullanıcı
          </span>
        )}
      </div>
      <div style={{ padding: '8px 10px' }}>
        <p style={{
          fontSize: '0.75rem', fontWeight: 600, margin: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          color: 'var(--text-primary)'
        }} title={m.name}>
          {m.name}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            {(m.size / 1024).toFixed(1)} KB
          </span>
          <span style={{
            fontSize: '0.65rem', padding: '1px 5px', borderRadius: 4,
            background: m.imageType === 'avatar' ? 'rgba(99,102,241,0.15)' : m.imageType === 'cover' ? 'rgba(16,185,129,0.12)' : m.imageType === 'orphan' ? 'rgba(245,158,11,0.15)' : 'rgba(155,44,44,0.1)',
            color: m.imageType === 'avatar' ? '#818cf8' : m.imageType === 'cover' ? '#34d399' : m.imageType === 'orphan' ? '#fbbf24' : 'var(--accent-light)'
          }}>
            {m.imageType === 'avatar' ? 'Avatar' : m.imageType === 'cover' ? 'Kapak' : m.imageType === 'orphan' ? 'Sahipsiz' : m.category}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
          <a
            href={safeHref(m.path)}
            download={m.name}
            className="btn btn-sm"
            style={{ flex: 1, fontSize: '0.7rem', padding: '4px 8px', textAlign: 'center', textDecoration: 'none', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
            onClick={e => e.stopPropagation()}
          >
            <DownloadIcon /> İndir
          </a>
          <button className="btn btn-danger btn-sm" style={{ flex: 1, fontSize: '0.7rem', padding: '4px 8px' }} onClick={onDelete}>
            <TrashIcon /> Sil
          </button>
        </div>
      </div>
    </div>
  );
}
