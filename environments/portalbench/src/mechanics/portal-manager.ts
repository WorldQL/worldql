import {
  Behavior,
  EntityRef,
  IVector2,
  Tilemap,
  value,
  Vector2,
} from "@dreamlab/engine";
import { Colors } from "../../lib/colors.ts";
import { PlayerMoved } from "../player/movement.ts";
import ParticleRender from "../effects/particle.ts";

type PortalData = {
  position: Vector2;
  originalTileColor: number;
};

export default class PortalManager extends Behavior {
  static instance: PortalManager | undefined;

  @value({ type: EntityRef })
  tilemap: Tilemap | undefined;

  private playerPortals: Map<
    string,
    { blue?: PortalData; orange?: PortalData }
  > = new Map();

  onInitialize(): void {
    if (!this.game.isServer()) return;
    PortalManager.instance = this;

    this.listen(this.game, PlayerMoved, (event) => {
      this.handlePlayerMovement(event);
    });
  }

  onDestroy(): void {
    if (PortalManager.instance === this) {
      PortalManager.instance = undefined;
    }
  }

  placePortal(
    portalColor: "blue" | "orange",
    targetTile: IVector2,
    playerPos: IVector2,
    playerRef: string
  ): { success: boolean; error?: string; position?: IVector2 } {
    if (!this.tilemap) {
      return { success: false, error: "Tilemap not found" };
    }

    const tileColor = this.tilemap.getColor(targetTile.x, targetTile.y);

    if (
      tileColor !== Colors.Wall &&
      tileColor !== Colors.BombWall &&
      tileColor !== Colors.GlassWall
    ) {
      return {
        success: false,
        error: "Can only place portals on wall",
      };
    }

    if (!this.isInLineOfSight(playerPos, targetTile)) {
      return { success: false, error: "Target not in line of sight" };
    }

    const dx = targetTile.x - playerPos.x;
    const dy = targetTile.y - playerPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) {
      return {
        success: false,
        error: "Cannot place portal at player position",
      };
    }

    const steps = Math.ceil(distance * 4);
    const checkedTiles = new Set<string>();
    let portalX = Math.round(playerPos.x);
    let portalY = Math.round(playerPos.y);
    let portalTileColor: number | undefined;

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const worldX = playerPos.x + dx * t;
      const worldY = playerPos.y + dy * t;

      const x = Math.round(worldX);
      const y = Math.round(worldY);

      const key = `${x},${y}`;
      if (checkedTiles.has(key)) continue;
      checkedTiles.add(key);

      const color = this.tilemap.getColor(x, y);

      if (x === targetTile.x && y === targetTile.y) {
        break;
      }

      if (color === Colors.Wall || color === Colors.BombWall) {
        break;
      }

      if (color === Colors.GlassWall) {
        continue;
      }

