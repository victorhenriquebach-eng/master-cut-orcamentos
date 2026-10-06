// Future vision providers return candidates and doubts, never budget-ready pieces.
export const manualAnalysisProvider = { async analyze() { return { candidates: [], doubts: [], mode: 'manual' }; } };
export const SIDES = [['top', 'Superior'], ['bottom', 'Inferior'], ['left', 'Esquerda'], ['right', 'Direita']];
export function defaultEdges(type, placement) {
  const all = type === 'Porta' || (type === 'Tamponamento' && placement === 'external');
  return Object.fromEntries(SIDES.map(([side]) => [side, all]));
}
export function readyForBudget(piece) {
  return piece.included !== false && piece.confirmed === true && Number(piece.width) > 0 && Number(piece.height) > 0 && Number.isInteger(Number(piece.quantity)) && Number(piece.quantity) > 0 && !!piece.material?.trim();
}
export function normalizeRegion(a, b) {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) };
}
