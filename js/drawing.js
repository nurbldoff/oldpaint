// The main Model, representing the whole drawing.
// Keeps track of the editing, undos/redos, load/save, etc.
OldPaint.Drawing = Backbone.Model.extend({

    selection: null,

    defaults: {
        title: "Untitled",
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
    load: function (loader, data) {
        // TODO: guess it should be possible to undo loading..?
        while (this.layers.models.length > 0) {
            this.layers.remove(this.layers.at(0), {silent: true});
        }
        loader(data, this);
        this.trigger("load");  // I think this must be done in a callback!
        this.trigger("update");
        this.undos = [];
        this.redos = [];
    },

    // Save an ORA file locally.
    export_ora: function () {
        var ora = Util.create_ora(this);
        saveAs(Util.convertDataURIToBlob(ora, "image/ora"),
               Util.change_extension(this.get("title"), "ora"));
    },

    // Save locally as PNG file. By default flattens all layers into one.
    export_png: function (name, single) {
        var blob;
        if (!!single) {
            blob = this.layers.active.image.make_png(true);
        } else {
            blob = this.flatten_visible_layers().make_png(true);
        }
        saveAs(blob, Util.change_extension(this.get("title"), "png"));
    },

    // save to internal browser storage
    save_to_storage: function () {
        console.log("Saving", this.get("title"));
        var spec = {
            title: this.get("title"),
            current_layer_number: this.layers.number,
            layers: [],
            palette: this.palette.colors
        };
        this.layers.each(function (layer, index) {
            console.log("Saving", this.get("title"), layer.id);
            var name = "layer" + layer.id;
            spec.layers.push(name);
            layer.clear_temporary(true);
            LocalStorage.save({path: this.get("title") + "/data",
                               name: name,
                               blob: layer.image.get_raw()});
        }, this);
        LocalStorage.save({path: this.get("title"), name: "spec",
                           blob: new Blob([JSON.stringify(spec)],
                                          {type: 'text/plain'})});
    },

    load_from_storage: function (title) {
        if (title) {
            this.set("title", title);
        }
        var model = this;
        var read_spec = function (e) {
            var spec = JSON.parse(e.target.result);
            var data = [];
            LocalStorage.read_images(spec, _.bind(model.load, this, Util.load_raw));
        };
        LocalStorage.load_txt({path: this.get("title"), name: "spec",
                               on_load: read_spec});
    },

    remove_from_storage: function (title) {
        if (!title) title =  this.get("title");
        LocalStorage.remove_dir({path: title});
    },

    // Convert the whole drawing from Indexed to RGB format.
    convert_to_rgb_type: function () {
        if (this.image_type == OldPaint.IndexedImage) {
            var layer_data = [], canvas;
            var active_layer = this.layers.indexOf(this.layers.active);
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
            this.layers.set_active(this.layers.at(active_layer));
            this.undos = [];
            this.redos = [];
        } else this.msg("Drawing is not of Indexed type - not converting.");
    },

    // === Layer operations ===

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


    flip_layer_horizontal: function(layer) {
        layer = layer || this.layers.active;
        layer.flip_x();
        this.push_undo(this.make_action("flip", {horizontal: true,
                                                 layer: layer}));
    },

    flip_layer_vertical: function(layer) {
        layer = layer || this.layers.active;
        layer.flip_y();
        this.push_undo(this.make_action("flip", {horizontal: false,
                                                 layer: layer}));
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

    // Return an Image which is the result of merging all visible layers.
    flatten_visible_layers: function () {
        var new_layer = new OldPaint.Layer({width: this.get("width"),
                                            height: this.get("height"),
                                            palette: this.palette,
                                            image_type: this.image_type});
        this.layers.each(function (layer, index) {
            if (layer.get("visible")) {
                this.merge_layers(layer, new_layer, true);
            }
        }, this);
        return new_layer.image;
    },

    resize: function(size) {
        this.set({width: size.width, height: size.height});
        this.layers.each(function(layer) {layer.resize(size);});
        this.trigger("resize");
        this.layers.trigger("resize");
    },

    redraw: function(layer) {
        layer = layer || this.layers.active;
        layer.redraw();
    },

    // === Draw related stuff ===

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
        if (layer.dirty_rect) {  // only push an undo if there was an actual change
            this.push_undo(this.make_action("draw", {
                rect: layer.dirty_rect,
                patch: layer.make_patch(layer.trim_rect(layer.dirty_rect), true),
                layer: layer}));
        }
        layer.cleanup();
        this.redos = [];
        //stroke.brush.restore_backup();
    },

    preview_brush: function(brush, color, pos) {
        var layer = this.layers.active;
        if (!pos) {
            pos = layer.last_brush_position;
            layer.clear_temporary();  // remove old
            layer.draw_brush(pos, brush, color, true);
        } else if (pos.x != layer.last_brush_position.x ||
            pos.y != layer.last_brush_position.y) {
            layer.clear_temporary();  // remove old
            layer.draw_brush(pos, brush, color, true);
        }
    },

    // === Undo system ===

    // An "action" represents an undoable change. It is a function
    // that, when invoked, undoes the change and returns its own inverse,
    // i.e. a new action that undoes the undo. Does this make sense?
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
            },
            flip: function (data, invert) {
                if (data.horizontal) data.layer.flip_x();
                else data.layer.flip_y();
                return data;
            }
        };
        var action = types[type];
        var make_action = this.make_action;
        return function () {
            data = action(data, !!invert);
            console.log("Action data", data);
            return make_action(type, data, !invert);
        };
    },

    push_undo: function (action) {
        this.undos.push(action);
        if (this.undos.length > 20) {this.undos.shift();}
    },

    push_redo: function (action) {
        this.redos.push(action);
        if (this.redos.length > 20) {this.redos.shift();}
    },

    undo: function () {
        var action = this.undos.pop();
        //console.log("BEFORE: undos:", this.undos, "redos:", this.redos);
        if (action) {
            this.layers.active.clear_temporary();
            this.push_redo(action());
            //console.log("AFTER: undos:", this.undos, "redos:", this.redos);
            return true;
        } else return false;
    },

    redo: function () {
        var action = this.redos.pop();
        if (action) {
            this.layers.active.clear_temporary();
            this.push_undo(action());
            return true;
        } else return false;
    },

    // === Misc functions ===

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

    update_coords: _.throttle(function (data) {
        this.trigger("coordinates", data);
    }, 100)

});
