// Sri Lanka Inland Revenue Department (IRD) Gazette No. 2481/22 Utilities

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen"
];

const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
];

function convertGroup(n: number): string {
  let str = "";
  if (n >= 100) {
    str += ONES[Math.floor(n / 100)] + " Hundred ";
    n %= 100;
  }
  if (n >= 20) {
    str += TENS[Math.floor(n / 10)] + (n % 10 !== 0 ? "-" + ONES[n % 10] : "") + " ";
  } else if (n > 0) {
    str += ONES[n] + " ";
  }
  return str.trim();
}

/**
 * Converts a numeric LKR amount to words as required by Gazette Annexure I (item 4.1.g.iv / 6)
 * Example: 54250.75 -> "Fifty-Four Thousand Two Hundred Fifty Rupees and Seventy-Five Cents Only"
 */
export function numberToWordsLKR(amount: number): string {
  if (isNaN(amount) || amount === 0) {
    return "Zero Rupees Only";
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  
  const rupees = Math.floor(absAmount);
  const cents = Math.round((absAmount - rupees) * 100);

  if (rupees === 0 && cents === 0) {
    return "Zero Rupees Only";
  }

  let words = "";

  const billions = Math.floor(rupees / 1000000000);
  const millions = Math.floor((rupees % 1000000000) / 1000000);
  const thousands = Math.floor((rupees % 1000000) / 1000);
  const remainder = rupees % 1000;

  if (billions > 0) words += convertGroup(billions) + " Billion ";
  if (millions > 0) words += convertGroup(millions) + " Million ";
  if (thousands > 0) words += convertGroup(thousands) + " Thousand ";
  if (remainder > 0) words += convertGroup(remainder) + " ";

  words = words.trim();
  if (words === "") {
    words = "Zero";
  }

  words += " Rupees";

  if (cents > 0) {
    words += " and " + convertGroup(cents) + " Cents";
  }

  words += " Only";

  return isNegative ? "Negative " + words : words;
}

const MONTH_NAMES = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
];

/**
 * Expresses date in Gazette required MM/DD/YYYY format (Section 4.1.b & 4.1.d)
 */
export function formatGazetteDate(d?: Date | string | null): string {
  const dateObj = d ? new Date(d) : new Date();
  if (isNaN(dateObj.getTime())) {
    const fallback = new Date();
    const mm = String(fallback.getMonth() + 1).padStart(2, '0');
    const dd = String(fallback.getDate()).padStart(2, '0');
    const yyyy = fallback.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  }
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const yyyy = dateObj.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

/**
 * Converts date to YYYY-MM-DD for HTML <input type="date">
 */
export function toInputDateFormat(gazetteDateStr?: string): string {
  if (!gazetteDateStr) return new Date().toISOString().split('T')[0];
  // Check if already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(gazetteDateStr)) return gazetteDateStr;
  // Parse MM/DD/YYYY
  const parts = gazetteDateStr.split('/');
  if (parts.length === 3) {
    const [mm, dd, yyyy] = parts;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  return new Date().toISOString().split('T')[0];
}

/**
 * Parses YYYY-MM-DD input date to Gazette MM/DD/YYYY
 */
export function fromInputDateFormat(inputDateStr?: string): string {
  if (!inputDateStr) return formatGazetteDate(new Date());
  const parts = inputDateStr.split('-');
  if (parts.length === 3) {
    const [yyyy, mm, dd] = parts;
    return `${mm}/${dd}/${yyyy}`;
  }
  return formatGazetteDate(inputDateStr);
}

/**
 * Generates official Serial Number according to Gazette Section 4.1.a:
 * Format: YYMMM_QQQQ_XXXXX
 * Example: 26SEP_BR01_00001
 */
export function generateGazetteInvoiceNo(
  invoiceDate: Date | string,
  branchOrEntityCode: string = "BR01",
  numericSequence: number = 1
): string {
  const d = new Date(invoiceDate);
  const safeDate = isNaN(d.getTime()) ? new Date() : d;
  
  const yy = String(safeDate.getFullYear()).slice(-2);
  const mmm = MONTH_NAMES[safeDate.getMonth()];
  
  // Clean alphanumeric code (1-15 chars, no spaces)
  const qqqq = (branchOrEntityCode || "BR01").replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 15) || "BR01";
  
  // 5-digit formatted serial number
  const xxxxx = String(Math.max(1, numericSequence)).padStart(5, '0');
  
  return `${yy}${mmm}_${qqqq}_${xxxxx}`;
}
