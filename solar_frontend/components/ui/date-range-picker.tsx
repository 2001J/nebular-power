"use client"

import * as React from "react"
import { addDays, format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerWithRangeProps {
  className?: string
  date: DateRange | undefined
  setDate: React.Dispatch<React.SetStateAction<DateRange>>
}

export function DatePickerWithRange({
  className,
  date,
  setDate,
}: DatePickerWithRangeProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={(range) => {
              // Ensure to and from are both set
              if (range?.from && !range.to) {
                range.to = range.from;
              }
              setDate(range || { from: new Date(), to: new Date() })
            }}
            numberOfMonths={2}
          />
          <div className="flex items-center justify-between px-4 pb-4">
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const today = new Date()
                  setDate({
                    from: today,
                    to: today,
                  })
                }}
              >
                Today
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const today = new Date()
                  const oneWeekAgo = addDays(today, -7)
                  setDate({
                    from: oneWeekAgo,
                    to: today,
                  })
                }}
              >
                Last Week
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const today = new Date()
                  const oneMonthAgo = addDays(today, -30)
                  setDate({
                    from: oneMonthAgo,
                    to: today,
                  })
                }}
              >
                Last 30 Days
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
} 