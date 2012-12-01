var Util = Util || {};

Util.rgb = function (color) {
    return {r: color[0], g: color[1], b: color[2]};
};

Util.rgba = function (color) {
    return {r: color[0], g: color[1], b: color[2], a: color[3]};
};


Util.RGB2HTML = function (red, green, blue) {
    var decColor = red + 256 * green + 65536 * blue;
    return decColor.toString(16);
};

Util.colorToHex = function (c) {
    if (c.length) {
        return (1 << 24 | c[0] << 16 | c[1] << 8 | c[2]
               ).toString(16).toUpperCase().substr(1);
    } else {
        return (1 << 24 | c.r << 16 | c.g << 8 | c.b
               ).toString(16).toUpperCase().substr(1);
    }
};

Util.sign = function (x) {
    return x >= 0 ? 1 : -1;
};

Util.subtract = function (v1, v2) {
    return {x: v1.x - v2.x, y: v1.y - v2.y};
};

Util.copy = function (obj) {
    return $.extend({}, obj);
};

Util.memcpy = function (dst, dstOffset, src, srcOffset, length) {
  var dstU8 = new Uint8Array(dst, dstOffset, length);
  var srcU8 = new Uint8Array(src, srcOffset, length);
  dstU8.set(srcU8);
};

Util.restrict_size = function (width, height, limit) {
    var ratio = width / height;
    if (ratio >= 1) {
        width = Math.min(limit, width);
        height = width / ratio;
    } else {
        height = Math.min(limit, height);
        width = height * ratio;
    }
    return {x: width, y: height};
};


// Returns the smallest rect that contains both given rects.
Util.union = function (rect1, rect2) {
    var left, top;
    if (rect1 && rect2) {
        left = Math.min(rect1.left, rect2.left);
        top = Math.min(rect1.top, rect2.top);
        return {
            left: left,
            top: top,
            width: Math.max(rect1.left+rect1.width, rect2.left+rect2.width)-left,
            height: Math.max(rect1.top+rect1.height, rect2.top+rect2.height)-top
        };
    } else {
        return rect1 || rect2;
        // if (rect1) {return rect1;} else {
        //     if (rect2) {return rect2;}
        // }
    }
};

// Returns the largest rect that lies within both given rects.
Util.intersect = function (rect1, rect2) {
    if(rect1 && rect2) {
        var left = Math.max(rect1.left, rect2.left);
        var top = Math.max(rect1.top, rect2.top);
        var retrect = {
            left: left, top: top,
            width: Math.min(rect1.left+rect1.width, rect2.left+rect2.width)-left,
            height: Math.min(rect1.top+rect1.height, rect2.top+rect2.height)-top
        };
        if (retrect.width > 0 && retrect.height > 0) {
            return retrect;
        } else {
            return;
        }
    } else {
        if (rect1) {return rect1;} else {
            if (rect2) {return rect2;} else {return;}
        }
    }
};

// Returns the smallest rect containing the two given points
Util.rectify = function (start, end) {
    return {left: Math.min(start.x, end.x),
            top: Math.min(start.y, end.y),
            width: Math.abs(end.x - start.x),
            height: Math.abs(end.y - start.y)};
};

// Get the mouse position from an event
Util.event_coords = function (event) {
    // if (event.targetTouches && event.targetTouches.length > 0) {
    //     console.log("TargetTouches:", event.TargetTouches)
    //     event = event.targetTouches[0];
    // }
    return {x: event.pageX, y: event.pageY};
};

Util.rect = function (left, top, width, height) {
    return {left: left, top: top, width: width, height: height};
},


Util.pos = function (x, y) {
    return {x: x, y: y};
};

// Convert from a position on the screen canvas to image coordinates
Util.image_coords = function (coords, window) {
    return {x: Math.floor((coords.x - window.offset.x) / window.scale),
            y: Math.floor((coords.y - window.offset.y) / window.scale)};
};

