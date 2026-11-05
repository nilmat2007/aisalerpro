#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
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

const supabase =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

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
    demo_video_url: 'https://drive.google.com/file/d/15sLvHbTux0cO32NbKeE7E7mIcmsBxs9H/preview',
    features: {
      category: 'flow_tool',
      original_price: '990',
      bundle_with_course: 'tiktok-ai-affiliate',
      guide_drive_url: GUIDE_DRIVE_URL,
      highlights: [
        'สร้างคลิปนางแบบ-นายแบบใส่เสื้อผ้าของคุณได้ทุกสไตล์',
        'รองรับเสื้อยืด ชุดเดรส แฟชั่นสตรีท ชุดทำงาน และสินค้าแฟชั่นทุกแบบ',
        'พร้อมคลิปวิดีโอสอนใช้งานแบบจับมือทำและคู่มือทีละขั้นตอนในหน้าเว็บ',
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
    demo_video_url: 'https://drive.google.com/file/d/11aHTA5eEu0YIaWM8GQDP-IBUeGkZ0tUT/preview',
    features: {
      category: 'flow_tool',
      original_price: '990',
      bundle_with_course: 'tiktok-ai-affiliate',
      guide_drive_url: GUIDE_DRIVE_URL,
      highlights: [
        'สร้างคลิปรีวิวสินค้าสไตล์ Minimal UGC ดูจริงใจ ยอดวิวพุ่ง',
        'เหมาะกับสินค้าบิวตี้ ของใช้ในบ้าน แกตเจ็ต และสินค้าปักตะกร้าทุกหมวด',
        'พร้อมคลิปวิดีโอสอนใช้งานแบบจับมือทำและคู่มือทีละขั้นตอนในหน้าเว็บ',
        'ปลดล็อกฟรีอัตโนมัติเมื่อซื้อคอร์สเรียนทำคลิป AI ปักตะกร้า ฿299',
      ],
    },
  },
];

