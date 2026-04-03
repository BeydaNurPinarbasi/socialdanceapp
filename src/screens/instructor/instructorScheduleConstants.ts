import type { InstructorScheduleSlotModel } from '../../services/api/instructorLessons';

export const INSTRUCTOR_WEEKDAYS: { v: number; label: string }[] = [
  { v: 0, label: 'Pzt' },
  { v: 1, label: 'Sal' },
  { v: 2, label: 'Çar' },
  { v: 3, label: 'Per' },
  { v: 4, label: 'Cum' },
  { v: 5, label: 'Cmt' },
  { v: 6, label: 'Paz' },
];

export const INSTRUCTOR_LOCATION_CHIPS: {
  id: InstructorScheduleSlotModel['locationType'];
  label: string;
}[] = [
  { id: 'in_person', label: 'Yüz yüze' },
  { id: 'online', label: 'Online' },
  { id: 'school', label: 'Okulda' },
];

export function instructorWeekdayLabel(weekday: number): string {
  return INSTRUCTOR_WEEKDAYS.find((w) => w.v === weekday)?.label ?? String(weekday);
}

export function instructorLocationLabel(
  locationType: InstructorScheduleSlotModel['locationType'],
): string {
  return INSTRUCTOR_LOCATION_CHIPS.find((l) => l.id === locationType)?.label ?? locationType;
}

/** Yerel tarih → `instructor_schedule_slots.weekday` (0=Pzt … 6=Paz). */
export function dateToInstructorWeekday(d: Date): number {
  return (d.getDay() + 6) % 7;
}
