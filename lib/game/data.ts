import type { BuildingType, MonsterType, Spell } from './types';

type BuildingData = { name: string; cost: { wood: number; stone?: number; food?: number }; hp: number; description: string };

export const BUILDINGS: Record<BuildingType, BuildingData> = {
  'main-hall': { name: 'Main Hall', cost: { wood: 120, stone: 60 }, hp: 600, description: 'Command center, unlocks the colony.' },
  house: { name: 'House', cost: { wood: 35 }, hp: 220, description: 'Provides 2 villagers.' },
  'potion-shop': { name: 'Potion Shop', cost: { wood: 50, stone: 20 }, hp: 180, description: 'Crafts healing supplies and spell reagents.' },
  farm: { name: 'Farm', cost: { wood: 25, food: 5 }, hp: 160, description: 'Generates food and supports villagers.' }
};

export const MONSTERS: Record<MonsterType, { name: string; hp: number; attack: number; speed: number; aggro: number; color: string }> = {
  slime: { name: 'Slime', hp: 12, attack: 2, speed: 0.35, aggro: 80, color: '#79f2a1' },
  wolf: { name: 'Wolf', hp: 18, attack: 4, speed: 0.75, aggro: 120, color: '#a4b3c8' },
  goblin: { name: 'Goblin', hp: 24, attack: 5, speed: 0.55, aggro: 140, color: '#98e08b' },
  troll: { name: 'Troll', hp: 48, attack: 9, speed: 0.28, aggro: 180, color: '#8cbd75' },
  witch: { name: 'Witch', hp: 30, attack: 7, speed: 0.42, aggro: 180, color: '#d59cff' }
};

export const SPELLS: Spell[] = [
  { id: 'ember', name: 'Ember Bolt', level: 1, description: 'A fast fire spell that deals damage over time.', power: 8, costMp: 3 },
  { id: 'heal', name: 'Reprieve', level: 2, description: 'Restore health during battle.', power: 10, costMp: 4 },
  { id: 'shield', name: 'Shield Ward', level: 3, description: 'Temporarily strengthens defense.', power: 6, costMp: 4 },
  { id: 'bolt', name: 'Arc Bolt', level: 5, description: 'A stronger ranged spell against monsters.', power: 14, costMp: 7 }
];
