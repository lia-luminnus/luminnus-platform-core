import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border-2 border-[var(--lum-border)] bg-background px-4 py-2.5 text-base ring-offset-background transition-all duration-[var(--transition)]",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:border-[#7B2FF7] focus-visible:ring-[3px] focus-visible:ring-[#7B2FF7]/20",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "dark:border-[var(--lum-border-dark)] dark:bg-[var(--lum-card-dark)]",
          "md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
