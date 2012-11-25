OldPaint.StatusView = Backbone.View.extend({

    el: $("body"),

    initialize: function (options) {
        _.bindAll(this);

        this.eventbus = options.eventbus;
        this.tools = options.tools;
        this.brushes = options.brushes;
        this.writable = null;  // if the user has saved the drawing, the writable is kept here

        // Load settings from local storage
        this.load_settings();

        // === Menu ===
        // Items are defined by name and function/subitems
        // Keyboard shortcut is the first Uppercase letter in the name,
        // don't put overlapping keybindings in the same level!
        this.menuitems = {
            Drawing: {
                reName: this.rename,
                Load: this.load_popup,
                Save: this.save_internal,
                Import: this.load,
                Export: {
                    PNG: this.save_as_png,
                    ORA: this.save_as_ora
                },
                Delete: this.delete_internal,
                resiZe: this.resize_image,
                Convert: this.convert_image
            },
            Layer: {
                Add: function () {this.model.add_layer(true);},
                Delete: function () {
                    this.model.remove_layer(this.model.layers.active);
                },
                Flip: {
                    Horizontally: this.model.flip_layer_horizontal,
                    Vertically: this.model.flip_layer_vertical
                },
                Export: this.save_layer_as_png
            },
            Brush: {
                Colorize: this.brush_colorize,
                Delete: this.brush_remove,
                Export: this.save_brush_as_png,
                Flip: {
                    Horizontally: this.brush_flip_x,
                    Vertically: this.brush_flip_y
                }
            }
        };

        var keybindings = [
            ["return", this.show_menu.bind(this, null)],
            ["l", function () {this.show_menu("Layer");}],
            ["b", function () {this.show_menu("Brush");}],
            ["d", function () {this.show_menu("Drawing");}],

            ["z", this.undo, "Undo last change."],
            ["y", this.redo, "Redo last undo."],
            ["delete", this.clear, "Clear layer."]
        ];
        _.each(keybindings, function (binding) {
            Mousetrap.bind(binding[0], _.bind(binding[1], this));
        }, this);

        $('#files').on('change', this.on_file_select);
        $("#logo").click(this.show_menu.bind(this, null));
        $("#undo").click(this.undo);
        $("#redo").click(this.redo);

        this.model.on("change:title", this.render);
        this.model.on("resize", this.render);
        this.model.on("convert", this.render);
        this.model.on("load", this.render);

        this.render();
    },

    render: function () {
        var text = this.model.get("title") + " " +
                "(" + this.model.get("width") + "x" + this.model.get("height") + ", " +
                this.model.get_type() + ") ";
        $("#title").text(text);
    },

    show_menu: function (start) {
        this.eventbus.info("Menu mode. Select with keyboard or mouse. Leave with Esc.");
        if (!this.menu) {
            $("#title").linearMenu(this.menuitems, this, start, this.eventbus.clear);
        }
    },

    // ========== Drawing  operations ==========

    rename: function () {
        var on_ok = (function (name) {
            this.model.set("title", name);
            this.render();
        }).bind(this);
        var on_abort = function () {};
        Modal.input("Rename model", "What do you want to name it?", on_ok, on_abort);
    },

    resize_image: function () {
        var resize = (function () {
            this.model.resize(this.model.selection.rect);
            this.eventbus.info("Resized to (" + this.model.get("width") + ", " +
                               this.model.get("height") + ")");
            this.tools.previous.activate();
            this.model.end_selection();
        }).bind(this);
        this.model.make_selection(resize, this.model.get_rect());
        this.eventbus.info("Resize the image by dragging the corner handles. " +
                           "Click anywhere to finish.");
        this.tools.where({name: "select"})[0].activate();
    },

    convert_image: function (event) {
        var on_ok = (function () {
            if (this.model.convert_to_rgb_type()) {
                //this.brushes.each(function (brush) {brush.convert(OldPaint.RGBImage);});
                this.render();
            } else
                this.eventbus.info("Model is not of Indexed type - not converting.");
            // Layer key actions
        }).bind(this);
        var on_abort = function () {};
        Modal.alert("Convert image",
                    "You are about to convert the image to RGB palette format. " +
                    "This is (currently) an irreversible operation, and you will " +
                    "lose your undo history. Proceed?", on_ok, on_abort);
    },

    undo: function () {
        if (this.model.undo()) {
            this.eventbus.info("Undo");
        } else this.eventbus.info("Nothing more to undo!");
    },

    redo: function () {
        if (this.model.redo()) {
            this.eventbus.info("Redo");
        } else this.eventbus.info("Nothing more to redo!");
    },

    clear: function () {
        this.model.clear_layer();
    },

    // ========== Brush operations ==========

    brush_flip_x: function () {
        this.brushes.active.flip_x();
    },

    brush_flip_y: function () {
        this.brushes.active.flip_y();
    },

    brush_colorize: function () {
        this.brushes.active.set_color(this.model.palette.foreground, true);
    },

    brush_remove: function () {
        var brush = this.brushes.active;
        if (brush.type == "user")
            this.brushes.remove(brush);
        else
            this.eventbus.info("Can't remove default brush.");
    },

    // ========== Filesystem operations ==========

    // Load an user selected file from the normal filesystem
    load: function () {
        if (ChromeApp.check()) this.chrome_open();
        else $('#files').click();
    },

    // Save as PNG to the normal filesystem. If we can, let the user choose where.
    save_as_png: function () {
        if (ChromeApp.check()) {
            var save = function (writable) {
                var blob = this.model.flatten_visible_layers().make_png(true);
                ChromeApp.writeFileEntry(writable, blob);
            };
            this.chrome_save_as_png(this.model.get("title"), save.bind(this));
        } else {
            var blob = this.model.flatten_visible_layers().make_png(true);
            saveAs(blob, Util.change_extension(this.model.get("title"), "png"));
        }
    },

    // Save layer as PNG to the normal filesystem. If we can, let the user choose where.
    save_layer_as_png: function () {
        if (ChromeApp.check()) {
            var save = function (writable) {
                var blob = this.model.layers.active.image.make_png(true);
                ChromeApp.writeFileEntry(writable, blob);
            };
            this.chrome_save_as_png(this.model.get("title"), save.bind(this));
        } else {
            var blob = this.model.layers.active.image.make_png(true);
            saveAs(blob, Util.change_extension(this.model.get("title"), "png"));
        }
    },

    save_brush_as_png: function () {
        if (ChromeApp.check()) {
            var save = function (writable) {
                var blob = this.brushes.active.image.make_png(true);
                ChromeApp.writeFileEntry(writable, blob);
            };
            this.chrome_save_as_png(this.model.get("title"), save.bind(this));
        } else {
            var blob = this.brushes.active.image.make_png(true);
            saveAs(blob, Util.change_extension(this.model.get("title"), "png"));
        }
    },


    // Save as ORA to the normal filesystem. If we can, let the user choose where.
    save_as_ora: function () {
        if (ChromeApp.check()) 
            this.chrome_save_as_ora();
        else 
            Util.create_ora(this.model, (function (blob) {
                saveAs(blob, Util.change_extension(this.model.get("title"), "ora"));
            }).bind(this));
    },

    chrome_open: function () {
        ChromeApp.fileLoadChooser({"png": this.load_png_data,
                                   "ora": this.load_ora_data});
    },

    chrome_save_as_ora: function (rewrite) {
        var on_created = function (writable, orablob) {
            ChromeApp.writeFileEntry(writable, orablob);
        };

        var on_chosen = function (writable) {
            this.writable = writable;
            Util.create_ora(this.model, on_created.bind(this, writable));
        }.bind(this);

        if (rewrite && this.writable)  // Don't show the file chooser
            on_chosen(this.writable);
        else
            ChromeApp.fileSaveChooser(this.model.get("title"), "ora", on_chosen);
    },

    chrome_save_as_png: function (title, callback) {
        ChromeApp.fileSaveChooser(title, "png", callback);
    },

    on_file_select: function (evt) {
        var files = evt.target.files;
        if (files.length > 0) {
            var f = files[0];
            var reader = new FileReader();
            // TODO: do some more checking here!
            console.log("file type:", f.type);
            switch (f.type) {
            case 'image/png':
                reader.onload = this.load_png_data;
                break;
            case 'image/openraster':
                reader.onload = this.load_ora_data;
                break;
            default:
                this.eventbus.info("Sorry, only PNG and ORA files are supported.");
                return;
            }
            reader.readAsDataURL(f);
            this.model.set("title", f.name.split(".")[0]);
        }
    },

    load_png_data: function (e) {
        this.model.load(Util.png_loader, [e.target.result]);
    },

    load_ora_data: function (e) {
        this.model.load(Util.ora_loader, e.target.result);
    },

    // ========== LocalStorage operations ==========

    load_settings: function (e) {
        var model = this.model;
        LocalStorage.request(
            LocalStorage.read_txt,
            {name: "settings.json",
             on_load: function (e) {
                 var settings = JSON.parse(e.target.result);
                 console.log("settings:", settings);
                 if (settings.last_model) {
                     model.load_from_storage(settings.last_drawing);
                 }
             }
            });
    },

    save_settings: function () {
        console.log("save settings");
        var settings = {
            last_drawing: this.model.get("title")
        };
        LocalStorage.request(LocalStorage.write,
                             {name: "settings.json",
                              blob: new Blob([JSON.stringify(settings)],
                                             {type: 'text/plain'})});
    },

    // Save the image to the browser's internal storage. Let's not do that
    // while the user is actually drawing though, since it could cause stutter.
    save_internal: function () {
        if (this.stroke) {
            setTimeout(this.model.save_to_storage, 1000);
        } else {
            var title = this.model.get("title");
            var spec = {
                title: title,
                current_layer_number: this.model.layers.number,
                layers: [],
                type: this.model.get_type(),
                palette: this.model.palette.colors
            };
            this.model.layers.each(function (layer, index) {
                var name = "layer" + layer.id;
                spec.layers.push({name: name,
                                  visible: layer.get("visible"),
                                  animated: layer.get("animated")});
                layer.clear_temporary(true);
                LocalStorage.save({path: title + "/data",
                                   name: name,
                                   blob: layer.image.get_raw()});
            }, this);
            // save the spec
            LocalStorage.save({path: title, name: "spec",
                               blob: new Blob([JSON.stringify(spec)],
                                              {type: 'text/plain'})});
        }
    },

    delete_internal: function (title) {
        if (!title) title =  this.model.get("title");
        var on_abort = function () {};
        var on_ok = (function () {
            LocalStorage.remove_dir({path: title});
            this.model.reinitialize();
        }).bind(this);
        Modal.alert("Delete drawing", "Are you sure you want to delete this " +
                    "drawing from internal storage? This action can't be undone.",
                    on_ok, on_abort);
    },

    load_internal: function (title) {
        if (!title)
            this.model.get("title");

        var read_spec = function (e) {
            var spec = JSON.parse(e.target.result);
            console.log("spec", spec);
            LocalStorage.read_images(spec, this.model.load.bind(this, Util.raw_loader));
        };

        // load the spec...
        LocalStorage.load_txt({path: title, name: "spec",
                               on_load: read_spec.bind(this)});
    },

    // Show the saved drawings list
    load_popup: function (event) {
        var callback = function (result) {
            var dirs = _.filter(result, function (item) {return item.isDirectory;}),
                names = _.map(dirs, function (item) {return item.name;});
            Modal.list(names, this.load_internal);
        };
        var drawings = LocalStorage.list({callback: callback.bind(this)});
    }

});