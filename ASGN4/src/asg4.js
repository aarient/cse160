// asg4.js - Phong Lighting on Blue Ox
// lighting from Shirley "Fundamentals of Computer Graphics" 2nd Ed Ch 9

// vertex shader (textbook p.394-395)
// normal matrix is inverse transpose of model matrix (textbook p.154-157)
var VSHADER_SOURCE =
	'attribute vec4 a_Position;\n' +
	'attribute vec4 a_Normal;\n' +
	'uniform mat4 u_ModelMatrix;\n' +
	'uniform mat4 u_NormalMatrix;\n' +
	'uniform mat4 u_ViewMatrix;\n' +
	'uniform mat4 u_ProjectionMatrix;\n' +
	'varying vec3 v_Position;\n' +
	'varying vec3 v_Normal;\n' +
	'void main() {\n' +
	'  gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;\n' +
	'  v_Position = vec3(u_ModelMatrix * a_Position);\n' +
	'  v_Normal = normalize(vec3(u_NormalMatrix * a_Normal));\n' +
	'}\n';

// fragment shader - Phong lighting (textbook p.194-196)
// https://www.geeksforgeeks.org/html/how-to-implement-lighting-in-webgl/
var FSHADER_SOURCE =
	'precision mediump float;\n' +
	'varying vec3 v_Position;\n' +
	'varying vec3 v_Normal;\n' +
	'uniform vec4 u_Color;\n' +
	'uniform vec3 u_LightPos;\n' +
	'uniform vec3 u_LightColor;\n' +
	'uniform vec3 u_CameraPos;\n' +
	'uniform bool u_LightOn;\n' +
	'uniform bool u_NormalViz;\n' +
	'uniform bool u_SpotOn;\n' +
	'uniform vec3 u_SpotPos;\n' +
	'uniform vec3 u_SpotDir;\n' +
	'uniform float u_SpotCutoff;\n' +
	'void main() {\n' +
	// normal viz maps xyz to rgb
	'  if (u_NormalViz) {\n' +
	'    gl_FragColor = vec4((v_Normal + 1.0) / 2.0, 1.0);\n' +
	'    return;\n' +
	'  }\n' +
	// no lighting, just flat color
	'  if (!u_LightOn) {\n' +
	'    gl_FragColor = u_Color;\n' +
	'    return;\n' +
	'  }\n' +
	// ambient: k_a * c_light (textbook p.193 Eq 9.3)
	'  vec3 ambient = u_LightColor * u_Color.rgb * 0.2;\n' +
	// diffuse: k_d * c_light * max(n.l, 0) (textbook p.191-192 Eq 9.1)
	'  vec3 lightDir = normalize(u_LightPos - v_Position);\n' +
	'  float nDotL = max(dot(lightDir, v_Normal), 0.0);\n' +
	'  vec3 diffuse = u_LightColor * u_Color.rgb * nDotL * 0.7;\n' +
	// specular: k_s * c_light * max(r.v, 0)^p (textbook p.194-196 Eq 9.5)
	'  vec3 viewDir = normalize(u_CameraPos - v_Position);\n' +
	'  vec3 reflectDir = reflect(-lightDir, v_Normal);\n' +
	'  float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);\n' +
	'  vec3 specular = u_LightColor * spec * 0.5;\n' +
	'  vec3 result = ambient + diffuse + specular;\n' +
	// spotlight adds extra light inside the cone
	'  if (u_SpotOn) {\n' +
	'    vec3 spotLightDir = normalize(u_SpotPos - v_Position);\n' +
	'    float spotNDotL = max(dot(spotLightDir, v_Normal), 0.0);\n' +
	'    float spotAngle = dot(-spotLightDir, normalize(u_SpotDir));\n' +
	'    if (spotAngle > u_SpotCutoff) {\n' +
	'      float intensity = (spotAngle - u_SpotCutoff) / (1.0 - u_SpotCutoff);\n' +
	'      result += vec3(1.0, 0.9, 0.7) * u_Color.rgb * spotNDotL * intensity * 0.8;\n' +
	'      vec3 spotReflect = reflect(-spotLightDir, v_Normal);\n' +
	'      float spotSpec = pow(max(dot(viewDir, spotReflect), 0.0), 32.0);\n' +
	'      result += vec3(1.0, 0.9, 0.7) * spotSpec * intensity * 0.4;\n' +
	'    }\n' +
	'  }\n' +
	'  gl_FragColor = vec4(result, u_Color.a);\n' +
	'}\n';

