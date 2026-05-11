'use client';
import React, { memo, useState, useEffect } from "react";
import { useLang, t, type Lang } from "@/lib/i18n";

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return mobile;
}

// ─── Chess (extracted from ChessGame.tsx) ────────────────────────────────────
const CHESS_PIECES: Record<string, string> = {
  wK:"♔", wQ:"♕", wR:"♖", wB:"♗", wN:"♘", wP:"♙",
  bK:"♚", bQ:"♛", bR:"♜", bB:"♝", bN:"♞", bP:"♟",
};
type ChessBoard = (string|null)[][];
function initChessBoard(): ChessBoard {
  const b: ChessBoard = Array.from({length:8},()=>Array(8).fill(null));
  const back = ["R","N","B","Q","K","B","N","R"];
  for (let c=0;c<8;c++) { b[0][c]="b"+back[c]; b[1][c]="bP"; b[7][c]="w"+back[c]; b[6][c]="wP"; }
  return b;
}
function inBoundsC(r:number,c:number){return r>=0&&r<8&&c>=0&&c<8;}
function colorC(p:string|null){return p?p[0]:null;}
function getLegalMoves(board:ChessBoard,r:number,c:number):([number,number])[]{
  const p=board[r][c]; if(!p) return [];
  const col=p[0], type=p[1];
  const moves:([number,number])[]=[]; const enemy=col==="w"?"b":"w";
  const slide=(dr:number,dc:number)=>{let nr=r+dr,nc=c+dc;while(inBoundsC(nr,nc)){if(colorC(board[nr][nc])===col)break;moves.push([nr,nc]);if(board[nr][nc])break;nr+=dr;nc+=dc;}};
  if(type==="P"){
    const dir=col==="w"?-1:1; const start=col==="w"?6:1;
    if(inBoundsC(r+dir,c)&&!board[r+dir][c]){moves.push([r+dir,c]);if(r===start&&!board[r+2*dir][c])moves.push([r+2*dir,c]);}
    for(const dc of[-1,1])if(inBoundsC(r+dir,c+dc)&&colorC(board[r+dir][c+dc])===enemy)moves.push([r+dir,c+dc]);
  }else if(type==="R"){for(const[dr,dc]of[[1,0],[-1,0],[0,1],[0,-1]])slide(dr,dc);}
  else if(type==="B"){for(const[dr,dc]of[[1,1],[1,-1],[-1,1],[-1,-1]])slide(dr,dc);}
  else if(type==="Q"){for(const[dr,dc]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]])slide(dr,dc);}
  else if(type==="N"){for(const[dr,dc]of[[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]])if(inBoundsC(r+dr,c+dc)&&colorC(board[r+dr][c+dc])!==col)moves.push([r+dr,c+dc]);}
  else if(type==="K"){for(const[dr,dc]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]])if(inBoundsC(r+dr,c+dc)&&colorC(board[r+dr][c+dc])!==col)moves.push([r+dr,c+dc]);}
  return moves;
}
function chessAiMove(board:ChessBoard):ChessBoard|null{
  const pieces:[number,number][]=[];
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(board[r][c]?.startsWith("b"))pieces.push([r,c]);
  const all:[number,number,number,number][]=[];
  for(const[r,c]of pieces)for(const[nr,nc]of getLegalMoves(board,r,c))all.push([r,c,nr,nc]);
  if(!all.length)return null;
  const[sr,sc,dr,dc]=all[Math.floor(Math.random()*all.length)];
  const nb=board.map(row=>[...row]);
  nb[dr][dc]=nb[sr][sc]; nb[sr][sc]=null;
  if(nb[dr][dc]==="bP"&&dr===7)nb[dr][dc]="bQ";
  return nb;
}

