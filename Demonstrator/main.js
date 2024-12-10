import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';




const canvas = document.querySelector( '#c' );
const renderer = new THREE.WebGLRenderer( { antialias: true, canvas } );
  const gui = new GUI;

const fov = 40;
const aspect = 2; // the canvas default
const near = 0.1;
const far = 1000;
const camera = new THREE.PerspectiveCamera( fov, aspect, near, far );
camera.position.set( 20, -50, 10 );
camera.up.set( 0, 0, 1 );
camera.lookAt( 20, 0, 10 );
const controls = new OrbitControls( camera, renderer.domElement );
controls.update();

const scene = new THREE.Scene();
  

{

  const color = 0xFFFFFF;
  const intensity = 500;
  const light = new THREE.PointLight( color, intensity );
      light.position.set(10,0,40);
  scene.add( light );

}


var obj = {
  x: 3,
  y: 3
};

const axisMaterial = new THREE.LineBasicMaterial({color: 0x00ff44});

const xPoints = [];
xPoints.push(new THREE.Vector3(0, 0, 0));
xPoints.push(new THREE.Vector3(40, 0, 0));

const yPoints = [];
yPoints.push(new THREE.Vector3(0, 0, 0));
yPoints.push(new THREE.Vector3(0, 20, 0));

const zPoints = [];
zPoints.push(new THREE.Vector3(0, 0, 0));
zPoints.push(new THREE.Vector3(0, 0, 20));

const xGeometry = new THREE.BufferGeometry().setFromPoints(xPoints);
const yGeometry = new THREE.BufferGeometry().setFromPoints(yPoints);
const zGeometry = new THREE.BufferGeometry().setFromPoints(zPoints);

const xAchse = new THREE.Line(xGeometry, axisMaterial);
const yAchse = new THREE.Line(yGeometry, axisMaterial);
const zAchse = new THREE.Line(zGeometry, axisMaterial);

scene.add(xAchse);
scene.add(yAchse);
scene.add(zAchse);

let x_mult = 40/(obj.x - 1);
let y_mult = 20/(obj.y - 1);

const geometry = new THREE.BufferGeometry();

function makeRandomPlot(j) {
  const randomPlot = [];

  for (let i = 0; i < obj.x; i++ ) {
    randomPlot.push(new THREE.Vector3(i * x_mult, j * y_mult, Math.floor(Math.random() * 19)));
  };
  return randomPlot;
}




const material = new THREE.MeshPhongMaterial( { 
  color: 0x04f116, 
  emissive: 0x000000, 
  side: THREE.DoubleSide, 
  wireframe: false, 
  flatShading: true
} );

const mesh = new THREE.Mesh( geometry, material );
scene.add(mesh);

function new_plot(){

  x_mult = 40/(obj.x - 1);
  y_mult = 20/(obj.y - 1);

  const plot3d = [];

  for (let i = 0; i<obj.y; i++) {

    plot3d.push(makeRandomPlot(i));
  }

  var vertices = new Float32Array([]);
  vertices.push = function()
    {
        vertices = new Float32Array([...vertices, ...arguments]);
    };
  
  for (let j=0; j<plot3d.length-1; j++) {
    for (let i = 0; i< plot3d[0].length - 1; i++){
      vertices = new Float32Array([...vertices,
        plot3d[j][i].x,     plot3d[j][i].y,     plot3d[j][i].z,
        plot3d[j][i+1].x,   plot3d[j][i+1].y,   plot3d[j][i+1].z,
        plot3d[j+1][i].x,   plot3d[j+1][i].y,   plot3d[j+1][i].z,

        plot3d[j+1][i].x,   plot3d[j+1][i].y,   plot3d[j+1][i].z,
        plot3d[j][i+1].x,   plot3d[j][i+1].y,   plot3d[j][i+1].z,
        plot3d[j+1][i+1].x, plot3d[j+1][i+1].y, plot3d[j+1][i+1].z
      ])
    };
  
  }

  mesh.geometry.setAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );


}

new_plot();
gui.add(obj, 'x', 2, 50, 1)
gui.add(obj, 'y', 2, 50, 1);





function resizeRendererToDisplaySize( renderer ) {

  const canvas = renderer.domElement;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const needResize = canvas.width !== width || canvas.height !== height;
  if ( needResize ) {

    renderer.setSize( width, height, false );

  }

  return needResize;

}

var old_obj = {
  x : obj.x,
  y : obj.y
};

function render( time ) {

  time *= 0.001;

  if ( resizeRendererToDisplaySize( renderer ) ) {

    const canvas = renderer.domElement;
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();

  }
  
  if (old_obj.x !== obj.x || old_obj.y !== obj.y) {
    new_plot();
  };

  old_obj.x = obj.x;
  old_obj.y = obj.y;
  
  controls.update();
  renderer.render( scene, camera );

  requestAnimationFrame( render );

}

requestAnimationFrame( render );

