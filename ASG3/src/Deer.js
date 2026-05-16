// Deer.js
// blocky Nara-style deer with little cylinder antlers
// tan body, white belly, white spotted rump, dark hooves and eyes

var COLOR_DEER_TAN   = [0.78, 0.55, 0.34, 1.0];
var COLOR_DEER_BELLY = [0.95, 0.92, 0.86, 1.0];
var COLOR_DEER_SPOT  = [0.96, 0.94, 0.88, 1.0];
var COLOR_DEER_DARK  = [0.10, 0.08, 0.06, 1.0];
var COLOR_DEER_EYE   = [0.02, 0.02, 0.02, 1.0];
var COLOR_DEER_HORN  = [0.55, 0.40, 0.25, 1.0];

function _deerSolid(gl, attribs, uniforms, m, color) {
	Cube.draw(gl, attribs, uniforms, m, { color: color, texNum: 0, texWeight: 0 });
}

// public entry point draw a small deer at the given world matrix
// swing is the per-frame trot angle in degrees
function drawDeer(gl, attribs, uniforms, posMatrix, swing) {
	swing = swing || 0;
	var base = new Matrix4(posMatrix);
	base.scale(1.0, 1.0, 1.0);

	// body tan rectangular box
	var body = new Matrix4(base);
	body.translate(0, 1.05, 0);
	body.scale(1.4, 0.55, 0.55);
	_deerSolid(gl, attribs, uniforms, body, COLOR_DEER_TAN);

	// white belly slab tucked under the body
	var belly = new Matrix4(base);
	belly.translate(0, 0.85, 0);
	belly.scale(1.32, 0.20, 0.50);
	_deerSolid(gl, attribs, uniforms, belly, COLOR_DEER_BELLY);

	// two small white "spots" on the back to hint at fawn markings
	var spots = [[+0.30, 1.34, +0.18], [-0.30, 1.34, -0.18], [0.0, 1.34, +0.20]];
	for (var s = 0; s < spots.length; s++) {
		var sp = new Matrix4(base);
		sp.translate(spots[s][0], spots[s][1], spots[s][2]);
		sp.scale(0.14, 0.04, 0.14);
		_deerSolid(gl, attribs, uniforms, sp, COLOR_DEER_SPOT);
	}

	// neck thinner box rising from the front of the body
	var neck = new Matrix4(base);
	neck.translate(0.65, 1.35, 0);
	neck.rotate(-25, 0, 0, 1);
	neck.scale(0.28, 0.55, 0.32);
	_deerSolid(gl, attribs, uniforms, neck, COLOR_DEER_TAN);

	// head on top of the neck
	var head = new Matrix4(base);
	head.translate(0.92, 1.78, 0);
	head.scale(0.40, 0.38, 0.42);
	_deerSolid(gl, attribs, uniforms, head, COLOR_DEER_TAN);

	// snout poking forward
	var snout = new Matrix4(base);
	snout.translate(1.18, 1.70, 0);
	snout.scale(0.20, 0.18, 0.28);
	_deerSolid(gl, attribs, uniforms, snout, COLOR_DEER_BELLY);

	// dark nose tip
	var nose = new Matrix4(base);
	nose.translate(1.30, 1.74, 0);
	nose.scale(0.07, 0.08, 0.10);
	_deerSolid(gl, attribs, uniforms, nose, COLOR_DEER_DARK);

	var sides = [+1, -1];

	// two small black eye cubes on the front of the head, same size as the ox eyes
	for (var i = 0; i < 2; i++) {
		var sgn = sides[i];
		var eye = new Matrix4(base);
		eye.translate(1.13, 1.86, sgn * 0.16);
		eye.scale(0.05, 0.06, 0.05);
		_deerSolid(gl, attribs, uniforms, eye, COLOR_DEER_EYE);
	}

	// little antlers each antler is a cylinder branching forward (super simple)
	for (var i = 0; i < 2; i++) {
		var sgn = sides[i];
		var antler = new Matrix4(base);
		antler.translate(0.80, 2.02, sgn * 0.15);
		antler.rotate(sgn * 15, 1, 0, 0);
		antler.scale(0.06, 0.30, 0.06);
		Cylinder.draw(gl, attribs, uniforms, antler, COLOR_DEER_HORN);

		// little forward branch on each antler
		var branch = new Matrix4(base);
		branch.translate(0.92, 2.18, sgn * 0.20);
		branch.rotate(45, 0, 0, 1);
		branch.scale(0.05, 0.18, 0.05);
		Cylinder.draw(gl, attribs, uniforms, branch, COLOR_DEER_HORN);
	}

	// four thin legs that trot in diagonal pairs
	var legSpots = [
		[+0.55, +0.20, +1],
		[+0.55, -0.20, -1],
		[-0.55, +0.20, -1],
		[-0.55, -0.20, +1]
	];
	for (var j = 0; j < 4; j++) {
		var lx = legSpots[j][0];
		var lz = legSpots[j][1];
		var sw = swing * legSpots[j][2];

		var hip = new Matrix4(base);
		hip.translate(lx, 0.80, lz);
		hip.rotate(sw, 0, 0, 1);

		var leg = new Matrix4(hip);
		leg.translate(0, -0.40, 0);
		leg.scale(0.15, 0.80, 0.15);
		_deerSolid(gl, attribs, uniforms, leg, COLOR_DEER_TAN);

		var hoof = new Matrix4(hip);
		hoof.translate(0, -0.76, 0);
		hoof.scale(0.17, 0.08, 0.17);
		_deerSolid(gl, attribs, uniforms, hoof, COLOR_DEER_DARK);
	}

	// tiny tail
	var tail = new Matrix4(base);
	tail.translate(-0.78, 1.18, 0);
	tail.scale(0.18, 0.18, 0.16);
	_deerSolid(gl, attribs, uniforms, tail, COLOR_DEER_BELLY);
}
