// The three voices play together; the dial sets how loud each one is. Halfway between two
// worlds both are heard. A voice restarts from its first word each time its world comes back.
import { Audio, AudioListener, AudioLoader, type Object3D } from 'three';
import type { World } from './content.ts';

/** Equal-power crossfade: the overall loudness stays even halfway between two worlds. */
export const equalPowerGain = (weight: number): number => Math.sin((Math.min(1, Math.max(0, weight)) * Math.PI) / 2);

const LEVEL = 0.9;
const PAUSE_BETWEEN_REPEATS_S = 3;

/** An absent voice is heard quietly and from far away: muffled, with a long room tail. */
const distant = (context: AudioContext): AudioNode[] => {
  const lowpass = context.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 1300;
  const seconds = 2.2;
  const impulse = context.createBuffer(1, Math.round(seconds * context.sampleRate), context.sampleRate);
  const data = impulse.getChannelData(0);
  // A procedural room: the direct sound, then decaying noise.
  for (let i = 0; i < data.length; i += 1)
    data[i] = i === 0 ? 0.6 : (Math.random() * 2 - 1) * 0.5 * (1 - i / data.length) ** 3;
  const room = context.createConvolver();
  room.normalize = false;
  room.buffer = impulse;
  return [lowpass, room];
};

const withPause = (context: AudioContext, buffer: AudioBuffer): AudioBuffer => {
  const padded = context.createBuffer(
    buffer.numberOfChannels,
    buffer.length + Math.round(PAUSE_BETWEEN_REPEATS_S * buffer.sampleRate),
    buffer.sampleRate,
  );
  for (let c = 0; c < buffer.numberOfChannels; c += 1) padded.copyToChannel(buffer.getChannelData(c), c);
  return padded;
};

export type Voices = {
  /** Browsers only allow audio after a user gesture, so call this from one (picking up the stone). */
  readonly start: () => Promise<void>;
  readonly update: (weights: readonly number[]) => void;
  readonly setMuted: (muted: boolean) => void;
};

export const createVoices = (listenerParent: Object3D, worlds: readonly World[]): Voices => {
  let listener: AudioListener | null = null;
  let voices: (Audio | null)[] = worlds.map(() => null);
  let previous = worlds.map(() => 0);
  let muted = false;

  return {
    start: async () => {
      if (listener) return;
      listener = new AudioListener();
      listenerParent.add(listener);
      listener.setMasterVolume(muted ? 0 : 1);
      await listener.context.resume().catch(() => undefined);
      const loader = new AudioLoader();
      voices = await Promise.all(
        worlds.map(async (world) => {
          try {
            const buffer = await loader.loadAsync(`${import.meta.env.BASE_URL}${world.audio.src}`);
            const voice = new Audio(listener!);
            voice.setBuffer(withPause(listener!.context, buffer));
            voice.setLoop(true);
            voice.setVolume(0);
            const quiet = world.certainty === 'absent-voice';
            voice.userData.level = quiet ? LEVEL * 0.45 : LEVEL;
            if (quiet) voice.setFilters(distant(listener!.context));
            return voice;
          } catch (error) {
            console.warn(`Could not load ${world.audio.src}`, error);
            return null;
          }
        }),
      );
      previous = worlds.map(() => 0);
    },
    update: (weights) => {
      if (!listener) return;
      const now = listener.context.currentTime;
      voices.forEach((voice, i) => {
        if (!voice) return;
        const weight = weights[i] ?? 0;
        if (weight > 0.01 && (previous[i] ?? 0) <= 0.01) {
          if (voice.isPlaying) voice.stop();
          voice.play();
        }
        previous[i] = weight;
        voice.gain.gain.setTargetAtTime(equalPowerGain(weight) * (voice.userData.level as number), now, 0.05);
      });
    },
    setMuted: (value) => {
      muted = value;
      listener?.setMasterVolume(value ? 0 : 1);
    },
  };
};
