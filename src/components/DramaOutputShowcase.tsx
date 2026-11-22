'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

const STORAGE_ROOT =
  'https://guhdweujxgsbflkvgryb.supabase.co/storage/v1/object/public/tool-images';

export type ShowcaseToolSlug =
  | 'puppap-drama'
  | 'puppap-talking-3d'
  | 'puppap-renovate'
  | 'puppap-ugc-product';

export interface DramaShowcaseItem {
  id: number;
  key: string;
  title: string;
  genreBadge: string;
  genreTitle: string;
  durationLabel: string;
  isHighlight?: boolean;
  videoUrl: string;
  posterUrl: string;
  beforePosterUrl?: string;
  afterPosterUrl?: string;
  drivePreviewUrl: string;
  synopsis: string;
  cameraNote: string;
  voiceNote: string;
  accentClass: string;
}

export const DRAMA_SHOWCASE_ITEMS: DramaShowcaseItem[] = [
  {
    id: 1,
    key: 'billionaire-revenge',
    title: 'เงาแค้นทายาทหมื่นล้าน',
    genreBadge: '💎 ไฮโซแก้แค้น',
    genreTitle: 'ดราม่าตระกูลไฮโซ / ทายาทหมื่นล้าน (CEO Revenge Drama)',
    durationLabel: '32 วิ • 4 ช็อต',
    isHighlight: true,
    videoUrl: `${STORAGE_ROOT}/drama-showcase/billionaire-revenge.mp4`,
    posterUrl: `${STORAGE_ROOT}/drama-showcase/billionaire-revenge-poster.jpg`,
    drivePreviewUrl: 'https://drive.google.com/file/d/1gORGi6jmtkFxP0TNzjT8_J4viFGWCvmO/preview',
    synopsis:
      'ฉากปะทะอารมณ์ในห้องทำงานตึกสูงยามค่ำคืน สลับมุมกล้องพระเอก-นางเอก 4 ช็อตต่อเนื่องโดยใบหน้าและชุดตรงกัน 100%',
    cameraNote: 'ARRI Alexa 85mm Anamorphic • สลับมุม Over-the-Shoulder & Extreme Close-Up',
    voiceNote: 'พากย์ไทยโทนเข้มข้นเชือดเฉือน + ลิปซิงค์ตรงจังหวะคำพูด',
    accentClass: 'from-amber-500 to-yellow-600 text-stone-950',
  },
  {
    id: 2,
    key: 'undercover-ceo',
    title: 'ประธานบริษัทปลอมตัวเป็น รปภ.',
    genreBadge: '👔 ละครคุณธรรม',
    genreTitle: 'ละครคุณธรรมสะท้อนสังคม (Undercover Boss Viral)',
    durationLabel: '10 วิ • Master',
    videoUrl: `${STORAGE_ROOT}/drama-showcase/undercover-ceo.mp4`,
    posterUrl: `${STORAGE_ROOT}/drama-showcase/undercover-ceo-poster.jpg`,
    drivePreviewUrl: 'https://drive.google.com/file/d/15YhMBan1BXWBUFqs4Ycnuzt9vSypw-jY/preview',
    synopsis:
      'พล็อตยอดฮิตติดเทรนด์ TikTok ประธานบริษัทปลอมตัวมาทดสอบจิตใจคน โทนภาพคมชัดสมจริงระดับละครทีวี',
    cameraNote: 'Medium Two-Shot 50mm • แสงธรรมชาติสมจริงระดับ DSLR',
    voiceNote: 'เสียงพากย์ไทยโทนสุขุม นุ่มลึก มีพลังสะกดคนดูตั้งแต่ 3 วินาทีแรก',
    accentClass: 'from-sky-500 to-blue-600 text-white',
  },
  {
    id: 3,
    key: 'wuxia-demon-lord',
    title: 'คมกระบี่ซ่อนรักประมุขมาร',
    genreBadge: '⚔️ จีนกำลังภายใน',
    genreTitle: 'ซีรีส์จีนกำลังภายใน / เทพเซียน (Wuxia & Xianxia)',
    durationLabel: '10 วิ • Master',
    videoUrl: `${STORAGE_ROOT}/drama-showcase/wuxia-demon-lord.mp4`,
    posterUrl: `${STORAGE_ROOT}/drama-showcase/wuxia-demon-lord-poster.jpg`,
    drivePreviewUrl: 'https://drive.google.com/file/d/1egrL2CW1oBvD-jReSbHrhDV8JIgkcn8z/preview',
    synopsis:
      'คอสตูมจอมยุทธ์และประมุขมารสุดอลังการ เอฟเฟกต์สายลมและอารมณ์สายตาคมกริบเหมือนซีรีส์จีนฟอร์มยักษ์',
    cameraNote: 'Cinematic Low-Angle + Slow Push-In • โทนสีหม่นขรึมทรงพลัง',
    voiceNote: 'พากย์ไทยสไตล์ซีรีส์จีนยุทธภพ อารมณ์ดราม่าเข้มข้น',
    accentClass: 'from-rose-600 to-red-700 text-white',
  },
  {
    id: 4,
    key: 'joseon-crown-prince',
    title: 'อ้อมกอดซ่อนรักรัชทายาทโชซอน',
    genreBadge: '👑 พีเรียดเกาหลี',
    genreTitle: 'ซีรีส์พีเรียดเกาหลี โชซอน (K-Drama Royal Romance)',
    durationLabel: '10 วิ • Master',
    videoUrl: `${STORAGE_ROOT}/drama-showcase/joseon-crown-prince.mp4`,
    posterUrl: `${STORAGE_ROOT}/drama-showcase/joseon-crown-prince-poster.jpg`,
    drivePreviewUrl: 'https://drive.google.com/file/d/1GmArz01dRXzYxQ3lymAFKhnmUX3o3uEF/preview',
    synopsis:
      'ฉากโรแมนติกในวังหลวงยุคโชซอน ชุดฮันบกประณีต แสงไฟตะเกียงอบอุ่นละมุนตาตามแบบฉบับ K-Drama',
    cameraNote: 'Soft Golden Hour Rim Light • Shallow Depth of Field หน้าชัดหลังละลาย',
    voiceNote: 'พากย์ไทยโทนอบอุ่นโรแมนติก ถ่ายทอดอารมณ์รักต้องห้าม',
    accentClass: 'from-purple-500 to-indigo-600 text-white',
  },
  {
    id: 5,
    key: 'campus-gear-love',
    title: 'เกียร์นี้มีไว้ล็อกนายตัวแสบ (EP.3)',
    genreBadge: '⚙️ วัยรุ่นวิศวะ',
    genreTitle: 'ซีรีส์วัยรุ่น / คณะวิศวะ (Campus & Youth Series)',
    durationLabel: '10 วิ • EP.3',
    videoUrl: `${STORAGE_ROOT}/drama-showcase/campus-gear-love.mp4`,
    posterUrl: `${STORAGE_ROOT}/drama-showcase/campus-gear-love-poster.jpg`,
    drivePreviewUrl: 'https://drive.google.com/file/d/1cjo_p8i66FpO2eE-Rf-vuHKUMaKWd9U3/preview',
    synopsis:
      'ซีรีส์วัยมหาลัยเสื้อช็อปวิศวะขวัญใจวัยรุ่น สีสันสดใส ท่าทางและสีหน้าตัวละครมีชีวิตชีวาเป็นธรรมชาติ',
    cameraNote: 'Handheld Dynamic Framing • โทนสีสดใสสไตล์ซีรีส์วัยรุ่นไทย',
    voiceNote: 'เสียงพูดไทยวัยรุ่นเป็นธรรมชาติ จังหวะปะทะคารมสนุกน่าติดตาม',
    accentClass: 'from-pink-500 to-rose-500 text-white',
  },
  {
    id: 6,
    key: 'isan-country-love',
    title: 'มนต์ฮักเถียงนาน้อย',
    genreBadge: '🌾 ลูกทุ่งไทบ้าน',
    genreTitle: 'ละครลูกทุ่งอีสานโรแมนติก (Isan Country Romance)',
    durationLabel: '10 วิ • Master',
    videoUrl: `${STORAGE_ROOT}/drama-showcase/isan-country-love.mp4`,
    posterUrl: `${STORAGE_ROOT}/drama-showcase/isan-country-love-poster.jpg`,
    drivePreviewUrl: 'https://drive.google.com/file/d/1gwbEmGgIUEwPL7ICdp3tvzeZHHKe1zZ7/preview',
    synopsis:
      'บรรยากาศท้องทุ่งนาและเถียงนาน้อยยามเย็นสมจริง ถ่ายทอดวิถีชีวิตและความรักบ้านนาที่เข้าถึงผู้ชมทั่วประเทศ',
    cameraNote: 'Warm Sunset Backlight • องค์ประกอบภาพทุ่งนาไทยสมจริง',
    voiceNote: 'โทนเสียงอบอุ่นจริงใจ เข้ากับบรรยากาศละครลูกทุ่งไทบ้าน',
    accentClass: 'from-emerald-500 to-green-600 text-white',
  },
  {
    id: 7,
    key: 'room-404-horror',
    title: 'ห้อง 404 ห้ามทักยามวิกาล',
    genreBadge: '👻 สยองขวัญ',
    genreTitle: 'ซีรีส์ผี / หอพักอาถรรพ์ (Urban Horror Mystery)',
    durationLabel: '10 วิ • Master',
    videoUrl: `${STORAGE_ROOT}/drama-showcase/room-404-horror.mp4`,
    posterUrl: `${STORAGE_ROOT}/drama-showcase/room-404-horror-poster.jpg`,
    drivePreviewUrl: 'https://drive.google.com/file/d/1EgOTyX3W1rBLwZi8e1LorbWGeWDk9svX/preview',
    synopsis:
      'บรรยากาศโถงทางเดินหอพักยามวิกาลสุดหลอน แสงไฟนีออนกระพริบและจังหวะสะดุ้งที่ดึงคนดูไม่ให้เลื่อนผ่าน',
    cameraNote: 'Low-Key Horror Lighting • Chiaroscuro Contrast เงาลึกชวนขนลุก',
    voiceNote: 'เสียงกระซิบและซาวด์บรรยากาศหลอนสมจริงระดับภาพยนตร์ผี',
    accentClass: 'from-slate-700 to-zinc-900 text-amber-300',
  },
  {
    id: 8,
    key: 'zombie-711-thriller',
    title: 'คืนคลั่งเซเว่นปิดตาย',
    genreBadge: '🧟 ซอมบี้ระทึกขวัญ',
    genreTitle: 'ระทึกขวัญ / เอาชีวิตรอด (Survival Action Thriller)',
    durationLabel: '10 วิ • Master',
    videoUrl: `${STORAGE_ROOT}/drama-showcase/zombie-711-thriller.mp4`,
    posterUrl: `${STORAGE_ROOT}/drama-showcase/zombie-711-thriller-poster.jpg`,
    drivePreviewUrl: 'https://drive.google.com/file/d/1XZxKBbqUEvGh0qydKghcU2Z0klS3ZiQk/preview',
    synopsis:
      'ฉากหนีตายระทึกขวัญในร้านสะดวกซื้อยามค่ำคืน มุมกล้องแอ็กชันสั่นไหวสมจริงเหมือนหนังเอาชีวิตรอดเกาหลี',
    cameraNote: 'Action Tracking Shot • แสงไฟนีออนตัดเงามืดสร้างความกดดันสูงสุด',
    voiceNote: 'เสียงหอบหายใจและอารมณ์ตื่นตระหนกสมจริง ดึงยอดวิวสายหนังแอ็กชัน',
    accentClass: 'from-orange-600 to-red-600 text-white',
  },
];

