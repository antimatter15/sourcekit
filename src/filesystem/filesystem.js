define("filesystem/filesystem", ["dropbox/dropbox"], function(Dropbox) {
  //this hacks dropbox and proxies it with magic offline powers
  return function(key, secret){
    var db = Dropbox(key, secret);

    /*
      TODO: use filesystem API, but that requires the unlimitedStorage permission.
      For now, localStorage should suffice.
    */
    
    function getFileHash(){
      var hash = {};
      for(var i = 0; i < localStorage.length; i++){
        var key = localStorage.key(i);
        if(key.indexOf('_file_') == 0){
          var part = key.substr(6);
          var ts = part.match(/^\d+/)[0];
          var path = part.substr(ts.length + 3);
          ts = parseInt(ts, 10);
          hash[path] = {key: key, time: ts};
        }
      }
      return hash;
    }
    
    var failsafe = [];
    var old_getDirectoryContents = db.getDirectoryContents;
    db.getDirectoryContents = function(path, callback){
      failsafe.push(function(){
        console.log('dir contents', path);
        var files = [];
        var hash = getFileHash();
        var directories = [];
        for(var i in hash){
          var data = localStorage.getItem(hash[i].key);
          var date = new Date();
          date.setTime(hash[i].time);
          if(i.indexOf(path) == 0){
            var x2 = i.substr(path.length).replace(/^\/+/,'');
            //console.log('_',x2);
            if(x2.indexOf('/') != -1){
              var dirpath = x2.split('/')[0];
              if(directories.indexOf(dirpath) == -1){
                directories.push(dirpath);
                //console.log('/'+(path+'/'+dirpath).replace(/^\/+/,''));
                files.push({"revision": 1337, 
                      "thumb_exists": false, 
                      "bytes": 0, 
                      "path": '/'+(path+'/'+dirpath).replace(/^\/+/,''), 
                      "is_dir": true
                      })
              }
            }else{
              files.push({"revision": 1337, 
                      "thumb_exists": false, 
                      "bytes": data.length, 
                      "modified": date.toString(), 
                      "path": i, 
                      "is_dir": false, 
                      "icon": "page_white", 
                      "mime_type": "application/octet-stream", 
                      "size": data.length+"B"
                      })
            }
          }
        }
        callback({
          is_dir: true,
          path: "",
          contents: files
        })
      })
      old_getDirectoryContents.call(this, path, callback);
    }
    
    var old_getFileContents = db.getFileContents;
    db.getFileContents = function(path, callback){
      failsafe.push(function(){
        //callback(localStorage.getItem('_file_' + (+new Date) + '___'+  path));
        callback(localStorage.getItem(getFileHash()[path].key))
      });
      if(localStorage.getItem('_edited_'+path) && confirm("The file '"+path+"' appears to have been edited while offline, would you like to load the offline version? Otherwise the locally cached version of the file will be LOST.")){
        return failsafe.pop()();
      }
      old_getFileContents.call(this, path, function(data){
        localStorage.setItem('_file_' + (+new Date) + '___'+  path, data);
        callback(data);
      });
    }
    
    var old_putFileContents = db.putFileContents;
    db.putFileContents = function(path, content, callback){
      localStorage.setItem('_file_' + (+new Date) + '___'+ path, content);
      failsafe.push(function(){
        localStorage.setItem('_edited_'+path, +new Date);
      }); //do nothing.
      localStorage.removeItem('_edited_'+path);
      old_putFileContents.call(this, path, content, callback);
    }
    
    db.errorHandler = function(data){
      console.log('Using Offline Fallback',data);
      document.body.style.backgroundColor = '#ffdddd'; //this is a sort of subtle offline indication
      
      var fs = failsafe.pop();
      fs && fs();
    }
    return db;
  }
})
