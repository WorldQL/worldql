import {
  Behavior,
  Entity,
  EntityRef,
  IVector2,
  JsonValue,
  LocalRoot,
  rpc,
  Tilemap,
  value,
  Vector2,
} from "@dreamlab/engine";
import { Colors } from "../../lib/colors.ts";
import CollectibleBomb from "../collectibles/bomb.ts";
import PlacedBomb from "../mechanics/placed-bomb.ts";
import PushableBlockManager from "../mechanics/pushable-block-manager.ts";
import TileActionManager from "../tiles/action-manager.ts";
import InventoryBehavior from "./inventory.ts";
import PlayerMetrics from "./metrics.ts";

type Action = { id: string; data: JsonValue };

export class PlayerMoved {
  public cancelled: boolean = false;
  public delay: number = 0;
  public teleport: IVector2 | undefined = undefined;
  public actions: Action[] = [];

  public constructor(
    public readonly player: PlayerMovement,
    public readonly position: IVector2
  ) {}
}

type Move =
  | { t: "move"; x: -1 | 0 | 1; y: -1 | 0 | 1 }
  | { t: "place-bomb"; x: number; y: number };

export default class PlayerMovement extends Behavior {
  #up = this.inputs.create("@player/up", "Move Up", "KeyW");
  #down = this.inputs.create("@player/down", "Move Down", "KeyS");
  #left = this.inputs.create("@player/left", "Move Left", "KeyA");
  #right = this.inputs.create("@player/right", "Move Right", "KeyD");
  #place = this.inputs.create("@player/place", "Place Bomb", "Space");
  #restart = this.inputs.create("@player/restart", "Restart Level", "KeyR");

  @value()
  moveCooldownTicks: number = 10;

  @value()
  isDead = false;

  @value({ type: EntityRef })
  bombPrefab: Entity | undefined;

  // store a real position on the int grid
  // entity transform is smoothed
  #pos: Vector2 = this.entity.pos.floor();
  get pos() {
    return this.#pos.clone();
  }

