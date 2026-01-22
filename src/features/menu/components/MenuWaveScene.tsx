"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function MenuWaveScene() {
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
    mountEl.appendChild(renderer.domElement);

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(
      60,
      mountEl.clientWidth / mountEl.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 8, 15);
    camera.lookAt(0, 0, 0);

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];

    // Wave mesh - represents data flow
    const waveWidth = 30;
    const waveDepth = 20;
    const waveSegmentsX = 60;
    const waveSegmentsZ = 40;
    const waveGeometry = new THREE.PlaneGeometry(waveWidth, waveDepth, waveSegmentsX, waveSegmentsZ);
    const waveMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        colorA: { value: new THREE.Color(0x0ea5e9) },
        colorB: { value: new THREE.Color(0x8b5cf6) },
        colorC: { value: new THREE.Color(0x22d3ee) },
      },
      vertexShader: `
        uniform float time;
        varying vec2 vUv;
        varying float vElevation;

        void main() {
          vUv = uv;

          vec3 pos = position;

          // Multiple wave layers
          float wave1 = sin(pos.x * 0.5 + time * 1.5) * 0.8;
          float wave2 = sin(pos.y * 0.3 + time * 1.2) * 0.6;
          float wave3 = sin(pos.x * 0.8 + pos.y * 0.5 + time * 2.0) * 0.4;
          float wave4 = cos(pos.x * 0.3 - pos.y * 0.4 + time * 0.8) * 0.5;

          pos.z = wave1 + wave2 + wave3 + wave4;
          vElevation = pos.z;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 colorA;
        uniform vec3 colorB;
        uniform vec3 colorC;
        varying vec2 vUv;
        varying float vElevation;

        void main() {
          // Color based on elevation
          float normalizedElevation = (vElevation + 2.0) / 4.0;
          vec3 color = mix(colorA, colorB, normalizedElevation);
          color = mix(color, colorC, smoothstep(0.5, 1.0, normalizedElevation));

          // Grid pattern overlay
          float gridX = smoothstep(0.48, 0.5, fract(vUv.x * 30.0));
          float gridY = smoothstep(0.48, 0.5, fract(vUv.y * 20.0));
          float grid = max(gridX, gridY) * 0.15;

          color += vec3(grid);

          // Edge fade
          float edgeFade = smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x);
          edgeFade *= smoothstep(0.0, 0.1, vUv.y) * smoothstep(1.0, 0.9, vUv.y);

          gl_FragColor = vec4(color, 0.7 * edgeFade);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    geometries.push(waveGeometry);
    materials.push(waveMaterial);
    const wave = new THREE.Mesh(waveGeometry, waveMaterial);
    wave.rotation.x = -Math.PI / 2.5;
    wave.position.y = -3;
    scene.add(wave);

    // Floating data cubes representing menu items
    const cubeCount = 25;
    const cubes: THREE.Mesh[] = [];
    const cubeData: Array<{
      baseY: number;
      speed: number;
      rotationSpeed: { x: number; y: number; z: number };
      floatOffset: number;
    }> = [];

    const cubeGeometry = new THREE.BoxGeometry(0.6, 0.6, 0.6);
    geometries.push(cubeGeometry);

    for (let i = 0; i < cubeCount; i++) {
      const cubeMaterial = new THREE.MeshPhysicalMaterial({
        color: i % 3 === 0 ? 0x22d3ee : i % 3 === 1 ? 0x8b5cf6 : 0x0ea5e9,
        metalness: 0.3,
        roughness: 0.2,
        transparent: true,
        opacity: 0.8,
        emissive: new THREE.Color(i % 3 === 0 ? 0x22d3ee : i % 3 === 1 ? 0x8b5cf6 : 0x0ea5e9),
        emissiveIntensity: 0.2,
      });
      materials.push(cubeMaterial);

      const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
      cube.position.set(
        (Math.random() - 0.5) * 20,
        Math.random() * 6 + 2,
        (Math.random() - 0.5) * 12
      );
      cube.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      cubeData.push({
        baseY: cube.position.y,
        speed: 0.5 + Math.random() * 1,
        rotationSpeed: {
          x: (Math.random() - 0.5) * 0.02,
          y: (Math.random() - 0.5) * 0.02,
          z: (Math.random() - 0.5) * 0.02,
        },
        floatOffset: Math.random() * Math.PI * 2,
      });

      cubes.push(cube);
      scene.add(cube);
    }

    // Connection lines between cubes
    const lineGroup = new THREE.Group();
    for (let i = 0; i < 15; i++) {
      const idx1 = Math.floor(Math.random() * cubeCount);
      const idx2 = Math.floor(Math.random() * cubeCount);
      if (idx1 === idx2) continue;

      const lineGeometry = new THREE.BufferGeometry();
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.2,
      });
      geometries.push(lineGeometry);
      materials.push(lineMaterial);

      const line = new THREE.Line(lineGeometry, lineMaterial);
      line.userData = { idx1, idx2 };
      lineGroup.add(line);
    }
    scene.add(lineGroup);

    // Particle field
    const particleCount = 300;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 30;
      particlePositions[i * 3 + 1] = Math.random() * 15 - 2;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 20;

      const colorChoice = Math.random();
      if (colorChoice > 0.6) {
        particleColors[i * 3] = 0.13;
        particleColors[i * 3 + 1] = 0.83;
        particleColors[i * 3 + 2] = 0.93;
      } else if (colorChoice > 0.3) {
        particleColors[i * 3] = 0.55;
        particleColors[i * 3 + 1] = 0.36;
        particleColors[i * 3 + 2] = 0.96;
      } else {
        particleColors[i * 3] = 0.06;
        particleColors[i * 3 + 1] = 0.65;
        particleColors[i * 3 + 2] = 0.91;
      }
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.Float32BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute("color", new THREE.Float32BufferAttribute(particleColors, 3));
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.08,
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

    // Rising data streams
    const streamCount = 8;
    const streams: THREE.Points[] = [];
    for (let s = 0; s < streamCount; s++) {
      const streamParticleCount = 30;
      const streamPositions = new Float32Array(streamParticleCount * 3);
      const baseX = (Math.random() - 0.5) * 20;
      const baseZ = (Math.random() - 0.5) * 12;

      for (let i = 0; i < streamParticleCount; i++) {
        streamPositions[i * 3] = baseX + (Math.random() - 0.5) * 0.5;
        streamPositions[i * 3 + 1] = i * 0.4 - 3;
        streamPositions[i * 3 + 2] = baseZ + (Math.random() - 0.5) * 0.5;
      }

      const streamGeometry = new THREE.BufferGeometry();
      streamGeometry.setAttribute("position", new THREE.Float32BufferAttribute(streamPositions, 3));
      const streamMaterial = new THREE.PointsMaterial({
        color: s % 2 === 0 ? 0x22d3ee : 0x8b5cf6,
        size: 0.12,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      geometries.push(streamGeometry);
      materials.push(streamMaterial);

      const stream = new THREE.Points(streamGeometry, streamMaterial);
      stream.userData = { baseX, baseZ, speed: 0.02 + Math.random() * 0.03 };
      streams.push(stream);
      scene.add(stream);
    }

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.3);
    const pointLight1 = new THREE.PointLight(0x22d3ee, 1.5, 30);
    pointLight1.position.set(5, 10, 5);
    const pointLight2 = new THREE.PointLight(0x8b5cf6, 1, 25);
    pointLight2.position.set(-5, 8, -5);
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

      // Update wave
      waveMaterial.uniforms.time.value = t;

      // Animate cubes
      cubes.forEach((cube, i) => {
        const data = cubeData[i];
        cube.position.y = data.baseY + Math.sin(t * data.speed + data.floatOffset) * 0.5;
        cube.rotation.x += data.rotationSpeed.x;
        cube.rotation.y += data.rotationSpeed.y;
        cube.rotation.z += data.rotationSpeed.z;
      });

      // Update connection lines
      lineGroup.children.forEach((line) => {
        if (line instanceof THREE.Line) {
          const { idx1, idx2 } = line.userData;
          const positions = new Float32Array([
            cubes[idx1].position.x, cubes[idx1].position.y, cubes[idx1].position.z,
            cubes[idx2].position.x, cubes[idx2].position.y, cubes[idx2].position.z,
          ]);
          line.geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
          line.geometry.attributes.position.needsUpdate = true;
        }
      });

      // Animate data streams
      streams.forEach((stream) => {
        const positions = stream.geometry.attributes.position.array as Float32Array;
        const count = positions.length / 3;
        for (let i = 0; i < count; i++) {
          positions[i * 3 + 1] += stream.userData.speed;
          if (positions[i * 3 + 1] > 12) {
            positions[i * 3 + 1] = -3;
          }
        }
        stream.geometry.attributes.position.needsUpdate = true;
      });

      // Particles drift
      particles.rotation.y = t * 0.02;

      // Camera follows mouse
      camera.position.x += (mouseX * 3 - camera.position.x) * 0.02;
      camera.position.y += (8 + mouseY * 2 - camera.position.y) * 0.02;
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

  return <div className="menu-wave-stage" ref={mountRef} />;
}
