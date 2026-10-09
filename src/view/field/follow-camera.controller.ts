import { type Camera, Vector3, type Vector3Like } from "three";
import { followOffset, followRate } from "./follow-camera.constants";

/**
 * A 3/4 camera that trails a point in the scene, usually the hero's feet.
 *
 * The camera sits a fixed offset up and to the south of the point it aims at.
 * That aim point eases toward the target, so small steps and terrain height
 * changes glide instead of jerk. The easing is exponential, so the result
 * is the same whatever the frame rate.
 */
export class FollowCameraController {
  /** The camera this controller moves. */
  private readonly camera: Camera;

  /** The scene point the camera looks at now. */
  private readonly aim = new Vector3();

  /** @param camera The camera to move. */
  constructor(camera: Camera) {
    this.camera = camera;
  }

  /** Jumps straight to a target, with no easing. Use it when the scene first appears. */
  snapTo(target: Vector3Like): void {
    this.aim.copy(target);
    this.place();
  }

  /**
   * Eases toward a target for one display frame.
   *
   * @param target The scene point to keep in view.
   * @param elapsedSeconds Time since the last frame.
   */
  follow(target: Vector3Like, elapsedSeconds: number): void {
    const closed = 1 - Math.exp(-followRate * elapsedSeconds);
    this.aim.lerp(target, closed);
    this.place();
  }

  /** The scene point the camera looks at now. */
  aimPoint(): Vector3 {
    return this.aim.clone();
  }

  /** Puts the camera at its offset from the aim point, looking at it. */
  private place(): void {
    // South is +z in the scene, so the camera looks north across the meadow.
    this.camera.position.set(
      this.aim.x,
      this.aim.y + followOffset.up,
      this.aim.z + followOffset.south,
    );
    this.camera.lookAt(this.aim);
  }
}
