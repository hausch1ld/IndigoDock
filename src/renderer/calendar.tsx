import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthDays } from "../shared/calendar";

export function CalendarWidget({ now }: { now: Date }) {
  const [offset, setOffset] = useState(0);
  const month = new Date(now.getFullYear(), now.getMonth() + offset, 1, 12);
  const title = month.toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
  });
  return (
    <div className="calendar-widget">
      <div className="calendar-heading">
        <button title="Vorheriger Monat" onClick={() => setOffset(offset - 1)}>
          <ChevronLeft size={18} />
        </button>
        <strong aria-live="polite">{title}</strong>
        <button title="Nächster Monat" onClick={() => setOffset(offset + 1)}>
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="calendar-grid" role="table" aria-label={title}>
        <div role="row" className="calendar-weekdays">
          {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((day) => (
            <span role="columnheader" key={day}>
              {day}
            </span>
          ))}
        </div>
        {Array.from(
          {
            length: monthDays(month.getFullYear(), month.getMonth()).length / 7,
          },
          (_, week) => (
            <div role="row" key={week}>
              {monthDays(month.getFullYear(), month.getMonth())
                .slice(week * 7, week * 7 + 7)
                .map((day, i) => {
                  const today = day === now.getDate() && offset === 0;
                  return (
                    <span
                      role="cell"
                      key={i}
                      className={today ? "calendar-today" : ""}
                      aria-current={today ? "date" : undefined}
                    >
                      {day}
                    </span>
                  );
                })}
            </div>
          ),
        )}
      </div>
    </div>
  );
}
