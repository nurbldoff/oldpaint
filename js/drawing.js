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

    undo_types: Object.freeze({patch: 0,
                               add_layer: 1, remove_layer: 2, merge_layer: 3}),

    initialize: function (spec) {
        _.bindAll(this);
        this.palette = spec.palette;
        this.layers = new OldPaint.Layers();
        this.undos = [];
        this.redos = [];
        this.image_type = spec.image_type;
        this.layers.on("stroke", this.on_stroke);
        //this.palette.on("change", this.update);

        //this.preview_brush = _.throttle(this._preview_brush, 100);
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

        console.log("drawing save", path);
        $.ajax ({
            type: "POST",
            //the url where you want to sent the userName and password to
            url: Util.clean_path("save/" + path),
            contentType: "application/json",
            async: false,
            //json object to sent to the authentication url
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

    // Save locally as PNG file
    save_png_local: function (name, flatten) {
        var blob = this.layers.active.image.make_png();
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
        this.undos.push({type: this.undo_types.patch, patch: layer.make_patch()});
        layer.draw_clear(color);
        layer.make_backup();
        layer.trigger("redraw_preview");
    },

    // Combine the given layer with the layer below it.
    merge_layer_down: function (layer) {
        var from_index = this.layers.indexOf(layer);
        var to_index = from_index - 1;
        if (to_index >= 0) {
            var to_layer = this.layers.at(to_index);
            var action = this.make_action("merge_layer", {
                patch: to_layer.make_patch(to_layer.trim_rect()),
                index: from_index,
                layer: layer
            });
            to_layer.draw_other_layer(layer);
            this.layers.remove(layer);
            this.push_undo(action);
        }
    },

    // Merge all the layers into one, in order of appearance
    flatten: function () {
        var flattened = new this.image_type(
            {width: this.get("width"), height: this.get("height"),
             palette: this.palette});
        this.layers.each( function (layer) {
            // Do something!!!
        });
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
        //layer.make_backup();

        tool.before(this, stroke);
        //this.msg("Using " + tool.name + " tool.");
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
        //this.msg("Done using " + tool.name + " tool.");
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
                if (invert) {
                    drawing.merge_layer_down(drawing.layers.at(data.index));
                } else {
                    drawing.layers.add(data.layer, {index: data.index});
                    data.patch = drawing.restore_patch(data.patch);
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
            this.msg("Nothing to Undo!");
        }
    },

    redo: function () {
        var action = this.redos.pop();
        this.layers.active.clear_temporary();
        if (action) {
            this.push_undo(action());
        } else {
            this.msg("Nothing to Redo!");
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

    // Put part of the image on the undo/redo stack
    save_patch: function (layer, rect, undo) {
        var action = {type: this.undo_types.patch,
                      patch: layer.make_patch(layer.trim_rect(rect), undo)};
        if (undo) {
            this.push_undo(action);
        } else {
            this.push_redo(action);
        }
    },

    // restore part of the image
    restore_patch: function (patch) {
        //console.log("restore:", patch);
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
