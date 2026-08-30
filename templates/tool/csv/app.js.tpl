import { TOOL_SCAFFOLD_TODO } from './{{ID_HTML}}-core.js';

// {{SCAFFOLD_MARKER}}: DOM/event handlingだけを実装し、処理はcoreへ委譲してください。
document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('[data-tool-root]');
  if (root) root.textContent = TOOL_SCAFFOLD_TODO;
});