export const FASHION_GUIDE_SECTIONS = [
  {
    title: 'ขั้นตอนที่ 1: อัปโหลดรูปชุด & สกัดข้อมูลอัตโนมัติ (1. ข้อมูลชุด & นางแบบ)',
    icon: '👗',
    description: 'เตรียมรูปเสื้อผ้าและให้ AI สแกนสกัดข้อมูลทรงชุดพร้อมเลือกท่าทางและนางแบบ',
    sort_order: 1,
    style_variant: 'default',
    steps: [
      {
        step_number: 1,
        label: 'STEP 1',
        title: 'อัปโหลดรูปเสื้อผ้าหรือรูปแคปหน้าจอร้านค้า (1–3 รูป)',
        content:
          'กดอัปโหลดไฟล์ภาพจากเครื่อง หรือกด [เลือกจาก Flow Media Gallery] (หากอยากลองระบบทันที กดปุ่ม [⚡ ลองเล่นตัวอย่างเสื้อแฟชั่น คลิกเดียวครบ] มุมขวาบนได้)',
        sub_items: [
          'รองรับทั้ง รูปชุดเดี่ยวๆ, รูปแคปหน้าร้าน Shopee/TikTok, หรือ รูปตารางไซส์',
        ],
        sort_order: 1,
      },
      {
        step_number: 2,
        label: 'STEP 2',
        title: 'ให้ AI สแกนรูปและกรอกข้อมูลให้อัตโนมัติ (AI OCR + วิเคราะห์ทรงชุด)',
        content:
          'หากเปิดติ๊ก [⚡ สกัดอัตโนมัติเมื่ออัปโหลด] (เปิดไว้เป็นค่าเริ่มต้น) ทันทีที่อัปโหลดรูป ระบบจะอ่านตัวหนังสือในภาพ + วิเคราะห์ทรงชุด แล้วกรอกให้ครบทั้ง 4 ช่องทันที หรือกดปุ่ม [✨ สแกนรูป & กรอกข้อมูลอัตโนมัติ] (และ [🔄 สแกนรูปใหม่อีกครั้ง] เมื่ออัปโหลดรูปเพิ่ม) ได้ตลอดเวลา',
        sub_items: [
          'ชื่อรุ่น / สไตล์ชุดเสื้อผ้า',
          'ประเภทเนื้อผ้า & การสัมผัส',
          'ช่วงไซส์ & สัดส่วน (อก/เอว/ความยาว)',
          'จุดเด่น / คัตติ้งพิเศษ',
        ],
        sort_order: 2,
      },
      {
        step_number: 3,
        label: 'STEP 3',
        title: 'เลือกท่าทางการโชว์ชุด (4 ท่า)',
        content: 'เลือกรูปแบบการนำเสนอชุดเสื้อผ้าที่ต้องการให้ AI สร้างภาพและวิดีโอ',
        sub_items: [
          '[👗 ใส่จริง + ถือไม้แขวนคู่กัน] (ค่าเริ่มต้นยอดนิยม): นางแบบใส่ชุดจริง พร้อมถือชุดเดียวกันบนไม้แขวนสีทองในมืออีกข้างและชี้ดีเทลผ้า',
          '[✨ ใส่โชว์ทรงเต็มตัว]: เห็นสัดส่วนและความยาวชุดตั้งแต่หัวจรดเท้า',
          '[🔍 ครึ่งตัวเน้นดีเทล & คัตติ้ง]: ซูมเนื้อผ้า ปกเสื้อ กระดุม ฝีเข็ม',
          '[🧥 โชว์ชุดบนไม้แขวน ไม่เห็นหน้า]: มือประคองชุดบนไม้แขวนสีทอง เน้นตัวชุดล้วน 100% (เมื่อเลือกท่านี้ ระบบจะล็อกนางแบบเป็นโหมดไร้ใบหน้าให้อัตโนมัติ)',
        ],
        sort_order: 3,
      },
      {
        step_number: 4,
        label: 'STEP 4',
        title: 'เลือกนางแบบพรีเซนเตอร์ (8 สไตล์) & ฉากหลังสตูดิโอ (4 ฉาก)',
        content:
          'ระบบจะจับคู่นางแบบและฉากหลังที่เข้ากับชุดให้อัตโนมัติจากการสแกนรูป หรือคลิกเลือกเปลี่ยนเองได้ตามต้องการ',
        sub_items: [
          'หากเลือกการ์ดที่ 8 ([📸 ใช้รูปหน้าของคุณเอง]) ให้อัปโหลดรูปหน้าตรงและติ๊กยืนยันสิทธิ์การใช้งานใบหน้าก่อนกดไปขั้นถัดไป',
        ],
        sort_order: 4,
      },
    ],
  },
  {
    title: 'ขั้นตอนที่ 2: ตรวจสอบสคริปต์ & เกราะป้องกันนโยบาย (2. สคริปต์ 10s)',
    icon: '📝',
    description: 'ปรับแต่งบทพากย์ไทย 10 วินาทีและตรวจสอบคำเสี่ยงด้วย Safe Storyline Shield',
    sort_order: 2,
    style_variant: 'default',
    steps: [
      {
        step_number: 1,
        label: 'STEP 1',
        title: 'บทพูด 10 วินาทีถูกเตรียมไว้ให้ทันทีจากขั้นที่ 1',
        content:
          'ข้อมูลชุดที่สกัดได้จากหน้าแรกจะถูกนำมาร่างเป็น บทพากย์เต็ม 10 วินาที และแบ่งลง 5 จังหวะการเคลื่อนไหว (0–2s ถึง 8–10s) รอไว้ให้เลย',
        sub_items: [
          'หากต้องการเปลี่ยนอารมณ์การพูด เลือกโทนทั้ง 4 แบบ (เพื่อนสาวป้ายยา, แม่ค้าไลฟ์สดแจ้งไซส์, ลุคลูกคุณดูแพง, สายสตรีท) หรือกด [✨ ให้ AI สแกนทรงชุด & คิดบทป้ายยา] / [🎲 สุ่มโทนใหม่]',
        ],
        sort_order: 1,
      },
      {
        step_number: 2,
        label: 'STEP 2',
        title: 'ตรวจสอบคำเสี่ยง & เกราะป้องกันนโยบาย (Safe Storyline Shield)',
        content: 'ระบบช่วยตรวจจับคำโฆษณาเกินจริงและปรับสำนวนให้ปลอดภัยต่อนโยบายแพลตฟอร์ม',
        sub_items: [
          'Overclaim Guard: หากมีคำโฆษณาเกินจริง (เช่น "ไม่ยับ 100%", "ผอมทันที") จะมีแถบเตือนพร้อมปุ่มกดแก้คำเสี่ยงอัตโนมัติ',
          'Safe Storyline Shield: ปรับสำนวนคำสั่งภาษาอังกฤษไม่ให้ติดนโยบายบุคคลสำคัญ (prominent people) โดยคงเส้นเรื่อง ท่าโพส และบทพูดเดิมไว้ 100% (กด [✨ เกลาคำสั่งให้ปลอดภัย 100% (คงเส้นเรื่องเดิม)] หรือกดดูพรีวิว Prompt ด้านล่างได้)',
        ],
        sort_order: 2,
      },
      {
        step_number: 3,
        label: 'STEP 3',
        title: 'เช็กความยาวคำพูด',
        content:
          'ดูป้ายนับพยางค์มุมขวาบนของกล่องบทพากย์ แนะนำให้อยู่ที่ [30–38 พยางค์] เพื่อให้ AI พูดจบใน 10 วินาทีแบบไม่รัวลิ้น และกด [จัดวรรคคำอ่าน] เพื่อเว้นจังหวะหายใจได้',
        sub_items: [],
        sort_order: 3,
      },
    ],
  },
  {
    title: 'ขั้นตอนที่ 3: เสกภาพโปสเตอร์ 9:16 & วิดีโอรีวิว 10 วินาที (3. สตูดิโอเสก 9:16)',
    icon: '🪄',
    description: 'สร้างภาพโปสเตอร์ชุดคมชัด 8K และเรนเดอร์วิดีโอ 10 วินาทีพร้อมเช็ก Safe Zone TikTok',
    sort_order: 3,
    style_variant: 'highlight',
    steps: [
      {
        step_number: 1,
        label: 'STEP 1',
        title: 'เสกภาพโปสเตอร์ชุด 9:16 (ฝั่งซ้ายบน)',
        content:
          'เลือกโมเดลภาพ ([🍌 Nano Banana Pro] แนะนำสำหรับสีและเนื้อผ้าตรงปกที่สุด) แล้วกดปุ่ม [🪄 เสกภาพโปสเตอร์ชุด 9:16 ทันที] ภาพจะแสดงขึ้นมาในจอด้านขวาทันทีโดยไม่ต้องสลับแท็บ',
        sub_items: [
          'เลือกเปิด/ปิดสวิตช์ [🏷️ ป้ายสติกเกอร์ไซส์ / ดีเทลบนภาพ] (ค่าเริ่มต้นคือปิด = Clean 8K Lookbook ภาพคลีนไม่มีตัวหนังสือบังชุด)',
          'หากอยากเปลี่ยนมุมหรือท่าโพสใหม่ กดปุ่ม [🔄 สร้างรูปโปสเตอร์ 9:16 ใหม่ (สุ่มมุม/ท่าใหม่)] ได้เรื่อยๆ จนกว่าจะถูกใจ',
        ],
        sort_order: 1,
      },
      {
        step_number: 2,
        label: 'STEP 2',
        title: 'เสกวิดีโอนางแบบโชว์ชุด 10 วินาที (ฝั่งซ้ายล่าง)',
        content:
          'เมื่อได้ภาพโปสเตอร์ที่ถูกใจแล้ว เลือกความละเอียด [☀️ 720p (คมชัดสูง)] หรือ [⚡ 360p (เจนไว)] แล้วกดปุ่ม [🎬 เสกวิดีโอนางแบบโชว์ชุด 10s เลย]',
        sub_items: [
          'โมเดล Omni 1.1 Flash จะนำภาพโปสเตอร์ไปสร้างเป็นวิดีโอเคลื่อนไหวตาม 5 จังหวะและพูดบทพากย์ที่ตั้งไว้',
        ],
        sort_order: 2,
      },
      {
        step_number: 3,
        label: 'STEP 3',
        title: 'ตรวจสอบในจอพรีวิว 9:16 & ดาวน์โหลด (ฝั่งขวา)',
        content: 'สลับดูผลลัพธ์ได้ที่แท็บ [ภาพโปสเตอร์ 9:16] และ [วิดีโอ 10s]',
        sub_items: [
          'กดปุ่ม [👁️ Safe Zone TikTok] มุมขวาบนของพรีวิวเพื่อจำลองหน้าจอ TikTok Shop เช็กว่าปุ่มไลก์/แคปชัน/ตะกร้าสินค้าบังดีเทลชุดหรือไม่',
          'กดปุ่ม [ดาวน์โหลดโปสเตอร์ .JPG] หรือ [ดาวน์โหลดวิดีโอ .MP4] ลงเครื่องไปโพสต์ปักตะกร้าได้เลย',
        ],
        sort_order: 3,
      },
      {
        step_number: 4,
        label: 'STEP 4',
        title: 'ทำชุดถัดไป & ดูประวัติย้อนหลัง',
        content:
          'กดปุ่ม [👗 ไปต่อชุดใหม่ (กลับหน้าแรก)] ด้านล่างพรีวิว (หรือปุ่ม [+ ชุดใหม่] มุมขวาบน) เพื่อเริ่มเสื้อผ้าตัวต่อไป',
        sub_items: [
          'ชุดเดิมจะถูกบันทึกไว้ในปุ่ม [ประวัติชุด] มุมขวาบน (เก็บสูงสุด 5 ชุดล่าสุด กดเรียกดูหรือโหลดซ้ำได้ตลอด) และมีปุ่ม [↩️ เลิกทำ (Undo)] หากกดเริ่มชุดใหม่ผิดพลาด',
        ],
        sort_order: 4,
      },
    ],
  },
];

