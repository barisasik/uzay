import type { Key } from './i18n';

const DAY_S = 86_400;

export const SPEEDS: { key: Key; value: number }[] = [
  { key: 'speed.pause', value: 0 },
  { key: 'speed.real', value: 1 },
  { key: 'speed.day', value: DAY_S },
  { key: 'speed.month', value: DAY_S * 30.44 },
  { key: 'speed.year', value: DAY_S * 365.25 },
];

/** Simülasyon saati: gerçek zamanın kaç katı aktığı = speed (sim-saniye / gerçek-saniye). */
export const simClock = {
  ms: Date.now(),
  speed: DAY_S,
  tick(dtSeconds: number) {
    this.ms += dtSeconds * 1000 * this.speed;
  },
  reset() {
    this.ms = Date.now();
  },
};
