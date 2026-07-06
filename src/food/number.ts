// Sanitize free-text numeric input to digits + a single decimal point,
// suitable for feeding a `decimal-pad` TextInput into `Number(...)`.
export function sanitizeDecimal(text: string): string {
  return text.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
}
