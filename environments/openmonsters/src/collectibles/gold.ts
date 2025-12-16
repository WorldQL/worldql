import { value } from "@dreamlab/engine";
import InventoryBehavior from "../player/inventory.ts";
import { PlayerMoved } from "../player/movement.ts";
import TileAction from "../tiles/action.ts";

export default class DroppedGold extends TileAction {
  @value()
  gold = 1;

  public onTileEnter(ev: PlayerMoved): void {
    const inventory = ev.player.entity.getBehavior(InventoryBehavior);
    if (!inventory) return;

    inventory.gold += this.gold;
    this.gold = 0;

    this.entity.destroy();
  }
}
