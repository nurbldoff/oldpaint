OldPaint
========

Oldskool drawing program in a browser. Somewhat inspired by programs like Deluxe Paint (good ol' DPaint) but is not intended to be a clone. OldPaint tries to add some more modern features such as layers and multiple undo while keeping the spirit of the old programs. It supports (in principle, at least) loading and saving PNG and OpenRaster files.

OldPaint can work with RGB and Indexed images. The latter means that you are limited to a palette of no more than 256 colors in each drawing. Indexed is the "native" format for OldPaint and so RGB is not as well tested. In particular, converting from Indexed to RGB may cause problems. Conversion the other way is not yet supported. OldPaint also supports transparency, but currently not partial alpha channels.

OldPaint is not a "webapp"; everything happens locally in your browser and you load/save files from your harddive. None of the functionality uses network access.

Try it at http://nurbldoff.github.com/oldpaint or just clone the repo and open "index.html" locally. In any case, the browser may give some security warnings that you need to disable in order to use OldPaint fully. The best way to run it is to install it as a "chrome app" and run it from there. That will get you closest to a native app in terms of filesystem access.

Currently OldPaint should work in Chrome, and (very) partially in Firefox 16. It is still a work in progress, and barely tested, so don't use it for anything you aren't prepared to lose. 

Feel free to post issues or pull requests if you want to give feedback!


Instructions
============
Draw with the left mousebutton, erase with the right and pan/zoom the image with the mousewheel. Some functionality can be reachable through the keyboard, such as undo (z) and redo (y). [TODO: document the rest of the shortcuts]

To access most functionality that isn't obviously visible, you open the menu, by either pressing Return or clicking the "OldPaint" text in the upper left corner. The menu is a horizontal arrangement of items, each with a title that hopefully tells you what it does when clicked. Each item also has a keyboard accelerator highlighted; pressing the corresponding letter is the same as clicking the item. Some items lead to new sub-items; these have titles ending with a ">". You can always exit the menu by pressing Escape.

The file operations are a bit unintuitive at the moment, partly because of the sorry state of local file access in web browsers. Chrome is the only browser currently coming close to enabling full access, and then only in "Chrome app" mode.

There are two different modes of saving and loading files in OldPaint; let's call them "internal" and "export". The internal mode is used for the ordinary "Drawing>Load" and "Save" functions. It means that the drawing is saved in the browser's internal storage which is not really accessible to the user except through the app. As such, it's fine as a way of persisting a drawing between sittings, but not as a way to get a drawing into or out of the program.

For that you'd use the "Drawing>Export" and "Import" functions, which access the normal filesystem, and reads and writes standard image formats that can be loaded by various other software. PNG is universally supported by now, but is limited to one layer. OpenRaster is a newer format which is not very well supported outside the open source community, but it is a very simple format that is basically a zip file containing an XML file and a bunch of PNG files each representing a layer. OldPaint reads and writes both formats - in principle.


Some planned features
=====================
 * Auto-save
 * More brush effects such as rotate, outline, etc
 * Gradient fill, pattern fill
 * Better animation functionality
 * More convenient sprite export
 

License
=======

Copyright (c) 2012, Johan Forsberg

OldPaint may be freely distributed under the MIT license.


Acknowledgements
================
OldPaint includes and makes use of the following javascript libraries:

 * jQuery  (http://jquery.com/)
 * Backbone.js  (http://backbonejs.org/)
 * Underscore  (http://underscorejs.org/)
 * jQuery UI  (http://jqueryui.com/)  
 * FileSaver.js  (https://github.com/eligrey/FileSaver.js)
 * Mousetrap  (http://craig.is/killing/mice)
 * XMLWriter  (http://flesler.blogspot.com/2008/03/xmlwriter-for-javascript.html)
 * zip.js  (http://gildas-lormeau.github.com/zip.js/)
 * Ashe  (https://github.com/dfsq/Ashe)
 * http://blog.calyptus.eu/seb/2009/05/png-parser-in-javascript/
 * http://www.xarg.org/2010/03/generate-client-side-png-files-using-javascript/
 
The "Topaz New" font is created by Al Tinsley, 1997.
