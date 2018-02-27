'use strict';

var size = 40;
var diameter = .7;

var w = 1920 / size | 0;
var h = 1080 / size | 0;
var radius = diameter / 2;

var tileParams = ['dir', 'circ', 'wall'];

var cols = {
  bg: '#ffffff',
  nonMarkedLines: '#e0e0e0',
  markedLines: '#000000',
  darkCirc: '#000000',
  lightCirc: '#ffffff',
  wall: '#808080',
};

var drawFuncs = [
  drawGridLines,
  drawTile,
  drawFrameLines,
];

var grid = null;
var blackCirc = null;

window.setTimeout(main);

function main(){
  grid = new O.TilesGrid();

  grid.setWH(w, h);
  grid.setSize(size);
  grid.setTileParams(tileParams);

  createGrid();
  addEventListeners();
}

function addEventListeners(){
  var clientX = grid.iw >> 1;
  var clientY = grid.ih >> 1;

  window.addEventListener('keydown', evt => {
    switch(evt.code){
      case 'Enter': applyAlgorithms(); break;
      case 'KeyB': toggleCirc(1); break;
      case 'KeyW': toggleCirc(2); break;
      case 'KeyX': toggleWall(); break;
      case 'KeyR': resetGrid(); break;
      case 'KeyS': solve(); break;
      case 'KeyG': generate(); break;
      case 'ArrowUp': move(0); break;
      case 'ArrowLeft': move(1); break;
      case 'ArrowDown': move(2); break;
      case 'ArrowRight': move(3); break;
    }
  });

  window.addEventListener('mousedown', evt => {
    switch(evt.button){
      case 0:
        markLine(evt);
        break;

      case 2:
        unmarkLine(evt);
        break;
    }
  });

  window.addEventListener('mousemove', evt => {
    clientX = evt.clientX;
    clientY = evt.clientY;
  });

  window.addEventListener('contextmenu', evt => {
    evt.preventDefault();
  });

  function markLine(evt){
    var coords = getCoords(evt);
    if(coords === null) return;

    var [x, y, dir] = coords;
    sdir(x, y, dir);

    drawGrid();
  }

  function unmarkLine(evt){
    var coords = getCoords(evt);
    if(coords === null) return;

    var [x, y, dir] = coords;
    cdir(x, y, dir);
    
    drawGrid();
  }

  function toggleCirc(type){
    var coords = getCoords();
    if(coords === null) return;

    var [x, y] = coords;
    var d = grid.get(x, y);

    if(d.wall) cwall(x, y);
    
    if(d.circ == type) d.circ = 0;
    else d.circ = type;

    drawGrid();
  }

  function toggleWall(){
    var coords = getCoords();
    if(coords === null) return;

    var [x, y] = coords;
    var d = grid.get(x, y);

    if(d.wall) cwall(x, y);
    else swall(x, y);

    drawGrid();
  }

  function getCoords(evt = null){
    if(evt !== null){
      clientX = evt.clientX;
      clientY = evt.clientY;
    }

    var g = grid.g;

    var cx = clientX / g.s - g.tx;
    var cy = clientY / g.s - g.ty;

    var x = Math.floor(cx);
    var y = Math.floor(cy);

    var d = grid.get(x, y);
    if(d === null) return null;

    cx %= 1;
    cy %= 1;

    var a1 = cx <= cy;
    var a2 = 1 - cx < cy;
    var dir = (a2 << 1) | (a1 ^ a2);

    return [x, y, dir];
  }

  function move(dir){
    var collected = 0;

    grid.iterate((x, y, d) => d.moved = 0);

    grid.iterate((x, y, d) => {
      if(d.moved != 2 && d.circ == 1 && !gdir(x, y, dir)){
        var d1 = ndir(x, y, dir).d;
        if(d1 === null) return;

        if(!d.moved){
          d.circ = 0;
        }

        if(d1.circ != 1){
          if(d.circ == 2) collected++;
          d1.circ = 1;
          d1.moved = 2;
        }else{
          d1.moved = 1;
        }
      }
    });

    drawGrid();

    return collected;
  }

  function solve(){
    var dirPrev = -1;
    var p = [];

    grid.iterate((x, y, d) => {
      d.solvingDir1 = d.dir ^ 15;
      d.solvingDir2 = d.solvingDir1;

      if(d.circ == 1){
        p.push(new O.Point(x, y));
      }
    });

    if(p.length != 1) return;

    var {x, y} = p[0];
    var [xPrev, yPrev] = [x, y];
    var d = grid.get(x, y);

    window.requestAnimationFrame(performMove);

    function performMove(){
      var dir = -1;

      xPrev = x;
      yPrev = y;

      iterateDirs(ddir => {
        if(dir == -1 && ddir != dirPrev && (d.solvingDir1 & (1 << ddir))){
          dir = ddir;
        }
      });

      if(dir == -1){
        iterateDirs(ddir => {
          if(dir == -1 && ddir != dirPrev && (d.solvingDir2 & (1 << ddir))){
            dir = ddir;
          }
        });
      }

      if(dir == -1) return;

      if(d.solvingDir1 & (1 << dir)) d.solvingDir1 &= ~(1 << dir);
      else d.solvingDir2 &= ~(1 << dir);

      dirPrev = dir + 2 & 3;
      d.circ = 0;

      var obj = ndir(x, y, dir);

      x = obj.x;
      y = obj.y;
      d = obj.d;

      if(d.circ) dirPrev = -1;
      d.circ = 1;

      if(d.solvingDir1 & (1 << dirPrev)) d.solvingDir1 &= ~(1 << dirPrev);
      else d.solvingDir2 &= ~(1 << dirPrev);

      drawAdjacentTiles(0);
      drawAdjacentTiles(1);

      window.requestAnimationFrame(performMove);
    }

    function drawAdjacentTiles(mode){
      var px = mode ? x : xPrev;
      var py = mode ? y : yPrev;

      drawFuncs.forEach(func => {
        func(px, py, d, grid.g);
        
        grid.adjacent(px, py, (x, y, d, dir) => {
          if(!(d === null || d.wall)){
            func(x, y, d, grid.g);
          }
        });
      });
    }
  }

  function generate(){
    do{
      resetGrid();

      grid.iterate((x, y, d) => {
        d.visited = 0;
        if(Math.random() < .1) swall(x, y);
      });

      var x = O.rand(w);
      var y = O.rand(h);
      var dir = -1;

      var queue = [[x, y, -1]];
      var d = grid.get(x, y);

      if(d.wall) cwall(x, y);
      d.circ = 1;

      while(queue.length){
        [x, y, dir] = queue.splice(O.rand(queue.length), 1)[0];

        d = grid.get(x, y);
        if(d.visited) continue;

        iterateDirs(dir => {
          if(!gdir(x, y, dir)){
            var obj = ndir(x, y, dir);

            if(obj.d !== null){
              queue.push([obj.x, obj.y, dir + 2 & 3]);
            }
          }
        });

        sdirs(x, y);
        if(dir != -1) cdir(x, y, dir);

        d.visited = 1;
        d.dirs = 15 & ~(1 << dir);
      }

      grid.iterate((x, y, d) => {
        if(!d.visited && !d.wall){
          swall(x, y);
        }
      });

      var freeSpace = 0;

      grid.iterate((x, y, d) => {
        if(!d.wall) freeSpace++;
      });
    }while(freeSpace < 100);

    findInternalCells();
    putWhiteCircs();

    drawGrid();
  }
}

