import { bodyDesc, bodyName, locale, t } from '../i18n';
import { SPEEDS } from '../time';
import { BODY_ORDER, type BodyView } from '../scene/solarSystem';

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

/** Dokular yüklenene kadar ekranı kaplar. */
export function createLoader() {
  const pct = new Intl.NumberFormat(locale(), { style: 'percent' });
  const root = el('div', 'loader');
  const fill = el('div', 'fill');
  const bar = el('div', 'bar');
  bar.append(fill);
  const text = el('div', 'text', t('ui.loading'));
  root.append(el('h1', '', t('app.title')), bar, text);
  document.body.append(root);
  return {
    progress(f: number) {
      fill.style.width = `${f * 100}%`;
      text.textContent = `${t('ui.loading')} ${pct.format(f)}`;
    },
    done() {
      root.classList.add('done');
      setTimeout(() => root.remove(), 700);
    },
  };
}

/** Sol üst: gök cisimleri listesi. "Sırayla" (Güneş'ten dışa) ya da "Yakınlık" (referansa en yakından). */
export function createBodyList(views: BodyView[], onSelect: (v: BodyView) => void) {
  const n = (v: number, d = 2) => new Intl.NumberFormat(locale(), { maximumFractionDigits: d }).format(v);
  const fmtDist = (au: number) => {
    const km = au * AU_MILLION_KM * 1e6;
    return km < 1.5e7 ? `${n(km / 1e6)} ${t('unit.millionKm')}` : `${n(au)} ${t('unit.au')}`;
  };

  let mode: 'order' | 'near' = 'order';
  let selectedId: string | null = null;

  const root = el('nav', 'bodylist');
  const head = el('div', 'head');
  const collapseBtn = el('button', 'collapse');
  head.append(el('span', 'title', t('list.title')), collapseBtn);
  const STORE_KEY = 'uzay.bodylist.collapsed';
  const setCollapsed = (c: boolean) => {
    root.classList.toggle('collapsed', c);
    collapseBtn.textContent = c ? '▾' : '▴';
    collapseBtn.title = c ? t('list.expand') : t('list.collapse');
    try { localStorage.setItem(STORE_KEY, c ? '1' : '0'); } catch { /* depolama kapalı olabilir */ }
  };
  head.onclick = () => setCollapsed(!root.classList.contains('collapsed'));
  const tabs = el('div', 'tabs');
  const tabOrder = el('button', 'active', t('list.order'));
  const tabNear = el('button', '', t('list.near'));
  tabs.append(tabOrder, tabNear);
  const refLine = el('div', 'ref');
  const ul = el('ul');
  root.append(head, tabs, refLine, ul);
  document.body.append(root);
  let startCollapsed = false;
  try { startCollapsed = localStorage.getItem(STORE_KEY) === '1'; } catch { /* yok say */ }
  setCollapsed(startCollapsed);

  const ordered = BODY_ORDER.map((id) => views.find((v) => v.id === id)!);
  const rows = new Map<BodyView, { li: HTMLLIElement; dist: HTMLElement }>();
  for (const v of ordered) {
    const li = el('li', v.parent ? 'child' : '');
    const btn = el('button');
    const dot = el('span', 'dot');
    dot.style.background = `#${v.color.toString(16).padStart(6, '0')}`;
    const dist = el('span', 'dist');
    if (v.parent) btn.append(el('span', 'branch', '↳'));
    btn.append(dot, el('span', 'name', bodyName(v.id)), dist);
    btn.onclick = () => onSelect(v);
    li.append(btn);
    ul.append(li);
    rows.set(v, { li, dist });
  }

  const setMode = (m: typeof mode) => {
    mode = m;
    tabOrder.classList.toggle('active', m === 'order');
    tabNear.classList.toggle('active', m === 'near');
    root.classList.toggle('near', m === 'near');
    if (m === 'order') for (const v of ordered) ul.append(rows.get(v)!.li);
  };
  tabOrder.onclick = () => setMode('order');
  tabNear.onclick = () => setMode('near');

  return {
    setSelected(id: string | null) {
      selectedId = id;
      for (const [v, r] of rows) r.li.classList.toggle('selected', v.id === id);
    },
    /** Yakınlık modunda mesafeleri ve sırayı tazeler (referans: seçili gövde, yoksa Dünya). */
    update() {
      if (mode !== 'near') return;
      const ref = views.find((v) => v.id === (selectedId ?? 'earth'))!;
      refLine.textContent = `${t('list.reference')}: ${bodyName(ref.id)}`;
      const d = (v: BodyView) => Math.hypot(v.ecl.x - ref.ecl.x, v.ecl.y - ref.ecl.y, v.ecl.z - ref.ecl.z);
      const sorted = [...ordered].sort((a, b) => d(a) - d(b));
      sorted.forEach((v, i) => {
        const r = rows.get(v)!;
        r.dist.textContent = v === ref ? '—' : fmtDist(d(v));
        if (ul.children[i] !== r.li) ul.insertBefore(r.li, ul.children[i] ?? null);
      });
    },
  };
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

  const credits = el('div', 'credits', t('ui.credits'));

  document.body.append(bar, panel, credits);

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
      if (v.kind === 'star') row(t('info.type'), t('body.sun.type'));
      if (v.kind === 'planet') distanceCell = row(t('info.distance'), '');
      if (v.parent) row(t('info.parent'), bodyName(v.parent.id));
      if (v.parentDistanceKm !== null) row(t('info.distanceParent'), `${n(v.parentDistanceKm, 0)} ${t('unit.km')}`);
      if (v.periodDays !== null) {
        const d = v.periodDays;
        row(t('info.period'), `${n(d)} ${t('unit.day')} (${n(d / 365.25)} ${t('unit.year')})`);
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
