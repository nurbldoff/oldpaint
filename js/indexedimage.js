/*
   An index (palette) based image

   Uses an offscreen canvas (icanvas) to fake an index based image.
   The first (red) channel is used for the index. The alpha channel is
   kept up to date with the transparent colors, since this makes it
   easier to handle image brushes and copying. The green and blue
   channels aren't currently used for anything.

   The view (canvas) should be updated after any editing operation or
   palette change.
*/

OldPaint.IndexedImage = function (data) {

    this.type = "Indexed";

    // the "real" indexed, internal canvas
    this.icanvas = document.createElement('canvas');
    this.icanvas.width = data.width;
    this.icanvas.height = data.height;
    this.icontext = this.icanvas.getContext("2d");

    // the RGBA representation
    this.canvas = document.createElement('canvas');
    this.canvas.width = data.width;
    this.canvas.height = data.height;
    this.context = this.canvas.getContext("2d");

    this.palette = data.palette;

    if (data.image) {
        //console.log("Loading image data");
        var pixbuf = this.icontext.getImageData(
            0, 0, this.icanvas.width, this.icanvas.height);
        for (var i=0; i<data.image.length; i++) {
            pixbuf.data[i*4] = data.image[i];
            pixbuf.data[i*4+3] = 255;
        }

        this.icontext.putImageData(pixbuf, 0, 0);
    };

    this.flip = {x: 1, y: 1};

    this.get_pos = function (pos) {
        return {x: pos.x * this.flip.x, y: pos.y * this.flip.y};
    };

    this.get_rect = function (rect) {
        return {left: rect.left >= 0 ?
                    rect.left * this.flip.x : rect.left * this.flip.x - rect.width,
                top: rect.top >= 0 ?
                    rect.top * this.flip.y : rect.top * this.flip.y - rect.height,
                width: rect.width, height: rect.height};
    };

    this.get_data = function () {
        return this.icanvas;
    };

    this.drawbrush = function (pt, brush, color) {
        var width = brush.image.canvas.width, height = brush.image.canvas.height,
            rect = this.blit(brush.image.icanvas,
                             {left: 0, top: 0, width: width, height: height},
                             {left: pt.x - Math.floor(width / 2),
                              top: pt.y - Math.floor(height / 2),
                              width: width, height: height});
        return rect;
    };

    this.drawline = function (startPt, endPt, brush, color) {
        var rect = this.get_rect(Draw.drawLineWithBrush(
            this.icontext, this.get_pos(startPt), this.get_pos(endPt),
            brush.image.icanvas));
        this.updateCanvas(rect);
        return rect;
    };

    this.drawrectangle = function (startpt, size, brush, color) {
        var rect1 = Draw.drawLineWithBrush(this.icontext, startpt,
                                           {x:startpt.x+size.x, y:startpt.y},
                                           brush.image.icanvas);
        var rect2 = Draw.drawLineWithBrush(this.icontext,
                                           {x:startpt.x+size.x, y:startpt.y},
                                           {x:startpt.x+size.x, y:startpt.y+size.y},
                                           brush.image.icanvas);
        Draw.drawLineWithBrush(this.icontext, {x:startpt.x+size.x, y:startpt.y+size.y},
                               {x:startpt.x, y:startpt.y+size.y}, brush.image.icanvas);
        Draw.drawLineWithBrush(this.icontext, {x:startpt.x, y:startpt.y+size.y},
                               startpt, brush.image.icanvas);

        var rect = Util.union(rect1, rect2);
        this.updateCanvas(rect);
        return rect;
    };

    this.drawfilledrectangle = function (startpt, size, color) {
        this.icontext.fillStyle = "rgb("+color+",0,0)";
        var x0 = Math.min(startpt.x, startpt.x+size.x);
        var y0 = Math.min(startpt.y, startpt.y+size.y);
        var w = Math.max(size.x, -size.x) + 1;
        var h = Math.max(size.y, -size.y) + 1;
        this.icontext.fillRect(x0, y0, w, h);
        this.updateCanvas({left:x0, top:y0,
                              width:w, height:h});
        return {left:x0, top:y0,
                width:w, height:h};
    };

    this.drawellipse = function (pt, size, brush, color) {
        var rect = Draw.drawEllipseWithBrush(this.icontext, pt.x, pt.y,
                                             size.x, size.y, brush.image.icanvas);
        this.updateCanvas(rect);
        return rect;
    };

    this.drawfilledellipse = function (pt, radius, color) {
        var rect = Draw.drawFilledEllipse(this.icontext,
                                      pt.x, pt.y, radius.x, radius.y, color);
        this.updateCanvas(rect);
        return Util.intersect(rect, {left:0, top:0,
                               width: this.icanvas.width,
                               height: this.icanvas.height});
    };

    this.blit = function(canvas, fromrect, torect, clear) {
        if (clear) {
            this.clear(torect);
        }
        this.icontext.drawImage(canvas,
                               fromrect.left, fromrect.top,
                               fromrect.width, fromrect.height,
                               torect.left, torect.top,
                               torect.width, torect.height);
        this.updateCanvas(torect);
        return torect;
    };


    this.bucketfill = function (pt, color) {
        color = [color, 0, 0, this.palette.colors[color][3]];
        var width = this.icanvas.width, height = this.icanvas.height;
        var pixbuf = this.icontext.getImageData(0, 0, width, height);
        var rect = Draw.bucketfill(pixbuf.data, width, height, pt, color);
        this.update(pixbuf, rect.left, rect.top, rect.width, rect.height, true);
        this.updateCanvas();
        return rect;
    };

    this.gradientfill = function (pt, colors) {
        colors = _.map(colors, function (color) {
            return [color, 0, 0, this.palette.colors[color][3]];
        }, this);
        var width = this.icanvas.width, height = this.icanvas.height;
        var pixbuf = this.icontext.getImageData(0, 0, width, height);
        var rect = Draw.gradientfill(pixbuf.data, width, height, pt, colors);
        this.update(pixbuf, 0, 0, width, height, true);
        this.updateCanvas();
        return rect;
    };

    this.flipx = function() {
        var can = Util.copy_canvas(this.icanvas);
        this.icontext.scale(-1, 1);
        this.flip.x = -this.flip.x;
        var rect = {left: 0, top: 0,
                    width: this.canvas.width, height: this.canvas.height};
        this.blit(can, rect, rect, true);
        //this.context.scale(-1, 1);

        // this.icontext.clearRect(0, 0,
        //                         this.icanvas.width, this.icanvas.height);

        // this.icontext.drawImage(this.icanvas, 0, 0, -this.icanvas.width,
        //                         this.icanvas.height);
        // this.icontext.restore();
        this.updateCanvas();
        return {left: 0, top: 0,
                width: this.canvas.width, height: this.canvas.height};
    };

    this.clear = function(rect) {
        if (rect) {
            this.icontext.clearRect(rect.left, rect.top,
                                    rect.width, rect.height);
            this.context.clearRect(rect.left, rect.top,
                                   rect.width, rect.height);
        } else {
            this.icontext.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
            rect = {left: 0, top: 0,
                    width: this.canvas.width, height: this.canvas.height};
        }
        //this.updateAlpha(rect);
        return rect;
    };

    this.update = function (pixbuf, left, top, width, height, clear) {
        if (clear) {
            this.icontext.clearRect(left, top, width, height);
        }
        this.icontext.putImageData(pixbuf, 0, 0,
                                  left, top, width, height);
    };

    this.updateCanvas = function (rect) {
        rect = Util.intersect(rect, this.get_rect({left:0, top:0,
                                                   width: this.canvas.width,
                                                   height: this.canvas.height}));
        if (rect) {
            var correct = this.get_rect(rect);
            var indpix = this.icontext.getImageData(rect.left, rect.top,
                                                    rect.width, rect.height).data;
            var pixbuf = this.context.createImageData(rect.width, rect.height);
            var color;
            var data = pixbuf.data;
            for (var i=0, ilen=indpix.length; i<ilen; i+=4) {

                color = this.palette.colors[indpix[i]];
                //if (!color) {console.log(color, i, indpix[i]);}
                //console.log(pbp[i]);
                data[i] = color[0];
                data[i+1] = color[1];
                data[i+2] = color[2];
                data[i+3] = color[3];
            }
            this.context.putImageData(pixbuf, rect.left, rect.top);
        }
    };

    // make sure the alpha channel reflects the actual drawn parts.
    // This must be done after erasing (?)
    this.updateAlpha = function (rect) {
        rect = Util.intersect(rect,
                              {left:0, top:0,
                               width: this.icanvas.width,
                               height: this.icanvas.height});
        console.log("updateAlpha: ", rect.left, rect.top, rect.width, rect.height);
        if (rect) {
            var indpix = this.icontext.getImageData(rect.left, rect.top,
                                                    rect.width, rect.height);
            for (var i=0; i<indpix.data.length; i+=4) {
                indpix.data[i+3] = this.palette.colors[indpix.data[i]][3];
            }
            this.icontext.putImageData(indpix, rect.left, rect.top);
        }
    };

    this.colorize = function (color, update) {
        // change the color of all non-transparent pixels
        console.log("colorize:", color);
        var pixbuf = this.icontext.getImageData(0, 0,
                                               this.canvas.width,
                                               this.canvas.height);
        for (var i=0; i<pixbuf.data.length; i+=4) {
            if (pixbuf.data[i+3] > 0) {
                pixbuf.data[i] = color;
            }
        }
        this.icontext.putImageData(pixbuf, 0, 0);
        if (update) {
            this.updateCanvas();
        }
        return this.canvas;
    };

    this.getpixel = function (x, y) {
        return this.icontext.getImageData(x, y, 1, 1).data[0];
    };

    // Return a PNG, as base64 or as blob
    this.make_png = function (blob) {
        var p = new PNGlib(this.canvas.width, this.canvas.height,
                           this.palette.colors.length);
        var pixbuf = this.icontext.getImageData(0, 0,
                                               this.canvas.width,
                                               this.canvas.height);
        console.log("transparent color:", this.palette.colors[0]);
        p.set_palette(this.palette.colors);
        for (var x=0; x<this.canvas.width; x++) {
            for (var y=0; y<this.canvas.height; y++) {
                p.buffer[p.index(x, y)] =  String.fromCharCode(
                    pixbuf.data[y * this.canvas.width * 4 + x * 4]);
            }
        }
        if (blob) {
            var uri = "data:image/png;base64," + p.getBase64();
            return Util.convertDataURIToBlob(uri);
        } else {
            return p.getBase64();
        }
    };
};
