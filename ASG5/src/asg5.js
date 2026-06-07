// asg5.js
// paul bunyan campsite, built with three.js
// based on the manual tutorials linked in the assignment
// https://threejs.org/manual/#en/fundamentals
// theory: Matsuda Ch7/Ch8/Ch10, Shirley Ch6/Ch10/Ch11

// imports come from the importmap in index.html


import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// scene globals
var scene;
var camera;
var renderer;
var controls;

// directional light (sun), moves for the day/night cycle
var sun;

// hemisphere fill light, ramps with the sun
var hemi;

// campfire point light, brighter at night
var fireLight;

// flame meshes, scaled each frame for the flicker
var flames = [];

// smoke puffs for the campfire and chimney (Matsuda Ch4 p.91)
var smokeParticles = [];

// animation clock
// https://threejs.org/docs/#api/en/core/Clock
var clock;

function main() {
	clock = new THREE.Clock();

	setupRenderer();
	setupScene();
	setupCamera();
	setupControls();
	setupSkybox();
	setupLights();

	buildGround();
	buildCabin();
	buildTrees();
	buildCampfire();
	buildFence();
	buildMountains();
	buildFelledLogs();
	buildPicnicTable();
	buildWelcomeSign();
	buildWaterTrough();
	buildRocks();
	buildWildflowers();
	buildSteppingStones();
	buildAxeInStump();
	buildFirewoodPile();
	buildCookingPot();
	buildChimney();
	buildLantern();
	buildSmokeParticles();
	loadBabe();
	loadPaulBunyan();
	loadCampingStuff();

	// resize the canvas with the window
	// https://threejs.org/manual/#en/responsive
	window.addEventListener('resize', onResize);

	// start the render loop
	requestAnimationFrame(tick);
}

function setupRenderer() {
	// renderer attached to the canvas-wrap div (Three.js manual: fundamentals)
	// https://threejs.org/manual/#en/fundamentals
	var wrap = document.getElementById('canvas-wrap');
	renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setSize(wrap.clientWidth, wrap.clientHeight);
	renderer.setPixelRatio(window.devicePixelRatio);
	wrap.appendChild(renderer.domElement);
}

function setupScene() {
	// holds every mesh and light
	scene = new THREE.Scene();
}

function setupCamera() {
	// perspective camera (Three.js manual: cameras)
	// https://threejs.org/manual/#en/cameras
	// (Matsuda Ch7 p.230: perspective projection matrix)
	// (Shirley Ch7: viewing transforms and perspective)
	var wrap = document.getElementById('canvas-wrap');
	var aspect = wrap.clientWidth / wrap.clientHeight;
	camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 500);
	camera.position.set(18, 10, 22);
	camera.lookAt(0, 2, 0);
}

function setupControls() {
	// orbit controls: drag to rotate, scroll to zoom, right-drag to pan
	// https://threejs.org/manual/#en/cameras
	// (Matsuda Ch7 p.252, Shirley Ch7)
	controls = new OrbitControls(camera, renderer.domElement);
	controls.target.set(0, 2, 0);
	controls.enableDamping = true;
	controls.dampingFactor = 0.08;

	// don't let the camera go below the ground
	controls.maxPolarAngle = Math.PI * 0.49;
	controls.update();
}

function setupSkybox() {
	// textured cubemap skybox, 6 painted canvases
	// https://threejs.org/manual/#en/backgrounds
	// (Matsuda Ch10 p.380, Shirley Ch11)
	var faces = [];
	for (var i = 0; i < 6; i++) {
		faces.push(makeSkyFace(i));
	}
	var cube = new THREE.CubeTexture(faces);
	cube.needsUpdate = true;
	scene.background = cube;
}

function makeSkyFace(faceIndex) {
	// paint a sky gradient + a few clouds to a canvas
	var size = 256;
	var canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;
	var ctx = canvas.getContext('2d');

	// bottom face is ground-colored so the horizon blends
	if (faceIndex === 3) {
		ctx.fillStyle = '#7d9c6d';
		ctx.fillRect(0, 0, size, size);
		return canvas;
	}

	// sky gradient (deep blue at top, lighter at horizon)
	var grad = ctx.createLinearGradient(0, 0, 0, size);
	grad.addColorStop(0, '#5fa6e0');
	grad.addColorStop(1, '#c8e3f0');
	ctx.fillStyle = grad;
	ctx.fillRect(0, 0, size, size);

	// cloud blobs
	ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
	for (var c = 0; c < 4; c++) {
		var cx = Math.random() * size;
		var cy = Math.random() * size * 0.7;
		var r = 16 + Math.random() * 28;
		ctx.beginPath();
		ctx.arc(cx, cy, r, 0, Math.PI * 2);
		ctx.arc(cx + r, cy, r * 0.7, 0, Math.PI * 2);
		ctx.arc(cx - r, cy + 4, r * 0.6, 0, Math.PI * 2);
		ctx.fill();
	}

	return canvas;
}

function setupLights() {
	// https://threejs.org/manual/#en/lights
	// (Matsuda Ch8, Shirley Ch10)

	// hemisphere light (sky + ground fill)
	hemi = new THREE.HemisphereLight(0x9ec9ff, 0x4a6a3d, 0.85);
	scene.add(hemi);

	// directional light (the sun)
	sun = new THREE.DirectionalLight(0xffe8c4, 1.0);
	sun.position.set(20, 30, 10);
	scene.add(sun);

	// point light at the campfire
	fireLight = new THREE.PointLight(0xff7a30, 1.8, 24);
	fireLight.position.set(0, 1.4, 0);
	scene.add(fireLight);
}

