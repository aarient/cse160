// Cube with per-face normals for Phong lighting
// each face gets its own flat normal (textbook p.191-196)
var Cube = {
	buffer: null,
	vertexCount: 36,

	// two triangles for one quad face, all sharing the same normal
	pushFace: function(out, nx, ny, nz, a, b, c, d) {
		var pts = [a, b, c, a, c, d];
		for (var i = 0; i < 6; i++) {
			out.push(pts[i][0], pts[i][1], pts[i][2], nx, ny, nz);
		}
	},

	// interleaved pos(3) + normal(3) per vertex
	buildVertices: function() {
		var v = [];
		// unit cube corners: combos of +/-0.5
		var nnn = [-0.5,-0.5,-0.5], pnn = [0.5,-0.5,-0.5];
		var npn = [-0.5, 0.5,-0.5], ppn = [0.5, 0.5,-0.5];
		var nnp = [-0.5,-0.5, 0.5], pnp = [0.5,-0.5, 0.5];
		var npp = [-0.5, 0.5, 0.5], ppp = [0.5, 0.5, 0.5];

		this.pushFace(v,  0, 1, 0, npn, npp, ppp, ppn);  // top
		this.pushFace(v,  0,-1, 0, nnp, nnn, pnn, pnp);  // bottom
		this.pushFace(v,  0, 0, 1, nnp, pnp, ppp, npp);  // front
		this.pushFace(v,  0, 0,-1, pnn, nnn, npn, ppn);  // back
		this.pushFace(v,  1, 0, 0, pnp, pnn, ppn, ppp);  // right
		this.pushFace(v, -1, 0, 0, nnn, nnp, npp, npn);  // left
		return new Float32Array(v);
	},

	init: function(gl) {
		if (this.buffer) return true;
		var data = this.buildVertices();
		this.buffer = gl.createBuffer();
		if (!this.buffer) return false;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
		gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
		return true;
	},

	// https://www.w3schools.com/graphics/webgl_drawing.asp
	draw: function(gl, a_Position, a_Normal, u_ModelMatrix, u_NormalMatrix, modelMatrix, color, u_Color) {
		if (!this.buffer) return;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);

		// 6 floats per vertex, 4 bytes each = stride 24
		gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 24, 0);
		gl.enableVertexAttribArray(a_Position);
		gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 24, 12);
		gl.enableVertexAttribArray(a_Normal);

		gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

		// normal matrix = (M^-1)^T (textbook p.154-157)
		// http://www.lighthouse3d.com/tutorials/glsl-12-tutorial/the-normal-matrix/
		var nMat = new Matrix4();
		nMat.setInverseOf(modelMatrix);
		nMat.transpose();
		gl.uniformMatrix4fv(u_NormalMatrix, false, nMat.elements);

		gl.uniform4f(u_Color, color[0], color[1], color[2], color[3] || 1.0);
		gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);
	}
};
