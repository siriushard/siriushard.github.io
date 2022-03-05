let gameStarted = false;

//#region Draggable
document.addEventListener('keydown', function(event) {
    if (event.code == 'KeyZ') {
        console.log('Включаем режим перемещения объектов')
        $('.draggable').each(function () {
            draggable($(this));
        })
    }

    // if (event.code == 'KeyX') {
    //     console.log('Включаем режим изменения размеров объектов')
    //     $('.draggable').resizable();
    // }
});


function draggable($item) {
    let item = $item[0];

    item.onmousedown = function(event) {

        let shiftX = event.clientX - item.getBoundingClientRect().left;
        let shiftY = event.clientY - item.getBoundingClientRect().top;

        item.style.position = 'absolute';
        item.style.zIndex = 1000;
        document.body.append(item);

        moveAt(event.pageX, event.pageY);

        // moves the ball at (pageX, pageY) coordinates
        // taking initial shifts into account
        function moveAt(pageX, pageY) {
            item.style.left = pageX - shiftX + 'px';
            item.style.top = pageY - shiftY + 'px';
        }

        function onMouseMove(event) {
            moveAt(event.pageX, event.pageY);
        }

        // move the ball on mousemove
        document.addEventListener('mousemove', onMouseMove);

        // drop the ball, remove unneeded handlers
        item.onmouseup = function() {
            document.removeEventListener('mousemove', onMouseMove);
            item.onmouseup = null;
            $locationView.append($(item));

            let $body = $('body');
            let topOffset = ($body.outerHeight() - $locationView.outerHeight()) / 2;
            let leftOffset = ($body.outerWidth() - $locationView.outerWidth()) / 2;
            $item.css('top', `-=${topOffset}`);
            $item.css('left', `-=${leftOffset}`);
        };

    };

    item.ondragstart = function() {
        return false;
    };
}
//#endregion

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
        $btnPlay.text('Начать игру');
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
let musicStage;

const STAGE_PHASES = {
    DIALOG_BEFORE : 'DIALOG_BEFORE',
    DIALOG_AFTER : 'DIALOG_AFTER',
    MINI_GAME : 'MINI_GAME',
    FINISHED : 'FINISHED'
}
let stagePhase;

let finishedLocations = [];
let keyPartsNeed = 3;
let keyParts = 0;
let miniGameFeed = [];

function changeLocation(locationName) {
    currentLocationIndex = gameData.locations.findIndex(location => location.name === locationName);
    currentLocation = gameData.locations[currentLocationIndex];

    if (finishedLocations.indexOf(currentLocation.name) === -1) {
        changeStage(currentLocation, 0);
    } else {
        changeStage(currentLocation, currentLocation.stages.length - 1);
    }
}

