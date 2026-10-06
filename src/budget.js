export const TYPES = ['Lateral', 'Base', 'Tampo', 'Divisória', 'Prateleira', 'Porta', 'Frente', 'Travessa'];
export function calculateBudget(pieces, prices) {
  const rows = pieces.map(piece => {
    const width = Math.max(0, Number(piece.width) || 0);
    const height = Math.max(0, Number(piece.height) || 0);
    const quantity = Math.max(0, Math.floor(Number(piece.quantity) || 0));
    const edges = piece.edges || {};
    const meters = ((edges.top ? width : 0) + (edges.bottom ? width : 0) + (edges.left ? height : 0) + (edges.right ? height : 0)) * quantity / 1000;
    const cutCost = quantity * Math.max(0, Number(prices.cut) || 0);
    const edgeCost = meters * Math.max(0, Number(prices.edge) || 0);
    return { quantity, meters, cutCost, edgeCost, total: cutCost + edgeCost };
  });
  return rows.reduce((sum, row) => ({ ...sum, quantity: sum.quantity + row.quantity, meters: sum.meters + row.meters, cutCost: sum.cutCost + row.cutCost, edgeCost: sum.edgeCost + row.edgeCost, total: sum.total + row.total }), { rows, quantity: 0, meters: 0, cutCost: 0, edgeCost: 0, total: 0 });
}