var gl, canvas;

// https://www.geeksforgeeks.org/html/how-to-implement-lighting-in-webgl/
// keep shader locations in one object
var programInfo = {
	attribs: { position: null, normal: null },
	uniforms: {}
};

// https://www.geeksforgeeks.org/javascript/how-to-optimize-webgl-performance/
// group related state into objects
var camera = { angleY: -25, angleX: 15, dist: 2.8 };

var light = {
	x: 0.0, y: 2.0, z: 1.0,
	r: 1.0, g: 1.0, b: 1.0,
	on: true
};

var spot = { on: false, x: 0.0, y: 3.0, z: 0.0 };

var g_normalViz = false;
var g_animOn = true;
var g_startTime = 0;
var g_seconds = 0;
var g_lastFrameTime = 0;

// mouse drag state
var drag = { active: false, lastX: 0, lastY: 0 };

// ox joint angles (standing still)
var anim = {
	head_yaw: 0, head_pitch: 0,
	tail_1: 5, tail_2: 12, tail_3: 18,
	fl_thigh: 0, fl_calf: 0, fl_hoof: 0,
	fr_thigh: 0, fr_calf: 0, fr_hoof: 0,
	bl_thigh: 0, bl_calf: 0, bl_hoof: 0,
	br_thigh: 0, br_calf: 0, br_hoof: 0
};

// ox body sizes (from ASG2)
var BODY_LEN = 1.40, BODY_HEIGHT = 0.70, BODY_WIDTH = 0.70;
var BODY_Y = 0.56;

var HEAD_SIZE_X = 0.45, HEAD_SIZE_Y = 0.50, HEAD_SIZE_Z = 0.55;
var HEAD_OFFSET_Y = BODY_HEIGHT * 0.30;
var SNOUT_SIZE_X = 0.25, SNOUT_SIZE_Y = 0.28, SNOUT_SIZE_Z = 0.38;

var EAR_SIZE_X = 0.08, EAR_SIZE_Y = 0.16, EAR_SIZE_Z = 0.20;
var EYE_SIZE = 0.05;
var HORN_RADIUS = 0.07, HORN_LEN = 0.40;

var THIGH_LEN = 0.24, THIGH_W = 0.18;
var CALF_LEN = 0.22, CALF_W = 0.16;
var HOOF_H = 0.10, HOOF_W = 0.20, HOOF_D = 0.22;

var TAIL_BASE_LEN = 0.24, TAIL_BASE_W = 0.10;
var TAIL_MID_LEN = 0.20, TAIL_MID_W = 0.08;
var TAIL_TIP_LEN = 0.14, TAIL_TIP_W = 0.13;

// ox colors
var COLOR_BODY    = [0.29, 0.56, 0.92, 1.0];
var COLOR_BELLY   = [0.45, 0.70, 0.97, 1.0];
var COLOR_HEAD    = [0.27, 0.52, 0.88, 1.0];
var COLOR_SNOUT   = [0.86, 0.62, 0.62, 1.0];
var COLOR_EAR     = [0.40, 0.28, 0.25, 1.0];
var COLOR_EYE     = [0.05, 0.05, 0.05, 1.0];
var COLOR_HORN    = [0.95, 0.91, 0.78, 1.0];
var COLOR_HORNTIP = [0.30, 0.22, 0.18, 1.0];
var COLOR_HOOF    = [0.12, 0.10, 0.08, 1.0];
var COLOR_TAIL    = [0.27, 0.52, 0.88, 1.0];
var COLOR_TAILTIP = [0.18, 0.20, 0.30, 1.0];
var COLOR_NOSTRIL = [0.45, 0.30, 0.30, 1.0];

