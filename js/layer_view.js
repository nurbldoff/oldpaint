
/* View of one layer. These are stacked on top of each
 *  other in the DrawingView to form the image.*/
OldPaint.LayerView = Backbone.View.extend({
    tagName: "canvas",
    className: 'layer',
    zoom: 0,
    context: null,
    //offset: {x: 0, y: 0},
    base_offset: {x: 0, y: 0},

    active: false,
    visible: true,
    animated: false,

    events: {
    },

    initialize: function (options) {
        console.log("layer_view");
        _.bindAll(this);
        this.window = options.window;
        //this.model.on("update", this.update);
        //this.model.on("resize", this.resize);
        this.model.on("redraw", this.render);
        this.model.on("remove", this.on_remove);
        this.model.on("change:visible", this.on_visible);
        this.model.on("change:animated", this.on_animated);
        this.model.on("activate", this.on_activate);
        this.model.on("deactivate", this.on_deactivate);
        this.model.update = this.update;  // don't use events for this, too slow

        this.resize();
        this.render();
    },

    // Redraw the whole view
    render: function (frame) {
        // Let's not redraw invisible layers, that would be silly
        if (this.visible && (!this.animated || (this.animated && this.active))) {
            console.log("render layer");
            //var scale = this.get_scale();
            var canvas = this.model.image.canvas;

            this.context.clearRect(0, 0, this.el.width, this.el.height);
            this.context.drawImage(canvas, 0, 0, canvas.width, canvas.height,
                                   this.window.offset.x, this.window.offset.y,
                                   canvas.width * this.window.scale,
                                   canvas.height * this.window.scale);

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
        }
    },

    // Resize the view
    resize: function () {
        console.log("resize");
        // some trickery to get window resize to work
        //$(vlayer.canvas).hide();
        //$("div.drawing").css({width: 0, height: 0});
        this.el.width = $("#drawing").width();
        this.el.height = $("#drawing").height();
        this.context = this.el.getContext('2d');
        if (this.window.scale >= 1) {
            this.context.mozImageSmoothingEnabled = false;
            this.context.webkitImageSmoothingEnabled = false;
            this.context.imageSmoothingEnabled = false;
        } else {
            this.context.mozImageSmoothingEnabled = true;
            this.context.webkitImageSmoothingEnabled = true;
            this.context.imageSmoothingEnabled = true;
        }
        $(".drawing").css({width: this.el.width,
                                     height: this.el.height});
        this.topleft = $("#drawing").offset();
        console.log("topleft", this.topleft);
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
        this.$el.toggleClass("active", true);
        this.active = true;
    },

    on_deactivate: function () {
        this.$el.toggleClass("active", false);
        // remove stray brush previews
        this.model.restore_backup(this.model.temporary_rect);
        this.active = false;
    },

    on_remove: function () {
        console.log("Removing layer view", this.cid);
        this.$el.remove();
        this.remove();
    },

    on_visible: function () {
        this.visible = this.model.attributes.visible;
        if (this.visible) this.render();  // Layer may have been moved/zoomed since
        this.$el.toggleClass("invisible", !this.visible);
    },

    on_animated: function () {
        this.animated = this.model.attributes.animated;
        if (this.visible) this.render();
        this.$el.toggleClass("animated", this.animated);
    }

});
