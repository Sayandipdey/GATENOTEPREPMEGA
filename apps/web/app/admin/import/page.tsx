import { BulkImporter } from "@/components/admin/BulkImporter";

export default function AdminImportPage() {
  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
          Excel & CSV Bulk Importer
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Upload spreadsheets (.xlsx, .xls, .csv) to auto-create GATE subjects, nested folder trees, and study items in batches.
        </p>
      </div>

      <BulkImporter />
    </div>
  );
}
