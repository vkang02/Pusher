import React, { useEffect, useState } from 'react';
import { colors } from '../lib/theme.js';

export default function PhotoViewer({ photos, startIndex = 0, onClose }) {
  const [i, setI] = useState(startIndex);
  const n = photos.length;
  const prev = () => setI((x) => (x - 1 + n) % n);
  const next = () => setI((x) => (x + 1) % n);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && n > 1) prev();
      else if (e.key === 'ArrowRight' && n > 1) next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [n, onClose]);

  const navBtn = (side, label, onClick) => (
    <button
      aria-label={label}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{
        position: 'absolute', top: '50%', [side]: 12, transform: 'translateY(-50%)', width: 42, height: 42, borderRadius: '50%',
        background: 'rgba(255,255,255,0.14)', border: 'none', color: '#fff', fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {side === 'left' ? '‹' : '›'}
    </button>
  );

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.94)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <img
        src={photos[i].url} alt=""
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '96vw', maxHeight: '84vh', objectFit: 'contain', borderRadius: 8 }}
      />
      <button
        aria-label="Close photo"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        style={{
          position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 14px)', right: 16, width: 42, height: 42, borderRadius: '50%',
          background: 'rgba(255,255,255,0.18)', border: 'none', color: '#fff', fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        ×
      </button>
      {n > 1 && navBtn('left', 'Previous photo', prev)}
      {n > 1 && navBtn('right', 'Next photo', next)}
      {n > 1 && (
        <div style={{ position: 'absolute', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 18px)', left: 0, right: 0, textAlign: 'center', fontSize: 13, color: colors.textDim7 }}>
          {i + 1} / {n}
        </div>
      )}
    </div>
  );
}
