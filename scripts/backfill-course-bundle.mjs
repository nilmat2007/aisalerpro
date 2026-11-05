#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const GUIDE_DRIVE_URL =
  'https://drive.google.com/drive/folders/1v8Kyr1GRW7mqA5sd6SiZvLJFayOOQjiA?usp=drive_link';

const NEW_TOOLS = [
  {
    name: 'PUP PAP Fashion Studio',
    slug: 'puppap-fashion-studio',
    icon: '👗',
    poster_url: '/images/poster-puppap-fashion-studio.jpg',
    logo_url: '/images/poster-puppap-fashion-studio.jpg',
    password: 'LICENSE_KEY_ONLY',
    description:
      'สตูดิโอสร้างคลิปขายเสื้อผ้าและแฟชั่นทุกแบบด้วย AI ปั้นนางแบบ-นายแบบสวมชุดจริง รีวิวเสื้อผ้าปักตะกร้าอัตโนมัติ (ซื้อแยก ฿299 หรือรับฟรีทันทีเมื่อสมัครคอร์ส ฿299)',
    price: '299',
    badge_text: '🎁 แถมฟรีในคอร์ส ฿299',
    badge_color: 'pink',
    version: '1.0.0',
    is_active: true,
    is_coming_soon: false,
    sort_order: 2,
    trial_enabled: true,
    flow_url: 'https://flow.google.com/shared/tool/7cd5fff0-d917-41c2-b530-acc8ae147dcc',
    trial_flow_url: 'https://flow.google.com/shared/tool/7cd5fff0-d917-41c2-b530-acc8ae147dcc',
    features: {
      category: 'flow_tool',
      original_price: '990',
      bundle_with_course: 'tiktok-ai-affiliate',
      guide_drive_url: GUIDE_DRIVE_URL,
      highlights: [
        'สร้างคลิปนางแบบ-นายแบบใส่เสื้อผ้าของคุณได้ทุกสไตล์',
        'รองรับเสื้อยืด ชุดเดรส แฟชั่นสตรีท ชุดทำงาน และสินค้าแฟชั่นทุกแบบ',
        'แถมฟรีคู่มือและคลิปสอนใช้งานครบชุดใน Google Drive',
        'ปลดล็อกฟรีอัตโนมัติเมื่อซื้อคอร์สเรียนทำคลิป AI ปักตะกร้า ฿299',
      ],
    },
  },
  {
    name: 'PUPPAP AI UGC Product',
    slug: 'puppap-ugc-product',
    icon: '✨',
    poster_url: '/images/poster-puppap-ugc-product.jpg',
    logo_url: '/images/poster-puppap-ugc-product.jpg',
    password: 'LICENSE_KEY_ONLY',
    description:
      'เครื่องมือสร้างคลิปรีวิวสินค้าแบบมินิมอล (Minimal UGC) คุมโทนสวยสะอาดตา น่าเชื่อถือ ปิดการขายปักตะกร้าได้ทุกหมวดสินค้า (ซื้อแยก ฿299 หรือรับฟรีทันทีเมื่อสมัครคอร์ส ฿299)',
    price: '299',
    badge_text: '🎁 แถมฟรีในคอร์ส ฿299',
    badge_color: 'purple',
    version: '1.0.0',
    is_active: true,
    is_coming_soon: false,
    sort_order: 3,
    trial_enabled: true,
    flow_url: 'https://flow.google.com/shared/tool/2cf7e3b4-9ea3-443a-b5d4-a32b6d7aed50',
    trial_flow_url: 'https://flow.google.com/shared/tool/2cf7e3b4-9ea3-443a-b5d4-a32b6d7aed50',
    features: {
      category: 'flow_tool',
      original_price: '990',
      bundle_with_course: 'tiktok-ai-affiliate',
      guide_drive_url: GUIDE_DRIVE_URL,
      highlights: [
        'สร้างคลิปรีวิวสินค้าสไตล์ Minimal UGC ดูจริงใจ ยอดวิวพุ่ง',
        'เหมาะกับสินค้าบิวตี้ ของใช้ในบ้าน แกตเจ็ต และสินค้าปักตะกร้าทุกหมวด',
        'แถมฟรีคู่มือและคลิปสอนใช้งานครบชุดใน Google Drive',
        'ปลดล็อกฟรีอัตโนมัติเมื่อซื้อคอร์สเรียนทำคลิป AI ปักตะกร้า ฿299',
      ],
    },
  },
];

