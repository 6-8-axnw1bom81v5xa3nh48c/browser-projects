'use strict';

var format = 'png';
var imageFile = `/projects/${O.project}/1.${format}`;

var image = null;
var loaded = false;

addEventListener('keydown', evt => {
  if(!loaded) return;

  switch(evt.key){
    case 'F5':
      evt.preventDefault();
      loaded = false;
      image.src = O.urlTime(imageFile);
      break;
  }
});

main();

function main(){
  O.body.style.margin = '0px';
  O.body.style.backgroundColor = 'black';
  O.body.style.overflow = 'hidden';

  image = O.ce(O.body, 'img');
  image.style.position = 'absolute';
  image.style.top = '50%';
  image.style.left = '50%';
  image.style.transform = 'translate(-50%, -50%)';
  image.addEventListener('load', () => { loaded = true; });
  image.src = O.urlTime(imageFile);
}