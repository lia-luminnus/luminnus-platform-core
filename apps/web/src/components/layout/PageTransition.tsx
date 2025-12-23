import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
  variant?: "fade" | "slide-up" | "slide-down" | "scale";
  delay?: "none" | "sm" | "md" | "lg";
}

const PageTransition = ({
  children,
  className,
  variant = "slide-up",
  delay = "none"
}: PageTransitionProps) => {
  const variants = {
    fade: "animate-[fadeIn_0.3s_ease-out_forwards]",
    "slide-up": "animate-[slideUp_0.35s_cubic-bezier(0.4,0,0.2,1)_forwards]",
    "slide-down": "animate-[slideDown_0.35s_cubic-bezier(0.4,0,0.2,1)_forwards]",
    scale: "animate-[scaleIn_0.25s_ease-out_forwards]"
  };

  const delays = {
    none: "",
    sm: "[animation-delay:0.1s]",
    md: "[animation-delay:0.2s]",
    lg: "[animation-delay:0.3s]"
  };

  return (
    <div className={cn(
      "opacity-0",
      variants[variant],
      delays[delay],
      className
    )}>
      {children}
    </div>
  );
};

export default PageTransition;

// Staggered children wrapper for list animations
interface StaggeredContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

export const StaggeredContainer = ({
  children,
  className,
  staggerDelay = 0.05
}: StaggeredContainerProps) => {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.isArray(children) ? children.map((child, index) => (
        <div
          key={index}
          className="animate-[slideUp_0.35s_cubic-bezier(0.4,0,0.2,1)_forwards] opacity-0"
          style={{ animationDelay: `${index * staggerDelay}s` }}
        >
          {child}
        </div>
      )) : children}
    </div>
  );
};
