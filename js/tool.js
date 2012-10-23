/* A Tool is something to draw with, or otherwise locally interact with the pixels
 * in the Drawing, using the pointer.
 */

OldPaint.Tool = Backbone.Model.extend ({
    name: null,
    preview_brush: true,  // show brush preview under the cursor?
    oneshot: false,   // for tools that should only fire once per mousedown,
                      // and not on each movement; e.g. floodfill.

    initialize: function (spec) {
        this.name = spec.name;
        this.key = spec.key;
        this.preview_brush = !!spec.preview;  // Show brush preview under cursor?
        this.oneshot = !!spec.oneshot;
        this.before = spec.before || this.before;
        this.draw = spec.draw;
        this.after = spec.after || this.after;
        this.help = spec.help || "No documentation available.";
    },

    activate: function () {this.trigger("activate", this);},

    // Stuff to do before starting a 'stroke'
    before: function (drawing, stroke) {},

    // Stuff to do after a 'stroke' has been completed
    after: function (drawing, stroke) {}
});

OldPaint.Tools = Backbone.Collection.extend ({
    model: OldPaint.Tool,
    active: null,
    previous: null,

    initialize: function () {
        this.on("activate", this.on_activate);
    },

    on_activate: function (tool) {
        console.log("activated tool", tool.name);
        this.previous = this.active;
        this.active = tool;
    }
});
