'use client';
import React, { memo, useState } from "react";

const CHESS_PIECES: Record<string, string> = {
  wK:"♔", wQ:"♕", wR:"♖", wB:"♗", wN:"♘", wP:"♙",
  bK:"♚", bQ:"♛", bR:"♜", bB:"♝", bN:"♞", bP:"♟",
};
type Board = (string|null)[][];
function initChessBoard(): Board {
  const b: Board = Array.from({length:8},()=>Array(8).fill(null));
  const back = ["R","N","B","Q","K","B","N","R"];
  for (let c=0;c<8;c++) { b[0][c]="b"+back[c]; b[1][c]="bP"; b[7][c]="w"+back[c]; b[6][c]="wP"; }
  return b;
}
function inBounds(r:number,c:number){return r>=0&&r<8&&c>=0&&c<8;}
function color(p:string|null){return p?p[0]:null;}
function getLegalMoves(board:Board,r:number,c:number):([number,number])[]{
  const p=board[r][c]; if(!p) return [];
  const col=p[0], type=p[1];
  const moves:([number,number])[]=[]; const enemy=col==="w"?"b":"w";
  const slide=(dr:number,dc:number)=>{let nr=r+dr,nc=c+dc;while(inBounds(nr,nc)){if(color(board[nr][nc])===col)break;moves.push([nr,nc]);if(board[nr][nc])break;nr+=dr;nc+=dc;}};
  if(type==="P"){
    const dir=col==="w"?-1:1; const start=col==="w"?6:1;
    if(inBounds(r+dir,c)&&!board[r+dir][c]){moves.push([r+dir,c]);if(r===start&&!board[r+2*dir][c])moves.push([r+2*dir,c]);}
    for(const dc of[-1,1])if(inBounds(r+dir,c+dc)&&color(board[r+dir][c+dc])===enemy)moves.push([r+dir,c+dc]);
  }else if(type==="R"){for(const[dr,dc]of[[1,0],[-1,0],[0,1],[0,-1]])slide(dr,dc);}
  else if(type==="B"){for(const[dr,dc]of[[1,1],[1,-1],[-1,1],[-1,-1]])slide(dr,dc);}
  else if(type==="Q"){for(const[dr,dc]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]])slide(dr,dc);}
  else if(type==="N"){for(const[dr,dc]of[[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]])if(inBounds(r+dr,c+dc)&&color(board[r+dr][c+dc])!==col)moves.push([r+dr,c+dc]);}
  else if(type==="K"){for(const[dr,dc]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]])if(inBounds(r+dr,c+dc)&&color(board[r+dr][c+dc])!==col)moves.push([r+dr,c+dc]);}
  return moves;
}
function aiMove(board:Board):Board|null{
  const pieces:[number,number][]=[];
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(board[r][c]?.startsWith("b"))pieces.push([r,c]);
  const all:[number,number,number,number][]=[];
  for(const[r,c]of pieces)for(const[nr,nc]of getLegalMoves(board,r,c))all.push([r,c,nr,nc]);
  if(!all.length)return null;
  const[sr,sc,dr,dc]=all[Math.floor(Math.random()*all.length)];
  const nb=board.map(row=>[...row]);
  nb[dr][dc]=nb[sr][sc]; nb[sr][sc]=null;
  if(nb[dr][dc]==="bP"&&dr===7)nb[dr][dc]="bQ";
  if(nb[dr][dc]==="wP"&&dr===0)nb[dr][dc]="wQ";
  return nb;
}

const IGamepad = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><line x1="15" x2="15.01" y1="12" y2="12"/><line x1="18" x2="18.01" y1="10" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 16.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/></svg>;

