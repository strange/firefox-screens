var screens = {
    // Display the settings dialog.
    settingsDialog: function() {
        var ww = Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
                           .getService(Components.interfaces.nsIWindowWatcher);
        var win = ww.openWindow(null, "chrome://screens/content/dialog.xul",
                                "screens-settings",
                                "chrome,centerscreen,modal", null);
    },
    
    // Initialize the settings dialog.
    initSettingsDialog: function() {
        var dirPath = document.getElementById('path-to-user-defined');
        var dir = screens.getUserDefinedDir();
        if (dir)
            dirPath.value = dir.target;

        if (screens.useUserDefinedDir())
            screens.enableUserDefined();
        else {
            screens.enableDefault();
        }
    },
    
    // Mark the userdefined dir option as being the currently selected item
    // and enable it in the settings. This is ok even if the dir hasn't yet
    // been selected since we'll always check if the directory we're saving to
    // exists or not anyway.
    enableUserDefined: function() {
        screens.enableUserDefinedDir();
        document.getElementById('image-storage-preferences').selectedIndex = 0;
        document.getElementById('path-to-user-defined').disabled = false;
    },
    
    // Enable the use of the default Firefox download directory.
    enableDefault: function() {
        screens.disableUserDefinedDir();
        document.getElementById('image-storage-preferences').selectedIndex = 1;
        document.getElementById('path-to-user-defined').disabled = true;        
    },
    
    // Display a file-picker dialog that allows the user to select a custom
    // directory to save images to.
    selectDir: function() {
        var fp = Components.classes["@mozilla.org/filepicker;1"]
                           .createInstance(Components.interfaces.nsIFilePicker);
        fp.init(window, "Select a directory",
                Components.interfaces.nsIFilePicker.modeGetFolder);
    
        var rv = fp.show();
        if (rv == Components.interfaces.nsIFilePicker.returnOK) {
            var element = document.getElementById('path-to-user-defined');
            element.value = fp.file.target;
            screens.setUserDefinedDir(fp.file);
            screens.enableUserDefined();
        }
    },
    
    // Determine whether we should use the userdefined directory or not.
    useUserDefinedDir: function() {
        var dir = screens.getUserDefinedDir();
        var use = false;
        if (dir) {
            var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                                  .getService(Components.interfaces.nsIPrefService);
            use = prefs.getBoolPref("extensions.screens.useDirectory");
        }
        return use;
    },
    
    // Get the userdefined directory. Will return null if no valid directory
    // has been set.
    getUserDefinedDir: function() {
        var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                              .getService(Components.interfaces.nsIPrefService);
        try {
            var dir = prefs.getComplexValue("extensions.screens.directory",
                                            Components.interfaces.nsILocalFile);            
        } catch(e) {
            dir = null;
        }
        
        if (!dir || (dir && !dir.exists())) {
            dir = null;
        }
        
        return dir;
    },
    
    // Store the userdefined directory in prefs.
    setUserDefinedDir: function(dir) {
        if (!dir || (dir && !dir.exists())) {
            dir = null;
        } else {
            var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                                  .getService(Components.interfaces.nsIPrefService);
            prefs.setComplexValue("extensions.screens.directory",
                                  Components.interfaces.nsILocalFile, dir);
        }
    },
    
    // Enable use of a userdefined directory.
    enableUserDefinedDir: function(dir) {
        var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                              .getService(Components.interfaces.nsIPrefService);
        prefs.setBoolPref("extensions.screens.useDirectory", true);        
    },
    
    // Disable use of a userdefined directory.
    disableUserDefinedDir: function(dir) {
        var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                              .getService(Components.interfaces.nsIPrefService);
        prefs.setBoolPref("extensions.screens.useDirectory", false);
    },
    
    // Test if userdefined directory has been set and if the setting is
    // enabled. If it is, return the userdefined directory, otherwise default
    // to the Firefox download directory.
    getDownloadDir: function() {
        var dir = null;
        if (this.useUserDefinedDir()) {
            dir = this.getUserDefinedDir();
        } else {
            var dnldMgr = Components.classes["@mozilla.org/download-manager;1"]
                                    .getService(Components.interfaces.nsIDownloadManager);
            dir = dnldMgr.userDownloadsDirectory;
        }
        return dir;
    },
    
    // Strip stuff.
    xstrip: function(s) {
        var index = s.indexOf("#")
        if (s.indexOf("http") == 0 && index !== -1)
            s = s.substr(0, index);
        else
            s = s.replace('#', '');
        s = s.replace(/http[s]{0,1}:\/\//, '').replace('/', '.').replace(':', '.');
        return s;
    },
    
    // Copy the current window to a canvas, assemble a save-location and save
    // the canvas to a png.
	capture: function() {
	    try {
    	    canvas = screens.drawCanvas(content);
            var saveTo = this.getDownloadDir();
            var filename = screens.xstrip(content.document.title) + '(' + screens.xstrip(content.document.URL) + ').png';
            saveTo.append(filename);
            screens.saveToDisk(canvas, saveTo);
	    } catch(e) {
	        // Nice and ubiquotous error message.
	        alert('Could not take screenshot or save to directory: ' + e)
	    } finally {
	        canvas = null;
	    }
	},
	
	// Return a canvas containing the contents of current document.
	drawCanvas: function(content) {
	    // Get width and height
	    var canvas = null;
        try {
	        var width = content.document.documentElement.offsetWidth;
            var height = content.document.documentElement.offsetHeight;
            
		
    	    // Create a canvas
            canvas = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
            canvas.style.width = width + "px";
            canvas.style.height = height + "px";
            canvas.setAttribute('width', width);
            canvas.setAttribute('height', height);
        
            var context = canvas.getContext("2d");
        
            // Draw stuff
    		context.drawWindow(content, 0, 0, width, height, "rgb(255,255,255)");
    		
		} catch (error) {
            // alert(error);
		}
		return canvas;
	},
	
	// Save canvas to file.
	saveToDisk: function(canvas, file) {
        file = screens.uniqueFile(file);

        // create a data url from the canvas and then create URIs of the source  
        var io = Components.classes["@mozilla.org/network/io-service;1"]
                         .getService(Components.interfaces.nsIIOService);
        var source = io.newURI(canvas.toDataURL("image/png", ""), "UTF8", null);

        // prepare to save the canvas data
        var persist = Components.classes["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"]
                              .createInstance(Components.interfaces.nsIWebBrowserPersist);

        // persist.persistFlags = Components.interfaces.nsIWebBrowserPersist.PERSIST_FLAGS_REPLACE_EXISTING_FILES;
        persist.persistFlags = Components.interfaces.nsIWebBrowserPersist.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION;

        // save the canvas data to the file
        persist.saveURI(source, null, null, null, null, file);
	},
	
	// Make sure that file is unique. Keep a counter in the filename.
	uniqueFile: function(aLocalFile) {
        while (aLocalFile.exists()) {
            parts = /(-\d+)?(\.[^.]+)?$/.test(aLocalFile.leafName);
            aLocalFile.leafName = RegExp.leftContext + (RegExp.$1 - 1) + RegExp.$2;
        }
        return aLocalFile;
    }
};
