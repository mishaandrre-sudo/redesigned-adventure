// public/js/engine-chess.js
// Bridge between UI/chess.js and StockfishLite engine

(function(global){
  if (!global.StockfishLite) {
    console.warn('engine-chess: StockfishLite not found. Include stockfish-lite.js before engine-chess.js');
  }
  if (!global.Chess) {
    console.warn('engine-chess: chess.js not found. Include chess.js before engine-chess.js');
  }

  function createChessEngine(options) {
    options = options || {};
    const onBestMove = options.onBestMove || function(){};
    const depth = options.depth || 3; // per request, increase to 3
    const engine = new StockfishLite({depth: depth, onBestMove: onBestMove});

    return {
      setPositionFromHistory: function(historyArray) {
        engine.setPositionFromMoves(historyArray);
      },
      go: function(ms) {
        engine.goMovetime(ms || 300);
      },
      setDepth: function(d) { engine.setDepth(d); },
      isBusy: function() { return engine.busy; }
    };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = createChessEngine;
  global.createChessEngine = createChessEngine;
})(this);
