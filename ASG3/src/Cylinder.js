// Cylinder.js
// cylinder used as the ox horns (carried over from ASG2)
// updated vertex layout to match the textured Cube pos x3, uv x2, shade x1
// uvs are zeros since the ox horns are solid color
// loop generation idea from Matsuda Ch3 p.71 (Circle)
// surface theory Shirley Ch12

var Cylinder = {

	buffer: null,
	vertexCount: 0,

	// pretend sun direction so cylinder sides do not all look identical
	LIGHT: [0.39, 0.78, 0.49],

	// remap dot(n, light) from [-1, 1] to [0.4, 1.0] so back faces are not pure black
	shadeFromNormal: function(nx, ny, nz) {
		var d = nx * this.LIGHT[0] + ny * this.LIGHT[1] + nz * this.LIGHT[2];
		return 0.4 + 0.6 * (d * 0.5 + 0.5);
	},

	// build the cylinder as a triangle soup (y axis is the long axis)
	buildVertices: function(segments) {
		var radius = 0.5;
		var halfH = 0.5;
		var verts = [];

		var topShade = this.shadeFromNormal(0, 1, 0);
		var botShade = this.shadeFromNormal(0, -1, 0);

		for (var i = 0; i < segments; i++) {
			var a1 = (2 * Math.PI) * (i / segments);
			var a2 = (2 * Math.PI) * ((i + 1) / segments);

			var c1 = Math.cos(a1), s1 = Math.sin(a1);
			var c2 = Math.cos(a2), s2 = Math.sin(a2);

			var x1 = radius * c1, z1 = radius * s1;
			var x2 = radius * c2, z2 = radius * s2;

			var sideShade1 = this.shadeFromNormal(c1, 0, s1);
			var sideShade2 = this.shadeFromNormal(c2, 0, s2);

			// side quad as two triangles, uvs left as zeros
			verts.push(x1, -halfH, z1, 0, 0, sideShade1);
			verts.push(x2, -halfH, z2, 0, 0, sideShade2);
			verts.push(x2,  halfH, z2, 0, 0, sideShade2);

			verts.push(x1, -halfH, z1, 0, 0, sideShade1);
			verts.push(x2,  halfH, z2, 0, 0, sideShade2);
			verts.push(x1,  halfH, z1, 0, 0, sideShade1);

			// top cap fan
			verts.push(0,   halfH, 0,  0, 0, topShade);
			verts.push(x1,  halfH, z1, 0, 0, topShade);
			verts.push(x2,  halfH, z2, 0, 0, topShade);

			// bottom cap fan with reverse winding
			verts.push(0,  -halfH, 0,  0, 0, botShade);
			verts.push(x2, -halfH, z2, 0, 0, botShade);
			verts.push(x1, -halfH, z1, 0, 0, botShade);
		}

		return new Float32Array(verts);
	},

	// build and upload once (Matsuda p.79)
	init: function(gl, segments) {
		if (!gl) {
			console.log('Cylinder.init: gl context is null');
			return false;
		}
		if (this.buffer) return true;

		var seg = segments || 24;
		var data = this.buildVertices(seg);
		this.vertexCount = data.length / 6;

		this.buffer = gl.createBuffer();
		if (!this.buffer) {
			console.log('Cylinder.init: failed to create buffer');
			return false;
		}
		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
		gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
		return true;
	},

	// solid color draw (texWeight forced to 0)
	draw: function(gl, attribs, uniforms, modelMatrix, color) {
		if (!this.buffer) {
			console.log('Cylinder.draw called before init');
			return;
		}

		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);

		// stride is 6 floats pos x3, uv x2, shade x1
		var FSIZE = 4;
		gl.vertexAttribPointer(attribs.position, 3, gl.FLOAT, false, 6 * FSIZE, 0);
		gl.enableVertexAttribArray(attribs.position);

		gl.vertexAttribPointer(attribs.uv, 2, gl.FLOAT, false, 6 * FSIZE, 3 * FSIZE);
		gl.enableVertexAttribArray(attribs.uv);

		gl.vertexAttribPointer(attribs.shade, 1, gl.FLOAT, false, 6 * FSIZE, 5 * FSIZE);
		gl.enableVertexAttribArray(attribs.shade);

		gl.uniformMatrix4fv(uniforms.modelMatrix, false, modelMatrix.elements);

		var alpha = color.length > 3 ? color[3] : 1.0;
		gl.uniform4f(uniforms.baseColor, color[0], color[1], color[2], alpha);
		gl.uniform1i(uniforms.whichTex, 0);
		gl.uniform1f(uniforms.texColorWeight, 0.0);

		gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);
	}
};
