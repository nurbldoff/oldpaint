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

    this.flip = {x: false, y: false};

    this.get_pos = function (pos) {
        return {x: this.flip.x ? this.canvas.width - pos.x : pos.x,
                y: this.flip.y ? this.canvas.height - pos.y : pos.y};
    };

    this.get_rect = function (rect) {
        return {left: this.flip.x ?
                    this.canvas.width - (rect.left + rect.width) : rect.left,
                top: this.flip.y ?
                    this.canvas.height - (rect.top + rect.height) : rect.top,
                width: rect.width, height: rect.height};
    };

    this.get_data = function () {
        return this.icanvas;
    };

    this.put_data = function (data) {
        var pixbuf = this.icontext.getImageData(
            0, 0, this.icanvas.width, this.icanvas.height);
        for (var i=0; i<data.length; i++) {
            pixbuf.data[i] = data[i];
        }
        this.icontext.putImageData(pixbuf, 0, 0);
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
        startPt = this.get_pos(startPt);
        endPt = this.get_pos(endPt);
        var rect = Draw.drawLineWithBrush(this.icontext, startPt, endPt,
                                          brush.image.icanvas);
        return this.updateCanvas(rect);
    };

    this.drawrectangle = function (startpt, size, brush, color) {
        startPt = this.get_pos(startPt);
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
        startpt = this.get_pos(startpt);
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
        var torect2 = this.get_rect(torect);
        if (clear) {
            this.clear(torect);
        }
        this.icontext.drawImage(canvas,
                               fromrect.left, fromrect.top,
                               fromrect.width, fromrect.height,
                               torect2.left, torect2.top,
                               torect2.width, torect2.height);
        return this.updateCanvas(torect);
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
        this.flip.x = !this.flip.x;
        this.context.clearRect(0, 0,
                               this.canvas.width, this.canvas.height);
        //this.context.scale(-1, 1);
        this.updateCanvas();
        return rect = {left: 0, top: 0,
                    width: this.canvas.width, height: this.canvas.height};
    };

    this.clear = function(rect, color) {
        console.log(rect.left, rect.top, rect.height, rect.width);
        var torect = this.get_rect(rect);
        if (rect) {
            this.icontext.clearRect(rect.left, rect.top,
                                    rect.width, rect.height);
            this.context.clearRect(torect.left, torect.top,
                                   torect.width, torect.height);
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
        rect = Util.intersect(rect, {left:0, top:0,
                                     width: this.canvas.width,
                                     height: this.canvas.height});
        //console.log("updateCanvas", rect.left, rect.top, rect.height, rect.width);
        if (rect) {
            var torect = this.get_rect(rect);
            console.log(rect, torect);
            var tmp = Util.copy_canvas(this.icanvas, rect, this.flip).getContext('2d');
            var indpix = tmp.getImageData(0, 0,
                                          torect.width, torect.height).data;
            var pixbuf = this.context.createImageData(torect.width, torect.height),
                color, data = pixbuf.data, index, yinc = rect.width * 4, x, y;

            for (y=0; y<rect.height*rect.width*4; y+=yinc) {
                for (x=y; x<y+yinc; x+=4) {
                    color = this.palette.colors[indpix[x]];
                    //if (!color) {console.log(color, i, indpix[i]);}
                    //console.log(pbp[i]);
                    data[x] = color[0];
                    data[x+1] = color[1];
                    data[x+2] = color[2];
                    data[x+3] = color[3];
                }
            }
            this.context.putImageData(pixbuf, torect.left, torect.top);
            return torect;
        }
        return rect;
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

    // Return an internal representation that can be saved
    this.get_raw = function () {
        return Util.convertDataURIToBlob(this.icanvas.toDataURL());
    };
};
