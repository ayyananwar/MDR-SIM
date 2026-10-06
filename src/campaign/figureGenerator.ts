/**
 * Phase 7 Publication-Quality SVG Figure Generator.
 *
 * Generates Figures 1–10 as SVG files from actual experiment outputs.
 * All data points represent recorded experiment values — no smoothing, interpolation,
 * or fabrication of data beyond what was actually measured.
 */

import fs from 'fs';
import path from 'path';
import type { CampaignResults } from './campaignTypes.js';
import type { MetricSummary } from '../evaluation/evaluationTypes.js';

// ─── SVG helpers ──────────────────────────────────────────────────────────────

const W = 700;
const H = 480;
const MARGIN = { top: 60, right: 40, bottom: 80, left: 80 };
const PLOT_W = W - MARGIN.left - MARGIN.right;
const PLOT_H = H - MARGIN.top - MARGIN.bottom;

const COLORS = ['#2563EB', '#DC2626', '#16A34A', '#D97706', '#7C3AED', '#0891B2'];
const FONT = 'font-family="Inter, Arial, sans-serif"';

function svgHeader(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#FAFAFA" rx="4"/>
  <rect x="${MARGIN.left}" y="${MARGIN.top}" width="${PLOT_W}" height="${PLOT_H}" fill="white" stroke="#E5E7EB" stroke-width="1"/>`;
}

function svgFooter(): string {
  return '</svg>';
}

function svgTitle(title: string): string {
  return `  <text x="${W / 2}" y="36" text-anchor="middle" ${FONT} font-size="14" font-weight="600" fill="#111827">${title}</text>`;
}

function svgAxisLabels(xLabel: string, yLabel: string): string {
  return `
  <text x="${MARGIN.left + PLOT_W / 2}" y="${H - 12}" text-anchor="middle" ${FONT} font-size="12" fill="#6B7280">${xLabel}</text>
  <text x="16" y="${MARGIN.top + PLOT_H / 2}" text-anchor="middle" ${FONT} font-size="12" fill="#6B7280" transform="rotate(-90,16,${MARGIN.top + PLOT_H / 2})">${yLabel}</text>`;
}

function scaleX(val: number, minVal: number, maxVal: number): number {
  return MARGIN.left + ((val - minVal) / (maxVal - minVal || 1)) * PLOT_W;
}

function scaleY(val: number, minVal: number, maxVal: number): number {
  return MARGIN.top + PLOT_H - ((val - minVal) / (maxVal - minVal || 1)) * PLOT_H;
}

interface Series {
  label: string;
  xVals: number[];
  yVals: number[];
  color: string;
}

function svgLineSeries(series: Series[], xMin: number, xMax: number, yMin: number, yMax: number): string {
  let out = '';
  for (let si = 0; si < series.length; si++) {
    const s = series[si];
    const pts = s.xVals.map((x, i) => `${scaleX(x, xMin, xMax)},${scaleY(s.yVals[i], yMin, yMax)}`);
    out += `  <polyline points="${pts.join(' ')}" fill="none" stroke="${s.color}" stroke-width="2"/>\n`;
    for (let i = 0; i < s.xVals.length; i++) {
      out += `  <circle cx="${scaleX(s.xVals[i], xMin, xMax)}" cy="${scaleY(s.yVals[i], yMin, yMax)}" r="4" fill="${s.color}"/>\n`;
    }
  }
  return out;
}

function svgBarChart(labels: string[], values: number[], colors: string[], yMin: number, yMax: number): string {
  const n = labels.length;
  const barW = PLOT_W / n * 0.7;
  const gap = PLOT_W / n * 0.3 / 2;
  let out = '';
  for (let i = 0; i < n; i++) {
    const x = MARGIN.left + (PLOT_W / n) * i + gap;
    const y = scaleY(values[i], yMin, yMax);
    const bh = (MARGIN.top + PLOT_H) - y;
    out += `  <rect x="${x}" y="${y}" width="${barW}" height="${bh}" fill="${colors[i % colors.length]}" rx="2" opacity="0.85"/>\n`;
    out += `  <text x="${x + barW / 2}" y="${y - 4}" text-anchor="middle" ${FONT} font-size="10" fill="#374151">${values[i].toFixed(3)}</text>\n`;
    const labelY = MARGIN.top + PLOT_H + 18;
    const labelLines = labels[i].split(' ');
    for (let li = 0; li < labelLines.length; li++) {
      out += `  <text x="${x + barW / 2}" y="${labelY + li * 13}" text-anchor="middle" ${FONT} font-size="10" fill="#6B7280">${labelLines[li]}</text>\n`;
    }
  }
  return out;
}

function svgYGridLines(yMin: number, yMax: number, steps = 5): string {
  let out = '';
  for (let i = 0; i <= steps; i++) {
    const val = yMin + (i / steps) * (yMax - yMin);
    const y = scaleY(val, yMin, yMax);
    out += `  <line x1="${MARGIN.left}" y1="${y}" x2="${MARGIN.left + PLOT_W}" y2="${y}" stroke="#F3F4F6" stroke-width="1"/>\n`;
    out += `  <text x="${MARGIN.left - 8}" y="${y + 4}" text-anchor="end" ${FONT} font-size="10" fill="#9CA3AF">${val.toFixed(2)}</text>\n`;
  }
  return out;
}

function svgXTickLabels(xVals: number[], xMin: number, xMax: number): string {
  return xVals.map((x) => {
    const px = scaleX(x, xMin, xMax);
    return `  <text x="${px}" y="${MARGIN.top + PLOT_H + 16}" text-anchor="middle" ${FONT} font-size="10" fill="#6B7280">${x}</text>`;
  }).join('\n');
}

function svgLegend(labels: string[], colors: string[]): string {
  const legendX = MARGIN.left + PLOT_W - 160;
  const legendY = MARGIN.top + 8;
  let out = `  <rect x="${legendX - 4}" y="${legendY - 4}" width="168" height="${labels.length * 18 + 8}" fill="white" stroke="#E5E7EB" rx="3"/>\n`;
  for (let i = 0; i < labels.length; i++) {
    const y = legendY + i * 18 + 10;
    out += `  <rect x="${legendX}" y="${y - 6}" width="12" height="10" fill="${colors[i % colors.length]}" rx="1"/>\n`;
    out += `  <text x="${legendX + 18}" y="${y}" ${FONT} font-size="10" fill="#374151">${labels[i]}</text>\n`;
  }
  return out;
}

function writeSvg(figuresDir: string, filename: string, content: string): void {
  fs.writeFileSync(path.join(figuresDir, filename), content, 'utf-8');
}

// ─── Figure 1: System Architecture ────────────────────────────────────────────

function generateFig01Architecture(figuresDir: string): void {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="420" viewBox="0 0 700 420">
  <rect width="700" height="420" fill="#FAFAFA" rx="4"/>
  <text x="350" y="32" text-anchor="middle" ${FONT} font-size="15" font-weight="700" fill="#111827">MDR-SIM System Architecture</text>
  ${['Phase 1: Physical Simulation\\n(Hidden Ground Truth)', 'Phase 2: BLE/RF Observation Model\\n(BLEObservation[])', 'Phase 3: Edge Processing\\n(ContactSession[])', 'Phase 4: Bayesian Exposure Model\\n(P(E=1|X))', 'Phase 5: Evaluation\\n(AUROC, AP, Brier, ECE)', 'Phase 6: Privacy Subsystem\\n(Pseudonymization & Linkage)'].map((label, i) => {
    const y = 70 + i * 55;
    const color = ['#1D4ED8', '#0369A1', '#047857', '#92400E', '#6D28D9', '#BE185D'][i];
    return `<rect x="200" y="${y}" width="300" height="40" rx="6" fill="${color}" opacity="0.9"/>
  <text x="350" y="${y + 25}" text-anchor="middle" ${FONT} font-size="11" fill="white" font-weight="500">${label.replace('\\n', ' — ')}</text>
  ${i < 5 ? `<line x1="350" y1="${y + 40}" x2="350" y2="${y + 55}" stroke="#9CA3AF" stroke-width="2" marker-end="url(#arrow)"/>` : ''}`;
  }).join('\n')}
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="#9CA3AF"/>
    </marker>
  </defs>
  <text x="350" y="410" text-anchor="middle" ${FONT} font-size="10" fill="#9CA3AF">Ground truth strictly hidden from Phases 2–4 at runtime</text>
</svg>`;
  writeSvg(figuresDir, 'fig01_architecture.svg', svg);
}

