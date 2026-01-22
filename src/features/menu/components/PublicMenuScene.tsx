"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function PublicMenuScene() {
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
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    mountEl.appendChild(renderer.domElement);

    // Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a0f, 0.02);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      50,
      mountEl.clientWidth / mountEl.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 20);

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];

    // Warm color palette for food theme
    const warmColors = [
      0xf97316, // Orange
      0xef4444, // Red
      0xeab308, // Yellow
      0x22c55e, // Green
      0xb45309, // Brown/Coffee
      0x0ea5e9, // Cyan (drinks)
    ];

    // Floating food-themed shapes (abstract representations)
    const foodShapes: THREE.Mesh[] = [];
    const foodData: Array<{
      baseY: number;
      floatSpeed: number;
      rotationSpeed: { x: number; y: number };
      floatOffset: number;
      orbitRadius: number;
      orbitSpeed: number;
      orbitOffset: number;
    }> = [];

    // Create various food-like shapes
    const createFoodShape = (index: number): THREE.BufferGeometry => {
      const type = index % 5;
      switch (type) {
        case 0: // Sphere (fruit, ball-shaped food)
          return new THREE.SphereGeometry(0.5 + Math.random() * 0.3, 16, 16);
        case 1: // Cylinder (cups, glasses)
          return new THREE.CylinderGeometry(0.3, 0.4, 0.8, 16);
        case 2: // Torus (donuts, rings)
          return new THREE.TorusGeometry(0.4, 0.15, 12, 24);
        case 3: // Box (plates, boxes)
          return new THREE.BoxGeometry(0.8, 0.2, 0.8);
        default: // Cone (ice cream, pointed foods)
          return new THREE.ConeGeometry(0.35, 0.7, 16);
      }
    };

    const shapeCount = 30;
    for (let i = 0; i < shapeCount; i++) {
      const geometry = createFoodShape(i);
      geometries.push(geometry);

      const color = warmColors[i % warmColors.length];
      const material = new THREE.MeshPhysicalMaterial({
        color,
        metalness: 0.1,
        roughness: 0.4,
        transparent: true,
        opacity: 0.85,
        emissive: new THREE.Color(color),
        emissiveIntensity: 0.15,
      });
      materials.push(material);

      const mesh = new THREE.Mesh(geometry, material);

      // Distribute in a cylindrical pattern
      const angle = (i / shapeCount) * Math.PI * 2;
      const radius = 8 + Math.random() * 8;
      const y = (Math.random() - 0.5) * 15;

      mesh.position.set(
        Math.cos(angle) * radius,
        y,
        Math.sin(angle) * radius - 5
      );

      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      foodData.push({
        baseY: y,
        floatSpeed: 0.3 + Math.random() * 0.5,
        rotationSpeed: {
          x: (Math.random() - 0.5) * 0.01,
          y: (Math.random() - 0.5) * 0.015,
        },
        floatOffset: Math.random() * Math.PI * 2,
        orbitRadius: radius,
        orbitSpeed: 0.05 + Math.random() * 0.1,
        orbitOffset: angle,
      });

      foodShapes.push(mesh);
      scene.add(mesh);
    }

    // Ambient particles (steam, sparkles)
    const particleCount = 500;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    const particleSpeeds: number[] = [];

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 40;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 30;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 30 - 10;

      // Warm golden/amber particles
      const brightness = 0.6 + Math.random() * 0.4;
      particleColors[i * 3] = brightness;
      particleColors[i * 3 + 1] = brightness * (0.6 + Math.random() * 0.3);
      particleColors[i * 3 + 2] = brightness * (0.2 + Math.random() * 0.3);

      particleSpeeds.push(0.01 + Math.random() * 0.02);
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.Float32BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute("color", new THREE.Float32BufferAttribute(particleColors, 3));
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    geometries.push(particleGeometry);
    materials.push(particleMaterial);
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // Glowing orbs (highlights)
    const orbCount = 12;
    const orbs: THREE.Mesh[] = [];
    for (let i = 0; i < orbCount; i++) {
      const orbGeometry = new THREE.SphereGeometry(0.3 + Math.random() * 0.4, 16, 16);
      const orbMaterial = new THREE.MeshBasicMaterial({
        color: warmColors[i % warmColors.length],
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
      });
      geometries.push(orbGeometry);
      materials.push(orbMaterial);

      const orb = new THREE.Mesh(orbGeometry, orbMaterial);
      orb.position.set(
        (Math.random() - 0.5) * 25,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 15 - 5
      );
      orb.userData = {
        basePosition: orb.position.clone(),
        speed: 0.5 + Math.random() * 0.5,
        amplitude: 1 + Math.random() * 2,
        phase: Math.random() * Math.PI * 2,
      };
      orbs.push(orb);
      scene.add(orb);
    }

    // Central attraction - Swirling ring
    const ringGeometry = new THREE.TorusGeometry(5, 0.1, 16, 100);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
    });
    geometries.push(ringGeometry);
    materials.push(ringMaterial);
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.z = -5;
    scene.add(ring);

    // Second ring
    const ring2Geometry = new THREE.TorusGeometry(6.5, 0.05, 16, 120);
    const ring2Material = new THREE.MeshBasicMaterial({
      color: 0xeab308,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
    });
    geometries.push(ring2Geometry);
    materials.push(ring2Material);
    const ring2 = new THREE.Mesh(ring2Geometry, ring2Material);
    ring2.rotation.x = Math.PI / 2;
    ring2.position.z = -5;
    scene.add(ring2);

    // Background stars/sparkles
    const starCount = 200;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 60;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 40;
      starPositions[i * 3 + 2] = -20 - Math.random() * 20;
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.Float32BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.08,
      transparent: true,
      opacity: 0.5,
    });
    geometries.push(starGeometry);
    materials.push(starMaterial);
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // Lighting
    const ambient = new THREE.AmbientLight(0xfff5e6, 0.4);
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
    keyLight.position.set(5, 10, 10);
    const warmLight = new THREE.PointLight(0xf97316, 1.5, 30);
    warmLight.position.set(0, 5, 5);
    const accentLight = new THREE.PointLight(0xeab308, 1, 25);
    accentLight.position.set(-5, -3, 0);
    scene.add(ambient, keyLight, warmLight, accentLight);

    // Mouse interaction
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = mountEl.getBoundingClientRect();
      mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };
    mountEl.addEventListener("mousemove", handleMouseMove);

    // Resize
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

      // Animate food shapes
      foodShapes.forEach((shape, i) => {
        const data = foodData[i];

        // Orbit motion
        const angle = data.orbitOffset + t * data.orbitSpeed;
        shape.position.x = Math.cos(angle) * data.orbitRadius;
        shape.position.z = Math.sin(angle) * data.orbitRadius - 5;

        // Float motion
        shape.position.y = data.baseY + Math.sin(t * data.floatSpeed + data.floatOffset) * 1;

        // Rotation
        shape.rotation.x += data.rotationSpeed.x;
        shape.rotation.y += data.rotationSpeed.y;
      });

      // Animate particles (rising steam effect)
      const positions = particleGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3 + 1] += particleSpeeds[i];
        if (positions[i * 3 + 1] > 15) {
          positions[i * 3 + 1] = -15;
        }
      }
      particleGeometry.attributes.position.needsUpdate = true;

      // Animate orbs
      orbs.forEach((orb) => {
        const { basePosition, speed, amplitude, phase } = orb.userData;
        orb.position.x = basePosition.x + Math.sin(t * speed + phase) * amplitude;
        orb.position.y = basePosition.y + Math.cos(t * speed * 0.7 + phase) * amplitude * 0.5;
      });

      // Rotate rings
      ring.rotation.z = t * 0.2;
      ring2.rotation.z = -t * 0.15;

      // Pulse ring opacity
      ringMaterial.opacity = 0.3 + Math.sin(t * 2) * 0.1;
      ring2Material.opacity = 0.2 + Math.cos(t * 1.5) * 0.1;

      // Stars twinkle
      stars.rotation.y = t * 0.01;

      // Camera follows mouse
      camera.position.x += (mouseX * 4 - camera.position.x) * 0.02;
      camera.position.y += (mouseY * 3 - camera.position.y) * 0.02;
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

  return <div className="public-menu-stage" ref={mountRef} />;
}
