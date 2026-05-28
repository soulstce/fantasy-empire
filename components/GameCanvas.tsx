'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { BUILDINGS, SPELLS } from '@/lib/game/data';
import { FantasyEmpireEngine } from '@/lib/game/engine';
import type { BuildingType, GameState, SceneId, SpellId, VillagerTask } from '@/lib/game/types';

type LayoutMode = 'horizontal' | 'stacked';
type Mode = 'build' | 'explore' | 'combat';

const modeCopy: Record<Mode, { label: string; subtitle: string }> = {
  build: { label: 'Build', subtitle: 'Place structures and grow the field base.' },
  explore: { label: 'Explore', subtitle: 'Move the MC, uncover fog, and travel.' },
  combat: { label: 'Combat', subtitle: 'Queue actions, defend, and cast spells.' }
};

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<FantasyEmpireEngine | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [layout, setLayout] = useState<LayoutMode>('horizontal');
  const [mode, setMode] = useState<Mode>('explore');

  useEffect(() => {
    if (!canvasRef.current) return;
    engineRef.current = new FantasyEmpireEngine(canvasRef.current, setState);
    return () => engineRef.current?.destroy();
  }, []);

  const spells = useMemo(() => state?.player.spellbook.map((id) => SPELLS.find((spell) => spell.id === id)).filter(Boolean) ?? [], [state]);

  const selectBuilding = (type: BuildingType | null) => {
    engineRef.current?.setBuilding(type);
    if (type) setMode('build');
  };
  const selectTask = (task: VillagerTask) => engineRef.current?.setTask(task);
  const queue = (type: 'attack' | 'defend' | 'spell') => engineRef.current?.queueAction(type);
  const castSpell = (spellId: SpellId) => engineRef.current?.castSpell(spellId);
  const setScene = (scene: SceneId) => {
    engineRef.current?.setScene(scene);
    setMode('explore');
  };
  const setActiveMode = (nextMode: Mode) => {
    setMode(nextMode);
    if (nextMode !== 'build') engineRef.current?.setBuilding(null);
  };

  const actionBar = (() => {
    if (mode === 'build') {
      return (
        <>
          {(Object.keys(BUILDINGS) as BuildingType[]).map((type) => (
            <button key={type} className={`dock-btn ${state?.selectedBuilding === type ? 'active' : ''}`} onClick={() => selectBuilding(type)}>
              <span>{BUILDINGS[type].name}</span>
              <small>{BUILDINGS[type].description}</small>
            </button>
          ))}
          <button className={`dock-btn ${state?.selectedBuilding === null ? 'active' : ''}`} onClick={() => selectBuilding(null)}>
            <span>Cancel build</span>
            <small>Return to free movement</small>
          </button>
        </>
      );
    }

    if (mode === 'combat') {
      return (
        <>
          <button className="dock-btn" onClick={() => queue('attack')}>
            <span>Attack</span>
            <small>Queue a strike</small>
          </button>
          <button className="dock-btn" onClick={() => queue('defend')}>
            <span>Defend</span>
            <small>Raise armor briefly</small>
          </button>
          <button className="dock-btn" onClick={() => queue('spell')}>
            <span>Queue spell</span>
            <small>Fire the next combat cast</small>
          </button>
          <button className="dock-btn" onClick={() => engineRef.current?.consumePotion()}>
            <span>Potion</span>
            <small>Restore health</small>
          </button>
          {spells.map((spell) => (
            <button key={spell?.id} className="dock-btn" onClick={() => spell && castSpell(spell.id)}>
              <span>{spell?.name}</span>
              <small>{spell?.description}</small>
            </button>
          ))}
        </>
      );
    }

    return (
      <>
        <button className="dock-btn" onClick={() => setScene('overworld')}>
          <span>Overworld</span>
          <small>Field travel and base management</small>
        </button>
        <button className="dock-btn" onClick={() => setScene('cave')}>
          <span>Cave</span>
          <small>Denser threats and darker fog</small>
        </button>
        {(['gather', 'hunt', 'build', 'explore'] as const).map((task) => (
          <button key={task} className={`dock-btn ${state?.selectedTask === task ? 'active' : ''}`} onClick={() => selectTask(task)}>
            <span>{task}</span>
            <small>Assign villagers</small>
          </button>
        ))}
      </>
    );
  })();

  return (
    <div className={`game-shell ${layout === 'horizontal' ? 'layout-horizontal' : 'layout-stacked'}`}>
      <header className="top-bar glass">
        <div className="brand-block">
          <div className="brand-badge">FE</div>
          <div>
            <div className="eyebrow">Fantasy Empire</div>
            <div className="title-row">
              <h1>Field command interface</h1>
              <span className="status-pill">{modeCopy[mode].label}</span>
            </div>
            <p className="top-copy">{modeCopy[mode].subtitle}</p>
          </div>
        </div>
        <div className="top-stats">
          <span>Scene: {state?.scene ?? '—'}</span>
          <span>Villagers: {state?.villagers.length ?? 0}</span>
          <span>Enemies: {state?.enemies.length ?? 0}</span>
          <span>MC: {Math.ceil(state?.player.hp ?? 0)} HP</span>
        </div>
        <button className="layout-toggle" onClick={() => setLayout((current) => (current === 'horizontal' ? 'stacked' : 'horizontal'))}>
          {layout === 'horizontal' ? 'Horizontal layout' : 'Stacked layout'}
        </button>
      </header>

      <main className="workspace">
        <section className="canvas-stage glass">
          <div className="canvas-frame">
            <canvas ref={canvasRef} />
            <div className="canvas-overlay">
              <div className="overlay-chip">Tap to move the MC</div>
              <div className="overlay-chip muted">Fog clears only around the MC as they walk</div>
            </div>
          </div>
        </section>

        <aside className="info-rail glass">
          <section className="rail-card">
            <div className="rail-label">Field status</div>
            <div className="rail-value">Level {state?.player.level ?? 1}</div>
            <div className="rail-grid">
              <span>HP</span><strong>{Math.ceil(state?.player.hp ?? 0)} / {state?.player.maxHp ?? 0}</strong>
              <span>MP</span><strong>{Math.ceil(state?.player.mp ?? 0)} / {state?.player.maxMp ?? 0}</strong>
              <span>Wood</span><strong>{Math.floor(state?.inventory.wood ?? 0)}</strong>
              <span>Food</span><strong>{Math.floor(state?.inventory.food ?? 0)}</strong>
              <span>Stone</span><strong>{Math.floor(state?.inventory.stone ?? 0)}</strong>
              <span>Potions</span><strong>{state?.inventory.potions ?? 0}</strong>
            </div>
          </section>

          <section className="rail-card">
            <div className="rail-label">Live feed</div>
            <p className="message-text">{state?.messages[0] ?? 'Waiting for the kingdom to stir.'}</p>
          </section>

          <section className="rail-card compact">
            <div className="rail-label">Mode hint</div>
            <p className="message-text">Build opens structure placement, Explore handles travel and fog clearing, Combat handles attacks and spells.</p>
          </section>
        </aside>
      </main>

      <footer className="command-dock glass">
        <div className="mode-tabs">
          {(['build', 'explore', 'combat'] as Mode[]).map((nextMode) => (
            <button key={nextMode} className={`mode-btn ${mode === nextMode ? 'active' : ''}`} onClick={() => setActiveMode(nextMode)}>
              <span>{modeCopy[nextMode].label}</span>
            </button>
          ))}
        </div>
        <div className="action-strip">
          {actionBar}
        </div>
      </footer>
    </div>
  );
}
