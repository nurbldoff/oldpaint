/* Presents the toolbar */
OldPaint.ToolsView = Backbone.View.extend({
    el: $("#tools"),

    events: {
        "click .tool": "select"
    },

    initialize: function (options) {
        _.bindAll(this);
        this.msgbus = options.msgbus;
        this.collection.on("activate", this.on_activate);
        this.collection.each(function (tool) {
            if (tool.key) {
                Mousetrap.bind(tool.key, _.bind(tool.activate, tool));
            }
        }, this);
        this.render();
    },

    render: function () {
        var template = Ashe.parse( $("#toolbar_template").html(), {
            tools: this.collection.models
        });
        this.$el.html(template);
        this.collection.each(function (tool) {
            var el = $('#' + tool.name);
            el.hover(
                (function () {
                    this.msgbus.trigger("info", tool.name + ": " + tool.help);
                }).bind(this),
                (function () {
                    this.msgbus.trigger("clear");
                }).bind(this));
        }, this);
    },

    on_activate: function (tool) {
        $(".tool.active").removeClass("active");
        $("#" + tool.name).addClass("active");
    },

    select: function (event) {
        var tool = this.collection.getByCid($(event.currentTarget).attr("data"));
        tool.activate();
    }
});

// The Brushes View
OldPaint.BrushesView = Backbone.View.extend({
    el: "#brushes",
    events: {
        "click .brush": "select"
    },

    initialize: function (options) {
        _.bindAll(this);
        this.collection = options.collection;
        this.eventbus = options.eventbus;
        this.type = options.type;
        //this.setElement("#" + options.name);
        this.collection.on("activate", this.activate);
        this.collection.on("add", this.render);
        this.collection.on("remove", this.render);
        this.render();
    },

    render: function () {
        var template = Ashe.parse( $("#brushes_template").html(), {
            brushes: this.collection.where({type: undefined}),
            user_brushes: this.collection.where({type: "user"})
        });
        this.$el.html(template);
        _.each($(".brush"), function (btn, index) {
            var brush = this.collection.getByCid($(btn).attr("data"));
            if (brush) {
                var canvas = brush.preview;
                var size = Util.restrict_size(canvas.width, canvas.height, 20);
                $(canvas).css({width: size.x, height: size.y,
                               "vertical-align": "middle"});
                $(btn).append(canvas);
            }
        }, this);
    },

    activate: function (brush) {
        $(".brush.active").removeClass("active");
        var index = this.collection.indexOf(brush);
        $(this.$el.children(".brush")[index]).addClass("active");
    },

    select: function (event) {
        var el = event.currentTarget;
        var brush = this.collection.getByCid($(el).attr("data"));
        console.log("select", brush);
        if (brush == this.collection.active) {
            brush.restore_backup();
        } else {
            brush.activate();
        }
    }
});

// The "info bar" View - shows mouse coordinates and user messages
OldPaint.InfoView = Backbone.View.extend({
    el: $("#info"),

    events: {},

    initialize: function (options) {
        _.bindAll(this);
        this.model.on("coordinates", this.set_coordinates);
        this.msgbus = options.msgbus;
        this.msgbus.on("info", this.set_message);
        this.msgbus.on("clear", this.set_message);
        this.$message = $("#message");
        this.$coordinates = $("#coordinates");
        this.render();
    },

    render: function () {
        this.set_message("Welcome to OldPaint!");
        this.set_coordinates({x: -1, y: -1});
    },

    set_message: function (message) {
        if (message) this.$message.text(message);
        else this.$message.text("");
    },

    set_coordinates: function (coords) {
        // Kinda crappy way to check if we got a position or a rect...
        if (coords.x !== undefined) {
            this.$coordinates.text("x:" + coords.x + "\xa0y:" + coords.y);
        } else {
            this.$coordinates.text("w:" + coords.width + "\xa0h:" + coords.height);
        }
    }
});
