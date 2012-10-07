/* This is the main drawing view.
 * Drawing and key press events are handled here. */

OldPaint.DrawingView = Backbone.View.extend({

    el: $("#drawing"),
    active_layer: null,
    zoom: 0,
    window: {scale: 1,
             offset: Util.pos(0, 0)},
    base_offset: Util.pos(0, 0),
    stroke: null,
    topleft: Util.pos(0, 0),

    events: {
        "mousedown": "begin_stroke",
        //"mousemove": "update_stroke",
        "mouseup": "end_stroke",
        "mousewheel": "wheel_zoom"
    },

    initialize: function (options) {
        _.bindAll(this);

        // Load settings from local storage
        LocalStorage.request(LocalStorage.read_txt,
                             {path: "", name: "settings.json",
                              on_load: this.load_settings});

        this.topleft = this.$el.offset();
        this.center();

        $(window).resize({redraw: true}, this.render);  // dowsn't work?!

        // Bind the time critical mousemove directly instead of using Backbone
        var el = document.getElementById('drawing');
        el.onmousemove = this.update_stroke;

        // Let's save to local storage periodically
        // TODO: the save system should be smart enough to e.g. only save layers that
        // have been changed since last save.
        //var intervalID = setInterval(this.save_internal, 60000);

        // === Menu ===
        // Items are defined by name and function
        // Keyboard shortcut is the first Uppercase letter in the name,
        // don't put overlapping keybindings in the same level!
        var menu = {
            Drawing: {
                reName: this.rename,
                Load: this.load_popup,
                Save: this.save_internal,
                Import: this.load,
                Export: {
                    PNG: this.save_as_png,
                    ORA: this.save_as_ora
                },
                Resize: this.resize_image
            },
            Layer: {
                Add: function () {this.model.add_layer(true);},
                Delete: function () {
                    this.model.remove_layer(this.model.layers.active);
                },
                Flip: {
                    "Horizontally": this.model.flip_layer_horizontal,
                    "Vertically": this.model.flip_layer_vertical
                }
            },
            Brush: {
                Flip: {
                    "Horizontally": this.brush_flip_x,
                    "Vertically": this.brush_flip_y
                },
                Colorize: this.brush_colorize
            }
        };

        // Keyboard bindings.
        var model = this.model;
        var keybindings = [
            ["return", function () {this.show_menu(menu)}],

            ["-", this.zoom_out, "Zoom out."],
            ["+", this.zoom_in, "Zoom in."],
            ["z", this.model.undo, "Undo last change."],
            ["y", this.model.redo, "Redo last undo."],

            ["r", function () {this.model.redraw();}, "Redraw the screen."],

            // Experimental save to internal storage
            ["i s", this.save_internal, "Save drawing to browser's local storage."],
            ["i l", this.load_internal, "Load drawing from browser's local storage."],
            ["i d", this.delete_internal, "Delete drawing from browser's local storage."],
            ["i i", this.save_settings, "Save settings to browser's local storage."],

            // Layer key actions
            ["l a", function () {this.model.add_layer(true);}, "Add a new layer."],

            ["l d", function () {
                console.log("removeong layer");
                this.model.remove_layer(this.model.layers.active);
            }, "Delete the current layer."],

            ["del", function () {
                this.model.clear_layer(this.model.layers.active,
                                       this.model.palette.background2);
            }, "Clear the current layer."],

            ["v", function () {
                this.model.layers.active.set(
                    "visible", !this.model.layers.active.get("visible"));
            }, "Toggle the current layer's visibility flag."],

            ["a", function () {
                this.model.layers.active.set(
                    "animated", !this.model.layers.active.get("animated"));
            }, "Toggle the current layer's animation flag."],

            ["x", function () {  // previous layer
                var index = this.model.layers.indexOf(this.model.layers.active);
                var new_index = index === 0 ? this.model.layers.length - 1 : index - 1;
                this.model.layers.at(new_index).activate();
            }, "Jump to the layer below the current."],

            ["c", function () {  // next animation frame
                var index = this.model.layers.indexOf(this.model.layers.active);
                var new_index = index == this.model.layers.length - 1 ? 0 : index + 1;
                this.model.layers.at(new_index).activate();
            }, "Jump to the layer above the current."],

            ["s", function () {  // previous animation frame
                var frames = this.model.layers.get_animated();
                if (frames.length > 1) {
                    var index = _.indexOf(frames, this.model.layers.active);
                    var new_index = index === 0 ? frames.length - 1 : index - 1;
                    (frames[new_index]).activate();
                }
            }, "Jump to previous animation frame."],

            ["d", function () {  // next animation frame
                var frames = this.model.layers.get_animated();
                if (frames.length > 1) {
                    var index = _.indexOf(frames, this.model.layers.active);
                    var new_index = index == frames.length - 1 ? 0 : index + 1;
                    (frames[new_index]).activate();
                }
            }, "Jump to next animation frame."],

            ["f h", function () {
                this.model.flip_layer_horizontal(this.model.layers.active);
            }, "Flip the current layer horizontally."],

            ["f v", function () {
                this.model.flip_layer_vertical(this.model.layers.active);
            }, "Flip the current layer vertically."],

            ["b h", function () {
                var brush = OldPaint.active_brushes.active;
                brush.flip_x();
                this.model.preview_brush(brush, this.model.palette.foreground);
            }, "Flip the current brush horizontally."],

            ["b v", function () {
                var brush = OldPaint.active_brushes.active;
                brush.flip_y();
                this.model.preview_brush(brush, this.model.palette.foreground);
            }, "Flip the current brush vertically"],

            ["b c", function () {
                var brush = OldPaint.active_brushes.active;
                brush.set_color(this.model.palette.foreground, true);
                this.model.preview_brush(brush, this.model.palette.foreground);
            }, "Flip the current brush vertically"],

            ["0", this.center, "Center the view."]
        ];
        _.each(keybindings, function (binding) {
            Mousetrap.bind(binding[0], _.bind(binding[1], this));}, this);

        // Keep track of whether space is held down.
        this.scroll_mode = false;
        var scroll_key = " ".charCodeAt(0);
        var scroll_key_down = _.bind(function (event) {
            this.scroll_mode = true;
        }, this);
        var scroll_key_up = _.bind(function (event) {
            this.scroll_mode = false;
        }, this);

        $(document).keyup(function(evt) {
            if (evt.keyCode == scroll_key) {
                scroll_key_up(evt);
            }
        }).keydown(function(evt) {
            if (evt.keyCode == scroll_key) {
                scroll_key_down(evt);
            }
        });

        // Events
        this.model.layers.on("add", this.on_layer_added);
        this.model.layers.on("move", this.on_layer_reordered);

        this.model.on("resize", this.on_resize);
        this.model.on("selection", this.make_selection);
        this.model.on("selection_done", this.edit_selection);
        this.model.on("load", this.on_load);
        this.model.on("change:title", this.on_rename);

        this.model.palette.on("foreground", this.update_brush);
        this.model.palette.on("change", this.on_palette_changed);

        $('#files').on('change', this.handle_file_select);
        $("#logo").click(function () {$("#title").linearMenu(menu);});
    },

    render: function (update_image) {
        this.topleft = this.$el.offset();
        this.model.layers.each(function (layer, index) {
            if (update_image) {
                layer.image.updateCanvas();
            }
            layer.trigger("redraw", false);
        });
        // Position the "frame"
        var negoffset = {x: Math.min(0, this.window.offset.x),
                         y: Math.min(0, this.window.offset.y)},
            posoffset = {x: Math.max(0, this.window.offset.x),
                         y: Math.max(0, this.window.offset.y)},
            left = Math.max(0, this.window.offset.x),
            top = Math.max(0, this.window.offset.y),
            width = this.model.get("width") * this.window.scale + negoffset.x,
            height = this.model.get("height") * this.window.scale + negoffset.y;

        $("#drawing_frame").css({
            left: left, top: top,
            width: Math.max(
                0, Math.min(this.$el.width() - posoffset.x, width)),
            height: Math.max(
                0, Math.min(this.$el.height() - posoffset.y, height)),
            "background-position": negoffset.x + "px " + negoffset.y + "px"
        });

        if (this.model.selection) {
            this.make_selection(this.model.selection);
            this.edit_selection();
        }
    },

    show_menu: function (menu_items) {
        this.model.msg("Menu mode. Select with keyboard or mouse. Leave with Esc.");
        if (!this.menu) {
            $("#title").linearMenu(menu_items, this);
        } else {
            this.menu.close_menu();
            this.model.msg("");
        }
    },

    load: function () {
        if (chrome.fileSystem) this.chrome_open();
        else $('#files').click();
    },

    save_as_png: function () {
        if (chrome.fileSystem) this.chrome_save_as_png();
        else this.model.export_png();
    },

    save_as_ora: function () {
        if (chrome.fileSystem) this.chrome_save_as_ora();
        else this.model.export_ora();
    },

    load_settings: function (e) {
        var settings = JSON.parse(e.target.result);
        console.log("settings:", settings);
        if (settings.last_drawing) {
            this.model.load_from_storage(settings.last_drawing);
        }
    },

    save_settings: function () {
        var settings = {
            last_drawing: this.model.get("title")
        };
        LocalStorage.request(LocalStorage.write,
                             {path: "", name: "settings.json",
                              blob: new Blob([JSON.stringify(settings)],
                                             {type: 'text/plain'})});
    },

    chrome_open: function () {
        ChromeApp.fileLoadChooser({"png": this.load_png_file,
                                   "ora": this.load_ora_file});
    },

    chrome_save_as_ora: function () {
        ChromeApp.fileSaveChooser(this.model.get("title") + ".ora",
                                  Util.convertDataURIToBlob(Util.create_ora(this.model)),
                                  "image/ora",
                                  function () {console.log("write done");});
    },

    chrome_save_as_png: function () {
        ChromeApp.fileSaveChooser(this.model.get("title") + ".png",
                                  this.model.flatten_visible_layers().make_png(true),
                                  "image/png",
                                  function () {console.log("write done");});
    },

    handle_file_select: function (evt) {
        var files = evt.target.files;
        if (files.length > 0) {
            var f = files[0];
            var reader = new FileReader();
            if (f.type.match('image/png')) {
                reader.onload = this.load_png_file;
            } else {
                reader.onload = this.load_ora_file;
            }
            reader.readAsDataURL(f);
            this.model.set("title", f.name.split(".")[0]);
        }
    },

    load_png_file: function (e) {
        this.model.load(Util.load_png, {layers: [e.target.result.slice(22)]});
    },

    load_ora_file: function (e) {
        this.model.load(Util.load_ora, e.target.result);
    },

    on_load: function () {
        this.render(true);
        this.center();
    },

    rename: function () {
        var name = prompt("What do you want to call the drawing?");
        this.model.set("title", name);
    },

    on_rename: function (model, value) {
        this.update_title();
    },

    update_title: function () {
        var text = this.model.get("title") +
                " [" + this.model.get("width") + "x" + this.model.get("height") + "]";
        $("#title").text(text);  // Probably better to make a view for this
    },

    update_scale: function() {
        this.window.scale = Math.pow(2, this.zoom);
    },

    // Save the image to the browser's internal storage. Let's not do that
    // while the user is actually drawing though, since it will cause stutter.
    save_internal: function () {
        if (this.stroke) {
            setTimeout(this.save_to_storage, 1000);
        } else {
            this.model.save_to_storage();
        }
    },

    delete_internal: function () {
        if (this.stroke) {
            setTimeout(this.save_to_storage, 1000);
        } else {
            this.model.remove_from_storage();
        }
    },

    load_internal: function (evt) {
        this.model.load_from_storage();
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

    resize_image: function () {
        var resize = function () {
            this.model.resize(this.model.selection);
            this.model.msg("Resized to (" + this.model.selection.width + ", " +
                           this.model.selection.height + ")");
            this.model.set_selection();
        };
        resize = _.bind(resize, this);
        this.model.set_selection({
            left: 0, top: 0, width: this.model.get("width"),
            height: this.model.get("height")
        }, resize);
        this.edit_selection();
        this.model.msg("Resize the image by dragging the corner handles. " +
                       "Click anywhere to finish.");
    },

    on_resize: function () {
        this.render();
        this.center();
        this.update_title();
    },

    convert_image: function (event) {
        this.model.convert_to_rgb_type();
    },

    update_brush: function (color) {
        OldPaint.active_brushes.active.set_color(color);
    },

    brush_flip_x: function () {
        var brush = OldPaint.active_brushes.active;
        brush.flip_x();
        this.model.preview_brush(brush, this.model.palette.foreground);
    },

    brush_flip_y: function () {
        var brush = OldPaint.active_brushes.active;
        brush.flip_y();
        this.model.preview_brush(brush, this.model.palette.foreground);
    },

    brush_colorize: function () {
        var brush = OldPaint.active_brushes.active;
        brush.set_color(this.model.palette.foreground, true);
        this.model.preview_brush(brush, this.model.palette.foreground);
    },

    // Update the cursor position and draw brush preview
    update_cursor: _.throttle(function (event, stroke) {
        var coords = Util.image_coords(Util.event_coords(event, this.topleft),
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
    }, 20),

    // Callback for when the user presses a mouse button on the canvas
    begin_stroke: function (event) {
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
        if (!this.scroll_mode) {
            switch (this.stroke.button) {
            case 1:  // Drawing
                this.model.msg(OldPaint.tools.active.help);
                this.model.before_draw(OldPaint.tools.active, this.stroke);
                this.stroke.draw = true;  // we're drawing, not e.g. panning
                this.stroke.color = this.model.palette.foreground;
                this.stroke.brush.set_color(this.stroke.color);
                this.model.draw(OldPaint.tools.active, this.stroke);
                break;
            case 3:  // Erasing
                this.model.msg(OldPaint.tools.active.help);
                this.model.before_draw(OldPaint.tools.active, this.stroke);
                this.stroke.draw = true;
                this.stroke.color = this.model.palette.background;
                this.stroke.brush.set_color(this.stroke.color, true);
                this.model.draw(OldPaint.tools.active, this.stroke);
                break;
            }
        }
    },

    // Callback for when the user is moving the mouse
    update_stroke: function (event) {
        //console.log(this.stroke.draw);
        this.update_cursor(event);
        if (this.stroke) {
            var cpos = Util.event_coords(event, this.topleft);
            this.stroke.pos = Util.image_coords(cpos, this.window.offset,
                                                this.window.scale);
            if (this.stroke.draw) {
                if (!OldPaint.tools.active.oneshot)
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
        if (this.stroke.draw) {
            this.model.after_draw(OldPaint.tools.active, this.stroke);
        }
        this.stroke = null;
        $(".fg").css({"pointer-events": "auto"});
        this.model.msg("");
    },

    update_offset: function (offset) {
        this.window.offset = {x: Math.floor(offset.x), y: Math.floor(offset.y)};
    },

    begin_scroll: function (event) {
        if (event.which == 2) {this.begin_stroke(event);}
    },

    scroll: function (event) {
        if (event.which == 2) {this.update_stroke(event);}
    },

    end_scroll: function (event) {
        if (event.which == 2) {this.end_stroke(event);}
    },

    // Center the display on a certain image coordinate
    center_on_image_pos: function (ipos, cpos) {
        //var scale = this.get_scale();
        offset = {x: Math.round(cpos.x - (ipos.x + 0.5) * this.window.scale),
                  y: Math.round(cpos.y - (ipos.y + 0.5)* this.window.scale)};
        this.update_offset(offset);
    },

    set_zoom: function (zoom, center_pos) {
        var image_pos = Util.image_coords(center_pos, this.window.offset,
                                          this.window.scale);
        this.zoom = Math.max(-3, Math.min(5, zoom));
        this.model.layers.active.clear_temporary();
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

    // Visualize the selection rectangle
    make_selection: function (begin) {
        if (this.model.selection) {
            if (begin) {
                var template = Ashe.parse( $("#selection_template").html(), {});
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
            {visibility: "visible"}).unbind()
            .on("mousedown", this.begin_scroll)
            .on("mousemove", this.scroll)
            .on("mouseup", this.end_scroll)
            .on("click", this.model.selection.action);
        $(".selection.handle").css(
            {visibility: "visible", "pointer-events": "auto"})
            .on("mousedown", this, function (event) {
                $(".selection.handle").css("pointer-events", "none");
                $("#selection_block").on("mousemove", this,
                                         event.data.resize_selection);
                $("#selection_block").on("mouseup",
                                         event.data.resize_selection_done);
            });
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
            var layer = this.model.layers.active;
            var brush = new ImageBrush({
                patch: layer.make_patch(this.model.selection)});
            OldPaint.user_brushes.add(brush);
            OldPaint.user_brushes.set_active(brush);
            $("#selection").empty();
        }
    },

    // Show the saved drawings list
    load_popup: function (event) {
        var load = _.bind(function (title) {
            this.model.save_to_storage();
            this.model.load_from_storage(title);
        }, this);
        var callback = function (result) {
            var dirs = _.filter(result, function (item) {return item.isDirectory;});
            var names = _.map(dirs, function (item) {return item.name;});
            Modal.list(names, load);
        };
        var drawings = LocalStorage.list({callback: callback});
    }

});
