import crypto from 'crypto';
import { getAiSlipConfig, AiSlipConfig } from './ai-slip-config';

export interface EmvQrParseResult {
  isValidBankQr: boolean;
  sendingBankCode?: string;
  transRef?: string;
  crcValid?: boolean;
  reason?: string;
}

export interface SlipVerificationResult {
  decision: 'approved' | 'rejected' | 'manual_review';
  reason: string;
  fingerprintTag: string;
  extracted?: {
    amount?: number;
    receiverName?: string;
    receiverAccount?: string;
    transRef?: string;
    transferTimeText?: string;
    sendingBank?: string;
  };
}

/**
 * Compute CRC-16/CCITT-FALSE (polynomial 0x1021, initial 0xFFFF) used by Bank of Thailand EMVCo slip QR codes
 */
export function computeCrc16Ccitt(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Parse TLV fields from an EMVCo / BOT string
 */
function parseTlv(data: string): Record<string, string> {
  const result: Record<string, string> = {};
  let idx = 0;
  while (idx + 4 <= data.length) {
    const tag = data.slice(idx, idx + 2);
    const lenStr = data.slice(idx + 2, idx + 4);
    const len = parseInt(lenStr, 10);
    if (isNaN(len) || len < 0 || idx + 4 + len > data.length) {
      break;
    }
    result[tag] = data.slice(idx + 4, idx + 4 + len);
    idx += 4 + len;
  }
  return result;
}

/**
 * Validate Bank of Thailand Transfer Verification Mini-QR payload
 */
export function verifyEmvCoSlipQr(rawQr?: string | null): EmvQrParseResult {
  if (!rawQr || typeof rawQr !== 'string') {
    return {
      isValidBankQr: false,
      reason: 'ไม่พบ QR Code สำหรับตรวจสอบสลิปธนาคารในรูปภาพ (กรุณาใช้รูปสลิปตัวจริงที่บันทึกจากแอปธนาคารโดยตรง)',
    };
  }

  const qr = rawQr.trim();
  if (qr.length < 24 || !qr.startsWith('00')) {
    return {
      isValidBankQr: false,
      reason: 'QR Code บนภาพไม่ใช่รูปแบบสลิปโอนเงินของธนาคารแห่งประเทศไทย',
    };
  }

  // Check CRC-16 at the end (either tag 9104XXXX for BOT Mini-QR or 6304XXXX for EMVCo)
  const crcTagPrefix = qr.slice(-8, -4);
  const expectedCrc = qr.slice(-4).toUpperCase();
  if (crcTagPrefix === '9104' || crcTagPrefix === '6304') {
    const calculatedCrc = computeCrc16Ccitt(qr.slice(0, -4));
    if (calculatedCrc !== expectedCrc) {
      return {
        isValidBankQr: false,
        crcValid: false,
        reason: 'รหัสตรวจสอบความถูกต้องของ QR Code บนสลิปไม่ผ่าน (CRC Checksum Invalid)',
      };
    }
  }

  const topTlv = parseTlv(qr);
  const tag00 = topTlv['00'];
  if (!tag00) {
    return {
      isValidBankQr: false,
      reason: 'โครงสร้างข้อมูลใน QR Code บนสลิปไม่ถูกต้อง',
    };
  }

  // BOT Mini-QR embeds sub-TLV inside tag '00': subtag '00'='000001', '01'=bankCode, '02'=transRef
  const subTlv = parseTlv(tag00);
  const transRef = subTlv['02'] || subTlv['01'] || '';
  const sendingBankCode = subTlv['01'] || '';

  if (!transRef || transRef.length < 6) {
    return {
      isValidBankQr: false,
      reason: 'ไม่สามารถอ่านเลขที่รายการอ้างอิง (Transaction Ref) จาก QR Code บนสลิปได้',
    };
  }

  return {
    isValidBankQr: true,
    crcValid: true,
    sendingBankCode,
    transRef,
  };
}

export function sha256Short(input: Buffer | string): string {
  return crypto.createHash('sha256').update(input).digest('hex').slice(0, 24);
}

/**
 * Verify slip receiver account / PromptPay digits (handles bank masking like xxx-xxx-6356 or 090-555-6356)
 */
function matchesReceiverAccount(visibleAccountText: string, targetDigits = '0905556356'): boolean {
  const digitsOnly = String(visibleAccountText || '').replace(/[^0-9]/g, '');
  // If the bank slip does not display receiver digits on a PromptPay transfer, rely on strict receiver name check
  if (!digitsOnly || digitsOnly.length < 3) return true;

  // Accept PromptPay number (0905556356) as well as linked bank account (7751168047) in case same-bank PromptPay resolves to account number
  const allowedTargets = [targetDigits, '0905556356', '7751168047'];

  for (const target of allowedTargets) {
    if (target.includes(digitsOnly)) return true;

    // Sliding window of 3+ digits from visibleAccountText (e.g. xxx-xxx-6356 -> 6356)
    const windowSize = Math.min(4, digitsOnly.length);
    for (let i = 0; i <= digitsOnly.length - windowSize; i++) {
      const chunk = digitsOnly.slice(i, i + windowSize);
      if (target.includes(chunk)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Verify slip receiver name matches ภีมทพัฒน์ นิลมาตย์
 */
function matchesReceiverName(nameText: string, keywords: string[]): boolean {
  const normalized = String(nameText || '').toUpperCase().replace(/\s+/g, '');
  if (!normalized) return false;
  return keywords.some((kw) => normalized.includes(kw.toUpperCase()));
}

/**
 * Main 7-Layer Slip Verification Engine
 */
export async function verifySlipAndDecide(params: {
  supabaseAdmin: any;
  userId: string;
  toolId: string;
  expectedAmount: number;
  slipBase64?: string;
  slipMimeType?: string;
  slipUrl: string;
  qrPayload?: string | null;
  excludeOrderId?: string;
}): Promise<SlipVerificationResult> {
  const {
    supabaseAdmin,
    expectedAmount,
    slipBase64,
    slipMimeType = 'image/jpeg',
    slipUrl,
    qrPayload,
    excludeOrderId,
  } = params;

  const config = await getAiSlipConfig();

  // Compute image hash from base64 (or fetch from slipUrl if base64 wasn't sent)
  let imageBuffer: Buffer | null = null;
  let cleanBase64 = '';

  if (slipBase64) {
    cleanBase64 = String(slipBase64).replace(/^data:image\/\w+;base64,/, '');
    imageBuffer = Buffer.from(cleanBase64, 'base64');
  } else if (slipUrl && slipUrl.startsWith('http')) {
    try {
      const imgRes = await fetch(slipUrl);
      if (imgRes.ok) {
        const arrBuf = await imgRes.arrayBuffer();
        imageBuffer = Buffer.from(arrBuf);
        cleanBase64 = imageBuffer.toString('base64');
      }
    } catch (e) {
      console.error('Failed to fetch slip image for AI verification:', e);
    }
  }

  const imgHash = imageBuffer ? sha256Short(imageBuffer) : 'noimg';
  const qrHash = qrPayload ? sha256Short(qrPayload.trim()) : 'noqr';

  // If AI auto-verification is disabled by admin, fall back to manual Telegram approval
  if (!config.ai_slip_enabled) {
    return {
      decision: 'manual_review',
      reason: 'ระบบตั้งค่าให้แอดมินตรวจสอบสลิปด้วยตนเอง',
      fingerprintTag: `[PENDING img:${imgHash} qr:${qrHash}]`,
    };
  }

  // ─── LAYER 1 & 2: Verify Bank of Thailand EMVCo Mini-QR Code on Slip ───
  const qrCheck = verifyEmvCoSlipQr(qrPayload);
  if (!qrCheck.isValidBankQr || !qrCheck.transRef) {
    return {
      decision: 'rejected',
      reason:
        qrCheck.reason ||
        'ไม่พบ QR Code ของธนาคารบนสลิป หรือภาพสลิปถูกตัดทอน กรุณาแนบรูปสลิปฉบับเต็มที่บันทึกจากแอปธนาคารโดยตรงครับ',
      fingerprintTag: `[AI-REJECTED img:${imgHash} qr:${qrHash}]`,
    };
  }

  const qrTransRef = qrCheck.transRef.trim();
  const fingerprintTag = `[AI-VERIFIED ref:${qrTransRef} qr:${qrHash} img:${imgHash}]`;

  // ─── LAYER 3: Anti-Replay / Duplicate Slip Check in Database ───
  const { data: existingOrders } = await supabaseAdmin
    .from('orders')
    .select('id, status, user_id, admin_note')
    .or(
      `admin_note.ilike.%ref:${qrTransRef}%,admin_note.ilike.%qr:${qrHash}%,admin_note.ilike.%img:${imgHash}%`
    )
    .limit(5);

  const duplicateOrder = (existingOrders || []).find(
    (o: any) =>
      o.id !== excludeOrderId &&
      (o.status === 'approved' ||
        (o.admin_note && o.admin_note.includes(`ref:${qrTransRef}`) && o.status === 'pending'))
  );

  if (duplicateOrder) {
    return {
      decision: 'rejected',
      reason: `สลิปโอนเงินนี้ (เลขที่รายการ ${qrTransRef}) เคยถูกใช้งานไปแล้ว ห้ามนำสลิปเดิมมาใช้ซ้ำครับ`,
      fingerprintTag: `[AI-REJECTED-DUP ref:${qrTransRef} qr:${qrHash} img:${imgHash}]`,
    };
  }

  // ─── LAYER 4: Optional Direct Bank API Verification (SlipOK) if configured ───
  if (config.slipok_api_url && config.slipok_api_key && qrPayload) {
    try {
      const slipOkRes = await fetch(config.slipok_api_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-authorization': config.slipok_api_key,
        },
        body: JSON.stringify({
          data: qrPayload.trim(),
          amount: expectedAmount > 0 ? expectedAmount : undefined,
          log: true,
        }),
      });
      const slipOkData = await slipOkRes.json();
      if (!slipOkRes.ok || !slipOkData?.success) {
        const msg =
          slipOkData?.message ||
          'ข้อมูลสลิปไม่ผ่านการยืนยันจากระบบธนาคาร กรุณาตรวจสอบสลิปอีกครั้ง';
        return {
          decision: 'rejected',
          reason: `ไม่ผ่านการตรวจสอบจากธนาคาร: ${msg}`,
          fingerprintTag: `[SLIPOK-REJECTED ref:${qrTransRef} qr:${qrHash}]`,
        };
      }
    } catch (e) {
      console.warn('SlipOK check failed, continuing with Gemini Vision check:', e);
    }
  }

  // ─── LAYER 5: Gemini Vision AI Inspection (Forensic 6-Point Check) ───
  if (!config.gemini_api_key || config.gemini_api_key.trim().length < 10) {
    // If admin hasn't entered Gemini API key yet, safely queue for manual review in Telegram
    return {
      decision: 'manual_review',
      reason: 'ผ่านการตรวจ QR เบื้องต้นแล้ว (รอแอดมินกดยืนยัน หรือตั้งค่า Gemini API Key ในหน้าแอดมินเพื่อเปิดอนุมัติอัตโนมัติ 100%)',
      fingerprintTag: `[QR-VALID-PENDING ref:${qrTransRef} qr:${qrHash} img:${imgHash}]`,
      extracted: {
        transRef: qrTransRef,
        sendingBank: qrCheck.sendingBankCode,
      },
    };
  }

  if (!cleanBase64) {
    return {
      decision: 'manual_review',
      reason: 'ไม่สามารถโหลดไฟล์ภาพเพื่อส่งตรวจ AI ได้ รอแอดมินตรวจสอบ',
      fingerprintTag: `[QR-VALID-PENDING ref:${qrTransRef} qr:${qrHash}]`,
    };
  }

  const nowThai = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' });

  const prompt = `คุณคือผู้เชี่ยวชาญตรวจสอบสลิปโอนเงินธนาคารไทย (Anti-Fraud Bank Slip Auditor)
เวลาปัจจุบันของประเทศไทย (Asia/Bangkok) คือ: ${nowThai}
ยอดเงินที่ลูกค้าต้องโอนคือ: ${expectedAmount} บาท
บัญชีผู้รับโอนที่ถูกต้องคือ: ชื่อบัญชี "นาย ภีมฑพัฒน์ นิลมาตย์" (หรือ ภีมทพัฒน์ นิลมาตย์ / PHEEMTHAPHAT NILMAT) พร้อมเพย์ (PromptPay) หมายเลข 090-555-6356
รหัสอ้างอิงที่ถอดรหัสได้จาก QR Code บนสลิปนี้คือ: "${qrTransRef}"

กรุณาตรวจสอบภาพสลิปนี้อย่างละเอียดและตอบกลับเป็น JSON เท่านั้นตามโครงสร้างนี้:
{
  "is_completed_transfer_slip": boolean, // true เฉพาะเมื่อเป็นสลิปที่โอนเงินสำเร็จแล้วเท่านั้น (หากเป็นหน้าจอ "ตรวจสอบข้อมูลก่อนโอน" ที่ยังไม่กดยืนยัน หรือไม่ใช่รูปสลิป ให้ตอบ false)
  "is_tampered_or_fake": boolean, // true หากพบร่องรอยตัดต่อฟอนต์ไม่เท่ากัน ตัวเลขลอย หรือภาพสลิปปลอม
  "receiver_name": string, // ชื่อบัญชีผู้รับโอนที่อ่านได้จากภาพสลิป
  "receiver_account": string, // เลขพร้อมเพย์หรือเลขบัญชีผู้รับโอนที่แสดงบนสลิป (รวมตัว x หรือตัวเลขที่เห็น เช่น xxx-xxx-6356)
  "amount": number, // ยอดเงินที่โอน (ตัวเลขทศนิยม เช่น 299.00)
  "visual_trans_ref": string, // เลขที่รายการ / รหัสอ้างอิงที่พิมพ์อยู่บนภาพสลิป
  "transfer_datetime_text": string, // วันและเวลาโอนที่ระบุบนสลิป
  "estimated_age_minutes": number, // คำนวณว่าเวลาโอนบนสลิปห่างจากเวลาปัจจุบัน (${nowThai}) กี่นาที (หากเป็นคนละวันให้นับตามจริง เช่น ข้ามวัน = 1440+)
  "rejection_reason_thai": string // หากพบจุดผิดปกติ ให้ระบุสาเหตุภาษาไทยที่ชัดเจนสำหรับแจ้งลูกค้า
}`;

  const models = ['gemini-2.5-flash', 'gemini-2.0-flash'];
  let aiParsed: any = null;
  let lastApiError = '';

  for (const modelName of models) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(
        config.gemini_api_key.trim()
      )}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: slipMimeType || 'image/jpeg',
                    data: cleanBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.0,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        lastApiError = `${modelName} HTTP ${res.status}: ${errBody.slice(0, 120)}`;
        continue;
      }

      const data = await res.json();
      const textOut = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (textOut) {
        const cleanedJson = textOut.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
        aiParsed = JSON.parse(cleanedJson);
        break;
      }
    } catch (e: any) {
      lastApiError = e?.message || 'Unknown Gemini error';
    }
  }

  // If Gemini API had a network/key error, safely fall back to manual Telegram review instead of wrongly rejecting
  if (!aiParsed) {
    console.warn('Gemini slip verification fallback to manual review:', lastApiError);
    return {
      decision: 'manual_review',
      reason: `QR ถูกต้อง รอแอดมินตรวจสอบภาพสลิป (${lastApiError || 'AI Unavailable'})`,
      fingerprintTag: `[QR-VALID-PENDING ref:${qrTransRef} qr:${qrHash} img:${imgHash}]`,
    };
  }

  // ─── LAYER 6: Strict Rule Evaluation on AI Vision Output ───
  if (!aiParsed.is_completed_transfer_slip) {
    return {
      decision: 'rejected',
      reason:
        aiParsed.rejection_reason_thai ||
        'ภาพที่แนบมาไม่ใช่สลิปที่โอนเงินสำเร็จ (ห้ามใช้ภาพหน้าจอตรวจสอบข้อมูลก่อนโอน) กรุณาแนบสลิปหลังโอนเงินสำเร็จเท่านั้นครับ',
      fingerprintTag: `[AI-REJECTED-NOTSLIP ref:${qrTransRef} img:${imgHash}]`,
    };
  }

  if (aiParsed.is_tampered_or_fake) {
    return {
      decision: 'rejected',
      reason: 'ตรวจพบความผิดปกติของรูปแบบตัวอักษรบนสลิป กรุณาใช้ไฟล์รูปสลิปต้นฉบับที่บันทึกจากแอปธนาคารโดยตรงครับ',
      fingerprintTag: `[AI-REJECTED-TAMPER ref:${qrTransRef} img:${imgHash}]`,
    };
  }

  // Check Receiver Name (นาย ภีมฑพัฒน์ นิลมาตย์)
  if (!matchesReceiverName(aiParsed.receiver_name, config.receiver_name_keywords)) {
    return {
      decision: 'rejected',
      reason: `ชื่อบัญชีผู้รับโอนในสลิป (${aiParsed.receiver_name || 'ไม่ระบุ'}) ไม่ตรงกับบัญชี "นาย ภีมฑพัฒน์ นิลมาตย์" กรุณาตรวจสอบสลิปที่แนบอีกครั้งครับ`,
      fingerprintTag: `[AI-REJECTED-RECEIVER ref:${qrTransRef} img:${imgHash}]`,
    };
  }

  // Check Receiver PromptPay (090-555-6356)
  if (
    aiParsed.receiver_account &&
    !matchesReceiverAccount(aiParsed.receiver_account, config.receiver_account_digits)
  ) {
    return {
      decision: 'rejected',
      reason: `หมายเลขผู้รับโอนในสลิป (${aiParsed.receiver_account}) ไม่ตรงกับพร้อมเพย์ 090-555-6356 (นาย ภีมฑพัฒน์ นิลมาตย์) ครับ`,
      fingerprintTag: `[AI-REJECTED-ACCT ref:${qrTransRef} img:${imgHash}]`,
    };
  }

  // Check Transfer Amount
  const slipAmount = Number(aiParsed.amount) || 0;
  if (expectedAmount > 0 && slipAmount < expectedAmount) {
    return {
      decision: 'rejected',
      reason: `ยอดเงินในสลิป (${slipAmount.toLocaleString()} บาท) ไม่ครบตามราคาสินค้า (${expectedAmount.toLocaleString()} บาท) กรุณาแนบสลิปที่มียอดโอนถูกต้องครับ`,
      fingerprintTag: `[AI-REJECTED-AMT ref:${qrTransRef} img:${imgHash}]`,
    };
  }

  // Check Slip Age (Freshness Window, default <= 30 minutes)
  const ageMinutes = Number(aiParsed.estimated_age_minutes);
  const maxAge = config.max_slip_age_minutes || 30;
  if (!isNaN(ageMinutes) && ageMinutes > maxAge) {
    return {
      decision: 'rejected',
      reason: `สลิปนี้โอนเมื่อ ${aiParsed.transfer_datetime_text || `${ageMinutes} นาทีที่แล้ว`} ซึ่งเกินเวลาที่กำหนด (${maxAge} นาที) กรุณาใช้สลิปที่เพิ่งโอนใหม่ หรือทักแชทแจ้งแอดมินครับ`,
      fingerprintTag: `[AI-REJECTED-OLD ref:${qrTransRef} img:${imgHash}]`,
    };
  }

  // Check Visual TransRef vs QR TransRef consistency (if AI read a visual transRef)
  const visualRef = String(aiParsed.visual_trans_ref || '').replace(/\s+/g, '');
  if (visualRef.length >= 6 && qrTransRef.length >= 6) {
    const tailQr = qrTransRef.slice(-6).toUpperCase();
    const headQr = qrTransRef.slice(0, 6).toUpperCase();
    const normVis = visualRef.toUpperCase();
    if (!normVis.includes(tailQr) && !normVis.includes(headQr) && !qrTransRef.toUpperCase().includes(normVis.slice(-6))) {
      return {
        decision: 'rejected',
        reason: 'รหัสอ้างอิงบนภาพสลิปไม่ตรงกับข้อมูลใน QR Code บนสลิป กรุณาแนบไฟล์สลิปต้นฉบับจากแอปธนาคารครับ',
        fingerprintTag: `[AI-REJECTED-MISMATCH ref:${qrTransRef} img:${imgHash}]`,
      };
    }
  }

  // ─── ALL 7 LAYERS PASSED! APPROVE AUTOMATICALLY ───
  return {
    decision: 'approved',
    reason: `AI ตรวจสอบสลิปผ่านครบทุกขั้นตอน (ยอด ${slipAmount.toLocaleString()}฿ · ผู้รับ ${aiParsed.receiver_name} · Ref ${qrTransRef})`,
    fingerprintTag,
    extracted: {
      amount: slipAmount,
      receiverName: aiParsed.receiver_name,
      receiverAccount: aiParsed.receiver_account,
      transRef: qrTransRef,
      transferTimeText: aiParsed.transfer_datetime_text,
      sendingBank: qrCheck.sendingBankCode,
    },
  };
}
