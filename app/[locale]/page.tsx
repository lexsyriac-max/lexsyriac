import { useTranslations } from 'next-intl';
import NavBar from './NavBar';

const stats = [
  { label: 'Toplam Kelime', value: '1,248', icon: '📚' },
  { label: 'Bugün Eklenen', value: '12',    icon: '✨' },
  { label: 'Kategoriler',   value: '24',    icon: '🗂️' },
  { label: 'Cümleler',      value: '340',   icon: '💬' },
];

const wordOfDay = {
  tr: 'Su',
  sy: 'ܡܝܐ',
  en: 'Water',
  category: 'Doğa',
  example: 'ܡܝܐ ܚܝܝܢ — Su hayattır',
};

export default function HomePage() {
  const t = useTranslations();

  const quickLinks = [
    { href: '/dictionary', label: t('nav.dictionary'), desc: t('cards.dictionary'), icon: '🔍', color: 'teal'  },
    { href: '/learn',      label: t('nav.learn'),      desc: t('cards.learn'),      icon: '🎴', color: 'amber' },
    { href: '/sentences',  label: t('nav.sentences'),  desc: t('cards.sentences'),  icon: '✍️', color: 'green' },
    { href: '/rules',      label: t('nav.rules'),      desc: t('cards.rules'),      icon: '📖', color: 'teal'  },
    { href: '/resources',  label: t('nav.sources'),    desc: t('cards.sources'),    icon: '🗃️', color: 'amber' },
    { href: '/stats',      label: t('nav.stats'),      desc: t('cards.stats'),      icon: '📊', color: 'green' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>

      {/* ── NAV ── */}
      <NavBar />

      {/* ── HERO ── */}
      <section style={{
        background: 'linear-gradient(135deg, var(--color-primary) 0%, #0F3D47 100%)',
        padding: '4rem 0 3rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          right: '-2rem', top: '-1rem',
          fontSize: '14rem',
          color: 'rgba(255,255,255,0.04)',
          fontFamily: 'var(--font-display)',
          lineHeight: 1,
          userSelect: 'none',
          pointerEvents: 'none',
        }}>ܣ</div>

        <div className="container" style={{ position: 'relative' }}>
          <p style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: '0.8125rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: '0.75rem',
          }}>Üçdilli Sözlük Platformu</p>

          <h1 style={{
            color: 'white',
            fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            maxWidth: 600,
            marginBottom: '1.25rem',
          }}>
            Süryaniceyi keşfet,<br />
            <span style={{ color: '#F4C87A' }}>kelime kelime öğren</span>
          </h1>

          <p style={{
            color: 'rgba(255,255,255,0.7)',
            maxWidth: 480,
            marginBottom: '2rem',
            lineHeight: 1.7,
          }}>
            Türkçe, Süryanice ve İngilizce arasında gelişmiş arama,
            flashcard sistemi ve gramer kurallarıyla zenginleştirilmiş sözlük.
          </p>

          <div style={{ display: 'flex', gap: '0.5rem', maxWidth: 520 }}>
            <input
              className="input"
              placeholder="Kelime ara... (TR / Süryanice / EN)"
              style={{ flex: 1 }}
            />
            <button className="btn btn-accent">Ara</button>
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['su', 'ekmek', 'aile', 'renkler', 'sayılar'].map(tag => (
              <span key={tag} style={{
                padding: '0.25rem 0.75rem',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 999,
                fontSize: '0.8125rem',
                color: 'rgba(255,255,255,0.75)',
                cursor: 'pointer',
              }}>{tag}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── İSTATİSTİKLER ── */}
      <section style={{ padding: '2rem 0', background: 'white', borderBottom: '1px solid var(--color-border)' }}>
        <div className="container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1rem',
          }}>
            {stats.map(stat => (
              <div key={stat.label} style={{ textAlign: 'center', padding: '0.5rem' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{stat.icon}</div>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.625rem',
                  fontWeight: 700,
                  color: 'var(--color-primary)',
                }}>{stat.value}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ANA İÇERİK ── */}
      <main className="container" style={{ padding: '2.5rem 1.5rem' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 320px',
          gap: '2rem',
          alignItems: 'start',
        }}>

          {/* Sol — Hızlı Erişim */}
          <div>
            <h2 style={{ marginBottom: '1.25rem', fontSize: '1.25rem' }}>{t('home.quickAccess')}</h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '1rem',
            }}>
              {quickLinks.map(link => (
                <a key={link.href} href={link.href} style={{ textDecoration: 'none' }}>
                  <div className="card" style={{
                    padding: '1.25rem',
                    cursor: 'pointer',
                    display: 'flex',
                    gap: '1rem',
                    alignItems: 'flex-start',
                  }}>
                    <div style={{
                      fontSize: '1.5rem',
                      width: 44, height: 44,
                      background: link.color === 'teal'  ? 'var(--color-primary-light)' :
                                  link.color === 'amber' ? 'var(--color-accent-light)'  :
                                  '#EAF4EE',
                      borderRadius: 10,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>{link.icon}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--color-text)', marginBottom: '0.2rem' }}>
                        {link.label}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                        {link.desc}
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Sağ — Günün Kelimesi */}
          <div>
            <h2 style={{ marginBottom: '1.25rem', fontSize: '1.25rem' }}>{t('home.wordOfDay')}</h2>
            <div className="card" style={{
              padding: '1.5rem',
              background: 'linear-gradient(135deg, var(--color-primary-light), white)',
              borderColor: 'rgba(26, 95, 110, 0.15)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span className="badge badge-primary">{wordOfDay.category}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)' }}>27 Mart 2026</span>
              </div>

              <div style={{
                fontSize: '2.5rem',
                color: 'var(--color-primary)',
                fontFamily: 'var(--font-display)',
                marginBottom: '0.75rem',
                textAlign: 'center',
              }}>{wordOfDay.sy}</div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <span className="badge badge-accent">{wordOfDay.tr}</span>
                <span className="badge" style={{ background: '#EAF4EE', color: '#2D7A4F', border: 'none' }}>{wordOfDay.en}</span>
              </div>

              <div style={{
                padding: '0.75rem',
                background: 'rgba(26, 95, 110, 0.06)',
                borderRadius: 8,
                fontSize: '0.875rem',
                color: 'var(--color-text-muted)',
                fontStyle: 'italic',
                textAlign: 'center',
              }}>{wordOfDay.example}</div>

              <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                {t('home.learnMore')}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer style={{
        borderTop: '1px solid var(--color-border)',
        padding: '2rem 0',
        background: 'white',
        marginTop: '2rem',
      }}>
        <div className="container" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            © 2026 LexSyriac — Üçdilli Sözlük
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-subtle)' }}>
            Türkçe · ܣܘܪܝܐ · English
          </div>
        </div>
      </footer>

    </div>
  );
}