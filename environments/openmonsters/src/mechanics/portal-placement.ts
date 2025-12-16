import { Behavior, EntityRef, IVector2, rpc, Tilemap, value } from "@dreamlab/engine";
import PlayerMovement from "../player/movement.ts";
import PortalManager from "./portal-manager.ts";

export default class PortalPlacement extends Behavior {
  @value({ type: EntityRef })
  tilemap: Tilemap | undefined;

  @value()
  currentPortalColor: "blue" | "orange" = "blue";

  @value()
  lastPlacementError: string = "";

  #leftClick = this.inputs.create("@portal/placeBlue", "Place Blue Portal", "MouseLeft");
  #rightClick = this.inputs.create("@portal/placeOrange", "Place Orange Portal", "MouseRight");
  #togglePortal = this.inputs.create("@portal/toggle", "Toggle Portal Color", "KeyQ");

  onTick(): void {
    if (!this.game.isClient()) return;
    if (!this.hasAuthority()) return;

    if (this.#togglePortal.pressed) {
      this.currentPortalColor = this.currentPortalColor === "blue" ? "orange" : "blue";
    }

    if (this.#leftClick.pressed) {
      this.currentPortalColor = "blue";
      this.#placePortalAtCursor("blue");
    }

    if (this.#rightClick.pressed) {
      this.currentPortalColor = "orange";
      this.#placePortalAtCursor("orange");
    }
  }

  #placePortalAtCursor(portalColor: "blue" | "orange"): void {
    const cursorWorldPos = this.inputs.cursor.world;
    if (!cursorWorldPos) return;

    const tileX = Math.round(cursorWorldPos.x);
    const tileY = Math.round(cursorWorldPos.y);

    this.#requestPortalPlacement(portalColor, { x: tileX, y: tileY });
  }

  @rpc.server()
  #requestPortalPlacement(portalColor: "blue" | "orange", targetTile: IVector2) {
    const portalManager = PortalManager.instance;
    if (!portalManager) {
      this.lastPlacementError = "Portal system not available";
      return;
    }

    const playerMovement = this.entity.getBehavior(PlayerMovement);
    const playerPos = playerMovement.pos;

    const result = portalManager.placePortal(portalColor, targetTile, {
      x: playerPos.x,
      y: playerPos.y,
    });

    if (result.success) {
      this.lastPlacementError = "";
    } else {
      this.lastPlacementError = result.error || "Unknown error";
    }
  }

  setPortalColor(color: "blue" | "orange"): void {
    this.currentPortalColor = color;
  }
}