async function upsertGuideForTool(tool) {
  const { data: existingSections } = await supabase
    .from('guide_sections')
    .select('id, title')
    .eq('tool_id', tool.id);

  if (existingSections && existingSections.length > 0) {
    console.log(`[Guide] Tool ${tool.slug} already has ${existingSections.length} section(s)`);
    return;
  }

  const isFashion = tool.slug === 'puppap-fashion-studio';
  const { data: section, error: secErr } = await supabase
    .from('guide_sections')
    .insert({
      tool_id: tool.id,
      title: isFashion
        ? 'คู่มือเริ่มต้นใช้งาน PUP PAP Fashion Studio'
        : 'คู่มือเริ่มต้นใช้งาน PUPPAP AI UGC Product',
      icon: isFashion ? '👗' : '✨',
      description:
        'ทำตามขั้นตอนด้านล่างเพื่อสร้างคลิป AI ปักตะกร้าพร้อมคู่มือและคลิปสอนใน Google Drive',
      sort_order: 1,
      style_variant: 'default',
    })
    .select('id')
    .single();

  if (secErr || !section) {
    console.warn(`[Guide] Failed to create section for ${tool.slug}:`, secErr?.message);
    return;
  }

  const steps = isFashion
    ? [
        {
          section_id: section.id,
          step_number: '1',
          label: 'STEP 1',
          title: 'เปิดคู่มือและคลิปสอนใช้งานใน Google Drive',
          content: `กดปุ่ม "📂 เปิดดูคู่มือและคลิปสอนใช้งาน (Google Drive)" ด้านบน หรือคลิกลิงก์ ${GUIDE_DRIVE_URL} เพื่อดูตัวอย่างการเตรียมภาพเสื้อผ้าและเทคนิคตั้งค่าก่อนเริ่มใช้งาน`,
          sub_items: [
            'เตรียมภาพถ่ายเสื้อผ้าหรือชุดที่ต้องการนำมารีวิว (พื้นหลังเรียบหรือภาพสินค้าจากร้านค้า)',
            'ดูคลิปสอนเทคนิคการเลือกมุมกล้องและสไตล์นางแบบ-นายแบบในโฟลเดอร์ Google Drive',
          ],
          sort_order: 1,
        },
        {
          section_id: section.id,
          step_number: '2',
          label: 'STEP 2',
          title: 'กดปุ่ม "เข้าใช้งานเครื่องมือ" เพื่อเปิด Google Flow',
          content:
            'คลิกปุ่มเข้าใช้งานเครื่องมือด้านบนเพื่อเปิดหน้า PUP PAP Fashion Studio บน Google Flow (ต้องล็อกอินด้วยบัญชี Google)',
          sub_items: [
            'อัปโหลดภาพเสื้อผ้าของคุณเข้าสู่ช่อง Input ของเครื่องมือ',
            'ระบุสไตล์นางแบบ/นายแบบ ฉากสตูดิโอ หรือคาแรกเตอร์ที่ต้องการให้สวมใส่ชุด',
          ],
          sort_order: 2,
        },
        {
          section_id: section.id,
          step_number: '3',
          label: 'STEP 3',
          title: 'สร้างวิดีโอแฟชั่น AI และนำไปโพสต์ปักตะกร้า',
          content:
            'กดรันให้ AI สร้างภาพและวิดีโอนางแบบสวมชุดจริง พร้อมบทพูดรีวิวเสื้อผ้าเพื่อนำไปโพสต์ปักตะกร้า TikTok / Shopee ได้ทันที',
          sub_items: [
            'ดาวน์โหลดคลิปวิดีโอความละเอียดสูงลงมือถือหรือคอมพิวเตอร์',
            'แนบลิงก์ตะกร้าสินค้าเสื้อผ้าพร้อมแคปชันเพื่อปิดการขายอัตโนมัติ',
          ],
          sort_order: 3,
        },
      ]
    : [
        {
          section_id: section.id,
          step_number: '1',
          label: 'STEP 1',
          title: 'ศึกษาคู่มือและคลิปสอนใน Google Drive',
          content: `กดปุ่ม "📂 เปิดดูคู่มือและคลิปสอนใช้งาน (Google Drive)" ด้านบน หรือเปิดลิงก์ ${GUIDE_DRIVE_URL} เพื่อดูแนวทางการทำคลิปรีวิวสไตล์ Minimal UGC`,
          sub_items: [
            'เตรียมรูปภาพสินค้าที่ต้องการรีวิว 1-2 ภาพ (เห็นฉลากหรือตัวสินค้าชัดเจน)',
            'ระบุจุดเด่นของสินค้าหรือปัญหาของลูกค้าที่สินค้าช่วยแก้ได้',
          ],
          sort_order: 1,
        },
        {
          section_id: section.id,
          step_number: '2',
          label: 'STEP 2',
          title: 'เปิดเครื่องมือ PUPPAP AI UGC Product บน Google Flow',
          content:
            'กดปุ่มเข้าใช้งานเครื่องมือด้านบน อัปโหลดภาพสินค้า และเลือกโทนฉากมินิมอลสะอาดตาตามที่ต้องการ',
          sub_items: [
            'ระบบจะช่วยออกแบบมุมกล้องรีวิวสินค้าสไตล์ UGC ที่ดูเป็นธรรมชาติและน่าเชื่อถือ',
            'สร้างสคริปต์และจังหวะการโชว์สินค้าที่ดึงดูดสายตาตั้งแต่วินาทีแรก',
          ],
          sort_order: 2,
        },
        {
          section_id: section.id,
          step_number: '3',
          label: 'STEP 3',
          title: 'ดาวน์โหลดคลิป Minimal UGC พร้อมปักตะกร้าทำเงิน',
          content:
            'บันทึกวิดีโอที่ได้ไปโพสต์ลงช่อง TikTok / Reels / Shopee Video พร้อมปักตะกร้าสินค้าได้ทันที',
          sub_items: [
            'สามารถสร้างหลายเวอร์ชันเพื่อทดสอบมุมกล้องที่ทำยอดขายดีที่สุด',
            'ดูเทคนิคการตัดต่อและพากย์เสียงเพิ่มเติมได้ในคอร์สเรียน TikTok AI Affiliate',
          ],
          sort_order: 3,
        },
      ];

  const { error: stepsErr } = await supabase.from('guide_steps').insert(steps);
  if (stepsErr) {
    console.warn(`[Guide] Failed to insert steps for ${tool.slug}:`, stepsErr.message);
  } else {
    console.log(`[Guide] Created guide section + 3 steps for ${tool.slug}`);
  }
}

