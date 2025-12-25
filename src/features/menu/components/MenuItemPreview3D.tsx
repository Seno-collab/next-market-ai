"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type MenuItemPreview3DProps = {
  imageUrl?: string;
  accent?: string;
};

const CARD_WIDTH = 2.2;
const CARD_HEIGHT = 1.4;
const CARD_DEPTH = 0.12;

export function MenuItemPreview3D({ imageUrl, accent = "#f97316" }: MenuItemPreview3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const frontMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const sideMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const outlineMaterialRef = useRef<THREE.LineBasicMaterial | null>(null);
  const glowMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const rimLightRef = useRef<THREE.PointLight | null>(null);
  const textureRef = useRef<THREE.Texture | null>(null);
  const frameRef = useRef<number>(0);
  const isDraggingRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const rotationRef = useRef(new THREE.Vector2(0.2, -0.35));
  const targetRotationRef = useRef(new THREE.Vector2(0.2, -0.35));

  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl) {
      return undefined;
    }

    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(globalThis.window.devicePixelRatio, 2));
    renderer.setSize(mountEl.clientWidth, mountEl.clientHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.domElement.style.pointerEvents = "none";
    mountEl.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(35, mountEl.clientWidth / mountEl.clientHeight, 0.1, 20);
    camera.position.set(0, 0, 4);

    const group = new THREE.Group();
    group.scale.set(1.05, 1.05, 1.05);
    groupRef.current = group;
    scene.add(group);

    const accentColor = new THREE.Color(accent);
    const frontMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.35,
      metalness: 0.2,
      clearcoat: 0.4,
      clearcoatRoughness: 0.2,
    });
    const sideMaterial = new THREE.MeshStandardMaterial({
      color: accentColor,
      roughness: 0.4,
      metalness: 0.4,
    });
    const backMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.6,
      metalness: 0.2,
    });

    frontMaterialRef.current = frontMaterial;
    sideMaterialRef.current = sideMaterial;

    const geometry = new THREE.BoxGeometry(CARD_WIDTH, CARD_HEIGHT, CARD_DEPTH);
    const card = new THREE.Mesh(geometry, [
      sideMaterial,
      sideMaterial,
      sideMaterial,
      sideMaterial,
      frontMaterial,
      backMaterial,
    ]);
    group.add(card);

    const outlineMaterial = new THREE.LineBasicMaterial({
      color: accentColor,
      transparent: true,
      opacity: 0.35,
    });
    const outline = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), outlineMaterial);
    outline.position.z = CARD_DEPTH * 0.6;
    group.add(outline);

    const glowMaterial = new THREE.MeshBasicMaterial({
      color: accentColor,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
    });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(CARD_WIDTH * 1.1, CARD_HEIGHT * 1.1), glowMaterial);
    glow.position.z = -CARD_DEPTH * 2;
    group.add(glow);

    outlineMaterialRef.current = outlineMaterial;
    glowMaterialRef.current = glowMaterial;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
    keyLight.position.set(2, 3, 4);
    const rimLight = new THREE.PointLight(accentColor, 0.6, 10);
    rimLight.position.set(-3, 2, 4);
    rimLightRef.current = rimLight;
    scene.add(ambientLight, keyLight, rimLight);

    const handleResize = () => {
      const { clientWidth, clientHeight } = mountEl;
      renderer.setSize(clientWidth, clientHeight);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
    };

    const handlePointerDown = (event: PointerEvent) => {
      isDraggingRef.current = true;
      lastPointerRef.current = { x: event.clientX, y: event.clientY };
      try {
        mountEl.setPointerCapture(event.pointerId);
      } catch {
        // no-op for browsers that do not support pointer capture
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!isDraggingRef.current) {
        return;
      }
      const rect = mountEl.getBoundingClientRect();
      const deltaX = (event.clientX - lastPointerRef.current.x) / rect.width;
      const deltaY = (event.clientY - lastPointerRef.current.y) / rect.height;
      targetRotationRef.current.y += deltaX * 2.4;
      targetRotationRef.current.x += deltaY * 2.2;
      lastPointerRef.current = { x: event.clientX, y: event.clientY };
    };

    const handlePointerUp = (event: PointerEvent) => {
      isDraggingRef.current = false;
      try {
        mountEl.releasePointerCapture(event.pointerId);
      } catch {
        // no-op
      }
    };

    mountEl.addEventListener("pointerdown", handlePointerDown);
    mountEl.addEventListener("pointermove", handlePointerMove);
    mountEl.addEventListener("pointerup", handlePointerUp);
    mountEl.addEventListener("pointerleave", handlePointerUp);
    globalThis.window.addEventListener("resize", handleResize);

    const reduceMotion = globalThis.window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let lastTime = performance.now();
    const animate = (time: number) => {
      const delta = Math.min(0.033, (time - lastTime) / 1000);
      lastTime = time;
      if (!isDraggingRef.current && !reduceMotion) {
        targetRotationRef.current.y += delta * 0.6;
      }
      rotationRef.current.x += (targetRotationRef.current.x - rotationRef.current.x) * 0.08;
      rotationRef.current.y += (targetRotationRef.current.y - rotationRef.current.y) * 0.08;
      group.rotation.x = rotationRef.current.x;
      group.rotation.y = rotationRef.current.y;
      group.position.y = Math.sin(time * 0.0012) * 0.04;
      renderer.render(scene, camera);
      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = camera;

    return () => {
      cancelAnimationFrame(frameRef.current);
      globalThis.window.removeEventListener("resize", handleResize);
      mountEl.removeEventListener("pointerdown", handlePointerDown);
      mountEl.removeEventListener("pointermove", handlePointerMove);
      mountEl.removeEventListener("pointerup", handlePointerUp);
      mountEl.removeEventListener("pointerleave", handlePointerUp);

      geometry.dispose();
      frontMaterial.dispose();
      sideMaterial.dispose();
      backMaterial.dispose();
      outlineMaterial.dispose();
      glowMaterial.dispose();
      textureRef.current?.dispose();
      renderer.dispose();
      mountEl.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    const material = frontMaterialRef.current;
    if (!material) {
      return;
    }

    if (!imageUrl) {
      if (textureRef.current) {
        textureRef.current.dispose();
        textureRef.current = null;
      }
      material.map = null;
      material.color.set(0xffedd5);
      material.needsUpdate = true;
      return;
    }

    const loader = new THREE.TextureLoader();
    loader.crossOrigin = "anonymous";
    loader.load(
      imageUrl,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        const renderer = rendererRef.current;
        if (renderer) {
          texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        }
        textureRef.current?.dispose();
        textureRef.current = texture;
        material.map = texture;
        material.color.set(0xffffff);
        material.needsUpdate = true;
      },
      undefined,
      () => {
        material.map = null;
        material.color.set(0xffedd5);
        material.needsUpdate = true;
      },
    );
  }, [imageUrl]);

  useEffect(() => {
    const accentColor = new THREE.Color(accent);
    sideMaterialRef.current?.color.set(accentColor);
    outlineMaterialRef.current?.color.set(accentColor);
    glowMaterialRef.current?.color.set(accentColor);
    if (rimLightRef.current) {
      rimLightRef.current.color = accentColor;
    }
  }, [accent]);

  return <div className="menu-spotlight-media menu-preview-3d" ref={mountRef} />;
}
