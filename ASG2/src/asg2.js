// asg2.js
// based on JointModel (Ch9, p.323) and HelloCube (Ch7, p.215)
// from WebGL Programming Guide by Matsuda & Lea
// hierarchical transforms theory: Shirley Ch6 (Transformation Matrices)

// vertex shader program (Matsuda p.29, p.108)
var VSHADER_SOURCE =
	'attribute vec3 a_Position;\n' +
	'attribute float a_Shade;\n' +
	'uniform mat4 u_ModelMatrix;\n' +
	'uniform mat4 u_GlobalRotation;\n' +
	'varying float v_Shade;\n' +
	'void main() {\n' +
	'  gl_Position = u_GlobalRotation * u_ModelMatrix * vec4(a_Position, 1.0);\n' +
	'  v_Shade = a_Shade;\n' +
	'}\n';

// fragment shader program (Matsuda p.29)
var FSHADER_SOURCE =
	'precision mediump float;\n' +
	'uniform vec4 u_Color;\n' +
	'varying float v_Shade;\n' +
	'void main() {\n' +
	'  gl_FragColor = vec4(u_Color.rgb * v_Shade, u_Color.a);\n' +
	'}\n';

// global variables
var gl;
var canvas;

// attribute and uniform handles, looked up once and reused
var attribs = { position: -1, shade: -1 };
var uniforms = { modelMatrix: null, globalRotation: null, color: null };

// reusable scratch matrices so we don't allocate every frame
// (Matsuda Ch10 p.351 talks about avoiding redundant work)
var globalRotationMatrix = new Matrix4();
var sceneBaseMatrix = new Matrix4();

// global scale and vertical offset for the whole scene
var WORLD_SCALE = 0.48;
var WORLD_LIFT = -0.05;

// body of the ox
var BODY_LEN = 1.40;
var BODY_HEIGHT = 0.70;
var BODY_WIDTH = 0.70;

// distance from feet to bottom of body in ox-local space
// equals THIGH_LEN + CALF_LEN + HOOF_H
var BODY_Y = 0.56;

// head and face parts (parented to the front of the body)
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

// horns are non-cube primitives (assignment rubric)
// two cylinder segments per horn for the longhorn curve
var HORN_RADIUS = 0.07;
var HORN_LEN = 0.40;

// legs are 3 segments deep so we get the third-level joint chain
var THIGH_LEN = 0.24;
var THIGH_W = 0.18;
var CALF_LEN = 0.22;
var CALF_W = 0.16;
var HOOF_H = 0.10;
var HOOF_W = 0.20;
var HOOF_D = 0.22;

// tail is also a 3-segment chain
var TAIL_BASE_LEN = 0.24;
var TAIL_BASE_W = 0.10;
var TAIL_MID_LEN = 0.20;
var TAIL_MID_W = 0.08;
var TAIL_TIP_LEN = 0.14;
var TAIL_TIP_W = 0.13;

// colors inspired by Babe the Blue Ox at the Paul Bunyan statue
var COLOR_BODY     = [0.29, 0.56, 0.92, 1.0];
var COLOR_BELLY    = [0.45, 0.70, 0.97, 1.0];
var COLOR_HEAD     = [0.27, 0.52, 0.88, 1.0];
var COLOR_SNOUT    = [0.86, 0.62, 0.62, 1.0];
var COLOR_EAR      = [0.40, 0.28, 0.25, 1.0];
var COLOR_EYE      = [0.05, 0.05, 0.05, 1.0];
var COLOR_HORN     = [0.95, 0.91, 0.78, 1.0];
var COLOR_HORN_TIP = [0.30, 0.22, 0.18, 1.0];
var COLOR_HOOF     = [0.12, 0.10, 0.08, 1.0];
var COLOR_TAIL     = [0.27, 0.52, 0.88, 1.0];
var COLOR_TAIL_TIP = [0.18, 0.20, 0.30, 1.0];
var COLOR_NOSTRIL  = [0.45, 0.30, 0.30, 1.0];
var COLOR_GRASS    = [0.30, 0.55, 0.25, 1.0];

