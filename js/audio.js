// Chiptune music + sound effects, synthesised live with the Web Audio API.
// Songs are written as 16th-note steps: a note name ("C5", "G#4"), "-" to hold
// the previous note, or "." for silence.

const NOTE_IDX = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };

function midiOf(tok) {
  if (/^\d+$/.test(tok)) return +tok;
  const m = /^([A-G][#b]?)(\d)$/.exec(tok);
  return m ? (+m[2] + 1) * 12 + NOTE_IDX[m[1]] : null;
}
const hz = midi => 440 * Math.pow(2, (midi - 69) / 12);

const CHORDS = {
  C: ['C', 'E', 'G'], Am: ['A', 'C', 'E'], F: ['F', 'A', 'C'], G: ['G', 'B', 'D'],
  Dm: ['D', 'F', 'A'], E: ['E', 'G#', 'B'], Bb: ['Bb', 'D', 'F'], Em: ['E', 'G', 'B'],
  D: ['D', 'F#', 'A'], A: ['A', 'C#', 'E'],
};

// Chord tones as ascending midi numbers starting at `oct`.
function chordMidi(name, oct) {
  const out = [];
  for (const n of CHORDS[name]) {
    let m = (oct + 1) * 12 + NOTE_IDX[n];
    while (out.length && m <= out[out.length - 1]) m += 12;
    out.push(m);
  }
  return out;
}

function bassBar(ch) {
  const [r, , f] = chordMidi(ch, 2);
  const o = r + 12;
  return [r, '.', o, '.', r, '.', o, '.', r, '.', o, '.', f, '.', o, '.'];
}

function arpBar(ch) {
  const [a, b, c] = chordMidi(ch, 4);
  return [a, '.', b, '.', c, '.', b, '.', a, '.', b, '.', c, '.', b, '.'];
}

const DRUMS = {
  rock: 'k . h . s . h . k k h . s . h h',
  soft: 'k . . . h . . . k . . . h . h .',
  gallop: 'k . h h s . h h k . h h s . s h',
  fast: 'k h s h k h s h k h s h k k s h',
  gentle: 'k . . . . . h . . . . . h . . .',
};

const SONGS = {
  title: {
    bpm: 140, chords: 'C F G C', drums: 'soft',
    lead: `C5 . . C5 . . G4 . C5 . E5 . G5 - - .
           A5 . . A5 . . F5 . A5 . C6 . A5 - - .
           B5 . . B5 . . G5 . B5 . D6 . B5 - - .
           C6 - - . G5 . E5 . C5 - - - . . . .`,
  },
  meadow: {
    bpm: 150, chords: 'C Am F G C Am F G', drums: 'rock',
    lead: `C5 . E5 . G5 . E5 . C6 - - . G5 . E5 .
           A5 . G5 . E5 . C5 . D5 - E5 . C5 - - .
           F5 . A5 . C6 . A5 . G5 . F5 . E5 . D5 .
           B4 . D5 . G5 - - . F5 . E5 . D5 - - .
           E5 . E5 . G5 . E5 . C6 . B5 . A5 . G5 .
           A5 - - . C6 . A5 . E5 - - . G5 . E5 .
           F5 . F5 . A5 . F5 . D5 . F5 . A5 . C6 .
           B5 - - . G5 . D5 . G5 . A5 . B5 . D6 .`,
  },
  caves: {
    bpm: 124, chords: 'Am F F E Am G Dm E', drums: 'soft',
    lead: `A4 . . C5 . . E5 . A5 - - . G5 . E5 .
           F5 . E5 . D5 . C5 . B4 - - . C5 . D5 .
           C5 . . F5 . . A5 . C6 - - . A5 . F5 .
           E5 - - . G#5 . B5 . E6 - - - . . . .
           A5 . . E5 . . C5 . A4 . C5 . E5 . A5 .
           G5 . F5 . E5 . D5 . B4 - - . . . . .
           D5 . . F5 . . A5 . D6 - - . C6 . A5 .
           B5 - - . G#5 . E5 . B4 . D5 . E5 - - .`,
  },
  snow: {
    bpm: 160, chords: 'F C Dm Bb F C Bb C', drums: 'gallop',
    lead: `A5 . C6 . A5 . F5 . C5 . F5 . A5 . . .
           G5 . E5 . C5 . E5 . G5 - - . . . . .
           F5 . A5 . D6 . A5 . F5 . D5 . F5 . A5 .
           Bb5 - - . A5 . G5 . F5 . D5 . F5 . G5 .
           A5 . A5 . C6 . F6 . C6 - - . A5 . . .
           G5 . G5 . C6 . E6 . C6 - - . G5 . . .
           Bb5 . A5 . G5 . F5 . D5 . F5 . Bb5 . D6 .
           C6 - - . E5 . G5 . C6 . . . . . . .`,
  },
  // Plays while the cub is invincible after eating a super berry.
  berry: {
    bpm: 184, chords: 'C F G C Am F G G', drums: 'fast',
    lead: `C6 . G5 . C6 . E6 . D6 . C6 . G5 . E5 .
           F5 . A5 . C6 . F6 . E6 . C6 . A5 . F5 .
           G5 . B5 . D6 . G6 . F6 . D6 . B5 . G5 .
           C6 . E6 . G6 - - . E6 . C6 - - . . .
           A5 . C6 . E6 . A6 . G6 . E6 . C6 . A5 .
           F5 . A5 . C6 . A5 . G5 . F5 . E5 . F5 .
           G5 . G5 . A5 . B5 . C6 . D6 . E6 . F6 .
           G6 - - . . . G5 . G6 - - . . . . .`,
  },
  // Loops on the ending screen.
  home: {
    bpm: 112, chords: 'F C Dm Bb F C Bb C', drums: 'soft',
    lead: `A5 - - . G5 . F5 - - . C5 . F5 . A5 .
           G5 - - . F5 . E5 - - . C5 . E5 . G5 .
           F5 - - . E5 . D5 - - . A4 . D5 . F5 .
           D5 - - . C5 . Bb4 - - - - - . . . .
           A5 - - . C6 . A5 - - . F5 . A5 . C6 .
           G5 - - . E5 . C5 - - . E5 . G5 . C6 .
           D6 - - . C6 . Bb5 - - . F5 . D5 . Bb5 .
           C6 - - - - - - - E5 - - - G5 - - .`,
  },
  // Bonus tracks for the music box.
  picnic: {
    bpm: 156, chords: 'G C G D G C D G', drums: 'gallop',
    lead: `D5 . G5 . G5 . B5 . D6 . B5 . G5 . . .
           E5 . G5 . C6 . E6 . D6 . C6 . G5 . . .
           B5 . G5 . D5 . G5 . B5 . D6 . G6 . . .
           F#6 - - . E6 . D6 . A5 . F#5 . A5 . . .
           G5 G5 . G5 B5 . D6 . B5 . G5 . D5 . G5 .
           C6 C6 . C6 E6 . G6 . E6 . C6 . G5 . E5 .
           D6 . C6 . B5 . A5 . F#5 . A5 . D6 . F#6 .
           G6 - - . D6 . B5 . G5 - - . . . . .`,
  },
  chase: {
    bpm: 172, chords: 'Dm Dm Bb C Dm Dm Bb A', drums: 'rock',
    lead: `D5 D5 F5 D5 A5 . D5 . D6 . C6 . A5 . F5 .
           D5 D5 F5 D5 A5 . D5 . G5 F5 E5 F5 D5 . . .
           Bb5 . A5 . G5 . F5 . D5 . F5 . Bb5 . D6 .
           C6 . Bb5 . A5 . G5 . E5 . G5 . C6 . E6 .
           F6 . E6 . D6 . A5 . F5 . A5 . D6 . F6 .
           E6 . D6 . C#6 . D6 . A5 - - . . . . .
           Bb5 . D6 . F6 . D6 . Bb5 . F5 . D5 . F5 .
           E5 . A5 . C#6 . E6 . A6 - - . E6 . C#6 .`,
  },
  lullaby: {
    bpm: 96, chords: 'Am F C G Am F E E', drums: 'gentle',
    lead: `E5 - - - A5 - - - C6 - - - B5 - A5 -
           A5 - - - G5 - F5 - E5 - - - - - - -
           E5 - - - G5 - - - C6 - - - D6 - E6 -
           D6 - - - B5 - - - G5 - - - - - - -
           C6 - - - B5 - A5 - E5 - - - A5 - B5 -
           C6 - - - A5 - - - F5 - - - A5 - C6 -
           B5 - - - G#5 - - - E5 - - - G#5 - B5 -
           E6 - - - - - - - . . . . . . . .`,
  },
};

// Everything the music box can play, in order.
export const TRACKS = [
  { name: 'TITLE THEME', song: 'title' },
  { name: 'SUNNY MEADOW', song: 'meadow' },
  { name: 'HONEYCOMB CAVES', song: 'caves' },
  { name: 'SNOWY PEAKS', song: 'snow' },
  { name: 'SUPER BERRY', song: 'berry' },
  { name: 'HOME SWEET DEN', song: 'home' },
  { name: 'PICNIC PARTY', song: 'picnic' },
  { name: 'BUZZY BEE CHASE', song: 'chase' },
  { name: 'MOONLIGHT LULLABY', song: 'lullaby' },
  { name: 'LEVEL CLEAR', jingle: 'clear' },
  { name: 'HOORAY!', jingle: 'ending' },
  { name: 'OOPS!', jingle: 'die' },
  { name: 'GAME OVER', jingle: 'gameover' },
];

const JINGLES = {
  clear: { bpm: 200, lead: 'C5 E5 G5 C6 - . G5 C6 E6 - - - . . . . D6 - E6 - F6 - G6 - - - - - - - . .', bass: 'C3 - - - - - - - E3 - - - - - - - G3 - - - - - - - C3 - - - - - - - . .' },
  die: { bpm: 150, lead: 'E5 D#5 D5 C#5 C5 - - . G4 - - . C4 - - - - - - .' },
  gameover: { bpm: 110, lead: 'G4 - - E4 - - C4 - - - . D4 - E4 - C4 - - - - - - - .', bass: 'C3 - - - - - - - - - - G2 - - - C2 - - - - - - - .' },
  ending: { bpm: 170, lead: 'C5 . E5 . G5 . C6 . E6 - - . D6 . C6 . D6 - - - - - - . G5 . A5 . B5 . C6 - - - - - - - - - - - . . . .', bass: 'C3 . . . C3 . . . A2 . . . A2 . . . G2 . . . G2 . . . F2 . . . G2 . . . C3 - - - - - - - - - - - . . . .' },
};

function tokens(str) {
  return str.trim().split(/\s+/);
}

export function songBars() {
  return Object.fromEntries(Object.entries(SONGS).map(([k, v]) => [k, [tokens(v.lead).length / 16, v.chords.split(' ').length]]));
}

function compileSong(s) {
  const bars = s.chords.split(' ');
  const drumBar = tokens(DRUMS[s.drums]);
  return {
    bpm: s.bpm,
    channels: [
      { kind: 'lead', steps: tokens(s.lead) },
      { kind: 'arp', steps: bars.flatMap(arpBar).map(String) },
      { kind: 'bass', steps: bars.flatMap(bassBar).map(String) },
      { kind: 'drums', steps: bars.flatMap(() => drumBar) },
    ],
  };
}

function compileJingle(j) {
  const channels = [{ kind: 'lead', steps: tokens(j.lead) }];
  if (j.bass) channels.push({ kind: 'bass', steps: tokens(j.bass) });
  return { bpm: j.bpm, channels };
}

const MASTER_VOL = 0.9;

const VOICE = {
  lead: { wave: 'pulse25', vol: 0.11 },
  arp: { wave: 'pulse12', vol: 0.035 },
  bass: { wave: 'triangle', vol: 0.22 },
};

class Chip {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.song = null;
    this.tempo = 1;
    this.paused = false;
    this.compiled = {};
    this.events = [];
  }

  // Call from inside a user gesture (tap, click or key press). On iOS the
  // context is only reliably allowed to start if it is created, resumed and
  // made to play something during a gesture the browser accepts, and Safari's
  // context can also be 'interrupted' (after a call or app switch), not just
  // 'suspended'. So keep trying on every gesture until it is running.
  // Safari's Web Audio follows the iPhone's silent switch by default.
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.build(new AC());
    }
    if (this.ctx.state !== 'running') {
      const p = this.ctx.resume();
      if (p && p.catch) p.catch(() => {});
      const src = this.ctx.createBufferSource();
      src.buffer = this.ctx.createBuffer(1, 1, this.ctx.sampleRate);
      src.connect(this.ctx.destination);
      src.start(0);
    }
  }

  // Outside a gesture (e.g. returning to the tab) we can only ask nicely.
  resume() {
    if (this.ctx && this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
  }

  build(c) {
    this.ctx = c;
    // A limiter lets the mix be loud enough for phone speakers without clipping.
    const limiter = c.createDynamicsCompressor();
    limiter.threshold.value = -12;
    limiter.knee.value = 6;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.15;
    limiter.connect(c.destination);
    this.master = c.createGain();
    this.master.gain.value = this.muted ? 0 : MASTER_VOL;
    this.master.connect(limiter);
    this.music = c.createGain();
    this.music.gain.value = 0.7;
    this.music.connect(this.master);
    this.sfxBus = c.createGain();
    this.sfxBus.gain.value = 0.9;
    this.sfxBus.connect(this.master);
    this.waves = { pulse12: this.pulse(0.125), pulse25: this.pulse(0.25), pulse50: this.pulse(0.5) };
    const len = c.sampleRate;
    this.noise = c.createBuffer(1, len, c.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    setInterval(() => this.schedule(), 25);
    // Start whatever music was asked for before sound was allowed.
    if (this.pending) {
      const name = this.pending;
      this.pending = null;
      this.playSong(name);
    }
  }

  get ready() {
    return !!this.ctx && this.ctx.state === 'running';
  }

  pulse(duty) {
    const n = 32, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) {
      re[k] = Math.sin(2 * Math.PI * k * duty) / (k * Math.PI);
      im[k] = (1 - Math.cos(2 * Math.PI * k * duty)) / (k * Math.PI);
    }
    return this.ctx.createPeriodicWave(re, im);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : MASTER_VOL;
    return this.muted;
  }

  tone(t, freq, dur, wave, vol, dest, slideTo) {
    const c = this.ctx;
    const o = c.createOscillator();
    if (this.waves[wave]) o.setPeriodicWave(this.waves[wave]);
    else o.type = wave;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.005);
    g.gain.setValueAtTime(vol * 0.8, t + Math.max(0.01, dur * 0.6));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  hiss(t, dur, vol, dest, filter = 'highpass', freq = 5000) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = filter;
    f.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(dest);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  drum(kind, t) {
    if (kind === 'k') this.tone(t, 160, 0.12, 'sine', 0.5, this.music, 40);
    else if (kind === 's') this.hiss(t, 0.12, 0.25, this.music, 'bandpass', 1800);
    else if (kind === 'h') this.hiss(t, 0.035, 0.12, this.music);
  }

  // ---- music

  playSong(name) {
    if (!this.ctx) {
      this.pending = name;
      return;
    }
    if (this.song && this.song.name === name && this.song.loop) return;
    if (!this.compiled[name]) this.compiled[name] = compileSong(SONGS[name]);
    this.start(name, this.compiled[name], true);
  }

  playJingle(name) {
    if (!this.ctx) return;
    this.start(name, compileJingle(JINGLES[name]), false);
  }

  start(name, data, loop) {
    this.tempo = 1;
    this.song = { name, data, loop, step: 0, next: this.ctx.currentTime + 0.06 };
    this.song.length = Math.max(...data.channels.map(c => c.steps.length));
  }

  // Remember recent notes so the music box can draw a visualiser.
  note(t, kind, value) {
    this.events.push({ t, kind, value });
    if (this.events.length > 64) this.events.shift();
  }

  // Notes that have actually sounded within the last `window` seconds.
  recent(window = 0.5) {
    if (!this.ctx) return [];
    const now = this.ctx.currentTime;
    return this.events.filter(e => e.t <= now && now - e.t < window).map(e => ({ ...e, age: (now - e.t) / window }));
  }

  stopMusic() {
    this.song = null;
    this.pending = null;
  }

  schedule() {
    const s = this.song;
    if (!s || !this.ready || this.paused) return;
    const stepDur = 60 / s.data.bpm / 4 / this.tempo;
    if (s.next < this.ctx.currentTime - 0.2) s.next = this.ctx.currentTime + 0.02;
    while (s.next < this.ctx.currentTime + 0.12) {
      if (s.step >= s.length) {
        if (!s.loop) { this.song = null; return; }
        s.step = 0;
      }
      for (const ch of s.data.channels) {
        const i = s.step % ch.steps.length;
        const tok = ch.steps[i];
        if (ch.kind === 'drums') {
          if (tok !== '.') {
            this.drum(tok, s.next);
            this.note(s.next, ch.kind, tok);
          }
          continue;
        }
        const m = midiOf(tok);
        if (m == null) continue;
        let hold = 1;
        while (ch.steps[(i + hold) % ch.steps.length] === '-' && hold < 16) hold++;
        const v = VOICE[ch.kind];
        this.tone(s.next, hz(m), hold * stepDur * 0.92, v.wave, v.vol, this.music);
        this.note(s.next, ch.kind, m);
      }
      s.step++;
      s.next += stepDur;
    }
  }

  // ---- sound effects

  sfx(name) {
    if (!this.ready) return;
    const t = this.ctx.currentTime + 0.01, out = this.sfxBus;
    const seq = (notes, step, wave = 'pulse50', vol = 0.12) =>
      notes.forEach((n, i) => this.tone(t + i * step, hz(midiOf(n)), step * 1.1, wave, vol, out));
    switch (name) {
      case 'jump': this.tone(t, 280, 0.16, 'pulse25', 0.13, out, 720); break;
      case 'diamond':
        this.tone(t, hz(midiOf('B5')), 0.06, 'pulse50', 0.1, out);
        this.tone(t + 0.06, hz(midiOf('E6')), 0.28, 'pulse50', 0.1, out);
        break;
      case 'stomp':
        this.tone(t, 500, 0.12, 'square', 0.12, out, 90);
        this.hiss(t, 0.08, 0.2, out, 'lowpass', 2000);
        break;
      case 'bump': this.tone(t, 160, 0.09, 'triangle', 0.35, out, 70); break;
      case 'break':
        this.hiss(t, 0.3, 0.4, out, 'lowpass', 1200);
        this.tone(t, 200, 0.2, 'square', 0.08, out, 50);
        break;
      case 'appear': this.tone(t, 220, 0.35, 'pulse25', 0.11, out, 880); break;
      case 'power': seq(['C5', 'E5', 'G5', 'C6', 'E6', 'G6', 'C7'], 0.05, 'pulse25'); break;
      case 'berry': seq(['G5', 'B5', 'D6', 'G6', 'D6', 'G6', 'B6', 'D7'], 0.045, 'pulse25'); break;
      case 'oneup': seq(['G5', 'B5', 'D6', 'G6', 'B6', 'D7'], 0.08, 'pulse50', 0.1); break;
      case 'hurt': this.tone(t, 700, 0.45, 'pulse25', 0.13, out, 120); break;
      case 'spring': this.tone(t, 180, 0.3, 'triangle', 0.4, out, 1000); break;
      case 'kick': this.tone(t, 900, 0.1, 'square', 0.1, out, 300); break;
      case 'pause': seq(['E6', 'C6', 'E6', 'C6'], 0.06, 'pulse50', 0.1); break;
      case 'tick': this.tone(t, 1400, 0.03, 'pulse50', 0.05, out); break;
      case 'select': this.tone(t, 900, 0.06, 'pulse25', 0.1, out, 1300); break;
      case 'checkpoint': seq(['C6', 'E6', 'G6', 'C7'], 0.07, 'pulse25', 0.1); break;
      case 'flag': this.tone(t, 1200, 0.9, 'pulse25', 0.1, out, 200); break;
    }
  }
}

export const audio = new Chip();
