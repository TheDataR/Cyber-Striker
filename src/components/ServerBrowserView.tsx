import React, { useState, useEffect } from 'react';
import { ServerListing, MapKey } from '../game/types';
import {
  Server,
  Globe,
  Radio,
  Users,
  Clock,
  Cpu,
  RefreshCw,
  Shuffle,
  Shield,
  Zap,
  Search,
  Filter,
  Check,
  ChevronRight,
  Flame,
  Bot,
  Plus
} from 'lucide-react';

interface ServerBrowserViewProps {
  onJoinServer: (server: ServerListing) => void;
  onHostServer: () => void;
  currentCallsign: string;
}

export function getSmartnessTag(level: number) {
  if (level <= 2) {
    return {
      name: 'RECRUIT',
      textCol: 'text-emerald-400',
      bgCol: 'bg-emerald-950/80',
      borderCol: 'border-emerald-500/50'
    };
  }
  if (level <= 4) {
    return {
      name: 'TROOPER',
      textCol: 'text-cyan-400',
      bgCol: 'bg-cyan-950/80',
      borderCol: 'border-cyan-500/50'
    };
  }
  if (level <= 6) {
    return {
      name: 'VETERAN',
      textCol: 'text-blue-400',
      bgCol: 'bg-blue-950/80',
      borderCol: 'border-blue-500/50'
    };
  }
  if (level <= 8) {
    return {
      name: 'ELITE',
      textCol: 'text-amber-400',
      bgCol: 'bg-amber-950/80',
      borderCol: 'border-amber-500/50'
    };
  }
  return {
    name: 'CYBER DEITY (HARDEST)',
    textCol: 'text-rose-400',
    bgCol: 'bg-rose-950/80',
    borderCol: 'border-rose-500/60'
  };
}

