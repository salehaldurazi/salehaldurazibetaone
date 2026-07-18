import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalizes Arabic text by converting numeral forms, removing diacritics (tashkeel),
 * and unifying variations of Alif, Ya/Alif Maqsoora, and Ta Marbouta/Ha.
 */
export function normalizeArabic(text: string | number | null | undefined): string {
  if (text === null || text === undefined) return "";
  
  const str = String(text);
  return str
    // 1. Convert Arabic numerals (٠-٩) to English digits (0-9)
    .replace(/[٠١٢٣٤٥٦٧٨٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1632))
    // 2. Remove Arabic diacritics (Tashkeel)
    .replace(/[\u064B-\u065F\u0670]/g, "")
    // 3. Normalize Alif variations (أ, إ, آ) to bare Alif (ا)
    .replace(/[أإآ]/g, "ا")
    // 4. Normalize Ya and Alif Maqsoora (ى) to Ya (ي)
    .replace(/[ى]/g, "ي")
    // 5. Normalize Ta Marbouta (ة) to Ha (ه)
    .replace(/[ة]/g, "ه")
    .trim()
    .toLowerCase();
}
