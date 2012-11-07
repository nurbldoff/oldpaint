// A brush is an Image that can be drawn *with*
OldPaint.Brush = OldPaint.Image.extend ({
    color: null,
    preview: null,  // used to show the brush in the tool button

    initialize: function (spec) {
        OldPaint.Brush.__super__.initialize.apply(this, [spec]);
        this.type = spec.type;
        this.color = spec.color;
    },

    activate: function () {
        this.trigger("activate", this);
    },

    set_color: function (color) {

        this.make_backup();
        this.color = color;
        this.image.colorize(color, true);
    }

});

// A Brush containing an ellipse of the given radii
OldPaint.EllipseBrush = OldPaint.Brush.extend ({
    initialize: function (spec) {
        this.spec = spec;
        OldPaint.EllipseBrush.__super__.initialize.apply(
            this, [{width: spec.width * 2 + 1,
                    height: spec.height * 2 + 1,
                    color: spec.color,
                    image_type: spec.image_type}]);
        this.draw_ellipse({x: spec.width, y:spec.height},
                          {x: spec.width, y: spec.height},
                          null, this.color, true);
        this.preview = Util.copy_canvas(this.image.get_data());
        this.image.palette = spec.palette;
        this.set_color(spec.color);
        this.make_backup();
    },

    get_info: function () {
        return "Brush: ellipse, " + this.spec.width + "x" + this.spec.height;
    }

});

// A Brush filled with a rectangle
OldPaint.RectangleBrush = OldPaint.Brush.extend ({
    initialize: function (spec) {
        var palette = spec.palette;
        this.spec = spec;
        spec.palette = undefined;
        OldPaint.RectangleBrush.__super__.initialize.apply(this, [spec]);
        this.draw_rectangle({x: 0, y: 0},
                            {x: spec.width, y: spec.height},
                            null, this.color, true);
        this.preview = Util.copy_canvas(this.image.get_data());
        this.image.palette = palette;
        this.set_color(spec.color);
        this.make_backup();
    },

    get_info: function () {
        return "Brush: rectangle, " + this.spec.width + "x" + this.spec.height;
    }
});

// A Brush created from a Patch
OldPaint.ImageBrush = OldPaint.Brush.extend ({
    initialize: function (spec) {
        this.spec = {width: spec.patch.rect.width, height: spec.patch.rect.height,
                     patch: spec.patch, color: 1, palette: spec.patch.palette,
                     image_type: spec.image_type, type: spec.type};

        OldPaint.ImageBrush.__super__.initialize.apply(this, [this.spec]);
        // If it is an indexed, we need to fix the transparency
        if (this.image.updateAlpha)
            this.image.updateAlpha();
        this.preview = Util.copy_canvas(this.image.canvas);
        this.make_backup();
    },

    set_color: function (color, force) {
        console.log("brush set_color", color, force);
        this.color = color;
        if (force)
            this.image.colorize(color, true);
        this.trigger("change");
    },

    flip_x: function () {
        OldPaint.Layer.__super__.flip_x.apply(this);
        this.make_backup();
        this.trigger("change");
    },

    flip_y: function () {
        OldPaint.Layer.__super__.flip_y.apply(this);
        this.make_backup();
        this.trigger("change");
    },

    get_info: function () {
        return "Brush: user defined, " + this.spec.width + "x" + this.spec.height;
    }

});

OldPaint.Brushes = Backbone.Collection.extend ({
    model: OldPaint.Brush,
    previous: null,
    max_n: 3,

    initialize: function (options) {
        _.bindAll(this);
        this.on("activate", this.on_activate);  // catch if a model gets activated
    },

    on_activate: function (brush) {
        console.log("set_active", this.models.length);
        this.previous = this.active;
        this.active = brush;
    },

    add: function (brush, type) {
        OldPaint.Brushes.__super__.add.apply(this, [brush]);
        // If there are already max number of brushes, remove the oldest
        var user_brushes = this.where({type: "user"});
        if (user_brushes.length > this.max_n) {
            this.remove(user_brushes[0]);
        }
    }
});
