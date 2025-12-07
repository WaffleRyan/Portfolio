import React, { useRef, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';

/*
 Ground component loads the ground tile model.
 Assumes model uses PBR materials; we enable shadow receive.
*/
export function Ground(props) {
  const group = useRef();
  const { scene } = useGLTF('./models/ground/model.glb');

  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.receiveShadow = true;
        // if ground should not cast shadows onto itself excessively
        child.castShadow = false;
      }
    });
  }, [scene]);

  return <group ref={group} {...props}><primitive object={scene} /></group>;
}

useGLTF.preload('./models/ground/model.glb');
