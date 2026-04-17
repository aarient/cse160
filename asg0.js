function main() {
  var canvas = document.getElementById('example');
  var ctx = canvas.getContext('2d');

  // Fill canvas black
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, 400, 400);
}

main();