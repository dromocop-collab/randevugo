/**
 * Bağımlılıksız küçük QR kod üreticisi (bayt modu, hata düzeltme M, sürüm 1–40).
 * Nayuki "QR Code generator" algoritmasının sadeleştirilmiş TypeScript uyarlamasıdır.
 * Saf modül: React/DOM yok, node --test ile test edilir.
 */

const ECC_CODEWORDS_PER_BLOCK_M = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28];
const NUM_ERROR_CORRECTION_BLOCKS_M = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49];
/** Format bilgisindeki M seviyesi kodu. */
const ECL_M_FORMAT_BITS = 0;

export interface QrMatrix {
  version: number;
  size: number;
  mask: number;
  /** modules[y][x] — true = koyu. */
  modules: boolean[][];
}

function getBit(value: number, index: number): boolean {
  return ((value >>> index) & 1) !== 0;
}

function numRawDataModules(version: number): number {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const numAlign = Math.floor(version / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

function numDataCodewords(version: number): number {
  return Math.floor(numRawDataModules(version) / 8) - ECC_CODEWORDS_PER_BLOCK_M[version]! * NUM_ERROR_CORRECTION_BLOCKS_M[version]!;
}

function gfMultiply(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}

function reedSolomonDivisor(degree: number): number[] {
  const result: number[] = new Array(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = gfMultiply(result[j]!, root);
      if (j + 1 < result.length) result[j]! ^= result[j + 1]!;
    }
    root = gfMultiply(root, 0x02);
  }
  return result;
}

function reedSolomonRemainder(data: readonly number[], divisor: readonly number[]): number[] {
  const result: number[] = divisor.map(() => 0);
  for (const byte of data) {
    const factor = byte ^ (result.shift() as number);
    result.push(0);
    divisor.forEach((coefficient, index) => {
      result[index]! ^= gfMultiply(coefficient, factor);
    });
  }
  return result;
}

function utf8Bytes(text: string): number[] {
  return Array.from(new TextEncoder().encode(text));
}

export function encodeQr(text: string): QrMatrix {
  const bytes = utf8Bytes(text);
  let version = 1;
  for (; version <= 40; version++) {
    const countBits = version <= 9 ? 8 : 16;
    const needed = 4 + countBits + bytes.length * 8;
    if (needed <= numDataCodewords(version) * 8) break;
  }
  if (version > 40) throw new RangeError("QR için metin çok uzun.");

  // Veri bitleri
  const bits: number[] = [];
  const append = (value: number, length: number) => {
    for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };
  append(0b0100, 4);
  append(bytes.length, version <= 9 ? 8 : 16);
  bytes.forEach((byte) => append(byte, 8));
  const capacityBits = numDataCodewords(version) * 8;
  append(0, Math.min(4, capacityBits - bits.length));
  append(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < capacityBits; pad ^= 0xec ^ 0x11) append(pad, 8);
  const dataCodewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let value = 0;
    for (let j = 0; j < 8; j++) value = (value << 1) | bits[i + j]!;
    dataCodewords.push(value);
  }

  // Hata düzeltme + serpiştirme
  const numBlocks = NUM_ERROR_CORRECTION_BLOCKS_M[version]!;
  const blockEccLen = ECC_CODEWORDS_PER_BLOCK_M[version]!;
  const rawCodewords = Math.floor(numRawDataModules(version) / 8);
  const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
  const shortBlockLen = Math.floor(rawCodewords / numBlocks);
  const divisor = reedSolomonDivisor(blockEccLen);
  const blocks: number[][] = [];
  for (let i = 0, k = 0; i < numBlocks; i++) {
    const data = dataCodewords.slice(k, k + shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1));
    k += data.length;
    const ecc = reedSolomonRemainder(data, divisor);
    if (i < numShortBlocks) data.push(0);
    blocks.push(data.concat(ecc));
  }
  const codewords: number[] = [];
  for (let i = 0; i < blocks[0]!.length; i++) {
    blocks.forEach((block, j) => {
      if (i !== shortBlockLen - blockEccLen || j >= numShortBlocks) codewords.push(block[i]!);
    });
  }

  // Matris
  const size = version * 4 + 17;
  const modules: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const setFunction = (x: number, y: number, dark: boolean) => {
    modules[y]![x] = dark;
    isFunction[y]![x] = true;
  };

  for (let i = 0; i < size; i++) {
    setFunction(6, i, i % 2 === 0);
    setFunction(i, 6, i % 2 === 0);
  }
  const drawFinder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < size && y >= 0 && y < size) setFunction(x, y, distance !== 2 && distance !== 4);
      }
    }
  };
  drawFinder(3, 3);
  drawFinder(size - 4, 3);
  drawFinder(3, size - 4);

  const alignment: number[] = [];
  if (version > 1) {
    const numAlign = Math.floor(version / 7) + 2;
    const step = version === 32 ? 26 : Math.ceil((version * 4 + 4) / (numAlign * 2 - 2)) * 2;
    alignment.push(6);
    for (let position = size - 7; alignment.length < numAlign; position -= step) alignment.splice(1, 0, position);
  }
  const lastAlign = alignment.length - 1;
  alignment.forEach((ax, i) => {
    alignment.forEach((ay, j) => {
      if ((i === 0 && j === 0) || (i === 0 && j === lastAlign) || (i === lastAlign && j === 0)) return;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) setFunction(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    });
  });

  const drawFormatBits = (mask: number) => {
    const data = (ECL_M_FORMAT_BITS << 3) | mask;
    let remainder = data;
    for (let i = 0; i < 10; i++) remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
    const formatBits = ((data << 10) | remainder) ^ 0x5412;
    for (let i = 0; i <= 5; i++) setFunction(8, i, getBit(formatBits, i));
    setFunction(8, 7, getBit(formatBits, 6));
    setFunction(8, 8, getBit(formatBits, 7));
    setFunction(7, 8, getBit(formatBits, 8));
    for (let i = 9; i < 15; i++) setFunction(14 - i, 8, getBit(formatBits, i));
    for (let i = 0; i < 8; i++) setFunction(size - 1 - i, 8, getBit(formatBits, i));
    for (let i = 8; i < 15; i++) setFunction(8, size - 15 + i, getBit(formatBits, i));
    setFunction(8, size - 8, true);
  };
  drawFormatBits(0);

  if (version >= 7) {
    let remainder = version;
    for (let i = 0; i < 12; i++) remainder = (remainder << 1) ^ ((remainder >>> 11) * 0x1f25);
    const versionBits = (version << 12) | remainder;
    for (let i = 0; i < 18; i++) {
      const bit = getBit(versionBits, i);
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      setFunction(a, b, bit);
      setFunction(b, a, bit);
    }
  }

  // Veri modülleri (zikzak)
  let bitIndex = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vertical = 0; vertical < size; vertical++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vertical : vertical;
        if (!isFunction[y]![x] && bitIndex < codewords.length * 8) {
          modules[y]![x] = getBit(codewords[bitIndex >>> 3]!, 7 - (bitIndex & 7));
          bitIndex++;
        }
      }
    }
  }

  const applyMask = (mask: number) => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (isFunction[y]![x]) continue;
        let invert: boolean;
        switch (mask) {
          case 0: invert = (x + y) % 2 === 0; break;
          case 1: invert = y % 2 === 0; break;
          case 2: invert = x % 3 === 0; break;
          case 3: invert = (x + y) % 3 === 0; break;
          case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
          case 5: invert = ((x * y) % 2) + ((x * y) % 3) === 0; break;
          case 6: invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
          default: invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0; break;
        }
        if (invert) modules[y]![x] = !modules[y]![x];
      }
    }
  };

  let bestMask = 0;
  let bestPenalty = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    applyMask(mask);
    drawFormatBits(mask);
    const penalty = penaltyScore(modules);
    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestMask = mask;
    }
    applyMask(mask); // geri al (XOR)
  }
  applyMask(bestMask);
  drawFormatBits(bestMask);

  return { version, size, mask: bestMask, modules };
}