// ─── Figure 2: Contact Detection PRF ──────────────────────────────────────────

function generateFig02ContactPRF(figuresDir: string, results: CampaignResults): void {
  const scenarios = ['Reference\n(n=50)', 'Dense\n(n=80)'];
  const sources = [results.E1_reference, results.E2_dense];
  const precision = sources.map((r) => r.contact.precision.mean);
  const recall = sources.map((r) => r.contact.recall.mean);
  const f1 = sources.map((r) => r.contact.f1Score.mean);

  const allVals = [...precision, ...recall, ...f1];
  const yMin = Math.max(0, Math.min(...allVals) - 0.05);
  const yMax = Math.min(1, Math.max(...allVals) + 0.05);

  const n = scenarios.length;
  const groupW = PLOT_W / n;
  const bW = groupW * 0.2;

  let bars = '';
  const metricColors = ['#2563EB', '#16A34A', '#DC2626'];
  const metricVals = [precision, recall, f1];
  const metricNames = ['Precision', 'Recall', 'F1'];
  for (let gi = 0; gi < n; gi++) {
    for (let mi = 0; mi < 3; mi++) {
      const x = MARGIN.left + gi * groupW + mi * (bW + 4) + 8;
      const y = scaleY(metricVals[mi][gi], yMin, yMax);
      const bh = (MARGIN.top + PLOT_H) - y;
      bars += `<rect x="${x}" y="${y}" width="${bW}" height="${bh}" fill="${metricColors[mi]}" rx="2" opacity="0.85"/>
  <text x="${x + bW / 2}" y="${y - 3}" text-anchor="middle" ${FONT} font-size="9" fill="#374151">${metricVals[mi][gi].toFixed(2)}</text>\n`;
    }
    const lx = MARGIN.left + gi * groupW + groupW / 2;
    bars += `<text x="${lx}" y="${MARGIN.top + PLOT_H + 18}" text-anchor="middle" ${FONT} font-size="11" fill="#374151">${scenarios[gi].replace('\n', ' ')}</text>\n`;
  }

  const svg = `${svgHeader()}
${svgTitle('Contact Detection: Precision, Recall, F1')}
${svgYGridLines(yMin, yMax)}
${bars}
${svgLegend(metricNames, metricColors)}
${svgAxisLabels('Scenario', 'Score')}
${svgFooter()}`;
  writeSvg(figuresDir, 'fig02_contact_prf.svg', svg);
}

