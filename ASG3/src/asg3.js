// Ueno Park at sunset first person voxel world with Babe the Blue Ox + friends
// textures Matsuda Ch5 p.146-181, perspective camera Matsuda Ch7 PerspectiveView_mvp p.222
// Babe carried over from ASG2 JointModel (Matsuda Ch9 p.323)

// vertex shader standard model * view * projection (Matsuda p.222)
var VSHADER_SOURCE = `
	attribute vec3 a_Position;
	attribute vec2 a_UV;
	attribute float a_Shade;
	uniform mat4 u_ModelMatrix;
	uniform mat4 u_ViewMatrix;
	uniform mat4 u_ProjectionMatrix;
	varying vec2 v_UV;
	varying float v_Shade;
	void main() {
		gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * vec4(a_Position, 1.0);
		v_UV = a_UV;
		v_Shade = a_Shade;
	}
`;

// fragment shader picks a sampler and lerps with base color (Matsuda p.183)
// u_LightOn lets the sky cube skip the per-face shading
var FSHADER_SOURCE = `
	precision mediump float;
	varying vec2 v_UV;
	varying float v_Shade;
	uniform vec4 u_BaseColor;
	uniform float u_TexColorWeight;
	uniform int u_WhichTex;
	uniform float u_LightOn;
	uniform sampler2D u_Sampler0;
	uniform sampler2D u_Sampler1;
	uniform sampler2D u_Sampler2;
	uniform sampler2D u_Sampler3;
	uniform sampler2D u_Sampler4;
	uniform sampler2D u_Sampler5;
	uniform sampler2D u_Sampler6;
	uniform sampler2D u_Sampler7;
	uniform sampler2D u_Sampler8;
	uniform sampler2D u_Sampler9;
	uniform sampler2D u_Sampler10;
	uniform sampler2D u_Sampler11;
	void main() {
		vec4 texColor = u_BaseColor;
		if (u_WhichTex == 0) texColor = texture2D(u_Sampler0, v_UV);
		else if (u_WhichTex == 1) texColor = texture2D(u_Sampler1, v_UV);
		else if (u_WhichTex == 2) texColor = texture2D(u_Sampler2, v_UV);
		else if (u_WhichTex == 3) texColor = texture2D(u_Sampler3, v_UV);
		else if (u_WhichTex == 4) texColor = texture2D(u_Sampler4, v_UV);
		else if (u_WhichTex == 5) texColor = texture2D(u_Sampler5, v_UV);
		else if (u_WhichTex == 6) texColor = texture2D(u_Sampler6, v_UV);
		else if (u_WhichTex == 7) texColor = texture2D(u_Sampler7, v_UV);
		else if (u_WhichTex == 8) texColor = texture2D(u_Sampler8, v_UV);
		else if (u_WhichTex == 9) texColor = texture2D(u_Sampler9, v_UV);
		else if (u_WhichTex == 10) texColor = texture2D(u_Sampler10, v_UV);
		else if (u_WhichTex == 11) texColor = texture2D(u_Sampler11, v_UV);
		vec4 mixed = (1.0 - u_TexColorWeight) * u_BaseColor + u_TexColorWeight * texColor;
		float shade = u_LightOn > 0.5 ? v_Shade : 1.0;
		gl_FragColor = vec4(mixed.rgb * shade, mixed.a);
	}
`;

var gl;
var canvas;

// shader handle bundle
var attribs = { position: -1, uv: -1, shade: -1 };
var uniforms = {
	modelMatrix: null, viewMatrix: null, projectionMatrix: null,
	baseColor: null, texColorWeight: null, whichTex: null,
	lightOn: null,
	samplers: []
};

var IDENTITY = new Matrix4();

// warm coral-pink so the whole scene reads as golden hour
var COLOR_SKY_TOP = [1.00, 0.55, 0.50, 1.0];
var COLOR_SKY_BOTTOM = [1.00, 0.55, 0.50, 1.0];

var camera;
var world;

// extra solid obstacles outside the voxel grid (currently just the two tori pillars)
// each entry is {minX, maxX, minZ, maxZ, minY, maxY} for the player + animal collision check
var EXTRA_OBSTACLES = [
	{ minX: 21.7, maxX: 22.3, minZ: 23.7, maxZ: 24.3, minY: 0, maxY: 6 },
	{ minX: 25.7, maxX: 26.3, minZ: 23.7, maxZ: 24.3, minY: 0, maxY: 6 }
];

// helper does a point or column overlap any extra obstacle box?
function obstaclesContain(x, z, yMin, yMax) {
	for (var i = 0; i < EXTRA_OBSTACLES.length; i++) {
		var o = EXTRA_OBSTACLES[i];
		if (x >= o.minX && x <= o.maxX && z >= o.minZ && z <= o.maxZ && yMax >= o.minY && yMin <= o.maxY) {
			return true;
		}
	}
	return false;
}

