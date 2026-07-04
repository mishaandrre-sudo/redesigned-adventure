// public/js/checkers-engine.js
// Lightweight checkers engine: move generation + minimax alpha-beta

(function(global){
  // Board representation: 8x8, using coordinates 'a1'..'h8' if needed, but this engine will accept and return moves in format {from:'b6',to:'c5',captures: ['d6']} or simple 'b6c5'

  function coordToIndex(coord){
    const file = coord.charCodeAt(0) - 97; // a=0
    const rank = parseInt(coord[1],10) - 1; // 1-based
    return {r:7-rank, f:file}; // rows 0..7 top to bottom
  }

  function indexToCoord(r,f){
    const file = String.fromCharCode(97+f);
    const rank = String(8-r);
    return file+rank;
  }

  // Simple evaluator: piece = 100, king = 175
  function evaluateBoard(board){
    let score=0;
    for(let r=0;r<8;r++){
      for(let f=0;f<8;f++){
        const p = board[r] && board[r][f];
        if(!p) continue;
        if(p.color==='w') score += (p.king?175:100);
        else score -= (p.king?175:100);
      }
    }
    return score;
  }

  // Helper to clone board
  function cloneBoard(board){
    return board.map(row => row.map(cell => cell? Object.assign({},cell):null));
  }

  // Generate simple moves and captures for checkers (English draughts)
  function generateMoves(board, color){
    const dirs = color==='w'? [[-1,-1],[-1,1]] : [[1,-1],[1,1]];
    const kingDirs = [[-1,-1],[-1,1],[1,-1],[1,1]];
    const moves = [];
    const captures = [];

    for(let r=0;r<8;r++){
      for(let f=0;f<8;f++){
        const p = board[r] && board[r][f];
        if(!p || p.color!==color) continue;
        const useDirs = p.king? kingDirs : dirs;
        for(const d of useDirs){
          const nr = r + d[0], nf = f + d[1];
          if(nr<0||nr>7||nf<0||nf>7) continue;
          if(!board[nr][nf]){
            moves.push({from:{r,f}, to:{r:nr,f:nf}, captures:[]});
          } else {
            // possible capture
            const mr = nr + d[0], mf = nf + d[1];
            if(mr<0||mr>7||mf<0||mf>7) continue;
            if(!board[mr][mf] && board[nr][nf].color !== color){
              // capture
              captures.push({from:{r,f}, to:{r:mr,f:mf}, captures:[{r:nr,f:nf}]});
            }
          }
        }
      }
    }

    return captures.length? captures : moves;
  }

  function applyMove(board, move){
    const b = cloneBoard(board);
    const p = b[move.from.r][move.from.f];
    b[move.from.r][move.from.f] = null;
    b[move.to.r][move.to.f] = p;
    if(move.captures && move.captures.length){
      move.captures.forEach(c=> b[c.r][c.f] = null);
    }
    // crown
    if(p && !p.king){
      if(p.color==='w' && move.to.r===0) p.king=true;
      if(p.color==='b' && move.to.r===7) p.king=true;
    }
    return b;
  }

  function minimax(board, depth, alpha, beta, maximizing, color){
    if(depth===0) return evaluateBoard(board);
    const moves = generateMoves(board, maximizing? color : (color==='w'?'b':'w'));
    if(moves.length===0) return evaluateBoard(board);
    if(maximizing){
      let maxEval = -Infinity;
      for(const m of moves){
        const nb = applyMove(board,m);
        const eval = minimax(nb, depth-1, alpha, beta, false, color);
        if(eval>maxEval) maxEval=eval;
        if(eval>alpha) alpha=eval;
        if(beta<=alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for(const m of moves){
        const nb = applyMove(board,m);
        const eval = minimax(nb, depth-1, alpha, beta, true, color);
        if(eval<minEval) minEval=eval;
        if(eval<beta) beta=eval;
        if(beta<=alpha) break;
      }
      return minEval;
    }
  }

  // Public API
  function CheckersEngine(opts){
    opts = opts||{};
    this.depth = typeof opts.depth==='number'?opts.depth:2;
    this.onBestMove = opts.onBestMove || function(){};
    this.color = opts.color||'b';
    this.board = null; // internal board
    this.busy = false;
  }

  CheckersEngine.prototype.setBoardFromMatrix = function(matrix){
    // matrix expected 8x8 with values null or {color:'w'|'b', king:bool}
    this.board = matrix.map(row => row.map(cell => cell? Object.assign({},cell):null));
  };

  CheckersEngine.prototype.go = function(){
    if(this.busy) return;
    const self = this; this.busy=true;
    setTimeout(()=>{
      const moves = generateMoves(self.board, self.color);
      if(moves.length===0){ self.busy=false; self.onBestMove(null); return; }
      let best=null, bestVal=-Infinity;
      for(const m of moves){
        const nb = applyMove(self.board,m);
        const val = minimax(nb, self.depth-1, -Infinity, Infinity, false, self.color);
        if(val>bestVal){ bestVal=val; best=m; }
      }
      self.busy=false;
      self.onBestMove(best);
    },10);
  };

  CheckersEngine.prototype.setDepth = function(d){ this.depth=d; };

  if(typeof module!=='undefined' && module.exports) module.exports = CheckersEngine;
  global.CheckersEngine = CheckersEngine;
})(this);
