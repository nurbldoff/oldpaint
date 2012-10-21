/* Some very simple modal requesters */

var Modal = Modal || {};

// Simple popup list of clickable items
Modal.list = function (items, callback) {
    var template = Ashe.parse( $("#modal_selection_template").html(),
                               {title: "Load image", items: items});
    $(document.body).append(template);
    Mousetrap.push();
    $(".popup.block").click(function () {Modal.close();});
    $(".fileitem").click(function (event) {Modal.close();
                                           callback(event.target.id);});
};

Modal.alert = function (title, message, ok_callback, abort_callback) {
    var template = Ashe.parse( $("#modal_alert_template").html(),
                               {title: title, message: message});
    $(document.body).append(template);
    Mousetrap.push();
    $(".popup.block").click(function () {
        Modal.close();
        abort_callback();
    });
    var on_ok_click = function (event) {Modal.close();
                                        ok_callback();};
    var on_abort_click = function (event) {Modal.close();
                                        abort_callback();};
    Mousetrap.bind("return", on_ok_click);
    Mousetrap.bind("escape", on_abort_click);
    $("#ok").click(on_ok_click);
    $("#abort").click(on_abort_click);
};


Modal.input = function (title, message, ok_callback, abort_callback) {
    var template = Ashe.parse( $("#modal_input_template").html(),
                               {title: title, message: message});
    $(document.body).append(template);
    $('input[name="modal"]').focus();
    $('input[name="modal"]').bind();
    Mousetrap.push();
    $(".popup.block").click(function () {
        Modal.close();
        abort_callback();
    });
    var on_ok_click = function (event) {
        Mousetrap.unbind("return");
        ok_callback($('input[name="modal"]').val());
        Modal.close();
    };
    var on_abort_click = function (event) {Modal.close();
                                           abort_callback();};
    Mousetrap.bind("return", on_ok_click);
    Mousetrap.bind("escape", on_abort_click);
    $("#ok").click(on_ok_click);
    $("#abort").click(on_abort_click);
};


Modal.close = function(fadeOutTime) {
    Mousetrap.pop();
    $(".popup").unbind();
    $(".popup").remove();
};