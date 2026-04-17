import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase';
import type { Event } from '@/types';

export const dynamic = 'force-dynamic';

function formatDate(date: string | null): string {
  if (!date) return '—';
  // Parse as local date to avoid UTC-offset display shifts.
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-IE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default async function AdminLandingPage() {
  const supabase = getSupabaseClient();

  const [{ data: eventsData, error: eventsError }, { data: attendeeRows, error: attendeesError }] =
    await Promise.all([
      supabase.from('events').select('*').order('event_date', { ascending: true }),
      supabase.from('attendees').select('event_slug'),
    ]);

  if (eventsError || attendeesError) {
    return (
      <div className="min-h-screen bg-white p-8">
        <p className="text-red-600 text-sm">
          Failed to load data: {eventsError?.message ?? attendeesError?.message}
        </p>
      </div>
    );
  }

  const events = (eventsData ?? []) as Event[];

  const countBySlug: Record<string, number> = {};
  for (const row of attendeeRows ?? []) {
    countBySlug[row.event_slug] = (countBySlug[row.event_slug] ?? 0) + 1;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-gray-100 px-4 py-4">
        <h1 className="text-xl font-semibold text-gray-900 text-center tracking-tight">
          Debs Guru — Admin
        </h1>
        <p className="text-center text-sm text-gray-500 mt-0.5">All events</p>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10">
        {events.length === 0 ? (
          <p className="text-sm text-gray-500">
            No events yet. They will appear here once someone submits a registration form.
          </p>
        ) : (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">School name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Registered</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Debs night</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-0">
                      <Link
                        href={`/admin/${event.slug}`}
                        className="block px-4 py-3 font-medium text-gray-900"
                      >
                        {event.school_name}
                      </Link>
                    </td>
                    <td className="px-0">
                      <Link
                        href={`/admin/${event.slug}`}
                        className="block px-4 py-3 text-gray-700"
                      >
                        {countBySlug[event.slug] ?? 0}
                      </Link>
                    </td>
                    <td className="px-0">
                      <Link
                        href={`/admin/${event.slug}`}
                        className="block px-4 py-3 text-gray-700"
                      >
                        {formatDate(event.event_date)}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <footer className="py-6 text-center">
        <p className="text-xs text-gray-400">Powered by Cairde Events</p>
      </footer>
    </div>
  );
}
