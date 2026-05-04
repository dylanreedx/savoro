const BASE32_ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";

export function encodeBase32LowerCaseNoPadding(data: Uint8Array): string {
  let result = "";
  let bits = 0;
  let buffer = 0;

  for (const byte of data) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      result += BASE32_ALPHABET[(buffer >> bits) & 0x1f];
    }
  }

  if (bits > 0) {
    result += BASE32_ALPHABET[(buffer << (5 - bits)) & 0x1f];
  }

  return result;
}
