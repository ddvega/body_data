import { useMemo, useState } from 'react';
import { Activity, ArrowDownRight, ArrowUpRight, CalendarDays, Check, ChevronRight, Download, GitBranch, LayoutDashboard, MoveHorizontal, Ruler, SlidersHorizontal, Table2 } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import csv from '../data/measurements.csv?raw';
import { HEIGHT_INCHES, dimensions, favorites, fmt, longDate, metrics, normalized, parseMeasurements, points, ratioPoints, shortDate, signed, summarize } from './model';
import type { Entry, MetricId, Point, RatioId } from './model';
import BodyFigure from './BodyFigure';

type Tab = 'overview' | 'ratios' | 'compare' | 'data';
type Series = { id: string; label: string; color: string; data: Point[] };
const nav = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'ratios', label: 'Proportions', icon: MoveHorizontal },
  { id: 'compare', label: 'Compare dates', icon: CalendarDays },
  { id: 'data', label: 'Measurement log', icon: Table2 },
] as const;
const ratioLabel = (id: RatioId) => dimensions.find(m => m.id === id)!.label;
function Spark({ data, color = '#5266d5' }: { data: Point[]; color?: string }) {
  const measured = data.filter(p => p.value !== null);
  if (measured.length < 2) return <span className="spark-empty">—</span>;
  const low = Math.min(...measured.map(p => p.value!));
  const high = Math.max(...measured.map(p => p.value!));
  const start = data[0].time, duration = data[data.length - 1].time - start || 1;
  let gap = true;
  const path = data.map(p => {
    if (p.value === null) { gap = true; return ''; }
    const command = gap ? 'M' : 'L'; gap = false;
    return `${command}${2 + (p.time - start) / duration * 92},${29 - (p.value - low) / (high - low || 1) * 25}`;
  }).join(' ');
  return <svg className="spark" viewBox="0 0 96 34" aria-hidden="true"><path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function TrendChart({ series, percent = false, ratio = false }: { series: Series[]; percent?: boolean; ratio?: boolean }) {
  const dates = [...new Set(series.flatMap(s => s.data.map(p => p.time)))].sort((a, b) => a - b);
  const bySeries = series.map(s => new Map(s.data.map(p => [p.time, p.value])));
  const data = dates.map(time => Object.fromEntries([['time', time], ...series.map((s, i) => [s.id, bySeries[i].get(time) ?? null])]));
  const available = series.some(s => s.data.some(p => p.value !== null));
  if (!available) return <div className="chart-empty"><Ruler size={28} /><p>No paired measurements in this range.</p><span>Choose another pair or widen the date range.</span></div>;
  return <div className="chart" role="img" aria-label={`Time trends for ${series.map(s => s.label).join(', ')}. Exact values are available in the tables below.`}>
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <LineChart data={data} margin={{ top: 14, right: 18, bottom: 8, left: 0 }}>
        <CartesianGrid stroke="#e9edf3" vertical={false} strokeDasharray="3 4" />
        <XAxis type="number" dataKey="time" domain={['dataMin', 'dataMax']} scale="time" tickFormatter={shortDate} tick={{ fill: '#7b8497', fontSize: 12 }} tickLine={false} axisLine={false} minTickGap={45} />
        <YAxis domain={['auto', 'auto']} tickFormatter={n => `${fmt(Number(n), ratio ? 3 : 1)}${percent ? '%' : ''}`} width={66} tick={{ fill: '#7b8497', fontSize: 12 }} tickLine={false} axisLine={false} />
        <Tooltip labelFormatter={v => longDate(new Date(Number(v)).toISOString().slice(0, 10))} formatter={(v, name) => [`${fmt(Number(v), ratio ? 3 : 2)}${percent ? '%' : ''}`, name]} contentStyle={{ borderRadius: 12, border: '1px solid #e4e8ef', boxShadow: '0 8px 30px #14234212', fontSize: 13 }} />
        {percent && <ReferenceLine y={0} stroke="#bac3d3" />}
        {series.map(s => <Line key={s.id} dataKey={s.id} name={s.label} stroke={s.color} type="linear" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 5 }} connectNulls={false} isAnimationActive={false} />)}
      </LineChart>
    </ResponsiveContainer>
  </div>;
}

function Change({ value, unit = '%' }: { value: number | null; unit?: string }) {
  return <span className={`change ${value == null || value === 0 ? 'flat' : value < 0 ? 'down' : 'up'}`}>
    {value != null && value !== 0 && (value < 0 ? <ArrowDownRight size={13} /> : <ArrowUpRight size={13} />)}
    {signed(value, 1)}{value == null ? '' : unit}
  </span>;
}

