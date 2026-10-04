'use client';
import { memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';

function GlassmorphismCard({ href, coverUrl, title, type, status, statusKey, children }) {
  return (
    <div className="gc-card">
      {/* ── Sol: Kapak ── */}
      <Link href={href} className="gc-cover-link">
        {/* Kapak görseli */}
        <Image
          src={coverUrl}
          alt={title}
          fill
          loading="lazy"
          unoptimized
          sizes="110px"
          style={{ objectFit: 'cover', objectPosition: 'center top' }}
        />

        {/* Tür rozeti — sol üst */}
        {type && (
          <span className="gc-type-badge">{type}</span>
        )}

        {/* Alt koyu gradient */}
        <div className="gc-cover-gradient" />
      </Link>

      {/* ── Sağ: İçerik ── */}
      <div className="gc-content">
        <Link href={href} className="gc-title-link">
          <h3 className="gc-title">{title}</h3>
        </Link>
        <div className="gc-chapters">
          {children}
        </div>
      </div>
    </div>
  );
}

export default memo(GlassmorphismCard);