// scene object colors
var COLOR_GRASS  = [0.30, 0.55, 0.25, 1.0];
var COLOR_SPHERE = [0.85, 0.25, 0.25, 1.0];
var COLOR_LIGHT  = [1.0, 1.0, 0.5, 1.0];
var COLOR_OBJ    = [0.7, 0.5, 0.3, 1.0];

// sakura tree colors (cherry tree from ASG3 World.js)
var COLOR_BARK    = [0.40, 0.26, 0.13, 1.0];
var COLOR_BLOSSOM = [0.95, 0.65, 0.76, 1.0];

var WORLD_SCALE = 0.52;

// setup

function main() {
	setupWebGL();
	setupShaders();
	setupGeometry();
	setupUI();
	setupMouse();

	// https://www.geeksforgeeks.org/javascript/how-to-optimize-webgl-performance/
	g_startTime = performance.now();
	requestAnimationFrame(tick);
}

function setupWebGL() {
	canvas = document.getElementById('webgl');
	// https://www.w3schools.com/graphics/webgl_drawing.asp
	gl = canvas.getContext('webgl');
	if (!gl) {
		console.log('Failed to get WebGL context');
		return;
	}
	gl.enable(gl.DEPTH_TEST);
	gl.clearColor(0.69, 0.86, 0.96, 1.0);
}

function setupShaders() {
	if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
		console.log('Failed to init shaders');
		return;
	}

	var p = gl.program;

	// https://www.geeksforgeeks.org/html/how-to-implement-lighting-in-webgl/
	// save attrib and uniform locations
	programInfo.attribs.position = gl.getAttribLocation(p, 'a_Position');
	programInfo.attribs.normal   = gl.getAttribLocation(p, 'a_Normal');

	// grab all uniforms at once
	var names = [
		'u_ModelMatrix', 'u_NormalMatrix', 'u_ViewMatrix', 'u_ProjectionMatrix',
		'u_Color', 'u_LightPos', 'u_LightColor', 'u_CameraPos',
		'u_LightOn', 'u_NormalViz',
		'u_SpotOn', 'u_SpotPos', 'u_SpotDir', 'u_SpotCutoff'
	];
	// https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getUniformLocation
	for (var i = 0; i < names.length; i++) {
		programInfo.uniforms[names[i]] = gl.getUniformLocation(p, names[i]);
	}
}

function setupGeometry() {
	Cube.init(gl);
	Sphere.init(gl, 20, 20);
	Cylinder.init(gl, 24);
}

// UI wiring

function setupUI() {
	// light position
	linkSlider('slider-light-x', 'val-light-x', function(v) { light.x = v; });
	linkSlider('slider-light-y', 'val-light-y', function(v) { light.y = v; });
	linkSlider('slider-light-z', 'val-light-z', function(v) { light.z = v; });

	// light color (slider 0-100 maps to 0-1)
	linkSlider('slider-light-r', 'val-light-r', function(v) { light.r = v / 100; });
	linkSlider('slider-light-g', 'val-light-g', function(v) { light.g = v / 100; });
	linkSlider('slider-light-b', 'val-light-b', function(v) { light.b = v / 100; });

	// camera orbit
	linkSlider('slider-cam-y', 'val-cam-y', function(v) { camera.angleY = v; });
	linkSlider('slider-cam-x', 'val-cam-x', function(v) { camera.angleX = v; });

	// spotlight position
	linkSlider('slider-spot-x', 'val-spot-x', function(v) { spot.x = v; });
	linkSlider('slider-spot-y', 'val-spot-y', function(v) { spot.y = v; });
	linkSlider('slider-spot-z', 'val-spot-z', function(v) { spot.z = v; });

	// toggle buttons
	hookBtn('btn-light-on',  function() { light.on = true; });
	hookBtn('btn-light-off', function() { light.on = false; });
	hookBtn('btn-norm-on',   function() { g_normalViz = true; });
	hookBtn('btn-norm-off',  function() { g_normalViz = false; });
	hookBtn('btn-anim-on',   function() { g_animOn = true; });
	hookBtn('btn-anim-off',  function() { g_animOn = false; });
	hookBtn('btn-spot-on',   function() { spot.on = true; });
	hookBtn('btn-spot-off',  function() { spot.on = false; });

	// obj file picker
	var objInput = document.getElementById('obj-file');
	if (objInput) {
		objInput.addEventListener('change', function(ev) {
			var file = ev.target.files[0];
			if (!file) return;
			var reader = new FileReader();
			reader.onload = function(e) { ObjModel.load(gl, e.target.result); };
			reader.readAsText(file);
		});
	}
}