export const TALKING_3D_SHOWCASE_ITEMS: DramaShowcaseItem[] = [
  {
    id: 1,
    key: 'vitamin-c-serum',
    title: 'ขวดเซรั่มวิตซีขี้โมโห ป้ายยากู้ผิวใส',
    genreBadge: '🧴 สกินแคร์พูดได้',
    genreTitle: 'สกินแคร์ & เซรั่ม 3D มีชีวิต (3D Pixar Skincare Mascot)',
    durationLabel: '16 วิ • 2 ช็อต',
    isHighlight: true,
    videoUrl: `${STORAGE_ROOT}/talking-3d-showcase/vitamin-c-serum.mp4`,
    posterUrl: `${STORAGE_ROOT}/talking-3d-showcase/vitamin-c-serum-poster.jpg`,
    drivePreviewUrl: 'https://drive.google.com/file/d/1NNcR1Mtv-rauHJIAG9s_CapSQ9URigfu/preview',
    synopsis:
      'เปลี่ยนขวดเซรั่มวิตามินซีให้มีหน้าตา แขนขา และอารมณ์ขี้โมโหสุดฮา ถือตะกร้าเหลืองป้ายยาไล่ความหมองคล้ำจนคนดูหยุดดูจนจบ!',
    cameraNote: '3D Pixar Studio Lighting • วัสดุขวดแก้วสีชาสะท้อนแสงสมจริง',
    voiceNote: 'พากย์ไทยคาแรกเตอร์ดุดันกวนๆ ลิปซิงค์ปากขยับตรงคำพูดป้ายยา',
    accentClass: 'from-amber-500 to-orange-600 text-stone-950',
  },
  {
    id: 2,
    key: 'queen-tomato',
    title: 'น้องมะเขือเทศราชินี 3D ผิวฉ่ำน้ำ',
    genreBadge: '🍅 อาหารเสริมผิวใส',
    genreTitle: 'ผลไม้ & วิตามิน 3D พูดได้ (3D Fruit & Supplement Idol)',
    durationLabel: '16 วิ • 2 ช็อต',
    isHighlight: true,
    videoUrl: `${STORAGE_ROOT}/talking-3d-showcase/queen-tomato.mp4`,
    posterUrl: `${STORAGE_ROOT}/talking-3d-showcase/queen-tomato-poster.jpg`,
    drivePreviewUrl: 'https://drive.google.com/file/d/1l9cjU6PXGUEIefO_tOafVB_1NfHd7Oun/preview',
    synopsis:
      'น้องมะเขือเทศราชินีสวมมงกุฎถือไมค์ทองคำบนเวทีไฟสปอตไลต์ ผิวมะเขือเทศมีหยดน้ำเกาะฉ่ำวาว โชว์จุดเด่นไลโคปีนผิวออร่า',
    cameraNote: 'Stage Spotlight Bokeh + Subsurface Scattering ผิวฉ่ำน้ำระดับอนิเมชัน',
    voiceNote: 'เสียงพากย์ไทยสดใสร่าเริง ชวนสาวๆ กดตะกร้าดูแลผิว',
    accentClass: 'from-rose-500 to-red-600 text-white',
  },
  {
    id: 3,
    key: 'marble-pan',
    title: 'พี่กระทะหินอ่อนจอมพลัง ทอดลื่นไม่ติดกระทะ',
    genreBadge: '🍳 เครื่องครัวพูดได้',
    genreTitle: 'ของใช้ในบ้าน & เครื่องครัว 3D (3D Kitchen Appliance Seller)',
    durationLabel: '10 วิ • Master',
    videoUrl: `${STORAGE_ROOT}/talking-3d-showcase/marble-pan.mp4`,
    posterUrl: `${STORAGE_ROOT}/talking-3d-showcase/marble-pan-poster.jpg`,
    drivePreviewUrl: 'https://drive.google.com/file/d/1X1wo0b6vv5o3ddf_71vZRg5rKXLdBP_r/preview',
    synopsis:
      'พี่กระทะเคลือบหินอ่อนมีควันหอมฉุย ถือตะกร้าโปรโมชันยืนคู่กับกล่องสินค้าจริง ป้ายยาแม่บ้านยุคใหม่ให้กดสั่งซื้อทันที',
    cameraNote: 'Warm Kitchen Depth-of-Field • พื้นผิวเคลือบหินอ่อนและไอน้ำสมจริง',
    voiceNote: 'เสียงพากย์ไทยโทนพี่ชายใจดีน่าเชื่อถือ ขายเก่งเหมือนเซลส์มืออาชีพ',
    accentClass: 'from-emerald-500 to-teal-600 text-white',
  },
  {
    id: 4,
    key: 'arabica-coffee',
    title: 'คุณหมอเมล็ดกาแฟดำอาราบิก้า ปลุกสมองตื่นตัว',
    genreBadge: '☕ กาแฟ & สุขภาพ',
    genreTitle: 'เครื่องดื่ม & กาแฟลดหุ่น 3D (3D Coffee Bean Doctor)',
    durationLabel: '16 วิ • 2 ช็อต',
    isHighlight: true,
    videoUrl: `${STORAGE_ROOT}/talking-3d-showcase/arabica-coffee.mp4`,
    posterUrl: `${STORAGE_ROOT}/talking-3d-showcase/arabica-coffee-poster.jpg`,
    drivePreviewUrl: 'https://drive.google.com/file/d/1hiH5prv3jLCy9sMAbh8pXwwb3H7d6tPW/preview',
    synopsis:
      'เมล็ดกาแฟคั่วเข้มสวมแว่นและหูฟังคุณหมอ ถือชาร์ตตรวจสุขภาพยืนหน้าบาร์กาแฟสดพร้อมถุงสินค้า ARABICA BLACK COFFEE ด้านหลัง',
    cameraNote: 'Cafe Barista Warm Lighting • รายละเอียดผิวเมล็ดกาแฟคั่วคมชัดระดับ 4K',
    voiceNote: 'พากย์ไทยโทนผู้เชี่ยวชาญให้ความรู้สุขภาพ + ปิดการขายหน้าตะกร้า',
    accentClass: 'from-amber-700 to-yellow-900 text-amber-200',
  },
];