function Dashboard({ all }: { all: Entry[] }) {
  const [tab, setTab] = useState<Tab>('overview');
  const [start, setStart] = useState(all[0].date);
  const [end, setEnd] = useState(all[all.length - 1].date);
  const [selected, setSelected] = useState<MetricId[]>(['weight', 'waist', 'shoulders']);
  const [percent, setPercent] = useState(true);
  const [a, setA] = useState<RatioId>('shoulders');
  const [b, setB] = useState<RatioId>('waist');
  const [matrixMode, setMatrixMode] = useState<'value' | 'change'>('change');
  const [fromDate, setFromDate] = useState(all[0].date);
  const [toDate, setToDate] = useState(all[all.length - 1].date);
  const rows = useMemo(() => all.filter(r => r.date >= start && r.date <= end), [all, start, end]);
  const ratioData = ratioPoints(rows, a, b);
  const ratio = summarize(ratioData);
  const matrixDimensions = dimensions;
  const from = all.find(r => r.date === fromDate)!;
  const to = all.find(r => r.date === toDate)!;
  const days = (to.time - from.time) / 86400000;
  const download = () => {
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a'); link.href = url; link.download = 'measurements.csv'; link.click(); URL.revokeObjectURL(url);
  };
  const goRatio = (top: RatioId, bottom: RatioId) => { setA(top); setB(bottom); setTab('ratios'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const series = selected.map(id => {
    const m = metrics.find(m => m.id === id)!;
    return { id, label: `${m.short}${percent ? '' : ` (${m.unit})`}`, color: m.color, data: percent ? normalized(points(rows, id)) : points(rows, id) };
  });

  return <div className="app-shell">
    <aside className="sidebar">
      <a href="#" className="brand" onClick={e => { e.preventDefault(); setTab('overview'); }}><span className="brand-icon"><Activity size={22} /></span>body<span className="brand-light">data</span><span className="brand-period">.</span></a>
      <div className="workspace-label">YOUR WORKSPACE</div>
      <nav aria-label="Main navigation">{nav.map(n => <button key={n.id} className={`nav-item ${tab === n.id ? 'active' : ''}`} aria-current={tab === n.id ? 'page' : undefined} onClick={() => setTab(n.id)}><n.icon size={18} />{n.label}{tab === n.id && <span className="nav-dot" />}</button>)}</nav>
      <div className="sidebar-bottom"><div className="source-icon"><GitBranch size={17} /></div><div><strong>Your data. Your progress.</strong><p>One check-in at a time.</p></div><span className="version">v1.0</span></div>
    </aside>
    <main>
      <header className="page-header">
        <div><div className="eyebrow">PERSONAL ANALYTICS</div><h1>{tab === 'overview' ? 'A clearer view of your progress.' : tab === 'ratios' ? 'See how your proportions evolve.' : tab === 'compare' ? 'Put your progress side by side.' : 'Every check-in, in one place.'}</h1><p className="subtitle">{tab === 'overview' ? 'Your measurements tell a story. Explore the bigger picture.' : tab === 'ratios' ? 'Explore every pairing, with both sides of the ratio in view.' : tab === 'compare' ? 'Choose two dates to see exactly what changed.' : 'Measurements from your repository, ready to explore.'}</p></div>
        <div className="header-actions"><span className="height-display"><Ruler size={16} />{HEIGHT_INCHES} in tall</span><button className="button icon-button" onClick={download} aria-label="Download measurements CSV" title="Download measurements CSV"><Download size={17} /></button></div>
      </header>
      <div className="toolbar">
        <div className="data-status"><span className="status-dot" /><strong>{all.length} check-ins</strong><span className="toolbar-divider" /><span>Latest: {longDate(all[all.length - 1].date)}</span></div>
        {(tab === 'overview' || tab === 'ratios') && <div className="date-range"><CalendarDays size={15} /><select aria-label="Range start" value={start} onChange={e => setStart(e.target.value)}>{all.filter(r => r.date <= end).map(r => <option key={r.date} value={r.date}>{shortDate(r.date)}</option>)}</select><span>–</span><select aria-label="Range end" value={end} onChange={e => setEnd(e.target.value)}>{all.filter(r => r.date >= start).map(r => <option key={r.date} value={r.date}>{shortDate(r.date)}</option>)}</select>{(start !== all[0].date || end !== all[all.length - 1].date) && <button className="text-button" onClick={() => { setStart(all[0].date); setEnd(all[all.length - 1].date); }}>All time</button>}</div>}
      </div>

      {tab === 'overview' && <>
        <div className="section-title"><h2>At a glance</h2><span>{rows.length} check-ins in selected range</span></div>
        <section className="metric-grid" aria-label="Measurement summary">{metrics.map(m => {
          const data = points(rows, m.id), s = summarize(data);
          return <article className="metric-card" key={m.id}><div className="metric-label"><span className="color-dot" style={{ background: m.color }} />{m.label}</div><div className="metric-main"><div className="metric-value">{fmt(s?.last.value)} <span>{m.unit}</span></div><Spark data={data} color={m.color} /></div><div className="metric-footer"><Change value={s && s.count > 1 ? s.pct : null} /><span>{s && s.count > 1 ? `${signed(s.delta)} ${m.unit} total` : 'Need two check-ins'}</span></div>{s && (s.first.date !== start || s.last.date !== end) && <div className="coverage">{shortDate(s.first.date)} – {shortDate(s.last.date)}</div>}</article>;
        })}</section>
        <BodyFigure rows={rows} />
        <section className="panel trends-panel"><div className="panel-header"><div><h2>Trends over time</h2><p>{percent ? 'Percentage change from each measurement’s first available value.' : 'Actual measurements. Weight in lb; circumferences in inches.'}</p></div><div className="segmented" aria-label="Chart scale"><button aria-pressed={percent} className={percent ? 'selected' : ''} onClick={() => setPercent(true)}>% change</button><button aria-pressed={!percent} className={!percent ? 'selected' : ''} onClick={() => setPercent(false)}>Actual</button></div></div>
          <div className="metric-toggles">{metrics.map(m => <button aria-pressed={selected.includes(m.id)} key={m.id} className={`metric-toggle ${selected.includes(m.id) ? 'on' : ''}`} onClick={() => setSelected(s => s.includes(m.id) ? s.length === 1 ? s : s.filter(k => k !== m.id) : [...s, m.id])}><span className="toggle-box" style={{ background: selected.includes(m.id) ? m.color : 'transparent', borderColor: selected.includes(m.id) ? m.color : '#cbd2df' }}>{selected.includes(m.id) && <Check size={10} />}</span>{m.short}</button>)}</div>
          <TrendChart series={series} percent={percent} />
          <div className="chart-footnote"><span>Actual dates · gaps stay visible · no smoothing</span><span>{longDate(start)} – {longDate(end)}</span></div>
        </section>
        <div className="section-title"><div><h2>Proportions at a glance</h2><p>A smaller denominator can increase a ratio. Explore both measurements.</p></div><button className="text-button" onClick={() => setTab('ratios')}>Explore all ratios <ChevronRight size={15} /></button></div>
        <section className="ratio-grid" aria-label="Featured ratios">{favorites.map(f => {
          const data = ratioPoints(rows, f.a, f.b), s = summarize(data);
          return <button className="ratio-card" key={f.name} onClick={() => goRatio(f.a, f.b)}><div className="ratio-card-heading">{f.name}<ChevronRight size={15} /></div><div className="ratio-card-main"><strong>{fmt(s?.last.value, 3)}</strong><Spark data={data} color="#199c86" /></div><div className="ratio-card-footer">{s ? <><Change value={s.count > 1 ? s.pct : null} /><span>{shortDate(s.first.date)} – {shortDate(s.last.date)}</span></> : <span>No paired measurements</span>}</div></button>;
        })}</section>
        <section className="panel"><div className="panel-header"><div><h2>Change, check-in by check-in</h2><p>Percentage change from the previous entry. Color shows direction, not good or bad.</p></div><SlidersHorizontal size={18} className="muted" /></div><div className="table-wrap"><table className="heatmap"><thead><tr><th>Measurement</th>{rows.slice(1).map(r => <th key={r.date}>{shortDate(r.date)}</th>)}</tr></thead><tbody>{metrics.map(m => <tr key={m.id}><th>{m.short}</th>{rows.slice(1).map((r, i) => {
          const current = r[m.id], prev = rows[i][m.id];
          const value = current !== null && prev !== null ? (current / prev - 1) * 100 : null;
          return <td key={r.date}><span className={`heat-cell ${value === null || value === 0 ? 'neutral' : value < 0 ? 'negative' : 'positive'}`} style={{ opacity: value === null ? 0.6 : 1 }} title={`${m.label}, ${longDate(r.date)}: ${fmt(current)} ${m.unit}; previous entry: ${fmt(prev)} ${m.unit}`}>{signed(value, 1)}{value === null ? '' : '%'}</span></td>;
        })}</tr>)}</tbody></table></div>{rows.length < 2 && <p className="empty-note">Select at least two dates to see changes.</p>}</section>
      </>}

      {tab === 'ratios' && <>
        <section className="panel"><div className="panel-header"><div><h2>Ratio explorer</h2><p>All circumferences and height use inches. Ratios are dimensionless.</p></div><span className="badge">{matrixDimensions.length * (matrixDimensions.length - 1) / 2} unique pairs</span></div>
          <div className="ratio-controls"><label>Numerator<select value={a} onChange={e => setA(e.target.value as RatioId)}>{dimensions.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</select></label><button className="button swap-button" aria-label="Swap numerator and denominator" onClick={() => { setA(b); setB(a); }}><MoveHorizontal size={18} /></button><label>Denominator<select value={b} onChange={e => setB(e.target.value as RatioId)}>{dimensions.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</select></label></div>
            <div className="ratio-summary" aria-live="polite"><div><div className="eyebrow">{ratioLabel(a)} / {ratioLabel(b)}</div><strong>{fmt(ratio?.last.value, 3)}</strong></div><div><span>Total change</span><Change value={ratio && ratio.count > 1 ? ratio.pct : null} /></div><div><span>Comparison window</span><b>{ratio ? `${shortDate(ratio.first.date)} – ${shortDate(ratio.last.date)}` : 'No paired values'}</b></div></div>
            <TrendChart series={[{ id: 'ratio', label: `${ratioLabel(a)} / ${ratioLabel(b)}`, color: '#5266d5', data: ratioData }]} ratio />
            <div className="table-wrap"><table><thead><tr><th>Date</th><th>{ratioLabel(a)} (in)</th><th>{ratioLabel(b)} (in)</th><th>Ratio</th></tr></thead><tbody>{rows.map((r, i) => <tr key={r.date}><th>{shortDate(r.date)}</th><td>{fmt(a === 'height' ? HEIGHT_INCHES : r[a])}</td><td>{fmt(b === 'height' ? HEIGHT_INCHES : r[b])}</td><td className="strong-number">{fmt(ratioData[i].value, 3)}</td></tr>)}</tbody></table></div>
        </section>
        <section className="panel"><div className="panel-header"><div><h2>Every proportion, together</h2><p>Row ÷ column. Select a cell to explore its trend and underlying values.</p></div><div className="segmented"><button className={matrixMode === 'change' ? 'selected' : ''} aria-pressed={matrixMode === 'change'} onClick={() => setMatrixMode('change')}>% change</button><button className={matrixMode === 'value' ? 'selected' : ''} aria-pressed={matrixMode === 'value'} onClick={() => setMatrixMode('value')}>Latest ratio</button></div></div><div className="table-wrap"><table className="matrix"><thead><tr><th>Row / column</th>{matrixDimensions.map(m => <th key={m.id}>{m.short}</th>)}</tr></thead><tbody>{matrixDimensions.map(top => <tr key={top.id}><th>{top.short}</th>{matrixDimensions.map(bottom => {
          const s = summarize(ratioPoints(rows, top.id, bottom.id));
          return <td key={bottom.id}>{top.id === bottom.id ? <span className="matrix-diagonal">—</span> : <button className={`matrix-cell ${a === top.id && b === bottom.id ? 'chosen' : ''} ${matrixMode === 'change' && s ? s.pct < 0 ? 'negative' : s.pct > 0 ? 'positive' : '' : ''}`} aria-label={`${top.label} divided by ${bottom.label}: ${s ? matrixMode === 'value' ? fmt(s.last.value, 3) : `${signed(s.pct, 1)} percent change` : 'no data'}`} title={s ? `${longDate(s.first.date)} – ${longDate(s.last.date)}; ${s.count} paired entries` : 'No paired values'} onClick={() => goRatio(top.id, bottom.id)}>{s ? matrixMode === 'value' ? fmt(s.last.value, 3) : s.count > 1 ? `${signed(s.pct, 1)}%` : '—' : '—'}</button>}</td>;
        })}</tr>)}</tbody></table></div><p className="panel-note">Each pair uses its first and last paired measurements in the selected range. Reversed ratios describe the same pair; their percentage changes differ.</p></section>
      </>}

      {tab === 'compare' && <>
        <section className="panel"><div className="panel-header"><div><h2>Choose your checkpoints</h2><p>Exact measurements on each date, with rates calculated using elapsed days.</p></div><span className="badge">{days} days apart</span></div><div className="compare-selects"><label>From<select value={fromDate} onChange={e => setFromDate(e.target.value)}>{all.filter(r => r.date <= toDate).map(r => <option key={r.date} value={r.date}>{longDate(r.date)}</option>)}</select></label><ChevronRight size={20} className="muted" /><label>To<select value={toDate} onChange={e => setToDate(e.target.value)}>{all.filter(r => r.date >= fromDate).map(r => <option key={r.date} value={r.date}>{longDate(r.date)}</option>)}</select></label></div><div className="table-wrap"><table className="compare-table"><thead><tr><th>Measurement</th><th>{shortDate(from.date)}</th><th>{shortDate(to.date)}</th><th>Total change</th><th>Change %</th><th>Per week</th></tr></thead><tbody>{metrics.map(m => {
          const x = from[m.id], y = to[m.id], delta = x !== null && y !== null ? y - x : null;
          return <tr key={m.id}><th><span className="color-dot" style={{ background: m.color }} />{m.label}<small>{m.unit}</small></th><td>{fmt(x)}</td><td className="strong-number">{fmt(y)}</td><td>{signed(delta)}{delta === null ? '' : ` ${m.unit}`}</td><td><Change value={delta !== null && x !== null ? delta / x * 100 : null} /></td><td>{signed(delta !== null && days > 0 ? delta / days * 7 : null)}</td></tr>;
        })}</tbody></table></div></section>
        <section className="panel"><div className="panel-header"><div><h2>Proportions between checkpoints</h2><p>A ratio requires both measurements on each selected date.</p></div></div><div className="table-wrap"><table><thead><tr><th>Ratio</th><th>{shortDate(from.date)}</th><th>{shortDate(to.date)}</th><th>Change %</th></tr></thead><tbody>{favorites.map(f => {
          const x = ratioPoints([from], f.a, f.b)[0].value, y = ratioPoints([to], f.a, f.b)[0].value;
          return <tr key={f.name}><th>{f.name}</th><td>{fmt(x, 3)}</td><td className="strong-number">{fmt(y, 3)}</td><td><Change value={x !== null && y !== null ? (y / x - 1) * 100 : null} /></td></tr>;
        })}</tbody></table></div></section>
      </>}

      {tab === 'data' && <>
        <div className="source-banner"><div className="source-banner-icon"><GitBranch size={22} /></div><div><strong>A simple file. A complete history.</strong><p>Add a row to <code>data/measurements.csv</code>, commit, and push to main. Your next deployment updates every chart.</p></div><button className="button" onClick={download}><Download size={15} />Export CSV</button></div>
        <section className="panel"><div className="panel-header"><div><h2>Measurement log</h2><p>{all.length} check-ins · {longDate(all[0].date)} to {longDate(all[all.length - 1].date)}</p></div><span className="badge">lb / inches</span></div><div className="table-wrap"><table className="log-table"><thead><tr><th>Date</th>{metrics.map(m => <th key={m.id}>{m.short}<small>{m.unit}</small></th>)}</tr></thead><tbody>{[...all].reverse().map(r => <tr key={r.date}><th>{longDate(r.date)}</th>{metrics.map(m => <td key={m.id}>{fmt(r[m.id])}</td>)}</tr>)}</tbody></table></div><p className="panel-note">Blank cells stay missing. Dates use YYYY-MM-DD. Arm, forearm, quad, and calf are measured on the right side.</p></section>
      </>}
      <footer className="page-footer"><span>BODY DATA <span className="footer-dot">/</span> Small check-ins. A bigger picture.</span><span>Measurements describe change; they don’t determine body composition.</span></footer>
    </main>
  </div>;
}

export default function App() {
  const result = useMemo(() => {
    try { return { rows: parseMeasurements(csv), error: null }; }
    catch (error) { return { rows: [], error: error instanceof Error ? error.message : String(error) }; }
  }, []);
  if (result.error) return <main className="load-error"><Activity size={32} /><h1>Let’s check the data file.</h1><p role="alert">{result.error}</p><p>Update <code>data/measurements.csv</code> and reload.</p></main>;
  return <Dashboard all={result.rows} />;
}
