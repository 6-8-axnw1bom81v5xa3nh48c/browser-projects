'use strict';

var bigFontSize = 24;
var mediumFontSize = 16;
var smallFontSize = 14;
var tinyFontSize = 12;

var windowFrameTopSize = 31;
var windowFrameSize = 8;

var messageBoxSize = [400, 100];

var cols = {
  bg: '#272822',
  text: '#a9a9a9',
  error: '#f8331d',

  desktopBg: ['#87ceeb', '#effff0'],

  taskBar: '#95b8bb',
  taskBarTopLine: '#89a8ad',
  taskBarText: '#f1f5f6',

  windowFrame: '#8cd1e8',
  windowFrameOuterLine: '#6ba0b1',
  windowFrameInnerLine: '#598594',
  buttonClose: '#c75050',
};

class RenderingContext{
  constructor(win, w, h, coords = null){
    this.win = win;

    if(!win.contexts) win.contexts = [];
    win.contexts.push(this);

    this.w = w;
    this.h = h;
    this.g = createG(win.div, w, h, coords);
    this.canvas = this.g.canvas;
  }

  ael(type, func){
    this.g.canvas.addEventListener(type, evt => {
      func(this, evt);
    });
  }
};

class Window{
  constructor(parent, w = null, h = null, coords = null){
    this.parent = parent;

    if(!parent) parent = this;
    if(!parent.wins) parent.wins = [];
    parent.wins.push(this);

    if(w === null) [w, h] = getIWH();
    this.w = w;
    this.h = h;

    this.div = createDiv(w, h, coords);

    var context = new RenderingContext(this, w, h);
    this.g = context.g;
  }

  showLoading(amount){
    var {w, h, g} = this;

    g.clearCanvas(cols.bg);
    g.translate(w / 2, h / 2);

    g.lineWidth = 5;
    g.strokeStyle = cols.text;
    g.beginPath();
    g.arc(0, 0, 40, -O.pih, amount * O.pi2 - O.pih);
    g.stroke();

    g.scale(bigFontSize);
    g.font(bigFontSize);

    g.fillStyle = cols.text;
    g.fillText(`${Math.round(amount * 100)}%`, 0, 0);

    g.fillText('Loading...', 0, 4);
  }

  close(){
    var dp = this.parent;
    var wins = dp.wins;
    var index = wins.indexOf(this);

    this.contexts.forEach(ctx => {
      if(ctx.close){
        ctx.close();
      }
    });

    this.div.remove();
    wins.splice(index, 1);
  }
};

class Desktop extends Window{
  constructor(){
    O.body.classList.add('has-canvas');
    O.body.style.backgroundColor = cols.bg;

    var canvas = document.querySelector('canvas');
    if(canvas) canvas.remove();

    var style = O.ce(O.head, 'link');
    style.rel = 'stylesheet';
    style.href = '/projects/desktop/style.css';

    super(null);

    this.wh = this.w >> 1;
    this.hh = this.h >> 1;
    this.zIndex = 0;
  }

  createWindow(...args){
    return new Window(this, ...args);
  }

  throwError(msg){
    var x = windowFrameSize + O.rand(this.wh);
    var y = windowFrameTopSize + O.rand(this.hh);

    new ErrorMessage(this, msg, x, y);
  }

  init(){
    this.initTaskBar();
    this.draw();
  }

  initTaskBar(){
    this.taskBar = new TaskBar(this);
  }

  draw(){
    this.drawBg();
    this.taskBar.draw();
  }

  drawBg(){
    var {w, h, g} = this;

    var gradient = g.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, cols.desktopBg[0]);
    gradient.addColorStop(1, cols.desktopBg[1]);
    g.clearCanvas(gradient);
  }

  getZIndex(){
    this.zIndex = Math.max(-~this.zIndex, 1);
    return this.zIndex;
  }
};

class TaskBar extends Window{
  constructor(parent){
    super(parent, parent.w, 40, [null, null, null, '0px']);

    this.createGradients();

    this.date = new RenderingContext(this, 75, 40, [null, null, '0px', '0px']);
    this.date.draw = () => this.drawDate();
    this.drawDate(true);

    this.lang = new RenderingContext(this, 45, 40, [null, null, '75px', '0px']);
    this.lang.draw = () => this.drawLang();

    this.sound = new RenderingContext(this, 30, 40, [null, null, '120px', '0px']);
    this.sound.draw = () => this.drawSound();

    this.aels();
    this.draw();
  }

  aels(){
    var taskBar = this;
    var dp = taskBar.parent;

    [
      'date',
      'lang',
      'sound',
    ].forEach(ctxType => {
      var ctx = taskBar[ctxType];

      ctx.ael('mouseenter', onMouseEnter);
      ctx.ael('mouseleave', onMouseLeave);
      ctx.ael('click', onClick);
    });

    function onMouseEnter(ctx, evt){
      ctx.focused = true;
      ctx.draw();
    }

    function onMouseLeave(ctx, evt){
      ctx.focused = false;
      ctx.draw();
    }

    function onClick(ect, evt){
      dp.throwError('Not implemented.');
    }
  }

