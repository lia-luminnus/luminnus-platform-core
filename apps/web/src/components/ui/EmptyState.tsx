import { cn } from "@/lib/utils";
import { LucideIcon, Inbox, Search, FileX, AlertCircle } from "lucide-react";
import { Button } from "./button";

interface EmptyStateProps {
  className?: string;
  title?: string;
  message?: string;
  icon?: LucideIcon;
  variant?: "default" | "search" | "error" | "no-data";
  action?: {
    label: string;
    onClick: () => void;
  };
  size?: "sm" | "md" | "lg";
}

const EmptyState = ({
  className,
  title,
  message = "Nenhum dado encontrado.",
  icon,
  variant = "default",
  action,
  size = "md"
}: EmptyStateProps) => {
  const variants = {
    default: {
      icon: Inbox,
      title: "Nada por aqui",
      iconClass: "text-muted-foreground"
    },
    search: {
      icon: Search,
      title: "Nenhum resultado",
      iconClass: "text-[#7B2FF7]"
    },
    error: {
      icon: AlertCircle,
      title: "Algo deu errado",
      iconClass: "text-red-500"
    },
    "no-data": {
      icon: FileX,
      title: "Sem dados",
      iconClass: "text-muted-foreground"
    }
  };

  const sizeClasses = {
    sm: {
      container: "py-8",
      iconWrapper: "w-12 h-12",
      icon: "w-6 h-6",
      title: "text-base",
      message: "text-sm"
    },
    md: {
      container: "py-16",
      iconWrapper: "w-16 h-16",
      icon: "w-8 h-8",
      title: "text-lg",
      message: "text-base"
    },
    lg: {
      container: "py-24",
      iconWrapper: "w-20 h-20",
      icon: "w-10 h-10",
      title: "text-xl",
      message: "text-lg"
    }
  };

  const variantConfig = variants[variant];
  const IconComponent = icon || variantConfig.icon;
  const displayTitle = title || variantConfig.title;
  const sizes = sizeClasses[size];

  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center",
      sizes.container,
      className
    )}>
      <div className={cn(
        "rounded-2xl bg-muted/50 dark:bg-muted/20 flex items-center justify-center mb-4 transition-all duration-[var(--transition)]",
        sizes.iconWrapper
      )}>
        <IconComponent className={cn(
          variantConfig.iconClass,
          sizes.icon
        )} />
      </div>

      <h3 className={cn(
        "font-semibold text-foreground mb-2",
        sizes.title
      )}>
        {displayTitle}
      </h3>

      <p className={cn(
        "text-muted-foreground max-w-sm leading-relaxed",
        sizes.message
      )}>
        {message}
      </p>

      {action && (
        <Button
          onClick={action.onClick}
          className="mt-6"
          variant="default"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
