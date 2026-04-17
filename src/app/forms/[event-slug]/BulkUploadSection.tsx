'use client';

import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';

const DIETARY_OPTIONS = [
  'None',
  'Vegetarian',
  'Vegan',
  'Halal',
  'Kosher',
  'Gluten-free',
  'Dairy-free',
  'Other',
] as const;

const SEVERITY_OPTIONS = ['Mild', 'Severe', 'Anaphylactic'] as const;

type DietaryOption = (typeof DIETARY_OPTIONS)[number];
type SeverityOption = (typeof SEVERITY_OPTIONS)[number];

const TEMPLATE_HEADERS = [
  'Full Name',
  'Is Plus One (Yes/No)',
  'Plus One Of',
  'Dietary Requirement',
  'Has Allergy (Yes/No)',
  'Allergy Detail',
  'Allergy Severity (Mild/Severe/Anaphylactic)',
  'Has Epilepsy (Yes/No)',
] as const;

interface ParsedRow {
  full_name: string;
  is_plus_one: boolean;
  plus_one_of: string;
  dietary_requirement: DietaryOption;
  has_allergy: boolean;
  allergy_detail: string;
  allergy_severity: string;
  has_epilepsy: boolean;
}

interface ValidationError {
  row: number;
  reason: string;
}

interface SubmitResult {
  succeeded: number;
  failures: Array<{ name: string; reason: string }>;
}

type Phase = 'idle' | 'errors' | 'preview' | 'submitting' | 'results';

function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    [...TEMPLATE_HEADERS],
    ['Dietary Requirement options: None, Vegetarian, Vegan, Halal, Kosher, Gluten-free, Dairy-free, Other'],
  ]);
  ws['!cols'] = TEMPLATE_HEADERS.map(() => ({ wch: 28 }));
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.writeFile(wb, 'cairde-attendance-template.xlsx');
}

async function parseWorkbook(
  file: File,
): Promise<{ rows: ParsedRow[]; errors: ValidationError[] }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, {
        header: 1,
        defval: '',
      }) as string[][];

      if (raw.length < 2) {
        return resolve({
          rows: [],
          errors: [{ row: 1, reason: 'The file appears to be empty.' }],
        });
      }

      const headers = raw[0].map((h) => String(h).trim());
      const COL: Record<string, number> = {};
      TEMPLATE_HEADERS.forEach((h) => {
        COL[h] = headers.indexOf(h);
      });

      const missing = TEMPLATE_HEADERS.filter((h) => COL[h] === -1);
      if (missing.length > 0) {
        return resolve({
          rows: [],
          errors: [
            {
              row: 1,
              reason: `Missing required columns: ${missing.join(', ')}. Please use the provided template.`,
            },
          ],
        });
      }

      const errors: ValidationError[] = [];
      const rows: ParsedRow[] = [];

      for (let i = 1; i < raw.length; i++) {
        const rowNum = i + 1; // 1-indexed spreadsheet row
        const cells = raw[i].map((c) => String(c ?? '').trim());

        // Skip fully blank rows
        if (cells.every((c) => !c)) continue;

        const fullName = cells[COL['Full Name']];

        // Skip the template note row
        if (fullName.startsWith('Dietary Requirement options:')) continue;

        const isPlusOneRaw = cells[COL['Is Plus One (Yes/No)']];
        const plusOneOf = cells[COL['Plus One Of']];
        const dietaryRaw = cells[COL['Dietary Requirement']];
        const hasAllergyRaw = cells[COL['Has Allergy (Yes/No)']];
        const allergyDetail = cells[COL['Allergy Detail']];
        const allergySeverityRaw = cells[COL['Allergy Severity (Mild/Severe/Anaphylactic)']];
        const hasEpilepsyRaw = cells[COL['Has Epilepsy (Yes/No)']];

        const rowErrors: string[] = [];

        if (!fullName) rowErrors.push('Full Name is required.');
        if (!['Yes', 'No'].includes(isPlusOneRaw))
          rowErrors.push(`Is Plus One must be "Yes" or "No".`);
        if (!DIETARY_OPTIONS.includes(dietaryRaw as DietaryOption)) {
          rowErrors.push(`Dietary Requirement "${dietaryRaw || '(blank)'}" is not valid.`);
        } else if (dietaryRaw === 'Other') {
          rowErrors.push(
            'Dietary Requirement "Other" cannot be submitted in bulk — use the individual form for this person.',
          );
        }
        if (!['Yes', 'No'].includes(hasAllergyRaw))
          rowErrors.push(`Has Allergy must be "Yes" or "No".`);
        if (hasAllergyRaw === 'Yes') {
          if (!allergyDetail) rowErrors.push('Allergy Detail is required when Has Allergy is Yes.');
          if (!SEVERITY_OPTIONS.includes(allergySeverityRaw as SeverityOption))
            rowErrors.push('Allergy Severity must be Mild, Severe, or Anaphylactic.');
        } else if (
          allergySeverityRaw &&
          !SEVERITY_OPTIONS.includes(allergySeverityRaw as SeverityOption)
        ) {
          rowErrors.push(`Allergy Severity "${allergySeverityRaw}" is not valid.`);
        }
        if (!['Yes', 'No'].includes(hasEpilepsyRaw))
          rowErrors.push(`Has Epilepsy must be "Yes" or "No".`);

        if (rowErrors.length > 0) {
          rowErrors.forEach((reason) => errors.push({ row: rowNum, reason }));
        } else {
          rows.push({
            full_name: fullName,
            is_plus_one: isPlusOneRaw === 'Yes',
            plus_one_of: plusOneOf,
            dietary_requirement: dietaryRaw as DietaryOption,
            has_allergy: hasAllergyRaw === 'Yes',
            allergy_detail: allergyDetail,
            allergy_severity: allergySeverityRaw,
            has_epilepsy: hasEpilepsyRaw === 'Yes',
          });
        }
      }

      if (rows.length === 0 && errors.length === 0) {
        return resolve({
          rows: [],
          errors: [{ row: 2, reason: 'No data rows found in the file.' }],
        });
      }

      resolve({ rows, errors });
    };
    reader.readAsArrayBuffer(file);
  });
}