// each animal has a base spot, a live position, a walk pace, a roam radius, and a phase offset
// the deer herd hangs by the temple, the foxes and panda are spread to the other corners of the park
var animals = [
	{ name: 'ox',     base: { x: 33.0, z: 38.0 }, pos: { x: 33.0, z: 38.0 }, yaw: 180, pace: 0.18, radius: 1.6, phase: 0.0 },
	{ name: 'fox',    base: { x: 15.0, z: 33.0 }, pos: { x: 15.0, z: 33.0 }, yaw: -120, pace: 0.50, radius: 1.4, phase: 1.2 },
	{ name: 'foxKit', base: { x: 33.0, z: 25.0 }, pos: { x: 33.0, z: 25.0 }, yaw: 140, pace: 0.65, radius: 1.0, phase: 2.4 },
	{ name: 'deer',   base: { x: 21.5, z: 17.5 }, pos: { x: 21.5, z: 17.5 }, yaw: 80, pace: 0.28, radius: 1.1, phase: 0.0 },
	{ name: 'deer',   base: { x: 23.5, z: 17.0 }, pos: { x: 23.5, z: 17.0 }, yaw: 80, pace: 0.28, radius: 0.9, phase: 1.4 },
	{ name: 'deer',   base: { x: 20.0, z: 19.0 }, pos: { x: 20.0, z: 19.0 }, yaw: 80, pace: 0.28, radius: 1.0, phase: 2.7 },
	{ name: 'deer',   base: { x: 22.5, z: 19.5 }, pos: { x: 22.5, z: 19.5 }, yaw: 80, pace: 0.28, radius: 0.8, phase: 4.1 },
	{ name: 'deer',   base: { x: 24.5, z: 18.5 }, pos: { x: 24.5, z: 18.5 }, yaw: 80, pace: 0.28, radius: 1.0, phase: 5.3 },
	{ name: 'panda',  base: { x: 4.5, z: 25.0 }, pos: { x: 4.5, z: 25.0 }, yaw: -60, pace: 0.18, radius: 1.2, phase: 0.8 }
];

// look up an animal by name (used by petting)
function getAnimal(name) {
	for (var i = 0; i < animals.length; i++) {
		if (animals[i].name === name) return animals[i];
	}
	return null;
}

var keysDown = {};

var MOVE_SPEED = 0.18;
var TURN_SPEED = 3.5;
// camera eye is pinned to this y value after every move so you cannot fly or fall through the ground
var WALK_HEIGHT = 1.7;

var g_startTime = 0;
var g_seconds = 0;
var g_lastFrameTime = 0;

// counter and cooldown for the petting / feeding interactions
var g_petCount = 0;
var g_petCooldown = 0;
// timestamp of the most recent pet; babe stays sitting for SIT_DURATION seconds afterward
var g_petReactStart = -100;
var SIT_DURATION = 10.0;
var PET_PULSE = 1.4;

// deer feeding state
var g_fedCount = 0;
var g_feedReactStart = -100;
var g_fedDeerIndex = -1;

// joint angles driving the ox auto animation
var g_jointAngles = {
	head_yaw: 0, head_pitch: 0,
	tail_1: 0, tail_2: 0, tail_3: 0,
	fl_thigh: 0, fl_calf: 0, fl_hoof: 0,
	fr_thigh: 0, fr_calf: 0, fr_hoof: 0,
	bl_thigh: 0, bl_calf: 0, bl_hoof: 0,
	br_thigh: 0, br_calf: 0, br_hoof: 0
};

function main() {
	setupWebGL();
	connectVariablesToGLSL();
	setupGeometry();
	setupTextures();
	setupInput();

	camera = new Camera(canvas);

	world = new World();
	world.rebuildMesh(gl);

	g_startTime = performance.now();
	requestAnimationFrame(tick);
}

function setupWebGL() {
	canvas = document.getElementById('webgl');
	gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
	if (!gl) {
		console.log('Failed to get the rendering context for WebGL');
		return;
	}
	// depth test so closer cubes occlude farther ones (Matsuda p.219)
	gl.enable(gl.DEPTH_TEST);
	gl.clearColor(COLOR_SKY_BOTTOM[0], COLOR_SKY_BOTTOM[1], COLOR_SKY_BOTTOM[2], 1.0);
}