export const UGC_PRODUCT_GUIDE_SECTIONS = [
  {
    title: 'ขั้นที่ 1: เลือกสินค้า & นางแบบ (1. เลือกสินค้า & นางแบบ)',
    icon: '1️⃣',
    description: 'อัปโหลดรูปสินค้าต้นฉบับ (Strict Product Lock 100%) และเลือกคาแรกเตอร์พรีเซนเตอร์',
    sort_order: 1,
    style_variant: 'default',
    steps: [
      {
        step_number: 1,
        label: 'STEP 1',
        title: 'ใส่รูปสินค้าต้นฉบับ (1–3 รูป)',
        content:
          'กด [เลือกรูปจากมือถือ/คอม] (รองรับ .webp, .png, .jpg ระบบแปลงไฟล์ให้อัตโนมัติ) หรือ [เลือกจากคลัง Flow]',
        sub_items: [
          'ระบบจะล็อกหน้าตาสินค้าต้นฉบับ 100% (Strict Product Lock) ไม่ให้สีหรือทรงเพี้ยน',
          '(ทางลัดสำหรับมือใหม่) หากอยากลองเล่นทันทีโดยไม่ต้องหารูปเอง กดปุ่มสีชมพู-ส้ม [⚡ ลองเล่นตัวอย่างถังปั่นม็อบ คลิกเดียวครบ] ระบบจะโหลดรูปและบทพูดตัวอย่างให้ครบทันที',
        ],
        sort_order: 1,
      },
      {
        step_number: 2,
        label: 'STEP 2',
        title: 'กรอกชื่อสินค้า & จุดเด่นโปรโมชัน',
        content:
          'พิมพ์ชื่อสินค้าและโปรโมชันสั้นๆ เช่น "ชุดถังปั่นม็อบมินิมอล แถมผ้าม็อบ 2 ชิ้น" เพื่อให้ AI นำไปเขียนป้ายคำพูดและบทพากย์',
        sub_items: [],
        sort_order: 2,
      },
      {
        step_number: 3,
        label: 'STEP 3',
        title: 'เลือกคาแรกเตอร์พรีเซนเตอร์ (8 สไตล์)',
        content:
          'จิ้มเลือกสไตล์นางแบบ/นายแบบที่เข้ากับสินค้า เช่น สาวแว่นมินิมอลเกาหลี (Milin Style), สาวบิวตี้ลูกคุณผิวโกลว์, วัยรุ่นสดใสสาย TikToker, โชว์สินค้า + มือสาธิต (ไม่เห็นหน้า)',
        sub_items: [
          'หรือเลือกการ์ดใบที่ 8 [📸 ใช้รูปหน้าของคุณเอง] เพื่ออัปโหลดรูปหน้าจริงของคุณ',
        ],
        sort_order: 3,
      },
      {
        step_number: 4,
        label: 'STEP 4',
        title: 'ไปขั้นถัดไป',
        content: 'กดปุ่ม [ไปขั้นถัดไป: เสกคำป้ายยา 10 วิ ✨ ->]',
        sub_items: [],
        sort_order: 4,
      },
    ],
  },
  {
    title: 'ขั้นที่ 2: แต่งคำป้ายยา & บทพากย์ 10 วินาที (2. คำป้ายยา 10 วิ)',
    icon: '2️⃣',
    description: 'ให้ AI สแกนรูปสินค้าแต่งคำป้ายยา 5 จังหวะพร้อมบทพูดภาษาไทย 10 วินาที',
    sort_order: 2,
    style_variant: 'default',
    steps: [
      {
        step_number: 1,
        label: 'STEP 1',
        title: 'ให้ AI ช่วยคิดบทอัตโนมัติ (หรือสุ่มสไตล์ใหม่)',
        content:
          'กดปุ่ม [✨ ให้ AI สแกนรูปสินค้า & คิดคำป้ายยา] เพื่อให้ AI วิเคราะห์รูปสินค้าแล้วแต่งคำป้ายยา 5 จังหวะพร้อมบทพูดภาษาไทยให้ทันที',
        sub_items: [
          'หรือกดปุ่ม [🎲 สุ่มสไตล์คำป้ายยาใหม่] เพื่อสลับโทนการขาย (สไตล์เพื่อนบอกต่อ, เน้นโปรของแถม, แก้ปัญหาชีวิต, มินิมอลป้ายยานุ่มๆ)',
        ],
        sort_order: 1,
      },
      {
        step_number: 2,
        label: 'STEP 2',
        title: 'ปรับแก้ 5 จังหวะป้ายยา (0–2s ถึง 8–10s)',
        content:
          'แก้ไขข้อความสั้นๆ ในทั้ง 5 ช่องตามต้องการ ข้อความเหล่านี้จะถูกนำไปทำเป็นป้ายสติกเกอร์พาสเทลบนภาพและเป็นจังหวะท่าทางในวิดีโอ',
        sub_items: [],
        sort_order: 2,
      },
      {
        step_number: 3,
        label: 'STEP 3',
        title: 'เช็กบทพูดพากย์ไทย 10 วินาที',
        content:
          'ดูป้ายตัวนับจำนวนพยางค์มุมขวาบนของกล่องบทพูด (เป้าหมายที่พูดจบพอดีใน 10 วินาทีคือประมาณ 30–38 พยางค์)',
        sub_items: [
          'กดปุ่มเล็กๆ [จัดวรรคคำอ่านกันเพี้ยน] ด้านล่างกล่องข้อความ เพื่อให้ระบบเคาะจังหวะเว้นวรรคคำภาษาไทยให้ AI ออกเสียงชัดขึ้น',
        ],
        sort_order: 3,
      },
      {
        step_number: 4,
        label: 'STEP 4',
        title: 'ไปขั้นถัดไป',
        content: 'กดปุ่ม [ไปขั้นถัดไป: เสกภาพ & วิดีโอ 🎬 ->]',
        sub_items: [],
        sort_order: 4,
      },
    ],
  },
  {
    title: 'ขั้นที่ 3: เสกภาพโปสเตอร์ & วิดีโอรีวิว 9:16 (3. เสกภาพ & คลิป 9:16)',
    icon: '3️⃣',
    description: 'สร้างภาพโปสเตอร์ 9:16 เป็น First Frame และเสกวิดีโอรีวิว 10 วินาทีด้วย Omni 1.1 Flash',
    sort_order: 3,
    style_variant: 'highlight',
    steps: [
      {
        step_number: 1,
        label: 'STEP 3.1',
        title: 'สร้างภาพโปสเตอร์ 9:16 (ใช้เป็นภาพเปิดคลิป First Frame)',
        content:
          'เลือกรุ่นโมเดลสร้างภาพ แล้วกดปุ่มสีชมพู [🪄 เสกภาพโปสเตอร์ 9:16 (Generate Image)] ระบบจะแสดงรูปโปสเตอร์ 9:16 ขึ้นมาในกรอบฝั่งขวาทันที',
        sub_items: [
          '[🍌 Nano Banana Pro] (แนะนำ): คมชัดสูงสุด รายละเอียดสินค้าและตัวหนังสือเป๊ะที่สุด | [🍌 Nano Banana 2.1]: ภาพสวยสมดุล แสงธรรมชาติละมุน | [🍌 Nano Banana 2 Lite]: เจนด่วนทันใจ ประหยัดเวลา',
          'กดปุ่ม [👁️ Safe Zone TikTok] มุมขวาบนของกรอบภาพ เพื่อเช็กว่าป้ายข้อความโดนปุ่มหัวใจ/คอมเมนต์ หรือตะกร้าเหลืองของ TikTok/Reels บังหรือไม่',
          'ถ้ายังไม่ถูกใจรูป: กดปุ่ม [🔄 สร้างรูปโปสเตอร์ 9:16 ใหม่ (สุ่มมุม/ท่าทางใหม่)] ด้านซ้าย หรือปุ่ม [🔄 สร้างรูปใหม่] ใต้ภาพเพื่อสุ่มใหม่ได้ทันที',
        ],
        sort_order: 1,
      },
      {
        step_number: 2,
        label: 'STEP 3.2',
        title: 'เสกวิดีโอรีวิว 10 วินาที (Omni 1.1 Flash)',
        content:
          'เลือกความละเอียด [☀️ 720p (คมชัดสูง)] สำหรับนำไปโพสต์จริง หรือ [⚡ 360p (เจนไว)] สำหรับทดสอบจังหวะ แล้วกดปุ่ม [🎬 เสกวิดีโอ 10s (Omni 1.1 Flash • 720p)]',
        sub_items: [
          'ระบบจะสลับหน้าจอพรีวิวมาที่แท็บ [วิดีโอ 10s] อัตโนมัติและเล่นคลิปพร้อมเสียงพากย์ไทยทันทีที่เรนเดอร์เสร็จ',
          'กดปุ่มสีเขียว [⬇️ ดาวน์โหลด] มุมขวาบนของกรอบพรีวิวเพื่อบันทึกไฟล์ .mp4 หรือ .png ลงเครื่อง',
        ],
        sort_order: 2,
      },
    ],
  },
  {
    title: 'ขั้นที่ 4: เริ่มทำสินค้าชิ้นต่อไปแบบคลีนๆ',
    icon: '🔄',
    description: 'ล้างข้อมูลสินค้าเดิมเพื่อเริ่มทำคลิปปักตะกร้าสินค้าชิ้นต่อไปได้ทันที',
    sort_order: 4,
    style_variant: 'tip',
    steps: [
      {
        step_number: 1,
        label: 'STEP 1',
        title: 'กดปุ่มเริ่มสินค้าใหม่',
        content:
          'เมื่อได้คลิปครบแล้วและต้องการทำสินค้าตัวใหม่ ให้กดปุ่ม [🛍️ เริ่มสินค้าใหม่] บนแถบด้านบนสุด หรือปุ่ม [🛍️ ไปต่อสินค้าชิ้นใหม่ (กลับหน้าแรกแบบคลีนๆ)] ด้านล่างของขั้นที่ 3',
        sub_items: [
          'ระบบจะล้างรูปและข้อความของสินค้าเดิมออกทั้งหมด แล้วพากลับไปเริ่มที่ ขั้นที่ 1 แบบสะอาดพร้อมรับสินค้าชิ้นต่อไปทันทีครับ',
        ],
        sort_order: 1,
      },
    ],
  },
];

