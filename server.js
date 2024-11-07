









// ---------------------------------------------
// Hey! Welcome to the backend code of Syncify!
// Unless you're an advanced user, you probably shouldn't mess with anything below.
// If you do though, consider forking the repo and contributing!
// ---------------------------------------------










import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { existsSync, writeFileSync, readFileSync, writeFile, unlink } from "fs";
import utils from "./src/utils/utils.js";
import spotifyapi from "./src/utils/spotifyapi.js";
import { URLSearchParams } from "url";
import { createServer as createViteServer } from "vite";

// Load config
if (!existsSync("./config.env")) {
  unlink("tokens.json", (err) => {
    // Delete tokens.json as they're likely not usable anymore.
    if (err) {
      console.error("Failed to delete tokens.json: ", err);
      return;
    }
  });
  try {
    const defaultConfig = [
      "# Populate this file with your API credentials and preferences",
      "CLIENT_ID=your-client-id-here",
      "CLIENT_SECRET=your-client-secret-here",
      "PORT=8888",
      "THEME=Default",
      "VERBOSITY=1",
    ].join("\n");

    // Create a config file if one does not exist
    writeFileSync("./config.env", defaultConfig, { encoding: "utf8" });

    console.warn(
      "Config.env was not found, and one has been created. Please populate the file with your configuration, then restart Syncify."
    );
  } catch (err) {
    console.error(
      "Config.env was not found, and one could not be created.\n",
      err,
      "\nTip: Please ensure Syncify is in a location with write permissions."
    );
  }
  process.exit(1);
} else {
  try {
    // Load environment variables from config.env
    dotenv.config({ path: "./config.env" });

    // Validate to ensure config.env has a proper config
    const validConf = utils.ValidateConfig(process.env);
    if (validConf != "") {
      console.error(
        "Error starting Syncify: Config.env could not be validated. ",
        validConf
      );
      process.exit(1);
    }
  } catch (ex) {
    console.error(
      "Error starting Syncify: Config.env could not be loaded. The file may be corrupted.",
      "\nIn case you'd like to attempt to repair your config file, Syncify has left the file untouched.",
      "\nIf you cannot repair the file, please delete it and reobtain your API credentials at https://developer.spotify.com/dashboard.",
      "\n----\nTechnical mumbo jumbo:\n",
      ex.message
    );
    process.exit(1);
  }
}

const app = express();

const port = process.env.PORT || 8888;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const verbosity = process.env.VERBOSITY;

// Var for if polling has started for the currently playing song
var intervalStarted = false;

// Var that houses the info for the currently playing song
var currentSong = {
  playing: false,
  stopped: true,
  song: "",
  artists: [{ name: "" }],
  firstArtist: "",
  coverArtUrl: "",
};

if (!existsSync("./dist")) {
  console.error(
    'Failed to start Syncify. The Vite build has not been created. Please run "npm run build" before starting Syncify.'
  );
  process.exit(1);
}

var lastSong = currentSong;

// Spotify API vars
const REDIRECT_URI = `http://localhost:${port}/callback`;
const SCOPE = "user-read-currently-playing";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function StartInterval() {
  if (!intervalStarted) {
    setInterval(() => {
      spotifyapi
        .GetCurrentlyPlaying(path.resolve(__dirname, "./tokens.json"))
        .then((data) => {
          currentSong = data;
          if (currentSong.song != lastSong.song) {
            lastSong = currentSong;
            if (!currentSong.stopped && verbosity >= 3) {
              console.log(
                `New song: ${currentSong.artists[0].name} - ${currentSong.song}`
              );
            }
          }
        });
    }, 1000);
    intervalStarted = true;
  }
}

// Create Vite server in middleware mode
const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: "spa",
});

// Use vite's connect instance as middleware
//app.use(vite.middlewares);

// Serve static files from the Vite build output directory
app.use(express.static(path.join(__dirname, "dist")));

// Login to na Spotify
app.get("/login", (req, res) => {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    scope: SCOPE,
    redirect_uri: REDIRECT_URI,
  }).toString();

  res.redirect("https://accounts.spotify.com/authorize?" + params);
});

// Callback for Spotify login
app.get("/callback", async (req, res) => {
  const code = req.query.code || null;

  try {
    const tokenData = await spotifyapi.GetTokens(code);

    const jsonString = JSON.stringify(tokenData, null, 2); // Adding indentation for readability

    writeFile("tokens.json", jsonString, (err) => {
      if (err) {
        console.error("Error writing tokens.json: ", err);
      } else {
        if (verbosity >= 3) console.log("tokens.json successfully saved.");
      }
    });

    // Start polling for currently playing song
    StartInterval();

    res.send("Successfully authenticated! You can close this window.");
  } catch (error) {
    if (verbosity >= 1)
      console.error("Error getting access token:", error.response.data);
    res.send(
      "Error getting access token. Check Syncify console for more info."
    );
  }
});

// API endpoint to get configuration
app.get("/api/config", (req, res) => {
  const config = {
    CLIENT_ID: process.env.CLIENT_ID,
    CLIENT_SECRET: process.env.CLIENT_SECRET,
    PORT: process.env.PORT || 8888,
    THEME: process.env.THEME || "default",
    VERBOSITY: process.env.VERBOSITY,
  };
  res.json(config);
});

// API endpoint to get the current playing song
app.get("/api/getsong", (req, res) => {
  res.setHeader("Connection", "close");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Content-Type", "application/json");

  try {
    res.json(currentSong);
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// catch-all request for queries that don't match one above
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

async function LoadToken() {
  try {
    const data = JSON.parse(readFileSync("./tokens.json"));

    await spotifyapi.EnsureValidToken(
      data,
      path.resolve(__dirname, "./tokens.json")
    );

    // Start polling for currently playing song
    StartInterval();
  } catch (err) {
    if (verbosity >= 1) console.error("Failed to read from tokens.json: ", err);
    process.exit();
  }
}

app.listen(port, async () => {
  // Load environment variables for the Spotify API script
  await spotifyapi.SetConfig(port, CLIENT_ID, CLIENT_SECRET, verbosity);

  if (verbosity >= 1) console.log(`Server running at http://localhost:${port}`);
  if (!existsSync("tokens.json")) {
    console.log(
      `Please visit http://localhost:${port}/login to authenticate with Spotify`
    );
  } else {
    LoadToken();
  }
});