/* Functionaity to store files in the browser's local storage */

var LocalStorage = LocalStorage || {};

LocalStorage.quota = 100 * 1024 * 1024;

// Very basic error messages
LocalStorage.error_handler = function errorHandler(e) {
    var msg = '';

    switch (e.code) {
    case FileError.QUOTA_EXCEEDED_ERR:
        msg = 'QUOTA_EXCEEDED_ERR';
        break;
    case FileError.NOT_FOUND_ERR:
        msg = 'NOT_FOUND_ERR';
        break;
    case FileError.SECURITY_ERR:
        msg = 'SECURITY_ERR';
        break;
    case FileError.INVALID_MODIFICATION_ERR:
        msg = 'INVALID_MODIFICATION_ERR';
        break;
    case FileError.INVALID_STATE_ERR:
        msg = 'INVALID_STATE_ERR';
        break;
    default:
        msg = 'Unknown Error';
        break;
    }

    console.log('LocalStorage error: ' + msg);
};

LocalStorage.request = function (on_success, args) {
    on_success = _.bind(on_success, this, args);
    // Check for functionality
    window.requestFileSystem = window.requestFileSystem ||
                               window.webkitRequestFileSystem;
    // If there is no localstorage available, do nothing.
    if (window.requestFileSystem) {
        window.webkitStorageInfo.requestQuota(
            PERSISTENT, LocalStorage.quota, function(grantedBytes) {
                window.requestFileSystem(
                    PERSISTENT, grantedBytes, on_success,
                    function (e) {console.log("Failed to get filesystem");});
            }, function (e) {console.log("Failed to get quota");}
        );
    } else {
        console.log("No local storage seems to be available, try Google Chrome.");
    }
};

LocalStorage.rm = function (args, fs) {
    fs.root.getFile(args.path + "/" + args.name, {create: false}, function(fileEntry) {
        fileEntry.remove(function() {
        }, LocalStorage.error_handler);

    }, LocalStorage.errorHandler);
};

// Create all directories in a path
LocalStorage.mkdir = function (rootDirEntry, path, callback) {
    function create_folder (entry, folders) {
        entry.getDirectory(folders[0], {create: true},
            function(dirEntry) {
                // Recursively add the new subfolder, if any
                if (folders.length > 1) {
                    create_folder(dirEntry, folders.slice(1));
                } else callback();
            }, LocalStorage.error_handler);
    }
    create_folder(rootDirEntry, path.split("/"));
};

LocalStorage.write = function (args, fs) {
    function write_file () {
        var filename = (args.path ? args.path + "/" : "") + args.name;
        fs.root.getFile(filename, {create: true}, function(fileEntry) {
            fileEntry.createWriter(function(fileWriter) {
                fileWriter.onwriteend = function(e) {
                    fileWriter.onwriteend = null;
                    fileWriter.truncate(args.blob.size);  // get rid of the rest, if any
                };
                fileWriter.onerror = function(e) {
                    console.log('Write failed: ' + e.toString());
                };
                fileWriter.write(args.blob);
            }, LocalStorage.error_handler);
        }, LocalStorage.error_handler);
    }

    // Create the path, and then write the file
    LocalStorage.mkdir(fs.root, args.path, write_file);
}

LocalStorage.read = function (args, fs) {
    var filename = (args.path ? args.path + "/" : "") + args.name;
    fs.root.getFile(filename, {}, function(fileEntry) {
        // Get a File object representing the file,
        // then use FileReader to read its contents.
        fileEntry.file(function(file) {
            var reader = new FileReader();

            reader.onloadend = args.on_load;

            reader.readAsDataURL(file);
        }, LocalStorage.error_handler);

    }, LocalStorage.error_handler);
}

LocalStorage.read_txt = function (args, fs) {
    var filename = (args.path ? args.path + "/" : "") + args.name;
    fs.root.getFile(filename, {}, function(fileEntry) {

        // Get a File object representing the file,
        // then use FileReader to read its contents.
        fileEntry.file(function(file) {
            var reader = new FileReader();
            reader.onloadend = args.on_load;
            reader.readAsText(file);
        }, LocalStorage.error_handler);

    }, LocalStorage.error_handler);

};

// Loads a number of files in specified order, in a convoluted way
LocalStorage.read_images = function () {
    var index = 0;
    return function (spec, callback) {
        index += 1;
        //LocalStorage(files[index - 1], index, data, callBackCounter);
        LocalStorage.load_bin(
            {path: spec.title + "/data", name: spec.layers[index-1],
             on_load: function (e) {
                 var data = e.target.result.slice(13); // remove the header
                 spec.layers[index-1] = data;  // put them in the right order
                 callBackCounter();
             }});
        function callBackCounter() {
            if (index === spec.layers.length) {
                index = 0;
                callback(spec);
            } else {
                LocalStorage.read_images(spec, callback);
            }
        }
    };
}();

LocalStorage.ls = function (args, fs) {
    var dirReader = fs.root.createReader();
    var entries = [];
    function toArray(list) {
        return Array.prototype.slice.call(list || [], 0);
    }
    // Call the reader.readEntries() until no more results are returned.
    var readEntries = function() {
        dirReader.readEntries (function(results) {
            if (!results.length) {
                args.callback(entries.sort());
            } else {
                entries = entries.concat(toArray(results));
                readEntries();
            }
        }, LocalStorage.error_handler);
    };
    readEntries(); // Start reading dirs.
};

LocalStorage.rm = function(args, fs) {
    var filename = (args.path ? args.path + "/" : "") + args.name;
    fs.root.getFile(filename, {create: false}, function(fileEntry) {
        fileEntry.remove(args.callback,
                         LocalStorage.error_handler);
    }, LocalStorage.error_handler);
};

LocalStorage.rmdir = function(args, fs) {
    fs.root.getDirectory(args.path, {}, function(dirEntry) {
        dirEntry.removeRecursively(function(hej) {
            console.log('Directory removed.');
        }, LocalStorage.error_handler);
    }, LocalStorage.error_handler);
};

// Convenience functions
LocalStorage.load_txt = _.bind(LocalStorage.request, window, LocalStorage.read_txt);
LocalStorage.load_bin = _.bind(LocalStorage.request, window, LocalStorage.read);
LocalStorage.list = _.bind(LocalStorage.request, window, LocalStorage.ls);
LocalStorage.remove = _.bind(LocalStorage.request, window, LocalStorage.rm);
LocalStorage.remove_dir = _.bind(LocalStorage.request, window, LocalStorage.rmdir);
LocalStorage.save = _.bind(LocalStorage.request, window, LocalStorage.write);