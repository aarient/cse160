// asg0.js

function main() {
	var canvas = document.getElementById('example');
	if (!canvas) {
		console.log('Failed to retrieve the <canvas> element');
		return false;
	}

	var ctx = canvas.getContext('2d');

	// fill canvas black
	ctx.fillStyle = 'black';
	ctx.fillRect(0, 0, 400, 400);

	var v1 = new Vector3([2.25, 2.25, 0]);
	drawVector(v1, "red");
}

function drawVector(v, color) {
	var canvas = document.getElementById('example');
	var ctx = canvas.getContext('2d');

	ctx.strokeStyle = color;
	ctx.beginPath();
	// center of canvas
	ctx.moveTo(200, 200);
	// scale by 20, flip y since canvas y goes downward
	ctx.lineTo(200 + v.elements[0] * 20, 200 - v.elements[1] * 20);
	ctx.stroke();
}

function handleDrawEvent() {
	var canvas = document.getElementById('example');
	var ctx = canvas.getContext('2d');

	ctx.fillStyle = 'black';
	ctx.fillRect(0, 0, 400, 400);

	var v1 = new Vector3([
		parseFloat(document.getElementById('v1-x').value),
		parseFloat(document.getElementById('v1-y').value),
		0
	]);
	drawVector(v1, "red");

	var v2 = new Vector3([
		parseFloat(document.getElementById('v2-x').value),
		parseFloat(document.getElementById('v2-y').value),
		0
	]);
	drawVector(v2, "blue");
}

function handleDrawOperationEvent() {
	var canvas = document.getElementById('example');
	var ctx = canvas.getContext('2d');

	ctx.fillStyle = 'black';
	ctx.fillRect(0, 0, 400, 400);

	var v1 = new Vector3([parseFloat(document.getElementById('v1-x').value), parseFloat(document.getElementById('v1-y').value), 0]);
	var v2 = new Vector3([parseFloat(document.getElementById('v2-x').value), parseFloat(document.getElementById('v2-y').value), 0]);

	drawVector(v1, "red");
	drawVector(v2, "blue");

	var op = document.getElementById('op-select').value;
	var scalar = parseFloat(document.getElementById('scalar').value);

	// copy v1/v2 before operating since add/sub/mul/div modify in place
	if (op == "add") {
		drawVector(new Vector3(v1.elements).add(v2), "green");
	} else if (op == "sub") {
		drawVector(new Vector3(v1.elements).sub(v2), "green");
	} else if (op == "mul") {
		drawVector(new Vector3(v1.elements).mul(scalar), "green");
		drawVector(new Vector3(v2.elements).mul(scalar), "green");
	} else if (op == "div") {
		drawVector(new Vector3(v1.elements).div(scalar), "green");
		drawVector(new Vector3(v2.elements).div(scalar), "green");
	} else if (op == "magnitude") {
		console.log("Magnitude v1: " + v1.magnitude());
		console.log("Magnitude v2: " + v2.magnitude());
	} else if (op == "normalize") {
		drawVector(new Vector3(v1.elements).normalize(), "green");
		drawVector(new Vector3(v2.elements).normalize(), "green");
	} else if (op == "angle") {
		console.log("Angle: " + angleBetween(v1, v2));
	} else if (op == "area") {
		console.log("Area of the triangle: " + areaTriangle(v1, v2));
	}
}

function angleBetween(v1, v2) {
	// dot(v1, v2) = ||v1|| * ||v2|| * cos(alpha)
	var d = Vector3.dot(v1, v2);
	var cos = d / (v1.magnitude() * v2.magnitude());
	var alpha = Math.acos(cos) * (180 / Math.PI);
	return alpha;
}

function areaTriangle(v1, v2) {
	// ||v1 x v2|| = area of parallelogram, divide by 2 for triangle
	var cross = Vector3.cross(v1, v2);
	return cross.magnitude() / 2;
}