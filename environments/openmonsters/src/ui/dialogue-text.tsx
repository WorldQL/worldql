import { UIBehavior, value } from "@dreamlab/engine";
import type { BaseElement } from "@dreamlab/ui";

const css = `
div.text {
  padding: 1.2rem 1.5rem;
  background: rgb(0 0 0 / 80%);
  transform: translateY(-3rem);
  border-radius: 8px;
  opacity: 0;
  transition: opacity 0.15s ease-in-out;

  &[data-visible] {
    opacity: 1;
  }
}
`;

export default class DialogueTileText extends UIBehavior {
  @value()
  text: string = "";

  @value()
  visible: boolean = false;

  onInitialize(): void {
    super.onInitialize();
    this.setCss(css);

    this.values.get("text")?.onChanged(() => this.rerender());
    this.values.get("visible")?.onChanged(() => this.rerender());
  }

  protected render(): BaseElement {
    return (
      <div
        className="text"
        data-visible={this.visible}
        style={{
          padding: "1.2rem 1.5rem",
          background: "rgb(0 0 0 / 80%)",
          transform: "translateY(-3rem)",
          borderRadius: "8px",
        }}
      >
        {this.text}
      </div>
    );
  }
}