// global rotation sliders
var g_globalYaw = -25;
var g_globalPitch = 10;

// joint angles set by sliders
var g_sliderAngles = {
	head_yaw: 0, head_pitch: 0,
	tail_1: 0, tail_2: 0, tail_3: 0,
	fl_thigh: 0, fl_calf: 0, fl_hoof: 0,
	fr_thigh: 0, fr_calf: 0, fr_hoof: 0,
	bl_thigh: 0, bl_calf: 0, bl_hoof: 0,
	br_thigh: 0, br_calf: 0, br_hoof: 0
};

// joint angles set by the auto animation, same shape as the slider object
var g_animatedAngles = {
	head_yaw: 0, head_pitch: 0,
	tail_1: 0, tail_2: 0, tail_3: 0,
	fl_thigh: 0, fl_calf: 0, fl_hoof: 0,
	fr_thigh: 0, fr_calf: 0, fr_hoof: 0,
	bl_thigh: 0, bl_calf: 0, bl_hoof: 0,
	br_thigh: 0, br_calf: 0, br_hoof: 0
};

// animation toggle (Matsuda p.96 covers the tick pattern)
var g_animationOn = true;

// wall clock origin so we can compute elapsed seconds
var g_startTime = 0;
var g_seconds = 0;

// mouse drag state for global rotation
var g_dragging = false;
var g_lastX = 0;
var g_lastY = 0;

// poke timer, set when the user shift+clicks
var g_pokeStartTime = -1;

// last frame time so we can show fps
var g_lastFrameTime = 0;

function main() {
	setupWebGL();
	connectVariablesToGLSL();
	setupGeometry();
	setupUI();
	setupMouse();

	g_startTime = performance.now();

	// kick off the animation loop
	// https://www.w3schools.com/jsref/met_win_requestanimationframe.asp
	requestAnimationFrame(tick);
}

function setupWebGL() {
	// retrieve the <canvas> element (Matsuda p.11)
	canvas = document.getElementById('webgl');

	// get the webgl rendering context (Matsuda p.25)
	gl = canvas.getContext("webgl");
	if (!gl) {
		console.log('Failed to get the rendering context for WebGL');
		return;
	}

	// turn on depth test so closer cubes hide farther cubes (Instructions and Matsuda p.219)
	gl.enable(gl.DEPTH_TEST);

	// soft sky-blue background color (Matsuda p.26)
	gl.clearColor(0.69, 0.86, 0.96, 1.0);
}

function connectVariablesToGLSL() {
	// initialize shaders (Matsuda p.30)
	if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
		console.log('Failed to initialize shaders.');
		return;
	}

	// get attribute storage locations (Matsuda p.40)
	attribs.position = gl.getAttribLocation(gl.program, 'a_Position');
	if (attribs.position < 0) {
		console.log('Failed to get the storage location of a_Position');
		return;
	}
	attribs.shade = gl.getAttribLocation(gl.program, 'a_Shade');
	if (attribs.shade < 0) {
		console.log('Failed to get the storage location of a_Shade');
		return;
	}

	// get uniform storage locations (Matsuda p.58)
	uniforms.modelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
	if (!uniforms.modelMatrix) {
		console.log('Failed to get the storage location of u_ModelMatrix');
		return;
	}
	uniforms.globalRotation = gl.getUniformLocation(gl.program, 'u_GlobalRotation');
	if (!uniforms.globalRotation) {
		console.log('Failed to get the storage location of u_GlobalRotation');
		return;
	}
	uniforms.color = gl.getUniformLocation(gl.program, 'u_Color');
	if (!uniforms.color) {
		console.log('Failed to get the storage location of u_Color');
		return;
	}
}

function setupGeometry() {
	// upload cube and cylinder vertex data once at startup
	Cube.init(gl);
	Cylinder.init(gl, 24);
}

