var STATE_SPINNING = 1;
var STATE_SLOT1_STOP = 2;
var STATE_SLOT2_STOP = 3;
var STATE_SLOT3_STOP = 4;
var STATE_STOPPED = 5;
var STATE_RESULTS = 6;
var STATE_END = 7;

var progressCount = 0;
var progressTotalCount = 0;
function updateProgress(inc) {
    progressCount += (inc || 1);
    if (progressCount >= progressTotalCount) {
        $('#progress').css('width', '100%');
        $('#loading').slideUp(600);
    } else {
        $('#progress').css('width', parseInt(100 * progressCount / progressTotalCount) + '%');
    }
}

function preloader(items, preloadFunction, callback) {
    var itemc = 0;
    var loadc = 0;

    function _check(err, id) {
        updateProgress(1);
        if (err) {
            alert('Failed to load ' + id + ': ' + err);
        }
        loadc++;
        if (itemc == loadc) callback();
    }

    if (items.constructor == Array) {
        itemc = items.length;
        loadc = 0;
        progressTotalCount += items.length;
        items.forEach(function (item) {
            preloadFunction(item, _check);
        });
    } else {
        for (var key in items) {
            itemc++;
            progressTotalCount++;
            preloadFunction(items[key], _check);
        }
    }
}

function preloadImages(images, callback) {
    preloader(images, _preload, callback);

    function _preload(asset, doneCallback) {
        asset.img = new Image();
        asset.img.src = 'img/' + asset.path + '.png';

        asset.img.addEventListener("load", function () {
            doneCallback();
        }, false);

        asset.img.addEventListener("error", function (err) {
            doneCallback(err, asset.path);
        }, false);
    }
}

function _initWebAudio(AudioContext, format, audios, callback) {
    var context = new AudioContext();

    preloader(audios, _preload, callback);

    function _preload(asset, doneCallback) {
        var request = new XMLHttpRequest();
        request.open('GET', 'audio/' + asset.path + '.' + format, true);
        request.responseType = 'arraybuffer';

        request.onload = function () {
            context.decodeAudioData(request.response, function (buffer) {

                asset.play = function () {
                    var source = context.createBufferSource();
                    source.buffer = buffer;                    
                    source.connect(context.destination);       

                    source.noteOn ? source.noteOn(0) : source.start(0);
                };
                asset.gain = context.createGain ? context.createGain() : context.createGainNode();
                asset.gain.connect(context.destination);
                asset.gain.gain.value = 0.5;

                doneCallback();

            }, function (err) {
                asset.play = function () {
                };
                doneCallback(err, asset.path);
            });
        };
        request.onerror = function (err) {
            console.log(err);
            asset.play = function () {
            };
            doneCallback(err, asset.path);
        };
        
        request.send();
    }
}

function _initHTML5Audio(format, audios, callback) {
    preloader(audios, _preload, callback);

    function _preload(asset, doneCallback) {
        asset.audio = new Audio('audio/' + asset.path + '.' + format);
        asset.audio.preload = 'auto';
        asset.audio.addEventListener("loadeddata", function () {
            asset.play = function () {
                asset.audio.play();
            };
            asset.audio.volume = 0.6;

            doneCallback();
        }, false);

        asset.audio.addEventListener("error", function (err) {
            asset.play = function () {
            };

            doneCallback(err, asset.path);
        }, false);
    }
}

function initAudio(audios, callback) {
    var format = 'mp3';
    var elem = document.createElement('audio');
    if (elem) {
        if (!elem.canPlayType('audio/mpeg;') && elem.canPlayType('audio/ogg;')) format = 'ogg';
    }

    var AudioContext = window.webkitAudioContext || window.mozAudioContext || window.MSAudioContext || window.AudioContext;

    if (AudioContext) {
        $('#audio_debug').text('WebAudio Supported');
        return _initWebAudio(AudioContext, format, audios, callback);
    } else if (elem) {
        $('#audio_debug').text('HTML5 Audio Supported');
        return _initHTML5Audio(format, audios, callback);
    } else {
        $('#audio_debug').text('Audio NOT Supported');
        for (var key in audios) {
            audios[key].play = function () {
            };
        }
        callback();
    }
}

