/* Presents the toolbar */
OldPaint.ToolsView = Backbone.View.extend({
    el: $("#tools"),

    events: {
        "click .tool": "select"
    },

    initialize: function (options) {
        _.bindAll(this);
        this.collection.on("activate", this.activate);
        this.render();
    },

    render: function () {
        var template = Ashe.parse( $("#toolbar_template").html(), {
            tools: this.collection.models
        });
        this.$el.html(template);
    },

    activate: function (index) {
        console.log("activate:", index);
        $(".tool.active").removeClass("active");
        $("#" + this.collection.at(index).name).addClass("active");
    },

    select: function (event) {
        var tool = this.collection.getByCid($(event.currentTarget).attr("data"));
        this.collection.set_active(tool);
    }
});

// The Brushes View
OldPaint.BrushesView = Backbone.View.extend({
    el: $("#brushes"),
    events: {
        "click .brush": "select"
    },

    initialize: function (options) {
        _.bindAll(this);
        this.collection = options.collection;
        this.setElement("#" + options.name);
        this.collection.on("activate", this.activate);
        this.collection.on("add", this.render);
        this.collection.on("remove", this.render);
        this.render();
    },

    render: function () {
        var template = Ashe.parse( $("#brushes_template").html(), {
            brushes: this.collection.models
        });
        this.$el.html(template);
        _.each($(".brush"), function (btn, index) {
            var brush = this.collection.getByCid($(btn).attr("data"));
            if (brush) {
                var canvas = brush.preview;
                // var width = canvas.width;
                // var height = Math.min(canvas.height, 20);
                // var ratio = canvas.width / canvas.height;
                // if (canvas.width > 20 && ratio > 1) {
                //     height = 20 / ratio;
                // }
                // var size = Util.restrict_size(canvas.width, canvas.height, 20);
                // $(canvas).css({width: height * ratio, height: height,
                //                "vertical-align": "middle"});
                var size = Util.restrict_size(canvas.width, canvas.height, 20);
                $(canvas).css({width: size.x, height: size.y,
                               "vertical-align": "middle"});
                $(btn).append(canvas);
            }
        }, this);
    },

    activate: function (index) {
        console.log("activate:", index);
        $(".brush.active").removeClass("active");
        $(this.$el.children()[index]).addClass("active");
    },

    select: function (event) {
        var el = event.currentTarget;
        brush = this.collection.getByCid($(el).attr("data"));
        if (brush == this.collection.active) {
            brush.restore_backup();
        } else {
            this.collection.set_active(brush);
        }
    }
});

// The "info bar" View - shows mouse coordinates and user messages
OldPaint.InfoView = Backbone.View.extend({
    el: $("#info"),

    events: {
    },

    initialize: function (options) {
        _.bindAll(this);
        this.model.on("message", this.set_message);
        this.model.on("coordinates", this.set_coordinates);
        this.render();
        this.$message = $("#message");
        this.$coordinates = $("#coordinates");
    },

    render: function () {
    },

    set_message: function (message) {
        console.log("message;", message);
        this.$message.text(message);
    },

    set_coordinates: function (coords) {
        // Kinda crappy way to check if we got a position or a rect...
        if (coords.x != undefined) {
            this.$coordinates.text("x:" + coords.x + "\xa0y:" + coords.y);
        } else {
            this.$coordinates.text("w:" + coords.width + "\xa0h:" + coords.height);
        }
    },

});
