let entries = [];
let nextId = 1;

function getAll() {
  return entries;
}

function add({ filmId, notes }) {
  const entry = { id: nextId++, filmId, notes: notes || "" };
  entries.push(entry);
  return entry;
}

function reset() {
  entries = [];
  nextId = 1;
}

module.exports = { getAll, add, reset };
