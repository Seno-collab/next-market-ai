"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function DashboardParticleField() {
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
    renderer.setPixelRatio(Math.min(globalThis.window.devicePixelRatio, 1.5));
    renderer.setSize(mountEl.clientWidth, mountEl.clientHeight);
    renderer.setClearColor(0x000000, 0);
    mountEl.appendChild(renderer.domElement);

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      mountEl.clientWidth / mountEl.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 30;

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];

    // Main flowing particles
    const particleCount = 2000;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const velocities: THREE.Vector3[] = [];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50;

      // Color palette: cyan, blue, purple
      const colorChoice = Math.random();
      if (colorChoice > 0.7) {
        colors[i * 3] = 0.13; // Cyan #22d3ee
        colors[i * 3 + 1] = 0.83;
        colors[i * 3 + 2] = 0.93;
      } else if (colorChoice > 0.4) {
        colors[i * 3] = 0.38; // Blue #60a5fa
        colors[i * 3 + 1] = 0.65;
        colors[i * 3 + 2] = 0.98;
      } else if (colorChoice > 0.2) {
        colors[i * 3] = 0.65; // Purple #a78bfa
        colors[i * 3 + 1] = 0.55;
        colors[i * 3 + 2] = 0.98;
      } else {
        colors[i * 3] = 1; // White
        colors[i * 3 + 1] = 1;
        colors[i * 3 + 2] = 1;
      }

      sizes[i] = Math.random() * 0.8 + 0.2;

      velocities.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02 + 0.01,
          (Math.random() - 0.5) * 0.01
        )
      );
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    particleGeometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    particleGeometry.setAttribute("size", new THREE.Float32BufferAttribute(sizes, 1));
    geometries.push(particleGeometry);

    // Custom shader for better particles
    const particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        pixelRatio: { value: Math.min(globalThis.window.devicePixelRatio, 2) },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float time;
        uniform float pixelRatio;

        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float dist = length(mvPosition.xyz);
          vAlpha = smoothstep(80.0, 20.0, dist);
          gl_PointSize = size * pixelRatio * (150.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, dist) * vAlpha * 0.8;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    materials.push(particleMaterial);

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // Nebula clouds (large faint particles)
    const nebulaCount = 50;
    const nebulaPositions = new Float32Array(nebulaCount * 3);
    const nebulaColors = new Float32Array(nebulaCount * 3);

    for (let i = 0; i < nebulaCount; i++) {
      nebulaPositions[i * 3] = (Math.random() - 0.5) * 80;
      nebulaPositions[i * 3 + 1] = (Math.random() - 0.5) * 50;
      nebulaPositions[i * 3 + 2] = -20 - Math.random() * 30;

      const hue = Math.random() > 0.5 ? 0.55 : 0.75; // Blue or purple
      nebulaColors[i * 3] = hue === 0.55 ? 0.2 : 0.4;
      nebulaColors[i * 3 + 1] = hue === 0.55 ? 0.5 : 0.3;
      nebulaColors[i * 3 + 2] = 0.9;
    }

    const nebulaGeometry = new THREE.BufferGeometry();
    nebulaGeometry.setAttribute("position", new THREE.Float32BufferAttribute(nebulaPositions, 3));
    nebulaGeometry.setAttribute("color", new THREE.Float32BufferAttribute(nebulaColors, 3));
    geometries.push(nebulaGeometry);

    const nebulaMaterial = new THREE.PointsMaterial({
      size: 15,
      transparent: true,
      opacity: 0.03,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    materials.push(nebulaMaterial);

    const nebula = new THREE.Points(nebulaGeometry, nebulaMaterial);
    scene.add(nebula);

    // Grid lines for depth
    const gridGroup = new THREE.Group();
    const gridLineCount = 20;
    const gridSpacing = 5;
    const gridSize = gridLineCount * gridSpacing;

    for (let i = 0; i <= gridLineCount; i++) {
      const lineGeometry = new THREE.BufferGeometry();
      const x = i * gridSpacing - gridSize / 2;

      // Vertical lines
      lineGeometry.setFromPoints([
        new THREE.Vector3(x, -gridSize / 2, 0),
        new THREE.Vector3(x, gridSize / 2, 0),
      ]);

      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x1e40af,
        transparent: true,
        opacity: 0.08,
      });
      geometries.push(lineGeometry);
      materials.push(lineMaterial);

      const line = new THREE.Line(lineGeometry, lineMaterial);
      gridGroup.add(line);

      // Horizontal lines
      const hLineGeometry = new THREE.BufferGeometry();
      hLineGeometry.setFromPoints([
        new THREE.Vector3(-gridSize / 2, x, 0),
        new THREE.Vector3(gridSize / 2, x, 0),
      ]);
      const hLineMaterial = new THREE.LineBasicMaterial({
        color: 0x1e40af,
        transparent: true,
        opacity: 0.08,
      });
      geometries.push(hLineGeometry);
      materials.push(hLineMaterial);

      const hLine = new THREE.Line(hLineGeometry, hLineMaterial);
      gridGroup.add(hLine);
    }

    gridGroup.position.z = -40;
    gridGroup.rotation.x = -0.3;
    scene.add(gridGroup);

    // Floating geometric shapes
    const shapes: THREE.Mesh[] = [];
    const shapeGeometries = [
      new THREE.OctahedronGeometry(0.8),
      new THREE.TetrahedronGeometry(0.7),
      new THREE.IcosahedronGeometry(0.6),
    ];
    geometries.push(...shapeGeometries);

    for (let i = 0; i < 8; i++) {
      const geo = shapeGeometries[i % shapeGeometries.length];
      const mat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0x38bdf8 : 0x818cf8,
        wireframe: true,
        transparent: true,
        opacity: 0.3,
      });
      materials.push(mat);

      const shape = new THREE.Mesh(geo, mat);
      shape.position.set(
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 20 - 10
      );
      shape.userData = {
        rotationSpeed: {
          x: (Math.random() - 0.5) * 0.01,
          y: (Math.random() - 0.5) * 0.01,
          z: (Math.random() - 0.5) * 0.01,
        },
        floatSpeed: Math.random() * 0.5 + 0.3,
        floatAmplitude: Math.random() * 0.5 + 0.2,
        initialY: shape.position.y,
      };
      shapes.push(shape);
      scene.add(shape);
    }

    // Mouse tracking
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      mouseX = (event.clientX / globalThis.window.innerWidth) * 2 - 1;
      mouseY = -(event.clientY / globalThis.window.innerHeight) * 2 + 1;
    };
    globalThis.window.addEventListener("mousemove", handleMouseMove);

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
      particleMaterial.uniforms.time.value = t;

      // Update particle positions
      const posArray = particleGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        posArray[i * 3] += velocities[i].x;
        posArray[i * 3 + 1] += velocities[i].y;
        posArray[i * 3 + 2] += velocities[i].z;

        // Wrap around boundaries
        if (posArray[i * 3] > 50) posArray[i * 3] = -50;
        if (posArray[i * 3] < -50) posArray[i * 3] = 50;
        if (posArray[i * 3 + 1] > 30) posArray[i * 3 + 1] = -30;
        if (posArray[i * 3 + 1] < -30) posArray[i * 3 + 1] = 30;
        if (posArray[i * 3 + 2] > 25) posArray[i * 3 + 2] = -25;
        if (posArray[i * 3 + 2] < -25) posArray[i * 3 + 2] = 25;
      }
      particleGeometry.attributes.position.needsUpdate = true;

      // Nebula drift
      nebula.rotation.z = t * 0.01;
      nebula.position.x = Math.sin(t * 0.1) * 5;

      // Grid animation
      gridGroup.rotation.z = t * 0.02;

      // Shape animations
      shapes.forEach((shape) => {
        const { rotationSpeed, floatSpeed, floatAmplitude, initialY } = shape.userData;
        shape.rotation.x += rotationSpeed.x;
        shape.rotation.y += rotationSpeed.y;
        shape.rotation.z += rotationSpeed.z;
        shape.position.y = initialY + Math.sin(t * floatSpeed) * floatAmplitude;
      });

      // Camera movement based on mouse
      camera.position.x += (mouseX * 5 - camera.position.x) * 0.02;
      camera.position.y += (mouseY * 3 - camera.position.y) * 0.02;
      camera.lookAt(0, 0, 0);

      // Particles follow mouse slightly
      particles.rotation.y = mouseX * 0.1;
      particles.rotation.x = mouseY * 0.05;

      renderer.render(scene, camera);
      frameId = globalThis.requestAnimationFrame(animate);
    };

    animate();

    return () => {
      globalThis.cancelAnimationFrame(frameId);
      globalThis.window.removeEventListener("resize", handleResize);
      globalThis.window.removeEventListener("mousemove", handleMouseMove);
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div className="particle-field-stage" ref={mountRef} />;
}