export const ServerBrowserView: React.FC<ServerBrowserViewProps> = ({
  onJoinServer,
  onHostServer,
  currentCallsign
}) => {
  const [servers, setServers] = useState<ServerListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState<'all' | 'ffa' | 'tdm' | 'dom'>('all');
  const [quickJoining, setQuickJoining] = useState(false);

  const fetchServers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/servers');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.servers)) {
          // Strictly only servers that real human players are on (playerCount > 0)!
          const realServers = data.servers.filter(
            (s: ServerListing) => typeof s.playerCount === 'number' && s.playerCount > 0
          );
          setServers(realServers);
          setLoading(false);
          return;
        }
      }
    } catch {
      // Fallback
    }
    setServers([]);
    setLoading(false);
  };

  useEffect(() => {
    fetchServers();
  }, []);

  const filteredServers = servers.filter((s) => {
    // Strictly require real human player count
    if (!s.playerCount || s.playerCount <= 0) return false;
    if (modeFilter !== 'all' && s.gameMode !== modeFilter) return false;
    if (search.trim()) {
      const query = search.toLowerCase();
      return (
        s.name.toLowerCase().includes(query) ||
        s.mapKey.toLowerCase().includes(query) ||
        s.region.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const totalPlayers = servers.reduce((acc, s) => acc + s.playerCount, 0);

  const handleQuickJoinRandom = () => {
    if (filteredServers.length === 0) return;
    setQuickJoining(true);
    const chosen = filteredServers[Math.floor(Math.random() * filteredServers.length)];
    setTimeout(() => {
      onJoinServer(chosen);
      setQuickJoining(false);
    }, 350);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Banner & Quick Join Actions */}
      <div className="bg-gradient-to-r from-[#071325]/90 via-[#0a1e38]/90 to-[#12112e]/90 border border-cyan-400/35 rounded-2xl p-4 sm:p-5 shadow-[0_0_25px_rgba(0,212,255,0.15)] flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-400/50 flex items-center justify-center shadow-[0_0_15px_rgba(0,212,255,0.3)]">
            <Radio className="w-6 h-6 text-cyan-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-black bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-400/30">
                PUBLIC RELAY NETWORK
              </span>
              <span className="text-[9px] font-mono tracking-wider text-emerald-400 uppercase font-black bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
                REAL PEOPLE ONLY
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black italic tracking-wide uppercase text-white mt-0.5">
              LIVE HUMAN SERVERS
            </h2>
            <p className="text-xs text-slate-300">
              Only showing active multiplayer rooms where real human players are present (bot-only servers excluded).
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            type="button"
            onClick={handleQuickJoinRandom}
            disabled={quickJoining || filteredServers.length === 0}
            className="flex-1 md:flex-initial px-5 py-3 rounded-xl text-xs font-black tracking-widest uppercase text-white bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 shadow-[0_0_20px_rgba(0,212,255,0.4)] hover:shadow-[0_0_30px_rgba(0,212,255,0.6)] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            title="Join a random active public server"
          >
            <Shuffle className={`w-4 h-4 ${quickJoining ? 'animate-spin' : ''}`} />
            <span>{quickJoining ? 'CONNECTING...' : 'QUICK JOIN RANDOM'}</span>
          </button>

          <button
            type="button"
            onClick={fetchServers}
            disabled={loading}
            className="p-3 rounded-xl bg-black/60 hover:bg-black/90 border border-cyan-400/40 text-cyan-300 hover:text-white transition-all cursor-pointer shadow-[0_0_10px_rgba(0,212,255,0.2)] disabled:opacity-50"
            title="Refresh Server List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          <button
            type="button"
            onClick={onHostServer}
            className="px-3.5 py-3 rounded-xl bg-black/60 hover:bg-black/90 border border-white/20 hover:border-cyan-400 text-xs font-black tracking-wider uppercase text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
            title="Host your own custom online match"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">HOST MATCH</span>
          </button>
        </div>
      </div>

      {/* Network Stats Bar & Search / Mode Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-black/40 border border-cyan-400/25 p-3 rounded-xl">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by server name, map, or region..."
              className="w-full bg-black/70 border border-cyan-400/30 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white outline-none focus:border-cyan-400 placeholder:text-slate-500 font-medium"
            />
          </div>
        </div>

        {/* Game Mode Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {(['all', 'ffa', 'tdm', 'dom'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setModeFilter(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${
                modeFilter === m
                  ? 'bg-cyan-500 text-black border-cyan-300 shadow-[0_0_10px_#00d4ff]'
                  : 'bg-black/50 border-white/10 text-slate-400 hover:text-white hover:border-cyan-400/40'
              }`}
            >
              {m === 'all' ? 'ALL MODES' : m.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Server List Status Bar */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <div className="flex items-center gap-3">
          <span>
            SHOWING <span className="font-mono font-bold text-cyan-300">{filteredServers.length}</span> SERVERS
          </span>
          <span>•</span>
          <span>
            OPERATIVES ONLINE: <span className="font-mono font-bold text-emerald-400">{totalPlayers}</span>
          </span>
        </div>
        <div className="text-[11px] font-mono text-cyan-400/80">
          CALLSIGN: <span className="font-bold text-white">{currentCallsign}</span>
        </div>
      </div>

      {/* Servers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filteredServers.map((server) => {
          const allyTag = getSmartnessTag(server.allyBotSmartness);
          const enemyTag = getSmartnessTag(server.enemyBotSmartness);

          return (
            <div
              key={server.id}
              className="group bg-gradient-to-b from-[#0b1424]/90 to-[#050914]/90 hover:from-[#0d1b32]/95 hover:to-[#091124]/95 border border-cyan-400/30 hover:border-cyan-400 rounded-2xl p-4 transition-all duration-200 shadow-[0_4px_20px_rgba(0,0,0,0.6)] hover:shadow-[0_0_25px_rgba(0,212,255,0.25)] flex flex-col justify-between gap-3.5 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              <div>
                {/* Header row: Name, ping, live badge */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black tracking-wide text-white group-hover:text-cyan-300 transition-colors uppercase">
                        {server.name}
                      </h3>
                      {server.isOfficial && (
                        <span className="text-[9px] font-black font-mono tracking-wider bg-cyan-950/90 text-cyan-300 border border-cyan-400/40 px-1.5 py-0.5 rounded">
                          OFFICIAL
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                      <span className="font-mono text-cyan-400 uppercase font-bold">{server.region}</span>
                      <span>•</span>
                      <span className="uppercase font-semibold">MAP: {server.mapKey.toUpperCase()}</span>
                      <span>•</span>
                      <span className="uppercase font-semibold">
                        MODE:{' '}
                        {server.gameMode === 'ffa'
                          ? 'FREE-FOR-ALL'
                          : server.gameMode === 'tdm'
                          ? 'TEAM DEATHMATCH'
                          : 'DOMINATION'}
                      </span>
                    </div>
                  </div>

                  {/* Ping & Live status */}
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1.5 bg-black/70 px-2 py-0.5 rounded border border-white/10 text-[10px] font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-emerald-400 font-bold">{server.ping}ms</span>
                    </div>
                  </div>
                </div>

                {/* Bot Smartness Ratings & Match Specs */}
                <div className="grid grid-cols-2 gap-2 mt-3 p-2.5 rounded-xl bg-black/60 border border-white/10">
                  {/* Ally Bot Smartness */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Bot className="w-3 h-3 text-cyan-400" />
                      <span>Ally Bots Smartness</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-black font-mono text-cyan-300">
                        {server.allyBotSmartness}/10
                      </span>
                      <span
                        className={`text-[9px] font-black tracking-wide px-1.5 py-0.5 rounded border ${allyTag.bgCol} ${allyTag.borderCol} ${allyTag.textCol}`}
                      >
                        {allyTag.name}
                      </span>
                    </div>
                  </div>

                  {/* Enemy Bot Smartness */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Flame className="w-3 h-3 text-rose-400" />
                      <span>Enemy Bots Smartness</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-black font-mono text-rose-300">
                        {server.enemyBotSmartness}/10
                      </span>
                      <span
                        className={`text-[9px] font-black tracking-wide px-1.5 py-0.5 rounded border ${enemyTag.bgCol} ${enemyTag.borderCol} ${enemyTag.textCol}`}
                      >
                        {enemyTag.name}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Additional Specs: Players, Duration, Bots */}
                <div className="flex items-center justify-between text-[11px] text-slate-300 font-medium mt-2.5 px-0.5">
                  <div className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-cyan-400" />
                    <span>
                      <span className="font-mono font-bold text-white">{server.playerCount}</span> /{' '}
                      {server.maxPlayers} Operatives
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>
                      <span className="font-mono font-bold text-white">{server.matchDuration}m</span> Match
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                    <span>
                      <span className="font-mono font-bold text-white">{server.botCount}</span> Bots
                    </span>
                  </div>
                </div>
              </div>

              {/* Join Button */}
              <button
                type="button"
                onClick={() => onJoinServer(server)}
                className="w-full py-2.5 rounded-xl text-xs font-black italic tracking-widest uppercase text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-[0_0_15px_rgba(0,212,255,0.3)] hover:shadow-[0_0_25px_rgba(0,212,255,0.5)] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>JOIN COMBAT SERVER</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          );
        })}
      </div>

      {filteredServers.length === 0 && (
        <div className="py-12 px-6 text-center space-y-4 bg-gradient-to-b from-[#071325]/60 to-[#040813]/90 border border-cyan-400/25 rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.5)]">
          <div className="w-14 h-14 rounded-2xl bg-cyan-950/70 border border-cyan-400/40 flex items-center justify-center mx-auto text-cyan-400 shadow-[0_0_15px_rgba(0,212,255,0.25)]">
            <Users className="w-7 h-7 text-cyan-300" />
          </div>
          <div>
            <h4 className="text-base font-black text-white uppercase tracking-wider">
              NO SERVERS WITH REAL PEOPLE ONLINE RIGHT NOW
            </h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
              Bot-only servers are hidden. Only live rooms with real human operatives appear here. Be the first to create a public lobby so others can join you!
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={fetchServers}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-black/60 hover:bg-black/90 border border-cyan-400/30 text-xs font-bold text-cyan-300 hover:text-white flex items-center gap-2 cursor-pointer transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Scan Again</span>
            </button>
            <button
              type="button"
              onClick={onHostServer}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-xs font-black text-white uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(0,212,255,0.4)] transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Host a Real Player Server</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
