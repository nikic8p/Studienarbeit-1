var audioCapture = (function ()
{
    var init = function ()
    {
        initCapture();
    };
 
    function initCapture()
    {
        var constraints = { audio: true, video: false };
 
        navigator.mediaDevices.getUserMedia(constraints).then(function (stream)
        {
            var audio = document.getElementById('audioCapture');
            audio.srcObject = stream;
            audio.play();
        }).catch(function (err)
        {
            console.log(err);
        });
    }
 
    return {
        Init: init
    }
})();