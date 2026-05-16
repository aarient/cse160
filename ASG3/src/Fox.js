// Fox.js
// blocky fox with cylinder ears (the cylinder primitive carries over from the ox horns)
// orange body and head, white belly snout and tail tip, dark feet, tiny black eyes

// fox colors
var COLOR_FOX_ORANGE = [0.95, 0.50, 0.18, 1.0];
var COLOR_FOX_WHITE  = [0.96, 0.93, 0.88, 1.0];
var COLOR_FOX_DARK   = [0.18, 0.12, 0.08, 1.0];
var COLOR_FOX_EYE    = [0.05, 0.05, 0.05, 1.0];

// little helper so the fox draws stay tidy
function _foxSolid(gl, attribs, uniforms, m, color) {
	Cube.draw(gl, attribs, uniforms, m, { color: color, texNum: 0, texWeight: 0 });
}

// public entry point draw the whole fox at the given world matrix
// swing is the per-frame trot angle in degrees (front-left + back-right move together)
function drawFox(gl, attribs, uniforms, posMatrix, swing) {
	swing = swing || 0;
	// bigger than the first pass so the fox actually reads at park scale
	var base = new Matrix4(posMatrix);
	base.scale(0.95, 0.95, 0.95);

	// body long orange box on top of the legs
	var body = new Matrix4(base);
	body.translate(0, 0.65, 0);
	body.scale(1.4, 0.55, 0.65);
	_foxSolid(gl, attribs, uniforms, body, COLOR_FOX_ORANGE);

	// white belly stripe under the body
	var belly = new Matrix4(base);
	belly.translate(0, 0.48, 0);
	belly.scale(1.32, 0.22, 0.58);
	_foxSolid(gl, attribs, uniforms, belly, COLOR_FOX_WHITE);

	// head orange cube near the front
	var head = new Matrix4(base);
	head.translate(0.85, 0.95, 0);
	head.scale(0.55, 0.55, 0.60);
	_foxSolid(gl, attribs, uniforms, head, COLOR_FOX_ORANGE);

	// white snout poking out the front of the head
	var snout = new Matrix4(base);
	snout.translate(1.18, 0.85, 0);
	snout.scale(0.28, 0.26, 0.35);
	_foxSolid(gl, attribs, uniforms, snout, COLOR_FOX_WHITE);

	// dark nose dot at the very tip
	var nose = new Matrix4(base);
	nose.translate(1.32, 0.92, 0);
	nose.scale(0.10, 0.10, 0.14);
	_foxSolid(gl, attribs, uniforms, nose, COLOR_FOX_DARK);

	var sides = [+1, -1];

	// two small black eye cubes on the front of the head, same size as the ox eyes
	for (var i = 0; i < 2; i++) {
		var sgn = sides[i];
		var eye = new Matrix4(base);
		eye.translate(1.14, 1.06, sgn * 0.20);
		eye.scale(0.05, 0.06, 0.05);
		_foxSolid(gl, attribs, uniforms, eye, COLOR_FOX_EYE);
	}

	// pointy ears built from the cylinder primitive (same one the ox horns use)
	// each ear is a thin cylinder rotated to look like a triangle wedge
	for (var i = 0; i < 2; i++) {
		var sgn = sides[i];
		var ear = new Matrix4(base);
		ear.translate(0.78, 1.30, sgn * 0.20);
		// slight outward splay so they look perky
		ear.rotate(sgn * 12, 1, 0, 0);
		// taper the ear by scaling the cylinder thinner at the top
		ear.scale(0.16, 0.30, 0.16);
		Cylinder.draw(gl, attribs, uniforms, ear, COLOR_FOX_ORANGE);

		// tiny dark ear tip on top so the cylinder looks pointed
		var tip = new Matrix4(base);
		tip.translate(0.78, 1.50, sgn * 0.20);
		tip.scale(0.07, 0.08, 0.07);
		_foxSolid(gl, attribs, uniforms, tip, COLOR_FOX_DARK);
	}

	// four orange legs that trot in diagonal pairs (FL+BR together, FR+BL opposite)
	var legSpots = [
		[+0.50, +0.25, +1],
		[+0.50, -0.25, -1],
		[-0.50, +0.25, -1],
		[-0.50, -0.25, +1]
	];
	for (var j = 0; j < 4; j++) {
		var lx = legSpots[j][0];
		var lz = legSpots[j][1];
		var sw = swing * legSpots[j][2];

		// hip joint pivots at the top of the leg
		var hip = new Matrix4(base);
		hip.translate(lx, 0.45, lz);
		hip.rotate(sw, 0, 0, 1);

		var leg = new Matrix4(hip);
		leg.translate(0, -0.22, 0);
		leg.scale(0.20, 0.45, 0.20);
		_foxSolid(gl, attribs, uniforms, leg, COLOR_FOX_ORANGE);

		var sock = new Matrix4(hip);
		sock.translate(0, -0.42, 0);
		sock.scale(0.22, 0.10, 0.22);
		_foxSolid(gl, attribs, uniforms, sock, COLOR_FOX_DARK);
	}

	// tail orange box angled out the back with a white tip
	var tail = new Matrix4(base);
	tail.translate(-0.88, 0.78, 0);
	tail.rotate(25, 0, 0, 1);
	tail.scale(0.65, 0.24, 0.24);
	_foxSolid(gl, attribs, uniforms, tail, COLOR_FOX_ORANGE);

	var tailTip = new Matrix4(base);
	tailTip.translate(-1.20, 0.92, 0);
	tailTip.scale(0.22, 0.22, 0.22);
	_foxSolid(gl, attribs, uniforms, tailTip, COLOR_FOX_WHITE);
}
