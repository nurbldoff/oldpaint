/* A general RGB(A) image */

OldPaint.RGBImage = function (data) {

    this.type = "RGB"

    if (data.canvas) {
        this.canvas = data.canvas;
    } else {
        this.canvas = document.createElement('canvas');
    }
    this.canvas.width = data.width;
    this.canvas.height = data.height;
    this.context = this.canvas.getContext("2d");

    this.palette = data.palette;
    console.log("Palette:", this.palette.colors);

    if (data.image) {
        console.log("Loading image data");
        var pixbuf = this.context.getImageData(
            0, 0, this.canvas.width, this.canvas.height);
        for (var i=0; i<data.image.length; i++) {
            pixbuf.data[i] = data.image[i];
        }
        this.context.putImageData(pixbuf, 0, 0);
    };


    this.get_data = function () {
        return this.canvas;
    };

    this.drawbrush = function (pt, brush, color) {
        var width = brush.image.canvas.width, height = brush.image.canvas.height;
        var rect = this.blit(brush.image.canvas,
                             {left: 0, top: 0, width: width, height: height},
                             {left: pt.x - Math.floor(width / 2),
                              top: pt.y - Math.floor(height / 2),
                              width: width, height: height});
        return rect;
    };

    this.drawline = function (startPt, endPt, brush, color) {
        var erase = !this.palette.colors[color][3];
        var rect = Draw.drawLineWithBrush(
            this.context, startPt, endPt, brush.image.canvas, null, erase);
        return rect;
    };

    this.drawrectangle = function (startpt, size, brush, color) {
        var rect1 = Draw.drawLineWithBrush(this.context, startpt,
                                           {x:startpt.x+size.x, y:startpt.y},
                                           brush.image.canvas);
        var rect2 = Draw.drawLineWithBrush(this.context,
                                           {x:startpt.x+size.x, y:startpt.y},
                                           {x:startpt.x+size.x, y:startpt.y+size.y},
                                           brush.image.canvas);
        Draw.drawLineWithBrush(this.context, {x:startpt.x+size.x, y:startpt.y+size.y},
                               {x:startpt.x, y:startpt.y+size.y}, brush.image.canvas);
        Draw.drawLineWithBrush(this.context, {x:startpt.x, y:startpt.y+size.y},
                               startpt, brush.image.canvas);

        var rect = Util.union(rect1, rect2);
        return rect;
    };

    this.drawfilledrectangle = function (startpt, size, index) {
        var color = this.palette.colors[index];
        this.context.fillStyle =
            "rgb("+color[0]+","+color[1]+","+color[2]+")";
        var x0 = Math.min(startpt.x, startpt.x+size.x);
        var y0 = Math.min(startpt.y, startpt.y+size.y);
        var w = Math.max(size.x, -size.x) + 1;
        var h = (size.y >= 0 ? size.y : -size.y) + 1;
        if (color[3] == 0) {
            this.context.clearRect(x0, y0, w, h);
        } else {
            this.context.fillRect(x0, y0, w, h);
        }
        return {left:x0, top:y0,
                width:w, height:h};
    };

    this.clear = function(rect) {
        if (rect) {
            this.context.clearRect(rect.left, rect.top,
                                   rect.width, rect.height);
            return rect;
        } else {
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
            return {left: 0, top: 0,
                    width: this.canvas.width, height: this.canvas.height};
        }
    };

    this.drawellipse = function (pt, size, brush, color) {
        var erase = !this.palette.colors[color][3],
            rect = Draw.drawEllipseWithBrush(this.context, pt.x, pt.y,
                                         size.x, size.y, brush.image.canvas, 1, 1, erase);
        return rect;
    };

    this.drawfilledellipse = function (pt, radius, color) {
        var rect = Draw.drawFilledEllipse(this.context,
                                          pt.x, pt.y, radius.x, radius.y,
                                          this.palette.colors[color]);
        return Util.intersect(rect, {left:0, top:0,
                                     width: this.canvas.width,
                                     height: this.canvas.height});
    };

    this.blit = function(canvas, fromrect, torect, clear) {
        if (clear) {
            this.clear(torect);
        }
        this.context.drawImage(canvas,
                               fromrect.left, fromrect.top,
                               fromrect.width, fromrect.height,
                               torect.left, torect.top,
                               torect.width, torect.height);
        return torect;
    };

    this.bucketfill = function (pt, color) {
        var width = this.canvas.width, height = this.canvas.height;
        var pixbuf = this.context.getImageData(0, 0, width, height);
        console.log("filling...", color);
        Draw.bucketfill(pixbuf.data, width, height, pt, this.palette.colors[color]);
        console.log("filled!");
        this.update(pixbuf, 0, 0, width, height, true);
        // here the actual "dirty" rect should be returned..."
        return {left:0, top:0, width:width, height:height};
    };

    this.gradientfill = function (pt, colors) {
        colors = _.map(colors, function (color) {
            return this.palette.colors[color];
        }, this);
        var width = this.canvas.width, height = this.canvas.height;
        var pixbuf = this.context.getImageData(0, 0, width, height);
        //console.log("filling...", color);
        var rect = Draw.gradientfill(pixbuf.data, width, height, pt, colors);
        this.update(pixbuf, 0, 0, width, height, true);
        this.updateCanvas();
        return rect;
    };

    // this.clear = function(rect) {
    //     if (rect) {
    //         this.context.clearRect(rect.left, rect.top,
    //                                rect.width, rect.height);
    //     } else {
    //         this.context.clearRect(0, 0, this.width, this.height);
    //     }
    // };

    this.update = function (pixbuf, left, top, width, height, clear) {
        if (clear) {
            this.context.clearRect(left, top, width, height);
        }
        this.context.putImageData(pixbuf, 0, 0,
                                  left, top, width, height);
    };

    this.updateCanvas = function () {};

    this.colorize = function (color, update) {
        // change the color of all non-transparent pixels
        var pixbuf = this.context.getImageData(0, 0,
                                               this.canvas.width,
                                               this.canvas.height);
        color = this.palette.colors[color];
        for (var i=0; i<pixbuf.data.length; i+=4) {
            if (pixbuf.data[i+3] > 0) {
                pixbuf.data[i] = color[0];
                pixbuf.data[i+1] = color[1];
                pixbuf.data[i+2] = color[2];
                //pixbuf.data[i+3] = color[3];
            }
        }
        this.context.putImageData(pixbuf, 0, 0);
        return this.canvas;
    };

    this.getpixel = function (x, y) {
        return this.context.getImageData(x, y, 1, 1).data;
    };

    // Return a binary PNG image, base64 or blob
    this.make_png = function (blob) {
        if (blob) {
            return Util.convertDataURIToBlob(this.canvas.toDataURL());
        } else {
            return this.canvas.toDataURL().slice(22);
        }
    };

};
