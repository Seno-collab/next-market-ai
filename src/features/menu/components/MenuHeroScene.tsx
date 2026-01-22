"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function MenuHeroScene() {
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
      60,
      mountEl.clientWidth / mountEl.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, 20);
    camera.lookAt(0, 0, 0);

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];

    // Central rotating torus knot - represents menu complexity
    const torusKnotGeometry = new THREE.TorusKnotGeometry(3, 0.8, 128, 32);
    const torusKnotMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x22d3ee,
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.7,
      emissive: new THREE.Color(0x0891b2),
      emissiveIntensity: 0.3,
      wireframe: true,
    });
    geometries.push(torusKnotGeometry);
    materials.push(torusKnotMaterial);
    const torusKnot = new THREE.Mesh(torusKnotGeometry, torusKnotMaterial);
    torusKnot.position.set(8, 0, -5);
    scene.add(torusKnot);

    // Orbiting rings system
    const ringGroup = new THREE.Group();
    const ringRadii = [5, 7, 9];
    const ringColors = [0x22d3ee, 0x8b5cf6, 0xf97316];

    ringRadii.forEach((radius, i) => {
      const ringGeometry = new THREE.TorusGeometry(radius, 0.03, 16, 100);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: ringColors[i],
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
      });
      geometries.push(ringGeometry);
      materials.push(ringMaterial);

      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI / 2 + (i * Math.PI) / 8;
      ring.rotation.y = (i * Math.PI) / 6;
      ringGroup.add(ring);
    });
    ringGroup.position.set(8, 0, -5);
    scene.add(ringGroup);

    // Floating menu item cards (3D planes)
    const cardCount = 12;
    const cards: THREE.Mesh[] = [];
    const cardData: Array<{
      basePos: THREE.Vector3;
      floatSpeed: number;
      floatOffset: number;
      orbitSpeed: number;
      orbitRadius: number;
      orbitOffset: number;
    }> = [];

    const cardGeometry = new THREE.PlaneGeometry(1.5, 1);
    geometries.push(cardGeometry);

    for (let i = 0; i < cardCount; i++) {
      const cardMaterial = new THREE.MeshPhysicalMaterial({
        color: i % 3 === 0 ? 0x22d3ee : i % 3 === 1 ? 0x8b5cf6 : 0xf97316,
        metalness: 0.5,
        roughness: 0.3,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
        emissive: new THREE.Color(i % 3 === 0 ? 0x22d3ee : i % 3 === 1 ? 0x8b5cf6 : 0xf97316),
        emissiveIntensity: 0.2,
      });
      materials.push(cardMaterial);

      const card = new THREE.Mesh(cardGeometry, cardMaterial);

      const angle = (i / cardCount) * Math.PI * 2;
      const radius = 10 + Math.random() * 5;
      card.position.set(
        Math.cos(angle) * radius,
        (Math.random() - 0.5) * 8,
        Math.sin(angle) * radius - 10
      );

      cardData.push({
        basePos: card.position.clone(),
        floatSpeed: 0.5 + Math.random() * 0.5,
        floatOffset: Math.random() * Math.PI * 2,
        orbitSpeed: 0.1 + Math.random() * 0.2,
        orbitRadius: radius,
        orbitOffset: angle,
      });

      cards.push(card);
      scene.add(card);
    }

    // Particle galaxy effect
    const galaxyCount = 2000;
    const galaxyPositions = new Float32Array(galaxyCount * 3);
    const galaxyColors = new Float32Array(galaxyCount * 3);
    const galaxySizes = new Float32Array(galaxyCount);

    const colorInner = new THREE.Color(0x22d3ee);
    const colorOuter = new THREE.Color(0x8b5cf6);

    for (let i = 0; i < galaxyCount; i++) {
      const radius = Math.random() * 25;
      const spinAngle = radius * 0.5;
      const branchAngle = ((i % 3) / 3) * Math.PI * 2;

      const randomX = (Math.random() - 0.5) * Math.pow(Math.random(), 3) * 3;
      const randomY = (Math.random() - 0.5) * Math.pow(Math.random(), 3) * 3;
      const randomZ = (Math.random() - 0.5) * Math.pow(Math.random(), 3) * 3;

      galaxyPositions[i * 3] = Math.cos(branchAngle + spinAngle) * radius + randomX;
      galaxyPositions[i * 3 + 1] = randomY;
      galaxyPositions[i * 3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomZ - 5;

      const mixedColor = colorInner.clone();
      mixedColor.lerp(colorOuter, radius / 25);
      galaxyColors[i * 3] = mixedColor.r;
      galaxyColors[i * 3 + 1] = mixedColor.g;
      galaxyColors[i * 3 + 2] = mixedColor.b;

      galaxySizes[i] = Math.random() * 2;
    }

    const galaxyGeometry = new THREE.BufferGeometry();
    galaxyGeometry.setAttribute("position", new THREE.Float32BufferAttribute(galaxyPositions, 3));
    galaxyGeometry.setAttribute("color", new THREE.Float32BufferAttribute(galaxyColors, 3));
    galaxyGeometry.setAttribute("size", new THREE.Float32BufferAttribute(galaxySizes, 1));

    const galaxyMaterial = new THREE.PointsMaterial({
      size: 0.1,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    geometries.push(galaxyGeometry);
    materials.push(galaxyMaterial);

    const galaxy = new THREE.Points(galaxyGeometry, galaxyMaterial);
    galaxy.position.set(-5, 0, -10);
    scene.add(galaxy);

    // Glowing spheres (data nodes)
    const sphereCount = 20;
    const spheres: THREE.Mesh[] = [];
    const sphereData: Array<{
      baseY: number;
      speed: number;
      offset: number;
    }> = [];

    const sphereGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    geometries.push(sphereGeometry);

    for (let i = 0; i < sphereCount; i++) {
      const sphereMaterial = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0x22d3ee : 0x8b5cf6,
        transparent: true,
        opacity: 0.8,
      });
      materials.push(sphereMaterial);

      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere.position.set(
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 15 - 5
      );

      sphereData.push({
        baseY: sphere.position.y,
        speed: 0.5 + Math.random() * 1.5,
        offset: Math.random() * Math.PI * 2,
      });

      spheres.push(sphere);
      scene.add(sphere);
    }

    // Connection lines between spheres
    const connectionLines: THREE.Line[] = [];
    for (let i = 0; i < sphereCount - 1; i++) {
      if (Math.random() > 0.5) continue;
      const j = Math.min(i + 1 + Math.floor(Math.random() * 3), sphereCount - 1);

      const lineGeometry = new THREE.BufferGeometry();
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending,
      });
      geometries.push(lineGeometry);
      materials.push(lineMaterial);

      const line = new THREE.Line(lineGeometry, lineMaterial);
      line.userData = { from: i, to: j };
      connectionLines.push(line);
      scene.add(line);
    }

    // Ambient lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    // Point lights for dramatic effect
    const pointLight1 = new THREE.PointLight(0x22d3ee, 2, 50);
    pointLight1.position.set(10, 10, 10);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x8b5cf6, 1.5, 40);
    pointLight2.position.set(-10, -5, 5);
    scene.add(pointLight2);

    const pointLight3 = new THREE.PointLight(0xf97316, 1, 30);
    pointLight3.position.set(0, 5, -10);
    scene.add(pointLight3);

    // Mouse tracking
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

    // Animation loop
    const clock = new THREE.Clock();
    let frameId = 0;

    const animate = () => {
      const t = clock.getElapsedTime();

      // Rotate torus knot
      torusKnot.rotation.x = t * 0.3;
      torusKnot.rotation.y = t * 0.2;

      // Rotate ring group
      ringGroup.rotation.y = t * 0.1;
      ringGroup.rotation.z = t * 0.05;

      // Animate floating cards
      cards.forEach((card, i) => {
        const data = cardData[i];
        const angle = data.orbitOffset + t * data.orbitSpeed;
        card.position.x = Math.cos(angle) * data.orbitRadius;
        card.position.z = Math.sin(angle) * data.orbitRadius - 10;
        card.position.y = data.basePos.y + Math.sin(t * data.floatSpeed + data.floatOffset) * 0.5;
        card.rotation.y = -angle;
        card.lookAt(camera.position);
      });

      // Rotate galaxy
      galaxy.rotation.y = t * 0.05;

      // Animate spheres
      spheres.forEach((sphere, i) => {
        const data = sphereData[i];
        sphere.position.y = data.baseY + Math.sin(t * data.speed + data.offset) * 1;
      });

      // Update connection lines
      connectionLines.forEach((line) => {
        const { from, to } = line.userData;
        const positions = new Float32Array([
          spheres[from].position.x, spheres[from].position.y, spheres[from].position.z,
          spheres[to].position.x, spheres[to].position.y, spheres[to].position.z,
        ]);
        line.geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        line.geometry.attributes.position.needsUpdate = true;
      });

      // Animate lights
      pointLight1.position.x = Math.sin(t * 0.5) * 15;
      pointLight1.position.z = Math.cos(t * 0.5) * 15;
      pointLight2.position.y = Math.sin(t * 0.3) * 8;

      // Camera follows mouse smoothly
      camera.position.x += (mouseX * 5 - camera.position.x) * 0.02;
      camera.position.y += (5 + mouseY * 3 - camera.position.y) * 0.02;
      camera.lookAt(0, 0, -5);

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
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div className="menu-hero-stage" ref={mountRef} />;
}
