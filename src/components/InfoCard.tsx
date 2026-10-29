import { useEffect } from 'react';
import { useStore } from '../store';
import Icon from './Icon';
import Sparkline from './Sparkline';

export default function InfoCard() {
  const card = useStore((s) => s.card);
  const setCard = useStore((s) => s.setCard);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setCard(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setCard]);

  if (!card) return null;
  const accent = card.accent ?? 'var(--accent)';

  return (
    <article key={card.title + card.kicker} className="card glass" style={{ '--card-accent': accent } as React.CSSProperties} aria-live="polite">
      <div className="card-glow" />
      <header className="card-head">
        <div>
          <p className="card-kicker">
            <span className="dot" />
            {card.kicker}
          </p>
          <h3>{card.title}</h3>
          {card.subtitle && <p className="card-sub">{card.subtitle}</p>}
        </div>
        <button type="button" className="icon-btn ghost" onClick={() => setCard(null)} aria-label="Close details">
          <Icon name="close" size={16} />
        </button>
      </header>

      {card.stats && card.stats.length > 0 && (
        <dl className="card-stats">
          {card.stats.map((s) => (
            <div key={s.label}>
              <dt>{s.label}</dt>
              <dd>{s.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {card.bar && (
        <div className="card-bar">
          <div className="card-bar-label">
            <span>{card.bar.label}</span>
            <span>{card.bar.caption}</span>
          </div>
          <div className="card-bar-track">
            <div className="card-bar-fill" style={{ width: `${card.bar.value * 100}%`, background: card.bar.color }} />
          </div>
        </div>
      )}

      {card.series && (
        <div className="card-section">
          <p className="card-section-title">{card.series.label}</p>
          <Sparkline values={card.series.values} color={accent} start={card.series.start} end={card.series.end} format={card.series.format} labelAt={card.series.labelAt} />
        </div>
      )}

      {card.chips && (
        <div className="chips">
          {card.chips.map((c) => (
            <span key={c} className="chip">
              {c}
            </span>
          ))}
        </div>
      )}

      {(card.source || card.mock) && (
        <footer className="card-foot">
          {card.source && <span>{card.source}</span>}
          {card.mock && <span className="badge">mock values</span>}
        </footer>
      )}
    </article>
  );
}