export const RENOVATE_SHOWCASE_ITEMS: DramaShowcaseItem[] = [
  {
    id: 1,
    key: 'cat-crew-penthouse',
    title: 'แก๊งช่างเหมียวเนรมิตห้องรับแขกร้างเป็นเพนต์เฮาส์หรู',
    genreBadge: '🐱 ช่างเหมียวรีโนเวท',
    genreTitle: 'ไวรัลช่างแมวส้มรีโนเวทห้องร้าง ➔ ห้องนั่งเล่นหินอ่อนหรู',
    durationLabel: '24 วิ • 3 ช็อตเต็ม',
    isHighlight: true,
    videoUrl: `${STORAGE_ROOT}/renovate-showcase/cat-crew-penthouse.mp4`,
    posterUrl: `${STORAGE_ROOT}/renovate-showcase/cat-crew-penthouse-after.jpg`,
    beforePosterUrl: `${STORAGE_ROOT}/renovate-showcase/cat-crew-penthouse-before.jpg`,
    afterPosterUrl: `${STORAGE_ROOT}/renovate-showcase/cat-crew-penthouse-after.jpg`,
    drivePreviewUrl: 'https://drive.google.com/file/d/1iZ-JwCLWYFT5JiwF8pf5pwkXJ5p2aty8/preview',
    synopsis:
      'ล็อกโครงสร้างห้องและตำแหน่งหน้าต่างเดิม 100%! เริ่มจากช่างเหมียวสวมหมวกนิรภัยเข้าเคลียร์ห้องร้าง ฉาบผนัง ปูพื้นหินอ่อน จนเสร็จเป็นห้องรับแขกสุดหรู',
    cameraNote: 'Fixed Architectural Tripod Lock • โครงสร้างห้องตรงกันทุกเฟรมตั้งแต่ต้นจนจบ',
    voiceNote: 'ซาวด์เอฟเฟกต์ก่อสร้าง ASMR สมจริง + จังหวะเปิดตัวห้องใหม่สุดอลังการ',
    accentClass: 'from-amber-500 to-yellow-600 text-stone-950',
  },
  {
    id: 2,
    key: 'luxury-marble-hall',
    title: 'พลิกโฉมห้องนอนร้างเป็นห้องรับแขกหินอ่อนแชนเดอเลียร์ 5 ดาว',
    genreBadge: '🏛️ คฤหาสน์หินอ่อน',
    genreTitle: 'รีโนเวท 4 ขั้นตอน: ห้องร้าง ➔ ทุบรื้อ ➔ ก่อฉาบ ➔ คฤหาสน์หรู',
    durationLabel: '32 วิ • 4 ช็อตเต็ม',
    isHighlight: true,
    videoUrl: `${STORAGE_ROOT}/renovate-showcase/luxury-marble-hall.mp4`,
    posterUrl: `${STORAGE_ROOT}/renovate-showcase/luxury-marble-hall-after.jpg`,
    beforePosterUrl: `${STORAGE_ROOT}/renovate-showcase/luxury-marble-hall-before.jpg`,
    afterPosterUrl: `${STORAGE_ROOT}/renovate-showcase/luxury-marble-hall-after.jpg`,
    drivePreviewUrl: 'https://drive.google.com/file/d/1fkhYeGU8d4yNYtxBmfBX1BFwJuz6or8x/preview',
    synopsis:
      'โชว์ขั้นตอนการรีโนเวทครบ 4 เฟสต่อเนื่อง 32 วินาที จากห้องนอนร้างเตียงเหล็กสนิมเขรอะ กลายเป็นโถงรับแขกหินอ่อนโคมไฟคริสตัลแชนเดอเลียร์ระดับโรงแรม 5 ดาว',
    cameraNote: '4-Phase Time-Lapse Continuity • แสง Warm Indirect LED ฝ้าหลุมสมจริง',
    voiceNote: 'เสียงทุบผนัง เคลียร์พื้นที่ และซาวด์ประกอบการเปลี่ยนโฉมสุดสะใจคนดู',
    accentClass: 'from-sky-500 to-indigo-600 text-white',
  },
  {
    id: 3,
    key: 'tropical-spa-bath',
    title: 'รีโนเวทห้องน้ำเก่าสนิมเขรอะเป็นสปาธรรมชาติ Tropical Luxury',
    genreBadge: '🌿 ห้องน้ำสปาหรู',
    genreTitle: 'รีโนเวท 4 ขั้นตอน: ห้องน้ำเก่า ➔ รื้อกระเบื้อง ➔ สปาวิวสวนทรอปิคอล',
    durationLabel: '32 วิ • 4 ช็อตเต็ม',
    isHighlight: true,
    videoUrl: `${STORAGE_ROOT}/renovate-showcase/tropical-spa-bath.mp4`,
    posterUrl: `${STORAGE_ROOT}/renovate-showcase/tropical-spa-bath-after.jpg`,
    beforePosterUrl: `${STORAGE_ROOT}/renovate-showcase/tropical-spa-bath-before.jpg`,
    afterPosterUrl: `${STORAGE_ROOT}/renovate-showcase/tropical-spa-bath-after.jpg`,
    drivePreviewUrl: 'https://drive.google.com/file/d/1UGQWaHvBTAk5l1-b4es7p5YIp219fCVv/preview',
    synopsis:
      'ทีมช่างหนุ่มสาวเข้าทุบรื้อห้องน้ำเก่าสีหลุดลอก ปูกระเบื้องหินชนวนสีเข้ม ติดตั้งอ่างอาบน้ำและกระจกไฟวงกลม LED พร้อมหน้าต่างบานใหญ่เปิดรับวิวสวนสีเขียวชอุ่ม',
    cameraNote: 'Architectural Interior Lens • แสงธรรมชาติส่องผ่านแมกไม้ผสานไฟสปาอบอุ่น',
    voiceNote: 'ซาวด์ ASMR รื้อถอนและตกแต่งภายใน ดึงดูดยอดวิวสายแต่งบ้านหลักล้านวิว',
    accentClass: 'from-emerald-500 to-green-700 text-white',
  },
];

