const test = require('node:test');
const assert = require('node:assert/strict');
const { CONTROL_POINTS, COEFFICIENTS, AREA_MATRIX, DEFAULT_POLICY } = require('../dist/defaults');
const { quotePdr, interpolateControlPoints, equivalentDiameter, bilinearPrice, snapAdjust } = require('../dist/pricing');

function config() {
  return {
    controlPoints: CONTROL_POINTS,
    coefficients: COEFFICIENTS,
    matrix: AREA_MATRIX,
    adjustMin: DEFAULT_POLICY.adjustMin,
    adjustMax: DEFAULT_POLICY.adjustMax,
    adjustStep: DEFAULT_POLICY.adjustStep,
    priceRoundTo: 50,
  };
}

function baseInput(overrides = {}) {
  return {
    shape: 'circle',
    diameterMm: 20,
    count: 1,
    hailKey: 'none',
    complexityKey: 'standard',
    materialKey: 'steel',
    carClassKey: 'b',
    coatingKey: 'factory',
    adjustPercent: 0,
    ...overrides,
  };
}

test('exact control point stays on the knot', () => {
  const hit = interpolateControlPoints(CONTROL_POINTS, 20);
  assert.equal(hit.price, 1800);
  assert.equal(hit.clamped, false);
});

test('smoothstep midpoint is linear, quarter is flatter than linear', () => {
  const mid = interpolateControlPoints(CONTROL_POINTS, 25);
  assert.equal(mid.price, 2200);
  const quarter = interpolateControlPoints(CONTROL_POINTS, 22);
  const linear = 1800 + 800 * 0.2;
  assert.ok(quarter.price < linear);
  assert.ok(quarter.price > 1800);
});

test('diameters outside the scale clamp to the ends', () => {
  assert.equal(interpolateControlPoints(CONTROL_POINTS, 1).clamped, true);
  assert.equal(interpolateControlPoints(CONTROL_POINTS, 1).price, 700);
  assert.equal(interpolateControlPoints(CONTROL_POINTS, 400).price, 20000);
});

test('oval uses the geometric-mean equivalent diameter', () => {
  assert.equal(equivalentDiameter(40, 10), 20);
  const quote = quotePdr(baseInput({ shape: 'oval', widthMm: 40, heightMm: 10, diameterMm: undefined }), config());
  assert.equal(quote.equivalentDiameterMm, 20);
  assert.equal(quote.basePrice, 1800);
  assert.equal(quote.unitPrice, 1800);
});

test('stripe matrix returns the corner cell and interpolates inside', () => {
  const corner = bilinearPrice(AREA_MATRIX.widths, AREA_MATRIX.lengths, AREA_MATRIX.prices, 15, 80);
  assert.equal(corner.price, 900);
  const inside = bilinearPrice(AREA_MATRIX.widths, AREA_MATRIX.lengths, AREA_MATRIX.prices, 22, 120);
  assert.ok(inside.price > 900 && inside.price < 2200);
  const clamped = bilinearPrice(AREA_MATRIX.widths, AREA_MATRIX.lengths, AREA_MATRIX.prices, 5, 2000);
  assert.equal(clamped.clamped, true);
  assert.equal(clamped.price, AREA_MATRIX.prices[0][4]);
});

test('coefficients, slider snap and rounding stack in a stable order', () => {
  const quote = quotePdr(
    baseInput({
      diameterMm: 22,
      carClassKey: 'c',
      materialKey: 'aluminum',
      adjustPercent: 12,
      count: 2,
    }),
    config(),
  );
  assert.equal(quote.adjustPercent, 10);
  assert.equal(snapAdjust(12, -20, 40, 5), 10);
  assert.ok(quote.unitPrice % 50 === 0);
  assert.equal(quote.lineTotal, quote.unitPrice * 2);
  assert.ok(quote.formulaLines.some((line) => line.startsWith('Итого позиция')));
});

test('hail count multiplies the rounded unit price', () => {
  const single = quotePdr(baseInput({ diameterMm: 10, hailKey: 'dense', count: 1 }), config());
  const pack = quotePdr(baseInput({ diameterMm: 10, hailKey: 'dense', count: 8 }), config());
  assert.equal(pack.unitPrice, single.unitPrice);
  assert.equal(pack.lineTotal, single.unitPrice * 8);
  assert.ok(single.unitPrice > 1000);
});
