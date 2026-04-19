// asg1.js
// based on ColoredPoints (Ch2, p.66) and HelloTriangle (Ch3, p.67)
// from WebGL Programming Guide by Matsuda & Lea

// vertex shader program (Matsuda p.29)
var VSHADER_SOURCE =
	'attribute vec4 a_Position;\n' +
	'uniform float u_Size;\n' +
	'void main() {\n' +
	'  gl_Position = a_Position;\n' +
	'  gl_PointSize = u_Size;\n' +
	'}\n';

// fragment shader program (Matsuda p.29)
var FSHADER_SOURCE =
	'precision mediump float;\n' +
	'uniform vec4 u_FragColor;\n' +
	'void main() {\n' +
	'  gl_FragColor = u_FragColor;\n' +
	'}\n';

// global variables
var gl;
var canvas;
var a_Position;
var u_FragColor;
var u_Size;

// shape list and UI state
var g_shapesList = [];
var g_selectedColor = [1.0, 0.0, 0.0, 1.0];
var g_selectedSize = 10;
var g_selectedType = 'point';
var g_selectedSegments = 10;
var g_pictureDrawn = false;
var g_sakuraAnimId = null;

function main() {
	setupWebGL();
	connectVariablesToGLSL();
	handleClicks();

	// specify the color for clearing the canvas (Matsuda p.26)
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT);
}

function setupWebGL() {
	// retrieve the <canvas> element (Matsuda p.11)
	canvas = document.getElementById('webgl');

	// get the rendering context for WebGL
	// preserveDrawingBuffer helps with performance at high shape counts
	gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
	if (!gl) {
		console.log('Failed to get the rendering context for WebGL');
		return;
	}

	// enable alpha blending for transparency
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
}

function connectVariablesToGLSL() {
	// initialize shaders (Matsuda p.30)
	if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
		console.log('Failed to initialize shaders.');
		return;
	}

	// get the storage location of a_Position (Matsuda p.40)
	a_Position = gl.getAttribLocation(gl.program, 'a_Position');
	if (a_Position < 0) {
		console.log('Failed to get the storage location of a_Position');
		return;
	}

	// get the storage location of u_FragColor (Matsuda p.58)
	u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
	if (!u_FragColor) {
		console.log('Failed to get the storage location of u_FragColor');
		return;
	}

	// get the storage location of u_Size
	u_Size = gl.getUniformLocation(gl.program, 'u_Size');
	if (!u_Size) {
		console.log('Failed to get the storage location of u_Size');
		return;
	}
}

function handleClicks() {
	// register event handler for mouse press (Matsuda p.52)
	// https://www.w3schools.com/jsref/event_onmousedown.asp
	canvas.onmousedown = function(ev) { click(ev); };

	// draw while mouse is held and moving
	// https://www.w3schools.com/jsref/event_onmousemove.asp
	canvas.onmousemove = function(ev) {
		if (ev.buttons == 1) {
			click(ev);
		}
	};
}

function click(ev) {
	// get mouse position (Matsuda p.53)
	var x = ev.clientX;
	var y = ev.clientY;

	// get canvas bounding rect for coordinate conversion
	// https://www.w3schools.com/jsref/met_element_getboundingclientrect.asp
	var rect = canvas.getBoundingClientRect();

	// convert browser coords to webgl coords (Matsuda p.54)
	x = ((x - rect.left) - canvas.width / 2) / (canvas.width / 2);
	y = (canvas.height / 2 - (y - rect.top)) / (canvas.height / 2);

	// create shape based on selected type
	var shape;
	if (g_selectedType == 'point') {
		shape = new Point();
	} else if (g_selectedType == 'triangle') {
		shape = new Triangle();
	} else if (g_selectedType == 'circle') {
		shape = new Circle();
		shape.segments = g_selectedSegments;
	}

	shape.position = [x, y];
	// .slice() copies the array so each shape keeps its own color
	shape.color = g_selectedColor.slice();
	shape.size = g_selectedSize;

	// add shape to the list
	g_shapesList.push(shape);

	renderAllShapes();
}

// read slider values and update selected color
// https://www.w3schools.com/jsref/prop_range_value.asp
function updateColor() {
	g_selectedColor[0] = document.getElementById('red').value / 100;
	g_selectedColor[1] = document.getElementById('green').value / 100;
	g_selectedColor[2] = document.getElementById('blue').value / 100;
	g_selectedColor[3] = document.getElementById('alpha').value / 100;
}

