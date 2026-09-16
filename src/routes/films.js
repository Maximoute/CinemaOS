const express = require("express");
const filmService = require("../services/filmService");

const router = express.Router();

router.get("/", (_request, response) => response.json(filmService.getAll()));

router.post("/", (request, response) => {
  const { title, year, rating } = request.body;
  if (!title || typeof title !== "string") {
    return response.status(400).json({ error: "title is required" });
  }
  return response.status(201).json(filmService.add({ title: title.trim(), year, rating }));
});

module.exports = router;
