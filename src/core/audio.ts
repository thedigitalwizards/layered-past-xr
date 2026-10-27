// One voice at a time. Entering a context fades out the voice that was speaking, then the new
// context's voice speaks once, from its first word. It does not repeat until the context is entered again.
import { Audio, AudioListener, AudioLoader, type Object3D } from 'three';
import type { Context } from './content.ts';

const LEVEL = 0.9;
/** How long the old voice takes to fade away before the new one starts, in seconds. */
export const FADE_OUT_S = 0.7;
const FADE_IN_S = 0.15;

/**
 * Which context's voice should be speaking: the strongest one, with some hysteresis so a journey paused
 * right between two contexts does not flip between their voices.
 */
export const speakingContext = (weights: readonly number[], current: number): number => {
  const strongest = weights.indexOf(Math.max(...weights));
  return current >= 0 && (weights[current] ?? 0) > 0.4 ? current : strongest;
};

export type Voices = {
  /** Browsers only allow audio after a user gesture, so call this from one (Begin). */
  readonly start: () => Promise<void>;
  readonly update: (weights: readonly number[]) => void;
  readonly setMuted: (muted: boolean) => void;
};

export const createVoices = (listenerParent: Object3D, contexts: readonly Context[]): Voices => {
  let listener: AudioListener | null = null;
  let voices: (Audio | null)[] = contexts.map(() => null);
  let speaking = -1;
  let pending: { readonly index: number; readonly at: number } | null = null;
  let muted = false;

  const fadeOut = (index: number, now: number) => {
    const voice = voices[index];
    if (!voice?.isPlaying) return false;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
    voice.gain.gain.linearRampToValueAtTime(0, now + FADE_OUT_S);
    voice.stop(FADE_OUT_S);
    return true;
  };

  const speak = (index: number, now: number) => {
    const voice = voices[index];
    if (!voice) return;
    if (voice.isPlaying) voice.stop();
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(0, now);
    voice.gain.gain.linearRampToValueAtTime(voice.userData.level as number, now + FADE_IN_S);
    voice.play();
  };

  // A hidden tab should not keep talking.
  document.addEventListener('visibilitychange', () => {
    if (!listener) return;
    void (document.hidden ? listener.context.suspend() : listener.context.resume());
  });

  return {
    start: async () => {
      if (listener) return;
      listener = new AudioListener();
      listenerParent.add(listener);
      listener.setMasterVolume(muted ? 0 : 1);
      await listener.context.resume().catch(() => undefined);
      const loader = new AudioLoader();
      voices = await Promise.all(
        contexts.map(async (context) => {
          try {
            const buffer = await loader.loadAsync(`${import.meta.env.BASE_URL}${context.audio.src}`);
            const voice = new Audio(listener!);
            voice.setBuffer(buffer);
            voice.setLoop(false);
            voice.setVolume(0);
            const quiet = context.certainty === 'absent-voice';
            // An absent voice is heard more quietly, as if from further away.
            voice.userData.level = quiet ? LEVEL * 0.6 : LEVEL;
            return voice;
          } catch (error) {
            console.warn(`Could not load ${context.audio.src}`, error);
            return null;
          }
        }),
      );
    },
    update: (weights) => {
      if (!listener || voices.every((v) => !v)) return;
      const now = listener.context.currentTime;
      const next = speakingContext(weights, speaking);
      if (next !== speaking) {
        const wasSpeaking = speaking >= 0 && fadeOut(speaking, now);
        speaking = next;
        // The new voice waits for the old one to fade, so they never pile up.
        pending = { index: next, at: wasSpeaking ? now + FADE_OUT_S : (pending?.at ?? now) };
      }
      if (pending && now >= pending.at) {
        speak(pending.index, now);
        pending = null;
      }
    },
    setMuted: (value) => {
      muted = value;
      listener?.setMasterVolume(value ? 0 : 1);
    },
  };
};
