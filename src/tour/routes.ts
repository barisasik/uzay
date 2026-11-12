import type { BodyId } from '../data/bodies';
import type { GalaxyId } from '../data/galaxies';
import type { BeltId } from '../scene/belts';

export type RouteStop = { body: BodyId } | { galaxy: GalaxyId } | { belt: BeltId };
export type RouteId = 'inner' | 'giants' | 'edge' | 'galaxies';

/** Hazır rotalar; hepsi istasyondan (Dünya yörüngesi) ya da aracın bulunduğu yerden başlar. */
export const ROUTES: { id: RouteId; stops: RouteStop[] }[] = [
  {
    id: 'inner',
    stops: [{ body: 'moon' }, { body: 'venus' }, { body: 'mercury' }, { body: 'sun' }, { body: 'mars' }, { body: 'phobos' }],
  },
  {
    id: 'giants',
    stops: [
      { body: 'jupiter' }, { body: 'io' }, { body: 'europa' }, { body: 'saturn' }, { body: 'titan' },
      { body: 'uranus' }, { body: 'miranda' }, { body: 'neptune' }, { body: 'triton' },
    ],
  },
  {
    id: 'edge',
    stops: [{ body: 'neptune' }, { body: 'pluto' }, { body: 'charon' }, { belt: 'kuiper' }, { belt: 'oort' }],
  },
  {
    id: 'galaxies',
    stops: [
      { belt: 'oort' }, { galaxy: 'milkyway' }, { galaxy: 'lmc' }, { galaxy: 'smc' }, { galaxy: 'm31' }, { galaxy: 'm33' },
    ],
  },
];
