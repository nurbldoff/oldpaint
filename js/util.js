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
    height = Math.min(height, limit);
    if (width > limit && ratio > 1) {
        height = limit / ratio;
    }
    return {x: height * ratio, y: height};
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

// Calculate the canvas position of the cursor
Util.event_coords = function (event) {
    // if (event.targetTouches && event.targetTouches.length > 0) {
    //     console.log("TargetTouches:", event.TargetTouches)
    //     event = event.targetTouches[0];
    // }
    return {x: event.offsetX, y: event.offsetY};
};

Util.rect = function (left, top, width, height) {
    return {left: left, top: top, width: width, height: height};
},


Util.pos = function (x, y) {
    return {x: x, y: y};
};

// Convert from a position on the screen canvas to image coordinates
Util.image_coords = function (coords, scale) {
    return {x: Math.floor(coords.x / scale),
            y: Math.floor(coords.y / scale)};
};

// Convert from image to frame coords
Util.frame_coords = function (image_coords, scale) {
    return {x: Math.ceil(image_coords.x * scale),
            y: Math.ceil(image_coords.y * scale)};
};

// Convert image coordinates to canvas (screen) coordinates
Util.canvas_coords = function (image_coords, offset, scale) {
    return {x: Math.ceil(image_coords.x * scale + offset.x),
            y: Math.ceil(image_coords.y * scale + offset.y)};
};

// Returns a canvas containing a copy of the input canvas,
// optionally only the part contained by rect, and optionally flipped.
Util.copy_canvas = function (canvas, rect, flip) {
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
    return data.slice(data.indexOf(","));
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
    console.log("Loading PNG of type:", image.colorType);
    // Use browser to decode non-palette types
    if (image.colorType != 3) {
        var img = new Image();
        img.onload = function() {
            var canvas = Util.copy_canvas(img);
            var result = {layers: [canvas.getContext('2d').getImageData(
                0, 0, img.width, img.height).data],
                          palette: [],
                          width: img.width,
                          height: img.height};
            //callback(result);
            deferred.resolve(result);
        };
        img.src = "data:image/png;base64," + data;
    } else {
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

        var result = {layers: [pixels],
                      palette: palette,
                      width: image.width,
                      height: image.height};
        //callback(result);
        deferred.resolve(result);

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

// Parses and loads PNG images into a drawing
// TODO: This is really too tied to the Drawing model. Should it be moved there?
Util.load_png = function (data, drawing) {
    _.each(data.layers, function (image, index) {
        Util.load_base64_png(image).done(function (result) {
            drawing.set("height", result.height);
            drawing.set("width", result.width);
            drawing.add_layer(true, result.layers[0]);
            if (data.palette) {
                drawing.palette.set_colors(data.palette);
            } else if (result.palette.length > 0) {
                drawing.palette.set_colors(result.palette);
            }
        });
    });
};

// Loads PNG images directly into a drawing
Util.load_raw = function (data, drawing) {
    _.each(data.layers, function (image, index) {
        // TODO: Should be easier to bypass this whole thing and load
        // the canvas directly into the image. Faster too.
        Util.load_base64_png(image).done(function (result) {
            drawing.set("height", result.height);
            drawing.set("width", result.width);
            var layer = drawing.add_layer(true);
            layer.image.put_data(result.layers[0]);
            layer.cleanup();
            if (data.palette) {
                drawing.palette.set_colors(data.palette);
            } else if (result.palette.length > 0) {
                drawing.palette.set_colors(result.palette);
            }
        });
    });
};


// Routines for parsing and creating OpenRaster (ORA) files

// Loads an OpenRaster file into a drawing
Util.load_ora = function (data, drawing) {
    var zip = new JSZip();
    //Need to do some more checking here, seems like the mimetype can
    //be confused. Here we assume it's "image/openraster"
    zip.load(Util.strip_data_header(data), {base64: true});
    var stack_file = zip.file("stack.xml"),
        xml = Util.mkXML(stack_file.data),
        layer_nodes = xml.getElementsByTagName("layer"),
        layers = [], folder = zip.folder("data");
    drawing.set("width", xml.getElementsByTagName("image")[0].getAttribute("w"));
    drawing.set("height", xml.getElementsByTagName("image")[0].getAttribute("h"));
    _.each(layer_nodes, function (node, index) {
        var filename = node.getAttribute("src"), image = zip.file(filename);
        Util.load_base64_png(btoa(image.data)).done(function (data) {
            drawing.add_layer(true, data.layers[0]);
            // TODO: this isn't a pretty way of loading the palette...
            if (data.palette.length > 0) {
                drawing.palette.set_colors(data.palette);
            }
        });
    });
    drawing.palette.set_background(0);
    drawing.palette.set_foreground(1);
};

// Create an ORA file as a data URI.
// TODO: Doesn't deflate, because that results in bad zip files for some reason.
Util.create_ora = function (drawing) {
    var zip = new JSZip(), xw = new XMLWriter( 'UTF-8', '1.0' );
    xw.writeStartDocument();
    xw.writeStartElement("image");
    xw.writeAttributeString("w", drawing.get("width"));
    xw.writeAttributeString("h", drawing.get("height"));
    xw.writeStartElement("stack");
    drawing.layers.each(function (layer, index) {
        xw.writeStartElement("layer");
        xw.writeAttributeString("name", "layer" + (index+1));
        xw.writeAttributeString("src", "data/layer" + (index+1) + ".png");
        xw.writeEndElement();
        zip.file("data/layer"+ (index+1) + ".png",
                 layer.image.make_png(), {base64: true});
    });
    var xml = xw.flush();
    zip.file("stack.xml", xml);
    zip.file("mimetype", "image/openraster");
    //var zipfile = zip.generate({compression: "DEFLATE"});
    var zipfile = zip.generate();
    return "data:application/zip;base64,"+ zipfile;
};