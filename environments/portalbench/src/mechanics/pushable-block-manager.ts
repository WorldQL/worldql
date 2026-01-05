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

const PORTAL_PAIRS = [
  [Colors.BluePortal, Colors.OrangePortal], // Player 1
  [0xff00ff, 0x00ffff], // Player 2: Magenta/Cyan
  [0xffff00, 0x00ff00], // Player 3: Yellow/Lime
  [0xff0080, 0x0080ff], // Player 4: Pink/Sky Blue
];

type GoalType = "neutral" | "green" | "blue";

export default class PushableBlockManager extends Behavior {
  @value({ type: EntityRef })
  tilemap: Entity | undefined;

  #lastPlayerPos: Map<string, Vector2> = new Map();
  #initialBlockPositions: Vector2[] = [];
  #goalPositions: Set<string> = new Set();
  #goalTypes: Map<string, GoalType> = new Map();
  #doorPositions: Map<string, number> = new Map();
  #playersOnGoals: Map<string, Set<string>> = new Map();

  public static instance: PushableBlockManager | undefined;

  public onInitialize() {
    PushableBlockManager.instance = this;

    const tilemap = this.tilemap?.cast(Tilemap);
    if (!tilemap) throw new Error("missing tilemap");

    this.#scanTilemap(tilemap);

    this.listen(this.game, PlayerMoved, (ev: PlayerMoved) => {
      const playerId = ev.player.entity.id;
      const to = ev.position;
      const from = this.#lastPlayerPos.get(playerId);

      if (!from) {
        const finalPos = ev.teleport || to;
        this.#lastPlayerPos.set(playerId, new Vector2(finalPos.x, finalPos.y));
        return;
      }

      const blockColor = tilemap.getColor(to.x, to.y);
      if (
        blockColor !== Colors.PushableBlock &&
        blockColor !== Colors.BlockOnGoal &&
        blockColor !== Colors.BlockOnGoalGreen &&
        blockColor !== Colors.BlockOnGoalBlue
      ) {
        const finalPos = ev.teleport || to;
        this.#lastPlayerPos.set(playerId, new Vector2(finalPos.x, finalPos.y));
        return;
      }

      const direction: IVector2 = {
        x: to.x - from.x,
        y: to.y - from.y,
      };

      const oppositePos: IVector2 = {
        x: to.x + direction.x,
        y: to.y + direction.y,
      };

      const fromKey = `${to.x},${to.y}`;
      const fromGoalType = this.#goalTypes.get(fromKey) || "neutral";

      const restoreColor = this.#goalPositions.has(fromKey)
        ? this.#getGoalColor(fromGoalType)
        : Colors.Grass;
      tilemap.setColor(to.x, to.y, restoreColor);

      if (fromGoalType !== "neutral") {
        this.#toggleDoors(tilemap, fromGoalType);
      }

      const targetTileColor = tilemap.getColor(oppositePos.x, oppositePos.y);
      const pairedPortalColor = this.#getPairedPortalColor(targetTileColor);

      let finalBlockPos = oppositePos;

      if (pairedPortalColor !== undefined) {
        const pairedPortalPos = this.#findPortalPosition(
          tilemap,
          pairedPortalColor
        );
        if (pairedPortalPos) {
          const validPos = this.#findValidPlacementNearPortal(
            tilemap,
            pairedPortalPos
          );
          if (validPos) {
            finalBlockPos = validPos;
          }
        }
      }

      const finalKey = `${finalBlockPos.x},${finalBlockPos.y}`;
      const toGoalType = this.#goalTypes.get(finalKey) || "neutral";

      const newBlockColor = this.#goalPositions.has(finalKey)
        ? this.#getBlockOnGoalColor(toGoalType)
        : Colors.PushableBlock;
      tilemap.setColor(finalBlockPos.x, finalBlockPos.y, newBlockColor);

      if (toGoalType !== "neutral") {
        this.#toggleDoors(tilemap, toGoalType);
      }

      const finalPlayerPos = ev.teleport || to;
      this.#lastPlayerPos.set(
        playerId,
        new Vector2(finalPlayerPos.x, finalPlayerPos.y)
      );
    });
  }

  #scanTilemap(tilemap: Tilemap) {
    const scanRange = 100;

    for (let y = -scanRange; y <= scanRange; y++) {
      for (let x = -scanRange; x <= scanRange; x++) {
        const color = tilemap.getColor(x, y);
        if (!color) continue;

        if (
          color === Colors.PushableBlock ||
          color === Colors.BlockOnGoal ||
          color === Colors.BlockOnGoalGreen ||
          color === Colors.BlockOnGoalBlue
        ) {
          this.#initialBlockPositions.push(new Vector2(x, y));
        }

        const key = `${x},${y}`;
        if (color === Colors.BlockGoal || color === Colors.BlockOnGoal) {
          this.#goalPositions.add(key);
          this.#goalTypes.set(key, "neutral");
        } else if (
          color === Colors.BlockGoalGreen ||
          color === Colors.BlockOnGoalGreen
        ) {
          this.#goalPositions.add(key);
          this.#goalTypes.set(key, "green");
        } else if (
          color === Colors.BlockGoalBlue ||
          color === Colors.BlockOnGoalBlue
        ) {
          this.#goalPositions.add(key);
          this.#goalTypes.set(key, "blue");
        }

        if (color === Colors.GreenDoor || color === Colors.BlueDoor) {
          this.#doorPositions.set(key, color);
        }
      }
    }
  }

  public isGoalPosition(x: number, y: number): boolean {
    return this.#goalPositions.has(`${x},${y}`);
  }

  public handlePlayerPositionChange(
    playerId: string,
    oldPos: IVector2,
    newPos: IVector2
  ): void {
    const tilemap = this.tilemap?.cast(Tilemap);
    if (!tilemap) return;

    const oldKey = `${Math.floor(oldPos.x)},${Math.floor(oldPos.y)}`;
    const newKey = `${Math.floor(newPos.x)},${Math.floor(newPos.y)}`;

    if (oldKey === newKey) return;

    const newGoalType = this.#goalTypes.get(newKey);
    if (newGoalType && newGoalType !== "neutral") {
      let playersOnGoal = this.#playersOnGoals.get(newKey);
      if (!playersOnGoal) {
        playersOnGoal = new Set();
        this.#playersOnGoals.set(newKey, playersOnGoal);
      }

      if (playersOnGoal.size === 0) {
        this.#toggleDoors(tilemap, newGoalType);
      }
      playersOnGoal.add(playerId);
    }

    const oldGoalType = this.#goalTypes.get(oldKey);
    if (oldGoalType && oldGoalType !== "neutral") {
      const playersOnGoal = this.#playersOnGoals.get(oldKey);
      if (playersOnGoal && playersOnGoal.has(playerId)) {
        playersOnGoal.delete(playerId);
        if (playersOnGoal.size === 0) {
          this.#toggleDoors(tilemap, oldGoalType);
        }
      }
    }
  }

  #getGoalColor(goalType: GoalType): number {
    switch (goalType) {
      case "green":
        return Colors.BlockGoalGreen;
      case "blue":
        return Colors.BlockGoalBlue;
      default:
        return Colors.BlockGoal;
    }
  }

  #getBlockOnGoalColor(goalType: GoalType): number {
    switch (goalType) {
      case "green":
        return Colors.BlockOnGoalGreen;
      case "blue":
        return Colors.BlockOnGoalBlue;
      default:
        return Colors.BlockOnGoal;
    }
  }

  #toggleDoors(tilemap: Tilemap, goalType: GoalType): void {
    if (goalType === "neutral") return;

    const doorColor =
      goalType === "green" ? Colors.GreenDoor : Colors.BlueDoor;

    for (const [posKey, storedDoorColor] of this.#doorPositions.entries()) {
      if (storedDoorColor !== doorColor) continue;

      const [x, y] = posKey.split(",").map(Number);
      const currentColor = tilemap.getColor(x, y);

      if (currentColor === doorColor) {
        tilemap.setColor(x, y, Colors.Grass);
      } else if (currentColor === Colors.Grass) {
        tilemap.setColor(x, y, doorColor);
      }
    }
  }

  public restart() {
    const tilemap = this.tilemap?.cast(Tilemap);
    if (!tilemap) throw new Error("missing tilemap");

    const scanRange = 100;
    for (let y = -scanRange; y <= scanRange; y++) {
      for (let x = -scanRange; x <= scanRange; x++) {
        const color = tilemap.getColor(x, y);
        if (
          color === Colors.PushableBlock ||
          color === Colors.BlockOnGoal ||
          color === Colors.BlockOnGoalGreen ||
          color === Colors.BlockOnGoalBlue
        ) {
          const key = `${x},${y}`;
          const goalType = this.#goalTypes.get(key) || "neutral";
          const restoreColor = this.#goalPositions.has(key)
            ? this.#getGoalColor(goalType)
            : Colors.Grass;
          tilemap.setColor(x, y, restoreColor);
        }
      }
    }

    for (const [posKey, doorColor] of this.#doorPositions.entries()) {
      const [x, y] = posKey.split(",").map(Number);
      tilemap.setColor(x, y, doorColor);
    }

    for (const pos of this.#initialBlockPositions) {
      const key = `${pos.x},${pos.y}`;
      const goalType = this.#goalTypes.get(key) || "neutral";
      const blockColor = this.#goalPositions.has(key)
        ? this.#getBlockOnGoalColor(goalType)
        : Colors.PushableBlock;
      tilemap.setColor(pos.x, pos.y, blockColor);
    }

    this.#lastPlayerPos.clear();
    this.#playersOnGoals.clear();
  }

  #getPairedPortalColor(color: number): number | undefined {
    for (const [color1, color2] of PORTAL_PAIRS) {
      if (color === color1) return color2;
      if (color === color2) return color1;
    }
    return undefined;
  }

  #findPortalPosition(
    tilemap: Tilemap,
    portalColor: number
  ): IVector2 | undefined {
    const scanRange = 100;
    for (let y = -scanRange; y <= scanRange; y++) {
      for (let x = -scanRange; x <= scanRange; x++) {
        if (tilemap.getColor(x, y) === portalColor) {
          return { x, y };
        }
      }
    }
    return undefined;
  }

  #isValidPlacement(color: number): boolean {
    return (
      color === Colors.Grass ||
      color === Colors.Sand ||
      color === Colors.BlockGoal
    );
  }

  #isWall(color: number): boolean {
    return (
      color === Colors.Wall ||
      color === Colors.BombWall ||
      color === Colors.GlassWall
    );
  }

  #hasAdjacentWall(tilemap: Tilemap, pos: IVector2): boolean {
    const adjacent = [
      { x: pos.x + 1, y: pos.y },
      { x: pos.x - 1, y: pos.y },
      { x: pos.x, y: pos.y + 1 },
      { x: pos.x, y: pos.y - 1 },
    ];

    for (const adjPos of adjacent) {
      const color = tilemap.getColor(adjPos.x, adjPos.y);
      if (this.#isWall(color)) {
        return true;
      }
    }

    return false;
  }

  #findValidPlacementNearPortal(
    tilemap: Tilemap,
    portalPos: IVector2
  ): IVector2 | undefined {
    const cardinalAdjacent = [
      { x: portalPos.x + 1, y: portalPos.y },
      { x: portalPos.x - 1, y: portalPos.y },
      { x: portalPos.x, y: portalPos.y + 1 },
      { x: portalPos.x, y: portalPos.y - 1 },
    ];

    for (const pos of cardinalAdjacent) {
      const color = tilemap.getColor(pos.x, pos.y);
      if (
        this.#isValidPlacement(color) &&
        !this.#hasAdjacentWall(tilemap, pos)
      ) {
        return pos;
      }
    }

    const diagonalAdjacent = [
      { x: portalPos.x + 1, y: portalPos.y + 1 },
      { x: portalPos.x - 1, y: portalPos.y + 1 },
      { x: portalPos.x + 1, y: portalPos.y - 1 },
      { x: portalPos.x - 1, y: portalPos.y - 1 },
    ];

    for (const pos of diagonalAdjacent) {
      const color = tilemap.getColor(pos.x, pos.y);
      if (
        this.#isValidPlacement(color) &&
        !this.#hasAdjacentWall(tilemap, pos)
      ) {
        return pos;
      }
    }

    return undefined;
  }
}
