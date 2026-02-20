"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function LoginPortalScene() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl) return undefined;

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

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060d1a, 0.04);

    const camera = new THREE.PerspectiveCamera(
      55,
      mountEl.clientWidth / mountEl.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1, 14);

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];

    const GOLD = 0xf0b90b;
    const CYAN = 0x00bcd4;
    const GREEN = 0x00c853;
    const RED = 0xff5252;

    // === Trading chart grid (background) ===
    const gridGroup = new THREE.Group();
    // Horizontal lines
    for (let i = -5; i <= 5; i++) {
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-12, i * 1.2, -6),
        new THREE.Vector3(12, i * 1.2, -6),
      ]);
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x1a2a4a,
        transparent: true,
        opacity: 0.4,
      });
      geometries.push(lineGeometry);
      materials.push(lineMaterial);
      gridGroup.add(new THREE.Line(lineGeometry, lineMaterial));
    }
    // Vertical lines
    for (let i = -8; i <= 8; i++) {
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(i * 1.5, -6, -6),
        new THREE.Vector3(i * 1.5, 6, -6),
      ]);
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x1a2a4a,
        transparent: true,
        opacity: 0.3,
      });
      geometries.push(lineGeometry);
      materials.push(lineMaterial);
      gridGroup.add(new THREE.Line(lineGeometry, lineMaterial));
    }
    scene.add(gridGroup);

    // === 3D Candlestick chart ===
    const candleGroup = new THREE.Group();
    const candleCount = 16;
    const candleData: Array<{
      mesh: THREE.Group;
      baseY: number;
      targetHeight: number;
      isGreen: boolean;
      phase: number;
    }> = [];

    for (let i = 0; i < candleCount; i++) {
      const candle = new THREE.Group();
      const isGreen = Math.random() > 0.4;
      const bodyHeight = 0.3 + Math.random() * 1.2;
      const wickHeight = bodyHeight + 0.2 + Math.random() * 0.5;
      const color = isGreen ? GREEN : RED;

      // Candle body
      const bodyGeometry = new THREE.BoxGeometry(0.35, bodyHeight, 0.35);
      const bodyMaterial = new THREE.MeshPhysicalMaterial({
        color,
        emissive: new THREE.Color(color),
        emissiveIntensity: 0.3,
        metalness: 0.5,
        roughness: 0.3,
        transparent: true,
        opacity: 0.85,
      });
      geometries.push(bodyGeometry);
      materials.push(bodyMaterial);
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      body.position.y = bodyHeight / 2;
      candle.add(body);

      // Wick (thin line)
      const wickGeometry = new THREE.BoxGeometry(0.04, wickHeight, 0.04);
      const wickMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.6,
      });
      geometries.push(wickGeometry);
      materials.push(wickMaterial);
      const wick = new THREE.Mesh(wickGeometry, wickMaterial);
      wick.position.y = wickHeight / 2;
      candle.add(wick);

      const xPos = (i - candleCount / 2) * 0.8;
      const baseY = -3 + Math.sin(i * 0.5) * 1.5 + Math.cos(i * 0.3) * 0.8;
      candle.position.set(xPos, baseY, -2);

      candleData.push({
        mesh: candle,
        baseY,
        targetHeight: bodyHeight,
        isGreen,
        phase: i * 0.3,
      });
      candleGroup.add(candle);
    }
    scene.add(candleGroup);

    // === Price line (flowing curve) ===
    const linePointCount = 80;
    const linePositions = new Float32Array(linePointCount * 3);
    const priceLineGeometry = new THREE.BufferGeometry();

    // Generate initial price path
    const generatePricePath = (time: number) => {
      for (let i = 0; i < linePointCount; i++) {
        const x = (i / linePointCount) * 16 - 8;
        const y =
          Math.sin(i * 0.15 + time * 0.8) * 1.5 +
          Math.cos(i * 0.08 + time * 0.5) * 1.0 +
          Math.sin(i * 0.3 + time * 1.2) * 0.5;
        linePositions[i * 3] = x;
        linePositions[i * 3 + 1] = y;
        linePositions[i * 3 + 2] = 0;
      }
    };
    generatePricePath(0);
    priceLineGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(linePositions, 3)
    );
    geometries.push(priceLineGeometry);

    const priceLineMaterial = new THREE.LineBasicMaterial({
      color: GOLD,
      transparent: true,
      opacity: 0.9,
    });
    materials.push(priceLineMaterial);
    const priceLine = new THREE.Line(priceLineGeometry, priceLineMaterial);
    scene.add(priceLine);

    // Price line glow (thicker, dimmer duplicate)
    const glowLineMaterial = new THREE.LineBasicMaterial({
      color: GOLD,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
    });
    materials.push(glowLineMaterial);
    const glowLine = new THREE.Line(priceLineGeometry, glowLineMaterial);
    glowLine.scale.set(1, 1.02, 1);
    scene.add(glowLine);

    // === Central diamond (value symbol) ===
    const diamondGeometry = new THREE.OctahedronGeometry(1.2, 0);
    const diamondMaterial = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.5);

          // Gold to cyan gradient
          vec3 goldColor = vec3(0.94, 0.73, 0.04);
          vec3 cyanColor = vec3(0.0, 0.74, 0.83);
          vec3 whiteColor = vec3(1.0, 0.98, 0.9);

          float gradient = sin(vPosition.y * 2.0 + time * 1.0) * 0.5 + 0.5;
          vec3 color = mix(goldColor, cyanColor, gradient * 0.6);
          color = mix(color, whiteColor, fresnel * 0.5);

          // Facet highlight
          float facet = abs(dot(vNormal, vec3(0.5, 0.8, 0.3)));
          color += goldColor * pow(facet, 4.0) * 0.4;

          float pulse = sin(time * 2.0) * 0.06 + 0.94;
          color *= pulse;

          float alpha = 0.7 + fresnel * 0.3;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    });
    geometries.push(diamondGeometry);
    materials.push(diamondMaterial);
    const diamond = new THREE.Mesh(diamondGeometry, diamondMaterial);
    diamond.position.set(5, 2, 2);
    scene.add(diamond);

    // Diamond glow
    const diamondGlowGeometry = new THREE.SphereGeometry(1.8, 16, 16);
    const diamondGlowMaterial = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.5);
          vec3 color = mix(vec3(0.94, 0.73, 0.04), vec3(0.0, 0.74, 0.83), intensity);
          float pulse = sin(time * 1.5) * 0.1 + 0.9;
          gl_FragColor = vec4(color * pulse, intensity * 0.2);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.BackSide,
    });
    geometries.push(diamondGlowGeometry);
    materials.push(diamondGlowMaterial);
    const diamondGlow = new THREE.Mesh(diamondGlowGeometry, diamondGlowMaterial);
    diamondGlow.position.copy(diamond.position);
    scene.add(diamondGlow);

    // === Floating data particles ===
    const particleCount = 200;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    const particleVelocities: Array<{ x: number; y: number }> = [];

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 20;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 12;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 8 - 2;

      const colorChoice = Math.random();
      if (colorChoice > 0.6) {
        // Gold
        particleColors[i * 3] = 0.94;
        particleColors[i * 3 + 1] = 0.73;
        particleColors[i * 3 + 2] = 0.04;
      } else if (colorChoice > 0.3) {
        // Cyan
        particleColors[i * 3] = 0.0;
        particleColors[i * 3 + 1] = 0.74;
        particleColors[i * 3 + 2] = 0.83;
      } else {
        // White
        particleColors[i * 3] = 0.8;
        particleColors[i * 3 + 1] = 0.85;
        particleColors[i * 3 + 2] = 0.9;
      }

      particleVelocities.push({
        x: (Math.random() - 0.5) * 0.01,
        y: 0.005 + Math.random() * 0.015,
      });
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.Float32BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute("color", new THREE.Float32BufferAttribute(particleColors, 3));
    geometries.push(particleGeometry);

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    materials.push(particleMaterial);
    scene.add(new THREE.Points(particleGeometry, particleMaterial));

    // === Orbiting rings ===
    const ringCount = 3;
    const rings: THREE.Mesh[] = [];
    for (let i = 0; i < ringCount; i++) {
      const ringGeometry = new THREE.TorusGeometry(2 + i * 0.8, 0.015, 8, 100);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: i === 0 ? GOLD : CYAN,
        transparent: true,
        opacity: 0.35 - i * 0.08,
        blending: THREE.AdditiveBlending,
      });
      geometries.push(ringGeometry);
      materials.push(ringMaterial);
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.position.copy(diamond.position);
      ring.rotation.x = Math.PI / 2 + i * 0.3;
      ring.rotation.y = i * 0.5;
      rings.push(ring);
      scene.add(ring);
    }

    // === Small floating chart arrows (up/down indicators) ===
    const arrowCount = 6;
    for (let i = 0; i < arrowCount; i++) {
      const isUp = Math.random() > 0.4;
      const arrowShape = new THREE.Shape();
      const s = 0.15 + Math.random() * 0.15;
      arrowShape.moveTo(0, s);
      arrowShape.lineTo(-s * 0.7, -s * 0.3);
      arrowShape.lineTo(-s * 0.25, -s * 0.3);
      arrowShape.lineTo(-s * 0.25, -s);
      arrowShape.lineTo(s * 0.25, -s);
      arrowShape.lineTo(s * 0.25, -s * 0.3);
      arrowShape.lineTo(s * 0.7, -s * 0.3);
      arrowShape.closePath();

      const arrowGeometry = new THREE.ShapeGeometry(arrowShape);
      const arrowMaterial = new THREE.MeshBasicMaterial({
        color: isUp ? GREEN : RED,
        transparent: true,
        opacity: 0.5 + Math.random() * 0.3,
        side: THREE.DoubleSide,
      });
      geometries.push(arrowGeometry);
      materials.push(arrowMaterial);
      const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);

      arrow.position.set(
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 8,
        -1 - Math.random() * 3
      );
      if (!isUp) arrow.rotation.z = Math.PI;
      arrow.userData = {
        floatPhase: Math.random() * Math.PI * 2,
        floatSpeed: 0.5 + Math.random() * 1,
      };
      scene.add(arrow);
    }

    // Lighting
    scene.add(new THREE.AmbientLight(0x2a3a5a, 0.4));
    const goldLight = new THREE.PointLight(GOLD, 2, 20);
    goldLight.position.set(5, 3, 5);
    scene.add(goldLight);
    const cyanLight = new THREE.PointLight(CYAN, 1.2, 18);
    cyanLight.position.set(-4, -2, 4);
    scene.add(cyanLight);
    const topLight = new THREE.PointLight(0xffffff, 0.5, 25);
    topLight.position.set(0, 8, 3);
    scene.add(topLight);

    // Mouse interaction
    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (event: MouseEvent) => {
      const rect = mountEl.getBoundingClientRect();
      mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };
    mountEl.addEventListener("mousemove", handleMouseMove);

    const handleResize = () => {
      const { clientWidth, clientHeight } = mountEl;
      renderer.setSize(clientWidth, clientHeight);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
    };
    globalThis.window.addEventListener("resize", handleResize);

    const clock = new THREE.Clock();
    let frameId = 0;

    const animate = () => {
      const t = clock.getElapsedTime();

      // Update shaders
      diamondMaterial.uniforms.time.value = t;
      diamondGlowMaterial.uniforms.time.value = t;

      // Animate price line
      generatePricePath(t);
      priceLineGeometry.attributes.position.needsUpdate = true;

      // Animate candlesticks (subtle breathing)
      candleData.forEach((cd) => {
        const scale = 0.9 + Math.sin(t * 1.5 + cd.phase) * 0.1;
        cd.mesh.scale.y = scale;
        cd.mesh.position.y = cd.baseY + Math.sin(t * 0.8 + cd.phase) * 0.15;
      });

      // Diamond rotation & float
      diamond.rotation.y = t * 0.4;
      diamond.rotation.x = Math.sin(t * 0.3) * 0.15;
      diamond.position.y = 2 + Math.sin(t * 0.8) * 0.3;
      diamondGlow.position.y = diamond.position.y;

      // Diamond rings orbit
      rings.forEach((ring, i) => {
        ring.rotation.z = t * (0.2 + i * 0.1);
        ring.rotation.x = Math.PI / 2 + i * 0.3 + Math.sin(t * 0.3) * 0.1;
        ring.position.y = diamond.position.y;
      });

      // Particles rising
      const positions = particleGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        const vel = particleVelocities[i];
        positions[i * 3] += vel.x;
        positions[i * 3 + 1] += vel.y;

        // Reset when out of view
        if (positions[i * 3 + 1] > 7) {
          positions[i * 3] = (Math.random() - 0.5) * 20;
          positions[i * 3 + 1] = -6;
        }
      }
      particleGeometry.attributes.position.needsUpdate = true;

      // Floating arrows
      scene.children.forEach((child) => {
        if (child.userData.floatPhase !== undefined) {
          child.position.y +=
            Math.sin(t * child.userData.floatSpeed + child.userData.floatPhase) * 0.003;
        }
      });

      // Grid subtle pulse
      gridGroup.children.forEach((line, i) => {
        const mat = (line as THREE.Line).material as THREE.LineBasicMaterial;
        mat.opacity = 0.2 + Math.sin(t * 0.5 + i * 0.2) * 0.1;
      });

      // Gold light pulse
      goldLight.intensity = 1.5 + Math.sin(t * 2) * 0.5;

      // Smooth camera parallax
      camera.position.x += (mouseX * 1.5 - camera.position.x) * 0.03;
      camera.position.y += (1 + mouseY * 0.8 - camera.position.y) * 0.03;
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

  return <div className="login-portal-stage" ref={mountRef} />;
}