function setupUI() {
	// global rotation sliders
	bindSlider('slider-yaw', 'val-yaw', function(v) { g_globalYaw = v; });
	bindSlider('slider-pitch', 'val-pitch', function(v) { g_globalPitch = v; });

	// every joint slider, paired with the key in g_sliderAngles
	var jointSpec = [
		['slider-head-yaw',   'val-head-yaw',   'head_yaw'],
		['slider-head-pitch', 'val-head-pitch', 'head_pitch'],
		['slider-tail-1',     'val-tail-1',     'tail_1'],
		['slider-tail-2',     'val-tail-2',     'tail_2'],
		['slider-tail-3',     'val-tail-3',     'tail_3'],
		['slider-fl-thigh',   'val-fl-thigh',   'fl_thigh'],
		['slider-fl-calf',    'val-fl-calf',    'fl_calf'],
		['slider-fl-hoof',    'val-fl-hoof',    'fl_hoof'],
		['slider-fr-thigh',   'val-fr-thigh',   'fr_thigh'],
		['slider-fr-calf',    'val-fr-calf',    'fr_calf'],
		['slider-fr-hoof',    'val-fr-hoof',    'fr_hoof'],
		['slider-bl-thigh',   'val-bl-thigh',   'bl_thigh'],
		['slider-bl-calf',    'val-bl-calf',    'bl_calf'],
		['slider-bl-hoof',    'val-bl-hoof',    'bl_hoof'],
		['slider-br-thigh',   'val-br-thigh',   'br_thigh'],
		['slider-br-calf',    'val-br-calf',    'br_calf'],
		['slider-br-hoof',    'val-br-hoof',    'br_hoof']
	];

	// closure trick so each handler captures its own key (asg1 used the same idea)
	for (var i = 0; i < jointSpec.length; i++) {
		bindJoint(jointSpec[i][0], jointSpec[i][1], jointSpec[i][2]);
	}

	// animation on/off and reset buttons
	// https://www.w3schools.com/jsref/event_onclick.asp
	var btnOn = document.getElementById('btn-anim-on');
	var btnOff = document.getElementById('btn-anim-off');
	var btnReset = document.getElementById('btn-reset');
	if (btnOn) btnOn.onclick = function() { g_animationOn = true; };
	if (btnOff) btnOff.onclick = function() { g_animationOn = false; };
	if (btnReset) btnReset.onclick = resetPose;
}

// hook up one slider to a callback that gets the numeric value
// https://www.w3schools.com/jsref/prop_range_value.asp
function bindSlider(sliderId, labelId, apply) {
	var slider = document.getElementById(sliderId);
	var label = document.getElementById(labelId);
	if (!slider || !label) return;

	var update = function() {
		var v = parseFloat(slider.value);
		label.textContent = String(Math.round(v));
		apply(v);
	};

	// fire on every input event so labels update live
	// https://www.w3schools.com/jsref/event_oninput.asp
	slider.addEventListener('input', update);

	// run once to sync the label
	update();
}

// hook up one joint slider to its key in the slider angles object
function bindJoint(sliderId, labelId, key) {
	bindSlider(sliderId, labelId, function(v) {
		g_sliderAngles[key] = v;
	});
}

// drag to rotate, shift+click to poke (bare minimum)
// https://www.w3schools.com/jsref/event_onmousedown.asp
function setupMouse() {
	canvas.addEventListener('mousedown', function(ev) {
		if (ev.shiftKey) {
			g_pokeStartTime = g_seconds;
			return;
		}
		g_dragging = true;
		g_lastX = ev.clientX;
		g_lastY = ev.clientY;
	});
	canvas.addEventListener('mouseup', function() {
		g_dragging = false;
	});
	canvas.addEventListener('mousemove', function(ev) {
		if (!g_dragging) return;
		g_globalYaw += (ev.clientX - g_lastX) * 0.5;
		g_globalPitch += (ev.clientY - g_lastY) * 0.5;
		g_lastX = ev.clientX;
		g_lastY = ev.clientY;
	});
}

