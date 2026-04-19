// Circle.js
// draws a circle using a triangle fan (series of triangles)

class Circle {
	constructor() {
		this.type = 'circle';
		this.position = [0.0, 0.0];
		this.color = [1.0, 1.0, 1.0, 1.0];
		this.size = 5.0;
		this.segments = 10;
	}

	render() {
		var xy = this.position;
		var rgba = this.color;
		var size = this.size;

		gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
		gl.uniform1f(u_Size, size);

		// scale radius to webgl coords
		var d = size / 100.0;

		// how many degrees each triangle wedge covers
		var angleStep = 360 / this.segments;

		// build all vertices into one array to draw at once
		// avoids alpha overlap artifacts at the center
		var vertices = [];
		for (var angle = 0; angle < 360; angle += angleStep) {
			var a1 = angle * Math.PI / 180;
			var a2 = (angle + angleStep) * Math.PI / 180;

			vertices.push(xy[0], xy[1]);
			vertices.push(xy[0] + d * Math.cos(a1), xy[1] + d * Math.sin(a1));
			vertices.push(xy[0] + d * Math.cos(a2), xy[1] + d * Math.sin(a2));
		}

		// draw all wedges in one call
		var vertexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
		gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(a_Position);
		gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);
	}
}