// helpers: build a primitive, add to scene, return the mesh
function addBox(x, y, z, w, h, d, mat) {
	var geo = new THREE.BoxGeometry(w, h, d);
	var mesh = new THREE.Mesh(geo, mat);
	mesh.position.set(x, y, z);
	scene.add(mesh);
	return mesh;
}

function addCylinder(x, y, z, rTop, rBot, h, mat, segments) {
	var geo = new THREE.CylinderGeometry(rTop, rBot, h, segments || 16);
	var mesh = new THREE.Mesh(geo, mat);
	mesh.position.set(x, y, z);
	scene.add(mesh);
	return mesh;
}

function addCone(x, y, z, r, h, mat, segments) {
	var geo = new THREE.ConeGeometry(r, h, segments || 16);
	var mesh = new THREE.Mesh(geo, mat);
	mesh.position.set(x, y, z);
	scene.add(mesh);
	return mesh;
}

function addSphere(x, y, z, r, mat) {
	var geo = new THREE.SphereGeometry(r, 12, 12);
	var mesh = new THREE.Mesh(geo, mat);
	mesh.position.set(x, y, z);
	scene.add(mesh);
	return mesh;
}

function buildGround() {
	// flat green ground plane (Matsuda Ch4 p.92, Shirley Ch6)
	var geo = new THREE.PlaneGeometry(80, 80);
	var mat = new THREE.MeshLambertMaterial({ color: 0x4a8a3d });
	var mesh = new THREE.Mesh(geo, mat);
	mesh.rotation.x = -Math.PI / 2;
	scene.add(mesh);
}

function buildCabin() {
	// log cabin, wood texture on the walls
	// https://threejs.org/manual/#en/textures
	var wallTex = makeWoodTexture();
	var wallMat = new THREE.MeshLambertMaterial({ map: wallTex });
	var roofMat = new THREE.MeshLambertMaterial({ color: 0x5a2f15 });

	var W = 6;
	var H = 4;
	var D = 5;
	var T = 0.25;
	var cx = -10;
	var cz = 0;

	// four walls
	addBox(cx, H / 2, cz - D / 2, W, H, T, wallMat);
	addBox(cx, H / 2, cz + D / 2, W, H, T, wallMat);
	addBox(cx - W / 2, H / 2, cz, T, H, D, wallMat);
	addBox(cx + W / 2, H / 2, cz, T, H, D, wallMat);

	// pyramid roof (4-sided cone, rotated 45 to line up with the walls)
	var roofGeo = new THREE.ConeGeometry(W * 0.78, 2.6, 4);
	var roof = new THREE.Mesh(roofGeo, roofMat);
	roof.position.set(cx, H + 1.3, cz);
	roof.rotation.y = Math.PI / 4;
	scene.add(roof);
}

function makeWoodTexture() {
	// wood grain painted to a canvas (Matsuda Ch10 p.345, Shirley Ch11)
	// https://threejs.org/manual/#en/textures
	var size = 256;
	var canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;
	var ctx = canvas.getContext('2d');

	// brown base
	ctx.fillStyle = '#7a4a1f';
	ctx.fillRect(0, 0, size, size);

	// horizontal log seams every 32 px
	for (var y = 0; y < size; y += 32) {
		ctx.fillStyle = '#5a3a18';
		ctx.fillRect(0, y, size, 2);
	}

	// short random streaks for grain noise
	ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
	for (var i = 0; i < 240; i++) {
		var x = Math.random() * size;
		var yy = Math.random() * size;
		var w = 4 + Math.random() * 18;
		ctx.fillRect(x, yy, w, 1);
	}

	// wrap so it tiles on larger faces
	var tex = new THREE.CanvasTexture(canvas);
	tex.wrapS = THREE.RepeatWrapping;
	tex.wrapT = THREE.RepeatWrapping;
	return tex;
}

function buildTrees() {
	// five pine trees (trunk cylinder + cone foliage)
	var trunkMat = new THREE.MeshLambertMaterial({ color: 0x5a3a1c });
	var foliageMat = new THREE.MeshLambertMaterial({ color: 0x2d5a2a });

	var positions = [
		[-6, -8],
		[4, -10],
		[10, -4],
		[8, 8],
		[-4, 9]
	];

	for (var i = 0; i < positions.length; i++) {
		var x = positions[i][0];
		var z = positions[i][1];
		var trunkH = 1.8;
		addCylinder(x, trunkH / 2, z, 0.3, 0.4, trunkH, trunkMat);
		addCone(x, trunkH + 1.6, z, 1.4, 3.2, foliageMat, 12);
	}
}

function buildCampfire() {
	// campfire: stone ring + log pile + animated flame cones
	var stoneMat = new THREE.MeshLambertMaterial({ color: 0x7a7a7a });
	var logMat = new THREE.MeshLambertMaterial({ color: 0x4a2810 });
	var flameOrange = new THREE.MeshBasicMaterial({ color: 0xff8a20 });
	var flameYellow = new THREE.MeshBasicMaterial({ color: 0xffd070 });

	// six stones in a ring
	for (var i = 0; i < 6; i++) {
		var ang = (i / 6) * Math.PI * 2;
		var rx = Math.cos(ang) * 1.1;
		var rz = Math.sin(ang) * 1.1;
		addSphere(rx, 0.25, rz, 0.35, stoneMat);
	}

	// three logs crisscrossed
	var l1 = addCylinder(0, 0.45, 0, 0.18, 0.18, 1.8, logMat);
	l1.rotation.z = Math.PI / 2;

	var l2 = addCylinder(0, 0.65, 0, 0.18, 0.18, 1.8, logMat);
	l2.rotation.x = Math.PI / 2;

	var l3 = addCylinder(0, 0.85, 0, 0.18, 0.18, 1.8, logMat);
	l3.rotation.z = Math.PI / 2;
	l3.rotation.y = Math.PI / 4;

	// three flame cones; references stashed in `flames` so tick() can animate them
	flames.push(addCone(0, 1.6, 0, 0.5, 1.4, flameOrange, 12));
	flames.push(addCone(0.15, 1.9, 0.1, 0.35, 1.1, flameYellow, 12));
	flames.push(addCone(-0.1, 1.7, -0.1, 0.32, 1.0, flameOrange, 12));
}

