"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const ROTATION_SPEED = 0.0095;

export default function ThreeScene() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl) {
      return undefined;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020817);

    const camera = new THREE.PerspectiveCamera(
      50,
      mountEl.clientWidth / mountEl.clientHeight,
      0.1,
      100,
    );
    camera.position.set(0, 0, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(mountEl.clientWidth, mountEl.clientHeight);
    mountEl.appendChild(renderer.domElement);

    const geometry = new THREE.TorusKnotGeometry(1.1, 0.34, 150, 32);
    const material = new THREE.MeshStandardMaterial({
      color: 0x1677ff,
      emissive: 0x0f172a,
      metalness: 0.4,
      roughness: 0.2,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const fillLight = new THREE.PointLight(0x5a95ff, 1.2);
    fillLight.position.set(4, 3, 4);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xeb3678, 1.1);
    rimLight.position.set(-4, -2, -5);
    scene.add(rimLight);

    scene.add(new THREE.AmbientLight(0xffffff, 0.3));

    const handleResize = () => {
      if (!mountRef.current) {
        return;
      }
      const { clientWidth, clientHeight } = mountRef.current;
      renderer.setSize(clientWidth, clientHeight);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
    };

    window.addEventListener("resize", handleResize);

    let animationFrameId: number;
    const animate = () => {
      mesh.rotation.x += ROTATION_SPEED;
      mesh.rotation.y += ROTATION_SPEED;
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      mountEl.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="three-root" />;
}
