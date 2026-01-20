/**
 * 🏛️ SYSTEM MANIFEST - UI Proxy
 * 
 * Este arquivo agora é apenas um proxy para o manifesto no pacote lia-runtime.
 * Não duplique lógica aqui.
 */

export * from '../../../../packages/lia-runtime/system/systemManifest';

import * as sharedManifest from '../../../../packages/lia-runtime/system/systemManifest';
import { WIDGET_METADATA, WidgetType, WidgetCategory, getKpiWidgets, getChartWidgets, getTableWidgets } from '../../dashboard-engine/widgetTypes';

// Re-implementação das funções que dependem de metadados de UI que não estão no shared
export function getSystemManifest() {
    return {
        version: '4.5-ui',
        widgets: {
            types: sharedManifest.WIDGET_TYPES,
            count: sharedManifest.WIDGET_TYPES.length,
            byCategory: {
                kpi: getKpiWidgets(),
                chart: getChartWidgets(),
                table: getTableWidgets(),
                special: [], // Adicionar se necessário
                other: [],
            },
            metadata: WIDGET_METADATA,
        },
        plans: sharedManifest.PLANS,
        integrations: sharedManifest.INTEGRATIONS,
        modules: sharedManifest.MODULES,
    };
}

export function generateWidgetCountResponse(): string {
    return sharedManifest.generateWidgetCountResponse(WIDGET_METADATA as any);
}

export function generateChartListResponse(): string {
    const charts = getChartWidgets();
    const list = charts.map((t, i) => `${i + 1}. **${WIDGET_METADATA[t as WidgetType]?.name || t}** (\`${t}\`) - ${WIDGET_METADATA[t as WidgetType]?.description}`).join('\n');

    return `📈 **Gráficos Disponíveis**

${list}

Total: **${charts.length} tipos de gráficos**`;
}

export function generateWidgetInfoResponse(): string {
    return generateWidgetCountResponse();
}

export default {
    ...sharedManifest.default,
    getSystemManifest,
    generateWidgetCountResponse,
    generateChartListResponse,
    generateWidgetInfoResponse,
};
