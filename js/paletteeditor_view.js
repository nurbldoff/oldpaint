// View for the Palette editor
OldPaint.PaletteEditorView = Backbone.View.extend({
    el: $("#palette_editor"),
    range: {},

    events: {
        //"click .color": "select",
        "mousedown .colors.cell": "on_range_start",
        "mousemove .colors.cell": "on_range",
        "mouseup .colors.cell": "on_range_finish",
        "click #color_spread": "on_spread",
        "click #color_transp": "on_set_transparent"
    },

    initialize: function (spec) {
        _.bindAll(this);
        this.size = spec.size;
        this.model.on("foreground", this.activate);
        this.model.on("change", this.update);

        //$("#color_spread").on("click")
        this.render();
    },

    render: function () {
        console.log("palette render");
        var editor_template = _.template( $("#paletteeditor_template").html(), {});
        this.$el.html(editor_template);

        var palette_template = _.template( $("#palette_template").html(), {
            colors: this.model.colors,
            size: this.size
        });
        $("td.palette").html(palette_template);

        // $("#colorpicker").ColorPicker({
        //     flat: true,
	//     onChange: this.set_color
        // });

        $("div.color_slider").slider({
            range: "min", min: 0, max: 255, value: 60,
            slide: this.update_from_rgb_sliders
	});
        this.update_rgb_sliders(this.model.colors[this.model.foreground]);
        this.update_range();
    },

    update: function (colors) {
        if (colors) {
            _.each(colors, function (color) {
                var index = color[0], rgb = color[1];
                var hex = "#" + Util.colorToHex(rgb);
                var swatch = $("#color" + index);
                swatch.css("background", hex);
                swatch.parent().css("background", hex);
            });
        } else {
            this.render();
        }
    },

    update_rgb_sliders: function (color) {
        $("#color_slider_r").slider("value", color.r);
        $("#color_slider_g").slider("value", color.g);
        $("#color_slider_b").slider("value", color.b);
        this.update_rgb_values(color);
    },

    update_rgb_values: function (color) {
        $("#color_value_r").attr("value", color.r);
        $("#color_value_g").attr("value", color.g);
        $("#color_value_b").attr("value", color.b);
    },

    update_from_rgb_sliders: function (event, ui) {
        var red = $("#color_slider_r").slider("value");
        var green = $("#color_slider_g").slider("value");
        var blue = $("#color_slider_b").slider("value");
        var id = ui.handle.parentNode.id;
        switch(id[13]) {
        case "r":
            red = ui.value;
            break;
        case "g":
            green = ui.value;
            break;
        case "b":
            blue = ui.value;
            break;
        }
        var color = {r: red, g: green, b: blue};
        this.update_rgb_values(color);
        this.set_color(color);
    },

    update_range: function () {
        $colors = $(".colors.cell");
        $colors.removeClass("range start end");
        if (this.range) {
            var start = Math.min(this.range.start, this.range.end);
            var end = Math.max(this.range.start, this.range.end);
            $($colors[start]).addClass("range start");
            for (var i=start+1; i<=end-1; i++) {
                $($colors[i]).addClass("range");
                console.log("setting range", i);
            }
            $($colors[end]).addClass("range end");
        }
    },

    set_color: _.throttle(function (rgb) {
        this.model.change_color(this.model.foreground, rgb);
    }, 200),

    on_spread: function (event) {
        if (this.range) {
            var n = this.range.end - this.range.start;
            var start_color = this.model.colors[this.range.start];
            var end_color = this.model.colors[this.range.end];
            var r_delta = (end_color[0] - start_color[0]) / n;
            var g_delta = (end_color[1] - start_color[1]) / n;
            var b_delta = (end_color[2] - start_color[2]) / n;
            var index, colors = [];
            for (var i=0; i < n; i++) {
                index = this.range.start + i;
                var rgb = {r: Math.round(start_color[0] + i*r_delta),
                           g: Math.round(start_color[1] + i*g_delta),
                           b: Math.round(start_color[2] + i*b_delta)};
                this.model.change_color(index, rgb, true);
                colors.push([index, rgb]);
            }
            this.model.trigger("change", colors);
        }
    },

    on_range_start: function (event) {
        var el = event.currentTarget;
        this.range.start = parseInt($(el).attr("data"));
    },

    on_range: function (event) {
        if (event.which === 1) {
            var el = event.currentTarget;
            var index = parseInt($(el).attr("data"));
            this.range.end = index;
            console.log("range end:", index);
            this.update_range();
        }
    },

    on_range_finish: function (event) {
        var el = event.currentTarget;
        var index = parseInt($(el).attr("data"));
        if (index === this.range.start) {
            if (event.which == 1) {
                this.model.set_foreground(index);
            } else {
                this.model.set_background(index);
            }
            this.range = {};
        } else {
            var start = Math.min(this.range.start, this.range.end);
            var end = Math.max(this.range.start, this.range.end);
            this.range.start = start;
            this.range.end = end;
            this.model.range = _.range(this.range.start, this.range.end+1);
        }
        this.update_range();
        console.log("range end:", index);
    },

    on_set_transparent: function (event) {
        if (event.which == 1) {
            if (this.model.colors[this.model.foreground][3] === 0) {
                this.model.change_color(this.model.foreground, {a: 255});
            } else {
                this.model.change_color(this.model.foreground, {a: 0});
            }
        }
        this.model.trigger("change");
    },

    activate: function (index) {
        console.log("activate:", index);
        $(".color.active").removeClass("active");
        $("#color" + index).addClass("active");
        var color = this.model.colors[index];
        var rgb = {r: color[0], g: color[1], b: color[2]};
        $("#colorpicker").ColorPickerSetColor(rgb);
        this.update_rgb_sliders(rgb);
    }

});
