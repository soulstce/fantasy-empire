export type SceneId = 'overworld' | 'cave';
export type BuildingType = 'main-hall' | 'house' | 'potion-shop' | 'farm';
export type VillagerTask = 'idle' | 'gather' | 'hunt' | 'build' | 'explore';
export type QueueActionType = 'attack' | 'defend' | 'spell';
export type MonsterType = 'slime' | 'wolf' | 'goblin' | 'troll' | 'witch';
export type SpellId = 'ember' | 'heal' | 'shield' | 'bolt';

export type Point = { x: number; y: number };
export type GridPoint = { row: number; col: number };

export type Building = {
  id: string;
  type: BuildingType;
  row: number;
  col: number;
  hp: number;
  maxHp: number;
};

export type Villager = {
  id: string;
  task: VillagerTask;
  x: number;
  y: number;
  target?: Point;
  carrying?: 'wood' | 'food' | 'stone';
};

export type Enemy = {
  id: string;
  type: MonsterType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  attack: number;
  speed: number;
  aggro: number;
};

export type ResourceNode = {
  id: string;
  kind: 'wood' | 'food' | 'stone';
  x: number;
  y: number;
  amount: number;
};

export type QueueAction = {
  id: string;
  type: QueueActionType;
  name: string;
  power: number;
  duration: number;
  remaining: number;
};

export type Spell = {
  id: SpellId;
  name: string;
  level: number;
  description: string;
  power: number;
  costMp: number;
};

export type Player = {
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  magic: number;
  spellbook: SpellId[];
};

export type GameState = {
  scene: SceneId;
  width: number;
  height: number;
  tileSize: number;
  mapCols: number;
  mapRows: number;
  explored: boolean[][];
  visible: boolean[][];
  resources: ResourceNode[];
  buildings: Building[];
  villagers: Villager[];
  enemies: Enemy[];
  chests: Point[];
  player: Player;
  inventory: { wood: number; food: number; stone: number; potions: number; loot: number };
  selectedBuilding: BuildingType | null;
  selectedTask: VillagerTask;
  queuedActions: QueueAction[];
  messages: string[];
  gameTime: number;
};