// Convert from image to frame coords
Util.frame_coords = function (image_coords, window) {
    return {x: Math.ceil(image_coords.x * window.scale + window.offset.x),
            y: Math.ceil(image_coords.y * window.scale + window.offset.y)};
};

// Convert image coordinates to canvas (screen) coordinates
Util.canvas_coords = function (image_coords, window) {
    return {x: Math.ceil(image_coords.x * window.scale),
            y: Math.ceil(image_coords.y * window.scale)};
};

// Returns a canvas containing a copy of the input canvas,
// optionally only the part contained by rect, and optionally flipped.
Util.copy_canvas = function (canvas, rect, flip) {
    //console.log(canvas);
    var new_canvas = document.createElement('canvas'),
        context = new_canvas.getContext('2d'), left = 0, top = 0;
    if (rect) {
        new_canvas.width = rect.width;
        new_canvas.height = rect.height;
        if (flip && flip.x) {
            context.scale(-1, 1);
            left = -rect.width;
        }
        if (flip && flip.y) {
            context.scale(1, -1);
            top = -rect.height;
        }
        context.drawImage(canvas, rect.left, rect.top,
                          rect.width, rect.height,
                          left, top, rect.width, rect.height);
    } else {
        new_canvas.width = canvas.width;
        new_canvas.height = canvas.height;
        if (flip && flip.x) {
            context.scale(-1, 1);
            left = -canvas.width;
        }
        if (flip && flip.y) {
            context.scale(1, -1);
            top = -canvas.height;
        }
        context.drawImage(canvas, left, top);
    }
    return new_canvas;
};

Util.draw_canvas = function (from_canvas, to_canvas) {
    to_canvas.width = to_canvas.width;
    to_canvas.getContext('2d').drawImage(
        from_canvas, 0, 0, from_canvas.width, from_canvas.height,
        0, 0, to_canvas.width, to_canvas.height);
};

Util.split_path = function (path) {
    var sp = path.split('/');
    var file = sp[sp.length-1];
    var dir = path.substr(0, path.length - file.length);
    return [dir, file];
};

Util.change_extension = function (filename, extension) {
    var basename = filename.split(".")[0];
    return basename + "." + extension;
};

Util.clean_path = function (path) {
    return path.replace("//", "/");
};

Util.buffer = function(func, wait, scope) {
  var timer = null;
  return function() {
    if(timer) clearTimeout(timer);
    var args = arguments;
    timer = setTimeout(function() {
      timer = null;
      func.apply(scope, args);
    }, wait);
  };
};

Util.strip_data_header = function (data) {
    return data.slice(data.indexOf(",")+1);
};


Util.string_to_boolean = function (string){
	switch(string.toLowerCase()){
		case "true": case "yes": case "1": return true;
		case "false": case "no": case "0": case null: return false;
		default: return Boolean(string);
	}
};


// Takes a base64 encoded data URI and returns a binary 'blob'
Util.convertDataURIToBlob = function (dataURI, mimetype) {

    var BASE64_MARKER = ';base64,';
    var base64Index = dataURI.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
    var base64 = dataURI.substring(base64Index);

    var MIMETYPE_MARKER = 'data:';
    var mimetypeIndex = dataURI.indexOf(MIMETYPE_MARKER) + MIMETYPE_MARKER.length;
    //var mimetype = dataURI.substring(mimetypeIndex, dataURI.indexOf(BASE64_MARKER));
    mimetype = mimetype || "image/png";

    var raw = window.atob(base64);
    var rawLength = raw.length;
    var buffer = new ArrayBuffer(rawLength);
    var arrayview = new Uint8Array(buffer);

    for (var i = 0; i < rawLength; ++i) {
        arrayview[i] = raw.charCodeAt(i) & 0xff;
    }

    return new Blob([arrayview], {type: mimetype});
};

