import { useId, useState } from 'react';
import { bodyShape } from './bodyShape';
import { HEIGHT_INCHES, fmt, longDate, metrics, shortDate } from './model';
import type { Entry, MetricId } from './model';

type Region = Exclude<MetricId, 'weight'>;

export default function BodyFigure({ rows }: { rows: Entry[] }) {
  const [date, setDate] = useState(rows[rows.length - 1].date);
  const [showOutline, setShowOutline] = useState(false);
  const [region, setRegion] = useState<Region>('waist');
  const found = rows.findIndex(r => r.date === date);
  const index = found < 0 ? rows.length - 1 : found;
  const row = rows[index];
  const baseline = rows[0];
  const shape = bodyShape(row);
  const baselineShape = bodyShape(baseline);
  const id = useId();
  const ratio = row.shoulders !== null && row.waist !== null ? row.shoulders / row.waist : null;
  const heightRatio = row.waist !== null ? row.waist / HEIGHT_INCHES : null;
  const estimateNames = shape.estimated.map(key => metrics.find(m => m.id === key)!.short.toLowerCase());
  const selectedMetric = metrics.find(m => m.id === region)!;
  const regionGuide = shape.guides[region];
  // The person's right side appears on the viewer's left in a front view.
  const guide = ['arm', 'forearm', 'quad', 'calf'].includes(region)
    ? { x1: -regionGuide.x2, x2: -regionGuide.x1, y: regionGuide.y }
    : regionGuide;
  const comparing = showOutline && baseline.date !== row.date;

  return <section className="panel body-panel" aria-labelledby={`${id}-heading`}>
    <div className="panel-header">
      <div><h2 id={`${id}-heading`}>Your proportions, in view</h2><p>Explore the shape behind your measurements.</p></div>
      <label className="figure-date">Check-in date<select value={row.date} onChange={e => setDate(e.target.value)}>{rows.map(r => <option key={r.date} value={r.date}>{longDate(r.date)}</option>)}</select></label>
    </div>
    <div className="body-layout">
      <div className="body-stage">
        <div className="body-stage-top"><span>PROPORTION STUDY</span><span>FRONT VIEW</span></div>
        <div className="body-legend"><span><i className="body-legend-selected" />{shortDate(row.date)}</span>{comparing && <span><i className="body-legend-baseline" />{shortDate(baseline.date)} outline</span>}</div>
        <svg className="body-drawing" viewBox="-24 -3 48 76" role="img" aria-labelledby={`${id}-title ${id}-description`}>
          <title id={`${id}-title`}>{`Illustrated body proportions for ${longDate(row.date)}`}</title>
          <desc id={`${id}-description`}>{`Fixed height of 70 inches. Torso and limb widths respond to recorded circumferences. ${selectedMetric.label} is highlighted. A symmetric illustrative model, not an exact reconstruction.${estimateNames.length ? ` Missing ${estimateNames.join(', ')} measurements use estimated geometry.` : ''}`}</desc>
          <defs>
            <linearGradient id={`${id}-skin`} gradientUnits="userSpaceOnUse" x1="-15" y1="0" x2="15" y2="0">
              <stop offset="0" stopColor="#8c9fbf" /><stop offset=".23" stopColor="#b6c5db" /><stop offset=".46" stopColor="#e3eaf4" /><stop offset=".64" stopColor="#c8d5e7" /><stop offset="1" stopColor="#8c9fbf" />
            </linearGradient>
            <linearGradient id={`${id}-light`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="70">
              <stop offset="0" stopColor="#fff" stopOpacity=".25" /><stop offset=".4" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#6f86ac" stopOpacity=".16" />
            </linearGradient>
            <radialGradient id={`${id}-halo`}><stop offset="0" stopColor="#e7edf7" stopOpacity=".9" /><stop offset="1" stopColor="#f7f9fc" stopOpacity="0" /></radialGradient>
            <clipPath id={`${id}-clip`}><path d={shape.path} /></clipPath>
          </defs>
          <ellipse cx="0" cy="32" rx="22" ry="36" fill={`url(#${id}-halo)`} />
          <g stroke="#dce3ef" strokeWidth=".1" fill="none">
            <path d="M -19 0 H -17 M -18 0 V 70 M -19 70 H -17" />
            {[0, 10, 20, 30, 40, 50, 60, 70].map(y => <path key={y} d={`M -18 ${y} h 0.7 M 17.3 ${y} h .7`} />)}
            <path d="M 0 -1 V 71" strokeDasharray=".3 1" />
          </g>
          <ellipse cx="0" cy="70.8" rx="8" ry=".7" fill="#b7c4d8" opacity=".2" />
          <path d={shape.path} fill={`url(#${id}-skin)`} stroke="#8295b3" strokeWidth=".13" strokeLinejoin="round" />
          <path d={shape.path} fill={`url(#${id}-light)`} />
          <g clipPath={`url(#${id}-clip)`}>
            <path d={shape.details} fill="none" stroke="#7289a9" strokeWidth=".15" opacity=".4" strokeLinecap="round" />
            <path d="M -.7 6.7 Q 0 7 .7 6.7 M 0 22.3 V 25.5" fill="none" stroke="#8296b3" strokeWidth=".12" opacity=".3" strokeLinecap="round" />
            <ellipse cx="0" cy="30.5" rx=".16" ry=".26" fill="#8194b0" opacity=".45" />
            <rect x={guide.x1 - .15} y={guide.y - 1.1} width={guide.x2 - guide.x1 + .3} height="2.2" fill="#fff" opacity=".3" />
          </g>
          {comparing && <path className="body-outline" d={baselineShape.path} fill="none" stroke="#b18c62" strokeWidth=".22" strokeDasharray=".55 .55" opacity=".85" strokeLinejoin="round" />}
          <g className="body-measure-guide" stroke="#408c86" strokeWidth=".2" fill="none">
            <path d={`M ${guide.x1} ${guide.y} H ${guide.x2} M ${guide.x1} ${guide.y - .7} V ${guide.y + .7} M ${guide.x2} ${guide.y - .7} V ${guide.y + .7}`} />
            <circle cx={guide.x1} cy={guide.y} r=".3" fill="#f5fbfa" /><circle cx={guide.x2} cy={guide.y} r=".3" fill="#f5fbfa" />
          </g>
        </svg>
        <div className="body-region-caption"><span>{selectedMetric.label}</span><strong>{row[region] === null ? 'Not recorded' : `${fmt(row[region])} in circumference`}</strong></div>
        <div className="body-scale"><span>{HEIGHT_INCHES} in · fixed scale</span><span>Illustrative proportions</span></div>
      </div>
      <div className="body-details">
        <div className="body-details-heading" aria-live="polite"><span className="eyebrow">SELECTED CHECK-IN</span><h3>{longDate(row.date)}</h3><span>{fmt(row.weight)} <small>lb</small></span></div>
        <div className="body-measurements" role="group" aria-label="Highlight a body measurement">{metrics.filter(m => m.id !== 'weight').map(m => <button type="button" key={m.id} className={`body-measurement ${region === m.id ? 'is-active' : ''}`} aria-pressed={region === m.id} onClick={() => setRegion(m.id)}><span className="body-measurement-label"><span className="color-dot" style={{ background: m.color }} />{m.label}</span><span className="body-measurement-value">{fmt(row[m.id])}<small>{row[m.id] === null ? 'not recorded' : 'in'}</small></span></button>)}</div>
        <p className="body-highlight-hint">Select a measurement to locate it on the figure.</p>
        <div className="body-ratios" aria-live="polite"><div><span>Shoulders / waist</span><strong>{fmt(ratio, 3)}</strong></div><div><span>Waist / height</span><strong>{fmt(heightRatio, 3)}</strong></div></div>
        <label className="body-compare-toggle"><input type="checkbox" checked={showOutline} onChange={e => setShowOutline(e.target.checked)} />Compare with first check-in</label>
        {showOutline && <p className="body-outline-note">Dashed outline: {longDate(baseline.date)}.{baseline.date === row.date ? ' Select a later date to compare.' : ''}{baselineShape.estimated.length ? ' Includes estimated regions for missing measurements.' : ''}</p>}
      </div>
    </div>
    <div className="body-timeline"><label htmlFor={`${id}-timeline`}>Explore check-ins <span>{index + 1} of {rows.length}</span></label><input id={`${id}-timeline`} aria-label="Figure check-in" aria-valuetext={longDate(row.date)} type="range" min="0" max={Math.max(0, rows.length - 1)} value={index} disabled={rows.length < 2} onChange={e => setDate(rows[Number(e.target.value)].date)} /><div><span>{shortDate(rows[0].date)}</span><span>{shortDate(rows[rows.length - 1].date)}</span></div></div>
    <p className="body-method">An illustration of your measurements, with assumed body depth, pose, and segment lengths. Right-side limb measurements are mirrored. Circumferences cannot determine an exact body shape.{estimateNames.length > 0 && <span className="body-missing"> Unrecorded: {estimateNames.join(', ')}. The drawing uses estimated geometry for these regions.</span>}</p>
  </section>;
}