export const UGC_PRODUCT_SHOWCASE_ITEMS: DramaShowcaseItem[] = [
  {
    id: 1,
    key: 'minimal-spin-mop',
    title: 'รีวิวถังปั่นม็อบมินิมอล ปั่นแห้งง่ายไม่เลอะมือ',
    genreBadge: '🧹 ของใช้ในบ้าน',
    genreTitle: 'รีวิวของใช้ในบ้าน & แม่บ้านยุคใหม่ (Home & Living UGC)',
    durationLabel: '10 วิ • Master',
    isHighlight: true,
    videoUrl: `${STORAGE_ROOT}/ugc-product-showcase/minimal-spin-mop.mp4`,
    posterUrl: `${STORAGE_ROOT}/ugc-product-showcase/minimal-spin-mop-poster.jpg`,
    drivePreviewUrl: 'https://drive.google.com/file/d/19XeU1QRovhhajXfz1xK_d8dQLyvPwsFh/preview',
    synopsis:
      'พรีเซนเตอร์สาวแว่นสไตล์มินิมอลสาธิตการใช้งานถังปั่นม็อบจริง พร้อมข้อความกราฟิกภาษาไทยชี้จุดเด่น “แถมผ้าม็อบ 2 ชิ้น • ปั่นแห้งง่ายไม่เลอะมือ • เบาแรงถูสะอาดมาก”',
    cameraNote: 'Warm Minimal Home Studio • มุมกล้องสาธิตสินค้าเห็นฟังก์ชันชัดเจน',
    voiceNote: 'เสียงพูดรีวิวไทยเป็นธรรมชาติ ป้ายยาเหมือนครีเอเตอร์รีวิวเองหน้ากล้อง',
    accentClass: 'from-amber-500 to-orange-600 text-stone-950',
  },
  {
    id: 2,
    key: 'luxury-square-watch',
    title: 'รีวิวนาฬิกาข้อมือทรงสี่เหลี่ยมเรียบหรู สไตล์คาเฟ่',
    genreBadge: '⌚ แฟชั่น & นาฬิกา',
    genreTitle: 'รีวิวเครื่องประดับ & นาฬิกาข้อมือ (Fashion & Accessories UGC)',
    durationLabel: '10 วิ • Master',
    isHighlight: true,
    videoUrl: `${STORAGE_ROOT}/ugc-product-showcase/luxury-square-watch.mp4`,
    posterUrl: `${STORAGE_ROOT}/ugc-product-showcase/luxury-square-watch-poster.jpg`,
    drivePreviewUrl: 'https://drive.google.com/file/d/1_KGmJ35saHNaPhETiOpGGfPn-x0TKkLh/preview',
    synopsis:
      'ซูมโชว์ดีเทลนาฬิกาข้อมือสายหนังทรงสี่เหลี่ยมเรียบหรูบนข้อมือนางแบบในคาเฟ่โทนอบอุ่น พร้อมข้อความกราฟิกภาษาไทย “✨ ทรงสี่เหลี่ยมเรียบหรู!”',
    cameraNote: 'Macro Product Close-Up • แสงธรรมชาติคาเฟ่ละมุนขับผิวและตัวเรือนนาฬิกา',
    voiceNote: 'โทนเสียงป้ายยาสายแฟชั่นลูกคุณหนู ชวนกดตะกร้าทันที',
    accentClass: 'from-rose-500 to-pink-600 text-white',
  },
  {
    id: 3,
    key: 'tech-magsafe-case',
    title: 'นายแบบสายเทครีวิวเคส MagSafe กันกระแทก',
    genreBadge: '📱 แกตเจ็ตสายเทค',
    genreTitle: 'รีวิวอุปกรณ์ไอที & เคสมือถือ (Tech & Gadget Male Presenter)',
    durationLabel: '10 วิ • Master',
    videoUrl: `${STORAGE_ROOT}/ugc-product-showcase/tech-magsafe-case.mp4`,
    posterUrl: `${STORAGE_ROOT}/ugc-product-showcase/tech-magsafe-case-poster.jpg`,
    drivePreviewUrl: 'https://drive.google.com/file/d/17PL9Xi4cSfur7ymPKyI665hzxrJUAnna/preview',
    synopsis:
      'นายแบบหนุ่มลุคสายเทคคล้องหูฟัง AirPods Max ถือโชว์เคส iPhone MagSafe เห็นวงแหวนแม่เหล็กคมชัด พร้อมป้ายภาษาไทย “เคส MagSafe สายเทค! ⚡”',
    cameraNote: 'Eye-Level Creator Framing • โฟกัสตัวสินค้าในมือคมชัดไม่บิดเบี้ยว',
    voiceNote: 'เสียงรีวิวผู้ชายสายแกตเจ็ต ทันสมัย น่าเชื่อถือ',
    accentClass: 'from-sky-500 to-blue-600 text-white',
  },
  {
    id: 4,
    key: 'office-magsafe-case',
    title: 'สาวออฟฟิศป้ายยาเคส MagSafe ลุคทำงานพรีเมียม',
    genreBadge: '💼 วัยทำงานพรีเมียม',
    genreTitle: 'รีวิวสินค้าไลฟ์สไตล์วัยทำงาน (Office & Lifestyle Female Presenter)',
    durationLabel: '10 วิ • Master',
    isHighlight: true,
    videoUrl: `${STORAGE_ROOT}/ugc-product-showcase/office-magsafe-case.mp4`,
    posterUrl: `${STORAGE_ROOT}/ugc-product-showcase/office-magsafe-case-poster.jpg`,
    drivePreviewUrl: 'https://drive.google.com/file/d/18pKSSZvZCsjzA0xM-JoRbo3aNBPSfM8K/preview',
    synopsis:
      'นางแบบสาวชุดเบลเซอร์วัยทำงานถือรีวิวเคส MagSafe บนโต๊ะทำงานคู่กับแล็ปท็อป พร้อมป้ายภาษาไทย “💼 สายทำงานต้องมี!”',
    cameraNote: 'Clean Modern Desk Setup • แสงสตูดิโอสดใสขับบุคลิกพรีเซนเตอร์มืออาชีพ',
    voiceNote: 'เสียงพูดไทยโทนพี่สาวออฟฟิศป้ายยาไอเทมเด็ดประจำวัน',
    accentClass: 'from-emerald-500 to-teal-600 text-white',
  },
];

