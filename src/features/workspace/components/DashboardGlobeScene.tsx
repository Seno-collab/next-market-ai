"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type DataPoint = {
  lat: number;
  lng: number;
  value: number;
  label: string;
};

const DATA_POINTS: DataPoint[] = [
  { lat: 40.7128, lng: -74.006, value: 85, label: "New York" },
  { lat: 51.5074, lng: -0.1278, value: 72, label: "London" },
  { lat: 35.6762, lng: 139.6503, value: 91, label: "Tokyo" },
  { lat: 22.3193, lng: 114.1694, value: 68, label: "Hong Kong" },
  { lat: 1.3521, lng: 103.8198, value: 76, label: "Singapore" },
  { lat: -33.8688, lng: 151.2093, value: 54, label: "Sydney" },
  { lat: 48.8566, lng: 2.3522, value: 63, label: "Paris" },
  { lat: 55.7558, lng: 37.6173, value: 45, label: "Moscow" },
  { lat: 19.4326, lng: -99.1332, value: 58, label: "Mexico City" },
  { lat: -23.5505, lng: -46.6333, value: 67, label: "Sao Paulo" },
  { lat: 25.2048, lng: 55.2708, value: 82, label: "Dubai" },
  { lat: 37.5665, lng: 126.978, value: 79, label: "Seoul" },
];

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