// Read a PNG file and return a deferred, which is resolved when the image is read.
Util.load_base64_png = function (data) {
    // Let's take a look at the file first
    var image = new PNG(data);
    var deferred = $.Deferred();

    // Use browser to decode non-palette types
    if (image.colorType != 3) {
        console.log("Loading RGB PNG");
        var img = new Image();
        img.onload = function() {
            var canvas = Util.copy_canvas(img);
            var result = {
                type: OldPaint.RGBImage,
                canvas: canvas,
                data: canvas.getContext('2d').getImageData(
                    0, 0, img.width, img.height).data,
                palette: [],
                width: img.width,
                height: img.height};
            deferred.resolve(result);
        };
        img.src = "data:image/png;base64," + data;
    } else {
        console.log("Loading indexed PNG");
        var start = (new Date()).getTime();
        // Convert the data into oldpaint formats
        var line, pixels = [];
        for (var y = 0; y < image.height; y++) {
            line = image.readLine();
            //console.log("read line", y);
            for(var x = 0; x < image.width; x++){
                pixels[y * image.width + x] = line[x];
            }
        }
        var palette = [];
        if (image.palette) {
            var color, alpha, rgba;
            for (var i = 0; i < image.palette.length; i++) {
                color = image.palette[i];
                if (image.transparency && i < image.transparency.length) {
                    alpha = image.transparency[i];
                } else {
                    alpha = 255;
                }
                rgba = [
                    ( color >> 16 ) & 255,
                    ( color >> 8 ) & 255,
                    color & 255,
                    alpha
                ];
                palette[i] = rgba;
            }
        }

        var result = {data: pixels,
                      palette: palette,
                      width: image.width,
                      height: image.height,
                      type: OldPaint.IndexedImage};
        //callback(result);
        deferred.resolve(result);
        /* Run a test. */
        var diff = (new Date()).getTime() - start;
        console.log("loading PNG took", diff, "ms.");
    }
    return deferred;
};

Util.mkXML = function (text) //turns xml string into XMLDOM
{
    if (typeof DOMParser != "undefined") {
          return (new DOMParser()).parseFromString(text, "text/xml");
    }
    else if (typeof ActiveXObject != "undefined") {
        var doc = new ActiveXObject("MSXML2.DOMDocument");
        doc.loadXML(text);
        return doc;
    }
    else {
        var url = "data:text/xml;charset=utf-8," + escape(text);
        var request = new XMLHttpRequest();
        request.open("GET", url, false);
        request.send(null);
        return request.responseXML;
    }
};

// Parses an array of PNG images into OldPaint drawing format
Util.png_loader = function (data, callback) {
    var spec = {layers: []};
    var load_next = function (result) {
        if (result)
            spec.layers.push({data: result.data, visible: true, animated: false});
        if (data.length > 0)
            Util.load_base64_png(Util.strip_data_header(data.pop())).done(load_next);
        else {
            spec.width = result.width;
            spec.height = result.height;
            spec.palette = result.palette;
            spec.type = result.type;
            callback(spec);
        }
    };
    load_next();
};

// Convert a "raw" spec object with PNG data into loadable drawing data
// Could be made more efficient.
Util.raw_loader = function (spec, callback) {
    var image = {layers: []}, layers = spec.layers, layer, i=0;
    var load_next = function (result) {
        if (result) {
            layer = spec.layers[i-1];
            layer.data = result.canvas;
        }
        if (i < layers.length)
            Util.load_base64_png(Util.strip_data_header(layers[i++].data)).done(load_next);
        else {
            spec.width = result.width;
            spec.height = result.height;
            spec.type = OldPaint[spec.type + "Image"];
            callback(spec);
        }
    };
    load_next();
};


// Routines for parsing and creating OpenRaster (ORA) files

