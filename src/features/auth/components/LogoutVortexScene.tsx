"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function LogoutVortexScene() {
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
    scene.fog = new THREE.FogExp2(0x050510, 0.05);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      55,
      mountEl.clientWidth / mountEl.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 10);

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];

    // Vortex group
    const vortexGroup = new THREE.Group();
    scene.add(vortexGroup);

    // Central black hole
    const blackHoleGeometry = new THREE.SphereGeometry(1.5, 32, 32);
    const blackHoleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
      },
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
          float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
          vec3 edgeColor = vec3(0.4, 0.1, 0.6) * intensity;
          vec3 coreColor = vec3(0.02, 0.01, 0.05);

          // Swirling darkness
          float swirl = sin(atan(vPosition.y, vPosition.x) * 8.0 + time * 2.0) * 0.1;
          coreColor += swirl;

          vec3 finalColor = mix(coreColor, edgeColor, intensity);
          gl_FragColor = vec4(finalColor, 0.95);
        }
      `,
      transparent: true,
    });
    geometries.push(blackHoleGeometry);
    materials.push(blackHoleMaterial);
    const blackHole = new THREE.Mesh(blackHoleGeometry, blackHoleMaterial);
    vortexGroup.add(blackHole);

    // Event horizon rings
    for (let i = 0; i < 5; i++) {
      const radius = 2 + i * 0.8;
      const ringGeometry = new THREE.TorusGeometry(radius, 0.03, 8, 100);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0x8b5cf6 : 0xec4899,
        transparent: true,
        opacity: 0.5 - i * 0.08,
        blending: THREE.AdditiveBlending,
      });
      geometries.push(ringGeometry);
      materials.push(ringMaterial);
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.userData = {
        baseRadius: radius,
        speed: 0.3 + i * 0.1,
        wobble: Math.random() * Math.PI * 2,
      };
      vortexGroup.add(ring);
    }

    // Dissolving particles (spreading outward)
    const dissolveCount = 800;
    const dissolvePositions = new Float32Array(dissolveCount * 3);
    const dissolveColors = new Float32Array(dissolveCount * 3);
    const dissolveSizes = new Float32Array(dissolveCount);
    const dissolveData: Array<{
      angle: number;
      radius: number;
      speed: number;
      z: number;
      originalRadius: number;
    }> = [];

    for (let i = 0; i < dissolveCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.5 + Math.random() * 0.5;
      const z = (Math.random() - 0.5) * 2;

      dissolvePositions[i * 3] = Math.cos(angle) * radius;
      dissolvePositions[i * 3 + 1] = Math.sin(angle) * radius;
      dissolvePositions[i * 3 + 2] = z;

      // Warm to cool gradient
      const colorChoice = Math.random();
      if (colorChoice > 0.6) {
        dissolveColors[i * 3] = 0.92; // Pink #ec4899
        dissolveColors[i * 3 + 1] = 0.28;
        dissolveColors[i * 3 + 2] = 0.6;
      } else if (colorChoice > 0.3) {
        dissolveColors[i * 3] = 0.55; // Purple #8b5cf6
        dissolveColors[i * 3 + 1] = 0.36;
        dissolveColors[i * 3 + 2] = 0.96;
      } else {
        dissolveColors[i * 3] = 0.38; // Blue #60a5fa
        dissolveColors[i * 3 + 1] = 0.65;
        dissolveColors[i * 3 + 2] = 0.98;
      }

      dissolveSizes[i] = Math.random() * 0.08 + 0.02;

      dissolveData.push({
        angle,
        radius,
        speed: 0.3 + Math.random() * 0.7,
        z,
        originalRadius: radius,
      });
    }

    const dissolveGeometry = new THREE.BufferGeometry();
    dissolveGeometry.setAttribute("position", new THREE.Float32BufferAttribute(dissolvePositions, 3));
    dissolveGeometry.setAttribute("color", new THREE.Float32BufferAttribute(dissolveColors, 3));
    dissolveGeometry.setAttribute("size", new THREE.Float32BufferAttribute(dissolveSizes, 1));
    geometries.push(dissolveGeometry);

    const dissolveMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        pixelRatio: { value: Math.min(globalThis.window.devicePixelRatio, 2) },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float time;
        uniform float pixelRatio;

        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float dist = length(position.xy);

          // Fade out as particles move away
          vAlpha = smoothstep(8.0, 2.0, dist);

          gl_PointSize = size * pixelRatio * (200.0 / -mvPosition.z) * (1.0 + sin(time + dist) * 0.3);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, dist) * vAlpha * 0.8;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    materials.push(dissolveMaterial);

    const dissolveParticles = new THREE.Points(dissolveGeometry, dissolveMaterial);
    vortexGroup.add(dissolveParticles);

    // Spiral arms being sucked in
    const spiralArmCount = 4;
    const spirals: THREE.Line[] = [];
    for (let arm = 0; arm < spiralArmCount; arm++) {
      const points: THREE.Vector3[] = [];
      const baseAngle = (arm / spiralArmCount) * Math.PI * 2;

      for (let i = 0; i <= 80; i++) {
        const t = i / 80;
        const radius = 8 - t * 6.5;
        const angle = baseAngle + t * Math.PI * 3;
        const z = t * 2 - 1;
        points.push(new THREE.Vector3(
          Math.cos(angle) * radius,
          Math.sin(angle) * radius,
          z
        ));
      }

      const spiralGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const spiralMaterial = new THREE.LineBasicMaterial({
        color: arm % 2 === 0 ? 0xec4899 : 0x8b5cf6,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
      });
      geometries.push(spiralGeometry);
      materials.push(spiralMaterial);
      const spiral = new THREE.Line(spiralGeometry, spiralMaterial);
      spiral.userData = { baseAngle };
      spirals.push(spiral);
      vortexGroup.add(spiral);
    }

    // Outer dust cloud
    const dustCount = 400;
    const dustPositions = new Float32Array(dustCount * 3);
    const dustColors = new Float32Array(dustCount * 3);

    for (let i = 0; i < dustCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 5 + Math.random() * 8;
      const z = (Math.random() - 0.5) * 6;

      dustPositions[i * 3] = Math.cos(angle) * radius;
      dustPositions[i * 3 + 1] = Math.sin(angle) * radius;
      dustPositions[i * 3 + 2] = z;

      dustColors[i * 3] = 0.3 + Math.random() * 0.2;
      dustColors[i * 3 + 1] = 0.2 + Math.random() * 0.2;
      dustColors[i * 3 + 2] = 0.4 + Math.random() * 0.3;
    }

    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute("position", new THREE.Float32BufferAttribute(dustPositions, 3));
    dustGeometry.setAttribute("color", new THREE.Float32BufferAttribute(dustColors, 3));
    const dustMaterial = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    geometries.push(dustGeometry);
    materials.push(dustMaterial);
    const dust = new THREE.Points(dustGeometry, dustMaterial);
    scene.add(dust);

    // Fading silhouette (user avatar dissolving)
    const silhouetteGroup = new THREE.Group();
    silhouetteGroup.position.set(0, 0, 2);

    // Simple humanoid shape made of particles
    const silhouetteCount = 300;
    const silhouettePositions = new Float32Array(silhouetteCount * 3);
    const silhouetteData: Array<{ originalX: number; originalY: number; originalZ: number; dissolveOffset: number }> = [];

    for (let i = 0; i < silhouetteCount; i++) {
      let x: number, y: number, z: number;

      // Create humanoid shape
      const part = Math.random();
      if (part < 0.3) {
        // Head
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * 0.3;
        x = Math.cos(angle) * r;
        y = 1.2 + Math.sin(angle) * r * 0.8;
        z = (Math.random() - 0.5) * 0.3;
      } else if (part < 0.7) {
        // Body
        x = (Math.random() - 0.5) * 0.6;
        y = Math.random() * 1 - 0.2;
        z = (Math.random() - 0.5) * 0.3;
      } else {
        // Arms/legs spread
        x = (Math.random() - 0.5) * 1.2;
        y = Math.random() * 0.8 - 0.5;
        z = (Math.random() - 0.5) * 0.3;
      }

      silhouettePositions[i * 3] = x;
      silhouettePositions[i * 3 + 1] = y;
      silhouettePositions[i * 3 + 2] = z;

      silhouetteData.push({
        originalX: x,
        originalY: y,
        originalZ: z,
        dissolveOffset: Math.random() * 2,
      });
    }

    const silhouetteGeometry = new THREE.BufferGeometry();
    silhouetteGeometry.setAttribute("position", new THREE.Float32BufferAttribute(silhouettePositions, 3));
    const silhouetteMaterial = new THREE.PointsMaterial({
      color: 0x60a5fa,
      size: 0.08,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    geometries.push(silhouetteGeometry);
    materials.push(silhouetteMaterial);
    const silhouette = new THREE.Points(silhouetteGeometry, silhouetteMaterial);
    silhouetteGroup.add(silhouette);
    scene.add(silhouetteGroup);

    // Goodbye text particles (optional decorative)
    const textRingGeometry = new THREE.TorusGeometry(4.5, 0.02, 8, 100);
    const textRingMaterial = new THREE.MeshBasicMaterial({
      color: 0x64748b,
      transparent: true,
      opacity: 0.3,
    });
    geometries.push(textRingGeometry);
    materials.push(textRingMaterial);
    const textRing = new THREE.Mesh(textRingGeometry, textRingMaterial);
    scene.add(textRing);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.1);
    const pointLight = new THREE.PointLight(0x8b5cf6, 1.5, 20);
    pointLight.position.set(0, 0, 5);
    const rimLight = new THREE.PointLight(0xec4899, 1, 15);
    rimLight.position.set(-5, 0, 0);
    scene.add(ambient, pointLight, rimLight);

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
    let dissolveProgress = 0;

    const animate = () => {
      const t = clock.getElapsedTime();
      dissolveProgress = Math.min(1, t * 0.1);

      // Update shaders
      blackHoleMaterial.uniforms.time.value = t;
      dissolveMaterial.uniforms.time.value = t;

      // Black hole pulsing
      blackHole.scale.setScalar(1 + Math.sin(t * 2) * 0.05);

      // Rotate rings
      vortexGroup.children.forEach((child) => {
        if (child.userData.speed) {
          child.rotation.z = t * child.userData.speed;
          const wobble = Math.sin(t + child.userData.wobble) * 0.1;
          child.rotation.x = wobble;
        }
      });

      // Dissolve particles moving outward
      const dPositions = dissolveGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < dissolveCount; i++) {
        const data = dissolveData[i];
        data.radius += data.speed * 0.02;
        data.angle += data.speed * 0.01;

        // Reset when too far
        if (data.radius > 10) {
          data.radius = data.originalRadius;
          data.angle = Math.random() * Math.PI * 2;
        }

        dPositions[i * 3] = Math.cos(data.angle) * data.radius;
        dPositions[i * 3 + 1] = Math.sin(data.angle) * data.radius;
        dPositions[i * 3 + 2] = data.z + Math.sin(t * data.speed) * 0.3;
      }
      dissolveGeometry.attributes.position.needsUpdate = true;

      // Spiral rotation
      spirals.forEach((spiral) => {
        spiral.rotation.z = t * 0.2;
        const mat = spiral.material as THREE.LineBasicMaterial;
        mat.opacity = 0.3 + Math.sin(t + spiral.userData.baseAngle) * 0.15;
      });

      // Dust rotation
      dust.rotation.z = t * 0.05;
      dust.rotation.x = Math.sin(t * 0.1) * 0.1;

      // Silhouette dissolve effect
      const sPositions = silhouetteGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < silhouetteCount; i++) {
        const data = silhouetteData[i];
        const dissolveAmount = Math.max(0, (dissolveProgress * 3 - data.dissolveOffset));

        // Particles spread outward and upward as they dissolve
        const spreadX = data.originalX + dissolveAmount * (data.originalX > 0 ? 2 : -2);
        const spreadY = data.originalY + dissolveAmount * 1.5;
        const spreadZ = data.originalZ + dissolveAmount * (Math.random() - 0.5);

        sPositions[i * 3] = spreadX;
        sPositions[i * 3 + 1] = spreadY;
        sPositions[i * 3 + 2] = spreadZ;
      }
      silhouetteGeometry.attributes.position.needsUpdate = true;
      silhouetteMaterial.opacity = Math.max(0, 0.7 - dissolveProgress * 0.7);

      // Text ring rotation
      textRing.rotation.z = -t * 0.1;
      textRing.rotation.x = Math.sin(t * 0.3) * 0.1;

      // Camera movement
      camera.position.x += (mouseX * 2 - camera.position.x) * 0.03;
      camera.position.y += (mouseY * 1.5 - camera.position.y) * 0.03;
      camera.lookAt(0, 0, 0);

      // Vortex tilt
      vortexGroup.rotation.y = mouseX * 0.15;
      vortexGroup.rotation.x = mouseY * 0.1;

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

  return <div className="logout-vortex-stage" ref={mountRef} />;
}
