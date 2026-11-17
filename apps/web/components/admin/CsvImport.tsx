"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import type { CsvImportRow } from "@notes/shared";

interface ImportResponse {
  total: number;
  imported: number;
  failed: number;
  results: Array<{
    row: number;
    title: string;
    success: boolean;
    error?: string;
  }>;
}

export function CsvImport() {
  const [csvText, setCsvText] = useState("");
  const [parsedRows, setParsedRows] = useState<CsvImportRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResponse | null>(null);

  const sampleCsv = `subject,title,megaLink
CS101,Unit 1 Lecture Slides,https://mega.nz/file/sample1#key1
CS101,Unit 2 Graph Algorithms,https://mega.nz/file/sample2#key2
MATH201,Calculus Formulas Cheat Sheet,https://mega.nz/file/sample3#key3`;

  const parseCsvManually = (text: string) => {
    const lines = text.trim().split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      setParseErrors(["CSV must contain a header row and at least one data row."]);
      setParsedRows([]);
      return;
    }

    const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const subjectIdx = header.findIndex((h) => h.includes("subject"));
    const titleIdx = header.findIndex((h) => h.includes("title") || h.includes("name"));
    const linkIdx = header.findIndex((h) => h.includes("link") || h.includes("mega") || h.includes("url"));

    if (subjectIdx === -1 || titleIdx === -1 || linkIdx === -1) {
      setParseErrors([
        'CSV header must include "subject", "title", and "megaLink" (or "link") columns.',
      ]);
      setParsedRows([]);
      return;
    }

    const rows: CsvImportRow[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Basic comma splitting respecting quotes
      const cols = line.split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
      const subject = cols[subjectIdx] ?? "";
      const title = cols[titleIdx] ?? "";
      const megaLink = cols[linkIdx] ?? "";

      if (!subject || !title || !megaLink) {
        errors.push(`Row ${i + 1}: Missing required fields (subject, title, or megaLink)`);
        continue;
      }

      if (!megaLink.startsWith("https://mega.nz/")) {
        errors.push(`Row ${i + 1}: Link must start with https://mega.nz/`);
        continue;
      }

      rows.push({ subject, title, megaLink });
    }

    setParseErrors(errors);
    setParsedRows(rows);
    setImportResult(null);
  };

  const handleParse = () => {
    setParseErrors([]);
    setImportResult(null);
    parseCsvManually(csvText);
  };

  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) return;
    setIsImporting(true);
    setImportResult(null);

    try {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: parsedRows }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Import failed");
      }

      setImportResult(data.data);
    } catch (err: unknown) {
      setParseErrors([err instanceof Error ? err.message : "Import execution error"]);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* CSV Input Card */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Paste CSV Data</h3>
            <p className="text-gray-400 text-[11px] mt-0.5">
              Required columns: <code className="text-indigo-400">subject, title, megaLink</code>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCsvText(sampleCsv)}
            className="text-[11px] text-indigo-400 hover:text-indigo-300 underline"
          >
            Insert Sample Template
          </button>
        </div>

        <textarea
          rows={8}
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          placeholder={`subject,title,megaLink\nCS101,Data Structures PDF,https://mega.nz/file/...\nCS102,Algorithms PPT,https://mega.nz/file/...`}
          className="w-full p-3 bg-gray-950 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-xs leading-relaxed"
        />

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-gray-500">
            {csvText.trim() ? `${csvText.trim().split("\n").length - 1} rows detected` : "No rows"}
          </span>

          <Button
            type="button"
            variant="primary"
            onClick={handleParse}
            disabled={!csvText.trim()}
          >
            Parse & Validate Preview →
          </Button>
        </div>
      </div>

      {/* Parse Errors */}
      {parseErrors.length > 0 && (
        <div className="p-4 bg-red-950/40 border border-red-800 rounded-xl space-y-1.5">
          <p className="font-bold text-red-300">Validation Warnings / Errors:</p>
          <ul className="list-disc list-inside space-y-1 text-red-400 text-[11px]">
            {parseErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Preview Table */}
      {parsedRows.length > 0 && !importResult && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Ready to Import ({parsedRows.length} valid notes)
              </h3>
              <p className="text-gray-400 text-[11px] mt-0.5">
                Review below before writing to database
              </p>
            </div>

            <Button
              type="button"
              variant="primary"
              onClick={handleExecuteImport}
              disabled={isImporting}
              className="bg-emerald-600 hover:bg-emerald-500 border-emerald-500"
            >
              {isImporting ? (
                <span className="flex items-center gap-1.5">
                  <Spinner className="w-3.5 h-3.5" /> Importing to Firestore...
                </span>
              ) : (
                `Confirm & Bulk Import (${parsedRows.length})`
              )}
            </Button>
          </div>

          <div className="overflow-x-auto border border-gray-800 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-950 border-b border-gray-800 text-gray-500 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 w-12">#</th>
                  <th className="py-2.5 px-3">Subject Match</th>
                  <th className="py-2.5 px-4">Title</th>
                  <th className="py-2.5 px-4">MEGA Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {parsedRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-850/30">
                    <td className="py-2.5 px-3 text-gray-500">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-bold text-indigo-400">
                      {row.subject}
                    </td>
                    <td className="py-2.5 px-4 text-gray-200">{row.title}</td>
                    <td className="py-2.5 px-4 text-gray-400 truncate max-w-xs">
                      {row.megaLink}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import Result Summary */}
      {importResult && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="p-4 bg-emerald-950/40 border border-emerald-800 rounded-lg text-emerald-300">
            <h4 className="font-bold text-sm">Bulk Import Complete!</h4>
            <p className="text-xs mt-1">
              Successfully imported <strong>{importResult.imported}</strong> notes.{" "}
              {importResult.failed > 0 && (
                <span className="text-red-400">
                  ({importResult.failed} failed due to unmatched subjects or bad links)
                </span>
              )}
            </p>
          </div>

          {importResult.results.some((r) => !r.success) && (
            <div className="space-y-2">
              <p className="font-semibold text-gray-300">Failed Rows:</p>
              <div className="overflow-x-auto border border-gray-800 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-950 border-b border-gray-800 text-gray-500 uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-3">Row</th>
                      <th className="py-2 px-3">Title</th>
                      <th className="py-2 px-4">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {importResult.results
                      .filter((r) => !r.success)
                      .map((r, i) => (
                        <tr key={i} className="text-red-300">
                          <td className="py-2 px-3">#{r.row}</td>
                          <td className="py-2 px-3">{r.title}</td>
                          <td className="py-2 px-4">{r.error}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setParsedRows([]);
              setImportResult(null);
              setCsvText("");
            }}
          >
            Import Another Batch
          </Button>
        </div>
      )}
    </div>
  );
}