// Loads an OpenRaster file
Util.ora_loader = function (data, callback) {
    var zipfs = new zip.fs.FS();

    var read_layer = function (n, visible, animated, max, data) {
        Util.load_base64_png(Util.strip_data_header(data)).done(function (result) {
            spec.layers[n] = {data: result.data, visible: visible, animated: animated};
            // Checking if all layers have been loaded
            if (++layers_added == max) {
                spec.palette = result.palette;  // we assume that all layers have the
                                                // same palette. They have to.
                spec.type = result.type;        // Same type (index/rgb) too.
                //spec.width = result.width;    // And size.
                //spec.height = result.height;  // This loader really needs some love.
                spec.layers.reverse();  // Openraster defines the first layer as the top one...
                console.log("importing ORA took", (new Date()).getTime() - start, "ms.");
                callback(spec);
            }
        });
    };

    var read_stack = function (stack) {
        var xml = Util.mkXML(stack),
            layer_nodes = xml.getElementsByTagName("layer");
        spec.width = xml.getElementsByTagName("image")[0].getAttribute("w");
        spec.height = xml.getElementsByTagName("image")[0].getAttribute("h");
        for (var i=0; i<layer_nodes.length; i++) {
            var node = layer_nodes[i], filename = node.getAttribute("src"),
                visible =  node.getAttribute("visibility") == "visible",
                animated = Util.string_to_boolean(
                    node.getAttribute("animated") || "false"),
                image = zipfs.find(filename),
                layer = spec.layers[i] = {};
            image.getData64URI("image/png", read_layer.bind(
                this, i, visible, animated, layer_nodes.length));
        }
    };

    var spec = {layers: []}, layers_added = 0;
    var start = (new Date()).getTime();
    zipfs.importData64URI(data, function () {
        zipfs.find("stack.xml").getText(read_stack);
    });
};

Util.gif_loader = function (data, callback) {
    var stream = new Stream(atob(Util.strip_data_header(data))),
        colors = [], spec = {};

    spec.type = OldPaint.IndexedImage;  // GIFs are always indexed
    spec.layers = [];

    var showBool = function(b) {
        return b ? 'yes' : 'no';
    };

    var showColor = function(rgb) {
        // FIXME When I have an Internet connection.
        var showHex = function(n) { // Two-digit code.
            var hexChars = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];
            return hexChars[(n >>> 4) & 0xF] + hexChars[n & 0xF];
        };
        return '#' + showHex(rgb[0]) + showHex(rgb[1]) + showHex(rgb[2]);
    };

    var showDisposalMethod = function(dm) {
        var map = {
            0: 'None',
            1: 'Do not dispose',
            2: 'Restore to background',
            3: 'Restore to previous'
        };
        return map[dm] || 'Unknown';
    }

    var make_palette = function (colors, transparent) {
        var palette = [];
        for (var i=0; i<colors.length; i++) {
            palette[i] = colors[i].slice();
            if (palette[i][3] === undefined)
                palette[i][3] = (i == transparent)? 0 : 255;
        }
        return palette;
    };

    var doHdr = function(hdr) {
        console.log('Header:');
        console.log(' Version: %s', hdr.ver);
        console.log(' Size: %dx%d', hdr.width, hdr.height);
        console.log(' GCT? %s%s', showBool(hdr.gctFlag), hdr.gctFlag ? ' (' + hdr.gct.length + ' entries)' : '');
        console.log(' Color resolution: %d', hdr.colorRes);
        console.log(' Sorted? %s', showBool(hdr.sorted));
        console.log(' Background color: %s (%d)', hdr.gctFlag ? showColor(hdr.bgColor) : 'no GCT', hdr.bgColor);
        console.log(' Pixel aspect ratio: %d FIXME', hdr.pixelAspectRatio);
        
        spec.width = hdr.width;
        spec.height = hdr.height;
        // Note: Always uses the global color table
        spec.palette = make_palette(hdr.gct);  
    };

    var doGCE = function(gce) {
        console.log('GCE:');
        console.log(' Disposal method: %d (%s)', gce.disposalMethod, showDisposalMethod(gce.disposalMethod));
        console.log(' User input expected? %s', showBool(gce.userInput));
        console.log(' Transparency given? %s%s', showBool(gce.transparencyGiven),
            gce.transparencyGiven ? ' (index: ' + gce.transparencyIndex + ')' : '');
        console.log(' Delay time: %d', gce.delayTime);
        //spec.palette[gce.transparencyIndex][3] = 0;
    };

    var doImg = function(img) {
        console.log('Image descriptor:');
        console.log(' Geometry: %dx%d+%d+%d', img.width, img.height, img.leftPos, img.topPos);
        console.log(' LCT? %s%s', showBool(img.lctFlag), img.lctFlag ? ' (' + img.lct.length + ' entries)' : '');
        console.log(' Interlaced? %s', showBool(img.interlaced));
        console.log(' %d pixels', img.pixels.length);

        spec.layers.push({data: img.pixels, 
                          width: img.width, height: img.height,
                          offset: {x: img.leftPos, y: img.topPos},
                          visible: true, animated: true});
    };

    var doNetscape = function(block) {
        console.log('Netscape application extension:');
        console.log(' Iterations: %d%s', block.iterations, block.iterations === 0 ? ' (infinite)' : '');
    };

    var doCom = function(com) {
        console.log('Comment extension:');
        console.log(' Comment: [31m%s[0m', com.comment);
    };

    var doEOF = function(eof) {
        console.log('EOF');
        callback(spec);
    };

    var doUnknownApp = function(block) {
    };

    var doUnknownExt = function(block) {
    };

    var handler = {
        hdr: doHdr,
        img: doImg,
        gce: doGCE,
        com: doCom,
        app: {
            NETSCAPE: doNetscape,
            unknown: doUnknownApp
        },
        eof: doEOF
    };

    parseGIF(stream, handler);
};