async function main() {
  console.log('=== Step 1: Upserting 2 Bonus AI Flow Tools ===');
  for (const item of NEW_TOOLS) {
    const { data: existing } = await supabase
      .from('tools')
      .select('id, slug, features')
      .eq('slug', item.slug)
      .maybeSingle();

    let savedTool;
    if (existing) {
      const mergedFeatures = { ...(existing.features || {}), ...item.features };
      const { data, error } = await supabase
        .from('tools')
        .update({
          ...item,
          features: mergedFeatures,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('id, slug, name')
        .single();
      if (error) throw error;
      savedTool = data;
      console.log(`Updated tool: ${savedTool.name} (${savedTool.slug}) [${savedTool.id}]`);
    } else {
      const { data, error } = await supabase
        .from('tools')
        .insert(item)
        .select('id, slug, name')
        .single();
      if (error) throw error;
      savedTool = data;
      console.log(`Inserted tool: ${savedTool.name} (${savedTool.slug}) [${savedTool.id}]`);
    }

    await upsertGuideForTool(savedTool);
  }

  console.log('\n=== Step 2: Linking Course Lessons 14 & 22 on tiktok-ai-affiliate ===');
  const { data: courseTool, error: courseErr } = await supabase
    .from('tools')
    .select('id, slug, features')
    .eq('slug', 'tiktok-ai-affiliate')
    .single();

  if (courseErr || !courseTool) {
    throw new Error(`Course tiktok-ai-affiliate not found: ${courseErr?.message}`);
  }

  const courseFeatures = { ...(courseTool.features || {}) };
  courseFeatures.guide_drive_url = GUIDE_DRIVE_URL;
  courseFeatures.bundle_bonus_slugs = ['puppap-fashion-studio', 'puppap-ugc-product'];

  if (Array.isArray(courseFeatures.course_lessons)) {
    courseFeatures.course_lessons = courseFeatures.course_lessons.map((lesson, idx) => {
      const lessonNum = idx + 1;
      if (lessonNum === 14 || lesson.id === 'lesson-14') {
        return { ...lesson, flow_tool_slug: 'puppap-ugc-product' };
      }
      if (lessonNum === 22 || lesson.id === 'lesson-22') {
        return { ...lesson, flow_tool_slug: 'puppap-fashion-studio' };
      }
      return lesson;
    });
  }

  const { error: updateCourseErr } = await supabase
    .from('tools')
    .update({
      features: courseFeatures,
      updated_at: new Date().toISOString(),
    })
    .eq('id', courseTool.id);

  if (updateCourseErr) throw updateCourseErr;
  console.log('Successfully linked Lesson 14 -> puppap-ugc-product & Lesson 22 -> puppap-fashion-studio');

  console.log('\n=== Step 3: Backfilling Existing Course Bundle Owners ===');
  const { data: bundleTools, error: btErr } = await supabase
    .from('tools')
    .select('id, slug, name')
    .in('slug', ['tiktok-ai-affiliate', 'puppap-fashion-studio', 'puppap-ugc-product'])
    .eq('is_active', true);

  if (btErr || !bundleTools || bundleTools.length !== 3) {
    throw new Error(`Expected 3 active bundle tools, found ${bundleTools?.length || 0}`);
  }

  const bundleToolIds = bundleTools.map((t) => t.id);

  // Fetch all active user_tools and approved orders for any of the 3 bundle tools
  const [{ data: activeUserTools }, { data: approvedOrders }, { data: allKeys }] = await Promise.all([
    supabase
      .from('user_tools')
      .select('id, user_id, tool_id, license_key_id, is_active')
      .in('tool_id', bundleToolIds)
      .eq('is_active', true),
    supabase
      .from('orders')
      .select('id, user_id, tool_id, license_key_id, status')
      .in('tool_id', bundleToolIds)
      .eq('status', 'approved'),
    supabase
      .from('license_keys')
      .select('id, status')
      .in('tool_id', bundleToolIds),
  ]);

  const revokedKeyIds = new Set(
    (allKeys || []).filter((k) => k.status === 'revoked').map((k) => k.id)
  );

  // Map user_id -> qualifying license_key_id
  const eligibleUsers = new Map();

  for (const ut of activeUserTools || []) {
    if (!ut.user_id) continue;
    if (ut.license_key_id && revokedKeyIds.has(ut.license_key_id)) continue;
    if (!eligibleUsers.has(ut.user_id)) {
      eligibleUsers.set(ut.user_id, ut.license_key_id || null);
    }
  }

  for (const ord of approvedOrders || []) {
    if (!ord.user_id) continue;
    if (ord.license_key_id && revokedKeyIds.has(ord.license_key_id)) continue;
    if (!eligibleUsers.has(ord.user_id)) {
      eligibleUsers.set(ord.user_id, ord.license_key_id || null);
    }
  }

  let fixedRowsCount = 0;
  let skippedRowsCount = 0;

  for (const [userId, keyId] of eligibleUsers.entries()) {
    for (const toolId of bundleToolIds) {
      const { data: existingUt } = await supabase
        .from('user_tools')
        .select('id, is_active')
        .eq('user_id', userId)
        .eq('tool_id', toolId)
        .maybeSingle();

      if (existingUt?.is_active === true) {
        skippedRowsCount++;
        continue;
      }

      const { error: upsertErr } = await supabase.from('user_tools').upsert(
        {
          user_id: userId,
          tool_id: toolId,
          license_key_id: keyId,
          is_active: true,
          activated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,tool_id' }
      );

      if (!upsertErr) {
        fixedRowsCount++;
      } else {
        console.warn(`Failed to backfill user ${userId} tool ${toolId}:`, upsertErr.message);
      }
    }
  }

  console.log(
    `Backfill complete: eligibleUsers=${eligibleUsers.size}, fixedRowsCount=${fixedRowsCount}, skippedRowsCount=${skippedRowsCount}`
  );
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
