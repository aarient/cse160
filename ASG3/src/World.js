// 48x48 voxel grid that batches one mesh per texture and culls hidden faces
// see Matsuda Ch5 for textures and Shirley Ch12 (data structures for graphics)

// block type ids that double as texture unit indices
var BLOCK_DIRT    = 1;
var BLOCK_STONE   = 2;
var BLOCK_BARK    = 3;
var BLOCK_BLOSSOM = 4;
var BLOCK_RED     = 5;
var BLOCK_BLACK   = 6;
var BLOCK_GOLD    = 7;
var BLOCK_WOOD    = 8;
var BLOCK_CREAM   = 9;
var BLOCK_TEAL    = 10;
var BLOCK_CHARCOAL = 11;

var BLOCK_TEX_UNIT = {
	1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, 11: 11
};

class World {
	constructor() {
		this.SIZE = 48;
		this.MAX_HEIGHT = 12;

		// grid[z][x] is the stack of block type ids growing upward from y=0
		this.grid = [];
		for (var z = 0; z < this.SIZE; z++) {
			var row = [];
			for (var x = 0; x < this.SIZE; x++) {
				row.push([]);
			}
			this.grid.push(row);
		}

		this.meshByTex = {};
		this.dirty = true;

		this.buildInitialLayout();
	}

	// build perimeter, trees, tori, temple, and the little village
	buildInitialLayout() {
		var S = this.SIZE;

		// dirt perimeter wall 2 high so you can see over it
		for (var i = 0; i < S; i++) {
			this.grid[0][i].push(BLOCK_DIRT);
			this.grid[0][i].push(BLOCK_DIRT);
			this.grid[S - 1][i].push(BLOCK_DIRT);
			this.grid[S - 1][i].push(BLOCK_DIRT);
			this.grid[i][0].push(BLOCK_DIRT);
			this.grid[i][0].push(BLOCK_DIRT);
			this.grid[i][S - 1].push(BLOCK_DIRT);
			this.grid[i][S - 1].push(BLOCK_DIRT);
		}

		// taller stone towers at each corner
		var corners = [[0, 0], [S - 1, 0], [0, S - 1], [S - 1, S - 1]];
		for (var c = 0; c < corners.length; c++) {
			this.stackColumn(corners[c][0], corners[c][1],
				[BLOCK_STONE, BLOCK_STONE, BLOCK_STONE, BLOCK_STONE]);
		}

		// two neat rows of cherry trees flanking the path
		var treeZs = [18, 22, 28, 32, 36, 40];
		for (var t = 0; t < treeZs.length; t++) {
			this.placeCherryTree(20, treeZs[t]);
			this.placeCherryTree(28, treeZs[t]);
		}

		// pagoda-style temple at the far end of the path
		this.placeTemple(24, 9);

		// small village behind the cherry blossoms with a different wall on each shop
		var westWalls = [BLOCK_WOOD, BLOCK_TEAL, BLOCK_CREAM];
		var eastWalls = [BLOCK_CHARCOAL, BLOCK_CREAM, BLOCK_WOOD];
		var shopZs = [20, 30, 40];
		for (var s = 0; s < shopZs.length; s++) {
			this.placeShop(10, shopZs[s], westWalls[s], 'east');
			this.placeShop(38, shopZs[s], eastWalls[s], 'west');
		}
	}

	stackColumn(x, z, blocks) {
		for (var i = 0; i < blocks.length; i++) {
			this.grid[z][x].push(blocks[i]);
		}
	}

	// minecraft-tree shape 3-tall bark trunk with a 3x3 blossom canopy on top
	placeCherryTree(x, z) {
		if (x < 1 || z < 1 || x > this.SIZE - 2 || z > this.SIZE - 2) return;

		this.grid[z][x].push(BLOCK_BARK);
		this.grid[z][x].push(BLOCK_BARK);
		this.grid[z][x].push(BLOCK_BARK);

		var topY = 3;
		for (var dz = -1; dz <= 1; dz++) {
			for (var dx = -1; dx <= 1; dx++) {
				var gx = x + dx;
				var gz = z + dz;
				if (gx < 0 || gz < 0 || gx >= this.SIZE || gz >= this.SIZE) continue;
				while (this.grid[gz][gx].length < topY) {
					this.grid[gz][gx].push(0);
				}
				this.grid[gz][gx][topY] = BLOCK_BLOSSOM;
			}
		}
		this.grid[z][x].push(BLOCK_BLOSSOM);
	}

