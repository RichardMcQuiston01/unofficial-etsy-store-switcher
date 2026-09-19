import './style.css';

// Placeholder — the account list, empty state, and switch/rename/remove
// actions are built in Stage 4/5 (feature/popup-shell onward), not this
// scaffolding stage. This just proves the Vite + Tailwind pipeline works.
const app = document.querySelector<HTMLDivElement>('#app');
if (app) {
  app.innerHTML = `
    <div class="p-4">
      <h1 class="text-lg font-semibold">Store Switcheroo</h1>
      <p class="mt-1 text-sm text-slate-500">Account list coming in Stage 4.</p>
    </div>
  `;
}
