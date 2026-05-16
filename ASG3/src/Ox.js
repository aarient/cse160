// Ox.js
// Babe the Blue Ox dropped into the world from ASG2
// hierarchical transforms (Matsuda Ch9 p.323 JointModel, Shirley Ch6)
// uses the new textured Cube draw signature with texWeight=0 for solid colors

// body of the ox
var BODY_LEN = 1.40;
var BODY_HEIGHT = 0.70;
var BODY_WIDTH = 0.70;

// distance from feet to bottom of body in ox-local space
var BODY_Y = 0.56;

// head and face parts
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

// horns are non-cube primitives (carryover from ASG2 rubric)
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

// little helper so the ox draw calls stay tidy
function _solid(gl, attribs, uniforms, m, color) {
	Cube.draw(gl, attribs, uniforms, m, { color: color, texNum: 0, texWeight: 0 });
}

// public entry point draw the whole ox at the given world position and yaw
// posMatrix should already place the ox where it stands in the world
function drawOx(gl, attribs, uniforms, posMatrix, jointAngles) {
	// stand the ox so its hooves touch y=0 (no -BODY_Y dunk like ASG2 had)
	var baseM = new Matrix4(posMatrix);
	baseM.scale(0.9, 0.9, 0.9);

	// body anchor
	var bodyFrame = new Matrix4(baseM);
	bodyFrame.translate(0, BODY_Y + BODY_HEIGHT * 0.5, 0);

	// main blue torso
	var bodyM = new Matrix4(bodyFrame);
	bodyM.scale(BODY_LEN, BODY_HEIGHT, BODY_WIDTH);
	_solid(gl, attribs, uniforms, bodyM, COLOR_BODY);

	// lighter underbelly slab tucked just below center
	var bellyM = new Matrix4(bodyFrame);
	bellyM.translate(0, -BODY_HEIGHT * 0.30, 0);
	bellyM.scale(BODY_LEN * 0.95, BODY_HEIGHT * 0.50, BODY_WIDTH * 0.96);
	_solid(gl, attribs, uniforms, bellyM, COLOR_BELLY);

	_drawHead(gl, attribs, uniforms, bodyFrame, jointAngles);

	// hip joints sit at the four bottom corners of the body
	var hipY = -BODY_HEIGHT * 0.5;
	var hipFx = +BODY_LEN * 0.34;
	var hipBx = -BODY_LEN * 0.34;
	var hipZ = BODY_WIDTH * 0.32;

	// front-left leg
	_drawLeg(gl, attribs, uniforms, bodyFrame, hipFx, hipY, hipZ,
		jointAngles.fl_thigh, jointAngles.fl_calf, jointAngles.fl_hoof);

	// front-right leg
	_drawLeg(gl, attribs, uniforms, bodyFrame, hipFx, hipY, -hipZ,
		jointAngles.fr_thigh, jointAngles.fr_calf, jointAngles.fr_hoof);

	// back-left leg
	_drawLeg(gl, attribs, uniforms, bodyFrame, hipBx, hipY, hipZ,
		jointAngles.bl_thigh, jointAngles.bl_calf, jointAngles.bl_hoof);

	// back-right leg
	_drawLeg(gl, attribs, uniforms, bodyFrame, hipBx, hipY, -hipZ,
		jointAngles.br_thigh, jointAngles.br_calf, jointAngles.br_hoof);

	_drawTail(gl, attribs, uniforms, bodyFrame, jointAngles);
}

function _drawHead(gl, attribs, uniforms, bodyFrame, jointAngles) {
	// head pivot at the front-top of the body
	var headFrame = new Matrix4(bodyFrame);
	headFrame.translate(BODY_LEN * 0.5, HEAD_OFFSET_Y, 0);
	headFrame.rotate(jointAngles.head_yaw, 0, 1, 0);
	headFrame.rotate(jointAngles.head_pitch, 0, 0, 1);

	// head cube offset forward so it pivots at the neck
	var headM = new Matrix4(headFrame);
	headM.translate(HEAD_SIZE_X * 0.5, 0, 0);
	headM.scale(HEAD_SIZE_X, HEAD_SIZE_Y, HEAD_SIZE_Z);
	_solid(gl, attribs, uniforms, headM, COLOR_HEAD);

	// pink snout sticking out the front
	var snoutM = new Matrix4(headFrame);
	snoutM.translate(HEAD_SIZE_X + SNOUT_SIZE_X * 0.5, -HEAD_SIZE_Y * 0.15, 0);
	snoutM.scale(SNOUT_SIZE_X, SNOUT_SIZE_Y, SNOUT_SIZE_Z);
	_solid(gl, attribs, uniforms, snoutM, COLOR_SNOUT);

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
		_solid(gl, attribs, uniforms, nostril, COLOR_NOSTRIL);
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
		_solid(gl, attribs, uniforms, eye, COLOR_EYE);
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
		_solid(gl, attribs, uniforms, ear, COLOR_EAR);
	}

	// texas longhorn-style horns two cylinder segments per side
	for (var i = 0; i < 2; i++) {
		_drawHorn(gl, attribs, uniforms, headFrame, sides[i]);
	}
}

