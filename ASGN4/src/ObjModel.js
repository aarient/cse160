// OBJ file loader with normals for Phong lighting (textbook p.191-196)
// https://en.wikipedia.org/wiki/Wavefront_.obj_file
var ObjModel = {
	buffer: null,
	vertexCount: 0,
	loaded: false,

	// parse .obj text into interleaved pos+normal array
	parse: function(text) {
		var pos = [], norms = [], verts = [];
		var lines = text.split('\n');

		for (var i = 0; i < lines.length; i++) {
			var line = lines[i].trim();
			if (line === '' || line[0] === '#') continue;
			var p = line.split(/\s+/);

			// vertex position
			if (p[0] === 'v') {
				pos.push([parseFloat(p[1]), parseFloat(p[2]), parseFloat(p[3])]);
			}
			// vertex normal
			if (p[0] === 'vn') {
				norms.push([parseFloat(p[1]), parseFloat(p[2]), parseFloat(p[3])]);
			}
			// face - handles v, v//vn, v/vt/vn
			// https://www.w3schools.com/graphics/webgl_drawing.asp
			if (p[0] === 'f') {
				var fv = [];
				for (var j = 1; j < p.length; j++) {
					var idx = p[j].split('/');
					// obj indices are 1-based
					var pi = parseInt(idx[0]) - 1;
					var ni = (idx.length >= 3 && idx[2] !== '') ? parseInt(idx[2]) - 1 : -1;
					fv.push({ p: pi, n: ni });
				}

				// fan triangulation for n-gon faces
				for (var j = 1; j < fv.length - 1; j++) {
					var tri = [fv[0], fv[j], fv[j + 1]];
					var p0 = pos[tri[0].p], p1 = pos[tri[1].p], p2 = pos[tri[2].p];

					// edge vectors for cross product
					var e1 = [p1[0]-p0[0], p1[1]-p0[1], p1[2]-p0[2]];
					var e2 = [p2[0]-p0[0], p2[1]-p0[1], p2[2]-p0[2]];

					// face normal via cross product
					var fn = [
						e1[1]*e2[2] - e1[2]*e2[1],
						e1[2]*e2[0] - e1[0]*e2[2],
						e1[0]*e2[1] - e1[1]*e2[0]
					];
					var len = Math.sqrt(fn[0]*fn[0] + fn[1]*fn[1] + fn[2]*fn[2]);
					if (len > 0.0001) { fn[0] /= len; fn[1] /= len; fn[2] /= len; }

					for (var k = 0; k < 3; k++) {
						var v = pos[tri[k].p];
						// prefer file normal, fall back to computed face normal
						var n = (tri[k].n >= 0 && norms.length > 0) ? norms[tri[k].n] : fn;
						verts.push(v[0], v[1], v[2], n[0], n[1], n[2]);
					}
				}
			}
		}
		return new Float32Array(verts);
	},

	// upload parsed data to gpu
	load: function(gl, text) {
		var data = this.parse(text);
		if (data.length === 0) { console.log('OBJ: no triangles parsed'); return false; }
		this.vertexCount = data.length / 6;
		this.centerAndScale(data);

		if (this.buffer) gl.deleteBuffer(this.buffer);
		this.buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
		gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
		this.loaded = true;
		console.log('OBJ loaded: ' + this.vertexCount + ' verts');
		return true;
	},

	// normalize model to fit [-0.5, 0.5] box centered at origin
	centerAndScale: function(data) {
		var minX = Infinity, minY = Infinity, minZ = Infinity;
		var maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

		for (var i = 0; i < data.length; i += 6) {
			var x = data[i], y = data[i+1], z = data[i+2];
			if (x < minX) minX = x; if (y < minY) minY = y; if (z < minZ) minZ = z;
			if (x > maxX) maxX = x; if (y > maxY) maxY = y; if (z > maxZ) maxZ = z;
		}

		var cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2;
		var scale = Math.max(maxX - minX, maxY - minY, maxZ - minZ);
		if (scale < 0.0001) scale = 1;

		for (var i = 0; i < data.length; i += 6) {
			data[i]   = (data[i]   - cx) / scale;
			data[i+1] = (data[i+1] - cy) / scale;
			data[i+2] = (data[i+2] - cz) / scale;
		}
	},

	draw: function(gl, a_Position, a_Normal, u_ModelMatrix, u_NormalMatrix, modelMatrix, color, u_Color) {
		if (!this.buffer || !this.loaded) return;
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