function createGrid(){
  grid.create(() => {
    return [0, 0, 0];
  });

  resetGrid();
}

function resetGrid(){
  blackCirc = null;

  grid.iterate((x, y, d) => {
    d.dir = 0;
    d.circ = 0;
    d.wall = 0;

    d.internal = 0;
  });

  drawGrid();
}

/*
  Drawing functions
*/

function clearGrid(){
  var g = grid.g;

  g.fillStyle = cols.bg;
  g.fillRect(0, 0, w, h);
}

function drawGrid(){
  clearGrid();

  drawFuncs.forEach(func => {
    grid.setDrawFunc(func);
    grid.draw();
  });
}

function drawGridLines(x, y, d, g){
  g.strokeStyle = cols.nonMarkedLines;
  g.beginPath();
  g.rect(x, y, 1, 1);
  g.stroke();
}

function drawTile(x, y, d, g){
  g.strokeStyle = 'black';

  if(d.wall){
    g.fillStyle = cols.wall;
    g.fillRect(x, y, 1, 1);
    grid.drawFrame(x, y, drawWallFrame);
    return;
  }

  if(d.internal){
    g.fillStyle = '#e0e0ff';
    g.fillRect(x, y, 1, 1);
  }

  if(d.circ){
    g.fillStyle = [cols.darkCirc, cols.lightCirc][d.circ - 1];
    g.beginPath();
    g.arc(x + .5, y + .5, radius, 0, O.pi2);
    g.fill();
    g.stroke();
  }
}

