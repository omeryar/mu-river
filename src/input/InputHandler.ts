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

  constructor(canvas: HTMLCanvasElement, callbacks: InputCallbacks) {
    this.canvas = canvas;
    this.callbacks = callbacks;

    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerUp);
    // Prevent touch scrolling on canvas
    canvas.style.touchAction = 'none';
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
    this.holdStart = performance.now();
    this.holdPosition = this.screenToUV(e);
    this.callbacks.onPress(this.holdPosition);
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.isHolding) return;
    this.callbacks.onHoldUpdate(this.holdPosition);
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (!this.isHolding) return;
    this.isHolding = false;
    const duration = (performance.now() - this.holdStart) / 1000;
    this.callbacks.onRelease(this.holdPosition, duration);
  };
}
