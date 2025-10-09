"use client"

import * as React from "react"
import { addDays, format } from "date-fns"
import { ptBR } from "date-fns/locale"
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

interface CalendarDateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  date?: { from: Date; to: Date };
  onDateChange?: (date: { from: Date; to: Date }) => void;
}

export function CalendarDateRangePicker({
  className,
  date: externalDate,
  onDateChange,
}: CalendarDateRangePickerProps) {
  const [internalDate, setInternalDate] = React.useState<DateRange | undefined>({
    from: new Date(2024, 0, 1),
    to: new Date(),
  });

  const date = externalDate ? { from: externalDate.from, to: externalDate.to } : internalDate;

  const handleDateChange = (newDate: DateRange | undefined) => {
    if (newDate?.from && newDate?.to) {
      const dateRange = { from: newDate.from, to: newDate.to };
      if (onDateChange) {
        onDateChange(dateRange);
      } else {
        setInternalDate(newDate);
      }
    }
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[260px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y", { locale: ptBR })} -{" "}
                  {format(date.to, "LLL dd, y", { locale: ptBR })}
                </>
              ) : (
                format(date.from, "LLL dd, y", { locale: ptBR })
              )
            ) : (
              <span>Escolha uma data</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleDateChange}
            numberOfMonths={2}
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