function drawFrameLines(x, y, d, g){
  g.strokeStyle = cols.markedLines;

  grid.drawFrame(x, y, (d1, dir) => {
    if(d.wall && d1 && d1.wall) return false;
    if(!gdir(x, y, dir)) return false;
    return true;
  });
}

function drawWallFrame(d, dir){
  if(d === null) return true;
  return !d.wall;
}

/*
  Iterating functions
*/

function iterateExternalShape(x, y, func){
  var id = getId();
  var queue = [{x, y, d: grid.get(x, y)}];

  while(queue.length){
    var {x, y, d} = queue.shift();
    if(d.id === id) continue;
    d.id = id;

    func(x, y, d);

    iterateDirs(dir => {
      var obj = ndir(x, y, dir);
      var d = obj.d;

      if(d !== null && d.internal && d .id !== id){
        queue.push(obj);
      }
    });
  }
}

function iterateInternalShape(x, y, func){
  var id = getId();
  var queue = [{x, y, d: grid.get(x, y)}];

  while(queue.length){
    var {x, y, d} = queue.shift();
    if(d.id === id) continue;
    d.id = id;

    func(x, y, d);

    iterateDirs(dir => {
      if(gdir(x, y, dir)) return;

      var obj = ndir(x, y, dir);
      if(obj.d.id === id) return;

      queue.push(obj);
    });
  }
}

function traverseShape(x, y, func){
  var id = getId();
  var d = grid.get(x, y);
  var dir1 = null;
  var dir2;

  var xp, yp, dp;

  do{
    xp = x;
    yp = y;
    dp = d;

    if(!gdir(xp, yp, 0) && ({x, y, d} = ndir(xp, yp, 0), d.id !== id)) dir2 = 0;
    else if(!gdir(xp, yp, 1) && ({x, y, d} = ndir(xp, yp, 1), d.id !== id)) dir2 = 1;
    else if(!gdir(xp, yp, 3) && ({x, y, d} = ndir(xp, yp, 3), d.id !== id)) dir2 = 3;
    else if(!gdir(xp, yp, 2) && ({x, y, d} = ndir(xp, yp, 2), d.id !== id)) dir2 = 2;
    else dir2 = null;

    func(xp, yp, dp, dir1, dir2);

    if(dir2 !== null){
      dp.id = id;
      dp = d;
      dir1 = dir2 + 2 & 3;
    }
  }while(dir2 !== null);
}

function someAdjacent(x, y, func){
  var obj;

  obj = ndir(x, y, 0); if(func(obj.x, obj.y, obj.d, 0)) return true;
  obj = ndir(x, y, 1); if(func(obj.x, obj.y, obj.d, 1)) return true;
  obj = ndir(x, y, 3); if(func(obj.x, obj.y, obj.d, 3)) return true;
  obj = ndir(x, y, 2); if(func(obj.x, obj.y, obj.d, 2)) return true;

  return false;
}

function iterateDirs(func){
  func(0);
  func(1);
  func(3);
  func(2);
}

/*
  Algorithms
*/

function applyAlgorithms(){
  createSnapshot();
  transformGrid();
  checkSnapshot();

  drawGrid();
}

function transformGrid(){
  findInternalCells();
  putExternalLines();
  
  findInternalCells();
  findShapes();

  putBlackCirc();
  connectExternalShapes();

  fillShapes();
  //connectInternalShapes();

  //connectDirShapes();
  putWhiteCircs();
}

function createSnapshot(){
  grid.iterate((x, y, d) => {
    d.dirPrev = gdirs(x, y);
    d.circPrev = d.circ;
    d.wallPrev = d.wall;
  });
}

function findInternalCells(){
  var arr = [];
  var queue = [];

  grid.iterate((x, y, d) => d.internal = 1);

  O.repeat(w, x => queue.push([x, -1], [x, h]));
  O.repeat(h, y => queue.push([-1, y], [w, y]));

  while(queue.length){
    var [x, y] = queue.shift();
    var d = grid.get(x, y);

    if(d !== null){
      if(!d.internal) continue;
      d.internal = 0;
    }

    iterateDirs(dir => {
      if(!gdir(x, y, dir)){
        var obj = ndir(x, y, dir);
        queue.push([obj.x, obj.y]);
      }
    });
  }
}

