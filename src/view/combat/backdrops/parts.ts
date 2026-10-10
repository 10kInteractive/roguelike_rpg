import {
  BoxGeometry,
  Mesh,
  MeshLambertMaterial,
  PlaneGeometry,
  RepeatWrapping,
  type Texture,
} from "three";

/**
 * A tiled floor of one texture, or a flat color when the texture is missing.
 *
 * @param texture The floor texture. One repeat per tile.
 * @param fallback The color used when the texture is missing.
 * @param size Width and depth, in tiles.
 */
export function backdropFloor(texture: Texture | undefined, fallback: number, size: number): Mesh {
  const material = texture ? tiled(texture, size) : new MeshLambertMaterial({ color: fallback });
  return new Mesh(new PlaneGeometry(size, size).rotateX(-Math.PI / 2), material);
}

/**
 * A terrain texture as a material, or a flat color.
 *
 * @param texture The column texture.
 * @param fallback The color used when the texture is missing.
 */
export function backdropMaterial(
  texture: Texture | undefined,
  fallback: number,
): MeshLambertMaterial {
  return texture
    ? new MeshLambertMaterial({ map: texture })
    : new MeshLambertMaterial({ color: fallback });
}

/**
 * One column standing on the floor.
 *
 * @param x East of the stage center, in tiles.
 * @param z North is negative.
 * @param height How tall the column stands.
 * @param material Its texture or flat color.
 * @param name `tree` or `mountain`, so a test can tell the rows apart.
 */
export function backdropColumn(
  x: number,
  z: number,
  height: number,
  material: MeshLambertMaterial,
  name: string,
): Mesh {
  const column = new Mesh(new BoxGeometry(1, height, 1).translate(0, height / 2, 0), material);
  column.position.set(x, 0, z);
  column.name = name;
  return column;
}

/** The texture repeated once per tile, so the floor matches the meadow's scale. */
function tiled(texture: Texture, size: number): MeshLambertMaterial {
  const copy = texture.clone();
  copy.wrapS = RepeatWrapping;
  copy.wrapT = RepeatWrapping;
  copy.repeat.set(size, size);
  copy.needsUpdate = true;
  return new MeshLambertMaterial({ map: copy });
}
