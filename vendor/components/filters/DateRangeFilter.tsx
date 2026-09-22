"use client";

import { CalendarDays } from "lucide-react";
import { useState } from "react";

import {
  type DateRangePreset,
  type DateRangeValue,
  getDateRangeForPreset,
} from "@/lib/date-range";

import styles from "./DateRangeFilter.module.css";

interface DateRangeFilterProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
}

export default function DateRangeFilter({
  value,
  onChange,
}: DateRangeFilterProps) {
  const [customFrom, setCustomFrom] = useState(value.from);
  const [customTo, setCustomTo] = useState(value.to);

  function handlePresetChange(
    event: React.ChangeEvent<HTMLSelectElement>,
  ) {
    const preset = event.target.value as DateRangePreset;

    if (preset === "CUSTOM") {
      onChange({
        preset: "CUSTOM",
        from: customFrom,
        to: customTo,
      });

      return;
    }

    const nextRange = getDateRangeForPreset(preset);

    setCustomFrom(nextRange.from);
    setCustomTo(nextRange.to);

    onChange(nextRange);
  }

  function handleFromChange(value: string) {
    setCustomFrom(value);

    if (value && customTo && value <= customTo) {
      onChange({
        preset: "CUSTOM",
        from: value,
        to: customTo,
      });
    }
  }

  function handleToChange(value: string) {
    setCustomTo(value);

    if (customFrom && value && customFrom <= value) {
      onChange({
        preset: "CUSTOM",
        from: customFrom,
        to: value,
      });
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.field}>
        <span className={styles.label}>Date range</span>

        <div className={styles.selectWrapper}>
          <CalendarDays
            size={16}
            className={styles.calendarIcon}
          />

          <select
            value={value.preset}
            onChange={handlePresetChange}
            className={styles.select}
            aria-label="Date range"
          >
            <option value="TODAY">Today</option>
            <option value="YESTERDAY">Yesterday</option>
            <option value="LAST_7_DAYS">
              Last 7 days
            </option>
            <option value="LAST_30_DAYS">
              Last 30 days
            </option>
            <option value="THIS_MONTH">
              This month
            </option>
            <option value="LAST_MONTH">
              Last month
            </option>
            <option value="CUSTOM">
              Custom range
            </option>
          </select>
        </div>
      </div>

      {value.preset === "CUSTOM" && (
        <div className={styles.customRange}>
          <label>
            <span>From</span>

            <input
              type="date"
              value={customFrom}
              max={customTo || undefined}
              onChange={(event) =>
                handleFromChange(event.target.value)
              }
            />
          </label>

          <label>
            <span>To</span>

            <input
              type="date"
              value={customTo}
              min={customFrom || undefined}
              onChange={(event) =>
                handleToChange(event.target.value)
              }
            />
          </label>
        </div>
      )}
    </div>
  );
}