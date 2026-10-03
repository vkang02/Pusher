import * as XLSX from 'xlsx';
import { uid } from './theme.js';

const NAME_KEYS = ['name', 'exercise', 'movement', 'lift'];
const SETS_KEYS = ['sets'];
const REPS_KEYS = ['reps', 'rep', 'repetitions'];
const WEIGHT_KEYS = ['weight', 'load', 'weight/load', 'weightload'];
const NOTES_KEYS = ['notes', 'note', 'comment', 'comments'];

function normalizeKey(k) {
  return String(k).trim().toLowerCase().replace(/\s+/g, '');
}

function findHeaderRowIndex(grid) {
  return grid.findIndex((row) =>
    row.some((cell) => NAME_KEYS.includes(normalizeKey(cell)))
  );
}

function titleAboveHeader(grid, headerRowIdx, fallback) {
  for (let i = 0; i < headerRowIdx; i++) {
    const cells = (grid[i] || []).map((c) => String(c).trim()).filter(Boolean);
    if (cells.length) return cells.join(' ');
  }
  return fallback;
}

// "6-8-10-12" (a pyramid — one rep count per set) is distinct from "10-12 each
// leg" or "20-30 sec each side" (a single range/instruction shared by every
// set) — only the former should split into separate per-set values.
function repsToSets(repsRaw, setCount) {
  const raw = String(repsRaw || '').trim();
  if (!raw) return Array.from({ length: setCount }, () => '');

  let parts = raw.split(/[,/x×]+/).map((s) => s.trim()).filter(Boolean);
  if (parts.length === 1 && /^\d+(-\d+)+$/.test(parts[0])) {
    parts = parts[0].split('-');
  }
  if (parts.length > 1) return parts.slice(0, 6);

  // "10-12-14 each side" with 3 sets is a pyramid with a shared suffix.
  const withSuffix = raw.match(/^(\d+(?:-\d+){2,})\s+(.+)$/);
  if (withSuffix) {
    const nums = withSuffix[1].split('-');
    if (nums.length === setCount) return nums.map((n) => `${n} ${withSuffix[2]}`);
  }
  return Array.from({ length: setCount }, () => raw);
}

export function parseWorkbookFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary' });
        const imported = [];
        wb.SheetNames.forEach((sheetName) => {
          const grid = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '', raw: false });
          const headerRowIdx = findHeaderRowIndex(grid);
          if (headerRowIdx === -1) return;

          const headers = grid[headerRowIdx].map((h) => normalizeKey(h));
          const dataRows = grid
            .slice(headerRowIdx + 1)
            .filter((row) => row.some((cell) => String(cell).trim() !== ''));

          const exercises = dataRows
            .map((row) => {
              const get = (...keys) => {
                for (let i = 0; i < headers.length; i++) {
                  if (keys.includes(headers[i])) return String(row[i] ?? '').trim();
                }
                return '';
              };
              const name = get(...NAME_KEYS);
              if (!name) return null;
              const setCount = Math.min(Math.max(parseInt(get(...SETS_KEYS), 10) || 3, 1), 6);
              const sets = repsToSets(get(...REPS_KEYS), setCount);
              const weight = get(...WEIGHT_KEYS);
              const notes = get(...NOTES_KEYS);
              return { id: uid('e'), name, sets, weight: weight && weight !== '-' ? weight : '', notes };
            })
            .filter(Boolean);

          if (exercises.length) {
            const title = titleAboveHeader(grid, headerRowIdx, sheetName);
            imported.push({ title, description: 'Imported from ' + file.name, exercises });
          }
        });
        resolve(imported);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsBinaryString(file);
  });
}
