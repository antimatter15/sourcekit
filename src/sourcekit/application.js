define('sourcekit/application', ['filesystem/filesystem', 'sourcekit/editor', 'sourcekit/filelist'], function (Dropbox, Editor, FileList) {

dojo.require("dijit.layout.ContentPane");
dojo.require("dijit.layout.BorderContainer");

var consumerKey = "0660jgq6erg4h63";
var consumerSecret = "0iyu9q1lnb56jyg";
var dropbox = new Dropbox(consumerKey, consumerSecret);
var Application = {};

Application.start = function(editorEnv) {
    this.editorEnv = editorEnv;
    dropbox.authorize((function() {
        dojo.addOnLoad((function() {
            editor = new Editor(dropbox, this.editorEnv);
            window.fileList = new FileList(editor, dropbox);
        }).bind(this));
    }).bind(this));
    
  
    
    // if (!dropbox.isAccessGranted()) {
    //         chrome.tabs.getCurrent(function(tab) {
    //             chrome.tabs.create({ url: "resources/options.html", selected: true });
    //             chrome.tabs.remove(tab.id);
    //         });
    //     }
    //     
/*    dojo.addOnLoad((function() {
        editor = new Editor(dropbox, editorEnv);
        window.fileList = new FileList(editor, dropbox);
    }).bind(this)); */
};

return Application;

});

