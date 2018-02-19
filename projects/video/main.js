'use strict';

var format = 'mp4';
var videoFile = `/projects/${O.project}/1.${format}`;

var video = null;
var source = null;
var loaded = false;
var playing = false;

addEventListener('keydown', evt => {
  if(!loaded) return;

  switch(evt.key){
    case ' ':
      if(playing) video.pause();
      else video.play();
      playing = !playing;
      break;

    case 'F5':
      evt.preventDefault();
      if(playing) video.pause();
      loaded = false;
      playing = false;
      source.src = O.urlTime(videoFile);
      video.load();
      break;
  }
});

main();

function main(){
  O.body.style.margin = '0px';
  O.body.style.backgroundColor = 'black';
  O.body.style.overflow = 'hidden';

  video = O.ce(O.body, 'video');
  video.style.position = 'absolute';
  video.style.top = '50%';
  video.style.left = '50%';
  video.style.transform = 'translate(-50%, -50%)';
  video.loop = true;
  video.addEventListener('canplay', () => { loaded = true; });
  
  source = O.ce(video, 'source');
  source.src = O.urlTime(videoFile);
}