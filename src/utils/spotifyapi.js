import axios from "axios";
import { readFileSync, writeFile } from "fs";
import { URLSearchParams } from "url";
import colors from "./colors.js";

var port;
var CLIENT_ID;
var CLIENT_SECRET;
var REDIRECT_URI;
var verbosity;

var noActiveDevicesWarning = false;
var rateLimitWarned = false;

var stopPolling = false;
var pauseUntil = 0;

async function SetConfig(_port, _clientId, _clientSecret, _verbosity) {
  port = _port;
  CLIENT_ID = _clientId;
  CLIENT_SECRET = _clientSecret;
  REDIRECT_URI = `http://127.0.0.1:${port}/callback`;
  verbosity = _verbosity;
  return true;
}

var nothingPlayingSong;

var lastPolledSong;

let npsInterval = setInterval(() => {
  if (port) {
    nothingPlayingSong = {
      playing: false,
      stopped: true,
      song: "",
      artists: [{ name: "" }],
      firstArtist: "",
      coverArtUrl: "",
    };
    clearInterval(npsInterval);
  }
}, 100);

async function GetTokens(code) {
  const params = new URLSearchParams({
    code: code,
    redirect_uri: REDIRECT_URI,
    grant_type: "authorization_code",
  });

  const response = await axios({
    method: "post",
    url: "https://accounts.spotify.com/api/token",
    data: params,
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${CLIENT_ID}:${CLIENT_SECRET}`
      ).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  const jsonData = {
    accessToken: response.data.access_token,
    refreshToken: response.data.refresh_token,
    tokenExpirationTime: Date.now() + response.data.expires_in * 1000,
  };

  return jsonData;
}

async function RefreshAccessToken(refreshToken, tokensFilePath) {
  if (stopPolling) return;
  try {
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    const response = await axios({
      method: "post",
      url: "https://accounts.spotify.com/api/token",
      data: params.toString(),
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${CLIENT_ID}:${CLIENT_SECRET}`
        ).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const jsonData = {
      accessToken: response.data.access_token,
      refreshToken: refreshToken,
      tokenExpirationTime: Date.now() + response.data.expires_in * 1000,
    };

    const jsonString = JSON.stringify(jsonData, null, 2); // 2: Adding indentation for readability

    writeFile(tokensFilePath, jsonString, (err) => {
      if (err) {
        if (verbosity >= 1) console.error(`${colors.red}Error writing tokens.json: `, err, colors.reset);
      } else {
        if (verbosity >= 3) console.log(`${colors.green}tokens.json successfully saved.`, colors.reset);
      }
    });

    if (verbosity >= 3) console.log(`${colors.green}Token refreshed successfully`, colors.reset);
  } catch (error) {
    // Check if returned json error is "invalid_grant" (refresh token expired or revoked)
    if (
      error.response &&
      error.response.data &&
      error.response.data.error === "invalid_grant"
    ) {
      console.clear();
      console.error(
        `${colors.red}
 _              
( \`.            
 '. \\    .--.  
   \\ \\  /    \\ 
    \\ \\ \\    / 
     ' . '--'  
     | | .--.  
     ' '/    \\ 
    / / \\    / 
   / /   '--'  
 .' /           
(_.'   
\n----------------------------------------------\n
/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\\n
FATAL ERROR: Refresh token is invalid or expired.
(Syncify can't talk with Spotify)
Please delete tokens.json and re-open Syncify to
re-authenticate with Spotify.\n
/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\\n
----------------------------------------------`,
        colors.reset,
      );
      stopPolling = true; // Stop polling for currently playing song since the refresh token is expired.
      return;
    }

    const errDetails = error.response?.data ?? error.message ?? "Unknown error";
    if (verbosity >= 1) console.error(`${colors.red}Error refreshing token: `, errDetails, colors.reset);
  }
}

async function EnsureValidToken(data, tokensFilePath) {
  if (
    data.tokenExpirationTime &&
    Date.now() >= data.tokenExpirationTime - 60000
  ) {
    await RefreshAccessToken(data.refreshToken, tokensFilePath);
  }
}

async function GetCurrentlyPlaying(tokensFilePath) {
  // If stopPolling is true, or if the pauseUntil time has not yet passed, return the last polled song or nothingPlayingSong
  if (stopPolling
    || Date.now() < pauseUntil)
    return lastPolledSong ? lastPolledSong : nothingPlayingSong;
  try {
    const data = JSON.parse(readFileSync(tokensFilePath));

    await EnsureValidToken(data, tokensFilePath);

    const response = await axios.get(
      "https://api.spotify.com/v1/me/player/currently-playing",
      {
        headers: {
          Authorization: `Bearer ${data.accessToken}`,
        },
      },
    );

    if (response.status === 200 && response.data.item) {
      noActiveDevicesWarning = false; // Set this to false so the "No active devices" warning can print again
      rateLimitWarned = false; // Set this to false so the "Rate limited" warning can print again

      const jsonData = {
        playing: response.data.is_playing,
        stopped: false,
        song: response.data.item.name,
        artists: response.data.item.artists,
        firstArtist: response.data.item.artists[0].name,
        coverArtUrl: response.data.item.album.images[0].url, // Largest size
      };
      lastPolledSong = jsonData;
      return jsonData;
    } else if (response.status === 204) {
      if (noActiveDevicesWarning == false) {
        noActiveDevicesWarning = true;
        rateLimitWarned = false;
        if (verbosity >= 2)
          console.warn(
            `${colors.yellow}No track is currently playing. No active devices were found.`,
            colors.reset,
          );
      }
      return nothingPlayingSong;
    } else {
      noActiveDevicesWarning = false;
      rateLimitWarned = false;

      if (verbosity >= 1)
        console.error(
          `${colors.red}Failed to get currently playing song. Status code was`,
          response.status,
          colors.reset,
        );
      return lastPolledSong ? lastPolledSong : nothingPlayingSong;
    }
  } catch (ex) {
    if (ex.response?.status === 429) {
      // retry-after is an integer number of seconds
      const retryAfter = parseInt(ex.response.headers["retry-after"], 10) || 5; // Default to 5 seconds if header is missing

      if (!rateLimitWarned) {
        rateLimitWarned = true;
        if (verbosity >= 2)
          console.warn(
            `${colors.yellow}Rate limited by Spotify API. Retrying after ${retryAfter} seconds.`,
            colors.reset,
          );
      } else if (verbosity >= 3) {
        console.warn(
          `${colors.yellow}Rate limited by Spotify API. Retrying after ${retryAfter} seconds.`,
          colors.reset,
        );
      }

      pauseUntil = Date.now() + retryAfter * 1000;
    }
    else if (verbosity >= 1)
      console.error(`${colors.red}Error getting currently playing song:`, ex.message, colors.reset);

    return lastPolledSong ? lastPolledSong : nothingPlayingSong;
  }
}

const spotifyapi = {
  GetTokens,
  EnsureValidToken,
  GetCurrentlyPlaying,
  SetConfig,
};

export default spotifyapi;