import AttendeeForm from './AttendeeForm';

interface Props {
  params: { 'event-slug': string };
}

export default function FormPage({ params }: Props) {
  return <AttendeeForm eventSlug={params['event-slug']} />;
}
