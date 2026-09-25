import { BadRequestException } from '@nestjs/common';

export type DateRangeFilter = { from?: string; to?: string };

export function parseDateFilter(
  value: string | undefined,
  name: string,
): string | undefined {
  const date = value?.trim();
  if (!date) {
    return undefined;
  }

  const parsed = new Date(date);
  const isValid =
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().startsWith(date);
  if (!isValid) {
    throw new BadRequestException(`${name} must be a valid YYYY-MM-DD date`);
  }

  return date;
}

export function parseDateRange(filters: DateRangeFilter): DateRangeFilter {
  const from = parseDateFilter(filters.from, 'from');
  const to = parseDateFilter(filters.to, 'to');

  if (from && to && from > to) {
    throw new BadRequestException('from cannot be later than to');
  }

  return { from, to };
}
