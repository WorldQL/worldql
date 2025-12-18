import { Behavior, Entity, EntityRef, Tilemap, value } from "@dreamlab/engine";
import { Colors } from "../../lib/colors.ts";
import { PlayerMoved } from "../player/movement.ts";

export default class ColorAction extends Behavior {
  @value({ type: EntityRef })
  tilemap: Entity | undefined;

  onInitialize(): void {
    const tilemap = this.tilemap?.cast(Tilemap);
    if (!tilemap) throw new Error("missing tilemap");

    this.listen(this.game, PlayerMoved, ev => {
      const tile = tilemap.getColor(ev.position.x, ev.position.y);
      if (tile === undefined) return;
      this.#onTile(tile, ev);
    });
  }

  #onTile(color: number, ev: PlayerMoved): void {
    switch (color) {
      case Colors.Water: {
        // Dark abyss - very slow or blocked
        ev.delay += 20;
        break;
      }

      case Colors.Sand: {
        // Stone floor (light) - normal speed
        break;
      }

      case Colors.Grass: {
        // Floor tiles (medium) - normal speed
        // Could add random encounters or traps here
        if (Math.random() > 0.8) {
          // console.log("random encounter!!");
        }
        break;
      }

      case Colors.Slowdown: {
        // Mud/tar - slows player down significantly
        ev.delay += 15;
        break;
      }
    }
  }
}
