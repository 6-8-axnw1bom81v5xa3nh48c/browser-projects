'use strict';

window.setTimeout(main);

const MAX_INPUT_LENGTH = 50;

var {w, h, g} = O.ceCanvas(1);
var [wh, hh] = [w, h].map(a => a >> 1);

var developmentMode = true;
var fontSize = 24;
var passwordChar = '*';

var cols = {
  bg: '#272822',
  text: '#a9a9a9',
  error: '#f8331d',
};

function main(){
  O.body.style.backgroundColor = cols.bg;
  addEventListeners();

  getScript('main', func => {
    func(O);
  });
}

function addEventListeners(){
  O.ael('contextmenu', evt => {
    preventDefault(evt);
  });

  O.ael('keydown', evt => {
    if(evt.ctrlKey){
      preventDefault(evt);
      return;
    }

    if(/^F\d+$/.test(evt.code)){
      preventDefault(evt);
      return;
    }
  });
}

function getScript(scr, cb = O.nop){
  var failed = false;

  getPassword();

  function getPassword(){
    askForPassword(failed, password => {
      loadScript(scr, password, (err, func) => {
        if(err){
          failed = true;
          getPassword();
        }else{
          cb(func);
        }
      });
    });
  }
}

function askForPassword(failed, cb = O.nop){
  var password = '';

  var onKeyDown = evt => {
    if(evt.ctrlKey){
      preventDefault(evt);
      return;
    }

    if(evt.key.length === 1){
      var char = evt.key;
      appendChar(char);
      return;
    }

    switch(evt.code){
      case 'Backspace':
        removeLastChar();
        break;

      case 'Enter':
        O.rel('keydown', onKeyDown);
        cb(password);
        break;
    }
  };

  O.ael('keydown', onKeyDown);

  render();

  function render(){
    g.clearCanvas(cols.bg);

    g.translate(wh, hh);
    g.scale(fontSize);
    g.font(fontSize);

    g.fillStyle = cols.text;
    g.fillText('Enter password:', 0, -2);

    g.fillStyle = cols.text;
    g.fillText(passwordChar.repeat(password.length), 0, 0);

    if(failed){
      g.fillStyle = cols.error;
      g.fillText('Wrong password. Try again.', 0, 2);
    }
  }

  function appendChar(char){
    if(password.length < MAX_INPUT_LENGTH){
      password += char;
      render();
    }
  }

  function removeLastChar(){
    if(password.length){
      password = password.substring(0, password.length - 1);
      render();
    }
  }
}

function loadScript(file, password, cb = O.nop){
  loadFile('scripts', file, password, (err, data) => {
    if(err) return cb(err);

    var src = data.toString();
    var func = new Function('O', src);

    cb(null, func);
  });
}

function loadFile(dir, file, password, cb = O.nop){
  O.rfLocal(`${dir}/${file}.js`, true, (status, data) => {
    if(status !== 200) return O.error('Cannot load script.');

    var decrypted = decrypt(data, password);
    if(decrypted === null) return cb(1);

    cb(null, decrypted);
  });
}

function decrypt(buff, password){
  buff = O.Buffer.from(buff);

  var len = 32;
  var index = 0;

  var seed = O.Buffer.from(password);
  var hashBuff = computeHash(seed);

  updateHashBuff();

  buff = buff.map(a => a ^ getByte());

  var checksum = buff.slice(buff.length - len);
  buff = buff.slice(0, buff.length - len);

  var isValid = computeHash(buff).every((byte, index) => {
    return checksum[index] === byte;
  });

  if(!isValid) return null;

  return new O.Buffer(buff);

  function getByte(){
    if(index == len){
      updateHashBuff();
      index = 0;
    }

    return hashBuff[index++];
  }

  function updateHashBuff(){
    hashBuff = computeHash(O.Buffer.concat([seed, hashBuff]));
  }

  function computeHash(buff){
    return O.sha256(buff);
  }
}

function preventDefault(evt){
  if(!developmentMode) O.pd(evt, true);
}