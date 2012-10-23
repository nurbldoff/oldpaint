$(function () {
    if (!window.console) window.console = {};
    if (!window.console.log) window.console.log = function() {};

    // Used to send messages to the info area
    OldPaint.eventbus = eventbus = _.extend({}, Backbone.Events);
    eventbus.info = function (msg) {eventbus.trigger("info", msg);};
    eventbus.clear = function () {eventbus.trigger("clear");};

    // Tools
    var tools = OldPaint.tools = new OldPaint.Tools();
    var Tool = OldPaint.Tool;
    tools.add(new Tool(
        {name: "pencil", key: "p", preview: true,
         help: "Draw continuous lines by holding the mousebutton.",
         draw: function (drawing, stroke) {
             var layer = drawing.layers.active;
             layer.draw_line(stroke.last, stroke.pos,
                             stroke.brush, stroke.color);
         }}));

    tools.add(new Tool(
        {name: "points", key: "d", preview: true,
         help: "Draw points by holding the mousebutton.",
         draw: function (drawing, stroke) {
             var layer = drawing.layers.active;
             layer.draw_brush(stroke.pos, stroke.brush, stroke.color);
         }}));

    tools.add(new Tool(
        {name: "line", key: "n", preview: true,
         help: "Draw a line from where you press the mousebutton to where you release it.",
         draw: function (drawing, stroke) {
             var layer = drawing.layers.active;
             layer.restore_backup(layer.last_change);
             layer.draw_line(stroke.start, stroke.pos,
                             stroke.brush, stroke.color);
         }}));

    tools.add(new Tool(
        {name: "rectangle", key: "t", preview: true,
         help: "Draw a rectangle by holding a mousebutton and dragging. Hold SHIFT to fill it.",
         draw: function (drawing, stroke) {
             var layer = drawing.layers.active;
             var size = {x: stroke.pos.x - stroke.start.x,
                         y: stroke.pos.y - stroke.start.y};
             layer.restore_backup(layer.last_change);
             layer.draw_rectangle(stroke.start, size,
                                  stroke.brush, stroke.color,
                                  stroke.shift);
         }}));

    tools.add(new Tool(
        {name: "ellipse", key: "e", preview: true,
         help: "Draw an ellipse by holding a mousebutton and dragging. Hold SHIFT to fill it.",
         draw: function (drawing, stroke) {
             var layer = drawing.layers.active;
             var radius = {x: stroke.pos.x - stroke.start.x,
                           y: stroke.pos.y - stroke.start.y};
             layer.restore_backup(layer.last_change);
             layer.draw_ellipse(stroke.start, radius,
                                stroke.brush, stroke.color,
                                stroke.shift);
         }}));

    tools.add(new Tool(
        {name: "floodfill", key: "f", oneshot: true, preview: false,
         help: "Click anywhere to fill the adjacent area of the same color.",
         draw: function (drawing, stroke) {
             drawing.layers.active.draw_fill(stroke.pos, stroke.color);
         }}));

    // tools.add(new Tool({name: "gradientfill",
    //                     draw: function (drawing, stroke) {
    //                         drawing.layers.active.draw_gradientfill(
    //                             stroke.pos, drawing.palette.range);
    //                     }}));

    tools.add(new Tool(
        {name: "brush", key: "u", preview: false,
         help: "Click and drag to select the area you want to copy.",
         before: function (drawing, stroke) {
             if (!drawing.selection) {
                 var layer = drawing.layers.active;
                 var rect = Util.rectify(stroke.start,
                                         {x: stroke.pos.x + 1,
                                          y: stroke.pos.y + 1});
                 var action = function (rect) {
                     var layer = drawing.layers.active;
                     var brush = new OldPaint.ImageBrush({type: "user",
                                                          patch: layer.make_patch(rect),
                                                          image_type: drawing.image_type});
                     brushes.add(brush);
                     brush.activate();
                     tools.previous.activate();
                     drawing.selection = null;
                 };
                 drawing.make_selection(action);
             } else {
                 drawing.selection.abort();
                 drawing.selection = null;
             }
         },
         draw: function (drawing, stroke) {
             if (drawing.selection && !drawing.selection.editable) {
                 var rect = Util.rectify(stroke.start, {x: stroke.pos.x + 1,
                                                        y: stroke.pos.y + 1});
                 drawing.selection.resize(rect);
             }
         },
         after: function (drawing, stroke) {
             // The operation is not quite finished when the user releases the mouse,
             // the selection can still be edited by dragging the corners.
             if (drawing.selection && !drawing.selection.editable) drawing.selection.edit();
         }}));

    tools.add(new Tool(
        {name: "picker", key: "k", preview: false,
         help: "Click on a pixel to select that color in the palette.",
         draw: function (drawing, stroke) {
             var rgb, color=0;
             // Walk down through the layers and use the first non transparent
             // pixel we see.
             for (var i=drawing.layers.length-1; i>=0; i--) {
                 var layer = drawing.layers.at(i);
                 if (layer.get("visible")) {
                     color = layer.get_pixel(stroke.pos);
                     var alpha = color[3] || drawing.palette.colors[color][3];
                     if (alpha > 0) break;
                 }
             }
             // If it's a RGB image, we modify the foreground color instead
             if (color[0] !== undefined)
                 drawing.palette.change_color(drawing.palette.foreground,
                                              Util.rgba(color));
             else
                 drawing.palette.set_foreground(color);
         }}));

    var tools_view = new OldPaint.ToolsView({collection: tools, eventbus: eventbus});
    tools.at(0).activate();

    // Palette
    var colors = [[0, 0, 0, 255]];
    for (var i=1; i<256; i++) {
        colors.push([Math.floor(Math.random()*255),
                     Math.floor(Math.random()*255),
                     Math.floor(Math.random()*255), 255]);
    }
    var palette = new OldPaint.Palette({colors: colors, transparent: [0]});
    var palette_editor_view = new OldPaint.PaletteEditorView(
        {model: palette, size: {x: 32, y: 8}, eventbus: eventbus});
    palette.set_background(0);
    palette.set_foreground(1);

    //var image_type = OldPaint.RGBImage;
    var image_type = OldPaint.IndexedImage;

    // Standard brushes
    var brushes = new OldPaint.Brushes();

    brushes.add(new OldPaint.RectangleBrush({width: 1, height: 1, color: 1,
                                             palette: palette,
                                             image_type: image_type}));
    brushes.add(new OldPaint.EllipseBrush({width: 1, height: 1, color: 1,
                                           palette: palette,
                                           image_type: image_type}));
    brushes.add(new OldPaint.EllipseBrush({width: 3, height: 3, color: 1,
                                           palette: palette,
                                           image_type: image_type}));
    brushes.add(new OldPaint.EllipseBrush({width: 5, height: 5, color: 1,
                                           palette: palette,
                                           image_type: image_type}));
    brushes.add(new OldPaint.EllipseBrush({width: 50, height: 25, color: 1,
                                           palette: palette,
                                           image_type: image_type}));
    brushes.add(new OldPaint.RectangleBrush({width: 2, height: 2, color: 1,
                                             palette: palette,
                                             image_type: image_type}));
    brushes.add(new OldPaint.RectangleBrush({width: 5, height: 5, color: 1,
                                             palette: palette,
                                             image_type: image_type}));
    brushes.add(new OldPaint.RectangleBrush({width: 50, height: 50, color: 1,
                                             palette: palette,
                                             image_type: image_type}));

    var brushes_view = new OldPaint.BrushesView({collection: brushes, eventbus: eventbus});
    brushes.at(0).activate();

    // Drawing
    console.log("create drawing");
    var drawing = new OldPaint.Drawing(
        { width: 800, height: 600, palette: palette, image_type: image_type});
    var info_view = new OldPaint.InfoView({model: drawing, eventbus: eventbus});
    var layers_view = new OldPaint.MiniLayersView({model: drawing, eventbus: eventbus});
    var drawing_view = new OldPaint.DrawingView({model: drawing, brushes: brushes,
                                                 tools: tools, eventbus: eventbus});

    console.log("adding layer from main");
    drawing.add_layer(true);

});
