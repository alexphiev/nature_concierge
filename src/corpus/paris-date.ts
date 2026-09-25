const parisDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// Returns the Europe/Paris calendar date of `now` as "yyyy-mm-dd".
export function parisDateString(now: Date = new Date()): string {
  return parisDateFormatter.format(now);
}

// UTC-midnight Date for the Paris calendar day — the only form that matches @db.Date columns.
export function parisToday(now: Date = new Date()): Date {
  return new Date(`${parisDateString(now)}T00:00:00.000Z`);
}
