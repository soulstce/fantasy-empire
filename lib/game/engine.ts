import { BUILDINGS, MONSTERS, SPELLS } from './data';
import type { BuildingType, GameState, GridPoint, QueueAction, SceneId, SpellId, VillagerTask } from './types';

const TILE = 32;
const COLS = 28;
const ROWS = 18;

const typeColors: Record<BuildingType, string> = {
  'main-hall': '#c7b37f',
  house: '#89b8ff',
  'potion-shop': '#cf8cff',
  farm: '#7ede91'
};

const tasks: VillagerTask[] = ['idle', 'gather', 'hunt', 'build', 'explore'];

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function createMatrix(rows: number, cols: number, value = false) {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => value));
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function gridToWorld({ row, col }: GridPoint) {
  return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 };
}

function initialState(): GameState {
  const resources = [
    { id: uid('wood'), kind: 'wood' as const, x: 5 * TILE + 16, y: 9 * TILE + 16, amount: 140 },
    { id: uid('food'), kind: 'food' as const, x: 8 * TILE + 16, y: 5 * TILE + 16, amount: 130 },
    { id: uid('stone'), kind: 'stone' as const, x: 17 * TILE + 16, y: 11 * TILE + 16, amount: 120 }
  ];

  const mainHall = { id: uid('building'), type: 'main-hall' as const, row: 8, col: 10, hp: 600, maxHp: 600 };
  const villagers = Array.from({ length: 4 }, (_, i) => ({ id: uid('villager'), task: 'idle' as const, x: 340 + i * 10, y: 284 + i * 6 }));
  const enemies = [
    { id: uid('enemy'), type: 'slime' as const, x: 790, y: 320, hp: 12, maxHp: 12, attack: 2, speed: 0.35, aggro: 0 },
    { id: uid('enemy'), type: 'goblin' as const, x: 900, y: 450, hp: 24, maxHp: 24, attack: 5, speed: 0.55, aggro: 0 },
    { id: uid('enemy'), type: 'wolf' as const, x: 820, y: 560, hp: 18, maxHp: 18, attack: 4, speed: 0.75, aggro: 0 }
  ];
  return {
    scene: 'overworld',
    width: COLS * TILE,
    height: ROWS * TILE,
    tileSize: TILE,
    mapCols: COLS,
    mapRows: ROWS,
    explored: createMatrix(ROWS, COLS, false),
    visible: createMatrix(ROWS, COLS, false),
    resources,
    buildings: [mainHall],
    villagers,
    enemies,
    chests: [{ x: 20 * TILE + 16, y: 6 * TILE + 16 }],
    player: { level: 1, xp: 0, hp: 30, maxHp: 30, mp: 10, maxMp: 10, attack: 6, defense: 3, magic: 4, spellbook: ['ember'] },
    inventory: { wood: 80, food: 40, stone: 30, potions: 3, loot: 0 },
    selectedBuilding: null,
    selectedTask: 'gather',
    queuedActions: [],
    messages: ['Build a colony, explore the fog, and survive the wilds.'],
    gameTime: 0
  };
}

export class FantasyEmpireEngine {
  state = initialState();
  private raf = 0;
  private last = 0;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private onUpdate: (state: GameState) => void;
  private hovered: GridPoint | null = null;
  private defenseBoost = 0;
  private loopFrame = (timestamp: number) => {
    const dt = Math.min(0.033, (timestamp - this.last) / 1000 || 0.016);
    this.last = timestamp;
    this.update(dt);
    this.draw();
    this.onUpdate(this.state);
    this.raf = requestAnimationFrame(this.loopFrame);
  };

