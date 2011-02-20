define("sourcekit/filelist", 
        ["sourcekit/filelist/store", "sourcekit/notification"], 
        function(FileListStore, Notification) {

dojo.require("dijit.Tree");
dojo.require("dijit.form.Button");
dojo.require("dijit.form.DropDownButton");
dojo.require("dijit.Dialog");
dojo.require("dijit.TooltipDialog");
dojo.require("dijit.Toolbar");
dojo.require("dijit.MenuBar");
dojo.require("dijit.Menu");
dojo.require("dijit.MenuItem");

var FileList = function(editor, dropbox) {
    this.dropbox = dropbox;
    this.editor = editor;
    this.fileNodeInContext = null;
    
    dojo.addOnLoad(this.setupInterface.bind(this));
};

FileList.prototype.setupInterface = function() {
    this.store = new FileListStore(this.dropbox);
    
    this.treeModel = new dijit.tree.TreeStoreModel({
        store: this.store,
        root: { label: "Dropbox", path: '/', children: [] },
        childrenAttrs: ["children"],
        deferItemLoadingUntilExpand: true
    });

    // Set up the Tree view and hook up events
    this.fileListTree = new dijit.Tree({
        model: this.treeModel, 
        //showRoot: false,
        openOnClick: true
    }, "fileListTree");
    
    dojo.connect(this.fileListTree, "onClick", this, function(item, node, event) {
        this.editor.openFile(item);
    });
    
    this.fileListContextMenu = new dijit.Menu({
       targetNodeIds: ["fileListTree"]
    });
    
    // New File Context Menu and Dialog
    this.fileListContextMenu.addChild(new dijit.MenuItem({
        iconClass: "dijitEditorIcon dijitEditorIconNewPage",
        label: "New File...",
        onClick: (function() {
            this.newFileDialog.show();
        }).bind(this)
    }));
    this.newFileName = dijit.byId("newFileName");    
    this.newFileDialog = dijit.byId("newFileDialog");
    this.newFileDialogOkButton = dijit.byId("newFileDialogOkButton");

    dojo.connect(this.newFileDialogOkButton, "onClick", (function() {
        var parentItem = null;
            
        if (this.fileNodeInContext.item.is_dir) {
            parentItem = this.fileNodeInContext.item;
        } else if (this.fileNodeInContext.getParent() != null) {
            parentItem = this.fileNodeInContext.getParent().item;
        } else {
            parentItem = this.treeModel.root;
        }
            
        var item = { path: (parentItem.path + "/" + this.newFileName.get('value')).replace(/\/+/g, '/') };
        
        this.newFile(item, parentItem);
    }).bind(this));
    
    // New Folder Context Menu and Dialog
    this.fileListContextMenu.addChild(new dijit.MenuItem({
        iconClass: "dijitIconFolderClosed",
        label: "New Folder...",
        onClick: (function() {
            this.newFolderDialog.show();
        }).bind(this)
    }));
    this.newFolderName = dijit.byId("newFolderName");
    this.newFolderDialog = dijit.byId("newFolderDialog");
    this.newFolderDialogOkButton = dijit.byId("newFolderDialogOkButton");
    
    dojo.connect(this.newFolderDialogOkButton, "onClick", (function() {
        var parentItem = null;
            
        if (this.fileNodeInContext.item.is_dir) {
            parentItem = this.fileNodeInContext.item;
        } else if (this.fileNodeInContext.getParent() != null) {
            parentItem = this.fileNodeInContext.getParent().item;
        } else {
            parentItem = this.treeModel.root;
        }
            
        var item = { path: (parentItem.path + "/" + this.newFolderName.get('value')).replace(/\/+/g, '/'), is_dir: true, children: [] };
        
        this.newFolder(item, parentItem);
    }).bind(this));
    
    // Delete Context Menu and Dialog
    this.deleteConfirmationDialog = dijit.byId("deleteConfirmationDialog");
    this.deleteConfirmationOkButton = dijit.byId("deleteConfirmationOkButton");
    this.fileListContextMenu.addChild(new dijit.MenuItem({
        iconClass: "dijitIconDelete",
        label: "Delete",
        onClick: (function() {
            this.deleteConfirmationDialog.show();
        }).bind(this)
    }));
    dojo.connect(this.deleteConfirmationDialog, "onClick", (function() {
        this.deletePath(this.fileNodeInContext.item);
    }).bind(this));
    
    // Handle on open event of context menu to record the node being selected in FileListTree
    dojo.connect(this.fileListContextMenu, "_openMyself", this, function(e) {
        var tn = dijit.getEnclosingWidget(e.target);
        this.fileNodeInContext = tn;
    });
    
    // Set up notification
    dojo.connect(this.treeModel, "onNewItem", this, function(item, parentInfo) {
        this.fileListTree.set('selectedItem', item);
        Notification.notify('/resources/images/check.png', 'SourceKit Notification', 'New file created: ' + item.path);
    });
    
    dojo.connect(this.treeModel, "onDeleteItem", this, function(deletedItem) {
        Notification.notify('/resources/images/check.png', 'SourceKit Notification', 'Deleted: ' + deletedItem.path);
    });
}

FileList.prototype.newFile = function(item, parentItem) {
    this.treeModel.store.newItem(item, { parent: parentItem, attribute: 'children' });
}

FileList.prototype.newFolder = function(item, parentItem) {
    this.treeModel.store.newItem(item, { parent: parentItem, attribute: 'children' });
}

FileList.prototype.deletePath = function(item) {
    this.treeModel.store.deleteItem(item);
}

return FileList;

});
