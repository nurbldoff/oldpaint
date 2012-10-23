OldPaint.Selection = Backbone.Model.extend({

    initialize: function (options) {
        this.action = options.action;
    },

    resize: function (rect) {
        this.rect = rect;
        this.trigger("change", rect);
    },

    // This seems pointless...
    edit: function () {
        this.trigger("edit");
    },

    finish: function (action) {
        this.action(this.rect);
    }

});