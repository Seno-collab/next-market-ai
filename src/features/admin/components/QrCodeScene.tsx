"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import QRCode from "qrcode";

const MODULE_SIZE = 0.12;
const MODULE_DEPTH = 0.08;
const BASE_DEPTH = 0.04;
const QUIET_ZONE = 2;

export default function QrCodeScene({ value }: { value?: string }) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl) {
      return undefined;
    }

    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(mountEl.clientWidth, mountEl.clientHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mountEl.appendChild(renderer.domElement);

    const qrValue = value ?? `${window.location.origin}/menu`;
    const qrData = QRCode.create(qrValue, { errorCorrectionLevel: "M" });
    const size = qrData.modules.size;
    const dimension = size + QUIET_ZONE * 2;
    const darkModules: Array<[number, number]> = [];

    for (let row = 0; row < dimension; row += 1) {
      for (let col = 0; col < dimension; col += 1) {
        const inQuietZone =
          row < QUIET_ZONE || col < QUIET_ZONE || row >= size + QUIET_ZONE || col >= size + QUIET_ZONE;
        if (inQuietZone) {
          continue;
        }
        const dataIndex = (row - QUIET_ZONE) * size + (col - QUIET_ZONE);
        if (qrData.modules.data[dataIndex]) {
          darkModules.push([row, col]);
        }
      }
    }

    const totalSize = dimension * MODULE_SIZE;
    const halfSize = totalSize / 2;

    const aspect = mountEl.clientWidth / mountEl.clientHeight;
    const camera = new THREE.OrthographicCamera(
      (-totalSize * aspect) / 2,
      (totalSize * aspect) / 2,
      totalSize / 2,
      -totalSize / 2,
      0.1,
      20,
    );
    camera.position.set(0, 0, 8);
    camera.lookAt(0, 0, 0);

    const group = new THREE.Group();
    scene.add(group);

    const baseGeometry = new THREE.BoxGeometry(totalSize, totalSize, BASE_DEPTH);
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.9,
      metalness: 0.05,
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.z = -BASE_DEPTH / 2;
    group.add(base);

    const moduleGeometry = new THREE.BoxGeometry(MODULE_SIZE, MODULE_SIZE, MODULE_DEPTH);
    const moduleMaterial = new THREE.MeshStandardMaterial({
      color: 0x0b0b0f,
      roughness: 0.75,
      metalness: 0.1,
    });
    const instanced = new THREE.InstancedMesh(moduleGeometry, moduleMaterial, darkModules.length);

    const matrix = new THREE.Matrix4();
    darkModules.forEach(([row, col], index) => {
      const x = col * MODULE_SIZE - halfSize + MODULE_SIZE / 2;
      const y = (dimension - row - 1) * MODULE_SIZE - halfSize + MODULE_SIZE / 2;
      matrix.makeTranslation(x, y, MODULE_DEPTH / 2);
      instanced.setMatrixAt(index, matrix);
    });
    instanced.instanceMatrix.needsUpdate = true;
    group.add(instanced);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x93c5fd, 0.6);
    keyLight.position.set(4, 4, 6);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x0ea5e9, 0.4);
    fillLight.position.set(-3, -2, 5);
    scene.add(fillLight);

    const handleResize = () => {
      const { clientWidth, clientHeight } = mountEl;
      renderer.setSize(clientWidth, clientHeight);
      const newAspect = clientWidth / clientHeight;
      camera.left = (-totalSize * newAspect) / 2;
      camera.right = (totalSize * newAspect) / 2;
      camera.top = totalSize / 2;
      camera.bottom = -totalSize / 2;
      camera.updateProjectionMatrix();
    };

    window.addEventListener("resize", handleResize);

    let frameId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      const t = clock.getElapsedTime();
      group.position.z = Math.sin(t * 0.6) * 0.04;
      keyLight.position.x = 4 + Math.sin(t * 0.3) * 0.6;
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      baseGeometry.dispose();
      moduleGeometry.dispose();
      baseMaterial.dispose();
      moduleMaterial.dispose();
      renderer.dispose();
      mountEl.removeChild(renderer.domElement);
    };
  }, [value]);

  return <div className="qr-three" ref={mountRef} />;
}
