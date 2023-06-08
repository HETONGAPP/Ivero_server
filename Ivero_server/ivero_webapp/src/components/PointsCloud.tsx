import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { BufferGeometry, Float32BufferAttribute, Points, PointsMaterial } from 'three';

function clearThree(obj: any, dispose: boolean = true) {
  while(obj.children.length > 0){ 
    clearThree(obj.children[0], dispose);
    obj.remove(obj.children[0]);
  }
  if(obj.geometry && dispose) obj.geometry.dispose();

  if(obj.material){ 
    Object.keys(obj.material).forEach(prop => {
      if(!obj.material[prop])
        return;
      if(obj.material[prop] !== null && typeof obj.material[prop].dispose === 'function')                                  
        obj.material[prop].dispose();                                                      
    })
    if (dispose) obj.material.dispose();
  }
}

function PointsCloud(_: any, ref: any) {

  const { current: geometry } = useRef(new BufferGeometry());
  const { current: material } = useRef(new PointsMaterial({ size: 0.1, vertexColors: true }));
  const { scene } = useThree();

  useImperativeHandle(ref, () => ({
    addPoints: (json_obj: any) => {

      clearThree(scene, false);

      const vertices = [];
      const colors = [];
      for (const point of json_obj) {
        vertices.push( point.x, point.y, point.z );
        colors.push( point.r / 255, point.g / 255, point.b / 255 );
      }

      geometry.setAttribute( 'position', new Float32BufferAttribute( vertices, 3 ) );
      geometry.setAttribute( 'color', new Float32BufferAttribute( colors, 3 ) );
      const cube = new Points(geometry, material);
      scene.add(cube);

    }
  }), [scene, geometry, material]);

  return <></>;
}

export default forwardRef(PointsCloud);