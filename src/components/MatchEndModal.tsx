import React from 'react';
import { MatchEndResult } from '../game/types';
import { ScoreboardView } from './ScoreboardView';
import { Trophy, Coins, RotateCcw, ShoppingBag, Home } from 'lucide-react';

interface MatchEndModalProps {
  result: MatchEndResult;
  cscCoins: number;
  onPlayAgain: () => void;
  onOpenShop: () => void;
  onMainMenu: () => void;
}

export const MatchEndModal: React.FC<MatchEndModalProps> = ({
  result,
  cscCoins,
  onPlayAgain,
  onOpenShop,
  onMainMenu
}) => {
  const isWinner =
    result.playerRank === 1 ||
    (result.winnerTeam &&
      ((result.winnerTeam === 'blue' &&
        result.scoreboard.find((e) => e.isLocalPlayer)?.team === 'blue') ||
        (result.winnerTeam === 'red' &&
          result.scoreboard.find((e) => e.isLocalPlayer)?.team === 'red')));

  const getRankTitle = () => {
    if (result.playerRank === 1) return '🏆 1ST PLACE CHAMPION!';
    if (result.playerRank === 2) return '🥈 2ND PLACE RUNNER-UP!';
    if (result.playerRank === 3) return '🥉 3RD PLACE PODIUM FINISH!';
    return `COMBAT RANK #${result.playerRank}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-2xl animate-in fade-in duration-300">
      <div className="relative w-full max-w-3xl max-h-[92vh] bg-gradient-to-b from-[#121b2a] via-[#090f1a] to-[#04060c] border border-cyan-400/40 rounded-2xl shadow-[0_25px_80px_rgba(0,0,0,0.9),0_0_80px_rgba(0,212,255,0.25)] flex flex-col overflow-hidden">
        {/* Top Rim Glow */}
        <div className="h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#00d4ff]" />

        {/* Modal Header */}
        <div className="p-6 text-center space-y-2 border-b border-white/10 shrink-0">
          <div className="text-[11px] font-black tracking-[6px] uppercase text-cyan-300">
            SIMULATION TERMINATED • MATCH RESULTS
          </div>
          <h2
            className={`text-4xl sm:text-5xl font-black italic tracking-wider uppercase ${
              isWinner
                ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-100 to-amber-400 drop-shadow-[0_0_30px_rgba(245,158,11,0.6)]'
                : 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-blue-400 drop-shadow-[0_0_20px_rgba(0,212,255,0.4)]'
            }`}
          >
            {getRankTitle()}
          </h2>

          {/* CSC Coins Reward Card */}
          <div className="max-w-md mx-auto pt-2">
            {result.coinsEarned > 0 ? (
              <div className="bg-gradient-to-r from-amber-950/80 via-yellow-900/70 to-amber-950/80 border border-amber-400/80 p-3.5 rounded-2xl shadow-[0_0_25px_rgba(245,158,11,0.4)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/50 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-amber-300 animate-bounce" />
                  </div>
                  <div className="text-left">
                    <div className="text-[10px] font-black uppercase text-amber-300 tracking-wider">
                      Reward Payout
                    </div>
                    <div className="text-lg font-black font-mono text-white flex items-center gap-1.5">
                      <span className="text-amber-300">+{result.coinsEarned} CSC COINS</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[9px] font-black uppercase text-slate-400">Total Balance</div>
                  <div className="text-sm font-black font-mono text-amber-300">
                    {cscCoins} CSC
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-black/60 border border-white/10 p-3 rounded-xl flex items-center justify-between text-xs text-slate-400">
                <span>Participation: +0 CSC Coins</span>
                <span className="text-[10px] text-amber-300/80 font-bold">
                  Tip: Place in Top 3 to earn CSC coins!
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Scoreboard View */}
        <div className="p-6 overflow-y-auto max-h-[46vh] space-y-4">
          <ScoreboardView entries={result.scoreboard} gamemode={result.gamemode} />
        </div>

        {/* Action Buttons Footer */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-black/40 flex flex-wrap gap-3 justify-end shrink-0">
          <button
            type="button"
            onClick={onMainMenu}
            className="px-4 py-2.5 rounded-xl border border-white/20 hover:border-white/40 text-slate-300 hover:text-white text-xs font-black tracking-wider uppercase transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Main Menu</span>
          </button>

          <button
            type="button"
            onClick={onOpenShop}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black text-xs font-black tracking-wider uppercase shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Visit Shop</span>
          </button>

          <button
            type="button"
            onClick={onPlayAgain}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-white text-xs font-black tracking-widest uppercase shadow-[0_0_20px_rgba(0,212,255,0.4)] transition-all flex items-center gap-1.5 cursor-pointer hover:scale-102"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Again</span>
          </button>
        </div>
      </div>
    </div>
  );
};