      portalX = x;
      portalY = y;
      portalTileColor = color;
    }

    if (portalTileColor === undefined) {
      const distToWall =
        Math.abs(targetTile.x - portalX) + Math.abs(targetTile.y - portalY);
      if (distToWall <= 1) {
        portalTileColor = this.tilemap.getColor(portalX, portalY);
      } else {
        return { success: false, error: "No valid space in front of wall" };
      }
    }

    if (!this.playerPortals.has(playerRef)) {
      this.playerPortals.set(playerRef, {});
    }
    const portals = this.playerPortals.get(playerRef)!;

    if (portalColor === "blue" && portals.blue) {
      this.removePortal("blue", playerRef);
    } else if (portalColor === "orange" && portals.orange) {
      this.removePortal("orange", playerRef);
    }

    for (const [otherPlayerRef, otherPortals] of this.playerPortals.entries()) {
      if (
        otherPortals.blue?.position.x === portalX &&
        otherPortals.blue?.position.y === portalY
      ) {
        this.removePortal("blue", otherPlayerRef);
      }
      if (
        otherPortals.orange?.position.x === portalX &&
        otherPortals.orange?.position.y === portalY
      ) {
        this.removePortal("orange", otherPlayerRef);
      }
    }

    portalTileColor = this.tilemap.getColor(portalX, portalY);

    if (
      portalTileColor === Colors.BluePortal ||
      portalTileColor === Colors.OrangePortal
    ) {
      portalTileColor = Colors.Grass;
    }

    const portalData: PortalData = {
      position: new Vector2(portalX, portalY),
      originalTileColor: portalTileColor,
    };

    if (portalColor === "blue") {
      portals.blue = portalData;
      this.tilemap.setColor(portalX, portalY, Colors.BluePortal);
    } else {
      portals.orange = portalData;
      this.tilemap.setColor(portalX, portalY, Colors.OrangePortal);
    }

    this.game.prefabs._.ParticleContainer.cloneInto(this.game.world, {
      transform: { position: { x: portalX, y: portalY } },
      behaviors: [
        {
          type: ParticleRender,
          values: {
            particleColor:
              portalColor === "blue" ? Colors.BluePortal : Colors.OrangePortal,
          },
        },
      ],
    });

    return { success: true, position: { x: portalX, y: portalY } };
  }

  private isInLineOfSight(from: IVector2, to: IVector2): boolean {
    if (!this.tilemap) return false;

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) return true;

    const steps = Math.ceil(distance * 4);

    const checkedTiles = new Set<string>();
    let reachedTarget = false;

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const worldX = from.x + dx * t;
      const worldY = from.y + dy * t;

      const worldDistToTarget = Math.sqrt(
        Math.pow(worldX - to.x, 2) + Math.pow(worldY - to.y, 2)
      );

      const x = Math.round(worldX);
      const y = Math.round(worldY);

      const key = `${x},${y}`;
      if (checkedTiles.has(key)) continue;
      checkedTiles.add(key);

      if (x === from.x && y === from.y) continue;

      if (x === to.x && y === to.y) {
        reachedTarget = true;
        break;
      }

      if (worldDistToTarget < 0.6) {
        reachedTarget = true;
        break;
      }

      const tileColor = this.tilemap.getColor(x, y);

      if (
        tileColor === Colors.Wall ||
        tileColor === Colors.BombWall ||
        tileColor === Colors.GreenDoor ||
        tileColor === Colors.BlueDoor
      ) {
        return false;
      }
    }

    if (reachedTarget) {
      return true;
    }

    return false;
  }

  removePortal(portalColor: "blue" | "orange", playerRef: string): void {
    if (!this.tilemap) return;

    const portals = this.playerPortals.get(playerRef);
    if (!portals) return;

    const portal = portalColor === "blue" ? portals.blue : portals.orange;
    if (!portal) return;

    this.tilemap.setColor(
      portal.position.x,
      portal.position.y,
      portal.originalTileColor
    );

    if (portalColor === "blue") {
      portals.blue = undefined;
    } else {
      portals.orange = undefined;
    }
  }

  clearAllPortals(playerRef?: string): void {
    if (playerRef) {
      this.removePortal("blue", playerRef);
      this.removePortal("orange", playerRef);
    } else {
      for (const [pRef] of this.playerPortals.entries()) {
        this.removePortal("blue", pRef);
        this.removePortal("orange", pRef);
      }
    }
  }

  private handlePlayerMovement(event: PlayerMoved): void {
    if (!this.tilemap) return;

    const playerPos = event.position;

    for (const [, portals] of this.playerPortals.entries()) {
      if (!portals.blue || !portals.orange) continue;

      if (
        playerPos.x === portals.blue.position.x &&
        playerPos.y === portals.blue.position.y
      ) {
        event.teleport = portals.orange.position.clone();
        return;
      }

      if (
        playerPos.x === portals.orange.position.x &&
        playerPos.y === portals.orange.position.y
      ) {
        event.teleport = portals.blue.position.clone();
        return;
      }
    }
  }
}
