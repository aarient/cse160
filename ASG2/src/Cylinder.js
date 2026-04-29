// Cylinder.js
// Cylinder used as the ox horns
// the assignment rubric requires at least one non-cube
// approach is the same as the circle in asg1 (Matsuda Ch3 p.71)
// surface generation theory: Shirley Ch12 (Data Structures for Graphics)

var Cylinder = {

	// vbo and vertex count get filled in by init()
	buffer: null,
	vertexCount: 0,

	// pretend "sun" direction for shading (already roughly normalized)
	// dot product with vertex normal gives a fake brightness factor
	LIGHT: [0.39, 0.78, 0.49],

	// remap dot(n, light) from [-1, 1] to [0.4, 1.0]
	// keeps backside faces visible instead of going pure black
	shadeFromNormal: function(nx, ny, nz) {
		var d = nx * this.LIGHT[0] + ny * this.LIGHT[1] + nz * this.LIGHT[2];
		return 0.4 + 0.6 * (d * 0.5 + 0.5);
	},

	// build the cylinder as a triangle soup
	// y axis is the long axis, height 1 from -0.5 to +0.5, radius 0.5
	// each side segment becomes 2 triangles, each cap segment becomes 1 triangle
	buildVertices: function(segments) {
		var radius = 0.5;
		var halfH = 0.5;
		var verts = [];

		var topShade = this.shadeFromNormal(0, 1, 0);
		var botShade = this.shadeFromNormal(0, -1, 0);

		// loop around the cylinder (Matsuda p.71 has the same idea for a circle)
		for (var i = 0; i < segments; i++) {
			var a1 = (2 * Math.PI) * (i / segments);
			var a2 = (2 * Math.PI) * ((i + 1) / segments);

			var c1 = Math.cos(a1), s1 = Math.sin(a1);
			var c2 = Math.cos(a2), s2 = Math.sin(a2);

			var x1 = radius * c1, z1 = radius * s1;
			var x2 = radius * c2, z2 = radius * s2;

			// outward radial normal lets us shade each side strip
			var sideShade1 = this.shadeFromNormal(c1, 0, s1);
			var sideShade2 = this.shadeFromNormal(c2, 0, s2);

			// side quad as two triangles (going around the cylinder)
			verts.push(x1, -halfH, z1, sideShade1);
			verts.push(x2, -halfH, z2, sideShade2);
			verts.push(x2,  halfH, z2, sideShade2);

			verts.push(x1, -halfH, z1, sideShade1);
			verts.push(x2,  halfH, z2, sideShade2);
			verts.push(x1,  halfH, z1, sideShade1);

			// top cap: triangle fan from the center point
			verts.push(0,   halfH, 0,  topShade);
			verts.push(x1,  halfH, z1, topShade);
			verts.push(x2,  halfH, z2, topShade);

			// bottom cap: triangle fan with reverse winding
			verts.push(0,  -halfH, 0,  botShade);
			verts.push(x2, -halfH, z2, botShade);
			verts.push(x1, -halfH, z1, botShade);
		}

		return new Float32Array(verts);
	},

	// build and upload once
	init: function(gl, segments) {
		if (!gl) {
			console.log('Cylinder.init: gl context is null');
			return false;
		}
		if (this.buffer) {
			return true;
		}

		var seg = segments || 24;
		var data = this.buildVertices(seg);
		this.vertexCount = data.length / 4;

		// create and fill the buffer (Matsuda p.79-80)
		this.buffer = gl.createBuffer();
		if (!this.buffer) {
			console.log('Cylinder.init: failed to create buffer');
			return false;
		}

		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
		gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

		return true;
	},

	// bind, set uniforms, draw (same pattern as Cube.draw)
	draw: function(gl, attribs, uniforms, modelMatrix, color) {
		if (!this.buffer) {
			console.log('Cylinder.draw called before init');
			return;
		}

		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);

		// stride 16 bytes, position then shade (Matsuda p.81)
		gl.vertexAttribPointer(attribs.position, 3, gl.FLOAT, false, 16, 0);
		gl.enableVertexAttribArray(attribs.position);

		gl.vertexAttribPointer(attribs.shade, 1, gl.FLOAT, false, 16, 12);
		gl.enableVertexAttribArray(attribs.shade);

		// model matrix uniform (Matsuda p.108)
		gl.uniformMatrix4fv(uniforms.modelMatrix, false, modelMatrix.elements);

		// color uniform (Matsuda p.58)
		var alpha = color.length > 3 ? color[3] : 1.0;
		gl.uniform4f(uniforms.color, color[0], color[1], color[2], alpha);

		gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);
	}
};
