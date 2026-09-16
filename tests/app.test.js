const request = require("supertest");
const app = require("../src/app");
const filmService = require("../src/services/filmService");
const watchlistService = require("../src/services/watchlistService");

beforeEach(() => {
  filmService.reset();
  watchlistService.reset();
});

test("the health endpoint responds", async () => {
  const response = await request(app).get("/");
  expect(response.statusCode).toBe(200);
  expect(response.text).toBe("Cinema OS Backend");
});

test("films can be created and listed", async () => {
  const created = await request(app).post("/films").send({ title: "Matrix", year: 1999 });
  expect(created.statusCode).toBe(201);
  expect(created.body).toMatchObject({ id: 1, title: "Matrix", year: 1999 });

  const listed = await request(app).get("/films");
  expect(listed.body).toHaveLength(1);
});

test("watchlist entries require a valid film identifier", async () => {
  const invalid = await request(app).post("/watchlist").send({ filmId: 0 });
  expect(invalid.statusCode).toBe(400);

  const created = await request(app).post("/watchlist").send({ filmId: 1, notes: "Tonight" });
  expect(created.statusCode).toBe(201);
  expect(created.body).toMatchObject({ id: 1, filmId: 1, notes: "Tonight" });
});
