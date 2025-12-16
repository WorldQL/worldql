import { Behavior, LocalRoot, sync, value } from "@dreamlab/engine";

const enum Item {
  Sword = 1,
  Potion,
}

export default class InventoryBehavior extends Behavior {
  @value()
  gold = 0;
  @sync()
  items: Item[] = [];
  @value()
  equippedItem: number = 0;
  @value()
  greenKeys = 0;
  @value()
  blueKeys = 0;
  @value()
  bombs = 0;

  onInitialize(): void {
    const isLocal = this.game.isClient() && this.entity.root instanceof LocalRoot;
    if (!(isLocal || this.hasAuthority())) return;

    this.values.get("currentItem")?.onChanged(() => {
      const item = this.items.at(this.equippedItem);
      // TODO: clone prefab display item to player. clean up existing before
    });
  }
}
