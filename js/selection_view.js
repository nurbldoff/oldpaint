/*
 * Selection rectangle view
 */

OldPaint.SelectionView = Backbone.View.extend({
    tagName: "div",
    id: "selection",

    events: {},

    initialize: function (options) {
        console.log("selection view", options.model);
        _.bindAll(this);
        this.window = options.window;
        this.eventbus = options.eventbus;
        //this.model.on("selection", this.render);
        this.model.on("change", this.update);
        this.model.on("edit", this.edit);
        this.window.on("change", this.update);
        //this.model.on("finish", this.finish);
        this.model.on("abort", this.cleanup);
        this.render();
        if (this.model.rect) {
            this.update();
            this.edit();
        }
    },

    // Visualize the selection rectangle
    render: function () {
        var template = Ashe.parse( $("#selection_template").html(), {});
        this.$el.html(template);
        $("#drawing").after(this.$el);
    },

    update: function () {
        var rect = this.model.rect;
        var start = Util.frame_coords({x: rect.left, y: rect.top}, this.window);
        var end = Util.frame_coords({x: rect.left + rect.width,
                                      y: rect.top + rect.height}, this.window);
        var handle_width = ($("#selection_topleft").width() + 4);
        var handle_height = ($("#selection_topleft").height() + 4);
        $("#selection_main").css({left: start.x - handle_width,
                                  top: start.y - handle_height,
                                  width: end.x - start.x + 2*handle_width,
                                  height: end.y - start.y + 2*handle_height});
        $(".selection.frame").css({width: end.x - start.x,
                                   height: end.y - start.y});
    },

    // Make the selection editable
    edit: function () {
        $(".selection.handle").unbind();
        $(".selection.handle").css(
            {visibility: "visible", "pointer-events": "auto"})
            .on("mousedown", this, function (event) {
                $(".selection").css("pointer-events", "none");
                $("#drawing").on("mousemove", this, event.data.resize);
                $("#drawing").on("mouseup", this, event.data.resize_done);
            });

        $("#selection_center").unbind();
        $("#selection_center").css({"pointer-events": "auto"})
            .on("mousedown", this.finish);

        this.eventbus.info("Select an area by dragging the mouse.");
    },

    // callback for dragging a corner handle
    resize: function (event) {
        var ipos = Util.image_coords(Util.event_coords(event), this.window);
        if (!this.last_pos) this.last_pos = ipos;
        var delta = Util.subtract(ipos, this.last_pos);
        var sel = this.model.rect;
        this.last_pos = ipos;

        switch (event.data.id) {
        case "selection_botright":
            sel = {left: sel.left,
                   top: sel.top,
                   width: sel.width + delta.x,
                   height: sel.height + delta.y};
            break;
        case "selection_topright":
            sel = {left: sel.left,
                   top: sel.top + delta.y,
                   width: sel.width + delta.x,
                   height: sel.height - delta.y};
            break;
        case "selection_topleft":
            sel = {left: sel.left + delta.x,
                   top: sel.top + delta.y,
                   width: sel.width - delta.x,
                   height: sel.height - delta.y};
            break;
        case "selection_botleft":
            sel = {left: sel.left + delta.x,
                   top: sel.top,
                   width: sel.width - delta.x,
                   height: sel.height + delta.y};
            break;
        }
        this.model.resize(sel);
    },

    // Callback for releasing a corner handle
    resize_done: function (event) {
        $("#drawing").unbind("mousemove", this.resize);
        $("#drawing").unbind("mouseup", this.resize_done);
        this.last_pos = null;
        this.edit();
    },

    finish: function () {
        this.model.finish();
        this.cleanup();
    },

    cleanup: function () {
        this.model.unbind("change", this.update);
        this.model.unbind("finish", this.edit);
        this.window.unbind("change", this.update);
        this.model.unbind("abort", this.cleanup);
        this.unbind();
        this.remove();
    }

});