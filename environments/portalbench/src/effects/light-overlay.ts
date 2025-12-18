import {
  Behavior,
  BehaviorDestroyed,
  Entity,
  EntityRef,
  RawPixi,
  Tilemap,
  value,
} from "@dreamlab/engine";
import * as PIXI from "@dreamlab/vendor/pixi.ts";
import { Colors } from "../../lib/colors.ts";

export default class LightOverlay extends Behavior {
  @value({ type: EntityRef })
  tilemap: Entity | undefined;

  @value()
  rays: number = 360;

  @value()
  maxDistance: number = 8;

  #pixi = this.entity.cast(RawPixi);
  #overlay!: PIXI.Graphics;
  #mask!: PIXI.Graphics;

  #overlayCtx = new PIXI.GraphicsContext()
    .rect(-10000, -10000, 20000, 20000)
    .fill({ color: "black", alpha: 1 });

  onInitialize(): void {
    if (!this.game.isClient()) return;

    this.#mask = new PIXI.Graphics();
    this.#overlay = new PIXI.Graphics(this.#overlayCtx);
    this.#overlay.setMask({
      mask: this.#mask,
      inverse: true,
    });

    if (this.#pixi.container) {
      this.#pixi.container.addChild(this.#mask);
      this.#pixi.container.addChild(this.#overlay);
    }

    this.on(BehaviorDestroyed, () => {
      this.#overlay?.destroy();
      this.#overlayCtx?.destroy();
      this.#mask?.destroy();
    });
  }

  onFrame(): void {
    if (!this.game.isClient()) return;
    if (!this.entity.parent || !this.tilemap) return;

    this.#mask.clear();

    const playerPos = this.entity.parent.pos;
    const tilemapEntity = this.tilemap.cast(Tilemap);
    const rays = this.rays;

    const localX = playerPos.x - this.entity.pos.x;
    const localY = playerPos.y - this.entity.pos.y;

    this.#mask.moveTo(localX, -localY);

    for (let i = 0; i < rays + 1; i++) {
      const angle = (i / rays) * Math.PI * 2;
      const dirX = Math.cos(angle);
      const dirY = Math.sin(angle);

      const hitPoint = this.#castTilemapRay(
        playerPos.x,
        playerPos.y,
        dirX,
        dirY,
        this.maxDistance + 1,
        tilemapEntity
      );

      const hitLocalX = hitPoint.x - this.entity.pos.x;
      const hitLocalY = hitPoint.y - this.entity.pos.y;

      this.#mask.lineTo(hitLocalX, -hitLocalY);
    }

    this.#mask.lineTo(localX, -localY).fill("white");
  }

  #castTilemapRay(
    startX: number,
    startY: number,
    dirX: number,
    dirY: number,
    maxDist: number,
    tilemap: Tilemap
  ): { x: number; y: number } {
    let currentTileX = Math.round(startX);
    let currentTileY = Math.round(startY);

    const stepX = dirX > 0 ? 1 : -1;
    const stepY = dirY > 0 ? 1 : -1;

    const tMaxX =
      dirX !== 0
        ? ((dirX > 0 ? currentTileX + 0.5 : currentTileX - 0.5) - startX) / dirX
        : Infinity;
    const tMaxY =
      dirY !== 0
        ? ((dirY > 0 ? currentTileY + 0.5 : currentTileY - 0.5) - startY) / dirY
        : Infinity;

    const tDeltaX = dirX !== 0 ? Math.abs(1 / dirX) : Infinity;
    const tDeltaY = dirY !== 0 ? Math.abs(1 / dirY) : Infinity;

    let t = 0;
    let nextTMaxX = tMaxX;
    let nextTMaxY = tMaxY;

    while (t < maxDist) {
      const color = tilemap.getColor(currentTileX, currentTileY);

      if (
        color === Colors.Wall ||
        color === Colors.BombWall ||
        color === Colors.GreenDoor ||
        color === Colors.BlueDoor
      ) {
        const extendedT = t + 0.7;
        return {
          x: startX + dirX * extendedT,
          y: startY + dirY * extendedT,
        };
      }

      if (nextTMaxX < nextTMaxY) {
        currentTileX += stepX;
        t = nextTMaxX;
        nextTMaxX += tDeltaX;
      } else {
        currentTileY += stepY;
        t = nextTMaxY;
        nextTMaxY += tDeltaY;
      }
    }

    return {
      x: startX + dirX * maxDist,
      y: startY + dirY * maxDist,
    };
  }
}
