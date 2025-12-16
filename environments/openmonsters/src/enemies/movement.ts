import {
  Behavior,
  Entity,
  EntityRef,
  IVector2,
  Tilemap,
  value,
  Vector2,
} from "@dreamlab/engine";
import { Colors } from "../../lib/colors.ts";
import { PlayerMoved } from "../player/movement.ts";

export const enemyRegistry: EnemyMovement[] = [];

export default class EnemyMovement extends Behavior {
  @value({ type: EntityRef })
  tilemap: Entity | undefined;

  #pos: Vector2 = this.entity.pos.floor();

  get pos() {
    return this.#pos.clone();
  }

  private path = [
    { x: 1, y: 0 }, // right
    { x: 1, y: 0 },
    { x: 1, y: 0 },

    { x: 0, y: 1 }, // down
    { x: 0, y: 1 },
    { x: 0, y: 1 },

    { x: -1, y: 0 }, // left
    { x: -1, y: 0 },
    { x: -1, y: 0 },

    { x: 0, y: -1 }, // up
    { x: 0, y: -1 },
    { x: 0, y: -1 },
  ];

  private index = 0;

  onInitialize(): void {
    this.game.on(PlayerMoved, ev => {
      const step = this.path[this.index];
      const newPos = { x: this.#pos.x + step.x, y: this.#pos.y + step.y };

      // Check if enemy is on the same tile as the player
      if (Vector2.eq(this.#pos, ev.position)) {
        ev.player.isDead = true;
      }

      // Only move if the new position is valid
      if (this.#isValidMove(newPos)) {
        this.entity.pos.x += step.x;
        this.entity.pos.y += step.y;
        this.#pos.assign(newPos);
      }

      this.index = (this.index + 1) % this.path.length; // loop forever

      if (Vector2.eq(this.#pos, ev.position)) {
        ev.player.isDead = true;
      }
    });
  }

  onDestroy(): void {
  }

  onTick(): void {
  }

  #isValidMove(pos: IVector2): boolean {
    const tilemap = this.tilemap?.cast(Tilemap);
    if (!tilemap) return false;

    const color = tilemap.getColor(pos.x, pos.y);

    // Block walls and doors
    return color !== Colors.Wall
      && color !== Colors.GreenDoor
      && color !== Colors.BlueDoor;
  }
}