// hook up a button click
function hookBtn(id, fn) {
	var el = document.getElementById(id);
	if (el) el.onclick = fn;
}

// hook up a slider to its label and update function
function linkSlider(sliderId, labelId, callback) {
	var slider = document.getElementById(sliderId);
	var label = document.getElementById(labelId);
	if (!slider || !label) return;

	var update = function() {
		var v = parseFloat(slider.value);
		label.textContent = String(Math.round(v * 100) / 100);
		callback(v);
	};
	slider.addEventListener('input', update);
	update();
}

// mouse drag for camera orbit

function setupMouse() {
	canvas.addEventListener('mousedown', function(ev) {
		drag.active = true;
		drag.lastX = ev.clientX;
		drag.lastY = ev.clientY;
	});
	canvas.addEventListener('mouseup', function() {
		drag.active = false;
	});
	canvas.addEventListener('mousemove', function(ev) {
		if (!drag.active) return;
		camera.angleY += (ev.clientX - drag.lastX) * 0.5;
		camera.angleX += (ev.clientY - drag.lastY) * 0.5;
		drag.lastX = ev.clientX;
		drag.lastY = ev.clientY;
	});
}

// render loop

function tick(now) {
	g_seconds = (now - g_startTime) / 1000;
	updateAnimation();
	renderScene();

	// fps counter
	var dt = now - g_lastFrameTime;
	g_lastFrameTime = now;
	var fpsEl = document.getElementById('fps');
	if (fpsEl) fpsEl.textContent = 'fps: ' + (dt > 0 ? Math.round(1000 / dt) : 0);

	requestAnimationFrame(tick);
}

function updateAnimation() {
	if (!g_animOn) return;
	var t = g_seconds;

	// spin the point light in a circle
	light.x = 1.5 * Math.cos(t);
	light.z = 1.5 * Math.sin(t);

	// keep sliders in sync with animated light pos
	var sx = document.getElementById('slider-light-x');
	var sz = document.getElementById('slider-light-z');
	if (sx) sx.value = light.x;
	if (sz) sz.value = light.z;
	var lx = document.getElementById('val-light-x');
	var lz = document.getElementById('val-light-z');
	if (lx) lx.textContent = light.x.toFixed(1);
	if (lz) lz.textContent = light.z.toFixed(1);
}

// scene rendering