function Chess({ lang }: { lang: Lang }) {
  const mobile = useIsMobile();
  const cell = mobile ? 36 : 44;
  const [board, setBoard] = useState(initChessBoard);
  const [selected, setSelected] = useState<[number,number]|null>(null);
  const [legalMoves, setLegalMoves] = useState<[number,number][]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [whiteTurn, setWhiteTurn] = useState(true);
  const [status, setStatus] = useState<"playing"|"white_wins"|"black_wins">("playing");

  function handleClick(r:number, c:number) {
    if (!whiteTurn || status !== "playing") return;
    if (selected) {
      const [sr,sc] = selected;
      if (sr===r && sc===c) { setSelected(null); setLegalMoves([]); return; }
      const isLegal = legalMoves.some(([lr,lc])=>lr===r&&lc===c);
      if (isLegal) {
        const nb = board.map(row=>[...row]);
        const piece = nb[sr][sc]!;
        const captured = nb[r][c];
        nb[r][c]=piece; nb[sr][sc]=null;
        if(piece==="wP"&&r===0) nb[r][c]="wQ";
        const note=`${CHESS_PIECES[piece]||"?"} ${String.fromCharCode(97+sc)}${8-sr}→${String.fromCharCode(97+c)}${8-r}${captured?"×":""}`;
        setHistory(h=>[...h, note]);
        if(captured==="bK"){ setBoard(nb); setSelected(null); setLegalMoves([]); setStatus("white_wins"); return; }
        setBoard(nb); setSelected(null); setLegalMoves([]); setWhiteTurn(false);
        setTimeout(()=>{
          setBoard(prev=>{
            const after=chessAiMove(prev);
            if(!after) return prev;
            if(!after.flat().includes("wK")) setStatus("black_wins");
            setHistory(h=>[...h,"AIfa moves"]);
            return after;
          });
          setWhiteTurn(true);
        }, 600);
      } else if (board[r][c]?.startsWith("w")) {
        setSelected([r,c]); setLegalMoves(getLegalMoves(board,r,c));
      } else { setSelected(null); setLegalMoves([]); }
    } else {
      if (board[r][c]?.startsWith("w")) { setSelected([r,c]); setLegalMoves(getLegalMoves(board,r,c)); }
    }
  }

  function reset() { setBoard(initChessBoard()); setSelected(null); setLegalMoves([]); setHistory([]); setWhiteTurn(true); setStatus("playing"); }

  return (
    <div>
      <div className="glass-panel-sm" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"16px",padding:"10px 24px",marginBottom:"12px"}}>
        {status==="white_wins"&&<span style={{fontWeight:700,color:"#10B981"}}>{t("games.win",lang)}</span>}
        {status==="black_wins"&&<span style={{fontWeight:700,color:"#ef4444"}}>{t("games.lose",lang)}</span>}
        {status==="playing"&&<span style={{fontWeight:600,color:"rgb(232,232,240)"}}>{whiteTurn?t("games.chess.whiteToMove",lang):t("games.thinking",lang)}</span>}
      </div>
      <div style={{display:"flex",justifyContent:"center",marginBottom:"12px",overflowX:"auto"}}>
        <div className="glass-panel" style={{padding:"10px",display:"inline-block"}}>
          <div style={{display:"flex",paddingLeft:"20px",marginBottom:"2px"}}>
            {["a","b","c","d","e","f","g","h"].map(l=><div key={l} style={{width:`${cell}px`,textAlign:"center",fontSize:"10px",color:"rgb(107,114,128)"}}>{l}</div>)}
          </div>
          {board.map((row,r)=>(
            <div key={r} style={{display:"flex",alignItems:"center"}}>
              <div style={{width:"20px",fontSize:"10px",color:"rgb(107,114,128)",textAlign:"right",paddingRight:"4px"}}>{8-r}</div>
              {row.map((piece,c)=>{
                const isDark=(r+c)%2===1;
                const isSel=selected?.[0]===r&&selected?.[1]===c;
                const isLegal=legalMoves.some(([lr,lc])=>lr===r&&lc===c);
                return (
                  <button key={c} onClick={()=>handleClick(r,c)} style={{width:`${cell}px`,height:`${cell}px`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:mobile?"16px":"20px",border:"none",cursor:"pointer",position:"relative",
                    background:isSel?"rgba(124,58,237,0.45)":isLegal?(isDark?"rgba(16,185,129,0.25)":"rgba(16,185,129,0.18)"):isDark?"rgba(30,27,75,0.7)":"rgba(49,46,129,0.4)",
                    outline:isSel?"2px solid #7C3AED":isLegal&&piece?"2px solid #10B981":"none",transition:"background 0.12s"}}>
                    {isLegal&&!piece&&<div style={{width:"10px",height:"10px",borderRadius:"50%",background:"rgba(16,185,129,0.6)",pointerEvents:"none"}}/>}
                    {piece&&<span style={{color:piece.startsWith("w")?"white":"#06B6D4",textShadow:piece.startsWith("w")?"0 0 4px rgba(255,255,255,0.4)":"0 0 4px rgba(6,182,212,0.4)"}}>{CHESS_PIECES[piece]||""}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
        <div className="glass-panel" style={{padding:"14px"}}>
          <div style={{fontSize:"13px",fontWeight:600,color:"rgb(232,232,240)",marginBottom:"8px"}}>{t("games.chess.history",lang)}</div>
          <div style={{maxHeight:"100px",overflowY:"auto"}}>
            {history.length===0?<div style={{fontSize:"12px",color:"rgb(107,114,128)"}}>{t("games.chess.noMoves",lang)}</div>:history.map((m,i)=>(
              <div key={i} style={{display:"flex",gap:"8px",fontSize:"12px",marginBottom:"2px"}}>
                <span style={{color:"rgb(107,114,128)",fontSize:"11px",width:"18px"}}>{i+1}.</span>
                <span style={{color:"rgb(232,232,240)"}}>{m}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-panel" style={{padding:"14px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"8px"}}>
          <button onClick={reset} style={{background:"rgba(124,58,237,0.1)",border:"1px solid rgba(124,58,237,0.25)",color:"#7C3AED",padding:"10px 20px",borderRadius:"12px",fontSize:"13px",fontWeight:600,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>{t("games.newGame",lang)}</button>
          <div style={{fontSize:"11px",color:"rgb(107,114,128)"}}>{t("games.chess.label",lang)}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Tic-Tac-Toe ─────────────────────────────────────────────────────────────
type TTTBoard = (null|"X"|"O")[];
function tttWinner(b:TTTBoard):null|"X"|"O"|"draw"{
  const lines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for(const[a,b2,c]of lines){ if(b[a]&&b[a]===b[b2]&&b[a]===b[c]) return b[a] as "X"|"O"; }
  if(b.every(x=>x)) return "draw";
  return null;
}
function tttMinimax(b:TTTBoard, isO:boolean):number{
  const w=tttWinner(b);
  if(w==="O") return 10; if(w==="X") return -10; if(w==="draw") return 0;
  const scores=b.map((cell,i)=>{
    if(cell) return isO?-Infinity:Infinity;
    const nb=[...b] as TTTBoard; nb[i]=isO?"O":"X";
    return tttMinimax(nb,!isO);
  });
  return isO?Math.max(...scores):Math.min(...scores);
}
function tttBestMove(b:TTTBoard):number{
  let best=-Infinity, idx=0;
  b.forEach((cell,i)=>{
    if(cell) return;
    const nb=[...b] as TTTBoard; nb[i]="O";
    const s=tttMinimax(nb,false);
    if(s>best){best=s;idx=i;}
  });
  return idx;
}

function TicTacToe({ lang }: { lang: Lang }) {
  const mobile = useIsMobile();
  const cell = mobile ? 72 : 80;
  const [board, setBoard] = useState<TTTBoard>(Array(9).fill(null));
  const [xTurn, setXTurn] = useState(true);
  const winner = tttWinner(board);

  function handleClick(i:number) {
    if (board[i] || winner || !xTurn) return;
    const nb=[...board] as TTTBoard; nb[i]="X";
    const w=tttWinner(nb);
    setBoard(nb); setXTurn(false);
    if(!w) setTimeout(()=>{
      setBoard(prev=>{
        const w2=tttWinner(prev); if(w2) return prev;
        const nb2=[...prev] as TTTBoard; nb2[tttBestMove(nb2)]="O";
        return nb2;
      });
      setXTurn(true);
    }, 300);
  }

  function reset(){ setBoard(Array(9).fill(null)); setXTurn(true); }

  const lines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  const winLine=lines.find(([a,b,c])=>board[a]&&board[a]===board[b]&&board[a]===board[c]);

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"16px"}}>
      <div className="glass-panel-sm" style={{padding:"10px 32px",textAlign:"center"}}>
        {winner==="X"&&<span style={{fontWeight:700,color:"#10B981",fontSize:"16px"}}>{t("games.win",lang)}</span>}
        {winner==="O"&&<span style={{fontWeight:700,color:"#ef4444",fontSize:"16px"}}>{t("games.lose",lang)}</span>}
        {winner==="draw"&&<span style={{fontWeight:700,color:"#D4A24C",fontSize:"16px"}}>{t("games.draw",lang)}</span>}
        {!winner&&<span style={{fontWeight:600,color:"rgb(232,232,240)",fontSize:"15px"}}>{xTurn?t("games.ttt.yourTurn",lang):t("games.thinking",lang)}</span>}
      </div>
      <div className="glass-panel" style={{padding:"16px",display:"inline-block"}}>
        <div style={{display:"grid",gridTemplateColumns:`repeat(3,${cell}px)`,gridTemplateRows:`repeat(3,${cell}px)`,gap:"4px"}}>
          {board.map((sq,i)=>{
            const isWin=winLine?.includes(i);
            return (
              <button key={i} onClick={()=>handleClick(i)} style={{
                width:`${cell}px`,height:`${cell}px`,display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:mobile?"28px":"36px",fontWeight:700,border:"1px solid rgba(124,58,237,0.2)",borderRadius:"8px",cursor:sq||winner?"default":"pointer",
                background:isWin?"rgba(124,58,237,0.2)":"rgba(15,15,25,0.6)",
                color:sq==="X"?"#10B981":sq==="O"?"#ef4444":"transparent",
                transition:"background 0.1s",fontFamily:"Inter,sans-serif"
              }}>{sq||"·"}</button>
            );
          })}
        </div>
      </div>
      <button onClick={reset} style={{background:"rgba(124,58,237,0.1)",border:"1px solid rgba(124,58,237,0.25)",color:"#7C3AED",padding:"10px 24px",borderRadius:"12px",fontSize:"13px",fontWeight:600,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>{t("games.newGame",lang)}</button>
      <div style={{fontSize:"11px",color:"rgb(107,114,128)"}}>{t("games.ttt.label",lang)}</div>
    </div>
  );
}

// ─── Checkers ─────────────────────────────────────────────────────────────────
// Red = player (moves up = decreasing row), Black = AI (moves down = increasing row)
// Kings move in both directions
type CheckerPiece = null | "r" | "R" | "b" | "B"; // r=red, R=red king, b=black, B=black king
type CheckersBoard = CheckerPiece[][];

function initCheckers(): CheckersBoard {
  const b: CheckersBoard = Array.from({length:8},()=>Array(8).fill(null));
  for(let r=0;r<3;r++) for(let c=0;c<8;c++) if((r+c)%2===1) b[r][c]="b";
  for(let r=5;r<8;r++) for(let c=0;c<8;c++) if((r+c)%2===1) b[r][c]="r";
  return b;
}

interface CheckerMove { fr:number; fc:number; tr:number; tc:number; captures?:[number,number][]; }

function getCheckerMoves(b:CheckersBoard, r:number, c:number, mustCapture=false): CheckerMove[] {
  const p=b[r][c]; if(!p) return [];
  const isRed=p==="r"||p==="R"; const isKing=p==="R"||p==="B";
  const dirs: [number,number][] = [];
  if(isRed||isKing) dirs.push([-1,-1],[-1,1]); // red moves up
  if(!isRed||isKing) dirs.push([1,-1],[1,1]);   // black moves down
  const moves:CheckerMove[]=[];
  for(const[dr,dc] of dirs){
    const nr=r+dr, nc=c+dc;
    if(nr<0||nr>7||nc<0||nc>7) continue;
    const neighbor=b[nr][nc];
    if(!neighbor&&!mustCapture) { moves.push({fr:r,fc:c,tr:nr,tc:nc}); continue; }
    if(neighbor&&((isRed&&(neighbor==="b"||neighbor==="B"))||(!isRed&&(neighbor==="r"||neighbor==="R")))){
      const jr=nr+dr, jc=nc+dc;
      if(jr>=0&&jr<=7&&jc>=0&&jc<=7&&!b[jr][jc]) moves.push({fr:r,fc:c,tr:jr,tc:jc,captures:[[nr,nc]]});
    }
  }
  return moves;
}

function allCheckerMoves(b:CheckersBoard, color:"r"|"b"): CheckerMove[] {
  const all:CheckerMove[]=[];
  for(let r=0;r<8;r++) for(let c=0;c<8;c++){
    const p=b[r][c]; if(!p) continue;
    const isColor=(color==="r"&&(p==="r"||p==="R"))||(color==="b"&&(p==="b"||p==="B"));
    if(!isColor) continue;
    all.push(...getCheckerMoves(b,r,c));
  }
  // mandatory capture
  const captures=all.filter(m=>m.captures?.length);
  return captures.length?captures:all;
}

function applyCheckerMove(b:CheckersBoard, m:CheckerMove): CheckersBoard {
  const nb=b.map(row=>[...row]) as CheckersBoard;
  nb[m.tr][m.tc]=nb[m.fr][m.fc]; nb[m.fr][m.fc]=null;
  for(const[cr,cc] of (m.captures||[])) nb[cr][cc]=null;
  // king promotion
  if(nb[m.tr][m.tc]==="r"&&m.tr===0) nb[m.tr][m.tc]="R";
  if(nb[m.tr][m.tc]==="b"&&m.tr===7) nb[m.tr][m.tc]="B";
  return nb;
}

function Checkers({ lang }: { lang: Lang }) {
  const mobile = useIsMobile();
  const cell = mobile ? 38 : 52;
  const piece = mobile ? 26 : 36;
  const [board, setBoard] = useState(initCheckers);
  const [selected, setSelected] = useState<[number,number]|null>(null);
  const [validMoves, setValidMoves] = useState<CheckerMove[]>([]);
  const [turn, setTurn] = useState<"r"|"b">("r");
  const [status, setStatus] = useState<"playing"|"red_wins"|"black_wins">("playing");

  const allRed = allCheckerMoves(board,"r");
  const allBlack = allCheckerMoves(board,"b");

  function handleClick(r:number, c:number) {
    if(status!=="playing"||turn!=="r") return;
    const p=board[r][c];
    // clicking a move target
    if(selected){
      const mv=validMoves.find(m=>m.tr===r&&m.tc===c);
      if(mv){
        const nb=applyCheckerMove(board,mv);
        // check for multi-jump
        const further=getCheckerMoves(nb,mv.tr,mv.tc,true).filter(m=>m.captures?.length);
        if(further.length&&mv.captures?.length){
          setBoard(nb); setSelected([mv.tr,mv.tc]); setValidMoves(further); return;
        }
        setBoard(nb); setSelected(null); setValidMoves([]);
        // check win
        const bm=allCheckerMoves(nb,"b");
        if(!bm.length){ setStatus("red_wins"); return; }
        setTurn("b");
        setTimeout(()=>{
          setBoard(prev=>{
            const bMoves=allCheckerMoves(prev,"b");
            if(!bMoves.length){ setStatus("red_wins"); return prev; }
            const pick=bMoves[Math.floor(Math.random()*bMoves.length)];
            const nb2=applyCheckerMove(prev,pick);
            const rm=allCheckerMoves(nb2,"r");
            if(!rm.length) setStatus("black_wins");
            return nb2;
          });
          setTurn("r");
        }, 500);
        return;
      }
      // deselect or select new piece
      if(p&&(p==="r"||p==="R")){
        const mandatory=allRed.filter(m=>m.captures?.length);
        const pool=mandatory.length?mandatory:allRed;
        const pieceMoves=pool.filter(m=>m.fr===r&&m.fc===c);
        setSelected([r,c]); setValidMoves(pieceMoves); return;
      }
      setSelected(null); setValidMoves([]);
    } else {
      if(p&&(p==="r"||p==="R")){
        const mandatory=allRed.filter(m=>m.captures?.length);
        const pool=mandatory.length?mandatory:allRed;
        const pieceMoves=pool.filter(m=>m.fr===r&&m.fc===c);
        setSelected([r,c]); setValidMoves(pieceMoves);
      }
    }
  }

  function reset(){ setBoard(initCheckers()); setSelected(null); setValidMoves([]); setTurn("r"); setStatus("playing"); }

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"12px"}}>
      <div className="glass-panel-sm" style={{padding:"10px 32px",textAlign:"center"}}>
        {status==="red_wins"&&<span style={{fontWeight:700,color:"#10B981",fontSize:"16px"}}>{t("games.win",lang)}</span>}
        {status==="black_wins"&&<span style={{fontWeight:700,color:"#ef4444",fontSize:"16px"}}>{t("games.lose",lang)}</span>}
        {status==="playing"&&<span style={{fontWeight:600,color:"rgb(232,232,240)",fontSize:"15px"}}>{turn==="r"?t("games.checkers.yourTurn",lang):t("games.thinking",lang)}</span>}
      </div>
      <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch" as any}}>
        <div className="glass-panel" style={{padding:"10px",display:"inline-block"}}>
          {board.map((row,r)=>(
            <div key={r} style={{display:"flex"}}>
              {row.map((sq,c)=>{
                const isDark=(r+c)%2===1;
                const isSel=selected?.[0]===r&&selected?.[1]===c;
                const isTarget=validMoves.some(m=>m.tr===r&&m.tc===c);
                return (
                  <button key={c} onClick={()=>handleClick(r,c)} style={{
                    width:`${cell}px`,height:`${cell}px`,display:"flex",alignItems:"center",justifyContent:"center",
                    border:"none",cursor:"pointer",
                    background:isSel?"rgba(124,58,237,0.4)":isTarget?"rgba(16,185,129,0.25)":isDark?"rgba(20,18,60,0.85)":"rgba(60,50,120,0.35)",
                    outline:isSel?"2px solid #7C3AED":isTarget?"2px solid #10B981":"none",
                    transition:"background 0.1s"
                  }}>
                    {sq&&<div style={{
                      width:`${piece}px`,height:`${piece}px`,borderRadius:"50%",
                      background:sq==="r"||sq==="R"?"#dc2626":"#1e1b4b",
                      border:sq==="r"||sq==="R"?"2px solid #f87171":"2px solid #60a5fa",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:mobile?"12px":"16px",boxShadow:"0 2px 4px rgba(0,0,0,0.4)"
                    }}>{(sq==="R"||sq==="B")?"♛":""}</div>}
                    {isTarget&&!sq&&<div style={{width:"12px",height:"12px",borderRadius:"50%",background:"rgba(16,185,129,0.7)",pointerEvents:"none"}}/>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div style={{display:"flex",gap:"16px",alignItems:"center"}}>
        <div style={{fontSize:"12px",color:"rgb(107,114,128)"}}>
          <span style={{display:"inline-block",width:"12px",height:"12px",borderRadius:"50%",background:"#dc2626",border:"1px solid #f87171",marginRight:"4px",verticalAlign:"middle"}}/>{t("games.checkers.youLabel",lang)}
          &nbsp;&nbsp;
          <span style={{display:"inline-block",width:"12px",height:"12px",borderRadius:"50%",background:"#1e1b4b",border:"1px solid #60a5fa",marginRight:"4px",verticalAlign:"middle"}}/>{t("games.checkers.aifaLabel",lang)}
        </div>
        <button onClick={reset} style={{background:"rgba(124,58,237,0.1)",border:"1px solid rgba(124,58,237,0.25)",color:"#7C3AED",padding:"8px 18px",borderRadius:"12px",fontSize:"13px",fontWeight:600,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>{t("games.newGame",lang)}</button>
      </div>
    </div>
  );
}

// ─── Backgammon ───────────────────────────────────────────────────────────────
// White = player (moves 24→1, bears off at 0), Black = AI (moves 1→24, bears off at 25)
// points[0..23]: positive = white checkers, negative = black checkers
// bar[0]=white on bar, bar[1]=black on bar
// off[0]=white off, off[1]=black off

interface BgState {
  points: number[];
  bar: [number,number];
  off: [number,number];
  dice: number[];
  usedDice: boolean[];
  turn: "white"|"black";
  selected: number|"bar"|null;
  phase: "roll"|"move"|"done";
  winner: "white"|"black"|null;
  msg: string;
}

function initBg(rollMsg = "Roll to start!"): BgState {
  const pts = Array(24).fill(0);
  pts[23]=2; pts[12]=5; pts[7]=3; pts[5]=5;
  pts[0]=-2; pts[11]=-5; pts[16]=-3; pts[18]=-5;
  return { points:pts, bar:[0,0], off:[0,0], dice:[], usedDice:[], turn:"white", selected:null, phase:"roll", winner:null, msg:rollMsg };
}

function rollDie(){ return Math.floor(Math.random()*6)+1; }

function bgValidMoves(st:BgState, die:number): {from:number|"bar"; to:number|"off"}[] {
  const isWhite=st.turn==="white";
  const moves:{from:number|"bar";to:number|"off"}[]=[];

  if(isWhite){
    // check if must enter from bar
    if(st.bar[0]>0){
      // white enters on points 19-24 (indices 18-23), die=1 → idx23, die=6 → idx18
      const to=24-die; // point number minus 1 for 0-index
      if(to>=0&&to<=23&&st.points[to]>=-1) moves.push({from:"bar",to});
      return moves;
    }
    // check bearing off
    const allHome=st.points.slice(0,6).every(v=>v>=0)&&st.bar[0]===0;
    for(let idx=0;idx<24;idx++){
      if(st.points[idx]<=0) continue;
      const toIdx=idx-die;
      if(toIdx<0){
        if(allHome){
          // exact bear off or highest piece
          const exactBearOff = toIdx===-1||(idx===die-1&&st.points.slice(0,idx).every(v=>v<=0));
          // simplified: bear off if idx - die <= -1 and it's the highest checker or exact
          const highestOccupied=st.points.slice(0,6).reduce((acc,v,i)=>v>0?i:acc,-1);
          if(toIdx===-1||(toIdx<-1&&idx===highestOccupied)) moves.push({from:idx,to:"off"});
        }
      } else {
        if(st.points[toIdx]>=-1) moves.push({from:idx,to:toIdx});
      }
    }
  } else {
    // black moves from low idx to high idx
    if(st.bar[1]>0){
      const to=die-1; // point die (1-indexed) → index die-1
      if(to>=0&&to<=23&&st.points[to]<=1) moves.push({from:"bar",to});
      return moves;
    }
    const allHome=st.points.slice(18,24).every(v=>v<=0)&&st.bar[1]===0;
    for(let idx=0;idx<24;idx++){
      if(st.points[idx]>=0) continue;
      const toIdx=idx+die;
      if(toIdx>23){
        if(allHome){
          const highestOccupied=st.points.slice(18,24).reduce((acc,v,i)=>v<0?18+i:acc,-1);
          if(toIdx===24||(toIdx>24&&idx===highestOccupied)) moves.push({from:idx,to:"off"});
        }
      } else {
        if(st.points[toIdx]<=1) moves.push({from:idx,to:toIdx});
      }
    }
  }
  return moves;
}

function applyBgMove(st:BgState, from:number|"bar", to:number|"off", dieIdx:number, lang:Lang="en"): BgState {
  const ns:BgState=JSON.parse(JSON.stringify(st));
  const isWhite=st.turn==="white";
  ns.usedDice=[...st.usedDice]; ns.usedDice[dieIdx]=true;

  if(from==="bar"){
    if(isWhite) ns.bar[0]--; else ns.bar[1]--;
  } else {
    const fi=from as number;
    if(isWhite) ns.points[fi]--; else ns.points[fi]++;
  }

  if(to==="off"){
    if(isWhite) ns.off[0]++; else ns.off[1]++;
    if(isWhite&&ns.off[0]===15){ ns.phase="done"; ns.winner="white"; ns.msg=t("games.win",lang); }
    if(!isWhite&&ns.off[1]===15){ ns.phase="done"; ns.winner="black"; ns.msg=t("games.lose",lang); }
  } else {
    const ti=to as number;
    // blot hit
    if(isWhite&&ns.points[ti]===-1){ ns.points[ti]=1; ns.bar[1]++; }
    else if(!isWhite&&ns.points[ti]===1){ ns.points[ti]=-1; ns.bar[0]++; }
    else { if(isWhite) ns.points[ti]++; else ns.points[ti]--; }
  }
  return ns;
}

function bgCanMove(st:BgState): boolean {
  return st.dice.some((d,i)=>!st.usedDice[i]&&bgValidMoves(st,d).length>0);
}

function Backgammon({ lang }: { lang: Lang }) {
  const mobile = useIsMobile();
  const ptW = mobile ? 30 : 42;
  const barW = mobile ? 24 : 32;
  const chkSz = mobile ? 20 : 28;
  const [st, setSt] = useState<BgState>(()=>initBg(t("games.bg.rollToStart",lang)));

  function roll(){
    if(st.phase!=="roll") return;
    let d1=rollDie(), d2=rollDie();
    const dice=d1===d2?[d1,d1,d1,d1]:[d1,d2];
    const ns={...st, dice, usedDice:Array(dice.length).fill(false), phase:"move" as const, msg:`${dice.join(", ")}. ${t("games.bg.selectChecker",lang)}`, selected:null};
    const canMv=dice.some(d=>bgValidMoves(ns,d).length>0);
    if(!canMv){ setSt({...ns, msg:t("games.bg.noMoves",lang)}); endTurn({...ns}); return; }
    setSt(ns);
  }

  function endTurn(state:BgState){
    if(state.winner) return;
    const nextTurn = state.turn==="white"?"black":"white";
    const ns={...state, turn:nextTurn as "white"|"black", phase:"roll" as const, dice:[], usedDice:[], selected:null, msg:nextTurn==="black"?t("games.bg.aifaTurn",lang):t("games.bg.yourTurn",lang)};
    setSt(ns);
    if(nextTurn==="black") setTimeout(()=>doAiTurn(ns),600);
  }

  function doAiTurn(state:BgState){
    let d1=rollDie(), d2=rollDie();
    const dice=d1===d2?[d1,d1,d1,d1]:[d1,d2];
    let cur:BgState={...state, dice, usedDice:Array(dice.length).fill(false), phase:"move" as const};
    // make moves
    for(let attempt=0;attempt<dice.length;attempt++){
      let moved=false;
      for(let i=0;i<cur.dice.length;i++){
        if(cur.usedDice[i]) continue;
        const mvs=bgValidMoves(cur,cur.dice[i]);
        if(mvs.length){
          const mv=mvs[Math.floor(Math.random()*mvs.length)];
          cur=applyBgMove(cur,mv.from,mv.to,i,lang);
          moved=true; break;
        }
      }
      if(!moved||cur.winner) break;
    }
    if(cur.winner){ setSt({...cur,msg:t("games.lose",lang),phase:"done"}); return; }
    const ns2={...cur,turn:"white" as const,phase:"roll" as const,dice:[],usedDice:[],selected:null,msg:"Your turn — roll!"};
    setSt(ns2);
  }

  function handlePointClick(idx:number){
    if(st.phase!=="move"||st.turn!=="white") return;
    if(st.selected===null||st.selected==="bar"){
      if(st.bar[0]>0){
        setSt({...st,selected:"bar",msg:t("games.bg.selectTarget",lang)});
      } else if(st.points[idx]>0){
        setSt({...st,selected:idx,msg:t("games.bg.selectMove",lang)});
      }
      return;
    }
    // attempt move
    for(let i=0;i<st.dice.length;i++){
      if(st.usedDice[i]) continue;
      const mvs=bgValidMoves(st,st.dice[i]);
      const mv=mvs.find(m=>m.from===st.selected&&m.to===idx);
      if(mv){
        let ns=applyBgMove(st,mv.from,mv.to,i,lang);
        if(ns.winner){ setSt(ns); return; }
        const remaining=ns.dice.filter((_,j)=>!ns.usedDice[j]);
        if(!remaining.length){ endTurn({...ns,selected:null}); return; }
        const canStillMove=remaining.some((_,j)=>{
          const realIdx=ns.dice.findIndex((d,di)=>!ns.usedDice[di]&&ns.dice[di]===remaining[j]);
          return bgValidMoves(ns,ns.dice[realIdx]||remaining[j]).length>0;
        });
        if(!canStillMove){ endTurn({...ns,selected:null}); return; }
        setSt({...ns,selected:null,msg:t("games.bg.selectChecker",lang)});
        return;
      }
    }
    // reselect
    if(st.points[idx]>0) setSt({...st,selected:idx});
    else setSt({...st,selected:null,msg:t("games.bg.selectChecker",lang)});
  }

  function handleBarClick(){
    if(st.phase!=="move"||st.turn!=="white") return;
    if(st.bar[0]>0) setSt({...st,selected:"bar",msg:"Select a target point to enter."});
  }

  function handleBearOff(){
    if(st.phase!=="move"||st.turn!=="white"||st.selected===null||st.selected==="bar") return;
    const from=st.selected as number;
    for(let i=0;i<st.dice.length;i++){
      if(st.usedDice[i]) continue;
      const mvs=bgValidMoves(st,st.dice[i]);
      const mv=mvs.find(m=>m.from===from&&m.to==="off");
      if(mv){
        let ns=applyBgMove(st,mv.from,mv.to,i,lang);
        if(ns.winner){ setSt(ns); return; }
        const remaining=ns.dice.filter((_,j)=>!ns.usedDice[j]);
        if(!remaining.length){ endTurn({...ns,selected:null}); return; }
        setSt({...ns,selected:null,msg:t("games.bg.selectChecker",lang)});
        return;
      }
    }
  }

  const pts=st.points;

  function renderPoint(idx:number){
    const count=Math.abs(pts[idx]);
    const isWhite=pts[idx]>0;
    const isSel=st.selected===idx;
    const isTarget=st.selected!==null && st.dice.some((_,i)=>{
      if(st.usedDice[i]) return false;
      return bgValidMoves(st,st.dice[i]).some(m=>m.from===st.selected&&m.to===idx);
    });
    return (
      <button key={idx} onClick={()=>handlePointClick(idx)} style={{
        width:`${ptW}px`,minHeight:`${ptW+10}px`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-start",padding:"3px 0",
        background:isSel?"rgba(124,58,237,0.3)":isTarget?"rgba(16,185,129,0.2)":"transparent",
        border:isSel?"1px solid #7C3AED":isTarget?"1px solid #10B981":"1px solid transparent",
        borderRadius:"4px",cursor:"pointer",gap:"2px",transition:"background 0.1s"
      }}>
        {Array.from({length:Math.min(count,5)}).map((_,i)=>(
          <div key={i} style={{width:`${chkSz}px`,height:`${chkSz}px`,borderRadius:"50%",background:isWhite?"#e5e7eb":"#1e1b4b",border:isWhite?"2px solid #9ca3af":"2px solid #60a5fa",flexShrink:0,fontSize:"9px",display:"flex",alignItems:"center",justifyContent:"center",color:isWhite?"#111":"#93c5fd"}}>{i===0&&count>5?count:""}</div>
        ))}
        {count>5&&<div style={{fontSize:"9px",color:"rgb(107,114,128)"}}>{count}</div>}
        {isTarget&&count===0&&<div style={{width:"12px",height:"12px",borderRadius:"50%",background:"rgba(16,185,129,0.7)"}}/>}
      </button>
    );
  }

  const bearOffPossible = st.selected!==null && st.selected!=="bar" && st.dice.some((_,i)=>{
    if(st.usedDice[i]) return false;
    return bgValidMoves(st,st.dice[i]).some(m=>m.from===st.selected&&m.to==="off");
  });

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"10px"}}>
      <div className="glass-panel-sm" style={{padding:"8px 24px",textAlign:"center",fontSize:"14px",fontWeight:600,color:"rgb(232,232,240)"}}>
        {st.msg}
      </div>
      {/* Dice */}
      <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
        {st.dice.length>0?st.dice.map((d,i)=>(
          <div key={i} style={{width:"36px",height:"36px",borderRadius:"8px",background:st.usedDice[i]?"rgba(30,27,75,0.4)":"rgba(124,58,237,0.15)",border:st.usedDice[i]?"1px solid rgba(107,114,128,0.3)":"1px solid rgba(124,58,237,0.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"20px",color:st.usedDice[i]?"rgba(107,114,128,0.5)":"#7C3AED",opacity:st.usedDice[i]?0.5:1}}>
            {["","⚀","⚁","⚂","⚃","⚄","⚅"][d]}
          </div>
        )):<div style={{fontSize:"12px",color:"rgb(107,114,128)"}}>{t("games.bg.rollPrompt",lang)}</div>}
      </div>

      {/* Board */}
      <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch" as any,width:"100%"}}>
        <div className="glass-panel" style={{padding:"8px",display:"inline-block",position:"relative"}}>
          {/* Top row: points 13-24 (indices 12-23), left to right */}
          <div style={{display:"flex",gap:"2px",marginBottom:"4px"}}>
            {[12,13,14,15,16,17].map(i=>renderPoint(i))}
            {/* Bar */}
            <button onClick={handleBarClick} style={{width:`${barW}px`,minHeight:`${ptW+10}px`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:st.selected==="bar"?"rgba(124,58,237,0.3)":"rgba(15,15,25,0.8)",border:st.selected==="bar"?"1px solid #7C3AED":"1px solid rgba(124,58,237,0.2)",borderRadius:"4px",cursor:"pointer",gap:"2px",padding:"4px 0"}}>
              {st.bar[0]>0&&Array.from({length:Math.min(st.bar[0],3)}).map((_,i)=>(
                <div key={i} style={{width:`${chkSz}px`,height:`${chkSz}px`,borderRadius:"50%",background:"#e5e7eb",border:"2px solid #9ca3af"}}/>
              ))}
              {st.bar[1]>0&&Array.from({length:Math.min(st.bar[1],3)}).map((_,i)=>(
                <div key={i} style={{width:`${chkSz}px`,height:`${chkSz}px`,borderRadius:"50%",background:"#1e1b4b",border:"2px solid #60a5fa"}}/>
              ))}
              <div style={{fontSize:"8px",color:"rgba(107,114,128,0.6)"}}>BAR</div>
            </button>
            {[18,19,20,21,22,23].map(i=>renderPoint(i))}
          </div>
          {/* Bottom row: points 12-1 (indices 11-0), left to right */}
          <div style={{display:"flex",gap:"2px",marginTop:"4px"}}>
            {[11,10,9,8,7,6].map(i=>renderPoint(i))}
            <div style={{width:`${barW}px`}}/>
            {[5,4,3,2,1,0].map(i=>renderPoint(i))}
          </div>
        </div>
      </div>

      {/* Off + controls */}
      <div style={{display:"flex",gap:"16px",alignItems:"center",flexWrap:"wrap",justifyContent:"center"}}>
        <div style={{fontSize:"12px",color:"rgb(107,114,128)"}}>
          Off: <span style={{color:"#e5e7eb"}}>⬤{st.off[0]}</span> <span style={{color:"#60a5fa"}}>⬤{st.off[1]}</span>
          &nbsp;|&nbsp;Bar: <span style={{color:"#e5e7eb"}}>⬤{st.bar[0]}</span> <span style={{color:"#60a5fa"}}>⬤{st.bar[1]}</span>
        </div>
        {st.phase==="roll"&&st.turn==="white"&&(
          <button onClick={roll} style={{background:"rgba(124,58,237,0.15)",border:"1px solid rgba(124,58,237,0.4)",color:"#7C3AED",padding:"8px 20px",borderRadius:"12px",fontSize:"13px",fontWeight:600,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>{t("games.bg.rollDice",lang)}</button>
        )}
        {bearOffPossible&&(
          <button onClick={handleBearOff} style={{background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.3)",color:"#10B981",padding:"8px 16px",borderRadius:"12px",fontSize:"13px",fontWeight:600,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>{t("games.bg.bearOff",lang)}</button>
        )}
        <button onClick={()=>setSt(initBg(t("games.bg.rollToStart",lang)))} style={{background:"rgba(124,58,237,0.08)",border:"1px solid rgba(124,58,237,0.2)",color:"#7C3AED",padding:"8px 16px",borderRadius:"12px",fontSize:"13px",fontWeight:600,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>{t("games.newGame",lang)}</button>
      </div>
      <div style={{fontSize:"11px",color:"rgb(107,114,128)"}}>{t("games.bg.label",lang)}</div>
    </div>
  );
}

// ─── GamesArena wrapper ───────────────────────────────────────────────────────
type GameId = "chess"|"ttt"|"checkers"|"backgammon";

function GamesArena() {
  const { lang } = useLang();
  const mobile = useIsMobile();
  const [active, setActive] = useState<GameId>("chess");
  const [keys, setKeys] = useState<Record<GameId,number>>({chess:0,ttt:0,checkers:0,backgammon:0});

  const games = [
    {id:"chess"      as GameId, icon:"♟", label:t("games.chess",lang),       desc:t("games.chess.desc",lang)},
    {id:"ttt"        as GameId, icon:"✕", label:t("games.ttt",lang),         desc:t("games.ttt.desc",lang)},
    {id:"checkers"   as GameId, icon:"⬤", label:t("games.checkers",lang),    desc:t("games.checkers.desc",lang)},
    {id:"backgammon" as GameId, icon:"🎲", label:t("games.backgammon",lang),  desc:t("games.backgammon.desc",lang)},
  ];

  function selectGame(id:GameId){
    setActive(id);
    setKeys(k=>({...k,[id]:k[id]+1}));
  }

  return (
    <div style={{maxWidth:"1280px",margin:"0 auto"}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"16px"}}>
        <div style={{width:"40px",height:"40px",borderRadius:"12px",background:"rgba(124,58,237,0.1)",border:"1px solid rgba(124,58,237,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"20px"}}>🎮</div>
        <div>
          <div style={{fontSize:"18px",fontWeight:700,color:"rgb(232,232,240)"}}>{t("games.title",lang)}</div>
          <div style={{fontSize:"12px",color:"rgb(107,114,128)"}}>{t("games.subtitle",lang)}</div>
        </div>
      </div>

      {/* Game selector — 2-col grid on mobile, row on desktop */}
      <div style={{display:"grid",gridTemplateColumns:mobile?"1fr 1fr":"repeat(4,1fr)",gap:"8px",marginBottom:"16px"}}>
        {games.map(g=>(
          <button key={g.id} onClick={()=>selectGame(g.id)} style={{
            display:"flex",alignItems:"center",gap:"8px",padding:mobile?"8px 12px":"10px 18px",borderRadius:"12px",
            fontSize:"13px",fontWeight:600,cursor:"pointer",fontFamily:"Inter,sans-serif",transition:"all 0.15s",
            background:active===g.id?"rgba(124,58,237,0.2)":"rgba(15,15,25,0.6)",
            border:active===g.id?"1px solid rgba(124,58,237,0.5)":"1px solid rgba(124,58,237,0.15)",
            color:active===g.id?"#7C3AED":"rgb(107,114,128)"
          }}>
            <span style={{fontSize:"16px",flexShrink:0}}>{g.icon}</span>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-start",minWidth:0}}>
              <span style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:"100%"}}>{g.label}</span>
              <span style={{fontSize:"10px",fontWeight:400,color:active===g.id?"rgba(124,58,237,0.8)":"rgba(107,114,128,0.7)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:"100%"}}>{g.desc}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Active game */}
      {active==="chess"      && <Chess        lang={lang} key={keys.chess}/>}
      {active==="ttt"        && <TicTacToe    lang={lang} key={keys.ttt}/>}
      {active==="checkers"   && <Checkers     lang={lang} key={keys.checkers}/>}
      {active==="backgammon" && <Backgammon   lang={lang} key={keys.backgammon}/>}
    </div>
  );
}

export default memo(GamesArena);
