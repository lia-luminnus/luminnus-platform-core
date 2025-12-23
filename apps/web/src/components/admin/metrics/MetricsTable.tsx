/**
 * Tabela de métricas por empresa/usuário
 */

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { MetricsByCompany, MetricsByUser } from "@/types/metrics";

interface MetricsTableProps {
  title: string;
  description?: string;
  data: MetricsByCompany[] | MetricsByUser[];
  isLoading?: boolean;
  type: 'company' | 'user';
  valueLabel?: string;
  formatValue?: (value: number) => string;
  formatCost?: (value: number) => string;
}

const MetricsTable = ({
  title,
  description,
  data,
  isLoading,
  type,
  valueLabel = "Total",
  formatValue,
  formatCost,
}: MetricsTableProps) => {
  const defaultFormatValue = (value: number) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
    return value.toFixed(0);
  };

  const defaultFormatCost = (value: number) => {
    return `$${value.toFixed(4)}`;
  };

  const isCompanyData = (
    item: MetricsByCompany | MetricsByUser
  ): item is MetricsByCompany => {
    return 'empresa_nome' in item && 'percentual' in item;
  };

  const isUserData = (
    item: MetricsByCompany | MetricsByUser
  ): item is MetricsByUser => {
    return 'usuario_nome' in item;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-48 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : !data || data.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            Nenhum dado disponível
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">
                    {type === 'company' ? 'Empresa' : 'Usuário'}
                  </TableHead>
                  {type === 'user' && <TableHead>Empresa</TableHead>}
                  <TableHead className="text-right">{valueLabel}</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  {type === 'company' && (
                    <TableHead className="w-[20%]">Percentual</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.slice(0, 10).map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {type === 'company' && isCompanyData(item)
                        ? item.empresa_nome
                        : isUserData(item)
                          ? item.usuario_nome
                          : '-'}
                    </TableCell>
                    {type === 'user' && isUserData(item) && (
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {item.empresa_nome || 'N/A'}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell className="text-right font-mono">
                      {(formatValue || defaultFormatValue)(item.total)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-green-600 dark:text-green-400">
                      {(formatCost || defaultFormatCost)(item.custo)}
                    </TableCell>
                    {type === 'company' && isCompanyData(item) && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={item.percentual}
                            className="h-2 flex-1"
                          />
                          <span className="text-xs text-muted-foreground w-12 text-right">
                            {item.percentual.toFixed(1)}%
                          </span>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MetricsTable;