function renderAllShapes() {
	// track render time with performance.now()
	// https://www.w3schools.com/jsref/met_performance_now.asp
	var startTime = performance.now();

	// clear the canvas before redrawing
	gl.clear(gl.COLOR_BUFFER_BIT);

	// draw every shape in the list
	for (var i = 0; i < g_shapesList.length; i++) {
		g_shapesList[i].render();
	}

	// show shape count and render time
	var duration = performance.now() - startTime;
	var numel = document.getElementById('numel');
	if (numel) {
		numel.innerHTML = "shapes: " + g_shapesList.length + " | ms: " + Math.floor(duration);
	}
}

function clearCanvas() {
	g_shapesList = [];
	g_pictureDrawn = false;
	g_numbersShowing = false;

	// stop sakura animation if running
	if (g_sakuraAnimId) {
		cancelAnimationFrame(g_sakuraAnimId);
		g_sakuraAnimId = null;
	}

	renderAllShapes();

	// clear the number overlay too
	var overlay = document.getElementById('overlay');
	var ctx = overlay.getContext('2d');
	ctx.clearRect(0, 0, 400, 400);
}

// convert svg pixel coords (680x500 viewbox) to webgl coords (-1 to 1)
function s2g(x, y) {
	return [(x / 680) * 2 - 1, 1 - (y / 500) * 2];
}

// draw a triangle with color, using svg coords for the picture
function drawColorTri(x1, y1, x2, y2, x3, y3, r, g, b) {
	var p1 = s2g(x1, y1);
	var p2 = s2g(x2, y2);
	var p3 = s2g(x3, y3);
	gl.uniform4f(u_FragColor, r, g, b, 1.0);
	drawTriangle([p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]]);
}

