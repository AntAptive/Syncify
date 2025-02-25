import axios from "axios";
import { readFileSync, writeFile } from "fs";
import { URLSearchParams } from "url";

const red = "\x1b[31m";
const green = "\x1b[32m";
const yellow = "\x1b[33m";
const reset = "\x1b[0m";

var port;
var CLIENT_ID;
var CLIENT_SECRET;
var REDIRECT_URI;
var verbosity;

var noActiveDevicesWarning = false;

async function SetConfig(_port, _clientId, _clientSecret, _verbosity) {
  port = _port;
  CLIENT_ID = _clientId;
  CLIENT_SECRET = _clientSecret;
  REDIRECT_URI = `http://localhost:${port}/callback`;
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
        if (verbosity >= 1) console.error(`${red}Error writing tokens.json: `, err, reset);
      } else {
        if (verbosity >= 3) console.log(`${green}tokens.json successfully saved.`, reset);
      }
    });

    if (verbosity >= 3) console.log(`${green}Token refreshed successfully`, reset);
  } catch (error) {
    if (verbosity >= 1) console.error(`${red}Error refreshing token: `, error.response.data, reset);
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
  try {
    const data = JSON.parse(readFileSync(tokensFilePath));

    await EnsureValidToken(data, tokensFilePath);

    const response = await axios.get(
      "https://api.spotify.com/v1/me/player/currently-playing",
      {
        headers: {
          Authorization: `Bearer ${data.accessToken}`,
        },
      }
    );

    if (response.status === 200 && response.data.item) {
      noActiveDevicesWarning = false; // Set this to false so the "No active devices" warning can print again

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
        if (verbosity >= 2)
          console.warn(
            `${yellow}No track is currently playing. No active devices were found.`,
            reset
          );
      }
      return nothingPlayingSong;
    } else {
      noActiveDevicesWarning = false; // Set this to false so the "No active devices" warning can print again

      if (verbosity >= 1)
        console.error(
          `${red}Failed to get currently playing song. Status code was`,
          response.status,
          reset
        );
      return lastPolledSong ? lastPolledSong : nothingPlayingSong;
    }
  } catch (ex) {
    if (verbosity >= 1)
      console.error(`${red}Error getting currently playing song:`, ex.message, reset);
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