export const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
export const THIRTY_MINUTES_MS = 30 * 60 * 1000;

export function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function endOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1),
  );
}

export function sameUtcMinute(a: Date, b: Date) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate() &&
    a.getUTCHours() === b.getUTCHours() &&
    a.getUTCMinutes() === b.getUTCMinutes()
  );
}

export function formatUtcTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(date);
}

export function formatUtcDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(date);
}

export function localeFromLanguage(language: string) {
  switch (language) {
    case "hi":
      return "hi-IN";
    case "ml":
      return "ml-IN";
    case "ar":
      return "ar-AE";
    case "ta":
      return "ta-IN";
    case "es":
      return "es-ES";
    default:
      return "en-US";
  }
}

export function formatInTimeZone(
  date: Date,
  timeZone: string,
  language: string,
  options: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat(localeFromLanguage(language), {
    ...options,
    timeZone,
  }).format(date);
}

export function hourInTimeZone(date: Date, timeZone: string) {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone,
    }).format(date),
  );
}

export function timeInTimeZone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).format(date);
}

export function dateKeyInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";

  return `${year}-${month}-${day}`;
}

export function minutesFromTimeString(value: string) {
  const [hours, minutes] = value.split(":").map((part) => Number(part));
  return hours * 60 + minutes;
}
