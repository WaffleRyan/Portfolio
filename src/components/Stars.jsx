import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function Stars({ position, count = 1000, radius = 500, targetPosition, cameraGroup }) {
  const meshRef = useRef();
  const materialRef = useRef();
  const opacityRef = useRef(0);
  
  const [positions, colors] = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      // Random position on a sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = radius + Math.random() * 200;
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      
      // White color with slight variation
      const brightness = 0.8 + Math.random() * 0.2;
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness;
      colors[i * 3 + 2] = brightness;
    }
    
    return [positions, colors];
  }, [count, radius]);
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      // Subtle twinkling effect
      meshRef.current.rotation.y += 0.0001;
    }
    
    // Fade in/out based on distance from target position
    if (cameraGroup?.current && targetPosition && materialRef.current) {
      const cameraPos = cameraGroup.current.position;
      const distance = cameraPos.distanceTo(targetPosition);
      
      // Fade in when within 200 units, fade out beyond that
      const fadeDistance = 200;
      const maxDistance = 400;
      
      let targetOpacity = 0;
      if (distance < fadeDistance) {
        targetOpacity = 1;
      } else if (distance < maxDistance) {
        targetOpacity = 1 - (distance - fadeDistance) / (maxDistance - fadeDistance);
      } else {
        targetOpacity = 0;
      }
      
      // Smoothly interpolate opacity
      opacityRef.current = THREE.MathUtils.lerp(opacityRef.current, targetOpacity, delta * 2);
      materialRef.current.opacity = opacityRef.current;
    }
  });
  
  return (
    <points ref={meshRef} position={position}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        size={2}
        sizeAttenuation={true}
        vertexColors={true}
        transparent
        opacity={0}
      />
    </points>
  );
}

