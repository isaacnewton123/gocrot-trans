/** Keep in sync with bot/src/phone.ts */
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  else if (digits.startsWith("8") && digits.length >= 9 && digits.length <= 13) {
    digits = `62${digits}`;
  }
  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
}
