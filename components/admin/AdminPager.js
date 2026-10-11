import React from 'react';

export default function AdminPager({ page, total, pageSize, onPageChange }) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, padding: '10px 0', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: 8 }}>
      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        {total} kayıttan {from}–{to} gösteriliyor
      </span>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <button
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-color)', background: page === 1 ? 'transparent' : 'var(--bg-tertiary)', color: page === 1 ? 'var(--text-muted)' : 'var(--text-primary)', cursor: page === 1 ? 'default' : 'pointer', fontSize: '0.8rem' }}
        >«</button>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: page === 1 ? 'transparent' : 'var(--bg-tertiary)', color: page === 1 ? 'var(--text-muted)' : 'var(--text-primary)', cursor: page === 1 ? 'default' : 'pointer', fontSize: '0.8rem' }}
        >‹</button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let p;
          if (totalPages <= 5) p = i + 1;
          else if (page <= 3) p = i + 1;
          else if (page >= totalPages - 2) p = totalPages - 4 + i;
          else p = page - 2 + i;
          return (
            <button key={p} onClick={() => onPageChange(p)}
              style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: page === p ? 'var(--accent)' : 'var(--bg-tertiary)', color: page === p ? '#fff' : 'var(--text-primary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: page === p ? 700 : 400 }}
            >{p}</button>
          );
        })}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: page === totalPages ? 'transparent' : 'var(--bg-tertiary)', color: page === totalPages ? 'var(--text-muted)' : 'var(--text-primary)', cursor: page === totalPages ? 'default' : 'pointer', fontSize: '0.8rem' }}
        >›</button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
          style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-color)', background: page === totalPages ? 'transparent' : 'var(--bg-tertiary)', color: page === totalPages ? 'var(--text-muted)' : 'var(--text-primary)', cursor: page === totalPages ? 'default' : 'pointer', fontSize: '0.8rem' }}
        >»</button>
      </div>
    </div>
  );
}
