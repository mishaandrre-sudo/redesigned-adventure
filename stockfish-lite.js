// public/js/stockfish-lite.js
// A lightweight "Stockfish-like" engine implemented in JS that uses chess.js for move generation.
// This is NOT the real Stockfish; it's a small minimax engine for lightweight client-side play.

(function(global){
  // Ensure chess.js is present
  const ChessLib = (typeof global.Chess === 'function') ? global.Chess : (typeof require === 'function' ? require('chess.js').Chess : null);
  if (!ChessLib) {
    console.warn('stockfish-lite: chess.js not found. Include chess.js before using the engine.');
  }

  // Piece values for evaluation
  const PIECE_VALUE = {
    p: 100,
    n: 320,
    b: 330,
    r: 500,
    q: 900,
    k: 20000
  };

  function evaluateBoard(chess) {
    const board = chess.board();
    let score = 0;
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const p = board[r][f];
        if (p) {
          const v = PIECE_VALUE[p.type] || 0;
          score += (p.color === 'w') ? v : -v;
        }
      }
    }
    return score;
  }

  // Simple minimax with alpha-beta pruning
  function minimax(chess, depth, alpha, beta, isMaximizing) {
    if (depth === 0) return evaluateBoard(chess);
    const moves = chess.moves();
    if (moves.length === 0) {
      if (chess.in_checkmate()) {
        return isMaximizing ? -999999 : 999999;
      }
      return 0; // stalemate
    }
    if (isMaximizing) {
      let maxEval = -Infinity;
      for (let i = 0; i < moves.length; i++) {
        chess.move(moves[i]);
        const evalScore = minimax(chess, depth - 1, alpha, beta, false);
        chess.undo();
        if (evalScore > maxEval) maxEval = evalScore;
        if (evalScore > alpha) alpha = evalScore;
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (let i = 0; i < moves.length; i++) {
        chess.move(moves[i]);
        const evalScore = minimax(chess, depth - 1, alpha, beta, true);
        chess.undo();
        if (evalScore < minEval) minEval = evalScore;
        if (evalScore < beta) beta = evalScore;
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  function chooseBestMove(fen, options) {
    options = options || {};
    const depth = options.depth || 2; // shallow by default to stay lightweight
    const chess = new ChessLib(fen);
    const moves = chess.moves();
    if (moves.length === 0) return null;
    let bestMove = null;
    let bestValue = -Infinity;
    const isWhite = (chess.turn() === 'w');

    for (let i = 0; i < moves.length; i++) {
      const mv = moves[i];
      chess.move(mv);
      const val = -minimax(chess, depth - 1, -Infinity, Infinity, !isWhite);
      chess.undo();
      if (val > bestValue) {
        bestValue = val;
        bestMove = mv;
      }
    }
    return bestMove;
  }

  // Engine constructor
  function StockfishLite(opts) {
    opts = opts || {};
    this.depth = opts.depth || 2;
    this.onBestMove = opts.onBestMove || function(){};
    this.busy = false;
    this.chess = null; // maintain position if needed
  }

  StockfishLite.prototype.setPositionFromMoves = function(movesArray) {
    // initialize chess position from moves array (algebraic SAN or long algebraic from chess.js)
    if (!ChessLib) throw new Error('chess.js not available');
    this.chess = new ChessLib();
    for (let i = 0; i < movesArray.length; i++) {
      const m = movesArray[i];
      // try move as SAN/verbose; chess.js supports SAN strings
      const res = this.chess.move(m);
      if (!res) {
        // if SAN failed, try UCI long algebraic (e2e4)
        this.chess.undo();
        const alt = this.chess.move({from: m.slice(0,2), to: m.slice(2,4), promotion: m.length>4 ? m[4] : undefined});
        if (!alt) {
          // give up silently — some moves may be in different notation
          // fallback: ignore
        }
      }
    }
  };

  StockfishLite.prototype.goMovetime = function(ms) {
    if (!this.chess) this.chess = new ChessLib();
    if (this.busy) return;
    this.busy = true;
    const fen = this.chess.fen();
    const self = this;
    // run search asynchronously so UI doesn't block
    setTimeout(function(){
      const best = chooseBestMove(fen, {depth: self.depth});
      self.busy = false;
      if (best) self.onBestMove(best);
      else self.onBestMove('');
    }, 10);
  };

  StockfishLite.prototype.setDepth = function(d) { this.depth = d; };

  // Export
  if (typeof module !== 'undefined' && module.exports) module.exports = StockfishLite;
  if (typeof define === 'function' && define.amd) define(function(){ return StockfishLite; });
  global.StockfishLite = StockfishLite;

})(this);
