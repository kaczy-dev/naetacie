'use client';

import React, { useState } from 'react';
import { BlikPaymentModal } from './BlikPaymentModal';
import { triggerHaptic } from '@/lib/utils';

interface BoostAdBadgeProps {
  adId: string;
  adTitle: string;
  isBoosted?: boolean;
  className?: string;
}

export const BoostAdBadge: React.FC<BoostAdBadgeProps> = ({
  adId,
  adTitle,
  isBoosted = false,
  className = '',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [boosted, setBoosted] = useState(isBoosted);

  const handleOpenBoost = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(10);
    setIsModalOpen(true);
  };

  return (
    <>
      {boosted ? (
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border border-amber-500/50 text-amber-300 text-[11px] font-extrabold tracking-wide uppercase shadow-sm shadow-amber-500/20 animate-pulse ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span>SUPER WYRÓŻNIENIE 3D</span>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleOpenBoost}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-800/80 hover:bg-amber-500/20 border border-zinc-700 hover:border-amber-500/50 text-zinc-300 hover:text-amber-300 text-[11px] font-semibold transition group ${className}`}
        >
          <svg
            className="w-3.5 h-3.5 text-zinc-400 group-hover:text-amber-400 transition"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <span>Wyróżnij (19 zł)</span>
        </button>
      )}

      <BlikPaymentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        productId="BOOST_AD_3D"
        targetAdId={adId}
        targetAdTitle={adTitle}
        onPaymentSuccess={() => {
          setBoosted(true);
          setIsModalOpen(false);
        }}
      />
    </>
  );
};
