import React from 'react';
import { ScoreboardEntry } from '../game/types';
import { Trophy, Shield, Swords, Flag, Users } from 'lucide-react';

interface ScoreboardViewProps {
  entries: ScoreboardEntry[];
  gamemode: 'ffa' | 'tdm' | 'dom' | 'ctf';
  blueScore?: number;
  redScore?: number;
  compact?: boolean;
}

export const ScoreboardView: React.FC<ScoreboardViewProps> = ({
  entries,
  gamemode,
  blueScore = 0,
  redScore = 0,
  compact = false
}) => {
  const sorted = [...entries].sort((a, b) => b.score - a.score || b.kills - a.kills);

  const blueEntries = sorted.filter((e) => e.team === 'blue');
  const redEntries = sorted.filter((e) => e.team === 'red');

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="inline-flex items-center gap-1 text-amber-300 font-black text-xs bg-amber-950/80 px-2 py-0.5 rounded border border-amber-400/50 shadow-[0_0_8px_rgba(245,158,11,0.4)]">
          <Trophy className="w-3 h-3 text-amber-300" />
          <span>1ST (+10 CSC)</span>
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center gap-1 text-slate-200 font-black text-xs bg-slate-800/80 px-2 py-0.5 rounded border border-slate-400/50">
          <span>🥈 2ND (+5 CSC)</span>
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="inline-flex items-center gap-1 text-amber-500 font-black text-xs bg-amber-950/40 px-2 py-0.5 rounded border border-amber-600/40">
          <span>🥉 3RD (+2 CSC)</span>
        </span>
      );
    }
    return (
      <span className="text-[11px] font-mono text-slate-400 font-bold">
        #{rank} (+0 CSC)
      </span>
    );
  };

  return (
    <div className="w-full space-y-4">
      {/* Gamemode Status Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-black/60 border border-cyan-400/30 p-3.5 rounded-xl backdrop-blur-md">
        <div className="flex items-center gap-2">
          {gamemode === 'ffa' ? (
            <Swords className="w-5 h-5 text-cyan-400" />
          ) : gamemode === 'dom' ? (
            <Flag className="w-5 h-5 text-amber-400" />
          ) : (
            <Shield className="w-5 h-5 text-cyan-400" />
          )}
          <div>
            <div className="text-xs font-black tracking-widest uppercase text-cyan-300">
              {gamemode === 'ffa'
                ? 'FREE-FOR-ALL COMBAT'
                : gamemode === 'tdm'
                ? 'TEAM DEATHMATCH DUEL'
                : gamemode === 'dom'
                ? 'DOMINATION CONTROL'
                : 'CAPTURE THE FLAG'}
            </div>
            <div className="text-[10px] text-slate-400">
              {gamemode === 'ffa'
                ? 'First to 1,500 Score / 15 Kills • Top 3 earn CSC Coins'
                : 'Team Race to 200 Score • Top operative earns champion status'}
            </div>
          </div>
        </div>

        {/* Prize Tiers Explainer */}
        <div className="flex items-center gap-2 bg-gradient-to-r from-amber-950/60 to-yellow-950/60 border border-amber-400/30 px-3 py-1.5 rounded-lg text-[10px] font-bold">
          <span className="text-amber-400">🏆 1st: 10 CSC</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-300">🥈 2nd: 5 CSC</span>
          <span className="text-slate-500">•</span>
          <span className="text-amber-500">🥉 3rd: 2 CSC</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">Rest: 0 CSC</span>
        </div>
      </div>

      {/* Gamemode View: Team Deathmatch or Domination Split */}
      {(gamemode === 'tdm' || gamemode === 'dom') ? (
        <div className="space-y-4">
          {/* Team Scores Banner */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-cyan-950/40 border border-cyan-400/50 p-3 rounded-xl flex items-center justify-between shadow-[0_0_15px_rgba(0,212,255,0.15)]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#00d4ff]" />
                <span className="text-sm font-black tracking-wider text-cyan-300">TEAM BLUE</span>
              </div>
              <span className="text-2xl font-black font-mono text-cyan-400">{blueScore}</span>
            </div>

            <div className="bg-rose-950/40 border border-rose-500/50 p-3 rounded-xl flex items-center justify-between shadow-[0_0_15px_rgba(255,42,109,0.15)]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_8px_#ff2a6d]" />
                <span className="text-sm font-black tracking-wider text-rose-300">TEAM RED</span>
              </div>
              <span className="text-2xl font-black font-mono text-rose-400">{redScore}</span>
            </div>
          </div>

          {/* Two-Column Team Tables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Blue Team Table */}
            <div className="bg-black/50 border border-cyan-400/25 rounded-xl overflow-hidden">
              <div className="bg-cyan-950/60 px-3.5 py-2 border-b border-cyan-400/20 text-xs font-black tracking-wider text-cyan-300 uppercase flex items-center justify-between">
                <span>Team Blue Roster ({blueEntries.length})</span>
                <span className="text-[10px] text-cyan-400/70 font-mono">CYAN FORCE</span>
              </div>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] font-black uppercase text-slate-400">
                    <th className="py-2 px-3">Operative</th>
                    <th className="py-2 px-2 text-center">K</th>
                    <th className="py-2 px-2 text-center">D</th>
                    {gamemode === 'dom' && <th className="py-2 px-2 text-center text-amber-400">Cap</th>}
                    <th className="py-2 px-3 text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {blueEntries.map((e) => (
                    <tr
                      key={e.id}
                      className={`transition-colors ${
                        e.isLocalPlayer
                          ? 'bg-cyan-500/20 text-white font-bold'
                          : 'hover:bg-white/5 text-slate-300'
                      }`}
                    >
                      <td className="py-2 px-3 flex items-center gap-1.5 font-mono">
                        {e.isLocalPlayer && (
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#00d4ff]" />
                        )}
                        <span className={e.isLocalPlayer ? 'text-cyan-300 font-black' : ''}>
                          {e.name}
                        </span>
                        {e.isLocalPlayer && (
                          <span className="text-[9px] bg-cyan-400/20 text-cyan-300 px-1 rounded font-sans font-black">
                            YOU
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center font-mono font-bold text-cyan-200">{e.kills}</td>
                      <td className="py-2 px-2 text-center font-mono text-slate-400">{e.deaths}</td>
                      {gamemode === 'dom' && (
                        <td className="py-2 px-2 text-center font-mono text-amber-300 font-bold">
                          {e.captures || 0}
                        </td>
                      )}
                      <td className="py-2 px-3 text-right font-mono font-black text-cyan-400">
                        {e.score}
                      </td>
                    </tr>
                  ))}
                  {blueEntries.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-xs text-slate-500">
                        No operatives assigned
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Red Team Table */}
            <div className="bg-black/50 border border-rose-500/25 rounded-xl overflow-hidden">
              <div className="bg-rose-950/60 px-3.5 py-2 border-b border-rose-500/20 text-xs font-black tracking-wider text-rose-300 uppercase flex items-center justify-between">
                <span>Team Red Roster ({redEntries.length})</span>
                <span className="text-[10px] text-rose-400/70 font-mono">CRIMSON FORCE</span>
              </div>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] font-black uppercase text-slate-400">
                    <th className="py-2 px-3">Operative</th>
                    <th className="py-2 px-2 text-center">K</th>
                    <th className="py-2 px-2 text-center">D</th>
                    {gamemode === 'dom' && <th className="py-2 px-2 text-center text-amber-400">Cap</th>}
                    <th className="py-2 px-3 text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {redEntries.map((e) => (
                    <tr
                      key={e.id}
                      className={`transition-colors ${
                        e.isLocalPlayer
                          ? 'bg-rose-500/20 text-white font-bold'
                          : 'hover:bg-white/5 text-slate-300'
                      }`}
                    >
                      <td className="py-2 px-3 flex items-center gap-1.5 font-mono">
                        {e.isLocalPlayer && (
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shadow-[0_0_6px_#ff2a6d]" />
                        )}
                        <span className={e.isLocalPlayer ? 'text-rose-300 font-black' : ''}>
                          {e.name}
                        </span>
                        {e.isLocalPlayer && (
                          <span className="text-[9px] bg-rose-400/20 text-rose-300 px-1 rounded font-sans font-black">
                            YOU
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center font-mono font-bold text-rose-200">{e.kills}</td>
                      <td className="py-2 px-2 text-center font-mono text-slate-400">{e.deaths}</td>
                      {gamemode === 'dom' && (
                        <td className="py-2 px-2 text-center font-mono text-amber-300 font-bold">
                          {e.captures || 0}
                        </td>
                      )}
                      <td className="py-2 px-3 text-right font-mono font-black text-rose-400">
                        {e.score}
                      </td>
                    </tr>
                  ))}
                  {redEntries.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-xs text-slate-500">
                        No operatives assigned
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Free-For-All Full Ranked Leaderboard */
        <div className="bg-black/55 border border-cyan-400/25 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-cyan-950/40 border-b border-cyan-400/25 text-[10px] font-black uppercase text-cyan-300 tracking-wider">
                <th className="py-2.5 px-3">Rank</th>
                <th className="py-2.5 px-3">Operative</th>
                <th className="py-2.5 px-2 text-center">Kills</th>
                <th className="py-2.5 px-2 text-center">Deaths</th>
                <th className="py-2.5 px-2 text-center">K/D Ratio</th>
                <th className="py-2.5 px-3 text-right">Score</th>
                <th className="py-2.5 px-3 text-right">Coin Prize</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sorted.map((e, index) => {
                const rank = index + 1;
                const kd = e.deaths > 0 ? (e.kills / e.deaths).toFixed(1) : e.kills.toFixed(1);

                return (
                  <tr
                    key={e.id}
                    className={`transition-colors ${
                      e.isLocalPlayer
                        ? 'bg-gradient-to-r from-cyan-950/90 to-blue-950/90 text-white font-bold ring-1 ring-cyan-400/40'
                        : index % 2 === 0
                        ? 'bg-black/20 text-slate-300'
                        : 'text-slate-300'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-mono font-bold">
                      {rank === 1 ? '👑 #1' : rank === 2 ? '🥈 #2' : rank === 3 ? '🥉 #3' : `#${rank}`}
                    </td>
                    <td className="py-2.5 px-3 flex items-center gap-2 font-mono">
                      {e.isLocalPlayer && (
                        <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00d4ff] animate-pulse" />
                      )}
                      <span className={e.isLocalPlayer ? 'text-cyan-300 font-black' : ''}>
                        {e.name}
                      </span>
                      {e.isLocalPlayer && (
                        <span className="text-[9px] bg-cyan-400/20 text-cyan-300 px-1.5 py-0.5 rounded font-sans font-black border border-cyan-400/40">
                          YOU
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono font-bold text-cyan-200">
                      {e.kills}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono text-slate-400">
                      {e.deaths}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono text-slate-300">
                      {kd}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-cyan-400">
                      {e.score}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {getRankBadge(rank)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
