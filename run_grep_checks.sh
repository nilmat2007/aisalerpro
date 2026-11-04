#!/usr/bin/env bash
export PATH="/usr/bin:$PATH"
set -x

echo "=== 1a. Positive check: grep -rn 'requireAdmin' src/app/api/admin src/app/api/debug-auth --include='route.ts' ==="
grep -rn "requireAdmin" src/app/api/admin src/app/api/debug-auth --include="route.ts"

echo "=== 1b. Negative check: find src/app/api/admin src/app/api/debug-auth -name 'route.ts' | xargs grep -L 'requireAdmin' ==="
find src/app/api/admin src/app/api/debug-auth -name "route.ts" | xargs grep -L "requireAdmin" || true

echo "=== 2a. grep -rn \"select('\\*\\|SELECT \\*\" src/app/api --include='*.ts' | wc -l ==="
grep -rn "select('\*\|SELECT \*" src/app/api --include="*.ts" | wc -l

echo "=== 2b. grep -rn 'password' src/app/api/tools ==="
grep -rn "password" src/app/api/tools | wc -l

echo "=== 3. grep -rn '\\.password\\|flow_url\\|video_url' src/app --include='*.tsx' ==="
grep -rn "\.password\|flow_url\|video_url" src/app --include="*.tsx" | wc -l

echo "=== 4 (Q6). grep -rn 'console\\.\\(log\\|debug\\)' src/lib src/proxy.ts | wc -l ==="
grep -rn "console\.\(log\|debug\)" src/lib src/proxy.ts | wc -l

echo "=== 5 (RED 1). grep -rn 'MASKED_DEFAULT_SECRET\\|JWT_SECRET\\s*||' src/ tests/ ==="
grep -rn "MASKED_DEFAULT_SECRET\|JWT_SECRET\s*||" src/ tests/ | wc -l

echo "=== 6 (AMBER-C). grep -n 'RATE_LIMIT_HMAC_KEY' src/app/api/verify-password/route.ts | wc -l ==="
grep -n "RATE_LIMIT_HMAC_KEY" src/app/api/verify-password/route.ts | wc -l
