import { HEIGHT_INCHES } from './model.ts';
import type { Entry, MetricId } from './model.ts';

// A consistent drawing model, rather than an anatomical reconstruction.
function ellipseWidth(circumference: number, depthToWidth: number): number {
  const a = 0.5, b = depthToWidth / 2;
  const h = ((a - b) / (a + b)) ** 2;
  return circumference / (Math.PI * (a + b) * (1 + 3 * h / (10 + Math.sqrt(4 - 3 * h))));
}

type Segment = ['C' | 'Q' | 'L', ...number[]];

// One continuous contour removes the seams between separately drawn body parts.
// Build the right side from crown to crotch, then reverse and mirror it.
function closedContour(segments: Segment[]): string {
  const right = segments.map(([command, ...values]) => `${command} ${values.join(' ')}`);
  const left = segments.map(([command, ...values], i) => {
    const previous = i === 0 ? [0, 0] : segments[i - 1].slice(-2) as number[];
    const reversed = command === 'C' ? [...values.slice(2, 4), ...values.slice(0, 2), ...previous]
      : command === 'Q' ? [...values.slice(0, 2), ...previous] : previous;
    return `${command} ${reversed.map((value, j) => j % 2 === 0 ? -value : value).join(' ')}`;
  }).reverse();
  return `M 0 0 ${right.join(' ')} ${left.join(' ')} Z`;
}

export function bodyShape(row: Entry) {
  const estimated: MetricId[] = [];
  const get = (id: MetricId, fallback: number) => {
    if (row[id] !== null) return row[id];
    estimated.push(id);
    return fallback;
  };
  const waist = get('waist', HEIGHT_INCHES * 0.5);
  const shoulder = ellipseWidth(get('shoulders', HEIGHT_INCHES * 0.72), 0.5) / 2;
  const middle = ellipseWidth(waist, 0.7) / 2;
  const hip = ellipseWidth(get('glutes', waist * 1.12), 0.7) / 2;
  const arm = get('arm', HEIGHT_INCHES * 0.22) / Math.PI / 2;
  const forearm = get('forearm', HEIGHT_INCHES * 0.175) / Math.PI / 2;
  const thigh = get('quad', HEIGHT_INCHES * 0.33) / Math.PI / 2;
  const calf = get('calf', HEIGHT_INCHES * 0.21) / Math.PI / 2;
  const upperX = shoulder - arm * 0.4;
  const elbowX = upperX + 1.55;
  const wristX = elbowX + 1.4;
  const legX = hip * 0.5, knee = calf * 0.73, ankle = calf * 0.47;
  const chest = shoulder * 0.76;
  const path = closedContour([
    ['C', 1.85, 0, 2.75, 1.3, 2.75, 3.3],
    ['Q', 3.12, 3.5, 2.78, 4.75],
    ['C', 2.6, 6.05, 2.25, 7.05, 1.5, 7.75],
    ['L', 1.55, 9.55],
    ['C', 2.8, 10.45, shoulder * 0.72, 10.5, shoulder * 0.93, 12.1],
    ['C', shoulder + 0.8, 13.2, upperX + arm, 15.5, upperX + arm, 18],
    ['C', upperX + arm + 0.2, 21, elbowX + forearm * 0.8, 25.5, elbowX + forearm * 0.8, 28],
    ['C', wristX + forearm * 0.68, 32, wristX + 0.8, 36.7, wristX + 0.7, 39.4],
    ['C', wristX + 1.1, 40.7, wristX + 1.25, 42.1, wristX + 0.85, 43.5],
    ['Q', wristX + 0.45, 44.4, wristX - 0.05, 43.55],
    ['L', wristX - 0.6, 41.45],
    ['Q', wristX - 1.2, 42.3, wristX - 1.3, 41.1],
    ['L', wristX - 0.8, 39.3],
    ['C', wristX - forearm * 0.7, 35, elbowX - forearm * 0.8, 31.5, elbowX - forearm * 0.8, 28],
    ['C', elbowX - arm * 0.8, 24, upperX - arm * 0.72, 21.2, upperX - arm * 0.85, 18.7],
    ['C', chest, 22.5, middle, 27, middle, 31],
    ['C', middle, 34, hip * 0.98, 35.5, hip, 38.6],
    ['C', legX + thigh, 41.2, legX + thigh * 0.97, 44, legX + thigh * 0.8, 47.5],
    ['C', legX + knee, 51.7, legX + knee * 0.98, 52.4, legX + knee, 54],
    ['C', legX + calf, 57, legX + calf * 1.04, 59.2, legX + calf * 0.82, 61.7],
    ['C', legX + calf * 0.6, 64, legX + ankle, 66.5, legX + ankle, 68],
    ['Q', legX + ankle + 1.3, 69, legX + ankle + 1.15, HEIGHT_INCHES - 0.25],
    ['Q', legX + 0.9, HEIGHT_INCHES, legX - ankle, HEIGHT_INCHES],
    ['Q', legX - ankle - 0.3, 69.25, legX - ankle, 68],
    ['C', legX - ankle, 65.5, legX - calf * 0.8, 62.1, legX - calf * 0.83, 60.2],
    ['C', legX - calf, 57.3, legX - knee, 56, legX - knee, 54],
    ['C', legX - knee, 51.5, Math.max(0.4, legX - thigh * 0.85), 46.6, Math.max(0.4, legX - thigh * 0.85), 44],
    ['Q', 0.65, 41.9, 0, 41.4],
  ]);
  const guides = {
    shoulders: { x1: -shoulder, x2: shoulder, y: 13 },
    waist: { x1: -middle, x2: middle, y: 31 },
    glutes: { x1: -hip, x2: hip, y: 38 },
    arm: { x1: upperX - arm * 0.8, x2: upperX + arm, y: 20 },
    forearm: { x1: elbowX - forearm * 0.6, x2: elbowX + forearm * 1.2, y: 32 },
    quad: { x1: legX - thigh * 0.8, x2: legX + thigh * 0.8, y: 46 },
    calf: { x1: legX - calf * 0.85, x2: legX + calf * 0.9, y: 60 },
  };
  // Interior construction lines are stylistic landmarks, identical in purpose on
  // every date; they do not imply measured muscle definition or body fat.
  const details = `M 0 10.7 L 0 13.8
    M 0.45 12.2 Q ${shoulder * 0.4} 11.7 ${shoulder * 0.7} 13.8
    M -0.45 12.2 Q ${-shoulder * 0.4} 11.7 ${-shoulder * 0.7} 13.8
    M ${-chest * 0.7} 20.2 Q ${-chest * 0.4} 22.1 -0.65 21.5
    M ${chest * 0.7} 20.2 Q ${chest * 0.4} 22.1 0.65 21.5
    M ${-middle * 0.78} 28.5 Q ${-middle * 0.92} 32 ${-hip * 0.65} 35.3
    M ${middle * 0.78} 28.5 Q ${middle * 0.92} 32 ${hip * 0.65} 35.3
    M ${legX - knee * 0.65} 53.6 Q ${legX} 55.2 ${legX + knee * 0.65} 53.6
    M ${-legX + knee * 0.65} 53.6 Q ${-legX} 55.2 ${-legX - knee * 0.65} 53.6
    M ${legX} 56.5 Q ${legX - 0.3} 61.5 ${legX} 66
    M ${-legX} 56.5 Q ${-legX + 0.3} 61.5 ${-legX} 66`;
  return { path, details, guides, estimated, widths: { shoulders: shoulder * 2, waist: middle * 2, glutes: hip * 2, arm: arm * 2, forearm: forearm * 2, quad: thigh * 2, calf: calf * 2 } };
}
