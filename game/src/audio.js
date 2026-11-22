// Synthesized sound only: no audio files, no network. Everything is a WebAudio
// oscillator or a filtered noise burst, built lazily on the first user gesture
// (browsers block audio before that) and silent until then.
export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;
  let alarmBeepAt = 0;

  function ensure() {
    if (context) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(context.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, duration, type, gain, when = 0, slideTo = 0) {
    if (!ensure() || muted) return;
    try {
      const start = context.currentTime + when;
      const osc = context.createOscillator();
      const amp = context.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      if (slideTo > 0) osc.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
      amp.gain.setValueAtTime(0, start);
      amp.gain.linearRampToValueAtTime(gain, start + 0.01);
      amp.gain.exponentialRampToValueAtTime(0.001, start + duration);
      osc.connect(amp);
      amp.connect(master);
      osc.start(start);
      osc.stop(start + duration + 0.05);
    } catch {
      // Audio is decoration: never let it break the game.
    }
  }

  return {
    /** Call from any user gesture so the context is allowed to start. */
    unlock() {
      ensure();
      if (context && context.state === 'suspended') context.resume().catch(() => {});
    },
    setMuted(value) {
      muted = value;
      if (master) master.gain.value = value ? 0 : 0.5;
    },
    isMuted() {
      return muted;
    },
    step() {
      tone(180, 0.05, 'triangle', 0.05);
    },
    pickup() {
      tone(880, 0.12, 'sine', 0.16);
      tone(1318, 0.18, 'sine', 0.14, 0.07);
    },
    mask() {
      tone(523, 0.16, 'sine', 0.18);
      tone(659, 0.16, 'sine', 0.18, 0.1);
      tone(784, 0.3, 'sine', 0.2, 0.2);
    },
    vaultOpen() {
      tone(220, 0.35, 'sawtooth', 0.08, 0, 440);
      tone(660, 0.2, 'sine', 0.12, 0.3);
    },
    emp() {
      tone(1200, 0.4, 'sawtooth', 0.1, 0, 90);
    },
    smoke() {
      tone(300, 0.3, 'sine', 0.08, 0, 120);
    },
    spotted() {
      tone(440, 0.15, 'square', 0.1);
      tone(440, 0.15, 'square', 0.1, 0.18);
    },
    caught() {
      tone(196, 0.5, 'sawtooth', 0.16, 0, 98);
      tone(185, 0.6, 'sawtooth', 0.14, 0.15, 92);
    },
    win() {
      const notes = [523, 659, 784, 1046];
      for (let i = 0; i < notes.length; i += 1) tone(notes[i], 0.35, 'sine', 0.18, i * 0.12);
    },
    /** A quiet two-tone siren while the alarm is high; called once a frame. */
    alarmTick(now, alarm) {
      if (!ensure() || muted || alarm < 55) return;
      if (now - alarmBeepAt < (alarm >= 100 ? 0.45 : 0.8)) return;
      alarmBeepAt = now;
      tone(660, 0.14, 'square', 0.045);
      tone(520, 0.14, 'square', 0.045, 0.16);
    },
  };
}