export function hasToolOutputShowcase(slug?: string | null): slug is ShowcaseToolSlug {
  return (
    slug === 'puppap-drama' ||
    slug === 'puppap-talking-3d' ||
    slug === 'puppap-renovate' ||
    slug === 'puppap-ugc-product'
  );
}

export function getShowcaseBadgeLabel(slug?: string | null): string | null {
  if (slug === 'puppap-drama') return 'ชมตัวอย่างผลงานจริง 8 แนว';
  if (slug === 'puppap-talking-3d') return 'ชมตัวอย่างสิ่งของพูดได้ 4 คลิป';
  if (slug === 'puppap-renovate') return 'ชมตัวอย่างรีโนเวท Before➔After';
  if (slug === 'puppap-ugc-product') return 'ชมตัวอย่างคลิปรีวิวสินค้า 4 คลิป';
  return null;
}

const STUDIO_TABS: Array<{
  slug: ShowcaseToolSlug;
  icon: string;
  tabLabel: string;
  countBadge: string;
  toolName: string;
  toolPrice: string;
}> = [
  {
    slug: 'puppap-drama',
    icon: '🎭',
    tabLabel: 'ละครสั้น & ซีรีส์ AI',
    countBadge: '8 แนวไวรัล',
    toolName: 'PUP PAP DRAMA',
    toolPrice: '599',
  },
  {
    slug: 'puppap-ugc-product',
    icon: '📦',
    tabLabel: 'รีวิวสินค้าปักตะกร้า UGC',
    countBadge: 'แถมฟรีในคอร์ส!',
    toolName: 'PUPPAP AI UGC Product',
    toolPrice: '299',
  },
  {
    slug: 'puppap-talking-3d',
    icon: '🗣️',
    tabLabel: 'สิ่งของ 3D พูดได้ป้ายยา',
    countBadge: '4 คาแรกเตอร์',
    toolName: 'PUP PAP TALKING 3D',
    toolPrice: '399',
  },
  {
    slug: 'puppap-renovate',
    icon: '🏗️',
    tabLabel: 'รีโนเวทบ้าน Before➔After',
    countBadge: '3 โปรเจกต์หรู',
    toolName: 'PUP PAP RENOVATE',
    toolPrice: '399',
  },
];

const SHOWCASE_META: Record<
  ShowcaseToolSlug,
  {
    topBadge: string;
    headingPrefix: string;
    headingHighlight: string;
    subheading: string;
    gridTitle: string;
    gridSubtitle: string;
    soundOnLabel: string;
    recipeTitle: string;
    ctaHeadline: string;
    toolName: string;
    defaultPrice: string;
    items: DramaShowcaseItem[];
  }