// draw the Mt Fuji / torii gate / fox scene
function drawPicture() {
	g_shapesList = [];
	gl.clear(gl.COLOR_BUFFER_BIT);
	g_pictureDrawn = true;

	// background sky (two triangles = rectangle)
	drawColorTri(0, 0, 680, 0, 680, 500, 0.1, 0.1, 0.2);
	drawColorTri(0, 0, 0, 500, 680, 500, 0.1, 0.1, 0.2);

	// snow ground
	drawColorTri(0, 380, 680, 380, 680, 500, 0.8, 0.85, 0.9);
	drawColorTri(0, 380, 0, 500, 680, 500, 0.8, 0.85, 0.9);

	// background hills
	drawColorTri(0, 380, 110, 240, 220, 380, 0.2, 0.25, 0.3);
	drawColorTri(450, 380, 570, 250, 680, 380, 0.2, 0.25, 0.3);

	// T4 Mt Fuji main body
	drawColorTri(390, 120, 200, 380, 580, 380, 0.35, 0.5, 0.6);

	// T5 snow cap
	drawColorTri(390, 120, 340, 210, 440, 210, 1.0, 1.0, 1.0);

	// T6 snow streak left
	drawColorTri(340, 210, 310, 260, 360, 230, 1.0, 1.0, 1.0);

	// T7 snow streak right
	drawColorTri(440, 210, 470, 260, 420, 230, 1.0, 1.0, 1.0);

	// T8-T9 torii left pillar
	drawColorTri(240, 250, 255, 250, 255, 380, 0.9, 0.0, 0.0);
	drawColorTri(240, 250, 240, 380, 255, 380, 0.7, 0.0, 0.0);

	// T10-T11 torii right pillar
	drawColorTri(395, 250, 410, 250, 410, 380, 0.9, 0.0, 0.0);
	drawColorTri(395, 250, 395, 380, 410, 380, 0.7, 0.0, 0.0);

	// T12-T13 top beam
	drawColorTri(220, 235, 430, 235, 430, 250, 0.9, 0.0, 0.0);
	drawColorTri(220, 235, 220, 250, 430, 250, 0.7, 0.0, 0.0);

	// T14 top triangle
	drawColorTri(325, 218, 220, 235, 430, 235, 0.9, 0.0, 0.0);

	// T15-T16 crossbeam
	drawColorTri(235, 268, 415, 268, 415, 278, 0.9, 0.0, 0.0);
	drawColorTri(235, 268, 235, 278, 415, 278, 0.7, 0.0, 0.0);

	// T17 fox body
	drawColorTri(290, 360, 360, 360, 325, 395, 0.9, 0.5, 0.1);

	// T18 fox head
	drawColorTri(303, 330, 347, 330, 325, 360, 0.9, 0.5, 0.1);

	// T19 fox ear left (A)
	drawColorTri(303, 330, 290, 290, 315, 330, 0.9, 0.5, 0.1);

	// T20 fox ear right (A)
	drawColorTri(347, 330, 335, 290, 360, 330, 0.9, 0.5, 0.1);

	// T21 fox tail (A)
	drawColorTri(360, 360, 395, 355, 375, 315, 0.9, 0.5, 0.1);

	// T22 fox nose
	drawColorTri(320, 345, 330, 345, 325, 355, 0.2, 0.2, 0.3);

	// T23-T25 cherry blossom 1
	drawColorTri(80, 140, 68, 162, 92, 162, 1.0, 0.4, 0.7);
	drawColorTri(80, 140, 92, 162, 102, 147, 1.0, 0.7, 0.8);
	drawColorTri(63, 152, 80, 140, 68, 162, 1.0, 0.4, 0.7);

	// T26-T28 cherry blossom 2
	drawColorTri(170, 95, 158, 117, 182, 117, 1.0, 0.4, 0.7);
	drawColorTri(170, 95, 182, 117, 192, 102, 1.0, 0.7, 0.8);
	drawColorTri(153, 107, 170, 95, 158, 117, 1.0, 0.4, 0.7);

	// T29-T31 cherry blossom 3
	drawColorTri(590, 130, 578, 152, 602, 152, 1.0, 0.4, 0.7);
	drawColorTri(590, 130, 602, 152, 612, 137, 1.0, 0.7, 0.8);
	drawColorTri(573, 142, 590, 130, 578, 152, 1.0, 0.4, 0.7);

	// T32-T35 falling petals
	drawColorTri(120, 200, 114, 212, 126, 212, 1.0, 0.7, 0.8);
	drawColorTri(500, 180, 494, 192, 506, 192, 1.0, 0.7, 0.8);
	drawColorTri(620, 220, 614, 232, 626, 232, 1.0, 0.7, 0.8);
	drawColorTri(40, 280, 34, 292, 46, 292, 1.0, 0.7, 0.8);

	// T36 A crossbar left ear
	drawColorTri(295, 314, 312, 314, 303, 318, 1.0, 1.0, 1.0);

	// T37 A crossbar right ear
	drawColorTri(340, 314, 357, 314, 348, 318, 1.0, 1.0, 1.0);

	// T38 A crossbar tail
	drawColorTri(366, 341, 389, 339, 378, 345, 1.0, 1.0, 1.0);
}

// label each triangle in the picture with its number
var g_numbersShowing = false;
function numberTriangles() {
	// only show numbers if the picture has been drawn
	if (!g_pictureDrawn) return;

	var overlay = document.getElementById('overlay');
	var ctx = overlay.getContext('2d');

	// toggle off if already showing
	if (g_numbersShowing) {
		ctx.clearRect(0, 0, 400, 400);
		g_numbersShowing = false;
		return;
	}

	g_numbersShowing = true;
	ctx.clearRect(0, 0, 400, 400);

	// all picture triangles stored as [x1,y1, x2,y2, x3,y3] in svg coords
	var tris = [
		// sky
		[0,0, 680,0, 680,500],
		[0,0, 0,500, 680,500],
		// snow ground
		[0,380, 680,380, 680,500],
		[0,380, 0,500, 680,500],
		// hills
		[0,380, 110,240, 220,380],
		[450,380, 570,250, 680,380],
		[390,120, 200,380, 580,380],
		[390,120, 340,210, 440,210],
		[340,210, 310,260, 360,230],
		[440,210, 470,260, 420,230],
		[240,250, 255,250, 255,380],
		[240,250, 240,380, 255,380],
		[395,250, 410,250, 410,380],
		[395,250, 395,380, 410,380],
		[220,235, 430,235, 430,250],
		[220,235, 220,250, 430,250],
		[325,218, 220,235, 430,235],
		[235,268, 415,268, 415,278],
		[235,268, 235,278, 415,278],
		[290,360, 360,360, 325,395],
		[303,330, 347,330, 325,360],
		[303,330, 290,290, 315,330],
		[347,330, 335,290, 360,330],
		[360,360, 395,355, 375,315],
		[320,345, 330,345, 325,355],
		[80,140, 68,162, 92,162],
		[80,140, 92,162, 102,147],
		[63,152, 80,140, 68,162],
		[170,95, 158,117, 182,117],
		[170,95, 182,117, 192,102],
		[153,107, 170,95, 158,117],
		[590,130, 578,152, 602,152],
		[590,130, 602,152, 612,137],
		[573,142, 590,130, 578,152],
		[120,200, 114,212, 126,212],
		[500,180, 494,192, 506,192],
		[620,220, 614,232, 626,232],
		[40,280, 34,292, 46,292],
		[295,314, 312,314, 303,318],
		[340,314, 357,314, 348,318],
		[366,341, 389,339, 378,345]
	];

	ctx.font = '10px monospace';
	ctx.textAlign = 'center';

	for (var i = 0; i < tris.length; i++) {
		var t = tris[i];

		// centroid = average of 3 vertices
		var cx = (t[0] + t[2] + t[4]) / 3;
		var cy = (t[1] + t[3] + t[5]) / 3;

		// convert svg coords to canvas pixel coords
		var px = (cx / 680) * 400;
		var py = (cy / 500) * 400;

		// draw label background
		ctx.fillStyle = 'rgba(0,0,0,0.6)';
		ctx.fillRect(px - 12, py - 7, 24, 14);

		// draw label text
		ctx.fillStyle = '#fff';
		ctx.fillText('T' + (i + 1), px, py + 4);
	}
}

