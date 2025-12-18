import { Behavior, Entity, EntityRef, Tilemap, value } from "@dreamlab/engine";
import { Colors } from "../../lib/colors.ts";
import InventoryBehavior from "../player/inventory.ts";
import { PlayerMoved } from "../player/movement.ts";

export default class DoorHandler extends Behavior {
  @value({ type: EntityRef })
  tilemap: Entity | undefined;

  onInitialize(): void {
    const tilemap = this.tilemap?.cast(Tilemap);
    if (!tilemap) throw new Error("missing tilemap");

    this.listen(this.game, PlayerMoved, ev => {
      const tile = tilemap.getColor(ev.position.x, ev.position.y);
      if (tile === undefined) return;

      if (tile === Colors.GreenDoor || tile === Colors.BlueDoor) {
        const inventory = ev.player.entity.getBehavior(InventoryBehavior);
        if (!inventory) {
          ev.cancelled = true;
          return;
        }

        const isGreenDoor = tile === Colors.GreenDoor;
        const hasKey = isGreenDoor ? inventory.greenKeys > 0 : inventory.blueKeys > 0;

        if (hasKey) {
          if (isGreenDoor) {
            inventory.greenKeys -= 1;
          } else {
            inventory.blueKeys -= 1;
          }

          tilemap.setColor(ev.position.x, ev.position.y, Colors.Grass);
        } else {
          ev.cancelled = true;
        }
      }
    });
  }
}