  #moveQueue: Move[] = [];
  @rpc.server()
  #queueMove(move: Move) {
    this.#moveQueue.push(move);
  }

  @rpc.server()
  requestTeleport(x: number, y: number) {
    this.teleportTo(new Vector2(x, y));
  }

  onTickServer(): void {
    this.entity.pos.assign(
      Vector2.smoothLerp(this.entity.pos, this.#pos, 0.03, this.time.delta)
    );

    if (this.#moveTicks > 0) {
      this.#moveTicks -= 1;
      return;
    }

    const move = this.#moveQueue.shift();
    if (move === undefined) return;
    if (move.t === "move") {
      const newPos = this.checkMove(move.x, move.y);
      if (!newPos) return;
      this.moveTo(newPos);
    } else if (move.t === "place-bomb") {
      if (!this.bombPrefab) throw new Error("missing bomb prefab");
      const inventory = this.entity.getBehavior(InventoryBehavior);
      if (inventory.bombs === 0) return;
      inventory.bombs -= 1;

      this.bombPrefab.cloneInto(this.game.world, {
        transform: { position: this.#pos, z: 20 },
      });
    }
  }

  onTick(): void {
    const isLocal =
      this.game.isClient() && this.entity.root instanceof LocalRoot;
    if (!(isLocal || this.hasAuthority())) return;

    if (this.game.isClient()) {
      if (this.#restart.pressed) {
        this.#handleRestart();
      }
      this.#tryQueueMoveThisTick();
    }
  }

  @rpc.server()
  #handleRestart() {
    const blockManager = PushableBlockManager.instance;
    if (blockManager) {
      blockManager.restart();
    }
  }

  #moveTicks: number = 0;
  #clientCooldown: number = 0;

  #tryQueueMoveThisTick() {
    const inventory = this.entity.getBehavior(InventoryBehavior);

    if (this.#clientCooldown > 0) {
      this.#clientCooldown--;
      return;
    }

    if (this.#place.pressed && inventory.bombs > 0) {
      this.#queueMove({ t: "place-bomb", x: this.#pos.x, y: this.#pos.y });
      this.#clientCooldown = this.moveCooldownTicks;
      return;
    }

    const x = (-this.#left.held + +this.#right.held) as -1 | 0 | 1;
    const y = (-this.#down.held + +this.#up.held) as -1 | 0 | 1;
    if (x === 0 && y === 0) return;

    this.#queueMove({ t: "move", x, y });
    this.#clientCooldown = this.moveCooldownTicks;
  }

  checkMove(x: -1 | 0 | 1, y: -1 | 0 | 1): Vector2 | undefined {
    const newPos = this.#pos.add({ x, y });
    const valid = this.#tileCheck(newPos);
    const canPush = this.#canPushBlock(newPos, { x, y });

    if (x === 0 || y === 0) {
      if (!valid || !canPush) return undefined;
      return newPos;
    }

    const cx = Vector2.add(this.#pos, { x, y: 0 });
    const cy = Vector2.add(this.#pos, { x: 0, y });
    const cxValid = this.#tileCheck(cx);
    const cyValid = this.#tileCheck(cy);
    const cxCanPush = this.#canPushBlock(cx, { x, y: 0 });
    const cyCanPush = this.#canPushBlock(cy, { x: 0, y });
    if (valid && cxValid && cyValid && canPush && cxCanPush && cyCanPush) {
      return newPos;
    } else if (!cxValid && cyValid && cyCanPush) {
      return cy;
    } else if (cxValid && !cyValid && cxCanPush) {
      return cx;
    } else {
      return undefined;
    }
  }

  canMoveYet(): boolean {
    return this.moveCooldownTicks === 0 || this.#moveTicks === 0;
  }

  moveTo(newPos: Vector2): { success: boolean; actions?: Action[] } {
    // Puppet players (API-controlled) skip cooldown
    const isPuppet = this.entity.authority === "server";

    if (!isPuppet && !this.canMoveYet()) return { success: false };

    if (!isPuppet) {
      this.#moveTicks += this.moveCooldownTicks;
    }

    const signal = this.game.fire(PlayerMoved, this, newPos);
    if (signal.cancelled) return { success: false };

    if (!isPuppet) {
      this.#moveTicks += signal.delay;
    }

    if (signal.teleport) this.teleportTo(new Vector2(signal.teleport));
    else this.#pos.assign(newPos);

    const metrics = this.entity.getBehavior(PlayerMetrics);
    if (metrics) {
      metrics.recordMove();
    }

    this.vision();

    return { success: true, actions: signal.actions };
  }

  placeBomb(): { success: boolean; error?: string } {
    // Puppet players (API-controlled) skip cooldown
    const isPuppet = this.entity.authority === "server";

    if (!isPuppet && !this.canMoveYet())
      return { success: false, error: "can't place yet!" };

    if (!this.bombPrefab)
      return { success: false, error: "missing bomb prefab" };

    const inventory = this.entity.getBehavior(InventoryBehavior);
    if (inventory.bombs === 0)
      return { success: false, error: "no bombs available" };

    inventory.bombs -= 1;
    this.bombPrefab.cloneInto(this.game.world, {
      transform: { position: this.#pos, z: 20 },
    });

    if (!isPuppet) {
      this.#moveTicks += this.moveCooldownTicks;
    }

    return { success: true };
  }

  teleportTo(position: Vector2): void {
    this.#pos.assign(position.floor());
    this.entity.setTransform({ position: this.#pos });
  }

  @value({ type: EntityRef })
  tilemap: Tilemap | undefined;

  #tileCheck(tile: IVector2): boolean {
    const tilemap = this.tilemap as Tilemap;
    const color = tilemap.getColor(tile.x, tile.y);
    return (
      color !== Colors.Wall &&
      color !== Colors.BombWall &&
      color !== Colors.GlassWall
    );
  }

  #canPushBlock(tile: IVector2, direction: IVector2): boolean {
    const tilemap = this.tilemap as Tilemap;
    const color = tilemap.getColor(tile.x, tile.y);

    if (color !== Colors.PushableBlock && color !== Colors.BlockOnGoal)
      return true;

    const oppositePos: IVector2 = {
      x: tile.x + direction.x,
      y: tile.y + direction.y,
    };

    const oppositeColor = tilemap.getColor(oppositePos.x, oppositePos.y);
    return (
      oppositeColor !== Colors.Wall &&
      oppositeColor !== Colors.BombWall &&
      oppositeColor !== Colors.GlassWall &&
      oppositeColor !== Colors.PushableBlock &&
      oppositeColor !== Colors.BlockOnGoal
    );
  }

  vision() {
    const grid: Record<string, number> = {};
    const visited = new Set<string>();

    const start = this.pos;

    const keyOf = (x: number, y: number) => `${x},${y}`;
    const queue: { x: number; y: number }[] = [start];

    while (queue.length > 0) {
      const { x, y } = queue.shift()!;
      const key = keyOf(x, y);
      if (visited.has(key)) continue;
      visited.add(key);

      const tile = this.tilemap!.getColor(x, y);
      if (!tile) continue; // wall

      grid[key] = tile;

      const neighbors = [
        { x: x + 1, y },
        { x: x - 1, y },
        { x, y: y + 1 },
        { x, y: y - 1 },
      ];

      for (const n of neighbors) {
        const nKey = keyOf(n.x, n.y);
        if (!visited.has(nKey)) queue.push(n);
      }
    }

    const colorSymbols: Record<number, string> = {
      [Colors.Grass]: "F", // floor
      [Colors.Wall]: "W", // wall
      [Colors.GreenDoor]: "G", // green door
      [Colors.BlueDoor]: "B", // blue door
      [Colors.BombWall]: "X", // bombable wall
      [Colors.PushableBlock]: "P", // pushable block
      [Colors.BlockGoal]: "O", // block goal (empty)
      [Colors.BlockOnGoal]: "p", // block on goal
      [Colors.BluePortal]: "1", // blue portal
      [Colors.OrangePortal]: "2", // orange portal
      [0xff00ff]: "3", // magenta portal
      [0x00ffff]: "4", // cyan portal
      [0xffff00]: "5", // yellow portal
      [0x00ff00]: "6", // lime portal
      [0xff0080]: "7", // pink portal
      [0x0080ff]: "8", // sky blue portal
    };

    const objMap: Record<string, string> = {
      BlueKey: "#",
      GreenKey: "%",
      Win: "!",
      Bomb: "b",
    };

    const manager = TileActionManager.instance;
    if (!manager) return;

    const coords = Object.keys(grid).map((k) => {
      const [x, y] = k.split(",").map(Number);
      return { x, y };
    });

    const minX = Math.min(...coords.map((c) => c.x));
    const maxX = Math.max(...coords.map((c) => c.x));
    const minY = Math.min(...coords.map((c) => c.y));
    const maxY = Math.max(...coords.map((c) => c.y));

    const bombs = this.game.world.entities.lookupByBehavior(PlacedBomb);
    const bombPositions: Record<string, Entity> = {};
    for (const b of bombs) {
      bombPositions[keyOf(b.pos.x, b.pos.y)] = b;
    }

    const collectibles =
      this.game.world.entities.lookupByBehavior(CollectibleBomb);
    const collectiblePositions: Record<string, Entity> = {};
    for (const c of collectibles) {
      collectiblePositions[keyOf(c.pos.x, c.pos.y)] = c;
    }

    const rows: string[] = [];
    let playerGridX = 0;
    let playerGridY = 0;
    const goals: { x: number; y: number }[] = [];

    let rowIndex = 0;

    for (let y = maxY; y >= minY; y--) {
      let row = "";
      let colIndex = 0;

      for (let x = minX; x <= maxX; x++) {
        const key = `${x},${y}`;
        const v = grid[key];

        if (x === start.x && y === start.y) {
          row += "@";
          playerGridX = colIndex;
          playerGridY = rowIndex;
          colIndex++;
          continue;
        }

        const onThis = manager.lookup(x, y);
        if (onThis) {
          let ch = "?";
          for (const objKey of Object.keys(objMap)) {
            if (onThis.entity.name.startsWith(objKey)) {
              ch = objMap[objKey];
              if (ch === "!") {
                goals.push({ x: colIndex, y: rowIndex });
              }
              break;
            }
          }
          row += ch;
          colIndex++;
          continue;
        }

        if (key in collectiblePositions) {
          row += "b";
          colIndex++;
          continue;
        }

        if (key in bombPositions) {
          row += "*";
          colIndex++;
          continue;
        }

        if (v === undefined) {
          row += ".";
        } else {
          row += colorSymbols[v] ?? "?";
        }

        colIndex++;
      }

      rows.push(row);
      rowIndex++;
    }

    return {
      grid: rows,
      player: { x: playerGridX, y: playerGridY },
      origin: { x: minX, y: maxY },
      goals,
    };
  }
}
