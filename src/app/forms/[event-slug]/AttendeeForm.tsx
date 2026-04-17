'use client';

import { useState } from 'react';
import { formatSlug } from '@/lib/utils';

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

interface FormState {
  full_name: string;
  is_plus_one: boolean;
  plus_one_of: string;
  dietary_requirement: DietaryOption;
  dietary_other: string;
  has_allergy: boolean;
  allergy_detail: string;
  allergy_severity: SeverityOption | '';
  has_epilepsy: boolean;
  gdpr_consent: boolean;
}

interface FormErrors {
  full_name?: string;
  plus_one_of?: string;
  dietary_other?: string;
  allergy_detail?: string;
  allergy_severity?: string;
  gdpr_consent?: string;
}

const initial: FormState = {
  full_name: '',
  is_plus_one: false,
  plus_one_of: '',
  dietary_requirement: 'None',
  dietary_other: '',
  has_allergy: false,
  allergy_detail: '',
  allergy_severity: '',
  has_epilepsy: false,
  gdpr_consent: false,
};

function YesNo({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const base =
    'flex-1 min-h-[48px] rounded-lg border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900';
  const active = 'bg-gray-900 text-white border-gray-900';
  const inactive = 'bg-white text-gray-600 border-gray-300';
  return (
    <div className="flex gap-2 mt-1">
      <button type="button" onClick={() => onChange(true)} className={`${base} ${value ? active : inactive}`}>
        Yes
      </button>
      <button type="button" onClick={() => onChange(false)} className={`${base} ${!value ? active : inactive}`}>
        No
      </button>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-sm text-red-600">{message}</p>;
}

export default function AttendeeForm({ eventSlug }: { eventSlug: string }) {
  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const next: FormErrors = {};

    if (!form.full_name.trim()) {
      next.full_name = 'Full name is required.';
    }
    if (form.is_plus_one && !form.plus_one_of.trim()) {
      next.plus_one_of = 'Please enter whose +1 this person is.';
    }
    if (form.dietary_requirement === 'Other' && !form.dietary_other.trim()) {
      next.dietary_other = 'Please specify the dietary requirement.';
    }
    if (form.has_allergy && !form.allergy_detail.trim()) {
      next.allergy_detail = 'Please describe the allergy.';
    }
    if (form.has_allergy && !form.allergy_severity) {
      next.allergy_severity = 'Please select allergy severity.';
    }
    if (!form.gdpr_consent) {
      next.gdpr_consent = 'You must give consent to submit.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setServerError(null);

    try {
      const res = await fetch('/api/attendees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, event_slug: eventSlug }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? 'Something went wrong. Please try again.');
      }

      setSubmitted(true);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">You&apos;re registered</h2>
            <p className="text-gray-500 text-sm">Thank you for completing the form.</p>
          </div>
        </div>
        <footer className="py-6 text-center">
          <p className="text-xs text-gray-400">Powered by Cairde Events</p>
        </footer>
      </div>
    );
  }

  const inputClass = (error?: string) =>
    `w-full min-h-[48px] px-3 py-2 border rounded-lg text-gray-900 text-base bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 ${
      error ? 'border-red-500' : 'border-gray-300'
    }`;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-gray-100 px-4 py-4">
        <h1 className="text-xl font-semibold text-gray-900 text-center tracking-tight">Debs Guru</h1>
        <p className="text-center text-sm text-gray-500 mt-0.5">{formatSlug(eventSlug)}</p>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-8">
        <form onSubmit={handleSubmit} noValidate className="space-y-6">

          {/* 1. Full name */}
          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-900 mb-1">
              Full name <span className="text-red-600" aria-hidden="true">*</span>
            </label>
            <input
              id="full_name"
              type="text"
              autoComplete="name"
              value={form.full_name}
              onChange={(e) => set('full_name', e.target.value)}
              className={inputClass(errors.full_name)}
            />
            <FieldError message={errors.full_name} />
          </div>

          {/* 2. Is +1? */}
          <div>
            <span className="block text-sm font-medium text-gray-900">Is this person a +1?</span>
            <YesNo value={form.is_plus_one} onChange={(v) => set('is_plus_one', v)} />
          </div>

          {/* 3. Whose +1 (conditional) */}
          {form.is_plus_one && (
            <div>
              <label htmlFor="plus_one_of" className="block text-sm font-medium text-gray-900 mb-1">
                Whose +1 are they? <span className="text-red-600" aria-hidden="true">*</span>
              </label>
              <input
                id="plus_one_of"
                type="text"
                value={form.plus_one_of}
                onChange={(e) => set('plus_one_of', e.target.value)}
                className={inputClass(errors.plus_one_of)}
              />
              <FieldError message={errors.plus_one_of} />
            </div>
          )}

          {/* 4. Dietary requirement */}
          <div>
            <label htmlFor="dietary_requirement" className="block text-sm font-medium text-gray-900 mb-1">
              Dietary requirement
            </label>
            <select
              id="dietary_requirement"
              value={form.dietary_requirement}
              onChange={(e) => set('dietary_requirement', e.target.value as DietaryOption)}
              className="w-full min-h-[48px] px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-base bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              {DIETARY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* 5. Dietary other (conditional) */}
          {form.dietary_requirement === 'Other' && (
            <div>
              <label htmlFor="dietary_other" className="block text-sm font-medium text-gray-900 mb-1">
                Please specify <span className="text-red-600" aria-hidden="true">*</span>
              </label>
              <input
                id="dietary_other"
                type="text"
                value={form.dietary_other}
                onChange={(e) => set('dietary_other', e.target.value)}
                className={inputClass(errors.dietary_other)}
              />
              <FieldError message={errors.dietary_other} />
            </div>
          )}

          {/* 6. Has allergies? */}
          <div>
            <span className="block text-sm font-medium text-gray-900">Do you have any allergies?</span>
            <YesNo value={form.has_allergy} onChange={(v) => set('has_allergy', v)} />
          </div>

          {/* 7. Allergy detail (conditional) */}
          {form.has_allergy && (
            <div>
              <label htmlFor="allergy_detail" className="block text-sm font-medium text-gray-900 mb-1">
                Please describe the allergy <span className="text-red-600" aria-hidden="true">*</span>
              </label>
              <input
                id="allergy_detail"
                type="text"
                value={form.allergy_detail}
                onChange={(e) => set('allergy_detail', e.target.value)}
                className={inputClass(errors.allergy_detail)}
              />
              <FieldError message={errors.allergy_detail} />
            </div>
          )}

          {/* 8. Allergy severity (conditional) */}
          {form.has_allergy && (
            <div>
              <label htmlFor="allergy_severity" className="block text-sm font-medium text-gray-900 mb-1">
                Allergy severity <span className="text-red-600" aria-hidden="true">*</span>
              </label>
              <select
                id="allergy_severity"
                value={form.allergy_severity}
                onChange={(e) => set('allergy_severity', e.target.value as SeverityOption)}
                className={`w-full min-h-[48px] px-3 py-2 border rounded-lg text-gray-900 text-base bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 ${
                  errors.allergy_severity ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select severity…</option>
                {SEVERITY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <FieldError message={errors.allergy_severity} />
            </div>
          )}

          {/* 9. Epilepsy */}
          <div>
            <span className="block text-sm font-medium text-gray-900">
              Does this person have epilepsy?
            </span>
            <YesNo value={form.has_epilepsy} onChange={(v) => set('has_epilepsy', v)} />
          </div>

          {/* 10. GDPR */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.gdpr_consent}
                onChange={(e) => set('gdpr_consent', e.target.checked)}
                className="mt-0.5 w-5 h-5 shrink-0 rounded border-gray-300 accent-gray-900 focus:ring-2 focus:ring-gray-900"
              />
              <span className="text-sm text-gray-700 leading-relaxed">
                I consent to my dietary and medical information being stored securely by Cairde for the
                purpose of coordinating this event. This data will not be shared beyond the event venue
                and will be deleted after the event.
              </span>
            </label>
            <FieldError message={errors.gdpr_consent} />
          </div>

          {/* Server error */}
          {serverError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-700">{serverError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[52px] bg-gray-900 text-white rounded-lg text-base font-medium hover:bg-gray-800 active:bg-gray-950 transition-colors disabled:opacity-60"
          >
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </form>
      </main>
      <footer className="py-6 text-center">
        <p className="text-xs text-gray-400">Powered by Cairde Events</p>
      </footer>
    </div>
  );
}
