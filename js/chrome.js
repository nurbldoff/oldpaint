var ChromeApp = ChromeApp || {};

// Check if we have filesystem access
ChromeApp.check = function (e) {
    return (typeof chrome !== "undefined" && chrome.fileSystem);
};

ChromeApp.errorHandler = function (e) {
  console.error(e);
};

ChromeApp.displayPath = function (fileEntry) {
    chrome.fileSystem.getDisplayPath(fileEntry, function(path) {
        document.querySelector('#file_path').value = path;
    });
};

ChromeApp.readAsText = function (fileEntry, callback) {
    fileEntry.file(function(file) {
        var reader = new FileReader();
        reader.onerror = ChromeApp.errorHandler;
        reader.onload = function(e) {
            callback(e.target.result);
        };
        reader.readAsText(file);
    });
};

ChromeApp.readAsFiletype = function (fileEntry, callbacks) {
    fileEntry.file(function(file) {
        var reader = new FileReader(),
            ending = file.name.split(".").pop().toLowerCase();
        reader.onerror = ChromeApp.errorHandler;
        reader.onload = callbacks[ending];
        reader.readAsDataURL(file);
    });
};

ChromeApp.writeFileEntry = function (writableEntry, blob, callback) {
    if (!writableEntry) {
        console.log('Nothing selected.');
        return;
    }

    writableEntry.createWriter(function(writer) {
        var writeblob = function () {
            writer.onwriteend = null;
            writer.write(blob);
        };
        writer.onerror = ChromeApp.errorHandler;
        writer.onwriteend = writeblob;
        writer.truncate(0);  // if the file already exists, we need to empty it first
    }, ChromeApp.errorHandler);
};

ChromeApp.fileLoadChooser = function(callbacks) {
    // "type/*" mimetypes aren't respected. Explicitly use extensions for now.
    // See crbug.com/145112.
    var accepts = [{
        //mimeTypes: ['image/png', 'image/openraster']
        extensions: _.keys(callbacks)
    }];
    chrome.fileSystem.chooseEntry(
        {type: 'openFile', accepts: accepts}, function(readOnlyEntry) {
            if (!readOnlyEntry) {
                console.log("no file selected");
                return;
            }
            console.log(readOnlyEntry);
            var chosenFileEntry = readOnlyEntry;

            chosenFileEntry.file(function(file) {
                ChromeApp.readAsFiletype(readOnlyEntry, callbacks);
            });
        });
};

ChromeApp.fileSaveChooser = function(name, callback) {
    var config = {type: 'saveFile', suggestedName: name};
    return chrome.fileSystem.chooseEntry(config, callback);
};