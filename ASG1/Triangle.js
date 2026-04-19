// Triangle.js
// based on HelloTriangle (Matsuda Ch3, p.69)

class Triangle {
	constructor() {
		this.type = 'triangle';
		this.position = [0.0, 0.0];
		this.color = [1.0, 1.0, 1.0, 1.0];
		this.size = 5.0;
	}

	render() {
		var xy = this.position;
		var rgba = this.color;
		var size = this.size;

		gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
		gl.uniform1f(u_Size, size);

		// calculate the triangle size based on the slider
		var d = size / 200.0;

		// draw a triangle centered at the click position
		drawTriangle([
			xy[0],       xy[1] + d,
			xy[0] - d,   xy[1] - d,
			xy[0] + d,   xy[1] - d
		]);
	}
}

// draw a triangle from 6 vertices [x1,y1, x2,y2, x3,y3]
// uses a buffer to pass vertex data to the GPU (Matsuda p.73)
function drawTriangle(vertices) {
	var n = 3;

	// create a buffer object (Matsuda p.74)
	var vertexBuffer = gl.createBuffer();
	if (!vertexBuffer) {
		console.log('Failed to create the buffer object');
		return -1;
	}

	// bind the buffer object to target (Matsuda p.74)
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

	// write data into the buffer object
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

	// assign the buffer object to a_Position and enable it
	gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(a_Position);

	// draw the triangle
	gl.drawArrays(gl.TRIANGLES, 0, n);
}