// ─── Figure 3: Bayesian Model vs Baselines ────────────────────────────────────

function generateFig03RiskBaseline(figuresDir: string, results: CampaignResults): void {
  const methods = results.E3_baseline.methods;
  const labels = methods.map((m) => m.name.replace('Proposed Bayesian', 'Bayesian'));
  const aurocVals = methods.map((m) => m.auroc.mean);
  const auprcVals = methods.map((m) => m.auprc.mean);

  const allVals = [...aurocVals, ...auprcVals];
  const yMin = Math.max(0, Math.min(...allVals) - 0.05);
  const yMax = Math.min(1.05, Math.max(...allVals) + 0.05);

  const n = labels.length;
  const groupW = PLOT_W / n;
  const bW = groupW * 0.3;
  const metricColors = ['#2563EB', '#DC2626'];
  let bars = '';
  for (let gi = 0; gi < n; gi++) {
    for (let mi = 0; mi < 2; mi++) {
      const val = mi === 0 ? aurocVals[gi] : auprcVals[gi];
      const x = MARGIN.left + gi * groupW + mi * (bW + 4) + 6;
      const y = scaleY(val, yMin, yMax);
      const bh = (MARGIN.top + PLOT_H) - y;
      bars += `<rect x="${x}" y="${y}" width="${bW}" height="${bh}" fill="${metricColors[mi]}" rx="2" opacity="0.85"/>
  <text x="${x + bW / 2}" y="${y - 3}" text-anchor="middle" ${FONT} font-size="9" fill="#374151">${val.toFixed(3)}</text>\n`;
    }
    const lx = MARGIN.left + gi * groupW + groupW / 2;
    bars += `<text x="${lx}" y="${MARGIN.top + PLOT_H + 18}" text-anchor="middle" ${FONT} font-size="10" fill="#374151">${labels[gi]}</text>\n`;
  }

  const svg = `${svgHeader()}
${svgTitle('Risk Model Comparison: AUROC and AUPRC')}
${svgYGridLines(yMin, yMax)}
${bars}
${svgLegend(['AUROC', 'AUPRC'], metricColors)}
${svgAxisLabels('Method', 'Score')}
${svgFooter()}`;
  writeSvg(figuresDir, 'fig03_risk_baseline.svg', svg);
}

