"use client";

import QRCode from "qrcode";
import { useEffect, useRef } from "react";
import * as THREE from "three";

type ShardConfig = {
  offset: number;
  radius: number;
  speed: number;
  y: number;
  tilt: number;
};

export default function AdminHologramScene() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl) {
      return undefined;
    }

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
    renderer.toneMappingExposure = 1.08;
    mountEl.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x081020, 0.1);

    const camera = new THREE.PerspectiveCamera(
      46,
      mountEl.clientWidth / mountEl.clientHeight,
      0.1,
      50,
    );
    camera.position.set(0.6, 1.35, 6.4);

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];

    const root = new THREE.Group();
    root.position.y = 0.4;
    scene.add(root);

    const baseGeometry = new THREE.CylinderGeometry(2.2, 2.6, 0.4, 48, 1, true);
    const baseMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0b1224,
      metalness: 0.78,
      roughness: 0.22,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      transmission: 0.04,
      transparent: true,
      opacity: 0.95,
    });
    geometries.push(baseGeometry);
    materials.push(baseMaterial);
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = -1.4;
    root.add(base);

    const baseRingGeometry = new THREE.TorusGeometry(2.2, 0.08, 32, 200);
    const baseRingMaterial = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.45,
    });
    geometries.push(baseRingGeometry);
    materials.push(baseRingMaterial);
    const baseRing = new THREE.Mesh(baseRingGeometry, baseRingMaterial);
    baseRing.rotation.x = Math.PI / 2;
    baseRing.position.y = -1.2;
    root.add(baseRing);

    const beamGeometry = new THREE.CylinderGeometry(0.9, 1.1, 3.6, 48, 1, true);
    const beamMaterial = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    geometries.push(beamGeometry);
    materials.push(beamMaterial);
    const beam = new THREE.Mesh(beamGeometry, beamMaterial);
    beam.position.y = 0.1;
    root.add(beam);

    const beamInnerGeometry = new THREE.CylinderGeometry(0.5, 0.65, 3.6, 32, 1, true);
    const beamInnerMaterial = new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    geometries.push(beamInnerGeometry);
    materials.push(beamInnerMaterial);
    const beamInner = new THREE.Mesh(beamInnerGeometry, beamInnerMaterial);
    beamInner.position.y = 0.1;
    root.add(beamInner);

    const shardGeometry = new THREE.BoxGeometry(0.12, 0.8, 0.12);
    const shardMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xc7d2fe,
      emissive: new THREE.Color(0x38bdf8),
      emissiveIntensity: 0.32,
      metalness: 0.42,
      roughness: 0.2,
      transparent: true,
      opacity: 0.76,
    });
    geometries.push(shardGeometry);
    materials.push(shardMaterial);
    const shardCount = 8;
    const shards = new THREE.InstancedMesh(shardGeometry, shardMaterial, shardCount);
    const shardMatrix = new THREE.Matrix4();
    const shardConfigs: ShardConfig[] = [];
    for (let i = 0; i < shardCount; i += 1) {
      shardConfigs.push({
        offset: Math.random() * Math.PI * 2,
        radius: 1.4 + Math.random() * 1,
        speed: 0.32 + Math.random() * 0.5,
        y: -0.4 + Math.random() * 1.2,
        tilt: (Math.random() - 0.5) * 0.5,
      });
    }
    root.add(shards);

    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = 260;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i += 1) {
      const radius = 2.6 + Math.random() * 4.2;
      const angle = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 3.4;
      particlePositions[i * 3] = Math.cos(angle) * radius;
      particlePositions[i * 3 + 1] = y;
      particlePositions[i * 3 + 2] = Math.sin(angle) * radius * 0.68;
    }
    particleGeometry.setAttribute("position", new THREE.Float32BufferAttribute(particlePositions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.026,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    geometries.push(particleGeometry);
    materials.push(particleMaterial);
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    particles.position.z = -0.4;
    scene.add(particles);

    const head = new THREE.Group();
    head.position.set(-0.08, 0.45, 0);
    root.add(head);

    const shellGeometry = new THREE.SphereGeometry(1.4, 32, 32);
    const shellMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0b152a,
      metalness: 0.55,
      roughness: 0.16,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      transmission: 0.14,
      thickness: 0.6,
      transparent: true,
      opacity: 0.92,
    });
    geometries.push(shellGeometry);
    materials.push(shellMaterial);
    const shell = new THREE.Mesh(shellGeometry, shellMaterial);
    shell.scale.set(1.5, 1.25, 1.4);
    head.add(shell);

    const facePlateGeometry = new THREE.SphereGeometry(0.9, 32, 32);
    const facePlateMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      metalness: 0.4,
      roughness: 0.12,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
    });
    geometries.push(facePlateGeometry);
    materials.push(facePlateMaterial);
    const facePlate = new THREE.Mesh(facePlateGeometry, facePlateMaterial);
    facePlate.scale.set(1.8, 1.15, 0.9);
    facePlate.position.set(0, 0.02, 1.02);
    head.add(facePlate);

    const faceRimGeometry = new THREE.TorusGeometry(1.08, 0.06, 22, 72);
    const faceRimMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x1e3a8a,
      metalness: 0.28,
      roughness: 0.2,
      emissive: new THREE.Color(0x38bdf8),
      emissiveIntensity: 0.08,
      transparent: true,
      opacity: 0.55,
    });
    geometries.push(faceRimGeometry);
    materials.push(faceRimMaterial);
    const faceRim = new THREE.Mesh(faceRimGeometry, faceRimMaterial);
    faceRim.rotation.x = Math.PI / 2;
    faceRim.position.set(0, 0.05, 1.04);
    faceRim.scale.set(1.02, 0.9, 1);
    head.add(faceRim);

    const visorGeometry = new THREE.CapsuleGeometry(0.94, 0.08, 18, 24);
    const visorMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x7dd3fc,
      metalness: 0.12,
      roughness: 0.08,
      transmission: 0.82,
      thickness: 0.8,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      emissive: new THREE.Color(0x22d3ee),
      emissiveIntensity: 0.32,
      transparent: true,
      opacity: 0.9,
    });
    geometries.push(visorGeometry);
    materials.push(visorMaterial);
    const visor = new THREE.Mesh(visorGeometry, visorMaterial);
    visor.rotation.z = Math.PI / 2;
    visor.position.set(0, -0.02, 1.26);
    head.add(visor);

    const scanLineGeometry = new THREE.PlaneGeometry(1.88, 0.16);
    const scanLineMaterial = new THREE.MeshBasicMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    geometries.push(scanLineGeometry);
    materials.push(scanLineMaterial);
    const scanLine = new THREE.Mesh(scanLineGeometry, scanLineMaterial);
    scanLine.position.set(0, -0.42, 1.24);
    head.add(scanLine);

    const eyeGeometry = new THREE.CapsuleGeometry(0.26, 0.02, 12, 18);
    const eyeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.1,
      roughness: 0.12,
      emissive: new THREE.Color(0x7dd3fc),
      emissiveIntensity: 0.92,
      transparent: true,
      opacity: 0.92,
    });
    geometries.push(eyeGeometry);
    materials.push(eyeMaterial);
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.46, -0.04, 1.34);
    const rightEye = leftEye.clone();
    rightEye.position.x = 0.48;
    head.add(leftEye, rightEye);

    const smileGeometry = new THREE.TorusGeometry(0.42, 0.018, 16, 48, Math.PI);
    const smileMaterial = new THREE.MeshBasicMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.54,
    });
    geometries.push(smileGeometry);
    materials.push(smileMaterial);
    const smile = new THREE.Mesh(smileGeometry, smileMaterial);
    smile.rotation.x = Math.PI;
    smile.position.set(0, -0.46, 1.22);
    head.add(smile);

    const cheekGeometry = new THREE.CapsuleGeometry(0.22, 0.08, 12, 16);
    const cheekMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0e1d35,
      metalness: 0.3,
      roughness: 0.18,
      emissive: new THREE.Color(0x38bdf8),
      emissiveIntensity: 0.04,
      transparent: true,
      opacity: 0.62,
    });
    geometries.push(cheekGeometry);
    materials.push(cheekMaterial);
    const leftCheek = new THREE.Mesh(cheekGeometry, cheekMaterial);
    leftCheek.position.set(-0.9, -0.08, 1.02);
    leftCheek.rotation.z = 0.3;
    const rightCheek = leftCheek.clone();
    rightCheek.position.x = 0.9;
    rightCheek.rotation.z = -0.3;
    head.add(leftCheek, rightCheek);

    const chinGeometry = new THREE.SphereGeometry(0.18, 18, 18);
    const chinMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0f1f3c,
      metalness: 0.25,
      roughness: 0.2,
      emissive: new THREE.Color(0x38bdf8),
      emissiveIntensity: 0.06,
      transparent: true,
      opacity: 0.6,
    });
    geometries.push(chinGeometry);
    materials.push(chinMaterial);
    const chin = new THREE.Mesh(chinGeometry, chinMaterial);
    chin.position.set(0, -0.72, 1.08);
    head.add(chin);

    const browGeometry = new THREE.BoxGeometry(1.6, 0.05, 0.14);
    const browMaterial = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.42,
    });
    geometries.push(browGeometry);
    materials.push(browMaterial);
    const brow = new THREE.Mesh(browGeometry, browMaterial);
    brow.position.set(0, 0.44, 1.18);
    head.add(brow);

    const crestGeometry = new THREE.CylinderGeometry(0.3, 0.44, 0.78, 24, 1, true);
    const crestMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x1f2937,
      metalness: 0.55,
      roughness: 0.18,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      emissive: new THREE.Color(0x22d3ee),
      emissiveIntensity: 0.12,
    });
    geometries.push(crestGeometry);
    materials.push(crestMaterial);
    const crest = new THREE.Mesh(crestGeometry, crestMaterial);
    crest.position.set(0, 1.04, 0.38);
    crest.rotation.z = Math.PI / 2;
    head.add(crest);

    const facePointsGeometry = new THREE.BufferGeometry();
    const facePointCount = 80;
    const facePositions = new Float32Array(facePointCount * 3);
    for (let i = 0; i < facePointCount; i += 1) {
      const x = (Math.random() - 0.5) * 1.4;
      const y = (Math.random() - 0.5) * 1.1;
      const z = 1.08 + Math.random() * 0.14;
      facePositions[i * 3] = x;
      facePositions[i * 3 + 1] = y;
      facePositions[i * 3 + 2] = z;
    }
    facePointsGeometry.setAttribute("position", new THREE.Float32BufferAttribute(facePositions, 3));
    const facePointsMaterial = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.032,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    geometries.push(facePointsGeometry);
    materials.push(facePointsMaterial);
    const facePoints = new THREE.Points(facePointsGeometry, facePointsMaterial);
    head.add(facePoints);

    const qrGroup = new THREE.Group();
    qrGroup.position.set(2.4, -0.06, 0.46);
    qrGroup.rotation.y = -0.78;
    qrGroup.scale.set(0.75, 0.75, 0.75);
    root.add(qrGroup);

    const qrValue = `${globalThis.window.location.origin}/admin/dashboard`;
    const qrData = QRCode.create(qrValue, { errorCorrectionLevel: "H" });
    const qrSize = qrData.modules.size;
    const quietZone = 1;
    const dimension = qrSize + quietZone * 2;
    const moduleSize = 0.08;
    const totalSize = dimension * moduleSize;
    const halfSize = totalSize / 2;
    const darkModules: Array<[number, number]> = [];
    for (let row = 0; row < dimension; row += 1) {
      for (let col = 0; col < dimension; col += 1) {
        const inQuietZone =
          row < quietZone || col < quietZone || row >= qrSize + quietZone || col >= qrSize + quietZone;
        if (inQuietZone) {
          continue;
        }
        const dataIndex = (row - quietZone) * qrSize + (col - quietZone);
        if (qrData.modules.data[dataIndex]) {
          darkModules.push([row, col]);
        }
      }
    }

    const qrBaseGeometry = new THREE.BoxGeometry(totalSize * 1.08, totalSize * 1.08, 0.12);
    const qrBaseMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0b1224,
      metalness: 0.62,
      roughness: 0.2,
      clearcoat: 0.9,
      clearcoatRoughness: 0.08,
      transparent: true,
      opacity: 0.94,
    });
    geometries.push(qrBaseGeometry);
    materials.push(qrBaseMaterial);
    const qrBase = new THREE.Mesh(qrBaseGeometry, qrBaseMaterial);
    qrBase.position.z = -0.08;
    qrGroup.add(qrBase);

    const qrGlowGeometry = new THREE.PlaneGeometry(totalSize * 1.12, totalSize * 1.12);
    const qrGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    geometries.push(qrGlowGeometry);
    materials.push(qrGlowMaterial);
    const qrGlow = new THREE.Mesh(qrGlowGeometry, qrGlowMaterial);
    qrGlow.position.z = -0.12;
    qrGroup.add(qrGlow);

    const moduleGeometry = new THREE.BoxGeometry(moduleSize, moduleSize, 0.08);
    const moduleMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.24,
      roughness: 0.16,
      emissive: new THREE.Color(0x0ea5e9),
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.95,
    });
    geometries.push(moduleGeometry);
    materials.push(moduleMaterial);
    const modules = new THREE.InstancedMesh(moduleGeometry, moduleMaterial, darkModules.length);
    const moduleMatrix = new THREE.Matrix4();
    darkModules.forEach(([row, col], index) => {
      const x = col * moduleSize - halfSize + moduleSize / 2;
      const y = (dimension - row - 1) * moduleSize - halfSize + moduleSize / 2;
      moduleMatrix.makeTranslation(x, y, 0.08);
      modules.setMatrixAt(index, moduleMatrix);
    });
    modules.instanceMatrix.needsUpdate = true;
    qrGroup.add(modules);

    const qrFrameGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(totalSize, totalSize, 0.12));
    const qrFrameMaterial = new THREE.LineBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.48,
    });
    geometries.push(qrFrameGeometry);
    materials.push(qrFrameMaterial);
    const qrFrame = new THREE.LineSegments(qrFrameGeometry, qrFrameMaterial);
    qrFrame.position.z = 0.04;
    qrGroup.add(qrFrame);

    const ambient = new THREE.AmbientLight(0xffffff, 0.32);
    const key = new THREE.DirectionalLight(0x93c5fd, 0.9);
    key.position.set(4.4, 4.3, 6.2);
    const rim = new THREE.PointLight(0x38bdf8, 0.6, 18);
    rim.position.set(-3.2, 2.4, 4.2);
    const fill = new THREE.PointLight(0x22d3ee, 1, 20);
    fill.position.set(0, -2.8, -1.4);
    scene.add(ambient, key, rim, fill);

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

      root.rotation.y = Math.sin(t * 0.1) * 0.04;
      root.position.y = 0.4 + Math.sin(t * 0.65) * 0.04;

      head.rotation.y = 0.08 + Math.sin(t * 0.38) * 0.1;
      head.rotation.x = -0.015 + Math.sin(t * 0.3) * 0.04;
      visorMaterial.emissiveIntensity = 0.32 + Math.sin(t * 1.1) * 0.18;
      eyeMaterial.emissiveIntensity = 0.78 + Math.sin(t * 1.4) * 0.26;
      scanLine.position.y = -0.46 + ((t * 0.46) % 1.08);
      scanLineMaterial.opacity = 0.36 + Math.sin(t * 1.3) * 0.18;
      facePointsMaterial.opacity = 0.38 + Math.sin(t * 0.8) * 0.2;

      shardConfigs.forEach((config, index) => {
        const angle = config.offset + t * config.speed;
        const x = Math.cos(angle) * config.radius;
        const z = Math.sin(angle) * config.radius * 0.68;
        const y = config.y + Math.sin(t * config.speed * 1.1 + config.offset) * 0.32;
        shardMatrix.makeRotationFromEuler(new THREE.Euler(-0.24, angle, config.tilt));
        shardMatrix.setPosition(x, y, z + 0.24);
        shards.setMatrixAt(index, shardMatrix);
      });
      shards.instanceMatrix.needsUpdate = true;

      qrGroup.rotation.y = -0.76 + Math.sin(t * 0.32) * 0.06;
      qrGroup.position.y = -0.06 + Math.sin(t * 0.75) * 0.05;
      qrGlowMaterial.opacity = 0.16 + Math.sin(t * 0.8) * 0.06;
      moduleMaterial.emissiveIntensity = 0.46 + Math.sin(t * 1) * 0.14;

      beamMaterial.opacity = 0.12 + Math.sin(t * 0.6) * 0.08;
      beamInnerMaterial.opacity = 0.1 + Math.cos(t * 0.8) * 0.06;
      baseRing.rotation.z = t * 0.22;
      particles.rotation.y = t * 0.06;

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

  return <div className="holo-stage" ref={mountRef} />;
}