function ChessGame() {
  const [chessBoard,    setChessBoard]    = useState(initChessBoard);
  const [chessSelected, setChessSelected] = useState<[number,number]|null>(null);
  const [legalMoves,    setLegalMoves]    = useState<[number,number][]>([]);
  const [moveHistory,   setMoveHistory]   = useState<string[]>([]);
  const [isWhiteTurn,   setIsWhiteTurn]   = useState(true);
  const [chessStatus,   setChessStatus]   = useState<"playing"|"white_wins"|"black_wins">("playing");

  function handleChessClick(row: number, col: number) {
    if (!isWhiteTurn || chessStatus !== "playing") return;
    if (chessSelected) {
      const [sr, sc] = chessSelected;
      if (sr === row && sc === col) { setChessSelected(null); setLegalMoves([]); return; }
      const isLegal = legalMoves.some(([lr,lc])=>lr===row&&lc===col);
      if (isLegal) {
        const nb = chessBoard.map(r => [...r]);
        const piece = nb[sr][sc]!;
        const captured = nb[row][col];
        nb[row][col] = piece; nb[sr][sc] = null;
        if(piece==="wP"&&row===0) nb[row][col]="wQ";
        const ch=String.fromCharCode(97+col),rn=8-row,fc=String.fromCharCode(97+sc),fr=8-sr;
        const note = `${CHESS_PIECES[piece]||"?"} ${fc}${fr}→${ch}${rn}${captured?"×":""}`;
        setMoveHistory(prev=>[...prev, note]);
        if(captured==="bK"){ setChessBoard(nb); setChessSelected(null); setLegalMoves([]); setChessStatus("white_wins"); return; }
        setChessBoard(nb); setChessSelected(null); setLegalMoves([]); setIsWhiteTurn(false);
        setTimeout(()=>{
          setChessBoard(prev=>{
            const after = aiMove(prev);
            if(!after) return prev;
            const hasWK = after.flat().includes("wK");
            if(!hasWK) setChessStatus("black_wins");
            setMoveHistory(h=>[...h, "AIfa moves"]);
            return after;
          });
          setIsWhiteTurn(true);
        }, 600);
      } else if (chessBoard[row][col]?.startsWith("w")) {
        const ml = getLegalMoves(chessBoard, row, col);
        setChessSelected([row,col]); setLegalMoves(ml);
      } else { setChessSelected(null); setLegalMoves([]); }
    } else {
      const piece = chessBoard[row][col];
      if (piece?.startsWith("w")) {
        const ml = getLegalMoves(chessBoard, row, col);
        setChessSelected([row,col]); setLegalMoves(ml);
      }
    }
  }

  function resetGame() {
    setChessBoard(initChessBoard()); setChessSelected(null); setLegalMoves([]);
    setMoveHistory([]); setIsWhiteTurn(true); setChessStatus("playing");
  }

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
        <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <IGamepad />
        </div>
        <div>
          <div style={{ fontSize: "18px", fontWeight: 700, color: "rgb(232,232,240)" }}>Game Arena</div>
          <div style={{ fontSize: "12px", color: "rgb(107,114,128)" }}>Play chess against AIfa — your AI companion</div>
        </div>
      </div>

      <div className="glass-panel-sm" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", padding: "12px 24px", marginBottom: "16px" }}>
        {chessStatus === "white_wins" && <span style={{ fontWeight: 700, fontSize: "16px", color: "#10B981" }}>🏆 You win! White wins!</span>}
        {chessStatus === "black_wins" && <span style={{ fontWeight: 700, fontSize: "16px", color: "#ef4444" }}>💀 AIfa wins! Black wins!</span>}
        {chessStatus === "playing" && <span style={{ fontWeight: 600, color: "rgb(232,232,240)" }}>{isWhiteTurn ? "♔ White to move" : "⏳ AIfa thinking…"}</span>}
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
        <div className="glass-panel" style={{ padding: "12px", display: "inline-block" }}>
          <div style={{ display: "flex", paddingLeft: "20px", marginBottom: "2px" }}>
            {["a","b","c","d","e","f","g","h"].map(l=><div key={l} style={{ width:"48px", textAlign:"center", fontSize:"10px", color:"rgb(107,114,128)" }}>{l}</div>)}
          </div>
          {chessBoard.map((row, r) => (
            <div key={r} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ width:"20px", fontSize:"10px", color:"rgb(107,114,128)", textAlign:"right", paddingRight:"4px" }}>{8-r}</div>
              {row.map((piece, c) => {
                const isDark = (r + c) % 2 === 1;
                const isSelected = chessSelected?.[0]===r && chessSelected?.[1]===c;
                const isLegalTarget = legalMoves.some(([lr,lc])=>lr===r&&lc===c);
                const isCapture = isLegalTarget && !!piece;
                return (
                  <button key={c} onClick={() => handleChessClick(r, c)}
                    style={{ width: "48px", height: "48px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", border: "none", cursor: "pointer", position: "relative",
                      background: isSelected ? "rgba(124,58,237,0.45)" : isLegalTarget ? (isDark ? "rgba(16,185,129,0.25)" : "rgba(16,185,129,0.18)") : isDark ? "rgba(30,27,75,0.7)" : "rgba(49,46,129,0.4)",
                      outline: isSelected ? "2px solid #7C3AED" : isCapture ? "2px solid #10B981" : "none", transition: "background 0.12s" }}>
                    {isLegalTarget && !piece && <div style={{ width:"14px", height:"14px", borderRadius:"50%", background:"rgba(16,185,129,0.6)", pointerEvents:"none" }} />}
                    {piece && (
                      <span style={{ color: piece.startsWith("w") ? "white" : "#06B6D4", textShadow: piece.startsWith("w") ? "0 0 4px rgba(255,255,255,0.4)" : "0 0 4px rgba(6,182,212,0.4)" }}>
                        {CHESS_PIECES[piece] || ""}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <div className="glass-panel" style={{ padding: "16px" }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "rgb(232,232,240)", marginBottom: "10px" }}>📜 Move History</div>
          <div style={{ maxHeight: "120px", overflowY: "auto" }}>
            {moveHistory.length === 0 ? (
              <div style={{ fontSize: "12px", color: "rgb(107,114,128)" }}>No moves yet</div>
            ) : moveHistory.map((m, i) => (
              <div key={i} style={{ display: "flex", gap: "8px", fontSize: "13px", marginBottom: "2px" }}>
                <span style={{ color: "rgb(107,114,128)", fontSize: "11px", width: "20px" }}>{i+1}.</span>
                <span style={{ color: "rgb(232,232,240)" }}>{m}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-panel" style={{ padding: "16px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px" }}>
          <button onClick={resetGame}
            style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)", color: "#7C3AED", padding: "10px 20px", borderRadius: "12px", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "Inter,sans-serif" }}>
            ↺ New Game
          </button>
          <div style={{ fontSize: "11px", color: "rgb(107,114,128)" }}>Start a new match</div>
        </div>
      </div>
    </div>
  );
}

export default memo(ChessGame);
