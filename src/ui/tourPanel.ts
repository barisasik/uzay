import { locale, t } from '../i18n';
import type { ShipView, TourStatus } from '../tour/tour';

const C_KMS = 299_792.458;
const AU_KM = 149_597_870.7;
const LY_KM = 9_460_730_472_580.8;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

export interface TourPanelHandlers {
  onStart(routeId: string): void;
  onPause(): void;
  onSpeed(m: number): void;
  onView(v: ShipView): void;
  onHome(): void;
}

const SPEEDS = [0.5, 1, 2, 4];

/** Uzay aracı paneli: rota seçimi, başlat/duraklat, hız, görünüm, istasyona dönüş ve gösterge. */
export function createTourPanel(routes: { id: string; name: string }[], h: TourPanelHandlers) {
  const loc = locale();
  const n = (v: number, d = 1) => new Intl.NumberFormat(loc, { maximumFractionDigits: d }).format(v);
  const words = (v: number) =>
    v >= 1e9 ? `${n(v / 1e9)} ${t('unit.billion')}`
      : v >= 1e6 ? `${n(v / 1e6)} ${t('unit.million')}`
        : v >= 1e4 ? `${n(v / 1e3)} ${t('unit.thousand')}`
          : n(v, v < 10 ? 1 : 0);
  const fmtDist = (units: number) => {
    const km = units * 1000;
    if (km < 0.2 * AU_KM) return `${words(km)} ${t('unit.km')}`;
    if (km < 0.5 * LY_KM) return `${words(km / AU_KM)} ${t('unit.au')}`;
    return `${words(km / LY_KM)} ${t('unit.ly')}`;
  };
  const fmtSpeed = (kms: number) =>
    kms < 0.05 * C_KMS ? `${words(kms)} ${t('tour.kms')}` : t('tour.lightSpeed').replace('{x}', words(kms / C_KMS));

  const root = el('div', 'tour hidden');
  const head = el('div', 'head');
  const close = el('button', 'close', '×');
  close.title = t('ui.close');
  head.append(el('span', 'title', t('tour.title')), close);

  const row1 = el('div', 'row');
  const select = el('select');
  for (const r of routes) {
    const o = el('option', '', r.name);
    o.value = r.id;
    select.append(o);
  }
  select.title = t('tour.route');
  const start = el('button', 'start', t('tour.start'));
  const pause = el('button', 'pause', t('tour.pause'));
  const home = el('button', 'home', t('tour.home'));
  row1.append(select, start, pause, home);

  const row2 = el('div', 'row');
  const speedGroup = el('div', 'group');
  speedGroup.append(el('span', 'lbl', t('tour.speed')));
  const speedBtns = SPEEDS.map((m) => {
    const b = el('button', m === 1 ? 'active' : '', `${n(m)}×`);
    b.onclick = () => h.onSpeed(m);
    speedGroup.append(b);
    return { m, b };
  });
  const viewGroup = el('div', 'group');
  const views: ShipView[] = ['chase', 'cockpit', 'free'];
  const viewBtns = views.map((v) => {
    const b = el('button', '', t(`tour.view.${v}`));
    b.onclick = () => h.onView(v);
    viewGroup.append(b);
    return { v, b };
  });
  row2.append(speedGroup, viewGroup);

  const readout = el('div', 'readout');
  root.append(head, row1, row2, readout);

  start.onclick = () => h.onStart(select.value);
  pause.onclick = h.onPause;
  home.onclick = h.onHome;

  const toggle = el('button', 'tour-toggle', '🚀');
  toggle.title = t('tour.open');
  toggle.setAttribute('aria-label', toggle.title);
  const setOpen = (o: boolean) => {
    root.classList.toggle('hidden', !o);
    toggle.classList.toggle('active', o);
    document.body.classList.toggle('tour-open', o);
  };
  toggle.onclick = () => setOpen(root.classList.contains('hidden'));
  close.onclick = () => setOpen(false);

  let lastText = '';
  return {
    root,
    toggle,
    open: () => setOpen(true),
    update(s: TourStatus, view: ShipView, speed: number) {
      const active = s.phase !== 'docked' || s.returning;
      pause.disabled = !(s.phase === 'leg' || s.phase === 'dwell');
      pause.textContent = s.paused ? t('tour.resume') : t('tour.pause');
      pause.classList.toggle('active', s.paused);
      home.disabled = s.phase === 'docked' && !s.returning;
      start.textContent = active ? t('tour.restart') : t('tour.start');
      for (const { m, b } of speedBtns) b.classList.toggle('active', m === speed);
      for (const { v, b } of viewBtns) b.classList.toggle('active', v === view);

      let text: string;
      const leg = `${s.stop}/${s.stops}`;
      if (s.phase === 'docked') text = t('tour.docked');
      else if (s.phase === 'leg') {
        const where = s.returning ? t('tour.returning') : `${t('tour.toward')}: ${s.target} (${leg})`;
        text = s.paused
          ? `${t('tour.paused')} · ${where} · ${fmtDist(s.distance)}`
          : `${where} · ${fmtDist(s.distance)} · ${fmtSpeed(s.speedKms)} · ${t('tour.eta')} ~${n(Math.max(0, s.eta), 0)} ${t('tour.sec')}`;
      } else if (s.phase === 'dwell') text = `${s.paused ? `${t('tour.paused')} · ` : ''}${s.target} (${leg})`;
      else text = t('tour.done');
      if (text !== lastText) readout.textContent = lastText = text;
    },
  };
}

/** Kokpit penceresi çerçevesi (yalnızca görsel; tıklamaları geçirir). */
export function createCockpitOverlay() {
  const root = el('div', 'cockpit hidden');
  root.innerHTML = `
<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
  <defs>
    <linearGradient id="ckg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4a5366"/><stop offset="0.5" stop-color="#2b3140"/><stop offset="1" stop-color="#151922"/>
    </linearGradient>
  </defs>
  <path fill="url(#ckg)" fill-rule="evenodd"
    d="M0 0H100V100H0Z M9 8 L91 8 L97 28 L97 66 L86 80 L14 80 L3 66 L3 28 Z"/>
  <path fill="none" stroke="#9fb8ff" stroke-opacity="0.6" stroke-width="2" vector-effect="non-scaling-stroke"
    d="M9 8 L91 8 L97 28 L97 66 L86 80 L14 80 L3 66 L3 28 Z"/>
  <path fill="#3a4252" d="M49.3 8 H50.7 L50.7 14 L49.3 14 Z"/>
  <g fill="#7fd4ff" fill-opacity="0.55">
    <rect x="20" y="86" width="9" height="1.2"/><rect x="20" y="89" width="6" height="1.2"/>
    <rect x="71" y="86" width="9" height="1.2"/><rect x="74" y="89" width="6" height="1.2"/>
  </g>
  <g fill="#ffb347" fill-opacity="0.7"><rect x="44" y="86" width="1.6" height="1.6"/><rect x="47" y="86" width="1.6" height="1.6"/><rect x="50" y="86" width="1.6" height="1.6"/><rect x="53" y="86" width="1.6" height="1.6"/></g>
</svg>
<div class="reticle"></div>`;
  document.body.append(root);
  return {
    setVisible(v: boolean) {
      root.classList.toggle('hidden', !v);
    },
  };
}
