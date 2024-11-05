import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';


function main() {

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
        light.position.set(0,20,0);
		scene.add( light );

	}
    var obj = {
        scale: 1
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

	function makeRandomPlot(j) {
		const randomPlot = [];
	
		for (let i = 0; i < 40; i++ ) {
			randomPlot.push(new THREE.Vector3(i, j, Math.floor(Math.random() * 19)));
		};
		return randomPlot;
	}

	const plot3d = [];

	for (let i = 0; i<20; i++) {

		plot3d.push(makeRandomPlot(i));
	}


	const scatterPointGeometry = new THREE.SphereGeometry(0.5);
	let scatterPointMaterial = [];
	


	for (let i = 0; i < plot3d.length; i ++){
		scatterPointMaterial.push(new THREE.MeshBasicMaterial({color: 0xff00ff}));
		scatterPointMaterial[i].color.set(255, i*5, i*10);
		console.log(scatterPointMaterial[i].color);
		for (let j = 0; j < plot3d[0].length; j++) {
			const scatterPlot = new THREE.Mesh(scatterPointGeometry, scatterPointMaterial[i]);
			console.log(scatterPlot.material.color);
			
			scatterPlot.position.x = plot3d[i][j].x;
			scatterPlot.position.y = plot3d[i][j].y;
			scatterPlot.position.z = plot3d[i][j].z;
	
			scene.add(scatterPlot);
		}
	};




    gui.add(obj, 'scale', 0.1, 5, 0.1);



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

		controls.update();
		renderer.render( scene, camera );

		requestAnimationFrame( render );

	}

	requestAnimationFrame( render );

}

main();
