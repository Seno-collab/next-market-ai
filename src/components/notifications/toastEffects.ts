import * as THREE from "three";
import type { ToastEffect } from "./types";

// Shared geometries and materials for better performance
const particleGeometry = new THREE.BufferGeometry();
const particleCount = 18;
const particlePositions = new Float32Array(particleCount * 3);

for (let i = 0; i < particleCount; i++) {
  particlePositions[i * 3] = (Math.random() - 0.5) * 2;
  particlePositions[i * 3 + 1] = Math.random() * 1.5;
  particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
}

particleGeometry.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(particlePositions, 3)
);

/**
 * Creates success effect with cyan floating particles
 */
export function createSuccessEffect(): ToastEffect {
  const group = new THREE.Group();

  // Clone positions for this instance
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 2;
    positions[i * 3 + 1] = Math.random() * 1.5 - 0.75;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    size: 0.08,
    color: 0x22d3ee, // Cyan
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const particles = new THREE.Points(geometry, material);
  group.add(particles);

  // Store speeds for animation
  const speeds: number[] = [];
  for (let i = 0; i < particleCount; i++) {
    speeds.push(0.01 + Math.random() * 0.015);
  }

  const animate = (time: number, delta: number) => {
    const posArray = geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < particleCount; i++) {
      // Drift upward
      posArray[i * 3 + 1] += speeds[i];

      // Reset when particle goes too high
      if (posArray[i * 3 + 1] > 1.5) {
        posArray[i * 3 + 1] = -1.5;
      }

      // Gentle horizontal drift
      posArray[i * 3] += Math.sin(time + i) * 0.002;
    }

    geometry.attributes.position.needsUpdate = true;
  };

  const dispose = () => {
    geometry.dispose();
    material.dispose();
  };

  return { group, animate, dispose };
}

/**
 * Creates error effect with red pulsing glow
 */
export function createErrorEffect(): ToastEffect {
  const group = new THREE.Group();

  // Create a plane for the glow effect
  const geometry = new THREE.PlaneGeometry(3, 1.2);
  const material = new THREE.MeshBasicMaterial({
    color: 0xef4444, // Red
    transparent: true,
    opacity: 0.15,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const plane = new THREE.Mesh(geometry, material);
  group.add(plane);

  let baseOpacity = 0.15;

  const animate = (time: number, delta: number) => {
    // Gentle pulsing
    const pulse = Math.sin(time * 0.8) * 0.1;
    material.opacity = baseOpacity + pulse;
  };

  const dispose = () => {
    geometry.dispose();
    material.dispose();
  };

  return { group, animate, dispose };
}

/**
 * Creates warning effect with amber shimmer
 */
export function createWarningEffect(): ToastEffect {
  const group = new THREE.Group();

  // Create edge lines for shimmer effect
  const edgeGeometry = new THREE.EdgesGeometry(new THREE.PlaneGeometry(3, 1.2));
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0xf59e0b, // Amber
    transparent: true,
    opacity: 0.25,
    blending: THREE.AdditiveBlending,
  });

  const edges = new THREE.LineSegments(edgeGeometry, lineMaterial);
  group.add(edges);

  // Add subtle glow plane
  const glowGeometry = new THREE.PlaneGeometry(3, 1.2);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.08,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const glowPlane = new THREE.Mesh(glowGeometry, glowMaterial);
  group.add(glowPlane);

  const animate = (time: number, delta: number) => {
    // Gentle oscillation
    const shimmer = Math.sin(time * 1.2) * 0.15;
    lineMaterial.opacity = 0.25 + shimmer;
    glowMaterial.opacity = 0.08 + shimmer * 0.5;
  };

  const dispose = () => {
    edgeGeometry.dispose();
    lineMaterial.dispose();
    glowGeometry.dispose();
    glowMaterial.dispose();
  };

  return { group, animate, dispose };
}

/**
 * Factory function to create appropriate effect based on toast type
 */
export function createToastEffect(type: "success" | "error" | "warning"): ToastEffect {
  switch (type) {
    case "success":
      return createSuccessEffect();
    case "error":
      return createErrorEffect();
    case "warning":
      return createWarningEffect();
    default:
      return createSuccessEffect();
  }
}