// awesomeness: sakura petal rain animation
function sakuraRain() {
	// stop if already running
	if (g_sakuraAnimId) {
		cancelAnimationFrame(g_sakuraAnimId);
		g_sakuraAnimId = null;

		// redraw the scene without petals
		if (g_pictureDrawn) {
			drawPicture();
		} else {
			renderAllShapes();
		}
		return;
	}

	// create 40 petals with random starting positions
	var petals = [];
	for (var i = 0; i < 40; i++) {
		petals.push({
			x: Math.random() * 2 - 1,
			y: 1.2 + Math.random() * 0.5,
			speed: 0.003 + Math.random() * 0.005,
			drift: (Math.random() - 0.5) * 0.003,
			size: 0.01 + Math.random() * 0.02
		});
	}

	// animation loop
	// https://www.w3schools.com/jsref/met_win_requestanimationframe.asp
	function animate() {
		// redraw whatever was on screen before
		if (g_pictureDrawn) {
			drawPicture();
		} else {
			renderAllShapes();
		}

		for (var i = 0; i < petals.length; i++) {
			var p = petals[i];

			// move petal down and drift sideways
			p.y -= p.speed;
			p.x += p.drift;

			// reset if off screen
			if (p.y < -1.2) {
				p.y = 1.2;
				p.x = Math.random() * 2 - 1;
			}

			// draw petal as a small pink triangle
			gl.uniform4f(u_FragColor, 1.0, 0.41, 0.71, 0.7);
			var s = p.size;
			drawTriangle([
				p.x, p.y + s,
				p.x - s * 0.7, p.y - s * 0.5,
				p.x + s * 0.7, p.y - s * 0.5
			]);
		}

		g_sakuraAnimId = requestAnimationFrame(animate);
	}

	animate();
}

// shader compilation (based on cuon-utils.js, Matsuda Appendix)
function initShaders(gl, vshader, fshader) {
	var program = createProgram(gl, vshader, fshader);
	if (!program) {
		console.log('Failed to create program');
		return false;
	}
	gl.useProgram(program);
	gl.program = program;
	return true;
}

function createProgram(gl, vshader, fshader) {
	var vertexShader = loadShader(gl, gl.VERTEX_SHADER, vshader);
	var fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fshader);
	if (!vertexShader || !fragmentShader) return null;

	// create a program object (Matsuda p.258)
	var program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);

	// link the program
	gl.linkProgram(program);
	var linked = gl.getProgramParameter(program, gl.LINK_STATUS);
	if (!linked) {
		console.log('Failed to link program: ' + gl.getProgramInfoLog(program));
		gl.deleteProgram(program);
		return null;
	}
	return program;
}

function loadShader(gl, type, source) {
	// create shader object
	var shader = gl.createShader(type);
	gl.shaderSource(shader, source);

	// compile the shader
	gl.compileShader(shader);
	var compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
	if (!compiled) {
		console.log('Failed to compile shader: ' + gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
		return null;
	}
	return shader;
}