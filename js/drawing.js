// The main Model, representing the whole drawing.
// Keeps track of the editing, undos/redos, load/save, etc.
OldPaint.Drawing = Backbone.Model.extend({

    selection: null,
    max_undos: 20,  // maximum length of undo history

    defaults: {
        title: null,
        width: 640,
        height: 512
    },

    initialize: function (spec) {
        _.bindAll(this);
        this.palette = spec.palette;
        this.max_undos = this.max_undos || spec.max_undos;
        this.layers = new OldPaint.Layers();
        this.undos = [];
        this.redos = [];
        this.image_type = spec.image_type;
        this.layers.on("stroke", this.on_stroke);
    },

    reinitialize: function () {
        while (this.layers.models.length > 0) {
            this.layers.pop({silent: false});
        }
        this.add_layer(true);
        this.set("title", null);
    },

    // Load image. Takes a "loader" function and feeds it the data and
    // a callback that expects a nice drawing spec object.
    // TODO: guess it should be possible to undo loading..?
    load: function (loader, data) {
        // Remove all the present layers
        while (this.layers.models.length > 0)
            this.layers.pop({silent: false});
        this.layers.active = null;

        var on_loaded = (function (result) {
            console.log("loader result:", result);
            if (result.title)
                this.set("title", result.title);
            this.set_type(result.type);
            this.set({height: result.height, width: result.width});
            for (var i=0; i<result.layers.length; i++)
                this.add_layer(true, result.layers[i]);
            if (data.palette)
                this.palette.set_colors(data.palette);
            else if (result.palette && result.palette.length > 0)
                this.palette.set_colors(result.palette);
            this.trigger("load");

            this.undos = [];
            this.redos = [];

        }).bind(this);

        loader(data, on_loaded);

    },

    // Convert the whole drawing from Indexed to RGB format.
    convert_to_rgb_type: function () {
        if (this.image_type == OldPaint.IndexedImage) {
            var layer_data = [],
                active_layer = this.layers.indexOf(this.layers.active);
            this.image_type = OldPaint.RGBImage;
            this.layers.each(function (layer) {
                layer.clear_temporary();
                layer.convert(this.image_type);
                layer.redraw();
                layer.cleanup();
            }, this);
            this.undos = [];
            this.redos = [];
            this.trigger("convert");
            return true;
        } else return false;
    },

    set_type: function (type) {
        if (this.image_type != type) {
            switch (type) {
            case OldPaint.IndexedImage:
                console.log("convert to indexed");
                this.image_type = OldPaint.IndexedImage;
                this.trigger("convert");
                break;
            case OldPaint.RGBImage:
                console.log("convert to RGB");
                this.convert_to_rgb_type();
                break;
            }
        }
    },

    get_type: function () {
        if (this.image_type == OldPaint.IndexedImage)
            return "Indexed";
        if (this.image_type == OldPaint.RGBImage)
            return "RGB";
    },

    get_rect: function () {
        return this.layers.active.get_rect();
    },

    // === Layer operations ===

    add_layer: function (activate, spec) {
        console.log("add_layer", spec);
        var image = (!spec ? null : spec.data),
            visible = (!spec ? true : spec.visible),
            animated = (!spec ? false : spec.animated), rect;
        if (spec && spec.offset)
            rect = Util.rect(spec.offset.x, spec.offset.y,
                             spec.width, spec.height);
        var new_layer = new OldPaint.Layer({width: this.get("width"),
                                            height: this.get("height"),
                                            palette: this.palette,
                                            image_type: this.image_type,
                                            image: image,
                                            rect: rect,
                                            visible: visible,
                                            animated: animated,
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
        if (this.layers.length > 1) {
            var index = this.layers.indexOf(layer);
            this.layers.remove(layer);
            this.push_undo(this.make_action("remove_layer",
                                            {layer: layer, index: index}));
        }
    },

    clear_layer: function (layer, color) {
        layer = layer || this.layers.active;
        color = color || this.palette.background;
        this.push_undo(this.make_action("draw", {
            patch: layer.make_patch(null, true), layer: layer}));
        layer.draw_clear(color);
        //layer.trigger("redraw_preview");
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
            if (layer.is_visible(layer === this.layers.active)) {
                this.merge_layers(layer, new_layer, true);
                console.log("merging layer", index);
            }
        }, this);
        return new_layer.image;
    },

    // Resize all the layers
    resize: function(size) {
        this.set({width: size.width, height: size.height});
        this.layers.each(function(layer) {layer.resize(size);});
        this.trigger("resize");
        //this.layers.trigger("resize");
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
        if (layer)
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
        if (this.undos.length > this.max_undos) {this.undos.shift();}
    },

    push_redo: function (action) {
        this.redos.push(action);
        if (this.redos.length > this.max_undos) {this.redos.shift();}
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

    make_selection: function (action, rect) {
        console.log("make_selection");
        this.selection = new OldPaint.Selection({drawing: this,
                                                 action: action,
                                                 rect: rect});
        this.trigger("selection", this.selection);
    },

    end_selection: function (action) {
        //this.selection.finish(action);
        this.selection = null;
    },

    update_coords: function (data) {
        this.trigger("coordinates", data);
    }

});
