import { Behavior, Entity, EntityRef, Tilemap, value } from "@dreamlab/engine";
import { Colors } from "../../lib/colors.ts";

export default class PlacedBomb extends Behavior {
  @value()
  fuseTicks: number = 60;

  @value({ type: EntityRef })
  tilemap: Entity | undefined;

  onTick(): void {
    if (!this.game.isServer()) return;
    if (this.fuseTicks > 0) {
      this.fuseTicks -= 1;
      return;
    }

    // fuse at 0
    const pos = this.entity.pos.floor();
    const tilemap = this.tilemap?.cast(Tilemap);
    if (!tilemap) throw new Error("missing tilemap");

    for (let x = pos.x - 1; x <= pos.x + 1; x++) {
      for (let y = pos.y - 1; y <= pos.y + 1; y++) {
        const tile = tilemap.getColor(x, y);
        if (tile === Colors.BombWall) tilemap.setColor(x, y, Colors.Grass);
      }
    }

    this.entity.destroy();
  }
}