function changeStage(location, stageIndex, stageName) {
    currentStageIndex = typeof stageName !== "undefined" ? location.stages.findIndex(stage => stage.name === stageName) : stageIndex;
    currentStage = location.stages[currentStageIndex];

    $locationView.addClass("blurred");

    $locationView.html('');
    $locationView.css("background-image", `url(assets/graphics/locations/${currentStage.background})`);

    if (typeof currentStage.journals !== "undefined") {
        currentStage.journals.forEach(function (journal) {
            let $journal = $(`<div class="btn-item_journal draggable" data-mover-target="${journal.target}"><div style="display: none">${journal.content}</div></div>`);
            $journal.appendTo($locationView);
            $journal.css(journal.position);
            $journal.css('background-image', `url(assets/graphics/items/${journal.image})`);
        });
    }

    if (typeof currentStage.movers !== "undefined") {
        currentStage.movers.forEach(function (mover) {
            let $mover = $(`<div class="btn-item_mover mover_${mover.type} draggable" data-mover-target="${mover.target}" data-mover-sound="${mover.soundClicked}"></div>`);
            $mover.appendTo($locationView);
            $mover.css(mover.position);
        });
    }

    if (finishedLocations.indexOf(currentLocation.name) === -1) {
        if (typeof currentStage.objects !== "undefined") {
            currentStage.objects.forEach(function (object) {
                let $object = $(`<div class="btn-item_object draggable" data-object-target="${object.target}"></div>`);
                $object.css(object.position);
                miniGameFeed.push(object.target);
                $object.css('background-image', `url(assets/graphics/items/${object.image})`);
                $object.appendTo($locationView);
            });
        }
    }

    setTimeout(function blurring() {
        $locationView.removeClass("blurred");

        if (typeof musicStage !== "undefined") {
            musicStage.pause();
        }

        if (typeof currentStage.musicBackground !== "undefined" && currentStage.musicBackground !== "") {
            musicStage = new Audio(`/assets/music/${currentStage.musicBackground}`);
            musicStage.play();
        }

        if (finishedLocations.indexOf(currentLocation.name) === -1) {
            stagePhase = STAGE_PHASES.DIALOG_BEFORE;
            if (currentStage.dialogBefore.length !== 0) {
                setTimeout(function blurring() {
                    showDialog(currentStage.dialogBefore);
                }, 200);
            } else {
                nextPhase();
            }
        } else {
            stagePhase = STAGE_PHASES.FINISHED;
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
        if (currentStage.objects.length === 0) {
            stagePhase = STAGE_PHASES.FINISHED;
            nextPhase();
        } else {
            stagePhase = STAGE_PHASES.MINI_GAME;
            updateNavigation();
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
        if (currentStageIndex === currentLocation.stages.length - 1) {
            finishedLocations.push(currentLocation.name);

            if (typeof currentLocation.gift !== "undefined" && currentLocation.gift !== "") {
                keyParts++;
                let keyPercent = (100 / keyPartsNeed) * keyParts;
                $navigationKeyContainerView.css('height', `${keyPercent}%`);
            }

            if (keyParts === keyPartsNeed) {
                if (currentLocation.name !== 'gift') {
                    changeLocation('gift');
                }
            }
        }
        if (typeof currentStage.soundAfterStage !== "undefined" && currentStage.soundAfterStage !== "") {
            let audio = new Audio(`/assets/sounds/${currentStage.soundAfterStage}`);
            audio.play();
        }
        nextStage();
    }
}

$locationView.on('click', '.btn-item_journal', function () {
    if (stagePhase === STAGE_PHASES.FINISHED) {
        let audio = new Audio(`/assets/sounds/openJournal.ogg`);
        audio.play();

        $journalContentView.html($(this).find('div').html());
        $journalView.show('slow');
    }
});

$locationView.on('click', '.btn-item_mover', function () {
    if (stagePhase === STAGE_PHASES.FINISHED) {
        changeLocation($(this).attr('data-mover-target'));

        if ($(this).attr('data-mover-sound') !== "") {
            let audio = new Audio(`/assets/sounds/${$(this).attr('data-mover-sound')}`);
            audio.play();
        }
    }
});

$locationView.on('click', '.btn-item_object', function () {
    if (stagePhase === STAGE_PHASES.MINI_GAME) {
        let miniGameFeedObjectIndex = miniGameFeed.findIndex(item => item === $(this).attr('data-object-target'));
        if (miniGameFeedObjectIndex !== -1) {
            miniGameFeed.splice(miniGameFeedObjectIndex, 1);
            $(this).remove();
            $navigationContentView.find(`[data-navigation-object-name="${$(this).attr('data-object-target')}"]`).addClass('success');
            let audio = new Audio('/assets/sounds/journalAddNote.ogg');
            audio.play();
        }

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
let $navigationKeyContainerView = $('#navigationKeyContainerView');

let $journalView = $("#journalView");
let $journalContentView = $("#journalContentView");
$journalView.hide();

function updateNavigation() {
    $navigationContentView.html('');
    miniGameFeed.forEach(function (object) {
        $(`<div data-navigation-object-name="${object}">${object}</div>`).appendTo($navigationContentView);
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