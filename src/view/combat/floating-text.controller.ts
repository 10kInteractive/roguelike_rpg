import {
  CanvasTexture,
  NearestFilter,
  type Scene,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  type Vector3,
} from "three";
import { floatingTextLook } from "./floating-text.constants";
import type { TweenController } from "./tween.controller";

/**
 * Numbers and words that rise and fade over the fight: damage, heals, level-ups.
 *
 * Each one is a sprite drawn from a small canvas, so it always faces the
 * camera and needs no DOM. It removes itself when its tween ends.
 */
export class FloatingTextController {
  /** The scene the text appears in. */
  private readonly scene: Scene;

  /** Drives the rise and the fade. */
  private readonly tweens: TweenController;

  /**
   * @param scene The scene the text appears in.
   * @param tweens Drives the rise and the fade.
   */
  constructor(scene: Scene, tweens: TweenController) {
    this.scene = scene;
    this.tweens = tweens;
  }

  /**
   * Shows text above a point, rising and fading. Resolves when it is gone.
   *
   * @param text Such as `12` or `LV 3`.
   * @param at Scene point the text starts at.
   * @param color CSS color of the fill.
   */
  async show(text: string, at: Vector3, color: string): Promise<void> {
    const material = new SpriteMaterial({ map: this.draw(text, color), depthTest: false });
    const sprite = new Sprite(material);
    sprite.scale.set(floatingTextLook.size.width, floatingTextLook.size.height, 1);
    sprite.position.copy(at);
    sprite.renderOrder = 10;
    this.scene.add(sprite);

    await this.tweens.run(floatingTextLook.seconds, (progress) => {
      sprite.position.y = at.y + floatingTextLook.rise * (1 - (1 - progress) ** 2);
      material.opacity = progress < 0.6 ? 1 : 1 - (progress - 0.6) / 0.4;
    });

    this.scene.remove(sprite);
    material.map?.dispose();
    material.dispose();
  }

  /** The text drawn centered on a canvas with a dark outline. */
  private draw(text: string, color: string): CanvasTexture {
    const { width, height } = floatingTextLook.canvas;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (context) {
      context.font = floatingTextLook.font;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.lineWidth = floatingTextLook.outline;
      context.lineJoin = "round";
      context.strokeStyle = "#1a1a1a";
      context.strokeText(text, width / 2, height / 2);
      context.fillStyle = color;
      context.fillText(text, width / 2, height / 2);
    }
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.magFilter = NearestFilter;
    return texture;
  }
}
