// Panda.js
// chubby blocky panda built from white and black cubes
// minimum part count body, head, ears, eye patches, eyes, four short legs

var COLOR_PANDA_WHITE = [0.96, 0.95, 0.92, 1.0];
var COLOR_PANDA_BLACK = [0.10, 0.10, 0.12, 1.0];
var COLOR_PANDA_EYE   = [0.95, 0.92, 0.88, 1.0];

function _pandaSolid(gl, attribs, uniforms, m, color) {
	Cube.draw(gl, attribs, uniforms, m, { color: color, texNum: 0, texWeight: 0 });
}

// public entry point draw a chubby panda at the given world matrix
// swing is the per-frame trot angle in degrees (kept smaller since panda is stocky)
function drawPanda(gl, attribs, uniforms, posMatrix, swing) {
	swing = swing || 0;
	var base = new Matrix4(posMatrix);
	base.scale(0.85, 0.85, 0.85);

	// big white round-ish body (just a tall cube)
	var body = new Matrix4(base);
	body.translate(0, 0.65, 0);
	body.scale(0.95, 0.85, 0.85);
	_pandaSolid(gl, attribs, uniforms, body, COLOR_PANDA_WHITE);

	// black shoulder band across the body
	var band = new Matrix4(base);
	band.translate(0, 0.95, 0);
	band.scale(0.97, 0.25, 0.87);
	_pandaSolid(gl, attribs, uniforms, band, COLOR_PANDA_BLACK);

	// big white head
	var head = new Matrix4(base);
	head.translate(0.50, 1.30, 0);
	head.scale(0.65, 0.60, 0.70);
	_pandaSolid(gl, attribs, uniforms, head, COLOR_PANDA_WHITE);

	// dark muzzle patch on the front of the head
	var muzzle = new Matrix4(base);
	muzzle.translate(0.78, 1.18, 0);
	muzzle.scale(0.18, 0.16, 0.30);
	_pandaSolid(gl, attribs, uniforms, muzzle, COLOR_PANDA_BLACK);

	var sides = [+1, -1];

	// small black eye patches on the front of the head with a tiny white eye dot inside each
	for (var i = 0; i < 2; i++) {
		var sgn = sides[i];
		var patch = new Matrix4(base);
		patch.translate(0.84, 1.42, sgn * 0.18);
		patch.scale(0.06, 0.10, 0.08);
		_pandaSolid(gl, attribs, uniforms, patch, COLOR_PANDA_BLACK);

		var eyeDot = new Matrix4(base);
		eyeDot.translate(0.88, 1.43, sgn * 0.18);
		eyeDot.scale(0.03, 0.05, 0.05);
		_pandaSolid(gl, attribs, uniforms, eyeDot, COLOR_PANDA_EYE);
	}

	// two round black ears (cubes squished a bit) on top of the head
	for (var i = 0; i < 2; i++) {
		var sgn = sides[i];
		var ear = new Matrix4(base);
		ear.translate(0.40, 1.65, sgn * 0.28);
		ear.scale(0.18, 0.18, 0.18);
		_pandaSolid(gl, attribs, uniforms, ear, COLOR_PANDA_BLACK);
	}

	// four short black legs trotting in diagonal pairs
	var legSpots = [
		[+0.30, +0.30, +1],
		[+0.30, -0.30, -1],
		[-0.30, +0.30, -1],
		[-0.30, -0.30, +1]
	];
	for (var j = 0; j < 4; j++) {
		var lx = legSpots[j][0];
		var lz = legSpots[j][1];
		var sw = swing * legSpots[j][2];

		var hip = new Matrix4(base);
		hip.translate(lx, 0.36, lz);
		hip.rotate(sw, 0, 0, 1);

		var leg = new Matrix4(hip);
		leg.translate(0, -0.18, 0);
		leg.scale(0.28, 0.36, 0.28);
		_pandaSolid(gl, attribs, uniforms, leg, COLOR_PANDA_BLACK);
	}

	// tiny black tail
	var tail = new Matrix4(base);
	tail.translate(-0.55, 0.85, 0);
	tail.scale(0.14, 0.14, 0.14);
	_pandaSolid(gl, attribs, uniforms, tail, COLOR_PANDA_BLACK);
}
