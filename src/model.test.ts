import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalized, parseMeasurements, points, ratioPoints, summarize } from './model.ts';

const fixture = `Date,Weight (lb),Waist at navel (in),Shoulders (in),Right arm (in),Right forearm (in),Right quad (in),Right calf (in),Glutes (in)
2026-10-02,213,39,50.75,16,12.5,22,14.5,
2026-10-09,205.4,38,51.25,16,12.25,22,14,
2026-10-24,203.8,37.25,52,16,12.5,23.5,15,42.5
2026-11-21,196,35.75,51,15.75,12.25,24,14.1,41.75`;
const closeTo = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

describe('measurement parsing and calculations', () => {
  const rows = parseMeasurements(fixture);
  it('validates the current repository CSV without fixing its size or contents', () => {
    assert.ok(parseMeasurements(readFileSync(new URL('../data/measurements.csv', import.meta.url), 'utf8')).length > 0);
  });
  it('preserves blank measurements and calculates matching-date ratios', () => {
    assert.equal(rows[0].glutes, null);
    const result = summarize(ratioPoints(rows, 'shoulders', 'glutes'))!;
    assert.equal(result.first.date, '2026-10-24');
    assert.equal(result.count, 2);
    closeTo(result.first.value, 52 / 42.5);
    closeTo(result.last.value, 51 / 41.75);
  });
  it('uses elapsed days instead of assuming weekly entries', () => {
    const result = summarize(points(rows, 'weight'))!;
    assert.equal(result.delta, -17);
    closeTo(result.weekly!, -17 / 50 * 7);
    closeTo(result.pct, -7.9812206573);
  });
  it('normalizes each series from its first measured value', () => {
    const series = normalized(points(rows, 'glutes'));
    assert.equal(series[0].value, null);
    assert.equal(series[2].value, 0);
    closeTo(series[3].value!, (41.75 / 42.5 - 1) * 100);
  });
  it('uses the fixed 70-inch height for both ratio directions', () => {
    closeTo(ratioPoints(rows, 'waist', 'height')[3].value!, 35.75 / 70);
    closeTo(ratioPoints(rows, 'height', 'waist')[3].value!, 70 / 35.75);
  });
  it('sorts input and rejects duplicates, invalid dates, and invalid values', () => {
    assert.equal(parseMeasurements('Date,Weight (lb)\n2026-11-21,196\n2026-10-02,213')[0].weight, 213);
    for (const bad of [
      'Date,Weight (lb)\n2026-02-30,200',
      'Date,Weight (lb)\n2026-11-21,200\n2026-11-21,199',
      'Date,Weight (lb)\n2026-11-21,-200',
      'Date,Weight (lb)\n2026-11-21,abc',
      'Date,Weight (lb)\n2026-11-21,',
      'Date,Unknown\n2026-11-21,200',
      'Date,Weight (lb)\n2026-11-21,200,201',
      'Date,Weight (lb),Weight (lb)\n2026-11-21,200,201',
      'Date,Weight (lb)\n2026-11-21,"200',
    ]) assert.throws(() => parseMeasurements(bad));
  });
  it('reads quoted CSV, BOM, CRLF and TSV', () => {
    assert.equal(parseMeasurements('\uFEFF"Date","Weight (lb)"\r\n"2026-11-21","196"')[0].weight, 196);
    assert.equal(parseMeasurements('Date\tWeight (lb)\n2026-11-21\t196')[0].weight, 196);
    assert.equal(parseMeasurements('Date\tWeight (lb)\tGlutes (in)\n2026-11-21\t196\t\n')[0].glutes, null);
  });
  it('supports a single observation without manufacturing a weekly rate', () => {
    assert.equal(summarize(points(rows.slice(0, 1), 'weight'))!.weekly, null);
    assert.equal(summarize([]), null);
  });
});