export default function DashboardGlobeScene() {
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
    renderer.toneMappingExposure = 1.2;
    mountEl.appendChild(renderer.domElement);

    // Scene setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0f1a, 0.015);

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      55,
      mountEl.clientWidth / mountEl.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 5);

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];

    // Globe group
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // Globe sphere - wireframe style
    const globeRadius = 1.5;
    const globeGeometry = new THREE.IcosahedronGeometry(globeRadius, 5);
    const globeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0a1628,
      metalness: 0.3,
      roughness: 0.4,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    geometries.push(globeGeometry);
    materials.push(globeMaterial);
    const globe = new THREE.Mesh(globeGeometry, globeMaterial);
    globeGroup.add(globe);

    // Globe wireframe overlay
    const wireframeGeometry = new THREE.IcosahedronGeometry(globeRadius * 1.002, 3);
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
    });
    geometries.push(wireframeGeometry);
    materials.push(wireframeMaterial);
    const wireframe = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
    globeGroup.add(wireframe);

    // Latitude/longitude rings
    const createRing = (radius: number, segments: number, opacity: number) => {
      const ringGeometry = new THREE.TorusGeometry(radius, 0.005, 8, segments);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity,
      });
      geometries.push(ringGeometry);
      materials.push(ringMaterial);
      return new THREE.Mesh(ringGeometry, ringMaterial);
    };

    // Equator
    const equator = createRing(globeRadius * 1.01, 128, 0.4);
    equator.rotation.x = Math.PI / 2;
    globeGroup.add(equator);

    // Tropics
    const tropic1 = createRing(globeRadius * 0.92, 96, 0.2);
    tropic1.rotation.x = Math.PI / 2;
    tropic1.position.y = globeRadius * 0.4;
    globeGroup.add(tropic1);

    const tropic2 = createRing(globeRadius * 0.92, 96, 0.2);
    tropic2.rotation.x = Math.PI / 2;
    tropic2.position.y = -globeRadius * 0.4;
    globeGroup.add(tropic2);

    // Outer glow ring
    const glowRingGeometry = new THREE.TorusGeometry(globeRadius * 1.25, 0.02, 16, 100);
    const glowRingMaterial = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
    });
    geometries.push(glowRingGeometry);
    materials.push(glowRingMaterial);
    const glowRing = new THREE.Mesh(glowRingGeometry, glowRingMaterial);
    glowRing.rotation.x = Math.PI / 2;
    globeGroup.add(glowRing);

    // Second outer ring
    const outerRingGeometry = new THREE.TorusGeometry(globeRadius * 1.45, 0.008, 16, 120);
    const outerRingMaterial = new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.3,
    });
    geometries.push(outerRingGeometry);
    materials.push(outerRingMaterial);
    const outerRing = new THREE.Mesh(outerRingGeometry, outerRingMaterial);
    outerRing.rotation.x = Math.PI / 2;
    outerRing.rotation.z = 0.3;
    globeGroup.add(outerRing);

    // Data points on globe
    const pointGeometry = new THREE.SphereGeometry(0.04, 16, 16);
    const pointMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x22d3ee,
      emissive: new THREE.Color(0x22d3ee),
      emissiveIntensity: 2,
      metalness: 0.5,
      roughness: 0.2,
    });
    geometries.push(pointGeometry);
    materials.push(pointMaterial);

    const dataPointMeshes: THREE.Mesh[] = [];
    const connectionLines: THREE.Line[] = [];

    DATA_POINTS.forEach((point, index) => {
      const position = latLngToVector3(point.lat, point.lng, globeRadius * 1.02);
      const mesh = new THREE.Mesh(pointGeometry, pointMaterial.clone());
      mesh.position.copy(position);
      const scale = 0.5 + (point.value / 100) * 1;
      mesh.scale.setScalar(scale);
      globeGroup.add(mesh);
      dataPointMeshes.push(mesh);

      // Pulse ring around data point
      const pulseGeometry = new THREE.RingGeometry(0.06, 0.08, 32);
      const pulseMaterial = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });
      geometries.push(pulseGeometry);
      materials.push(pulseMaterial);
      const pulse = new THREE.Mesh(pulseGeometry, pulseMaterial);
      pulse.position.copy(position);
      pulse.lookAt(new THREE.Vector3(0, 0, 0));
      pulse.userData = { initialScale: scale, phaseOffset: index * 0.5 };
      globeGroup.add(pulse);

      // Connection lines between random points
      if (index > 0 && Math.random() > 0.4) {
        const prevPoint = DATA_POINTS[Math.floor(Math.random() * index)];
        const prevPosition = latLngToVector3(prevPoint.lat, prevPoint.lng, globeRadius * 1.02);

        const curve = new THREE.QuadraticBezierCurve3(
          position,
          new THREE.Vector3(
            (position.x + prevPosition.x) / 2,
            (position.y + prevPosition.y) / 2 + 0.5,
            (position.z + prevPosition.z) / 2
          ),
          prevPosition
        );

        const lineGeometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(32));
        const lineMaterial = new THREE.LineBasicMaterial({
          color: 0x60a5fa,
          transparent: true,
          opacity: 0.4,
        });
        geometries.push(lineGeometry);
        materials.push(lineMaterial);
        const line = new THREE.Line(lineGeometry, lineMaterial);
        globeGroup.add(line);
        connectionLines.push(line);
      }
    });

    // Atmospheric glow
    const atmosphereGeometry = new THREE.SphereGeometry(globeRadius * 1.15, 32, 32);
    const atmosphereMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_FragColor = vec4(0.22, 0.83, 0.93, 1.0) * intensity * 0.5;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    geometries.push(atmosphereGeometry);
    materials.push(atmosphereMaterial);
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    globeGroup.add(atmosphere);

    // Background stars
    const starCount = 800;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const radius = 15 + Math.random() * 35;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = radius * Math.cos(phi);

      const colorChoice = Math.random();
      if (colorChoice > 0.8) {
        starColors[i * 3] = 0.56; // Cyan
        starColors[i * 3 + 1] = 0.93;
        starColors[i * 3 + 2] = 1;
      } else if (colorChoice > 0.6) {
        starColors[i * 3] = 0.6; // Blue
        starColors[i * 3 + 1] = 0.65;
        starColors[i * 3 + 2] = 0.98;
      } else {
        starColors[i * 3] = 1; // White
        starColors[i * 3 + 1] = 1;
        starColors[i * 3 + 2] = 1;
      }
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.Float32BufferAttribute(starPositions, 3));
    starGeometry.setAttribute("color", new THREE.Float32BufferAttribute(starColors, 3));
    const starMaterial = new THREE.PointsMaterial({
      size: 0.08,
      transparent: true,
      opacity: 0.8,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    geometries.push(starGeometry);
    materials.push(starMaterial);
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // Floating particles around globe
    const particleCount = 300;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSpeeds: number[] = [];
    for (let i = 0; i < particleCount; i++) {
      const radius = globeRadius * 1.3 + Math.random() * 1.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      particlePositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      particlePositions[i * 3 + 2] = radius * Math.cos(phi);
      particleSpeeds.push(0.002 + Math.random() * 0.005);
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.Float32BufferAttribute(particlePositions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.03,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    geometries.push(particleGeometry);
    materials.push(particleMaterial);
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.3);
    const key = new THREE.DirectionalLight(0x93c5fd, 1);
    key.position.set(5, 3, 5);
    const rim = new THREE.PointLight(0x38bdf8, 1, 15);
    rim.position.set(-3, 2, -3);
    const fill = new THREE.PointLight(0x22d3ee, 0.5, 20);
    fill.position.set(0, -3, 2);
    scene.add(ambient, key, rim, fill);

    // Mouse interaction
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationX = 0;
    let targetRotationY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = mountEl.getBoundingClientRect();
      mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    mountEl.addEventListener("mousemove", handleMouseMove);

    // Resize handler
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

      // Smooth mouse following
      targetRotationY += (mouseX * 0.5 - targetRotationY) * 0.05;
      targetRotationX += (mouseY * 0.3 - targetRotationX) * 0.05;

      // Globe rotation
      globeGroup.rotation.y = t * 0.1 + targetRotationY;
      globeGroup.rotation.x = targetRotationX * 0.5;

      // Ring animations
      glowRing.rotation.z = t * 0.2;
      outerRing.rotation.z = -t * 0.15 + 0.3;

      // Data point pulse animations
      globeGroup.children.forEach((child) => {
        if (child instanceof THREE.Mesh && child.userData.phaseOffset !== undefined) {
          const scale = child.userData.initialScale + Math.sin(t * 2 + child.userData.phaseOffset) * 0.3;
          child.scale.setScalar(scale);
          if (child.material instanceof THREE.MeshBasicMaterial) {
            child.material.opacity = 0.4 + Math.sin(t * 2 + child.userData.phaseOffset) * 0.3;
          }
        }
      });

      // Data point glow
      dataPointMeshes.forEach((mesh, i) => {
        const mat = mesh.material as THREE.MeshPhysicalMaterial;
        mat.emissiveIntensity = 1.5 + Math.sin(t * 1.5 + i * 0.3) * 0.5;
      });

      // Connection line opacity
      connectionLines.forEach((line, i) => {
        const mat = line.material as THREE.LineBasicMaterial;
        mat.opacity = 0.3 + Math.sin(t * 0.5 + i * 0.5) * 0.2;
      });

      // Star twinkle
      stars.rotation.y = t * 0.01;

      // Particle orbit
      const positions = particleGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        const x = positions[i * 3];
        const z = positions[i * 3 + 2];
        const angle = particleSpeeds[i];
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        positions[i * 3] = x * cos - z * sin;
        positions[i * 3 + 2] = x * sin + z * cos;
      }
      particleGeometry.attributes.position.needsUpdate = true;

      // Atmosphere pulse
      atmosphere.scale.setScalar(1 + Math.sin(t * 0.5) * 0.02);

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

  return <div className="globe-stage" ref={mountRef} />;
}