// snap every joint slider back to 0 (leave the global ones alone)
function resetPose() {
	var sliders = document.querySelectorAll('.controls input[type="range"]');
	for (var i = 0; i < sliders.length; i++) {
		var s = sliders[i];
		if (s.id === 'slider-yaw' || s.id === 'slider-pitch') continue;
		s.value = 0;
		// fire input so the label updates and the callback runs
		s.dispatchEvent(new Event('input'));
	}
}

// animation tick (Matsuda Ch9 p.96 introduces the pattern)
function tick(now) {
	g_seconds = (now - g_startTime) / 1000;

	updateAnimationAngles();
	renderScene();
	updateFps(now);

	requestAnimationFrame(tick);
}

// simplest possible fps readout
function updateFps(now) {
	var dt = now - g_lastFrameTime;
	g_lastFrameTime = now;
	var fps = dt > 0 ? Math.round(1000 / dt) : 0;
	var el = document.getElementById('fps');
	if (el) el.textContent = 'fps: ' + fps;
}

// pick auto-animated joint angles based on time
// keeping this out of renderScene() is the assignment's recommendation
function updateAnimationAngles() {
	var t = g_seconds;

	// diagonal trot gait: FL+BR move together, FR+BL move opposite
	var swing = Math.sin(t * 4.0) * 22;
	var bend = Math.max(0, -Math.sin(t * 4.0)) * 35;
	var bendOpp = Math.max(0, Math.sin(t * 4.0)) * 35;
	var hoofWiggle = Math.sin(t * 4.0 + 0.4) * 8;

	g_animatedAngles.fl_thigh = swing;
	g_animatedAngles.fl_calf = -bend;
	g_animatedAngles.fl_hoof = hoofWiggle;

	g_animatedAngles.br_thigh = swing;
	g_animatedAngles.br_calf = -bend;
	g_animatedAngles.br_hoof = hoofWiggle;

	g_animatedAngles.fr_thigh = -swing;
	g_animatedAngles.fr_calf = -bendOpp;
	g_animatedAngles.fr_hoof = -hoofWiggle;

	g_animatedAngles.bl_thigh = -swing;
	g_animatedAngles.bl_calf = -bendOpp;
	g_animatedAngles.bl_hoof = -hoofWiggle;

	// tail swish, slight phase offset between segments
	g_animatedAngles.tail_1 = Math.sin(t * 2.5) * 18;
	g_animatedAngles.tail_2 = Math.sin(t * 2.5 + 0.6) * 28;
	g_animatedAngles.tail_3 = Math.sin(t * 2.5 + 1.2) * 35;

	// gentle head bob
	g_animatedAngles.head_yaw = Math.sin(t * 1.3) * 5;
	g_animatedAngles.head_pitch = Math.sin(t * 2.6) * 4;

	// poke override: head dips down for 1 second after shift+click
	if (g_pokeStartTime >= 0) {
		var p = (g_seconds - g_pokeStartTime) / 1.0;
		if (p >= 1) {
			g_pokeStartTime = -1;
		} else {
			g_animatedAngles.head_pitch = -25 * Math.sin(Math.PI * p);
		}
	}
}

// pick the rendered angle for a joint: animated value if animation is on,
// slider value otherwise (assignment instruction step 9)
function angleOf(name) {
	return g_animationOn ? g_animatedAngles[name] : g_sliderAngles[name];
}

// the single renderScene() function the rubric asks for
function renderScene() {
	// clear color and depth (Matsuda p.219)
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// build the global rotation matrix from the two sliders
	// passed to the shader as u_GlobalRotation (Matsuda p.108)
	globalRotationMatrix.setIdentity();
	globalRotationMatrix.rotate(g_globalPitch, 1, 0, 0);
	globalRotationMatrix.rotate(g_globalYaw, 0, 1, 0);
	gl.uniformMatrix4fv(uniforms.globalRotation, false, globalRotationMatrix.elements);

	// scene base matrix every part starts from
	// scaling and lifting are baked in here so children inherit them
	sceneBaseMatrix.setIdentity();
	sceneBaseMatrix.translate(0, WORLD_LIFT, 0);
	sceneBaseMatrix.scale(WORLD_SCALE, WORLD_SCALE, WORLD_SCALE);
	sceneBaseMatrix.translate(0, -BODY_Y, 0);

	drawGrass(sceneBaseMatrix);
	drawOx(sceneBaseMatrix);
}

