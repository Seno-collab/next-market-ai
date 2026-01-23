"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function Error500Scene() {
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
    renderer.toneMappingExposure = 1.4;
    mountEl.appendChild(renderer.domElement);

    // Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0508, 0.04);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      65,
      mountEl.clientWidth / mountEl.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 14);

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];

    // Main explosion group
    const explosionGroup = new THREE.Group();
    scene.add(explosionGroup);

    // Central overloaded core
    const coreGeometry = new THREE.IcosahedronGeometry(1.5, 2);
    const coreMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        uniform float time;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;

          // Pulsing distortion
          vec3 pos = position;
          float pulse = sin(time * 8.0) * 0.1 + 1.0;
          float noise = sin(pos.x * 5.0 + time * 3.0) * sin(pos.y * 5.0 + time * 2.0) * 0.15;
          pos *= pulse + noise;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);

          // Overload colors - red/orange/yellow
          vec3 coreColor = vec3(1.0, 0.3, 0.1);
          vec3 edgeColor = vec3(1.0, 0.8, 0.2);
          vec3 hotColor = vec3(1.0, 1.0, 0.9);

          // Flickering
          float flicker = sin(time * 20.0) * 0.2 + 0.8;
          float pulse = sin(time * 5.0) * 0.3 + 0.7;

          vec3 color = mix(coreColor, edgeColor, intensity);
          color = mix(color, hotColor, pow(intensity, 3.0) * pulse);
          color *= flicker;

          gl_FragColor = vec4(color, 0.95);
        }
      `,
      transparent: true,
    });
    geometries.push(coreGeometry);
    materials.push(coreMaterial);
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    explosionGroup.add(core);

    // Energy discharge rings
    const ringCount = 6;
    for (let i = 0; i < ringCount; i++) {
      const ringGeometry = new THREE.TorusGeometry(2 + i * 0.8, 0.04, 8, 64);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0xff6b35 : 0xffd93d,
        transparent: true,
        opacity: 0.6 - i * 0.08,
        blending: THREE.AdditiveBlending,
      });
      geometries.push(ringGeometry);
      materials.push(ringMaterial);
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.5;
      ring.rotation.y = (Math.random() - 0.5) * 0.5;
      ring.userData = {
        expandSpeed: 0.5 + i * 0.2,
        rotationSpeed: (Math.random() - 0.5) * 2,
        baseRadius: 2 + i * 0.8,
        phase: i * 0.5,
      };
      explosionGroup.add(ring);
    }

    // Explosion shockwave
    const shockwaveGeometry = new THREE.RingGeometry(0.1, 0.5, 64);
    const shockwaveMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
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
        varying vec2 vUv;

        void main() {
          float wave = mod(time * 0.5, 1.0);
          float dist = abs(vUv.x - wave);
          float intensity = smoothstep(0.15, 0.0, dist);

          vec3 color = mix(vec3(1.0, 0.4, 0.1), vec3(1.0, 0.9, 0.3), intensity);
          float alpha = intensity * 0.8 * (1.0 - wave);

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    geometries.push(shockwaveGeometry);
    materials.push(shockwaveMaterial);
    const shockwave = new THREE.Mesh(shockwaveGeometry, shockwaveMaterial);
    shockwave.scale.setScalar(15);
    explosionGroup.add(shockwave);

    // Flying debris/sparks
    const debrisCount = 800;
    const debrisPositions = new Float32Array(debrisCount * 3);
    const debrisColors = new Float32Array(debrisCount * 3);
    const debrisSizes = new Float32Array(debrisCount);
    const debrisData: Array<{
      velocity: THREE.Vector3;
      life: number;
      maxLife: number;
    }> = [];

    for (let i = 0; i < debrisCount; i++) {
      // Start near center
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = Math.random() * 1.5;

      debrisPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      debrisPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      debrisPositions[i * 3 + 2] = r * Math.cos(phi);

      // Hot colors
      const heat = Math.random();
      if (heat > 0.7) {
        debrisColors[i * 3] = 1.0;
        debrisColors[i * 3 + 1] = 0.95;
        debrisColors[i * 3 + 2] = 0.8;
      } else if (heat > 0.4) {
        debrisColors[i * 3] = 1.0;
        debrisColors[i * 3 + 1] = 0.6;
        debrisColors[i * 3 + 2] = 0.2;
      } else {
        debrisColors[i * 3] = 1.0;
        debrisColors[i * 3 + 1] = 0.3;
        debrisColors[i * 3 + 2] = 0.1;
      }

      debrisSizes[i] = 0.03 + Math.random() * 0.08;

      // Outward velocity
      const speed = 0.05 + Math.random() * 0.15;
      debrisData.push({
        velocity: new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta) * speed,
          Math.sin(phi) * Math.sin(theta) * speed,
          Math.cos(phi) * speed
        ),
        life: Math.random() * 100,
        maxLife: 50 + Math.random() * 100,
      });
    }

    const debrisGeometry = new THREE.BufferGeometry();
    debrisGeometry.setAttribute("position", new THREE.Float32BufferAttribute(debrisPositions, 3));
    debrisGeometry.setAttribute("color", new THREE.Float32BufferAttribute(debrisColors, 3));
    debrisGeometry.setAttribute("size", new THREE.Float32BufferAttribute(debrisSizes, 1));
    geometries.push(debrisGeometry);

    const debrisMaterial = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    materials.push(debrisMaterial);
    const debris = new THREE.Points(debrisGeometry, debrisMaterial);
    scene.add(debris);

    // Warning symbols floating
    const warningGroup = new THREE.Group();
    const warningCount = 12;
    for (let i = 0; i < warningCount; i++) {
      const triGeometry = new THREE.BufferGeometry();
      const size = 0.3 + Math.random() * 0.3;
      const vertices = new Float32Array([
        0, size, 0,
        -size * 0.866, -size * 0.5, 0,
        size * 0.866, -size * 0.5, 0,
      ]);
      triGeometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
      const triMaterial = new THREE.MeshBasicMaterial({
        color: 0xffd93d,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        wireframe: true,
      });
      geometries.push(triGeometry);
      materials.push(triMaterial);

      const triangle = new THREE.Mesh(triGeometry, triMaterial);
      const angle = (i / warningCount) * Math.PI * 2;
      const radius = 5 + Math.random() * 3;
      triangle.position.set(
        Math.cos(angle) * radius,
        (Math.random() - 0.5) * 4,
        Math.sin(angle) * radius
      );
      triangle.userData = {
        angle,
        radius,
        rotSpeed: (Math.random() - 0.5) * 3,
        floatPhase: Math.random() * Math.PI * 2,
      };
      warningGroup.add(triangle);
    }
    scene.add(warningGroup);

    // Electric arcs
    const arcCount = 8;
    const arcs: THREE.Line[] = [];
    for (let i = 0; i < arcCount; i++) {
      const points: THREE.Vector3[] = [];
      for (let j = 0; j <= 20; j++) {
        points.push(new THREE.Vector3(0, 0, 0));
      }
      const arcGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const arcMaterial = new THREE.LineBasicMaterial({
        color: 0xffff88,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
      });
      geometries.push(arcGeometry);
      materials.push(arcMaterial);
      const arc = new THREE.Line(arcGeometry, arcMaterial);
      arc.userData = { nextArc: Math.random() * 0.5 };
      arcs.push(arc);
      explosionGroup.add(arc);
    }

    // Server rack debris (broken boxes)
    const rackCount = 15;
    const racks: THREE.Mesh[] = [];
    for (let i = 0; i < rackCount; i++) {
      const w = 0.3 + Math.random() * 0.4;
      const h = 0.5 + Math.random() * 0.8;
      const d = 0.2 + Math.random() * 0.3;
      const rackGeometry = new THREE.BoxGeometry(w, h, d);
      const rackMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x1a1a2e,
        emissive: new THREE.Color(0xff4444),
        emissiveIntensity: 0.3,
        metalness: 0.9,
        roughness: 0.3,
        transparent: true,
        opacity: 0.85,
      });
      geometries.push(rackGeometry);
      materials.push(rackMaterial);

      const rack = new THREE.Mesh(rackGeometry, rackMaterial);
      const angle = (i / rackCount) * Math.PI * 2;
      const radius = 4 + Math.random() * 4;
      rack.position.set(
        Math.cos(angle) * radius,
        (Math.random() - 0.5) * 5,
        Math.sin(angle) * radius - 3
      );
      rack.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      rack.userData = {
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.5
        ),
        floatPhase: Math.random() * Math.PI * 2,
        floatSpeed: 0.5 + Math.random(),
      };
      racks.push(rack);
      scene.add(rack);
    }

    // Smoke/steam particles
    const smokeCount = 200;
    const smokePositions = new Float32Array(smokeCount * 3);
    const smokeData: Array<{ velocity: THREE.Vector3; life: number }> = [];

    for (let i = 0; i < smokeCount; i++) {
      smokePositions[i * 3] = (Math.random() - 0.5) * 2;
      smokePositions[i * 3 + 1] = (Math.random() - 0.5) * 2;
      smokePositions[i * 3 + 2] = (Math.random() - 0.5) * 2;

      smokeData.push({
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          0.02 + Math.random() * 0.03,
          (Math.random() - 0.5) * 0.02
        ),
        life: Math.random() * 100,
      });
    }

    const smokeGeometry = new THREE.BufferGeometry();
    smokeGeometry.setAttribute("position", new THREE.Float32BufferAttribute(smokePositions, 3));
    geometries.push(smokeGeometry);

    const smokeMaterial = new THREE.PointsMaterial({
      size: 0.4,
      color: 0x444444,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    });
    materials.push(smokeMaterial);
    const smoke = new THREE.Points(smokeGeometry, smokeMaterial);
    scene.add(smoke);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.1);
    const coreLight = new THREE.PointLight(0xff6600, 3, 15);
    coreLight.position.set(0, 0, 0);
    const flashLight = new THREE.PointLight(0xffff00, 0, 20);
    flashLight.position.set(0, 0, 2);
    const rimLight = new THREE.PointLight(0xff3300, 1, 25);
    rimLight.position.set(5, -3, 5);
    scene.add(ambient, coreLight, flashLight, rimLight);

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

      // Update shaders
      coreMaterial.uniforms.time.value = t;
      shockwaveMaterial.uniforms.time.value = t;

      // Core pulsing
      const coreScale = 1 + Math.sin(t * 5) * 0.1 + Math.sin(t * 13) * 0.05;
      core.scale.setScalar(coreScale);
      core.rotation.y = t * 0.5;
      core.rotation.x = t * 0.3;

      // Core light intensity
      coreLight.intensity = 2 + Math.sin(t * 8) * 1;

      // Flash light (random flashes)
      if (Math.random() > 0.95) {
        flashLight.intensity = 3 + Math.random() * 2;
      } else {
        flashLight.intensity *= 0.9;
      }

      // Animate energy rings
      explosionGroup.children.forEach((child) => {
        if (child.userData.expandSpeed) {
          const d = child.userData;
          const scale = 1 + Math.sin(t * d.expandSpeed + d.phase) * 0.3;
          child.scale.setScalar(scale);
          child.rotation.z += d.rotationSpeed * 0.01;

          const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
          if (mat.opacity !== undefined) {
            mat.opacity = 0.4 + Math.sin(t * 2 + d.phase) * 0.2;
          }
        }
      });

      // Animate debris explosion
      const debrisPos = debrisGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < debrisCount; i++) {
        const data = debrisData[i];
        data.life++;

        debrisPos[i * 3] += data.velocity.x;
        debrisPos[i * 3 + 1] += data.velocity.y;
        debrisPos[i * 3 + 2] += data.velocity.z;

        // Slow down over time
        data.velocity.multiplyScalar(0.995);

        // Reset when life expires
        if (data.life > data.maxLife) {
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.random() * Math.PI;
          const r = Math.random() * 1;

          debrisPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
          debrisPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
          debrisPos[i * 3 + 2] = r * Math.cos(phi);

          const speed = 0.05 + Math.random() * 0.15;
          data.velocity.set(
            Math.sin(phi) * Math.cos(theta) * speed,
            Math.sin(phi) * Math.sin(theta) * speed,
            Math.cos(phi) * speed
          );
          data.life = 0;
        }
      }
      debrisGeometry.attributes.position.needsUpdate = true;

      // Animate warning triangles
      warningGroup.children.forEach((tri) => {
        const d = tri.userData;
        tri.rotation.z += d.rotSpeed * 0.01;
        tri.rotation.y = t * 0.5;
        tri.position.y += Math.sin(t * d.floatSpeed + d.floatPhase) * 0.01;

        const mat = (tri as THREE.Mesh).material as THREE.MeshBasicMaterial;
        mat.opacity = 0.5 + Math.sin(t * 3 + d.floatPhase) * 0.3;
      });
      warningGroup.rotation.y = t * 0.1;

      // Animate electric arcs
      arcs.forEach((arc) => {
        const mat = arc.material as THREE.LineBasicMaterial;
        if (t > arc.userData.nextArc) {
          mat.opacity = 0.8;
          arc.userData.nextArc = t + 0.1 + Math.random() * 0.4;

          // Generate new arc path
          const positions = arc.geometry.attributes.position.array as Float32Array;
          const startAngle = Math.random() * Math.PI * 2;
          const endAngle = startAngle + (Math.random() - 0.5) * Math.PI;

          for (let j = 0; j <= 20; j++) {
            const t2 = j / 20;
            const angle = startAngle + (endAngle - startAngle) * t2;
            const radius = 1.5 + t2 * 3 + (Math.random() - 0.5) * 0.5;
            positions[j * 3] = Math.cos(angle) * radius;
            positions[j * 3 + 1] = (Math.random() - 0.5) * 0.5;
            positions[j * 3 + 2] = Math.sin(angle) * radius;
          }
          arc.geometry.attributes.position.needsUpdate = true;
        } else {
          mat.opacity *= 0.85;
        }
      });

      // Animate server racks
      racks.forEach((rack) => {
        const d = rack.userData;
        rack.rotation.x += d.rotSpeed.x * 0.01;
        rack.rotation.y += d.rotSpeed.y * 0.01;
        rack.rotation.z += d.rotSpeed.z * 0.01;
        rack.position.y += Math.sin(t * d.floatSpeed + d.floatPhase) * 0.005;
      });

      // Animate smoke
      const smokePos = smokeGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < smokeCount; i++) {
        const data = smokeData[i];
        smokePos[i * 3] += data.velocity.x;
        smokePos[i * 3 + 1] += data.velocity.y;
        smokePos[i * 3 + 2] += data.velocity.z;

        data.life++;
        if (data.life > 150 || smokePos[i * 3 + 1] > 8) {
          smokePos[i * 3] = (Math.random() - 0.5) * 3;
          smokePos[i * 3 + 1] = -1;
          smokePos[i * 3 + 2] = (Math.random() - 0.5) * 3;
          data.life = 0;
        }
      }
      smokeGeometry.attributes.position.needsUpdate = true;

      // Camera shake effect
      const shake = Math.sin(t * 30) * 0.02;
      camera.position.x = mouseX * 2 + shake;
      camera.position.y = mouseY * 1.5 + shake;
      camera.lookAt(0, 0, 0);

      // Group movement
      explosionGroup.rotation.y = mouseX * 0.1 + t * 0.1;
      explosionGroup.rotation.x = mouseY * 0.05;

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