	// red tori gate with two pillars, a kasagi crossbar, and swept-up sharp ends
	placeToriGate(cx, cz) {
		var H = 5;

		var pillars = [[cx - 3, cz], [cx + 3, cz]];
		for (var p = 0; p < 2; p++) {
			var px = pillars[p][0];
			var pz = pillars[p][1];
			for (var y = 0; y < H; y++) {
				this.setBlock(px, y, pz, BLOCK_RED);
			}
		}

		// nuki crossbar right under the kasagi
		for (var x = cx - 3; x <= cx + 3; x++) {
			this.setBlock(x, H, cz, BLOCK_RED);
		}

		// kasagi top beam, wider than the pillars
		for (var x = cx - 4; x <= cx + 4; x++) {
			this.setBlock(x, H + 1, cz, BLOCK_RED);
		}

		// swept-up sharp ends at each tip
		this.setBlock(cx - 5, H + 1, cz, BLOCK_RED);
		this.setBlock(cx + 5, H + 1, cz, BLOCK_RED);
		this.setBlock(cx - 5, H + 2, cz, BLOCK_RED);
		this.setBlock(cx + 5, H + 2, cz, BLOCK_RED);

		// gold center plaque
		this.setBlock(cx, H + 2, cz, BLOCK_GOLD);
	}

	// pagoda temple with 11x11 walls, a wide doorway, gold trim, and a tiered black roof
	placeTemple(cx, cz) {
		var half = 5;
		var wallH = 4;

		for (var dz = -half; dz <= half; dz++) {
			for (var dx = -half; dx <= half; dx++) {
				var onEdge = (Math.abs(dx) === half || Math.abs(dz) === half);
				if (onEdge) {
					for (var y = 0; y < wallH; y++) {
						this.setBlock(cx + dx, y, cz + dz, BLOCK_RED);
					}
				}
			}
		}

		// 3 wide x 3 high doorway on the south wall
		for (var dx = -1; dx <= 1; dx++) {
			for (var y = 0; y < 3; y++) {
				this.setBlock(cx + dx, y, cz + half, 0);
			}
		}

		// gold trim band wrapping the top of the walls
		for (var dz = -half; dz <= half; dz++) {
			for (var dx = -half; dx <= half; dx++) {
				if (Math.abs(dx) === half || Math.abs(dz) === half) {
					this.setBlock(cx + dx, wallH, cz + dz, BLOCK_GOLD);
				}
			}
		}

		// tiered black tile roof shrinking 13x13 down to 3x3 with a gold finial
		this.fillSlab(cx, 5, cz, 6, BLOCK_BLACK);
		this.fillSlab(cx, 6, cz, 5, BLOCK_BLACK);
		this.fillSlab(cx, 7, cz, 4, BLOCK_BLACK);
		this.fillSlab(cx, 8, cz, 3, BLOCK_BLACK);
		this.fillSlab(cx, 9, cz, 2, BLOCK_BLACK);
		this.fillSlab(cx, 10, cz, 1, BLOCK_BLACK);
		this.setBlock(cx, 11, cz, BLOCK_GOLD);
	}

