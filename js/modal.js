/* Some very simple modal requesters */

var Modal = Modal || {};

// Simple popup list of clickable items
Modal.list = function (items, callback) {
    var template = _.template( $("#modal_selection_template").html(), {items: items});
    $(document.body).append(template);
    $("#popup_block").click(Modal.close);
    $(".fileitem").click(function (event) {callback(event.target.id);});
};

Modal.close = function(fadeOutTime) {
    $("#popup").remove();
    $("#popup_block").remove();
};