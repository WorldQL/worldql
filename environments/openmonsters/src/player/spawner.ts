import {
  Behavior,
  Entity,
  EntityRef,
  PlayerJoined,
  RichText,
  value,
  Vector2,
} from "@dreamlab/engine";
import * as z from "@dreamlab/vendor/zod.ts";
import PortalManager from "../mechanics/portal-manager.ts";
import PushableBlockManager from "../mechanics/pushable-block-manager.ts";
import GameSelectionUI from "../ui/game-selection.tsx";
import PlayerMetricsUI from "../ui/player-metrics.tsx";
import PlayerMetrics from "./metrics.ts";
import PlayerMovement from "./movement.ts";

export default class PlayerSpawner extends Behavior {
  @value({ type: EntityRef })
  playerPrefab: Entity | undefined;

  onInitialize(): void {
    if (!this.game.isServer()) return;

    const offset = this.game.entities.lookupById("world/RoomOffset")!.pos;
    const t = (v: Vector2) => new Vector2(v.x - offset.x, v.y + offset.y);

    this.game.on(PlayerJoined, ({ connection }) => {
      if (!this.playerPrefab) {
        throw new Error("no player prefab is assigned to the PlayerSpawner!");
      }
      const player = this.playerPrefab.cloneInto(this.game.world, {
        authority: connection.id,
        name: "Player." + connection.nickname,
      });

      player._.Name.cast(RichText).text = connection.nickname;

      if (connection.nickname !== "Puppet") {
        const gameSelectionEntity = this.game.world._.GameSelection;
        const gameSelectionUI =
          gameSelectionEntity.getBehavior(GameSelectionUI);
        gameSelectionUI.player = player;
        gameSelectionUI.connectionId = connection.id;
        gameSelectionUI.nickname = connection.nickname;
        gameSelectionUI.visible = true;
        gameSelectionUI.rerender();
      }
    });

    this.game.httpAPI.attach("spawn-player", [], () => {
      if (!this.playerPrefab) {
        throw new Error("no player prefab is assigned to the PlayerSpawner!");
      }
      const displayName = "Puppet";
      const name = `Player.${displayName}`;
      const player = this.playerPrefab.cloneInto(this.game.world, {
        authority: "server",
        name: name,
      });

      player._.Name.cast(RichText).text = displayName;
      this.game.world._.MetricsUI.getBehavior(PlayerMetricsUI).player = player;

      return { ref: player.ref };
    });

    this.game.httpAPI.attach(
      "respawn-player",
      [z.string().describe("connection id")],
      (connectionId) => {
        if (!this.playerPrefab) {
          throw new Error("no player prefab is assigned to the PlayerSpawner!");
        }

        const connection = Array.from(this.game.connections.entries()).find(
          ([id]) => id === connectionId
        );
        if (!connection) {
          return { ok: false, error: "connection not found" };
        }

        const player = this.playerPrefab.cloneInto(this.game.world, {
          authority: connectionId,
          name: "Player." + connection[1].nickname,
        });

        player._.Name.cast(RichText).text = connection[1].nickname;

        const gameSelectionUI =
          this.game.world._.GameSelection.getBehavior(GameSelectionUI);
        gameSelectionUI.player = player;

        return { ok: true, ref: player.ref };
      }
    );

    this.game.httpAPI.attach(
      "move-player",
      [
        z.string().describe("player ref"),
        z.object({
          x: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
          y: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
        }),
      ],
      (ref, { x, y }) => {
        const player = this.game.world.entities.lookupByRef(ref);
        if (!player) return { ok: false, error: "player does not exist!" };
        const playerMovement = player.getBehaviorIfExists(PlayerMovement);
        if (!playerMovement)
          return { ok: false, error: "provided entity was not a player!" };

        if (player.authority !== "server") {
          return {
            ok: false,
            error: "provided entity was not a puppeted player!",
          };
        }

        const newPos = playerMovement.checkMove(x, y);
        if (!newPos) return { ok: false, error: "move was not valid" };

        const moveResult = playerMovement.moveTo(newPos);
        const actions =
          moveResult.actions?.length === 0 ? undefined : moveResult.actions;

        if (!moveResult.success) {
          return {
            ok: false,
            error: playerMovement.canMoveYet()
              ? "Move was blocked by an obstacle"
              : "Move on cooldown!",
            actions,
          };
        }

        return { ok: true, actions };
      }
    );

    this.game.httpAPI.attach(
      "vision",
      [z.string().describe("player ref")],
      (ref) => {
        const player = this.game.world.entities.lookupByRef(ref);
        if (!player) return { ok: false, error: "player does not exist!" };
        const playerMovement = player.getBehaviorIfExists(PlayerMovement);
        if (!playerMovement)
          return { ok: false, error: "provided entity was not a player!" };
        if (player.authority !== "server") {
          return {
            ok: false,
            error: "provided entity was not a puppeted player!",
          };
        }

        return { ok: true, world: playerMovement.vision() };
      }
    );

    this.game.httpAPI.attach(
      "place-bomb",
      [z.string().describe("player ref")],
      (ref) => {
        const player = this.game.world.entities.lookupByRef(ref);
        if (!player) return { ok: false, error: "player does not exist!" };
        const playerMovement = player.getBehaviorIfExists(PlayerMovement);
        if (!playerMovement)
          return { ok: false, error: "provided entity was not a player!" };

        if (player.authority !== "server") {
          return {
            ok: false,
            error: "provided entity was not a puppeted player!",
          };
        }

        const result = playerMovement.placeBomb();
        if (!result.success) {
          return { ok: false, error: result.error };
        }

        return { ok: true };
      }
    );

    this.game.httpAPI.attach("restart-level", [], () => {
      const blockManager = PushableBlockManager.instance;
      if (!blockManager) {
        return { ok: false, error: "no block manager found!" };
      }
      blockManager.restart();
      return { ok: true };
    });

    this.game.httpAPI.attach(
      "delete-player",
      [z.string().describe("player ref")],
      (ref) => {
        const player = this.game.world.entities.lookupByRef(ref);
        if (!player) return { ok: false, error: "player does not exist!" };

        if (player.authority !== "server") {
          return {
            ok: false,
            error: "provided entity was not a puppeted player!",
          };
        }

        player.destroy();
        return { ok: true };
      }
    );

    this.game.httpAPI.attach(
      "level-select",
      [
        z.enum(["normal", "sokoban"]).describe("game type"),
        z.number().int().positive().describe("level number"),
        z.string().describe("player ref"),
      ],
      (gametype, levelNumber, ref) => {
        const player = this.game.world.entities.lookupByRef(ref);
        if (!player) return { ok: false, error: "player does not exist!" };
        const playerMovement = player.getBehaviorIfExists(PlayerMovement);
        if (!playerMovement)
          return { ok: false, error: "provided entity was not a player!" };

        if (player.authority !== "server") {
          return {
            ok: false,
            error: "provided entity was not a puppeted player!",
          };
        }

        let levelStart: Entity | undefined;

        if (gametype === "normal") {
          const level = this.game.world._["Level" + levelNumber];
          if (!level) return { ok: false, error: "level not found" };
          levelStart = level._.LevelStart;
        } else if (gametype === "sokoban") {
          const sokoban = this.game.world._["Sokoban"];
          if (!sokoban) return { ok: false, error: "sokoban levels not found" };
          levelStart = sokoban._["Level" + levelNumber];
        }

        if (!levelStart) {
          return { ok: false, error: "level start position not found" };
        }

        playerMovement.teleportTo(levelStart.pos);

        const metrics = player.getBehaviorIfExists(PlayerMetrics);
        if (metrics) {
          metrics.reset();
        }

        return { ok: true };
      }
    );

    this.game.httpAPI.attach(
      "player-metrics",
      [z.string().describe("player ref")],
      (ref) => {
        const player = this.game.world.entities.lookupByRef(ref);
        if (!player) return { ok: false, error: "player does not exist!" };

        if (player.authority !== "server") {
          return {
            ok: false,
            error: "provided entity was not a puppeted player!",
          };
        }

        const metrics = player.getBehaviorIfExists(PlayerMetrics);
        if (!metrics) {
          return {
            ok: false,
            error: "player does not have metrics tracking enabled!",
          };
        }

        return { ok: true, metrics: metrics.getSummary() };
      }
    );

    // Portal endpoints
    this.game.httpAPI.attach(
      "place-portal",
      [
        z.string().describe("player ref"),
        z.enum(["blue", "orange"]).describe("portal color"),
        z
          .object({
            x: z.number().int(),
            y: z.number().int(),
          })
          .describe("target tile position"),
      ],
      (ref, portalColor, targetTile) => {
        const player = this.game.world.entities.lookupByRef(ref);
        if (!player) return { ok: false, error: "player does not exist!" };

        if (player.authority !== "server") {
          return {
            ok: false,
            error: "provided entity was not a puppeted player!",
          };
        }

        const playerMovement = player.getBehaviorIfExists(PlayerMovement);
        if (!playerMovement)
          return { ok: false, error: "provided entity was not a player!" };

        const portalManager = PortalManager.instance;
        if (!portalManager) {
          return { ok: false, error: "portal manager not initialized" };
        }

        const playerPos = playerMovement.pos;
        const result = portalManager.placePortal(portalColor, targetTile, {
          x: playerPos.x,
          y: playerPos.y,
        });

        if (!result.success) {
          return { ok: false, error: result.error };
        }

        return { ok: true };
      }
    );

    this.game.httpAPI.attach("get-portals", [], () => {
      const portalManager = PortalManager.instance;
      if (!portalManager) {
        return { ok: false, error: "portal manager not initialized" };
      }

      const info = portalManager.getPortalInfo();
      return { ok: true, portals: info };
    });

    this.game.httpAPI.attach(
      "remove-portal",
      [z.enum(["blue", "orange"]).describe("portal color")],
      (portalColor) => {
        const portalManager = PortalManager.instance;
        if (!portalManager) {
          return { ok: false, error: "portal manager not initialized" };
        }

        portalManager.removePortal(portalColor);
        return { ok: true };
      }
    );

    this.game.httpAPI.attach("clear-portals", [], () => {
      const portalManager = PortalManager.instance;
      if (!portalManager) {
        return { ok: false, error: "portal manager not initialized" };
      }

      portalManager.clearAllPortals();
      return { ok: true };
    });

    // TODO: player-info call that returns gold / items / etc
    // TODO: world-info call that can show surrounding tiles ?
  }
}
