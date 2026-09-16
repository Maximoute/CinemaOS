const express = require("express");
const filmRouter = require("./routes/films");
const watchlistRouter = require("./routes/watchlist");

const app = express();
app.use(express.json());
app.use("/films", filmRouter);
app.use("/watchlist", watchlistRouter);
app.get("/", (_request, response) => response.send("Cinema OS Backend"));

const port = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(port, () => console.log(`Cinema OS API listening on port ${port}`));
}

module.exports = app;
