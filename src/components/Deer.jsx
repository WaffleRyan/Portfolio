import React, { useRef, useEffect } from 'react';
import { useGLTF, Center, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

/*
 Deer component loads the deer model and plays its idle animation.
 Assumes model uses PBR materials; we enable shadow receive.
*/
export function Deer({ clipIdle = "DwarfPronghorn_Idle", ...props }) {
  const group = useRef();
  const gltf = useGLTF('./models/deer/model.glb');
  const { actions, names } = useAnimations(gltf.animations, group);

  useEffect(() => {
    gltf.scene.traverse((child) => {
      if (child.isMesh) {
        child.receiveShadow = true;
        child.castShadow = true;
        child.frustumCulled = false; // Prevent culling issues
      }
      // Also disable frustum culling on bones if present
      if (child.isBone) child.frustumCulled = false;
    });
  }, [gltf.scene]);

  // Play idle animation
  useEffect(() => {
    if (!actions || !names) return;

    // Try to find the idle animation - first try the provided name, then look for any with "Idle" in it
    let idleAction = null;
    
    if (clipIdle && actions[clipIdle]) {
      idleAction = actions[clipIdle];
    } else {
      // Look for any animation with "Idle" in the name (case insensitive)
      const idleName = names.find(name => 
        name.toLowerCase().includes('idle')
      );
      if (idleName && actions[idleName]) {
        idleAction = actions[idleName];
      } else if (names.length > 0 && actions[names[0]]) {
        // Fallback to first available animation
        idleAction = actions[names[0]];
      }
    }

    if (idleAction) {
      idleAction.reset();
      idleAction.setLoop(THREE.LoopRepeat, Infinity);
      idleAction.play();
    }

    return () => {
      // Cleanup on unmount
      if (idleAction) {
        idleAction.stop();
      }
    };
  }, [actions, names, clipIdle]);

  return (
    <group ref={group} {...props}>
      <Center>
        <primitive object={gltf.scene} />
      </Center>
    </group>
  );
}

useGLTF.preload('./models/deer/model.glb');

