function readURL(input) {
    if (input.files && input.files[0]) {

        var reader = new FileReader();

        reader.onload = function(e) {
            $('.image-upload-wrap').hide();

            $('.file-upload-image').attr('src', e.target.result);
            $('.file-upload-content').show();

            $('.image-title').html(input.files[0].name);
        };

        reader.readAsDataURL(input.files[0]);

    } else {
        removeUpload();
    }
}

function removeUpload() {
    $('.file-upload-input').replaceWith($('.file-upload-input').clone());
    $('.file-upload-content').hide();
    $('.image-upload-wrap').show();
}
$('.image-upload-wrap').bind('dragover', function() {
    $('.image-upload-wrap').addClass('image-dropping');
});
$('.image-upload-wrap').bind('dragleave', function() {
    $('.image-upload-wrap').removeClass('image-dropping');
});

function makeblob(dataURL) {
    var BASE64_MARKER = ';base64,';
    if (dataURL.indexOf(BASE64_MARKER) == -1) {
        var parts = dataURL.split(',');
        var contentType = parts[0].split(':')[1];
        var raw = decodeURIComponent(parts[1]);
        return new Blob([raw], { type: contentType });
    }
    var parts = dataURL.split(BASE64_MARKER);
    var contentType = parts[0].split(':')[1];
    var raw = window.atob(parts[1]);
    var rawLength = raw.length;

    var uInt8Array = new Uint8Array(rawLength);

    for (var i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
    }

    return new Blob([uInt8Array], { type: contentType });
}

function processImage() {
    var subscriptionKey = "39463b6321184f1797611915183e705a";

    var uriBase =
        "https://southeastasia.api.cognitive.microsoft.com/vision/v2.0/analyze";

    // Request parameters.
    var params = {
        "visualFeatures": "Categories,Description,Color",
        "details": "",
        "language": "en",
    };

    var file = $(".file-upload-input")[0].files[0];
    var reader = new FileReader();
    reader.onload = function(e) {
        var dataURL = reader.result;
        var blobObj = makeblob(dataURL);

        // Make the REST API call.
        $.ajax({
            url: uriBase + "?" + $.param(params),

            // Request headers.
            beforeSend: function(xhrObj) {
                xhrObj.setRequestHeader("Content-Type", "application/octet-stream");
                xhrObj.setRequestHeader(
                    "Ocp-Apim-Subscription-Key", subscriptionKey);
            },

            type: "POST",

            // Request body.
            mime: "application/octet-stream",
            data: blobObj,
            processData: false,
        })

        .done(function(data) {
            // Show formatted JSON on webpage.
            var desc = data.description.captions[0].text
            alert("Description of the image: " + desc);
            uploadFiles(desc);
        })

        .fail(function(jqXHR, textStatus, errorThrown) {
            // Display error message.
            var errorString = (errorThrown === "") ? "Error. " :
                errorThrown + " (" + jqXHR.status + "): ";
            errorString += (jqXHR.responseText === "") ? "" :
                jQuery.parseJSON(jqXHR.responseText).message;
            alert(errorString);
        });
    }
    reader.readAsDataURL(file);

};

// Storage account info
const accountName = "nfvazureprojectstorage";
const sasString = "se=2019-07-31&sp=rwdlac&sv=2018-03-28&ss=b&srt=sco&sig=aNjfcZ3RMTHzWMbHdJcwShA22O3jcOYkhjcgPD13DXo%3D";
const containerName = "azureprojectcontainer";
const containerURL = new azblob.ContainerURL(
    `https://${accountName}.blob.core.windows.net/${containerName}?${sasString}`,
    azblob.StorageURL.newPipeline(new azblob.AnonymousCredential));

$(document).ready(function() {
    listFile();
});

// List blobs
async function listFile() {
    try {
        let marker = undefined;
        do {
            const listBlobsResponse = await containerURL.listBlobFlatSegment(
                azblob.Aborter.none, marker);
            marker = listBlobsResponse.nextMarker;
            const items = listBlobsResponse.segment.blobItems;
            var num = 0;
            for (const blob of items) {
                $('<div class="carousel-item">' +
                    '<div class="card">' +
                    '<img class="card-img-top" src="' +
                    'https://' + accountName + '.blob.core.windows.net/' + containerName + '/' + blob.name + '" ' +
                    'alt="' + blob.name + '">' +
                    '<div class="card-body">' +
                    '<h4 class="card-title"><b>' + blob.name + '</b></h4>' +
                    '<p class="card-text"><i>Uploaded at ' + blob.properties.creationTime + '</i></p>' +
                    '<button type="button" id="del-btn" class="btn btn-primary" onclick="deleteFiles()">DELETE</button>' +
                    '</div></div></div>').appendTo('.carousel-inner');
                $('<li style="display: none;" data-target="#carousel1" data-slide-to="' + num + '" data-value="' + blob.name + '"></li>').appendTo('.carousel-indicators');
                num += 1;
            }
        } while (marker);
        $('.carousel-item').first().addClass('active');
        $('.carousel-indicators > li').first().addClass('active');
        $('#carousel1').carousel();
    } catch (error) {
        alert(error.body.message);
    }
};

// '<button type="button" class="btn btn-primary" data-toggle="modal" data-target="#del-conf">DELETE</button>'

// Upload blobs
async function uploadFiles(imgname) {
    try {
        const promises = [];
        const fileInput = document.getElementById("input-img");
        for (const file of fileInput.files) {
            const blockBlobURL = azblob.BlockBlobURL.fromContainerURL(containerURL, imgname);
            promises.push(azblob.uploadBrowserDataToBlockBlob(
                azblob.Aborter.none, file, blockBlobURL));
        }
        await Promise.all(promises);
        location.reload();
    } catch (error) {
        alert(error.body.message);
    }
};

// Delete blobs
async function deleteFiles() {
    try {
        var ele = $('#carousel1 .carousel-indicators li.active');
        const blobURL = azblob.BlobURL.fromContainerURL(containerURL, ele.data('value'));
        await blobURL.delete(azblob.Aborter.none);
        location.reload();
    } catch (error) {
        alert(error.body.message);
    }
};