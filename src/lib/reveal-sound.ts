export interface RevealTone {
  start: number;
  frequency: number;
  endFrequency: number;
  duration: number;
  type: OscillatorType;
  gain: number;
}

export interface RevealNoise {
  start: number;
  duration: number;
  gain: number;
  lowpass: number;
}

export interface RevealSoundRecipe {
  tones: RevealTone[];
  noise: RevealNoise;
  duration: number;
}

const NEAR_ZERO = 0.0001;

export function revealSoundRecipe(wished: boolean): RevealSoundRecipe {
  const tones: RevealTone[] = [
    { start: 0, frequency: 140, endFrequency: 48, duration: 0.05, type: "triangle", gain: 0.14 },
    { start: 0, frequency: 540, endFrequency: 340, duration: 0.07, type: "sine", gain: 0.07 },
  ];
  if (wished) tones.push({ start: 0.055, frequency: 780, endFrequency: 620, duration: 0.09, type: "sine", gain: 0.09 });
  const noise = { start: 0, duration: 0.12, gain: 0.055, lowpass: 1000 };
  const duration = Math.max(noise.duration, ...tones.map((tone) => tone.start + tone.duration));
  return { tones, noise, duration };
}

function tone(ctx: AudioContext, recipe: RevealTone, when: number) {
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  const start = when + recipe.start;
  osc.type = recipe.type;
  osc.frequency.setValueAtTime(recipe.frequency, start);
  osc.frequency.exponentialRampToValueAtTime(recipe.endFrequency, start + recipe.duration);
  amp.gain.setValueAtTime(recipe.gain, start);
  amp.gain.exponentialRampToValueAtTime(NEAR_ZERO, start + recipe.duration);
  osc.connect(amp);
  amp.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + recipe.duration + 0.02);
}

function noise(ctx: AudioContext, recipe: RevealNoise, when: number) {
  const length = Math.max(1, Math.floor(ctx.sampleRate * recipe.duration));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) data[index] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = recipe.lowpass;
  const amp = ctx.createGain();
  const start = when + recipe.start;
  amp.gain.setValueAtTime(recipe.gain, start);
  amp.gain.exponentialRampToValueAtTime(NEAR_ZERO, start + recipe.duration);
  source.connect(filter);
  filter.connect(amp);
  amp.connect(ctx.destination);
  source.start(start);
  source.stop(start + recipe.duration + 0.02);
}

let shared: AudioContext | null = null;

export function playRevealSound(wished: boolean) {
  if (typeof window === "undefined") return;
  const Context = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Context) return;
  try {
    if (!shared) shared = new Context();
    if (shared.state === "suspended") void shared.resume();
    const recipe = revealSoundRecipe(wished);
    const when = shared.currentTime;
    for (const item of recipe.tones) tone(shared, item, when);
    noise(shared, recipe.noise, when);
  } catch {
    // A browser without audio still reveals the card.
  }
}
