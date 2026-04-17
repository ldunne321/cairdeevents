import { getSupabaseClient } from '@/lib/supabase';
import { formatSlug } from '@/lib/utils';
import type { Attendee, AllergySeverity } from '@/types';
import ExportButton from './ExportButton';

export const dynamic = 'force-dynamic';

interface Props {
  params: { 'event-slug': string };
}

function severityBadge(severity: AllergySeverity | null) {
  if (!severity) return null;
  const styles: Record<AllergySeverity, string> = {
    Mild: 'bg-yellow-100 text-yellow-800',
    Severe: 'bg-orange-100 text-orange-800',
    Anaphylactic: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${styles[severity]}`}>
      {severity}
    </span>
  );
}

export default async function AdminPage({ params }: Props) {
  const eventSlug = params['event-slug'];

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('attendees')
    .select('*')
    .eq('event_slug', eventSlug)
    .order('full_name', { ascending: true });

  if (error) {
    return (
      <div className="min-h-screen bg-white p-8">
        <p className="text-red-600 text-sm">Failed to load data: {error.message}</p>
      </div>
    );
  }

  const attendees = (data as Attendee[]) ?? [];

  // Catering brief — group by dietary requirement
  const dietaryGroups = attendees.reduce<Record<string, Attendee[]>>((acc, a) => {
    const key = a.dietary_requirement === 'Other' && a.dietary_other
      ? `Other — ${a.dietary_other}`
      : a.dietary_requirement;
    (acc[key] ??= []).push(a);
    return acc;
  }, {});

  const epilepsyList = attendees.filter((a) => a.has_epilepsy);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-gray-100 px-4 py-4">
        <h1 className="text-xl font-semibold text-gray-900 text-center tracking-tight">
          Debs Guru — Admin
        </h1>
        <p className="text-center text-sm text-gray-500 mt-0.5">{formatSlug(eventSlug)}</p>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10 space-y-14">

        {/* ── Section 1: Full attendance list ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 uppercase tracking-wide">
              Attendance{' '}
              <span className="font-normal text-gray-500 normal-case">({attendees.length})</span>
            </h2>
            <ExportButton attendees={attendees} eventSlug={eventSlug} />
          </div>

          {attendees.length === 0 ? (
            <p className="text-sm text-gray-500">No attendees registered yet.</p>
          ) : (
            <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
              {attendees.map((a) => (
                <div key={a.id} className="flex items-start justify-between gap-4 px-4 py-3 bg-white">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {a.full_name}
                      {a.is_plus_one && (
                        <span className="ml-2 text-xs font-normal text-gray-400">
                          (+1 of {a.plus_one_of})
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {a.dietary_requirement === 'Other' ? a.dietary_other : a.dietary_requirement}
                    </p>
                  </div>
                  {a.has_allergy && (
                    <div className="text-right shrink-0">
                      {severityBadge(a.allergy_severity)}
                      <p className="text-xs text-gray-600 mt-1">{a.allergy_detail}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Section 2: Catering brief ── */}
        <section>
          <h2 className="text-base font-semibold text-gray-900 uppercase tracking-wide mb-4">
            Catering brief
          </h2>

          {Object.keys(dietaryGroups).length === 0 ? (
            <p className="text-sm text-gray-500">No attendees registered yet.</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(dietaryGroups)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([category, people]) => {
                  const withAllergy = people.filter((p) => p.has_allergy);
                  return (
                    <div key={category}>
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">
                        {category}{' '}
                        <span className="font-normal text-gray-500">— {people.length}</span>
                      </h3>
                      {withAllergy.length > 0 && (
                        <ul className="space-y-2 pl-4 border-l-2 border-gray-100">
                          {withAllergy.map((p) => (
                            <li key={p.id} className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                              <span className="font-medium">{p.full_name}</span>
                              <span className="text-gray-400">—</span>
                              <span>{p.allergy_detail}</span>
                              {severityBadge(p.allergy_severity)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </section>

        {/* ── Section 3: Epilepsy flags ── */}
        <section>
          <h2 className="text-base font-semibold text-gray-900 uppercase tracking-wide mb-4">
            Epilepsy flags
          </h2>

          {epilepsyList.length === 0 ? (
            <p className="text-sm text-gray-500">No epilepsy flags for this event.</p>
          ) : (
            <ul className="space-y-2">
              {epilepsyList.map((a) => (
                <li key={a.id} className="text-sm font-medium text-gray-900">
                  {a.full_name}
                </li>
              ))}
            </ul>
          )}
        </section>

      </main>
      <footer className="py-6 text-center">
        <p className="text-xs text-gray-400">Powered by Cairde Events</p>
      </footer>
    </div>
  );
}
