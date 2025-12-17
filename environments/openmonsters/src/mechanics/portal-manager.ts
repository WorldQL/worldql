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

type PortalData = {
  position: Vector2;
  originalTileColor: number;
};

export default class PortalManager extends Behavior {
  static instance: PortalManager | undefined;

  @value({ type: EntityRef })
  tilemap: Tilemap | undefined;

  private bluePortal: PortalData | undefined;
  private orangePortal: PortalData | undefined;

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
    playerPos: IVector2
  ): { success: boolean; error?: string } {
    if (!this.tilemap) {
      return { success: false, error: "Tilemap not found" };
    }

    const tileColor = this.tilemap.getColor(targetTile.x, targetTile.y);

    console.log(tileColor);

    if (
      tileColor !== Colors.Wall &&
      tileColor !== Colors.BombWall &&
      tileColor !== Colors.GlassWall
    ) {
      return { success: false, error: "Can only place portals on walls" };
    }

    if (!this.isInLineOfSight(playerPos, targetTile)) {
      return { success: false, error: "Target not in line of sight" };
    }

    if (portalColor === "blue" && this.bluePortal) {
      this.removePortal("blue");
    } else if (portalColor === "orange" && this.orangePortal) {
      this.removePortal("orange");
    }

    const portalData: PortalData = {
      position: new Vector2(targetTile.x, targetTile.y),
      originalTileColor: tileColor,
    };

    if (portalColor === "blue") {
      this.bluePortal = portalData;
      this.tilemap.setColor(targetTile.x, targetTile.y, Colors.BluePortal);
    } else {
      this.orangePortal = portalData;
      this.tilemap.setColor(targetTile.x, targetTile.y, Colors.OrangePortal);
    }

    return { success: true };
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

  removePortal(portalColor: "blue" | "orange"): void {
    if (!this.tilemap) return;

    const portal = portalColor === "blue" ? this.bluePortal : this.orangePortal;
    if (!portal) return;

    this.tilemap.setColor(
      portal.position.x,
      portal.position.y,
      portal.originalTileColor
    );

    if (portalColor === "blue") {
      this.bluePortal = undefined;
    } else {
      this.orangePortal = undefined;
    }
  }

  clearAllPortals(): void {
    this.removePortal("blue");
    this.removePortal("orange");
  }

  private handlePlayerMovement(event: PlayerMoved): void {
    if (!this.tilemap) return;
    if (!this.bluePortal || !this.orangePortal) return;

    const playerPos = event.position;

    if (
      playerPos.x === this.bluePortal.position.x &&
      playerPos.y === this.bluePortal.position.y
    ) {
      event.teleport = this.orangePortal.position.clone();
      return;
    }

    if (
      playerPos.x === this.orangePortal.position.x &&
      playerPos.y === this.orangePortal.position.y
    ) {
      event.teleport = this.bluePortal.position.clone();
      return;
    }
  }

  getPortalInfo(): {
    bluePortal: { x: number; y: number } | null;
    orangePortal: { x: number; y: number } | null;
  } {
    return {
      bluePortal: this.bluePortal
        ? { x: this.bluePortal.position.x, y: this.bluePortal.position.y }
        : null,
      orangePortal: this.orangePortal
        ? { x: this.orangePortal.position.x, y: this.orangePortal.position.y }
        : null,
    };
  }
}