function connectVariablesToGLSL() {
	if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
		console.log('Failed to initialize shaders.');
		return;
	}

	// attribute and uniform handles (Matsuda p.40 + p.58)
	attribs.position = gl.getAttribLocation(gl.program, 'a_Position');
	attribs.uv = gl.getAttribLocation(gl.program, 'a_UV');
	attribs.shade = gl.getAttribLocation(gl.program, 'a_Shade');

	uniforms.modelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
	uniforms.viewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
	uniforms.projectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
	uniforms.baseColor = gl.getUniformLocation(gl.program, 'u_BaseColor');
	uniforms.texColorWeight = gl.getUniformLocation(gl.program, 'u_TexColorWeight');
	uniforms.whichTex = gl.getUniformLocation(gl.program, 'u_WhichTex');
	uniforms.lightOn = gl.getUniformLocation(gl.program, 'u_LightOn');

	// one sampler uniform per texture unit (Matsuda p.183)
	for (var i = 0; i < 12; i++) {
		uniforms.samplers.push(gl.getUniformLocation(gl.program, 'u_Sampler' + i));
	}
}

function setupGeometry() {
	Cube.init(gl);
	Cylinder.init(gl, 24);
}

// load every texture and bind each to its own texture unit (Matsuda p.169-178)
function setupTextures() {
	var files = [
		'textures/grass.png',
		'textures/dirt.png',
		'textures/stone.png',
		'textures/bark.png',
		'textures/blossom.png',
		'textures/red.png',
		'textures/black.png',
		'textures/gold.png',
		'textures/wood.png',
		'textures/cream.png',
		'textures/teal.png',
		'textures/charcoal.png'
	];

	for (var i = 0; i < files.length; i++) {
		loadTextureToUnit(files[i], i);
	}
}

// create a gl texture, bind it to TEXTURE_unit, and point the sampler uniform at that unit
function loadTextureToUnit(src, unit) {
	var img = new Image();
	img.onload = function() {
		var tex = gl.createTexture();
		gl.activeTexture(gl.TEXTURE0 + unit);
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
		gl.useProgram(gl.program);
		gl.uniform1i(uniforms.samplers[unit], unit);
	};
	img.onerror = function() {
		console.log('Failed to load texture: ' + src);
	};
	img.src = src;
}

// keyboard + mouse listeners
function setupInput() {
	window.addEventListener('keydown', function(ev) {
		var k = ev.key.toLowerCase();
		keysDown[k] = true;
		if (k === 'f') addBlockInFront();
		if (k === 'g') removeBlockInFront();
		if (ev.key === ' ') tryInteract();
		// stop the page from scrolling when the arrow keys are used for camera control
		if (k === 'arrowleft' || k === 'arrowright' || k === 'arrowup' || k === 'arrowdown') {
			ev.preventDefault();
		}
	});
	window.addEventListener('keyup', function(ev) {
		keysDown[ev.key.toLowerCase()] = false;
	});

	// mouse drag rotates the camera
	var dragging = false;
	var lastX = 0, lastY = 0;
	canvas.addEventListener('mousedown', function(ev) {
		dragging = true;
		lastX = ev.clientX;
		lastY = ev.clientY;
	});
	window.addEventListener('mouseup', function() { dragging = false; });
	window.addEventListener('mousemove', function(ev) {
		if (!dragging) return;
		var dx = ev.clientX - lastX;
		var dy = ev.clientY - lastY;
		lastX = ev.clientX;
		lastY = ev.clientY;
		camera.mouseYaw(dx);
		camera.mousePitch(dy);
	});

	// plain click adds a block, shift-click removes it
	canvas.addEventListener('click', function(ev) {
		if (ev.shiftKey) removeBlockInFront();
		else addBlockInFront();
	});
}

// drop a dirt block on top of the stack two units in front of the camera
function addBlockInFront() {
	var t = camera.frontBlock(1.5);
	world.addBlock(t.x, t.z, BLOCK_DIRT);
	updateHud();
}

// remove the top block from the stack two units in front of the camera
function removeBlockInFront() {
	var t = camera.frontBlock(1.5);
	world.removeBlock(t.x, t.z);
	updateHud();
}

// space pets babe if you are close to him, otherwise feeds the nearest deer
function tryInteract() {
	if (g_petCooldown > 0) return;
	var camX = camera.eye.elements[0];
	var camZ = camera.eye.elements[2];

	var ox = getAnimal('ox');
	if (ox) {
		var oxDx = camX - ox.pos.x;
		var oxDz = camZ - ox.pos.z;
		if (Math.hypot(oxDx, oxDz) < 3) {
			g_petCount++;
			g_petCooldown = 0.5;
			g_petReactStart = g_seconds;
			updateHud();
			return;
		}
	}

	var nearestIdx = -1;
	var nearestDist = 3.0;
	for (var i = 0; i < animals.length; i++) {
		if (animals[i].name !== 'deer') continue;
		var ddx = camX - animals[i].pos.x;
		var ddz = camZ - animals[i].pos.z;
		var dd = Math.hypot(ddx, ddz);
		if (dd < nearestDist) {
			nearestDist = dd;
			nearestIdx = i;
		}
	}
	if (nearestIdx >= 0) {
		g_fedCount++;
		g_fedDeerIndex = nearestIdx;
		g_feedReactStart = g_seconds;
		g_petCooldown = 0.5;
		updateHud();
	}
}

