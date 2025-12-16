import { Behavior, Vector2 } from "@dreamlab/engine";
import { PlayerMoved } from "../player/movement.ts";

export default class MonsterBehavior extends Behavior {
  get tilePos(): Vector2 {
    return this.entity.pos.floor();
  }

  onInitialize(): void {
    this.game.on(PlayerMoved, ev => {
      if (!this.tilePos.eq(ev.position)) return;

      // TODO: damage self based on player potency (if sword, *3 damage?)
      ev.cancelled = true;
      ev.actions.push({ id: "damage-entity", data: {} });
    });
  }
}
