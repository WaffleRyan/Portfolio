import React, { useRef, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';

/*
 Water component loads the water model.
 Assumes model uses PBR materials; we enable shadow receive.
*/
export function Water(props) {
  const group = useRef();
  const { scene } = useGLTF('./models/water/model.glb');

  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.receiveShadow = true;
        child.castShadow = false;
      }
    });
  }, [scene]);

  return <group ref={group} {...props}><primitive object={scene} /></group>;
}

useGLTF.preload('./models/water/model.glb');

