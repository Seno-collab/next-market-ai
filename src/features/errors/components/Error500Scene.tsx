"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function Error500Scene() {
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
    scene.fog = new THREE.FogExp2(0x080412, 0.025);

    const camera = new THREE.PerspectiveCamera(
      60,
      mountEl.clientWidth / mountEl.clientHeight,
      0.1,
      1000,
    );
    camera.position.set(0, 0, 16);

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];

    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // Central glitching torus knot with holographic shader
    const coreGeometry = new THREE.TorusKnotGeometry(2, 0.6, 200, 32, 2, 3);
    const coreMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        glitchIntensity: { value: 0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;
        uniform float time;
        uniform float glitchIntensity;

        // Simplex-style noise
        float hash(vec3 p) {
          p = fract(p * 0.3183099 + 0.1);
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;

          vec3 pos = position;

          // Smooth organic distortion
          float wave1 = sin(pos.y * 2.0 + time * 1.5) * 0.08;
          float wave2 = cos(pos.x * 3.0 + time * 1.2) * 0.05;
          pos += normal * (wave1 + wave2);

          // Glitch displacement (periodic)
          float glitch = step(0.97, sin(time * 2.0 + pos.y * 10.0)) * glitchIntensity;
          pos.x += glitch * (hash(pos + time) - 0.5) * 0.8;
          pos.z += glitch * (hash(pos + time + 100.0) - 0.5) * 0.3;

          vWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float glitchIntensity;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;

        void main() {
          float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.0);

          // Color palette: warm amber to crimson
          vec3 baseColor = vec3(0.95, 0.25, 0.15);
          vec3 rimColor = vec3(1.0, 0.55, 0.1);
          vec3 hotColor = vec3(1.0, 0.85, 0.4);

          // Animated gradient
          float gradient = sin(vPosition.y * 2.0 + time * 0.8) * 0.5 + 0.5;
          vec3 color = mix(baseColor, rimColor, gradient);
          color = mix(color, hotColor, fresnel * 0.7);

          // Scanline effect
          float scanline = sin(vWorldPosition.y * 40.0 + time * 5.0) * 0.5 + 0.5;
          scanline = smoothstep(0.3, 0.7, scanline);
          color *= 0.85 + scanline * 0.15;

          // Rim glow
          float rim = pow(fresnel, 1.5);
          color += rimColor * rim * 0.6;

          // Subtle pulse
          float pulse = sin(time * 3.0) * 0.08 + 0.92;
          color *= pulse;

          float alpha = 0.88 + fresnel * 0.12;

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    });
    geometries.push(coreGeometry);
    materials.push(coreMaterial);
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    mainGroup.add(core);

    // Inner glow sphere
    const glowGeometry = new THREE.SphereGeometry(2.8, 32, 32);
    const glowMaterial = new THREE.ShaderMaterial({
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
          float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.5);
          vec3 color = mix(vec3(0.9, 0.15, 0.05), vec3(1.0, 0.5, 0.1), intensity);
          float pulse = sin(time * 2.0) * 0.15 + 0.85;
          gl_FragColor = vec4(color * pulse, intensity * 0.35);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.BackSide,
    });
    geometries.push(glowGeometry);
    materials.push(glowMaterial);
    mainGroup.add(new THREE.Mesh(glowGeometry, glowMaterial));

    // Orbiting glass rings
    const ringCount = 4;
    const rings: THREE.Mesh[] = [];
    for (let i = 0; i < ringCount; i++) {
      const radius = 3.5 + i * 1.2;
      const ringGeometry = new THREE.TorusGeometry(radius, 0.02, 8, 128);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.06 - i * 0.015, 0.9, 0.6),
        transparent: true,
        opacity: 0.5 - i * 0.08,
        blending: THREE.AdditiveBlending,
      });
      geometries.push(ringGeometry);
      materials.push(ringMaterial);
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI / 2 + i * 0.25;
      ring.rotation.y = i * 0.4;
      ring.userData = { speed: 0.3 + i * 0.15, tilt: i * 0.25 };
      rings.push(ring);
      mainGroup.add(ring);
    }

    // Floating particles - smooth spiral flow
    const particleCount = 600;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    const particleData: Array<{
      angle: number;
      radius: number;
      y: number;
      speed: number;
      ySpeed: number;
    }> = [];

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 2 + Math.random() * 8;
      const y = (Math.random() - 0.5) * 12;

      particlePositions[i * 3] = Math.cos(angle) * radius;
      particlePositions[i * 3 + 1] = y;
      particlePositions[i * 3 + 2] = Math.sin(angle) * radius;

      const t = Math.random();
      if (t > 0.7) {
        // Warm white
        particleColors[i * 3] = 1.0;
        particleColors[i * 3 + 1] = 0.9;
        particleColors[i * 3 + 2] = 0.7;
      } else if (t > 0.3) {
        // Amber
        particleColors[i * 3] = 1.0;
        particleColors[i * 3 + 1] = 0.5;
        particleColors[i * 3 + 2] = 0.15;
      } else {
        // Crimson
        particleColors[i * 3] = 1.0;
        particleColors[i * 3 + 1] = 0.2;
        particleColors[i * 3 + 2] = 0.1;
      }

      particleData.push({
        angle,
        radius,
        y,
        speed: 0.1 + Math.random() * 0.3,
        ySpeed: (Math.random() - 0.5) * 0.3,
      });
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(particlePositions, 3),
    );
    particleGeometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(particleColors, 3),
    );
    geometries.push(particleGeometry);

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    materials.push(particleMaterial);
    scene.add(new THREE.Points(particleGeometry, particleMaterial));

    // Floating hexagon wireframes
    const hexGroup = new THREE.Group();
    const hexCount = 8;
    for (let i = 0; i < hexCount; i++) {
      const size = 0.4 + Math.random() * 0.6;
      const shape = new THREE.Shape();
      for (let j = 0; j < 6; j++) {
        const a = (j / 6) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(a) * size;
        const y = Math.sin(a) * size;
        if (j === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      }
      shape.closePath();
      const hexGeometry = new THREE.ShapeGeometry(shape);
      const hexMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.05, 0.8, 0.55),
        transparent: true,
        opacity: 0.3 + Math.random() * 0.2,
        wireframe: true,
        side: THREE.DoubleSide,
      });
      geometries.push(hexGeometry);
      materials.push(hexMaterial);

      const hex = new THREE.Mesh(hexGeometry, hexMaterial);
      const angle = (i / hexCount) * Math.PI * 2;
      const r = 5 + Math.random() * 4;
      hex.position.set(
        Math.cos(angle) * r,
        (Math.random() - 0.5) * 6,
        Math.sin(angle) * r - 2,
      );
      hex.userData = {
        rotSpeed: (Math.random() - 0.5) * 1.5,
        floatPhase: Math.random() * Math.PI * 2,
        orbitSpeed: 0.05 + Math.random() * 0.1,
        orbitAngle: angle,
        orbitRadius: r,
      };
      hexGroup.add(hex);
    }
    scene.add(hexGroup);

    // Ambient lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.15));
    const centerLight = new THREE.PointLight(0xff5500, 2.5, 20);
    centerLight.position.set(0, 0, 0);
    scene.add(centerLight);
    const fillLight = new THREE.PointLight(0xff8844, 1, 30);
    fillLight.position.set(5, 3, 8);
    scene.add(fillLight);

    // Mouse parallax
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
    let lastTime = 0;
    let glitchTimer = 0;
    let currentGlitch = 0;

    const animate = () => {
      const t = clock.getElapsedTime();
      const dt = t - lastTime;
      lastTime = t;

      // Periodic glitch bursts
      glitchTimer -= dt;
      if (glitchTimer <= 0) {
        currentGlitch = Math.random() > 0.6 ? 1.0 : 0.0;
        glitchTimer =
          currentGlitch > 0
            ? 0.08 + Math.random() * 0.12
            : 1 + Math.random() * 3;
      }
      const glitchTarget = currentGlitch;
      const currentVal = coreMaterial.uniforms.glitchIntensity.value;
      coreMaterial.uniforms.glitchIntensity.value +=
        (glitchTarget - currentVal) * 0.15;

      // Update shaders
      coreMaterial.uniforms.time.value = t;
      glowMaterial.uniforms.time.value = t;

      // Core rotation
      core.rotation.x = t * 0.15;
      core.rotation.y = t * 0.25;
      core.rotation.z = t * 0.1;
      const coreScale = 1 + Math.sin(t * 2) * 0.03;
      core.scale.setScalar(coreScale);

      // Center light pulse
      centerLight.intensity = 2 + Math.sin(t * 3) * 0.5;

      // Animate rings
      rings.forEach((ring, i) => {
        const d = ring.userData;
        ring.rotation.x = d.tilt + Math.sin(t * 0.5 + i) * 0.1;
        ring.rotation.z += d.speed * 0.003;
        const mat = ring.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.4 - i * 0.07 + Math.sin(t * 1.5 + i * 1.2) * 0.1;
      });

      // Animate particles (spiral flow)
      const positions = particleGeometry.attributes.position
        .array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        const data = particleData[i];
        data.angle += data.speed * 0.008;
        data.y += data.ySpeed * 0.01;

        // Reset Y when out of bounds
        if (data.y > 6) data.y = -6;
        if (data.y < -6) data.y = 6;

        positions[i * 3] = Math.cos(data.angle) * data.radius;
        positions[i * 3 + 1] = data.y + Math.sin(t * 0.5 + data.angle) * 0.3;
        positions[i * 3 + 2] = Math.sin(data.angle) * data.radius;
      }
      particleGeometry.attributes.position.needsUpdate = true;

      // Animate hexagons
      hexGroup.children.forEach((hex) => {
        const d = hex.userData;
        hex.rotation.z += d.rotSpeed * 0.003;
        hex.rotation.y = t * 0.2;
        d.orbitAngle += d.orbitSpeed * 0.003;
        hex.position.x = Math.cos(d.orbitAngle) * d.orbitRadius;
        hex.position.z = Math.sin(d.orbitAngle) * d.orbitRadius - 2;
        hex.position.y += Math.sin(t * 0.8 + d.floatPhase) * 0.003;
        const mat = (hex as THREE.Mesh).material as THREE.MeshBasicMaterial;
        mat.opacity = 0.25 + Math.sin(t * 1.5 + d.floatPhase) * 0.1;
      });

      // Smooth camera parallax
      camera.position.x += (mouseX * 1.5 - camera.position.x) * 0.03;
      camera.position.y += (mouseY * 1.0 - camera.position.y) * 0.03;
      camera.lookAt(0, 0, 0);

      mainGroup.rotation.y += 0.001;

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

  return <div className="error-3d-stage" ref={mountRef} />;
}
