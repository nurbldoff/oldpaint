// Routines for parsing and creating OpenRaster (ORA) files

// Loads an OpenRaster file into a drawing
OldPaint.load_ora = function (data, drawing) {
    var zip = new JSZip();
    console.log(data.slice(0, 100));
    zip.load(data.slice(13), {base64: true});
    var stack_file = zip.file("stack.xml");
    console.log(stack_file.data);
    var xml = Util.mkXML(stack_file.data);
    var layer_nodes = xml.getElementsByTagName("layer");
    var layers = [], folder = zip.folder("data");
    drawing.set("width", xml.getElementsByTagName("image")[0].getAttribute("w"));
    drawing.set("height", xml.getElementsByTagName("image")[0].getAttribute("h"));
    _.each(layer_nodes, function (node, index) {
        var filename = node.getAttribute("src");
        var image = zip.file(filename);
        //console.log(btoa(image.data).slice(0, 100));
        Util.load_base64_png(btoa(image.data)).done(function (data) {
            drawing.add_layer(true, data.layers[0]);
            if (data.palette.length > 0) {
                drawing.palette.set_colors(data.palette);
            }
        });
    });
};

// Create an ORA file. Doesn't deflate though.
OldPaint.create_ora: function (drawing) {
    var zip = new JSZip();
    zip.folder("data");
    var xw = new XMLWriter( 'UTF-8', '1.0' );
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
    console.log("ora xml", xml);
    zip.file("stack.xml", xml);
    zip.file("mimetype", "image/openraster");
    return "data:application/zip;base64,"+ zip.generate({compression: "DEFLATE"});
},
