var LocalStorage = LocalStorage || {};

LocalStorage.quota = 100 * 1024 * 1024;

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
    
    console.log('Error: ' + msg);
};

LocalStorage.request = function (on_success, args) {
    on_success = _.bind(on_success, this, args);
    window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
    window.webkitStorageInfo.requestQuota(
        TEMPORARY, LocalStorage.quota, function(grantedBytes) {
            window.requestFileSystem(TEMPORARY, grantedBytes, on_success, 
                                     LocalStorage.error_handler);
        }, LocalStorage.error_handler
    );
};

LocalStorage.rm = function (args, fs) {
    fs.root.getFile(args.path + "/" + args.name, {create: false}, function(fileEntry) {
        fileEntry.remove(function() {
            console.log('File removed.');
        }, LocalStorage.error_handler);
        
    }, LocalStorage.errorHandler);
};

LocalStorage.mkdir = function (rootDirEntry, folders) {
    // Seems like this fails the first time on a new dir... why?
    console.log(folders);
    rootDirEntry.getDirectory(folders[0], {create: true}, function(dirEntry) {
        // Recursively add the new subfolder (if we still have another to create).
        if (folders.length) {
            LocalStorage.mkdir(dirEntry, folders.slice(1));
        }
    }, LocalStorage.error_handler);
};

LocalStorage.write = function (args, fs) {

    // Create the path...
    LocalStorage.mkdir(fs.root, args.path.split("/"));

    var filename = (args.path ? args.path + "/" : "") + args.name;
    console.log("writing", filename);
    // ..then write the file, overwriting if it's there.
    fs.root.getFile(filename, {create: true}, function(fileEntry) {
        fileEntry.createWriter(function(fileWriter) {
            fileWriter.onwriteend = function(e) {
                console.log("blob size", args.blob.size);
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

LocalStorage.read = function (args, fs) {
    var filename = (args.path ? args.path + "/" : "") + args.name;
    console.log(filename);
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
    console.log(filename);
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

LocalStorage.read_images = function () {
    var index = 0;
    return function (spec, callback) {
        index += 1;
        //LocalStorage(files[index - 1], index, data, callBackCounter);
        LocalStorage.request(
            LocalStorage.read, 
            {path: spec.title + "/data", 
             name: spec.layers[index-1],
             on_load: function (e) {
                 var data = e.target.result.slice(13); // remove the header
                 console.log("Put", spec.layers[index-1], "at", index-1);
                 spec.layers[index-1] = data;  // put them in the right order
                 callBackCounter();
             }});
        function callBackCounter() {
            if (index === spec.layers.length) {
                index = 0;
                console.log(spec.layers[0].slice(0, 30));
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