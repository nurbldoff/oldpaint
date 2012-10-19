/* A menu that is displayed horizontally in an element,
 * items can be selected with mouse or keyboard shortcuts */

(function( $ ){
  $.fn.linearMenu = function(items, context, start) {

      var el = this, backup = this.html(), wrap = $('<div id="menu">');
      var history = $('<div class="history">');
      wrap.append(history);
      var menu = $('<div class="items">');
      wrap.append(menu);
      el.html(wrap);
      Mousetrap.push();
      Mousetrap.bind("escape", close_menu);

      if (start) {
          items = items[start];
          var btn = $("<button>");
          btn.text(start);
          history.append(btn);
      }
      show_menu(items);
      context.menu = this;

      function find_shortcut (string) {
          for(var i=0; i<string.length; i++) {
              if (string[i] != " " && string[i] == string[i].toUpperCase())
                  return string[i].toLowerCase();
          }
          return null;
      }

      function markup_letter (string, index) {
          var before = string.substr(0, index),
              after = string.substr(index+1);
          return before + "<span class='shortcut'>" + string[index] + "</span>" + after;
      }

      function close_menu () {
          Mousetrap.pop();
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
                  Mousetrap.reset();
                  Mousetrap.bind("escape", close_menu);
                  if (_.isFunction(item)) {
                      close_menu();
                      _.bind(item, context)();
                  }
                  else show_menu(item);
                  return false;  // prevents any normal keybindings from firing..?
              };
              var shortcut = find_shortcut(name);
              Mousetrap.bind(shortcut, action);
              btn.click(action);
              btn.html(markup_letter(name, name.indexOf(shortcut.toUpperCase())));
              tmp.append(btn);
          });
          menu.html(tmp);
          //el.children().show("slide", { direction: "down" }, 100);
      }
  };
})( jQuery );