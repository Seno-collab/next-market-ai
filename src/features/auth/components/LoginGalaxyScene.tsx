"use client";

import QRCode from "qrcode";
import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function LoginGalaxyScene() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl) {
      return undefined;
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(globalThis.window.devicePixelRatio, 2));
    renderer.setSize(mountEl.clientWidth, mountEl.clientHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    mountEl.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x040915, 0.1);

    const camera = new THREE.PerspectiveCamera(
      40,
      mountEl.clientWidth / mountEl.clientHeight,
      0.1,
      50,
    );
    camera.position.set(0.2, 0.12, 6.8);

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];

    const galaxy = new THREE.Group();
    galaxy.position.set(0, 0, -0.4);
    galaxy.scale.set(0.9, 0.9, 0.9);
    scene.add(galaxy);

    const coreColor = new THREE.Color(0x7dd3fc);
    const rimColor = new THREE.Color(0xf472b6);
    const dustColor = new THREE.Color(0x9ca3af);
    const outerColor = new THREE.Color(0x38bdf8);

    const starGeometry = new THREE.BufferGeometry();
    const starCount = 1100;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i += 1) {
      const radius = Math.pow(Math.random(), 0.5) * 5.4 + 0.4;
      const arm = i % 5;
      const armAngle = (arm / 5) * Math.PI * 2;
      const spin = radius * 0.35;
      const jitter = (Math.random() - 0.5) * 0.6;
      const angle = armAngle + spin + jitter * 0.4;
      const x = Math.cos(angle) * radius + (Math.random() - 0.5) * 0.3;
      const y = (Math.random() - 0.5) * 0.18 * radius;
      const z = Math.sin(angle) * radius * 0.7 + (Math.random() - 0.5) * 0.3;
      starPositions[i * 3] = x;
      starPositions[i * 3 + 1] = y;
      starPositions[i * 3 + 2] = z;
      const mix = Math.min(1, radius / 6.2);
      const color = coreColor.clone().lerp(rimColor, mix * 0.8);
      starColors[i * 3] = color.r;
      starColors[i * 3 + 1] = color.g;
      starColors[i * 3 + 2] = color.b;
    }
    starGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(starPositions, 3),
    );
    starGeometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(starColors, 3),
    );
    const starMaterial = new THREE.PointsMaterial({
      size: 0.022,
      vertexColors: true,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    geometries.push(starGeometry);
    materials.push(starMaterial);
    const stars = new THREE.Points(starGeometry, starMaterial);
    galaxy.add(stars);

    const dustGeometry = new THREE.BufferGeometry();
    const dustCount = 950;
    const dustPositions = new Float32Array(dustCount * 3);
    const dustColors = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i += 1) {
      const radius = Math.pow(Math.random(), 0.8) * 6.4 + 0.2;
      const angle = Math.random() * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const y = (Math.random() - 0.5) * 0.4 * Math.max(1, radius * 0.3);
      const z = Math.sin(angle) * radius * 0.75;
      dustPositions[i * 3] = x;
      dustPositions[i * 3 + 1] = y;
      dustPositions[i * 3 + 2] = z;
      const mix = Math.min(1, radius / 7.2);
      const color = dustColor.clone().lerp(outerColor, mix * 0.5);
      dustColors[i * 3] = color.r;
      dustColors[i * 3 + 1] = color.g;
      dustColors[i * 3 + 2] = color.b;
    }
    dustGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(dustPositions, 3),
    );
    dustGeometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(dustColors, 3),
    );
    const dustMaterial = new THREE.PointsMaterial({
      size: 0.014,
      vertexColors: true,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    geometries.push(dustGeometry);
    materials.push(dustMaterial);
    const dust = new THREE.Points(dustGeometry, dustMaterial);
    dust.rotation.x = -0.08;
    galaxy.add(dust);

    const haloGeometry = new THREE.RingGeometry(3.6, 4.5, 96, 1);
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.1,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    geometries.push(haloGeometry);
    materials.push(haloMaterial);
    const halo = new THREE.Mesh(haloGeometry, haloMaterial);
    halo.rotation.x = Math.PI / 2;
    halo.rotation.z = Math.PI / 8;
    galaxy.add(halo);

    const glowGeometry = new THREE.SphereGeometry(1.8, 24, 24);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    geometries.push(glowGeometry);
    materials.push(glowMaterial);
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.scale.set(1.8, 1.2, 1.6);
    galaxy.add(glow);

    const qrValue = `${globalThis.window.location.origin}/login`;
    const qrData = QRCode.create(qrValue, { errorCorrectionLevel: "H" });
    const qrSize = qrData.modules.size;
    const qrQuietZone = 1;
    const qrDimension = qrSize + qrQuietZone * 2;
    const qrModuleSize = 0.08;
    const qrTotalSize = qrDimension * qrModuleSize;
    const qrHalfSize = qrTotalSize / 2;
    const qrDarkModules: Array<[number, number]> = [];
    for (let row = 0; row < qrDimension; row += 1) {
      for (let col = 0; col < qrDimension; col += 1) {
        const inQuietZone =
          row < qrQuietZone ||
          col < qrQuietZone ||
          row >= qrSize + qrQuietZone ||
          col >= qrSize + qrQuietZone;
        if (inQuietZone) {
          continue;
        }
        const index = (row - qrQuietZone) * qrSize + (col - qrQuietZone);
        if (qrData.modules.data[index]) {
          qrDarkModules.push([row, col]);
        }
      }
    }

    const qrGroup = new THREE.Group();
    qrGroup.position.set(0, -0.2, 0.6);
    qrGroup.rotation.set(-0.32, 0.5, 0);
    qrGroup.scale.set(0.82, 0.82, 0.82);
    galaxy.add(qrGroup);

    const qrBaseGeometry = new THREE.BoxGeometry(
      qrTotalSize * 1.08,
      qrTotalSize * 1.08,
      0.08,
    );
    const qrBaseMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0b1324,
      metalness: 0.5,
      roughness: 0.2,
      clearcoat: 0.6,
      clearcoatRoughness: 0.1,
      transparent: true,
      opacity: 0.85,
    });
    geometries.push(qrBaseGeometry);
    materials.push(qrBaseMaterial);
    const qrBase = new THREE.Mesh(qrBaseGeometry, qrBaseMaterial);
    qrBase.position.z = -0.06;
    qrGroup.add(qrBase);

    const qrGlowGeometry = new THREE.PlaneGeometry(
      qrTotalSize * 1.12,
      qrTotalSize * 1.12,
    );
    const qrGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    geometries.push(qrGlowGeometry);
    materials.push(qrGlowMaterial);
    const qrGlow = new THREE.Mesh(qrGlowGeometry, qrGlowMaterial);
    qrGlow.position.z = -0.1;
    qrGroup.add(qrGlow);

    const qrModuleGeometry = new THREE.BoxGeometry(
      qrModuleSize,
      qrModuleSize,
      0.08,
    );
    const qrModuleMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.25,
      roughness: 0.15,
      emissive: new THREE.Color(0x38bdf8),
      emissiveIntensity: 0.18,
      transparent: true,
      opacity: 0.92,
    });
    geometries.push(qrModuleGeometry);
    materials.push(qrModuleMaterial);
    const qrModules = new THREE.InstancedMesh(
      qrModuleGeometry,
      qrModuleMaterial,
      qrDarkModules.length,
    );
    const qrMatrix = new THREE.Matrix4();
    qrDarkModules.forEach(([row, col], index) => {
      const x = col * qrModuleSize - qrHalfSize + qrModuleSize / 2;
      const y =
        (qrDimension - row - 1) * qrModuleSize - qrHalfSize + qrModuleSize / 2;
      qrMatrix.makeTranslation(x, y, 0.06);
      qrModules.setMatrixAt(index, qrMatrix);
    });
    qrModules.instanceMatrix.needsUpdate = true;
    qrGroup.add(qrModules);

    const qrFrameGeometry = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(qrTotalSize, qrTotalSize, 0.08),
    );
    const qrFrameMaterial = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.32,
    });
    geometries.push(qrFrameGeometry);
    materials.push(qrFrameMaterial);
    const qrFrame = new THREE.LineSegments(qrFrameGeometry, qrFrameMaterial);
    qrFrame.position.z = 0.02;
    qrGroup.add(qrFrame);

    const light = new THREE.PointLight(0x7dd3fc, 1.2, 18);
    light.position.set(-1.2, 0.6, 3.2);
    scene.add(light);

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
      galaxy.rotation.z = t * 0.06;
      dust.rotation.z = -t * 0.018;
      stars.rotation.z = t * 0.025;
      halo.rotation.z = Math.PI / 8 + Math.sin(t * 0.4) * 0.05;
      haloMaterial.opacity = 0.08 + Math.sin(t * 0.6) * 0.028;
      glowMaterial.opacity = 0.08 + Math.cos(t * 0.8) * 0.03;
      camera.position.z = 7.2 + Math.sin(t * 0.2) * 0.18;
      qrGroup.rotation.y = 0.2 + Math.sin(t * 0.35) * 0.12;
      qrGroup.position.y = -0.2 + Math.sin(t * 0.5) * 0.05;
      qrGlowMaterial.opacity = 0.12 + Math.sin(t * 0.9) * 0.05;
      qrModuleMaterial.emissiveIntensity = 0.16 + Math.sin(t * 1.1) * 0.08;
      renderer.render(scene, camera);
      frameId = globalThis.requestAnimationFrame(animate);
    };

    animate();

    return () => {
      globalThis.cancelAnimationFrame(frameId);
      globalThis.window.removeEventListener("resize", handleResize);
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div className="login-galaxy" aria-hidden="true" ref={mountRef} />;
}
