const MIN_HOLD_MS = 60; // ignore taps shorter than this

export interface InputCallbacks {
  onPress(uv: [number, number]): void;
  onHoldUpdate(uv: [number, number]): void;
  onRelease(uv: [number, number], duration: number): void;
}

export class InputHandler {
  private canvas: HTMLCanvasElement;
  private callbacks: InputCallbacks;
  private isHolding = false;
  private holdStart = 0;
  private holdPosition: [number, number] = [0, 0];
  private pressCommitted = false;
  private holdTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(canvas: HTMLCanvasElement, callbacks: InputCallbacks) {
    this.canvas = canvas;
    this.callbacks = callbacks;

    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerUp);
    // Prevent touch scrolling and text selection on canvas
    canvas.style.touchAction = "none";
    canvas.style.userSelect = "none";
    canvas.style.webkitUserSelect = "none";
  }

  private screenToUV(e: PointerEvent): [number, number] {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = 1 - (e.clientY - rect.top) / rect.height; // flip Y for WebGL
    return [x, y];
  }

  private onPointerDown = (e: PointerEvent): void => {
    e.preventDefault();
    this.isHolding = true;
    this.pressCommitted = false;
    this.holdStart = performance.now();
    this.holdPosition = this.screenToUV(e);

    // Defer onPress until minimum hold duration
    this.holdTimer = setTimeout(() => {
      if (this.isHolding) {
        this.pressCommitted = true;
        this.callbacks.onPress(this.holdPosition);
      }
    }, MIN_HOLD_MS);
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.isHolding || !this.pressCommitted) return;
    this.callbacks.onHoldUpdate(this.holdPosition);
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (!this.isHolding) return;
    this.isHolding = false;

    if (this.holdTimer !== null) {
      clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }

    if (!this.pressCommitted) return; // too short — ignore entirely

    const duration = (performance.now() - this.holdStart) / 1000;
    this.callbacks.onRelease(this.holdPosition, duration);
  };
}
