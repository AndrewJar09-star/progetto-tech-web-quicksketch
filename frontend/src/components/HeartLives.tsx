import React from 'react';

interface HeartLivesProps {
  used?: number;
  total?: number;
}

export default function HeartLives({ used = 0, total = 10 }: HeartLivesProps) {
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
