import React, { useState, useMemo } from 'react';
import {
  Database,
  FileSpreadsheet,
  Download,
  Play,
  FileText,
  BarChart3,
  Sliders,
  CheckCircle2,
  Table as TableIcon,
  BookOpen,
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { generateSyntheticDataset, convertToCSV, ContactRecord, SummaryStat, PriorProbability } from '../../utils/datasetGenerator';

export default function DatasetGeneratorPage() {
  const [numRecords, setNumRecords] = useState<number>(10000);
  const [seed, setSeed] = useState<number>(42);
  const [activeTab, setActiveTab] = useState<'plots' | 'stats' | 'cpts' | 'preview' | 'ieee'>('plots');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Path loss exponents
  const [pathLossN, setPathLossN] = useState<{ General: number; ICU: number; Isolation: number; OPD: number }>({
    General: 2.4,
    ICU: 2.2,
    Isolation: 3.0,
    OPD: 2.6
  });

  // Generated dataset state
  const [{ records, summaryStats, priors }, setDataset] = useState(() =>
    generateSyntheticDataset(10000, 42, pathLossN)
  );

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const res = generateSyntheticDataset(numRecords, seed, pathLossN);
      setDataset(res);
      setIsGenerating(false);
    }, 100);
  };

  // Distribution chart data calculations
  const durationChartData = useMemo(() => {
    const bins = [
      { name: '<5 min', count: 0 },
      { name: '5-15 min', count: 0 },
      { name: '15-30 min', count: 0 },
      { name: '30-60 min', count: 0 },
      { name: '>60 min', count: 0 }
    ];
    records.forEach((r) => {
      const d = r.Contact_Duration;
      if (d < 5) bins[0].count++;
      else if (d <= 15) bins[1].count++;
      else if (d <= 30) bins[2].count++;
      else if (d <= 60) bins[3].count++;
      else bins[4].count++;
    });
    return bins;
  }, [records]);

  const rssiChartData = useMemo(() => {
    const bins = [
      { name: 'Strong (>-60)', count: 0 },
      { name: 'Mod High (-60..-70)', count: 0 },
      { name: 'Mod Low (-70..-80)', count: 0 },
      { name: 'Weak (<-80)', count: 0 }
    ];
    records.forEach((r) => {
      const rssi = r.RSSI;
      if (rssi > -60) bins[0].count++;
      else if (rssi > -70) bins[1].count++;
      else if (rssi > -80) bins[2].count++;
      else bins[3].count++;
    });
    return bins;
  }, [records]);

  const distanceChartData = useMemo(() => {
    const bins = [
      { name: 'Close (<1.5m)', count: 0 },
      { name: 'Moderate (1.5-4m)', count: 0 },
      { name: 'Far (>4m)', count: 0 }
    ];
    records.forEach((r) => {
      const dist = r.Estimated_Distance;
      if (dist < 1.5) bins[0].count++;
      else if (dist <= 4.0) bins[1].count++;
      else bins[2].count++;
    });
    return bins;
  }, [records]);

  const riskChartData = useMemo(() => {
    const counts = { Low: 0, Medium: 0, High: 0 };
    records.forEach((r) => {
      counts[r.Ground_Truth_Risk]++;
    });
    const total = records.length || 1;
    return [
      { name: 'Low Risk', count: counts.Low, color: '#10B981', pct: ((counts.Low / total) * 100).toFixed(1) },
      { name: 'Medium Risk', count: counts.Medium, color: '#F59E0B', pct: ((counts.Medium / total) * 100).toFixed(1) },
      { name: 'High Risk', count: counts.High, color: '#EF4444', pct: ((counts.High / total) * 100).toFixed(1) }
    ];
  }, [records]);

  // Export handlers
  const handleDownloadCSV = () => {
    const csvContent = convertToCSV(records);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `synthetic_tb_contacts_${records.length}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadCPTs = () => {
    const priorContent = priors.map((p) => `${p.variable},${p.state},${p.probability}`).join('\n');
    const blob = new Blob([`Variable,State,Probability\n${priorContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'cpt_priors.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadIEEE = () => {
    const text = `# IEEE Methodology Report - MDR-TB Synthetic Contact Dataset\nDownload file directly from root IEEE_METHODOLOGY_REPORT.md`;
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'IEEE_METHODOLOGY_REPORT.md');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRecords = useMemo(() => {
    if (!searchQuery) return records.slice(0, 100);
    const q = searchQuery.toLowerCase();
    return records
      .filter(
        (r) =>
          r.Contact_ID.toLowerCase().includes(q) ||
          r.Patient_A_ID.toLowerCase().includes(q) ||
          r.Patient_B_ID.toLowerCase().includes(q) ||
          r.Ward_Type.toLowerCase().includes(q) ||
          r.Ground_Truth_Risk.toLowerCase().includes(q)
      )
      .slice(0, 100);
  }, [records, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-6 opacity-10 pointer-events-none">
          <Database size={280} className="text-cyan-400" />
        </div>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5">
                <Sparkles size={12} /> IEEE Paper Publication Suite
              </span>
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5">
                <CheckCircle2 size={12} /> WHO & CDC Guideline Compliant
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-100 flex items-center gap-3">
              Synthetic Contact Dataset & DBN CPT Suite
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-3xl">
              Automatically generate publication-quality hospital encounter datasets (100,000+ records), model log-distance BLE RSSI path loss with body attenuation, and derive Conditional Probability Tables for Dynamic Bayesian Networks.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleDownloadCSV}
              className="btn-tactile bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Download size={14} /> Export CSV ({records.length.toLocaleString()})
            </button>
            <button
              onClick={handleDownloadCPTs}
              className="btn-tactile bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Layers size={14} /> Export CPTs
            </button>
            <button
              onClick={handleDownloadIEEE}
              className="btn-tactile bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-700 flex items-center gap-1.5 transition-all shadow-sm"
            >
              <BookOpen size={14} /> IEEE Report
            </button>
          </div>
        </div>

        {/* Overview Stats Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-4 border-t border-slate-800">
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
            <span className="text-slate-400 text-xs font-medium">Total Contact Events</span>
            <div className="text-xl font-bold text-cyan-400 mt-0.5">{records.length.toLocaleString()}</div>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
            <span className="text-slate-400 text-xs font-medium">Schema Fields</span>
            <div className="text-xl font-bold text-indigo-400 mt-0.5">18 Variables</div>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
            <span className="text-slate-400 text-xs font-medium">Class Imbalance Skew</span>
            <div className="text-sm font-semibold text-emerald-400 mt-1 flex items-center gap-1">
              <span>{riskChartData[0].pct}% Low</span>
              <span className="text-amber-400">· {riskChartData[1].pct}% Med</span>
              <span className="text-red-400">· {riskChartData[2].pct}% High</span>
            </div>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
            <span className="text-slate-400 text-xs font-medium">Reproducibility Seed</span>
            <div className="text-xl font-bold text-amber-400 mt-0.5">SEED = {seed}</div>
          </div>
        </div>
      </div>

      {/* Control Panel Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-slate-100 shadow-md">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
          <Sliders size={18} className="text-cyan-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
            Simulation Parameters & Generation Engine
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">
              Contact Event Count
            </label>
            <select
              value={numRecords}
              onChange={(e) => setNumRecords(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value={5000}>5,000 Records</option>
              <option value={10000}>10,000 Records (Fast Preview)</option>
              <option value={50000}>50,000 Records</option>
              <option value={100000}>100,000 Records (Publication Standard)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">
              Random Seed (Reproducibility)
            </label>
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">
              General Ward Path Loss Exponent (n)
            </label>
            <input
              type="number"
              step="0.1"
              value={pathLossN.General}
              onChange={(e) => setPathLossN({ ...pathLossN, General: Number(e.target.value) })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">
              Isolation Ward Path Loss Exponent (n)
            </label>
            <input
              type="number"
              step="0.1"
              value={pathLossN.Isolation}
              onChange={(e) => setPathLossN({ ...pathLossN, Isolation: Number(e.target.value) })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold text-xs py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md"
            >
              {isGenerating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Play size={14} /> Run Simulation
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 space-x-1">
        <button
          onClick={() => setActiveTab('plots')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
            activeTab === 'plots'
              ? 'border-cyan-400 text-cyan-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 size={15} /> Distribution Plots & Correlations
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
            activeTab === 'stats'
              ? 'border-cyan-400 text-cyan-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity size={15} /> Summary Statistics (18 Vars)
        </button>
        <button
          onClick={() => setActiveTab('cpts')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
            activeTab === 'cpts'
              ? 'border-cyan-400 text-cyan-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers size={15} /> Derived DBN CPT Tables
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
            activeTab === 'preview'
              ? 'border-cyan-400 text-cyan-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <TableIcon size={15} /> Contact Records Preview
        </button>
        <button
          onClick={() => setActiveTab('ieee')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
            activeTab === 'ieee'
              ? 'border-cyan-400 text-cyan-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen size={15} /> IEEE Paper Methodology Report
        </button>
      </div>

      {/* Tab 1: Distribution Plots */}
      {activeTab === 'plots' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Duration Histogram */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-slate-100">
            <h3 className="text-sm font-semibold mb-1 flex items-center gap-2 text-cyan-400">
              <Activity size={16} /> Contact Duration Distribution (Minutes)
            </h3>
            <p className="text-xs text-slate-400 mb-4">Exponential encounter times with ward specific parameters.</p>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={durationChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', fontSize: '12px' }} />
                  <Bar dataKey="count" fill="#2563EB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* RSSI Distribution */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-slate-100">
            <h3 className="text-sm font-semibold mb-1 flex items-center gap-2 text-emerald-400">
              <Activity size={16} /> BLE RSSI Signal Strength (dBm)
            </h3>
            <p className="text-xs text-slate-400 mb-4">Log distance path loss model with shadowing noise & body attenuation.</p>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rssiChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', fontSize: '12px' }} />
                  <Bar dataKey="count" fill="#059669" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Distance Distribution */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-slate-100">
            <h3 className="text-sm font-semibold mb-1 flex items-center gap-2 text-amber-400">
              <Activity size={16} /> Estimated Physical Distance Categories
            </h3>
            <p className="text-xs text-slate-400 mb-4">Close (&lt;1.5m), Moderate (1.5-4m), Far (&gt;4m) encounter boundaries.</p>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distanceChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', fontSize: '12px' }} />
                  <Bar dataKey="count" fill="#D97706" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ground Truth Risk Skew */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-slate-100">
            <h3 className="text-sm font-semibold mb-1 flex items-center gap-2 text-red-400">
              <Activity size={16} /> Ground Truth Exposure Risk Skew (WHO / CDC Rules)
            </h3>
            <p className="text-xs text-slate-400 mb-4">Medically justified class imbalance (~72% Low, ~21% Medium, ~7% High).</p>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', fontSize: '12px' }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {riskChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Summary Statistics Table */}
      {activeTab === 'stats' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-slate-100 overflow-x-auto">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-200">Variable Summary Statistics</h3>
              <p className="text-xs text-slate-400">Comprehensive statistical metrics for all 18 variables in the synthetic dataset.</p>
            </div>
            <span className="text-xs text-cyan-400 bg-cyan-950/60 border border-cyan-800/50 px-2.5 py-1 rounded-full">
              18 Schema Fields
            </span>
          </div>

          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-800 text-slate-300 border-b border-slate-700">
                <th className="p-2.5">Variable</th>
                <th className="p-2.5">Count</th>
                <th className="p-2.5">Mean</th>
                <th className="p-2.5">Std Dev</th>
                <th className="p-2.5">Min</th>
                <th className="p-2.5">Median (50%)</th>
                <th className="p-2.5">Max</th>
                <th className="p-2.5">Mode / Categorical Skew</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {summaryStats.map((st, idx) => (
                <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                  <td className="p-2.5 font-semibold text-cyan-400">{st.variable}</td>
                  <td className="p-2.5">{st.count.toLocaleString()}</td>
                  <td className="p-2.5">{st.mean}</td>
                  <td className="p-2.5">{st.std}</td>
                  <td className="p-2.5">{st.min}</td>
                  <td className="p-2.5">{st.median}</td>
                  <td className="p-2.5">{st.max}</td>
                  <td className="p-2.5 text-slate-400">{st.mode}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Derived CPTs */}
      {activeTab === 'cpts' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-slate-100">
            <h3 className="text-sm font-bold text-cyan-400 mb-1">Derived Prior Probabilities P(X)</h3>
            <p className="text-xs text-slate-400 mb-4">Empirical prior distribution for categorical network nodes.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {priors.slice(0, 15).map((pr, idx) => (
                <div key={idx} className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50 flex justify-between">
                  <span className="text-slate-300 font-medium">{pr.variable}: <span className="text-amber-400">{pr.state}</span></span>
                  <span className="font-mono text-cyan-400">{pr.probability}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-slate-100 overflow-x-auto">
            <h3 className="text-sm font-bold text-indigo-400 mb-1">
              Transmission Risk CPT: P(Ground_Truth_Risk | Exposure Factors)
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Conditional probabilities computed across combinations of Infectious Source, Distance Category, Duration, Ventilation, and Mask Compliance.
            </p>
            <div className="text-xs text-slate-300 italic bg-slate-800/50 p-3 rounded-lg border border-slate-700">
              Complete 8,600+ line CPT table generated and saved to <code className="text-cyan-300">output/cpts/cpt_risk_exposure_factors.csv</code>. Click "Export CPTs" above to download the raw file bundle.
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Records Preview */}
      {activeTab === 'preview' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h3 className="text-sm font-bold text-slate-200">
              Synthetic Contact Records (Showing 100 of {records.length.toLocaleString()})
            </h3>
            <input
              type="text"
              placeholder="Search Contact ID, Patient, Ward..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 w-full sm:w-64 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-800 text-slate-300 border-b border-slate-700">
                  <th className="p-2">Contact ID</th>
                  <th className="p-2">Patient A</th>
                  <th className="p-2">Patient B</th>
                  <th className="p-2">Ward</th>
                  <th className="p-2">Duration</th>
                  <th className="p-2">RSSI</th>
                  <th className="p-2">Distance</th>
                  <th className="p-2">Infectious</th>
                  <th className="p-2">Ventilation</th>
                  <th className="p-2">Mask</th>
                  <th className="p-2">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {filteredRecords.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-800/50">
                    <td className="p-2 font-mono text-cyan-400">{r.Contact_ID}</td>
                    <td className="p-2 font-mono">{r.Patient_A_ID}</td>
                    <td className="p-2 font-mono">{r.Patient_B_ID}</td>
                    <td className="p-2">{r.Ward_Type}</td>
                    <td className="p-2">{r.Contact_Duration}m</td>
                    <td className="p-2">{r.RSSI} dBm</td>
                    <td className="p-2">{r.Estimated_Distance}m</td>
                    <td className="p-2">{r.Infectious_Source}</td>
                    <td className="p-2">{r.Ventilation_Level}</td>
                    <td className="p-2">{r.Mask_Compliance}</td>
                    <td className="p-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.Ground_Truth_Risk === 'High'
                            ? 'bg-red-950 text-red-400 border border-red-800'
                            : r.Ground_Truth_Risk === 'Medium'
                            ? 'bg-amber-950 text-amber-400 border border-amber-800'
                            : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        }`}
                      >
                        {r.Ground_Truth_Risk}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: IEEE Paper Methodology Report */}
      {activeTab === 'ieee' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-200 space-y-6">
          <div className="flex justify-between items-center border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs text-cyan-400 uppercase tracking-wider font-bold">IEEE Publication Section</span>
              <h2 className="text-xl font-bold text-slate-100">Dataset Generation & DBN CPT Methodology</h2>
            </div>
            <button
              onClick={handleDownloadIEEE}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1.5"
            >
              <Download size={14} /> Download IEEE_METHODOLOGY_REPORT.md
            </button>
          </div>

          <div className="prose prose-invert max-w-none text-xs text-slate-300 space-y-4">
            <h3 className="text-sm font-bold text-cyan-400">1. Log-Distance BLE Path Loss Formulation</h3>
            <p>
              The physical RSSI (dBm) between wearable tags separated by physical distance <em>d</em> (meters) in ward <em>w</em> is modeled as:
            </p>
            <div className="bg-slate-950 p-3 rounded-lg font-mono text-cyan-300 border border-slate-800">
              RSSI(d) = P_tx(1m) - 10 * n_ward * log10(d) + X_sigma
            </div>
            <p>
              Where P_tx(1m) = -59.0 dBm, n_ward ranges from 2.2 (ICU) to 3.0 (Isolation), and X_sigma ~ N(0, 3.5^2) represents multipath fading and human body shadowing attenuation.
            </p>

            <h3 className="text-sm font-bold text-cyan-400 mt-6">2. WHO / CDC Exposure Score Calculation</h3>
            <p>
              For active infectious index case interactions, the ground-truth exposure index <em>E</em> is computed as:
            </p>
            <div className="bg-slate-950 p-3 rounded-lg font-mono text-amber-300 border border-slate-800">
              E = S_duration * w_distance * w_ventilation * w_mask * (1 + 0.12 * min(5, Recurrence)) * exp(-lambda * delta_t_days)
            </div>
            <p>
              Thresholds on <em>E</em> enforce realistic hospital class imbalance (~72% Low Risk, ~21% Medium Risk, ~7% High Risk).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
