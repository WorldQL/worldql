import { Behavior, Camera, value, Vector2 } from "@dreamlab/engine";

// TODO: this is temporary will improve soon

export default class CameraPanZoom extends Behavior {
  @value()
  active = false;

  #isDragging = false;
  #lastMousePos: Vector2 | null = null;
  #zoomLevel = 1;

  private readonly MIN_ZOOM = 0.1;
  private readonly MAX_ZOOM = 3;
  private readonly ZOOM_SPEED = 0.05;
  private readonly PAN_SPEED = 0.02;

  onInitialize(): void {
    if (!this.game.isClient()) return;

    window.addEventListener("mousedown", this.#onMouseDown);
    window.addEventListener("mouseup", this.#onMouseUp);
    window.addEventListener("mousemove", this.#onMouseMove);
    window.addEventListener("wheel", this.#onWheel, { passive: false });
    window.addEventListener("contextmenu", this.#onContextMenu);
  }

  onDestroy(): void {
    if (!this.game.isClient()) return;

    window.removeEventListener("mousedown", this.#onMouseDown);
    window.removeEventListener("mouseup", this.#onMouseUp);
    window.removeEventListener("mousemove", this.#onMouseMove);
    window.removeEventListener("wheel", this.#onWheel);
    window.removeEventListener("contextmenu", this.#onContextMenu);
  }

  #onContextMenu = (event: MouseEvent) => {
    if (this.active) {
      event.preventDefault();
    }
  };

  #onMouseDown = (event: MouseEvent) => {
    if (!this.active) return;

    if (event.button === 1) {
      event.preventDefault();
      this.#isDragging = true;
      this.#lastMousePos = new Vector2(event.clientX, event.clientY);
    }
  };

  #onMouseUp = (event: MouseEvent) => {
    if (event.button === 1) {
      this.#isDragging = false;
      this.#lastMousePos = null;
    }
  };

  #onMouseMove = (event: MouseEvent) => {
    if (!this.active || !this.#isDragging || !this.#lastMousePos) return;

    const camera = Camera.getActive(this.game);
    if (!camera) return;

    const currentMousePos = new Vector2(event.clientX, event.clientY);
    const delta = Vector2.sub(this.#lastMousePos, currentMousePos);

    camera.pos.x += (delta.x * this.PAN_SPEED) / this.#zoomLevel;
    camera.pos.y -= (delta.y * this.PAN_SPEED) / this.#zoomLevel;

    this.#lastMousePos = currentMousePos;
  };

  #onWheel = (event: WheelEvent) => {
    if (!this.active) return;

    event.preventDefault();

    const camera = Camera.getActive(this.game);
    if (!camera) return;

    const zoomDelta = event.deltaY > 0 ? -this.ZOOM_SPEED : this.ZOOM_SPEED;
    this.#zoomLevel = Math.max(
      this.MIN_ZOOM,
      Math.min(this.MAX_ZOOM, this.#zoomLevel + zoomDelta),
    );

    camera.zoom = this.#zoomLevel;
  };
}
