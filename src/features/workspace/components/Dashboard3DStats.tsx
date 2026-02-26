"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type StatCard = {
  value: string;
  label: string;
  change: string;
  color: number;
  position: [number, number, number];
};

const STATS: StatCard[] = [
  { value: "2,847", label: "Total Orders", change: "+12.5%", color: 0x22d3ee, position: [-2.2, 1, 0] },
  { value: "$48.2K", label: "Revenue", change: "+8.2%", color: 0x60a5fa, position: [0, 1.5, 0] },
  { value: "1,234", label: "Active Users", change: "+23.1%", color: 0xa78bfa, position: [2.2, 1, 0] },
  { value: "98.5%", label: "Uptime", change: "+0.2%", color: 0x34d399, position: [-1.1, -0.8, 0] },
  { value: "4.8★", label: "Rating", change: "+0.3", color: 0xfbbf24, position: [1.1, -0.8, 0] },
];

function createTextTexture(
  value: string,
  label: string,
  change: string,
  color: number
): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext("2d")!;

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "rgba(15, 23, 42, 0.95)");
  gradient.addColorStop(1, "rgba(10, 15, 30, 0.98)");
  ctx.fillStyle = gradient;

  // Rounded rectangle
  const radius = 24;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(canvas.width - radius, 0);
  ctx.quadraticCurveTo(canvas.width, 0, canvas.width, radius);
  ctx.lineTo(canvas.width, canvas.height - radius);
  ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - radius, canvas.height);
  ctx.lineTo(radius, canvas.height);
  ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fill();

  // Border glow
  const colorHex = `#${color.toString(16).padStart(6, "0")}`;
  ctx.strokeStyle = colorHex;
  ctx.lineWidth = 3;
  ctx.shadowColor = colorHex;
  ctx.shadowBlur = 20;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Top accent line
  ctx.beginPath();
  ctx.moveTo(40, 20);
  ctx.lineTo(canvas.width - 40, 20);
  const accentGradient = ctx.createLinearGradient(40, 0, canvas.width - 40, 0);
  accentGradient.addColorStop(0, "transparent");
  accentGradient.addColorStop(0.5, colorHex);
  accentGradient.addColorStop(1, "transparent");
  ctx.strokeStyle = accentGradient;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Value text
  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 72px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(value, canvas.width / 2, 120);

  // Label text
  ctx.fillStyle = "#94a3b8";
  ctx.font = "500 28px system-ui, -apple-system, sans-serif";
  ctx.fillText(label, canvas.width / 2, 190);

  // Change indicator
  const isPositive = change.startsWith("+");
  ctx.fillStyle = isPositive ? "#34d399" : "#f87171";
  ctx.font = "600 24px system-ui, -apple-system, sans-serif";
  ctx.fillText(change, canvas.width / 2, 250);

  // Small decorative dots
  ctx.fillStyle = colorHex;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.arc(30, canvas.height - 30, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(50, canvas.height - 30, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(70, canvas.height - 30, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export default function Dashboard3DStats() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl) return undefined;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(globalThis.window.devicePixelRatio, 2));
    renderer.setSize(mountEl.clientWidth, mountEl.clientHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mountEl.appendChild(renderer.domElement);

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(
      50,
      mountEl.clientWidth / mountEl.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 7);

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const textures: THREE.Texture[] = [];

    // Create stat cards
    const cards: THREE.Mesh[] = [];
    const cardGroup = new THREE.Group();

    STATS.forEach((stat, index) => {
      const texture = createTextTexture(stat.value, stat.label, stat.change, stat.color);
      textures.push(texture);

      const cardGeometry = new THREE.PlaneGeometry(2, 1.25);
      const cardMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
      });
      geometries.push(cardGeometry);
      materials.push(cardMaterial);

      const card = new THREE.Mesh(cardGeometry, cardMaterial);
      card.position.set(...stat.position);
      card.userData = {
        basePosition: [...stat.position],
        phaseOffset: index * 0.8,
        color: stat.color,
      };
      cards.push(card);
      cardGroup.add(card);

      // Glow plane behind card
      const glowGeometry = new THREE.PlaneGeometry(2.2, 1.45);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: stat.color,
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      geometries.push(glowGeometry);
      materials.push(glowMaterial);

      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.position.set(stat.position[0], stat.position[1], stat.position[2] - 0.05);
      glow.userData = { baseZ: stat.position[2] - 0.05, phaseOffset: index * 0.8 };
      cardGroup.add(glow);
    });

    scene.add(cardGroup);

    // Floating particles
    const particleCount = 150;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    const particleData: Array<{ speed: number; amplitude: number; phase: number }> = [];

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 12;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 8;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 4 - 2;

      const colorChoice = Math.random();
      if (colorChoice > 0.7) {
        particleColors[i * 3] = 0.13;
        particleColors[i * 3 + 1] = 0.83;
        particleColors[i * 3 + 2] = 0.93;
      } else if (colorChoice > 0.4) {
        particleColors[i * 3] = 0.38;
        particleColors[i * 3 + 1] = 0.65;
        particleColors[i * 3 + 2] = 0.98;
      } else {
        particleColors[i * 3] = 0.65;
        particleColors[i * 3 + 1] = 0.55;
        particleColors[i * 3 + 2] = 0.98;
      }

      particleData.push({
        speed: 0.5 + Math.random() * 1,
        amplitude: 0.1 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2,
      });
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.Float32BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute("color", new THREE.Float32BufferAttribute(particleColors, 3));
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.06,
      transparent: true,
      opacity: 0.7,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    geometries.push(particleGeometry);
    materials.push(particleMaterial);
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // Connecting lines between particles
    const linePositions: number[] = [];
    for (let i = 0; i < 20; i++) {
      const idx1 = Math.floor(Math.random() * particleCount);
      const idx2 = Math.floor(Math.random() * particleCount);
      linePositions.push(
        particlePositions[idx1 * 3],
        particlePositions[idx1 * 3 + 1],
        particlePositions[idx1 * 3 + 2],
        particlePositions[idx2 * 3],
        particlePositions[idx2 * 3 + 1],
        particlePositions[idx2 * 3 + 2]
      );
    }
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.1,
    });
    geometries.push(lineGeometry);
    materials.push(lineMaterial);
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lines);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);

    // Mouse interaction
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = mountEl.getBoundingClientRect();
      mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };
    mountEl.addEventListener("mousemove", handleMouseMove);

    // Resize handler
    const handleResize = () => {
      const { clientWidth, clientHeight } = mountEl;
      renderer.setSize(clientWidth, clientHeight);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
    };
    globalThis.window.addEventListener("resize", handleResize);

    // Animation
    const clock = new THREE.Clock();
    let frameId = 0;

    const animate = () => {
      const t = clock.getElapsedTime();

      // Card animations
      cards.forEach((card) => {
        const { basePosition, phaseOffset } = card.userData;
        card.position.y = basePosition[1] + Math.sin(t * 0.8 + phaseOffset) * 0.1;
        card.position.z = basePosition[2] + Math.sin(t * 0.5 + phaseOffset) * 0.05;
        card.rotation.y = mouseX * 0.1;
        card.rotation.x = -mouseY * 0.05;
      });

      // Glow animations
      cardGroup.children.forEach((child) => {
        if (child.userData.baseZ !== undefined && child instanceof THREE.Mesh) {
          const mat = child.material as THREE.MeshBasicMaterial;
          mat.opacity = 0.1 + Math.sin(t * 1.2 + child.userData.phaseOffset) * 0.08;
        }
      });

      // Particle movement
      const positions = particleGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        const data = particleData[i];
        positions[i * 3 + 1] += Math.sin(t * data.speed + data.phase) * 0.002;
        positions[i * 3] += Math.cos(t * data.speed * 0.5 + data.phase) * 0.001;
      }
      particleGeometry.attributes.position.needsUpdate = true;

      // Line opacity pulse
      lineMaterial.opacity = 0.08 + Math.sin(t * 0.5) * 0.04;

      // Subtle camera movement
      camera.position.x = mouseX * 0.3;
      camera.position.y = mouseY * 0.2;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      frameId = globalThis.requestAnimationFrame(animate);
    };

    animate();

    return () => {
      globalThis.cancelAnimationFrame(frameId);
      globalThis.window.removeEventListener("resize", handleResize);
      mountEl.removeEventListener("mousemove", handleMouseMove);
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div className="stats-3d-stage" ref={mountRef} />;
}
