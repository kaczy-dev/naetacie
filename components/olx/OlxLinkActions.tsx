'use client';

import React, { useState } from 'react';
import { ExternalLink, Copy, Check, Smartphone, Search, ShieldCheck, QrCode, Share2 } from 'lucide-react';
import { resolveOlxLink } from '@/lib/olx/olxLinkResolver';
import { getAnnouncementExternalUrl, triggerHaptic } from '@/lib/utils';
import { OlxQrModal } from './OlxQrModal';

export interface OlxLinkActionsProps {
  ad: {
    id?: string;
    title?: string | null;
    source_url?: string | null;
    source_portal?: string | null;
    category?: string | null;
  };
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'compact';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  showMenu?: boolean;
}

export function OlxLinkActions({
  ad,
  variant = 'default',
  size = 'sm',
  className = '',
  showMenu = true,
}: OlxLinkActionsProps) {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const resolved = resolveOlxLink({
    id: ad.id,
    title: ad.title,
    source_url: ad.source_url,
    source_portal: ad.source_portal,
    category: ad.category,
  });

  const externalUrl = getAnnouncementExternalUrl(ad);
  const portalName = (ad.source_portal || 'OLX').toUpperCase();

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(externalUrl);
      setCopied(true);
      triggerHaptic([10, 30, 10]);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore clipboard permissions */
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: ad.title || 'Ogłoszenie OLX',
          url: externalUrl,
        });
        triggerHaptic(15);
      } catch {
        /* share cancelled */
      }
    } else {
      handleCopyLink(e);
    }
  };

  const handleOpenClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    triggerHaptic(15);
    if (typeof window !== 'undefined') {
      window.open(externalUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const portalRaw = (ad.source_portal || 'olx').toLowerCase();
  const buttonLabel = portalRaw === 'olx' ? 'Zobacz na OLX' : `Zobacz w ${portalName}`;

  if (variant === 'compact') {
    return (
      <a
        href={externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={handleOpenClick}
        className={`inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer ${className}`}
        title={`Otwórz w ${portalName}`}
      >
        <ExternalLink className="w-3.5 h-3.5" />
        <span>{buttonLabel}</span>
      </a>
    );
  }

  return (
    <>
      <div className="relative inline-flex items-center gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={handleOpenClick}
          className={`inline-flex items-center justify-center gap-1.5 font-extrabold px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/20 active:scale-97 transition-all cursor-pointer text-xs ${className}`}
        >
          <ExternalLink className="w-3.5 h-3.5 shrink-0 text-current" />
          <span>{buttonLabel}</span>
        </a>

        {showMenu && (
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
              className="p-1.5 rounded-lg border border-border/40 bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Opcje łącza OLX"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 bottom-full mb-2 w-64 p-2 bg-popover/95 backdrop-blur-md border border-border rounded-xl shadow-xl z-50 text-xs flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-2 py-1.5 border-b border-border/50 text-[11px] font-medium text-muted-foreground flex items-center justify-between">
                  <span>Status Łącza OLX</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    {resolved.isDirectOffer ? 'Bezpośrednie' : 'Szukaj'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-muted text-left transition-colors text-foreground font-medium cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                  <span>{copied ? 'Skopiowano link do schowka!' : 'Kopiuj czysty link OLX'}</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    setQrOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-muted text-left transition-colors text-foreground font-medium cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Kod QR do skanowania</span>
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-muted text-left transition-colors text-foreground font-medium cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-purple-500" />
                  <span>Udostępnij ofertę</span>
                </button>

                {resolved.mobileDeepLink && (
                  <a
                    href={resolved.mobileDeepLink}
                    onClick={() => setMenuOpen(false)}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-muted text-left transition-colors text-foreground font-medium cursor-pointer"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-blue-500" />
                    <span>Otwórz w aplikacji OLX</span>
                  </a>
                )}

                <a
                  href={`https://www.olx.pl/praca/szczecin/?search%5Bq%5D=${encodeURIComponent(ad.title || 'budowlana')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMenuOpen(false)}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-muted text-left transition-colors text-foreground font-medium cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5 text-amber-500" />
                  <span>Szukaj podobnych na OLX</span>
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      <OlxQrModal
        isOpen={qrOpen}
        onClose={() => setQrOpen(false)}
        url={externalUrl}
        title={ad.title}
      />
    </>
  );
}
