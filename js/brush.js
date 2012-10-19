// A brush is an Image that can be drawn *with*
OldPaint.Brush = OldPaint.Image.extend ({
    color: null,
    preview: null,  // used to show the brush in the tool button

    initialize: function (spec) {
        OldPaint.Brush.__super__.initialize.apply(this, [spec]);
        this.type = spec.type;
        this.color = spec.color;
    },

    activate: function () {this.trigger("activate", this);},

    set_color: function (color) {
        this.make_backup();
        this.color = color;
        this.image.colorize(color);
    }

});

// A Brush containing an ellipse of the given radii
OldPaint.EllipseBrush = OldPaint.Brush.extend ({
    initialize: function (spec) {
        console.log("ellipsebrush:", spec);
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
    }
});

// A Brush filled with a rectangle
OldPaint.RectangleBrush = OldPaint.Brush.extend ({
    initialize: function (spec) {
        console.log("rectanglebrush:", spec);
        var palette = spec.palette;
        spec.palette = undefined;
        OldPaint.RectangleBrush.__super__.initialize.apply(this, [spec]);
        this.draw_rectangle({x: 0, y: 0},
                            {x: spec.width, y: spec.height},
                            null, this.color, true);
        this.preview = Util.copy_canvas(this.image.get_data());
        this.image.palette = palette;
        this.set_color(spec.color);
        this.make_backup();
    }
});

// A Brush created from a Patch
OldPaint.ImageBrush = OldPaint.Brush.extend ({
    initialize: function (spec) {
        console.log("imagebrush:", spec);
        var spec2 = {width: spec.patch.rect.width, height: spec.patch.rect.height,
                     patch: spec.patch, color: 1, palette: spec.patch.palette,
                     image_type: spec.image_type, type: spec.type};
        console.log("ImageBrush:", spec2);
        OldPaint.ImageBrush.__super__.initialize.apply(this, [spec2]);
        this.preview = Util.copy_canvas(this.image.canvas);
    },

    set_color: function (color, force) {
        this.color = color;
        if (force) {
            this.make_backup();
            this.image.colorize(color);
        }
    }
});

OldPaint.Brushes = Backbone.Collection.extend ({
    model: OldPaint.Brush,
    previous: null,
    max_n: 3,

    initialize: function () {
        this.on("activate", this._set_active);
    },

    _set_active: function (brush) {
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
