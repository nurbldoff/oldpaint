// The main Model, representing the whole drawing.
// Keeps track of the Layers, the Palette, editing, undos/redos,
//   load/save, etc.
OldPaint.Drawing = Backbone.Model.extend({

    selection: null,
    name: "Untitled",

    defaults: {
        width: 0,
        height: 0
    },

    initialize: function (spec) {
        _.bindAll(this);
        this.palette = spec.palette;
        this.layers = new OldPaint.Layers();
        this.undos = [];
        this.redos = [];
        this.image_type = spec.image_type;
        this.layers.on("stroke", this.on_stroke);
    },

    // Load image data
    load: function (data, loader) {
        while (this.layers.models.length > 0) {
            this.layers.remove(this.layers.at(0), {silent: true});
        }
        loader(data, this);
        this.trigger("load");
        this.trigger("update");
        this.undos = [];
        this.redos = [];
    },

    // Save drawing to the server
    save: function (path) {
        var layers = [];
        var image, imagedata, imagelist;
        for (var i=0; i < this.layers.length; i++) {
            image = this.layers.at(i).image;
            imagedata = image.context.getImageData(0, 0,
                                                   image.canvas.width,
                                                   image.canvas.height);
            imagelist = [];
            for (var j=0; j < imagedata.data.length; j+=4) {
                imagelist.push(imagedata.data[j]);
            }
            layers.push(imagelist);
        }

        var split_path = Util.split_path(path);
        this.filename = split_path[1];

        var postdata = {
            layers: layers,
            palette: image.palette.colors,
            width: image.canvas.width,
            height: image.canvas.height
        };
        $.ajax ({
            type: "POST",
            url: Util.clean_path("save/" + path),
            contentType: "application/json",
            async: false,
            data: JSON.stringify(postdata),
            error: function () {
                alert("There was an error, image may not have been saved!");
            }
        });
    },

    // Save an ORA file locally.
    save_ora_local: function () {
        var ora = Util.create_ora(this);
        saveAs(Util.convertDataURIToBlob(ora),
               Util.change_extension(this.name, "ora"));
    },

    // Save locally as PNG file. By default flattens all layers into one.
    save_png_local: function (name, single) {
        if (!!single) {
            var blob = this.layers.active.image.make_png(true);
        } else {
            var blob = this.flatten().make_png(true);
        }
        saveAs(blob, Util.change_extension(this.name, "png"));
    },

    // Convert the whole drawing from Indexed to RGB format.
    convert_to_rgb_type: function () {
        if (this.image_type == OldPaint.IndexedImage) {
            var layer_data = [], canvas;
            while (this.layers.models.length > 0) {
                canvas = this.layers.at(0).image.canvas;
                layer_data.push(canvas.getContext("2d").getImageData(
                    0, 0, canvas.width, canvas.height).data);
                this.layers.remove(this.layers.at(0), {silent: true});
            }
            this.image_type = OldPaint.RGBImage;
            _.each(layer_data, function (data, index) {
                this.add_layer(false, data);
            }, this);
            this.undos = [];
            this.redos = [];
        } else this.msg("Drawing is not of Indexed type - not converting.");
    },

    add_layer: function (activate, data) {
        var new_layer = new OldPaint.Layer({width: this.get("width"),
                                            height: this.get("height"),
                                            palette: this.palette,
                                            image_type: this.image_type,
                                            image: data,
                                            background: this.palette.background});
        this.layers.add(new_layer);
        this.push_undo(this.make_action("add_layer",
                                        {layer: new_layer,
                                         index: this.layers.indexOf(new_layer)}));
        if (activate) new_layer.activate();
        this.msg("Added new layer.");
        new_layer.cleanup();
        return new_layer;
    },

    remove_layer: function (layer) {
        var index = this.layers.indexOf(layer);
        this.layers.remove(layer);
        this.push_undo(this.make_action("remove_layer",
                                        {layer: layer, index: index}));
    },

    clear_layer: function (layer, color) {
        this.push_undo(this.make_action("draw", {
            patch: layer.make_patch(null, true), layer: layer}));
        layer.draw_clear(color);
        layer.trigger("redraw_preview");
    },

    // Combine two layers into one, in order of appearance.
    merge_layers: function (from_layer, to_layer, no_undo) {
        var from_index = this.layers.indexOf(from_layer);
        var to_index = this.layers.indexOf(to_layer);
        var action = this.make_action(
            "merge_layer", {
                patch: to_layer.make_patch(to_layer.trim_rect()),
                index: from_index, layer: from_layer});
        to_layer.draw_other_layer(from_layer);
        if (to_index >= 0) {
            this.layers.remove(from_layer);
            if (!no_undo) this.push_undo(action);
        }
    },

    // Return an Image which is the result of merging all layers.
    flatten: function () {
        var new_layer = new OldPaint.Layer({width: this.get("width"),
                                            height: this.get("height"),
                                            palette: this.palette,
                                            image_type: this.image_type});
        for (var i=0; i<this.layers.length; i++) {
            console.log("Merging layer", i);
            this.merge_layers(this.layers.at(i), new_layer, true);
        }
        return new_layer.image;
    },

    resize: function(size) {
        this.set({width: size.width, height: size.height});
        this.layers.each(function(layer) {layer.resize(size);});
        this.trigger("resize");
        this.layers.trigger("resize");
    },

    // Things to do when the user starts making a "stroke" with a tool
    before_draw: function(tool, stroke) {
        var layer = this.layers.active;
        if (layer.temporary_rect) {
            layer.restore_backup(layer.temporary_rect);
            layer.temporary_rect = null;
        }
        tool.before(this, stroke);
    },

    draw: function(tool, stroke) {
        tool.draw(this, stroke);
    },

    // After the stroke is finished, save undo etc.
    after_draw: function(tool, stroke) {
        tool.after(this, stroke);
        var layer = this.layers.active;
        this.push_undo(this.make_action("draw", {
            rect: layer.dirty_rect,
            patch: layer.make_patch(layer.trim_rect(layer.dirty_rect), true),
            layer: layer}));
        layer.cleanup();
        this.redos = [];
        stroke.brush.restore_backup();
    },

    preview_brush: function(brush, color, pos) {
        var layer = this.layers.active;
        if (pos.x != layer.last_brush_position.x ||
            pos.y != layer.last_brush_position.y) {
            layer.clear_temporary();  // remove old
            layer.draw_brush(pos, brush, color, true);
        }
    },

    // An "action" represents an undoable change. It is a function
    // that, when invoked, undoes the change and returns its own inverse,
    // i.e. a new action that undoes the undo.
    make_action: function (type, data, invert) {
        var drawing = this;
        // The different types of actions available
        var types = {
            draw: function (data, invert) {
                data.patch = data.layer.swap_patch(data.patch);
                return data;
            },
            add_layer: function (data, invert) {
                if (invert) drawing.layers.add(data.layer, {index: data.index});
                else drawing.layers.remove(data.layer);
                return data;
            },
            remove_layer: function (data, invert) {
                if (invert) drawing.layers.remove(data.layer);
                else drawing.layers.add(data.layer, {index: data.index});
                return data;
            },
            merge_layer: function (data, invert) {
                var lower = drawing.layers.at(data.index-1);
                if (invert) {
                    data.patch = lower.swap_patch(data.patch);
                    drawing.merge_layers(drawing.layers.at(data.index),
                                         drawing.layers.at(data.index-1), true);
                } else {
                    drawing.layers.add(data.layer, {index: data.index});
                    data.patch = lower.swap_patch(data.patch);
                }
                return data;
            }
        };
        var action = types[type];
        var make_action = this.make_action;
        return function () {
            data = action(data, !!invert);
            return make_action(type, data, !invert);
        };
    },

    undo: function () {
        var action = this.undos.pop();
        this.layers.active.clear_temporary();
        if (action) {
            this.push_redo(action());
        } else {
            this.msg("Nothing more to undo!");
        }
    },

    redo: function () {
        var action = this.redos.pop();
        this.layers.active.clear_temporary();
        if (action) {
            this.push_undo(action());
        } else {
            this.msg("Nothing more to redo!");
        }
    },

    push_undo: function (action) {
        this.undos.push(action);
        if (this.undos.length > 20) {this.undos.shift();}
    },

    push_redo: function (action) {
        this.redos.push(action);
        if (this.redos.length > 20) {this.redos.shift();}
    },

    // restore part of the image
    restore_patch: function (patch) {
        var layer = this.layers.getByCid(patch.layerid);
        return layer.swap_patch(patch);
    },

    set_selection: function (rect, action) {
        if (rect) {
            var begin = !this.selection;
            if (begin) {
                this.selection = rect;
                this.selection.action = action;
            } else {
                $.extend(this.selection, rect);
            }
            this.trigger("selection", begin);
            this.update_coords(this.selection);
        } else {
            this.selection = null;
            this.trigger("selection");
        }
    },

    msg: function (message) {
        this.trigger("message", message);
    },

    update_coords: _.throttle(function (data) {
        this.trigger("coordinates", data);
    }, 100)

});
