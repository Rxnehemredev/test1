export default function MaintenancePage({ message, siteName, contactEmail, discordUrl, logoUrl, design }) {
  const displayMessage = message || "Deneyiminizi iyileştirmek için şu anda planlı bakım çalışması yapıyoruz. Bu işlem uzun sürmeyecektir — lütfen kısa süre sonra tekrar kontrol edin.";
  const displaySiteName = siteName || 'Site';
  const displayEmail = contactEmail || null;
  const displayDiscord = discordUrl || null;
  const isGlass = design === 'glassmorphism';

  if (isGlass) {
    return (
      <html lang="tr" suppressHydrationWarning>
        <head>
          <meta charSet="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Bakım Modu — {displaySiteName}</title>
          <style>{`
            *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
              overflow: hidden;
              background: linear-gradient(135deg, #0d0d1a 0%, #1a0a2e 35%, #0a1628 70%, #0d1f3c 100%);
              position: relative;
            }
            body::before {
              content: '';
              position: fixed;
              inset: 0;
              background: linear-gradient(225deg, rgba(99,102,241,0.15) 0%, rgba(168,85,247,0.10) 25%, rgba(59,130,246,0.12) 50%, rgba(16,185,129,0.08) 75%, rgba(99,102,241,0.15) 100%);
              background-size: 400% 400%;
              animation: gradientShift 12s ease infinite;
              z-index: 0;
            }
            .orb { position: fixed; border-radius: 50%; filter: blur(60px); opacity: 0.5; z-index: 0; pointer-events: none; }
            .orb-1 { width: 400px; height: 400px; background: radial-gradient(circle, rgba(99,102,241,0.6), transparent 70%); top: -100px; left: -100px; animation: floatOrb1 18s ease-in-out infinite; }
            .orb-2 { width: 300px; height: 300px; background: radial-gradient(circle, rgba(168,85,247,0.5), transparent 70%); bottom: -80px; right: -80px; animation: floatOrb2 22s ease-in-out infinite; }
            .orb-3 { width: 250px; height: 250px; background: radial-gradient(circle, rgba(59,130,246,0.4), transparent 70%); top: 50%; left: 70%; animation: floatOrb3 16s ease-in-out infinite; }
            .orb-4 { width: 180px; height: 180px; background: radial-gradient(circle, rgba(16,185,129,0.35), transparent 70%); top: 20%; right: 15%; animation: floatOrb4 20s ease-in-out infinite; }
            .orb-5 { width: 220px; height: 220px; background: radial-gradient(circle, rgba(245,158,11,0.25), transparent 70%); bottom: 25%; left: 10%; animation: floatOrb5 24s ease-in-out infinite; }
            .glass-card {
              position: relative; z-index: 10;
              background: rgba(255,255,255,0.06);
              backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
              border: 1px solid rgba(255,255,255,0.12);
              border-radius: 24px; padding: 52px 44px;
              max-width: 520px; width: 100%; text-align: center;
              box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 1px 0 rgba(255,255,255,0.15) inset;
              animation: cardAppear 0.8s cubic-bezier(0.16,1,0.3,1) forwards;
            }
            .logo-wrap { margin-bottom: 16px; display: flex; align-items: center; justify-content: center; }
            .logo-img { max-height: 56px; max-width: 200px; object-fit: contain; filter: drop-shadow(0 0 12px rgba(165,180,252,0.4)); }
            .logo-icon { font-size: 3rem; filter: drop-shadow(0 0 16px rgba(165,180,252,0.5)); }
            .brand { font-size: 1.5rem; font-weight: 700; color: #e0e7ff; margin-bottom: 28px; letter-spacing: -0.01em; text-shadow: 0 0 20px rgba(165,180,252,0.4); }
            .badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(99,102,241,0.18); backdrop-filter: blur(8px); border: 1px solid rgba(165,180,252,0.25); border-radius: 50px; padding: 7px 18px; font-size: 0.8rem; color: #c7d2fe; margin-bottom: 28px; box-shadow: 0 2px 8px rgba(99,102,241,0.2); }
            .dot { width: 8px; height: 8px; background: #f59e0b; border-radius: 50%; animation: pulse 1.5s ease-in-out infinite; box-shadow: 0 0 8px rgba(245,158,11,0.6); }
            .icon-wrapper { width: 80px; height: 80px; margin: 0 auto 24px; background: rgba(99,102,241,0.15); backdrop-filter: blur(8px); border: 1px solid rgba(165,180,252,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; animation: iconPulse 2s ease-in-out infinite; box-shadow: 0 0 24px rgba(99,102,241,0.25), 0 0 0 1px rgba(255,255,255,0.05) inset; }
            .icon-wrapper svg { color: #a5b4fc; filter: drop-shadow(0 0 6px rgba(165,180,252,0.5)); }
            h1 { font-size: 1.7rem; font-weight: 700; color: #f0f4ff; margin-bottom: 14px; letter-spacing: -0.02em; text-shadow: 0 2px 12px rgba(0,0,0,0.3); }
            p { color: rgba(203,213,225,0.85); font-size: 0.95rem; line-height: 1.75; margin-bottom: 28px; }
            .divider { height: 1px; background: linear-gradient(to right, transparent, rgba(165,180,252,0.2), transparent); margin: 24px 0; }
            .contact { font-size: 0.82rem; color: rgba(148,163,184,0.8); line-height: 1.8; }
            .contact a { color: #a5b4fc; text-decoration: none; }
            .contact-links { display: flex; flex-direction: column; gap: 12px; align-items: center; }
            .discord-btn { display: inline-flex; align-items: center; gap: 9px; background: rgba(88,101,242,0.4); backdrop-filter: blur(8px); border: 1px solid rgba(88,101,242,0.5); color: #fff; border-radius: 12px; padding: 10px 22px; font-size: 0.875rem; font-weight: 600; text-decoration: none; transition: background 0.2s, transform 0.15s; box-shadow: 0 4px 16px rgba(88,101,242,0.3); }
            .login-link { display: inline-flex; align-items: center; gap: 6px; color: rgba(100,116,139,0.8); font-size: 0.78rem; margin-top: 20px; text-decoration: none; transition: color 0.2s; padding: 6px 12px; border-radius: 8px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); }
            .login-link:hover { color: #a5b4fc; }
            @keyframes gradientShift { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
            @keyframes floatOrb1 { 0%, 100% { transform: translate(0,0) scale(1); } 33% { transform: translate(60px,40px) scale(1.1); } 66% { transform: translate(-30px,80px) scale(0.9); } }
            @keyframes floatOrb2 { 0%, 100% { transform: translate(0,0) scale(1); } 40% { transform: translate(-70px,-50px) scale(1.15); } 70% { transform: translate(40px,-90px) scale(0.85); } }
            @keyframes floatOrb3 { 0%, 100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-80px,60px) scale(1.2); } }
            @keyframes floatOrb4 { 0%, 100% { transform: translate(0,0); } 30% { transform: translate(-40px,30px); } 60% { transform: translate(20px,-40px); } }
            @keyframes floatOrb5 { 0%, 100% { transform: translate(0,0) scale(1); } 45% { transform: translate(50px,-60px) scale(1.1); } }
            @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.85); } }
            @keyframes iconPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }
            @keyframes cardAppear { from { opacity: 0; transform: translateY(20px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
          `}</style>
        </head>
        <body>
          <div className="orb orb-1" />
          <div className="orb orb-2" />
          <div className="orb orb-3" />
          <div className="orb orb-4" />
          <div className="orb orb-5" />
          <div className="glass-card">
            <div className="logo-wrap">
              {logoUrl ? (
                <img src={logoUrl} alt={displaySiteName} className="logo-img" decoding="async" />
              ) : (
                <span className="logo-icon">読</span>
              )}
            </div>
            {!logoUrl && <div className="brand">{displaySiteName}</div>}
            <div className="badge"><span className="dot" />Bakım Çalışması</div>
            <div className="icon-wrapper">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>
            </div>
            <h1>Yakında döneceğiz</h1>
            <p>{displayMessage}</p>
            <div className="divider" />
            <div className="contact">
              <div className="contact-links">
                {displayDiscord && (
                  <a href={displayDiscord} target="_blank" rel="noopener noreferrer" className="discord-btn">
                    <svg width="18" height="14" viewBox="0 0 71 55" fill="currentColor"><path d="M60.1 4.9A58.5 58.5 0 0 0 45.5.7a40.8 40.8 0 0 0-1.8 3.7 54.1 54.1 0 0 0-16.3 0A39.4 39.4 0 0 0 25.6.7 58.4 58.4 0 0 0 11 4.9C1.6 19 -1 32.7.3 46.3a59 59 0 0 0 18 9.1 44.5 44.5 0 0 0 3.8-6.3 38.3 38.3 0 0 1-6-2.9l1.4-1.1a42 42 0 0 0 36.1 0l1.5 1.1a38.4 38.4 0 0 1-6 2.9 44.4 44.4 0 0 0 3.8 6.3 58.8 58.8 0 0 0 18-9.1c1.5-15.8-2.5-29.3-10.8-41.3zM23.7 38c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.5 0 6.5 3.2 6.4 7.2 0 4-2.9 7.2-6.4 7.2zm23.6 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.5 0 6.4 3.2 6.4 7.2 0 4-2.9 7.2-6.4 7.2z"/></svg>
                    Discord Sunucumuza Katılın
                  </a>
                )}
                {displayEmail && <span>Sorularınız için: <a href={`mailto:${displayEmail}`}>{displayEmail}</a></span>}
                {!displayDiscord && !displayEmail && <span>Yakında tekrar kontrol edin.</span>}
              </div>
            </div>
            <a href="/login" className="login-link">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
              Yönetici Girişi
            </a>
          </div>
        </body>
      </html>
    );
  }

  // Default design
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Bakım Modu — {displaySiteName}</title>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            background: #0f0f14;
            color: #e2e8f0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .card {
            background: #1a1a2e;
            border: 1px solid rgba(99,102,241,0.3);
            border-radius: 16px;
            padding: 48px 40px;
            max-width: 480px;
            width: 100%;
            text-align: center;
            box-shadow: 0 0 40px rgba(99,102,241,0.08);
          }
          .logo-wrap { margin-bottom: 16px; display: flex; align-items: center; justify-content: center; }
          .logo-img { max-height: 56px; max-width: 200px; object-fit: contain; }
          .logo-icon { font-size: 3rem; }
          .brand { font-size: 1.4rem; font-weight: 700; color: #a5b4fc; margin-bottom: 28px; }
          .icon-wrapper {
            width: 72px; height: 72px; margin: 0 auto 20px;
            background: rgba(99,102,241,0.1); border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            animation: iconPulse 2s ease-in-out infinite;
          }
          .icon-wrapper svg { color: #818cf8; }
          h1 { font-size: 1.6rem; font-weight: 700; color: #f1f5f9; margin-bottom: 12px; }
          p { color: #94a3b8; font-size: 0.95rem; line-height: 1.7; margin-bottom: 28px; }
          .divider { height: 1px; background: rgba(99,102,241,0.15); margin: 24px 0; }
          .contact { font-size: 0.82rem; color: #64748b; line-height: 1.8; }
          .contact a { color: #818cf8; text-decoration: none; }
          .contact-links { display: flex; flex-direction: column; gap: 10px; align-items: center; }
          .discord-btn { display: inline-flex; align-items: center; gap: 8px; background: #5865f2; color: #fff; border-radius: 8px; padding: 8px 20px; font-size: 0.85rem; font-weight: 600; text-decoration: none; transition: opacity 0.2s; }
          .discord-btn:hover { opacity: 0.88; }
          .badge {
            display: inline-flex; align-items: center; gap: 6px;
            background: rgba(99,102,241,0.15);
            border: 1px solid rgba(99,102,241,0.3);
            border-radius: 50px; padding: 6px 16px;
            font-size: 0.8rem; color: #a5b4fc; margin-bottom: 28px;
          }
          .dot {
            width: 8px; height: 8px; background: #f59e0b;
            border-radius: 50%; animation: pulse 1.5s ease-in-out infinite;
          }
          .login-link {
            display: inline-flex; align-items: center; gap: 6px;
            color: #64748b; font-size: 0.78rem; margin-top: 16px;
            text-decoration: none; transition: color 0.2s;
          }
          .login-link:hover { color: #a5b4fc; }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
          @keyframes iconPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        `}</style>
      </head>
      <body>
        <div className="card">
          <div className="logo-wrap">
            {logoUrl ? (
              <img src={logoUrl} alt={displaySiteName} className="logo-img" decoding="async" />
            ) : (
              <span className="logo-icon">読</span>
            )}
          </div>
          {!logoUrl && <div className="brand">{displaySiteName}</div>}
          <div className="badge">
            <span className="dot" />
            Bakım Çalışması
          </div>
          <div className="icon-wrapper">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
          </div>
          <h1>Yakında döneceğiz</h1>
          <p>{displayMessage}</p>
          <div className="divider" />
          <div className="contact">
            <div className="contact-links">
              {displayDiscord && (
                <a href={displayDiscord} target="_blank" rel="noopener noreferrer" className="discord-btn">
                  <svg width="18" height="14" viewBox="0 0 71 55" fill="currentColor"><path d="M60.1 4.9A58.5 58.5 0 0 0 45.5.7a40.8 40.8 0 0 0-1.8 3.7 54.1 54.1 0 0 0-16.3 0A39.4 39.4 0 0 0 25.6.7 58.4 58.4 0 0 0 11 4.9C1.6 19 -1 32.7.3 46.3a59 59 0 0 0 18 9.1 44.5 44.5 0 0 0 3.8-6.3 38.3 38.3 0 0 1-6-2.9l1.4-1.1a42 42 0 0 0 36.1 0l1.5 1.1a38.4 38.4 0 0 1-6 2.9 44.4 44.4 0 0 0 3.8 6.3 58.8 58.8 0 0 0 18-9.1c1.5-15.8-2.5-29.3-10.8-41.3zM23.7 38c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.5 0 6.5 3.2 6.4 7.2 0 4-2.9 7.2-6.4 7.2zm23.6 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.5 0 6.4 3.2 6.4 7.2 0 4-2.9 7.2-6.4 7.2z"/></svg>
                  Discord Sunucumuza Katılın
                </a>
              )}
              {displayEmail && <span>Sorularınız için: <a href={`mailto:${displayEmail}`}>{displayEmail}</a></span>}
              {!displayDiscord && !displayEmail && <span>Yakında tekrar kontrol edin.</span>}
            </div>
          </div>
          <a href="/login" className="login-link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
            Yönetici Girişi
          </a>
        </div>
      </body>
    </html>
  );
}