> = {
  'puppap-drama': {
    topBadge: 'REAL AI SHORT-DRAMA SHOWCASE • ผลงานจริงจากเครื่องมือนี้ 100%',
    headingPrefix: 'ชมตัวอย่างละครสั้น AI ระดับมาสเตอร์พีซ',
    headingHighlight: 'ครบ 8 แนวไวรัลยอดฮิต',
    subheading:
      'ทุกคลิปด้านล่างถูกสร้างจาก PUP PAP DRAMA — ล็อกใบหน้าตัวละครตรงกันทุกช็อต คุมมุมกล้องระดับภาพยนตร์ พร้อมเสียงพากย์ไทยอารมณ์สมจริงโดยไม่ต้องใช้คนแสดง',
    gridTitle: 'คลิกเลือกชมผลงานจริงทั้ง 8 แนวละครฮิต (คลิกเพื่อเล่นพร้อมเสียง)',
    gridSubtitle: 'รองรับทุกแนวเรื่องในเครื่องมือเดียว',
    soundOnLabel: '🔊 แตะเปิดฟังเสียงพากย์ไทย AI',
    recipeTitle: 'สูตรผู้กำกับ AI ที่ใช้เจนเรื่องนี้',
    ctaHeadline:
      '✨ สร้างละครสั้น AI ภาพสวย ล็อกหน้าเป๊ะ + พากย์ไทยครบทั้ง 8 แนวได้ด้วยตัวเอง!',
    toolName: 'PUP PAP DRAMA',
    defaultPrice: '599',
    items: DRAMA_SHOWCASE_ITEMS,
  },
  'puppap-talking-3d': {
    topBadge: '3D PIXAR TALKING PRODUCT SHOWCASE • ผลงานจริงจากเครื่องมือนี้ 100%',
    headingPrefix: 'ชมตัวอย่างสิ่งของ & สินค้า 3D พูดได้',
    headingHighlight: 'ป้ายยาตะกร้าแตก 4 สไตล์',
    subheading:
      'ทุกคลิปด้านล่างถูกสร้างจาก PUP PAP TALKING 3D — เสกขวดเซรั่ม ผักผลไม้ เครื่องครัว และเมล็ดกาแฟให้มีชีวิต ขยับปากพูดป้ายยาภาษาไทยพร้อมถือตะกร้าช้อปปิ้งสุดน่ารัก',
    gridTitle: 'คลิกเลือกชมคาแรกเตอร์สินค้า 3D พูดได้ทั้ง 4 แบบ (คลิกเพื่อฟังเสียงป้ายยา)',
    gridSubtitle: 'ใช้ได้กับสินค้าทุกหมวดหมู่',
    soundOnLabel: '🔊 แตะเปิดฟังเสียงพากย์ป้ายยาไทย',
    recipeTitle: 'สูตรเสกสินค้า 3D พูดได้ที่ใช้ในคลิปนี้',
    ctaHeadline:
      '✨ เปลี่ยนสินค้าธรรมดาให้กลายเป็นมาสคอต 3D พูดป้ายยาทำยอดขายพุ่งได้ในไม่กี่คลิก!',
    toolName: 'PUP PAP TALKING 3D',
    defaultPrice: '399',
    items: TALKING_3D_SHOWCASE_ITEMS,
  },
  'puppap-renovate': {
    topBadge: 'BEFORE ➔ AFTER AI RENOVATION SHOWCASE • ผลงานจริงจากเครื่องมือนี้ 100%',
    headingPrefix: 'ชมตัวอย่างคลิปรีโนเวทห้องร้างเป็นคฤหาสน์หรู',
    headingHighlight: 'Before ➔ After ครบทุกขั้นตอน',
    subheading:
      'ทุกคลิปด้านล่างถูกสร้างจาก PUP PAP RENOVATE — ล็อกโครงสร้างห้องเดิมเป๊ะ 100% ไล่ตั้งแต่สภาพห้องร้าง ทุบรื้อ ก่อฉาบ จนเสร็จเป็นห้องหรูระดับโรงแรม 5 ดาว (รวมถึงโหมดช่างเหมียวไวรัล!)',
    gridTitle: 'คลิกเลือกชมผลงานรีโนเวท Before ➔ After (คลิกที่การ์ดเพื่อดูคลิปเต็ม)',
    gridSubtitle: 'ล็อกมุมห้องเดิมตรงกันทุกช็อต 100%',
    soundOnLabel: '🔊 แตะเปิดฟังเสียง ASMR รีโนเวทห้อง',
    recipeTitle: 'สูตรสถาปนิก AI ที่ใช้สร้างคลิปนี้',
    ctaHeadline:
      '✨ สร้างคลิปรีโนเวทบ้าน Before ➔ After ยอดวิวหลักล้านและป้ายยาของแต่งบ้านได้ทันที!',
    toolName: 'PUP PAP RENOVATE',
    defaultPrice: '399',
    items: RENOVATE_SHOWCASE_ITEMS,
  },
  'puppap-ugc-product': {
    topBadge: 'AI UGC PRODUCT REVIEW SHOWCASE • แถมฟรีในคอร์สเรียน ฿159 (หรือซื้อแยก ฿299)',
    headingPrefix: 'ชมตัวอย่างคลิปรีวิวสินค้าปักตะกร้า UGC',
    headingHighlight: 'พรีเซนเตอร์ AI ถือสินค้าจริง 4 สไตล์',
    subheading:
      'ทุกคลิปด้านล่างถูกสร้างจาก PUPPAP AI UGC Product — แนบรูปสินค้าของคุณ ให้พรีเซนเตอร์ AI ถือรีวิวสาธิตการใช้งานพร้อมป้ายข้อความป้ายยาและเสียงพูดภาษาไทย (เครื่องมือนี้แถมฟรีเมื่อสมัครคอร์สเรียน ฿159!)',
    gridTitle: 'คลิกเลือกชมตัวอย่างคลิปรีวิวสินค้าปักตะกร้าทั้ง 4 หมวดขายดี (คลิกเพื่อฟังเสียงรีวิว)',
    gridSubtitle: '🎁 แถมฟรีในคอร์สเรียน ฿159',
    soundOnLabel: '🔊 แตะเปิดฟังเสียงพรีเซนเตอร์รีวิวไทย',
    recipeTitle: 'สูตรสร้างคลิปรีวิวสินค้า UGC ที่ใช้ในคลิปนี้',
    ctaHeadline:
      '🎁 พิเศษ! เครื่องมือนี้แถมฟรีเมื่อสมัครคอร์สเรียน ฿159 (ได้ครบคอร์ส 22 บท + แถมฟรี 2 เครื่องมือ AI มูลค่า ฿598)',
    toolName: 'PUPPAP AI UGC Product',
    defaultPrice: '299',
    items: UGC_PRODUCT_SHOWCASE_ITEMS,
  },
};

interface DramaOutputShowcaseProps {
  toolSlug?: ShowcaseToolSlug;
  enableStudioTabs?: boolean;
  isUnlocked?: boolean;
  priceFormatted?: string;
  checkoutHref?: string;
  className?: string;
}

