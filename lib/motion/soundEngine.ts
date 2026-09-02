/**
 * Na Etacie - Web Audio Synthesizer Micro-Chimes (2026)
 * 
 * 0-dependency, high-performance audio synthesis using the Web Audio API.
 * Synthesizes harmonic chimes and tactile sound effects in real time.
 */

export type UiSoundType = 
  | 'pop' 
  | 'success' 
  | 'sparkle' 
  | 'whoosh' 
  | 'toggle' 
  | 'favorite';

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

/**
 * Gets or initializes the singleton AudioContext on user interaction.
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Enables or disables UI sound effects globally.
 */
export function setUiSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
}

export function isUiSoundEnabled(): boolean {
  return soundEnabled;
}

export function toggleUiSound(): boolean {
  soundEnabled = !soundEnabled;
  return soundEnabled;
}

/**
 * Plays a high-fidelity synthesized UI sound effect.
 */
export function playUiSound(sound: UiSoundType, volume = 0.15): void {
  if (!soundEnabled || typeof window === 'undefined') return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);

    switch (sound) {
      case 'pop': {
        // Crisp tactile click (frequency drops rapidly)
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);

        gainNode.gain.setValueAtTime(volume * 1.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(gainNode);
        osc.start(now);
        osc.stop(now + 0.06);
        break;
      }

      case 'favorite': {
        // High harmonic double-bell chime
        [587.33, 880].forEach((freq, i) => { // D5, A5
          const osc = ctx.createOscillator();
          const noteGain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + i * 0.06);

          noteGain.gain.setValueAtTime(0.001, now + i * 0.06);
          noteGain.gain.linearRampToValueAtTime(volume * 0.8, now + i * 0.06 + 0.02);
          noteGain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.28);

          osc.connect(noteGain);
          noteGain.connect(gainNode);
          osc.start(now + i * 0.06);
          osc.stop(now + i * 0.06 + 0.3);
        });
        break;
      }

      case 'success': {
        // Major triad chord arpeggio (C5 -> E5 -> G5)
        [523.25, 659.25, 783.99].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const noteGain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.05);

          noteGain.gain.setValueAtTime(0.001, now + idx * 0.05);
          noteGain.gain.linearRampToValueAtTime(volume * 0.6, now + idx * 0.05 + 0.02);
          noteGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.35);

          osc.connect(noteGain);
          noteGain.connect(gainNode);
          osc.start(now + idx * 0.05);
          osc.stop(now + idx * 0.05 + 0.38);
        });
        break;
      }

      case 'sparkle': {
        // Rapid pentatonic shimmer
        [659.25, 783.99, 987.77, 1174.66, 1318.51].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const noteGain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.035);

          noteGain.gain.setValueAtTime(0.001, now + idx * 0.035);
          noteGain.gain.linearRampToValueAtTime(volume * 0.4, now + idx * 0.035 + 0.015);
          noteGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.035 + 0.22);

          osc.connect(noteGain);
          noteGain.connect(gainNode);
          osc.start(now + idx * 0.035);
          osc.stop(now + idx * 0.035 + 0.25);
        });
        break;
      }

      case 'whoosh': {
        // Soft low-pass filtered slide
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(450, now + 0.12);

        gainNode.gain.setValueAtTime(volume * 0.5, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

        osc.connect(gainNode);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      }

      case 'toggle': {
        // Subtle switch click
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(480, now + 0.04);

        gainNode.gain.setValueAtTime(volume * 0.6, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        osc.connect(gainNode);
        osc.start(now);
        osc.stop(now + 0.05);
        break;
      }
    }
  } catch {
    // Audio playback failure is always non-fatal
  }
}

/**
 * Synthesizes a harmonic multi-tonal chord scaled directly to the job offer's salary.
 * Higher salary = higher, more euphoric crystalline arpeggio.
 */
export function playSalaryChime(salary: number | string | null, volume = 0.15): void {
  if (!soundEnabled || typeof window === 'undefined') return;

  let numPrice = 0;
  if (typeof salary === 'number') {
    numPrice = salary;
  } else if (typeof salary === 'string') {
    const match = salary.replace(/\s/g, '').match(/(\d+)/);
    if (match) numPrice = parseInt(match[1], 10);
  }

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);

    let notes: number[];
    if (numPrice >= 13000) {
      // 🏆 Tier 1: Gold arpeggio (C5, E5, G5, B5, C6)
      notes = [523.25, 659.25, 783.99, 987.77, 1046.50];
    } else if (numPrice >= 9000) {
      // 💎 Tier 2: Bright harmonic (G4, B4, D5, G5)
      notes = [392.00, 493.88, 587.33, 783.99];
    } else if (numPrice >= 6000) {
      // 🟢 Tier 3: Balanced crystal chime (E4, G4, B4)
      notes = [329.63, 392.00, 493.88];
    } else {
      // 🪵 Tier 4: Warm foundational chime (C4, E4)
      notes = [261.63, 329.63];
    }

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);

      noteGain.gain.setValueAtTime(0.001, now + idx * 0.04);
      noteGain.gain.linearRampToValueAtTime(volume * 0.6, now + idx * 0.04 + 0.015);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.3);

      osc.connect(noteGain);
      noteGain.connect(gainNode);
      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.32);
    });
  } catch {
    // Non-fatal
  }
}

