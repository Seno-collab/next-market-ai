"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function LoginPortalScene() {
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
    renderer.toneMappingExposure = 1.3;
    mountEl.appendChild(renderer.domElement);

    // Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050816, 0.08);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      60,
      mountEl.clientWidth / mountEl.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 8);

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];

    // Portal group
    const portalGroup = new THREE.Group();
    scene.add(portalGroup);

    // Main portal ring
    const portalGeometry = new THREE.TorusGeometry(3, 0.15, 32, 100);
    const portalMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x22d3ee,
      emissive: new THREE.Color(0x22d3ee),
      emissiveIntensity: 0.8,
      metalness: 0.9,
      roughness: 0.1,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
    });
    geometries.push(portalGeometry);
    materials.push(portalMaterial);
    const portalRing = new THREE.Mesh(portalGeometry, portalMaterial);
    portalGroup.add(portalRing);

    // Inner portal rings
    for (let i = 1; i <= 4; i++) {
      const innerRingGeometry = new THREE.TorusGeometry(3 - i * 0.5, 0.05, 16, 80);
      const innerRingMaterial = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0x60a5fa : 0xa78bfa,
        transparent: true,
        opacity: 0.6 - i * 0.1,
        blending: THREE.AdditiveBlending,
      });
      geometries.push(innerRingGeometry);
      materials.push(innerRingMaterial);
      const innerRing = new THREE.Mesh(innerRingGeometry, innerRingMaterial);
      innerRing.userData = { speed: 0.5 + i * 0.2, direction: i % 2 === 0 ? 1 : -1 };
      portalGroup.add(innerRing);
    }

    // Portal center vortex
    const vortexGeometry = new THREE.CircleGeometry(2.5, 64);
    const vortexMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color1: { value: new THREE.Color(0x0a0f1a) },
        color2: { value: new THREE.Color(0x22d3ee) },
        color3: { value: new THREE.Color(0xa78bfa) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color1;
        uniform vec3 color2;
        uniform vec3 color3;
        varying vec2 vUv;

        void main() {
          vec2 center = vUv - 0.5;
          float dist = length(center);
          float angle = atan(center.y, center.x);

          // Spiral pattern
          float spiral = sin(angle * 8.0 - dist * 20.0 + time * 3.0) * 0.5 + 0.5;

          // Radial pulse
          float pulse = sin(dist * 15.0 - time * 4.0) * 0.5 + 0.5;

          // Color mixing
          vec3 color = mix(color1, color2, spiral * pulse);
          color = mix(color, color3, sin(angle * 4.0 + time * 2.0) * 0.3 + 0.3);

          // Center glow
          float glow = 1.0 - smoothstep(0.0, 0.5, dist);
          color += vec3(0.2, 0.6, 0.8) * glow * 0.5;

          // Edge fade
          float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
          alpha *= 0.9;

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    geometries.push(vortexGeometry);
    materials.push(vortexMaterial);
    const vortex = new THREE.Mesh(vortexGeometry, vortexMaterial);
    vortex.position.z = -0.1;
    portalGroup.add(vortex);

    // Energy streams flowing into portal
    const streamCount = 12;
    const streams: THREE.Line[] = [];
    for (let i = 0; i < streamCount; i++) {
      const angle = (i / streamCount) * Math.PI * 2;
      const points: THREE.Vector3[] = [];
      for (let j = 0; j <= 50; j++) {
        const t = j / 50;
        const radius = 6 - t * 3;
        const spiralAngle = angle + t * Math.PI * 2;
        const x = Math.cos(spiralAngle) * radius;
        const y = Math.sin(spiralAngle) * radius;
        const z = t * 2 - 1;
        points.push(new THREE.Vector3(x, y, z));
      }
      const streamGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const streamMaterial = new THREE.LineBasicMaterial({
        color: i % 3 === 0 ? 0x22d3ee : i % 3 === 1 ? 0x60a5fa : 0xa78bfa,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
      });
      geometries.push(streamGeometry);
      materials.push(streamMaterial);
      const stream = new THREE.Line(streamGeometry, streamMaterial);
      stream.userData = { phase: i * 0.5, baseAngle: angle };
      streams.push(stream);
      portalGroup.add(stream);
    }

    // Floating particles around portal
    const particleCount = 500;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    const particleData: Array<{ angle: number; radius: number; speed: number; yOffset: number }> = [];

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 3 + Math.random() * 5;
      const y = (Math.random() - 0.5) * 6;

      particlePositions[i * 3] = Math.cos(angle) * radius;
      particlePositions[i * 3 + 1] = y;
      particlePositions[i * 3 + 2] = Math.sin(angle) * radius - 2;

      const colorChoice = Math.random();
      if (colorChoice > 0.6) {
        particleColors[i * 3] = 0.13;
        particleColors[i * 3 + 1] = 0.83;
        particleColors[i * 3 + 2] = 0.93;
      } else if (colorChoice > 0.3) {
        particleColors[i * 3] = 0.38;
        particleColors[i * 3 + 1] = 0.65;
        particleColors[i * 3 + 2] = 0.98;
      } else {
        particleColors[i * 3] = 0.65;
        particleColors[i * 3 + 1] = 0.55;
        particleColors[i * 3 + 2] = 0.98;
      }

      particleData.push({
        angle,
        radius,
        speed: 0.2 + Math.random() * 0.5,
        yOffset: y,
      });
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.Float32BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute("color", new THREE.Float32BufferAttribute(particleColors, 3));
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    geometries.push(particleGeometry);
    materials.push(particleMaterial);
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // Hexagonal grid background
    const hexGroup = new THREE.Group();
    const hexSize = 0.8;
    const hexRows = 12;
    const hexCols = 16;
    for (let row = 0; row < hexRows; row++) {
      for (let col = 0; col < hexCols; col++) {
        const hexGeometry = new THREE.CircleGeometry(hexSize * 0.4, 6);
        const hexMaterial = new THREE.MeshBasicMaterial({
          color: 0x1e3a5f,
          transparent: true,
          opacity: 0.1 + Math.random() * 0.1,
          wireframe: true,
        });
        geometries.push(hexGeometry);
        materials.push(hexMaterial);
        const hex = new THREE.Mesh(hexGeometry, hexMaterial);
        const xOffset = row % 2 === 0 ? 0 : hexSize * 0.75;
        hex.position.set(
          col * hexSize * 1.5 - (hexCols * hexSize * 1.5) / 2 + xOffset,
          row * hexSize * 0.87 - (hexRows * hexSize * 0.87) / 2,
          -8
        );
        hex.userData = { pulsePhase: Math.random() * Math.PI * 2 };
        hexGroup.add(hex);
      }
    }
    scene.add(hexGroup);

    // Outer glow ring
    const glowRingGeometry = new THREE.TorusGeometry(3.5, 0.5, 16, 100);
    const glowRingMaterial = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
    });
    geometries.push(glowRingGeometry);
    materials.push(glowRingMaterial);
    const glowRing = new THREE.Mesh(glowRingGeometry, glowRingMaterial);
    glowRing.position.z = -0.2;
    portalGroup.add(glowRing);

    // Lightning/energy bolts
    const boltCount = 6;
    const bolts: THREE.Line[] = [];
    for (let i = 0; i < boltCount; i++) {
      const boltPoints: THREE.Vector3[] = [];
      const startAngle = (i / boltCount) * Math.PI * 2;
      const startRadius = 3.2;

      for (let j = 0; j <= 20; j++) {
        const t = j / 20;
        const jitter = (Math.random() - 0.5) * 0.3;
        const radius = startRadius - t * 2.5 + jitter;
        const angle = startAngle + t * 0.5;
        boltPoints.push(new THREE.Vector3(
          Math.cos(angle) * radius,
          Math.sin(angle) * radius,
          jitter * 0.5
        ));
      }

      const boltGeometry = new THREE.BufferGeometry().setFromPoints(boltPoints);
      const boltMaterial = new THREE.LineBasicMaterial({
        color: 0x7dd3fc,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
      });
      geometries.push(boltGeometry);
      materials.push(boltMaterial);
      const bolt = new THREE.Line(boltGeometry, boltMaterial);
      bolt.userData = { nextFlash: Math.random() * 2 };
      bolts.push(bolt);
      portalGroup.add(bolt);
    }

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.2);
    const pointLight1 = new THREE.PointLight(0x22d3ee, 2, 20);
    pointLight1.position.set(0, 0, 5);
    const pointLight2 = new THREE.PointLight(0xa78bfa, 1, 15);
    pointLight2.position.set(3, 3, 3);
    scene.add(ambient, pointLight1, pointLight2);

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

      // Update vortex shader
      vortexMaterial.uniforms.time.value = t;

      // Rotate portal elements
      portalRing.rotation.z = t * 0.3;
      portalGroup.children.forEach((child) => {
        if (child.userData.speed) {
          child.rotation.z = t * child.userData.speed * child.userData.direction;
        }
      });

      // Pulse glow ring
      glowRingMaterial.opacity = 0.1 + Math.sin(t * 2) * 0.08;
      glowRing.scale.setScalar(1 + Math.sin(t * 1.5) * 0.05);

      // Animate energy streams
      streams.forEach((stream) => {
        const mat = stream.material as THREE.LineBasicMaterial;
        mat.opacity = 0.3 + Math.sin(t * 2 + stream.userData.phase) * 0.2;
        stream.rotation.z = stream.userData.baseAngle + t * 0.2;
      });

      // Particle animation - spiral towards center
      const positions = particleGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        const data = particleData[i];
        data.angle += data.speed * 0.02;
        data.radius -= 0.01;

        if (data.radius < 0.5) {
          data.radius = 3 + Math.random() * 5;
          data.angle = Math.random() * Math.PI * 2;
        }

        positions[i * 3] = Math.cos(data.angle) * data.radius;
        positions[i * 3 + 1] = data.yOffset + Math.sin(t * data.speed + data.angle) * 0.5;
        positions[i * 3 + 2] = Math.sin(data.angle) * data.radius - 2;
      }
      particleGeometry.attributes.position.needsUpdate = true;

      // Hex grid pulse
      hexGroup.children.forEach((hex) => {
        if (hex instanceof THREE.Mesh) {
          const mat = hex.material as THREE.MeshBasicMaterial;
          mat.opacity = 0.05 + Math.sin(t * 0.5 + hex.userData.pulsePhase) * 0.05;
        }
      });

      // Lightning flashes
      bolts.forEach((bolt) => {
        const mat = bolt.material as THREE.LineBasicMaterial;
        if (t > bolt.userData.nextFlash) {
          mat.opacity = 0.8;
          bolt.userData.nextFlash = t + 1 + Math.random() * 3;
        } else {
          mat.opacity *= 0.9;
        }
      });

      // Portal material pulse
      portalMaterial.emissiveIntensity = 0.6 + Math.sin(t * 2) * 0.3;

      // Mouse-based camera movement
      camera.position.x += (mouseX * 1.5 - camera.position.x) * 0.05;
      camera.position.y += (mouseY * 1 - camera.position.y) * 0.05;
      camera.lookAt(0, 0, 0);

      // Portal tilt based on mouse
      portalGroup.rotation.y = mouseX * 0.2;
      portalGroup.rotation.x = mouseY * 0.1;

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
