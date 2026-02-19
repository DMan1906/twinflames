// src/components/SpicyDice.tsx
'use client';

import { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { RoundedBox, OrbitControls, ContactShadows, PerspectiveCamera, Environment } from '@react-three/drei';
import * as THREE from 'three';

const ACTIONS = ['KISS', 'LICK', 'SUCK', 'TOUCH', 'BITE', 'NIBBLE'];
const BODY_PARTS = ['NECK', 'EAR', 'THIGH', 'NAVEL', 'BREASTS', 'LIPS'];
const LOCATIONS = ['SHOWER', 'KITCHEN', 'BED', 'SOFA', 'CAR', 'FLOOR'];

function Die({ position, options, color }: { position: [number, number, number], options: string[], color: string }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [targetRotation, setTargetRotation] = useState(new THREE.Euler(0, 0, 0));

  // Generate 6 unique textures for the 6 faces
  const textures = useMemo(() => {
    return options.slice(0, 6).map((text) => {
      const size = 512;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;

      // Background color
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, size, size);

      // Text Settings - Centered precisely
      ctx.fillStyle = 'white';
      ctx.font = 'bold 75px sans-serif'; 
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Draw text in the absolute center
      ctx.fillText(text, size / 2, size / 2);

      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      return texture;
    });
  }, [options, color]);

  useFrame((state, delta) => {
    // Smoothly rotate towards the target landing spot
    meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, targetRotation.x, delta * 4);
    meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRotation.y, delta * 4);
    meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, targetRotation.z, delta * 4);
  });

  const roll = () => {
    // Snap to random multiples of 90 degrees (Math.PI / 2)
    // Adding (Math.PI * 8) creates the "rolling" spin animation
    const x = (Math.floor(Math.random() * 4) * (Math.PI / 2)) + (Math.PI * 8);
    const y = (Math.floor(Math.random() * 4) * (Math.PI / 2)) + (Math.PI * 8);
    const z = (Math.floor(Math.random() * 4) * (Math.PI / 2)) + (Math.PI * 8);
    setTargetRotation(new THREE.Euler(x, y, z));
  };

  return (
    <RoundedBox
      ref={meshRef}
      args={[1, 1, 1]}
      radius={0.12} // Smooth rounded corners
      smoothness={4}
      position={position}
      onClick={roll}
      castShadow
    >
      {/* Map each unique texture to its corresponding material side */}
      {textures.map((tex, i) => (
        <meshPhysicalMaterial 
          key={i} 
          attach={`material-${i}`} 
          map={tex} 
          roughness={0.1}
          metalness={0.2}
          clearcoat={1}
        />
      ))}
    </RoundedBox>
  );
}

export default function SpicyDice() {
  return (
    <div className="h-[500px] w-full bg-gradient-to-b from-[#1a1525] to-[#0d0a14] rounded-3xl overflow-hidden shadow-2xl relative border border-purple-900/20">
      <Canvas shadows camera={{ position: [0, 3, 5], fov: 45 }}>
        <PerspectiveCamera makeDefault position={[0, 3, 5]} />
        <ambientLight intensity={0.5} />
        <spotLight position={[5, 10, 5]} angle={0.2} penumbra={1} intensity={1.5} castShadow />
        <pointLight position={[-5, 5, -5]} intensity={0.5} color="#7c3aed" />
        
        <Die position={[-1.7, 0, 0]} options={ACTIONS} color="#4c1d95" />
        <Die position={[0, 0, 0]} options={BODY_PARTS} color="#831843" />
        <Die position={[1.7, 0, 0]} options={LOCATIONS} color="#1e3a8a" />

        <ContactShadows position={[0, -0.6, 0]} opacity={0.5} scale={10} blur={2.5} far={1} />
        <OrbitControls enableZoom={false} minPolarAngle={Math.PI / 4} maxPolarAngle={Math.PI / 2} />
        
        {/* Environment map adds the 3D reflections to the dice surface */}
        <Environment preset="city" />
      </Canvas>
      <div className="absolute top-6 w-full text-center pointer-events-none">
        <p className="text-purple-400/50 text-[10px] uppercase tracking-[0.3em] font-bold">Interact with Fate</p>
      </div>
    </div>
  );
}