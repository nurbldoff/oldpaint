OldPaint.Palette =  Backbone.Model.extend ({
    colors: null,
    foreground: 1,
    background: 0,

    initialize: function (spec) {
        this.colors = spec.colors || [[0, 0, 0, 0], [0, 0, 0, 255]];
        this.colors32 = new Uint32Array(256);
        if (spec.transparent) {
            _.each(spec.transparent, function (value, index) {
                this.colors[value][3] = 0;
            }, this);
        }
        this._update_color32();
    },

    // Change a particular color, optionally without triggering an event
    change_color: function (index, rgba, silent) {
        // Only set the channels that are defined. Is this unsafe?
        this.colors[index][0] = rgba.r >= 0 ? rgba.r : this.colors[index][0];
        this.colors[index][1] = rgba.g >= 0 ? rgba.g : this.colors[index][1];
        this.colors[index][2] = rgba.b >= 0 ? rgba.b : this.colors[index][2];
        // Check if the transparency is changing
        var transparency = false;
        if (rgba.a === 0 || this.colors[index][3] === 0) {
            this.colors[index][3] = rgba.a;
            transparency = true;
        }
        this._update_color32(index);
        if (!silent) {
            this.trigger("change", [{index: index, rgba: Util.rgb(this.colors[index])}]);
            console.log("changing", index, rgba, this.colors[index]);
            if (transparency) this.trigger("transparency");
        }
    },

    _update_color32: function (index) {
        var color;
        if (index) {
            color = this.colors[index];
            this.colors32[index] =
                (color[3] << 24) |
                (color[2] << 16) |
                (color[1] << 8) |
                color[0];
        } else {
            for (var i=0; i<this.colors.length; i++) {
                color = this.colors[i];
                this.colors32[i] =
                    (color[3] << 24) |
                    (color[2] << 16) |
                    (color[1] << 8) |
                    color[0];
            }
        }
    },

    set_colors: function (colors) {
        for (var i=0; i<colors.length; i++) {
            if (colors[i][3] === undefined)
                colors[i][3] = 255;
        }
        this.colors = colors;
        this._update_color32();
        this.trigger("change");
    },

    set_foreground: function (index) {
        this.foreground = index;
        this.trigger("foreground", this.foreground);
    },

    set_background: function (index) {
        this.background = index;
        this.trigger("background", this.background);
    },

    set_range: function (range) {
        this.range = range;
        this.trigger("range", range);
    }

});