function buildFence() {
	// five fence posts in a row along the right side of the camp
	var postMat = new THREE.MeshLambertMaterial({ color: 0x4a3018 });
	var startX = 6;
	var startZ = 4;
	for (var i = 0; i < 5; i++) {
		addBox(startX + i * 1.3, 0.75, startZ, 0.2, 1.5, 0.2, postMat);
	}
}

function buildMountains() {
	// three large cones standing in the far background
	var mountMat = new THREE.MeshLambertMaterial({ color: 0x5a6a72 });
	addCone(-20, 6, -22, 8, 12, mountMat, 12);
	addCone(0, 7, -26, 10, 14, mountMat, 12);
	addCone(22, 5.5, -22, 7, 11, mountMat, 12);
}

function buildFelledLogs() {
	// three logs lying near the cabin (the work pile)
	var logMat = new THREE.MeshLambertMaterial({ color: 0x4a2810 });
	var l1 = addCylinder(-13, 0.3, 4, 0.3, 0.3, 2.4, logMat);
	l1.rotation.z = Math.PI / 2;

	var l2 = addCylinder(-13, 0.7, 4.2, 0.3, 0.3, 2.4, logMat);
	l2.rotation.z = Math.PI / 2;

	var l3 = addCylinder(-13.4, 0.5, 4.6, 0.3, 0.3, 2.4, logMat);
	l3.rotation.z = Math.PI / 2;
}

function buildPicnicTable() {
	// rustic picnic table near the campfire
	// (Three.js manual: fundamentals) https://threejs.org/manual/#en/fundamentals
	// (Matsuda Ch7 p.215: stacking 3D boxes)
	// (Shirley Ch6: translation matrices for placing each plank)
	var wood = new THREE.MeshLambertMaterial({ color: 0x8b6240 });
	var cx = -5;
	var cz = -3;

	// table top
	addBox(cx, 1.0, cz, 2.2, 0.1, 1.0, wood);

	// two bench planks running along the long sides
	addBox(cx, 0.55, cz - 0.7, 2.2, 0.08, 0.3, wood);
	addBox(cx, 0.55, cz + 0.7, 2.2, 0.08, 0.3, wood);

	// two A-frame leg pairs (one box each, runs across the bench width)
	addBox(cx - 1.0, 0.5, cz, 0.1, 1.0, 1.7, wood);
	addBox(cx + 1.0, 0.5, cz, 0.1, 1.0, 1.7, wood);
}

function buildWelcomeSign() {
	// post + plank sign with text painted onto a canvas texture
	// (Three.js manual: textures) https://threejs.org/manual/#en/textures
	// (Matsuda Ch10 p.345: texture mapping)
	// (Shirley Ch11: texture mapping fundamentals)
	var postMat = new THREE.MeshLambertMaterial({ color: 0x4a3018 });
	var plankMat = new THREE.MeshLambertMaterial({ map: makeSignTexture() });

	var cx = -7;
	var cz = 7;

	// tall vertical post
	addBox(cx, 1.2, cz, 0.15, 2.4, 0.15, postMat);

	// horizontal plank near the top with the painted text
	addBox(cx, 2.0, cz, 1.6, 0.5, 0.1, plankMat);
}

function makeSignTexture() {
	// canvas-painted sign with "WELCOME" text on a wood background
	// (Three.js manual: textures) https://threejs.org/manual/#en/textures
	// (Matsuda Ch10 p.345-360: canvas-as-texture)
	// (Shirley Ch11: image as a texture map)
	var size = 256;
	var canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;
	var ctx = canvas.getContext('2d');

	// wood background color
	ctx.fillStyle = '#7a4a1f';
	ctx.fillRect(0, 0, size, size);

	// horizontal grain lines
	ctx.fillStyle = '#5a3a18';
	for (var i = 0; i < 12; i++) {
		ctx.fillRect(0, 18 + i * 20, size, 1);
	}

	// short noisy streaks for grain
	ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
	for (var j = 0; j < 200; j++) {
		var x = Math.random() * size;
		var y = Math.random() * size;
		ctx.fillRect(x, y, 8 + Math.random() * 12, 1);
	}

	// welcome text in the middle
	ctx.fillStyle = '#fff8e6';
	ctx.font = 'bold 38px Arial';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText('WELCOME', size / 2, size / 2);

	return new THREE.CanvasTexture(canvas);
}

function buildWaterTrough() {
	// open-top wooden trough with water inside, near babe
	// (Three.js manual: fundamentals) https://threejs.org/manual/#en/fundamentals
	// (Matsuda Ch7 p.215: composing a shape from boxes)
	var wood = new THREE.MeshLambertMaterial({ color: 0x4a3018 });
	var water = new THREE.MeshLambertMaterial({ color: 0x3a78c8 });

	var cx = 5.5;
	var cz = 7.5;

	// bottom panel
	addBox(cx, 0.1, cz, 1.5, 0.1, 0.7, wood);

	// four walls
	addBox(cx, 0.32, cz - 0.35, 1.5, 0.42, 0.08, wood);
	addBox(cx, 0.32, cz + 0.35, 1.5, 0.42, 0.08, wood);
	addBox(cx - 0.75, 0.32, cz, 0.08, 0.42, 0.7, wood);
	addBox(cx + 0.75, 0.32, cz, 0.08, 0.42, 0.7, wood);

	// water surface inside the trough
	addBox(cx, 0.28, cz, 1.4, 0.18, 0.6, water);
}

