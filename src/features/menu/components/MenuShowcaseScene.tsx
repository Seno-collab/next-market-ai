"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function MenuShowcaseScene() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl) return undefined;

    // High-performance renderer
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
    renderer.toneMappingExposure = 2.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountEl.appendChild(renderer.domElement);

    // Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.008);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      mountEl.clientWidth / mountEl.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 10, 35);

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];

    // Premium color palette - vibrant and eye-catching
    const colors = {
      neonPink: 0xff0080,
      neonBlue: 0x00ffff,
      neonGreen: 0x00ff00,
      neonOrange: 0xff6600,
      neonPurple: 0xff00ff,
      gold: 0xffd700,
      white: 0xffffff,
      electricBlue: 0x00ddff,
      limeGreen: 0xccff00,
    };

    // === RESPONSIVE QUALITY ===
    const isMobile = mountEl.clientWidth < 768;
    const isLowEnd = mountEl.clientWidth < 480;

    const quality = {
      cardCount: isLowEnd ? 8 : isMobile ? 12 : 20,
      particleCount: isLowEnd ? 500 : isMobile ? 1000 : 2000,
      lightBeams: isLowEnd ? 4 : isMobile ? 6 : 10,
      enableGlow: !isLowEnd,
      enableTrails: !isLowEnd,
      enableReflections: !isMobile,
    };

    // === MASSIVE 3D "MENU" TEXT ===
    const textGroup = new THREE.Group();
    textGroup.position.set(0, 15, -20);

    // Create large 3D letter blocks for "MENU"
    const createLetter = (
      width: number,
      height: number,
      depth: number,
      color: number,
      position: THREE.Vector3
    ) => {
      const geometry = new THREE.BoxGeometry(width, height, depth);
      const material = new THREE.MeshPhysicalMaterial({
        color,
        metalness: 0.9,
        roughness: 0.1,
        transparent: true,
        opacity: 0.9,
        emissive: new THREE.Color(color),
        emissiveIntensity: 0.8,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
      });

      geometries.push(geometry);
      materials.push(material);

      const letter = new THREE.Mesh(geometry, material);
      letter.position.copy(position);
      letter.castShadow = true;

      // Add glow outline
      const outlineGeometry = new THREE.BoxGeometry(width * 1.1, height * 1.1, depth * 1.1);
      const outlineMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
      });
      geometries.push(outlineGeometry);
      materials.push(outlineMaterial);
      const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
      letter.add(outline);

      return letter;
    };

    if (quality.enableGlow) {
      // M - E - N - U letters
      const letterM = createLetter(4, 6, 2, colors.neonPink, new THREE.Vector3(-12, 0, 0));
      const letterE = createLetter(4, 6, 2, colors.electricBlue, new THREE.Vector3(-4, 0, 0));
      const letterN = createLetter(4, 6, 2, colors.limeGreen, new THREE.Vector3(4, 0, 0));
      const letterU = createLetter(4, 6, 2, colors.neonOrange, new THREE.Vector3(12, 0, 0));

      textGroup.add(letterM, letterE, letterN, letterU);
      scene.add(textGroup);
    }

    // === FLOATING MENU CARDS WITH 3D EFFECT ===
    const menuCards: Array<{
      group: THREE.Group;
      basePos: THREE.Vector3;
      velocity: THREE.Vector3;
      rotationSpeed: THREE.Vector3;
      scale: number;
      targetY: number;
      hoverOffset: number;
      orbitAngle: number;
      orbitRadius: number;
    }> = [];

    const cardColors = [
      colors.neonPink,
      colors.electricBlue,
      colors.limeGreen,
      colors.neonOrange,
      colors.neonPurple,
      colors.gold,
    ];

    for (let i = 0; i < quality.cardCount; i++) {
      const cardGroup = new THREE.Group();
      const color = cardColors[i % cardColors.length];

      // Main card (larger and thicker)
      const cardGeo = new THREE.BoxGeometry(3.5, 4.5, 0.3);
      const cardMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.5,
        roughness: 0.2,
        transparent: true,
        opacity: 0.95,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
      });
      geometries.push(cardGeo);
      materials.push(cardMat);
      const card = new THREE.Mesh(cardGeo, cardMat);
      card.castShadow = true;
      card.receiveShadow = true;
      cardGroup.add(card);

      // Glowing border frame
      const frameGeo = new THREE.BoxGeometry(3.7, 4.7, 0.2);
      const frameMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
      });
      geometries.push(frameGeo);
      materials.push(frameMat);
      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.position.z = -0.1;
      cardGroup.add(frame);

      // Bright glow aura (larger)
      if (quality.enableGlow) {
        const glowGeo = new THREE.PlaneGeometry(5, 6);
        const glowMat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.3,
          blending: THREE.AdditiveBlending,
        });
        geometries.push(glowGeo);
        materials.push(glowMat);
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.z = -0.3;
        cardGroup.add(glow);
      }

      // Colored accent plate (menu item representation)
      const plateGeo = new THREE.CircleGeometry(1.2, 32);
      const plateMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.7,
      });
      geometries.push(plateGeo);
      materials.push(plateMat);
      const plate = new THREE.Mesh(plateGeo, plateMat);
      plate.position.z = 0.2;
      cardGroup.add(plate);

      // Spiral orbit position
      const angle = (i / quality.cardCount) * Math.PI * 6;
      const radius = 15 + (i % 4) * 5;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius - 15;
      const y = (Math.random() - 0.5) * 12;

      cardGroup.position.set(x, y, z);

      menuCards.push({
        group: cardGroup,
        basePos: new THREE.Vector3(x, y, z),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.03,
          (Math.random() - 0.5) * 0.03,
          (Math.random() - 0.5) * 0.03
        ),
        rotationSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.015,
          (Math.random() - 0.5) * 0.015,
          (Math.random() - 0.5) * 0.015
        ),
        scale: 0.8 + Math.random() * 0.4,
        targetY: y,
        hoverOffset: i * 0.3,
        orbitAngle: angle,
        orbitRadius: radius,
      });

      scene.add(cardGroup);
    }

    // === SPECTACULAR PARTICLE GALAXY ===
    const particleCount = quality.particleCount;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    const particleSizes = new Float32Array(particleCount);
    const particleVelocities = new Float32Array(particleCount * 3);

    const colorPalette = [
      colors.neonPink,
      colors.electricBlue,
      colors.limeGreen,
      colors.neonOrange,
      colors.neonPurple,
    ];

    for (let i = 0; i < particleCount; i++) {
      // Spiral galaxy distribution
      const radius = Math.random() * 50;
      const spinAngle = radius * 0.3;
      const branchAngle = ((i % 5) / 5) * Math.PI * 2;

      particlePositions[i * 3] = Math.cos(branchAngle + spinAngle) * radius;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 30;
      particlePositions[i * 3 + 2] = Math.sin(branchAngle + spinAngle) * radius - 20;

      particleVelocities[i * 3] = (Math.random() - 0.5) * 0.02;
      particleVelocities[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
      particleVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;

      const color = new THREE.Color(colorPalette[Math.floor(Math.random() * colorPalette.length)]);
      particleColors[i * 3] = color.r;
      particleColors[i * 3 + 1] = color.g;
      particleColors[i * 3 + 2] = color.b;

      particleSizes[i] = Math.random() * 3 + 1;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.Float32BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute("color", new THREE.Float32BufferAttribute(particleColors, 3));
    particleGeometry.setAttribute("size", new THREE.Float32BufferAttribute(particleSizes, 1));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    geometries.push(particleGeometry);
    materials.push(particleMaterial);
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // === LIGHT BEAMS (Energy streams) ===
    const lightBeams: Array<{
      mesh: THREE.Mesh;
      speed: number;
      direction: THREE.Vector3;
    }> = [];

    for (let i = 0; i < quality.lightBeams; i++) {
      const beamGeo = new THREE.CylinderGeometry(0.1, 0.1, 40, 8);
      const beamColor = colorPalette[i % colorPalette.length];
      const beamMat = new THREE.MeshBasicMaterial({
        color: beamColor,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
      });
      geometries.push(beamGeo);
      materials.push(beamMat);

      const beam = new THREE.Mesh(beamGeo, beamMat);
      const angle = (i / quality.lightBeams) * Math.PI * 2;
      beam.position.set(Math.cos(angle) * 20, 0, Math.sin(angle) * 20);
      beam.rotation.z = Math.PI / 2;

      lightBeams.push({
        mesh: beam,
        speed: 0.5 + Math.random() * 1,
        direction: new THREE.Vector3(
          Math.cos(angle),
          (Math.random() - 0.5) * 0.2,
          Math.sin(angle)
        ).normalize(),
      });

      scene.add(beam);
    }

    // === HOLOGRAPHIC RINGS ===
    const ringGroup = new THREE.Group();
    const rings: Array<{ mesh: THREE.Mesh; speed: number }> = [];

    for (let i = 0; i < 8; i++) {
      const radius = 25 + i * 3;
      const ringGeo = new THREE.TorusGeometry(radius, 0.1, 16, 100);
      const ringColor = colorPalette[i % colorPalette.length];
      const ringMat = new THREE.MeshBasicMaterial({
        color: ringColor,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
      });
      geometries.push(ringGeo);
      materials.push(ringMat);

      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2 + (i * Math.PI) / 16;

      rings.push({
        mesh: ring,
        speed: 0.2 + i * 0.05,
      });

      ringGroup.add(ring);
    }
    ringGroup.position.y = 0;
    scene.add(ringGroup);

    // === DRAMATIC LIGHTING ===
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    // Main directional light
    const mainLight = new THREE.DirectionalLight(0xffffff, 2);
    mainLight.position.set(20, 30, 20);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    scene.add(mainLight);

    // Colored point lights for drama
    const coloredLights = [
      { color: colors.neonPink, pos: [-25, 10, 10] },
      { color: colors.electricBlue, pos: [25, 10, -10] },
      { color: colors.limeGreen, pos: [0, 20, -20] },
      { color: colors.neonOrange, pos: [0, -5, 20] },
    ];

    const pointLights: THREE.PointLight[] = [];
    coloredLights.forEach(({ color, pos }) => {
      const light = new THREE.PointLight(color, 3, 60);
      light.position.set(pos[0], pos[1], pos[2]);
      pointLights.push(light);
      scene.add(light);
    });

    // Spotlights on text
    if (quality.enableGlow) {
      const spotlight1 = new THREE.SpotLight(colors.neonPink, 5);
      spotlight1.position.set(-12, 25, 0);
      spotlight1.angle = Math.PI / 6;
      spotlight1.penumbra = 0.5;
      scene.add(spotlight1);

      const spotlight2 = new THREE.SpotLight(colors.electricBlue, 5);
      spotlight2.position.set(12, 25, 0);
      spotlight2.angle = Math.PI / 6;
      spotlight2.penumbra = 0.5;
      scene.add(spotlight2);
    }

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

    mountEl.addEventListener("mousemove", handleMouseMove);
    globalThis.window.addEventListener("scroll", handleScroll);

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

      // Camera movement with scroll and mouse
      const scrollOffset = scrollY * 0.003;
      camera.position.y = 10 + Math.sin(t * 0.3) * 2 - scrollOffset * 5;
      camera.position.z = 35 - scrollOffset * 3;
      camera.position.x += (mouseX * 8 - camera.position.x) * 0.05;
      camera.lookAt(0, 0, -10);

      // Massive text animation
      if (quality.enableGlow && textGroup.children.length > 0) {
        textGroup.rotation.y = Math.sin(t * 0.4) * 0.3;
        textGroup.position.y = 15 + Math.sin(t * 0.6) * 2;
        textGroup.children.forEach((letter, i) => {
          const mesh = letter as THREE.Mesh;
          mesh.rotation.x = Math.sin(t * 0.8 + i) * 0.2;
          mesh.rotation.z = Math.cos(t * 0.5 + i) * 0.15;
          mesh.position.y = Math.sin(t * 1.2 + i * 0.5) * 0.8;

          // Pulsing glow
          const material = mesh.material as THREE.MeshPhysicalMaterial;
          material.emissiveIntensity = 0.6 + Math.sin(t * 3 + i) * 0.4;

          // Outline glow pulse
          if (mesh.children[0]) {
            const outline = mesh.children[0] as THREE.Mesh;
            const outlineMat = outline.material as THREE.MeshBasicMaterial;
            outlineMat.opacity = 0.2 + Math.sin(t * 2 + i * 0.7) * 0.2;
          }
        });
      }

      // Menu cards - spectacular floating and orbiting
      menuCards.forEach((item, i) => {
        const { group, basePos, velocity, rotationSpeed, hoverOffset, orbitAngle, orbitRadius } = item;

        // Orbital motion
        const orbitSpeed = 0.1;
        const currentAngle = orbitAngle + t * orbitSpeed;
        const orbitX = Math.cos(currentAngle) * orbitRadius;
        const orbitZ = Math.sin(currentAngle) * orbitRadius - 15;

        // Floating up and down
        const hoverY = Math.sin(t * 0.7 + hoverOffset) * 2.5;
        group.position.x = orbitX + velocity.x * Math.sin(t * 0.5);
        group.position.y = basePos.y + hoverY;
        group.position.z = orbitZ + velocity.z * Math.cos(t * 0.5);

        // Dynamic rotation
        group.rotation.x += rotationSpeed.x;
        group.rotation.y += rotationSpeed.y * 2;
        group.rotation.z += rotationSpeed.z;

        // Pulsing scale
        const scale = item.scale * (1 + Math.sin(t * 2 + i * 0.5) * 0.15);
        group.scale.set(scale, scale, scale);

        // Billboard effect towards camera
        const lookAtPos = camera.position.clone();
        lookAtPos.y = group.position.y;
        group.lookAt(lookAtPos);

        // Animate glow
        if (quality.enableGlow && group.children[2]) {
          const glow = group.children[2] as THREE.Mesh;
          const glowMat = glow.material as THREE.MeshBasicMaterial;
          glowMat.opacity = 0.2 + Math.sin(t * 2.5 + i) * 0.2;
        }

        // Animate frame
        if (group.children[1]) {
          const frame = group.children[1] as THREE.Mesh;
          const frameMat = frame.material as THREE.MeshBasicMaterial;
          frameMat.opacity = 0.5 + Math.sin(t * 3 + i * 0.8) * 0.3;
        }
      });

      // Particle galaxy - swirling and flowing
      const positions = particleGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;

        // Swirling motion
        const angle = Math.atan2(positions[i3 + 2], positions[i3]);
        const radius = Math.sqrt(positions[i3] ** 2 + positions[i3 + 2] ** 2);
        const newAngle = angle + 0.001;

        positions[i3] = Math.cos(newAngle) * radius + particleVelocities[i3];
        positions[i3 + 1] += particleVelocities[i3 + 1];
        positions[i3 + 2] = Math.sin(newAngle) * radius + particleVelocities[i3 + 2];

        // Wrap around boundaries
        if (Math.abs(positions[i3 + 1]) > 20) particleVelocities[i3 + 1] *= -1;
        if (radius > 55) {
          positions[i3] *= 0.9;
          positions[i3 + 2] *= 0.9;
        }
      }
      particleGeometry.attributes.position.needsUpdate = true;

      // Particle material pulse
      particleMaterial.opacity = 0.8 + Math.sin(t * 0.8) * 0.2;

      // Light beams - rotating and pulsing
      lightBeams.forEach((beam, i) => {
        beam.mesh.rotation.y = t * beam.speed;
        beam.mesh.position.y = Math.sin(t * 0.5 + i) * 5;

        // Scale pulse
        const scale = 1 + Math.sin(t * 2 + i * 0.7) * 0.3;
        beam.mesh.scale.set(scale, 1, scale);

        // Opacity pulse
        const material = beam.mesh.material as THREE.MeshBasicMaterial;
        material.opacity = 0.3 + Math.sin(t * 1.5 + i) * 0.2;
      });

      // Holographic rings - rotating
      ringGroup.rotation.y = t * 0.15;
      rings.forEach((ring, i) => {
        ring.mesh.rotation.z = t * ring.speed;

        // Scale pulse
        const scale = 1 + Math.sin(t * 1.5 + i * 0.4) * 0.05;
        ring.mesh.scale.set(scale, scale, scale);

        // Opacity wave
        const material = ring.mesh.material as THREE.MeshBasicMaterial;
        material.opacity = 0.2 + Math.sin(t * 2 + i * 0.6) * 0.15;
      });

      // Animated colored lights
      pointLights.forEach((light, i) => {
        light.position.x = Math.sin(t * 0.5 + i * 2) * 30;
        light.position.z = Math.cos(t * 0.5 + i * 2) * 30;
        light.intensity = 2.5 + Math.sin(t * 2 + i) * 1.5;
      });

      // Render
      renderer.render(scene, camera);
      frameId = globalThis.requestAnimationFrame(animate);
    };

    animate();

    // === CLEANUP ===
    return () => {
      globalThis.cancelAnimationFrame(frameId);
      globalThis.window.removeEventListener("resize", handleResize);
      mountEl.removeEventListener("mousemove", handleMouseMove);
      globalThis.window.removeEventListener("scroll", handleScroll);
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div className="menu-showcase-stage" ref={mountRef} />;
}
