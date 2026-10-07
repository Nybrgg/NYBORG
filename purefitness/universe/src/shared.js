// Data and timing shared by the DOM layer (pf-universe.js) and the WebGL world.
// The DOM layer imports `chapterAt`, `environments` and `ROUTE_VIEWPORTS`.
import environmentData from './environments.json';

/** Number of viewport heights the whole scroll tour spans. */
export const ROUTE_VIEWPORTS = 35;
export const CHAPTERS = 5;

/** Local stop positions inside a chapter (0..1), used by the menu and the next button. */
export const STOPS = { arrival: 0.012, enter: 0.38, room: 0.43, equipment: 0.68, finish: 0.87 };

export const environments = environmentData;

/**
 * Maps tour progress (0..1) to the chapter (building) and the phase inside it:
 * 0 arrival, 1 room, 2 equipment, 3 finish (last chapter only), 4 in transit.
 */
export function chapterAt(progress) {
  const scaled = Math.min(CHAPTERS - 1e-6, Math.max(0, progress * CHAPTERS));
  const chapter = Math.floor(scaled);
  const local = scaled - chapter;
  const phase = local < 0.3 ? 0 : local < 0.56 ? 1 : local < 0.8 ? 2 : chapter === CHAPTERS - 1 ? 3 : 4;
  return { chapter, phase, local };
}

/** Critically damped spring step towards `target`; keeps scroll-driven motion smooth. */
export function springStep(value, velocity, target, dt, stiffness = 12) {
  const offset = value - target;
  const k = velocity + stiffness * offset;
  const decay = Math.exp(-stiffness * dt);
  const next = target + (offset + k * dt) * decay;
  if ((target - value) * (target - next) < 0) return { value: target, velocity: 0 };
  const nextVelocity = (velocity - stiffness * k * dt) * decay;
  if (Math.abs(target - next) < 1e-6 && Math.abs(nextVelocity) < 1.5e-5) return { value: target, velocity: 0 };
  return { value: Math.max(0, Math.min(1, next)), velocity: nextVelocity };
}
