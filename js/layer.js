// A Layer is an Image, and a number of Layers stacked on each
// other make up (essentially) a Drawing.
OldPaint.Layer = OldPaint.Image.extend ({
    image: null,
    backup: null,
    dirty_rect: null,
    temporary_rect: null,
    last_change: null,
    last_brush_position: {x: 0, y:0},
    changed_since_save: true,

    defaults: {
        visible: true,
        animated: false
    },

    initialize: function (spec) {
        OldPaint.Layer.__super__.initialize.apply(this, [spec]);
        this.make_backup();
    },

    clear_temporary: function (silent) {
        if (this.temporary_rect) {
            this.restore_backup(this.temporary_rect, this.temporary_rect, silent);
            if (!silent) this.temporary_rect = null;
        }
        this.dirty_rect = null;
    },

    restore_backup: function (rect, dest_rect, silent) {
        var update_rect = OldPaint.Layer.__super__.restore_backup.apply(this, arguments);
        if (update_rect) {
            this.trigger_update(update_rect, true);
        }
    },

    draw_brush: function (start, brush, color, temporary) {
        if (temporary || start.x != this.last_brush_position.x ||
                         start.y != this.last_brush_position.y) {
            this.last_brush_position = start;
            this.trigger_update(
                OldPaint.Layer.__super__.draw_brush.apply(this, arguments),
                temporary);
        }
    },

    draw_line: function (start, end, brush, color, temporary) {
        this.trigger_update(
            OldPaint.Layer.__super__.draw_line.apply(this, arguments),
            temporary);
    },
    draw_rectangle: function (topleft, size, brush, color, filled, temporary) {
        this.trigger_update(
            OldPaint.Layer.__super__.draw_rectangle.apply(this, arguments),
            temporary);
    },

    draw_ellipse: function (center, radii, brush, color, filled, temporary) {
        this.trigger_update(
            OldPaint.Layer.__super__.draw_ellipse.apply(this, arguments),
            temporary);
    },

    draw_fill: function (start, color) {
        this.trigger_update(
            OldPaint.Layer.__super__.draw_fill.apply(this, arguments));
    },

    draw_gradientfill: function (start, colors) {
        this.trigger_update(
            OldPaint.Layer.__super__.draw_gradientfill.apply(this, arguments));
    },

    draw_clear: function () {
        this.temporary_rect = null;
        this.trigger_update(
            OldPaint.Layer.__super__.draw_clear.apply(this));
        this.cleanup();
    },

    draw_other_layer: function (layer) {
        var rect = {left: 0, top: 0, width: this.image.canvas.width,
                    height: this.image.canvas.height};
        var patch = layer.make_patch(rect);
        this.trigger_update(
            this.draw_patch(patch, rect, true));
        this.cleanup();
    },

    draw_patch: function () {
        this.trigger_update(
            OldPaint.Layer.__super__.draw_patch.apply(this, arguments));
    },

    flip_x: function () {
        this.clear_temporary();
        this.trigger_update(OldPaint.Layer.__super__.flip_x.apply(this));
        this.cleanup();
    },

    flip_y: function () {
        this.clear_temporary();
        this.trigger_update(OldPaint.Layer.__super__.flip_y.apply(this));
        this.cleanup();
    },

    // Create a Patch from part of the image
    make_patch: function (rect, backup) {
        var size = this.get_size();
        rect = Util.intersect(rect, {left: 0, top:0,
                                     width: size.width, height: size.height});
        return new OldPaint.Patch(backup ? this.backup : this.image.get_data(),
                         rect, this.cid, this.image.palette);
    },

    // Takes a patch, applies it and returns what was there before.
    swap_patch: function (patch) {
        var oldpatch = this.make_patch(patch.rect);
        this.draw_patch(patch);
        this.make_backup();
        this.cleanup();
        return oldpatch;
    },

    // Force a complete redraw. Should never be necessary.
    redraw: function () {
        var rect = {left: 0, top:0,
                    width: this.image.canvas.width,
                    height: this.image.canvas.height};
        this.image.updateCanvas(rect);
        this.trigger_update({left: 0, top:0,
                             width: this.image.canvas.width,
                             height: this.image.canvas.height});
    },

    // This should be run after a completed drawing action
    // Returns the changed rect
    // Note: Seems like a clumsy way of doing things. Engineer it away!
    cleanup: function (whole) {
        var rect = whole ? this.get_rect() : this.dirty_rect;
        this.dirty_rect = null;
        if (rect) {
            //if (this.image.updateAlpha) this.image.updateAlpha(rect);
            this.trigger_update(rect);
        }
        this.make_backup();
        this.trigger("redraw_preview");
        return rect;
    },

    resize: function (rect) {
        this.make_backup();
        var orig_width = this.image.canvas.width;
        var orig_height = this.image.canvas.height;
        this.image = new this.attributes.image_type(
            {width: rect.width, height: rect.height,
             palette: this.image.palette});
        this.canvas = this.image.canvas;
        this.restore_backup({left: 0, top: 0,
                             width: orig_width, height: orig_height},
                            {left: -rect.left, top: -rect.top,
                             width: orig_width, height: orig_height});
        this.cleanup();
        this.trigger("resize");
    },

    activate: function () {
        this.trigger("activate", this);
    },

    // Return whether this layer is visible, given whether it is active or not.
    is_visible: function (active) {
        var visible = this.get("visible"),
            animated = this.get("animated");
        return visible && (!animated || (animated && active));
    },

    get_position: function () {
        return this.collection.indexOf(this);
    },

    // This should be overridden with the function to update the view.
    update: function () {console.log("Update function missing!");},

    trigger_update: function (rect, temporary) {
        if (!rect) return;
        // add 1 pixel padding
        //rect.left -= 1; rect.top -= 1; rect.width += 2; rect.height += 2;
        rect = this.trim_rect(rect);
        if (rect) {
            if (temporary) {
                this.temporary_rect = rect;
            } else {
                this.last_change = rect;
                this.dirty_rect = Util.union(rect, this.dirty_rect);
            }
            this.trigger("update", rect);
        }
    }
});

