export const PROMPTPAY_ID = '0905556356';
export const PROMPTPAY_DISPLAY = '090-555-6356';
export const PROMPTPAY_RECEIVER_NAME = 'นาย ภีมฑพัฒน์ นิลมาตย์';

function formatTlv(tag: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${tag}${len}${value}`;
}

/**
 * Compute CRC-16/CCITT-FALSE (polynomial 0x1021, initial 0xFFFF)
 * Standard checksum for Bank of Thailand EMVCo PromptPay QR Codes
 */
export function computePromptPayCrc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
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
 * Generate EMVCo-compliant Thai PromptPay QR Code payload string
 * Automatically locks the transfer amount when `amount > 0`
 */
export function generatePromptPayPayload(
  rawTarget: string = PROMPTPAY_ID,
  amount?: number
): string {
  const digits = String(rawTarget || PROMPTPAY_ID).replace(/[^0-9]/g, '');

  // Subtag 00: AID for PromptPay Credit Transfer
  const aidField = formatTlv('00', 'A000000677010111');

  let targetField = '';
  if (digits.length >= 15) {
    // e-Wallet ID (Subtag 03)
    targetField = formatTlv('03', digits);
  } else if (digits.length === 13) {
    // National ID / Tax ID (Subtag 02)
    targetField = formatTlv('02', digits);
  } else {
    // Mobile Number (Subtag 01): 0905556356 -> 0066905556356
    const localPhone = digits.startsWith('0') ? digits.slice(1) : digits;
    const formattedPhone = `0066${localPhone}`.padStart(13, '0');
    targetField = formatTlv('01', formattedPhone);
  }

  const hasValidAmount = typeof amount === 'number' && !isNaN(amount) && amount > 0;

  const parts: string[] = [
    formatTlv('00', '01'), // Payload Format Indicator
    formatTlv('01', hasValidAmount ? '12' : '11'), // 12 = Dynamic QR (with amount), 11 = Static QR
    formatTlv('29', `${aidField}${targetField}`), // Merchant Account Information (PromptPay)
    formatTlv('58', 'TH'), // Country Code
    formatTlv('53', '764'), // Currency: THB (764)
  ];

  if (hasValidAmount) {
    parts.push(formatTlv('54', amount!.toFixed(2)));
  }

  // Append Tag 63 + Length 04 before computing CRC-16
  const payloadWithoutCrc = `${parts.join('')}6304`;
  const crc = computePromptPayCrc16(payloadWithoutCrc);
  return `${payloadWithoutCrc}${crc}`;
}