function putExternalLines(){
  var d1;

  grid.iterate((x, y, d) => {
    d.ext = 0;
    d.extLines = 0;
  });

  grid.iterate((x, y, d) => {
    var found = false;

    if(d.internal){
      if(!d.wall) return;

      for(var j = y - 1; j <= y + 1; j++){
        for(var i = x - 1; i <= x + 1; i++){
          d1 = grid.get(i, j);
          if(d1 === null || d1.internal) continue;
          d1.ext = 1;
        }
      }

      return;
    }else{
      iterateDirs(dir => {
        if(!gdir(x, y, dir)) return;

        if((d1 = ndir(x, y, dir).d) === null || d1.wall || !d1.internal){
          found = true;

          if(dir === 0 || dir === 2){
            if((d1 = ndir(x, y, 1).d) && !d1.internal) d1.ext = 1;
            if((d1 = ndir(x, y, 3).d) && !d1.internal) d1.ext = 1;
          }else{
            if((d1 = ndir(x, y, 0).d) && !d1.internal) d1.ext = 1;
            if((d1 = ndir(x, y, 2).d) && !d1.internal) d1.ext = 1;
          }
        }
      });
    }

    if(d.circ || found) d.ext = 1;
  });

  grid.iterate((x, y, d) => {
    if(!d.ext) return;

    iterateDirs(dir => {
      var ddir = 1 << dir;

      d1 = ndir(x, y, dir).d;

      if(!(d1 && d1.ext)) return d.extLines |= ddir;
      if(d.circ || (d1 && d1.circ) || isLineTouching(x, y, dir)) return;

      d.extLines |= ddir;
    });
  });

  grid.iterate((x, y, d) => {
    if(d.ext){
      iterateDirs(dir => {
        if(d.extLines & (1 << dir)) sdir(x, y, dir);
      });
    }
  });
}

function findShapes(){
  grid.iterate((x, y, d) => d.containsCircs = 0);

  grid.iterate((x, y, d) => {
    if(!d.internal || d.containsCircs) return;

    if(d.circ){
      iterateInternalShape(x, y, (x, y, d) => d.containsCircs = 1);
    }
  });
}

function putBlackCirc(){
  var firstInternalCell = null;
  var firstBlackCirc = null;
  var d1;

  grid.iterate((x, y, d) => {
    if(d.internal && !d.wall){
      if(firstInternalCell === null) firstInternalCell = new O.Point(x, y);
      if(d.circ === 1 && firstBlackCirc === null) firstBlackCirc = new O.Point(x, y);
    }

    if(d.circ === 1) d.circ = 0;
  });

  if(firstInternalCell === null){
    sdirs(0, 0);
    grid.get(0, 0).internal = 1;
    setBlackCirc(0, 0);
  }else if(firstBlackCirc === null){
    setBlackCirc(firstInternalCell.x, firstInternalCell.y);
  }else{
    setBlackCirc(firstBlackCirc.x, firstBlackCirc.y);
  }
}

function connectExternalShapes(){
  while(1){
    var internalNum = 0;

    grid.iterate((x, y, d) => {
      if(d.internal) internalNum++;
    });

    var tiles = [];
    var queue = [];

    iterateExternalShape(blackCirc.x, blackCirc.y, (x, y, d) => {
      tiles.push([x, y]);
      internalNum--;

      if(someAdjacent(x, y, (x, y, d1) => d1 !== null && !d1.internal)){
        queue.push([x, y, d, []]);
      }
    });

    if(!internalNum) break;

    queue.sort(([x1, y1], [x2, y2]) => {
      if(y1 < y2) return -1;
      if(y1 > y2) return 1;
      if(x1 < x2) return -1;
      return 1;
    });

    var id = getId();

    tiles.forEach(([x, y]) => grid.get(x, y).id = id);

    while(1){
      var [x, y, d, path] = queue.shift();

      if(!d.internal && d.id === id) continue;
      d.id = id;

      if(d.internal && path.length){
        path = path.map(dir => dir + 2 & 3);
        path.push(path[path.length - 1]);

        path.reduceRight((dirPrev, dir) => {
          if(!d.internal){
            iterateDirs(ddir => {
              if(ddir !== dir && ddir !== dirPrev){
                sdir(x, y, ddir);
              }
            });
          }

          ({x, y, d} = ndir(x, y, dir));

          return dir + 2 & 3;
        });

        break;
      }

      var obj;
      if((obj = ndir(x, y, 0)).d !== null && obj.d.id !== id) queue.push([obj.x, obj.y, obj.d, [...path, 0]]);
      if((obj = ndir(x, y, 1)).d !== null && obj.d.id !== id) queue.push([obj.x, obj.y, obj.d, [...path, 1]]);
      if((obj = ndir(x, y, 3)).d !== null && obj.d.id !== id) queue.push([obj.x, obj.y, obj.d, [...path, 3]]);
      if((obj = ndir(x, y, 2)).d !== null && obj.d.id !== id) queue.push([obj.x, obj.y, obj.d, [...path, 2]]);
    }

    findInternalCells();
  };

  findInternalCells();
}