	// small shop or house 5x5 walls, single doorway, overhanging black roof, gold finial
	placeShop(cx, cz, wallType, doorSide) {
		var half = 2;
		var H = 3;

		for (var dz = -half; dz <= half; dz++) {
			for (var dx = -half; dx <= half; dx++) {
				if (Math.abs(dx) === half || Math.abs(dz) === half) {
					for (var y = 0; y < H; y++) {
						this.setBlock(cx + dx, y, cz + dz, wallType);
					}
				}
			}
		}

		// knock a 1 wide x 2 high doorway on the chosen side
		if (doorSide === 'east') {
			this.setBlock(cx + half, 0, cz, 0);
			this.setBlock(cx + half, 1, cz, 0);
		} else if (doorSide === 'west') {
			this.setBlock(cx - half, 0, cz, 0);
			this.setBlock(cx - half, 1, cz, 0);
		} else if (doorSide === 'north') {
			this.setBlock(cx, 0, cz - half, 0);
			this.setBlock(cx, 1, cz - half, 0);
		} else if (doorSide === 'south') {
			this.setBlock(cx, 0, cz + half, 0);
			this.setBlock(cx, 1, cz + half, 0);
		}

		// overhanging black roof and a tiny gold finial on top
		this.fillSlab(cx, H, cz, half + 1, BLOCK_BLACK);
		this.setBlock(cx, H + 1, cz, BLOCK_GOLD);
	}

	// fill a flat horizontal slab of side (2*r + 1) at height y
	fillSlab(cx, y, cz, r, type) {
		for (var dz = -r; dz <= r; dz++) {
			for (var dx = -r; dx <= r; dx++) {
				this.setBlock(cx + dx, y, cz + dz, type);
			}
		}
	}

	// set a block at (x, y, z), padding the stack with 0s if needed
	setBlock(x, y, z, type) {
		if (x < 0 || z < 0 || x >= this.SIZE || z >= this.SIZE) return;
		while (this.grid[z][x].length <= y) this.grid[z][x].push(0);
		this.grid[z][x][y] = type;
	}

	// quick neighbor check used by face culling and collision
	isSolid(x, y, z) {
		if (x < 0 || z < 0 || x >= this.SIZE || z >= this.SIZE) return false;
		var stack = this.grid[z][x];
		if (y < 0 || y >= stack.length) return false;
		return stack[y] !== 0;
	}

	// rebuild the per-texture batched meshes from the grid, emitting only visible faces
	rebuildMesh(gl) {
		var perTex = {};
		var faceShades = {
			top: 0.95, bottom: 0.55, front: 0.85, back: 0.62, right: 0.78, left: 0.68
		};

		function addFace(tex, shade, verts) {
			if (!perTex[tex]) perTex[tex] = [];
			var bucket = perTex[tex];
			for (var i = 0; i < 6; i++) {
				var v = verts[i];
				bucket.push(v[0], v[1], v[2], v[3], v[4], shade);
			}
		}

		for (var z = 0; z < this.SIZE; z++) {
			for (var x = 0; x < this.SIZE; x++) {
				var stack = this.grid[z][x];
				for (var y = 0; y < stack.length; y++) {
					var t = stack[y];
					if (t === 0) continue;

					var x0 = x;
					var y0 = y;
					var z0 = z;
					var x1 = x + 1;
					var y1 = y + 1;
					var z1 = z + 1;

					if (!this.isSolid(x, y + 1, z)) {
						addFace(t, faceShades.top, [
							[x0, y1, z0, 0, 0],
							[x0, y1, z1, 1, 0],
							[x1, y1, z1, 1, 1],
							[x0, y1, z0, 0, 0],
							[x1, y1, z1, 1, 1],
							[x1, y1, z0, 0, 1]
						]);
					}
					if (!this.isSolid(x, y - 1, z)) {
						addFace(t, faceShades.bottom, [
							[x0, y0, z1, 0, 0],
							[x0, y0, z0, 1, 0],
							[x1, y0, z0, 1, 1],
							[x0, y0, z1, 0, 0],
							[x1, y0, z0, 1, 1],
							[x1, y0, z1, 0, 1]
						]);
					}
					if (!this.isSolid(x, y, z + 1)) {
						addFace(t, faceShades.front, [
							[x0, y0, z1, 0, 0],
							[x1, y0, z1, 1, 0],
							[x1, y1, z1, 1, 1],
							[x0, y0, z1, 0, 0],
							[x1, y1, z1, 1, 1],
							[x0, y1, z1, 0, 1]
						]);
					}
					if (!this.isSolid(x, y, z - 1)) {
						addFace(t, faceShades.back, [
							[x1, y0, z0, 0, 0],
							[x0, y0, z0, 1, 0],
							[x0, y1, z0, 1, 1],
							[x1, y0, z0, 0, 0],
							[x0, y1, z0, 1, 1],
							[x1, y1, z0, 0, 1]
						]);
					}
					if (!this.isSolid(x + 1, y, z)) {
						addFace(t, faceShades.right, [
							[x1, y0, z1, 0, 0],
							[x1, y0, z0, 1, 0],
							[x1, y1, z0, 1, 1],
							[x1, y0, z1, 0, 0],
							[x1, y1, z0, 1, 1],
							[x1, y1, z1, 0, 1]
						]);
					}
					if (!this.isSolid(x - 1, y, z)) {
						addFace(t, faceShades.left, [
							[x0, y0, z0, 0, 0],
							[x0, y0, z1, 1, 0],
							[x0, y1, z1, 1, 1],
							[x0, y0, z0, 0, 0],
							[x0, y1, z1, 1, 1],
							[x0, y1, z0, 0, 1]
						]);
					}
				}
			}
		}

		// drop any old gpu buffers we already had
		for (var k in this.meshByTex) {
			if (this.meshByTex[k].buffer) {
				gl.deleteBuffer(this.meshByTex[k].buffer);
			}
		}
		this.meshByTex = {};

		// upload one vbo per texture (Matsuda p.79-80)
		for (var key in perTex) {
			var data = new Float32Array(perTex[key]);
			var buf = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, buf);
			gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
			this.meshByTex[key] = {
				buffer: buf,
				vertexCount: data.length / 6
			};
		}