  constructor(canvas: HTMLCanvasElement, onUpdate: (state: GameState) => void) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');
    this.canvas = canvas;
    this.ctx = ctx;
    this.onUpdate = onUpdate;
    canvas.width = this.state.width;
    canvas.height = this.state.height;
    this.bindInput();
    this.revealAroundPlayer();
    this.raf = requestAnimationFrame(this.loopFrame);
    this.onUpdate(this.state);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
  }

  setScene(scene: SceneId) {
    this.state.scene = scene;
    this.state.messages.unshift(scene === 'cave' ? 'You descend into the cave.' : 'You return to the overworld.');
  }

  setBuilding(type: BuildingType | null) {
    this.state.selectedBuilding = type;
  }

  setTask(task: VillagerTask) {
    this.state.selectedTask = task;
    this.state.messages.unshift(`Villagers assigned to ${task}.`);
  }

  queueAction(type: QueueAction['type'], spellId?: SpellId) {
    const action: QueueAction = {
      id: uid('action'),
      type,
      name: type === 'attack' ? 'Attack' : type === 'defend' ? 'Defend' : 'Spell Queue',
      power: type === 'attack' ? this.state.player.attack + this.state.player.level : type === 'defend' ? this.state.player.defense + 2 : 8,
      duration: 1.1,
      remaining: 1.1,
      spellId
    };
    this.state.queuedActions.push(action);
    this.state.messages.unshift(`Queued ${action.name.toLowerCase()}.`);
  }

  castSpell(spellId: SpellId) {
    const spell = SPELLS.find((item) => item.id === spellId);
    if (!spell || !this.state.player.spellbook.includes(spell.id)) return;
    if (this.state.player.mp < spell.costMp) {
      this.state.messages.unshift('Not enough mana.');
      return;
    }
    this.state.player.mp -= spell.costMp;
    this.queueAction('spell', spellId);
    this.state.messages.unshift(`Cast ${spell.name}.`);
  }

  consumePotion() {
    if (this.state.inventory.potions <= 0) {
      this.state.messages.unshift('No potions left.');
      return;
    }
    this.state.inventory.potions -= 1;
    this.state.player.hp = clamp(this.state.player.hp + 12, 0, this.state.player.maxHp);
    this.state.messages.unshift('Potion consumed.');
  }

  buildSelected(at: GridPoint) {
    const type = this.state.selectedBuilding;
    if (!type) return;
    const def = BUILDINGS[type];
    const occupied = this.state.buildings.some((b) => b.row === at.row && b.col === at.col);
    if (occupied) return;
    if (this.state.inventory.wood < (def.cost.wood ?? 0) || this.state.inventory.stone < (def.cost.stone ?? 0) || this.state.inventory.food < (def.cost.food ?? 0)) {
      this.state.messages.unshift('Not enough resources.');
      return;
    }
    this.state.inventory.wood -= def.cost.wood ?? 0;
    this.state.inventory.stone -= def.cost.stone ?? 0;
    this.state.inventory.food -= def.cost.food ?? 0;
    this.state.buildings.push({ id: uid('building'), type, row: at.row, col: at.col, hp: def.hp, maxHp: def.hp });
    this.state.messages.unshift(`${def.name} constructed.`);
    if (type === 'house') this.spawnVillagers(2);
    if (type === 'farm') this.state.inventory.food += 15;
    if (type === 'potion-shop' && !this.state.player.spellbook.includes('heal')) this.state.player.spellbook.push('heal');
  }

  private spawnVillagers(count: number) {
    for (let i = 0; i < count; i += 1) {
      this.state.villagers.push({ id: uid('villager'), task: 'idle', x: 330 + i * 12, y: 310 + i * 6 });
    }
  }

  private bindInput() {
    this.canvas.addEventListener('click', (event) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * this.state.width;
      const y = ((event.clientY - rect.top) / rect.height) * this.state.height;
      const col = Math.floor(x / this.state.tileSize);
      const row = Math.floor(y / this.state.tileSize);
      this.buildSelected({ row, col });
      this.revealAround({ x, y }, 4);
      this.onUpdate(this.state);
    });

    this.canvas.addEventListener('mousemove', (event) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * this.state.width;
      const y = ((event.clientY - rect.top) / rect.height) * this.state.height;
      this.hovered = { row: Math.floor(y / this.state.tileSize), col: Math.floor(x / this.state.tileSize) };
    });
  }

  private update(dt: number) {
    this.state.gameTime += dt;
    this.revealAroundPlayer();
    this.tickQueue(dt);
    this.tickVillagers(dt);
    this.tickEnemies(dt);
    this.tickPlayer(dt);
    if (this.state.scene === 'cave') this.state.enemies.forEach((enemy) => { if (enemy.hp <= 0) return; enemy.aggro = clamp(enemy.aggro + dt, 0, 999); });
  }

  private tickQueue(dt: number) {
    const nextQueue: QueueAction[] = [];
    for (const action of this.state.queuedActions) {
      const remaining = action.remaining - dt;
      if (remaining > 0) {
        nextQueue.push({ ...action, remaining });
        continue;
      }
      this.resolveAction(action);
    }
    this.state.queuedActions = nextQueue;
  }

  private tickVillagers(dt: number) {
    const hall = this.state.buildings.find((b) => b.type === 'main-hall');
    this.state.villagers.forEach((villager, index) => {
      const cycle = tasks[(Math.floor(this.state.gameTime / 8) + index) % tasks.length];
      villager.task = cycle;
      const destination = cycle === 'explore'
        ? { x: 100 + index * 120, y: 80 + (index % 2) * 180 }
        : hall ? gridToWorld({ row: hall.row, col: hall.col }) : { x: villager.x, y: villager.y };
      const dx = destination.x - villager.x;
      const dy = destination.y - villager.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 2) {
        villager.x += (dx / dist) * dt * 18;
        villager.y += (dy / dist) * dt * 18;
      } else if (cycle === 'gather') {
        this.state.inventory.wood += dt * 0.7;
      } else if (cycle === 'hunt') {
        this.state.inventory.food += dt * 0.4;
      } else if (cycle === 'build') {
        this.state.inventory.stone += dt * 0.3;
      }
      if (cycle === 'explore') this.revealAround({ x: villager.x, y: villager.y }, 2);
    });
  }

  private tickEnemies(dt: number) {
    const playerPos = this.playerPos();
    this.state.enemies.forEach((enemy) => {
      if (enemy.hp <= 0) return;
      const dist = distance(enemy, playerPos);
      if (dist < enemy.aggro + 140) {
        const dx = playerPos.x - enemy.x;
        const dy = playerPos.y - enemy.y;
        const len = Math.hypot(dx, dy) || 1;
        enemy.x += (dx / len) * enemy.speed * 35 * dt;
        enemy.y += (dy / len) * enemy.speed * 35 * dt;
        if (dist < 22) this.state.player.hp = Math.max(0, this.state.player.hp - Math.max(0, enemy.attack - (this.state.player.defense + this.defenseBoost)) * dt * 0.8);
      }
    });
    const before = this.state.enemies.length;
    this.state.enemies = this.state.enemies.filter((enemy) => enemy.hp > 0);
    if (this.state.enemies.length !== before) {
      const defeated = before - this.state.enemies.length;
      this.state.player.xp += defeated * 8;
      this.state.inventory.loot += defeated;
      this.state.messages.unshift(`${defeated} monster${defeated > 1 ? 's' : ''} defeated.`);
    }
    if (this.state.enemies.length === 0 && this.state.scene === 'overworld') {
      this.state.enemies.push(...this.spawnCaveWave());
      this.state.messages.unshift('A new wave emerges from the shadows.');
    }
  }

  private tickPlayer(dt: number) {
    const regen = this.state.scene === 'cave' ? 0.15 : 0.08;
    this.state.player.mp = clamp(this.state.player.mp + regen * dt, 0, this.state.player.maxMp);
    this.defenseBoost = Math.max(0, this.defenseBoost - dt * 0.9);
    if (this.state.player.hp < this.state.player.maxHp && this.state.inventory.food > 0 && this.state.gameTime % 6 < 0.2) {
      this.state.player.hp = clamp(this.state.player.hp + 0.1, 0, this.state.player.maxHp);
      this.state.inventory.food -= 0.02;
    }
    while (this.state.player.xp >= this.xpToNextLevel()) this.levelUp();
    this.collectNearbyChests();
    if (this.state.player.hp <= 0) {
      this.state.player.hp = this.state.player.maxHp;
      this.state.player.mp = this.state.player.maxMp;
      this.state.messages.unshift('The hero has fallen, then rallies again at the main hall.');
    }
  }

  private levelUp() {
    this.state.player.xp -= this.xpToNextLevel();
    this.state.player.level += 1;
    this.state.player.maxHp += 6;
    this.state.player.maxMp += 4;
    this.state.player.attack += 1;
    this.state.player.defense += 1;
    this.state.player.magic += 1;
    this.state.player.hp = this.state.player.maxHp;
    this.state.player.mp = this.state.player.maxMp;
    const nextSpell = SPELLS.find((spell) => spell.level <= this.state.player.level && !this.state.player.spellbook.includes(spell.id));
    if (nextSpell) this.state.player.spellbook.push(nextSpell.id);
    this.state.messages.unshift(`Level up! Reached level ${this.state.player.level}.`);
  }

  private xpToNextLevel() {
    return this.state.player.level * 20;
  }

  private playerPos() {
    const hall = this.state.buildings.find((b) => b.type === 'main-hall');
    return hall ? gridToWorld({ row: hall.row, col: hall.col }) : { x: 320, y: 280 };
  }

  private revealAroundPlayer() {
    this.revealAround(this.playerPos(), 5);
  }

  private revealAround(point: { x: number; y: number }, radius: number) {
    const cx = Math.floor(point.x / this.state.tileSize);
    const cy = Math.floor(point.y / this.state.tileSize);
    for (let row = cy - radius; row <= cy + radius; row += 1) {
      for (let col = cx - radius; col <= cx + radius; col += 1) {
        if (row < 0 || col < 0 || row >= this.state.mapRows || col >= this.state.mapCols) continue;
        this.state.visible[row][col] = true;
        this.state.explored[row][col] = true;
      }
    }
  }

  private spawnCaveWave() {
    const wave = ['slime', 'goblin', 'wolf', 'witch', 'troll'] as const;
    return wave.slice(0, 3).map((type, index) => {
      const stats = MONSTERS[type];
      return { id: uid('enemy'), type, x: 760 + index * 58, y: 300 + index * 42, hp: stats.hp, maxHp: stats.hp, attack: stats.attack, speed: stats.speed, aggro: stats.aggro };
    });
  }

  private draw() {
    const { ctx, state } = this;
    ctx.clearRect(0, 0, state.width, state.height);
    this.drawBackground();
    this.drawGrid();
    this.drawResources();
    this.drawBuildings();
    this.drawVillagers();
    this.drawEnemies();
    this.drawChests();
    this.drawFog();
    this.drawSelection();
    this.drawHUD();
  }

  private drawBackground() {
    const { ctx, state } = this;
    const gradient = ctx.createLinearGradient(0, 0, 0, state.height);
    gradient.addColorStop(0, state.scene === 'cave' ? '#17111f' : '#15324d');
    gradient.addColorStop(1, state.scene === 'cave' ? '#09060d' : '#0a1724');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, state.width, state.height);
    if (state.scene === 'cave') {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, 0, state.width, state.height);
    }
  }

  private drawGrid() {
    const { ctx, state } = this;
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    for (let row = 0; row < state.mapRows; row += 1) {
      for (let col = 0; col < state.mapCols; col += 1) {
        const x = col * state.tileSize;
        const y = row * state.tileSize;
        if (row % 2 === 0) ctx.fillStyle = row % 4 === 0 ? 'rgba(80,128,80,0.08)' : 'rgba(255,255,255,0.02)';
        else ctx.fillStyle = 'rgba(255,255,255,0.01)';
        ctx.fillRect(x, y, state.tileSize, state.tileSize);
        ctx.strokeRect(x, y, state.tileSize, state.tileSize);
      }
    }
  }

  private drawBuildings() {
    const { ctx, state } = this;
    state.buildings.forEach((building) => {
      const def = BUILDINGS[building.type];
      const x = building.col * state.tileSize;
      const y = building.row * state.tileSize;
      ctx.fillStyle = typeColors[building.type];
      ctx.fillRect(x + 2, y + 2, state.tileSize - 4, state.tileSize - 4);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(x + 8, y + 8, state.tileSize - 16, state.tileSize - 16);
      ctx.fillStyle = '#fff';
      ctx.font = '10px sans-serif';
      ctx.fillText(def.name.slice(0, 2), x + 8, y + 19);
    });
  }

  private drawVillagers() {
    const { ctx } = this;
    this.state.villagers.forEach((villager) => {
      ctx.fillStyle = villager.task === 'gather' ? '#c1ff7e' : villager.task === 'hunt' ? '#ffde7e' : '#9ed3ff';
      ctx.beginPath();
      ctx.arc(villager.x, villager.y, 7, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  private drawEnemies() {
    const { ctx } = this;
    this.state.enemies.forEach((enemy) => {
      const def = MONSTERS[enemy.type];
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(enemy.x - 14, enemy.y - 18, 28, 4);
      ctx.fillStyle = '#ff6d6d';
      ctx.fillRect(enemy.x - 14, enemy.y - 18, 28 * (enemy.hp / enemy.maxHp), 4);
    });
  }

  private drawResources() {
    const { ctx } = this;
    this.state.resources.forEach((resource) => {
      ctx.fillStyle = resource.kind === 'wood' ? '#9c6b45' : resource.kind === 'food' ? '#8bd96d' : '#a8b4c4';
      ctx.beginPath();
      ctx.rect(resource.x - 7, resource.y - 7, 14, 14);
      ctx.fill();
    });
  }

  private drawChests() {
    const { ctx, state } = this;
    state.chests.forEach((chest) => {
      ctx.fillStyle = '#d6a64d';
      ctx.fillRect(chest.x - 8, chest.y - 5, 16, 10);
      ctx.fillStyle = '#7b5212';
      ctx.fillRect(chest.x - 8, chest.y - 6, 16, 3);
    });
  }

  private drawFog() {
    const { ctx, state } = this;
    for (let row = 0; row < state.mapRows; row += 1) {
      for (let col = 0; col < state.mapCols; col += 1) {
        if (state.visible[row][col]) continue;
        ctx.fillStyle = state.explored[row][col] ? 'rgba(0,0,0,0.52)' : 'rgba(0,0,0,0.88)';
        ctx.fillRect(col * state.tileSize, row * state.tileSize, state.tileSize, state.tileSize);
      }
    }
  }

  private drawSelection() {
    const { ctx, state } = this;
    if (!this.hovered) return;
    ctx.strokeStyle = state.selectedBuilding ? '#75d3ff' : 'rgba(255,255,255,0.14)';
    ctx.strokeRect(this.hovered.col * state.tileSize + 1, this.hovered.row * state.tileSize + 1, state.tileSize - 2, state.tileSize - 2);
  }

  private resolveAction(action: QueueAction) {
    const target = this.state.enemies[0];
    if (action.type === 'attack' && target) {
      target.hp -= action.power + this.state.player.attack;
      if (target.hp <= 0) this.state.player.xp += 10;
      this.state.messages.unshift(`Attack dealt ${Math.round(action.power + this.state.player.attack)} damage.`);
    } else if (action.type === 'spell') {
      const spell = SPELLS.find((entry) => entry.id === action.spellId);
      if (spell && target) {
        target.hp -= spell.power + this.state.player.magic;
        if (target.hp <= 0) this.state.player.xp += 12;
        this.state.messages.unshift(`${spell.name} hits for ${spell.power + this.state.player.magic}.`);
      }
    } else if (action.type === 'defend') {
      this.defenseBoost = Math.max(this.defenseBoost, 4);
      this.state.messages.unshift('Defense raised.');
    }
  }

  private collectNearbyChests() {
    const pos = this.playerPos();
    this.state.chests = this.state.chests.filter((chest) => {
      if (distance(chest, pos) > 72) return true;
      this.state.inventory.loot += 1;
      this.state.inventory.potions += 1;
      this.state.messages.unshift('A hidden chest was opened.');
      return false;
    });
  }

  private drawHUD() {
    const { ctx, state } = this;
    const summary = `L${state.player.level} HP ${Math.ceil(state.player.hp)}/${state.player.maxHp} MP ${Math.ceil(state.player.mp)}/${state.player.maxMp}`;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(10, 10, 360, 108);
    ctx.fillStyle = '#edf3ff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('Fantasy Empire', 20, 34);
    ctx.font = '14px sans-serif';
    ctx.fillText(summary, 20, 58);
    ctx.fillText(`Wood ${Math.floor(state.inventory.wood)}  Food ${Math.floor(state.inventory.food)}  Stone ${Math.floor(state.inventory.stone)}  Potions ${state.inventory.potions}`, 20, 80);
    ctx.fillText(`Scene: ${state.scene.toUpperCase()}  Buildings: ${state.buildings.length}  Villagers: ${state.villagers.length}`, 20, 100);
  }
}