function updateHud() {
	var petsLine = document.getElementById('hud-pets');
	var tipLine = document.getElementById('hud-tip');
	if (petsLine) petsLine.textContent = 'pets: ' + g_petCount + '   deer fed: ' + g_fedCount;
	if (tipLine) {
		var dtSit = g_seconds - g_petReactStart;
		var dtFeed = g_seconds - g_feedReactStart;
		if (dtFeed >= 0 && dtFeed < PET_PULSE) {
			tipLine.textContent = 'deer is munching <3';
		} else if (dtSit >= 0 && dtSit < SIT_DURATION) {
			tipLine.textContent = 'babe is sitting happy <3';
		} else if (g_petCount === 0 && g_fedCount === 0) {
			tipLine.textContent = 'walk close and press space';
		} else {
			tipLine.textContent = 'space to pet babe or feed a deer';
		}
	}
}

// per-frame loop (Matsuda Ch9 p.96 tick pattern)
function tick(now) {
	g_seconds = (now - g_startTime) / 1000;

	pollMovement();
	updateOxAnimation();
	updateAnimalWalking(g_seconds);
	if (g_petCooldown > 0) g_petCooldown -= (now - g_lastFrameTime) / 1000;
	updateHud();

	renderScene();
	updateFps(now);
	requestAnimationFrame(tick);
}

// poll keyboard state every frame so movement feels continuous
function pollMovement() {
	if (keysDown['w']) tryMove(function() { camera.moveForward(MOVE_SPEED); });
	if (keysDown['s']) tryMove(function() { camera.moveBackwards(MOVE_SPEED); });
	if (keysDown['a']) tryMove(function() { camera.moveLeft(MOVE_SPEED); });
	if (keysDown['d']) tryMove(function() { camera.moveRight(MOVE_SPEED); });
	if (keysDown['q']) camera.panLeft(TURN_SPEED);
	if (keysDown['e']) camera.panRight(TURN_SPEED);

	// arrow keys mirror Q/E for yaw and add keyboard pitch on up/down
	if (keysDown['arrowleft']) camera.panLeft(TURN_SPEED);
	if (keysDown['arrowright']) camera.panRight(TURN_SPEED);
	if (keysDown['arrowup']) camera.mousePitch(-7);
	if (keysDown['arrowdown']) camera.mousePitch(7);
}

// run the camera move and undo it if the new position would clip a solid block
function tryMove(moveFn) {
	var sxx = camera.eye.elements[0];
	var syy = camera.eye.elements[1];
	var szz = camera.eye.elements[2];
	var saxx = camera.at.elements[0];
	var sayy = camera.at.elements[1];
	var sazz = camera.at.elements[2];
	moveFn();

	// snap the eye back to WALK_HEIGHT and slide the at point by the same delta so the look direction stays put
	var dy = camera.eye.elements[1] - WALK_HEIGHT;
	if (dy !== 0) {
		camera.eye.elements[1] = WALK_HEIGHT;
		camera.at.elements[1] -= dy;
		camera.updateView();
	}

	var ex = camera.eye.elements[0];
	var ey = camera.eye.elements[1];
	var ez = camera.eye.elements[2];
	if (collidesAt(ex, ey, ez)) {
		camera.eye.elements[0] = sxx;
		camera.eye.elements[1] = syy;
		camera.eye.elements[2] = szz;
		camera.at.elements[0] = saxx;
		camera.at.elements[1] = sayy;
		camera.at.elements[2] = sazz;
		camera.updateView();
	}
}

// true if any solid block or extra obstacle touches the player at (x, y, z)
function collidesAt(x, y, z) {
	if (!world) return false;
	var radius = 0.3;
	var corners = [
		[x - radius, z - radius],
		[x + radius, z - radius],
		[x - radius, z + radius],
		[x + radius, z + radius]
	];
	var topY = Math.floor(y);
	for (var i = 0; i < corners.length; i++) {
		var bx = Math.floor(corners[i][0]);
		var bz = Math.floor(corners[i][1]);
		for (var by = 0; by <= topY; by++) {
			if (world.isSolid(bx, by, bz)) return true;
		}
		if (obstaclesContain(corners[i][0], corners[i][1], 0, y)) return true;
	}
	return false;
}

