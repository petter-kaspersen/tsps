export function bigIntToByteArray(bigInt: bigint) {
  // Convert BigInt to hexadecimal string
  let hexString = bigInt.toString(16);

  // Pad the hexadecimal string if necessary
  if (hexString.length % 2 !== 0) {
    hexString = "0" + hexString;
  }

  // Convert hexadecimal string to byte array
  const byteArray: number[] = [];
  for (let i = 0; i < hexString.length; i += 2) {
    const byte = parseInt(hexString.substr(i, 2), 16);
    byteArray.push(byte);
  }

  return byteArray;
}