/** ISO/IEC 18004 maske ceza puanı (kural 1–4). */
function penaltyScore(modules: boolean[][]): number {
  const size = modules.length;
  let penalty = 0;
  const lineRuns = (get: (i: number) => boolean) => {
    let score = 0;
    let runColor = get(0);
    let runLength = 1;
    for (let i = 1; i < size; i++) {
      const color = get(i);
      if (color === runColor) {
        runLength++;
        if (runLength === 5) score += 3;
        else if (runLength > 5) score += 1;
      } else {
        runColor = color;
        runLength = 1;
      }
    }
    return score;
  };
  const finderLike = (get: (i: number) => boolean) => {
    let score = 0;
    const pattern = [true, false, true, true, true, false, true];
    for (let i = 0; i + 7 <= size; i++) {
      if (!pattern.every((value, k) => get(i + k) === value)) continue;
      const lightBefore = i >= 4 && [1, 2, 3, 4].every((k) => !get(i - k));
      const lightAfter = i + 11 <= size && [7, 8, 9, 10].every((k) => !get(i + k));
      if (lightBefore || lightAfter) score += 40;
    }
    return score;
  };
  for (let y = 0; y < size; y++) {
    penalty += lineRuns((x) => modules[y]![x]!);
    penalty += finderLike((x) => modules[y]![x]!);
  }
  for (let x = 0; x < size; x++) {
    penalty += lineRuns((y) => modules[y]![x]!);
    penalty += finderLike((y) => modules[y]![x]!);
  }
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const color = modules[y]![x];
      if (color === modules[y]![x + 1] && color === modules[y + 1]![x] && color === modules[y + 1]![x + 1]) penalty += 3;
    }
  }
  let dark = 0;
  modules.forEach((row) => row.forEach((cell) => { if (cell) dark++; }));
  const total = size * size;
  const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
  penalty += Math.max(0, k) * 10;
  return penalty;
}

/** Satır başına koyu modül koşularını tek bir SVG path'e çevirir. */
export function qrSvgPath(matrix: QrMatrix): string {
  const parts: string[] = [];
  matrix.modules.forEach((row, y) => {
    let x = 0;
    while (x < matrix.size) {
      if (!row[x]) { x++; continue; }
      const start = x;
      while (x < matrix.size && row[x]) x++;
      parts.push(`M${start} ${y}h${x - start}v1h-${x - start}z`);
    }
  });
  return parts.join("");
}
