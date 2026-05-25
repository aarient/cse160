// Sphere mesh for Phong lighting
// built with lat/lon grid, normal = position for unit sphere (textbook p.192)
// https://medium.com/game-dev-daily/four-ways-to-create-a-mesh-for-a-sphere-d7956b825db4
var Sphere = {
	buffer: null,
	vertexCount: 0,

	// generate triangles from lat/lon grid
	buildVertices: function(latBands, lonBands) {
		var verts = [];
		for (var lat = 0; lat < latBands; lat++) {
			var theta1 = (lat / latBands) * Math.PI;
			var theta2 = ((lat + 1) / latBands) * Math.PI;

			for (var lon = 0; lon < lonBands; lon++) {
				var phi1 = (lon / lonBands) * 2 * Math.PI;
				var phi2 = ((lon + 1) / lonBands) * 2 * Math.PI;

				// four corners of this quad
				var x1 = Math.sin(theta1) * Math.cos(phi1);
				var y1 = Math.cos(theta1);
				var z1 = Math.sin(theta1) * Math.sin(phi1);

				var x2 = Math.sin(theta1) * Math.cos(phi2);
				var y2 = Math.cos(theta1);
				var z2 = Math.sin(theta1) * Math.sin(phi2);

				var x3 = Math.sin(theta2) * Math.cos(phi1);
				var y3 = Math.cos(theta2);
				var z3 = Math.sin(theta2) * Math.sin(phi1);

				var x4 = Math.sin(theta2) * Math.cos(phi2);
				var y4 = Math.cos(theta2);
				var z4 = Math.sin(theta2) * Math.sin(phi2);

				// normal = position on unit sphere
				verts.push(x1,y1,z1, x1,y1,z1);
				verts.push(x3,y3,z3, x3,y3,z3);
				verts.push(x2,y2,z2, x2,y2,z2);

				verts.push(x2,y2,z2, x2,y2,z2);
				verts.push(x3,y3,z3, x3,y3,z3);
				verts.push(x4,y4,z4, x4,y4,z4);
			}
		}
		return new Float32Array(verts);
	},

	init: function(gl, latBands, lonBands) {
		if (this.buffer) return true;
		var data = this.buildVertices(latBands || 16, lonBands || 16);
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

		// stride 24: pos(3 floats) + normal(3 floats), 4 bytes each
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
