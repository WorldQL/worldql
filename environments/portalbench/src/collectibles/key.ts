import { value } from "@dreamlab/engine";
import InventoryBehavior from "../player/inventory.ts";
import { PlayerMoved } from "../player/movement.ts";
import TileAction from "../tiles/action.ts";

export default class CollectibleKey extends TileAction {
  @value()
  keyColor: "green" | "blue" = "green";

  #collected = false;

  public onTileEnter(ev: PlayerMoved): void {
    if (this.#collected) return;

    const inventory = ev.player.entity.getBehavior(InventoryBehavior);
    if (!inventory) return;

    if (this.keyColor === "green") {
      inventory.greenKeys += 1;
    } else {
      inventory.blueKeys += 1;
    }

    this.#collected = true;
  }

  public onTileExit(ev: PlayerMoved): void {
    if (this.#collected) {
      this.entity.destroy();
    }
  }
}