function renderScene() {
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	var u = programInfo.uniforms;

	// camera position from orbit angles
	var radY = camera.angleY * Math.PI / 180;
	var radX = camera.angleX * Math.PI / 180;
	var camX = camera.dist * Math.sin(radY) * Math.cos(radX);
	var camY = camera.dist * Math.sin(radX);
	var camZ = camera.dist * Math.cos(radY) * Math.cos(radX);

	// projection
	var projMat = new Matrix4();
	projMat.setPerspective(60, canvas.width / canvas.height, 0.1, 100);
	gl.uniformMatrix4fv(u.u_ProjectionMatrix, false, projMat.elements);

	// view
	var viewMat = new Matrix4();
	viewMat.setLookAt(camX, camY, camZ, 0.2, 0.25, 0, 0, 1, 0);
	gl.uniformMatrix4fv(u.u_ViewMatrix, false, viewMat.elements);

	// pass camera pos for specular (textbook p.194 Eq 9.5)
	gl.uniform3f(u.u_CameraPos, camX, camY, camZ);

	// pass light data
	gl.uniform3f(u.u_LightPos, light.x, light.y, light.z);
	gl.uniform3f(u.u_LightColor, light.r, light.g, light.b);
	gl.uniform1i(u.u_LightOn, light.on);
	gl.uniform1i(u.u_NormalViz, g_normalViz);

	// spotlight (http://math.hws.edu/graphicsbook/c7/s2.html section 7.2.6)
	gl.uniform1i(u.u_SpotOn, spot.on);
	gl.uniform3f(u.u_SpotPos, spot.x, spot.y, spot.z);
	gl.uniform3f(u.u_SpotDir, 0.0, -1.0, 0.0);
	gl.uniform1f(u.u_SpotCutoff, Math.cos(25.0 * Math.PI / 180.0));

	// small cube at light position so you can see it
	var lm = new Matrix4();
	lm.translate(light.x, light.y, light.z);
	lm.scale(0.1, 0.1, 0.1);
	drawCube(lm, COLOR_LIGHT);

	// spotlight marker
	if (spot.on) {
		var sm = new Matrix4();
		sm.translate(spot.x, spot.y, spot.z);
		sm.scale(0.08, 0.08, 0.08);
		drawCube(sm, [1.0, 0.9, 0.3, 1.0]);
	}

	// ground
	var gm = new Matrix4();
	gm.translate(0, -0.01, 0);
	gm.scale(3.5, 0.02, 3.5);
	drawCube(gm, COLOR_GRASS);

	// sphere beside the ox to show lighting
	var sphM = new Matrix4();
	sphM.translate(1.1, 0.46, 0.25);
	sphM.scale(0.45, 0.45, 0.45);
	drawSphere(sphM, COLOR_SPHERE);

	// OBJ model shows up here when loaded
	if (ObjModel.loaded) {
		var om = new Matrix4();
		om.translate(0.55, 0.5, -0.6);
		om.scale(0.8, 0.8, 0.8);
		drawObjModel(om, COLOR_OBJ);
	}

	// sakura tree behind babe (cherry tree from ASG3 World.js placeCherryTree)
	drawSakuraTree(-0.85, 0, -0.35);

	// draw Babe facing the camera
	var oxBase = new Matrix4();
	oxBase.translate(-0.35, 0.0, 0);
	oxBase.rotate(-90, 0, 1, 0);
	oxBase.scale(WORLD_SCALE, WORLD_SCALE, WORLD_SCALE);
	drawOx(oxBase);
}

// https://webglfundamentals.org/webgl/lessons/webgl-drawing-multiple-things.html
// draw wrappers - set uniforms per object then draw

function drawCube(m, c) {
	var a = programInfo.attribs, u = programInfo.uniforms;
	Cube.draw(gl, a.position, a.normal, u.u_ModelMatrix, u.u_NormalMatrix, m, c, u.u_Color);
}
function drawSphere(m, c) {
	var a = programInfo.attribs, u = programInfo.uniforms;
	Sphere.draw(gl, a.position, a.normal, u.u_ModelMatrix, u.u_NormalMatrix, m, c, u.u_Color);
}
function drawCylinder(m, c) {
	var a = programInfo.attribs, u = programInfo.uniforms;
	Cylinder.draw(gl, a.position, a.normal, u.u_ModelMatrix, u.u_NormalMatrix, m, c, u.u_Color);
}
function drawObjModel(m, c) {
	var a = programInfo.attribs, u = programInfo.uniforms;
	ObjModel.draw(gl, a.position, a.normal, u.u_ModelMatrix, u.u_NormalMatrix, m, c, u.u_Color);
}

// sakura tree from ASG3 World.js placeCherryTree

