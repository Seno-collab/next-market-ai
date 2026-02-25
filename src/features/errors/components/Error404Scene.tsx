"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function Error404Scene() {
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
		scene.fog = new THREE.FogExp2(0x080810, 0.03);

		const camera = new THREE.PerspectiveCamera(
			55,
			mountEl.clientWidth / mountEl.clientHeight,
			0.1,
			1000,
		);
		camera.position.set(0, 0, 14);

		const geometries: THREE.BufferGeometry[] = [];
		const materials: THREE.Material[] = [];

		// === Cute lost robot ===
		const robotGroup = new THREE.Group();
		scene.add(robotGroup);

		// Body (rounded cube-ish sphere)
		const bodyGeometry = new THREE.SphereGeometry(1.3, 32, 32);
		const bodyMaterial = new THREE.MeshPhysicalMaterial({
			color: 0x3b3f5c,
			metalness: 0.6,
			roughness: 0.3,
			emissive: new THREE.Color(0x1a1d3a),
			emissiveIntensity: 0.2,
		});
		geometries.push(bodyGeometry);
		materials.push(bodyMaterial);
		const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
		robotGroup.add(body);

		// Face screen (flat circle on front)
		const screenGeometry = new THREE.CircleGeometry(0.85, 32);
		const screenMaterial = new THREE.ShaderMaterial({
			uniforms: { time: { value: 0 } },
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
          vec2 uv = vUv;
          vec2 center = uv - 0.5;
          float dist = length(center);

          // Screen background
          vec3 bg = vec3(0.05, 0.08, 0.18);

          // Draw confused eyes: two "X" marks
          // Left eye
          vec2 leftEye = uv - vec2(0.32, 0.55);
          float le = min(
            abs(leftEye.x + leftEye.y),
            abs(leftEye.x - leftEye.y)
          );
          float leftMask = smoothstep(0.03, 0.01, le) * step(length(leftEye), 0.1);

          // Right eye
          vec2 rightEye = uv - vec2(0.68, 0.55);
          float re = min(
            abs(rightEye.x + rightEye.y),
            abs(rightEye.x - rightEye.y)
          );
          float rightMask = smoothstep(0.03, 0.01, re) * step(length(rightEye), 0.1);

          // Wobbly confused mouth (wavy line)
          float mouthY = 0.3 + sin(uv.x * 15.0 + time * 3.0) * 0.03;
          float mouth = smoothstep(0.02, 0.005, abs(uv.y - mouthY))
            * step(0.3, uv.x) * step(uv.x, 0.7);

          // Combine
          vec3 faceColor = vec3(0.4, 0.85, 1.0);
          vec3 color = bg;
          color = mix(color, faceColor, leftMask);
          color = mix(color, faceColor, rightMask);
          color = mix(color, faceColor * 0.7, mouth);

          // Scanline effect
          float scan = sin(uv.y * 80.0 + time * 2.0) * 0.5 + 0.5;
          color *= 0.92 + scan * 0.08;

          // Screen edge glow
          float edge = smoothstep(0.5, 0.35, dist);
          float alpha = edge;

          gl_FragColor = vec4(color, alpha);
        }
      `,
			transparent: true,
		});
		geometries.push(screenGeometry);
		materials.push(screenMaterial);
		const screen = new THREE.Mesh(screenGeometry, screenMaterial);
		screen.position.z = 1.15;
		robotGroup.add(screen);

		// Antenna
		const antennaGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.6, 8);
		const antennaMaterial = new THREE.MeshPhysicalMaterial({
			color: 0x8888aa,
			metalness: 0.8,
			roughness: 0.2,
		});
		geometries.push(antennaGeometry);
		materials.push(antennaMaterial);
		const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
		antenna.position.set(0, 1.55, 0);
		robotGroup.add(antenna);

		// Antenna tip (blinking light)
		const tipGeometry = new THREE.SphereGeometry(0.1, 16, 16);
		const tipMaterial = new THREE.MeshBasicMaterial({
			color: 0xff4466,
			transparent: true,
			opacity: 1,
		});
		geometries.push(tipGeometry);
		materials.push(tipMaterial);
		const tip = new THREE.Mesh(tipGeometry, tipMaterial);
		tip.position.set(0, 1.9, 0);
		robotGroup.add(tip);

		// Small arms
		for (const side of [-1, 1]) {
			const armGeometry = new THREE.CapsuleGeometry(0.08, 0.5, 4, 8);
			const armMaterial = new THREE.MeshPhysicalMaterial({
				color: 0x4a4f6c,
				metalness: 0.6,
				roughness: 0.3,
			});
			geometries.push(armGeometry);
			materials.push(armMaterial);
			const arm = new THREE.Mesh(armGeometry, armMaterial);
			arm.position.set(side * 1.4, -0.2, 0);
			arm.rotation.z = side * 0.4;
			arm.userData = { side };
			robotGroup.add(arm);
		}

		// Floating question marks (simple torus + sphere combos)
		const qmGroup = new THREE.Group();
		const qmCount = 6;
		for (let i = 0; i < qmCount; i++) {
			const qm = new THREE.Group();

			// "?" curve part (half torus)
			const curveGeometry = new THREE.TorusGeometry(
				0.25,
				0.06,
				8,
				16,
				Math.PI * 1.2,
			);
			const curveColor = new THREE.Color().setHSL(0.55 + i * 0.04, 0.6, 0.65);
			const curveMaterial = new THREE.MeshBasicMaterial({
				color: curveColor,
				transparent: true,
				opacity: 0.7,
			});
			geometries.push(curveGeometry);
			materials.push(curveMaterial);
			const curve = new THREE.Mesh(curveGeometry, curveMaterial);
			curve.rotation.x = Math.PI / 2;
			curve.rotation.z = -Math.PI / 4;
			qm.add(curve);

			// "?" dot
			const dotGeometry = new THREE.SphereGeometry(0.07, 8, 8);
			const dotMaterial = new THREE.MeshBasicMaterial({
				color: curveColor,
				transparent: true,
				opacity: 0.7,
			});
			geometries.push(dotGeometry);
			materials.push(dotMaterial);
			const dot = new THREE.Mesh(dotGeometry, dotMaterial);
			dot.position.set(0.15, -0.35, 0);
			qm.add(dot);

			const angle = (i / qmCount) * Math.PI * 2;
			const radius = 3 + Math.random() * 2.5;
			qm.position.set(
				Math.cos(angle) * radius,
				(Math.random() - 0.5) * 4,
				Math.sin(angle) * radius - 1,
			);
			qm.scale.setScalar(0.8 + Math.random() * 0.8);
			qm.userData = {
				orbitAngle: angle,
				orbitRadius: radius,
				floatPhase: Math.random() * Math.PI * 2,
				bobSpeed: 1 + Math.random() * 1.5,
				rotSpeed: (Math.random() - 0.5) * 2,
			};
			qmGroup.add(qm);
		}
		scene.add(qmGroup);

		// Stars background
		const starCount = 300;
		const starPositions = new Float32Array(starCount * 3);
		const starColors = new Float32Array(starCount * 3);
		for (let i = 0; i < starCount; i++) {
			starPositions[i * 3] = (Math.random() - 0.5) * 40;
			starPositions[i * 3 + 1] = (Math.random() - 0.5) * 30;
			starPositions[i * 3 + 2] = -5 - Math.random() * 20;

			const brightness = 0.5 + Math.random() * 0.5;
			starColors[i * 3] = brightness;
			starColors[i * 3 + 1] = brightness;
			starColors[i * 3 + 2] = brightness + Math.random() * 0.2;
		}
		const starGeometry = new THREE.BufferGeometry();
		starGeometry.setAttribute(
			"position",
			new THREE.Float32BufferAttribute(starPositions, 3),
		);
		starGeometry.setAttribute(
			"color",
			new THREE.Float32BufferAttribute(starColors, 3),
		);
		geometries.push(starGeometry);

		const starMaterial = new THREE.PointsMaterial({
			size: 0.05,
			vertexColors: true,
			transparent: true,
			opacity: 0.8,
		});
		materials.push(starMaterial);
		scene.add(new THREE.Points(starGeometry, starMaterial));

		// Lighting
		scene.add(new THREE.AmbientLight(0x667799, 0.4));
		const frontLight = new THREE.PointLight(0x88aaff, 2, 20);
		frontLight.position.set(2, 3, 8);
		scene.add(frontLight);
		const backLight = new THREE.PointLight(0xdd0031, 1, 15);
		backLight.position.set(-3, -2, -5);
		scene.add(backLight);

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

		const animate = () => {
			const t = clock.getElapsedTime();

			// Update face shader
			screenMaterial.uniforms.time.value = t;

			// Robot bobbing & gentle tilt (looks confused)
			robotGroup.position.y = Math.sin(t * 1.2) * 0.3;
			robotGroup.rotation.z = Math.sin(t * 0.8) * 0.08;
			robotGroup.rotation.x = Math.sin(t * 0.6) * 0.05;

			// Robot slowly looks around
			robotGroup.rotation.y = Math.sin(t * 0.4) * 0.4;

			// Antenna tip blink
			tipMaterial.opacity = Math.sin(t * 4) > 0 ? 1 : 0.2;

			// Arms wave slightly
			robotGroup.children.forEach((child) => {
				if (child.userData.side) {
					child.rotation.z =
						child.userData.side *
						(0.4 + Math.sin(t * 2 + child.userData.side) * 0.15);
				}
			});

			// Animate question marks
			qmGroup.children.forEach((qm) => {
				const d = qm.userData;
				d.orbitAngle += 0.003;
				qm.position.x = Math.cos(d.orbitAngle) * d.orbitRadius;
				qm.position.z = Math.sin(d.orbitAngle) * d.orbitRadius - 1;
				qm.position.y += Math.sin(t * d.bobSpeed + d.floatPhase) * 0.005;
				qm.rotation.y = t * 0.5;
				qm.rotation.z = Math.sin(t * d.rotSpeed + d.floatPhase) * 0.2;
			});

			// Star twinkle
			const starOpacities = starGeometry.attributes.color.array as Float32Array;
			for (let i = 0; i < starCount; i++) {
				if (Math.random() > 0.99) {
					const brightness = 0.3 + Math.random() * 0.7;
					starOpacities[i * 3] = brightness;
					starOpacities[i * 3 + 1] = brightness;
					starOpacities[i * 3 + 2] = brightness + Math.random() * 0.2;
				}
			}
			starGeometry.attributes.color.needsUpdate = true;

			// Smooth camera parallax
			camera.position.x += (mouseX * 1.5 - camera.position.x) * 0.03;
			camera.position.y += (mouseY * 1.0 - camera.position.y) * 0.03;
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

	return <div className="error-3d-stage" ref={mountRef} />;
}
