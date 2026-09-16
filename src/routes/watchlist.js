const express = require("express");
const watchlistService = require("../services/watchlistService");

const router = express.Router();

router.get("/", (_request, response) => response.json(watchlistService.getAll()));

router.post("/", (request, response) => {
  const { filmId, notes } = request.body;
  if (!Number.isInteger(filmId) || filmId < 1) {
    return response.status(400).json({ error: "filmId must be a positive integer" });
  }
  return response.status(201).json(watchlistService.add({ filmId, notes }));
});

module.exports = router;
