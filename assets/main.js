let gameDataPath = "/assets/game.json";
let hostname = window.location.hostname;

$(function () {
    let gameData;

    let $sceneView = $('#sceneView');

    loadGameData();

    function loadGameData() {
        $.getJSON(gameDataPath, function(json) {
            gameData = json;
            console.log('gameData', gameData);


            changeScene(gameData.defaultLocation);
        });
    }

    function changeScene(locationName) {
        let location = gameData.locations[locationName];

        changeStage(location);
    }

    function changeStage(location, stageNumber) {
        let stage = location.stages[location.defaultStage];
        console.log('stageData', stage);

        $sceneView.addClass("blurred");
        $sceneView.css("background-image", `url(${stage.background})`);
        let sceneTimerId = setTimeout(function blurring() {
            $sceneView.removeClass("blurred");
        }, 400);
        console.log( hostname + stage.background);
    }
});