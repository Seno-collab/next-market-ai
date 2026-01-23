"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function Error404Scene() {
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
    scene.fog = new THREE.FogExp2(0x0a0810, 0.06);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      60,
      mountEl.clientWidth / mountEl.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 12);

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];

    // Main group
    const voidGroup = new THREE.Group();
    scene.add(voidGroup);

    // Broken portal ring (fragmented torus)
    const fragmentCount = 24;
    const fragments: THREE.Mesh[] = [];
    for (let i = 0; i < fragmentCount; i++) {
      const angle = (i / fragmentCount) * Math.PI * 2;
      const arcLength = (Math.PI * 2) / fragmentCount * 0.7;

      const fragmentGeometry = new THREE.TorusGeometry(4, 0.12, 8, 12, arcLength);
      const fragmentMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xdd0031,
        emissive: new THREE.Color(0xdd0031),
        emissiveIntensity: 0.5,
        metalness: 0.8,
        roughness: 0.2,
        transparent: true,
        opacity: 0.9,
      });
      geometries.push(fragmentGeometry);
      materials.push(fragmentMaterial);

      const fragment = new THREE.Mesh(fragmentGeometry, fragmentMaterial);
      fragment.rotation.z = angle;
      fragment.userData = {
        baseAngle: angle,
        offsetX: (Math.random() - 0.5) * 0.8,
        offsetY: (Math.random() - 0.5) * 0.8,
        offsetZ: (Math.random() - 0.5) * 1.5,
        rotationSpeed: (Math.random() - 0.5) * 0.5,
        floatPhase: Math.random() * Math.PI * 2,
      };
      fragments.push(fragment);
      voidGroup.add(fragment);
    }

    // Glitch cubes floating in void
    const cubeCount = 40;
    const cubes: THREE.Mesh[] = [];
    for (let i = 0; i < cubeCount; i++) {
      const size = 0.1 + Math.random() * 0.4;
      const cubeGeometry = new THREE.BoxGeometry(size, size, size);
      const cubeMaterial = new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? 0xff5a5f : i % 3 === 1 ? 0xdd0031 : 0x6366f1,
        transparent: true,
        opacity: 0.6 + Math.random() * 0.3,
        wireframe: Math.random() > 0.5,
      });
      geometries.push(cubeGeometry);
      materials.push(cubeMaterial);

      const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
      const radius = 3 + Math.random() * 6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;

      cube.position.set(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi) - 2
      );
      cube.userData = {
        originalPos: cube.position.clone(),
        rotationSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        ),
        glitchPhase: Math.random() * Math.PI * 2,
        floatSpeed: 0.5 + Math.random() * 1,
      };
      cubes.push(cube);
      scene.add(cube);
    }

    // Central void shader
    const voidGeometry = new THREE.PlaneGeometry(8, 8, 64, 64);
    const voidMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color1: { value: new THREE.Color(0x050508) },
        color2: { value: new THREE.Color(0xdd0031) },
        color3: { value: new THREE.Color(0x6366f1) },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        uniform float time;

        void main() {
          vUv = uv;
          vPosition = position;

          // Glitch displacement
          vec3 pos = position;
          float glitch = sin(pos.x * 10.0 + time * 5.0) * cos(pos.y * 8.0 + time * 3.0);
          pos.z += glitch * 0.15 * sin(time * 2.0);

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color1;
        uniform vec3 color2;
        uniform vec3 color3;
        varying vec2 vUv;
        varying vec3 vPosition;

        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
        }

        void main() {
          vec2 center = vUv - 0.5;
          float dist = length(center);
          float angle = atan(center.y, center.x);

          // Void spiral
          float spiral = sin(angle * 6.0 - dist * 15.0 + time * 2.0) * 0.5 + 0.5;

          // Glitch lines
          float glitchLine = step(0.98, sin(vUv.y * 100.0 + time * 20.0));
          float glitchBlock = step(0.95, random(floor(vUv * 20.0) + floor(time * 10.0)));

          // Digital noise
          float noise = random(vUv + time * 0.1) * 0.15;

          // Color mixing
          vec3 color = mix(color1, color2, spiral * (1.0 - dist * 1.5));
          color = mix(color, color3, glitchLine * 0.8);
          color += vec3(glitchBlock * 0.3, 0.0, glitchBlock * 0.2);
          color += noise * vec3(0.5, 0.1, 0.2);

          // Void center
          float voidCenter = smoothstep(0.4, 0.0, dist);
          color = mix(color, color1, voidCenter * 0.8);

          // Edge glow
          float edgeGlow = smoothstep(0.5, 0.35, dist) * (1.0 - smoothstep(0.35, 0.2, dist));
          color += vec3(0.8, 0.1, 0.15) * edgeGlow * 0.6;

          float alpha = smoothstep(0.5, 0.3, dist);
          alpha *= 0.85;

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    geometries.push(voidGeometry);
    materials.push(voidMaterial);
    const voidPlane = new THREE.Mesh(voidGeometry, voidMaterial);
    voidPlane.position.z = -1;
    voidGroup.add(voidPlane);

    // Glitch scanlines
    const scanlineCount = 8;
    for (let i = 0; i < scanlineCount; i++) {
      const lineGeometry = new THREE.PlaneGeometry(12, 0.03);
      const lineMaterial = new THREE.MeshBasicMaterial({
        color: 0xff5a5f,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
      });
      geometries.push(lineGeometry);
      materials.push(lineMaterial);
      const line = new THREE.Mesh(lineGeometry, lineMaterial);
      line.position.set(0, (Math.random() - 0.5) * 8, 0.5);
      line.userData = { nextGlitch: Math.random() * 2, speed: 10 + Math.random() * 20 };
      voidGroup.add(line);
    }

    // Broken data particles
    const dataCount = 600;
    const dataPositions = new Float32Array(dataCount * 3);
    const dataColors = new Float32Array(dataCount * 3);
    const dataSizes = new Float32Array(dataCount);
    const dataVelocities: THREE.Vector3[] = [];

    for (let i = 0; i < dataCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 2 + Math.random() * 6;
      const z = (Math.random() - 0.5) * 8;

      dataPositions[i * 3] = Math.cos(angle) * radius;
      dataPositions[i * 3 + 1] = Math.sin(angle) * radius;
      dataPositions[i * 3 + 2] = z;

      const colorChoice = Math.random();
      if (colorChoice > 0.6) {
        dataColors[i * 3] = 0.87;
        dataColors[i * 3 + 1] = 0.0;
        dataColors[i * 3 + 2] = 0.19;
      } else if (colorChoice > 0.3) {
        dataColors[i * 3] = 1.0;
        dataColors[i * 3 + 1] = 0.35;
        dataColors[i * 3 + 2] = 0.37;
      } else {
        dataColors[i * 3] = 0.39;
        dataColors[i * 3 + 1] = 0.4;
        dataColors[i * 3 + 2] = 0.95;
      }

      dataSizes[i] = 0.02 + Math.random() * 0.06;
      dataVelocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02
      ));
    }

    const dataGeometry = new THREE.BufferGeometry();
    dataGeometry.setAttribute("position", new THREE.Float32BufferAttribute(dataPositions, 3));
    dataGeometry.setAttribute("color", new THREE.Float32BufferAttribute(dataColors, 3));
    dataGeometry.setAttribute("size", new THREE.Float32BufferAttribute(dataSizes, 1));
    geometries.push(dataGeometry);

    const dataMaterial = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    materials.push(dataMaterial);
    const dataParticles = new THREE.Points(dataGeometry, dataMaterial);
    scene.add(dataParticles);

    // Error text floating "404" as wireframe boxes
    const textGroup = new THREE.Group();
    const digitPositions = [
      // 4
      [[-1.8, 0.4], [-1.8, 0], [-1.8, -0.4], [-1.4, -0.4], [-1.4, 0], [-1.4, 0.4], [-1.4, -0.8]],
      // 0
      [[-0.6, 0.4], [-0.6, 0], [-0.6, -0.4], [-0.2, 0.4], [-0.2, -0.4], [0.2, 0.4], [0.2, 0], [0.2, -0.4]],
      // 4
      [[0.8, 0.4], [0.8, 0], [0.8, -0.4], [1.2, -0.4], [1.2, 0], [1.2, 0.4], [1.2, -0.8]],
    ];

    digitPositions.forEach((digit) => {
      digit.forEach(([x, y]) => {
        const blockGeometry = new THREE.BoxGeometry(0.25, 0.3, 0.15);
        const blockMaterial = new THREE.MeshBasicMaterial({
          color: 0xdd0031,
          transparent: true,
          opacity: 0.8,
          wireframe: true,
        });
        geometries.push(blockGeometry);
        materials.push(blockMaterial);
        const block = new THREE.Mesh(blockGeometry, blockMaterial);
        block.position.set(x, y + 2, 2);
        block.userData = {
          baseY: y + 2,
          phase: Math.random() * Math.PI * 2,
          glitchOffset: Math.random() * 0.3,
        };
        textGroup.add(block);
      });
    });
    scene.add(textGroup);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.15);
    const pointLight1 = new THREE.PointLight(0xdd0031, 2, 20);
    pointLight1.position.set(0, 0, 5);
    const pointLight2 = new THREE.PointLight(0x6366f1, 1.5, 15);
    pointLight2.position.set(-4, 2, 3);
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

      // Update void shader
      voidMaterial.uniforms.time.value = t;

      // Animate broken ring fragments
      fragments.forEach((fragment) => {
        const d = fragment.userData;
        const glitchX = Math.sin(t * 2 + d.floatPhase) * d.offsetX;
        const glitchY = Math.cos(t * 1.5 + d.floatPhase) * d.offsetY;
        const glitchZ = Math.sin(t * 0.8 + d.floatPhase) * d.offsetZ;

        fragment.position.set(glitchX, glitchY, glitchZ);
        fragment.rotation.z = d.baseAngle + t * d.rotationSpeed;
        fragment.rotation.x = Math.sin(t + d.floatPhase) * 0.1;
      });

      // Animate floating cubes with glitch effect
      cubes.forEach((cube) => {
        const d = cube.userData;
        cube.rotation.x += d.rotationSpeed.x * 0.01;
        cube.rotation.y += d.rotationSpeed.y * 0.01;
        cube.rotation.z += d.rotationSpeed.z * 0.01;

        // Glitch teleport occasionally
        if (Math.random() > 0.995) {
          cube.position.x = d.originalPos.x + (Math.random() - 0.5) * 2;
          cube.position.y = d.originalPos.y + (Math.random() - 0.5) * 2;
        } else {
          cube.position.y = d.originalPos.y + Math.sin(t * d.floatSpeed + d.glitchPhase) * 0.3;
        }
      });

      // Animate glitch scanlines
      voidGroup.children.forEach((child) => {
        if (child.userData.nextGlitch !== undefined) {
          const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
          if (t > child.userData.nextGlitch) {
            mat.opacity = 0.6 + Math.random() * 0.4;
            child.position.y = (Math.random() - 0.5) * 6;
            child.userData.nextGlitch = t + 0.05 + Math.random() * 0.3;
          } else {
            mat.opacity *= 0.85;
          }
        }
      });

      // Data particles chaotic movement
      const positions = dataGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < dataCount; i++) {
        positions[i * 3] += dataVelocities[i].x;
        positions[i * 3 + 1] += dataVelocities[i].y;
        positions[i * 3 + 2] += dataVelocities[i].z;

        // Random velocity changes (glitch effect)
        if (Math.random() > 0.99) {
          dataVelocities[i].set(
            (Math.random() - 0.5) * 0.04,
            (Math.random() - 0.5) * 0.04,
            (Math.random() - 0.5) * 0.04
          );
        }

        // Reset if too far
        const dist = Math.sqrt(
          positions[i * 3] ** 2 +
          positions[i * 3 + 1] ** 2 +
          positions[i * 3 + 2] ** 2
        );
        if (dist > 10) {
          const angle = Math.random() * Math.PI * 2;
          const radius = 2 + Math.random() * 3;
          positions[i * 3] = Math.cos(angle) * radius;
          positions[i * 3 + 1] = Math.sin(angle) * radius;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 4;
        }
      }
      dataGeometry.attributes.position.needsUpdate = true;

      // Animate 404 text blocks
      textGroup.children.forEach((block) => {
        const d = block.userData;
        block.position.y = d.baseY + Math.sin(t * 2 + d.phase) * 0.1;

        // Occasional glitch offset
        if (Math.random() > 0.98) {
          block.position.x += (Math.random() - 0.5) * d.glitchOffset;
        }
      });
      textGroup.rotation.y = Math.sin(t * 0.5) * 0.1;

      // Camera movement
      camera.position.x += (mouseX * 2 - camera.position.x) * 0.03;
      camera.position.y += (mouseY * 1.5 - camera.position.y) * 0.03;
      camera.lookAt(0, 0, 0);

      // Group rotation
      voidGroup.rotation.y = mouseX * 0.15 + t * 0.05;
      voidGroup.rotation.x = mouseY * 0.1;

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
