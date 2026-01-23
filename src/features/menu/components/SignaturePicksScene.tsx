"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { MenuItem } from "@/features/menu/types";

type SignaturePicksSceneProps = {
  items?: MenuItem[];
};

export default function SignaturePicksScene({ items = [] }: SignaturePicksSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl) return undefined;

    // Renderer setup
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
    renderer.toneMappingExposure = 1.8;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountEl.appendChild(renderer.domElement);

    // Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a1f, 0.015);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      50,
      mountEl.clientWidth / mountEl.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 6, 20);

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];

    // Premium color palette
    const colors = {
      gold: 0xffd700,
      goldBright: 0xffed4e,
      rose: 0xff6b9d,
      cyan: 0x00d4ff,
      purple: 0xb794f6,
      white: 0xffffff,
      orange: 0xff8c42,
    };

    // === RESPONSIVE QUALITY ===
    const isMobile = mountEl.clientWidth < 768;
    const isLowEnd = mountEl.clientWidth < 480;

    const quality = {
      particleCount: isLowEnd ? 300 : isMobile ? 600 : 1200,
      ringCount: isLowEnd ? 3 : isMobile ? 5 : 7,
      starCount: isLowEnd ? 30 : isMobile ? 60 : 100,
      enableGlows: !isLowEnd,
      enableSpotlight: !isLowEnd,
      enableTrails: !isMobile,
    };

    // === CENTRAL PEDESTAL PLATFORM ===
    const pedestalGroup = new THREE.Group();
    pedestalGroup.position.set(0, 0, 0);
    scene.add(pedestalGroup);

    // Main pedestal base
    const baseGeometry = new THREE.CylinderGeometry(3, 3.5, 0.5, 8);
    const baseMaterial = new THREE.MeshPhysicalMaterial({
      color: colors.gold,
      metalness: 0.9,
      roughness: 0.1,
      emissive: new THREE.Color(colors.gold),
      emissiveIntensity: 0.3,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      transparent: true,
      opacity: 0.8,
    });
    geometries.push(baseGeometry);
    materials.push(baseMaterial);
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = -2;
    base.castShadow = true;
    base.receiveShadow = true;
    pedestalGroup.add(base);

    // Pedestal pillar
    const pillarGeometry = new THREE.CylinderGeometry(2, 2.5, 2, 8);
    const pillarMaterial = new THREE.MeshPhysicalMaterial({
      color: colors.purple,
      metalness: 0.85,
      roughness: 0.15,
      emissive: new THREE.Color(colors.purple),
      emissiveIntensity: 0.25,
      clearcoat: 0.8,
      transparent: true,
      opacity: 0.75,
    });
    geometries.push(pillarGeometry);
    materials.push(pillarMaterial);
    const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
    pillar.position.y = -0.5;
    pillar.castShadow = true;
    pedestalGroup.add(pillar);

    // Top platform
    const platformGeometry = new THREE.CylinderGeometry(2.5, 2, 0.3, 8);
    const platformMaterial = new THREE.MeshPhysicalMaterial({
      color: colors.cyan,
      metalness: 0.9,
      roughness: 0.1,
      emissive: new THREE.Color(colors.cyan),
      emissiveIntensity: 0.4,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.85,
    });
    geometries.push(platformGeometry);
    materials.push(platformMaterial);
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.y = 0.8;
    platform.castShadow = true;
    pedestalGroup.add(platform);

    // === ROTATING HOLOGRAPHIC RINGS ===
    const ringsGroup = new THREE.Group();
    ringsGroup.position.set(0, 2, 0);
    pedestalGroup.add(ringsGroup);

    const rings: Array<{ mesh: THREE.Mesh; speed: number; axis: THREE.Vector3 }> = [];

    for (let i = 0; i < quality.ringCount; i++) {
      const radius = 3 + i * 0.4;
      const thickness = 0.03 + i * 0.01;
      const ringGeometry = new THREE.TorusGeometry(radius, thickness, 16, 100);
      const ringColor = i % 2 === 0 ? colors.gold : colors.cyan;
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: ringColor,
        transparent: true,
        opacity: 0.6 - i * 0.05,
        blending: THREE.AdditiveBlending,
      });
      geometries.push(ringGeometry);
      materials.push(ringMaterial);
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI / 2 + (i * Math.PI) / 12;
      rings.push({
        mesh: ring,
        speed: 0.3 + i * 0.1,
        axis: new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5
        ).normalize(),
      });
      ringsGroup.add(ring);
    }

    // === FLOATING SIGNATURE ITEMS (Real Menu Items with Images) ===
    const itemColors = [colors.gold, colors.rose, colors.cyan, colors.purple, colors.orange];
    const displayItems = items.length > 0 ? items.slice(0, 5) : [];

    const signatureItems: Array<{
      card: THREE.Group;
      angle: number;
      radius: number;
      height: number;
      rotationSpeed: number;
      hoverOffset: number;
      data: MenuItem;
    }> = [];

    // === SIGNATURE LABEL (Holographic) ===
    const labelGroup = new THREE.Group();
    labelGroup.position.set(0, 5.5, 0);
    scene.add(labelGroup);

    if (quality.enableGlows && displayItems.length > 0) {
      // "SIGNATURE PICKS" text using planes
      const letterCount = Math.min(displayItems.length * 2, 10);
      const letterSpacing = 0.8;
      const totalWidth = (letterCount - 1) * letterSpacing;

      for (let i = 0; i < letterCount; i++) {
        const letterGeo = new THREE.PlaneGeometry(0.6, 0.8);
        const letterColor = [colors.gold, colors.goldBright, colors.orange][i % 3];
        const letterMat = new THREE.MeshBasicMaterial({
          color: letterColor,
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
        });
        geometries.push(letterGeo);
        materials.push(letterMat);
        const letter = new THREE.Mesh(letterGeo, letterMat);
        letter.position.x = -totalWidth / 2 + i * letterSpacing;
        letter.userData = { index: i };
        labelGroup.add(letter);
      }

      // Add glow effect behind text
      const textGlowGeo = new THREE.PlaneGeometry(totalWidth + 2, 1.5);
      const textGlowMat = new THREE.MeshBasicMaterial({
        color: colors.gold,
        transparent: true,
        opacity: 0.1,
        blending: THREE.AdditiveBlending,
      });
      geometries.push(textGlowGeo);
      materials.push(textGlowMat);
      const textGlow = new THREE.Mesh(textGlowGeo, textGlowMat);
      textGlow.position.z = -0.2;
      labelGroup.add(textGlow);
    }

    // If no items, show placeholder geometric shapes
    if (displayItems.length === 0) {
      const placeholderShapes = [
        { geo: new THREE.OctahedronGeometry(0.8, 0), color: colors.gold },
        { geo: new THREE.IcosahedronGeometry(0.7, 0), color: colors.rose },
        { geo: new THREE.DodecahedronGeometry(0.75, 0), color: colors.cyan },
      ];

      placeholderShapes.forEach((shape, i) => {
        const geometry = shape.geo.clone();
        geometries.push(geometry);

        const material = new THREE.MeshPhysicalMaterial({
          color: shape.color,
          metalness: 0.9,
          roughness: 0.1,
          transparent: true,
          opacity: 0.9,
          emissive: new THREE.Color(shape.color),
          emissiveIntensity: 0.6,
          clearcoat: 1.0,
          clearcoatRoughness: 0.05,
        });
        materials.push(material);

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const angle = (i / placeholderShapes.length) * Math.PI * 2;
        const radius = 5;
        const height = 2 + i * 0.5;

        const group = new THREE.Group();
        group.add(mesh);
        group.position.set(
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius
        );

        signatureItems.push({
          card: group,
          angle,
          radius,
          height,
          rotationSpeed: 0.3 + i * 0.05,
          hoverOffset: i * 0.5,
          data: {
            id: `placeholder-${i}`,
            name: "",
            category: "",
            price: 0,
            available: true,
            createdAt: "",
            updatedAt: "",
          } as MenuItem,
        });

        scene.add(group);
      });
    } else {
      displayItems.forEach((item, i) => {
      const cardGroup = new THREE.Group();
      const borderColor = itemColors[i % itemColors.length];

      // Card background (larger for better visibility)
      const cardGeometry = new THREE.PlaneGeometry(3.2, 4.0);
      const cardMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.3,
        roughness: 0.2,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
      });
      geometries.push(cardGeometry);
      materials.push(cardMaterial);
      const card = new THREE.Mesh(cardGeometry, cardMaterial);
      card.castShadow = true;
      card.receiveShadow = true;
      cardGroup.add(card);

      // Border glow (larger)
      const borderGeometry = new THREE.PlaneGeometry(3.4, 4.2);
      const borderMaterial = new THREE.MeshBasicMaterial({
        color: borderColor,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });
      geometries.push(borderGeometry);
      materials.push(borderMaterial);
      const border = new THREE.Mesh(borderGeometry, borderMaterial);
      border.position.z = -0.02;
      cardGroup.add(border);

      // Load image texture or create placeholder
      if (item.imageUrl) {
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(
          item.imageUrl,
          (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            // Larger image for better visibility (2.8x2.8 in a 3.2x4.0 card)
            const imageGeometry = new THREE.PlaneGeometry(2.8, 2.8);
            const imageMaterial = new THREE.MeshBasicMaterial({
              map: texture,
              transparent: true,
              opacity: 1,
              side: THREE.DoubleSide,
            });
            geometries.push(imageGeometry);
            materials.push(imageMaterial);
            const imageMesh = new THREE.Mesh(imageGeometry, imageMaterial);
            imageMesh.position.set(0, 0.4, 0.01);
            cardGroup.add(imageMesh);
          },
          undefined,
          (error) => {
            console.warn(`Failed to load texture for ${item.name}:`, error);
            // Add placeholder when image fails
            const placeholderGeo = new THREE.PlaneGeometry(2.8, 2.8);
            const placeholderMat = new THREE.MeshBasicMaterial({
              color: borderColor,
              transparent: true,
              opacity: 0.3,
              side: THREE.DoubleSide,
            });
            geometries.push(placeholderGeo);
            materials.push(placeholderMat);
            const placeholder = new THREE.Mesh(placeholderGeo, placeholderMat);
            placeholder.position.set(0, 0.4, 0.01);
            cardGroup.add(placeholder);
          }
        );
      } else {
        // No image URL - create colored placeholder
        const placeholderGeo = new THREE.PlaneGeometry(2.8, 2.8);
        const placeholderMat = new THREE.MeshBasicMaterial({
          color: borderColor,
          transparent: true,
          opacity: 0.3,
          side: THREE.DoubleSide,
        });
        geometries.push(placeholderGeo);
        materials.push(placeholderMat);
        const placeholder = new THREE.Mesh(placeholderGeo, placeholderMat);
        placeholder.position.set(0, 0.4, 0.01);
        cardGroup.add(placeholder);
      }

      // Create text overlay for item name (Canvas2D texture)
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Name text
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 40px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const maxWidth = 480;
        let fontSize = 40;
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
        while (ctx.measureText(item.name).width > maxWidth && fontSize > 20) {
          fontSize -= 2;
          ctx.font = `bold ${fontSize}px Arial, sans-serif`;
        }
        ctx.fillText(item.name, canvas.width / 2, canvas.height / 2);

        const nameTexture = new THREE.CanvasTexture(canvas);
        nameTexture.needsUpdate = true;
        const nameGeo = new THREE.PlaneGeometry(2.6, 0.65);
        const nameMat = new THREE.MeshBasicMaterial({
          map: nameTexture,
          transparent: true,
          opacity: 0.95,
          side: THREE.DoubleSide,
        });
        geometries.push(nameGeo);
        materials.push(nameMat);
        const nameLabel = new THREE.Mesh(nameGeo, nameMat);
        nameLabel.position.set(0, -1.4, 0.03);
        cardGroup.add(nameLabel);
      }

      // Create price text overlay
      const priceCanvas = document.createElement('canvas');
      priceCanvas.width = 256;
      priceCanvas.height = 80;
      const priceCtx = priceCanvas.getContext('2d');
      if (priceCtx) {
        // Price background with gradient
        const gradient = priceCtx.createLinearGradient(0, 0, priceCanvas.width, 0);
        const color = new THREE.Color(borderColor);
        gradient.addColorStop(0, `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, 0.9)`);
        gradient.addColorStop(1, `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, 0.7)`);
        priceCtx.fillStyle = gradient;
        priceCtx.fillRect(0, 0, priceCanvas.width, priceCanvas.height);

        // Price text
        priceCtx.fillStyle = '#ffffff';
        priceCtx.font = 'bold 36px Arial, sans-serif';
        priceCtx.textAlign = 'center';
        priceCtx.textBaseline = 'middle';
        priceCtx.fillText(`$${item.price.toFixed(2)}`, priceCanvas.width / 2, priceCanvas.height / 2);

        const priceTexture = new THREE.CanvasTexture(priceCanvas);
        priceTexture.needsUpdate = true;
        const priceGeo = new THREE.PlaneGeometry(1.3, 0.4);
        const priceMat = new THREE.MeshBasicMaterial({
          map: priceTexture,
          transparent: true,
          opacity: 1,
          side: THREE.DoubleSide,
        });
        geometries.push(priceGeo);
        materials.push(priceMat);
        const priceLabel = new THREE.Mesh(priceGeo, priceMat);
        priceLabel.position.set(0, 1.6, 0.03);
        cardGroup.add(priceLabel);
      }

      // Glow around card (larger and more visible)
      if (quality.enableGlows) {
        const glowGeometry = new THREE.PlaneGeometry(3.8, 4.8);
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: borderColor,
          transparent: true,
          opacity: 0.25,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
        });
        geometries.push(glowGeometry);
        materials.push(glowMaterial);
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.z = -0.05;
        cardGroup.add(glow);
      }

      const angle = (i / displayItems.length) * Math.PI * 2;
      const radius = 6;
      const height = 2 + Math.sin(i) * 0.5;

      signatureItems.push({
        card: cardGroup,
        angle,
        radius,
        height,
        rotationSpeed: 0.3 + i * 0.05,
        hoverOffset: i * 0.5,
        data: item,
      });

      scene.add(cardGroup);
    });
    }

    // === SPOTLIGHTS FOR SIGNATURE CARDS ===
    const cardSpotlights: THREE.SpotLight[] = [];
    if (quality.enableSpotlight && displayItems.length > 0) {
      signatureItems.forEach((item, i) => {
        const spotColor = itemColors[i % itemColors.length];
        const spotlight = new THREE.SpotLight(spotColor, 4);
        spotlight.angle = Math.PI / 8;
        spotlight.penumbra = 0.6;
        spotlight.decay = 2;
        spotlight.distance = 20;
        spotlight.castShadow = false; // Disable shadows for performance

        // Position above the card
        const angle = (i / displayItems.length) * Math.PI * 2;
        const radius = 6;
        spotlight.position.set(
          Math.cos(angle) * radius,
          8,
          Math.sin(angle) * radius
        );
        spotlight.target = item.card as unknown as THREE.Object3D;
        scene.add(spotlight);
        scene.add(spotlight.target);
        cardSpotlights.push(spotlight);
      });
    }

    // === GLOW AROUND PEDESTAL ===
    if (quality.enableGlows) {
      const glowGeometry = new THREE.CircleGeometry(4, 32);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: colors.gold,
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending,
      });
      geometries.push(glowGeometry);
      materials.push(glowMaterial);
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.rotation.x = -Math.PI / 2;
      glow.position.y = -1.8;
      pedestalGroup.add(glow);
    }

    // === PARTICLE SYSTEM (Golden Rain) ===
    const particleCount = quality.particleCount;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleVelocities = new Float32Array(particleCount * 3);
    const particleSizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 15;
      particlePositions[i * 3] = Math.cos(angle) * radius;
      particlePositions[i * 3 + 1] = Math.random() * 20 - 5;
      particlePositions[i * 3 + 2] = Math.sin(angle) * radius - 5;

      particleVelocities[i * 3] = (Math.random() - 0.5) * 0.02;
      particleVelocities[i * 3 + 1] = -0.02 - Math.random() * 0.03;
      particleVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;

      particleSizes[i] = Math.random() * 2 + 1;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.Float32BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute("size", new THREE.Float32BufferAttribute(particleSizes, 1));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.12,
      color: colors.goldBright,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    geometries.push(particleGeometry);
    materials.push(particleMaterial);
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // === FLOATING STARS ===
    const starCount = quality.starCount;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    const starColorPalette = [colors.gold, colors.cyan, colors.rose, colors.white];

    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 40;
      starPositions[i * 3 + 1] = Math.random() * 15;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 30 - 5;

      const color = new THREE.Color(starColorPalette[Math.floor(Math.random() * starColorPalette.length)]);
      starColors[i * 3] = color.r;
      starColors[i * 3 + 1] = color.g;
      starColors[i * 3 + 2] = color.b;
    }

    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.Float32BufferAttribute(starPositions, 3));
    starGeometry.setAttribute("color", new THREE.Float32BufferAttribute(starColors, 3));

    const starMaterial = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    geometries.push(starGeometry);
    materials.push(starMaterial);
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // === LIGHTING ===
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(10, 15, 10);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    scene.add(mainLight);

    // Spotlight on pedestal
    if (quality.enableSpotlight) {
      const spotlight = new THREE.SpotLight(colors.gold, 3);
      spotlight.position.set(0, 15, 0);
      spotlight.angle = Math.PI / 6;
      spotlight.penumbra = 0.5;
      spotlight.decay = 2;
      spotlight.distance = 30;
      spotlight.target = platform;
      spotlight.castShadow = true;
      scene.add(spotlight);
    }

    // Colored point lights
    const lights = [
      { color: colors.gold, pos: [0, 8, 0], intensity: 2 },
      { color: colors.cyan, pos: [-10, 3, 5], intensity: 1.5 },
      { color: colors.rose, pos: [10, 3, -5], intensity: 1.5 },
      { color: colors.purple, pos: [0, -2, -10], intensity: 1 },
    ];

    lights.forEach(({ color, pos, intensity }) => {
      const light = new THREE.PointLight(color, intensity, 25);
      light.position.set(pos[0], pos[1], pos[2]);
      scene.add(light);
    });

    // === MOUSE INTERACTION ===
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = mountEl.getBoundingClientRect();
      mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    mountEl.addEventListener("mousemove", handleMouseMove);

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

      // Camera orbit and mouse parallax
      const cameraX = Math.sin(t * 0.2) * 2 + mouseX * 3;
      const cameraY = 6 + Math.sin(t * 0.3) * 1 + mouseY * 2;
      const cameraZ = 20 + Math.cos(t * 0.2) * 2;
      camera.position.x += (cameraX - camera.position.x) * 0.05;
      camera.position.y += (cameraY - camera.position.y) * 0.05;
      camera.position.z += (cameraZ - camera.position.z) * 0.05;
      camera.lookAt(0, 2, 0);

      // Pedestal rotation
      pedestalGroup.rotation.y = t * 0.15;

      // Pulsing pedestal materials
      baseMaterial.emissiveIntensity = 0.2 + Math.sin(t * 1.5) * 0.15;
      pillarMaterial.emissiveIntensity = 0.2 + Math.sin(t * 1.8) * 0.15;
      platformMaterial.emissiveIntensity = 0.3 + Math.sin(t * 2) * 0.2;

      // Rotating rings
      rings.forEach((ring, i) => {
        ring.mesh.rotation.x += ring.speed * 0.01;
        ring.mesh.rotation.y += ring.speed * 0.008;
        const scale = 1 + Math.sin(t * 2 + i * 0.5) * 0.05;
        ring.mesh.scale.setScalar(scale);
        const material = ring.mesh.material as THREE.MeshBasicMaterial;
        material.opacity = 0.5 + Math.sin(t * 1.5 + i * 0.3) * 0.2;
      });

      // Signature items orbital motion (Real menu cards or placeholder shapes)
      signatureItems.forEach((item, i) => {
        const orbitSpeed = 0.15;
        const currentAngle = item.angle + t * orbitSpeed;
        const x = Math.cos(currentAngle) * item.radius;
        const z = Math.sin(currentAngle) * item.radius;
        const y = item.height + Math.sin(t * 0.8 + item.hoverOffset) * 0.3;

        item.card.position.set(x, y, z);

        // Update spotlight position to follow card
        if (cardSpotlights[i]) {
          cardSpotlights[i].position.set(x, y + 6, z);
          cardSpotlights[i].intensity = 3 + Math.sin(t * 2 + i * 0.5) * 1;
        }

        const isPlaceholder = item.card.children.length === 1;

        if (isPlaceholder) {
          // Placeholder shape animation (geometric rotation)
          const shape = item.card.children[0] as THREE.Mesh;
          if (shape) {
            shape.rotation.x += 0.01;
            shape.rotation.y += 0.015;
            shape.rotation.z += 0.008;

            // Pulsing emissive for placeholder
            if (shape.material && 'emissiveIntensity' in shape.material) {
              const mat = shape.material as THREE.MeshPhysicalMaterial;
              mat.emissiveIntensity = 0.5 + Math.sin(t * 2 + i * 0.8) * 0.3;
            }
          }
        } else {
          // Real menu card animation (billboard + gentle motion)
          item.card.lookAt(camera.position);
          item.card.rotation.z = Math.sin(t * 0.5 + i) * 0.05;

          // Animate border glow
          if (item.card.children[1]) {
            const border = item.card.children[1] as THREE.Mesh;
            if (border.material && 'opacity' in border.material) {
              const borderMat = border.material as THREE.MeshBasicMaterial;
              borderMat.opacity = 0.3 + Math.sin(t * 2 + i * 0.7) * 0.2;
            }
          }

          // Animate glow if exists (stronger pulsing)
          if (quality.enableGlows && item.card.children.length > 4) {
            const glow = item.card.children[4] as THREE.Mesh;
            if (glow && glow.material && 'opacity' in glow.material) {
              const glowMat = glow.material as THREE.MeshBasicMaterial;
              glowMat.opacity = 0.2 + Math.sin(t * 1.5 + i) * 0.15;
            }
          }
        }

        // Pulsing scale (applies to both)
        const scale = 1 + Math.sin(t * 2 + i * 0.5) * 0.05;
        item.card.scale.setScalar(scale);
      });

      // Holographic label animation
      if (labelGroup && labelGroup.children.length > 0) {
        labelGroup.rotation.y = Math.sin(t * 0.4) * 0.2;
        labelGroup.position.y = 5.5 + Math.sin(t * 0.6) * 0.3;
        labelGroup.children.forEach((child, i) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
            const material = child.material as THREE.MeshBasicMaterial;
            material.opacity = 0.6 + Math.sin(t * 2 + i * 0.4) * 0.3;
            child.rotation.y = Math.sin(t * 0.8 + i * 0.2) * 0.1;
          }
        });
      }

      // Particle system (falling golden rain)
      const positions = particleGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;

        positions[i3] += particleVelocities[i3];
        positions[i3 + 1] += particleVelocities[i3 + 1];
        positions[i3 + 2] += particleVelocities[i3 + 2];

        // Swirl effect
        const swirl = Math.sin(t + positions[i3 + 1] * 0.2) * 0.03;
        positions[i3] += swirl;
        positions[i3 + 2] += Math.cos(t + positions[i3 + 1] * 0.2) * 0.03;

        // Reset if too low
        if (positions[i3 + 1] < -10) {
          const angle = Math.random() * Math.PI * 2;
          const radius = Math.random() * 15;
          positions[i3] = Math.cos(angle) * radius;
          positions[i3 + 1] = 15;
          positions[i3 + 2] = Math.sin(angle) * radius - 5;
        }
      }
      particleGeometry.attributes.position.needsUpdate = true;

      // Particle opacity pulse
      particleMaterial.opacity = 0.6 + Math.sin(t * 0.8) * 0.2;

      // Stars twinkling
      stars.rotation.y = t * 0.05;
      starMaterial.opacity = 0.7 + Math.sin(t * 0.5) * 0.2;

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
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div className="signature-picks-scene" ref={mountRef} />;
}
