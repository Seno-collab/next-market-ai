"use client";

import { useEffect, useRef, type ReactNode } from "react";
import * as THREE from "three";

type MetricCard3DProps = {
  icon: ReactNode;
  label: string;
  value: string | number;
  variant?: "cyan" | "purple" | "orange" | "green";
  className?: string;
};

const variantConfigs = {
  cyan: { main: 0x22d3ee, secondary: 0x0891b2, glow: "rgba(34, 211, 238, 0.3)" },
  purple: { main: 0x8b5cf6, secondary: 0x7c3aed, glow: "rgba(139, 92, 246, 0.3)" },
  orange: { main: 0xf97316, secondary: 0xea580c, glow: "rgba(249, 115, 22, 0.3)" },
  green: { main: 0x10b981, secondary: 0x059669, glow: "rgba(16, 185, 129, 0.3)" },
};

export function MetricCard3D({
  icon,
  label,
  value,
  variant = "cyan",
  className = "",
}: MetricCard3DProps) {
  const canvasRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = canvasRef.current;
    if (!container) return undefined;

    const config = variantConfigs[variant];

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

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.z = 10;

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];

    // Rotating icosahedron
    const icoGeometry = new THREE.IcosahedronGeometry(2, 1);
    const icoMaterial = new THREE.MeshBasicMaterial({
      color: config.main,
      wireframe: true,
      transparent: true,
      opacity: 0.4,
    });
    geometries.push(icoGeometry);
    materials.push(icoMaterial);
    const icosahedron = new THREE.Mesh(icoGeometry, icoMaterial);
    icosahedron.position.set(3, 0, 0);
    scene.add(icosahedron);

    // Orbiting particles
    const particleCount = 50;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    const mainColor = new THREE.Color(config.main);
    const secondaryColor = new THREE.Color(config.secondary);

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = 3 + Math.random() * 2;
      particlePositions[i * 3] = Math.cos(angle) * radius;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 4;
      particlePositions[i * 3 + 2] = Math.sin(angle) * radius;

      const color = Math.random() > 0.5 ? mainColor : secondaryColor;
      particleColors[i * 3] = color.r;
      particleColors[i * 3 + 1] = color.g;
      particleColors[i * 3 + 2] = color.b;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.Float32BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute("color", new THREE.Float32BufferAttribute(particleColors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    geometries.push(particleGeometry);
    materials.push(particleMaterial);

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // Glowing ring
    const ringGeometry = new THREE.TorusGeometry(3.5, 0.02, 8, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: config.main,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
    });
    geometries.push(ringGeometry);
    materials.push(ringMaterial);
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);

    // Animation
    const clock = new THREE.Clock();
    let frameId = 0;
    let isHovered = false;

    const animate = () => {
      const t = clock.getElapsedTime();

      // Rotate icosahedron
      icosahedron.rotation.x = t * 0.5;
      icosahedron.rotation.y = t * 0.3;
      icosahedron.scale.setScalar(isHovered ? 1.2 : 1);

      // Rotate particles
      particles.rotation.y = t * 0.2;

      // Pulse ring
      const scale = 1 + Math.sin(t * 2) * 0.05;
      ring.scale.setScalar(scale);
      ring.rotation.z = t * 0.1;

      // Update material opacity on hover
      icoMaterial.opacity = isHovered ? 0.6 : 0.4;
      ringMaterial.opacity = isHovered ? 0.5 : 0.3;

      renderer.render(scene, camera);
      frameId = globalThis.requestAnimationFrame(animate);
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
      globalThis.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      container.removeEventListener("mouseenter", handleMouseEnter);
      container.removeEventListener("mouseleave", handleMouseLeave);
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [variant]);

  const config = variantConfigs[variant];

  return (
    <div className={`metric-card-3d metric-card-3d--${variant} ${className}`}>
      <div className="metric-card-3d__canvas" ref={canvasRef} />
      <div className="metric-card-3d__content">
        <div className="metric-card-3d__icon">{icon}</div>
        <div className="metric-card-3d__info">
          <span className="metric-card-3d__label">{label}</span>
          <span className="metric-card-3d__value">{value}</span>
        </div>
      </div>
      <div
        className="metric-card-3d__glow"
        style={{ background: `radial-gradient(circle at 50% 50%, ${config.glow}, transparent 70%)` }}
      />
    </div>
  );
}
