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
    },

    // Visualize the selection rectangle
    render: function () {
        console.log("render");
        var template = Ashe.parse( $("#selection_template").html(), {});
        this.$el.html(template);
    },

    update: function () {
        var rect = this.model.rect;
        var start = Util.canvas_coords({x: rect.left, y: rect.top}, this.window.offset,
                                       this.window.scale);
        var end = Util.canvas_coords({x: rect.left + rect.width,
                                      y: rect.top + rect.height}, this.window.offset,
                                     this.window.scale);
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
        this.last_pos = null;

        var begin_scroll = (function (event) {
            if (event.which == 2) this.begin_stroke(event);
        }).bind(this);

        var scroll = (function (event) {
            if (event.which == 2) this.update_stroke(event);
        }).bind(this);

        var end_scroll = (function (event) {
            if (event.which == 2) this.end_stroke(event);
        }).bind(this);

        // $("#selection_block").unbind();
        // $("#selection_block").css(
        //     {visibility: "visible"}).unbind()
        //     .on("mousedown", begin_scroll)
        //     .on("mousemove", scroll)
        //     .on("mouseup", end_scroll)
        //     .on("click", this.on_done);

        $(".selection.handle").unbind();
        $(".selection.handle").css(
            {visibility: "visible", "pointer-events": "auto"})
            .on("mousedown", this, function (event) {
                $(".selection").css("pointer-events", "none");
                $("#drawing_frame").on("mousemove", this, event.data.resize);
                $("#drawing_frame").on("mouseup", this, event.data.resize_done);
            });

        $("#selection_center").unbind();
        $("#selection_center").css({"pointer-events": "auto"})
            .on("mousedown", this.finish);

        this.eventbus.info("Select an area by dragging the mouse.");
    },

    // callback for dragging a corner handle
    resize: function (event) {
        var ipos = Util.image_coords(Util.event_coords(event), this.window.scale);
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
        $("#drawing_frame").unbind("mousemove", event.data.resize);
        $("#drawing_frame").unbind("mouseup", event.data.resize_done);
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
        this.remove();
        this.unbind();
    }

});