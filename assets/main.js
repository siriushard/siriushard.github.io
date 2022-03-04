let gameStarted = false;

//#region Game Data
let gameDataPath = "/assets/game.json";
let gameData;

function loadGameData() {
    $.getJSON(gameDataPath, function(json) {
        gameData = json;
        console.log('gameData', gameData);
    });
}
//#endregion

//#region Menu View
let $menuView = $('#menuView');
let $btnPlay = $('#btn-play');

$btnPlay.on('click', function () {
    if (gameStarted) {
        hideMenu();
    } else {
        changeLocation(gameData.defaultLocation);

        setTimeout(function blurring() {
            hideMenu();
            gameStarted = true;
        }, 200);
    }
});

function showMenu() {
    if (gameStarted) {
        $btnPlay.text('Продолжить');
    } else {
        $btnPlay.text('Новая игра');
    }

    $menuView.fadeIn('slow');
}

function hideMenu() {
    $menuView.fadeOut('slow');
}
//#endregion

//#region Location View
let $locationView = $('#locationView');
let currentLocationIndex, currentLocation;
let currentStageIndex, currentStage;

const STAGE_PHASES = {
    DIALOG_BEFORE : 'DIALOG_BEFORE',
    DIALOG_AFTER : 'DIALOG_AFTER',
    MINI_GAME : 'MINI_GAME',
    FINISHED : 'FINISHED'
}
let stagePhase;

let finishedLocations = [];
let miniGameFeed = [];

function changeLocation(locationName) {
    currentLocationIndex = gameData.locations.findIndex(location => location.name === locationName);
    currentLocation = gameData.locations[currentLocationIndex];

    changeStage(currentLocation, 0);
}

function changeStage(location, stageIndex, stageName) {
    currentStageIndex = typeof stageName !== "undefined" ? location.stages.findIndex(stage => stage.name === stageName) : stageIndex;
    currentStage = location.stages[currentStageIndex];

    $locationView.addClass("blurred");

    $locationView.html('');
    $locationView.css("background-image", `url(assets/graphics/locations/${currentStage.background})`);
    currentStage.items.forEach(function (item) {
        let $item = $(`<div class="btn-item_${item.type} draggable" data-item-target="${item.target}"></div>`);
        $item.css(item.position);
        if (item.type === 'object') {
            $item.css('background-image', `url(assets/graphics/items/${item.image})`);
        }
        $item.appendTo($locationView);
    });

    miniGameFeed = currentStage.miniGame;
    updateNavigation();

    // ЗАКОММЕНТИРОВАТЬ ПОСЛЕ РЕЛИЗА
    $('.draggable').draggable().resizable();
    // -----------------------------

    setTimeout(function blurring() {
        $locationView.removeClass("blurred");

        if (currentStage.dialogBefore.length !== 0) {
            setTimeout(function blurring() {
                stagePhase = STAGE_PHASES.DIALOG_BEFORE;
                showDialog(currentStage.dialogBefore);
            }, 200);
        } else if (currentStage.miniGame.length !== 0) {

        } else if (currentStage.dialogAfter.length !== 0) {

        }
    }, 400);
}

function nextStage() {
    if (currentStageIndex === currentLocation.stages.length - 1) {
        return false;
    } else {
        changeStage(currentLocation, currentStageIndex + 1);
    }
}

function nextPhase() {
    if (stagePhase === STAGE_PHASES.DIALOG_BEFORE) {
        if (currentStage.miniGame.length === 0) {
            stagePhase = STAGE_PHASES.FINISHED;
        } else {
            stagePhase = STAGE_PHASES.MINI_GAME;
            showNavigation();
        }
    } else if (stagePhase === STAGE_PHASES.MINI_GAME) {
        hideNavigation();

        if (currentStage.dialogAfter.length === 0) {
            stagePhase = STAGE_PHASES.FINISHED;
            nextPhase();
        } else {
            stagePhase = STAGE_PHASES.DIALOG_AFTER;
            showDialog(currentStage.dialogAfter);
        }
    } else if (stagePhase === STAGE_PHASES.DIALOG_AFTER) {
        stagePhase = STAGE_PHASES.FINISHED;
        nextPhase();
    } else if (stagePhase === STAGE_PHASES.FINISHED) {
        finishedLocations.push(currentLocation.name);
        nextStage();
    }
}

$locationView.on('click', '.btn-item_location', function () {
    if (stagePhase === STAGE_PHASES.FINISHED) {
        changeLocation($(this).attr('data-item-target'));
    }
});

$locationView.on('click', '.btn-item_object', function () {
    if (stagePhase === STAGE_PHASES.MINI_GAME) {
        let miniGameFeedObjectIndex = miniGameFeed.findIndex(item => item === $(this).attr('data-item-target'));
        if (miniGameFeedObjectIndex !== -1) {
            miniGameFeed.splice(miniGameFeedObjectIndex, 1);
        }

        updateNavigation();

        if (miniGameFeed.length === 0) {
            nextPhase();
        }
    }
});
//#endregion

//#region Navigation View
let $navigationView = $('#navigationView');
let $navigationContentView = $('#navigationContentView');
let $btnNavigationToggle = $('#btn-navigation-toggle');

function updateNavigation() {
    $navigationContentView.html('');
    miniGameFeed.forEach(function (item) {
        $(`<div>${item}</div>`).appendTo($navigationContentView);
    });
}

function showNavigation() {
    $navigationView.removeClass('collapsed');
    $navigationView.css('right', '0');
}

function hideNavigation() {
    $navigationView.addClass('collapsed');
    $navigationView.css('right', '-128px');
}

$btnNavigationToggle.on('click', function () {
    if (stagePhase === STAGE_PHASES.MINI_GAME) {
        if ($navigationView.hasClass('collapsed')) {
            showNavigation();
        } else {
            hideNavigation();
        }
    }
});
//#endregion

//#region Dialog View
let $dialogView = $('#dialogView');
let $dialogCharacterView = $('#dialogCharacterView');
let $dialogViewContent = $('#dialogViewContent');
let dialogFeed = [];

function showDialog(dialogArray) {
    dialogFeed = dialogArray;

    $dialogView.css('bottom', '10px');
    $dialogCharacterView.css('right', '10px');

    nextMessage();
}

function hideDialog() {
    $dialogView.css('bottom', `-${$dialogView.outerHeight() + 10}px`);
    $dialogCharacterView.css('right', `-${$dialogCharacterView.outerWidth() + 10}px`);
}

function nextMessage() {
    $dialogViewContent.fadeOut( "fast", function() {
        $dialogViewContent.text(dialogFeed[0]);
        dialogFeed.splice(0, 1);
    });

    $dialogViewContent.fadeIn( "fast");
}

$dialogView.on('click', function () {
    if (dialogFeed.length === 0) {
        hideDialog();
        nextPhase();
        return false;
    }

    nextMessage();
});
//#endregion

$(function () {
    showMenu();
    hideNavigation();
    hideDialog();
    loadGameData();
});