'use strict';

var desktop;

window.setTimeout(main);

function main(){
  O.require('desktop', Desktop => {
    desktop = new Desktop();
    createLoadingScreen();
  });
}

function createLoadingScreen(){
  return initDesktop();

  var t = Date.now();

  render();

  function render(){
    var dt = (Date.now() - t) / 3e3;
    var amount = Math.min(dt, 1);

    desktop.showLoading(amount);

    if(dt < 1){
      O.raf(render);
    }else{
      setTimeout(initDesktop, 500);
    }
  }
}

function initDesktop(){
  desktop.init();
}