'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, Square } from 'lucide-react';
import { VoiceSpeechService, generateVoiceSummaryText, SpeechJobData } from '@/lib/voice/speechAssistant';

interface VoiceSummaryButtonProps {
  data?: SpeechJobData;
  title?: string;
  location?: string;
  price?: string | number | null;
  description?: string;
  className?: string;
}

export const VoiceSummaryButton: React.FC<VoiceSummaryButtonProps> = ({
  data,
  title,
  location,
  price,
  description,
  className = '',
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [lang, setLang] = useState<'pl' | 'uk'>('pl');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(VoiceSpeechService.isSupported());
  }, []);

  const jobData: SpeechJobData = data || {
    title: title || '',
    location: location || '',
    price: price ? String(price) : null,
    description: description || '',
  };

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isPlaying) {
      VoiceSpeechService.stop();
      setIsPlaying(false);
    } else {
      const text = generateVoiceSummaryText(jobData, lang);
      setIsPlaying(true);
      VoiceSpeechService.speak(text, lang, () => setIsPlaying(false));
    }
  };

  const handleToggleLang = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextLang = lang === 'pl' ? 'uk' : 'pl';
    setLang(nextLang);
    if (isPlaying) {
      VoiceSpeechService.stop();
      const text = generateVoiceSummaryText(jobData, nextLang);
      VoiceSpeechService.speak(text, nextLang, () => setIsPlaying(false));
    }
  };

  if (!isSupported) return null;

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <button
        type="button"
        onClick={handleTogglePlay}
        title={isPlaying ? 'Zatrzymaj lektora' : `Odsłuchaj zlecenie (${lang.toUpperCase()})`}
        className={`flex items-center gap-1 py-1 px-2 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
          isPlaying
            ? 'bg-rose-500 text-white border-rose-400 animate-pulse'
            : 'bg-muted/80 hover:bg-muted text-foreground border-border/80'
        }`}
      >
        {isPlaying ? (
          <>
            <Square className="w-3 h-3 text-white fill-white" />
            <span>Stop</span>
          </>
        ) : (
          <>
            <Volume2 className="w-3 h-3 text-primary" />
            <span>Odsłuchaj</span>
          </>
        )}
      </button>

      <button
        type="button"
        onClick={handleToggleLang}
        title={`Zmień język lektora (obecny: ${lang === 'pl' ? 'Polski' : 'Ukraiński'})`}
        className="py-1 px-1.5 rounded-lg text-[9px] font-bold bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60 transition-colors cursor-pointer"
      >
        {lang.toUpperCase()}
      </button>
    </div>
  );
};
