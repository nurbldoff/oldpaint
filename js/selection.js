OldPaint.Selection = Backbone.Model.extend({

    initialize: function (options) {
        this.drawing = options.drawing;
        this.action = options.action;
        this.rect = options.rect;
        this.editable = false;
    },

    resize: function (rect) {
        this.rect = rect;
        this.trigger("change", rect);
    },

    edit: function () {
        this.editable = true;
        this.trigger("edit");
    },

    finish: function (action) {
        this.action(this.rect);
    },

    abort: function (action) {
        console.log("aborted");
        this.trigger("abort");
    }

});