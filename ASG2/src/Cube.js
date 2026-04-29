// Cube.js
// unit cube built from triangles
// based on the cube setup in Matsuda Ch7 p.215 (HelloCube)
// transformation theory: Shirley Ch6 (3D Linear Transformations)

// shared cube object used by every cube part of the ox

var Cube = {

	// vbo gets created once in init() and reused every frame
	buffer: null,

	// 6 faces * 2 triangles * 3 vertices
	vertexCount: 36,

	// fake "sun" shading factor per face so cubes don't look flat
	// (Shirley Ch10 covers shading models in more detail)
	SHADE_TOP:    0.93,
	SHADE_BOTTOM: 0.47,
	SHADE_FRONT:  0.85,
	SHADE_BACK:   0.55,
	SHADE_RIGHT:  0.82,
	SHADE_LEFT:   0.58,

	// push two triangles for one square face
	// vertices come in order a, b, c, d going around the face
	pushFace: function(out, shade, a, b, c, d) {
		var pts = [a, b, c, a, c, d];
		for (var i = 0; i < 6; i++) {
			out.push(pts[i][0], pts[i][1], pts[i][2], shade);
		}
	},

	// build the full vertex array for the unit cube
	// cube goes from -0.5 to 0.5 on each axis (Matsuda p.215)
	buildVertices: function() {
		var v = [];

		// 8 corners, named by sign of x y z (n = negative, p = positive)
		var nnn = [-0.5, -0.5, -0.5];
		var pnn = [+0.5, -0.5, -0.5];
		var npn = [-0.5, +0.5, -0.5];
		var ppn = [+0.5, +0.5, -0.5];
		var nnp = [-0.5, -0.5, +0.5];
		var pnp = [+0.5, -0.5, +0.5];
		var npp = [-0.5, +0.5, +0.5];
		var ppp = [+0.5, +0.5, +0.5];

		// top face (+y)
		this.pushFace(v, this.SHADE_TOP, npn, npp, ppp, ppn);

		// bottom face (-y)
		this.pushFace(v, this.SHADE_BOTTOM, nnp, nnn, pnn, pnp);

		// front face (+z)
		this.pushFace(v, this.SHADE_FRONT, nnp, pnp, ppp, npp);

		// back face (-z)
		this.pushFace(v, this.SHADE_BACK, pnn, nnn, npn, ppn);

		// right face (+x)
		this.pushFace(v, this.SHADE_RIGHT, pnp, pnn, ppn, ppp);

		// left face (-x)
		this.pushFace(v, this.SHADE_LEFT, nnn, nnp, npp, npn);

		return new Float32Array(v);
	},

	// upload the cube data once at startup
	// buffer object pattern from Matsuda p.78
	init: function(gl) {
		if (!gl) {
			console.log('Cube.init: gl context is null');
			return false;
		}
		if (this.buffer) {
			return true;
		}

		var data = this.buildVertices();

		// create a buffer object (Matsuda p.79)
		this.buffer = gl.createBuffer();
		if (!this.buffer) {
			console.log('Cube.init: failed to create buffer');
			return false;
		}

		// bind the buffer object to a target (Matsuda p.79)
		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);

		// write data into the buffer (Matsuda p.80)
		gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

		return true;
	},

	// bind buffer, set uniforms, draw
	// attribs and uniforms are looked up once in main and passed in
	// (Matsuda p.81 explains vertexAttribPointer)
	draw: function(gl, attribs, uniforms, modelMatrix, color) {
		if (!this.buffer) {
			console.log('Cube.draw called before init');
			return;
		}

		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);

		// stride is 4 floats (x y z shade) * 4 bytes = 16 bytes per vertex
		gl.vertexAttribPointer(attribs.position, 3, gl.FLOAT, false, 16, 0);
		gl.enableVertexAttribArray(attribs.position);

		// shade attribute starts 12 bytes into each vertex
		gl.vertexAttribPointer(attribs.shade, 1, gl.FLOAT, false, 16, 12);
		gl.enableVertexAttribArray(attribs.shade);

		// upload the model matrix (Matsuda p.108)
		gl.uniformMatrix4fv(uniforms.modelMatrix, false, modelMatrix.elements);

		// uniform4f sends one rgba color (Matsuda p.58)
		var alpha = color.length > 3 ? color[3] : 1.0;
		gl.uniform4f(uniforms.color, color[0], color[1], color[2], alpha);

		// draw 36 triangle vertices (Matsuda p.46)
		gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);
	}
};
