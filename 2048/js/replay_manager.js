function ReplayManager() {
  this.moveTimer = null;

  this.tileIndex = 0;
  this.moveIndex = 0;

  this.totalMoves = 0;

  this.events = {};
  this.log = {
    moves: [],
    compressedMoves: '',
    compressedTiles: ''
  };

  this.replayMoves = [];
  this.replayTiles = [];
  this.replaying = false;
  this.paused = false;
  this.replaySpeed = 200;

  this.replayDOMContainer = document.querySelector(".replay textarea");
  this.replayDOMCurrentMove = document.querySelector(".replay .current");
  this.replayDOMCurrentSpeed = document.querySelector(".replay .speed span");
  this.replayDOMTotalMoves = document.querySelector(".replay .total");
  this.replayDOMPlayButton = document.querySelector(".replay .controls .button.play");
  this.replayDOMPauseButton = document.querySelector(".replay .controls .button.pause");
  this.replayDOMStopButton = document.querySelector(".replay .controls .button.stop");
  this.replayDOMFasterButton = document.querySelector(".replay .controls .button.faster");
  this.replayDOMSlowerButton = document.querySelector(".replay .controls .button.slower");
  this.replayDOMReplayButton = document.querySelector(".replay-button");
 
  this.replayDOMPlayButton.addEventListener("click", this.runReplay.bind(this));
  this.replayDOMPlayButton.addEventListener("touchend", this.runReplay.bind(this));
  this.replayDOMPauseButton.addEventListener("click", this.pauseReplay.bind(this));
  this.replayDOMPauseButton.addEventListener("touchend", this.pauseReplay.bind(this));
  this.replayDOMStopButton.addEventListener("click", this.stopReplay.bind(this));
  this.replayDOMStopButton.addEventListener("touchend", this.stopReplay.bind(this));
  this.replayDOMReplayButton.addEventListener("click", this.runReplay.bind(this));
  this.replayDOMReplayButton.addEventListener("touchend", this.runReplay.bind(this));

  this.replayDOMFasterButton.addEventListener("click", this.setSpeed.bind(this, 100));
  this.replayDOMFasterButton.addEventListener("touchend", this.setSpeed.bind(this, 100));
  this.replayDOMSlowerButton.addEventListener("click", this.setSpeed.bind(this, -100));
  this.replayDOMSlowerButton.addEventListener("touchend", this.setSpeed.bind(this, -100));
}

ReplayManager.prototype.emit = function (event, data) {
  var callbacks = this.events[event];
  if (callbacks) {
    callbacks.forEach(function (callback) {
      callback(data);
    });
  }
};

ReplayManager.prototype.on = function (event, callback) {
  if (!this.events[event]) {
    this.events[event] = [];
  }
  this.events[event].push(callback);
};

ReplayManager.prototype.encode = function (moves) {
  var i, rv = [], n = ~~((moves.length + 2) / 3) * 3;

  for (i = 0; i < n; i += 3) {
    rv.push(
      32 +
      ((moves[i] || 0) & 3) +
      ((moves[i + 1] || 0) & 3) * 4 +
      ((moves[i + 2] || 0) & 3) * 16
    );
  }

  return String.fromCharCode.apply(null, rv);
}

ReplayManager.prototype.decode = function (compressed) {
  var i, rv = [], n = compressed.length;

  for (i = 0; i < n; ++i) {
    var b = compressed.charCodeAt(i) - 32;
    rv.push(b & 3);
    rv.push(~~(b / 4) & 3);
    rv.push(~~(b / 16) & 3);
  }

  return rv;
}

ReplayManager.prototype.reset = function() {
  this.log = {
    moves: [],
    compressedMoves: '',
    compressedTiles: ''
  };
  this.replayMoves = [];
  this.replayTiles = [];
  this.replayDOMContainer.value = '';
}

ReplayManager.prototype.recordMove = function(direction) {
  this.log.moves.push(direction);
  this.log.compressedMoves = this.encode(this.log.moves);
  this.update();
}

ReplayManager.prototype.recordTile = function(tile) {
  value = (tile.value / 2) - 1;
  this.log.compressedTiles += this.encode([value,tile.x,tile.y]);
  this.update();
}

ReplayManager.prototype.update = function() {
  if (this.replaying == true) {
    this.replayDOMCurrentMove.innerHTML = this.moveIndex;
    this.replayDOMTotalMoves.innerHTML = this.totalMoves;
  } else {
    this.replayDOMCurrentMove.innerHTML = this.log.moves.length;
    this.replayDOMTotalMoves.innerHTML = this.log.moves.length;
  }
  this.replayDOMContainer.value = 'j' + this.log.compressedMoves + 'a' + this.log.compressedTiles + 'm' + this.log.moves.length;
}

ReplayManager.prototype.runReplay = function() {
  this.replaying = true;
  this.tileIndex = 0;
  this.moveIndex = 0;

  replaycode = this.replayDOMContainer.value;
  this.replayDOMContainer.readOnly = true;

  this.replayDOMPlayButton.style.display = "none";
  this.replayDOMPauseButton.style.display = "block";

  this.emit("restart");
  this.emit('ignoreKeys', true);

  mv = replaycode.split('j')[1].split('a')[0];
  tl = replaycode.split('a')[1].split('m')[0];
  this.totalMoves = replaycode.split('m')[1];

  this.replayMoves = this.decode(mv);
  tempTiles = this.decode(tl);
  while (tempTiles.length > 0) this.replayTiles.push(tempTiles.splice(0, 3));

  // create the two initial tiles
  this.emit("addTile", this.getReplayTile());
  this.emit("addTile", this.getReplayTile());

  this.initTimer(this.replaySpeed);
}

ReplayManager.prototype.pauseReplay = function() {
  if (this.paused) this.replayDOMPauseButton.className = 'button pause';
  else this.replayDOMPauseButton.className = 'button pause active';
  this.paused = (this.paused) ? false : true;
}

ReplayManager.prototype.setSpeed = function(amt) {
  this.replaySpeed += amt;
  if (this.replaySpeed < 100) this.replaySpeed = 100;
  this.replayDOMCurrentSpeed.innerHTML = this.replaySpeed;
  if (this.replaying) this.initTimer();
}

ReplayManager.prototype.initTimer = function() {
  clearInterval(this.moveTimer);
  var that = this;
  var callReplayMove = function() {
    if (!that.paused) that.getReplayMove();
  }

  this.moveTimer = window.setInterval(callReplayMove, this.replaySpeed);
}

ReplayManager.prototype.stopReplay = function() {
  this.replaying = false;
  this.paused = false;
  this.replayDOMContainer.readOnly = false;
  this.replayDOMPlayButton.style.display = "block";
  this.replayDOMPauseButton.style.display = "none";
  clearInterval(this.moveTimer);
  this.emit('ignoreKeys', false);
  this.update();
}

ReplayManager.prototype.getReplayTile = function() {
  if (this.tileIndex == this.replayTiles.length) {
    this.stopReplay();
    return null;
  }

  var cell = {
    x: this.replayTiles[this.tileIndex][1],
    y: this.replayTiles[this.tileIndex][2]
  };

  var tile = new Tile(cell, ((this.replayTiles[this.tileIndex][0]*2)+2));

  this.tileIndex++;

  return tile;
}

ReplayManager.prototype.getReplayMove = function() {
  if (this.moveIndex == this.totalMoves) {
    this.stopReplay();
    return null;
  }
  this.emit("move", this.replayMoves[this.moveIndex]);
  this.moveIndex++;
  this.update();
}