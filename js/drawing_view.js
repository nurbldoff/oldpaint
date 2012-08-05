/* This is the main drawing view.
 * Drawing and key press events are handled here. */

OldPaint.DrawingView = Backbone.View.extend({

    el: $("#drawing_container"),
    active_layer: null,
    zoom: 0,
    window: {scale: 1,
             offset: Util.pos(0, 0)},
    base_offset: Util.pos(0, 0),
    stroke: null,
    topleft: Util.pos(0, 0),

    cursor: {
        image: $("#cursor"),
        offset: {x: 10, y: 10}
    },

    events: {
        "mouseover": "show_cursor",
        "mouseout": "hide_cursor",
        "mousedown": "begin_stroke",
        "mousemove": "update_stroke",
        "mouseup": "end_stroke",
        "mousewheel": "wheel_zoom"
    },

    initialize: function (options) {
        _.bindAll(this);
        this.topleft = this.$el.offset();
        this.cursor.image.hide();
        this.center();

        $(window).resize(true, this.render);  // dowsn't work?!

        // Keyboard bindings.
        var model = this.model;
        Mousetrap.bind("-", this.zoom_out);
        Mousetrap.bind("+", this.zoom_in);
        Mousetrap.bind("z", this.model.undo);
        Mousetrap.bind("y", this.model.redo);

        // Layer key actions
        Mousetrap.bind("l a", function () {model.add_layer(true);});
        Mousetrap.bind("l d", function () {
            model.remove_layer(model.layers.active);
        });

        Mousetrap.bind("del", function () {
            model.clear_layer(model.layers.active, model.palette.background2);
        });
        Mousetrap.bind("v", function () {
            model.layers.active.set(
                "visible", !model.layers.active.get("visible"));
        });
        Mousetrap.bind("a", function () {
            model.layers.active.set(
                "animated", !model.layers.active.get("animated"));
        });
        Mousetrap.bind("x", function () {  // previous layer
            var index = model.layers.indexOf(model.layers.active);
            var new_index = index == 0 ? model.layers.length - 1 : index - 1;
            model.layers.at(new_index).activate();
        });
        Mousetrap.bind("c", function () {  // next animation frame
            var index = model.layers.indexOf(model.layers.active);
            var new_index = index == model.layers.length - 1 ? 0 : index + 1;
            model.layers.at(new_index).activate();
        });
        Mousetrap.bind("s", function () {  // previous animation frame
            var frames = model.layers.get_animated();
            if (frames.length > 1) {
                var index = _.indexOf(frames, model.layers.active);
                var new_index = index == 0 ? frames.length - 1 : index - 1;
                (frames[new_index]).activate();
            }
        });
        Mousetrap.bind("d", function () {  // next animation frame
            var frames = model.layers.get_animated();
            if (frames.length > 1) {
                var index = _.indexOf(frames, model.layers.active);
                var new_index = index == frames.length - 1 ? 0 : index + 1;
                (frames[new_index]).activate();
            }
        });

        this.model.layers.on("add", this.on_layer_added);
        this.model.layers.on("move", this.on_layer_reordered);

        this.model.on("resize", this.render);
        this.model.on("selection", this.make_selection);
        this.model.on("selection_done", this.edit_selection);
        this.model.on("load", this.on_load);

        this.model.palette.on("foreground", this.update_brush);
        this.model.palette.on("change", this.on_palette_changed);
        //this.model.layers.on("stroke", this.on_stroke);

        $("#resize_image").on("click", this.resize_image);
        $("#load_image").on("click", this.load_popup);
        $("#save_image").on("click", this.save_popup);

        $("#save_local").on("click", this.model.save_ora_local);
        $("#load_local").on("click", function (e) {
            e.preventDefault();
            $('#files').click();
        });
        $('#files').on('change', this.handle_file_select);

        $("#convert_image").on("click", this.on_convert_image);

    },

    handle_file_select: function (evt) {
        console.log("files changed...");
        var files = evt.target.files; // FileList object

        if (files.length > 0) {
            var f = files[0];
            console.log("file type:", f.type);
            var reader = new FileReader();
            if (f.type.match('image/png')) {
                reader.onload = this.load_png_file;
            } else {
                reader.onload = this.load_ora_file;
            }
            reader.readAsDataURL(f);
            this.model.name = f.name;
        }
    },

    load_png_file: function (e) {
        console.log(e);
        //Util.load_base64_png(e.target.result.slice(22), this.model.load);
        this.model.load(e.target.result.slice(22), Util.load_png);
    },

    load_ora_file: function (e) {
        this.model.load(e.target.result, Util.load_ora);
    },

    on_load: function () {
        this.render(true);
        this.center();
    },

    update_scale: function() {
        this.window.scale = Math.pow(2, this.zoom);
    },

    // Center the drawing on screen
    center: function () {
        var offs = $("#drawing_window").offset();
        this.center_on_image_pos(
            {x: Math.round(this.model.get("width") / 2),
             y: Math.round(this.model.get("height") / 2)},
            {x: Math.round($("#drawing_window").width() / 2) + offs.left,
             y: Math.round($("#drawing_window").height() / 2) + offs.top});
        this.render();
    },

    render: function (update_image) {
        console.log("render drawing");
        this.topleft = this.$el.offset();
        this.model.layers.each(function (layer, index) {
            console.log("redrawing layer:", layer.cid);
            if (update_image) {
                layer.image.updateCanvas();
            }
            layer.trigger("redraw", false);
        });
        // Position the "frame"
        var negoffset = {x: Math.min(0, this.window.offset.x),
                         y: Math.min(0, this.window.offset.y)};
        var posoffset = {x: Math.max(0, this.window.offset.x),
                         y: Math.max(0, this.window.offset.y)};

        var left = Math.max(0, this.window.offset.x);
        var top = Math.max(0, this.window.offset.y);
        var width = this.model.get("width") * this.window.scale + negoffset.x;
        var height = this.model.get("height") * this.window.scale + negoffset.y;

        // console.log("render drawing:", left, top, width, height,
        //             Math.max(0, Math.min(this.$el.width() - posoffset.x, width)),
        //             Math.max(0, Math.min(this.$el.height() - posoffset.y, height))
        //            );

        $("#drawing_frame").css({
            left: left, top: top,
            width: Math.max(
                0, Math.min(this.$el.width() - posoffset.x, width)),
            height: Math.max(
                0, Math.min(this.$el.height() - posoffset.y, height))
        });
        $("#drawing_frame").css("background-position",
                                negoffset.x + "px " + negoffset.y + "px");

        if (this.model.selection) {
            this.make_selection(this.model.selection);
            this.edit_selection();
        }
    },

    // Callback for when the user changes the palette
    on_palette_changed: function (colors) {
        // Here might be some logic to only update layers that use the
        // changed colors, perhaps even only the relevant parts, etc...
        if (this.model.image_type === OldPaint.IndexedImage) {
            this.render(true);
        }
    },

    // Callback for when a layer has been added
    on_layer_added: function (layer, options) {
        var layerview = new OldPaint.LayerView({model: layer, window: this.window});
        console.log("added layerview");
        $("#layers_container").append(layerview.el);
        this.render();
    },

    // Callback for when the user changes the position of a layer in
    // the stack
    on_layer_reordered: function (from, to) {
        var layer_views = $("#layers_container").children("canvas");
        var $from_layer = $(layer_views[from]);
        var $to_layer = $(layer_views[to]);
        $from_layer.remove();
        if ($to_layer.index() == to) {
            $from_layer.insertBefore($to_layer);
        } else {
            $from_layer.insertAfter($to_layer);
        }
    },

    on_convert_image: function (event) {
        this.model.convert_to_rgb_type();
    },

    // Show the drawiung cursor
    show_cursor: function (event) {
        this.cursor.image.show();
        if (!this.stroke) {
            OldPaint.active_brushes.active.set_color(this.model.palette.foreground);
        }
    },

    hide_cursor: function (event) {
        this.cursor.image.hide();
        this.model.layers.active.clear_temporary();
    },

    update_brush: function (index, rgb) {
        OldPaint.active_brushes.active.set_color(index);
    },

    // Update the position of the mouse pointer and draw brush preview
    update_cursor: function (event, stroke) {
        this.cursor.image.offset(
            {top: event.clientY - this.cursor.offset.x,
             left: event.clientX - this.cursor.offset.y});
        var coords = Util.image_coords(
            Util.event_coords(event, this.topleft),
            this.window.offset, this.window.scale);
        if (this.stroke && this.stroke.start) {
            coords.x = Math.abs(coords.x - this.stroke.start.x) + 1;
            coords.y = Math.abs(coords.y - this.stroke.start.y) + 1;
        } else {
            if (OldPaint.tools.active.preview_brush) {
                // Draw the brush preview
                this.model.preview_brush(OldPaint.active_brushes.active,
                                         this.model.palette.foreground, coords);
            }
        }
        this.model.update_coords(coords);
    },

    // Callback for when the user presses a mouse button on the canvas
    begin_stroke: function (event) {
        // console.log("Start stroke",
        //             this.stroke.start.x, this.stroke.start.y);
        this.base_offset.x = this.window.offset.x;
        this.base_offset.y = this.window.offset.y;
        var offset = Util.event_coords(event, this.topleft);
        this.stroke = {
            button: event.which,
            offset: offset,
            pos: Util.image_coords(offset, this.window.offset,
                                   this.window.scale),
            shift: event.shiftKey,
            brush: OldPaint.active_brushes.active
        };
        this.stroke.start = this.stroke.last = this.stroke.pos;
        $(".fg").css({"pointer-events": "none"});
        switch (this.stroke.button) {
        case 1:  // Drawing
            this.model.before_draw(OldPaint.tools.active, this.stroke);
            this.stroke.draw = true;
            this.stroke.color =
                // active_brushes.active instanceof ImageBrush ? false :
                this.model.palette.foreground;
            //this.stroke.brush.set_color(this.stroke.color, true);
            this.model.draw(OldPaint.tools.active, this.stroke);
            break;
        case 3:  // Erasing
            this.model.before_draw(OldPaint.tools.active, this.stroke);
            this.stroke.draw = true;
            this.stroke.color = this.model.palette.background;
            this.stroke.brush.set_color(this.stroke.color, true);
            this.model.draw(OldPaint.tools.active, this.stroke);
            break;
        }
    },

    // Callback for when the user is moving the mouse
    update_stroke: function (event) {
        this.update_cursor(event);
        if (this.stroke && !_.include(["floodfill"], OldPaint.tools.active)) {
            var cpos = Util.event_coords(event, this.topleft);
            this.stroke.pos = Util.image_coords(cpos, this.window.offset,
                                                this.window.scale);
            if (this.stroke.draw) {
                this.model.draw(OldPaint.tools.active, this.stroke);
            } else {
                this.update_offset({
                    x: this.base_offset.x + cpos.x - this.stroke.offset.x,
                    y: this.base_offset.y + cpos.y - this.stroke.offset.y});
                this.render();
            }
            this.stroke.last = this.stroke.pos;
            this.stroke.shift = event.shiftKey;
        }
    },

    // Callback for when letting go of a mouse button
    end_stroke: function (event) {
        console.log("End stroke");
        if (this.stroke.draw) {
            this.model.after_draw(OldPaint.tools.active, this.stroke);
        }
        this.stroke = null;
        $(".fg").css({"pointer-events": "auto"});
    },

    resize_image: function () {
        var resize = function () {
            console.log("Resize...");
            this.model.resize(this.model.selection);
            this.model.set_selection();
        };
        resize = _.bind(resize, this);
        this.model.set_selection({
            left: 0, top: 0, width: this.model.get("width"),
            height: this.model.get("height")
        }, resize);
        this.edit_selection();
    },

    // Visualize the selection rectangle
    make_selection: function (begin) {
        if (this.model.selection) {
            if (begin) {
                var template = _.template( $("#selection_template").html(), {});
                $("#selection").html(template);
            }
            var rect = this.model.selection;
            var start = Util.canvas_coords({x: rect.left, y: rect.top},
                                           this.window.offset,
                                           this.window.scale);
            var end = Util.canvas_coords({x: rect.left + rect.width,
                                          y: rect.top + rect.height},
                                         this.window.offset,
                                         this.window.scale);
            $("#selection_main").css({left: start.x - 10,
                                      top: start.y - 10,
                                      width: end.x - start.x + 20,
                                      height: end.y - start.y + 20});
            $(".selection.frame").css({width: end.x - start.x,
                                       height: end.y - start.y});
        } else {
            $("#selection").empty();
        }
    },

    // Make the selection editable
    edit_selection: function () {
        $("#selection_block").css(
            {visibility: "visible"}).unbind(
            ).on("mousedown", this.begin_scroll
                ).on("mousemove", this.scroll
                    ).on("mouseup", this.end_scroll
                        ).on("click", this.model.selection.action);
        $(".selection.handle").css(
            {visibility: "visible",
             "pointer-events": "auto"}
        ).on("mousedown", this, function (event) {
            $(".selection.handle").css("pointer-events", "none");
            $("#selection_block").on("mousemove", this,
                                     event.data.resize_selection);
            $("#selection_block").on("mouseup",
                                     event.data.resize_selection_done);
        });
    },

    begin_scroll: function (event) {
        if (event.which == 2) {this.begin_stroke(event);};
    },

    scroll: function (event) {
        if (event.which == 2) {this.update_stroke(event);};
    },

    end_scroll: function (event) {
        if (event.which == 2) {this.end_stroke(event);};
    },

    resize_selection: function (event) {
        var cpos = Util.event_coords(event, this.topleft);
        var ipos = Util.image_coords(cpos, this.window.offset,
                                     this.window.scale);
        // if (!event.data.start_pos) {
        //     event.data.start_pos = ipos;
        //     event.data.start_selection = Util.copy(this.model.selection);
        // }
        if (!event.data.last_pos) {
            event.data.last_pos = ipos;
            event.data.last_selection = Util.copy(this.model.selection);
        }
        var delta = Util.subtract(ipos, event.data.last_pos);
        event.data.last_pos = ipos;
        console.log("Delta:", delta.x, delta.y);
        var selection = event.data.last_selection;
        switch (event.data.id) {
        case "selection_botright":
            this.model.set_selection(
                {left: selection.left,
                 top: selection.top,
                 width: selection.width + delta.x,
                 height: selection.height + delta.y});
            break;
        case "selection_topright":
            this.model.set_selection(
                {left: selection.left,
                 top: selection.top + delta.y,
                 width: selection.width + delta.x,
                 height: selection.height - delta.y});
            break;
        case "selection_topleft":
            this.model.set_selection(
                {left: selection.left + delta.x,
                 top: selection.top + delta.y,
                 width: selection.width - delta.x,
                 height: selection.height - delta.y});
            break;
        case "selection_botleft":
            this.model.set_selection(
                {left: selection.left + delta.x,
                 top: selection.top,
                 width: selection.width - delta.x,
                 height: selection.height + delta.y});
            break;
        }
        event.data.last_selection = Util.copy(this.model.selection);
    },

    resize_selection_done: function (event) {
        this.edit_selection();
    },

    finish_selection: function (event) {
        if (event.which == 1) {
            console.log("Finishing selection");
            var layer = this.model.layers.active;
            var brush = new ImageBrush({
                patch: layer.make_patch(this.model.selection)});
            OldPaint.user_brushes.add(brush);
            OldPaint.user_brushes.set_active(brush);
            $("#selection").empty();
        }
    },

    update_offset: function (offset) {
        this.window.offset = {x: Math.floor(offset.x), y: Math.floor(offset.y)};
    },

    // Center the display on a certain image coordinate
    center_on_image_pos: function (ipos, cpos) {
        //var scale = this.get_scale();
        console.log("centering on:", ipos.x, ipos.y, cpos.x, cpos.y);
        offset = {x: Math.round(cpos.x - (ipos.x + 0.5) * this.window.scale),
                  y: Math.round(cpos.y - (ipos.y + 0.5)* this.window.scale)};
        console.log("offset:", offset.x, offset.y);
        this.update_offset(offset);
    },

    set_zoom: function (zoom, center_pos) {
        console.log("center_pos", center_pos);
        var image_pos = Util.image_coords(center_pos, this.window.offset,
                                          this.window.scale);
        this.zoom = Math.max(-3, Math.min(5, zoom));
        this.update_scale();
        this.center_on_image_pos(image_pos, center_pos);
        this.render();
    },

    zoom_in: function (event, center_mouse) {
        var canvas_pos;
        if (center_mouse) {
            canvas_pos = Util.event_coords(event, this.topleft);
        } else {
            canvas_pos = { x: Math.floor(this.$el.width() / 2),
                           y: Math.floor(this.$el.height() / 2) };
        }
        this.set_zoom(this.zoom + 1, canvas_pos);
    },

    zoom_out: function (event, center_mouse) {
        var canvas_pos;
        if (center_mouse) {
            canvas_pos = Util.event_coords(event, this.topleft);
        } else {
            canvas_pos = { x: Math.floor(this.$el.width() / 2),
                           y: Math.floor(this.$el.height() / 2)};
        }
        this.set_zoom(this.zoom - 1, canvas_pos);
    },

    wheel_zoom: function (event, delta, deltaX, deltaY) {
        switch (deltaY) {
        case 1: this.zoom_in(event, true); break;
        case -1: this.zoom_out(event, true); break;
        }
    },

    // Show the file selector for loading an image
    load_popup: function (event) {
        console.log("popup");
        modalPopup( Util.clean_path("list/" + current_dir), this.model );
    },

    // Show the file selector for saving an image
    save_popup: function (event) {
        console.log("popup");
        modalPopup( Util.clean_path("list/" + current_dir), this.model, true );
    },

    // Obsolete, should be removed
    on_keypress: function (event) {
        console.log("key", event.which);
        switch (event.which) {
        case "-".charCodeAt(0): this.zoom_out(event); break;
        case "+".charCodeAt(0): this.zoom_in(event);  break;
        case "z".charCodeAt(0): this.model.undo(); break;
        case "y".charCodeAt(0): this.model.redo(); break;
            // case "s".charCodeAt(0):
            //     this.model.layers.active.image.make_png();
            //     break;

            // === Layers ===
            // case "a".charCodeAt(0): this.model.add_layer(true); break;
            // case "d".charCodeAt(0):
            //     this.model.remove_layer(this.model.layers.active);
            //     break;
        case "v".charCodeAt(0):
            this.model.layers.active.set(
                "visible", !this.model.layers.active.get("visible"));
            break;
        case "a".charCodeAt(0):
            this.model.layers.active.set(
                "animated", !this.model.layers.active.get("animated"));
            break;
        case "x".charCodeAt(0):  // previous layer
            var index = this.model.layers.indexOf(this.model.layers.active);
            var new_index = index == 0 ? this.model.layers.length - 1 : index - 1;
            this.model.layers.at(new_index).activate();
            break;
        case "c".charCodeAt(0):  // next animation frame
            var index = this.model.layers.indexOf(this.model.layers.active);
            var new_index = index == this.model.layers.length - 1 ? 0 : index + 1;
            this.model.layers.at(new_index).activate();
            break;
        case "s".charCodeAt(0):  // previous animation frame
            var frames = this.model.layers.get_animated();
            if (frames.length > 1) {
                var index = _.indexOf(frames, this.model.layers.active);
                var new_index = index == 0 ? frames.length - 1 : index - 1;
                (frames[new_index]).activate();
            }
            break;
        case "d".charCodeAt(0):  // next animation frame
            var frames = this.model.layers.get_animated();
            console.log("frames", frames);
            if (frames.length > 1) {
                var index = _.indexOf(frames, this.model.layers.active);
                var new_index = index == frames.length - 1 ? 0 : index + 1;
                (frames[new_index]).activate();
            }
            break;
        }
    }
});