// one longhorn-style horn (inner near the head, outer curves forward and up)
function _drawHorn(gl, attribs, uniforms, headFrame, sgn) {
	// horn root sits on the temple just behind the eye line
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

	// inner half thicker, closer to the head
	var inner = new Matrix4(hornFrame);
	inner.translate(0, HORN_LEN * 0.5, 0);
	inner.scale(HORN_RADIUS * 2.2, HORN_LEN, HORN_RADIUS * 2.2);
	Cylinder.draw(gl, attribs, uniforms, inner, COLOR_HORN);

	// move pivot to the kink and add the forward / upward curve
	hornFrame.translate(0, HORN_LEN, 0);
	hornFrame.rotate(-18, 0, 0, 1);
	hornFrame.rotate(sgn * 8, 1, 0, 0);

	// outer half longer and tapered
	var outer = new Matrix4(hornFrame);
	outer.translate(0, HORN_LEN * 0.5, 0);
	outer.scale(HORN_RADIUS * 1.7, HORN_LEN, HORN_RADIUS * 1.7);
	Cylinder.draw(gl, attribs, uniforms, outer, COLOR_HORN);

	// dark tip block at the very end
	var tip = new Matrix4(hornFrame);
	tip.translate(0, HORN_LEN, 0);
	tip.scale(HORN_RADIUS * 1.4, HORN_RADIUS * 1.6, HORN_RADIUS * 1.4);
	_solid(gl, attribs, uniforms, tip, COLOR_HORN_TIP);
}

// one leg, three segments deep (Matsuda Ch9 p.328, Shirley Ch6.5)
function _drawLeg(gl, attribs, uniforms, parentFrame, hipX, hipY, hipZ, thighDeg, calfDeg, hoofDeg) {
	// level 1 thigh swings forward and back around z
	var thighFrame = new Matrix4(parentFrame);
	thighFrame.translate(hipX, hipY, hipZ);
	thighFrame.rotate(thighDeg, 0, 0, 1);

	var thighM = new Matrix4(thighFrame);
	thighM.translate(0, -THIGH_LEN * 0.5, 0);
	thighM.scale(THIGH_W, THIGH_LEN, THIGH_W);
	_solid(gl, attribs, uniforms, thighM, COLOR_HEAD);

	// level 2 calf inherits the thigh frame
	var calfFrame = new Matrix4(thighFrame);
	calfFrame.translate(0, -THIGH_LEN, 0);
	calfFrame.rotate(calfDeg, 0, 0, 1);

	var calfM = new Matrix4(calfFrame);
	calfM.translate(0, -CALF_LEN * 0.5, 0);
	calfM.scale(CALF_W, CALF_LEN, CALF_W);
	_solid(gl, attribs, uniforms, calfM, COLOR_HEAD);

	// level 3 hoof inherits the calf frame
	var hoofFrame = new Matrix4(calfFrame);
	hoofFrame.translate(0, -CALF_LEN, 0);
	hoofFrame.rotate(hoofDeg, 0, 0, 1);

	var hoofM = new Matrix4(hoofFrame);
	hoofM.translate(HOOF_W * 0.10, -HOOF_H * 0.5, 0);
	hoofM.scale(HOOF_W, HOOF_H, HOOF_D);
	_solid(gl, attribs, uniforms, hoofM, COLOR_HOOF);
}

// tail is also a 3-segment chain
function _drawTail(gl, attribs, uniforms, bodyFrame, jointAngles) {
	// pivot at the rear-top of the body
	var tailFrame = new Matrix4(bodyFrame);
	tailFrame.translate(-BODY_LEN * 0.5, BODY_HEIGHT * 0.10, 0);
	tailFrame.rotate(jointAngles.tail_1, 0, 1, 0);
	tailFrame.rotate(35, 0, 0, 1);

	// base segment pointing back along -x
	var baseM = new Matrix4(tailFrame);
	baseM.translate(-TAIL_BASE_LEN * 0.5, 0, 0);
	baseM.scale(TAIL_BASE_LEN, TAIL_BASE_W, TAIL_BASE_W);
	_solid(gl, attribs, uniforms, baseM, COLOR_TAIL);

	// mid segment chained off the base
	var midFrame = new Matrix4(tailFrame);
	midFrame.translate(-TAIL_BASE_LEN, 0, 0);
	midFrame.rotate(jointAngles.tail_2, 0, 1, 0);
	midFrame.rotate(15, 0, 0, 1);

	var midM = new Matrix4(midFrame);
	midM.translate(-TAIL_MID_LEN * 0.5, 0, 0);
	midM.scale(TAIL_MID_LEN, TAIL_MID_W, TAIL_MID_W);
	_solid(gl, attribs, uniforms, midM, COLOR_TAIL);

	// tip segment chained off the middle, dark tuft color
	var tipFrame = new Matrix4(midFrame);
	tipFrame.translate(-TAIL_MID_LEN, 0, 0);
	tipFrame.rotate(jointAngles.tail_3, 0, 1, 0);

	var tipM = new Matrix4(tipFrame);
	tipM.translate(-TAIL_TIP_LEN * 0.5, 0, 0);
	tipM.scale(TAIL_TIP_LEN, TAIL_TIP_W, TAIL_TIP_W);
	_solid(gl, attribs, uniforms, tipM, COLOR_TAIL_TIP);
}