var IMAGE_HEIGHT = 64;
var IMAGE_TOP_MARGIN = 0;
var IMAGE_BOTTOM_MARGIN = 0;
var SLOT_SEPARATOR_HEIGHT = 0;
var SLOT_HEIGHT = IMAGE_HEIGHT + IMAGE_TOP_MARGIN + IMAGE_BOTTOM_MARGIN + SLOT_SEPARATOR_HEIGHT;
var RUNTIME = 1000;
var SPINTIME = 500;
var ITEM_COUNT = 6;
var SLOT_SPEED = 15;
var DRAW_OFFSET = 45;

var BLURB_TBL = [
    'Try again!',
    'Nice!',
    'Keep it up!',
    'JACKPOT!'
];

function copyArray(array) {
    var copy = [];
    for (var i = 0; i < array.length; i++) {
        copy.push(array[i]);
    }
    return copy;
}

function shuffleArray(array) {
    var i;

    for (i = array.length - 1; i > 0; i--) {
        var j = parseInt(Math.random() * i);
        var tmp = array[i];
        array[i] = array[j];
        array[j] = tmp;
    }
}

function InitSlotGame() {
    var game = new Game();

    var items = [
        {path: 'reel-icon-1', id: 'reel1'},
        {path: 'reel-icon-2', id: 'reel2'},
        {path: 'reel-icon-3', id: 'reel3'},
        {path: 'reel-icon-4', id: 'reel4'},
        {path: 'reel-icon-5', id: 'reel5'},
        {path: 'reel-icon-6', id: 'reel6'}
    ];
    
    var audios = {
        'roll': {path: 'roll'},
        'reel1': {path: 'reels/reel-icon-1'},
        'reel2': {path: 'reels/reel-icon-2'},
        'reel3': {path: 'reels/reel-icon-3'},
        'reel4': {path: 'reels/reel-icon-4'},
        'reel5': {path: 'reels/reel-icon-5'},
        'reel6': {path: 'reels/reel-icon-6'},
        'win2': {path: '2ofaKind'},
        'win3': {path: '3ofaKind'},
        'nowin1': {path: '1TryAgain'},
        'nowin': {path: 'nowin'}
    };

    $('canvas').attr('height', IMAGE_HEIGHT * ITEM_COUNT * 2);
    $('canvas').css('height', IMAGE_HEIGHT * ITEM_COUNT * 2);

    game.items = items;
    game.audios = audios;

    var imagesLoaded = false;
    var audioLoaded = false;

    initAudio(audios, function () {
        audioLoaded = true;
        checkLoad();
    });

    preloadImages(items, function () {
        imagesLoaded = true;
        checkLoad();
    });

    function checkLoad() {
        if (!audioLoaded || !imagesLoaded) {
            return;
        }

        function _fill_canvas(canvas, items) {
            var ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ddd';

            for (var i = 0; i < ITEM_COUNT; i++) {
                var asset = items[i];
                ctx.save();
                ctx.drawImage(asset.img, 3, i * SLOT_HEIGHT + IMAGE_TOP_MARGIN);
                ctx.drawImage(asset.img, 3, (i + ITEM_COUNT) * SLOT_HEIGHT + IMAGE_TOP_MARGIN);
                ctx.restore();
                ctx.fillRect(0, i * SLOT_HEIGHT, 70, SLOT_SEPARATOR_HEIGHT);
                ctx.fillRect(0, (i + ITEM_COUNT) * SLOT_HEIGHT, 70, SLOT_SEPARATOR_HEIGHT);
            }
        }

        game.items1 = copyArray(items);
        shuffleArray(game.items1);
        _fill_canvas(game.c1[0], game.items1);
        game.items2 = copyArray(items);
        shuffleArray(game.items2);
        _fill_canvas(game.c2[0], game.items2);
        game.items3 = copyArray(items);
        shuffleArray(game.items3);
        _fill_canvas(game.c3[0], game.items3);
        game.resetOffset = (ITEM_COUNT + 3) * SLOT_HEIGHT;

        game.loop();

        function _startRoll(e) {
            if (!game.state || game.state === STATE_END) {
                document.getElementById('play').disabled = true;
                $('h1').text('Spinning!');
                game.audios.roll.play();
                game.restart();
            }
        }

        $('#play').click(_startRoll);
        
        $(window).keypress(function (e) {
            if (e.which === 0 || e.which === 32) {
                e.preventDefault();
                _startRoll();
            }
        });
    }
}

