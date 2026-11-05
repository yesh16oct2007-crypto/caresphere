import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Upload,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Download,
  Languages,
  Video,
  Info,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { apiUrl } from '../services/api.js';
import { AIReportAnalysis } from '../types/index.js';

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' }
];

const SAMPLE_REPORTS = [
  {
    name: 'Complete Blood Count (CBC) Sample',
    text: `PATIENT DIAGNOSTIC LAB REPORT
Name: Ramesh Patel | Age: 45 | Gender: Male
Test: Complete Blood Count (CBC)
Hemoglobin: 10.2 g/dL (Reference: 13.0 - 17.0 g/dL) - Low
WBC: 14,800 /mcL (Reference: 4,000 - 11,000 /mcL) - High
Platelets: 210,000 /mcL (Reference: 150,000 - 450,000 /mcL) - Normal
RBC: 3.9 mil/mcL (Reference: 4.5 - 5.9 mil/mcL) - Low
Notes: Patient reports fatigue, mild fever for 3 days.`
  },
  {
    name: 'Cardiac & Lipid Panel Sample',
    text: `CARDIAC ENZYME & METABOLIC REPORT
Patient: Sunita Rao | Age: 58 | Gender: Female
Troponin-I: 0.85 ng/mL (Reference: 0.00 - 0.04 ng/mL) - Critical Alert
Total Cholesterol: 245 mg/dL (Reference: < 200 mg/dL) - High
Triglycerides: 180 mg/dL (Reference: < 150 mg/dL) - High
Fasting Blood Sugar: 165 mg/dL (Reference: 70 - 100 mg/dL) - High
Notes: Intermittent chest heaviness on exertion.`
  }
];