function buildRocks() {
	// scattered rock spheres around the perimeter
	// (Shirley Ch6: placement transforms)
	var rockMat = new THREE.MeshLambertMaterial({ color: 0x6a6a6a });
	var spots = [
		[-15, 0.4, -3, 0.6],
		[12, 0.5, 2, 0.7],
		[6, 0.3, -8, 0.5],
		[-8, 0.35, -12, 0.55],
		[14, 0.4, 12, 0.6],
		[-15, 0.3, 9, 0.5]
	];
	for (var i = 0; i < spots.length; i++) {
		var s = spots[i];
		addSphere(s[0], s[1], s[2], s[3], rockMat);
	}
}

function buildWildflowers() {
	// wildflower clusters: thin cylinder stem + sphere blossom
	// (Matsuda Ch7 p.215: combining primitive types)
	// (Shirley Ch6: nested transformations)
	var stem = new THREE.MeshLambertMaterial({ color: 0x3a6a2d });
	var red = new THREE.MeshLambertMaterial({ color: 0xe8404a });
	var yellow = new THREE.MeshLambertMaterial({ color: 0xf0d040 });
	var white = new THREE.MeshLambertMaterial({ color: 0xf0f0e0 });

	var spots = [
		[3, -6, red],
		[-2, 8, yellow],
		[9, 3, white],
		[-12, -4, red],
		[11, -10, yellow]
	];
	for (var i = 0; i < spots.length; i++) {
		var fx = spots[i][0];
		var fz = spots[i][1];
		var bloomMat = spots[i][2];
		addCylinder(fx, 0.2, fz, 0.025, 0.025, 0.4, stem, 6);
		addSphere(fx, 0.45, fz, 0.1, bloomMat);
	}
}

function buildSteppingStones() {
	// flat round stones leading from the campfire toward the cabin door
	var stone = new THREE.MeshLambertMaterial({ color: 0x8a8a85 });
	for (var i = 0; i < 4; i++) {
		var x = -2.5 - i * 1.7;
		addCylinder(x, 0.06, 1.0, 0.5, 0.5, 0.1, stone, 8);
	}
}

function buildAxeInStump() {
	// chopping block with an axe stuck in it (very paul bunyan)
	// (Matsuda Ch7 p.215: composing a tool from boxes and cylinders)
	// (Shirley Ch6: rotation around the z axis for the tilt)
	var stumpSide = new THREE.MeshLambertMaterial({ color: 0x4a2810 });
	var stumpTop = new THREE.MeshLambertMaterial({ color: 0x8b5a30 });
	var handleMat = new THREE.MeshLambertMaterial({ color: 0x5a3a1c });
	var axeHead = new THREE.MeshLambertMaterial({ color: 0x70747a });

	var sx = -3.5;
	var sz = -8;

	// stump body
	addCylinder(sx, 0.4, sz, 0.55, 0.6, 0.8, stumpSide);

	// lighter exposed top of the stump (where it was cut)
	addCylinder(sx, 0.81, sz, 0.55, 0.55, 0.02, stumpTop);

	// axe handle tilted out of the stump
	var handle = addCylinder(sx + 0.18, 1.3, sz, 0.04, 0.04, 1.1, handleMat);
	handle.rotation.z = -Math.PI / 8;

	// axe head at the top of the handle
	var head = addBox(sx + 0.42, 1.78, sz, 0.32, 0.18, 0.08, axeHead);
	head.rotation.z = -Math.PI / 8;

	// a few wood chunks scattered on the ground around the stump
	var chunk = new THREE.MeshLambertMaterial({ color: 0x6a4520 });
	var chunkSpots = [
		[-2.5, -7.5, 0.18],
		[-4.3, -8.2, 0.16],
		[-3.0, -8.7, 0.20],
		[-4.8, -7.4, 0.18]
	];
	for (var i = 0; i < chunkSpots.length; i++) {
		var c = chunkSpots[i];
		var ch = addCylinder(c[0], c[2], c[1], c[2], c[2], 0.32, chunk);
		ch.rotation.z = Math.PI / 2;
		ch.rotation.y = i * 0.7;
	}
}

function buildFirewoodPile() {
	// neatly stacked firewood pile against the cabin
	// (Matsuda Ch9 p.323: arrays of repeated geometry)
	// (Shirley Ch6: translation matrices arranged in a grid)
	var logMat = new THREE.MeshLambertMaterial({ color: 0x5a3520 });
	var capMat = new THREE.MeshLambertMaterial({ color: 0x8b5a30 });
	var px = -10.5;
	var pz = -4;

	// stack: 4 logs across, 3 high
	for (var row = 0; row < 3; row++) {
		for (var col = 0; col < 4; col++) {
			var log = addCylinder(
				px + col * 0.36,
				0.20 + row * 0.34,
				pz,
				0.17, 0.17, 1.2,
				logMat
			);
			log.rotation.x = Math.PI / 2;

			// brighter end cap so the stack reads as cut wood
			var cap = addCylinder(
				px + col * 0.36,
				0.20 + row * 0.34,
				pz + 0.62,
				0.17, 0.17, 0.02,
				capMat
			);
			cap.rotation.x = Math.PI / 2;
		}
	}
}

