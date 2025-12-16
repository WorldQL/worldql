import { Behavior, rpc, value } from "@dreamlab/engine";

export default class PlayerMetrics extends Behavior {
  @value()
  totalMoves = 0;

  @value()
  finishReached = false;

  @value()
  startTime = 0;

  @value()
  endTime = 0;

  @value()
  previousScoresJSON = "[]";

  onInitialize(): void {
    if (this.game.isClient()) return;
  }

  getPreviousScores(): Array<{ score: number; moves: number; time: number }> {
    try {
      return JSON.parse(this.previousScoresJSON);
    } catch {
      return [];
    }
  }

  recordMove(): void {
    if (this.game.isClient()) return;

    if (this.finishReached) {
      const previous = this.getPreviousScores();
      previous.push({
        score: this.calculateScore(),
        moves: this.totalMoves,
        time: this.getElapsedTime(),
      });
      this.previousScoresJSON = JSON.stringify(previous);
      this.totalMoves = 0;
      this.finishReached = false;
      this.startTime = 0;
      this.endTime = 0;
      return;
    }

    if (this.totalMoves === 0) {
      this.startTime = Date.now();
    }

    this.totalMoves++;
  }

  recordFinish(): void {
    if (this.game.isClient()) return;
    if (!this.finishReached) {
      this.finishReached = true;
      this.endTime = Date.now();
    }
  }

  /**
   * Scoring methodology:
   * - Base score: 1000 points
   * - Finishing: required for any score
   * - Move penalty: -2 points per move
   */
  calculateScore(): number {
    if (!this.finishReached) {
      return 0;
    }

    let score = 1000;
    score -= this.totalMoves * 2;

    return Math.max(0, Math.round(score));
  }

  getElapsedTime(): number {
    if (this.startTime === 0) {
      return 0;
    }

    if (this.finishReached && this.endTime > 0) {
      return (this.endTime - this.startTime) / 1000;
    }

    return (Date.now() - this.startTime) / 1000;
  }

  getSummary(): {
    totalMoves: number;
    finishReached: boolean;
    score: number;
    elapsedTime: number;
  } {
    return {
      totalMoves: this.totalMoves,
      finishReached: this.finishReached,
      score: this.calculateScore(),
      elapsedTime: this.getElapsedTime(),
    };
  }

  @rpc.server()
  reset(): void {
    this.totalMoves = 0;
    this.finishReached = false;
    this.startTime = 0;
    this.endTime = 0;
  }

  @rpc.server()
  clearPreviousScore(index: number): void {
    const previous = this.getPreviousScores();
    if (index >= 0 && index < previous.length) {
      previous.splice(index, 1);
      this.previousScoresJSON = JSON.stringify(previous);
    }
  }
}