// trot gait while walking, happy sit pose during the pet reaction window
function updateOxAnimation() {
	var t = g_seconds;
	var dtPet = t - g_petReactStart;
	var sitting = dtPet >= 0 && dtPet < SIT_DURATION;

	if (sitting) {
		// happy sit back legs tucked under, front legs slightly bent, head tilts up at the camera
		g_jointAngles.fl_thigh = 0;
		g_jointAngles.fl_calf = -35;
		g_jointAngles.fl_hoof = 0;
		g_jointAngles.fr_thigh = 0;
		g_jointAngles.fr_calf = -35;
		g_jointAngles.fr_hoof = 0;
		g_jointAngles.bl_thigh = 30;
		g_jointAngles.bl_calf = -75;
		g_jointAngles.bl_hoof = 0;
		g_jointAngles.br_thigh = 30;
		g_jointAngles.br_calf = -75;
		g_jointAngles.br_hoof = 0;

		g_jointAngles.head_yaw = Math.sin(dtPet * 6) * 6;
		g_jointAngles.head_pitch = 18 + Math.sin(dtPet * 7) * 4;
		g_jointAngles.tail_1 = Math.sin(dtPet * 12) * 20;
		g_jointAngles.tail_2 = Math.sin(dtPet * 12 + 0.6) * 28;
		g_jointAngles.tail_3 = Math.sin(dtPet * 12 + 1.2) * 38;
		return;
	}

	var swing = Math.sin(t * 4.0) * 22;
	var bend = Math.max(0, -Math.sin(t * 4.0)) * 35;
	var bendOpp = Math.max(0, Math.sin(t * 4.0)) * 35;
	var hoofWiggle = Math.sin(t * 4.0 + 0.4) * 8;

	g_jointAngles.fl_thigh = swing;
	g_jointAngles.fl_calf = -bend;
	g_jointAngles.fl_hoof = hoofWiggle;
	g_jointAngles.br_thigh = swing;
	g_jointAngles.br_calf = -bend;
	g_jointAngles.br_hoof = hoofWiggle;
	g_jointAngles.fr_thigh = -swing;
	g_jointAngles.fr_calf = -bendOpp;
	g_jointAngles.fr_hoof = -hoofWiggle;
	g_jointAngles.bl_thigh = -swing;
	g_jointAngles.bl_calf = -bendOpp;
	g_jointAngles.bl_hoof = -hoofWiggle;

	g_jointAngles.tail_1 = Math.sin(t * 2.5) * 18;
	g_jointAngles.tail_2 = Math.sin(t * 2.5 + 0.6) * 28;
	g_jointAngles.tail_3 = Math.sin(t * 2.5 + 1.2) * 35;

	g_jointAngles.head_yaw = Math.sin(t * 1.3) * 5;
	g_jointAngles.head_pitch = Math.sin(t * 2.6) * 4;
}

// returns a y offset for babe a quick dip down, hold for SIT_DURATION, then a smooth stand-up
function getOxBounce(t) {
	var dt = t - g_petReactStart;
	if (dt < 0 || dt >= SIT_DURATION) return 0;
	var sitDepth = -0.30;
	if (dt < 0.2) return sitDepth * (dt / 0.2);
	var standStart = SIT_DURATION - 0.2;
	if (dt > standStart) return sitDepth * ((SIT_DURATION - dt) / 0.2);
	return sitDepth;
}

// move every animal around its base spot and face the travel direction
// position only commits if the next spot is clear of blocks; gait swing always ticks
function updateAnimalWalking(t) {
	var dtPet = t - g_petReactStart;
	var oxSitting = dtPet >= 0 && dtPet < SIT_DURATION;
	var dtFeed = t - g_feedReactStart;
	var feedingActive = dtFeed >= 0 && dtFeed < PET_PULSE;

	for (var i = 0; i < animals.length; i++) {
		var a = animals[i];

		// babe stays put and faces the camera while he is sitting
		if (a.name === 'ox' && oxSitting) {
			var dx = camera.eye.elements[0] - a.pos.x;
			var dz = camera.eye.elements[2] - a.pos.z;
			a.yaw = Math.atan2(-dz, dx) * 180 / Math.PI;
			a.swing = 0;
			continue;
		}

		// the fed deer also freezes and turns toward the camera while it is eating
		if (i === g_fedDeerIndex && feedingActive) {
			var fdx = camera.eye.elements[0] - a.pos.x;
			var fdz = camera.eye.elements[2] - a.pos.z;
			a.yaw = Math.atan2(-fdz, fdx) * 180 / Math.PI;
			a.swing = 0;
			continue;
		}

		var angle = t * a.pace + a.phase;
		var newX = a.base.x + Math.cos(angle) * a.radius;
		var newZ = a.base.z + Math.sin(angle) * a.radius;
		if (!animalCollidesAt(newX, newZ)) {
			a.pos.x = newX;
			a.pos.z = newZ;
			var vx = -Math.sin(angle);
			var vz = Math.cos(angle);
			a.yaw = Math.atan2(-vz, vx) * 180 / Math.PI;
		}
		var gaitT = t * (a.pace * 7);
		a.swing = Math.sin(gaitT) * 28;
	}
}

