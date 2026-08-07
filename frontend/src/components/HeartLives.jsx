import React from 'react';

/**
 * Visualizzazione dei 10 tentativi come cuoricini disegnati a matita.
 * I cuoricini usati vengono sbarrati progressivamente.
 */
export default function HeartLives({ used = 0, total = 10 }) {
  return (
    <div className="heart-lives">
      {Array.from({ length: total }, (_, i) => {
        let className = 'heart-life';
        if (i < used) {
          className += ' used';
        } else if (i === used && used < total) {
          className += ' current';
        }
        return (
          <span key={i} className={className} title={`Tentativo ${i + 1}`}>
            ♥
          </span>
        );
      })}
    </div>
  );
}