// flat green slab the ox stands on
function drawGrass(baseM) {
	var m = new Matrix4(baseM);
	m.translate(0, -0.025, 0);
	m.scale(4.0, 0.05, 3.0);
	Cube.draw(gl, attribs, uniforms, m, COLOR_GRASS);
}

// hierarchical drawing of the ox
function drawOx(baseM) {
	// body sits at the top of the leg chain
	var bodyFrame = new Matrix4(baseM);
	bodyFrame.translate(0, BODY_Y + BODY_HEIGHT * 0.5, 0);

	// main blue torso
	var bodyM = new Matrix4(bodyFrame);
	bodyM.scale(BODY_LEN, BODY_HEIGHT, BODY_WIDTH);
	Cube.draw(gl, attribs, uniforms, bodyM, COLOR_BODY);

	// lighter underbelly slab tucked just below center
	var bellyM = new Matrix4(bodyFrame);
	bellyM.translate(0, -BODY_HEIGHT * 0.30, 0);
	bellyM.scale(BODY_LEN * 0.95, BODY_HEIGHT * 0.50, BODY_WIDTH * 0.96);
	Cube.draw(gl, attribs, uniforms, bellyM, COLOR_BELLY);

	drawHead(bodyFrame);

	// hip joints sit at the four bottom corners of the body
	var hipY = -BODY_HEIGHT * 0.5;
	var hipFx = +BODY_LEN * 0.34;
	var hipBx = -BODY_LEN * 0.34;
	var hipZ = BODY_WIDTH * 0.32;

	// front-left leg
	drawLeg(bodyFrame, hipFx, hipY, hipZ,
		angleOf('fl_thigh'), angleOf('fl_calf'), angleOf('fl_hoof'));

	// front-right leg
	drawLeg(bodyFrame, hipFx, hipY, -hipZ,
		angleOf('fr_thigh'), angleOf('fr_calf'), angleOf('fr_hoof'));

	// back-left leg
	drawLeg(bodyFrame, hipBx, hipY, hipZ,
		angleOf('bl_thigh'), angleOf('bl_calf'), angleOf('bl_hoof'));

	// back-right leg
	drawLeg(bodyFrame, hipBx, hipY, -hipZ,
		angleOf('br_thigh'), angleOf('br_calf'), angleOf('br_hoof'));

	drawTail(bodyFrame);
}

