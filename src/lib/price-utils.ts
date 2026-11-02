export interface PriceDisplayInfo {
  hasPrice: boolean;
  numericPrice: number;
  formattedPrice: string;
  originalNumeric: number;
  formattedOriginal: string;
  discountPercent: number;
  savingsFormatted: string;
}

/**
 * Parse tool/course price and compute high-converting anchor (original strikethrough) price
 */
export function getPriceInfo(
  rawPrice?: string | number | null,
  features?: any
): PriceDisplayInfo {
  const cleanStr = String(rawPrice ?? '').replace(/[^0-9.]/g, '');
  const numericPrice = parseFloat(cleanStr) || 0;

  if (numericPrice <= 0) {
    return {
      hasPrice: false,
      numericPrice: 0,
      formattedPrice: 'เร็วๆ นี้',
      originalNumeric: 0,
      formattedOriginal: '',
      discountPercent: 0,
      savingsFormatted: '',
    };
  }

  // Check if explicit original_price is configured in features JSON
  const customOrig =
    features && typeof features === 'object' && !Array.isArray(features)
      ? parseFloat(String(features.original_price ?? '').replace(/[^0-9.]/g, ''))
      : 0;

  let originalNumeric = customOrig > numericPrice ? customOrig : 0;

  if (!originalNumeric) {
    if (numericPrice <= 350) {
      // e.g. 299 THB -> Regular 990 THB (-70%)
      originalNumeric = 990;
    } else if (numericPrice <= 600) {
      // e.g. 599 THB -> Regular 1,290 THB (-54%)
      originalNumeric = 1290;
    } else if (numericPrice <= 800) {
      // e.g. 699 THB -> Regular 1,490 THB (-53%)
      originalNumeric = 1490;
    } else if (numericPrice <= 1200) {
      // e.g. 990 THB -> Regular 1,990 THB (-50%)
      originalNumeric = 1990;
    } else {
      originalNumeric = Math.ceil((numericPrice * 2) / 100) * 100 - 10;
    }
  }

  const discountPercent = Math.max(
    10,
    Math.round(((originalNumeric - numericPrice) / originalNumeric) * 100)
  );
  const savings = Math.max(0, originalNumeric - numericPrice);

  return {
    hasPrice: true,
    numericPrice,
    formattedPrice: numericPrice.toLocaleString(),
    originalNumeric,
    formattedOriginal: originalNumeric.toLocaleString(),
    discountPercent,
    savingsFormatted: savings.toLocaleString(),
  };
}
