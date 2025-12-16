import { value } from "@dreamlab/engine";
import InventoryBehavior from "../player/inventory.ts";
import { PlayerMoved } from "../player/movement.ts";
import TileAction from "../tiles/action.ts";

export default class CollectibleBomb extends TileAction {
  @value()
  count: number = 1;

  #collected = false;

  public onTileEnter(ev: PlayerMoved): void {
    if (this.#collected) return;

    const inventory = ev.player.entity.getBehavior(InventoryBehavior);
    if (!inventory) return;

    inventory.bombs += this.count;

    this.#collected = true;
  }

  public onTileExit(_: PlayerMoved): void {
    if (this.#collected) {
      this.game.time.waitForNextTick().then(() => {
        this.entity.destroy();
      });
    }
  }
}