function buildCookingPot() {
	// black iron pot suspended over the fire on a tripod of sticks
	// (Matsuda Ch7 p.215: combining boxes, cylinders, and spheres)
	var iron = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
	var stick = new THREE.MeshLambertMaterial({ color: 0x4a2810 });

	// two support sticks angled inward like an A-frame
	var s1 = addCylinder(0.95, 1.05, 0, 0.045, 0.045, 2.4, stick);
	s1.rotation.z = -Math.PI / 9;

	var s2 = addCylinder(-0.95, 1.05, 0, 0.045, 0.045, 2.4, stick);
	s2.rotation.z = Math.PI / 9;

	// horizontal cross bar that holds the pot
	var bar = addCylinder(0, 2.05, 0, 0.04, 0.04, 1.9, stick);
	bar.rotation.x = Math.PI / 2;

	// pot body: a slightly squashed sphere
	var pot = addSphere(0, 1.55, 0, 0.34, iron);
	pot.scale.y = 0.85;

	// small handle bar over the top
	var handle = addCylinder(0, 1.92, 0, 0.022, 0.022, 0.62, iron);
	handle.rotation.x = Math.PI / 2;
}

function buildChimney() {
	// brick chimney sitting on the roof of the cabin
	// (Matsuda Ch7 p.215: stacking boxes for architecture)
	var brick = new THREE.MeshLambertMaterial({ color: 0x8a4525 });
	addBox(-12, 5.0, 0, 0.6, 1.8, 0.6, brick);

	// stone cap on top
	var cap = new THREE.MeshLambertMaterial({ color: 0x555555 });
	addBox(-12, 5.95, 0, 0.75, 0.12, 0.75, cap);
}

function buildLantern() {
	// tall lantern post near the cabin entrance
	// (Matsuda Ch8 p.305: localized warm light source)
	var post = new THREE.MeshLambertMaterial({ color: 0x4a3018 });
	// emissive makes the lantern glow even when the sun is dim
	var glow = new THREE.MeshLambertMaterial({
		color: 0xffd070,
		emissive: 0xffaa30,
		emissiveIntensity: 0.6
	});

	// tall vertical pole
	addCylinder(-8, 1.8, 1.5, 0.08, 0.08, 3.6, post);

	// cross arm sticking out toward the cabin path
	addBox(-7.7, 3.4, 1.5, 0.7, 0.08, 0.08, post);

	// lantern box hanging from the arm
	addBox(-7.4, 2.85, 1.5, 0.28, 0.4, 0.28, glow);
}

function buildSmokeParticles() {
	// rising smoke puffs from the campfire and the cabin chimney
	// (Matsuda Ch10: transparency and material settings)
	// (Shirley Ch11: alpha blending for translucent media)

	// campfire smoke: six small puffs that rise + fade
	for (var i = 0; i < 6; i++) {
		var mat = new THREE.MeshLambertMaterial({
			color: 0xaaaaaa,
			transparent: true,
			opacity: 0.5
		});
		var s = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), mat);
		s.userData = { phase: i / 6, source: 'campfire', baseX: 0, baseZ: 0 };
		scene.add(s);
		smokeParticles.push(s);
	}

	// chimney smoke: four puffs from the roof
	for (var j = 0; j < 4; j++) {
		var mat2 = new THREE.MeshLambertMaterial({
			color: 0xbbbbbb,
			transparent: true,
			opacity: 0.6
		});
		var s2 = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), mat2);
		s2.userData = { phase: j / 4, source: 'chimney', baseX: -12, baseZ: 0 };
		scene.add(s2);
		smokeParticles.push(s2);
	}
}

function updateSmoke(t) {
	// drive each puff along its rising lifecycle
	// (Matsuda Ch4 p.91: time-driven motion)
	// (Shirley Ch16: simple particle animation)
	for (var i = 0; i < smokeParticles.length; i++) {
		var p = smokeParticles[i];
		var period = p.userData.source === 'campfire' ? 3.0 : 4.5;
		var startY = p.userData.source === 'campfire' ? 1.5 : 6.2;
		var phase = ((t / period) + p.userData.phase) % 1;

		// gentle horizontal drift
		p.position.x = p.userData.baseX + Math.sin(phase * Math.PI * 2 + i) * 0.3;
		p.position.z = p.userData.baseZ + Math.cos(phase * Math.PI * 2 + i) * 0.3;

		// rise
		p.position.y = startY + phase * 4.5;

		// grow as it rises
		var scale = 0.35 + phase * 1.0;
		p.scale.set(scale, scale, scale);

		// fade out toward the top
		var baseOpacity = p.userData.source === 'campfire' ? 0.5 : 0.6;
		p.material.opacity = baseOpacity * (1 - phase);
	}
}

function loadBabe() {
	// load the babe (ox) model from models/babe.glb
	// (Three.js manual: loading a gltf model)
	// https://threejs.org/docs/#examples/en/loaders/GLTFLoader
	// (Matsuda Ch10 p.395: loading external geometry)
	// (Shirley Ch12: data structures for 3D models)
	var loader = new GLTFLoader();
	loader.load(
		'models/babe.glb',
		function(gltf) {
			var babe = gltf.scene;
			babe.position.set(3, 0, 5);
			babe.scale.set(1.5, 1.5, 1.5);
			scene.add(babe);
		},
		undefined,
		function(err) {
			// fallback: a blue blocky ox so the scene still has babe
			// while the user gets a real model into models/babe.glb
			console.log('models/babe.glb not found, drawing a placeholder ox.');
			buildPlaceholderBabe();
		}
	);
}

function loadPaulBunyan() {
	// load the paul bunyan figure from models/paul_bunyan.glb
	// any textured glb counts for the rubric, animal or otherwise
	// https://threejs.org/docs/#examples/en/loaders/GLTFLoader
	var loader = new GLTFLoader();
	loader.load(
		'models/paul_bunyan.glb',
		function(gltf) {
			var paul = gltf.scene;
			// place him next to the campfire, facing the camera area
			paul.position.set(-2, 0, 3);
			paul.scale.set(2.0, 2.0, 2.0);
			paul.rotation.y = Math.PI * 0.25;
			scene.add(paul);
		},
		undefined,
		function(err) {
			// no fallback needed; the scene already has babe and is full
			console.log('models/paul_bunyan.glb not found yet, skipping.');
		}
	);
}

