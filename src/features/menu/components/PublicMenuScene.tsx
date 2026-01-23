"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function PublicMenuScene() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl) return undefined;

    // Renderer với post-processing
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
    renderer.toneMappingExposure = 1.5;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountEl.appendChild(renderer.domElement);

    // Scene với fog
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a1f, 0.012);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      60,
      mountEl.clientWidth / mountEl.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, 30);

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];

    // Premium color palette
    const colors = {
      gold: 0xffd700,
      rose: 0xff6b9d,
      cyan: 0x00d4ff,
      purple: 0xb794f6,
      green: 0x4ade80,
      orange: 0xff8c42,
      white: 0xffffff,
    };

    // === RESPONSIVE QUALITY ===
    const isMobile = mountEl.clientWidth < 768;
    const isLowEnd = mountEl.clientWidth < 480;

    const quality = {
      menuItemCount: isLowEnd ? 12 : isMobile ? 18 : 30,
      particleCount: isLowEnd ? 200 : isMobile ? 400 : 800,
      orbCount: isLowEnd ? 8 : isMobile ? 12 : 20,
      trailCount: isLowEnd ? 0 : isMobile ? 3 : 6,
      enableHologram: !isLowEnd,
      enableShadows: !isLowEnd,
      enableTrails: !isLowEnd,
    };

    // === HOLOGRAPHIC GRID FLOOR ===
    if (quality.enableHologram) {
      const gridSize = 50;
      const divisions = 50;
      const gridHelper = new THREE.GridHelper(gridSize, divisions, colors.cyan, colors.purple);
      gridHelper.position.y = -5;
      gridHelper.material.opacity = 0.15;
      gridHelper.material.transparent = true;
      scene.add(gridHelper);

      // Pulsing grid lines
      const pulsingLines: THREE.Line[] = [];
      for (let i = 0; i < 5; i++) {
        const points = [];
        points.push(new THREE.Vector3(-gridSize / 2, -5, -gridSize / 2 + i * 10));
        points.push(new THREE.Vector3(gridSize / 2, -5, -gridSize / 2 + i * 10));
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const lineMaterial = new THREE.LineBasicMaterial({
          color: colors.cyan,
          transparent: true,
          opacity: 0.4,
          blending: THREE.AdditiveBlending,
        });
        geometries.push(lineGeometry);
        materials.push(lineMaterial);
        const line = new THREE.Line(lineGeometry, lineMaterial);
        line.userData = { pulseOffset: i * 0.5 };
        pulsingLines.push(line);
        scene.add(line);
      }
    }

    // === FLOATING HOLOGRAPHIC TEXT ===
    const textGroup = new THREE.Group();
    textGroup.position.set(0, 8, -15);

    // Create "MENU" text using planes with glow
    const createTextPlane = (offsetX: number, color: number) => {
      const planeGeo = new THREE.PlaneGeometry(2, 3);
      const planeMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });
      geometries.push(planeGeo);
      materials.push(planeMat);
      const plane = new THREE.Mesh(planeGeo, planeMat);
      plane.position.x = offsetX;
      return plane;
    };

    if (quality.enableHologram) {
      const letter1 = createTextPlane(-6, colors.cyan);
      const letter2 = createTextPlane(-2, colors.purple);
      const letter3 = createTextPlane(2, colors.rose);
      const letter4 = createTextPlane(6, colors.gold);

      textGroup.add(letter1, letter2, letter3, letter4);
      scene.add(textGroup);
    }

    // === PREMIUM FLOATING MENU ITEMS ===
    const menuItems: Array<{
      mesh: THREE.Mesh;
      basePos: THREE.Vector3;
      velocity: THREE.Vector3;
      rotationSpeed: THREE.Vector3;
      targetY: number;
      hoverOffset: number;
    }> = [];

    const menuItemTypes = [
      { geo: new THREE.SphereGeometry(0.7, 20, 20), color: colors.rose, name: 'sphere' },
      { geo: new THREE.BoxGeometry(1.2, 1.2, 1.2), color: colors.cyan, name: 'box' },
      { geo: new THREE.ConeGeometry(0.6, 1.4, 8), color: colors.purple, name: 'cone' },
      { geo: new THREE.TorusGeometry(0.6, 0.25, 16, 32), color: colors.gold, name: 'torus' },
      { geo: new THREE.OctahedronGeometry(0.8), color: colors.green, name: 'oct' },
      { geo: new THREE.TetrahedronGeometry(0.9), color: colors.orange, name: 'tetra' },
    ];

    for (let i = 0; i < quality.menuItemCount; i++) {
      const type = menuItemTypes[i % menuItemTypes.length];
      const geometry = type.geo.clone();
      geometries.push(geometry);

      const material = new THREE.MeshPhysicalMaterial({
        color: type.color,
        metalness: 0.8,
        roughness: 0.2,
        transparent: true,
        opacity: 0.85,
        emissive: new THREE.Color(type.color),
        emissiveIntensity: 0.4,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
      });
      materials.push(material);

      const mesh = new THREE.Mesh(geometry, material);

      // Spiral distribution
      const angle = (i / quality.menuItemCount) * Math.PI * 4;
      const radius = 8 + (i % 3) * 4;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius - 10;
      const y = (Math.random() - 0.5) * 8;

      mesh.position.set(x, y, z);
      mesh.castShadow = quality.enableShadows;
      mesh.receiveShadow = quality.enableShadows;

      const basePos = new THREE.Vector3(x, y, z);
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02
      );
      const rotationSpeed = new THREE.Vector3(
        (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.01
      );

      menuItems.push({
        mesh,
        basePos: basePos.clone(),
        velocity,
        rotationSpeed,
        targetY: y,
        hoverOffset: i * 0.2,
      });

      scene.add(mesh);
    }

    // === PARTICLE SYSTEM ===
    const particleCount = quality.particleCount;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    const particleSizes = new Float32Array(particleCount);

    const colorPalette = [colors.cyan, colors.purple, colors.rose, colors.gold];

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 60;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 40;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 50 - 10;

      const color = new THREE.Color(colorPalette[Math.floor(Math.random() * colorPalette.length)]);
      particleColors[i * 3] = color.r;
      particleColors[i * 3 + 1] = color.g;
      particleColors[i * 3 + 2] = color.b;

      particleSizes[i] = Math.random() * 2 + 0.5;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.Float32BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute("color", new THREE.Float32BufferAttribute(particleColors, 3));
    particleGeometry.setAttribute("size", new THREE.Float32BufferAttribute(particleSizes, 1));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    geometries.push(particleGeometry);
    materials.push(particleMaterial);
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // === GLOWING ORBS ===
    const orbs: Array<{
      mesh: THREE.Mesh;
      basePos: THREE.Vector3;
      phase: number;
      speed: number;
    }> = [];

    for (let i = 0; i < quality.orbCount; i++) {
      const orbGeo = new THREE.SphereGeometry(0.5 + Math.random() * 0.8, 16, 16);
      const orbColor = colorPalette[i % colorPalette.length];
      const orbMat = new THREE.MeshBasicMaterial({
        color: orbColor,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
      });
      geometries.push(orbGeo);
      materials.push(orbMat);

      const orb = new THREE.Mesh(orbGeo, orbMat);
      const x = (Math.random() - 0.5) * 40;
      const y = (Math.random() - 0.5) * 20;
      const z = (Math.random() - 0.5) * 30 - 10;
      orb.position.set(x, y, z);

      orbs.push({
        mesh: orb,
        basePos: new THREE.Vector3(x, y, z),
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 0.5,
      });

      scene.add(orb);
    }

    // === DYNAMIC LIGHTING ===
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
    mainLight.position.set(10, 15, 10);
    if (quality.enableShadows) {
      mainLight.castShadow = true;
      mainLight.shadow.mapSize.width = 1024;
      mainLight.shadow.mapSize.height = 1024;
    }
    scene.add(mainLight);

    // Colored point lights
    const lights = [
      { color: colors.cyan, pos: [-15, 5, 5] },
      { color: colors.rose, pos: [15, 5, -5] },
      { color: colors.purple, pos: [0, 10, -15] },
      { color: colors.gold, pos: [0, -3, 10] },
    ];

    lights.forEach(({ color, pos }) => {
      const light = new THREE.PointLight(color, 2, 40);
      light.position.set(pos[0], pos[1], pos[2]);
      scene.add(light);
    });

    // === MOUSE INTERACTION ===
    let mouseX = 0;
    let mouseY = 0;
    let scrollY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = mountEl.getBoundingClientRect();
      mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handleScroll = () => {
      scrollY = globalThis.window.scrollY || 0;
    };

    if (quality.enableHologram) {
      mountEl.addEventListener("mousemove", handleMouseMove);
      globalThis.window.addEventListener("scroll", handleScroll);
    }

    // === RESIZE ===
    const handleResize = () => {
      const { clientWidth, clientHeight } = mountEl;
      renderer.setSize(clientWidth, clientHeight);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
    };
    globalThis.window.addEventListener("resize", handleResize);

    // === ANIMATION LOOP ===
    const clock = new THREE.Clock();
    let frameId = 0;

    const animate = () => {
      const t = clock.getElapsedTime();
      const deltaTime = clock.getDelta();

      // Camera parallax với scroll
      const scrollOffset = scrollY * 0.002;
      camera.position.y = 5 - scrollOffset * 3;
      camera.position.z = 30 - scrollOffset * 2;
      camera.lookAt(0, 0, -10);

      // Mouse parallax
      if (quality.enableHologram) {
        camera.position.x += (mouseX * 3 - camera.position.x) * 0.05;
        camera.rotation.y += (mouseX * 0.1 - camera.rotation.y) * 0.05;
      }

      // Holographic text animation
      if (quality.enableHologram) {
        textGroup.rotation.y = Math.sin(t * 0.5) * 0.2;
        textGroup.position.y = 8 + Math.sin(t * 0.8) * 0.5;
        textGroup.children.forEach((child, i) => {
          const mesh = child as THREE.Mesh;
          const material = mesh.material as THREE.MeshBasicMaterial;
          material.opacity = 0.5 + Math.sin(t * 2 + i * 0.5) * 0.3;
          mesh.rotation.y = Math.sin(t + i) * 0.1;
        });
      }

      // Premium menu items với physics
      menuItems.forEach((item, i) => {
        const { mesh, basePos, velocity, rotationSpeed, targetY, hoverOffset } = item;

        // Floating motion
        const hoverY = Math.sin(t * 0.6 + hoverOffset) * 1.5;
        mesh.position.y = targetY + hoverY;

        // Gentle drift
        mesh.position.x += velocity.x;
        mesh.position.z += velocity.z;

        // Boundaries - bounce back
        if (Math.abs(mesh.position.x - basePos.x) > 3) velocity.x *= -1;
        if (Math.abs(mesh.position.z - basePos.z) > 3) velocity.z *= -1;

        // Rotation
        mesh.rotation.x += rotationSpeed.x;
        mesh.rotation.y += rotationSpeed.y;
        mesh.rotation.z += rotationSpeed.z;

        // Pulsing glow
        const material = mesh.material as THREE.MeshPhysicalMaterial;
        material.emissiveIntensity = 0.3 + Math.sin(t * 2 + i * 0.3) * 0.2;

        // Scale pulse
        const scale = 1 + Math.sin(t * 3 + i * 0.5) * 0.05;
        mesh.scale.set(scale, scale, scale);
      });

      // Particle system - rising và swirling
      const positions = particleGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;

        // Rising motion
        positions[i3 + 1] += 0.02;

        // Swirl effect
        const swirl = Math.sin(t + positions[i3 + 1] * 0.1) * 0.05;
        positions[i3] += swirl;
        positions[i3 + 2] += Math.cos(t + positions[i3 + 1] * 0.1) * 0.05;

        // Reset if too high
        if (positions[i3 + 1] > 20) {
          positions[i3 + 1] = -20;
          positions[i3] = (Math.random() - 0.5) * 60;
          positions[i3 + 2] = (Math.random() - 0.5) * 50 - 10;
        }
      }
      particleGeometry.attributes.position.needsUpdate = true;

      // Particle opacity pulse
      particleMaterial.opacity = 0.6 + Math.sin(t * 0.5) * 0.2;

      // Glowing orbs
      orbs.forEach((orb) => {
        const { mesh, basePos, phase, speed } = orb;

        // Orbital motion
        mesh.position.x = basePos.x + Math.sin(t * speed + phase) * 3;
        mesh.position.y = basePos.y + Math.cos(t * speed * 0.7 + phase) * 2;
        mesh.position.z = basePos.z + Math.sin(t * speed * 0.5 + phase) * 2;

        // Pulsing scale
        const scale = 1 + Math.sin(t * 2 + phase) * 0.3;
        mesh.scale.set(scale, scale, scale);

        // Opacity pulse
        const material = mesh.material as THREE.MeshBasicMaterial;
        material.opacity = 0.3 + Math.sin(t * 1.5 + phase) * 0.2;
      });

      // Render scene
      renderer.render(scene, camera);
      frameId = globalThis.requestAnimationFrame(animate);
    };

    animate();

    // === CLEANUP ===
    return () => {
      globalThis.cancelAnimationFrame(frameId);
      globalThis.window.removeEventListener("resize", handleResize);
      if (quality.enableHologram) {
        mountEl.removeEventListener("mousemove", handleMouseMove);
        globalThis.window.removeEventListener("scroll", handleScroll);
      }
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div className="public-menu-stage" ref={mountRef} />;
}
