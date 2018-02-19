(() => {
  'use strict';

  window.addEventListener('load', () => {
    var O = {
      doc: document,
      body: document.body,
      init(){
        O.rf('/framework.js', (status, script) => {
          if(status != 200) return O.fatalError('Cannot load framework script. Try clearing cache or restarting your browser.');
          new Function(script)();
        });
      },
      fatalError(msg){
        var h1 = O.doc.createElement('h1');
        var t = O.doc.createTextNode('Fatal Error');
        O.body.appendChild(h1);
        h1.appendChild(t);
        t = O.doc.createTextNode(msg);
        O.body.appendChild(t);
      },
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
      }
    };

    O.init();
  });
})()