export type DietaryRequirement =
  | 'None'
  | 'Vegetarian'
  | 'Vegan'
  | 'Halal'
  | 'Kosher'
  | 'Gluten-free'
  | 'Dairy-free'
  | 'Other';

export type AllergySeverity = 'Mild' | 'Severe' | 'Anaphylactic';

export interface Event {
  id: string;
  created_at: string;
  slug: string;
  school_name: string;
  event_date: string | null;
}

export interface Attendee {
  id: string;
  created_at: string;
  event_slug: string;
  full_name: string;
  is_plus_one: boolean;
  plus_one_of: string | null;
  dietary_requirement: DietaryRequirement;
  dietary_other: string | null;
  has_allergy: boolean;
  allergy_detail: string | null;
  allergy_severity: AllergySeverity | null;
  has_epilepsy: boolean;
  gdpr_consent: boolean;
}