function loadCampingStuff() {
	// load the camping gear model (tent, lantern, etc.)
	// counts as the rubric's required textured 3D model
	// https://threejs.org/docs/#examples/en/loaders/GLTFLoader
	var loader = new GLTFLoader();
	loader.load(
		'models/camping_stuff.glb',
		function(gltf) {
			var camp = gltf.scene;
			// drop it near the cabin so it reads as part of the campsite
			camp.position.set(-6, 0, 4);
			camp.scale.set(1.5, 1.5, 1.5);
			camp.rotation.y = Math.PI * 0.15;
			scene.add(camp);
		},
		undefined,
		function(err) {
			console.log('models/camping_stuff.glb failed to load.');
		}
	);
}

// blocky babe placeholder, exact same proportions as asg2
// matches all the constants, colors, and the joint hierarchy
// (the asg2 default pose: every joint angle = 0)
function buildPlaceholderBabe() {
	// proportions copied from asg2.js
	var BODY_LEN = 1.40;
	var BODY_HEIGHT = 0.70;
	var BODY_WIDTH = 0.70;
	var BODY_Y = 0.56;
	var HEAD_SIZE_X = 0.45;
	var HEAD_SIZE_Y = 0.50;
	var HEAD_SIZE_Z = 0.55;
	var HEAD_OFFSET_Y = BODY_HEIGHT * 0.30;
	var SNOUT_SIZE_X = 0.25;
	var SNOUT_SIZE_Y = 0.28;
	var SNOUT_SIZE_Z = 0.38;
	var EAR_SIZE_X = 0.08;
	var EAR_SIZE_Y = 0.16;
	var EAR_SIZE_Z = 0.20;
	var EYE_SIZE = 0.05;
	var HORN_RADIUS = 0.07;
	var HORN_LEN = 0.40;
	var THIGH_LEN = 0.24;
	var THIGH_W = 0.18;
	var CALF_LEN = 0.22;
	var CALF_W = 0.16;
	var HOOF_H = 0.10;
	var HOOF_W = 0.20;
	var HOOF_D = 0.22;
	var TAIL_BASE_LEN = 0.24;
	var TAIL_BASE_W = 0.10;
	var TAIL_MID_LEN = 0.20;
	var TAIL_MID_W = 0.08;
	var TAIL_TIP_LEN = 0.14;
	var TAIL_TIP_W = 0.13;

	// colors converted from the asg2 rgba arrays to hex
	var matBody = new THREE.MeshLambertMaterial({ color: 0x4a8eeb });
	var matBelly = new THREE.MeshLambertMaterial({ color: 0x73b3f7 });
	var matHead = new THREE.MeshLambertMaterial({ color: 0x4585e0 });
	var matSnout = new THREE.MeshLambertMaterial({ color: 0xdba0a0 });
	var matNostril = new THREE.MeshLambertMaterial({ color: 0x734d4d });
	var matEye = new THREE.MeshLambertMaterial({ color: 0x0d0d0d });
	var matEar = new THREE.MeshLambertMaterial({ color: 0x664740 });
	var matHorn = new THREE.MeshLambertMaterial({ color: 0xf2e8c7 });
	var matHornTip = new THREE.MeshLambertMaterial({ color: 0x4d382e });
	var matHoof = new THREE.MeshLambertMaterial({ color: 0x1e1a15 });
	var matTail = new THREE.MeshLambertMaterial({ color: 0x4585e0 });
	var matTailTip = new THREE.MeshLambertMaterial({ color: 0x2e334d });

	// root group for the whole ox; this is where we place him in the scene
	var babe = new THREE.Group();
	babe.position.set(3, 0, 5);
	scene.add(babe);

	// body frame sits at hip height with the body box centered above
	// (asg2: bodyFrame.translate(0, BODY_Y + BODY_HEIGHT * 0.5, 0))
	var body = new THREE.Group();
	body.position.set(0, BODY_Y + BODY_HEIGHT * 0.5, 0);
	babe.add(body);

	// main body block
	var bodyMesh = new THREE.Mesh(
		new THREE.BoxGeometry(BODY_LEN, BODY_HEIGHT, BODY_WIDTH),
		matBody
	);
	body.add(bodyMesh);

	// lighter underbelly tucked just below the body center
	var belly = new THREE.Mesh(
		new THREE.BoxGeometry(BODY_LEN * 0.95, BODY_HEIGHT * 0.50, BODY_WIDTH * 0.96),
		matBelly
	);
	belly.position.y = -BODY_HEIGHT * 0.30;
	body.add(belly);

	// head pivot at the front-top of the body
	// (asg2: headFrame.translate(BODY_LEN * 0.5, HEAD_OFFSET_Y, 0))
	var head = new THREE.Group();
	head.position.set(BODY_LEN * 0.5, HEAD_OFFSET_Y, 0);
	body.add(head);

	// head cube offset forward from the pivot so it pivots at the neck
	var headMesh = new THREE.Mesh(
		new THREE.BoxGeometry(HEAD_SIZE_X, HEAD_SIZE_Y, HEAD_SIZE_Z),
		matHead
	);
	headMesh.position.x = HEAD_SIZE_X * 0.5;
	head.add(headMesh);

	// pink snout sticking out the front of the head
	var snout = new THREE.Mesh(
		new THREE.BoxGeometry(SNOUT_SIZE_X, SNOUT_SIZE_Y, SNOUT_SIZE_Z),
		matSnout
	);
	snout.position.set(HEAD_SIZE_X + SNOUT_SIZE_X * 0.5, -HEAD_SIZE_Y * 0.15, 0);
	head.add(snout);

	var sides = [+1, -1];

	// two dark nostril dots on the front of the snout
	for (var i = 0; i < 2; i++) {
		var sgn = sides[i];
		var nostril = new THREE.Mesh(
			new THREE.BoxGeometry(0.04, 0.05, 0.07),
			matNostril
		);
		nostril.position.set(
			HEAD_SIZE_X + SNOUT_SIZE_X * 0.95,
			-HEAD_SIZE_Y * 0.05,
			sgn * SNOUT_SIZE_Z * 0.20
		);
		head.add(nostril);
	}

	// two small black eye cubes (asg2 used cubes, not spheres)
	for (var i = 0; i < 2; i++) {
		var sgn = sides[i];
		var eye = new THREE.Mesh(
			new THREE.BoxGeometry(EYE_SIZE, EYE_SIZE, EYE_SIZE),
			matEye
		);
		eye.position.set(
			HEAD_SIZE_X * 0.95,
			HEAD_SIZE_Y * 0.20,
			sgn * (HEAD_SIZE_Z * 0.45)
		);
		head.add(eye);
	}

	// two brown ears splayed outward from above the head
	for (var i = 0; i < 2; i++) {
		var sgn = sides[i];
		var earGroup = new THREE.Group();
		earGroup.position.set(
			HEAD_SIZE_X * 0.20,
			HEAD_SIZE_Y * 0.45,
			sgn * (HEAD_SIZE_Z * 0.55)
		);
		earGroup.rotation.x = sgn * 25 * Math.PI / 180;
		head.add(earGroup);

		var ear = new THREE.Mesh(
			new THREE.BoxGeometry(EAR_SIZE_X, EAR_SIZE_Y, EAR_SIZE_Z),
			matEar
		);
		earGroup.add(ear);
	}

	// two longhorn-style horns, two cylinder segments each
	for (var i = 0; i < 2; i++) {
		buildPlaceholderHorn(head, sides[i],
			HEAD_SIZE_X, HEAD_SIZE_Y, HEAD_SIZE_Z,
			HORN_RADIUS, HORN_LEN, matHorn, matHornTip);
	}

	// four legs, three segments each (thigh, calf, hoof)
	var hipY = -BODY_HEIGHT * 0.5;
	var hipFx = +BODY_LEN * 0.34;
	var hipBx = -BODY_LEN * 0.34;
	var hipZ = BODY_WIDTH * 0.32;
	var legSpots = [
		[hipFx, +hipZ],
		[hipFx, -hipZ],
		[hipBx, +hipZ],
		[hipBx, -hipZ]
	];
	for (var i = 0; i < 4; i++) {
		buildPlaceholderLeg(body, legSpots[i][0], hipY, legSpots[i][1],
			THIGH_LEN, THIGH_W, CALF_LEN, CALF_W,
			HOOF_H, HOOF_W, HOOF_D, matHead, matHoof);
	}

	// tail: 3-segment chain off the rear of the body
	// (asg2: tailFrame.translate(-BODY_LEN/2, BODY_HEIGHT*0.10, 0) then rotate(35, Z))
	var tail = new THREE.Group();
	tail.position.set(-BODY_LEN * 0.5, BODY_HEIGHT * 0.10, 0);
	tail.rotation.z = 35 * Math.PI / 180;
	body.add(tail);

	var tailBase = new THREE.Mesh(
		new THREE.BoxGeometry(TAIL_BASE_LEN, TAIL_BASE_W, TAIL_BASE_W),
		matTail
	);
	tailBase.position.x = -TAIL_BASE_LEN * 0.5;
	tail.add(tailBase);

	// mid segment chained off the base
	var tailMidFrame = new THREE.Group();
	tailMidFrame.position.x = -TAIL_BASE_LEN;
	tailMidFrame.rotation.z = 15 * Math.PI / 180;
	tail.add(tailMidFrame);

	var tailMid = new THREE.Mesh(
		new THREE.BoxGeometry(TAIL_MID_LEN, TAIL_MID_W, TAIL_MID_W),
		matTail
	);
	tailMid.position.x = -TAIL_MID_LEN * 0.5;
	tailMidFrame.add(tailMid);

	// tip segment chained off the middle (dark tuft)
	var tailTipFrame = new THREE.Group();
	tailTipFrame.position.x = -TAIL_MID_LEN;
	tailMidFrame.add(tailTipFrame);

	var tailTip = new THREE.Mesh(
		new THREE.BoxGeometry(TAIL_TIP_LEN, TAIL_TIP_W, TAIL_TIP_W),
		matTailTip
	);
	tailTip.position.x = -TAIL_TIP_LEN * 0.5;
	tailTipFrame.add(tailTip);
}

