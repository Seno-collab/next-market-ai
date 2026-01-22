"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function ProfileIdentityScene() {
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
    scene.fog = new THREE.FogExp2(0x0a0a15, 0.015);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      55,
      mountEl.clientWidth / mountEl.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 25);

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];

    // Color palette - Identity/Profile theme (purple, cyan, gold)
    const primaryColor = 0x8b5cf6; // Purple
    const secondaryColor = 0x22d3ee; // Cyan
    const accentColor = 0xf59e0b; // Gold/amber
    const whiteColor = 0xffffff;

    // ==========================================
    // Central Avatar Sphere with Glow
    // ==========================================
    const avatarGeometry = new THREE.SphereGeometry(2.5, 64, 64);
    const avatarMaterial = new THREE.MeshPhysicalMaterial({
      color: primaryColor,
      metalness: 0.3,
      roughness: 0.2,
      transparent: true,
      opacity: 0.9,
      emissive: new THREE.Color(primaryColor),
      emissiveIntensity: 0.3,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
    });
    geometries.push(avatarGeometry);
    materials.push(avatarMaterial);
    const avatarSphere = new THREE.Mesh(avatarGeometry, avatarMaterial);
    scene.add(avatarSphere);

    // Avatar inner glow
    const glowGeometry = new THREE.SphereGeometry(2.8, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: primaryColor,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide,
    });
    geometries.push(glowGeometry);
    materials.push(glowMaterial);
    const glowSphere = new THREE.Mesh(glowGeometry, glowMaterial);
    scene.add(glowSphere);

    // Outer halo
    const haloGeometry = new THREE.RingGeometry(3.2, 3.5, 64);
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: secondaryColor,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    });
    geometries.push(haloGeometry);
    materials.push(haloMaterial);
    const halo = new THREE.Mesh(haloGeometry, haloMaterial);
    scene.add(halo);

    // ==========================================
    // DNA Double Helix - Identity Strands
    // ==========================================
    const helixGroup = new THREE.Group();
    const helixPoints1: THREE.Vector3[] = [];
    const helixPoints2: THREE.Vector3[] = [];
    const helixRadius = 5;
    const helixHeight = 20;
    const helixTurns = 3;
    const helixSegments = 100;

    for (let i = 0; i <= helixSegments; i++) {
      const t = i / helixSegments;
      const angle = t * Math.PI * 2 * helixTurns;
      const y = (t - 0.5) * helixHeight;

      helixPoints1.push(
        new THREE.Vector3(
          Math.cos(angle) * helixRadius,
          y,
          Math.sin(angle) * helixRadius
        )
      );
      helixPoints2.push(
        new THREE.Vector3(
          Math.cos(angle + Math.PI) * helixRadius,
          y,
          Math.sin(angle + Math.PI) * helixRadius
        )
      );
    }

    // Helix strand 1
    const helixCurve1 = new THREE.CatmullRomCurve3(helixPoints1);
    const helixTubeGeom1 = new THREE.TubeGeometry(helixCurve1, 100, 0.15, 8, false);
    const helixMat1 = new THREE.MeshPhysicalMaterial({
      color: secondaryColor,
      metalness: 0.5,
      roughness: 0.3,
      transparent: true,
      opacity: 0.8,
      emissive: new THREE.Color(secondaryColor),
      emissiveIntensity: 0.2,
    });
    geometries.push(helixTubeGeom1);
    materials.push(helixMat1);
    const helixMesh1 = new THREE.Mesh(helixTubeGeom1, helixMat1);
    helixGroup.add(helixMesh1);

    // Helix strand 2
    const helixCurve2 = new THREE.CatmullRomCurve3(helixPoints2);
    const helixTubeGeom2 = new THREE.TubeGeometry(helixCurve2, 100, 0.15, 8, false);
    const helixMat2 = new THREE.MeshPhysicalMaterial({
      color: primaryColor,
      metalness: 0.5,
      roughness: 0.3,
      transparent: true,
      opacity: 0.8,
      emissive: new THREE.Color(primaryColor),
      emissiveIntensity: 0.2,
    });
    geometries.push(helixTubeGeom2);
    materials.push(helixMat2);
    const helixMesh2 = new THREE.Mesh(helixTubeGeom2, helixMat2);
    helixGroup.add(helixMesh2);

    // Connection bars between helix strands
    const barGeometry = new THREE.CylinderGeometry(0.08, 0.08, 1, 8);
    geometries.push(barGeometry);

    for (let i = 0; i <= helixSegments; i += 5) {
      const t = i / helixSegments;
      const angle = t * Math.PI * 2 * helixTurns;
      const y = (t - 0.5) * helixHeight;

      const barMaterial = new THREE.MeshBasicMaterial({
        color: i % 10 === 0 ? accentColor : whiteColor,
        transparent: true,
        opacity: 0.6,
      });
      materials.push(barMaterial);

      const bar = new THREE.Mesh(barGeometry, barMaterial);
      bar.position.set(0, y, 0);
      bar.rotation.z = Math.PI / 2;
      bar.rotation.y = angle;
      bar.scale.y = helixRadius * 2;
      helixGroup.add(bar);
    }

    scene.add(helixGroup);

    // ==========================================
    // Floating Data Panels (Holographic)
    // ==========================================
    const panelCount = 6;
    const panels: THREE.Mesh[] = [];
    const panelData: Array<{
      orbitRadius: number;
      orbitSpeed: number;
      orbitOffset: number;
      floatSpeed: number;
      floatOffset: number;
    }> = [];

    const panelGeometry = new THREE.PlaneGeometry(2.5, 1.5);
    geometries.push(panelGeometry);

    for (let i = 0; i < panelCount; i++) {
      const panelMaterial = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? secondaryColor : primaryColor,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
      });
      materials.push(panelMaterial);

      const panel = new THREE.Mesh(panelGeometry, panelMaterial);

      // Create panel border
      const borderGeometry = new THREE.EdgesGeometry(panelGeometry);
      const borderMaterial = new THREE.LineBasicMaterial({
        color: i % 2 === 0 ? secondaryColor : primaryColor,
        transparent: true,
        opacity: 0.8,
      });
      geometries.push(borderGeometry);
      materials.push(borderMaterial);
      const border = new THREE.LineSegments(borderGeometry, borderMaterial);
      panel.add(border);

      panelData.push({
        orbitRadius: 9 + Math.random() * 3,
        orbitSpeed: 0.15 + Math.random() * 0.1,
        orbitOffset: (i / panelCount) * Math.PI * 2,
        floatSpeed: 0.5 + Math.random() * 0.5,
        floatOffset: Math.random() * Math.PI * 2,
      });

      panels.push(panel);
      scene.add(panel);
    }

    // ==========================================
    // Security Shield Rings
    // ==========================================
    const shieldRings: THREE.Mesh[] = [];
    const shieldCount = 3;

    for (let i = 0; i < shieldCount; i++) {
      const radius = 4 + i * 1.5;
      const ringGeometry = new THREE.TorusGeometry(radius, 0.05, 16, 100);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: i === 0 ? accentColor : i === 1 ? secondaryColor : primaryColor,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
      });
      geometries.push(ringGeometry);
      materials.push(ringMaterial);

      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI / 2 + (i * Math.PI) / 8;
      ring.rotation.y = (i * Math.PI) / 6;
      shieldRings.push(ring);
      scene.add(ring);
    }

    // ==========================================
    // Data Particles (Activity Stream)
    // ==========================================
    const particleCount = 800;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    const particleSpeeds: number[] = [];

    const colorOptions = [
      new THREE.Color(primaryColor),
      new THREE.Color(secondaryColor),
      new THREE.Color(accentColor),
      new THREE.Color(whiteColor),
    ];

    for (let i = 0; i < particleCount; i++) {
      // Distribute in a sphere around center
      const radius = 8 + Math.random() * 20;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      particlePositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      particlePositions[i * 3 + 2] = radius * Math.cos(phi);

      const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];
      particleColors[i * 3] = color.r;
      particleColors[i * 3 + 1] = color.g;
      particleColors[i * 3 + 2] = color.b;

      particleSpeeds.push(0.01 + Math.random() * 0.02);
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.Float32BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute("color", new THREE.Float32BufferAttribute(particleColors, 3));
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    geometries.push(particleGeometry);
    materials.push(particleMaterial);
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // ==========================================
    // Orbiting Identity Nodes
    // ==========================================
    const nodeCount = 8;
    const nodes: THREE.Mesh[] = [];
    const nodeData: Array<{
      orbitRadius: number;
      orbitSpeed: number;
      orbitOffset: number;
      orbitTilt: number;
    }> = [];

    const nodeGeometry = new THREE.OctahedronGeometry(0.4, 0);
    geometries.push(nodeGeometry);

    for (let i = 0; i < nodeCount; i++) {
      const nodeMaterial = new THREE.MeshPhysicalMaterial({
        color: colorOptions[i % colorOptions.length],
        metalness: 0.8,
        roughness: 0.2,
        transparent: true,
        opacity: 0.9,
        emissive: colorOptions[i % colorOptions.length],
        emissiveIntensity: 0.3,
      });
      materials.push(nodeMaterial);

      const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
      nodeData.push({
        orbitRadius: 6 + (i % 3) * 2,
        orbitSpeed: 0.3 + Math.random() * 0.2,
        orbitOffset: (i / nodeCount) * Math.PI * 2,
        orbitTilt: (Math.random() - 0.5) * Math.PI / 3,
      });
      nodes.push(node);
      scene.add(node);
    }

    // ==========================================
    // Background Stars
    // ==========================================
    const starCount = 300;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 100;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 100;
      starPositions[i * 3 + 2] = -30 - Math.random() * 30;
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.Float32BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.1,
      transparent: true,
      opacity: 0.6,
    });
    geometries.push(starGeometry);
    materials.push(starMaterial);
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // ==========================================
    // Lighting
    // ==========================================
    const ambient = new THREE.AmbientLight(0xffffff, 0.3);
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
    keyLight.position.set(5, 10, 10);
    const purpleLight = new THREE.PointLight(primaryColor, 2, 30);
    purpleLight.position.set(-5, 5, 5);
    const cyanLight = new THREE.PointLight(secondaryColor, 1.5, 25);
    cyanLight.position.set(5, -3, 5);
    const goldLight = new THREE.PointLight(accentColor, 1, 20);
    goldLight.position.set(0, 8, 0);
    scene.add(ambient, keyLight, purpleLight, cyanLight, goldLight);

    // ==========================================
    // Mouse Interaction
    // ==========================================
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

    // ==========================================
    // Animation Loop
    // ==========================================
    const clock = new THREE.Clock();
    let frameId = 0;

    const animate = () => {
      const t = clock.getElapsedTime();

      // Rotate avatar sphere
      avatarSphere.rotation.y = t * 0.2;
      glowSphere.rotation.y = -t * 0.1;

      // Pulse avatar
      const pulse = 1 + Math.sin(t * 2) * 0.03;
      avatarSphere.scale.setScalar(pulse);
      glowSphere.scale.setScalar(pulse * 1.1);

      // Rotate halo
      halo.rotation.x = Math.sin(t * 0.5) * 0.3;
      halo.rotation.y = t * 0.3;

      // Rotate DNA helix
      helixGroup.rotation.y = t * 0.1;

      // Animate floating panels
      panels.forEach((panel, i) => {
        const data = panelData[i];
        const angle = data.orbitOffset + t * data.orbitSpeed;
        panel.position.x = Math.cos(angle) * data.orbitRadius;
        panel.position.z = Math.sin(angle) * data.orbitRadius;
        panel.position.y = Math.sin(t * data.floatSpeed + data.floatOffset) * 2;
        panel.lookAt(0, panel.position.y, 0);
      });

      // Rotate shield rings
      shieldRings.forEach((ring, i) => {
        ring.rotation.z = t * (0.2 + i * 0.1) * (i % 2 === 0 ? 1 : -1);
      });

      // Animate identity nodes
      nodes.forEach((node, i) => {
        const data = nodeData[i];
        const angle = data.orbitOffset + t * data.orbitSpeed;
        node.position.x = Math.cos(angle) * data.orbitRadius;
        node.position.y = Math.sin(data.orbitTilt) * Math.sin(angle) * data.orbitRadius * 0.3;
        node.position.z = Math.sin(angle) * data.orbitRadius;
        node.rotation.x += 0.02;
        node.rotation.y += 0.03;
      });

      // Rotate particles slowly
      particles.rotation.y = t * 0.03;
      particles.rotation.x = Math.sin(t * 0.1) * 0.1;

      // Twinkle stars
      stars.rotation.y = t * 0.005;

      // Camera follows mouse
      camera.position.x += (mouseX * 5 - camera.position.x) * 0.02;
      camera.position.y += (mouseY * 3 - camera.position.y) * 0.02;
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
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div className="profile-identity-stage" ref={mountRef} />;
}
