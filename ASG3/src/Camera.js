// Camera.js
// first person camera per assignment spec (Matsuda Ch7 p.222 PerspectiveView_mvp)
// movement math reference Shirley Ch7 (Viewing) and Ch6.5 (coordinate frames)

class Camera {
	constructor(canvas) {
		// field of view, default 60 like the spec asks
		this.fov = 60;

		// where the camera is, where it looks at, and which way is up
		// spawn at the south end of the path so the tori gate and temple are straight ahead
		this.eye = new Vector3([24.5, 1.7, 42]);
		this.at = new Vector3([24.5, 1.7, 24]);
		this.up = new Vector3([0, 1, 0]);

		// view + projection (Matsuda p.197)
		this.viewMatrix = new Matrix4();
		this.projectionMatrix = new Matrix4();

		// scratch matrices used by pan so we do not allocate every frame
		this._rot = new Matrix4();

		// store canvas for aspect ratio
		this.canvas = canvas;

		this.updateView();
		this.updateProjection();
	}

	// rebuild view matrix from eye / at / up (Matsuda p.197)
	updateView() {
		this.viewMatrix.setLookAt(
			this.eye.elements[0], this.eye.elements[1], this.eye.elements[2],
			this.at.elements[0], this.at.elements[1], this.at.elements[2],
			this.up.elements[0], this.up.elements[1], this.up.elements[2]
		);
	}

	// rebuild projection from current fov and canvas size (Matsuda p.198)
	updateProjection() {
		this.projectionMatrix.setPerspective(
			this.fov,
			this.canvas.width / this.canvas.height,
			0.1,
			1000
		);
	}

	// walk forward along the look direction
	moveForward(speed) {
		var f = new Vector3();
		f.set(this.at);
		f.sub(this.eye);
		f.normalize();
		f.mul(speed);
		this.eye.add(f);
		this.at.add(f);
		this.updateView();
	}

	// walk backward along the look direction
	moveBackwards(speed) {
		var b = new Vector3();
		b.set(this.eye);
		b.sub(this.at);
		b.normalize();
		b.mul(speed);
		this.eye.add(b);
		this.at.add(b);
		this.updateView();
	}

	// strafe left side vector is up cross forward
	moveLeft(speed) {
		var f = new Vector3();
		f.set(this.at);
		f.sub(this.eye);
		var s = Vector3.cross(this.up, f);
		s.normalize();
		s.mul(speed);
		this.eye.add(s);
		this.at.add(s);
		this.updateView();
	}

	// strafe right opposite side vector forward cross up
	moveRight(speed) {
		var f = new Vector3();
		f.set(this.at);
		f.sub(this.eye);
		var s = Vector3.cross(f, this.up);
		s.normalize();
		s.mul(speed);
		this.eye.add(s);
		this.at.add(s);
		this.updateView();
	}

	// rotate the at point around eye by alpha around the up axis
	panLeft(alpha) {
		var f = new Vector3();
		f.set(this.at);
		f.sub(this.eye);
		this._rot.setRotate(
			alpha,
			this.up.elements[0],
			this.up.elements[1],
			this.up.elements[2]
		);
		var fp = this._rot.multiplyVector3(f);
		// at = eye + fp
		this.at.set(this.eye);
		this.at.add(fp);
		this.updateView();
	}

	// rotate by -alpha to look the other way
	panRight(alpha) {
		this.panLeft(-alpha);
	}

	// mouse-driven yaw using the relative dx
	mouseYaw(dx) {
		this.panLeft(-dx * 0.25);
	}

	// mouse-driven pitch using the relative dy
	// rotates the at point around the side axis with a clamp so we cannot flip
	mousePitch(dy) {
		var f = new Vector3();
		f.set(this.at);
		f.sub(this.eye);
		var side = Vector3.cross(f, this.up);
		side.normalize();
		var alpha = -dy * 0.2;

		// keep camera from flipping over by limiting the pitch a bit
		var fy = f.elements[1] / Math.max(0.001, Math.hypot(f.elements[0], f.elements[1], f.elements[2]));
		var pitchNow = Math.asin(Math.max(-1, Math.min(1, fy))) * 180 / Math.PI;
		var newPitch = pitchNow + alpha;
		if (newPitch > 80) alpha = 80 - pitchNow;
		if (newPitch < -80) alpha = -80 - pitchNow;

		this._rot.setRotate(alpha, side.elements[0], side.elements[1], side.elements[2]);
		var fp = this._rot.multiplyVector3(f);
		this.at.set(this.eye);
		this.at.add(fp);
		this.updateView();
	}

	// returns the integer block in front of the camera one unit out
	// used by add/delete block to know where to drop a cube
	frontBlock(distance) {
		var f = new Vector3();
		f.set(this.at);
		f.sub(this.eye);
		f.normalize();
		f.mul(distance);
		var x = this.eye.elements[0] + f.elements[0];
		var z = this.eye.elements[2] + f.elements[2];
		return { x: Math.round(x), z: Math.round(z) };
	}
}
