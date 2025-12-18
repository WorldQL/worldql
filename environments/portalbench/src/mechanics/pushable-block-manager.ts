import {
  Behavior,
  Entity,
  EntityRef,
  type IVector2,
  Tilemap,
  value,
  Vector2,
} from "@dreamlab/engine";
import { Colors } from "../../lib/colors.ts";
import { PlayerMoved } from "../player/movement.ts";

export default class PushableBlockManager extends Behavior {
  @value({ type: EntityRef })
  tilemap: Entity | undefined;

  #lastPlayerPos: Map<string, Vector2> = new Map();
  #initialBlockPositions: Vector2[] = [];
  #goalPositions: Set<string> = new Set();

  public static instance: PushableBlockManager | undefined;

  public onInitialize() {
    PushableBlockManager.instance = this;

    const tilemap = this.tilemap?.cast(Tilemap);
    if (!tilemap) throw new Error("missing tilemap");

    this.#scanTilemap(tilemap);

    this.listen(this.game, PlayerMoved, ev => {
      const playerId = ev.player.entity.id;
      const to = ev.position;
      const from = this.#lastPlayerPos.get(playerId);

      this.#lastPlayerPos.set(playerId, new Vector2(to.x, to.y));

      if (!from) return;

      const blockColor = tilemap.getColor(to.x, to.y);
      if (blockColor !== Colors.PushableBlock && blockColor !== Colors.BlockOnGoal) return;

      const direction: IVector2 = {
        x: to.x - from.x,
        y: to.y - from.y,
      };

      const oppositePos: IVector2 = {
        x: to.x + direction.x,
        y: to.y + direction.y,
      };

      const fromKey = `${to.x},${to.y}`;
      const toKey = `${oppositePos.x},${oppositePos.y}`;

      const restoreColor = this.#goalPositions.has(fromKey) ? Colors.BlockGoal : Colors.Grass;
      tilemap.setColor(to.x, to.y, restoreColor);

      const newBlockColor = this.#goalPositions.has(toKey)
        ? Colors.BlockOnGoal
        : Colors.PushableBlock;
      tilemap.setColor(oppositePos.x, oppositePos.y, newBlockColor);
    });
  }

  #scanTilemap(tilemap: Tilemap) {
    const scanRange = 100;

    for (let y = -scanRange; y <= scanRange; y++) {
      for (let x = -scanRange; x <= scanRange; x++) {
        const color = tilemap.getColor(x, y);
        if (!color) continue; // Skip empty/null tiles

        if (color === Colors.PushableBlock || color === Colors.BlockOnGoal) {
          this.#initialBlockPositions.push(new Vector2(x, y));
        }

        if (color === Colors.BlockGoal || color === Colors.BlockOnGoal) {
          this.#goalPositions.add(`${x},${y}`);
        }
      }
    }
  }

  public isGoalPosition(x: number, y: number): boolean {
    return this.#goalPositions.has(`${x},${y}`);
  }

  public restart() {
    const tilemap = this.tilemap?.cast(Tilemap);
    if (!tilemap) throw new Error("missing tilemap");

    const scanRange = 100;
    for (let y = -scanRange; y <= scanRange; y++) {
      for (let x = -scanRange; x <= scanRange; x++) {
        const color = tilemap.getColor(x, y);
        if (color === Colors.PushableBlock || color === Colors.BlockOnGoal) {
          const key = `${x},${y}`;
          const restoreColor = this.#goalPositions.has(key) ? Colors.BlockGoal : Colors.Grass;
          tilemap.setColor(x, y, restoreColor);
        }
      }
    }

    for (const pos of this.#initialBlockPositions) {
      const key = `${pos.x},${pos.y}`;
      const blockColor = this.#goalPositions.has(key)
        ? Colors.BlockOnGoal
        : Colors.PushableBlock;
      tilemap.setColor(pos.x, pos.y, blockColor);
    }

    this.#lastPlayerPos.clear();
  }
}
