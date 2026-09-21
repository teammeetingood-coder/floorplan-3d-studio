"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import * as THREE from "three";

const WALK_SPEED = 2.6;
const EYE_HEIGHT = 1.65;

export default function FirstPersonControls() {
  const { camera } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const direction = useRef(new THREE.Vector3());

  useEffect(() => {
    camera.position.set(0, EYE_HEIGHT, 3);
  }, [camera]);

  useEffect(() => {
    function down(e: KeyboardEvent) {
      keys.current[e.code] = true;
    }
    function up(e: KeyboardEvent) {
      keys.current[e.code] = false;
    }
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  /* eslint-disable react-hooks/immutability --
     Mutating `camera` directly inside useFrame is the standard react-three-fiber
     pattern for per-frame updates: it runs outside React's render/commit cycle,
     so the generic React state-immutability lint rule doesn't apply here. */
  useFrame((_, delta) => {
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();

    direction.current.set(0, 0, 0);
    if (keys.current["KeyW"] || keys.current["ArrowUp"]) direction.current.add(forward);
    if (keys.current["KeyS"] || keys.current["ArrowDown"]) direction.current.sub(forward);
    if (keys.current["KeyD"] || keys.current["ArrowRight"]) direction.current.add(right);
    if (keys.current["KeyA"] || keys.current["ArrowLeft"]) direction.current.sub(right);

    if (direction.current.lengthSq() > 0) {
      direction.current.normalize().multiplyScalar(WALK_SPEED * delta);
      camera.position.add(direction.current);
      camera.position.y = EYE_HEIGHT;
    }
  });
  /* eslint-enable react-hooks/immutability */

  return <PointerLockControls />;
}
