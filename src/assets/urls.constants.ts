/**
 * Every image under `/assets`, by its path from the project root, mapped to the URL it is served at.
 *
 * Vite resolves these at build time, so production builds copy each file into
 * `dist/` with a hashed name. A manifest file that is not here is not in the build.
 */
const imageUrls = import.meta.glob<string>("/assets/**/*.png", {
  query: "?url",
  import: "default",
  eager: true,
});

/** Built URL for each asset file, keyed as the manifest writes it: `assets/generated/x.png`. */
export const bundledAssetUrls: ReadonlyMap<string, string> = new Map(
  Object.entries(imageUrls).map(([path, url]) => [path.replace(/^\//, ""), url]),
);
