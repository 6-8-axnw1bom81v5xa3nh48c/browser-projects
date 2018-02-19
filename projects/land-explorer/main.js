'use strict';

var {gl, w, h} = createCanvas();
var [wh, hh] = [w, h].map(a => a / 2);

var attribs = {};
var uniforms = {};
var buffs = {};

var sin = Math.sin.bind(Math);
var cos = Math.cos.bind(Math);

var pi = Math.PI;
var pi2 = pi * 2;
var pih = pi / 2;

var aspectRatio = w / h;
var fov = pi / 3;
var fovt = Math.tan(fov / 2);
var [near, far] = [1e-3, 1e3];

var cursorLocked = false;
var [rx, ry] = [0, 0];
var cursorSpeed = 3;

var speed = .1;
var [tx, ty, tz] = [0, 0, 0];
var dir = 0;

var A = [];
var B = [];
var ents = O.ca(1e4, a => new Entity(Math.random() * 20, Math.random() * 20, Math.random() * 20, 1 + Math.random() * 2, Math.random(), Math.random(), Math.random()));
A = new Float32Array(A);
B = new Float32Array(B);

addEventListener('mousedown', event => {
  if(event.button == 0){
    if(!cursorLocked){
      gl.canvas.requestPointerLock();
      cursorLocked = true;
    }
  }
});

addEventListener('mousemove', event => {
  if(!cursorLocked) return;

  rx = Math.max(Math.min(rx + event.movementY * cursorSpeed / h, pih), -pih);
  ry = (ry + event.movementX * cursorSpeed / w) % pi2;
});

addEventListener('keydown', event => {
  if(!cursorLocked) return;

  switch(event.keyCode){
    case 87: // W
      dir |= 1;
      break;

    case 83: // S
      dir |= 2;
      break;

    case 65: // A
      dir |= 4;
      break;

    case 68: // D
      dir |= 8;
      break;

    case 16: // Shift
      dir |= 16;
      break;
  }
});

addEventListener('keyup', event => {
  if(!cursorLocked) return;

  switch(event.keyCode){
    case 87: // W
      dir &= ~1;
      break;

    case 83: // S
      dir &= ~2;
      break;

    case 65: // A
      dir &= ~4;
      break;

    case 68: // D
      dir &= ~8;
      break;

    case 16: // Shift
      dir &= ~16;
      break;
  }
});

init();

function init(){
  O.rf(`/projects/${O.project}/vs.glsl`, (status, vs) => {
    O.rf(`/projects/${O.project}/fs.glsl`, (status, fs) => {
      initCanvas(vs, fs);
    });
  });
}

function initCanvas(vs, fs){
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  gl.viewport(0, 0, w, h);
  gl.clearColor(0., 0., 0., 1.);

  var vShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vShader, vs);
  gl.compileShader(vShader);
  if(!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)){
    console.error(`[${'VERTEX'}] ${gl.getShaderInfoLog(vShader)}`);
    return;
  }

  var fShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fShader, fs);
  gl.compileShader(fShader);
  if(!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)){
    console.error(`[${'FRAGMENT'}] ${gl.getShaderInfoLog(fShader)}`);
    return;
  }

  var program = gl.createProgram();
  gl.attachShader(program, vShader);
  gl.attachShader(program, fShader);
  gl.linkProgram(program);
  gl.useProgram(program);

  attribs.pos = gl.getAttribLocation(program, 'pos');
  gl.enableVertexAttribArray(attribs.pos);
  buffs.pos = gl.createBuffer();

  attribs.col = gl.getAttribLocation(program, 'col');
  gl.enableVertexAttribArray(attribs.col);
  buffs.col = gl.createBuffer();

  uniforms.translation = gl.getUniformLocation(program, 'translation');
  uniforms.rotationX = gl.getUniformLocation(program, 'rotationX');
  uniforms.rotationY = gl.getUniformLocation(program, 'rotationY');
  uniforms.projection = gl.getUniformLocation(program, 'projection');

  gl.uniformMatrix4fv(uniforms.translation, false, new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    tx, ty, tz, 1
  ]));

  gl.uniformMatrix4fv(uniforms.projection, false, new Float32Array([
    1 / (aspectRatio * fovt), 0, 0, 0,
    0, 1 / fovt, 0, 0,
    0, 0, -(far + near) / (far - near), -1,
    0, 0, -2 * far * near / (far - near), 0
  ]));

  gl.bindBuffer(gl.ARRAY_BUFFER, buffs.pos);
  gl.bufferData(gl.ARRAY_BUFFER, A, gl.STATIC_DRAW);
  gl.vertexAttribPointer(attribs.pos, 3, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, buffs.col);
  gl.bufferData(gl.ARRAY_BUFFER, B, gl.STATIC_DRAW);
  gl.vertexAttribPointer(attribs.col, 3, gl.FLOAT, false, 0, 0);

  render();
}

function render(){
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  if(dir){
    var sp = dir & 16 ? speed * .1 : speed;
    var x, y, z;

    if(dir & 3){
      x = sp * -cos(rx) * sin(ry);
      y = sp * sin(rx);
      z = sp * cos(rx) * cos(ry);

      if(dir & 1) tx += x, ty += y, tz += z;
      if(dir & 2) tx -= x, ty -= y, tz -= z;
    }

    if(dir & 12){
      x = sp * -sin(ry);
      z = sp * cos(ry);

      if(dir & 4) tx += z, tz -= x;
      if(dir & 8) tx -= z, tz += x;
    }

    gl.uniformMatrix4fv(uniforms.translation, false, new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      tx, ty, tz, 1
    ]));
  }

  var s, c;

  gl.uniformMatrix4fv(uniforms.rotationX, false, new Float32Array([
    1, 0, 0, 0,
    0, c = cos(rx), s = sin(rx), 0,
    0, -s, c, 0,
    0, 0, 0, 1
  ]));

  gl.uniformMatrix4fv(uniforms.rotationY, false, new Float32Array([
    c = cos(ry), 0, s = -sin(ry),  0,
    0, 1, 0, 0,
    -s, 0, c, 0,
    0, 0, 0, 1
  ]));

  gl.drawArrays(gl.TRIANGLES, 0, ents.length * 3);

  window.requestAnimationFrame(render);
}

function Entity(x, y, z, size, r, g, b){
  this.x = x, this.y = y, this.z = z;
  this.size = size;
  this.r = r, this.g = g, this.b = b;

  var s = () => Math.random() * this.size / 2;

  A.push(
    x - s(), y - s(), z - s(),
    x + s(), y - s(), z - s(),
    x - s(), y + s(), z - s(),
  );

  B.push(
    r, g, b,
    (r + g) / 2, (g + b) / 2, (b + r) / 2,
    g, r, b,
  );
}

function createCanvas(){
  var canvas = O.ce(O.body, 'canvas');
  var gl = canvas.getContext('webgl');
  var w = window.innerWidth;
  var h = window.innerHeight;

  O.body.style.margin = '0px';
  canvas.width = w;
  canvas.height = h;

  return {gl, w, h};
}

function log(...a){
  console.log(...a);
  return a[a.length - 1];
}