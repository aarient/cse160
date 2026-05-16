// Cube.js
// textured unit cube (positions, uv, face shade) used by the ox and one-offs
// based on Matsuda Ch5 TexturedQuad (p.146) and Ch7 HelloCube (p.215)
// transformation theory Shirley Ch6 (3D Linear Transformations)

var Cube = {

	// shared vbo built once, reused every frame
	buffer: null,

	// 6 faces * 2 triangles * 3 vertices
	vertexCount: 36,

	// fake sun shading per face so cubes do not look flat (Shirley Ch10)
	SHADE_TOP:    0.95,
	SHADE_BOTTOM: 0.55,
	SHADE_FRONT:  0.85,
	SHADE_BACK:   0.62,
	SHADE_RIGHT:  0.78,
	SHADE_LEFT:   0.68,

	// push two triangles for one square face with uv corners
	// vertex order goes around the face a, b, c, d
	pushFace: function(out, shade, a, b, c, d) {
		// uvs a=(0,0), b=(1,0), c=(1,1), d=(0,1)
		var pts = [
			[a, [0, 0]],
			[b, [1, 0]],
			[c, [1, 1]],
			[a, [0, 0]],
			[c, [1, 1]],
			[d, [0, 1]]
		];
		for (var i = 0; i < 6; i++) {
			var p = pts[i][0];
			var uv = pts[i][1];
			out.push(p[0], p[1], p[2], uv[0], uv[1], shade);
		}
	},

	// build the full vertex array for the unit cube (range -0.5 to 0.5)
	buildVertices: function() {
		var v = [];

		// 8 corners named by sign of x y z (n = negative, p = positive)
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

	// also expose the raw vertex layout so the world mesh can bake transforms in
	// returns plain arrays so the world batcher can pre-multiply by a model matrix
	// each face is described as 6 verts of (pos, uv, shade)
	getRawVertices: function() {
		var arr = this.buildVertices();
		return arr;
	},

	// upload the cube data once at startup (Matsuda p.79)
	init: function(gl) {
		if (!gl) {
			console.log('Cube.init: gl context is null');
			return false;
		}
		if (this.buffer) {
			return true;
		}

		var data = this.buildVertices();

		// create and fill the vbo (Matsuda p.79-80)
		this.buffer = gl.createBuffer();
		if (!this.buffer) {
			console.log('Cube.init: failed to create buffer');
			return false;
		}
		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
		gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

		return true;
	},

	// bind buffer, set uniforms, draw the cube
	// opts { color, texNum, texWeight }
	// texNum picks which sampler unit, texWeight=0 means solid color (Matsuda p.183)
	draw: function(gl, attribs, uniforms, modelMatrix, opts) {
		if (!this.buffer) {
			console.log('Cube.draw called before init');
			return;
		}

		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);

		// stride 3 pos + 2 uv + 1 shade = 6 floats * 4 bytes = 24
		var FSIZE = 4;
		gl.vertexAttribPointer(attribs.position, 3, gl.FLOAT, false, 6 * FSIZE, 0);
		gl.enableVertexAttribArray(attribs.position);

		gl.vertexAttribPointer(attribs.uv, 2, gl.FLOAT, false, 6 * FSIZE, 3 * FSIZE);
		gl.enableVertexAttribArray(attribs.uv);

		gl.vertexAttribPointer(attribs.shade, 1, gl.FLOAT, false, 6 * FSIZE, 5 * FSIZE);
		gl.enableVertexAttribArray(attribs.shade);

		// upload the model matrix (Matsuda p.108)
		gl.uniformMatrix4fv(uniforms.modelMatrix, false, modelMatrix.elements);

		// pick texture unit and base color blend (Matsuda p.183)
		var color = opts.color || [1, 1, 1, 1];
		var alpha = color.length > 3 ? color[3] : 1.0;
		gl.uniform4f(uniforms.baseColor, color[0], color[1], color[2], alpha);
		gl.uniform1i(uniforms.whichTex, opts.texNum != null ? opts.texNum : 0);
		gl.uniform1f(uniforms.texColorWeight, opts.texWeight != null ? opts.texWeight : 0.0);

		// draw 36 triangle vertices (Matsuda p.46)
		gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);
	}
};