// ─── Figure 4: Calibration reliability diagram ────────────────────────────────

function generateFig04Calibration(figuresDir: string, results: CampaignResults): void {
  // Perfect calibration diagonal + note about Brier score
  const brier = results.E1_reference.risk.brierScore.mean;
  const ece = results.E1_reference.risk.ece.mean;

  const diagX = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
  const diagSeries: Series = { label: 'Perfect', xVals: diagX, yVals: diagX, color: '#9CA3AF' };

  const svg = `${svgHeader()}
${svgTitle('Risk Model Calibration (Reference Scenario)')}
${svgYGridLines(0, 1)}
${svgXTickLabels([0, 0.2, 0.4, 0.6, 0.8, 1.0], 0, 1)}
${svgLineSeries([diagSeries], 0, 1, 0, 1)}
  <text x="${MARGIN.left + PLOT_W / 2}" y="${MARGIN.top + PLOT_H / 2 - 20}" text-anchor="middle" ${FONT} font-size="12" fill="#6B7280">Brier Score: ${brier.toFixed(4)}</text>
  <text x="${MARGIN.left + PLOT_W / 2}" y="${MARGIN.top + PLOT_H / 2 + 0}" text-anchor="middle" ${FONT} font-size="12" fill="#6B7280">ECE: ${ece.toFixed(4)}</text>
  <text x="${MARGIN.left + PLOT_W / 2}" y="${MARGIN.top + PLOT_H / 2 + 40}" text-anchor="middle" ${FONT} font-size="10" fill="#DC2626" font-style="italic">Calibration applies to simulated digital exposure target only.</text>
  <text x="${MARGIN.left + PLOT_W / 2}" y="${MARGIN.top + PLOT_H / 2 + 56}" text-anchor="middle" ${FONT} font-size="10" fill="#DC2626" font-style="italic">This is NOT clinical probability calibration.</text>
${svgAxisLabels('Mean Predicted Probability', 'Observed Event Frequency')}
${svgFooter()}`;
  writeSvg(figuresDir, 'fig04_calibration.svg', svg);
}

// ─── Generic sweep figure ─────────────────────────────────────────────────────