  createGradients(){
    var grad1 = this.createGradient(0, 0, 0);
    var grad2 = this.createGradient(255, 255, 255);

    this.gradients = [grad1, grad2];
  }

  createGradient(red, green, blue){
    var rgb = `${red},${green},${blue}`;
    var {w, h, g} = this;

    var grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, `rgba(${rgb},0)`);
    grad.addColorStop(.5, `rgba(${rgb},.5)`);
    grad.addColorStop(1, `rgba(${rgb},0)`);

    return grad;
  }

  draw(){
    var {w, h, g} = this;

    g.clearCanvas(cols.taskBar);

    g.strokeStyle = cols.taskBarTopLine;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(w, 0);
    g.stroke();

    this.drawDate();
    this.drawLang();
    this.drawSound();
  }

  initDraw(ctx){
    var {w, h, g} = ctx;

    g.resetTransform();
    g.clearRect(0, 0, w, h);

    if(ctx.focused){
      var offset = 2;

      var w1 = w - 1;
      var h1 = h - 1;

      g.strokeStyle = this.gradients[0];
      g.beginPath();
      g.moveTo(offset, 0);
      g.lineTo(offset, h);
      g.moveTo(w1 - offset, 0);
      g.lineTo(w1 - offset, h);
      g.stroke();

      g.strokeStyle = this.gradients[1];
      g.beginPath();
      g.moveTo(offset + 1, 0);
      g.lineTo(offset + 1, h);
      g.moveTo(w1 - offset - 1, 0);
      g.lineTo(w1 - offset - 1, h);
      g.stroke();
    }
  }

  drawDate(repeat = false){
    var ctx = this.date;
    var {w, h, g} = ctx;
    var currentDate = new Date();

    this.initDraw(ctx);

    g.translate(w >> 1, h >> 1);
    g.scale(tinyFontSize);
    g.font(tinyFontSize);

    g.fillStyle = cols.taskBarText;
    g.fillText(this.getTime(currentDate), 0, -.75);
    g.fillText(this.getDate(currentDate), 0, .75);

    if(repeat){
      setTimeout(() => this.drawDate(true), 1e3);
    }
  }

  drawLang(){
    var ctx = this.lang;
    var {w, h, g} = ctx;

    this.initDraw(ctx);

    g.translate(w >> 1, h >> 1);
    g.scale(tinyFontSize);
    g.font(tinyFontSize);

    g.fillStyle = cols.taskBarText;
    g.fillText('ENG', 0, 0);
  }

  drawSound(){
    var ctx = this.sound;
    var {w, h, g} = ctx;

    this.initDraw(ctx);

    g.translate(w >> 1, h >> 1);

    var cols = ['rgba(255,255,255,.7)', 'rgba(0,0,0,.6)'];

    cols.forEach((col, index) => {
      g.strokeStyle = col;

      var offset = index === 0 ? -1 : 0;
      var angle = O.pih;

      g.beginPath();
      g.arc(0, 0, offset + 2, -angle, angle);
      g.stroke();

      angle *= .7;
      g.beginPath();
      g.arc(0, 0, offset + 4.5, -angle, angle);
      g.stroke();

      g.beginPath();
      g.arc(0, 0, offset + 7, -angle, angle);
      g.stroke();
    });

    g.strokeStyle = 'rgba(0,0,0,.6)';
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.moveTo(-8, -4);
    g.lineTo(-6, -4);
    g.lineTo(0, -8);
    g.lineTo(0, 8);
    g.lineTo(-6, 4);
    g.lineTo(-8, 4);
    g.closePath();
    g.fill();
    g.stroke();

    g.strokeStyle = 'rgba(0,0,0,.5)';
    g.beginPath();
    g.moveTo(-6, -4);
    g.lineTo(-6, 4);
    g.stroke();
  }

  getTime(currentDate){
    var hours = this.getDateParam(currentDate, 'Hours', 2);
    var minutes = this.getDateParam(currentDate, 'Minutes', 2);

    return `${hours}:${minutes}`;
  }

  getDate(currentDate){
    var day = this.getDateParam(currentDate, 'Date', 2);
    var month = this.getDateParam(currentDate, 'Month', 2);
    var year = this.getDateParam(currentDate, 'FullYear', 4);

    return `${day}.${month}.${year}`;
  }

  getDateParam(date, param, pad){
    var offset = param === 'Month' ? 1 : 0;
    var val = date[`get${param}`]();
    var valWithOffset = val + offset;

    return valWithOffset.toString().padStart(pad, '0');
  }
};

class WindowFrame extends RenderingContext{
  constructor(win){
    var dx = `${-windowFrameSize}px`;
    var dy = `${-windowFrameTopSize}px`;

    var w = win.w + windowFrameSize * 2;
    var h = win.h + windowFrameTopSize + windowFrameSize;

    super(win, w, h, [dx, dy]);

    this.aels();
    this.draw();
  }