async function upsertGuideForTool(tool) {
  const { data: existingSections } = await supabase
    .from('guide_sections')
    .select('id')
    .eq('tool_id', tool.id);

  if (existingSections && existingSections.length > 0) {
    const oldIds = existingSections.map((s) => s.id);
    await supabase.from('guide_steps').delete().in('section_id', oldIds);
    await supabase.from('guide_sections').delete().in('id', oldIds);
  }

  const isFashion = tool.slug === 'puppap-fashion-studio';
  const sectionsSpec = isFashion ? FASHION_GUIDE_SECTIONS : UGC_PRODUCT_GUIDE_SECTIONS;

  for (const secSpec of sectionsSpec) {
    const { data: section, error: secErr } = await supabase
      .from('guide_sections')
      .insert({
        tool_id: tool.id,
        title: secSpec.title,
        icon: secSpec.icon,
        description: secSpec.description,
        sort_order: secSpec.sort_order,
        style_variant: secSpec.style_variant,
      })
      .select('id')
      .single();

    if (secErr || !section) {
      console.warn(`[Guide] Failed to create section for ${tool.slug}:`, secErr?.message);
      continue;
    }

    const stepsPayload = secSpec.steps.map((st) => ({
      section_id: section.id,
      step_number: st.step_number,
      label: st.label,
      title: st.title,
      content: st.content,
      sub_items: st.sub_items,
      sort_order: st.sort_order,
    }));

    const { error: stepsErr } = await supabase.from('guide_steps').insert(stepsPayload);
    if (stepsErr) {
      console.warn(`[Guide] Failed to insert steps for ${tool.slug}:`, stepsErr.message);
    }
  }
  console.log(`[Guide] Upserted ${sectionsSpec.length} guide sections for ${tool.slug}`);
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

  const linkLessonSlugs = (lessonList) =>
    lessonList.map((lesson, idx) => {
      const lessonNum = Number(lesson?.id) || idx + 1;
      if (lessonNum === 14 || lesson?.id === 'lesson-14') {
        return { ...lesson, flow_tool_slug: 'puppap-ugc-product' };
      }
      if (lessonNum === 22 || lesson?.id === 'lesson-22') {
        return { ...lesson, flow_tool_slug: 'puppap-fashion-studio' };
      }
      return lesson;
    });

  if (Array.isArray(courseFeatures.lessons)) {
    courseFeatures.lessons = linkLessonSlugs(courseFeatures.lessons);
  }
  if (Array.isArray(courseFeatures.course_lessons)) {
    courseFeatures.course_lessons = linkLessonSlugs(courseFeatures.course_lessons);
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

const isCli =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isCli) {
  if (!supabase) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  main().catch((err) => {
    console.error('Backfill failed:', err);
    process.exit(1);
  });
}
