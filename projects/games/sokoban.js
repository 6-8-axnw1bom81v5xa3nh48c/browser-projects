'use strict';

const ITERATIONS_NUM = 1000;

var cols = {
  empty: '#00ffff',
  player: '#ff0000',
  box: '#ffff00',
  target: '#0000ff',
  wall: '#808080'
};

var player = new O.Point(0, 0);
var boxesNum = 0;
var placedNum = 0;

var game = new Game();

game.setTileParams(['player', 'box', 'target', 'wall']);

game.setGenFunc(() => {
  var [w, h] = [20, 20];
  game.setWH(w, h);

  game.create((x, y) => [0, 0, 0, 0]);

  var [x, y] = O.ca(2, i => O.rand([w, h][i]));
  player.x = x;
  player.y = y;

  game.get(x, y).player = 1;

  game.iterate((x, y, d) => {
    d.box = !(d.player || O.rand(8)) | 0;
    d.boxPrev = d.box;
  });

  O.repeat(ITERATIONS_NUM, () => {
    move(O.rand(4), false);
  });

  boxesNum = 0;
  placedNum = 0;

  game.iterate((x, y, d) => {
    if(d.visited){
      d.target = d.box;
      d.box = d.boxPrev;

      if(d.box){
        boxesNum++;
        placedNum += d.target;
      }
    }else{
      d.box = 0;
      d.target = 0;
      d.wall = 1;
    }
  });

  game.get(player.x, player.y).player = 0;
  player.x = x;
  player.y = y;
  game.get(x, y).player = 1;
});

game.setDrawFunc((x, y, d, g) => {
  var col = getCol(d);

  g.fillStyle = col;
  g.fillRect(x, y, 1, 1);

  if(d.player){
    g.fillStyle = cols.player;
    g.beginPath();

    g.moveTo(x + .5, y + .1);
    g.lineTo(x + .9, y + .5);
    g.lineTo(x + .5, y + .9);
    g.lineTo(x + .1, y + .5);
    g.closePath();

    g.fill();
    g.stroke();
  }else if(d.box){
    g.fillStyle = cols.box;
    g.beginPath();

    g.rect(x + .2, y + .2, .6, .6);

    g.fill();
    g.stroke();
  }

  game.drawFrame(x, y);
});

game.setExportFunc((bs, d) => {
  bs.write(d.wall, 1);
  if(d.wall) return;

  bs.write(d.target, 1);
  bs.write(d.player, 1);
  if(d.player) return;

  bs.write(d.box, 1);
});

game.setImportFunc(bs => {
  var tile = [0, 0, 0, 0];

  tile[3] = bs.read(1);
  if(tile[3]) return tile;

  tile[2] = bs.read(1);
  tile[0] = bs.read(1);
  if(tile[0]) return tile;

  tile[1] = bs.read(1);
  return tile;
});

game.setLoadFunc((w, h) => {
  boxesNum = 0;
  placedNum = 0;

  game.iterate((x, y, d) => {
    if(d.player){
      player.x = x;
      player.y = y;
      return;
    }

    if(d.box){
      boxesNum++;
      if(d.target) placedNum++;
    }
  });
});

game.addKeyboardListener(code => {
  switch(code){
    case 'ArrowUp': move(0); break;
    case 'ArrowLeft': move(1); break;
    case 'ArrowDown': move(2); break;
    case 'ArrowRight': move(3); break;
  }
});

return game;

function move(dir, playing = true){
  var dx = dir == 1 ? -1 : dir == 3 ? 1 : 0;
  var dy = dir == 0 ? -1 : dir == 2 ? 1 : 0;

  var {x, y} = player;
  var x1 = x, y1 = y;

  var d1 = game.get(x, y);
  var d2 = game.get(x + dx, y + dy);
  var d3 = game.get(x + dx * 2, y + dy * 2);

  if(d2 === null || d2.wall) return;
  if(d2.box && (d3 === null || d3.box || d3.wall)) return;

  x += dx;
  y += dy;

  d1.player = 0;
  d2.player = 1;

  if(!playing){
    d1.visited = 1;
    d2.visited = 1;
  }

  if(d2.box){
    d2.box = 0;
    d3.box = 1;

    if(playing){
      updatePlacedNum(d3.target - d2.target);
      game.update(x1 + dx * 2, y1 + dy * 2);
    }else{
      d3.visited = 1;
    }
  }

  if(playing){
    game.update(x1, y1);
    game.update(x1 + dx, y1 + dy);
  }

  player.x = x;
  player.y = y;
}

function updatePlacedNum(diff){
  if(!diff) return;
  placedNum += diff;

  if(placedNum == boxesNum){
    window.setTimeout(game.onSolved.bind(game));
  }
}

function getCol(d){
  return d.wall ? cols.wall : d.target ? cols.target : cols.empty
}