// true if any solid block or extra obstacle touches the animal at body height (y=0..1)
function animalCollidesAt(x, z) {
	if (!world) return false;
	var radius = 0.45;
	var corners = [
		[x - radius, z - radius],
		[x + radius, z - radius],
		[x - radius, z + radius],
		[x + radius, z + radius]
	];
	for (var i = 0; i < corners.length; i++) {
		var bx = Math.floor(corners[i][0]);
		var bz = Math.floor(corners[i][1]);
		if (world.isSolid(bx, 0, bz)) return true;
		if (world.isSolid(bx, 1, bz)) return true;
		if (obstaclesContain(corners[i][0], corners[i][1], 0, 2)) return true;
	}
	return false;
}

function updateFps(now) {
	var dt = now - g_lastFrameTime;
	g_lastFrameTime = now;
	var fps = dt > 0 ? Math.round(1000 / dt) : 0;
	var el = document.getElementById('fps');
	if (el) el.textContent = 'fps: ' + fps;
}

function renderScene() {
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// upload the camera matrices once per frame (Matsuda p.222)
	gl.uniformMatrix4fv(uniforms.viewMatrix, false, camera.viewMatrix.elements);
	gl.uniformMatrix4fv(uniforms.projectionMatrix, false, camera.projectionMatrix.elements);
	gl.uniform1f(uniforms.lightOn, 1.0);

	drawSky();
	drawGround();
	drawPath();
	world.draw(gl, attribs, uniforms, IDENTITY);
	drawTori();
	drawAnimals();
	drawPetHeart();
	drawArms();
}

// gigantic cube around the world painted with a solid sunset color, no face shading
function drawSky() {
	gl.depthMask(false);
	gl.uniform1f(uniforms.lightOn, 0.0);
	var m = new Matrix4();
	m.translate(world.SIZE / 2, 0, world.SIZE / 2);
	m.scale(900, 900, 900);
	Cube.draw(gl, attribs, uniforms, m, {
		color: COLOR_SKY_TOP,
		texNum: 0,
		texWeight: 0
	});
	gl.uniform1f(uniforms.lightOn, 1.0);
	gl.depthMask(true);
}

// flattened cube acting as the textured grass ground plane
function drawGround() {
	var m = new Matrix4();
	m.translate(world.SIZE / 2, -0.05, world.SIZE / 2);
	m.scale(world.SIZE, 0.1, world.SIZE);
	Cube.draw(gl, attribs, uniforms, m, {
		color: [1, 1, 1, 1],
		texNum: 0,
		texWeight: 1
	});
}

// thin solid-grey slab laid flush over the grass for the path
function drawPath() {
	var m = new Matrix4();
	m.translate(24.5, 0.02, 29);
	m.scale(1.6, 0.04, 30);
	Cube.draw(gl, attribs, uniforms, m, {
		color: [0.55, 0.55, 0.58, 1.0],
		texNum: 0,
		texWeight: 0
	});
}

