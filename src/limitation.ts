// Standard limitation periods under the Indian Limitation Act (in days)
export const LIMITATION_TYPES = [
  { label: 'Civil Appeal', days: 90 },
  { label: 'Criminal Appeal', days: 60 },
  { label: 'Revision', days: 90 },
  { label: 'Review', days: 30 },
  { label: 'Execution Petition', days: 12 }, // Example: 12 years for execution, but let's use days for a quick calculation
  { label: 'Other / Custom', days: 30 },
];

export function calculateDeadline(startDate: Date, daysToAdd: number): Date {
  // Cloning the date so we don't mutate the original object
  const result = new Date(startDate.getTime());
  result.setDate(result.getDate() + daysToAdd);
  return result;
}

export function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}