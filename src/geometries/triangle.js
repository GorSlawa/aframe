import * as THREE from 'three';
import { registerGeometry } from '../core/geometry.js';

var quaternion = new THREE.Quaternion();
var rotateVector = new THREE.Vector3(0, 0, 1);
var uvMinVector = new THREE.Vector2();
var uvMaxVector = new THREE.Vector2();
var uvScaleVector = new THREE.Vector2();

registerGeometry('triangle', {
  schema: {
    vertexA: {type: 'vec3', default: {x: 0, y: 0.5, z: 0}},
    vertexB: {type: 'vec3', default: {x: -0.5, y: -0.5, z: 0}},
    vertexC: {type: 'vec3', default: {x: 0.5, y: -0.5, z: 0}}
  },

  init: function (data) {
    var geometry;
    var normal;
    var triangle;
    var uvA;
    var uvB;
    var uvC;

    var vertices;
    var normals;
    var uvs;

    triangle = new THREE.Triangle();
    triangle.a.set(data.vertexA.x, data.vertexA.y, data.vertexA.z);
    triangle.b.set(data.vertexB.x, data.vertexB.y, data.vertexB.z);
    triangle.c.set(data.vertexC.x, data.vertexC.y, data.vertexC.z);
    normal = triangle.getNormal(new THREE.Vector3());

    // Rotate the 3D triangle to be parallel to XY plane.
    quaternion.setFromUnitVectors(normal, rotateVector);
    uvA = triangle.a.clone().applyQuaternion(quaternion);
    uvB = triangle.b.clone().applyQuaternion(quaternion);
    uvC = triangle.c.clone().applyQuaternion(quaternion);

    // Compute UVs.
    // Normalize x/y values of UV so they are within 0 to 1.
    uvMinVector.set(Math.min(uvA.x, uvB.x, uvC.x), Math.min(uvA.y, uvB.y, uvC.y));
    uvMaxVector.set(Math.max(uvA.x, uvB.x, uvC.x), Math.max(uvA.y, uvB.y, uvC.y));
    uvScaleVector.set(0, 0).subVectors(uvMaxVector, uvMinVector);
    uvA = new THREE.Vector2().subVectors(uvA, uvMinVector).divide(uvScaleVector);
    uvB = new THREE.Vector2().subVectors(uvB, uvMinVector).divide(uvScaleVector);
    uvC = new THREE.Vector2().subVectors(uvC, uvMinVector).divide(uvScaleVector);

    geometry = this.geometry = new THREE.BufferGeometry();
    vertices = [
      triangle.a.x, triangle.a.y, triangle.a.z,
      triangle.b.x, triangle.b.y, triangle.b.z,
      triangle.c.x, triangle.c.y, triangle.c.z
    ];
    normals = [
      normal.x, normal.y, normal.z,
      normal.x, normal.y, normal.z,
      normal.x, normal.y, normal.z
    ];
    uvs = [
      uvA.x, uvA.y,
      uvB.x, uvB.y,
      uvC.x, uvC.y
    ];

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  }
});
