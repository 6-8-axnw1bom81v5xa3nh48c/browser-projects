'use strict';

var O = {
  /*
    Parameters
  */

  doc: document,
  head: document.head,
  body: document.body,
  href: window.location.href,

  /*
    Constants
  */

  pi: Math.PI,
  pi2: Math.PI * 2,
  pih: Math.PI / 2,

  /*
    Main functions
  */

  init(){
    O.project = O.urlParam('project');

    if(!O.projectTest(O.project)) return O.error(`Illegal project name "${O.ascii(O.project).replace(/\"/gm, '\\"')}".`);

    if(O.project == null){
      O.rf(`projects.txt`, (status, projects) => {
        if(status != 200) return O.error(`Failed to load projects list.`);

        O.title('Projects');
        O.sortAsc(O.sanl(projects)).forEach((project, index, projects) => {
          O.ceLink(O.body, O.projectToName(project), `/?project=${project}`);
          if(index < projects.length - 1) O.ceBr(O.body);
        });
      });
    }else{
      O.rf(`/projects/${O.project}/main.js`, (status, script) => {
        if(status != 200) return O.error(`Failed to load script for project "${O.project}". Status code: ${status}.`);
        new Function('O', script)(O);
      });
    }
  },
  title(title){
    O.body.innerHTML = '';
    var h1 = O.ce(O.body, 'h1');
    O.ceText(h1, title);
  },
  error(msg){
    O.title('Error Occured');
    O.ceText(O.body, msg);
    O.ceBr(O.body, 2);
    O.ceLink(O.body, 'Home Page', '/');
  },

  /*
    Project function
  */

  nonCapWords: 'a,an,and,as,at,but,by,for,in,nor,of,on,or,the,to,up'.split`,`,
  projectTest(project){
    return /^[a-z0-9]+(?:\-[a-z0-9]+)*$/.test(project);
  },
  projectToName(project){
    return project.replace(/\-/g, ' ').replace(/[a-z0-9]+/g, word => {
      if(O.nonCapWords.indexOf(word) == -1) return word[0].toUpperCase() + word.substring(1);
      else return word;
    });
  },

  /*
    URL functions
  */

  urlParam(param){
    var match = O.href.match(new RegExp(`[\\?\\&]${param}=([^\\&]*)`));
    if(match == null){
      if(new RegExp(`[\\?\\&]${param}(?:\\&|$)`).test(O.href)) match = '';
    }else{
      match = window.unescape(match[1]);
    }
    return match;
  },

  /*
    DOM functions
  */

  ce(parent, tag){
    var elem = O.doc.createElement(tag);
    parent.appendChild(elem);
    return elem;
  },
  ceBr(elem, num = 1){
    while(num--) O.ce(elem, 'br');
  },
  ceText(elem, text){
    var t = document.createTextNode(text);
    elem.appendChild(t);
    return t;
  },
  ceLink(elem, text, href){
    var a = O.ce(elem, 'a');
    
    a.href = href;
    O.ceText(a, text);

    return a;
  },
  ceCanvas(enhanced = false){
    O.body.style.margin = '0px';

    var w = window.innerWidth;
    var h = window.innerHeight;
    var canvas = O.ce(O.body, 'canvas');
    var g = canvas.getContext('2d');

    canvas.width = w;
    canvas.height = h;

    g.fillStyle = 'white';
    g.strokeStyle = 'black';
    g.fillRect(0, 0, w, h);

    if(enhanced){
      g = new O.EnhancedRenderingContext(g);
    }

    return {w, h, g};
  },

  /*
    Request processing functions
  */

  urlTime(url){
    var char = url.indexOf('?') != -1 ? '&' : '?';
    return `${url}${char}_=${Date.now()}`;
  },
  rf(file, cb){
    var xhr = new window.XMLHttpRequest();
    xhr.onreadystatechange = () => {
      if(xhr.readyState == 4){
        cb(xhr.status, xhr.responseText);
      }
    };
    xhr.open('GET', O.urlTime(file));
    xhr.send();
  },
  rfLocal(file, cb){
    O.rf(`/projects/${O.project}/${file}`, cb);
  },

  /*
    Constructors
  */

  Point: class{
    constructor(x, y){
      this.x = +x;
      this.y = +y;
    }
  },

  Grid: class{
    constructor(w, h, func){
      var grid = O.ca(w, x => O.ca(h, y => new O.PathTile(func(x, y))));
      grid.w = w;
      grid.h = h;
      grid.iterate = this.iterate.bind(grid);
      return grid;
    }
    iterate(func){
      var {w, h} = this;
      var x, y;
      for(y = 0; y < h; y++) for(x = 0; x < w; x++) func(x, y, this[x][y]);
    }
  },

  PathTile: class{
    constructor(wall){
      this.wall = wall;
      this.visited = false;
      this.heuristicDist = 0;
      this.pathDist = 0;
      this.totalDist = 0;
      this.dir = -1;
    }
  },

  TilesGrid: class{
    constructor(){
      this.w = 1;
      this.h = 1;
      this.s = 32;

      this.tileParams = [];
      this.drawFunc = O.nop;

      this.g = O.ceCanvas(true).g;
      this.resize();

      var tileParams = this.tileParams;

      this.Tile = class{
        constructor(params){
          tileParams.forEach((param, index) => {
            this[param] = params[index];
          });
        }
      };

      this.emptyFunc = () => [];
      this.d = [];
      this.create();
    }

    setWH(w, h){
      this.w = w;
      this.h = h;
      this.wh = w / 2;
      this.hh = h / 2;
      this.resize();
    }

    setSize(s){
      this.s = s;
      this.resize();
    }

    setTileParams(params){
      this.tileParams.length = [];
      params.forEach(param => this.tileParams.push(param));
    }

    setDrawFunc(func = O.nop){
      this.drawFunc = func;
    }

    updateIWH(){
      var iw = window.innerWidth;
      var ih = window.innerHeight;
      if(this.iw == iw && this.ih == ih) return;

      this.iw = iw;
      this.ih = ih;
      this.iwh = iw / 2;
      this.ihh = ih / 2;

      var g = this.g.g;
      var canvas = g.canvas;

      canvas.width = iw;
      canvas.height = ih;
    }

    create(func = this.emptyFunc){
      var d = this.d;
      d.length = this.w;
      d.fill(null);

      d.forEach((a, x) => {
        d[x] = O.ca(this.h, O.nop);
      });

      this.iterate((x, y) => {
        d[x][y] = new this.Tile(func(x, y));
      });
    }

    iterate(func){
      var {w, h, d, g} = this;
      var x, y;

      for(y = 0; y < h; y++){
        for(x = 0; x < w; x++){
          func(x, y, d[x][y], g);
        }
      }
    }

    resize(){
      this.updateIWH();

      var g = this.g;

      g.resetTransform();

      g.fillStyle = 'darkgray';
      g.fillRect(0, 0, this.iw, this.ih);

      var tx = this.iw - this.w * this.s >> 1;
      var ty = this.ih - this.h * this.s >> 1;
      g.translate(Math.max(tx, 0), Math.max(ty, 0));
      g.scale(this.s);

      g.fillStyle = 'white';
      g.fillRect(0, 0, this.w, this.h);

      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font(this.s * .8);
    }

    draw(){
      this.iterate(this.drawFunc);
    }

    drawTile(x, y){
      this.drawFunc(x, y, this.d[x][y], this.g);
    }

    drawFrame(x, y, func = null){
      var g = this.g;
      var s1 = 1 / this.s + 1;

      if(func === null){
        g.beginPath();
        g.rect(x, y, 1, 1);
        g.stroke();
      }else{
        this.adjacent(x, y, (px, py, d1, dir) => {
          if(func(d1, dir)){
            switch(dir){
              case 0:
                g.beginPath();
                g.moveTo(x, y);
                g.lineTo(x + s1, y);
                g.stroke();
                break;
              case 1:
                g.beginPath();
                g.moveTo(x, y);
                g.lineTo(x, y + s1);
                g.stroke();
                break;
              case 2:
                g.beginPath();
                g.moveTo(x, y + 1);
                g.lineTo(x + s1, y + 1);
                g.stroke();
                break;
              case 3:
                g.beginPath();
                g.moveTo(x + 1, y);
                g.lineTo(x + 1, y + s1);
                g.stroke();
                break;
            }
          }
        });
      }
    }

    get(x, y){
      var {w, h} = this;
      if(x < 0 || y < 0 || x >= w || y >= h) return null;
      return this.d[x][y];
    }

    adjacent(x, y, func){
      func(x, y - 1, this.get(x, y - 1), 0);
      func(x - 1, y, this.get(x - 1, y), 1);
      func(x, y + 1, this.get(x, y + 1), 2);
      func(x + 1, y, this.get(x + 1, y), 3);
    }
  },

  EnhancedRenderingContext: class{
    constructor(g){
      this.g = g;

      this.s = 1;
      this.tx = 0;
      this.ty = 0;

      this.rtx = 0;
      this.rty = 0;
      this.rot = 0;
      this.rcos = 0;
      this.rsin = 0;

      this.fontSize = 32;
      this.fontScale = 1;

      this.pointsQueue = [];
      this.arcsQueue = [];

      [
        'fillStyle',
        'strokeStyle',
        'textAlign',
        'textBaseline',
        'lineWidth',
        'globalCompositeOperation',
      ].forEach(prop => {
        Object.defineProperty(this, prop, {
          set: val => g[prop] = val,
          get: () => g[prop],
        });
      });

      [
        'clearRect',
        'measureText',
      ].forEach(prop => this[prop] = g[prop].bind(g));

      this.fillStyle = 'white';
      this.strokeStyle = 'black';
      this.textAlign = 'center';
      this.textBaseline = 'middle';
    }

    beginPath(){
      this.pointsQueue.length = 0;
      this.arcsQueue.length = 0;
    }

    closePath(){
      var q = this.pointsQueue;
      q.push(1, q[1], q[2]);
    }

    fill(){
      this.finishLine(true);
      this.g.fill();
    }

    stroke(){
      this.finishLine(false);
      this.g.stroke();
    }

    finishLine(fillMode){
      var g = this.g;
      var q = this.pointsQueue;
      var aq = this.arcsQueue;

      var x1 = q[1];
      var y1 = q[2];

      var i = 0;
      var j = 0;

      g.beginPath();

      do{
        while(j < aq.length && aq[j] == i){
          g.arc(aq[1], aq[2], aq[3], aq[4], aq[5], aq[6]);
          j += 7;
        }

        i += 3;

        var type = q[i];

        var x2 = q[i + 1];
        var y2 = q[i + 2];

        if(fillMode){
          if(Math.abs(x1 - x2) == 1) x2 = x1;
          if(Math.abs(y1 - y2) == 1) y2 = y1;
        }

        if(!type){
          x1 = x2;
          y1 = y2;
          continue;
        }

        if(fillMode){
          g.lineTo(x2, y2);
        }else{
          var dx = y1 != y2 ? .5 : 0;
          var dy = x1 != x2 ? .5 : 0;

          g.moveTo(x1 + dx, y1 + dy);
          g.lineTo(x2 + dx, y2 + dy);
        }

        x1 = x2;
        y1 = y2;
      }while(i < q.length);
    }

    resetTransform(){
      this.s = 1;
      this.tx = 0;
      this.ty = 0;
    }

    scale(s){
      this.s *= s;
    }

    translate(x, y){
      this.tx += this.s * x;
      this.ty += this.s * y;
    }

    rotate(x, y, angle){
      this.rot = angle;

      if(angle){
        this.rtx = x;
        this.rty = y;
        this.rcos = Math.cos(angle);
        this.rsin = -Math.sin(angle);
      }
    }

    rect(x, y, w, h){
      var s1 = 1 / this.s;

      this.moveTo(x, y);
      this.lineTo(x + w + s1, y);

      this.moveTo(x + w, y);
      this.lineTo(x + w, y + h + s1);

      this.moveTo(x + w + s1, y + h);
      this.lineTo(x, y + h);

      this.moveTo(x, y + h + s1);
      this.lineTo(x, y);
    }

    fillRect(x, y, w, h){
      if(this.rot){
        this.g.beginPath();
        this.rect(x, y, w, h);
        this.fill();
        return;
      }

      this.g.fillRect(Math.round(x * this.s + this.tx), Math.round(y * this.s + this.ty), Math.round(w * this.s) | 0, Math.round(h * this.s) | 0);
    }

    moveTo(x, y){
      if(this.rot){
        var xx = x - this.rtx;
        var yy = y - this.rty;

        x = this.rtx + xx * this.rcos - yy * this.rsin;
        y = this.rty + yy * this.rcos + xx * this.rsin;
      }

      this.pointsQueue.push(0, Math.round(x * this.s + this.tx), Math.round(y * this.s + this.ty));
    }

    lineTo(x, y){
      if(this.rot){
        var xx = x - this.rtx;
        var yy = y - this.rty;

        x = this.rtx + xx * this.rcos - yy * this.rsin;
        y = this.rty + yy * this.rcos + xx * this.rsin;
      }

      this.pointsQueue.push(1, Math.round(x * this.s + this.tx), Math.round(y * this.s + this.ty));
    }

    arc(x, y, r, a1, a2, acw){
      if(this.rot){
        var xx = x - this.rtx;
        var yy = y - this.rty;

        x = this.rtx + xx * this.rcos - yy * this.rsin;
        y = this.rty + yy * this.rcos + xx * this.rsin;

        a1 = (a1 - this.rot) % O.pi2;
        a2 = (a2 - this.rot) % O.pi2;
      }

      this.arcsQueue.push(this.pointsQueue.length, x * this.s + this.tx + .5, y * this.s + this.ty + .5, r * this.s, a1, a2, acw);
    }

    fillText(text, x, y){
      if(this.rot){
        var xx = x - this.rtx;
        var yy = y - this.rty;

        x = this.rtx + xx * this.rcos - yy * this.rsin;
        y = this.rty + yy * this.rcos + xx * this.rsin;
      }

      this.g.fillText(text, Math.round(x * this.s + this.tx), Math.round(y * this.s + this.ty));
    }

    updateFont(){
      this.g.font = `${this.fontSize * this.fontScale}px arial`;
    }

    font(size){
      this.fontSize = size;
      this.updateFont();
    }

    scaleFont(scale){
      this.fontScale = scale;
      this.updateFont();
    }
  },

  BitStream: class{
    constructor(arr = null, checksum = false){
      this.arr = new Uint8Array(0);
      this.len = 0;
      this.bits = '';

      this.rIndex = 0;
      this.rBits = '';

      this.error = false;

      if(arr != null){
        this.parse([...arr], checksum);
      }
    }

    parse(arr, checksum = false){
      if(checksum){
        if(!this.checkArr(arr)){
          this.error = true;
          arr.length = 0;
        }
      }

      this.arr = Uint8Array.from(arr);
      this.len = this.arr.length;
    }

    checkArr(arr){
      if(arr.length & 31) return false;

      var csum = new Uint8Array(arr.splice(arr.length - 32));

      arr.forEach((byte, index) => {
        var cs = csum[index & 31];
        arr[index] ^= cs ^ this.getIndexValue(index ^ cs, .8);
      });

      var hash = O.sha256(arr);

      arr.forEach((byte, index) => {
        arr[index] = byte - this.getIndexValue(index, .9) & 255;
      });

      hash.forEach((byte, index) => {
        csum[index] ^= byte;
      });

      if(csum.some(byte => byte)) return false;
      return arr;
    }

    writeByte(a){
      if(this.len == this.arr.length) this.arr = new Uint8Array([...this.arr, ...Array(this.len || 1)]);
      this.arr[this.len++] = a;
    }

    writeBits(a){
      this.bits += a;

      while(this.bits.length >= 8){
        a = this.bits.substring(0, 8);
        this.bits = this.bits.substring(8);
        this.writeByte(parseInt(a, 2));
      }
    }

    write(a, b = null){
      if(b == null) b = (1 << O.binLen(a)) - 1;

      b = b.toString(2);
      a = a.toString(2).padStart(b.length, '0');

      var eq = true;

      a = [...a].filter((v, i) => {
        if(!eq) return true;
        if(!+b[i]) return false;
        if(!+v) eq = false;
        return true;
      }).join('');

      this.writeBits(a);
    }

    pack(){
      if(this.bits) this.writeBits('0'.repeat(8 - this.bits.length));
    }

    getArr(checksum = false){
      var arr = O.ca(this.len + !!this.bits, i => {
        if(i < this.len) return this.arr[i];
        return parseInt(this.bits.padEnd(8, '0'), 2);
      });

      if(!checksum) return arr;

      while(arr.length & 31){
        arr.push(0);
      }

      arr.forEach((byte, index) => {
        arr[index] = byte + this.getIndexValue(index, .9) & 255;
      });

      var csum = O.sha256(arr);

      arr.forEach((byte, index) => {
        var cs = csum[index & 31];
        arr[index] ^= cs ^ this.getIndexValue(index ^ cs, .8);
      });

      return [...arr, ...csum];
    }

    readByte(a){
      if(this.rIndex == this.arr.length) return 0;
      return this.arr[this.rIndex++];
    }

    readBits(a){
      var bits = '';

      while(this.rBits.length < a) this.rBits += this.readByte().toString(2).padStart(8, '0');

      bits = this.rBits.substring(0, a);
      this.rBits = this.rBits.substring(a);

      return bits;
    }

    read(b = 255){
      var a;

      a = this.readBits(O.binLen(b));
      b = b.toString(2);

      var eq = true;
      var i = 0;

      b = [...b].map(v => {
        if(!eq) return a[i++];
        if(!+v) return 0;
        if(!+a[i]) eq = false;
        return +a[i++];
      }).join('');

      this.rBits = a.substring(i) + this.rBits;

      return parseInt(b, 2);
    }

    getIndexValue(index, exp){
      return ((index + 2) ** exp).toString().slice(-3) & 255;
    }

    stringify(checksum = false){
      var arr = this.getArr(checksum);

      return arr.map((byte, index) => {
        var newLine = index != arr.length - 1 && !(index + 1 & 31);
        var byteStr = byte.toString(16).toUpperCase().padStart(2, '0');

        return `${byteStr}${newLine ? '\n' : ''}`;
      }).join``;
    }
  },

  /*
    String functions
  */

  ascii(str){
    return [...str].map(char => {
      var charCode = char.charCodeAt(0);
      if(charCode >= 32 && charCode <= 126) return char;
      else return '?';
    }).join('');
  },
  sanl(str){
    return str.split(/\r\n|\r|\n/gm);
  },
  pad(str, len, char = '0'){
    str += '';
    if(str.length >= len) return str;
    return char.repeat(len - str.length) + str;
  },

  /*
    Array functions
  */

  ca(len, func){
    return [...new Array(len)].map((elem, index) => func(index));
  },

  /*
    Other functions
  */

  repeat(num, func){
    for(var i = 0; i < num; i++) func(i);
  },
  rand(a){
    return Math.random() * a | 0;
  },
  bound(val, min, max){
    if(val < min) return min;
    if(val > max) return max;
    return val;
  },
  int(val, min = null, max = null){
    if(typeof val == 'object') val = 0;
    else val |= 0;
    if(min != null) val = O.bound(val, min, max);
    return val;
  },
  bool(val){
    return Boolean(O.int(val));
  },
  sortAsc(arr){
    return arr.sort((elem1, elem2) => elem1 > elem2 ? 1 : elem1 < elem2 ? -1 : 0);
  },
  sortDesc(arr){
    return arr.sort((elem1, elem2) => elem1 > elem2 ? -1 : elem1 < elem2 ? 1 : 0);
  },
  rgb(...col){
    return `#${col.map(val => O.pad((val | 0).toString(16), 2)).join('')}`;
  },
  binLen(a){
    return a && (Math.log2(a) | 0) + 1;
  },

  /*
    Algorithms
  */

  findPathAStar(grid, x1, y1, x2, y2){
    if(x1 == x2 && y1 == y2) return [];

    grid.iterate((x, y, d) => {
      d.visited = x == x1 && y == y1;
      d.heuristicDist = Math.abs(x - x2) + Math.abs(y - y2);
      d.pathDist = 0;
      d.totalDist = d.heuristicDist;
      d.dir = -1;
    });

    var {w, h} = grid;
    var distStep = 10;
    var nodes = [x1, y1];
    var x, y, dist, dir, i;
    var d1, d2;

    while(1){
      if(!nodes.length) return null;
      [x, y] = [nodes.shift(), nodes.shift()];
      if(Math.abs(x - x2) + Math.abs(y - y2) == 1) break;
      d1 = grid[x][y];

      if(y) visit(x, y - 1, 0);
      if(x) visit(x - 1, y, 1);
      if(y < h - 1) visit(x, y + 1, 2);
      if(x < w - 1) visit(x + 1, y, 3);
    }

    var path = [];
    if(y > y2) path.push(0);
    else if(x > x2) path.push(1);
    else if(y < y2) path.push(2);
    else path.push(3);

    while(1){
      if(x == x1 && y == y1) break;
      dir = grid[x][y].dir;
      path.unshift(dir);
      if(!dir) y++;
      else if(dir == 1) x++;
      else if(dir == 2) y--;
      else x--;
    }

    return path;

    function visit(xx, yy, dir){
      d2 = grid[xx][yy];
      if(d2.wall) return;
      dist = d2.heuristicDist + d1.pathDist + distStep;

      if(!d2.visited || d2.totalDist > dist){
        d2.visited = true;
        d2.pathDist = d1.pathDist + distStep;
        d2.totalDist = dist;
        d2.dir = dir;
        for(i = 0; i < nodes.length; i += 2) if(grid[nodes[i]][nodes[i + 1]].totalDist > dist) break;
        nodes.splice(i, 0, xx, yy);
      }
    }
  },
  sha256: (() => {
    var MAX_UINT = 2 ** 32;

    class Buffer extends Uint8Array{
      constructor(...params){
        super(...params);
      }

      static alloc(size){
        return new Buffer(size);
      }

      static from(arr){
        return new Buffer(arr);
      }

      static concat(arr){
        arr = arr.reduce((concatenated, buff) => {
          return [...concatenated, ...buff];
        }, []);

        return new Buffer(arr);
      }

      readUInt32BE(offset){
        var value;

        value = this[offset] * 2 ** 24;
        value += this[offset + 1] * 2 ** 16;
        value += this[offset + 2] * 2 ** 8;
        value += this[offset + 3];

        return value;
      }

      writeUInt32BE(value, offset){
        this[offset] = value / 2 ** 24;
        this[offset + 1] = value / 2 ** 16;
        this[offset + 2] = value / 2 ** 8;
        this[offset + 3] = value;
      }

      writeInt32BE(value, offset){
        this[offset] = value >> 24;
        this[offset + 1] = value >> 16;
        this[offset + 2] = value >> 8;
        this[offset + 3] = value;
      }
    };

    return sha256;

    function sha256(buff){
      var hh = getArrH();
      var kk = getArrK();

      var chunks = getChunks(buff);

      chunks.forEach(chunk => {
        var w = new Uint32Array(64);

        for(var i = 0; i < 16; i++){
          w[i] = chunk.readUInt32BE(i << 2);
        }

        for(var i = 16; i < 64; i++){
          var s0 = (rot(w[i - 15], 7) ^ rot(w[i - 15], 18) ^ shr(w[i - 15], 3)) | 0;
          var s1 = (rot(w[i - 2], 17) ^ rot(w[i - 2], 19) ^ shr(w[i - 2], 10)) | 0;

          w[i] = w[i - 16] + w[i - 7] + s0 + s1 | 0;
        }

        var [a, b, c, d, e, f, g, h] = hh;

        for(var i = 0; i < 64; i++){
          var s1 = (rot(e, 6) ^ rot(e, 11) ^ rot(e, 25)) | 0;
          var ch = ((e & f) ^ (~e & g)) | 0;
          var temp1 = (h + s1 + ch + kk[i] + w[i]) | 0;
          var s0 = (rot(a, 2) ^ rot(a, 13) ^ rot(a, 22)) | 0;
          var maj = ((a & b) ^ (a & c) ^ (b & c)) | 0;
          var temp2 = (s0 + maj) | 0;

          h = g | 0;
          g = f | 0;
          f = e | 0;
          e = d + temp1 | 0;
          d = c | 0;
          c = b | 0;
          b = a | 0;
          a = temp1 + temp2 | 0;
        }

        [a, b, c, d, e, f, g, h].forEach((a, i) => {
          hh[i] = hh[i] + a | 0;
        });
      });

      var digest = computeDigest(hh);

      return digest;
    }

    function getArrH(){
      var arr = firstNPrimes(8);

      arrPow(arr, 1 / 2);
      arrFrac(arr);

      return new Uint32Array(arr);
    }

    function getArrK(){
      var arr = firstNPrimes(64);

      arrPow(arr, 1 / 3);
      arrFrac(arr);

      return new Uint32Array(arr);
    }

    function getChunks(buff){
      var bits = buffToBits(buff);
      var len = bits.length;
      var k = getVarK(len);

      bits += '1' + '0'.repeat(k);

      var buffL = Buffer.alloc(8);
      buffL.writeUInt32BE(len / MAX_UINT, 0);
      buffL.writeUInt32BE(len % MAX_UINT, 4);

      bits += buffToBits(buffL);

      var chunks = (bits.match(/.{512}/g) || []).map(a => {
        return bitsToBuff(a);
      });

      return chunks;
    }

    function getVarK(len){
      for(var i = 0; i < 512; i++){
        if(!((len + i + 65) % 512)) return i;
      }
    }

    function computeDigest(a){
      return Buffer.concat([...a].map(a => {
        var buff = Buffer.alloc(4);
        buff.writeUInt32BE(a, 0);
        return buff;
      }));
    }

    function shr(a, b){
      a = toUint32(a);
      a = [...a.toString(2).padStart(32, '0')];

      while(b--){
        a.pop();
        a.unshift('0');
      }

      return parseInt(a.join``, 2) | 0;
    }

    function rot(a, b){
      a = toUint32(a);
      a = [...a.toString(2).padStart(32, '0')];

      while(b--){
        a.unshift(a.pop());
      }

      return parseInt(a.join``, 2) | 0;
    }

    function toUint32(a){
      var buff = Buffer.alloc(4);
      buff.writeInt32BE(a | 0, 0);
      return buff.readUInt32BE(0);
    }

    function arrPow(arr, pow){
      arr.forEach((a, i) => {
        a **= pow;
        arr[i] = a;
      });
    }

    function arrFrac(arr, bitsNum = 32){
      arr.forEach((a, i) => {
        a = a % 1 * 2 ** bitsNum;

        var bits = O.ca(bitsNum, i => {
          return !!(a & (1 << (bitsNum - i - 1))) | 0;
        }).join``;

        a = parseInt(bits, 2);

        arr[i] = a;
      });
    }

    function buffToBits(buff){
      return [...buff].map(byte => {
        return byte.toString(2).padStart(8, '0');
      }).join``;
    }

    function bitsToBuff(bits){
      return Buffer.from((bits.match(/\d{8}/g) || []).map(a => {
        return parseInt(a, 2);
      }));
    }

    function firstNPrimes(a){
      return O.ca(a, i => nthPrime(i + 1));
    }

    function nthPrime(a){
      for(var i = 1; a; i++){
        if(isPrime(i)) a--;
      }

      return i - 1;
    }

    function isPrime(a){
      if(a == 1) return false;

      for(var i = 2; i < a; i++){
        if(!(a % i)) return false;
      }

      return true;
    }
  })(),

  /*
    Function which does nothing
  */

  nop(){}
};

O.init();