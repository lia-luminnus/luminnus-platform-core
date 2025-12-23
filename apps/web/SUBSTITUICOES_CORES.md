### Script de Substituição de Cores - Componentes de Métricas

Este script faz substituições em massa nos componentes de métricas.

# Substituições a serem feitas:

## text-gray-*
- text-gray-400  → text-muted-foreground
- text-gray-500  → text-muted-foreground
- text-gray-600  → text-muted-foreground
- text-gray-700  → text-foreground
- text-gray-800  → text-foreground
- text-gray-900  → text-foreground

## Backgrounds
- bg-gray-50   → bg-muted/50
- bg-gray-100  → bg-muted
- bg-gray-200  → bg-muted

## Borders
- border-gray-200 → border-border
- border-gray-300 → border-border

## Special cases (preserve colors):
- text-green-* → keep (sempre visível)
- text-red-* → keep (sempre visível)
- text-yellow-* → keep (sempre visível)
- text-purple-* → keep + add dark variant
- text-cyan-* → keep + add dark variant
- text-blue-* → keep + add dark variant
- text-orange-* → keep + add dark variant
- text-emerald-* → keep + add dark variant
