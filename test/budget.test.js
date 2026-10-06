import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateBudget } from '../src/budget.js';
const prices = { cut: 4.5, edge: 4.5 };
test('converts millimeters to meters and multiplies edges by quantity', () => {
  const result = calculateBudget([{ width: 600, height: 800, quantity: 2, edges: { top: true, bottom: true, left: true, right: true } }], prices);
  assert.equal(result.quantity, 2);
  assert.equal(result.meters, 5.6);
  assert.equal(result.cutCost, 9);
  assert.ok(Math.abs(result.total - 34.2) < 1e-9);
});
test('uses height for vertical edges and width for horizontal edges', () => {
  const result = calculateBudget([{ width: 400, height: 900, quantity: 3, edges: { top: true, left: true } }], { cut: 5, edge: 2 });
  assert.equal(result.meters, 3.9);
  assert.equal(result.total, 22.8);
});
test('no edges charges only cuts; empty budget is zero', () => {
  assert.equal(calculateBudget([{ width: 500, height: 500, quantity: 4, edges: {} }], prices).total, 18);
  assert.equal(calculateBudget([], prices).total, 0);
});
