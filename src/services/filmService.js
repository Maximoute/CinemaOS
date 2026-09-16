let films = [];
let nextId = 1;

function getAll() {
  return films;
}

function add({ title, year, rating }) {
  const film = { id: nextId++, title, year: year || null, rating: rating || null };
  films.push(film);
  return film;
}

function reset() {
  films = [];
  nextId = 1;
}

module.exports = { getAll, add, reset };
