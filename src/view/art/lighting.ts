import { DirectionalLight, HemisphereLight, type Scene } from "three";
import { groundBounceColor, skyColor, skyLightIntensity, sunLook } from "./lighting.constants";

/**
 * Lights a meadow scene: a sun from the southwest, high up, and a sky light that tints from above.
 *
 * @param scene The scene to light.
 * @param target The scene point the sun shines toward, on the ground.
 */
export function addSunAndSky(scene: Scene, target: { x: number; z: number }): void {
  const sun = new DirectionalLight(sunLook.color, sunLook.intensity);
  sun.position.set(target.x - sunLook.west, sunLook.up, target.z + sunLook.south);
  sun.target.position.set(target.x, 0, target.z);
  scene.add(sun, sun.target);
  scene.add(new HemisphereLight(skyColor, groundBounceColor, skyLightIntensity));
}