// one longhorn horn: inner cylinder, outer cylinder with a kink, dark tip cube
// matches the asg2 drawHorn function
function buildPlaceholderHorn(head, sgn, HEAD_SIZE_X, HEAD_SIZE_Y, HEAD_SIZE_Z,
	HORN_RADIUS, HORN_LEN, matHorn, matHornTip) {
	// horn root on the temple
	var hornFrame = new THREE.Group();
	hornFrame.position.set(
		HEAD_SIZE_X * 0.05,
		HEAD_SIZE_Y * 0.45,
		sgn * (HEAD_SIZE_Z * 0.42)
	);

	// splay nearly horizontal outward (asg2 used rotate(sgn*78, X) then rotate(-12, Z))
	// with three.js default 'XYZ' euler order, setting rotation.x then rotation.z
	// applies them in the same effective order
	hornFrame.rotation.x = sgn * 78 * Math.PI / 180;
	hornFrame.rotation.z = -12 * Math.PI / 180;
	head.add(hornFrame);

	// inner half of the horn (thicker, closer to the head)
	var inner = new THREE.Mesh(
		new THREE.CylinderGeometry(HORN_RADIUS * 1.1, HORN_RADIUS * 1.1, HORN_LEN, 12),
		matHorn
	);
	inner.position.y = HORN_LEN * 0.5;
	hornFrame.add(inner);

	// kink point: nested group at the end of the inner cylinder
	// the outer half curves forward and a little upward (asg2 longhorn shape)
	var outerFrame = new THREE.Group();
	outerFrame.position.y = HORN_LEN;
	outerFrame.rotation.x = sgn * 8 * Math.PI / 180;
	outerFrame.rotation.z = -18 * Math.PI / 180;
	hornFrame.add(outerFrame);

	var outer = new THREE.Mesh(
		new THREE.CylinderGeometry(HORN_RADIUS * 0.85, HORN_RADIUS * 0.85, HORN_LEN, 12),
		matHorn
	);
	outer.position.y = HORN_LEN * 0.5;
	outerFrame.add(outer);

	// dark tip block at the very end
	var tip = new THREE.Mesh(
		new THREE.BoxGeometry(HORN_RADIUS * 1.4, HORN_RADIUS * 1.6, HORN_RADIUS * 1.4),
		matHornTip
	);
	tip.position.y = HORN_LEN;
	outerFrame.add(tip);
}

