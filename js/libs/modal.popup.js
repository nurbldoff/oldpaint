function modalPopup(url, drawing, save) {

    var containerid = "popup";
    var loadingImage = "images/loading.gif";

    var tmpl_name = save ? "#save_popup_template" : "#load_popup_template";
    var template = _.template( $(tmpl_name).html(), {});
    $(document.body).append(template);

    $("#popup_block").click(closePopup);
    $("#popup_save").click({drawing: drawing}, save_drawing);

    page_request = new XMLHttpRequest();

    page_request.onreadystatechange = function () {
	if((url.search(/.ora/i)==-1) && (url.search(/.jpeg/i)==-1) &&
                (url.search(/.gif/i)==-1) && (url.search(/.png/i)==-1) &&
                (url.search(/.bmp/i)==-1)) {
            console.log("url:", url);
	    pageloader(page_request, containerid, loadingImage);
	} else {
            //console.log(page_request.responseText);
	    imageloader(page_request, drawing, url, containerid, loadingImage);
	}
        // Modify links to load within the popup
        $("div.fileitem.dir").click(function (ev) {
            console.log($(this).text());
            url = $(this).attr("href");
            page_request.open("GET", url, true);
            page_request.send(null);
        });
        $("div.fileitem.ora, div.fileitem.png").click(function (ev) {
            console.log($(this).text(), $(this).attr("href"));
            if (save) {
                $("#popup_filename").val($(this).text());
            } else {
                url = $(this).attr("href");
                page_request.open("GET", url, true);
                page_request.send(null);
            }
        });
    };

    page_request.open('GET', url, true);
    page_request.send(null);

}

function pageloader(page_request, containerid, loadingImage){
    $("#popup_list").html(
        '<div align="center"><img src="' + loadingImage + '" border="0" /></div>');

    if (page_request.readyState == 4 &&
            (page_request.status==200 || window.location.href.indexOf("http")==-1)) {
	$("#popup_body").html(page_request.responseText);
    }
}

function imageloader(page_request, drawing, url, containerid, loadingImage) {
    $("#popup_list").html(
        '<div align="center"><img src="' + loadingImage + '" border="0" /></div>');

    if (page_request.readyState == 4 &&
            (page_request.status==200 || window.location.href.indexOf("http")==-1)) {
        var data = eval("(" + page_request.responseText + ")");
        console.log(data.width);
        drawing.load(data);
        closePopup();
    }
}

function save_drawing(ev) {
    var filename = $("#popup_path").text() + "/" + $("#popup_filename").val();
    console.log("popup save", filename);
    ev.data.drawing.save(filename);
    closePopup();
}

function closePopup(fadeOutTime) {
    $("#popup").remove();
    $("#popup_block").remove();
}
