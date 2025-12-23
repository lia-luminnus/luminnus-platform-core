# Script PowerShell para substituir cores nos componentes de métricas
$files = @(
    'MetricsDashboard.tsx',
    'tabs\OpenAIMetricsTab.tsx',
    'tabs\CartesiaMetricsTab.tsx',
    'tabs\RenderMetricsTab.tsx',
    'tabs\CloudflareMetricsTab.tsx',
    'tabs\SupabaseMetricsTab.tsx'
)

$basePath = 'd:\Pasta de revisão\luminnus-lia-future-29442-main\src\components\admin\metrics'

$replacements = @(
    @{ Old = 'text-gray-400'; New = 'text-muted-foreground' },
    @{ Old = 'text-gray-500'; New = 'text-muted-foreground' },
    @{ Old = 'text-gray-600'; New = 'text-muted-foreground' },
    @{ Old = 'text-gray-700'; New = 'text-foreground' },
    @{ Old = 'text-gray-800'; New = 'text-foreground' },
    @{ Old = 'text-gray-900'; New = 'text-foreground' },
    @{ Old = 'bg-gray-50'; New = 'bg-muted/50' },
    @{ Old = 'bg-gray-100'; New = 'bg-muted' },
    @{ Old = 'bg-gray-200'; New = 'bg-muted' },
    @{ Old = 'border-gray-200'; New = 'border-border' },
    @{ Old = 'border-gray-300'; New = 'border-border' }
)

foreach ($file in $files) {
    $fullPath = Join-Path $basePath $file
    if (Test-Path $fullPath) {
        $content = Get-Content $fullPath -Raw -Encoding UTF8
        $originalContent = $content
        
        foreach ($replacement in $replacements) {
            $content = $content.Replace($replacement.Old, $replacement.New)
        }
        
        if ($content -ne $originalContent) {
            Set-Content $fullPath -Value $content -Encoding UTF8 -NoNewline
            Write-Host "Atualizado: $file"
        }
        else {
            Write-Host "Sem mudancas: $file"
        }
    }
    else {
        Write-Host "Nao encontrado: $file"
    }
}

Write-Host "`nConcluido!"