// one leg: three segments (thigh, calf, hoof) hanging straight down
// matches the asg2 drawLeg function with every joint angle at 0
function buildPlaceholderLeg(body, hipX, hipY, hipZ,
	THIGH_LEN, THIGH_W, CALF_LEN, CALF_W,
	HOOF_H, HOOF_W, HOOF_D, matLeg, matHoof) {
	var leg = new THREE.Group();
	leg.position.set(hipX, hipY, hipZ);
	body.add(leg);

	// thigh hangs below the hip
	var thigh = new THREE.Mesh(
		new THREE.BoxGeometry(THIGH_W, THIGH_LEN, THIGH_W),
		matLeg
	);
	thigh.position.y = -THIGH_LEN * 0.5;
	leg.add(thigh);

	// calf below the thigh
	var calf = new THREE.Mesh(
		new THREE.BoxGeometry(CALF_W, CALF_LEN, CALF_W),
		matLeg
	);
	calf.position.y = -THIGH_LEN - CALF_LEN * 0.5;
	leg.add(calf);

	// hoof at the bottom, slightly forward like in asg2
	var hoof = new THREE.Mesh(
		new THREE.BoxGeometry(HOOF_W, HOOF_H, HOOF_D),
		matHoof
	);
	hoof.position.set(HOOF_W * 0.10, -THIGH_LEN - CALF_LEN - HOOF_H * 0.5, 0);
	leg.add(hoof);
}

function onResize() {
	// keep the renderer and camera matched to the container size
	// https://threejs.org/manual/#en/responsive
	var wrap = document.getElementById('canvas-wrap');
	var w = wrap.clientWidth;
	var h = wrap.clientHeight;
	renderer.setSize(w, h);
	camera.aspect = w / h;
	camera.updateProjectionMatrix();
}

function tick() {
	var t = clock.getElapsedTime();

	updateFlames(t);
	updateSmoke(t);
	dayNightCycle(t);

	controls.update();
	renderer.render(scene, camera);
	requestAnimationFrame(tick);
}

function updateFlames(t) {
	// flicker each flame cone with a small sine wave
	// (Matsuda Ch4 p.91: time-driven scale animation)
	// (Shirley Ch6: non-uniform scale around the origin)
	for (var i = 0; i < flames.length; i++) {
		var f = flames[i];
		var s = 0.85 + Math.sin(t * (4 + i) + i) * 0.15;
		f.scale.y = s;
		f.scale.x = 1 + (1 - s) * 0.5;
		f.scale.z = 1 + (1 - s) * 0.5;
	}
}

// wow feature: day/night cycle
// sun moves on an arc, color shifts at sunset, fire takes over at night
// (Matsuda Ch4 p.91 introduces the per-frame animation pattern)
// (Shirley Ch6: rotating the sun position by a time-driven angle)
function dayNightCycle(t) {
	// one full day every 40 seconds
	// start the cycle at noon (Math.PI / 2) so the scene loads in daylight
	var period = 40;
	var ang = (t / period) * Math.PI * 2 + Math.PI / 2;
	var radius = 30;
	var y = Math.sin(ang) * radius;
	var x = Math.cos(ang) * radius;
	sun.position.set(x, y, 10);

	// "daylight" amount: 1 when sun is overhead, 0 when it's at or below horizon
	var day = Math.max(0, Math.sin(ang));

	// sun intensity has a floor so the scene never goes pitch black
	sun.intensity = 0.35 + day * 0.65;

	// hemisphere fill stays generous so detail is always readable
	hemi.intensity = 0.55 + day * 0.4;

	// near the horizon, lerp the sun color toward warm orange
	var horizon = Math.max(0, 1 - day) * day * 2;
	var r = 1.0;
	var g = 0.9 - horizon * 0.4;
	var b = 0.8 - horizon * 0.6;
	sun.color.setRGB(r, g, b);

	// campfire light gets brighter at night, but it's already strong all day
	fireLight.intensity = 1.2 + (1 - day) * 1.4;
}

// run main once the page has loaded
// https://www.w3schools.com/jsref/event_onload.asp
window.addEventListener('load', main);
