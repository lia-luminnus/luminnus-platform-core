import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingProps {
  className?: string;
  message?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "spinner" | "dots" | "pulse";
}

const Loading = ({
  className,
  message = "Carregando...",
  size = "md",
  variant = "default"
}: LoadingProps) => {
  const sizeClasses = {
    sm: "py-6",
    md: "py-12",
    lg: "py-20"
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8"
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg"
  };

  if (variant === "pulse") {
    return (
      <div className={cn("flex flex-col items-center justify-center", sizeClasses[size], className)}>
        <div className="flex items-center gap-3 animate-pulse">
          <div className="w-3 h-3 rounded-full bg-[#7B2FF7]" />
          <div className="w-3 h-3 rounded-full bg-[#9F57FF]" />
          <div className="w-3 h-3 rounded-full bg-[#C7A4FF]" />
        </div>
        <p className={cn("mt-4 text-[#7B2FF7] font-medium", textSizes[size])}>
          {message}
        </p>
      </div>
    );
  }

  if (variant === "dots") {
    return (
      <div className={cn("flex flex-col items-center justify-center", sizeClasses[size], className)}>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#7B2FF7] animate-bounce [animation-delay:-0.3s]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#7B2FF7] animate-bounce [animation-delay:-0.15s]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#7B2FF7] animate-bounce" />
        </div>
        <p className={cn("mt-4 text-muted-foreground font-medium", textSizes[size])}>
          {message}
        </p>
      </div>
    );
  }

  if (variant === "spinner") {
    return (
      <div className={cn("flex flex-col items-center justify-center", sizeClasses[size], className)}>
        <Loader2 className={cn("animate-spin text-[#7B2FF7]", iconSizes[size])} />
        <p className={cn("mt-4 text-muted-foreground font-medium", textSizes[size])}>
          {message}
        </p>
      </div>
    );
  }

  // Default variant - elegant line pulse
  return (
    <div className={cn("flex flex-col items-center justify-center", sizeClasses[size], className)}>
      <div className="relative">
        <div className="w-16 h-1 bg-[#F3EEFF] dark:bg-[#7B2FF7]/20 rounded-full overflow-hidden">
          <div className="absolute inset-0 w-1/2 bg-gradient-to-r from-[#7B2FF7] to-[#9F57FF] rounded-full animate-[loading-slide_1.5s_ease-in-out_infinite]" />
        </div>
      </div>
      <p className={cn("mt-4 text-[#7B2FF7] font-medium loading-pulse", textSizes[size])}>
        {message}
      </p>
    </div>
  );
};

export default Loading;

// Add this to your global CSS or tailwind config
// @keyframes loading-slide {
//   0% { transform: translateX(-100%); }
//   50% { transform: translateX(100%); }
//   100% { transform: translateX(-100%); }
// }
