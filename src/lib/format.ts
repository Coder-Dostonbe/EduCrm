import { format, parseISO, differenceInYears } from "date-fns";

/** 1250000 -> "1 250 000" */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR")
    .format(Math.round(value))
    .replace(/ /g, " ")
    .replace(/ /g, " ");
}

/** 1250000 -> "1 250 000 UZS" (suffix is caller-localizable) */
export function formatUZS(value: number, suffix = "UZS"): string {
  return `${formatNumber(value)} ${suffix}`;
}

/** Compact money for chart axes: 12 500 000 -> "12.5M" */
export function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000_000)
    return `${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
  if (Math.abs(value) >= 1_000_000)
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (Math.abs(value) >= 1_000)
    return `${(value / 1_000).toFixed(0)}K`;
  return `${value}`;
}

export function formatDate(iso: string, pattern = "dd MMM yyyy"): string {
  try {
    return format(parseISO(iso), pattern);
  } catch {
    return iso;
  }
}

export function formatDateShort(iso: string): string {
  return formatDate(iso, "dd.MM.yyyy");
}

export function ageFromDob(iso: string): number {
  try {
    return differenceInYears(new Date(), parseISO(iso));
  } catch {
    return 0;
  }
}

/** "+998901234567" -> "+998 90 123 45 67" */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("998")) {
    return `+998 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10, 12)}`;
  }
  return phone;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function fullName(p: { firstName: string; lastName: string }): string {
  return `${p.firstName} ${p.lastName}`;
}

export function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