  aels(){
    var {win, canvas, w, h} = this;
    var dp = win.parent;

    var s1 = windowFrameTopSize;
    var s2 = windowFrameSize;

    var clicked = false;
    var x, y;

    canvas.addEventListener('mousedown', evt => {
      win.updateZIndex();

      if(evt.button === 0){

        x = evt.offsetX;
        y = evt.offsetY;

        if(y >= windowFrameTopSize) return;

        if(x > w - 51 && y < 20){
          this.win.close();
          return;
        }

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      }
    });

    function onMouseMove(evt){
      win.moveRelative(evt.movementX, evt.movementY);
    }

    function onMouseUp(evt){
      if(evt.button === 0){
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      }
    }
  }

  draw(){
    var {win, w, h, g} = this;

    g.clearRect(0, 0, w, h);
    g.font(mediumFontSize);

    var s1 = windowFrameTopSize;
    var s2 = windowFrameSize;
    var s = 3.5;

    g.fillStyle = cols.windowFrame;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(w, 0);
    g.lineTo(w, h);
    g.lineTo(0, h);
    g.lineTo(0, s1 - 1);
    g.lineTo(s2, s1 - 1);
    g.lineTo(s2, h - s2);
    g.lineTo(w - s2, h - s2);
    g.lineTo(w - s2, s1);
    g.lineTo(0, s1);
    g.closePath();
    g.fill();

    g.strokeStyle = cols.windowFrameOuterLine;
    g.beginPath();
    g.rect(0, 0, w - 1, h - 1);
    g.stroke();

    g.strokeStyle = cols.windowFrameInnerLine;
    g.beginPath();
    g.rect(s2, s1, w - s2 * 2 - 1, h - s1 - s2 - 1);
    g.stroke();


    g.fillStyle = '#000000';
    g.fillText(win.title, w / 2, windowFrameTopSize / 2);

    g.fillStyle = cols.buttonClose;
    g.fillRect(w - 51, 1, 45, 20);

    g.translate(w - 29, 10);
    g.lineWidth = 1.5;
    g.strokeStyle = '#ffffff';
    g.beginPath();
    g.moveTo(-s, -s);
    g.lineTo(s, s);
    g.moveTo(s, -s);
    g.lineTo(-s, s);
    g.stroke();
    g.lineWidth = 1;
    g.resetTransform();
  }
};

class MovableWindow extends Window{
  constructor(parent, title, w, h, x, y){
    super(parent, w, h);

    this.title = title;
    this.frame = new WindowFrame(this);

    this.move(x, y);
    this.updateZIndex();
  }

  move(x, y){
    this.x = x;
    this.y = y;

    var div = this.div;
    div.style.left = `${Math.round(x)}px`;
    div.style.top = `${Math.round(y)}px`;
  }

  moveRelative(dx, dy){
    this.move(this.x + dx, this.y + dy);
  }

  updateZIndex(){
    this.div.style.zIndex = `${this.parent.getZIndex()}`;
  }
};

class MessageBox extends MovableWindow{
  constructor(parent, title, msgs, x, y){
    var [w, h] = messageBoxSize;
    h = Math.max(msgs.length * (smallFontSize + 5) + 5, h);

    super(parent, title, w, h, x, y);

    this.msgs = msgs;
    this.draw();
  }

  draw(){
    var {w, h, g} = this;

    g.clearCanvas('#ffffff');

    g.font(smallFontSize);
    g.textBaseline = 'top';
    g.textAlign = 'left';

    this.msgs.forEach(([type, msg], index) => {
      if(type === 1){
        g.setFontModifiers('bold');
      }else{
        g.removeFontModifiers();
      }

      g.fillStyle = '#000000';
      g.fillText(msg, 5, index * (smallFontSize + 5) + 5);
    });
  }
};

class ErrorMessage extends MessageBox{
  constructor(parent, msg, x, y){
    var title = 'Error';

    var msgs = [
      [1, 'Error occured:'],
      [0, msg],
    ];

    super(parent, title, msgs, x, y);
  }
};

module.exports = Desktop;

function createDiv(w, h, coords = null){
  var div = O.doc.createElement('div');

  O.body.appendChild(div);
  translateElem(div, coords);
  div.classList.add('window');

  div.style.width = `${Math.round(w)}px`;
  div.style.height = `${Math.round(h)}px`;

  return div;
}

function createG(div, w, h, coords = null){
  var canvas = O.doc.createElement('canvas');

  div.appendChild(canvas);
  translateElem(canvas, coords);
  canvas.classList.add('canvas');

  canvas.width = w;
  canvas.height = h;

  var gg = canvas.getContext('2d');
  var g = new O.EnhancedRenderingContext(gg);

  g.clearCanvas(cols.bg);

  return g;
}

function translateElem(elem, coords = null){
  if(coords !== null){
    var [x1 = null, y1 = null, x2 = null, y2 = null] = coords;

    if(x1 !== null) elem.style.left = x1;
    if(y1 !== null) elem.style.top = y1;
    if(x2 !== null) elem.style.right = x2;
    if(y2 !== null) elem.style.bottom = y2;
  }
}

function getIWH(){
  var w = window.innerWidth;
  var h = window.innerHeight;

  return [w, h];
}