function Game() {
    this.c1 = $('#canvas1');
    this.c2 = $('#canvas2');
    this.c3 = $('#canvas3');

    this.offset1 = -parseInt(Math.random() * ITEM_COUNT) * SLOT_HEIGHT;
    this.offset2 = -parseInt(Math.random() * ITEM_COUNT) * SLOT_HEIGHT;
    this.offset3 = -parseInt(Math.random() * ITEM_COUNT) * SLOT_HEIGHT;
    this.speed1 = this.speed2 = this.speed3 = 0;
    this.lastUpdate = new Date();

    this.vendor =
        (/webkit/i).test(navigator.appVersion) ? '-webkit' :
            (/firefox/i).test(navigator.userAgent) ? '-moz' :
                (/msie/i).test(navigator.userAgent) ? 'ms' :
                    'opera' in window ? '-o' : '';

    this.cssTransform = this.vendor + '-transform';
    this.has3d = ('WebKitCSSMatrix' in window && 'm11' in new WebKitCSSMatrix())
    this.trnOpen = 'translate' + (this.has3d ? '3d(' : '(');
    this.trnClose = this.has3d ? ',0)' : ')';
    this.scaleOpen = 'scale' + (this.has3d ? '3d(' : '(');
    this.scaleClose = this.has3d ? ',0)' : ')';

    this.draw(true);
}

Game.prototype.setRandomResult = function () {
    this.result1 = parseInt(Math.random() * this.items1.length);
    this.result2 = parseInt(Math.random() * this.items2.length);
    this.result3 = parseInt(Math.random() * this.items3.length);
};

Game.prototype.setJackpotResult = function () {
    function _find( items, id ) {
        for ( var i=0; i < items.length; i++ ) {
            if (items[i].id == id) return i;
        }
    }
    
    this.result1 = _find( this.items1, 'reel4' );
    this.result2 = _find( this.items2, 'reel4' );
    this.result3 = _find( this.items3, 'reel4' );
};

Game.prototype.restart = function () {
    this.lastUpdate = new Date();
    this.speed1 = this.speed2 = this.speed3 = SLOT_SPEED;

    this.setRandomResult();

    // uncomment to override results with jackpot
    //this.setJackpotResult();

    this.stopped1 = false;
    this.stopped2 = false;
    this.stopped3 = false;

    this.offset1 = -parseInt(Math.random(ITEM_COUNT)) * SLOT_HEIGHT;
    this.offset2 = -parseInt(Math.random(ITEM_COUNT)) * SLOT_HEIGHT;
    this.offset3 = -parseInt(Math.random(ITEM_COUNT)) * SLOT_HEIGHT;

    $('#results').hide();

    this.state = STATE_SPINNING;
};

window.requestAnimFrame = (function () {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (/* function */ callback, /* DOMElement */ element) {
            window.setTimeout(callback, 1000 / 60);
        };
})();

Game.prototype.loop = function () {
    var that = this;
    that.running = true;
    (function gameLoop() {
        that.update();
        that.draw();
        if (that.running) {
            requestAnimFrame(gameLoop);
        }
    })();
};

