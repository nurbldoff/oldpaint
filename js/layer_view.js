
/* View of one layer. These are stacked on top of each
 *  other in the DrawingView to form the image.*/
OldPaint.LayerView = Backbone.View.extend({
    tagName: "canvas",
    className: 'layer',

    context: null,
    deferred_render: false,
    active: false,

    initialize: function (options) {
        _.bindAll(this);

        this.window = options.window;
        this.model.on("update", this.update);
        this.model.on("resize", this.resize);
        this.model.on("redraw", this.on_redraw);
        this.model.on("remove", this.on_remove);
        this.model.on("change:visible", this.on_visible);
        this.model.on("change:animated", this.on_animated);
        this.model.on("activate", this.on_activate);
        this.model.on("deactivate", this.on_deactivate);

        this.resize();
        this.render(true);
    },

    // Redraw the whole view
    render: function (force) {
        // Let's not redraw invisible layers, that would be silly
        var animated = this.model.get("animated"),
            visible = this.model.get("visible");
        if (force || visible && (!animated || (animated && this.active))) {

            // Scaling behavior: when scaling UP, use nearest, when scaling
            // DOWN, use linear or whatever the browser thinks is smooth.
            if (this.window.scale >= 1) {
                this.context.mozImageSmoothingEnabled = false;
                this.context.webkitImageSmoothingEnabled = false;
                this.context.imageSmoothingEnabled = false;
            } else {
                this.context.mozImageSmoothingEnabled = true;
                this.context.webkitImageSmoothingEnabled = true;
                this.context.imageSmoothingEnabled = true;
            }

            this.context.clearRect(0, 0, this.el.width, this.el.height);
            var canvas = this.model.image.canvas;
            this.context.drawImage(canvas, 0, 0, canvas.width, canvas.height,
                                   this.window.offset.x, this.window.offset.y,
                                   canvas.width * this.window.scale,
                                   canvas.height * this.window.scale);

            this.$el.toggleClass("invisible", !this.model.get("visible"));
            this.$el.toggleClass("animated", this.model.get("animated"));

            // var image_rect = {left: 0, top: 0,
            //                   width: canvas.width, height: canvas.height};
            // var vis_topleft = Util.image_coords({x:0, y:0},
            //                                     this.window.offset,
            //                                     this.window.scale);
            // var vis_botright = Util.image_coords(
            //     {x: this.el.width + this.window.scale,
            //      y: this.el.height + this.window.scale},
            //     this.window.offset, this.window.scale);
            // var vis_rect = {left: vis_topleft.x, top: vis_topleft.y,
            //                 width: vis_botright.x - vis_topleft.x,
            //                 height: vis_botright.y - vis_topleft.y};

            // var rect = Util.intersect(image_rect, vis_rect);
            // if (rect) {
            //     this.update(rect);
            // }
        } else {
            // We still may need to refresh the layer before it becomes visible
            this.deferred_render = true;
        }
    },

    on_redraw: function () {
        this.render();
    },

    // Resize the view, e.g. because the window size changed
    resize: function () {
        this.el.width = $("#drawing").width();
        this.el.height = $("#drawing").height();
        this.context = this.el.getContext('2d');
        $(".drawing").css({width: this.el.width,
                                     height: this.el.height});
        //this.topleft = $("#drawing").offset();
    },

    // Redraw part of the view
    update: function (rect, clear) {
        //console.log("update", this.cid, rect.left, rect.top, rect.width, rect.height);
        var scale = this.window.scale;
        var left = Math.floor(this.window.offset.x + rect.left * scale),
            top = Math.floor(this.window.offset.y + rect.top * scale),
            width = Math.ceil(rect.width * scale),
            height = Math.ceil(rect.height * scale);
        if (clear) this.context.clearRect(left, top, width, height);
        this.context.drawImage(this.model.image.canvas,
                               rect.left, rect.top, rect.width, rect.height,
                               left, top, width, height);
    },

    on_activate: function () {
        this.active = true;
        if (this.deferred_render) {
            this.deferred_render = false;
            this.render();
        }
        this.$el.toggleClass("active", true);
    },

    on_deactivate: function () {
        this.$el.toggleClass("active", false);
        // remove stray brush previews
        this.model.restore_backup(this.model.temporary_rect);
        this.active = false;
    },

    on_remove: function () {
        this.remove();
        this.unbind();
        // Tedious, but apparently need to be done, or the view will not
        // be garbage collected -> memory leaks
        this.model.unbind("redraw", this.render);
        this.model.unbind("remove", this.on_remove);
        this.model.unbind("change:visible", this.on_visible);
        this.model.unbind("change:animated", this.on_animated);
        this.model.unbind("activate", this.on_activate);
        this.model.unbind("deactivate", this.on_deactivate);
        //this.model.update = null;
    },

    on_visible: function () {
        if (this.deferred_render) this.render();  // View may have been moved/zoomed
        this.$el.toggleClass("invisible", !this.model.get("visible"));

    },
    on_animated: function () {
        if (this.deferred_render) this.render();
        this.$el.toggleClass("animated", this.model.get("animated"));
    }

});
