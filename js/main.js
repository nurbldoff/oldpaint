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
        {name: "select", key: "u", preview: false,
         help: "Click and drag to select the area you want to copy.",
         before: function (drawing, stroke) {
             // Are we making a selection, or editing one that is already present?
             if (!drawing.selection) {
                 var layer = drawing.layers.active,
                     rect = Util.rectify(stroke.start,
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
                     drawing.end_selection();
                 };
                 drawing.make_selection(action);
             } else {
                 // The user has clicked outside the selection
                 drawing.selection.abort();
                 drawing.end_selection();
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
             if (drawing.selection && !drawing.selection.editable)
                 drawing.selection.edit();
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

    // DPaint 4 palette
    var colors = [[0,0,0,255],[170,170,170,255],[101,101,101,255],[223,223,223,255],[207,48,69,255],[223,138,69,255],[207,223,69,255],[138,138,48,255],[48,138,69,255],[69,223,69,255],[69,223,207,255],[48,138,207,255],[138,138,223,255],[69,48,207,255],[207,48,207,255],[223,138,207,255],[227,227,227,255],[223,223,223,255],[223,223,223,255],[195,195,195,255],[178,178,178,255],[170,170,170,255],[146,146,146,255],[130,130,130,255],[113,113,113,255],[113,113,113,255],[101,101,101,255],[81,81,81,255],[65,65,65,255],[48,48,48,255],[32,32,32,255],[32,32,32,255],[243,0,0,255],[227,0,0,255],[227,0,0,255],[211,0,0,255],[195,0,0,255],[178,0,0,255],[178,0,0,255],[162,0,0,255],[146,0,0,255],[130,0,0,255],[113,0,0,255],[113,0,0,255],[97,0,0,255],[81,0,0,255],[65,0,0,255],[65,0,0,255],[243,211,211,255],[243,178,178,255],[243,146,146,255],[243,113,113,255],[243,81,81,255],[243,65,65,255],[243,32,32,255],[243,0,0,255],[243,162,81,255],[243,146,65,255],[243,130,32,255],[243,113,0,255],[227,97,0,255],[195,97,0,255],[178,81,0,255],[146,65,0,255],[243,243,211,255],[243,243,178,255],[243,243,146,255],[243,243,113,255],[243,243,81,255],[243,243,65,255],[243,243,32,255],[243,243,0,255],[227,211,0,255],[195,195,0,255],[178,162,0,255],[146,146,0,255],[130,130,0,255],[113,97,0,255],[81,81,0,255],[65,65,0,255],[211,243,81,255],[195,243,65,255],[178,243,32,255],[162,243,0,255],[146,227,0,255],[130,195,0,255],[113,178,0,255],[97,146,0,255],[211,243,211,255],[178,243,178,255],[146,243,146,255],[130,243,113,255],[97,243,81,255],[65,243,65,255],[32,243,32,255],[0,243,0,255],[0,243,0,255],[0,227,0,255],[0,227,0,255],[0,211,0,255],[0,195,0,255],[0,178,0,255],[0,178,0,255],[0,162,0,255],[0,146,0,255],[0,130,0,255],[0,113,0,255],[0,113,0,255],[0,97,0,255],[0,81,0,255],[0,65,0,255],[0,65,0,255],[211,243,243,255],[178,243,243,255],[146,243,243,255],[113,243,243,255],[81,243,243,255],[65,243,243,255],[32,243,243,255],[0,243,243,255],[0,227,227,255],[0,195,195,255],[0,178,178,255],[0,146,146,255],[0,130,130,255],[0,113,113,255],[0,81,81,255],[0,65,65,255],[81,178,243,255],[65,178,243,255],[32,162,243,255],[0,146,243,255],[0,130,227,255],[0,113,195,255],[0,97,178,255],[0,81,146,255],[211,211,243,255],[178,178,243,255],[146,146,243,255],[113,130,243,255],[81,97,243,255],[65,65,243,255],[32,32,243,255],[0,0,243,255],[0,0,243,255],[0,0,227,255],[0,0,227,255],[0,0,211,255],[0,0,195,255],[0,0,178,255],[0,0,178,255],[0,0,162,255],[0,0,146,255],[0,0,130,255],[0,0,113,255],[0,0,113,255],[0,0,97,255],[0,0,81,255],[0,0,65,255],[0,0,65,255],[243,211,243,255],[227,178,243,255],[211,146,243,255],[211,113,243,255],[195,81,243,255],[178,65,243,255],[178,32,243,255],[162,0,243,255],[146,0,227,255],[130,0,195,255],[113,0,178,255],[97,0,146,255],[81,0,130,255],[65,0,113,255],[48,0,81,255],[32,0,65,255],[243,211,243,255],[243,178,243,255],[243,146,243,255],[243,113,243,255],[243,81,243,255],[243,65,243,255],[243,32,243,255],[243,0,243,255],[227,0,227,255],[195,0,195,255],[178,0,178,255],[146,0,146,255],[130,0,130,255],[97,0,113,255],[81,0,81,255],[65,0,65,255],[243,227,211,255],[243,211,211,255],[243,211,195,255],[227,195,178,255],[227,178,162,255],[211,178,146,255],[211,162,146,255],[195,146,130,255],[195,146,130,255],[178,130,113,255],[178,113,97,255],[162,113,97,255],[162,97,81,255],[162,97,81,255],[146,81,65,255],[146,81,65,255],[130,65,48,255],[130,48,48,255],[113,48,32,255],[113,48,32,255],[113,32,32,255],[97,32,16,255],[97,16,16,255],[81,16,16,255],[81,16,16,255],[65,16,0,255],[65,0,0,255],[48,0,0,255],[48,0,0,255],[32,0,0,255],[32,0,0,255],[32,0,0,255],[243,81,81,255],[243,178,130,255],[243,243,130,255],[130,243,130,255],[130,243,243,255],[130,130,243,255],[178,130,243,255],[243,130,243,255],[195,32,32,255],[195,65,32,255],[195,113,32,255],[195,146,32,255],[195,195,32,255],[146,195,32,255],[113,195,32,255],[65,195,32,255],[32,195,48,255],[32,195,81,255],[32,195,130,255],[32,195,178,255],[32,162,195,255],[32,113,195,255],[32,81,195,255],[32,32,195,255],[81,32,195,255],[130,32,195,255],[178,32,195,255],[195,32,162,255],[195,32,130,255],[87,98,122,255],[180,180,180,255],[255,255,255,255]];

    // // Palette - create a random one for now
    // var colors = [[0, 0, 0, 255]];
    // for (var i=1; i<256; i++) {
    //     colors.push([Math.floor(Math.random()*255),
    //                  Math.floor(Math.random()*255),
    //                  Math.floor(Math.random()*255),
    //                  255]);
    // }
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
    var drawing = new OldPaint.Drawing({width: 800, height: 600,
                                        palette: palette, image_type: image_type,
                                        max_undos: 50});
    var drawing_view = new OldPaint.DrawingView({model: drawing, brushes: brushes,
                                                 tools: tools, eventbus: eventbus});

    var info_view = new OldPaint.InfoView({model: drawing, eventbus: eventbus});
    var layers_view = new OldPaint.MiniLayersView({model: drawing, eventbus: eventbus});

    drawing.add_layer(true);

});