Game.prototype.checkWinLine = function() {
    var matchCount = 0;

    if (this.items1[this.result1].id == 'reel4') matchCount++;
    if (this.items2[this.result2].id == 'reel4') matchCount++;
    if (this.items3[this.result3].id == 'reel4') matchCount++;

    return matchCount;
};

Game.prototype.update = function () {
    var now = new Date();
    var that = this;

    function _check_slot(offset, result) {
        if (now - that.lastUpdate > SPINTIME) {
            var c = parseInt(Math.abs(offset / SLOT_HEIGHT)) % ITEM_COUNT;
            if (c == result) {
                if (result == 0) {
                    if (Math.abs(offset + (ITEM_COUNT * SLOT_HEIGHT)) < (SLOT_SPEED * 1.5)) {
                        return true;
                    }
                } else if (Math.abs(offset + (result * SLOT_HEIGHT)) < (SLOT_SPEED * 1.5)) {
                    return true;
                }
            }
        }
        return false;
    }

    switch (this.state) {
        case STATE_SPINNING:
            if (now - this.lastUpdate > RUNTIME) {
                this.state = STATE_SLOT1_STOP;
                this.lastUpdate = now;
            }
            break;
        case STATE_SLOT1_STOP:
            this.stopped1 = _check_slot(this.offset1, this.result1);
            if (this.stopped1) {
                this.speed1 = 0;
                this.state++;
                this.lastUpdate = now;
                
                var id = this.items1[this.result1].id;
                this.audios[id].play();
            }
            break;
        case STATE_SLOT2_STOP:
            this.stopped2 = _check_slot(this.offset2, this.result2);
            if (this.stopped2) {
                this.speed2 = 0;
                this.state++;
                this.lastUpdate = now;
                
                var id = this.items2[this.result2].id;
                this.audios[id].play();
            }
            break;
        case STATE_SLOT3_STOP:
            this.stopped3 = _check_slot(this.offset3, this.result3);
            if (this.stopped3) {
                this.speed3 = 0;
                this.state = STATE_STOPPED;
                
                var id = this.items3[this.result3].id;
                this.audios[id].play();
            }
            break;
        case STATE_STOPPED:
            $('h1').text('Online Slot Game');
            if (now - this.lastUpdate > 1000) {
                this.state = STATE_RESULTS;
            }
            break;
        case STATE_RESULTS:
            var matches = this.checkWinLine();
            $('#results').show();
            $('#multiplier').text(matches);
            $('#status').text(BLURB_TBL[matches]);

            if (matches == 3) {
                this.audios.win3.play();
            } else if (matches == 2) {
                this.audios.win2.play();
            } else if (matches == 1) {
                this.audios.nowin1.play();
            } else {
                this.audios.nowin.play();
            }

            this.state = STATE_END;
            break;
        case STATE_END:
            document.getElementById('play').disabled = false;
            break;
        default:
    }
};

Game.prototype.draw = function (force) {
    if (this.state >= STATE_RESULTS) return;

    for (var i = 1; i <= 3; i++) {
        var resultp = 'result' + i;
        var stopped = 'stopped' + i;
        var speedp = 'speed' + i;
        var offsetp = 'offset' + i;
        var cp = 'c' + i;
        if (this[stopped] || this[speedp] || force) {
            if (this[stopped]) {
                this[speedp] = 0;
                var c = this[resultp];
                this[offsetp] = -(c * SLOT_HEIGHT);

                if (this[offsetp] + DRAW_OFFSET > 0) {
                    this[offsetp] = -this.resetOffset + SLOT_HEIGHT * 3;
                }
            } else {
                this[offsetp] += this[speedp];
                if (this[offsetp] + DRAW_OFFSET > 0) {
                    this[offsetp] = -this.resetOffset + SLOT_HEIGHT * 3 - DRAW_OFFSET;
                }
            }
            this[cp].css(this.cssTransform, this.trnOpen + '0px, ' + (this[offsetp] + DRAW_OFFSET) + 'px' + this.trnClose);
        }
    }
};
