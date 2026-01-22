"use client";

import { useEffect, useRef, type ReactNode } from "react";
import * as THREE from "three";

type Table3DEffectProps = {
  children: ReactNode;
  className?: string;
};

export function Table3DEffect({ children, className = "" }: Table3DEffectProps) {
  const canvasRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = canvasRef.current;
    if (!container) return undefined;

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
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.z = 15;

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];

    // Grid particles
    const gridParticleCount = 200;
    const gridPositions = new Float32Array(gridParticleCount * 3);
    const gridColors = new Float32Array(gridParticleCount * 3);

    const cyan = new THREE.Color(0x22d3ee);
    const purple = new THREE.Color(0x8b5cf6);
    const blue = new THREE.Color(0x3b82f6);

    for (let i = 0; i < gridParticleCount; i++) {
      gridPositions[i * 3] = (Math.random() - 0.5) * 30;
      gridPositions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      gridPositions[i * 3 + 2] = (Math.random() - 0.5) * 10 - 5;

      const colorChoice = Math.random();
      const color = colorChoice > 0.6 ? cyan : colorChoice > 0.3 ? purple : blue;
      gridColors[i * 3] = color.r;
      gridColors[i * 3 + 1] = color.g;
      gridColors[i * 3 + 2] = color.b;
    }

    const gridGeometry = new THREE.BufferGeometry();
    gridGeometry.setAttribute("position", new THREE.Float32BufferAttribute(gridPositions, 3));
    gridGeometry.setAttribute("color", new THREE.Float32BufferAttribute(gridColors, 3));
    const gridMaterial = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    geometries.push(gridGeometry);
    materials.push(gridMaterial);
    const gridParticles = new THREE.Points(gridGeometry, gridMaterial);
    scene.add(gridParticles);

    // Floating data cubes
    const cubeCount = 15;
    const cubes: THREE.Mesh[] = [];
    const cubeData: Array<{
      baseY: number;
      floatSpeed: number;
      floatOffset: number;
      rotationSpeed: THREE.Vector3;
    }> = [];

    const cubeGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    geometries.push(cubeGeometry);

    const cubeColors = [0x22d3ee, 0x8b5cf6, 0x3b82f6, 0x10b981];

    for (let i = 0; i < cubeCount; i++) {
      const cubeMaterial = new THREE.MeshBasicMaterial({
        color: cubeColors[i % cubeColors.length],
        transparent: true,
        opacity: 0.3,
        wireframe: true,
      });
      materials.push(cubeMaterial);

      const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
      cube.position.set(
        (Math.random() - 0.5) * 25,
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 5 - 3
      );

      cubeData.push({
        baseY: cube.position.y,
        floatSpeed: 0.5 + Math.random() * 1,
        floatOffset: Math.random() * Math.PI * 2,
        rotationSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02
        ),
      });

      cubes.push(cube);
      scene.add(cube);
    }

    // Horizontal scan lines
    const lineCount = 5;
    const lines: THREE.Line[] = [];

    for (let i = 0; i < lineCount; i++) {
      const lineGeometry = new THREE.BufferGeometry();
      const linePositions = new Float32Array([
        -15, (i - lineCount / 2) * 3, -2,
        15, (i - lineCount / 2) * 3, -2,
      ]);
      lineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
      geometries.push(lineGeometry);

      const lineMaterial = new THREE.LineBasicMaterial({
        color: i % 2 === 0 ? 0x22d3ee : 0x8b5cf6,
        transparent: true,
        opacity: 0.15,
      });
      materials.push(lineMaterial);

      const line = new THREE.Line(lineGeometry, lineMaterial);
      line.userData = { baseY: (i - lineCount / 2) * 3 };
      lines.push(line);
      scene.add(line);
    }

    // Glowing orbs at corners
    const orbGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    geometries.push(orbGeometry);

    const orbPositions = [
      [-12, -6, -3],
      [12, -6, -3],
      [-12, 6, -3],
      [12, 6, -3],
    ];

    const orbs: THREE.Mesh[] = [];
    orbPositions.forEach((pos, i) => {
      const orbMaterial = new THREE.MeshBasicMaterial({
        color: cubeColors[i % cubeColors.length],
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending,
      });
      materials.push(orbMaterial);

      const orb = new THREE.Mesh(orbGeometry, orbMaterial);
      orb.position.set(pos[0], pos[1], pos[2]);
      orbs.push(orb);
      scene.add(orb);
    });

    // Animation
    const clock = new THREE.Clock();
    let frameId = 0;
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };
    container.addEventListener("mousemove", handleMouseMove);

    const animate = () => {
      const t = clock.getElapsedTime();

      // Animate grid particles
      gridParticles.rotation.y = t * 0.02;

      // Animate cubes
      cubes.forEach((cube, i) => {
        const data = cubeData[i];
        cube.position.y = data.baseY + Math.sin(t * data.floatSpeed + data.floatOffset) * 0.5;
        cube.rotation.x += data.rotationSpeed.x;
        cube.rotation.y += data.rotationSpeed.y;
        cube.rotation.z += data.rotationSpeed.z;
      });

      // Animate scan lines
      lines.forEach((line, i) => {
        const posArray = line.geometry.attributes.position.array as Float32Array;
        const wave = Math.sin(t * 2 + i * 0.5) * 0.3;
        posArray[1] = line.userData.baseY + wave;
        posArray[4] = line.userData.baseY + wave;
        line.geometry.attributes.position.needsUpdate = true;
      });

      // Pulse orbs
      orbs.forEach((orb, i) => {
        const scale = 1 + Math.sin(t * 2 + i * 0.5) * 0.2;
        orb.scale.setScalar(scale);
      });

      // Camera follows mouse slightly
      camera.position.x += (mouseX * 2 - camera.position.x) * 0.02;
      camera.position.y += (mouseY * 1.5 - camera.position.y) * 0.02;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      frameId = globalThis.requestAnimationFrame(animate);
    };

    animate();

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
      container.removeEventListener("mousemove", handleMouseMove);
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div className={`table-3d-wrapper ${className}`}>
      <div className="table-3d-canvas" ref={canvasRef} />
      <div className="table-3d-content">{children}</div>
      <div className="table-3d-glow table-3d-glow--top" />
      <div className="table-3d-glow table-3d-glow--bottom" />
    </div>
  );
}
