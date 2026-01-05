import {
  Entity,
  EntityDestroyed,
  EntityRef,
  UIPanel,
  value,
} from "@dreamlab/engine";
import DialogueTileText from "../ui/dialogue-text.tsx";
import PlayerMetrics from "../player/metrics.ts";
import { PlayerMoved } from "../player/movement.ts";
import TileAction from "./action.ts";
import PushableBlockManager from "../mechanics/pushable-block-manager.ts";

export default class DialogueTile extends TileAction {
  @value({ type: EntityRef })
  prefab: Entity | undefined;

  @value()
  text: string = "";

  @value()
  isShowing = false;

  #ui: UIPanel | undefined;

  onInitialize(): void {
    super.onInitialize();

    if (!this.prefab) throw new Error("missing text prefab");

    if (this.game.isClient()) {
      this.#ui = this.prefab
        .cloneInto(this.game.local, {
          name: `text_${this.ref}`,
          transform: { position: this.tilePos },
        })
        .cast(UIPanel);

      const display = this.#ui.getBehavior(DialogueTileText);
      display.text = this.text;
    }

    this.values.get("text")?.onChanged(() => {
      if (!this.#ui) return;
      const display = this.#ui.getBehavior(DialogueTileText);
      display.text = this.text;
    });

    this.values.get("isShowing")?.onChanged(() => {
      if (!this.#ui) return;
      this.#ui.getBehavior(DialogueTileText).visible = this.isShowing;
    });

    this.listen(this.entity, EntityDestroyed, () => {
      this.isShowing = false;
    });
  }

  public onTileEnter(ev: PlayerMoved): void {
    this.isShowing = true;

    ev.actions.push({
      id: "dialogue",
      data: { text: this.text, visible: true },
    });

    if (this.text.toLowerCase().includes("won") || this.entity.name === "Win") {
      const metrics = ev.player.entity.getBehavior(PlayerMetrics);
      if (metrics) {
        metrics.recordFinish();
      }

      const level = this.entity.parent;
      if (level) {
        const blockManager = level.getBehavior(PushableBlockManager);
        if (blockManager) {
          blockManager.restart();
        }
      }
    }
  }

  public onTileExit(ev: PlayerMoved): void {
    this.isShowing = false;

    ev.actions.push({
      id: "dialogue",
      data: { text: this.text, visible: false },
    });
  }
}