OldPaint.Layers = Backbone.Collection.extend({
    model: OldPaint.Layer,
    active: null,
    number: 0,

    initialize: function (spec) {
        _.bindAll(this);
        this.on("activate", this.on_activate);
    },

    on_activate: function (layer) {
        // It can be that the previously active layer has just been removed.
        // In that case we still have the reference, but there's no view.
        if (this.active && this.contains(this.active) && this.active != layer) {
            this.active.clear_temporary();
            this.active.trigger("deactivate");
        }
        this.active = layer;
    },

    // Change the position of one layer in the stack
    move: function (from, to, trigger) {
        tmp = this.at(from);
        this.models.splice(from, 1);
        this.models.splice(to, 0, tmp);
        if (trigger) this.trigger("move", [from, to], this);
    },

    // Overriding the add method to keep track of numbering
    add: function (layer) {
        layer.id = this.number++;
        Backbone.Collection.prototype.add.call(this, [layer]);
    },

    // Overriding the remove method to keep track of active layer
    remove: function (layer) {
        var index = this.indexOf(layer);
        Backbone.Collection.prototype.remove.call(this, [layer]);
        if (this.length > 0) {
            this.at(Math.min(index, this.length-1)).activate();
        }
    },

    // Return the sublist of all animation frames in the stack (order preserved)
    get_animated: function (non_visible) {
        if (non_visible) {
            return this.where({animated: true});
        } else {
            return this.where({animated: true, visible: true});
        }
    }

});


// Part of a Layer, e.g. for storage
OldPaint.Patch = function (source, rect, layerid, palette) {
    this.canvas = Util.copy_canvas(source, rect);
    this.rect = rect;
    this.layerid = layerid;
    this.palette = palette;
};
