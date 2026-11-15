'use client';

import { RefObject, useEffect, useRef } from 'react';
import { AudioEffect, AUDIO_EFFECTS, fadeGain } from '@/utils/audioEffects';

export function useAudioPreview(element: RefObject<HTMLMediaElement | null>, source: string | null,
  settings: { effects: AudioEffect[]; levels?: Partial<Record<AudioEffect, number>>; volume: number; start: number; end: number; fadeIn: number; fadeOut: number }) {
  const graph = useRef<{ context: AudioContext; input: MediaElementAudioSourceNode; gain: GainNode; nodes: AudioNode[] } | null>(null);
  const latest = useRef(settings); latest.current = settings;

  const connect = () => {
    const g = graph.current; if (!g) return;
    g.input.disconnect(); g.nodes.forEach(node => node.disconnect()); g.nodes = [];
    let tail: AudioNode = g.input;
    // Use the same fixed order as the export filters, regardless of toggle order.
    for (const effect of AUDIO_EFFECTS.filter(effect => latest.current.effects.includes(effect.id))) {
      const strength = Math.max(0, Math.min(100, latest.current.levels?.[effect.id] ?? 100)) / 100;
      if (strength === 0) continue;
      if (effect.id === 'reverb' || effect.id === 'echo') {
        const outputGain = 1 - (effect.id === 'reverb' ? 0.12 : 0.1) * strength;
        const sum = g.context.createGain(); const dry = g.context.createGain(); dry.gain.value = (1 - 0.2 * strength) * outputGain;
        tail.connect(dry); dry.connect(sum); g.nodes.push(sum, dry);
        const taps = effect.id === 'reverb' ? [[0.04, 0.25], [0.07, 0.18], [0.1, 0.12]] : [[0.18, 0.3]];
        for (const [seconds, level] of taps) {
          const delay = g.context.createDelay(1); delay.delayTime.value = seconds;
          const wet = g.context.createGain(); wet.gain.value = level * strength * outputGain;
          tail.connect(delay); delay.connect(wet); wet.connect(sum); g.nodes.push(delay, wet);
        }
        tail = sum;
      } else {
        const filter = g.context.createBiquadFilter();
        filter.type = effect.id === 'bass' ? 'lowshelf' : effect.id === 'treble' ? 'highshelf' : 'lowpass';
        filter.frequency.value = effect.id === 'bass' ? 200 : effect.id === 'treble' ? 3000 : 20000 - 15000 * strength;
        filter.gain.value = effect.id === 'bass' ? 6 * strength : effect.id === 'treble' ? 5 * strength : 0;
        tail.connect(filter); tail = filter; g.nodes.push(filter);
      }
    }
    tail.connect(g.gain);
  };

  useEffect(() => { connect(); }, [settings.effects, settings.levels]);
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const g = graph.current, audio = element.current, value = latest.current;
      if (g && audio) {
        const gain = audio.paused ? 0 : value.volume * fadeGain(audio.currentTime, value.start, value.end, value.fadeIn, value.fadeOut);
        g.gain.gain.setTargetAtTime(gain, g.context.currentTime, 0.005);
      }
      frame = requestAnimationFrame(tick);
    };
    if (source) frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      const g = graph.current; graph.current = null;
      if (g) { g.input.disconnect(); g.nodes.forEach(n => n.disconnect()); void g.context.close(); }
    };
  }, [source, element]);

  return { start: async () => {
    const audio = element.current; if (!audio) return;
    if (!graph.current) {
      const context = new AudioContext(); const gain = context.createGain(); gain.gain.value = 0;
      const input = context.createMediaElementSource(audio); gain.connect(context.destination);
      graph.current = { context, input, gain, nodes: [] }; audio.volume = 1; connect();
    }
    await graph.current.context.resume();
  } };
}