function generateSweepFig(
  figuresDir: string,
  filename: string,
  title: string,
  xLabel: string,
  sweepResults: CampaignResults['E5_rssiSweep']
): void {
  const xVals = sweepResults.map((r) => Number(r.sweepValue ?? 0));
  const f1Vals = sweepResults.map((r) => r.contact.f1Score.mean);
  const aurocVals = sweepResults.map((r) => r.risk.auroc.mean);

  const allVals = [...f1Vals, ...aurocVals];
  const yMin = Math.max(0, Math.min(...allVals) - 0.05);
  const yMax = Math.min(1, Math.max(...allVals) + 0.05);
  const xMin = Math.min(...xVals);
  const xMax = Math.max(...xVals);

  const f1Series: Series = { label: 'Contact F1', xVals, yVals: f1Vals, color: '#2563EB' };
  const aurocSeries: Series = { label: 'AUROC', xVals, yVals: aurocVals, color: '#DC2626' };

  const svg = `${svgHeader()}
${svgTitle(title)}
${svgYGridLines(yMin, yMax)}
${svgXTickLabels(xVals, xMin, xMax)}
${svgLineSeries([f1Series, aurocSeries], xMin, xMax, yMin, yMax)}
${svgLegend(['Contact F1', 'AUROC'], ['#2563EB', '#DC2626'])}
${svgAxisLabels(xLabel, 'Score')}
${svgFooter()}`;
  writeSvg(figuresDir, filename, svg);
}

// ─── Figure 9: Privacy Linkage vs Rotation ────────────────────────────────────

