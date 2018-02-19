'use strict';

const MAX_GRID_SIZE = 1000;

window.setTimeout(main);

function main(){
  var game = O.urlParam('game');
  if(game === null){
    loadGamesList();
  }else{
    loadGame(game);
  }
}

function loadGamesList(){
  O.rfLocal('games.txt', (status, data) => {
    if(status !== 200) return O.error('Cannot load games list.');
    displayGamesList(O.sanl(data));
  });
}

function displayGamesList(list){
  O.title('Games');

  list.forEach((game, index) => {
    if(index) O.ceBr(O.body);
    O.ceLink(O.body, O.projectToName(game), generateUrlForGame(game));
  });
}

function generateUrlForGame(game){
  return `/?project=${O.project}&game=${game}`;
}

function loadGame(game){
  O.rfLocal(`${game}.js`, (status, data) => {
    if(status !== 200) return O.error('Cannot load game script.');
    executeGameScript(data);
  });
}

function executeGameScript(script){
  var func = new Function('O', 'Game', script);
  var game = func(O, Game);

  game.init();
}

class Game extends O.TilesGrid{
  constructor(){
    super();

    this.genFunc = O.nop;
    this.drawFunc = O.nop;
    this.exportFunc = O.nop;
    this.importFunc = O.nop;
    this.loadFunc = O.nop;

    this.menuVisible = false;
    this.levelIndex = null;

    this.createMenu();
  }

  init(){
    this.addEventListeners();

    if(this.genFunc !== O.nop){
      this.generate();
    }else{
      this.loadLevelIndex(1);
    }
  }

  setGenFunc(func){
    this.genFunc = func;
  }

  setDrawFunc(func){
    this.drawFunc = func;
  }

  setExportFunc(func){
    this.exportFunc = func;
  }

  setImportFunc(func){
    this.importFunc = func;
  }

  setLoadFunc(func){
    this.loadFunc = func;
  }

  generate(){
    if(this.genFunc === O.nop){
      return this.error('Not implemented.');
    }

    this.levelIndex = null;
    this.genFunc();
    
    this.setSize(32);
    this.draw();
  }

  update(x, y){
    this.drawTile(x, y);
  }

  export(){
    var bs = new O.BitStream();

    var max = MAX_GRID_SIZE - 1;
    bs.write(this.w - 1, max);
    bs.write(this.h - 1, max);

    this.iterate((x, y, d) => {
      this.exportFunc(bs, d);
    });

    bs.pack();
    var str = bs.stringify(true);
    
    this.textArea.value = str;
  }

  import(){
    var str = this.textArea.value;
    var arr = (str.match(/[0-9A-F]{2}/g) || []).map(a => parseInt(a, 16));
    var bs = new O.BitStream(arr, true);

    if(!arr.length || bs.error){
      return this.error('Unrecognized level format.');
    }

    var max = MAX_GRID_SIZE - 1;
    var w = bs.read(max) + 1;
    var h = bs.read(max) + 1;
    this.setWH(w, h);

    this.create((x, y) => {
      return this.importFunc(bs);
    });

    this.loadFunc(this.w, this.h);
    this.draw();

    if(this.menuVisible){
      this.toggleMenu();
    }
  }

  loadLevel(){
    if(!this.levels){
      this.loadLevels(this.loadLevel.bind(this));
      return;
    }

    var level = this.textArea.value | 0;
    if(level < 1 || level > this.levels.length){
      return this.error(`Level number cannot be less than 1 or greater than ${this.levels.length}.`);
    }

    this.levelIndex = level;
    this.textArea.value = this.levels[level - 1];
    this.import();
  }

  loadLevelIndex(index){
    this.textArea.value = `${index}`;
    this.loadLevel();
  }

  loadLevels(cb = O.nop){
    O.rfLocal(`levels/${O.urlParam('game')}.txt`, (status, data) => {
      if(status !== 200) return O.error('Cannot load level.');

      this.levels = data.split`-`;

      cb();
    });
  }

  createMenu(){
    var menuElem = O.ce(O.body, 'div');
    menuElem.style.margin = '8px';
    menuElem.style.display = 'none';

    var title = O.ce(menuElem, 'h1');
    O.ceText(title, 'Main Menu');

    [
      ['Export level', this.export.bind(this)],
      ['Import level', this.import.bind(this)],
      ['Load level', this.loadLevel.bind(this)],
    ].forEach(([option, func], index) => {
      if(index) O.ceBr(menuElem);

      var link = O.ceLink(menuElem, option, 'javascript:void(0)');
      link.addEventListener('click', func);
    });

    O.ceBr(menuElem, 2);

    var textArea = O.ce(menuElem, 'textarea');
    textArea.style.width = '75%';
    textArea.style.height = '300px';

    this.canvas = this.g.g.canvas;
    this.menuElem = menuElem;
    this.textArea = textArea;
  }

  toggleMenu(exportLevel = true){
    this.menuVisible = !this.menuVisible;

    if(this.menuVisible){
      if(exportLevel){
        this.export();
      }

      this.canvas.style.display = 'none';
      this.menuElem.style.display = 'block';
    }else{
      this.canvas.style.display = 'block';
      this.menuElem.style.display = 'none';
    }
  }

  addEventListeners(){
    window.addEventListener('resize', () => {
      this.resize();
      this.draw();
    });
  }

  addKeyboardListener(func){
    window.addEventListener('keydown', evt => {
      var code = evt.code;

      if(code == 'Escape'){
        this.toggleMenu();
        return;
      }

      if(/^F\d+$/.test(code)){
        evt.preventDefault();

        switch(code.substring(1) | 0){
          case 2:
            this.generate(this.w, this.h);
            break;

          case 3:
            this.import();
            break;

          case 5:
            window.location.reload();
            break;
        }

        return;
      }

      if(!this.menuVisible){
        func(evt.code);
      }
    });
  }

  onSolved(obj = {}){
    var keys = Object.keys(obj);

    var str = keys.map(key => {
      return `${key}: ${obj[key]}`;
    }).join`\n`;

    if(str) str = `\n\n${str}`;
    str = `Solved!${str}`;

    if(this.levelIndex === null){
      this.generate(this.w, this.h);
      return;
    }

    if(this.levelIndex < this.levels.length){
      this.loadLevelIndex(this.levelIndex + 1);
    }else{
      this.textArea.value = str;
      this.toggleMenu(false);
    }
  }

  error(msg){
    alert(`ERROR: ${msg}`);
  }
};