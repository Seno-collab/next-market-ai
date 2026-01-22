"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { createToastEffect } from "./toastEffects";
import type { ToastType, TrackedToast } from "./types";

const FADE_IN_DURATION = 200; // ms
const FADE_OUT_DURATION = 400; // ms
const TOAST_DURATION = 4000; // ms (matches autoClose)

export function HolographicToastContainer() {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const frameIdRef = useRef<number>(0);
  const trackedToastsRef = useRef<Map<string, TrackedToast>>(new Map());
  const observerRef = useRef<MutationObserver | null>(null);
  const clockRef = useRef<THREE.Clock | null>(null);

  useEffect(() => {
    // Check WebGL support
    if (!window.WebGLRenderingContext) {
      console.warn("WebGL not supported, 3D toast effects disabled");
      return undefined;
    }

    const container = canvasRef.current;
    if (!container) return undefined;

    // Setup renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Setup scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Setup orthographic camera (for 2D overlay effect)
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 10;
    const camera = new THREE.OrthographicCamera(
      (-frustumSize * aspect) / 2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      1000
    );
    camera.position.z = 5;
    cameraRef.current = camera;

    // Setup clock
    const clock = new THREE.Clock();
    clockRef.current = clock;

    // Track toasts map
    const trackedToasts = trackedToastsRef.current;

    /**
     * Extract toast ID from element
     */
    const getToastId = (element: HTMLElement): string | null => {
      // react-toastify uses data-toast-id or we can use a unique identifier
      const id = element.getAttribute("data-toast-id") || element.id;
      if (id) return id;

      // Fallback: generate ID from text content
      const textContent = element.textContent?.trim() || "";
      return textContent ? `toast-${textContent.substring(0, 20)}` : null;
    };

    /**
     * Get toast type from element classes
     */
    const getToastType = (element: HTMLElement): ToastType | null => {
      if (element.classList.contains("Toastify__toast--success")) return "success";
      if (element.classList.contains("Toastify__toast--error")) return "error";
      if (element.classList.contains("Toastify__toast--warning")) return "warning";
      return null;
    };

    /**
     * Convert DOM position to 3D world position
     */
    const domToWorld = (
      rect: DOMRect,
      camera: THREE.OrthographicCamera
    ): THREE.Vector3 => {
      const x = ((rect.left + rect.width / 2) / window.innerWidth) * 2 - 1;
      const y = -((rect.top + rect.height / 2) / window.innerHeight) * 2 + 1;

      const worldX = x * ((frustumSize * aspect) / 2);
      const worldY = y * (frustumSize / 2);

      return new THREE.Vector3(worldX, worldY, 0);
    };

    /**
     * Update effect position to match DOM element
     */
    const updateEffectPosition = (toast: TrackedToast) => {
      const rect = toast.element.getBoundingClientRect();
      const worldPos = domToWorld(rect, camera);
      toast.effect.group.position.copy(worldPos);
    };

    /**
     * Handle new toast appearing
     */
    const onToastAdded = (element: HTMLElement) => {
      const id = getToastId(element);
      const type = getToastType(element);

      if (!id || !type) return;

      // Don't add if already tracked
      if (trackedToasts.has(id)) return;

      // Create effect
      const effect = createToastEffect(type);
      scene.add(effect.group);

      // Track toast
      const now = clock.getElapsedTime() * 1000;
      const trackedToast: TrackedToast = {
        id,
        type,
        element,
        effect,
        fadeInStart: now,
        fadeOutStart: null,
      };

      trackedToasts.set(id, trackedToast);

      // Position effect
      updateEffectPosition(trackedToast);

      // Set initial opacity to 0 for fade in
      effect.group.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.Points) {
          const material = child.material as THREE.Material & { opacity?: number };
          if (material.opacity !== undefined) {
            material.userData.targetOpacity = material.opacity;
            material.opacity = 0;
          }
        }
      });
    };

    /**
     * Handle toast removal
     */
    const onToastRemoved = (id: string) => {
      const toast = trackedToasts.get(id);
      if (!toast) return;

      // Start fade out
      const now = clock.getElapsedTime() * 1000;
      toast.fadeOutStart = now;
    };

    /**
     * Scan for existing toasts
     */
    const scanToasts = () => {
      const toastContainer = document.querySelector(".Toastify__toast-container");
      if (!toastContainer) return;

      const toastElements = toastContainer.querySelectorAll(".Toastify__toast");
      const currentIds = new Set<string>();

      // Check for new toasts
      toastElements.forEach((element) => {
        if (element instanceof HTMLElement) {
          const id = getToastId(element);
          if (id) {
            currentIds.add(id);
            if (!trackedToasts.has(id)) {
              onToastAdded(element);
            }
          }
        }
      });

      // Check for removed toasts
      trackedToasts.forEach((toast, id) => {
        if (!currentIds.has(id)) {
          onToastRemoved(id);
        }
      });
    };

    /**
     * Setup MutationObserver to watch for toast changes
     */
    const setupObserver = () => {
      const toastContainer = document.querySelector(".Toastify__toast-container");
      if (!toastContainer) {
        // Retry after a short delay
        setTimeout(setupObserver, 100);
        return;
      }

      const observer = new MutationObserver(() => {
        scanToasts();
      });

      observer.observe(toastContainer, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "style"],
      });

      observerRef.current = observer;

      // Initial scan
      scanToasts();
    };

    setupObserver();

    /**
     * Animation loop
     */
    const animate = () => {
      const time = clock.getElapsedTime();
      const delta = clock.getDelta();
      const now = time * 1000;

      // Update each effect
      trackedToasts.forEach((toast, id) => {
        // Update position to follow DOM
        updateEffectPosition(toast);

        // Animate effect
        toast.effect.animate(time, delta);

        // Handle fade in
        if (toast.fadeOutStart === null) {
          const fadeInProgress = Math.min(
            (now - toast.fadeInStart) / FADE_IN_DURATION,
            1
          );

          toast.effect.group.traverse((child) => {
            if (child instanceof THREE.Mesh || child instanceof THREE.Points) {
              const material = child.material as THREE.Material & { opacity?: number };
              if (material.opacity !== undefined && material.userData.targetOpacity) {
                material.opacity = material.userData.targetOpacity * fadeInProgress;
              }
            }
          });
        }

        // Handle fade out
        if (toast.fadeOutStart !== null) {
          const fadeOutProgress = Math.min(
            (now - toast.fadeOutStart) / FADE_OUT_DURATION,
            1
          );

          toast.effect.group.traverse((child) => {
            if (child instanceof THREE.Mesh || child instanceof THREE.Points) {
              const material = child.material as THREE.Material & { opacity?: number };
              if (material.opacity !== undefined && material.userData.targetOpacity) {
                material.opacity =
                  material.userData.targetOpacity * (1 - fadeOutProgress);
              }
            }
          });

          // Remove after fade out complete
          if (fadeOutProgress >= 1) {
            scene.remove(toast.effect.group);
            toast.effect.dispose();
            trackedToasts.delete(id);
          }
        }
      });

      // Render
      renderer.render(scene, camera);
      frameIdRef.current = requestAnimationFrame(animate);
    };

    animate();

    /**
     * Handle window resize
     */
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const aspect = width / height;

      renderer.setSize(width, height);

      camera.left = (-frustumSize * aspect) / 2;
      camera.right = (frustumSize * aspect) / 2;
      camera.top = frustumSize / 2;
      camera.bottom = -frustumSize / 2;
      camera.updateProjectionMatrix();
    };

    window.addEventListener("resize", handleResize);

    /**
     * Cleanup
     */
    return () => {
      cancelAnimationFrame(frameIdRef.current);
      window.removeEventListener("resize", handleResize);

      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      // Dispose all tracked toasts
      trackedToasts.forEach((toast) => {
        scene.remove(toast.effect.group);
        toast.effect.dispose();
      });
      trackedToasts.clear();

      // Dispose renderer
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={canvasRef} className="holographic-toast-canvas" />;
}