function drawHead(bodyFrame) {
	// head pivot at the front-top of the body
	var headFrame = new Matrix4(bodyFrame);
	headFrame.translate(BODY_LEN * 0.5, HEAD_OFFSET_Y, 0);
	headFrame.rotate(angleOf('head_yaw'), 0, 1, 0);
	headFrame.rotate(angleOf('head_pitch'), 0, 0, 1);

	// the head cube is offset forward so it pivots at the neck
	var headM = new Matrix4(headFrame);
	headM.translate(HEAD_SIZE_X * 0.5, 0, 0);
	headM.scale(HEAD_SIZE_X, HEAD_SIZE_Y, HEAD_SIZE_Z);
	Cube.draw(gl, attribs, uniforms, headM, COLOR_HEAD);

	// pink snout sticking out the front
	var snoutM = new Matrix4(headFrame);
	snoutM.translate(HEAD_SIZE_X + SNOUT_SIZE_X * 0.5, -HEAD_SIZE_Y * 0.15, 0);
	snoutM.scale(SNOUT_SIZE_X, SNOUT_SIZE_Y, SNOUT_SIZE_Z);
	Cube.draw(gl, attribs, uniforms, snoutM, COLOR_SNOUT);

	var sides = [+1, -1];

	// two dark nostril dots on the front face of the snout
	for (var i = 0; i < 2; i++) {
		var sgn = sides[i];
		var nostril = new Matrix4(headFrame);
		nostril.translate(
			HEAD_SIZE_X + SNOUT_SIZE_X * 0.95,
			-HEAD_SIZE_Y * 0.05,
			sgn * SNOUT_SIZE_Z * 0.20
		);
		nostril.scale(0.04, 0.05, 0.07);
		Cube.draw(gl, attribs, uniforms, nostril, COLOR_NOSTRIL);
	}

	// two black eye cubes, slightly inset from the sides
	for (var i = 0; i < 2; i++) {
		var sgn = sides[i];
		var eye = new Matrix4(headFrame);
		eye.translate(
			HEAD_SIZE_X * 0.95,
			HEAD_SIZE_Y * 0.20,
			sgn * (HEAD_SIZE_Z * 0.45)
		);
		eye.scale(EYE_SIZE, EYE_SIZE, EYE_SIZE);
		Cube.draw(gl, attribs, uniforms, eye, COLOR_EYE);
	}

	// brown ears splayed outward from above the head
	for (var i = 0; i < 2; i++) {
		var sgn = sides[i];
		var ear = new Matrix4(headFrame);
		ear.translate(
			HEAD_SIZE_X * 0.20,
			HEAD_SIZE_Y * 0.45,
			sgn * (HEAD_SIZE_Z * 0.55)
		);
		ear.rotate(sgn * 25, 1, 0, 0);
		ear.scale(EAR_SIZE_X, EAR_SIZE_Y, EAR_SIZE_Z);
		Cube.draw(gl, attribs, uniforms, ear, COLOR_EAR);
	}

	// texas longhorn-style horns: two cylinder segments per side
	for (var i = 0; i < 2; i++) {
		drawHorn(headFrame, sides[i]);
	}
}

// one longhorn-style horn
// the inner cylinder nearly horizontal, the outer one curves forward
// and slightly up to give the longhorn shape
function drawHorn(headFrame, sgn) {
	// horn root sits on the temple, just behind the eye line
	var hornFrame = new Matrix4(headFrame);
	hornFrame.translate(
		HEAD_SIZE_X * 0.05,
		HEAD_SIZE_Y * 0.45,
		sgn * (HEAD_SIZE_Z * 0.42)
	);

	// splay nearly horizontal outward (the longhorn signature)
	hornFrame.rotate(sgn * 78, 1, 0, 0);

	// angle slightly forward toward +x
	hornFrame.rotate(-12, 0, 0, 1);

	// inner half: thicker, closer to the head
	var inner = new Matrix4(hornFrame);
	inner.translate(0, HORN_LEN * 0.5, 0);
	inner.scale(HORN_RADIUS * 2.2, HORN_LEN, HORN_RADIUS * 2.2);
	Cylinder.draw(gl, attribs, uniforms, inner, COLOR_HORN);

	// move pivot to the kink and add the forward / upward curve
	hornFrame.translate(0, HORN_LEN, 0);
	hornFrame.rotate(-18, 0, 0, 1);
	hornFrame.rotate(sgn * 8, 1, 0, 0);

	// outer half: longer and tapered
	var outer = new Matrix4(hornFrame);
	outer.translate(0, HORN_LEN * 0.5, 0);
	outer.scale(HORN_RADIUS * 1.7, HORN_LEN, HORN_RADIUS * 1.7);
	Cylinder.draw(gl, attribs, uniforms, outer, COLOR_HORN);

	// dark tip block at the very end
	var tip = new Matrix4(hornFrame);
	tip.translate(0, HORN_LEN, 0);
	tip.scale(HORN_RADIUS * 1.4, HORN_RADIUS * 1.6, HORN_RADIUS * 1.4);
	Cube.draw(gl, attribs, uniforms, tip, COLOR_HORN_TIP);
}

