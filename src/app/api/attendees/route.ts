import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

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

type Body = Record<string, unknown>;

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function bool(v: unknown): boolean {
  return v === true;
}

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  // --- Server-side validation ---
  const errors: string[] = [];

  const full_name = str(body.full_name);
  const event_slug = str(body.event_slug);

  if (!full_name) errors.push('Full name is required.');
  if (!event_slug) errors.push('Event slug is required.');

  const is_plus_one = bool(body.is_plus_one);
  const plus_one_of = str(body.plus_one_of);
  if (is_plus_one && !plus_one_of) errors.push('Please specify whose +1 this person is.');

  const dietary_requirement = str(body.dietary_requirement);
  if (!DIETARY_OPTIONS.includes(dietary_requirement as (typeof DIETARY_OPTIONS)[number])) {
    errors.push('Invalid dietary requirement.');
  }
  const dietary_other = str(body.dietary_other);
  if (dietary_requirement === 'Other' && !dietary_other) {
    errors.push('Please specify the dietary requirement.');
  }

  const has_allergy = bool(body.has_allergy);
  const allergy_detail = str(body.allergy_detail);
  const allergy_severity = str(body.allergy_severity);
  if (has_allergy && !allergy_detail) errors.push('Please describe the allergy.');
  if (has_allergy && !SEVERITY_OPTIONS.includes(allergy_severity as (typeof SEVERITY_OPTIONS)[number])) {
    errors.push('Please select allergy severity.');
  }

  const has_epilepsy = bool(body.has_epilepsy);

  if (body.gdpr_consent !== true) errors.push('GDPR consent is required.');

  if (errors.length > 0) {
    return NextResponse.json({ error: errors[0] }, { status: 422 });
  }

  // --- Persist ---
  const supabase = getSupabaseClient();

  const { error } = await supabase.from('attendees').insert({
    event_slug,
    full_name,
    is_plus_one,
    plus_one_of: is_plus_one ? plus_one_of : null,
    dietary_requirement,
    dietary_other: dietary_requirement === 'Other' ? dietary_other : null,
    has_allergy,
    allergy_detail: has_allergy ? allergy_detail : null,
    allergy_severity: has_allergy ? allergy_severity : null,
    has_epilepsy,
    gdpr_consent: true,
  });

  if (error) {
    console.error('[attendees] insert error:', error.message);
    return NextResponse.json({ error: 'Failed to save. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