function drawSakuraTree(tx, ty, tz) {
	var blk = 0.22;

	// trunk: 4 bark cubes stacked
	for (var i = 0; i < 4; i++) {
		var tm = new Matrix4();
		tm.translate(tx, ty + blk * 0.5 + blk * i, tz);
		tm.scale(blk, blk, blk);
		drawCube(tm, COLOR_BARK);
	}

	// darker and lighter pink for the leaves
	var PINK_DARK  = [0.88, 0.48, 0.63, 1.0];
	var PINK_LIGHT = [0.98, 0.75, 0.83, 1.0];

	// https://developer.mozilla.org/en-US/docs/Games/Techniques/Tilemaps
	// canopy layers get smaller going up for triangle shape
	var baseY = ty + blk * 4;

	// layer 0 (bottom): wide cross shape
	var layer0 = [
		[-2,0],[-1,-1],[-1,0],[-1,1],[0,-2],[0,-1],[0,0],[0,1],[0,2],
		[1,-1],[1,0],[1,1],[2,0]
	];
	for (var i = 0; i < layer0.length; i++) {
		var bm = new Matrix4();
		bm.translate(tx + layer0[i][0] * blk, baseY + blk * 0.5, tz + layer0[i][1] * blk);
		bm.scale(blk, blk, blk);
		drawCube(bm, COLOR_BLOSSOM);
	}

	// layer 1: 3x3 full grid
	for (var dx = -1; dx <= 1; dx++) {
		for (var dz = -1; dz <= 1; dz++) {
			var bm = new Matrix4();
			bm.translate(tx + dx * blk, baseY + blk * 1.5, tz + dz * blk);
			bm.scale(blk, blk, blk);
			drawCube(bm, PINK_DARK);
		}
	}

	// layer 2: plus shape
	var layer2 = [[0,0],[1,0],[-1,0],[0,1],[0,-1]];
	for (var i = 0; i < layer2.length; i++) {
		var bm = new Matrix4();
		bm.translate(tx + layer2[i][0] * blk, baseY + blk * 2.5, tz + layer2[i][1] * blk);
		bm.scale(blk, blk, blk);
		drawCube(bm, PINK_LIGHT);
	}

	// layer 3: single top cap
	var topM = new Matrix4();
	topM.translate(tx, baseY + blk * 3.5, tz);
	topM.scale(blk, blk, blk);
	drawCube(topM, PINK_LIGHT);
}

// ox drawing (hierarchy from ASG2)

function drawOx(baseM) {
	var bodyFrame = new Matrix4(baseM);
	bodyFrame.translate(0, BODY_Y + BODY_HEIGHT * 0.5, 0);

	// body
	var bm = new Matrix4(bodyFrame);
	bm.scale(BODY_LEN, BODY_HEIGHT, BODY_WIDTH);
	drawCube(bm, COLOR_BODY);

	// lighter belly underneath
	var bellyM = new Matrix4(bodyFrame);
	bellyM.translate(0, -BODY_HEIGHT * 0.30, 0);
	bellyM.scale(BODY_LEN * 0.95, BODY_HEIGHT * 0.50, BODY_WIDTH * 0.96);
	drawCube(bellyM, COLOR_BELLY);

	drawOxHead(bodyFrame);

	// four legs
	var hipY  = -BODY_HEIGHT * 0.5;
	var hipFx =  BODY_LEN * 0.34;
	var hipBx = -BODY_LEN * 0.34;
	var hipZ  =  BODY_WIDTH * 0.32;

	drawLeg(bodyFrame, hipFx, hipY,  hipZ, anim.fl_thigh, anim.fl_calf, anim.fl_hoof);
	drawLeg(bodyFrame, hipFx, hipY, -hipZ, anim.fr_thigh, anim.fr_calf, anim.fr_hoof);
	drawLeg(bodyFrame, hipBx, hipY,  hipZ, anim.bl_thigh, anim.bl_calf, anim.bl_hoof);
	drawLeg(bodyFrame, hipBx, hipY, -hipZ, anim.br_thigh, anim.br_calf, anim.br_hoof);

	drawTail(bodyFrame);
}

