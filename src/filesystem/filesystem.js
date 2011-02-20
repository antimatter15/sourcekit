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
    
    var failsafe = function(){};
    var old_getDirectoryContents = db.getDirectoryContents;
    db.getDirectoryContents = function(path, callback){
      failsafe = function(){
        var files = [];
        var hash = getFileHash();
        for(var i in hash){
          var data = localStorage.getItem(hash[i].key);
          var date = new Date();
          date.setTime(hash[i].time);
          
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
        callback({
          is_dir: true,
          path: "",
          contents: files
        })
      }
      old_getDirectoryContents.call(this, path, callback);
    }
    
    var old_getFileContents = db.getFileContents;
    db.getFileContents = function(path, callback){
      failsafe = function(){
        //callback(localStorage.getItem('_file_' + (+new Date) + '___'+  path));
        callback(localStorage.getItem(getFileHash()[path].key))
      };
      if(localStorage.getItem('_edited_'+path) && confirm("The file '"+path+"' appears to have been edited while offline, would you like to load the offline version? Otherwise the locally cached version of the file will be LOST.")){
        return failsafe();
      }
      old_getFileContents.call(this, path, function(data){
        localStorage.setItem('_file_' + (+new Date) + '___'+  path, data);
        callback(data);
      });
    }
    
    var old_putFileContents = db.putFileContents;
    db.putFileContents = function(path, content, callback){
      localStorage.setItem('_file_' + (+new Date) + '___'+ path, content);
      failsafe = function(){
        localStorage.setItem('_edited_'+path, +new Date);
      }; //do nothing.
      localStorage.removeItem('_edited_'+path);
      old_putFileContents.call(this, path, content, callback);
    }
    
    db.errorHandler = function(data){
      console.log('woot an awesome errurh');
      document.body.style.backgroundColor = '#ffdddd'; //this is a sort of subtle offline indication
      failsafe(); 
      failsafe = function(){};
    }
    return db;
  }
})
