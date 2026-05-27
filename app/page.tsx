import GameCanvas from '@/components/GameCanvas';

export default function Page() {
  return (
    <main className="shell">
      <header className="hero">
        <div className="brand">
          <div className="brand-badge">⚔</div>
          <div>
            <div className="eyebrow">Fantasy Empire</div>
            <h1>Fantasy Age of Empires style RTS + RPG</h1>
          </div>
        </div>
        <p className="lede">
          A top-down kingdom prototype with grid-based building, villagers, fog of war, cave exploration, monster encounters, hidden loot, and real-time equipment-driven combat with queued attacks, spells, and defense.
        </p>
      </header>
      <GameCanvas />
    </main>
  );
}