// tall slim tori gate drawn outside the voxel grid so the pillars can be thinner than 1 block
// pillars are 0.6 thick and 6 tall, top beams sweep upward at the ends, gold plaque in the center
function drawTori() {
	var TORI_CX = 24;
	var TORI_CZ = 24;
	var PILLAR_W = 0.6;
	var PILLAR_H = 6.0;
	var BEAM_H = 0.5;
	var RED = [0.85, 0.18, 0.16, 1.0];
	var GOLD = [0.92, 0.74, 0.20, 1.0];

	// two vertical pillars
	var pillarOffsets = [-2.2, 2.2];
	for (var p = 0; p < 2; p++) {
		var m = new Matrix4();
		m.translate(TORI_CX + pillarOffsets[p], PILLAR_H * 0.5, TORI_CZ);
		m.scale(PILLAR_W, PILLAR_H, PILLAR_W);
		Cube.draw(gl, attribs, uniforms, m, { color: RED, texNum: 0, texWeight: 0 });
	}

	// nuki lower crossbar tucked between the pillars
	var nuki = new Matrix4();
	nuki.translate(TORI_CX, PILLAR_H - 0.55, TORI_CZ);
	nuki.scale(5.2, BEAM_H, PILLAR_W * 0.9);
	Cube.draw(gl, attribs, uniforms, nuki, { color: RED, texNum: 0, texWeight: 0 });

	// kasagi top beam wider than the pillars
	var kasagi = new Matrix4();
	kasagi.translate(TORI_CX, PILLAR_H + 0.25, TORI_CZ);
	kasagi.scale(7.0, BEAM_H + 0.1, PILLAR_W);
	Cube.draw(gl, attribs, uniforms, kasagi, { color: RED, texNum: 0, texWeight: 0 });

	// shimaki thinner topping above the kasagi
	var top = new Matrix4();
	top.translate(TORI_CX, PILLAR_H + 0.7, TORI_CZ);
	top.scale(7.6, BEAM_H * 0.6, PILLAR_W * 0.85);
	Cube.draw(gl, attribs, uniforms, top, { color: RED, texNum: 0, texWeight: 0 });

	// upward-swept sharp tips at each end of the top beam
	var tipOffsets = [-3.6, 3.6];
	for (var t = 0; t < 2; t++) {
		var tipBase = new Matrix4();
		tipBase.translate(TORI_CX + tipOffsets[t], PILLAR_H + 0.55, TORI_CZ);
		tipBase.scale(0.7, 0.55, PILLAR_W);
		Cube.draw(gl, attribs, uniforms, tipBase, { color: RED, texNum: 0, texWeight: 0 });

		var tipUp = new Matrix4();
		tipUp.translate(TORI_CX + tipOffsets[t] * 1.12, PILLAR_H + 1.05, TORI_CZ);
		tipUp.scale(0.5, 0.55, PILLAR_W * 0.9);
		Cube.draw(gl, attribs, uniforms, tipUp, { color: RED, texNum: 0, texWeight: 0 });
	}

	// gold plaque hanging in the center of the kasagi
	var plaque = new Matrix4();
	plaque.translate(TORI_CX, PILLAR_H + 0.25, TORI_CZ + PILLAR_W * 0.45);
	plaque.scale(0.6, 0.7, 0.08);
	Cube.draw(gl, attribs, uniforms, plaque, { color: GOLD, texNum: 0, texWeight: 0 });
}

// first-person blocky arms hanging in the camera's view
// builds the inverse view matrix from eye / at / up so we can place cubes in camera-local space
// when babe was petted recently the arms swing forward in a little patting motion
function drawArms() {
	var ex = camera.eye.elements[0];
	var ey = camera.eye.elements[1];
	var ez = camera.eye.elements[2];
	var ax = camera.at.elements[0];
	var ay = camera.at.elements[1];
	var az = camera.at.elements[2];

	var fx = ax - ex, fy = ay - ey, fz = az - ez;
	var fl = Math.hypot(fx, fy, fz) || 1;
	fx /= fl; fy /= fl; fz /= fl;

	// right = forward x worldUp; here worldUp is (0,1,0) so this simplifies
	var rx = fy * 0 - fz * 1;
	var ry = fz * 0 - fx * 0;
	var rz = fx * 1 - fy * 0;
	var rl = Math.hypot(rx, ry, rz) || 1;
	rx /= rl; ry /= rl; rz /= rl;

	// up = right x forward (keeps the basis right-handed)
	var ux = ry * fz - rz * fy;
	var uy = rz * fx - rx * fz;
	var uz = rx * fy - ry * fx;

	// camera-to-world matrix written directly into a Matrix4
	var camToWorld = new Matrix4();
	var e = camToWorld.elements;
	e[0] = rx; e[1] = ry; e[2] = rz; e[3] = 0;
	e[4] = ux; e[5] = uy; e[6] = uz; e[7] = 0;
	e[8] = -fx; e[9] = -fy; e[10] = -fz; e[11] = 0;
	e[12] = ex; e[13] = ey; e[14] = ez; e[15] = 1;

	// pet punch arms swing forward then return
	var dt = g_seconds - g_petReactStart;
	var punch = 0;
	var tilt = 0;
	if (dt >= 0 && dt < 0.6) {
		var p = dt / 0.6;
		punch = Math.sin(p * Math.PI) * 0.35;
		tilt = Math.sin(p * Math.PI) * 40;
	}

	// each arm an upper sleeve cube and a smaller hand cube at the tip
	var SKIN = [0.96, 0.82, 0.70, 1.0];
	var SLEEVE = [0.45, 0.28, 0.55, 1.0];
	var sides = [-1, +1];
	for (var i = 0; i < 2; i++) {
		var sgn = sides[i];

		var arm = new Matrix4(camToWorld);
		arm.translate(sgn * 0.28, -0.28, -0.55 - punch);
		arm.rotate(-20 - tilt, 1, 0, 0);
		arm.scale(0.12, 0.12, 0.45);
		Cube.draw(gl, attribs, uniforms, arm, { color: SLEEVE, texNum: 0, texWeight: 0 });

		var hand = new Matrix4(camToWorld);
		hand.translate(sgn * 0.28, -0.38 - tilt * 0.005, -0.85 - punch);
		hand.scale(0.14, 0.14, 0.14);
		Cube.draw(gl, attribs, uniforms, hand, { color: SKIN, texNum: 0, texWeight: 0 });
	}
}

