import { Entity, EntityRef, value, Vector2, Vector2Adapter } from "@dreamlab/engine";
import { PlayerMoved } from "../player/movement.ts";
import TileAction from "./action.ts";

export default class TeleportTile extends TileAction {
  @value({ type: Vector2Adapter })
  destination: Vector2 = Vector2.ZERO;

  @value({ type: EntityRef })
  target: Entity | undefined;

  public onTileEnter(ev: PlayerMoved): void {
    const destination = this.target?.pos.floor() ?? this.destination;
    ev.teleport = destination;
  }
}
