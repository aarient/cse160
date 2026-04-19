// Point.js
// based on ColoredPoints (Matsuda Ch2, p.60)

class Point {
	constructor() {
		this.type = 'point';
		this.position = [0.0, 0.0];
		this.color = [1.0, 1.0, 1.0, 1.0];
		this.size = 5.0;
	}

	render() {
		var xy = this.position;
		var rgba = this.color;
		var size = this.size;

		// set the color for this shape (Matsuda p.58)
		gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

		// draw a square as two triangles
		var d = size / 200.0;
		drawTriangle([
			xy[0] - d, xy[1] - d,
			xy[0] + d, xy[1] - d,
			xy[0] + d, xy[1] + d
		]);
		drawTriangle([
			xy[0] - d, xy[1] - d,
			xy[0] + d, xy[1] + d,
			xy[0] - d, xy[1] + d
		]);
	}
}