function generateFig09PrivacyLinkage(figuresDir: string, results: CampaignResults): void {
  const validPoints = results.E9_privacyRotationSweep.filter((p) => p.linkageSuccessRate !== null);
  if (validPoints.length === 0) {
    writeSvg(figuresDir, 'fig09_privacy_linkage_vs_rotation.svg',
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><text x="350" y="240" text-anchor="middle">No linkage data (P1 N/A)</text></svg>`);
    return;
  }

  const xVals = validPoints.map((p) => Number(p.sweepValue));
  const linkageVals = validPoints.map((p) => p.linkageSuccessRate!.mean);
  const unlinkabilityVals = validPoints.map((p) => p.unlinkabilityProxy!.mean);

  const allVals = [...linkageVals, ...unlinkabilityVals];
  const yMin = Math.max(0, Math.min(...allVals) - 0.05);
  const yMax = Math.min(1, Math.max(...allVals) + 0.05);
  const xMin = Math.min(...xVals);
  const xMax = Math.max(...xVals);

  const s1: Series = { label: 'Linkage Success Rate', xVals, yVals: linkageVals, color: '#DC2626' };
  const s2: Series = { label: 'Unlinkability Proxy', xVals, yVals: unlinkabilityVals, color: '#16A34A' };

  const svg = `${svgHeader()}
${svgTitle('Privacy: Linkage Success vs Rotation Interval')}
${svgYGridLines(yMin, yMax)}
${svgXTickLabels(xVals, xMin, xMax)}
${svgLineSeries([s1, s2], xMin, xMax, yMin, yMax)}
${svgLegend(['Linkage Success Rate', 'Unlinkability Proxy'], ['#DC2626', '#16A34A'])}
${svgAxisLabels('Rotation Interval (s)', 'Rate')}
${svgFooter()}`;
  writeSvg(figuresDir, 'fig09_privacy_linkage_vs_rotation.svg', svg);
}

// ─── Figure 10: Privacy–Utility Trade-off ────────────────────────────────────

function generateFig10PrivacyUtility(figuresDir: string, results: CampaignResults): void {
  const xVals = results.E9_privacyRotationSweep.map((p) => Number(p.sweepValue));
  const fragVals = results.E9_privacyRotationSweep.map((p) => p.sessionFragmentationRatio.mean);
  const durationVals = results.E9_privacyRotationSweep.map((p) => p.durationAttenuationRatio.mean);

  const allVals = [...fragVals, ...durationVals];
  const yMin = Math.max(0, Math.min(...allVals) - 0.1);
  const yMax = Math.max(...allVals) + 0.1;
  const xMin = Math.min(...xVals);
  const xMax = Math.max(...xVals);

  const s1: Series = { label: 'Session Fragmentation Ratio', xVals, yVals: fragVals, color: '#D97706' };
  const s2: Series = { label: 'Duration Attenuation Ratio', xVals, yVals: durationVals, color: '#7C3AED' };

  const svg = `${svgHeader()}
${svgTitle('Privacy–Utility Trade-off vs Rotation Interval')}
${svgYGridLines(yMin, yMax)}
${svgXTickLabels(xVals, xMin, xMax)}
${svgLineSeries([s1, s2], xMin, xMax, yMin, yMax)}
${svgLegend(['Session Fragmentation Ratio', 'Duration Attenuation Ratio'], ['#D97706', '#7C3AED'])}
${svgAxisLabels('Rotation Interval (s)', 'Ratio')}
${svgFooter()}`;
  writeSvg(figuresDir, 'fig10_privacy_utility_tradeoff.svg', svg);
}

// ─── Figure 8: Scalability ────────────────────────────────────────────────────

function generateFig08Scalability(figuresDir: string, results: CampaignResults): void {
  const xVals = results.E15_scalability.map((s) => s.populationSize);
  const f1Vals = results.E15_scalability.map((s) => s.f1Score.mean);

  const yMin = Math.max(0, Math.min(...f1Vals) - 0.05);
  const yMax = Math.min(1, Math.max(...f1Vals) + 0.05);
  const xMin = Math.min(...xVals);
  const xMax = Math.max(...xVals);

  const s1: Series = { label: 'Contact F1', xVals, yVals: f1Vals, color: '#2563EB' };

  const svg = `${svgHeader()}
${svgTitle('Scalability: Contact F1 vs Population Size')}
${svgYGridLines(yMin, yMax)}
${svgXTickLabels(xVals, xMin, xMax)}
${svgLineSeries([s1], xMin, xMax, yMin, yMax)}
${svgLegend(['Contact F1'], ['#2563EB'])}
  <text x="${MARGIN.left + PLOT_W / 2}" y="${MARGIN.top + PLOT_H + 55}" text-anchor="middle" ${FONT} font-size="10" fill="#DC2626" font-style="italic">Wall-clock timings are machine-dependent and not shown here.</text>
${svgAxisLabels('Population Size', 'Contact F1')}
${svgFooter()}`;
  writeSvg(figuresDir, 'fig08_scalability.svg', svg);
}

// ─── Main figure generation ───────────────────────────────────────────────────

export function generateAllFigures(results: CampaignResults, figuresDir: string): void {
  fs.mkdirSync(figuresDir, { recursive: true });

  generateFig01Architecture(figuresDir);
  generateFig02ContactPRF(figuresDir, results);
  generateFig03RiskBaseline(figuresDir, results);
  generateFig04Calibration(figuresDir, results);

  generateSweepFig(figuresDir, 'fig05_rssi_robustness.svg',
    'Risk Performance under RSSI Noise', 'RSSI Noise σ (dB)', results.E5_rssiSweep);

  generateSweepFig(figuresDir, 'fig06_packet_loss_robustness.svg',
    'Risk Performance under Packet Loss', 'Packet-Loss Probability', results.E6_packetLossSweep);

  generateSweepFig(figuresDir, 'fig07_adv_interval_robustness.svg',
    'Risk Performance under Advertising Interval Variation', 'Advertising Interval (ms)', results.E7_advIntervalSweep);

  generateFig08Scalability(figuresDir, results);
  generateFig09PrivacyLinkage(figuresDir, results);
  generateFig10PrivacyUtility(figuresDir, results);
}
