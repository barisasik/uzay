import { bodyDesc, bodyName, locale, t } from '../i18n';
import { SPEEDS } from '../time';
import type { BodyView } from '../scene/solarSystem';

const AU_MILLION_KM = 149.5978707;

export interface UIHandlers {
  onSpeed(value: number): void;
  onToday(): void;
  onLabels(visible: boolean): void;
  onClose(): void;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

export function createUI(h: UIHandlers, initialSpeed: number) {
  const loc = locale();
  const dateFmt = new Intl.DateTimeFormat(loc, { dateStyle: 'long', timeStyle: 'short' });
  const n = (v: number, d = 2) => new Intl.NumberFormat(loc, { maximumFractionDigits: d }).format(v);

  // --- Üst çubuk ---
  const bar = el('div', 'topbar');
  const date = el('div', 'date');
  const speeds = el('div', 'group');
  for (const s of SPEEDS) {
    const b = el('button', s.value === initialSpeed ? 'active' : '', t(s.key));
    b.onclick = () => {
      speeds.querySelectorAll('button').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      h.onSpeed(s.value);
    };
    speeds.append(b);
  }
  const today = el('button', '', t('ui.today'));
  today.onclick = h.onToday;
  const labels = el('button', 'active', t('ui.labels'));
  labels.onclick = () => h.onLabels(labels.classList.toggle('active'));
  bar.append(date, speeds, today, labels);

  // --- Bilgi paneli ---
  const panel = el('aside', 'panel hidden');
  const close = el('button', 'close', '×');
  close.title = t('ui.close');
  close.onclick = h.onClose;
  const title = el('h2');
  const rows = el('dl');
  const desc = el('p');
  panel.append(close, title, rows, desc);

  document.body.append(bar, panel);

  let distanceCell: HTMLElement | null = null;
  const row = (label: string, value: string) => {
    const dd = el('dd', '', value);
    rows.append(el('dt', '', label), dd);
    return dd;
  };

  return {
    setDate(ms: number) {
      date.textContent = dateFmt.format(ms);
    },
    show(v: BodyView) {
      title.textContent = bodyName(v.id);
      desc.textContent = bodyDesc(v.id);
      rows.replaceChildren();
      distanceCell = null;
      row(t('info.diameter'), `${n(v.radiusKm * 2, 0)} ${t('unit.km')}`);
      if (v.planet) {
        distanceCell = row(t('info.distance'), '');
        const d = v.planet.periodDays;
        row(t('info.period'), `${n(d)} ${t('unit.day')} (${n(d / 365.25)} ${t('unit.year')})`);
      } else {
        row(t('info.type'), t('body.sun.type'));
      }
      this.updateDistance(v);
      panel.classList.remove('hidden');
    },
    updateDistance(v: BodyView) {
      if (distanceCell)
        distanceCell.textContent = `${n(v.distanceAU, 3)} ${t('unit.au')} · ${n(v.distanceAU * AU_MILLION_KM, 1)} ${t('unit.millionKm')}`;
    },
    hide() {
      panel.classList.add('hidden');
    },
  };
}
