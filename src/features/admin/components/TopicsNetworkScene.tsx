"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function TopicsNetworkScene() {
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
    renderer.toneMappingExposure = 1.1;
    mountEl.appendChild(renderer.domElement);

    // Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a12, 0.012);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      55,
      mountEl.clientWidth / mountEl.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, 30);

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];

    // Color palette - Network/Graph theme (green, teal, electric blue)
    const primaryColor = 0x10b981; // Emerald green
    const secondaryColor = 0x06b6d4; // Cyan
    const tertiaryColor = 0x3b82f6; // Blue
    const accentColor = 0xf59e0b; // Amber
    const whiteColor = 0xffffff;

    // ==========================================
    // Central Hub Node
    // ==========================================
    const hubGeometry = new THREE.IcosahedronGeometry(2, 1);
    const hubMaterial = new THREE.MeshPhysicalMaterial({
      color: primaryColor,
      metalness: 0.4,
      roughness: 0.2,
      transparent: true,
      opacity: 0.9,
      emissive: new THREE.Color(primaryColor),
      emissiveIntensity: 0.4,
      wireframe: false,
    });
    geometries.push(hubGeometry);
    materials.push(hubMaterial);
    const hubNode = new THREE.Mesh(hubGeometry, hubMaterial);
    scene.add(hubNode);

    // Hub wireframe overlay
    const hubWireGeometry = new THREE.IcosahedronGeometry(2.1, 1);
    const hubWireMaterial = new THREE.MeshBasicMaterial({
      color: primaryColor,
      wireframe: true,
      transparent: true,
      opacity: 0.4,
    });
    geometries.push(hubWireGeometry);
    materials.push(hubWireMaterial);
    const hubWire = new THREE.Mesh(hubWireGeometry, hubWireMaterial);
    scene.add(hubWire);

    // Hub glow
    const hubGlowGeometry = new THREE.SphereGeometry(2.5, 32, 32);
    const hubGlowMaterial = new THREE.MeshBasicMaterial({
      color: primaryColor,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide,
    });
    geometries.push(hubGlowGeometry);
    materials.push(hubGlowMaterial);
    const hubGlow = new THREE.Mesh(hubGlowGeometry, hubGlowMaterial);
    scene.add(hubGlow);

    // ==========================================
    // Network Nodes (Topics)
    // ==========================================
    const nodeCount = 20;
    const nodes: THREE.Mesh[] = [];
    const nodeData: Array<{
      basePosition: THREE.Vector3;
      orbitSpeed: number;
      orbitRadius: number;
      orbitOffset: number;
      pulseSpeed: number;
      pulseOffset: number;
      tier: number;
    }> = [];

    const nodeGeometry = new THREE.OctahedronGeometry(0.5, 0);
    geometries.push(nodeGeometry);

    const nodeColors = [primaryColor, secondaryColor, tertiaryColor, accentColor];

    for (let i = 0; i < nodeCount; i++) {
      const tier = Math.floor(i / 7) + 1; // 3 tiers
      const tierRadius = 6 + tier * 4;
      const angleOffset = (i % 7) * (Math.PI * 2 / 7) + (tier * Math.PI / 5);

      const nodeMaterial = new THREE.MeshPhysicalMaterial({
        color: nodeColors[i % nodeColors.length],
        metalness: 0.5,
        roughness: 0.3,
        transparent: true,
        opacity: 0.85,
        emissive: new THREE.Color(nodeColors[i % nodeColors.length]),
        emissiveIntensity: 0.3,
      });
      materials.push(nodeMaterial);

      const node = new THREE.Mesh(nodeGeometry, nodeMaterial);

      const x = Math.cos(angleOffset) * tierRadius;
      const y = (Math.random() - 0.5) * 6;
      const z = Math.sin(angleOffset) * tierRadius;

      node.position.set(x, y, z);

      nodeData.push({
        basePosition: new THREE.Vector3(x, y, z),
        orbitSpeed: 0.1 + Math.random() * 0.15,
        orbitRadius: tierRadius,
        orbitOffset: angleOffset,
        pulseSpeed: 1 + Math.random() * 2,
        pulseOffset: Math.random() * Math.PI * 2,
        tier,
      });

      nodes.push(node);
      scene.add(node);
    }

    // ==========================================
    // Connection Lines (Network Edges)
    // ==========================================
    const connections: THREE.Line[] = [];
    const connectionData: Array<{ from: number; to: number }> = [];

    // Connect hub to first tier nodes
    for (let i = 0; i < 7; i++) {
      connectionData.push({ from: -1, to: i }); // -1 represents hub
    }

    // Connect between tiers
    for (let i = 0; i < nodeCount - 7; i++) {
      const fromIdx = i;
      const toIdx = i + 7;
      if (toIdx < nodeCount) {
        connectionData.push({ from: fromIdx, to: toIdx });
      }
    }

    // Random cross-connections
    for (let i = 0; i < 8; i++) {
      const from = Math.floor(Math.random() * nodeCount);
      let to = Math.floor(Math.random() * nodeCount);
      while (to === from) {
        to = Math.floor(Math.random() * nodeCount);
      }
      connectionData.push({ from, to });
    }

    connectionData.forEach(({ from, to }) => {
      const lineGeometry = new THREE.BufferGeometry();
      const lineMaterial = new THREE.LineBasicMaterial({
        color: from === -1 ? primaryColor : secondaryColor,
        transparent: true,
        opacity: 0.3,
      });
      geometries.push(lineGeometry);
      materials.push(lineMaterial);

      const line = new THREE.Line(lineGeometry, lineMaterial);
      line.userData = { from, to };
      connections.push(line);
      scene.add(line);
    });

    // ==========================================
    // Flowing Data Particles on Connections
    // ==========================================
    const flowParticleCount = 100;
    const flowParticles: THREE.Mesh[] = [];
    const flowParticleData: Array<{
      connectionIdx: number;
      progress: number;
      speed: number;
    }> = [];

    const flowGeometry = new THREE.SphereGeometry(0.08, 8, 8);
    geometries.push(flowGeometry);

    for (let i = 0; i < flowParticleCount; i++) {
      const flowMaterial = new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? accentColor : i % 3 === 1 ? primaryColor : secondaryColor,
        transparent: true,
        opacity: 0.8,
      });
      materials.push(flowMaterial);

      const particle = new THREE.Mesh(flowGeometry, flowMaterial);
      flowParticleData.push({
        connectionIdx: Math.floor(Math.random() * connectionData.length),
        progress: Math.random(),
        speed: 0.005 + Math.random() * 0.01,
      });
      flowParticles.push(particle);
      scene.add(particle);
    }

    // ==========================================
    // Hexagonal Grid Planes (Data Categories)
    // ==========================================
    const hexCount = 12;
    const hexagons: THREE.Mesh[] = [];
    const hexData: Array<{
      baseY: number;
      floatSpeed: number;
      floatOffset: number;
      rotationSpeed: number;
    }> = [];

    const hexShape = new THREE.Shape();
    const hexRadius = 1.2;
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 6;
      const x = Math.cos(angle) * hexRadius;
      const y = Math.sin(angle) * hexRadius;
      if (i === 0) {
        hexShape.moveTo(x, y);
      } else {
        hexShape.lineTo(x, y);
      }
    }
    hexShape.closePath();

    const hexGeometry = new THREE.ShapeGeometry(hexShape);
    geometries.push(hexGeometry);

    for (let i = 0; i < hexCount; i++) {
      const hexMaterial = new THREE.MeshBasicMaterial({
        color: nodeColors[i % nodeColors.length],
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
      });
      materials.push(hexMaterial);

      const hex = new THREE.Mesh(hexGeometry, hexMaterial);

      // Create hex border
      const borderGeometry = new THREE.EdgesGeometry(hexGeometry);
      const borderMaterial = new THREE.LineBasicMaterial({
        color: nodeColors[i % nodeColors.length],
        transparent: true,
        opacity: 0.5,
      });
      geometries.push(borderGeometry);
      materials.push(borderMaterial);
      const border = new THREE.LineSegments(borderGeometry, borderMaterial);
      hex.add(border);

      const angle = (i / hexCount) * Math.PI * 2;
      const radius = 15 + Math.random() * 8;
      hex.position.set(
        Math.cos(angle) * radius,
        (Math.random() - 0.5) * 10,
        Math.sin(angle) * radius
      );
      hex.rotation.x = Math.random() * Math.PI;
      hex.rotation.y = Math.random() * Math.PI;

      hexData.push({
        baseY: hex.position.y,
        floatSpeed: 0.3 + Math.random() * 0.4,
        floatOffset: Math.random() * Math.PI * 2,
        rotationSpeed: 0.1 + Math.random() * 0.2,
      });

      hexagons.push(hex);
      scene.add(hex);
    }

    // ==========================================
    // Orbital Rings (Hierarchy Levels)
    // ==========================================
    const rings: THREE.Mesh[] = [];
    const ringRadii = [10, 14, 18];

    ringRadii.forEach((radius, i) => {
      const ringGeometry = new THREE.TorusGeometry(radius, 0.03, 16, 100);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: i === 0 ? primaryColor : i === 1 ? secondaryColor : tertiaryColor,
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
      });
      geometries.push(ringGeometry);
      materials.push(ringMaterial);

      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI / 2;
      rings.push(ring);
      scene.add(ring);
    });

    // ==========================================
    // Background Particle Field
    // ==========================================
    const bgParticleCount = 600;
    const bgParticlePositions = new Float32Array(bgParticleCount * 3);
    const bgParticleColors = new Float32Array(bgParticleCount * 3);

    const colorArray = [
      new THREE.Color(primaryColor),
      new THREE.Color(secondaryColor),
      new THREE.Color(tertiaryColor),
      new THREE.Color(whiteColor),
    ];

    for (let i = 0; i < bgParticleCount; i++) {
      const radius = 20 + Math.random() * 30;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      bgParticlePositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      bgParticlePositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      bgParticlePositions[i * 3 + 2] = radius * Math.cos(phi);

      const color = colorArray[Math.floor(Math.random() * colorArray.length)];
      bgParticleColors[i * 3] = color.r;
      bgParticleColors[i * 3 + 1] = color.g;
      bgParticleColors[i * 3 + 2] = color.b;
    }

    const bgParticleGeometry = new THREE.BufferGeometry();
    bgParticleGeometry.setAttribute("position", new THREE.Float32BufferAttribute(bgParticlePositions, 3));
    bgParticleGeometry.setAttribute("color", new THREE.Float32BufferAttribute(bgParticleColors, 3));
    const bgParticleMaterial = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    geometries.push(bgParticleGeometry);
    materials.push(bgParticleMaterial);
    const bgParticles = new THREE.Points(bgParticleGeometry, bgParticleMaterial);
    scene.add(bgParticles);

    // ==========================================
    // Data Stream Lines (Rising)
    // ==========================================
    const streamCount = 6;
    const streams: THREE.Points[] = [];

    for (let s = 0; s < streamCount; s++) {
      const streamParticleCount = 40;
      const streamPositions = new Float32Array(streamParticleCount * 3);
      const angle = (s / streamCount) * Math.PI * 2;
      const baseX = Math.cos(angle) * 12;
      const baseZ = Math.sin(angle) * 12;

      for (let i = 0; i < streamParticleCount; i++) {
        streamPositions[i * 3] = baseX + (Math.random() - 0.5) * 0.5;
        streamPositions[i * 3 + 1] = i * 0.5 - 10;
        streamPositions[i * 3 + 2] = baseZ + (Math.random() - 0.5) * 0.5;
      }

      const streamGeometry = new THREE.BufferGeometry();
      streamGeometry.setAttribute("position", new THREE.Float32BufferAttribute(streamPositions, 3));
      const streamMaterial = new THREE.PointsMaterial({
        color: s % 2 === 0 ? primaryColor : secondaryColor,
        size: 0.15,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      geometries.push(streamGeometry);
      materials.push(streamMaterial);

      const stream = new THREE.Points(streamGeometry, streamMaterial);
      stream.userData = { speed: 0.03 + Math.random() * 0.02 };
      streams.push(stream);
      scene.add(stream);
    }

    // ==========================================
    // Lighting
    // ==========================================
    const ambient = new THREE.AmbientLight(0xffffff, 0.25);
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.6);
    keyLight.position.set(5, 10, 10);
    const greenLight = new THREE.PointLight(primaryColor, 2, 35);
    greenLight.position.set(0, 5, 0);
    const cyanLight = new THREE.PointLight(secondaryColor, 1.5, 30);
    cyanLight.position.set(-8, -3, 8);
    const blueLight = new THREE.PointLight(tertiaryColor, 1, 25);
    blueLight.position.set(8, 3, -8);
    scene.add(ambient, keyLight, greenLight, cyanLight, blueLight);

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

      // Rotate hub
      hubNode.rotation.y = t * 0.3;
      hubNode.rotation.x = Math.sin(t * 0.5) * 0.2;
      hubWire.rotation.y = -t * 0.2;
      hubWire.rotation.z = t * 0.1;

      // Pulse hub glow
      const hubPulse = 1 + Math.sin(t * 2) * 0.1;
      hubGlow.scale.setScalar(hubPulse);

      // Animate network nodes
      nodes.forEach((node, i) => {
        const data = nodeData[i];
        const angle = data.orbitOffset + t * data.orbitSpeed;

        node.position.x = Math.cos(angle) * data.orbitRadius;
        node.position.z = Math.sin(angle) * data.orbitRadius;
        node.position.y = data.basePosition.y + Math.sin(t * data.pulseSpeed + data.pulseOffset) * 0.5;

        node.rotation.x += 0.01;
        node.rotation.y += 0.015;

        // Pulse scale
        const nodePulse = 1 + Math.sin(t * data.pulseSpeed + data.pulseOffset) * 0.15;
        node.scale.setScalar(nodePulse);
      });

      // Update connection lines
      connections.forEach((line) => {
        const { from, to } = line.userData;
        const fromPos = from === -1 ? hubNode.position : nodes[from].position;
        const toPos = nodes[to].position;

        const positions = new Float32Array([
          fromPos.x, fromPos.y, fromPos.z,
          toPos.x, toPos.y, toPos.z,
        ]);
        line.geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        line.geometry.attributes.position.needsUpdate = true;
      });

      // Animate flow particles
      flowParticles.forEach((particle, i) => {
        const data = flowParticleData[i];
        data.progress += data.speed;
        if (data.progress > 1) {
          data.progress = 0;
          data.connectionIdx = Math.floor(Math.random() * connectionData.length);
        }

        const conn = connectionData[data.connectionIdx];
        const fromPos = conn.from === -1 ? hubNode.position : nodes[conn.from].position;
        const toPos = nodes[conn.to].position;

        particle.position.lerpVectors(fromPos, toPos, data.progress);
      });

      // Animate hexagons
      hexagons.forEach((hex, i) => {
        const data = hexData[i];
        hex.position.y = data.baseY + Math.sin(t * data.floatSpeed + data.floatOffset) * 1.5;
        hex.rotation.z += data.rotationSpeed * 0.01;
      });

      // Rotate orbital rings
      rings.forEach((ring, i) => {
        ring.rotation.z = t * (0.05 + i * 0.02) * (i % 2 === 0 ? 1 : -1);
      });

      // Animate data streams
      streams.forEach((stream) => {
        const positions = stream.geometry.attributes.position.array as Float32Array;
        const count = positions.length / 3;
        for (let i = 0; i < count; i++) {
          positions[i * 3 + 1] += stream.userData.speed;
          if (positions[i * 3 + 1] > 10) {
            positions[i * 3 + 1] = -10;
          }
        }
        stream.geometry.attributes.position.needsUpdate = true;
      });

      // Rotate background particles
      bgParticles.rotation.y = t * 0.02;

      // Camera follows mouse
      camera.position.x += (mouseX * 6 - camera.position.x) * 0.02;
      camera.position.y += (5 + mouseY * 4 - camera.position.y) * 0.02;
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

  return <div className="topics-network-stage" ref={mountRef} />;
}
