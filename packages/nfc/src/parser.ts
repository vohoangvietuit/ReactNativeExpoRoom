/**
 * Decode NDEF text record bytes to string.
 * NDEF text record format: [status byte][language code][text]
 * Status byte bit 7: encoding (0=UTF-8, 1=UTF-16)
 * Status byte bits 0-5: language code length
 *
 * Accepts any array-like (number[], Uint8Array, plain objects) from the native bridge.
 */
export function decodeNdefText(bytes: ArrayLike<number>): string {
  // Normalise to a real Array so slice() is guaranteed at runtime
  const arr = Array.from(bytes);

  if (arr.length < 3) return '';

  const statusByte = arr[0];
  // Bit 7: 0 = UTF-8, 1 = UTF-16
  const isUtf16 = (statusByte & 0x80) !== 0;
  const langCodeLength = statusByte & 0x3f;
  const textStartIndex = 1 + langCodeLength;

  if (textStartIndex >= arr.length) return '';

  const textBytes = Uint8Array.from(arr.slice(textStartIndex));

  try {
    // TextDecoder handles multi-byte UTF-8 and UTF-16 correctly.
    // Hermes (RN 0.73+) and JSC both expose TextDecoder globally.
    return new TextDecoder(isUtf16 ? 'utf-16' : 'utf-8').decode(textBytes);
  } catch {
    // Fallback: join char codes — safe for ASCII-only cards
    return Array.from(textBytes)
      .map((b) => String.fromCharCode(b))
      .join('');
  }
}

/**
 * Convert tag ID byte array to hex string.
 * Accepts any array-like (number[], Uint8Array, plain objects) from the native bridge.
 */
export function tagIdToHex(id: ArrayLike<number>): string {
  // Normalise to a real Array so .map() is guaranteed at runtime.
  // Mask each value to 0xFF to guard against out-of-range bridge values.
  return Array.from(id)
    .map((byte) => (byte & 0xff).toString(16).padStart(2, '0'))
    .join(':');
}