// one leg, three segments deep
// each child snapshots the parent frame so motion stays connected
// (Matsuda Ch9 p.328, Shirley Ch6.5 - coordinate frame composition)
function drawLeg(parentFrame, hipX, hipY, hipZ, thighDeg, calfDeg, hoofDeg) {
	// level 1: thigh swings forward and back around z
	var thighFrame = new Matrix4(parentFrame);
	thighFrame.translate(hipX, hipY, hipZ);
	thighFrame.rotate(thighDeg, 0, 0, 1);

	var thighM = new Matrix4(thighFrame);
	thighM.translate(0, -THIGH_LEN * 0.5, 0);
	thighM.scale(THIGH_W, THIGH_LEN, THIGH_W);
	Cube.draw(gl, attribs, uniforms, thighM, COLOR_HEAD);

	// level 2: calf inherits the thigh frame
	var calfFrame = new Matrix4(thighFrame);
	calfFrame.translate(0, -THIGH_LEN, 0);
	calfFrame.rotate(calfDeg, 0, 0, 1);

	var calfM = new Matrix4(calfFrame);
	calfM.translate(0, -CALF_LEN * 0.5, 0);
	calfM.scale(CALF_W, CALF_LEN, CALF_W);
	Cube.draw(gl, attribs, uniforms, calfM, COLOR_HEAD);

	// level 3: hoof inherits the calf frame
	var hoofFrame = new Matrix4(calfFrame);
	hoofFrame.translate(0, -CALF_LEN, 0);
	hoofFrame.rotate(hoofDeg, 0, 0, 1);

	var hoofM = new Matrix4(hoofFrame);
	hoofM.translate(HOOF_W * 0.10, -HOOF_H * 0.5, 0);
	hoofM.scale(HOOF_W, HOOF_H, HOOF_D);
	Cube.draw(gl, attribs, uniforms, hoofM, COLOR_HOOF);
}

// tail is also a 3-segment chain
function drawTail(bodyFrame) {
	// pivot at the rear-top of the body
	var tailFrame = new Matrix4(bodyFrame);
	tailFrame.translate(-BODY_LEN * 0.5, BODY_HEIGHT * 0.10, 0);
	tailFrame.rotate(angleOf('tail_1'), 0, 1, 0);
	tailFrame.rotate(35, 0, 0, 1);

	// base segment pointing back along -x
	var baseM = new Matrix4(tailFrame);
	baseM.translate(-TAIL_BASE_LEN * 0.5, 0, 0);
	baseM.scale(TAIL_BASE_LEN, TAIL_BASE_W, TAIL_BASE_W);
	Cube.draw(gl, attribs, uniforms, baseM, COLOR_TAIL);

	// mid segment chained off the base
	var midFrame = new Matrix4(tailFrame);
	midFrame.translate(-TAIL_BASE_LEN, 0, 0);
	midFrame.rotate(angleOf('tail_2'), 0, 1, 0);
	midFrame.rotate(15, 0, 0, 1);

	var midM = new Matrix4(midFrame);
	midM.translate(-TAIL_MID_LEN * 0.5, 0, 0);
	midM.scale(TAIL_MID_LEN, TAIL_MID_W, TAIL_MID_W);
	Cube.draw(gl, attribs, uniforms, midM, COLOR_TAIL);

	// tip segment chained off the middle, dark tuft color
	var tipFrame = new Matrix4(midFrame);
	tipFrame.translate(-TAIL_MID_LEN, 0, 0);
	tipFrame.rotate(angleOf('tail_3'), 0, 1, 0);

	var tipM = new Matrix4(tipFrame);
	tipM.translate(-TAIL_TIP_LEN * 0.5, 0, 0);
	tipM.scale(TAIL_TIP_LEN, TAIL_TIP_W, TAIL_TIP_W);
	Cube.draw(gl, attribs, uniforms, tipM, COLOR_TAIL_TIP);
}

// shader compilation (based on cuon-utils.js, Matsuda Appendix C)
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

	// create a program object (Matsuda p.258)
	var program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);

	// link the program
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
	// create shader object
	var shader = gl.createShader(type);
	gl.shaderSource(shader, source);

	// compile the shader
	gl.compileShader(shader);
	var compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
	if (!compiled) {
		console.log('Failed to compile shader: ' + gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
		return null;
	}
	return shader;
}

// run main when the page finishes loading
// https://www.w3schools.com/jsref/event_onload.asp
window.addEventListener('load', main);