export default function DramaOutputShowcase({
  toolSlug = 'puppap-drama',
  enableStudioTabs = false,
  isUnlocked = false,
  priceFormatted,
  checkoutHref,
  className = '',
}: DramaOutputShowcaseProps) {
  const [selectedStudio, setSelectedStudio] = useState<ShowcaseToolSlug>(toolSlug);
  const currentStudio: ShowcaseToolSlug = enableStudioTabs ? selectedStudio : toolSlug;

  const meta = SHOWCASE_META[currentStudio] || SHOWCASE_META['puppap-drama'];
  const items = meta.items;
  const resolvedPrice = priceFormatted || meta.defaultPrice;
  const resolvedCheckoutHref = checkoutHref || `/checkout/${currentStudio}`;

  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const safeIndex = activeIndex < items.length ? activeIndex : 0;
  const activeItem = items[safeIndex] || items[0];

  useEffect(() => {
    setSelectedStudio(toolSlug);
  }, [toolSlug]);

  // Listen to global puppap-media-active so audio never overlaps with CourseHeroVideo or Lesson21PreviewPlayer
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleMediaActive = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail?.id && detail.id !== 'drama-showcase') {
        setIsMuted(true);
        if (videoRef.current) {
          videoRef.current.muted = true;
        }
      }
    };
    window.addEventListener('puppap-media-active', handleMediaActive);
    return () => window.removeEventListener('puppap-media-active', handleMediaActive);
  }, []);

  const announceMediaActive = () => {
    if (typeof window === 'undefined') return;
    (window as any).__puppapActiveVideoId = 'drama-showcase';
    window.dispatchEvent(
      new CustomEvent('puppap-media-active', { detail: { id: 'drama-showcase' } })
    );
  };

  useEffect(() => {
    setVideoError(false);
    const v = videoRef.current;
    if (!v) return;
    v.load();
    const playPromise = v.play();
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  }, [safeIndex, currentStudio]);

  const handleSelectStudioTab = (nextSlug: ShowcaseToolSlug) => {
    setSelectedStudio(nextSlug);
    setActiveIndex(0);
  };

  const handleSelectDrama = (idx: number) => {
    setActiveIndex(idx);
    setIsMuted(false);
    announceMediaActive();
    if (videoRef.current) {
      videoRef.current.muted = false;
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (!nextMuted) {
      announceMediaActive();
    }
    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
      if (!nextMuted && videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      }
    }
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % items.length);
  };

  const isRenovate = currentStudio === 'puppap-renovate';

  return (
    <section
      aria-label={`โรงภาพยนตร์แสดงผลงานจริงจาก ${currentStudio}`}
      data-testid="drama-output-showcase"
      className={`${enableStudioTabs ? 'w-full' : 'max-w-5xl mx-auto px-4 mb-10'} ${className}`}
    >
      <div className="relative rounded-[28px] overflow-hidden bg-gradient-to-b from-[#160b06] via-[#0e0a0f] to-[#140905] text-white border-2 border-amber-400/80 shadow-[0_16px_50px_rgba(0,0,0,0.65)] p-4 sm:p-6 md:p-8 space-y-6">
        {/* Ambient Cinema Spotlights */}
        <div className="pointer-events-none absolute -top-24 left-1/4 w-96 h-56 bg-rose-600/20 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-1/4 w-96 h-56 bg-amber-500/20 rounded-full blur-3xl" />

        {/* Cinema Stage Header */}
        <div className="relative z-10 text-center space-y-2.5 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 via-rose-500/25 to-amber-500/20 border border-amber-400/60 text-amber-300 text-xs sm:text-sm font-bold shadow-sm">
            <span>🎬</span>
            <span>
              {enableStudioTabs
                ? 'PUP PAP AI LIVE OUTPUT THEATER • รวม 19 ผลงานจริงจาก 4 สตูดิโอเรือธง'
                : meta.topBadge}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight">
            {enableStudioTabs ? (
              <>
                พิสูจน์ด้วยสายตา! ตัวอย่างผลงานจริง{' '}
                <span className="text-amber-300 underline decoration-rose-500/80">
                  ระดับมาสเตอร์พีซ 19 คลิปเต็ม
                </span>
              </>
            ) : (
              <>
                {meta.headingPrefix}{' '}
                <span className="text-amber-300 underline decoration-rose-500/80">
                  {meta.headingHighlight}
                </span>
              </>
            )}
          </h2>

          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
            {enableStudioTabs
              ? 'กดสลับแท็บด้านล่างเพื่อชมผลงานจริงจากเครื่องมือยอดฮิตทั้ง 4 สตูดิโอ (ละครสั้น AI 8 แนว • รีวิวสินค้าปักตะกร้า UGC • สิ่งของ 3D พูดได้ • รีโนเวทบ้าน Before ➔ After)'
              : meta.subheading}
          </p>
        </div>

        {/* 4-Studio Interactive Tab Switcher (Homepage / Multi-Studio Mode) */}
        {enableStudioTabs && (
          <div
            className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 p-2 rounded-2xl bg-stone-950/90 border border-amber-400/35"
            data-testid="multi-studio-tabs"
          >
            {STUDIO_TABS.map((tab) => {
              const isTabActive = tab.slug === currentStudio;
              return (
                <button
                  key={tab.slug}
                  type="button"
                  onClick={() => handleSelectStudioTab(tab.slug)}
                  data-testid={`studio-tab-${tab.slug}`}
                  className={`py-3 px-3.5 rounded-xl text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                    isTabActive
                      ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-stone-950 font-bold shadow-[0_4px_18px_rgba(251,191,36,0.4)] scale-[1.01]'
                      : 'bg-white/5 hover:bg-white/10 text-stone-200 border border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg sm:text-xl shrink-0">{tab.icon}</span>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold truncate">
                        {tab.tabLabel}
                      </div>
                      <div
                        className={`text-[10px] font-semibold truncate ${
                          isTabActive ? 'text-stone-800' : 'text-amber-300/90'
                        }`}
                      >
                        {tab.toolName} (฿{tab.toolPrice})
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      isTabActive
                        ? 'bg-stone-950 text-amber-300'
                        : 'bg-amber-400/15 text-amber-300 border border-amber-400/30'
                    }`}
                  >
                    {tab.countBadge}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Main Interactive Split Cinema Stage */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN (lg:col-span-5): 9:16 Vertical Cinema Screen + Prev/Next */}
          <div className="lg:col-span-5 flex flex-col items-center space-y-3.5">
            {/* 9:16 Vertical Phone / Cinema Screen */}
            <div className="relative w-full max-w-[290px] sm:max-w-[315px] aspect-[9/16] rounded-[26px] overflow-hidden border-[3px] border-amber-400/90 bg-black shadow-[0_0_35px_rgba(245,158,11,0.28)] group">
              {/* Top Overlay Bar: Track Number + Genre Badge */}
              <div className="absolute top-3 inset-x-3 z-20 flex items-center justify-between gap-2 pointer-events-none">
                <span className="px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-[11px] font-bold text-white flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <span>
                    คลิปที่ #{safeIndex + 1}/{items.length} • {activeItem.durationLabel}
                  </span>
                </span>

                <span
                  className={`px-2.5 py-1 rounded-full bg-gradient-to-r ${activeItem.accentClass} text-[11px] font-bold shadow-md`}
                >
                  {activeItem.genreBadge}
                </span>
              </div>

              {/* Native HTML5 Fast-Streaming Video Player (with Drive iframe fallback) */}
              {!videoError ? (
                <video
                  ref={videoRef}
                  key={activeItem.videoUrl}
                  src={activeItem.videoUrl}
                  poster={activeItem.posterUrl}
                  preload="metadata"
                  playsInline
                  autoPlay
                  loop
                  muted={isMuted}
                  controls={false}
                  onClick={toggleMute}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onError={() => setVideoError(true)}
                  className="w-full h-full object-cover cursor-pointer"
                />
              ) : (
                <iframe
                  src={activeItem.drivePreviewUrl}
                  title={activeItem.title}
                  allow="autoplay; encrypted-media; fullscreen"
                  className="w-full h-full border-0"
                />
              )}

              {/* Bottom Gradient Overlay with Drama Title + Prominent Sound Toggle Button */}
              <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/95 via-black/70 to-transparent pt-12 pb-3.5 px-3.5 space-y-2.5">
                <div className="text-left">
                  <div className="text-[11px] font-semibold text-amber-300">
                    {activeItem.genreTitle}
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
                    “{activeItem.title}”
                  </h3>
                </div>

                {!videoError && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleMute}
                      data-testid="drama-showcase-sound-toggle"
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg ${
                        isMuted
                          ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-stone-950 animate-pulse'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-300/50'
                      }`}
                    >
                      <span>
                        {isMuted ? meta.soundOnLabel : '🔊 เปิดเสียงอยู่ (แตะเพื่อปิด)'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const v = videoRef.current;
                        if (!v) return;
                        if (v.paused) {
                          v.play().catch(() => {});
                        } else {
                          v.pause();
                        }
                      }}
                      aria-label={isPlaying ? 'หยุดชั่วคราว' : 'เล่นต่อ'}
                      className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/25 text-white text-xs font-bold flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      {isPlaying ? '⏸' : '▶'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Prev / Next Navigation Pills */}
            <div className="flex items-center justify-between gap-2 w-full max-w-[315px]">
              <button
                type="button"
                onClick={handlePrev}
                className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-stone-200 transition-colors cursor-pointer"
              >
                ◀ คลิปก่อนหน้า
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-xs font-bold text-amber-300 transition-colors cursor-pointer"
              >
                คลิปถัดไป ▶
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN (lg:col-span-7): Interactive Poster / Before-After Grid + AI Director Recipe */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5">
              <div className="text-xs sm:text-sm font-bold text-amber-200 flex items-center gap-2">
                <span>🎞️</span>
                <span>{meta.gridTitle}</span>
              </div>
              <span className="text-[11px] font-semibold text-stone-400">
                {meta.gridSubtitle}
              </span>
            </div>

            {/* Grid Layout: 3 Before->After Cards for Renovate, 2/4 Poster Cards for Talking-3D & Drama */}
            {isRenovate ? (
              <div className="grid grid-cols-1 gap-3">
                {items.map((item, idx) => {
                  const isSelected = idx === safeIndex;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleSelectDrama(idx)}
                      data-testid={`drama-card-${item.key}`}
                      className={`group relative rounded-2xl overflow-hidden text-left transition-all cursor-pointer p-3 flex flex-col sm:flex-row items-center gap-3.5 bg-stone-900/95 ${
                        isSelected
                          ? 'ring-3 ring-amber-400 border-2 border-amber-300 shadow-[0_0_24px_rgba(251,191,36,0.38)]'
                          : 'border border-white/15 hover:border-amber-400/70 opacity-90 hover:opacity-100'
                      }`}
                    >
                      {/* Side-by-Side BEFORE ➔ AFTER Thumbnails */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="relative w-20 h-28 sm:w-22 sm:h-30 rounded-xl overflow-hidden border border-white/20 bg-stone-950">
                          <img
                            src={item.beforePosterUrl || item.posterUrl}
                            alt={`Before ${item.title}`}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-stone-950/90 text-stone-200 text-[9px] font-bold border border-white/20">
                            BEFORE
                          </span>
                        </div>

                        <span className="text-amber-400 font-bold text-sm">➔</span>

                        <div className="relative w-20 h-28 sm:w-22 sm:h-30 rounded-xl overflow-hidden border-2 border-amber-400 bg-stone-950 shadow-md">
                          <img
                            src={item.afterPosterUrl || item.posterUrl}
                            alt={`After ${item.title}`}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-bold shadow-xs">
                            AFTER ✨
                          </span>
                        </div>
                      </div>

                      {/* Right Info */}
                      <div className="flex-1 min-w-0 space-y-1.5 text-center sm:text-left">
                        <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full bg-gradient-to-r ${item.accentClass} text-[10px] font-bold shadow-xs`}
                          >
                            {item.genreBadge}
                          </span>
                          <span className="text-[11px] font-semibold text-amber-300">
                            {item.durationLabel}
                          </span>
                        </div>

                        <div className="text-sm sm:text-base font-bold text-white leading-snug">
                          #{idx + 1} {item.title}
                        </div>

                        <p className="text-xs text-stone-300 line-clamp-2 leading-relaxed">
                          {item.synopsis}
                        </p>

                        <div
                          className={`text-xs font-bold pt-0.5 ${
                            isSelected
                              ? 'text-emerald-400'
                              : 'text-amber-300 group-hover:underline'
                          }`}
                        >
                          {isSelected
                            ? '🔊 กำลังเล่นคลิปนี้อยู่บนจอซ้าย'
                            : '▶ คลิกเพื่อดูคลิปรีโนเวทตั้งแต่ต้นจนจบ'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                {items.map((item, idx) => {
                  const isSelected = idx === safeIndex;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleSelectDrama(idx)}
                      data-testid={`drama-card-${item.key}`}
                      className={`group relative rounded-2xl overflow-hidden text-left transition-all cursor-pointer flex flex-col justify-between aspect-[9/14] bg-stone-950 ${
                        isSelected
                          ? 'ring-3 ring-amber-400 border-2 border-amber-300 shadow-[0_0_24px_rgba(251,191,36,0.45)] -translate-y-1'
                          : 'border border-white/15 hover:border-amber-400/70 opacity-90 hover:opacity-100 hover:-translate-y-0.5'
                      }`}
                    >
                      {/* Poster Thumbnail */}
                      <img
                        src={item.posterUrl}
                        alt={item.title}
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />

                      {/* Subtle Vignette */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-black/55" />

                      {/* Top Badges on Card */}
                      <div className="relative z-10 p-2 flex items-center justify-between gap-1">
                        <span
                          className={`px-2 py-0.5 rounded-full bg-gradient-to-r ${item.accentClass} text-[9.5px] font-bold leading-tight shadow-sm truncate`}
                        >
                          {item.genreBadge}
                        </span>

                        {item.isHighlight && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[8.5px] font-bold shadow-xs shrink-0">
                            HOT
                          </span>
                        )}
                      </div>

                      {/* Center Play / Active Equalizer Badge */}
                      <div className="relative z-10 flex items-center justify-center">
                        <span
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-transform shadow-lg ${
                            isSelected
                              ? 'bg-amber-400 text-stone-950 scale-110'
                              : 'bg-black/65 text-white border border-white/30 group-hover:scale-110 group-hover:bg-rose-600'
                          }`}
                        >
                          {isSelected ? '🔊' : '▶'}
                        </span>
                      </div>

                      {/* Bottom Title & Status */}
                      <div className="relative z-10 p-2.5 space-y-1">
                        <div className="text-[9.5px] font-semibold text-amber-300/95">
                          #{idx + 1} • {item.durationLabel}
                        </div>
                        <div className="text-xs font-bold text-white leading-snug line-clamp-2">
                          {item.title}
                        </div>
                        <div
                          className={`text-[10px] font-bold pt-0.5 ${
                            isSelected
                              ? 'text-emerald-400'
                              : 'text-stone-300 group-hover:text-amber-300'
                          }`}
                        >
                          {isSelected ? '● กำลังเล่นคลิปนี้' : '▶ คลิกเพื่อดูตัวอย่าง'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* AI Director Recipe HUD Card */}
            <div className="w-full rounded-2xl bg-stone-900/90 border border-amber-400/35 p-4 text-left space-y-2 shadow-md">
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5">
                <span className="text-xs sm:text-sm font-bold text-amber-300 flex items-center gap-1.5">
                  <span>🎛️</span>
                  <span>{meta.recipeTitle}</span>
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  เจนตามได้ทันที
                </span>
              </div>

              <p className="text-xs text-stone-300 leading-relaxed">{activeItem.synopsis}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px] text-stone-300">
                <div className="flex items-start gap-1.5">
                  <span className="text-amber-400 shrink-0">🎥</span>
                  <span>
                    <strong className="text-white">มุมกล้อง & แสง:</strong> {activeItem.cameraNote}
                  </span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-amber-400 shrink-0">🎙️</span>
                  <span>
                    <strong className="text-white">เสียง & อารมณ์:</strong> {activeItem.voiceNote}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Conversion Strip Inside Showcase */}
            {!isUnlocked && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-amber-500/15 border border-amber-400/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-center sm:text-left space-y-0.5">
                  <div className="text-xs sm:text-sm font-bold text-amber-200">
                    {meta.ctaHeadline}
                  </div>
                  <div className="text-[11px] text-stone-300">
                    ปลดล็อกครั้งเดียวใช้งานได้ตลอดชีพ หรือเลือกแพ็กเหมาๆ 799 ได้ครบทุกโปรแกรมในเว็บ
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 w-full sm:w-auto">
                  {enableStudioTabs ? (
                    <>
                      <Link
                        href={`/tool/${currentStudio}`}
                        className="puppap-btn-primary px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-center whitespace-nowrap shadow-md"
                      >
                        📖 ดูรายละเอียด {meta.toolName} (฿{resolvedPrice}) →
                      </Link>
                      <Link
                        href="/checkout/puppap-all-in-one"
                        className="puppap-gold-cta-animated px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-center whitespace-nowrap shadow-lg"
                      >
                        👑 เหมาครบทุกตัว ฿799 →
                      </Link>
                    </>
                  ) : (
                    <Link
                      href={resolvedCheckoutHref}
                      className="puppap-btn-primary puppap-cta-animated flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-center whitespace-nowrap shadow-lg"
                    >
                      🛒 ซื้อเครื่องมือนี้ ฿{resolvedPrice} →
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