function drawOxHead(bodyFrame) {
	var hf = new Matrix4(bodyFrame);
	hf.translate(BODY_LEN * 0.5, HEAD_OFFSET_Y, 0);
	hf.rotate(anim.head_yaw, 0, 1, 0);
	hf.rotate(anim.head_pitch, 0, 0, 1);

	// head block
	var hm = new Matrix4(hf);
	hm.translate(HEAD_SIZE_X * 0.5, 0, 0);
	hm.scale(HEAD_SIZE_X, HEAD_SIZE_Y, HEAD_SIZE_Z);
	drawCube(hm, COLOR_HEAD);

	// snout
	var sm = new Matrix4(hf);
	sm.translate(HEAD_SIZE_X + SNOUT_SIZE_X * 0.5, -HEAD_SIZE_Y * 0.15, 0);
	sm.scale(SNOUT_SIZE_X, SNOUT_SIZE_Y, SNOUT_SIZE_Z);
	drawCube(sm, COLOR_SNOUT);

	// left and right side features
	var sides = [1, -1];
	for (var i = 0; i < 2; i++) {
		var s = sides[i];

		// nostril
		var nm = new Matrix4(hf);
		nm.translate(HEAD_SIZE_X + SNOUT_SIZE_X * 0.95, -HEAD_SIZE_Y * 0.05, s * SNOUT_SIZE_Z * 0.20);
		nm.scale(0.04, 0.05, 0.07);
		drawCube(nm, COLOR_NOSTRIL);

		// eye
		var em = new Matrix4(hf);
		em.translate(HEAD_SIZE_X * 0.95, HEAD_SIZE_Y * 0.20, s * HEAD_SIZE_Z * 0.45);
		em.scale(EYE_SIZE, EYE_SIZE, EYE_SIZE);
		drawCube(em, COLOR_EYE);

		// ear
		var ear = new Matrix4(hf);
		ear.translate(HEAD_SIZE_X * 0.20, HEAD_SIZE_Y * 0.45, s * HEAD_SIZE_Z * 0.55);
		ear.rotate(s * 25, 1, 0, 0);
		ear.scale(EAR_SIZE_X, EAR_SIZE_Y, EAR_SIZE_Z);
		drawCube(ear, COLOR_EAR);

		// horn
		drawHorn(hf, s);
	}
}

function drawHorn(headFrame, sgn) {
	var hf = new Matrix4(headFrame);
	hf.translate(HEAD_SIZE_X * 0.05, HEAD_SIZE_Y * 0.45, sgn * HEAD_SIZE_Z * 0.42);
	hf.rotate(sgn * 78, 1, 0, 0);
	hf.rotate(-12, 0, 0, 1);

	// lower segment
	var lower = new Matrix4(hf);
	lower.translate(0, HORN_LEN * 0.5, 0);
	lower.scale(HORN_RADIUS * 2.2, HORN_LEN, HORN_RADIUS * 2.2);
	drawCylinder(lower, COLOR_HORN);

	// upper segment
	hf.translate(0, HORN_LEN, 0);
	hf.rotate(-18, 0, 0, 1);
	hf.rotate(sgn * 8, 1, 0, 0);

	var upper = new Matrix4(hf);
	upper.translate(0, HORN_LEN * 0.5, 0);
	upper.scale(HORN_RADIUS * 1.7, HORN_LEN, HORN_RADIUS * 1.7);
	drawCylinder(upper, COLOR_HORN);

	// dark tip
	var tip = new Matrix4(hf);
	tip.translate(0, HORN_LEN, 0);
	tip.scale(HORN_RADIUS * 1.4, HORN_RADIUS * 1.6, HORN_RADIUS * 1.4);
	drawCube(tip, COLOR_HORNTIP);
}

