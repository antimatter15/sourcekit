define('sourcekit/editor', 
        ['sourcekit/fileutil',
        'sourcekit/notification',
        'sourcekit/editor/file_mode_mapping',
        
        'ace/editor',
        'ace/edit_session',
        'ace/undomanager',
        'ace/virtual_renderer', 
        
        'ace/theme/twilight',
        'ace/theme/clouds',
        'ace/theme/clouds_midnight',
        'ace/theme/cobalt',
        'ace/theme/dawn',
        'ace/theme/eclipse',
        'ace/theme/idle_fingers',
        'ace/theme/kr_theme',
        'ace/theme/mono_industrial',
        'ace/theme/monokai',
        'ace/theme/pastel_on_dark',
        'ace/theme/textmate',
        
        'ace/keyboard/keybinding/vim',
        'ace/keyboard/keybinding/emacs',
        
        'ace/mode/c_cpp',
        'ace/mode/css',
        'ace/mode/html',
        'ace/mode/java',
        'ace/mode/javascript',
        'ace/mode/php',
        'ace/mode/python',
        'ace/mode/ruby',
        'ace/mode/text',
        'ace/mode/xml',
        'ace/mode/coffee',
        ], 
        function(FileUtil, Notification, FileModeMapping) {

dojo.require("dijit.layout.ContentPane");
dojo.require("dijit.layout.TabContainer");
dojo.require("dijit.form.Select");
dojo.require("dijit.Toolbar");

var AceEditor = require("ace/editor").Editor;
var AceEditSession = require("ace/edit_session").EditSession;
var AceUndoManager = require("ace/undomanager").UndoManager;

var Renderer = require("ace/virtual_renderer").VirtualRenderer;
var theme = require("ace/theme/twilight");
var blankSession = new AceEditSession("");



var Editor = function(dropbox, editorEnv) {
    this.dropbox = dropbox;
    this.sessions = {};
    dojo.addOnLoad(this.setupInterface.bind(this));
    
};

Editor.prototype.setupInterface = function() {
    this.introContainer = dojo.byId("introContainer");
    
    var theme = require("ace/theme/twilight");
    this.editorContainer = dojo.byId("editorContainer");
    this.editor = new AceEditor(new Renderer(this.editorContainer, theme));

    dojo.connect(window, "onresize", this.resize.bind(this));
    
    dojo.connect(window, "onkeydown", (function(keyEvent) {
        if (keyEvent.keyCode == 83 && (keyEvent.metaKey || keyEvent.ctrlKey)) {
            
            this.saveCurrentFile();
            dojo.stopEvent(keyEvent);
        }
    }).bind(this));
}

// Commands (called by application code)
Editor.prototype.openFile = function(item) {
    // TODO ADD WELCOME PAGE 
    this.introContainer.style.display = "none";
    
    if(item.bytes > 1024 * 1024 && !confirm("This file is "+item.size+", are you sure you want to open it?")){
      return;
    }
    if (this.tabContainer == null) {
        this.tabContainer = new dijit.layout.TabContainer({
           id: "editorTabContainer",
           style: "height: 100%; width: 100%; padding: 0; border: none;"
        });
        
        dojo.connect(this.tabContainer, "selectChild", this.selectTab.bind(this));
        dojo.connect(this.tabContainer, "removeChild", this.closeTab.bind(this));
        
        dojo.body().appendChild(dojo.byId("introContainer"));
        dijit.byId("borderCenter").setContent(this.tabContainer);
    }
    
    this.tabContainer.domNode.style.display = "block";
    
    var id = FileUtil.uniqueIdByPath(item.path);
    
    if (!this.sessions[id]) {
        this.editor.setSession(blankSession);
        
        // Load the content
        this.dropbox.getFileContents(item.path, (function(data) {
            var extension = FileUtil.fileExtension(item.path);
            var Mode = null;
            if (extension != null) {
                var Mode = require('ace/mode/' + FileModeMapping.findMode(extension)).Mode;
            }
            
            if (Mode != null) {
                this.sessions[id] = new AceEditSession(data, new Mode());
            } else {
                this.sessions[id] = new AceEditSession(data);
            }
            this.sessions[id].setUndoManager(new AceUndoManager());
            this.sessions[id].path = item.path;
            this.editor.setSession(this.sessions[id]);
        }).bind(this));

        // Deal with the UI
        var editorContentPane = new dijit.layout.ContentPane({
            title: FileUtil.basename(item.path),
            content: "",
            closable: true,
            id: id
        });
        
        // Create Toolbar
        var editorToolbar = new dijit.Toolbar({
            id: id + "_toolbar"
        });
        
        // Save Button
        var saveButton = new dijit.form.Button({
            label: "Save",
            showLabel: true,
            iconClass: "dijitIconSave",
            onClick: this.saveCurrentFile.bind(this)
        });
        
        editorToolbar.addChild(saveButton);
        
        // Open Button
        var openButton = new dijit.form.Button({
            label: "Open in browser",
            showLabel: true,
            iconClass: "dijitIconApplication",
            onClick: (function(){
              var currentSession = this.sessions[this.tabContainer.selectedChildWidget.id];
              var content = currentSession.toString();
              var bb = new BlobBuilder();
              bb.append(content);
              var file = bb.getBlob('text/html'), url = '';
              if(window.createObjectURL){
                url = window.createObjectURL(file)
              }else if(window.createBlobURL){
                url = window.createBlobURL(file)
              }else if(window.URL && window.URL.createObjectURL){
                url = window.URL.createObjectURL(file)
              }else if(window.webkitURL && window.webkitURL.createObjectURL){
                url = window.webkitURL.createObjectURL(file)
              }
              
              console.log(url);
              window.open(url);
            }).bind(this)
        });
        
        editorToolbar.addChild(openButton);
        
        
        // Handle file type autodetection
        var extension = FileUtil.fileExtension(item.path);
        var defaultMode = FileModeMapping.findMode(extension);
        
        // Add Syntax Highlighting Dropdown Menu
        var modeSelect = new dijit.form.Select({
            options: FileModeMapping.findAllLabels(defaultMode),
            onChange: (function(newValue) {
                var Mode = require('ace/mode/' + newValue).Mode;
                this.editor.getSession().setMode(new Mode());
            }).bind(this)
            
        });
        
        editorToolbar.addChild(modeSelect);
        
        // Add Theme Select Dropdown Menu
        var themeSelect = new dijit.form.Select({
            options: [
              {label: 'Twilight', value: 'twilight'},
              {label: 'TextMate', value: 'textmate'},
              {label: 'Eclipse', value: 'eclipse'},
              {label: 'idleFingers', value: 'idle_fingers'},
              {label: 'Dawn', value: 'dawn'},
              {label: 'Pastel on dark', value: 'pastel_on_dark'},
              {label: 'Clouds', value: 'clouds'},
              {label: 'Midnight clouds', value: 'clouds_midnight'},
              {label: 'Cobalt', value: 'cobalt'},
              {label: 'Mono Industrial', value: 'mono_industrial'},
              {label: 'Monokai', value: 'monokai'},
            ],
            onChange: (function(newValue) {
                this.editor.setTheme('ace/theme/' + newValue);
                localStorage.theme = newValue;
            }).bind(this)
        });
        
        themeSelect.setValue(localStorage.theme || 'twilight')
        
        editorToolbar.addChild(themeSelect);
        
        // Add Keybinding Select Dropdown Menu
        var bindingSelect = new dijit.form.Select({
            options: [
              {label: 'Normal', value: 'ace'},
              {label: 'Vim', value: 'vim'},
              {label: 'Emacs', value: 'emacs'},
            ],
            onChange: (function(newValue) {
              var keybindings = {
                ace: null,
                vim: require("ace/keyboard/keybinding/vim").Vim,
                emacs: require("ace/keyboard/keybinding/emacs").Emacs
              };
              this.editor.setKeyboardHandler(keybindings[newValue]);
              localStorage.keybinding = newValue;
            }).bind(this)
        });
        
        bindingSelect.setValue(localStorage.theme || 'ace')
        
        editorToolbar.addChild(bindingSelect);
        
        editorContentPane.domNode.appendChild(editorToolbar.domNode);

        this.tabContainer.addChild(editorContentPane);
        this.tabContainer.selectChild(editorContentPane, true);
    } else {
        this.tabContainer.selectChild(id, true);
    }
}

Editor.prototype.saveCurrentFile = function() {
    var currentSession = this.sessions[this.tabContainer.selectedChildWidget.id];
    if (currentSession) {
        var path = currentSession.path;
        var content = currentSession.toString();
    
        this.dropbox.putFileContents(path, content, (function() {
            Notification.notify('/resources/images/check.png', 'SourceKit Notification', 'File Saved!');
        }).bind(this));
    }
}

Editor.prototype.resize = function(event) {
    contentBox = dojo.contentBox(this.editorContainer.parentNode);
    
    if (dojo.byId(this.editorContainer.parentNode.id + "_toolbar")) {
        toolbarMarginBox = dojo.marginBox(dojo.byId(this.editorContainer.parentNode.id + "_toolbar"));
        contentBox.h = contentBox.h - toolbarMarginBox.h;
        dojo.contentBox(this.editorContainer, contentBox);
        this.editor.resize();
    }
}

Editor.prototype.selectTab = function(tab) {
    this.editorContainer.style.display = "block";
    
    if (typeof tab == 'string') {
        tab = dijit.byId(tab);
    }
    
    if (this.sessions[tab.id]) {
        this.editor.setSession(this.sessions[tab.id]);
    }
    
    dojo.connect(tab, "resize", this.resize.bind(this));
    tab.domNode.appendChild(this.editorContainer);
    this.tabContainer.resize();
    this.editor.focus();
}

Editor.prototype.closeTab = function(tab) {
    if (typeof tab == 'string') {
        tab = dijit.byId(tab);
    }
    
    if (this.sessions[tab.id]) {
        delete this.sessions[tab.id];
    }
    
    if (this.tabContainer.getChildren().length > 0) {
        var index = this.tabContainer.forward();
    } else {
        dojo.body().appendChild(this.editorContainer);
        this.tabContainer.destroy(false);
        this.tabContainer = null;
        this.introContainer.style.display = "block";
        dijit.byId("borderCenter").set('content', this.introContainer);
        this.editorContainer.style.display = "none";
    }
}

return Editor;

});
