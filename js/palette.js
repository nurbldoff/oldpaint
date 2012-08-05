OldPaint.Palette =  Backbone.Model.extend ({
    colors: null,
    foreground: 1,
    background: 0,

    initialize: function (spec) {
        this.colors = spec.colors || [[0, 0, 0, 0], [0, 0, 0, 255]];
        if (spec.transparent) {
            _.each(spec.transparent, function (value, index) {
                this.colors[value][3] = 0;
            }, this);
        }
    },

    change_color: function (index, rgba, silent) {
        this.colors[index][0] = rgba.r >= 0 ? rgba.r : this.colors[index][0];
        this.colors[index][1] = rgba.g >= 0 ? rgba.g : this.colors[index][1];
        this.colors[index][2] = rgba.b >= 0 ? rgba.b : this.colors[index][2];
        this.colors[index][3] = rgba.a >= 0 ? rgba.a : this.colors[index][3];
        if (!silent) {
            this.trigger("change", [[index, Util.rgb(this.colors[index])]]);
            console.log("changing", index, rgba, this.colors[index]);
        }
    },

    set_colors: function (colors) {
        this.colors = colors;
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