// blocky hearts one over babe each time he is petted, one over the fed deer when fed
// each is 6 cubes that float right above the animal's head and slowly spin over PET_PULSE seconds
function drawPetHeart() {
	var ox = getAnimal('ox');
	if (ox) drawHeartAt(ox.pos.x, 1.7 + getOxBounce(g_seconds), ox.pos.z, g_petReactStart);
	if (g_fedDeerIndex >= 0 && g_fedDeerIndex < animals.length) {
		var d = animals[g_fedDeerIndex];
		drawHeartAt(d.pos.x, 2.3, d.pos.z, g_feedReactStart);
	}
}

// shared heart drawer 6 red cubes spinning at (x, y, z) for the PET_PULSE window after startTime
function drawHeartAt(x, y, z, startTime) {
	var dt = g_seconds - startTime;
	if (dt < 0 || dt >= PET_PULSE) return;

	var progress = dt / PET_PULSE;
	var heartY = y + progress * 0.35;
	var spin = progress * 360;
	var s = 0.08;

	var heartFrame = new Matrix4();
	heartFrame.translate(x, heartY, z);
	heartFrame.rotate(spin, 0, 1, 0);

	var HEART_RED = [1.0, 0.25, 0.40, 1.0];
	var parts = [
		[-1.0, 1.4, 1.0, 1.0, 1.0],
		[+1.0, 1.4, 1.0, 1.0, 1.0],
		[0.0, 0.6, 3.0, 1.0, 1.0],
		[0.0, -0.4, 2.0, 1.0, 1.0],
		[0.0, -1.3, 1.0, 1.0, 1.0],
		[0.0, 1.6, 1.0, 1.0, 1.0]
	];
	for (var i = 0; i < parts.length; i++) {
		var p = parts[i];
		var m = new Matrix4(heartFrame);
		m.translate(p[0] * s, p[1] * s, 0);
		m.scale(p[2] * s, p[3] * s, p[4] * s);
		Cube.draw(gl, attribs, uniforms, m, { color: HEART_RED, texNum: 0, texWeight: 0 });
	}
}

// place every animal in the world using its current walk-cycle position
// the fed deer also tilts its whole body forward so the head dips down to eat
function drawAnimals() {
	var dtFeed = g_seconds - g_feedReactStart;
	var feedingActive = dtFeed >= 0 && dtFeed < PET_PULSE;

	for (var i = 0; i < animals.length; i++) {
		var a = animals[i];
		var m = new Matrix4();
		var yLift = (a.name === 'ox') ? getOxBounce(g_seconds) : 0;
		m.translate(a.pos.x, yLift, a.pos.z);
		m.rotate(a.yaw, 0, 1, 0);

		if (i === g_fedDeerIndex && feedingActive) {
			var tilt = -Math.sin(dtFeed / PET_PULSE * Math.PI) * 28;
			m.rotate(tilt, 0, 0, 1);
		}

		if (a.name === 'foxKit') m.scale(0.65, 0.65, 0.65);
		drawAnimal(a.name, m, a.swing || 0);
	}
}

// pick the right draw function for each animal name and pass its trot swing
function drawAnimal(name, m, swing) {
	if (name === 'ox') drawOx(gl, attribs, uniforms, m, g_jointAngles);
	else if (name === 'fox' || name === 'foxKit') drawFox(gl, attribs, uniforms, m, swing);
	else if (name === 'deer') drawDeer(gl, attribs, uniforms, m, swing);
	else if (name === 'panda') drawPanda(gl, attribs, uniforms, m, swing);
}

// shader compilation utilities (cuon-utils, Matsuda Appendix C)
function initShaders(gl, vshader, fshader) {
	var program = createProgram(gl, vshader, fshader);
	if (!program) {
		console.log('Failed to create program');
		return false;
	}
	gl.useProgram(program);
	gl.program = program;
	return true;
}

function createProgram(gl, vshader, fshader) {
	var vertexShader = loadShader(gl, gl.VERTEX_SHADER, vshader);
	var fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fshader);
	if (!vertexShader || !fragmentShader) return null;

	var program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);
	var linked = gl.getProgramParameter(program, gl.LINK_STATUS);
	if (!linked) {
		console.log('Failed to link program: ' + gl.getProgramInfoLog(program));
		gl.deleteProgram(program);
		return null;
	}
	return program;
}

function loadShader(gl, type, source) {
	var shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	var compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
	if (!compiled) {
		console.log('Failed to compile shader: ' + gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
		return null;
	}
	return shader;
}

// kick off main when the page is fully loaded
window.addEventListener('load', main);
