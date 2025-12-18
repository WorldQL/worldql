import {
  Camera,
  Entity,
  EntityRef,
  RichText,
  rpc,
  UIBehavior,
  value,
} from "@dreamlab/engine";
import CameraPanZoom from "../camera/pan-zoom.ts";
import PlayerMetrics from "../player/metrics.ts";
import PlayerMovement from "../player/movement.ts";
import PlayerSpawner from "../player/spawner.ts";
import GameLevelNavigationUI from "./level-navigation.tsx";

interface GameOption {
  name: string;
  displayName: string;
  path: string;
}

export default class GameSelectionUI extends UIBehavior {
  @value({ type: EntityRef })
  player: Entity | undefined;

  @value()
  visible = true;

  @value()
  isSpectating = false;

  @value()
  connectionId = "";

  @value()
  nickname = "";

  private games: GameOption[] = [
    {
      name: "KeysAndDoors",
      displayName: "🔑 Keys & Doors",
      path: "world/KeysAndDoors/Level1/LevelStart",
    },
    {
      name: "Portals",
      displayName: "🌀 Portals",
      path: "world/Portals/Level1/LevelStart",
    },
    {
      name: "PushableBlocks",
      displayName: "📦 Pushable Blocks",
      path: "world/PushableBlocks/Level1/LevelStart",
    },
    {
      name: "Sokoban",
      displayName: "🎯 Sokoban",
      path: "world/Sokoban/Level1",
    },
    {
      name: "Bombs",
      displayName: "💣 Bombs",
      path: "world/Bombs/Level1/LevelStart",
    },
  ];

  override onInitialize() {
    super.onInitialize();
    if (!this.game.isClient()) return;

    this.values.get("visible")?.onChanged(() => {
      this.rerender();
    });

    this.values.get("player")?.onChanged(() => {
      this.rerender();
    });
  }

  private selectGame = async (game: GameOption) => {
    if (this.isSpectating) {
      const camera = this.game.local!._.Camera;
      if (camera) {
        const cameraBehavior = camera.getBehaviorIfExists(CameraPanZoom);
        if (cameraBehavior) {
          cameraBehavior.active = false;
        }
        camera.cast(Camera).zoom = 1;
      }

      await this.respawnPlayer();

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (!this.player) return;

    const playerMovement = this.player.getBehaviorIfExists(PlayerMovement);
    if (!playerMovement) return;

    const pathParts = game.path.split("/");
    let targetEntity: Entity | undefined = this.game.world;

    for (const part of pathParts) {
      if (part === "world") continue;
      targetEntity = targetEntity?._[part];
      if (!targetEntity) {
        console.error(`Could not find entity at path: ${game.path}`);
        return;
      }
    }

    if (targetEntity) {
      playerMovement.requestTeleport(targetEntity.pos.x, targetEntity.pos.y);

      const metrics = this.player.getBehaviorIfExists(PlayerMetrics);
      if (metrics) {
        metrics.reset();
      }

      const navEntity = this.game.world._.LevelNavigation;
      if (navEntity) {
        const navUI = navEntity.getBehaviorIfExists(GameLevelNavigationUI);
        if (navUI) {
          navUI.player = this.player;
          navUI.rerender();
        }
      }

      this.visible = false;
      this.rerender();
    }
  };

  private selectSpectate = () => {
    if (!this.player) return;

    const camera = this.game.local!._.Camera;
    if (camera) {
      const cameraBehavior = camera.getBehaviorIfExists(CameraPanZoom);
      if (cameraBehavior) {
        cameraBehavior.active = true;
      }
    }

    this.player.destroy();
    this.player = undefined;

    this.isSpectating = true;

    this.visible = false;
    this.rerender();
  };

  private reopenMenu = () => {
    this.visible = true;
    this.rerender();
  };

  private closeMenu = () => {
    this.visible = false;
    this.rerender();
  };

  @rpc.server()
  respawnPlayer() {
    if (!this.connectionId) {
      console.error("No connection ID stored");
      return;
    }

    const spawnerEntity = this.game.server!._.PlayerSpawner;
    if (!spawnerEntity) {
      console.error("PlayerSpawner entity not found");
      return;
    }

    const spawnerBehavior = spawnerEntity.getBehaviorIfExists(PlayerSpawner);
    if (!spawnerBehavior) {
      console.error("PlayerSpawner behavior not found");
      return;
    }

    const playerPrefab = spawnerBehavior.playerPrefab;
    if (!playerPrefab) {
      console.error("Player prefab not found");
      return;
    }

    const player = playerPrefab.cloneInto(this.game.world, {
      authority: this.connectionId,
      name: "Player." + this.nickname,
    });

    player._.Name.cast(RichText).text = this.nickname;

    this.player = player;
    this.isSpectating = false;
  }

  override render() {
    if (!this.visible) {
      return (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: "none",
          }}
        >
          <button
            onClick={this.reopenMenu}
            style={{
              position: "absolute",
              top: "0.5rem",
              right: "0.5rem",
              padding: "0.25rem",
              width: "2rem",
              height: "2rem",
              fontSize: "1rem",
              color: "rgba(255, 255, 255, 0.8)",
              background: "rgba(0, 0, 0, 0.5)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "0.25rem",
              cursor: "pointer",
              fontFamily: "monospace",
              zIndex: 9999,
              pointerEvents: "auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(0, 0, 0, 0.7)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(0, 0, 0, 0.5)";
            }}
          >
            ☰
          </button>

          {this.isSpectating && (
            <div
              style={{
                position: "absolute",
                bottom: "0.5rem",
                left: "0.5rem",
                padding: "0.4rem 0.6rem",
                background: "rgba(0, 0, 0, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "0.25rem",
                color: "rgba(255, 255, 255, 0.8)",
                fontSize: "0.7rem",
                fontFamily: "monospace",
                pointerEvents: "none",
              }}
            >
              Spectate • Middle-click pan • Scroll zoom
            </div>
          )}
        </div>
      );
    }

    if (!this.visible) {
      return <div />;
    }

    return (
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0, 0, 0, 0.7)",
          zIndex: 1000,
        }}
      >
        <div
          style={{
            background: "rgba(0, 0, 0, 0.85)",
            borderRadius: "0.25rem",
            padding: "1rem",
            maxWidth: "300px",
            width: "100%",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            position: "relative",
          }}
        >
          <button
            onClick={this.closeMenu}
            style={{
              position: "absolute",
              top: "0.5rem",
              right: "0.5rem",
              padding: "0",
              width: "20px",
              height: "20px",
              fontSize: "0.85rem",
              color: "rgba(255, 255, 255, 0.5)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontFamily: "monospace",
              lineHeight: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "rgba(255, 255, 255, 0.9)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "rgba(255, 255, 255, 0.5)";
            }}
          >
            ×
          </button>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginTop: '20px' }}
          >
            <button
              onClick={this.selectSpectate}
              style={{
                padding: "0.5rem 0.75rem",
                fontSize: "0.85rem",
                fontWeight: "400",
                color: "rgba(255, 255, 255, 0.9)",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: "0.2rem",
                cursor: "pointer",
                fontFamily: "monospace",
                textAlign: "left",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
              }}
            >
              👁️ Spectate
            </button>
          </div>
        </div>
      </div>
    );
  }
}
