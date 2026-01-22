import * as THREE from "three";

export type ToastType = "success" | "error" | "warning";

export interface ToastEffect {
  group: THREE.Group;
  animate: (time: number, delta: number) => void;
  dispose: () => void;
}

export interface ToastPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TrackedToast {
  id: string;
  type: ToastType;
  element: HTMLElement;
  effect: ToastEffect;
  fadeInStart: number;
  fadeOutStart: number | null;
}
