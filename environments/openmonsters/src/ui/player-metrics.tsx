import { Entity, EntityRef, PlayerJoined, UIBehavior, value } from "@dreamlab/engine";
import PlayerMetrics from "../player/metrics.ts";

export default class PlayerMetricsUI extends UIBehavior {
  @value({ type: EntityRef })
  player: Entity | undefined;

  private metrics: PlayerMetrics | undefined;
  private score = 0;
  private moves = 0;
  private finished = false;
  private elapsedTime = 0;
  private previousScores: Array<{ score: number; moves: number; time: number }> = [];
  private previousScoresJSON = "[]";
  private availablePlayers: readonly Entity[] = [];
  private showingSelector = false;

  override onInitialize() {
    super.onInitialize();

    this.listen(this.game, PlayerJoined, () => {
      this.updateAvailablePlayers();
      this.rerender();
    });

    if (!this.game.isClient()) return;

    this.updatePlayerMetrics();
    this.updateAvailablePlayers();

    this.values.get("player")?.onChanged(() => {
      this.updatePlayerMetrics();
    });

    let tickCounter = 0;
    this.onTick = () => {
      tickCounter++;
      if (tickCounter % 60 === 0) {
        this.updateAvailablePlayers();
      }

      if (!this.metrics) {
        this.updatePlayerMetrics();
        return;
      }

      const newElapsedTime = Math.floor(this.metrics.getElapsedTime());
      const previousScoresChanged = this.previousScoresJSON !== this.metrics.previousScoresJSON;
      const changed = this.score !== this.metrics.calculateScore()
        || this.moves !== this.metrics.totalMoves
        || this.finished !== this.metrics.finishReached
        || this.elapsedTime !== newElapsedTime
        || previousScoresChanged;

      if (changed) {
        this.updateMetricsCache();
        this.rerender();
      }
    };
  }

  private updateAvailablePlayers() {
    const players = this.game.world.entities.lookupByBehavior(PlayerMetrics);

    if (players.length !== this.availablePlayers.length) {
      this.availablePlayers = players;
      this.rerender();
    }
  }

  private selectPlayer(entity: Entity) {
    this.player = entity;
    this.showingSelector = false;
    this.updatePlayerMetrics();
  }

  private deselectPlayer() {
    this.player = undefined;
    this.metrics = undefined;
    this.showingSelector = true;
    this.rerender();
  }

  private updatePlayerMetrics() {
    this.metrics = undefined;

    if (this.player) {
      const metrics = this.player.getBehaviorIfExists(PlayerMetrics);
      if (metrics) {
        this.metrics = metrics;
        this.updateMetricsCache();
        this.rerender();
        return;
      }
    }
  }

