export type DateRangePreset =
  | "TODAY"
  | "YESTERDAY"
  | "LAST_7_DAYS"
  | "LAST_30_DAYS"
  | "THIS_MONTH"
  | "LAST_MONTH"
  | "CUSTOM";

export interface DateRangeValue {
  preset: DateRangePreset;
  from: string;
  to: string;
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
  );
}

function subtractDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

export function getDateRangeForPreset(
  preset: DateRangePreset,
  now = new Date(),
): DateRangeValue {
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  switch (preset) {
    case "TODAY":
      return {
        preset,
        from: formatLocalDate(today),
        to: formatLocalDate(today),
      };

    case "YESTERDAY": {
      const yesterday = subtractDays(today, 1);

      return {
        preset,
        from: formatLocalDate(yesterday),
        to: formatLocalDate(yesterday),
      };
    }

    case "LAST_7_DAYS":
      return {
        preset,
        from: formatLocalDate(subtractDays(today, 6)),
        to: formatLocalDate(today),
      };

    case "LAST_30_DAYS":
      return {
        preset,
        from: formatLocalDate(subtractDays(today, 29)),
        to: formatLocalDate(today),
      };

    case "THIS_MONTH":
      return {
        preset,
        from: formatLocalDate(startOfMonth(today)),
        to: formatLocalDate(today),
      };

    case "LAST_MONTH": {
      const previousMonth = new Date(
        today.getFullYear(),
        today.getMonth() - 1,
        1,
      );

      return {
        preset,
        from: formatLocalDate(startOfMonth(previousMonth)),
        to: formatLocalDate(endOfMonth(previousMonth)),
      };
    }

    case "CUSTOM":
      return {
        preset,
        from: formatLocalDate(today),
        to: formatLocalDate(today),
      };
  }
}

export function getDateRangeLabel(
  range: DateRangeValue,
): string {
  switch (range.preset) {
    case "TODAY":
      return "Today";
    case "YESTERDAY":
      return "Yesterday";
    case "LAST_7_DAYS":
      return "Last 7 Days";
    case "LAST_30_DAYS":
      return "Last 30 Days";
    case "THIS_MONTH":
      return "This Month";
    case "LAST_MONTH":
      return "Last Month";
    case "CUSTOM":
      return range.from === range.to
        ? range.from
        : `${range.from} – ${range.to}`;
  }
}