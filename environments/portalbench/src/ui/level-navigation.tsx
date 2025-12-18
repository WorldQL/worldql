import {
  Entity,
  EntityRef,
  LocalRoot,
  PlayerJoined,
  UIBehavior,
  value,
  Vector2,
} from "@dreamlab/engine";
import PlayerMetrics from "../player/metrics.ts";
import PlayerMovement from "../player/movement.ts";

type GameType = "KeysAndDoors" | "Portals" | "PushableBlocks" | "Sokoban" | "Bombs" | null;

interface GameConfig {
  maxLevels: number;
  displayName: string;
  hasLevelStart: boolean;
}

const GAME_CONFIGS: Record<string, GameConfig> = {
  KeysAndDoors: { maxLevels: 2, displayName: "🔑 Keys & Doors", hasLevelStart: true },
  Portals: { maxLevels: 3, displayName: "🌀 Portals", hasLevelStart: true },
  PushableBlocks: { maxLevels: 2, displayName: "📦 Pushable Blocks", hasLevelStart: true },
  Sokoban: { maxLevels: 8, displayName: "🎯 Sokoban", hasLevelStart: false },
  Bombs: { maxLevels: 2, displayName: "💣 Bombs", hasLevelStart: true },
};

export default class GameLevelNavigationUI extends UIBehavior {
  @value({ type: EntityRef })
  player: Entity | undefined;

  private currentLevel = 1;
  private currentGame: GameType = null;
  private isInGameArea = false;

  override onInitialize() {
    super.onInitialize();
    if (!this.game.isClient()) return;

    this.findLocalPlayer();

    this.listen(this.game, PlayerJoined, () => {
      this.findLocalPlayer();
    });

    this.onTick = () => {
      if (!this.player) return;

      const wasInGame = this.isInGameArea;
      const prevGame = this.currentGame;
      const prevLevel = this.currentLevel;

      const { gameType, level, inArea } = this.detectCurrentGameAndLevel();

      if (wasInGame !== inArea || prevGame !== gameType || prevLevel !== level) {
        this.currentGame = gameType;
        this.currentLevel = level;
        this.isInGameArea = inArea;
        this.rerender();
      }
    };
  }

  private findLocalPlayer() {
    const players = this.game.world.entities.lookupByBehavior(PlayerMovement);

    const localPlayer = players.find(e =>
      e.root instanceof LocalRoot
      && !e.name.includes("Puppet")
    );

    if (localPlayer && !this.player) {
      this.player = localPlayer;
    }
  }

  private detectCurrentGameAndLevel(): { gameType: GameType; level: number; inArea: boolean } {
    if (!this.player) {
      return { gameType: null, level: 1, inArea: false };
    }

    let globalClosestGame: GameType = null;
    let globalClosestLevel = 1;
    let globalClosestDistance = Infinity;

    for (const [gameName, config] of Object.entries(GAME_CONFIGS)) {
      const gameEntity = this.game.world._[gameName];
      if (!gameEntity) {
        continue;
      }

      for (let i = 1; i <= config.maxLevels; i++) {
        const levelEntity = gameEntity._["Level" + i];
        if (!levelEntity) {
          continue;
        }

        let refPos = levelEntity.pos;
        if (config.hasLevelStart && levelEntity._.LevelStart) {
          refPos = levelEntity._.LevelStart.pos;
        }

        const distance = Vector2.distance(this.player.pos, refPos);

        if (distance < globalClosestDistance) {
          globalClosestDistance = distance;
          globalClosestLevel = i;
          globalClosestGame = gameName as GameType;
        }
      }
    }

    if (globalClosestDistance < 50) {
      return { gameType: globalClosestGame, level: globalClosestLevel, inArea: true };
    }

    return { gameType: this.currentGame, level: this.currentLevel, inArea: false };
  }

  private navigateToLevel(levelNumber: number) {
    if (!this.player || !this.currentGame || levelNumber < 1) return;

    const config = GAME_CONFIGS[this.currentGame];
    if (!config || levelNumber > config.maxLevels) return;

    const playerMovement = this.player.getBehaviorIfExists(PlayerMovement);
    if (!playerMovement) return;

    const gameEntity = this.game.world._[this.currentGame];
    if (!gameEntity) return;

    const levelEntity = gameEntity._["Level" + levelNumber];
    if (!levelEntity) return;

    let targetPos = levelEntity.pos;
    if (config.hasLevelStart && levelEntity._.LevelStart) {
      targetPos = levelEntity._.LevelStart.pos;
    }

    playerMovement.requestTeleport(targetPos.x, targetPos.y);

    const metrics = this.player.getBehaviorIfExists(PlayerMetrics);
    if (metrics) {
      metrics.reset();
    }

    this.currentLevel = levelNumber;
    this.rerender();
  }

