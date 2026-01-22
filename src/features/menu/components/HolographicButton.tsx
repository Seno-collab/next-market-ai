"use client";

import { useEffect, useRef, type ReactNode, type CSSProperties } from "react";
import * as THREE from "three";

type HolographicButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "danger" | "default" | "success";
  icon?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
};

const variantColors = {
  primary: { main: 0x22d3ee, secondary: 0x8b5cf6 },
  danger: { main: 0xef4444, secondary: 0xf97316 },
  default: { main: 0x64748b, secondary: 0x94a3b8 },
  success: { main: 0x10b981, secondary: 0x22d3ee },
};

export function HolographicButton({
  children,
  onClick,
  variant = "default",
  icon,
  loading,
  disabled,
  className = "",
  style,
}: HolographicButtonProps) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const frameIdRef = useRef<number>(0);

  useEffect(() => {
    const container = canvasRef.current;
    if (!container) return undefined;

    const variantConfig = variantColors[variant];

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(Math.min(globalThis.window.devicePixelRatio, 1.5));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.z = 5;

    // Particles
    const particleCount = 30;
    const positions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    const speeds: number[] = [];

    const mainColor = new THREE.Color(variantConfig.main);
    const secondaryColor = new THREE.Color(variantConfig.secondary);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 3;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2;

      const color = Math.random() > 0.5 ? mainColor : secondaryColor;
      particleColors[i * 3] = color.r;
      particleColors[i * 3 + 1] = color.g;
      particleColors[i * 3 + 2] = color.b;

      speeds.push(0.01 + Math.random() * 0.02);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(particleColors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Glowing ring
    const ringGeometry = new THREE.TorusGeometry(2, 0.02, 8, 50);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: variantColors[variant].main,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);

    // Animation
    const clock = new THREE.Clock();
    let isHovered = false;

    const animate = () => {
      const t = clock.getElapsedTime();
      const positionsArray = geometry.attributes.position.array as Float32Array;

      for (let i = 0; i < particleCount; i++) {
        positionsArray[i * 3] += speeds[i] * (isHovered ? 2 : 1);
        if (positionsArray[i * 3] > 4) {
          positionsArray[i * 3] = -4;
        }
      }
      geometry.attributes.position.needsUpdate = true;

      ring.rotation.z = t * 0.5;
      ring.scale.setScalar(1 + Math.sin(t * 2) * 0.05);
      ringMaterial.opacity = isHovered ? 0.5 : 0.3;
      material.opacity = isHovered ? 0.8 : 0.6;

      renderer.render(scene, camera);
      frameIdRef.current = globalThis.requestAnimationFrame(animate);
    };

    animate();

    // Hover handlers
    const handleMouseEnter = () => {
      isHovered = true;
    };
    const handleMouseLeave = () => {
      isHovered = false;
    };

    container.addEventListener("mouseenter", handleMouseEnter);
    container.addEventListener("mouseleave", handleMouseLeave);

    // Resize
    const handleResize = () => {
      const { clientWidth, clientHeight } = container;
      renderer.setSize(clientWidth, clientHeight);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      globalThis.cancelAnimationFrame(frameIdRef.current);
      resizeObserver.disconnect();
      container.removeEventListener("mouseenter", handleMouseEnter);
      container.removeEventListener("mouseleave", handleMouseLeave);
      geometry.dispose();
      material.dispose();
      ringGeometry.dispose();
      ringMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [variant]);

  return (
    <button
      type="button"
      className={`holographic-btn holographic-btn--${variant} ${className} ${loading ? "is-loading" : ""} ${disabled ? "is-disabled" : ""}`}
      onClick={disabled || loading ? undefined : onClick}
      disabled={disabled || loading}
      style={style}
    >
      <div className="holographic-btn__canvas" ref={canvasRef} />
      <div className="holographic-btn__content">
        {loading ? (
          <span className="holographic-btn__spinner" />
        ) : (
          <>
            {icon && <span className="holographic-btn__icon">{icon}</span>}
            <span className="holographic-btn__text">{children}</span>
          </>
        )}
      </div>
      <div className="holographic-btn__glow" />
      <div className="holographic-btn__border" />
    </button>
  );
}