function drawLeg(parent, hipX, hipY, hipZ, thighAng, calfAng, hoofAng) {
	// thigh
	var tf = new Matrix4(parent);
	tf.translate(hipX, hipY, hipZ);
	tf.rotate(thighAng, 0, 0, 1);

	var tm = new Matrix4(tf);
	tm.translate(0, -THIGH_LEN * 0.5, 0);
	tm.scale(THIGH_W, THIGH_LEN, THIGH_W);
	drawCube(tm, COLOR_HEAD);

	// calf
	var cf = new Matrix4(tf);
	cf.translate(0, -THIGH_LEN, 0);
	cf.rotate(calfAng, 0, 0, 1);

	var cm = new Matrix4(cf);
	cm.translate(0, -CALF_LEN * 0.5, 0);
	cm.scale(CALF_W, CALF_LEN, CALF_W);
	drawCube(cm, COLOR_HEAD);

	// hoof
	var hoof = new Matrix4(cf);
	hoof.translate(0, -CALF_LEN, 0);
	hoof.rotate(hoofAng, 0, 0, 1);

	var hoofM = new Matrix4(hoof);
	hoofM.translate(HOOF_W * 0.10, -HOOF_H * 0.5, 0);
	hoofM.scale(HOOF_W, HOOF_H, HOOF_D);
	drawCube(hoofM, COLOR_HOOF);
}

function drawTail(bodyFrame) {
	var tf = new Matrix4(bodyFrame);
	tf.translate(-BODY_LEN * 0.5, BODY_HEIGHT * 0.10, 0);
	tf.rotate(anim.tail_1, 0, 1, 0);
	tf.rotate(35, 0, 0, 1);

	var bm = new Matrix4(tf);
	bm.translate(-TAIL_BASE_LEN * 0.5, 0, 0);
	bm.scale(TAIL_BASE_LEN, TAIL_BASE_W, TAIL_BASE_W);
	drawCube(bm, COLOR_TAIL);

	// mid segment
	var mf = new Matrix4(tf);
	mf.translate(-TAIL_BASE_LEN, 0, 0);
	mf.rotate(anim.tail_2, 0, 1, 0);
	mf.rotate(15, 0, 0, 1);

	var mm = new Matrix4(mf);
	mm.translate(-TAIL_MID_LEN * 0.5, 0, 0);
	mm.scale(TAIL_MID_LEN, TAIL_MID_W, TAIL_MID_W);
	drawCube(mm, COLOR_TAIL);

	// tip
	var tipf = new Matrix4(mf);
	tipf.translate(-TAIL_MID_LEN, 0, 0);
	tipf.rotate(anim.tail_3, 0, 1, 0);

	var tipm = new Matrix4(tipf);
	tipm.translate(-TAIL_TIP_LEN * 0.5, 0, 0);
	tipm.scale(TAIL_TIP_LEN, TAIL_TIP_W, TAIL_TIP_W);
	drawCube(tipm, COLOR_TAILTIP);
}

// shader utilities
// https://www.geeksforgeeks.org/javascript/how-to-compile-shaders-in-webgl/

function initShaders(gl, vshader, fshader) {
	var program = createProgram(gl, vshader, fshader);
	if (!program) return false;
	gl.useProgram(program);
	gl.program = program;
	return true;
}

function createProgram(gl, vshader, fshader) {
	var vs = loadShader(gl, gl.VERTEX_SHADER, vshader);
	var fs = loadShader(gl, gl.FRAGMENT_SHADER, fshader);
	if (!vs || !fs) return null;

	var prog = gl.createProgram();
	gl.attachShader(prog, vs);
	gl.attachShader(prog, fs);
	gl.linkProgram(prog);

	if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
		console.log('Link error: ' + gl.getProgramInfoLog(prog));
		gl.deleteProgram(prog);
		return null;
	}
	return prog;
}

function loadShader(gl, type, source) {
	var shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		console.log('Compile error: ' + gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
		return null;
	}
	return shader;
}

window.addEventListener('load', main);
