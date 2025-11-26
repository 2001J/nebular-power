"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = false,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-3",
        caption: "flex justify-between items-center px-1 py-2 relative mb-2",
        caption_label: "text-base font-semibold text-foreground",
        nav: "flex items-center gap-1",
        nav_button: cn(
          "inline-flex items-center justify-center h-8 w-8 rounded-md border-0 bg-transparent p-0",
          "text-foreground/80 hover:bg-accent hover:text-accent-foreground",
          "transition-colors disabled:pointer-events-none disabled:opacity-30",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        ),
        nav_button_previous: "",
        nav_button_next: "",
        table: "w-max border-collapse",
        head_row: "flex",
        head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex mt-2",
        cell: cn(
          "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
          "[&:has([aria-selected])]:bg-transparent"
        ),
        day: cn(
          "inline-flex items-center justify-center rounded-full w-9 h-9 p-0",
          "text-sm font-normal text-foreground",
          "hover:bg-accent hover:text-accent-foreground transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:pointer-events-none aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        day_selected: cn(
          "bg-primary text-primary-foreground font-semibold",
          "hover:bg-primary hover:text-primary-foreground",
          "focus:bg-primary focus:text-primary-foreground",
          "rounded-full"
        ),
        day_today: cn(
          "relative font-semibold",
          "before:absolute before:inset-0 before:rounded-full before:border-2 before:border-primary/70 before:pointer-events-none"
        ),
        day_outside: cn(
          "day-outside text-muted-foreground/40",
          "aria-selected:bg-accent/50 aria-selected:text-muted-foreground"
        ),
        day_disabled: "text-muted-foreground/20 cursor-not-allowed hover:bg-transparent",
        day_range_middle: cn(
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
          "rounded-none"
        ),
        day_hidden: "invisible",
        ...classNames,
      }}
      formatters={{
        formatWeekdayName: (date) => date.toLocaleDateString("en-US", { weekday: "narrow" }),
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="h-5 w-5" {...props} />,
        IconRight: ({ ...props }) => <ChevronRight className="h-5 w-5" {...props} />,
      } as any}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
