import { it } from 'node:test';
import assert from 'node:assert/strict';
import { bodyShape } from './bodyShape.ts';
import { parseMeasurements } from './model.ts';

const row = parseMeasurements(`Date,Weight (lb),Waist at navel (in),Shoulders (in),Right arm (in),Right forearm (in),Right quad (in),Right calf (in),Glutes (in)
2026-11-21,196,35.75,51,15.75,12.25,24,14.1,41.75`)[0];

it('changes the selected region while preserving independent measurements and height', () => {
  const before = bodyShape(row);
  const after = bodyShape({ ...row, waist: 39 });
  assert.ok(after.widths.waist > before.widths.waist);
  assert.equal(after.widths.shoulders, before.widths.shoulders);
  for (const region of ['arm', 'forearm', 'quad', 'calf', 'glutes'] as const) {
    assert.equal(after.widths[region], before.widths[region]);
  }
  assert.notEqual(after.path, before.path);
});

it('reports missing regions without changing the recorded measurements', () => {
  const missing = { ...row, glutes: null, calf: null };
  const shape = bodyShape(missing);
  assert.deepEqual(shape.estimated, ['glutes', 'calf']);
  assert.equal(missing.glutes, null);
  assert.equal(missing.calf, null);
  assert.ok(Object.values(shape.widths).every(w => Number.isFinite(w) && w > 0));
  assert.ok(!/NaN|Infinity/.test(shape.path));
});