		this.dirty = false;
	}

	// draw each per-texture batch with a single drawArrays
	draw(gl, attribs, uniforms, identityMatrix) {
		if (this.dirty) this.rebuildMesh(gl);

		// world mesh is in world space so model matrix is identity and weight is full texture
		gl.uniformMatrix4fv(uniforms.modelMatrix, false, identityMatrix.elements);
		gl.uniform1f(uniforms.texColorWeight, 1.0);
		gl.uniform4f(uniforms.baseColor, 1, 1, 1, 1);

		var FSIZE = 4;
		for (var key in this.meshByTex) {
			var mesh = this.meshByTex[key];
			if (mesh.vertexCount === 0) continue;

			var texUnit = BLOCK_TEX_UNIT[key];
			gl.uniform1i(uniforms.whichTex, texUnit);

			gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffer);
			gl.vertexAttribPointer(attribs.position, 3, gl.FLOAT, false, 6 * FSIZE, 0);
			gl.enableVertexAttribArray(attribs.position);
			gl.vertexAttribPointer(attribs.uv, 2, gl.FLOAT, false, 6 * FSIZE, 3 * FSIZE);
			gl.enableVertexAttribArray(attribs.uv);
			gl.vertexAttribPointer(attribs.shade, 1, gl.FLOAT, false, 6 * FSIZE, 5 * FSIZE);
			gl.enableVertexAttribArray(attribs.shade);
			gl.drawArrays(gl.TRIANGLES, 0, mesh.vertexCount);
		}
	}

	// add a block on top of (x, z), capped at MAX_HEIGHT
	addBlock(x, z, type) {
		if (x < 0 || z < 0 || x >= this.SIZE || z >= this.SIZE) return;
		if (this.grid[z][x].length >= this.MAX_HEIGHT) return;
		this.grid[z][x].push(type || BLOCK_DIRT);
		this.dirty = true;
	}

	// remove the top block from the stack at (x, z)
	removeBlock(x, z) {
		if (x < 0 || z < 0 || x >= this.SIZE || z >= this.SIZE) return;
		var stack = this.grid[z][x];
		while (stack.length > 0 && stack[stack.length - 1] === 0) stack.pop();
		if (stack.length > 0) {
			stack.pop();
			this.dirty = true;
		}
	}
}
