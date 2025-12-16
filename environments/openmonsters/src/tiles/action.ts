import { Behavior, EntityDestroyed, IVector2, value, Vector2 } from "@dreamlab/engine";
import { PlayerMoved } from "../player/movement.ts";
import TileActionManager from "./action-manager.ts";

export default class TileAction extends Behavior {
  @value()
  debug: boolean = false;

  get tilePos(): IVector2 {
    return this.entity.pos.round();
  }

  onInitialize(): void {
    if (!this.game.isServer()) return;
    if (!this.debug) {
      // disable any children used for editor visibility
      for (const child of this.entity.children.values()) {
        // child.enabled = false;
      }
    }

    this.entity.pos = this.entity.pos.round();

    // Register this tile action with the managert

    this.game.time.waitForNextTick().then(() => {
      const manager = TileActionManager.instance;
      if (manager) {
        const pos = this.tilePos;
        manager.register(pos.x, pos.y, this);
      }
    });

    this.listen(this.entity, EntityDestroyed, () => {
      const manager = TileActionManager.instance;
      if (manager) {
        const pos = this.tilePos;
        manager.remove(pos.x, pos.y);
      }
    });

    this.listen(this.game, PlayerMoved, ev => {
      const inTile = Vector2.eq(ev.position, this.tilePos);
      if (!this.#inTile && inTile) this.onTileEnter(ev);
      else if (this.#inTile && !inTile) this.onTileExit(ev);

      this.#inTile = inTile;
    });
  }

  onDestroy(): void {
    // Unregister from the manager when destroyed
    const manager = TileActionManager.instance;
    if (manager) {
      const pos = this.tilePos;
      manager.remove(pos.x, pos.y);
    }
  }

  #inTile: boolean = false;

  // deno-lint-ignore no-unused-vars
  public onTileEnter(ev: PlayerMoved): void {
    // implemented in child classes
  }

  // deno-lint-ignore no-unused-vars
  public onTileExit(ev: PlayerMoved): void {
    // implemented in child classes
  }
}
