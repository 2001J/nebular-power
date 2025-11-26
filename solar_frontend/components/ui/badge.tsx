import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-blue-500/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 hover:bg-blue-500/20 dark:hover:bg-blue-500/30",
        secondary:
          "border-transparent bg-slate-500/10 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300 hover:bg-slate-500/20 dark:hover:bg-slate-500/30",
        destructive:
          "border-transparent bg-red-500/10 text-red-700 dark:bg-red-500/20 dark:text-red-300 hover:bg-red-500/20 dark:hover:bg-red-500/30",
        outline: 
          "border-border/50 bg-transparent text-foreground hover:bg-muted/50",
        success:
          "border-transparent bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 hover:bg-emerald-500/20 dark:hover:bg-emerald-500/30",
        warning:
          "border-transparent bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 hover:bg-amber-500/20 dark:hover:bg-amber-500/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
