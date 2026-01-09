// ======================================================================
// 📦 DYNAMIC CONTENT MANAGER - Gerencia containers dinâmicos
// ======================================================================
// Regras:
// - Até 4 containers lado a lado (grid automático)
// - Cada conteúdo novo gera container independente
// - Atualização afeta apenas container correspondente
// - Compartilhado entre Multi-Modal e Live Mode
// ======================================================================

import { DynamicContent } from '@/components/multimodalRenderer';

// ======================================================================
// TYPES
// ======================================================================

export interface DynamicContainer {
  id: string;
  content: DynamicContent;
  timestamp: number;
  position: number; // 0-3 (até 4 containers)
}

export type ContainerLayout = '1x1' | '1x2' | '2x2' | '1x3' | '2x3';

// ======================================================================
// MANAGER CLASS
// ======================================================================

class DynamicContentManager {
  private containers: Map<string, DynamicContainer> = new Map();
  private listeners: ((containers: DynamicContainer[]) => void)[] = [];
  private maxContainers = 4;

  /**
   * Adiciona novo conteúdo dinâmico
   */
  addDynamicContent(type: DynamicContent['type'], payload: any): string {
    // Gerar ID único
    const id = `container_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Verificar limite de containers
    if (this.containers.size >= this.maxContainers) {
      // Remover o mais antigo
      const oldest = Array.from(this.containers.values())
        .sort((a, b) => a.timestamp - b.timestamp)[0];

      if (oldest) {
        this.removeContainer(oldest.id);
      }
    }

    // Criar container
    const container: DynamicContainer = {
      id,
      content: {
        type,
        data: payload,
      },
      timestamp: Date.now(),
      position: this.containers.size,
    };

    this.containers.set(id, container);
    this.notifyListeners();

    console.log(`📦 Container adicionado: ${id} (${type})`);
    return id;
  }

  /**
   * Atualiza conteúdo de um container existente
   */
  updateContainer(id: string, newData: any): boolean {
    const container = this.containers.get(id);
    if (!container) {
      console.warn(`⚠️ Container não encontrado: ${id}`);
      return false;
    }

    container.content.data = newData;
    container.timestamp = Date.now();

    this.notifyListeners();

    console.log(`🔄 Container atualizado: ${id}`);
    return true;
  }

  /**
   * Remove um container
   */
  removeContainer(id: string): boolean {
    const removed = this.containers.delete(id);

    if (removed) {
      // Reajustar posições
      this.reorderPositions();
      this.notifyListeners();
      console.log(`🗑️ Container removido: ${id}`);
    }

    return removed;
  }

  /**
   * Limpa todos os containers
   */
  clearAll(): void {
    this.containers.clear();
    this.notifyListeners();
    console.log('🧹 Todos os containers removidos');
  }

  /**
   * Retorna todos os containers
   */
  getAllContainers(): DynamicContainer[] {
    return Array.from(this.containers.values())
      .sort((a, b) => a.position - b.position);
  }

  /**
   * Retorna container específico
   */
  getContainer(id: string): DynamicContainer | undefined {
    return this.containers.get(id);
  }

  /**
   * Retorna layout atual baseado no número de containers
   */
  getCurrentLayout(): ContainerLayout {
    const count = this.containers.size;

    if (count === 1) return '1x1';
    if (count === 2) return '1x2';
    if (count === 3) return '1x3';
    if (count === 4) return '2x2';

    return '1x1';
  }

  /**
   * Retorna classes CSS para grid layout
   */
  getLayoutClasses(): string {
    const layout = this.getCurrentLayout();

    const classes = {
      '1x1': 'grid-cols-1',
      '1x2': 'grid-cols-1 md:grid-cols-2',
      '2x2': 'grid-cols-2',
      '1x3': 'grid-cols-1 md:grid-cols-3',
      '2x3': 'grid-cols-2 md:grid-cols-3',
    };

    return `grid ${classes[layout]} gap-4`;
  }

  /**
   * Adiciona listener para mudanças
   */
  addListener(callback: (containers: DynamicContainer[]) => void): void {
    this.listeners.push(callback);
  }

  /**
   * Remove listener
   */
  removeListener(callback: (containers: DynamicContainer[]) => void): void {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Notifica todos os listeners
   */
  private notifyListeners(): void {
    const containers = this.getAllContainers();
    this.listeners.forEach(callback => callback(containers));
  }

  /**
   * Reordena posições após remoção
   */
  private reorderPositions(): void {
    const containers = Array.from(this.containers.values())
      .sort((a, b) => a.position - b.position);

    containers.forEach((container, index) => {
      container.position = index;
    });
  }

  /**
   * Define limite máximo de containers
   */
  setMaxContainers(max: number): void {
    this.maxContainers = Math.max(1, Math.min(max, 6)); // Entre 1 e 6
    console.log(`📦 Limite de containers: ${this.maxContainers}`);
  }
}

// ======================================================================
// HELPERS
// ======================================================================

/**
 * Cria container de gráfico
 */
export function addChartContainer(
  manager: DynamicContentManager,
  title: string,
  labels: string[],
  values: number[],
  chartType: 'bar' | 'line' | 'pie' = 'bar'
): string {
  return manager.addDynamicContent('chart', {
    type: chartType,
    title,
    labels,
    datasets: [{
      label: title,
      data: values,
      backgroundColor: 'rgba(0, 243, 255, 0.5)',
      borderColor: '#00f3ff',
    }],
  });
}

/**
 * Cria container de tabela
 */
export function addTableContainer(
  manager: DynamicContentManager,
  title: string,
  headers: string[],
  rows: (string | number)[][]
): string {
  return manager.addDynamicContent('table', {
    title,
    headers,
    rows,
  });
}

/**
 * Cria container de relatório
 */
export function addReportContainer(
  manager: DynamicContentManager,
  title: string,
  sections: { heading: string; content: string }[]
): string {
  return manager.addDynamicContent('report', {
    title,
    sections,
  });
}

/**
 * Cria container de imagem
 */
export function addImageContainer(
  manager: DynamicContentManager,
  url: string,
  alt: string,
  caption?: string
): string {
  return manager.addDynamicContent('image', {
    url,
    alt,
    caption,
  });
}

/**
 * Cria container de código
 */
export function addCodeContainer(
  manager: DynamicContentManager,
  code: string,
  language: string,
  title?: string
): string {
  return manager.addDynamicContent('custom', {
    type: 'code',
    language,
    code,
    title,
  });
}

// ======================================================================
// SINGLETON EXPORT
// ======================================================================

export const dynamicContentManager = new DynamicContentManager();