  private updateMetricsCache() {
    if (!this.metrics) return;
    this.score = this.metrics.calculateScore();
    this.moves = this.metrics.totalMoves;
    this.finished = this.metrics.finishReached;
    this.elapsedTime = Math.floor(this.metrics.getElapsedTime());
    this.previousScoresJSON = this.metrics.previousScoresJSON;
    this.previousScores = this.metrics.getPreviousScores();
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  override render() {
    if (!this.metrics || this.showingSelector) {
      return (
        <div
          style={{
            position: "absolute",
            top: "0.5rem",
            left: "0.5rem",
            padding: "0.6rem",
            background: "rgba(0, 0, 0, 0.6)",
            borderRadius: "0.25rem",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            color: "rgba(255, 255, 255, 0.9)",
            fontFamily: "monospace",
            fontSize: "0.7rem",
            minWidth: "160px",
          }}
        >
          <div
            style={{
              marginBottom: "0.5rem",
              fontSize: "0.65rem",
              color: "rgba(255, 255, 255, 0.5)",
            }}
          >
            SELECT PLAYER
          </div>
          {this.availablePlayers.length === 0
            ? (
              <div style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.65rem" }}>
                Waiting for players...
              </div>
            )
            : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                {this.availablePlayers.map((entity) => (
                  <button
                    onClick={() => this.selectPlayer(entity)}
                    style={{
                      padding: "0.3rem 0.4rem",
                      fontSize: "0.65rem",
                      color: "rgba(255, 255, 255, 0.9)",
                      background: "rgba(59, 130, 246, 0.2)",
                      border: "1px solid rgba(59, 130, 246, 0.4)",
                      borderRadius: "0.15rem",
                      cursor: "pointer",
                      fontFamily: "monospace",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(59, 130, 246, 0.3)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(59, 130, 246, 0.2)";
                    }}
                  >
                    {entity.name}
                  </button>
                ))}
              </div>
            )}
        </div>
      );
    }

    return (
      <div
        style={{
          position: "absolute",
          top: "0.5rem",
          left: "0.5rem",
          padding: "0.6rem",
          background: "rgba(0, 0, 0, 0.6)",
          borderRadius: "0.25rem",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          color: "rgba(255, 255, 255, 0.9)",
          fontFamily: "monospace",
          minWidth: "120px",
          fontSize: "0.75rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.4rem",
          }}
        >
          <span
            onClick={() => this.deselectPlayer()}
            style={{
              fontSize: "0.65rem",
              color: "rgba(59, 130, 246, 0.9)",
              cursor: "pointer",
              textDecoration: "underline",
              textDecorationStyle: "dotted",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "rgba(59, 130, 246, 1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "rgba(59, 130, 246, 0.9)";
            }}
          >
            {this.player?.name || "METRICS"}
          </span>
          <button
            onClick={() => this.metrics?.reset()}
            style={{
              padding: "0.15rem 0.3rem",
              fontSize: "0.6rem",
              color: "rgba(255, 255, 255, 0.7)",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "0.15rem",
              cursor: "pointer",
              fontFamily: "monospace",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
            }}
          >
            reset
          </button>
        </div>

        <div
          style={{
            marginBottom: "0.4rem",
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.7rem",
          }}
        >
          <span style={{ color: "rgba(255, 255, 255, 0.7)" }}>Time:</span>
          <span>{this.formatTime(this.elapsedTime)}</span>
        </div>

        <div
          style={{
            marginBottom: "0.4rem",
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.7rem",
          }}
        >
          <span style={{ color: "rgba(255, 255, 255, 0.7)" }}>Moves:</span>
          <span>{this.moves}</span>
        </div>

        <div
          style={{
            marginBottom: "0.4rem",
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.7rem",
          }}
        >
          <span style={{ color: "rgba(255, 255, 255, 0.7)" }}>Score:</span>
          <span
            style={{
              color: this.finished ? "rgba(74, 222, 128, 0.9)" : "rgba(255, 255, 255, 0.9)",
            }}
          >
            {this.score}
          </span>
        </div>

        {this.finished && (
          <div
            style={{
              marginTop: "0.3rem",
              padding: "0.3rem",
              background: "rgba(74, 222, 128, 0.15)",
              border: "1px solid rgba(74, 222, 128, 0.3)",
              borderRadius: "0.15rem",
              textAlign: "center",
              fontSize: "0.7rem",
              color: "rgba(74, 222, 128, 0.9)",
            }}
          >
            ✓ Complete
          </div>
        )}

        {this.previousScores.length > 0 && (
          <div style={{ marginTop: "0.5rem" }}>
            {this.previousScores.map((prev, index) => (
              <div
                style={{
                  marginBottom: index < this.previousScores.length - 1 ? "0.4rem" : "0",
                  padding: "0.5rem",
                  background: "rgba(59, 130, 246, 0.1)",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  borderRadius: "0.15rem",
                  fontSize: "0.7rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.3rem",
                  }}
                >
                  <span style={{ fontSize: "0.65rem", color: "rgba(59, 130, 246, 0.9)" }}>
                    ATTEMPT #{this.previousScores.length - index}
                  </span>
                  <button
                    onClick={() => this.metrics?.clearPreviousScore(index)}
                    style={{
                      padding: "0",
                      width: "18px",
                      height: "18px",
                      fontSize: "0.75rem",
                      color: "rgba(255, 255, 255, 0.5)",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "monospace",
                      lineHeight: "18px",
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
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.65rem",
                    marginBottom: "0.2rem",
                  }}
                >
                  <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>Time:</span>
                  <span style={{ color: "rgba(255, 255, 255, 0.8)" }}>
                    {this.formatTime(Math.floor(prev.time))}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.65rem",
                    marginBottom: "0.2rem",
                  }}
                >
                  <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>Moves:</span>
                  <span style={{ color: "rgba(255, 255, 255, 0.8)" }}>{prev.moves}</span>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.65rem",
                  }}
                >
                  <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>Score:</span>
                  <span style={{ color: "rgba(59, 130, 246, 0.9)" }}>{prev.score}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
}