// Create an ORA file
// TODO: not quite up to the ORA standard; lacks thumbnail, adds "animated" attribute
Util.create_ora = function (drawing, callback) {
    var zipfs = new zip.fs.FS(),
        zipdir = zipfs.root,
        datadir = zipdir.addDirectory("data"),
        xw = new XMLWriter( 'UTF-8', '1.0' );
    xw.writeStartDocument();
    xw.writeStartElement("image");
    xw.writeAttributeString("w", drawing.get("width"));
    xw.writeAttributeString("h", drawing.get("height"));
    xw.writeStartElement("stack");

    for (var i=drawing.layers.length-1; i>=0; i--) {
        var layer = drawing.layers.at(i);
        xw.writeStartElement("layer");
        xw.writeAttributeString("name", "layer" + (i+1));
        xw.writeAttributeString("src", "data/layer" + (i+1) + ".png");
        xw.writeAttributeString("visibility", layer.get("visible")? "visible" : "hidden");
        xw.writeAttributeString("animated", layer.get("animated"));  // Not in ORA standard!
        xw.writeEndElement();
        datadir.addData64URI("layer"+ (i+1) + ".png", layer.image.make_png());
    }
    var xml = xw.flush();
    zipdir.addText("stack.xml", xml);
    zipdir.addText("mimetype", "image/openraster");
    zipdir.exportBlob(callback);
};

Util.create_gifanim = function (drawing, transparent, repeat, fps) {
    var encoder = GIFEncoder(), i;
    encoder.start();
    encoder.setRepeat(repeat);
    encoder.setFrameRate(fps);
    encoder.setTransparent(transparent);
    
    var colors = null;
    if (drawing.image_type == OldPaint.IndexedImage) {
        colors = [];
        for (i=0; i<drawing.palette.colors.length; i++) {
            colors.push(drawing.palette.colors[i][0]);
            colors.push(drawing.palette.colors[i][1]);
            colors.push(drawing.palette.colors[i][2]);
        }
    }
    for (i=0; i<drawing.layers.length; i++) {
        var layer = drawing.layers.at(i);
        if (layer.get("animated")) {
            if (colors)
                encoder.addFrame(layer.image.icontext, colors);
            else
                encoder.addFrame(layer.image.context);
        }
    }
    encoder.finish(); 
    var binary_gif = encoder.stream().getData();
    var data_url = 'data:image/gif;base64,' + encode64(binary_gif);
    return Util.convertDataURIToBlob(data_url);
};