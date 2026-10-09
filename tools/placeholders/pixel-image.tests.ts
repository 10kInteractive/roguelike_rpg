import { inflateSync } from "node:zlib";
import { expect, test } from "vitest";
import { PixelImage } from "./pixel-image.controller.ts";
import { pngSignature } from "./png.constants.ts";

/** The chunks of a PNG file, by type. */
function chunks(png: Uint8Array): Map<string, Uint8Array> {
  const found = new Map<string, Uint8Array>();
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  let at = pngSignature.length;
  while (at < png.length) {
    const length = view.getUint32(at);
    const type = new TextDecoder().decode(png.subarray(at + 4, at + 8));
    found.set(type, png.subarray(at + 8, at + 8 + length));
    at += 12 + length;
  }
  return found;
}

test("a PNG starts with the signature and records its size", () => {
  const png = new PixelImage(3, 2).toPng();
  expect(png.subarray(0, 8)).toEqual(pngSignature);
  const header = chunks(png).get("IHDR");
  if (!header) throw new Error("no IHDR chunk");
  const view = new DataView(header.buffer, header.byteOffset);
  expect([view.getUint32(0), view.getUint32(4)]).toEqual([3, 2]);
});

test("the pixel data decodes back to the painted colors", () => {
  const image = new PixelImage(2, 2);
  image.set(0, 0, [255, 0, 0]);
  image.set(1, 1, [0, 0, 255]);
  const data = chunks(image.toPng()).get("IDAT");
  if (!data) throw new Error("no IDAT chunk");
  const rows = inflateSync(data);
  // Each row is a filter byte, then two RGB pixels.
  expect([...rows]).toEqual([0, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255]);
});

test("painting outside the image fails", () => {
  expect(() => new PixelImage(2, 2).set(2, 0, [0, 0, 0])).toThrow();
});
