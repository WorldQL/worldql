import { Behavior } from "@dreamlab/engine";
import TileAction from "./action.ts";

export default class TileActionManager extends Behavior {
  static instance: TileActionManager | undefined = undefined;

  private tileActions = new Map<string, TileAction>();

  onInitialize(): void {
    if (!this.game.isServer()) return;
    console.log("init");
    if (TileActionManager.instance) {
      throw new Error("only one TileActionManager should exist");
    }
    TileActionManager.instance = this;
  }

  onTick() {
    if (!this.game.isServer()) return;
    // if (this.game.time.ticks % 240 === 0) {
    //   for (let v of this.tileActions.entries()) {
    //     console.log(v[0], v[1].entity.name);
    //   }
    // }
  }

  public register(x: number, y: number, action: any): void {
    const key = `${Math.floor(x)},${Math.floor(y)}`;
    this.tileActions.set(key, action);
  }

  public remove(x: number, y: number): void {
    const key = `${Math.floor(x)},${Math.floor(y)}`;
    this.tileActions.delete(key);
  }

  public lookup(x: number, y: number): TileAction | undefined {
    const key = `${Math.floor(x)},${Math.floor(y)}`;
    return this.tileActions.get(key);
  }
}
