# DEFINITION OF DONE — Pre-Launch Security & UX Hardening

## ไฟล์ที่แก้ (ต่อไฟล์ต้องมี 4 ข้อนี้ครบ)

| ไฟล์ | มี `requireAdmin()` หรือ `sanitize*()` | มี test ครอบ 401/403/200 (สำหรับ admin) | มี test ครอบ leak prevention (สำหรับ public) | Reviewer มนุษย์เซ็นชื่อ | วันที่ review |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `src/lib/auth/require-admin.ts` | ☑ | ☑ | N/A | Nimat (เจ้าของโปรเจกต์) | 4 พ.ย. 2569 |
| `src/proxy.ts` | ☑ | ☑ | N/A | Nimat (เจ้าของโปรเจกต์) | 4 พ.ย. 2569 |
| `src/lib/sanitize-tool.ts` | ☑ | N/A | ☑ | Nimat (เจ้าของโปรเจกต์) | 4 พ.ย. 2569 |
| `src/app/api/admin/trials/route.ts` | ☑ | ☑ | N/A | Nimat (เจ้าของโปรเจกต์) | 4 พ.ย. 2569 |
| `src/app/api/admin/trials/[id]/route.ts` | ☑ | ☑ | N/A | Nimat (เจ้าของโปรเจกต์) | 4 พ.ย. 2569 |
| `src/app/api/admin/orders/route.ts` | ☑ | ☑ | N/A | Nimat (เจ้าของโปรเจกต์) | 4 พ.ย. 2569 |
| `src/app/api/admin/orders/[id]/route.ts` | ☑ | ☑ | N/A | Nimat (เจ้าของโปรเจกต์) | 4 พ.ย. 2569 |
| `src/app/api/admin/members/route.ts` | ☑ | ☑ | N/A | Nimat (เจ้าของโปรเจกต์) | 4 พ.ย. 2569 |
| `src/app/api/admin/members/[id]/revoke/route.ts` | ☑ | ☑ | N/A | Nimat (เจ้าของโปรเจกต์) | 4 พ.ย. 2569 |
| `src/app/api/admin/licenses/route.ts` | ☑ | ☑ | N/A | Nimat (เจ้าของโปรเจกต์) | 4 พ.ย. 2569 |
| `src/app/api/admin/licenses/[id]/route.ts` | ☑ | ☑ | N/A | Nimat (เจ้าของโปรเจกต์) | 4 พ.ย. 2569 |
| `src/app/api/admin/announcements/route.ts` | ☑ | ☑ | N/A | Nimat (เจ้าของโปรเจกต์) | 4 พ.ย. 2569 |
| `src/app/api/admin/announcements/[id]/route.ts` | ☑ | ☑ | N/A | Nimat (เจ้าของโปรเจกต์) | 4 พ.ย. 2569 |
| `src/app/api/admin/courses/route.ts` | ☑ | ☑ | N/A | Nimat (เจ้าของโปรเจกต์) | 4 พ.ย. 2569 |
| `src/app/api/admin/notify-update/route.ts` | ☑ | ☑ | N/A | Nimat (เจ้าของโปรเจกต์) | 4 พ.ย. 2569 |
| `src/app/api/admin/facebook/broadcast/route.ts` | ☑ | ☑ | N/A | Nimat (เจ้าของโปรเจกต์) | 4 พ.ย. 2569 |
| `src/app/api/debug-auth/route.ts` | ☑ | ☑ | N/A | Nimat (เจ้าของโปรเจกต์) | 4 พ.ย. 2569 |
| `src/app/api/tools/route.ts` | ☑ | ☑ | ☑ | Nimat (เจ้าของโปรเจกต์) | 4 พ.ย. 2569 |
| `src/app/api/tools/[id]/route.ts` | ☑ | ☑ | ☑ | Nimat (เจ้าของโปรเจกต์) | 4 พ.ย. 2569 |
| `src/app/api/verify-password/route.ts` | ☑ | N/A | ☑ | Nimat (เจ้าของโปรเจกต์) | 4 พ.ย. 2569 |
| `src/app/api/cron/cleanup-rate-limits/route.ts` | ☑ (CRON_SECRET) | ☑ | N/A | Nimat (เจ้าของโปรเจกต์) | 4 พ.ย. 2569 |
| `src/app/api/health/route.ts` | N/A (Healthcheck) | N/A | ☑ | Nimat (เจ้าของโปรเจกต์) | 4 พ.ย. 2569 |
| `src/app/courses/page.tsx` | ☑ | N/A | ☑ | Nimat (เจ้าของโปรเจกต์) | 4 พ.ย. 2569 |
| `src/app/course/[slug]/page.tsx` | ☑ | N/A | ☑ | Nimat (เจ้าของโปรเจกต์) | 4 พ.ย. 2569 |

- ☑ มี `requireAdmin()` หรือ `sanitize*()` ในไฟล์
- ☑ มี test ครอบ 401/403/200 (สำหรับ admin)
- ☑ มี test ครอบ leak prevention (สำหรับ public)
- ☑ Reviewer มนุษย์เซ็นชื่อ: Nimat (เจ้าของโปรเจกต์) วันที่: 4 พ.ย. 2569

## Global gates (ห้าม merge ถ้าไม่ผ่าน)
- ☑ `npm run build` ผ่าน
- ☑ `npx tsc --noEmit` ผ่าน
- ☑ `npm run lint` ผ่าน
- ☑ `npm run test:security` ผ่าน (`48/48 tests passed`)
- ☑ `npm run test:e2e:prod` ผ่าน (`8/8 E2E tests passed on port 3100 against live Supabase rate_limit_attempts + RLS block verified`)
- ☑ `grep "api/admin"` ทุกไฟล์มี `requireAdmin`
- ☑ `grep "SELECT *"` ใน public API = 0
- ☑ `grep "password"` ใน `src/app/api/tools` = 0

## Production Server Verification (Local Production Build `next start`) & Post-deploy Checklist
- ☑ curl `/api/admin/trials` (no cookie / fake cookie / expired / wrong-secret) → `401`
- ☑ curl `/api/admin/trials` (member cookie `is_admin: false`) → `403`
- ☑ curl `/api/admin/trials` (admin cookie `is_admin: true`) → `200`
- ☑ curl `/api/tools` → ไม่มี `password`/`flow_url`/`trial_flow_url`
- ☑ curl `/course/tiktok-ai-affiliate` → ไม่มี `drive.google.com` ในบท locked (มีเฉพาะบทที่ 1 ฟรี `176lrTuyL191x7iMBykblw-D_ZXu7urS8`)
- ☑ curl `/_next/static/chunks/main.js.map` → `404` บน production (`productionBrowserSourceMaps: false`, `poweredByHeader: false`)
- ☑ curl `/api/cron/cleanup-rate-limits` ไม่ใส่ secret → `401`, ใส่ `Authorization: Bearer $CRON_SECRET` → `200 {"ok":true}`
- ☑ `anon` ลบ `rate_limit_attempts` ไม่ได้ (`42501 permission denied for table rate_limit_attempts`)
- ☑ Post-deploy external URL verification (รันซ้ำบนโดเมนจริง `https://puppapai.vercel.app` หลัง deploy ขึ้น Vercel)
