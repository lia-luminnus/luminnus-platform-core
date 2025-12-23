/**
 * Indicador de status visual (verde / amarelo / vermelho)
 */

import { cn } from "@/lib/utils";

interface StatusIndicatorProps {
  status: 'green' | 'yellow' | 'red' | 'online' | 'offline' | 'degraded';
  label?: string;
  showPulse?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const StatusIndicator = ({
  status,
  label,
  showPulse = true,
  size = 'md',
}: StatusIndicatorProps) => {
  const getStatusColor = () => {
    switch (status) {
      case 'green':
      case 'online':
        return 'bg-green-500';
      case 'yellow':
      case 'degraded':
        return 'bg-yellow-500';
      case 'red':
      case 'offline':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusLabel = () => {
    if (label) return label;
    switch (status) {
      case 'green':
      case 'online':
        return 'Online';
      case 'yellow':
      case 'degraded':
        return 'Degradado';
      case 'red':
      case 'offline':
        return 'Offline';
      default:
        return 'Desconhecido';
    }
  };

  const getSize = () => {
    switch (size) {
      case 'sm':
        return 'w-2 h-2';
      case 'lg':
        return 'w-4 h-4';
      default:
        return 'w-3 h-3';
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'sm':
        return 'text-xs';
      case 'lg':
        return 'text-base';
      default:
        return 'text-sm';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div className={cn("rounded-full", getSize(), getStatusColor())} />
        {showPulse && (status === 'green' || status === 'online') && (
          <div
            className={cn(
              "absolute inset-0 rounded-full animate-ping opacity-75",
              getStatusColor()
            )}
          />
        )}
      </div>
      <span className={cn("font-medium", getTextSize())}>{getStatusLabel()}</span>
    </div>
  );
};

export default StatusIndicator;
