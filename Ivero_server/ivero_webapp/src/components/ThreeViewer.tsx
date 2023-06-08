import React, { forwardRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import PointsCloud from './PointsCloud';

function ThreeViewer(_: any, ref: any) {

   return (
      <Canvas
         camera={{ position: [2, 0, 12.25], fov: 15 }}
         style={{
            backgroundColor: '#464e5f',
            width: '100%',
            height: '100%',
         }}
      >
         <ambientLight intensity={1.25} />
         <directionalLight intensity={0.4} />
         <PointsCloud ref={ref}/>
         <OrbitControls />
      </Canvas>
   );
}

export default forwardRef(ThreeViewer);