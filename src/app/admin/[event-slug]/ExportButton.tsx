'use client';

import * as XLSX from 'xlsx';
import type { Attendee } from '@/types';

interface Props {
  attendees: Attendee[];
  eventSlug: string;
}

function yn(v: boolean): string {
  return v ? 'Yes' : 'No';
}

function val(v: string | null | undefined): string {
  return v ?? '';
}

export default function ExportButton({ attendees, eventSlug }: Props) {
  function handleExport() {
    const wb = XLSX.utils.book_new();

    // Sheet 1 — Attendance List: all attendees, alphabetical by name
    const sheet1Rows = [...attendees]
      .sort((a, b) => a.full_name.localeCompare(b.full_name))
      .map((a) => ({
        Name: a.full_name,
        'Plus One': yn(a.is_plus_one),
        'Plus One Of': val(a.plus_one_of),
        'Dietary Requirement': a.dietary_requirement,
        'Dietary Other': val(a.dietary_other),
        'Has Allergy': yn(a.has_allergy),
        'Allergy Detail': val(a.allergy_detail),
        'Allergy Severity': val(a.allergy_severity),
        Epilepsy: yn(a.has_epilepsy),
      }));

    const ws1 = XLSX.utils.json_to_sheet(sheet1Rows);
    ws1['!cols'] = [
      { wch: 25 }, // Name
      { wch: 10 }, // Plus One
      { wch: 22 }, // Plus One Of
      { wch: 22 }, // Dietary Requirement
      { wch: 20 }, // Dietary Other
      { wch: 12 }, // Has Allergy
      { wch: 25 }, // Allergy Detail
      { wch: 18 }, // Allergy Severity
      { wch: 10 }, // Epilepsy
    ];
    XLSX.utils.book_append_sheet(wb, ws1, 'Attendance List');

    // Sheet 2 — Catering Brief: non-None dietary or allergy flagged, sorted by dietary
    const sheet2Rows = attendees
      .filter((a) => a.dietary_requirement !== 'None' || a.has_allergy)
      .sort((a, b) => a.dietary_requirement.localeCompare(b.dietary_requirement))
      .map((a) => ({
        'Dietary Requirement': a.dietary_requirement,
        Name: a.full_name,
        'Allergy Detail': val(a.allergy_detail),
        'Allergy Severity': val(a.allergy_severity),
      }));

    const ws2 = XLSX.utils.json_to_sheet(sheet2Rows);
    ws2['!cols'] = [
      { wch: 22 }, // Dietary Requirement
      { wch: 25 }, // Name
      { wch: 25 }, // Allergy Detail
      { wch: 18 }, // Allergy Severity
    ];
    XLSX.utils.book_append_sheet(wb, ws2, 'Catering Brief');

    XLSX.writeFile(wb, `${eventSlug}-export.xlsx`);
  }

  return (
    <button
      onClick={handleExport}
      className="text-sm font-medium text-gray-700 border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50 active:bg-gray-100 transition-colors"
    >
      Export to Excel
    </button>
  );
}