export const AIReportExplainerPage: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [language, setLanguage] = useState(user?.preferred_language || 'en');
  const [reportText, setReportText] = useState('');
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AIReportAnalysis | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportFile && !reportText.trim()) {
      setError('Please upload a document file or paste report clinical text.');
      return;
    }

    try {
      setAnalyzing(true);
      setError(null);

      const formData = new FormData();
      if (reportFile) {
        formData.append('report_file', reportFile);
      }
      formData.append('report_text', reportText);
      formData.append('language', language);

      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(apiUrl('/api/ai-report/analyze'), {
        method: 'POST',
        headers,
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to analyze report');

      setAnalysis(data.analysis);
    } catch (err: any) {
      setError(err.message || 'Report analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDownloadSummary = () => {
    if (!analysis) return;
    const content = `
CARESPHERE MEDICAL REPORT EXPLAINER SUMMARY
Report: ${analysis.report_title} (${analysis.report_type})
Language: ${analysis.language.toUpperCase()}
Generated on: ${new Date().toLocaleString()}

DISCLAIMER:
${analysis.disclaimer}

SUMMARY:
${analysis.simplified_summary}

KEY BIOMARKERS ANALYZED:
${analysis.biomarkers
  .map(
    (b) =>
      `- ${b.name}: ${b.value} ${b.unit} [Ref: ${b.normal_range}] => Status: ${b.status.toUpperCase()} (${b.clinical_significance})`
  )
  .join('\n')}

RECOMMENDATIONS:
${analysis.actionable_recommendations.map((r) => `- ${r}`).join('\n')}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `caresphere-report-summary-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-700 via-medblue-700 to-indigo-800 rounded-3xl p-6 sm:p-10 text-white mb-8 shadow-xl relative overflow-hidden">
        <div className="max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold mb-4 text-teal-200">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Multilingual Clinical Biomarker Explainer</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-3">
            AI Medical Report Explainer
          </h1>
          <p className="text-teal-100 text-sm sm:text-base leading-relaxed mb-4">
            Upload blood tests, lab panels, or discharge summaries. Our clinical AI parses your biomarkers, checks normal ranges, and explains what each value means in your native language.
          </p>

          <div className="p-3 bg-amber-500/20 border border-amber-400/40 rounded-2xl text-xs text-amber-100 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
            <span>
              <strong>Clinical Safety Note:</strong> CareSphere AI Explainer provides educational insights only and does not replace doctor diagnoses. Urgent abnormalities should be verified immediately with a physician.
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Upload & Input Form (Left) vs Analysis Results (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Input Column (cols 5) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <h2 className="font-bold text-base text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Upload className="w-4 h-4 text-teal-600" />
              <span>Submit Medical Report</span>
            </h2>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleAnalyze} className="space-y-4">
              {/* Language Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5 text-teal-600" />
                  <span>Explanation Language</span>
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.native} ({l.name})
                    </option>
                  ))}
                </select>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                  Attach Report File (PDF / Image)
                </label>
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-3 text-center hover:border-teal-500 transition-colors">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => setReportFile(e.target.files ? e.target.files[0] : null)}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 dark:file:bg-teal-950 dark:file:text-teal-300 cursor-pointer"
                  />
                  {reportFile && (
                    <p className="mt-1 text-xs text-teal-600 font-medium">Selected: {reportFile.name}</p>
                  )}
                </div>
              </div>

              {/* Paste Text */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Or Paste Report Text
                  </label>
                  <span className="text-[10px] text-slate-400">OCR / Biomarkers</span>
                </div>
                <textarea
                  rows={5}
                  placeholder="Paste your lab values, hemoglobin, sugar level, lipid parameters..."
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Quick Sample Buttons */}
              <div>
                <span className="text-[11px] text-slate-400 block mb-1.5">Try a demo report:</span>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_REPORTS.map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setReportText(sample.text)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-[11px] text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      {sample.name}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={analyzing}
                className="w-full py-2.5 bg-gradient-to-r from-teal-600 to-medblue-600 hover:from-teal-700 hover:to-medblue-700 text-white font-semibold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {analyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Extracting & Explaining Biomarkers...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Explain Report in {SUPPORTED_LANGUAGES.find((l) => l.code === language)?.name}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Output Column (cols 7) */}
        <div className="lg:col-span-7">
          {!analysis && !analyzing && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border border-dashed border-slate-300 dark:border-slate-700">
              <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1">
                No Report Analyzed Yet
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Attach a lab result or click one of the demo samples on the left to inspect parameters and see full explanations in your language.
              </p>
            </div>
          )}

          {analyzing && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-700">
              <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1">
                Clinical AI is Processing Report
              </h3>
              <p className="text-xs text-slate-500">
                Evaluating biomarkers against standard Indian clinical reference intervals...
              </p>
            </div>
          )}

          {analysis && !analyzing && (
            <div className="space-y-6">
              {/* Critical Alerts Banner if any */}
              {analysis.critical_alerts && analysis.critical_alerts.length > 0 && (
                <div className="bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-800 rounded-2xl p-4 text-red-900 dark:text-red-200 flex items-start gap-3 shadow-md">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5 animate-bounce" />
                  <div className="flex-1 text-xs">
                    <p className="font-bold uppercase tracking-wider text-[11px] mb-1 text-red-700 dark:text-red-300">
                      High Priority Finding Detected:
                    </p>
                    <ul className="list-disc pl-4 space-y-1">
                      {analysis.critical_alerts.map((alert, i) => (
                        <li key={i} className="font-semibold">{alert}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Simplified Plain-Language Explanation */}
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      {analysis.report_title}
                    </h3>
                    <p className="text-xs text-teal-600 dark:text-teal-400 font-medium">
                      Explained in {SUPPORTED_LANGUAGES.find((l) => l.code === analysis.language)?.name}
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadSummary}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Summary</span>
                  </button>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Plain-Language Summary
                  </h4>
                  <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200 bg-teal-50/60 dark:bg-slate-900 p-4 rounded-2xl border border-teal-100 dark:border-slate-800">
                    {analysis.simplified_summary}
                  </p>
                </div>

                {/* Biomarkers Table */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                    Biomarker Breakdown & Reference Ranges
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase text-[10px]">
                        <tr>
                          <th className="p-2.5 rounded-l-lg">Parameter</th>
                          <th className="p-2.5">Observed Value</th>
                          <th className="p-2.5">Normal Range</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5 rounded-r-lg">Meaning</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                        {analysis.biomarkers.map((b, idx) => {
                          const statusColor =
                            b.status === 'normal'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : b.status === 'critical'
                              ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 font-bold'
                              : 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300';

                          return (
                            <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                              <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">
                                {b.name}
                              </td>
                              <td className="p-2.5 font-mono text-slate-900 dark:text-white">
                                {b.value} {b.unit}
                              </td>
                              <td className="p-2.5 text-slate-500">{b.normal_range}</td>
                              <td className="p-2.5">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase ${statusColor}`}>
                                  {b.status}
                                </span>
                              </td>
                              <td className="p-2.5 text-slate-600 dark:text-slate-300">
                                {b.clinical_significance}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Recommendations */}
                {analysis.actionable_recommendations && analysis.actionable_recommendations.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Suggested Clinical Next Steps
                    </h4>
                    <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                      {analysis.actionable_recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Consult Doctor CTA */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-xs text-slate-500">
                    Have questions regarding your findings? Connect with a specialist immediately.
                  </p>
                  <button
                    onClick={() => navigate('/teleconsult')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-teal-600 to-medblue-600 hover:from-teal-700 hover:to-medblue-700 text-white rounded-xl text-xs font-semibold shadow shrink-0"
                  >
                    <Video className="w-4 h-4" />
                    <span>Discuss with Doctor via Teleconsult</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
