/* A menu that is displayed horizontally in an element,
 * items can be selected with mouse or keyboard shortcuts */

(function( $ ){
  $.fn.linearMenu = function(items, context) {

      var el = this, backup = this.html(), wrap = $('<div id="menu">');
      var history = $('<div class="history">');
      wrap.append(history);
      var menu = $('<div class="items">');
      wrap.append(menu);
      el.html(wrap);

      function find_shortcut (string) {
          for(var i=0; i<string.length; i++) {
              if (string[i] != " " &&
                  string[i] == string[i].toUpperCase()) return string[i].toLowerCase();
          }
          return null;
      }

      function markup_letter (string, index) {
          var before = string.substr(0, index),
              after = string.substr(index+1);
          return before + "<span class='shortcut'>" + string[index] + "</span>" + after;
      }

      function close_menu () {
          $(document).unbind("keydown");  // remove all the menu keybindings
          $(document).unbind("keyup");
          el.html(backup);
          context.menu = null;
      }
      //$(document).bind("keyup.Esc", close_menu);
      this.close_menu = close_menu;

      function show_menu (items) {
          var tmp = $('<div>');
          $.each(items, function (name, item) {
              var btn = $('<button class="menuitem">');
              var action = function (event) {
                  btn.removeClass("menuitem");
                  history.append(btn);
                  $(document).unbind("keydown");  // remove all the menu keybindings
                  if (_.isFunction(item)) {
                      close_menu();
                      _.bind(item, context)();
                  }
                  else show_menu(item);
                  return false;  // prevents any normal keybindings from firing..?
              };
              var shortcut = find_shortcut(name);
              $(document).bind("keydown." + shortcut, action);
              btn.click(action);
              btn.html(markup_letter(name, name.indexOf(shortcut.toUpperCase())));
              //btn.text(name);
              tmp.append(btn);
          });
          menu.html(tmp);
          //el.children().show("slide", { direction: "down" }, 100);
      }
      show_menu(items);
      context.menu = this;
  };
})( jQuery );