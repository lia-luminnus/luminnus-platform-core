# ==========================================================
# Database Migration Helper Script (PowerShell)
# Date: 2026-02-02
# Description: Helper script to apply and verify migrations
# ==========================================================

param(
    [Parameter(Position=0)]
    [ValidateSet('apply', 'verify', 'check', 'list', 'full', 'help')]
    [string]$Command = 'help'
)

# Colors for output
function Write-Header {
    param([string]$Message)
    Write-Host "========================================" -ForegroundColor Blue
    Write-Host $Message -ForegroundColor Blue
    Write-Host "========================================" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Write-Warning-Custom {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ $Message" -ForegroundColor Cyan
}

# Check if DATABASE_URL is set
function Test-DatabaseUrl {
    if (-not $env:DATABASE_URL) {
        Write-Error-Custom "DATABASE_URL environment variable is not set"
        Write-Info "Please set it using: `$env:DATABASE_URL='postgresql://...'"
        exit 1
    }
    Write-Success "Database URL configured"
}

# Apply migration
function Invoke-Migration {
    Write-Header "APPLYING MIGRATION"
    
    $migrationFile = "supabase\migrations\20260202_fix_missing_tables_and_columns.sql"
    
    if (-not (Test-Path $migrationFile)) {
        Write-Error-Custom "Migration file not found: $migrationFile"
        exit 1
    }
    
    Write-Info "Running migration: $migrationFile"
    
    try {
        psql $env:DATABASE_URL -f $migrationFile
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Migration applied successfully"
        } else {
            Write-Error-Custom "Migration failed with exit code $LASTEXITCODE"
            exit 1
        }
    } catch {
        Write-Error-Custom "Migration failed: $_"
        exit 1
    }
}

# Run verification
function Invoke-Verification {
    Write-Header "VERIFYING SCHEMA"
    
    $verifyFile = "supabase\migrations\verify_schema.sql"
    
    if (-not (Test-Path $verifyFile)) {
        Write-Warning-Custom "Verification file not found: $verifyFile"
        return
    }
    
    Write-Info "Running verification script"
    
    try {
        psql $env:DATABASE_URL -f $verifyFile
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Verification completed"
        } else {
            Write-Warning-Custom "Verification had issues (check output above)"
        }
    } catch {
        Write-Warning-Custom "Verification failed: $_"
    }
}

# List tables
function Get-Tables {
    Write-Header "LISTING RELEVANT TABLES"
    
    $query = @"
SELECT 
    schemaname,
    tablename,
    CASE WHEN rowsecurity THEN 'Yes' ELSE 'No' END as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('conversations', 'messages', 'memories', 'agendamentos', 'brief_history')
ORDER BY tablename;
"@
    
    psql $env:DATABASE_URL -c $query
}

# Check specific tables
function Test-Tables {
    Write-Header "CHECKING CRITICAL TABLES"
    
    $query = @"
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables 
                     WHERE table_schema = 'public' AND table_name = 'conversations')
        THEN '✓ conversations exists'
        ELSE '✗ conversations MISSING'
    END AS conversations,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables 
                     WHERE table_schema = 'public' AND table_name = 'messages')
        THEN '✓ messages exists'
        ELSE '✗ messages MISSING'
    END AS messages,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables 
                     WHERE table_schema = 'public' AND table_name = 'memories')
        THEN '✓ memories exists'
        ELSE '✗ memories MISSING'
    END AS memories,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.views 
                     WHERE table_schema = 'public' AND table_name = 'cognitive_memory')
        THEN '✓ cognitive_memory view exists'
        ELSE '✗ cognitive_memory view MISSING'
    END AS cognitive_memory,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables 
                     WHERE table_schema = 'public' AND table_name = 'agendamentos')
        THEN '✓ agendamentos exists'
        ELSE '✗ agendamentos MISSING'
    END AS agendamentos;
"@
    
    psql $env:DATABASE_URL -c $query
}

# Check columns
function Test-Columns {
    Write-Header "CHECKING CRITICAL COLUMNS"
    
    $query = @"
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'brief_history' 
            AND column_name = 'summary'
        )
        THEN '✓ brief_history.summary exists'
        ELSE '✗ brief_history.summary MISSING'
    END AS brief_summary,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'memories' 
            AND column_name = 'key'
        )
        THEN '✓ memories.key exists'
        ELSE '✗ memories.key MISSING'
    END AS memories_key;
"@
    
    psql $env:DATABASE_URL -c $query
}

# Show usage
function Show-Usage {
    @"
Usage: .\migrate.ps1 [command]

Commands:
    apply       Apply the migration
    verify      Run verification script
    check       Quick check of tables and columns
    list        List all relevant tables
    full        Run full migration + verification
    help        Show this help message

Examples:
    .\migrate.ps1 apply       # Apply migration
    .\migrate.ps1 check       # Quick status check
    .\migrate.ps1 full        # Apply migration and verify

Before running, set DATABASE_URL:
    `$env:DATABASE_URL="postgresql://user:password@host:port/database"
    
"@
}

# Main script
switch ($Command) {
    'apply' {
        Test-DatabaseUrl
        Invoke-Migration
    }
    'verify' {
        Test-DatabaseUrl
        Invoke-Verification
    }
    'check' {
        Test-DatabaseUrl
        Test-Tables
        Write-Host ""
        Test-Columns
    }
    'list' {
        Test-DatabaseUrl
        Get-Tables
    }
    'full' {
        Test-DatabaseUrl
        Invoke-Migration
        Write-Host ""
        Test-Tables
        Write-Host ""
        Test-Columns
        Write-Host ""
        Invoke-Verification
    }
    'help' {
        Show-Usage
    }
    default {
        Write-Error-Custom "Unknown command: $Command"
        Write-Host ""
        Show-Usage
        exit 1
    }
}
