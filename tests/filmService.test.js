const filmService = require("../src/services/filmService");

beforeEach(() => filmService.reset());

test("a film receives an identifier and is retained", () => {
  const film = filmService.add({ title: "Inception", year: 2010, rating: 9 });
  expect(film).toMatchObject({ id: 1, title: "Inception", year: 2010, rating: 9 });
  expect(filmService.getAll()).toEqual([film]);
});
