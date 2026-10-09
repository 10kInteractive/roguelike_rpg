import { deflateSync } from "node:zlib";
import type { Rgb } from "./pixel-image.types.ts";
import { crcTable, pngSignature } from "./png.constants.ts";

/**
 * A small opaque RGB image that encodes itself as a PNG.
 *
 * Enough for pixel-art placeholders: 8 bits per channel, no transparency, no
 * palette, and no row filters.
 */
export class PixelImage {
  /** Red, green, and blue for each pixel, row by row from the top. */
  private readonly pixels: Uint8Array;

  /**
   * @param width Columns.
   * @param height Rows.
   */
  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.pixels = new Uint8Array(width * height * 3);
  }

  /** Paints one pixel. Row 0 is the top. */
  set(x: number, y: number, color: Rgb): void {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) {
      throw new Error(`Pixel ${x}, ${y} is outside a ${this.width}×${this.height} image`);
    }
    this.pixels.set(color, (y * this.width + x) * 3);
  }

  /** The color at one pixel. */
  get(x: number, y: number): Rgb {
    const at = (y * this.width + x) * 3;
    return [this.pixels[at] ?? 0, this.pixels[at + 1] ?? 0, this.pixels[at + 2] ?? 0];
  }

  /** The whole image as PNG file bytes. */
  toPng(): Uint8Array {
    // Header: size, 8-bit depth, RGB color, default compression, filter, and no interlace.
    const header = new Uint8Array(13);
    const view = new DataView(header.buffer);
    view.setUint32(0, this.width);
    view.setUint32(4, this.height);
    header.set([8, 2, 0, 0, 0], 8);

    // Each row starts with filter byte 0, then its pixels.
    const rowBytes = this.width * 3;
    const raw = new Uint8Array((rowBytes + 1) * this.height);
    for (let y = 0; y < this.height; y++) {
      raw.set(this.pixels.subarray(y * rowBytes, (y + 1) * rowBytes), y * (rowBytes + 1) + 1);
    }

    return this.concat([
      pngSignature,
      this.chunk("IHDR", header),
      this.chunk("IDAT", deflateSync(raw)),
      this.chunk("IEND", new Uint8Array(0)),
    ]);
  }

  /** One PNG chunk: length, type, data, then the CRC of type and data. */
  private chunk(type: string, data: Uint8Array): Uint8Array {
    const typeBytes = new TextEncoder().encode(type);
    const out = new Uint8Array(12 + data.length);
    const view = new DataView(out.buffer);
    view.setUint32(0, data.length);
    out.set(typeBytes, 4);
    out.set(data, 8);
    view.setUint32(8 + data.length, this.crc(out.subarray(4, 8 + data.length)));
    return out;
  }

  /** CRC-32, the checksum PNG puts after every chunk. */
  private crc(bytes: Uint8Array): number {
    let c = 0xffffffff;
    for (const byte of bytes) c = (crcTable[(c ^ byte) & 0xff] ?? 0) ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  /** Joins byte arrays end to end. */
  private concat(parts: readonly Uint8Array[]): Uint8Array {
    const out = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
    let at = 0;
    for (const part of parts) {
      out.set(part, at);
      at += part.length;
    }
    return out;
  }
}
