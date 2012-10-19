// Part of a layer
OldPaint.Patch = function (source, rect, layerid, palette) {
    console.log("Patch:", rect, source, layerid, palette);
    this.canvas = Util.copy_canvas(source, rect);
    this.rect = rect;
    this.layerid = layerid;
    this.palette = palette;
};

// A Layer is an Image, and a number of Layers stacked on each
// other make up (essentially) a Drawing.
OldPaint.Layer = OldPaint.Image.extend ({
    image: null,
    backup: null,
    dirty_rect: null,
    temporary_rect: null,
    last_change: null,
    last_brush_position: {x: 0, y:0},

    defaults: {
        visible: true,
        animated: false
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
                true, temporary);
        }
    },

    draw_line: function (start, end, brush, color, temporary) {
        this.trigger_update(
            OldPaint.Layer.__super__.draw_line.apply(this, arguments),
            true, temporary);
    },
    draw_rectangle: function (topleft, size, brush, color, filled, temporary) {
        this.trigger_update(
            OldPaint.Layer.__super__.draw_rectangle.apply(this, arguments),
            true, temporary);
    },

    draw_ellipse: function (center, radii, brush, color, filled, temporary) {
        this.trigger_update(
            OldPaint.Layer.__super__.draw_ellipse.apply(this, arguments),
            true, temporary);
    },

    draw_fill: function (start, color) {
        this.trigger_update(
            OldPaint.Layer.__super__.draw_fill.apply(this, arguments), true);
    },

    draw_gradientfill: function (start, colors) {
        this.trigger_update(
            OldPaint.Layer.__super__.draw_gradientfill.apply(this, arguments),
            true);
    },

    draw_clear: function () {
        this.temporary_rect = null;
        this.trigger_update(
            OldPaint.Layer.__super__.draw_clear.apply(this), true);
        this.cleanup();
    },

    draw_patch: function (patch, position) {
        this.trigger_update(
            OldPaint.Layer.__super__.draw_patch.apply(this, arguments), true);
    },

    draw_other_layer: function (layer) {
        var rect = {left: 0, top: 0, width: this.image.canvas.width,
                    height: this.image.canvas.height};
        var patch = layer.make_patch(rect);
        this.trigger_update(
            this.draw_patch(patch, rect, true),
            true);
        this.make_backup();
        this.cleanup();
    },

    flip_x: function () {
        this.clear_temporary();
        this.trigger_update(OldPaint.Layer.__super__.flip_x.apply(this), true);
        this.cleanup();
    },

    flip_y: function () {
        this.clear_temporary();
        this.trigger_update(OldPaint.Layer.__super__.flip_y.apply(this), true);
        this.cleanup();
    },


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
    cleanup: function () {
        var rect = this.dirty_rect;
        this.dirty_rect = null;
        if (rect) {
            if (this.image.updateAlpha) this.image.updateAlpha(rect);
            this.trigger_update(rect);
        }
        this.make_backup();
        this.trigger("redraw_preview");
        return rect;
    },

    resize: function (rect) {
        console.log("resize:", rect);
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
        this.make_backup();
        this.cleanup();
    },

    activate: function () {
        this.trigger("activate", this);
    },

    // This should be overridden with the function to update the view.
    update: function () {console.log("Update function missing!");},

    trigger_update: function (rect, clear, temporary) {
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
            this.update(rect, clear);
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
        if (this.active && this.active != layer) {
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
        if (trigger) this.trigger("move", from, to);
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