  private handlePrevious = () => {
    if (this.currentLevel > 1) {
      this.navigateToLevel(this.currentLevel - 1);
    }
  };

  private handleNext = () => {
    if (!this.currentGame) return;
    const config = GAME_CONFIGS[this.currentGame];
    if (this.currentLevel < config.maxLevels) {
      this.navigateToLevel(this.currentLevel + 1);
    }
  };

  override render() {
    if (!this.player || !this.isInGameArea || !this.currentGame) {
      return <div style={{ display: "none" }} />;
    }

    const config = GAME_CONFIGS[this.currentGame];

    const isPreviousDisabled = this.currentLevel <= 1;
    const isNextDisabled = this.currentLevel >= config.maxLevels;

    return (
      <div
        style={{
          position: "absolute",
          bottom: "0.5rem",
          left: "50%",
          transform: "translateX(-50%)",
          padding: "0.6rem 0.8rem",
          background: "rgba(0, 0, 0, 0.7)",
          borderRadius: "0.25rem",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          color: "rgba(255, 255, 255, 0.9)",
          fontFamily: "monospace",
          fontSize: "0.75rem",
          display: "flex",
          alignItems: "center",
          gap: "0.8rem",
        }}
      >
        <button
          onClick={this.handlePrevious}
          disabled={isPreviousDisabled}
          style={{
            padding: "0.4rem 0.6rem",
            fontSize: "0.7rem",
            color: isPreviousDisabled ? "rgba(255, 255, 255, 0.3)" : "rgba(255, 255, 255, 0.9)",
            background: isPreviousDisabled
              ? "rgba(255, 255, 255, 0.05)"
              : "rgba(59, 130, 246, 0.3)",
            border: isPreviousDisabled
              ? "1px solid rgba(255, 255, 255, 0.1)"
              : "1px solid rgba(59, 130, 246, 0.5)",
            borderRadius: "0.15rem",
            cursor: isPreviousDisabled ? "not-allowed" : "pointer",
            fontFamily: "monospace",
            fontWeight: "bold",
          }}
          onMouseEnter={(e) => {
            if (!isPreviousDisabled) {
              e.currentTarget.style.background = "rgba(59, 130, 246, 0.5)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isPreviousDisabled) {
              e.currentTarget.style.background = "rgba(59, 130, 246, 0.3)";
            }
          }}
        >
          ← PREV
        </button>

        <div
          style={{
            padding: "0.2rem 0.6rem",
            fontSize: "0.7rem",
            color: "rgba(255, 255, 255, 0.9)",
            fontWeight: "bold",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.1rem",
          }}
        >
          <div style={{ fontSize: "0.6rem", color: "rgba(255, 255, 255, 0.6)" }}>
            {config.displayName}
          </div>
          <div>LEVEL {this.currentLevel}/{config.maxLevels}</div>
        </div>

        <button
          onClick={this.handleNext}
          disabled={isNextDisabled}
          style={{
            padding: "0.4rem 0.6rem",
            fontSize: "0.7rem",
            color: isNextDisabled ? "rgba(255, 255, 255, 0.3)" : "rgba(255, 255, 255, 0.9)",
            background: isNextDisabled
              ? "rgba(255, 255, 255, 0.05)"
              : "rgba(59, 130, 246, 0.3)",
            border: isNextDisabled
              ? "1px solid rgba(255, 255, 255, 0.1)"
              : "1px solid rgba(59, 130, 246, 0.5)",
            borderRadius: "0.15rem",
            cursor: isNextDisabled ? "not-allowed" : "pointer",
            fontFamily: "monospace",
            fontWeight: "bold",
          }}
          onMouseEnter={(e) => {
            if (!isNextDisabled) {
              e.currentTarget.style.background = "rgba(59, 130, 246, 0.5)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isNextDisabled) {
              e.currentTarget.style.background = "rgba(59, 130, 246, 0.3)";
            }
          }}
        >
          NEXT →
        </button>
      </div>
    );
  }
}
