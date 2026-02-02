#!/bin/bash
# ==========================================================
# Database Migration Helper Script
# Date: 2026-02-02
# Description: Helper script to apply and verify migrations
# ==========================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check if DATABASE_URL is set
check_database_url() {
    if [ -z "$DATABASE_URL" ]; then
        print_error "DATABASE_URL environment variable is not set"
        print_info "Please set it using: export DATABASE_URL='postgresql://...'"
        exit 1
    fi
    print_success "Database URL configured"
}

# Apply migration
apply_migration() {
    print_header "APPLYING MIGRATION"
    
    MIGRATION_FILE="supabase/migrations/20260202_fix_missing_tables_and_columns.sql"
    
    if [ ! -f "$MIGRATION_FILE" ]; then
        print_error "Migration file not found: $MIGRATION_FILE"
        exit 1
    fi
    
    print_info "Running migration: $MIGRATION_FILE"
    
    if psql "$DATABASE_URL" -f "$MIGRATION_FILE"; then
        print_success "Migration applied successfully"
    else
        print_error "Migration failed"
        exit 1
    fi
}

# Run verification
verify_schema() {
    print_header "VERIFYING SCHEMA"
    
    VERIFY_FILE="supabase/migrations/verify_schema.sql"
    
    if [ ! -f "$VERIFY_FILE" ]; then
        print_warning "Verification file not found: $VERIFY_FILE"
        return 1
    fi
    
    print_info "Running verification script"
    
    if psql "$DATABASE_URL" -f "$VERIFY_FILE"; then
        print_success "Verification completed"
    else
        print_warning "Verification had issues (check output above)"
    fi
}

# List tables
list_tables() {
    print_header "LISTING RELEVANT TABLES"
    
    psql "$DATABASE_URL" -c "
        SELECT 
            schemaname,
            tablename,
            CASE WHEN rowsecurity THEN 'Yes' ELSE 'No' END as rls_enabled
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename IN ('conversations', 'messages', 'memories', 'agendamentos', 'brief_history')
        ORDER BY tablename;
    "
}

# Check specific tables
check_tables() {
    print_header "CHECKING CRITICAL TABLES"
    
    psql "$DATABASE_URL" -c "
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
    "
}

# Check columns
check_columns() {
    print_header "CHECKING CRITICAL COLUMNS"
    
    psql "$DATABASE_URL" -c "
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
    "
}

# Show usage
show_usage() {
    cat << EOF
Usage: $0 [command]

Commands:
    apply       Apply the migration
    verify      Run verification script
    check       Quick check of tables and columns
    list        List all relevant tables
    full        Run full migration + verification
    help        Show this help message

Examples:
    $0 apply       # Apply migration
    $0 check       # Quick status check
    $0 full        # Apply migration and verify

Before running, set DATABASE_URL:
    export DATABASE_URL="postgresql://user:password@host:port/database"
    
EOF
}

# Main script
main() {
    case "${1:-help}" in
        apply)
            check_database_url
            apply_migration
            ;;
        verify)
            check_database_url
            verify_schema
            ;;
        check)
            check_database_url
            check_tables
            echo ""
            check_columns
            ;;
        list)
            check_database_url
            list_tables
            ;;
        full)
            check_database_url
            apply_migration
            echo ""
            check_tables
            echo ""
            check_columns
            echo ""
            verify_schema
            ;;
        help|--help|-h)
            show_usage
            ;;
        *)
            print_error "Unknown command: $1"
            echo ""
            show_usage
            exit 1
            ;;
    esac
}

# Run main
main "$@"
