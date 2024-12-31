









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

const red = "\x1b[31m";
const green = "\x1b[32m";
const yellow = "\x1b[33m";
const reset = "\x1b[0m";

// Load config
if (!existsSync("./config.env")) {
  unlink("tokens.json", (err) => {
    // Delete tokens.json as they're likely not usable anymore.
    if (err) {
      console.error(`${red}Failed to delete tokens.json: `, err, reset);
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
      "VERBOSITY=2",
    ].join("\n");

    // Create a config file if one does not exist
    writeFileSync("./config.env", defaultConfig, { encoding: "utf8" });

    console.warn(
      `${yellow}Config.env was not found, and one has been created. Please populate the file with your configuration, then restart Syncify.`,
      reset
    );
  } catch (err) {
    console.error(
      `${red}Config.env was not found, and one could not be created.\n`,
      err,
      `\n${yellow}Tip:${reset} Please ensure Syncify is in a location with write permissions.`
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
        `${red}Error starting Syncify: Config.env could not be validated. `,
        validConf,
        reset
      );
      process.exit(1);
    }
  } catch (ex) {
    console.error(
      `${red}Error starting Syncify: Config.env could not be loaded. The file may be corrupted.`,
      "\nIn case you'd like to attempt to repair your config file, Syncify has left the file untouched.",
      "\nIf you cannot repair the file, please delete it and reobtain your API credentials at https://developer.spotify.com/dashboard.",
      "\n----\nTechnical mumbo jumbo:\n",
      ex.message,
      reset
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

// Var for if the current song has been set manually via the setsong API endpoint
var manualSong = false;

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
    `${red}Failed to start Syncify. The build files have not been created. Please open Build.bat or run "npm run build" before starting Syncify.`,
    reset
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
          if (manualSong == true && data.song == lastSong.song && data.artists[0].name == lastSong.artists[0].name) return; // Return if a manual song is set and there is not a new Spotify song
          currentSong = data;
          if (currentSong.song != lastSong.song && currentSong.artists[0].name != lastSong.artists[0].name) { // If the current song does not match the last song...
            lastSong = currentSong;
            manualSong = false;
            if (!currentSong.stopped && verbosity >= 3) {
              console.log(
                `${green}New song:${reset} ${currentSong.artists[0].name} - ${currentSong.song}`
              );
            }
          }
        });
    }, 1000);
    intervalStarted = true;
  }
}

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
        console.error(`${red}Error writing tokens.json: `, err, reset);
      } else {
        if (verbosity >= 3) console.log(`${green}tokens.json successfully saved.`, reset);
      }
    });

    // Start polling for currently playing song
    StartInterval();

    if (verbosity >= 3) console.log(`${green}Successfully authenticated with Spotify!`, reset);
    res.send("Successfully authenticated! You can close this window.");
  } catch (error) {
    if (verbosity >= 1)
      console.error(`${red}Error getting access token:`, error.response.data, reset);
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
    console.error(`${red}Server error:`, error, reset);
    res.status(500).json({ error: "Internal server error" });
  }
});

// API endpoint to set the currently playing song
app.use(express.json());
app.post('/api/setsong', (req, res) => {
  try {
    const data = JSON.parse(req.body.body);
    if (verbosity >= 3) console.log("Set song received:", data);

    // Check if request is valid
    if (!data?.hasOwnProperty("playing")) {
      res.status(422).json({
        message: "Syncify: Set song denied",
        details: "No playing status",
      });
      return;
    } else if (!data?.hasOwnProperty("stopped")) {
      res.status(422).json({
        message: "Syncify: Set song denied",
        details: "No stopped status",
      });
      return;
    } else if (!data?.hasOwnProperty("song")) {
      res.status(422).json({
        message: "Syncify: Set song denied",
        details: "No song title",
      });
      return;
    } else if (!data?.hasOwnProperty("artists")) {
      res.status(422).json({
        message: "Syncify: Set song denied",
        details: "No artists array",
      });
      return;
    } else if (!data?.hasOwnProperty("firstArtist")) {
      res.status(422).json({
        message: "Syncify: Set song denied",
        details: "No first artist",
      });
      return;
    } else if (!data?.hasOwnProperty("coverArtUrl")) {
      res.status(422).json({
        message: "Syncify: Set song denied",
        details: "No cover art URL",
      });
      return;
    }

    if (data?.hasOwnProperty("artists")) {
      data.artists.forEach((artist) => {
        if (!artist?.hasOwnProperty("name")) {
          res.status(422).json({
            message: "Syncify: Set song denied",
            details: "No artist name for one or more artists",
          });
          return;
        }
      });
    }

    manualSong = true;
    currentSong = data;

    if (!currentSong.stopped && verbosity >= 3) {
      console.log(
        `${green}New song (manual):${reset} ${currentSong.artists[0].name} - ${currentSong.song}`
      );
    }

    res.status(200).json({
      message: 'Syncify: Set song received successfully',
      receivedData: data
    });
  } catch (error) {
    if (verbosity >= 1) console.log(`${red}ERROR:${reset}Syncify received a set song command but failed to handle it.`);
    if (verbosity >= 3) console.log(error.message);

    res.status(400).json({
      error: 'Syncify: Failed to process set song request',
      details: 'Internal server error'
    });
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
    if (verbosity >= 1) console.error(`${red}Failed to read from tokens.json: `, err, reset);
    process.exit();
  }
}

app.listen(port, async () => {
  // Load environment variables for the Spotify API script
  await spotifyapi.SetConfig(port, CLIENT_ID, CLIENT_SECRET, verbosity);

  try {
    const updates = utils.CheckGitRepoUpdates(__dirname);
    if (updates.hasUpdates && verbosity >= 2) {
        console.log(`${yellow}Syncify Update available! Your repository is ${updates.commitsBehinds} commit(s) behind.`, reset);
        console.log('Latest change:', yellow, updates.latestCommitMessage, reset);
        console.log('Open update.bat or run "git pull" to update.');
    } else if (verbosity >= 2) {
      console.log(`${green}Syncify is up-to-date!`, reset);
    }
  } catch (error) {
    if (verbosity >= 1)console.error('Failed to check for updates:', error.message);
  }

  if (verbosity >= 3) console.log(
    `\n----------\n${yellow}WARN:${reset} You are currently running Syncify with a verbosity level of ${verbosity}.\n` +
      "For content creators, it is recommended to keep your verbosity level (set in config.env) lower than 3, as levels of 3 or higher may output sensitive information to the console.\n" +
      "This functionality is intentional for debugging purposes.\n" +
      `${yellow}If you are streaming, ${red}PLEASE SET YOUR VERBOSITY TO LESS THAN 3!` +
      reset +
      "\n----------\n"
  );

  if (verbosity >= 1) console.log(`${green}Server running at http://localhost:${port}`, reset);

  // Simple message for those with a verbosity level of 0.
  if (verbosity == 0) console.log(`${green}Syncify is running.`, reset);

  if (verbosity >= 3) console.log(`Theme to serve is ${yellow}${process.env.THEME}${reset}. If another theme is being served, remember to open build.bat or run "npm run build" in the root folder.`);

  if (!existsSync("tokens.json")) {
    console.log(
      `${yellow}Please visit http://localhost:${port}/login to authenticate with Spotify`,
      reset
    );
  } else {
    LoadToken();
  }
});