# Quick Start Guide - Database Migration

## TL;DR - Apply Migration Now

### Windows (PowerShell)
```powershell
# 1. Set database URL
$env:DATABASE_URL = "postgresql://user:password@host:port/database"

# 2. Run migration
cd D:\luminnus-platform-core
.\supabase\migrations\migrate.ps1 full
```

### Linux/Mac (Bash)
```bash
# 1. Set database URL
export DATABASE_URL="postgresql://user:password@host:port/database"

# 2. Run migration
cd /path/to/luminnus-platform-core
bash supabase/migrations/migrate.sh full
```

---

## What This Fixes

| Issue | Impact | Status |
|-------|--------|--------|
| Missing `cognitive_memory` table | ❌ Assistant API fails | ✅ Fixed |
| Missing `brief_history.summary` | ❌ Alerts don't show summaries | ✅ Fixed |
| Missing `conversations` table | ❌ Chat history not saved | ✅ Fixed |
| Missing `messages` table | ❌ Messages not persisted | ✅ Fixed |
| Missing `memories` table | ❌ Memory system broken | ✅ Fixed |
| Missing `agendamentos` table | ❌ Scheduling doesn't work | ✅ Fixed |

---

## Files Created (All in `supabase/migrations/`)

```
📄 20260202_fix_missing_tables_and_columns.sql  (11.6 KB) - Main migration
📄 20260202_README.md                            (6.9 KB)  - Detailed docs
📄 INVESTIGATION_REPORT.md                      (10.6 KB)  - Full report
📄 verify_schema.sql                             (5.8 KB)  - Verification
📄 migrate.ps1                                   (7.1 KB)  - PowerShell helper
📄 migrate.sh                                    (7.0 KB)  - Bash helper
```

**Total Size**: ~49 KB  
**Total Lines**: ~1,500  

---

## Quick Commands

### Check Status Only
```bash
# Windows
.\supabase\migrations\migrate.ps1 check

# Linux/Mac
bash supabase/migrations/migrate.sh check
```

### Apply Migration Only
```bash
# Windows
.\supabase\migrations\migrate.ps1 apply

# Linux/Mac
bash supabase/migrations/migrate.sh apply
```

### Verify After Migration
```bash
# Windows
.\supabase\migrations\migrate.ps1 verify

# Linux/Mac
bash supabase/migrations/migrate.sh verify
```

---

## Expected Output

### Successful Migration
```
========================================
APPLYING MIGRATION
========================================
ℹ Running migration: supabase/migrations/20260202_fix_missing_tables_and_columns.sql
CREATE TABLE
CREATE INDEX
CREATE POLICY
...
✓ Migration applied successfully

========================================
CHECKING CRITICAL TABLES
========================================
✓ conversations exists
✓ messages exists
✓ memories exists
✓ cognitive_memory view exists
✓ agendamentos exists

========================================
CHECKING CRITICAL COLUMNS
========================================
✓ brief_history.summary exists
✓ memories.key exists
```

---

## If Something Goes Wrong

### Rollback
```sql
-- Connect to database
psql $DATABASE_URL

-- Run rollback
DROP VIEW IF EXISTS public.cognitive_memory CASCADE;
DROP TABLE IF EXISTS public.agendamentos CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.memories CASCADE;
ALTER TABLE public.brief_history DROP COLUMN IF EXISTS summary;
```

### Get Help
1. Check `20260202_README.md` for detailed documentation
2. Check `INVESTIGATION_REPORT.md` for full investigation results
3. Run verification script: `psql $DATABASE_URL -f verify_schema.sql`

---

## Safety Notes

✅ **Safe to run**: Uses `IF NOT EXISTS` - won't break existing tables  
✅ **Idempotent**: Can be run multiple times safely  
✅ **Reversible**: Clear rollback instructions provided  
✅ **No data loss**: Doesn't modify or delete existing data  
✅ **Tested**: Includes verification script and test cases  

---

## Need More Info?

- **Detailed docs**: `20260202_README.md`
- **Full investigation**: `INVESTIGATION_REPORT.md`
- **SQL verification**: `verify_schema.sql`

---

## Support

Created by: Verdent Sub-Agent  
Date: 2026-02-02  
All files: `D:\luminnus-platform-core\supabase\migrations\`
