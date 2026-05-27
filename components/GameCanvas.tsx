'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { BUILDINGS, SPELLS } from '@/lib/game/data';
import { FantasyEmpireEngine } from '@/lib/game/engine';
import type { GameState, SceneId, VillagerTask, BuildingType } from '@/lib/game/types';

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<FantasyEmpireEngine | null>(null);
  const [state, setState] = useState<GameState | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    engineRef.current = new FantasyEmpireEngine(canvasRef.current, setState);
    return () => engineRef.current?.destroy();
  }, []);

  const spells = useMemo(() => state?.player.spellbook.map((id) => SPELLS.find((spell) => spell.id === id)).filter(Boolean) ?? [], [state]);

  const selectBuilding = (type: BuildingType | null) => engineRef.current?.setBuilding(type);
  const selectTask = (task: VillagerTask) => engineRef.current?.setTask(task);
  const queue = (type: 'attack' | 'defend' | 'spell') => engineRef.current?.queueAction(type);
  const castSpell = (spellId: string) => engineRef.current?.castSpell(spellId);
  const setScene = (scene: SceneId) => engineRef.current?.setScene(scene);

  return (
    <div className="grid">
      <section className="panel canvas-panel">
        <div className="canvas-wrap">
          <canvas ref={canvasRef} />
        </div>
      </section>

      <aside className="panel ui-panel">
        <div className="card">
          <h3>Command Center</h3>
          <p className="small">Grid-based base building, 2 villagers per house, fog of war, real-time queue combat, and a cave screen.</p>
        </div>

        <div className="card">
          <h3>Build</h3>
          <div className="controls">
            {(Object.keys(BUILDINGS) as BuildingType[]).map((type) => (
              <button key={type} className={`btn ${state?.selectedBuilding === type ? 'active' : ''}`} onClick={() => selectBuilding(type)}>
                {BUILDINGS[type].name}
              </button>
            ))}
            <button className={`btn ${state?.selectedBuilding === null ? 'active' : ''}`} onClick={() => selectBuilding(null)}>Cancel</button>
          </div>
          <p className="small">Click the map to place the selected building. Houses spawn 2 villagers each.</p>
        </div>

        <div className="card">
          <h3>Villagers</h3>
          <div className="controls">
            {(['gather', 'hunt', 'build', 'explore'] as const).map((task) => (
              <button key={task} className={`btn ${state?.selectedTask === task ? 'active' : ''}`} onClick={() => selectTask(task)}>
                {task}
              </button>
            ))}
          </div>
          <p className="small">Workers cycle between gathering, hunting, building, and exploring the fog.</p>
        </div>

        <div className="card">
          <h3>Combat Queue</h3>
          <div className="controls">
            <button className="btn" onClick={() => queue('attack')}>Attack</button>
            <button className="btn" onClick={() => queue('defend')}>Defend</button>
            <button className="btn" onClick={() => queue('spell')}>Queue Spell</button>
          </div>
          <p className="small">Combat is real-time; actions fire based on equipment and queued decisions rather than turns.</p>
        </div>

        <div className="card">
          <h3>Spellbook</h3>
          <div className="controls">
            {spells.map((spell) => (
              <button key={spell?.id} className="btn" onClick={() => castSpell(spell?.id ?? '')}>{spell?.name}</button>
            ))}
          </div>
          <p className="small">Spells unlock with D&amp;D-style leveling and consume mana.</p>
        </div>

        <div className="card">
          <h3>World Screen</h3>
          <div className="controls">
            <button className={`btn ${state?.scene === 'overworld' ? 'active' : ''}`} onClick={() => setScene('overworld')}>Overworld</button>
            <button className={`btn ${state?.scene === 'cave' ? 'active' : ''}`} onClick={() => setScene('cave')}>Cave</button>
          </div>
          <p className="small">Caves bring denser monster waves, hidden loot, and riskier exploration.</p>
        </div>

        <div className="card">
          <h3>State</h3>
          <div className="row"><span>Level</span><span className="stat">{state?.player.level ?? 1}</span></div>
          <div className="row"><span>HP</span><span className="stat">{Math.ceil(state?.player.hp ?? 0)} / {state?.player.maxHp ?? 0}</span></div>
          <div className="row"><span>MP</span><span className="stat">{Math.ceil(state?.player.mp ?? 0)} / {state?.player.maxMp ?? 0}</span></div>
          <div className="row"><span>Villagers</span><span className="stat">{state?.villagers.length ?? 0}</span></div>
          <div className="row"><span>Buildings</span><span className="stat">{state?.buildings.length ?? 0}</span></div>
          <div className="row"><span>Enemies</span><span className="warn">{state?.enemies.length ?? 0}</span></div>
          <div className="row"><span>Queued</span><span>{state?.queuedActions.length ?? 0}</span></div>
        </div>

        <div className="card">
          <h3>Messages</h3>
          <p className="small">{state?.messages[0] ?? 'Waiting for the kingdom to stir.'}</p>
        </div>

        <p className="footer-note">Initial scaffold includes the game loop, fog of war, village economy, cave mode, spell learning, and queued combat. Expand the data tables and mission systems next.</p>
      </aside>
    </div>
  );
}
