import React from "react"
import { cn } from "@/lib/utils"

interface ListItemProps extends React.HTMLAttributes<HTMLLIElement> {
  title: string
  description?: string
  href?: string
}

export const ListItem = React.forwardRef<
  HTMLLIElement,
  ListItemProps
>(({ className, title, description, href, ...props }, ref) => {
  return (
    <li
      ref={ref}
      className={cn(
        "relative cursor-default select-none rounded-sm py-1.5 px-2 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus:bg-accent focus:text-accent-foreground",
        href && "cursor-pointer",
        className
      )}
      {...props}
    >
      <div className="flex flex-col gap-0.5 truncate">
        <span className="font-medium">{title}</span>
        {description && (
          <span className="text-xs text-muted-foreground">{description}</span>
        )}
      </div>
    </li>
  )
})

ListItem.displayName = "ListItem" 