function fillShapes(){
  grid.iterate((x, y, d) => d.visited = 0);

  grid.iterate((x, y, d) => {
    if(!d.internal || d.visited) return;

    if(!d.containsCircs){
      traverseShape(x, y, (x, y, d, dir1, dir2) => {
        iterateDirs(dir => {
          if(dir !== dir1 && dir !== dir2) sdir(x, y, dir);
        });

        d.visited = 1;
      });
    }else{
      /* The shape contains circles */
    }
  });
}

function putWhiteCircs(){
  grid.iterate((x, y, d) => {
    if(!(d.circ == 1 || d.wall)){
      if(d.internal && dirsNum(x, y) == 3) d.circ = 2;
      else d.circ = 0;
    }
  });
}

function checkSnapshot(){
  var needsChange = true;
  var freeTile = null;

  grid.iterate((x, y, d) => {
    if(!needsChange) return;

    if(d.dir !== d.dirPrev || d.circ !== d.circPrev || d.wall !== d.wallPrev){
      needsChange = false;
      return;
    }

    if(freeTile === null && !d.internal && gdirs(x, y)){
      freeTile = new O.Point(x, y);
    }
  });

  if(needsChange && freeTile !== null){
    sdirs(freeTile.x, freeTile.y);
    transformGrid();
  }
}

/*
  Other functions
*/

function getId(){
  return getId.id = -~getId.id;
}

function setBlackCirc(x, y){
  var d = grid.get(x, y);
  if(d.wall) cwall(x, y);
  blackCirc = new O.Point(x, y);
  d.circ = 1;
}

function isLineTouching(x, y, dir){
  if(gdire(x, y, dir) || gdire(x, y, dir - 1 & 3) || gdire(x, y, dir + 1 & 3)) return true;

  var xx = x, yy = y;
  var d;

  ({x, y, d} = ndir(xx, yy, dir));
  if(d && (gdire(x, y, dir - 1 & 3) || gdire(x, y, dir + 1 & 3))) return true;

  ({x, y, d} = ndir(xx, yy, dir - 1 & 3));
  if(d && gdire(x, y, dir)) return true;

  ({x, y, d} = ndir(xx, yy, dir + 1 & 3));
  if(d && gdire(x, y, dir)) return true;

  return false;
}

function dirsNum(x, y){
  return gdir(x, y, 0) + gdir(x, y, 1) + gdir(x, y, 2) + gdir(x, y, 3);
}

function gdir(x, y, dir){
  var d = grid.get(x, y);

  if(d === null){
    var obj = ndir(x, y, dir);
    if((d = obj.d) === null) return 1;

    x = obj.x;
    y = obj.y;

    dir = dir + 2 & 3;
  }

  if(d.wall || (d.dir & (1 << dir))) return 1;
  if((d = ndir(x, y, dir).d) && d.wall) return 1;
  return 0;
}

function gdire(x, y, dir){
  var d = ndir(x, y, dir).d;
  if(d !== null && !(d.wall || d.ext)) return false;
  return gdir(x, y, dir);
}

function gdirs(x, y){
  return gdir(x, y, 0) | (gdir(x, y, 1) << 1) | (gdir(x, y, 2) << 2) | (gdir(x, y, 3) << 3);
}

function sdir(x, y, dir){
  var d = grid.get(x, y);
  if(d !== null) d.dir |= 1 << dir;
  if((d = ndir(x, y, dir).d) !== null) d.dir |= 1 << (dir + 2 & 3);
}

function sdirs(x, y){
  iterateDirs(dir => sdir(x, y, dir));
}

function cdirs(x, y){
  iterateDirs(dir => cdir(x, y, dir));
}

function cdir(x, y, dir){
  var d = grid.get(x, y);
  if(d !== null) d.dir &= ~(1 << dir);
  if((d = ndir(x, y, dir).d) !== null) d.dir &= ~(1 << (dir + 2 & 3));
}

function ndir(x, y, dir){
  x += (dir == 3) - (dir == 1) | 0;
  y += (dir == 2) - (dir == 0) | 0;

  return {
    x, y,
    d: grid.get(x, y),
  };
}

function swall(x, y){
  var d = grid.get(x, y);
  if(d === null || d.wall) return;

  if(d.circ) d.circ = 0;
  d.wall = 1;
  sdirs(x, y);
}

function cwall(x, y){
  var d = grid.get(x, y);
  if(d === null || !d.wall) return;

  d.wall = 0;
  sdirs(x, y);
}