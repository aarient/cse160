// Cylinder for Phong lighting (textbook p.191-196)
// y-axis aligned, height 1, radius 0.5
// side normals point radially outward, caps are flat
var Cylinder = {
	buffer: null,
	vertexCount: 0,

	buildVertices: function(segments) {
		var r = 0.5, h = 0.5;
		var verts = [];

		for (var i = 0; i < segments; i++) {
			var a1 = (2 * Math.PI) * (i / segments);
			var a2 = (2 * Math.PI) * ((i + 1) / segments);
			var c1 = Math.cos(a1), s1 = Math.sin(a1);
			var c2 = Math.cos(a2), s2 = Math.sin(a2);
			var x1 = r * c1, z1 = r * s1;
			var x2 = r * c2, z2 = r * s2;

			// side quad (two tris), normal = radial direction
			verts.push(x1,-h,z1, c1,0,s1);
			verts.push(x2,-h,z2, c2,0,s2);
			verts.push(x2, h,z2, c2,0,s2);
			verts.push(x1,-h,z1, c1,0,s1);
			verts.push(x2, h,z2, c2,0,s2);
			verts.push(x1, h,z1, c1,0,s1);

			// top cap, normal straight up
			verts.push(0,  h, 0,  0, 1, 0);
			verts.push(x1, h, z1, 0, 1, 0);
			verts.push(x2, h, z2, 0, 1, 0);

			// bottom cap, normal straight down
			verts.push(0, -h, 0,  0,-1, 0);
			verts.push(x2,-h, z2, 0,-1, 0);
			verts.push(x1,-h, z1, 0,-1, 0);
		}
		return new Float32Array(verts);
	},

	init: function(gl, segments) {
		if (this.buffer) return true;
		var data = this.buildVertices(segments || 24);
		this.vertexCount = data.length / 6;
		this.buffer = gl.createBuffer();
		if (!this.buffer) return false;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
		gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
		return true;
	},

	draw: function(gl, a_Position, a_Normal, u_ModelMatrix, u_NormalMatrix, modelMatrix, color, u_Color) {
		if (!this.buffer) return;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);

		// stride 24: pos(3) + normal(3), 4 bytes each
		gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 24, 0);
		gl.enableVertexAttribArray(a_Position);
		gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 24, 12);
		gl.enableVertexAttribArray(a_Normal);

		gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

		// normal matrix = (M^-1)^T (textbook p.154-157)
		var nMat = new Matrix4();
		nMat.setInverseOf(modelMatrix);
		nMat.transpose();
		gl.uniformMatrix4fv(u_NormalMatrix, false, nMat.elements);

		gl.uniform4f(u_Color, color[0], color[1], color[2], color[3] || 1.0);
		gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);
	}
};
