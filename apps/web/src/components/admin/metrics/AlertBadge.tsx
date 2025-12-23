/**
 * Badge de alerta para exibir alertas de métricas
 */

import { AlertTriangle, AlertCircle, Info, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MetricsAlert, AlertNivel } from "@/types/metrics";

interface AlertBadgeProps {
  alert: MetricsAlert;
  onResolve?: (id: string) => void;
  showDetails?: boolean;
}

const AlertBadge = ({ alert, onResolve, showDetails = true }: AlertBadgeProps) => {
  const getAlertIcon = (nivel: AlertNivel) => {
    switch (nivel) {
      case 'critical':
        return <AlertCircle className="w-4 h-4" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4" />;
      case 'info':
        return <Info className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const getAlertStyles = (nivel: AlertNivel) => {
    switch (nivel) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getIconColor = (nivel: AlertNivel) => {
    switch (nivel) {
      case 'critical':
        return 'text-red-500';
      case 'warning':
        return 'text-yellow-500';
      case 'info':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border",
        getAlertStyles(alert.nivel),
        alert.resolvido && 'opacity-50'
      )}
    >
      <div className={cn("mt-0.5", getIconColor(alert.nivel))}>
        {alert.resolvido ? (
          <CheckCircle className="w-4 h-4 text-green-500" />
        ) : (
          getAlertIcon(alert.nivel)
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{alert.mensagem}</p>
        {showDetails && (
          <div className="mt-1 text-xs opacity-75">
            <span className="capitalize">{alert.fonte}</span>
            <span className="mx-1">-</span>
            <span>{formatDate(alert.created_at)}</span>
            {alert.valor_atual > 0 && alert.valor_limite > 0 && (
              <span className="ml-2">
                ({alert.valor_atual.toFixed(2)} / {alert.valor_limite.toFixed(2)})
              </span>
            )}
          </div>
        )}
      </div>
      {!alert.resolvido && onResolve && (
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0"
          onClick={() => onResolve(alert.id)}
        >
          Resolver
        </Button>
      )}
    </div>
  );
};

export default AlertBadge;