export default function BulkUploadSection({ eventSlug }: { eventSlug: string }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { rows: parsed, errors } = await parseWorkbook(file);
    if (errors.length > 0) {
      setValidationErrors(errors);
      setPhase('errors');
    } else {
      setRows(parsed);
      setPhase('preview');
    }
  }, []);

  async function handleSubmitAll() {
    setPhase('submitting');
    setProgress(0);

    let succeeded = 0;
    const failures: Array<{ name: string; reason: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const res = await fetch('/api/attendees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...row,
            dietary_other: '',
            event_slug: eventSlug,
            gdpr_consent: true,
          }),
        });
        if (res.ok) {
          succeeded++;
        } else {
          const data = (await res.json()) as { error?: string };
          failures.push({ name: row.full_name, reason: data.error ?? 'Unknown error' });
        }
      } catch {
        failures.push({ name: row.full_name, reason: 'Network error' });
      }
      setProgress(i + 1);
    }

    setResult({ succeeded, failures });
    setPhase('results');
  }

  function reset() {
    setPhase('idle');
    setValidationErrors([]);
    setRows([]);
    setProgress(0);
    setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-1">
          Bulk upload
        </h2>
        <p className="text-sm text-gray-500">
          Fill in the Excel template and upload to register multiple people at once.
        </p>
      </div>

      {phase === 'idle' && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={downloadTemplate}
            className="text-sm font-medium text-gray-700 underline underline-offset-2 hover:text-gray-900 transition-colors"
          >
            ↓ Download template
          </button>
          <div>
            <label htmlFor="bulk-file" className="block text-sm font-medium text-gray-700 mb-1">
              Upload completed template
            </label>
            <input
              ref={fileRef}
              id="bulk-file"
              type="file"
              accept=".xlsx"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-gray-300 file:text-sm file:font-medium file:bg-white file:text-gray-700 hover:file:bg-gray-50 file:cursor-pointer cursor-pointer"
            />
          </div>
        </div>
      )}

      {phase === 'errors' && (
        <div className="space-y-3">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm font-medium text-red-800 mb-2">
              {validationErrors.length}{' '}
              {validationErrors.length === 1 ? 'error' : 'errors'} found — fix the spreadsheet
              and re-upload.
            </p>
            <ul className="space-y-1">
              {validationErrors.map((err, i) => (
                <li key={i} className="text-sm text-red-700">
                  <span className="font-medium">Row {err.row}:</span> {err.reason}
                </li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            onClick={reset}
            className="text-sm font-medium text-gray-700 underline underline-offset-2 hover:text-gray-900 transition-colors"
          >
            ← Re-upload
          </button>
        </div>
      )}

      {phase === 'preview' && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-900">
            {rows.length} {rows.length === 1 ? 'person' : 'people'} ready to submit
          </p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['Name', 'Dietary', 'Allergy', 'Severity', 'Epilepsy'].map((h) => (
                    <th
                      key={h}
                      className="text-left px-3 py-2 font-medium text-gray-600 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-gray-900 whitespace-nowrap">
                      {r.full_name}
                      {r.is_plus_one && (
                        <span className="ml-1 text-gray-400 font-normal">
                          (+1 of {r.plus_one_of})
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                      {r.dietary_requirement}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {r.has_allergy ? r.allergy_detail : '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                      {r.allergy_severity || '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-700">{r.has_epilepsy ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSubmitAll}
              className="flex-1 min-h-[44px] bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 active:bg-gray-950 transition-colors"
            >
              Submit all
            </button>
            <button
              type="button"
              onClick={reset}
              className="min-h-[44px] px-4 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {phase === 'submitting' && (
        <div className="rounded-lg border border-gray-200 px-4 py-4 space-y-2">
          <p className="text-sm font-medium text-gray-900">
            Submitting {progress} of {rows.length}…
          </p>
          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gray-900 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${Math.round((progress / rows.length) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {phase === 'results' && result && (
        <div className="space-y-3">
          <div
            className={`rounded-lg border px-4 py-3 ${
              result.failures.length === 0
                ? 'border-green-200 bg-green-50'
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            <p className="text-sm font-medium text-gray-900">
              {result.succeeded} {result.succeeded === 1 ? 'person' : 'people'} submitted
              successfully.
            </p>
            {result.failures.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium text-red-800 mb-1">
                  {result.failures.length} failed:
                </p>
                <ul className="space-y-1">
                  {result.failures.map((f, i) => (
                    <li key={i} className="text-sm text-red-700">
                      <span className="font-medium">{f.name}:</span> {f.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={reset}
            className="text-sm font-medium text-gray-700 underline underline-offset-2 hover:text-gray-900 transition-colors"
          >
            ← Upload another file
          </button>
        </div>
      )}
    </div>
  );
}
