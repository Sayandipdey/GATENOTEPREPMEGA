"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import Papa, { type ParseResult } from "papaparse";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { MEGA_URL_PREFIX } from "@notes/shared";

interface ParsedRow {
  rowNum: number;
  subject: string;
  category: string;
  folderPath: string;
  title: string;
  kind: "file" | "image";
  type: string;
  link: string;
  caption: string;
  status: "ok" | "warning" | "error";
  message?: string;
}

interface ImportSummary {
  totalRows: number;
  createdItems: number;
  createdSubjects: number;
  createdFolders: number;
  skippedCount: number;
  errorCount: number;
}

export function BulkImporter() {
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [tab, setTab] = useState<"file" | "paste">("file");
  const [pastedCsv, setPastedCsv] = useState("");
  const [fileName, setFileName] = useState("");

  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [skipErrors, setSkipErrors] = useState(true);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [dryRun, setDryRun] = useState(false);

  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [failedRows, setFailedRows] = useState<ParsedRow[]>([]);

  // ---------------------------------------------------------------------------
  // Template Generators
  // ---------------------------------------------------------------------------

  const templateData = [
    {
      subject: "Signals & Systems",
      category: "Core",
      folderPath: "Unit 1: Continuous Time Signals/Fourier Analysis",
      title: "CTFT Properties and Duality Quick Reference",
      kind: "file",
      type: "pdf",
      link: "https://mega.nz/file/sample1#gate2026",
      caption: "High-yield revision formulas",
    },
    {
      subject: "Signals & Systems",
      category: "Core",
      folderPath: "Unit 1: Continuous Time Signals/Diagrams",
      title: "Sinc Function Frequency Spectrum Plot",
      kind: "image",
      type: "other",
      link: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1200&q=80",
      caption: "Time domain vs Frequency domain Fourier pair",
    },
    {
      subject: "Network Theory",
      category: "Core",
      folderPath: "Chapter 1: Network Theorems",
      title: "Thevenin & Norton Equivalent Dependent Source Problems",
      kind: "file",
      type: "pdf",
      link: "https://mega.nz/file/sample2#gate2026",
      caption: "Standard GATE previous years questions solved",
    },
    {
      subject: "Engineering Mathematics",
      category: "Engineering Mathematics",
      folderPath: "Linear Algebra",
      title: "Cayley-Hamilton Theorem & Matrix Inverse Shortcut",
      kind: "file",
      type: "pdf",
      link: "https://mega.nz/file/sample3#gate2026",
      caption: "Characteristic equation and eigenvalues",
    },
  ];

  const downloadCsvTemplate = () => {
    const csv = Papa.unparse(templateData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gate_notes_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadXlsxTemplate = () => {
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "GATE Notes");
    XLSX.writeFile(wb, "gate_notes_import_template.xlsx");
  };

  // ---------------------------------------------------------------------------
  // Parsers (SheetJS & PapaParse)
  // ---------------------------------------------------------------------------

  const processRawObjects = (rawList: Record<string, any>[]) => {
    const parsed: ParsedRow[] = [];

    rawList.forEach((item, index) => {
      const rowNum = index + 1;
      // Case-insensitive key matching
      const getVal = (keyNames: string[]) => {
        for (const k of Object.keys(item)) {
          const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, "");
          for (const target of keyNames) {
            if (cleanK.includes(target)) return String(item[k] ?? "").trim();
          }
        }
        return "";
      };

      const subject = getVal(["subject", "course"]);
      const category = getVal(["category"]) || "Core";
      const folderPath = getVal(["folderpath", "folder", "unit"]);
      const title = getVal(["title", "name"]);
      const kindRaw = getVal(["kind", "itemkind"]).toLowerCase();
      const kind: "file" | "image" = kindRaw === "image" || kindRaw.includes("img") ? "image" : "file";
      const type = getVal(["type", "filetype"]) || (kind === "file" ? "pdf" : "other");
      const link = getVal(["link", "url", "megalink"]);
      const caption = getVal(["caption", "note", "desc"]);

      // Validate
      let status: "ok" | "warning" | "error" = "ok";
      let message = "Ready to import";

      if (!subject || !title || !link) {
        status = "error";
        message = "Missing subject, title, or link";
      } else if (kind === "file" && !link.startsWith(MEGA_URL_PREFIX)) {
        status = "error";
        message = `MEGA file link must start with ${MEGA_URL_PREFIX}`;
      } else if (kind === "image" && !link.startsWith("http://") && !link.startsWith("https://") && !link.startsWith("/")) {
        status = "error";
        message = "Image link must be a valid HTTP or HTTPS URL";
      }

      parsed.push({
        rowNum,
        subject,
        category,
        folderPath,
        title,
        kind,
        type,
        link,
        caption,
        status,
        message,
      });
    });

    setRows(parsed);
    if (parsed.length > 0) {
      setActiveStep(2);
    }
  };

  const handleFileUpload = (file: File) => {
    setFileName(file.name);
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results: ParseResult<Record<string, unknown>>) => {
          processRawObjects(results.data as any[]);
        },
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
        processRawObjects(json as any[]);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleParsePasted = () => {
    if (!pastedCsv.trim()) return;
    Papa.parse(pastedCsv, {
      header: true,
      skipEmptyLines: true,
      complete: (results: ParseResult<Record<string, unknown>>) => {
        setFileName("Pasted Data");
        processRawObjects(results.data as any[]);
      },
    });
  };

  // ---------------------------------------------------------------------------
  // Execution (Step 3: Batched Firestore writes up to 400 per batch)
  // ---------------------------------------------------------------------------

  const handleExecuteImport = async () => {
    const validRowsToSubmit = rows.filter((r) => {
      if (skipErrors && r.status === "error") return false;
      return true;
    });

    if (validRowsToSubmit.length === 0) return;

    setActiveStep(3);
    setIsImporting(true);
    setProgress(10);
    setFailedRows([]);

    try {
      const batchSize = 350; // up to 400 per batch
      let totalCreatedItems = 0;
      let totalCreatedSubjects = 0;
      let totalCreatedFolders = 0;
      let totalSkipped = 0;
      let totalErrors = 0;
      const accumulatedFailures: ParsedRow[] = [];

      const totalBatches = Math.ceil(validRowsToSubmit.length / batchSize);

      for (let b = 0; b < totalBatches; b++) {
        const slice = validRowsToSubmit.slice(b * batchSize, (b + 1) * batchSize);

        const res = await fetch("/api/admin/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rows: slice,
            dryRun,
            skipDuplicates,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Batch import request failed");
        }

        const sum = data.data.summary;
        totalCreatedItems += sum.createdItems;
        totalCreatedSubjects += sum.createdSubjects;
        totalCreatedFolders += sum.createdFolders;
        totalSkipped += sum.skippedCount;
        totalErrors += sum.errorCount;

        // Record any failed rows
        if (Array.isArray(data.data.results)) {
          data.data.results.forEach((rRes: any) => {
            if (rRes.status === "error") {
              const original = slice[rRes.row - 1];
              if (original) {
                accumulatedFailures.push({
                  ...original,
                  message: rRes.message,
                });
              }
            }
          });
        }

        setProgress(Math.round(((b + 1) / totalBatches) * 100));
      }

      setImportSummary({
        totalRows: validRowsToSubmit.length,
        createdItems: totalCreatedItems,
        createdSubjects: totalCreatedSubjects,
        createdFolders: totalCreatedFolders,
        skippedCount: totalSkipped,
        errorCount: totalErrors,
      });
      setFailedRows(accumulatedFailures);
    } catch (err: any) {
      alert("Import error: " + (err.message || "Unknown error"));
    } finally {
      setIsImporting(false);
    }
  };

  const downloadErrorCsv = () => {
    if (failedRows.length === 0) return;
    const csv = Papa.unparse(failedRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "failed_import_rows.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Counters for preview step
  const validCount = rows.filter((r) => r.status === "ok").length;
  const warningCount = rows.filter((r) => r.status === "warning").length;
  const errorCount = rows.filter((r) => r.status === "error").length;

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto font-sans">
      {/* 3-Step Wizard Indicator */}
      <div className="flex items-center justify-between px-6 py-4 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center gap-3">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
              activeStep === 1
                ? "bg-indigo-600 text-white ring-4 ring-indigo-500/20"
                : "bg-emerald-600 text-white"
            }`}
          >
            1
          </div>
          <span className={`text-xs font-semibold ${activeStep === 1 ? "text-white" : "text-slate-400"}`}>
            Upload / Input Data
          </span>
        </div>

        <div className="h-px bg-slate-800 flex-1 mx-4" />

        <div className="flex items-center gap-3">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
              activeStep === 2
                ? "bg-indigo-600 text-white ring-4 ring-indigo-500/20"
                : activeStep > 2
                ? "bg-emerald-600 text-white"
                : "bg-slate-800 text-slate-500"
            }`}
          >
            2
          </div>
          <span className={`text-xs font-semibold ${activeStep === 2 ? "text-white" : "text-slate-400"}`}>
            Validate & Preview
          </span>
        </div>

        <div className="h-px bg-slate-800 flex-1 mx-4" />

        <div className="flex items-center gap-3">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
              activeStep === 3
                ? "bg-indigo-600 text-white ring-4 ring-indigo-500/20"
                : "bg-slate-800 text-slate-500"
            }`}
          >
            3
          </div>
          <span className={`text-xs font-semibold ${activeStep === 3 ? "text-white" : "text-slate-400"}`}>
            Execute & Report
          </span>
        </div>
      </div>

      {/* STEP 1: UPLOAD */}
      {activeStep === 1 && (
        <div className="flex flex-col gap-6">
          {/* Download Templates Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-indigo-950/40 border border-indigo-800/40 gap-3">
            <div>
              <h4 className="text-xs font-semibold text-indigo-200">
                Need a pre-formatted template with sample GATE subjects and formulas?
              </h4>
              <p className="text-[11px] text-indigo-400 mt-0.5">
                Includes columns: subject, category, folderPath, title, kind, type, link, caption.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={downloadCsvTemplate}>
                Download .CSV
              </Button>
              <Button variant="secondary" size="sm" onClick={downloadXlsxTemplate}>
                Download .XLSX
              </Button>
            </div>
          </div>

          {/* Tab selector */}
          <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1">
            <button
              type="button"
              onClick={() => setTab("file")}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                tab === "file"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              📁 Drag & Drop File (.xlsx, .xls, .csv)
            </button>
            <button
              type="button"
              onClick={() => setTab("paste")}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                tab === "paste"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              📋 Paste CSV / Spreadsheet Text
            </button>
          </div>

          {tab === "file" ? (
            <label className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-700/80 hover:border-indigo-500/80 bg-slate-900/40 hover:bg-slate-900/70 rounded-2xl cursor-pointer transition-all">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-white">
                Click to browse or drop .xlsx, .xls, or .csv here
              </span>
              <span className="text-xs text-slate-400 mt-1">
                Supports up to 5,000 rows with automatic nested folder creation
              </span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileUpload(f);
                }}
                className="hidden"
              />
            </label>
          ) : (
            <div className="flex flex-col gap-3">
              <textarea
                value={pastedCsv}
                onChange={(e) => setPastedCsv(e.target.value)}
                rows={10}
                placeholder="subject,category,folderPath,title,kind,type,link,caption&#10;Signals & Systems,Core,Unit 1/Fourier,CTFT Formula Sheet,file,pdf,https://mega.nz/file/sample#key,High yield"
                className="w-full p-4 bg-slate-900/80 border border-slate-700 rounded-xl font-mono text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex justify-end">
                <Button variant="primary" size="md" onClick={handleParsePasted}>
                  Parse & Preview Data →
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: PREVIEW */}
      {activeStep === 2 && (
        <div className="flex flex-col gap-5">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
              <span className="text-[11px] font-mono text-slate-400">Total Rows</span>
              <p className="text-2xl font-bold font-mono text-white mt-1">{rows.length}</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
              <span className="text-[11px] font-mono text-emerald-400">Valid Rows</span>
              <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">{validCount}</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
              <span className="text-[11px] font-mono text-amber-400">Warnings</span>
              <p className="text-2xl font-bold font-mono text-amber-400 mt-1">{warningCount}</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
              <span className="text-[11px] font-mono text-red-400">Errors</span>
              <p className="text-2xl font-bold font-mono text-red-400 mt-1">{errorCount}</p>
            </div>
          </div>

          {/* Options & Toggles */}
          <div className="flex flex-wrap items-center justify-between p-4 rounded-xl bg-slate-900/40 border border-slate-800 gap-4">
            <div className="flex flex-wrap items-center gap-5 text-xs text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={skipErrors}
                  onChange={(e) => setSkipErrors(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Skip invalid rows</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Skip duplicates (match title)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={dryRun}
                  onChange={(e) => setDryRun(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Dry run (test without saving)</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setActiveStep(1)}>
                ← Back
              </Button>
              <Button variant="primary" size="sm" onClick={handleExecuteImport}>
                {dryRun ? "Test Dry Run" : `Execute Import (${rows.length} rows) →`}
              </Button>
            </div>
          </div>

          {/* Preview Table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
            <div className="overflow-x-auto max-h-[420px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 border-b border-slate-800 text-[10px] uppercase font-mono text-slate-400 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Subject</th>
                    <th className="py-2.5 px-3">Folder Path</th>
                    <th className="py-2.5 px-3">Title</th>
                    <th className="py-2.5 px-3">Kind</th>
                    <th className="py-2.5 px-3">Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {rows.slice(0, 100).map((r) => (
                    <tr key={r.rowNum} className="hover:bg-slate-850/50">
                      <td className="py-2 px-3 font-mono text-slate-500 text-[11px]">
                        {r.rowNum}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            r.status === "ok"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : r.status === "warning"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-red-500/10 text-red-400 border border-red-500/20"
                          }`}
                          title={r.message}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-200">
                        {r.subject}
                      </td>
                      <td className="py-2 px-3 text-slate-400 font-mono text-[11px] truncate max-w-[150px]">
                        {r.folderPath || "[Root]"}
                      </td>
                      <td className="py-2 px-3 text-slate-200 truncate max-w-[200px]">
                        {r.title}
                      </td>
                      <td className="py-2 px-3 font-mono text-[10px] uppercase text-slate-400">
                        {r.kind} {r.kind === "file" && `(${r.type})`}
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px] text-indigo-400 truncate max-w-[180px]">
                        {r.link}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > 100 && (
              <div className="p-2.5 text-center text-[11px] text-slate-500 border-t border-slate-800 bg-slate-900/80">
                Showing first 100 of {rows.length} rows. All {rows.length} will be processed.
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: PROGRESS & REPORT */}
      {activeStep === 3 && (
        <div className="flex flex-col gap-6 p-8 rounded-2xl border border-slate-800 bg-slate-900/60 text-center">
          {isImporting ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Spinner className="w-10 h-10 text-indigo-500" />
              <h3 className="text-base font-semibold text-white">
                {dryRun ? "Testing import dry run..." : "Writing batched records to database..."}
              </h3>
              <div className="w-full max-w-md bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs font-mono text-slate-400">{progress}% complete</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white">
                  {dryRun ? "Dry Run Completed Successfully" : "Bulk Import Complete!"}
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  {dryRun
                    ? "All checks passed. No records were written to the database."
                    : "Your GATE exam notes and folder hierarchies are now live on the platform."}
                </p>
              </div>

              {/* Metrics Grid */}
              {importSummary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-2xl text-left">
                  <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Items Created</span>
                    <p className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                      {importSummary.createdItems}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Subjects Created</span>
                    <p className="text-xl font-bold font-mono text-indigo-400 mt-0.5">
                      {importSummary.createdSubjects}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Folders Created</span>
                    <p className="text-xl font-bold font-mono text-amber-400 mt-0.5">
                      {importSummary.createdFolders}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Duplicates Skipped</span>
                    <p className="text-xl font-bold font-mono text-slate-300 mt-0.5">
                      {importSummary.skippedCount}
                    </p>
                  </div>
                </div>
              )}

              {/* Error action */}
              {failedRows.length > 0 && (
                <div className="p-4 rounded-xl border border-red-800/60 bg-red-950/40 flex items-center justify-between w-full max-w-2xl text-left">
                  <div>
                    <h5 className="text-xs font-semibold text-red-300">
                      {failedRows.length} rows encountered issues
                    </h5>
                    <p className="text-[11px] text-red-400 mt-0.5">
                      Download the error report to review and re-import failed entries.
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={downloadErrorCsv}>
                    Download Error CSV
                  </Button>
                </div>
              )}

              {/* Bottom Navigation */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => {
                    setRows([]);
                    setFileName("");
                    setPastedCsv("");
                    setActiveStep(1);
                  }}
                >
                  Import More Files
                </Button>
                <a
                  href="/admin/subjects"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
                >
                  Go to Subjects Manager →
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
