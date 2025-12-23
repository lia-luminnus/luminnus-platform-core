/**
 * Componente de cartão de métrica reutilizável
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    label?: string;
  };
  status?: 'green' | 'yellow' | 'red';
  className?: string;
}

const MetricCard = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  status,
  className,
}: MetricCardProps) => {
  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.value > 0) return <TrendingUp className="w-3 h-3 text-green-500" />;
    if (trend.value < 0) return <TrendingDown className="w-3 h-3 text-red-500" />;
    return <Minus className="w-3 h-3 text-gray-500" />;
  };

  const getTrendColor = () => {
    if (!trend) return '';
    if (trend.value > 0) return 'text-green-500';
    if (trend.value < 0) return 'text-red-500';
    return 'text-gray-500';
  };

  const getStatusColor = () => {
    switch (status) {
      case 'green':
        return 'border-l-4 border-l-green-500';
      case 'yellow':
        return 'border-l-4 border-l-yellow-500';
      case 'red':
        return 'border-l-4 border-l-red-500';
      default:
        return '';
    }
  };

  return (
    <Card className={cn(getStatusColor(), className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {(subtitle || trend) && (
          <div className="flex items-center gap-2 mt-1">
            {trend && (
              <span className={cn("text-xs flex items-center gap-1", getTrendColor())}>
                {getTrendIcon()}
                {trend.value > 0 ? '+' : ''}{trend.value.toFixed(1)}%
                {trend.label && <span className="text-gray-500 ml-1">{trend.label}</span>}
              </span>
            )}
            {subtitle && !trend && (
              <span className="text-xs text-gray-500">{subtitle}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MetricCard;
