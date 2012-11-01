/* Obtained from http://blog.calyptus.eu/seb/2009/05/png-parser-in-javascript/ */
// Modifications by Johan Forsberg

function PNG(data){
    var reader = new Base64Reader(data);
    reader.skip(8);
    var readChunk = function () {
	var length = reader.readInt(), type = reader.readChars(4),
     data = [];
	if (reader.read(data, 0, length) != length) throw 'Out of bounds';
	reader.skip(4);
	return {
	    type: type,
	    data: data
	};
    };
    var toInt = function(bytes, index){
	return (bytes[index] << 24) | (bytes[index + 1] << 16) | (bytes[index + 2] << 8) | bytes[index + 3];
    };
    var colorType,
	colorTypes = {
	    // gray
	    0: function(reader){
		var g = reader.readByte();
		return (g << 16) | (g << 8) | g;
	    },
	    // rgb
	    2: function(reader){
		var r = reader.readByte(),
                    g = reader.readByte(),
                    b = reader.readByte();
                //return (g << 16) | (g << 8) | g;
                return [r, g, b];
	    },
	    // palette
	    3: function(reader){
		var b = reader.readByte();
		if (b == -1) return -1;
		//return this.palette[b];
                return [b];
	    },
	    // gray + alpha
	    4: function(reader){
		var g = reader.readByte(), a = reader.readByte();
		return (g << 16) | (g << 8) | g;
	    },
	    // rgb + alpha
	    6: function(reader){
		var r = reader.readByte(), g = reader.readByte(), b = reader.readByte(), a = reader.readByte();
		return (r << 16) | (g << 8) | b;
	    }
	};

    var paethPredictor = function (a, b, c) {
        // a = left, b = above, c = upper left
        var p = (((a + b) % 256) - c) % 256,  // initial estimate
            pa = Math.abs(p - a) % 256,    // distances to a, b, c
            pb = Math.abs(p - b) % 256,
            pc = Math.abs(p - c) % 256;
        //return nearest of a,b,c,
        //breaking ties in order a,b,c.
        if (pa <= pb && pa <= pc) return a;
        else {
            if (pb <= pc) return b;
            else return c;
        }
    };

    // PNG filter type 4

    var paeth = function (x, a, b, c) {
        return x - paethPredictor(a, b, c);
    };

    var inversePaeth = function (x, a, b, c) {
        return (x + paethPredictor(a, b, c)) % 256;
    };

    var filters = {
	0: function(reader){
	    var pixel, line = new Array(this.width*3);
	    for (var x=0;x<this.width;x++) {
                pixel = colorType.apply(this, [reader]);
                for (var i=0; i<pixel.length; i++) {
		    line[x*pixel.length+i] = pixel[i];
                }
            }
	    return line;
	},
	1: function(reader){
	    var bpp = 3;
	    var pixel, line = new Array(this.width*bpp);
	    var buffer = [];
	    var newreader = {
		readByte: function(){
		    var rb = reader.readByte();
		    if (rb == -1) return -1;
		    if (buffer.length == bpp)
			rb = (rb + buffer.shift()) % 256;
		    buffer.push(rb);
		    return rb;
		}
	    };
	    for (var x=0;x<this.width;x++)
		//line[x] = colorType.apply(this, [newreader]);
                pixel = colorType.apply(this, [newreader]);
                for (var i=0; i<bpp; i++) {
		    line[x*bpp+i] = pixel[i];
                }
	    return line;
	},
	2: function(reader){
	    var line = new Array(this.width);
	    var bpp = 3;
	    var buffer = [];
	    var newreader = {
		readByte: function(){
		    var rb = reader.readByte();
		    if (rb == -1) return -1;
		    if (buffer.length == bpp)
			rb = (rb + buffer.shift()) % 256;
		    buffer.push(rb);
		    return rb;
		}
	    };
	    for (var x=0;x<this.width;x++)
		line[x] = colorType.apply(this, [newreader]);
	    return line;
	},
	3: function(){ throw 'Filter 3 not implemented'; },
	4: function(reader){

        }
    };

    var dataChunks = [];
    do {
	var chunk = readChunk();
	var data = chunk.data;
	switch(chunk.type){
	case 'IHDR':
	    this.width = toInt(data, 0);
	    this.height = toInt(data, 4);
	    this.bitdepth = data[8];
	    this.colorType = data[9];
	    colorType = colorTypes[data[9]];
	    if (data[10] != 0) throw 'Unknown compression method';
	    if (data[11] != 0) throw 'Unknown filter';
	    this.interlaced = data[12];
	    break;
	case 'IDAT':
	    dataChunks[dataChunks.length] = data;
	    break;
	case 'PLTE':
	    this.palette = [];
	    for(var i=0;i<data.length / 3;i++){
		var di = i * 3;
		this.palette[i] = (data[di] << 16) | (data[di + 1] << 8) | data[di + 2];
	    }
	    break;
        case 'tRNS':
            console.log("transparency");
            this.transparency = [];
	    for(var i=0; i<data.length; i++){
                this.transparency.push(data[i]);
	    }
            break;
	};

    } while(chunk.type != 'IEND');

    console.log("Image header:", this);

    var chunkReader = new Inflator({
	chunk: 0,
	index: 2,
	readByte: function(){
	    if (this.chunk >= dataChunks.length) return -1;
	    while (this.index >= dataChunks[this.chunk].length){
		this.index = 0;
		this.chunk++;
		if (this.chunk >= dataChunks.length) return -1;
	    }
	    this.index++;
	    return dataChunks[this.chunk][this.index - 1];
	}
    });


    var last_line = [];
    for (var x = 0; x < this.width*3; x++) {
        last_line[x] = 0;
    }

    this.readLine = function () {
	var out, line, x, filter = chunkReader.readByte();
        //console.log("Filter:", filter);
	switch (filter) {
        //case -1: return null; break;
	case 1: return filters[1].apply(this, [chunkReader]); break;
        case 2:
            line = filters[0].apply(this, [chunkReader]);
            for (x = 0; x < this.width; x++) {
                for (var m=0; m<3; m++) {
                    line[x+m] = line[x+m] + last_line[x+m];
                }
            }
            last_line = line;
            return line;
            break;
        case 4:
            line = filters[0].apply(this, [chunkReader]);
            out = [];
            // Paeth(x) + PaethPredictor(Raw(x-bpp), Prior(x), Prior(x-bpp))
            line[0] = inversePaeth(line[0], 0, last_line[0], 0);
            var byte_x, byte_a, byte_b, byte_c;
            for (var x = 1; x < this.width*3; x++) {
                byte_x = line[x];
                byte_a = line[x-1];
                byte_b = last_line[x];
                byte_c = last_line[x-1];
                line[x+m] = inversePaeth(byte_x, byte_a, byte_b, byte_c);
            }
            last_line = line;
            return line;
            break;
        default:

            return filters[0].apply(this, [chunkReader]);
            break;
        }
    };
}
