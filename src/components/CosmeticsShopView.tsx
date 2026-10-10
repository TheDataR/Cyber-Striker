import React, { useState } from 'react';
import { CosmeticItem, EquippedCosmetics } from '../game/types';
import { COSMETIC_CATALOG } from '../game/constants';
import { Coins, Check, Sparkles, Shield, Zap, Bomb, Flame } from 'lucide-react';

interface CosmeticsShopViewProps {
  cscCoins: number;
  ownedCosmetics: string[];
  equippedCosmetics: EquippedCosmetics;
  onBuyOrEquip: (item: CosmeticItem) => void;
}

export const CosmeticsShopView: React.FC<CosmeticsShopViewProps> = ({
  cscCoins,
  ownedCosmetics,
  equippedCosmetics,
  onBuyOrEquip
}) => {
  const [activeCategory, setActiveCategory] = useState<
    'all' | 'weapon' | 'operative' | 'explosive' | 'gloves'
  >('all');
  const [rarityFilter, setRarityFilter] = useState<'all' | 'rare' | 'epic' | 'legendary' | 'mythic'>('all');

  const filteredItems = COSMETIC_CATALOG.filter((item) => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesRarity = rarityFilter === 'all' || item.rarity === rarityFilter;
    return matchesCategory && matchesRarity;
  });

  const getRarityBadge = (rarity: CosmeticItem['rarity']) => {
    switch (rarity) {
      case 'mythic':
        return (
          <span className="text-[9px] font-black uppercase tracking-wider text-rose-300 bg-rose-950/90 border border-rose-500/60 px-1.5 py-0.5 rounded shadow-[0_0_8px_rgba(255,42,109,0.4)]">
            MYTHIC
          </span>
        );
      case 'legendary':
        return (
          <span className="text-[9px] font-black uppercase tracking-wider text-amber-300 bg-amber-950/90 border border-amber-500/60 px-1.5 py-0.5 rounded shadow-[0_0_8px_rgba(245,158,11,0.4)]">
            LEGENDARY
          </span>
        );
      case 'epic':
        return (
          <span className="text-[9px] font-black uppercase tracking-wider text-purple-300 bg-purple-950/90 border border-purple-500/60 px-1.5 py-0.5 rounded shadow-[0_0_8px_rgba(168,85,247,0.4)]">
            EPIC
          </span>
        );
      case 'rare':
        return (
          <span className="text-[9px] font-black uppercase tracking-wider text-cyan-300 bg-cyan-950/90 border border-cyan-400/60 px-1.5 py-0.5 rounded shadow-[0_0_8px_rgba(0,212,255,0.4)]">
            RARE
          </span>
        );
      default:
        return (
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-slate-900/80 border border-white/10 px-1.5 py-0.5 rounded">
            COMMON
          </span>
        );
    }
  };

  const isEquipped = (item: CosmeticItem) => {
    if (item.category === 'weapon') return equippedCosmetics.weaponSkin === item.id;
    if (item.category === 'operative') return equippedCosmetics.operativeSkin === item.id;
    if (item.category === 'explosive') return equippedCosmetics.explosiveFx === item.id;
    if (item.category === 'gloves') return equippedCosmetics.gloves === item.id;
    return false;
  };

  return (
    <div className="w-full space-y-4">
      {/* Shop Header & CSC Coins Balance */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-amber-950/40 via-yellow-950/30 to-black/60 border border-amber-400/40 p-4 rounded-2xl shadow-[0_0_25px_rgba(245,158,11,0.15)]">
        <div className="space-y-0.5">
          <div className="text-xs font-black tracking-widest uppercase text-amber-300 flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
            <span>CYBER ARSENAL COSMETICS STORE</span>
          </div>
          <div className="text-[11px] text-slate-300">
            Earn CSC Coins in longer matches: 1st Place (+25), 2nd (+15), 3rd (+8), or Finish (+3)!
          </div>
          <div className="text-[10px] text-amber-200/80 font-mono pt-1">
            Rarity Tiers: <span className="text-slate-400 font-bold">Common (Free)</span> • <span className="text-cyan-300 font-bold">Rare (45-50)</span> • <span className="text-purple-300 font-bold">Epic (85-110)</span> • <span className="text-amber-300 font-bold">Legendary (160-240)</span> • <span className="text-rose-400 font-bold">Mythic (400)</span>
          </div>
        </div>

        {/* Current Balance Display */}
        <div className="flex items-center gap-2.5 bg-black/80 border border-amber-400/70 px-4 py-2 rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.3)]">
          <Coins className="w-5 h-5 text-amber-400 animate-pulse" />
          <div>
            <div className="text-[9px] font-black uppercase text-slate-400 leading-none">Your Balance</div>
            <div className="text-xl font-black font-mono text-amber-300 tabular-nums leading-tight">
              {cscCoins} <span className="text-xs text-amber-400 font-sans">CSC</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category & Rarity Navigation Pills */}
      <div className="space-y-2 pb-1 border-b border-white/10">
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'All Items' },
            { key: 'weapon', label: 'Weapon Skins' },
            { key: 'operative', label: 'Operative Suits' },
            { key: 'explosive', label: 'Explosives FX' },
            { key: 'gloves', label: 'Gloves & Cyberware' }
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveCategory(tab.key as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeCategory === tab.key
                  ? 'bg-amber-400 text-black shadow-[0_0_12px_rgba(245,158,11,0.5)] font-black'
                  : 'bg-black/50 border border-white/10 text-slate-400 hover:text-white hover:border-amber-400/40'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Rarity filter pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Rarity:</span>
          {[
            { key: 'all', label: 'ALL RARITIES', color: 'text-slate-300' },
            { key: 'rare', label: 'RARE (45-50 CSC)', color: 'text-cyan-300' },
            { key: 'epic', label: 'EPIC (85-110 CSC)', color: 'text-purple-300' },
            { key: 'legendary', label: 'LEGENDARY (160-240 CSC)', color: 'text-amber-300' },
            { key: 'mythic', label: 'MYTHIC (400 CSC)', color: 'text-rose-400' }
          ].map((rf) => (
            <button
              key={rf.key}
              type="button"
              onClick={() => setRarityFilter(rf.key as any)}
              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border ${
                rarityFilter === rf.key
                  ? 'bg-white/20 border-white text-white shadow-[0_0_8px_rgba(255,255,255,0.3)]'
                  : 'bg-black/40 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <span className={rf.color}>{rf.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Cosmetics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredItems.map((item) => {
          const owned = ownedCosmetics.includes(item.id);
          const equipped = isEquipped(item);
          const canAfford = cscCoins >= item.price;

          return (
            <div
              key={item.id}
              className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all backdrop-blur-md relative overflow-hidden group ${
                equipped
                  ? 'bg-gradient-to-b from-cyan-950/70 to-blue-950/70 border-cyan-400 shadow-[0_0_20px_rgba(0,212,255,0.3)] ring-1 ring-cyan-400/60'
                  : owned
                  ? 'bg-black/60 border-white/20 hover:border-cyan-400/50'
                  : 'bg-black/50 border-white/10 hover:border-amber-400/40'
              }`}
            >
              {/* Item Top Info */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  {getRarityBadge(item.rarity)}
                  {item.badge && (
                    <span className="text-[9px] font-black uppercase tracking-wider text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-400/40">
                      {item.badge}
                    </span>
                  )}
                </div>

                {/* Swatch & Visual Identity */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg border border-white/20 shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${item.previewColor}, #111)`,
                      boxShadow: `0 0 14px ${item.previewColor}40`
                    }}
                  >
                    {item.category === 'weapon' ? (
                      <Zap className="w-5 h-5 text-white drop-shadow" />
                    ) : item.category === 'explosive' ? (
                      <Bomb className="w-5 h-5 text-white drop-shadow" />
                    ) : item.category === 'operative' ? (
                      <Shield className="w-5 h-5 text-white drop-shadow" />
                    ) : (
                      <Sparkles className="w-5 h-5 text-white drop-shadow" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="text-xs font-black tracking-wide truncate text-white">
                      {item.name}
                    </div>
                    <div className="text-[10px] text-slate-400 capitalize">
                      {item.category} cosmetic
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
              </div>

              {/* Action & Price Footer */}
              <div className="pt-3 mt-3 border-t border-white/10 flex items-center justify-between gap-2">
                <div className="font-mono text-xs font-black">
                  {item.price === 0 ? (
                    <span className="text-emerald-400">FREE</span>
                  ) : (
                    <span className="text-amber-300 flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                      <span>{item.price} CSC</span>
                    </span>
                  )}
                </div>

                {equipped ? (
                  <button
                    type="button"
                    disabled
                    className="px-3 py-1.5 rounded-lg bg-cyan-950/80 border border-cyan-400 text-cyan-300 text-xs font-black tracking-wider uppercase flex items-center gap-1 cursor-default shadow-[0_0_10px_rgba(0,212,255,0.4)]"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Equipped</span>
                  </button>
                ) : owned ? (
                  <button
                    type="button"
                    onClick={() => onBuyOrEquip(item)}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-black tracking-wider uppercase transition-all cursor-pointer shadow-[0_0_10px_rgba(0,212,255,0.4)] hover:scale-105"
                  >
                    Equip
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onBuyOrEquip(item)}
                    disabled={!canAfford}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black tracking-wider uppercase transition-all flex items-center gap-1 cursor-pointer ${
                      canAfford
                        ? 'bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black shadow-[0_0_14px_rgba(245,158,11,0.5)] hover:scale-105'
                        : 'bg-black/50 border border-white/10 text-slate-500 cursor-not-allowed opacity-60'
                    }`}
                    title={canAfford ? `Purchase for ${item.price} CSC` : `Need ${item.price - cscCoins} more CSC`}
                  >
                    <Coins className="w-3.5 h-3.5" />
                    <span>Buy</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
