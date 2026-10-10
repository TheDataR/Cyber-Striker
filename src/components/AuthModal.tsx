import React, { useState } from 'react';
import {
  User,
  Lock,
  ShieldCheck,
  Zap,
  Award,
  AlertCircle,
  LogOut,
  Sparkles,
  X,
  CheckCircle2,
  Trophy,
  Target,
  Coins,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import {
  PlayerProfile,
  getAllSavedAccounts,
  loginAccount,
  registerAccount,
  logoutAccount
} from '../game/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: PlayerProfile;
  onUserChange: (user: PlayerProfile) => void;
  currentCoins: number;
  currentCosmetics: string[];
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChange,
  currentCoins,
  currentCosmetics
}) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'profile'>(
    currentUser.isGuest ? 'signin' : 'profile'
  );
  const [username, setUsername] = useState('');
  const [callsign, setCallsign] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const savedAccounts = getAllSavedAccounts();

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const res = loginAccount(username, password);
    if (!res.success || !res.user) {
      setError(res.error || 'Failed to sign in.');
      return;
    }

    onUserChange(res.user);
    setSuccessMsg(`Welcome back, Operator ${res.user.username}!`);
    setTimeout(() => {
      onClose();
    }, 900);
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const res = registerAccount(username, callsign, password, {
      cscCoins: Math.max(50, currentCoins),
      ownedCosmetics: currentCosmetics,
      equippedCosmetics: currentUser.equippedCosmetics,
      stats: currentUser.stats,
      preferredWeaponClass: currentUser.preferredWeaponClass
    });

    if (!res.success || !res.user) {
      setError(res.error || 'Failed to create account.');
      return;
    }

    onUserChange(res.user);
    setSuccessMsg(`Account created! Welcome, Operator ${res.user.callsign}. Your progress is saved!`);
    setTimeout(() => {
      onClose();
    }, 1100);
  };

  const handleQuickLogin = (acc: PlayerProfile) => {
    setUsername(acc.username);
    setPassword(acc.password || '');
    setError(null);
  };

  const handleLogout = () => {
    const guest = logoutAccount();
    onUserChange(guest);
    setMode('signin');
    setUsername('');
    setPassword('');
    setSuccessMsg('Logged out. Switched to Guest Mode.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-gradient-to-b from-[#101726] to-[#080d18] border border-cyan-400/40 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_40px_rgba(0,212,255,0.15)] overflow-hidden">
        {/* Top Glow Rim */}
        <div className="h-1 bg-gradient-to-r from-transparent via-[#00d4ff] to-[#ff2a6d]" />

        {/* Header */}
        <div className="p-5 pb-3 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-400/40 shadow-[0_0_15px_rgba(0,212,255,0.2)]">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-wider uppercase text-white flex items-center gap-2">
                Operator Network
                {!currentUser.isGuest && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-400/50 text-emerald-300">
                    ONLINE
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-400">Save career progress, rank & armory</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Account Mode Switcher Tabs */}
        <div className="flex border-b border-white/10 bg-black/40 text-xs font-bold uppercase tracking-wider">
          {currentUser.isGuest ? (
            <>
              <button
                onClick={() => {
                  setMode('signin');
                  setError(null);
                }}
                className={`flex-1 py-3 text-center transition-all relative ${
                  mode === 'signin' ? 'text-cyan-400 bg-cyan-950/20' : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
                {mode === 'signin' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 shadow-[0_0_8px_#00d4ff]" />
                )}
              </button>
              <button
                onClick={() => {
                  setMode('signup');
                  setError(null);
                }}
                className={`flex-1 py-3 text-center transition-all relative ${
                  mode === 'signup' ? 'text-[#ff2a6d] bg-rose-950/20' : 'text-slate-400 hover:text-white'
                }`}
              >
                Create Account
                {mode === 'signup' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ff2a6d] shadow-[0_0_8px_#ff2a6d]" />
                )}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setMode('profile')}
                className={`flex-1 py-3 text-center transition-all relative ${
                  mode === 'profile' ? 'text-cyan-400 bg-cyan-950/20' : 'text-slate-400 hover:text-white'
                }`}
              >
                Active Profile
                {mode === 'profile' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 shadow-[0_0_8px_#00d4ff]" />
                )}
              </button>
              <button
                onClick={() => {
                  setMode('signin');
                  setError(null);
                }}
                className={`flex-1 py-3 text-center transition-all relative ${
                  mode === 'signin' ? 'text-cyan-400 bg-cyan-950/20' : 'text-slate-400 hover:text-white'
                }`}
              >
                Switch Account
                {mode === 'signin' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 shadow-[0_0_8px_#00d4ff]" />
                )}
              </button>
              <button
                onClick={() => {
                  setMode('signup');
                  setError(null);
                }}
                className={`flex-1 py-3 text-center transition-all relative ${
                  mode === 'signup' ? 'text-[#ff2a6d] bg-rose-950/20' : 'text-slate-400 hover:text-white'
                }`}
              >
                New Account
                {mode === 'signup' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ff2a6d] shadow-[0_0_8px_#ff2a6d]" />
                )}
              </button>
            </>
          )}
        </div>

        {/* Body Contents */}
        <div className="p-5 max-h-[75vh] overflow-y-auto space-y-4">
          {/* Status Message */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 flex items-start gap-2.5 text-xs text-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-400/50 flex items-start gap-2.5 text-xs text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* MODE: ACTIVE PROFILE OVERVIEW */}
          {mode === 'profile' && !currentUser.isGuest && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-950/40 via-black/40 to-slate-900/60 border border-cyan-400/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center font-black text-xl text-white shadow-[0_0_15px_rgba(0,212,255,0.4)]">
                      {currentUser.username.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-black text-white">{currentUser.username}</div>
                      <div className="text-xs font-mono font-bold text-cyan-400">
                        CALLSIGN: {currentUser.callsign}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Operative Level {currentUser.level} • {currentUser.xp} XP
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Saved Coins</div>
                    <div className="text-base font-black text-amber-300 font-mono flex items-center justify-end gap-1">
                      <Coins className="w-4 h-4 text-amber-400" />
                      {currentUser.cscCoins} CSC
                    </div>
                  </div>
                </div>

                {/* Stats Breakdown */}
                <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-white/10 text-center">
                  <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                    <div className="text-[10px] text-slate-400 uppercase">Kills</div>
                    <div className="text-sm font-black text-cyan-300 font-mono">{currentUser.stats.kills}</div>
                  </div>
                  <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                    <div className="text-[10px] text-slate-400 uppercase">Deaths</div>
                    <div className="text-sm font-black text-rose-300 font-mono">{currentUser.stats.deaths}</div>
                  </div>
                  <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                    <div className="text-[10px] text-slate-400 uppercase">K/D Ratio</div>
                    <div className="text-sm font-black text-emerald-300 font-mono">
                      {currentUser.stats.deaths === 0
                        ? currentUser.stats.kills.toFixed(2)
                        : (currentUser.stats.kills / currentUser.stats.deaths).toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                    <div className="text-[10px] text-slate-400 uppercase">Wins</div>
                    <div className="text-sm font-black text-amber-300 font-mono">{currentUser.stats.wins}</div>
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold text-emerald-300">Progress Active & Saved:</span> All match scores,
                  coins, shotguns & snipers, and shop purchases are automatically saved to this account.
                </div>
              </div>

              {/* Log out / Switch to guest */}
              <button
                onClick={handleLogout}
                className="w-full py-2.5 px-4 rounded-xl border border-rose-500/40 bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
              >
                <LogOut className="w-4 h-4" />
                Log Out to Guest Mode
              </button>
            </div>
          )}

          {/* MODE: SIGN IN */}
          {mode === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4 animate-in fade-in duration-150">
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-cyan-300 mb-1.5">
                  Username or Email (e.g. operative.x99@example.com)
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. operative.x99@example.com"
                    className="w-full pl-9 pr-3 py-2.5 bg-black/60 border border-cyan-400/40 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-cyan-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 bg-black/60 border border-cyan-400/40 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                </div>
              </div>

              {/* Saved accounts shortcut */}
              {savedAccounts.length > 0 && (
                <div className="pt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Saved Operatives on This Device:
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {savedAccounts.map((acc) => (
                      <button
                        type="button"
                        key={acc.id}
                        onClick={() => handleQuickLogin(acc)}
                        className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-cyan-950/50 border border-cyan-400/30 text-cyan-300 hover:border-cyan-400 hover:bg-cyan-900/60 transition-colors"
                      >
                        {acc.username}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(0,212,255,0.4)] transition-all flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                Sign In & Load Progress
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                  }}
                  className="text-xs text-slate-400 hover:text-cyan-300 underline underline-offset-2 transition-colors"
                >
                  Need an operative ID? Create a new account
                </button>
              </div>
            </form>
          )}

          {/* MODE: CREATE ACCOUNT (SIGN UP) */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-3.5 animate-in fade-in duration-150">
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-rose-300 mb-1">
                  Username or Email (e.g. operative.x99@example.com)
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-rose-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    minLength={3}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. operative.x99@example.com"
                    className="w-full pl-9 pr-3 py-2 bg-black/60 border border-rose-500/40 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-rose-300 mb-1">
                  Tactical Callsign <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <div className="relative">
                  <Target className="w-4 h-4 text-rose-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={callsign}
                    onChange={(e) => setCallsign(e.target.value.toUpperCase())}
                    placeholder="e.g. VALKYRIE_01"
                    className="w-full pl-9 pr-3 py-2 bg-black/60 border border-rose-500/40 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400 font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-rose-300 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-rose-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      minLength={4}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 bg-black/60 border border-rose-500/40 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-rose-300 mb-1">
                    Confirm
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-rose-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      minLength={4}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 bg-black/60 border border-rose-500/40 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400"
                    />
                  </div>
                </div>
              </div>

              {/* Perks list */}
              <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1.5 text-[11px] text-slate-300">
                <div className="font-bold text-cyan-300 uppercase tracking-wider text-[10px] mb-1">
                  Registered Account Privileges:
                </div>
                <div className="flex items-center gap-2 text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Saves coins, career stats, and match victories permanently</span>
                </div>
                <div className="flex items-center gap-2 text-cyan-300">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Unlocks Combat Shotgun & Sniper Rifle in your arsenal</span>
                </div>
                <div className="flex items-center gap-2 text-amber-300">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Full access to Cyber Shop, Armory, and Settings</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#ff2a6d] to-rose-600 hover:from-[#ff4382] hover:to-rose-500 text-white font-black text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(255,42,109,0.4)] transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Create Account & Unlock Arsenal
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setError(null);
                  }}
                  className="text-xs text-slate-400 hover:text-cyan-300 underline underline-offset-2 transition-colors"
                >
                  Already registered? Sign In to existing account
                </button>
              </div>
            </form>
          )}

          {/* Guest Mode Explainer / Footer */}
          <div className="pt-2 border-t border-white/10">
            <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-400/30 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-[11px] text-slate-300">
                <div className="font-bold text-amber-300 uppercase">Guest Account Restrictions:</div>
                <p className="mt-0.5 text-slate-400">
                  Guest accounts can only access the <span className="text-white font-bold">Deploy Page</span> and{' '}
                  <span className="text-white font-bold">Servers Page</span>. Arsenal is restricted to the{' '}
                  <span className="text-cyan-300 font-bold">Assault Rifle</span> and{' '}
                  <span className="text-emerald-300 font-bold">Submachine Gun</span>.
                </p>
              </div>
            </div>

            {currentUser.isGuest && (
              <button
                type="button"
                onClick={onClose}
                className="w-full mt-3 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold text-xs uppercase tracking-wider transition-all"
              >
                Continue as Guest Operator
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
