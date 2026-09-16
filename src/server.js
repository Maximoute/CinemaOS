const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

// Load env variables from .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from public
app.use(express.static(path.join(__dirname, '..', 'public')));

// Simple demo catalog
const demoMovies = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'demo-movies.json')));

// API endpoint to get movies list, with optional search query
app.get('/api/movies', (req, res) => {
  const query = (req.query.q || '').toLowerCase();
  let movies = demoMovies;
  if (query) {
    movies = movies.filter(m => m.title.toLowerCase().includes(query));
  }
  res.json(movies);
});

// API endpoint to get movie detail by id
app.get('/api/movies/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const movie = demoMovies.find(m => m.id === id);
  if (!movie) {
    return res.status(404).json({ error: 'Movie not found' });
  }
  res.json(movie);
});

// Fallback: serve index.html for unknown routes (client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`CinemaOS server running on http://localhost:${PORT}`);
});
