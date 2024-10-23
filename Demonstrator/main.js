import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';


function main() {

	const canvas = document.querySelector( '#c' );
	const renderer = new THREE.WebGLRenderer( { antialias: true, canvas } );
    const gui = new GUI;

	const fov = 40;
	const aspect = 2; // the canvas default
	const near = 0.1;
	const far = 1000;
	const camera = new THREE.PerspectiveCamera( fov, aspect, near, far );
	camera.position.set( 0, 50, 0 );
	camera.up.set( 0, 0, 1 );
	camera.lookAt( 0, 0, 0 );

	const scene = new THREE.Scene();
    

	{

		const color = 0xFFFFFF;
		const intensity = 500;
		const light = new THREE.PointLight( color, intensity );
        light.position.set(0,20,0);
		scene.add( light );

	}
    var obj = {
        scale: 1
    }
    
    const cubeGeometry = new THREE.BoxGeometry(3, 3, 3, 5, 5, 5);
    const cubeMaterial = new THREE.MeshPhongMaterial( {color: 0x00ff44, emissive: 0x004411} );
    const cubeMesh = new THREE.Mesh(cubeGeometry, cubeMaterial);
    

    gui.add(obj, 'scale', 0.1, 5, 0.1);

    scene.add(cubeMesh);



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

	function render( time ) {

		time *= 0.001;

		if ( resizeRendererToDisplaySize( renderer ) ) {

			const canvas = renderer.domElement;
			camera.aspect = canvas.clientWidth / canvas.clientHeight;
			camera.updateProjectionMatrix();

		}

        cubeMesh.scale.set(obj.scale, obj.scale, obj.scale);
		renderer.render( scene, camera );

        cubeMesh.rotateX(0.01);
        cubeMesh.rotateZ(0.01);

		requestAnimationFrame( render );

	}

	requestAnimationFrame( render );

}

main();
