









// ---------------------------------------------
// Hey! Welcome to the backend code of Syncify!
// Unless you're an advanced user, you probably shouldn't mess with anything below.
// If you do though, consider forking the repo and contributing!
// ---------------------------------------------










import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { existsSync, writeFileSync, readFileSync } from "fs";
import utils from "./src/utils/utils.js";
import spotifyapi from "./src/utils/spotifyapi.js";
import colors from "./src/utils/colors.js";
import { URLSearchParams } from "url";

utils.EnsureConfigExists();
utils.LoadAndValidateConfig(dotenv);

const app = express();

const port = process.env.PORT || 8888;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const verbosity = process.env.VERBOSITY;

// Var for if polling has started for the currently playing song
var intervalStarted = false;

// Var for if the current song has been set manually via the setsong API endpoint
var manualSong = false;

// Var for if the play status has been set manually via the setplaystatus API endpoint
var manualPlayStatus = false;

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
    `${colors.red}Failed to start Syncify. The build files have not been created. Please open Build.bat or run "npm run build" before starting Syncify.`,
    colors.reset
  );
  process.exit(1);
}

var lastSong = currentSong;

// Spotify API vars
const REDIRECT_URI = `http://127.0.0.1:${port}/callback`;
const SCOPE = "user-read-currently-playing";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function StartInterval() {
  if (!intervalStarted) {
    setInterval(() => {
      spotifyapi
        .GetCurrentlyPlaying(path.resolve(__dirname, "./tokens.json"))
        .then((data) => {
          // If a manual song or manual play status is set and there is not a new Spotify song
          if ((manualSong == true || manualPlayStatus == true) && data.song == lastSong.song && data.artists[0].name == lastSong.artists[0].name) {
            // Set the playing status if it doesn't match the last song's playing status
            // i.e. Replace the playing status after the manual play status has been set at least once
            if (data.playing != lastSong.playing) {
              manualPlayStatus = false;
              currentSong.playing = data.playing;
            }
            return;
          }
          currentSong = data;
          if (currentSong.song != lastSong.song || currentSong.artists[0].name != lastSong.artists[0].name) { // If the current song does not match the last song...
            lastSong = currentSong;
            manualSong = false;
            manualPlayStatus = false;
            if (!currentSong.stopped && verbosity >= 3) {
              console.log(
                `${colors.green}New song:${colors.reset} ${currentSong.artists[0].name} - ${currentSong.song}`
              );
            }
          // If the song wasn't changed, but the last song doesn't match the playing status of the current
          } else if (lastSong.playing != currentSong.playing) {
            // This is purely for the setplaystatus endpoint.
            lastSong.playing = currentSong.playing;
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

  if (verbosity >= 3)
    console.log(
      `Sending user to Spotify login page: https://accounts.spotify.com/authorize?${params}`,
    );

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
        console.error(`${colors.red}Error writing tokens.json: `, err, reset);
      } else {
        if (verbosity >= 3) console.log(`${colors.green}tokens.json successfully saved.`, reset);
      }
    });

    // Start polling for currently playing song
    StartInterval();

    if (verbosity >= 3) console.log(`${colors.green}Successfully authenticated with Spotify!`, reset);
    res.send("Successfully authenticated! You can close this window.");
  } catch (error) {
    const errDetails = error.response?.data ?? error.message ?? "Unknown error";
    if (verbosity >= 1)
      console.error(`${colors.red}Error getting access token:`, errDetails, reset);
    res.send(
      "Error getting access token. Check Syncify console for more info."
    );
  }
});

// API endpoint to get the current playing song
app.get("/api/getsong", (req, res) => {
  res.setHeader("Connection", "close");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Content-Type", "application/json");

  try {
    res.json(currentSong);
  } catch (error) {
    console.error(`${colors.red}Server error:`, error, reset);
    res.status(500).json({ error: "Internal server error" });
  }
});

// For POST requests
app.use(express.json());

// API endpoint to set the currently playing song
app.post('/api/setsong', (req, res) => {
  try {
    const data = req.body;
    if (verbosity >= 3) console.log("Set song received:", data);

    // Check if request is valid
    if (!data?.hasOwnProperty("playing")) {
      if (verbosity >= 3) console.log("Set song was denied: No playing status");
      return res.status(422).json({ message: "Syncify: Set song denied", details: "No playing status" });
    } else if (!data?.hasOwnProperty("stopped")) {
      if (verbosity >= 3) console.log("Set song was denied: No stopped status");
      return res.status(422).json({ message: "Syncify: Set song denied", details: "No stopped status" });
    } else if (!data?.hasOwnProperty("song")) {
      if (verbosity >= 3) console.log("Set song was denied: No song title");
      return res.status(422).json({ message: "Syncify: Set song denied", details: "No song title" });
    } else if (!data?.hasOwnProperty("artists")) {
      if (verbosity >= 3) console.log("Set song was denied: No artists array");
      return res.status(422).json({ message: "Syncify: Set song denied", details: "No artists array" });
    } else if (!data?.hasOwnProperty("firstArtist")) {
      if (verbosity >= 3) console.log("Set song was denied: No first artist");
      return res.status(422).json({ message: "Syncify: Set song denied", details: "No first artist" });
    } else if (!data?.hasOwnProperty("coverArtUrl")) {
      if (verbosity >= 3) console.log("Set song was denied: No cover art URL");
      return res.status(422).json({ message: "Syncify: Set song denied", details: "No cover art URL" });
    }

    // Validate every artist has a name
    const missingArtistName = data.artists.some((artist) => !artist?.hasOwnProperty("name"));
    if (missingArtistName) {
      if (verbosity >= 3) console.log("Set song was denied: No artist name for one or more artists");
      return res.status(422).json({
        message: "Syncify: Set song denied",
        details: "No artist name for one or more artists",
      });
    }

    manualSong = true;
    currentSong = data;

    if (verbosity >= 3) {
      console.log(
        `${colors.green}New song (manual):${colors.reset} ${currentSong.artists[0].name} - ${currentSong.song} ${data.stopped ? "(stopped)" : data.playing ? "" : "(paused)"}`
      );
    }

    res.status(200).json({
      message: 'Syncify: Set song received successfully',
      receivedData: data
    });
  } catch (error) {
    if (verbosity >= 1) console.log(`${colors.red}ERROR:${colors.reset} Syncify received a set song command but failed to handle it.`);
    if (verbosity >= 3) console.log(error.message);

    res.status(400).json({
      error: 'Syncify: Failed to process set song request',
      details: 'Internal server error'
    });
  }
});

// API endpoint to modify the currently playing song's playing status
app.post("/api/setplaystatus", (req, res) => {
  try {
    const data = req.body;
    if (verbosity >= 3) console.log("Set play status received:", data);

    // Check if request is valid
    if (!data?.hasOwnProperty("playing")) {
      if (verbosity >= 3) console.log("Set play status was denied: No playing status");
      res.status(422).json({
        message: "Syncify: Set song denied",
        details: "No playing status",
      });
      return;
    } else if (!data?.hasOwnProperty("stopped")) {
      if (verbosity >= 3) console.log("Set play status was denied: No stopped status");
      res.status(422).json({
        message: "Syncify: Set song denied",
        details: "No stopped status",
      });
      return;
    }

    manualPlayStatus = true;

    currentSong.playing = data.playing;
    currentSong.stopped = data.stopped;

    if (verbosity >= 3) {
      console.log(
        `${colors.green}New manual play status:  Playing: ${data.playing}  Stopped: ${data.stopped}`
      );
    }

    res.status(200).json({
      message: "Syncify: Set play status received successfully",
      receivedData: data,
    });
  } catch (error) {
    if (verbosity >= 1)
      console.log(
        `${colors.red}ERROR:${colors.reset} Syncify received a set play status command but failed to handle it.`
      );
    if (verbosity >= 3) console.log(error.message);

    res.status(400).json({
      error: "Syncify: Failed to process set play status request",
      details: "Internal server error",
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
    if (verbosity >= 1) console.error(`${colors.red}Failed to read from tokens.json: `, err, reset);
    process.exit();
  }
}

const server = app.listen(port, async () => {
  // Load environment variables for the Spotify API script
  await spotifyapi.SetConfig(port, CLIENT_ID, CLIENT_SECRET, verbosity);

  try {
    const updates = utils.CheckGitRepoUpdates(__dirname);
    if (updates.hasUpdates && verbosity >= 2) {
        console.log(`${colors.yellow}Syncify Update available! Your repository is ${updates.commitsBehinds} commit(s) behind.`, reset);
        console.log('Latest change:', yellow, updates.latestCommitMessage, reset);
        console.log('Open update.bat or run "git pull" to update.');
    } else if (verbosity >= 2) {
      console.log(`${colors.green}Syncify is up-to-date!`, reset);
    }
  } catch (error) {
    if (verbosity >= 1)console.error('Failed to check for updates:', error.message);
  }

  if (verbosity >= 3) console.log(
    `\n----------\n${colors.yellow}WARN:${colors.reset} You are currently running Syncify with a verbosity level of ${verbosity}.\n` +
      "For content creators, it is recommended to keep your verbosity level (set in config.env) lower than 3, as levels of 3 or higher may output sensitive information to the console.\n" +
      "This functionality is intentional for debugging purposes.\n" +
      `${colors.yellow}If you are streaming, ${colors.red}PLEASE SET YOUR VERBOSITY TO LESS THAN 3!` +
      colors.reset +
      "\n----------\n"
  );

  if (verbosity >= 1) console.log(`${colors.green}Server running at http://localhost:${port}`, colors.reset);

  // Simple message for those with a verbosity level of 0.
  if (verbosity == 0) console.log(`${colors.green}Syncify is running.`, colors.reset);

  if (verbosity >= 3) console.log(`Theme to serve is ${colors.yellow}${process.env.THEME}${colors.reset}. If another theme is being served, remember to open build.bat or run "npm run build" in the root folder.`);

  if (!existsSync("tokens.json")) {
    console.log(
      `${colors.yellow}Please visit http://127.0.0.1:${port}/login to authenticate with Spotify`,
      colors.reset
    );
  } else {
    LoadToken();
  }
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `${colors.red}Failed to start Syncify: Port ${port} is already in use.`,
      `\nAnother program (or another instance of Syncify) is using this port.`,
      `\nEither close that program, or change PORT in config.env to a different value.`,
      colors.reset,
    );
  } else {
    console.error(
      `${colors.red}Failed to start Syncify:`,
      err.message,
      colors.reset,
    );
  }
  process.exit(1);
});