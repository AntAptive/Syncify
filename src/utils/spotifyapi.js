import axios from "axios";
import { readFileSync, writeFile } from "fs";
import { URLSearchParams } from "url";

var port;
var CLIENT_ID;
var CLIENT_SECRET;
var REDIRECT_URI;
var verbosity;

var noActiveDevicesWarning = 0;

async function SetConfig(_port, _clientId, _clientSecret, _verbosity) {
  port = _port;
  CLIENT_ID = _clientId;
  CLIENT_SECRET = _clientSecret;
  REDIRECT_URI = `http://localhost:${port}/callback`;
  verbosity = _verbosity;
  return true;
}

var nothingPlayingSong;

let npsInterval = setInterval(() => {
  if (port) {
    nothingPlayingSong = {
      paused: false,
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
        if (verbosity >= 1) console.error("Error writing tokens.json: ", err);
      } else {
        if (verbosity >= 3) console.log("tokens.json successfully saved.");
      }
    });

    if (verbosity >= 3) console.log("Token refreshed successfully");
  } catch (error) {
    if (verbosity >= 1) console.error("Error refreshing token:", error.response.data);
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
      noActiveDevicesWarning = 0; // Set this to 0 so the "No active devices" warning can print again

      const jsonData = {
        playing: response.data.is_playing,
        song: response.data.item.name,
        artists: response.data.item.artists,
        firstArtist: response.data.item.artists[0].name,
        coverArtUrl: response.data.item.album.images[0].url, // Largest size
      };
      return jsonData;
    } else if (response.status === 204) {
      if (noActiveDevicesWarning === 0) {
        noActiveDevicesWarning = 1;
        if (verbosity >= 2)
          console.warn(
            "No track is currently playing. No active devices were found."
          );
      }
      return nothingPlayingSong;
    } else {
      noActiveDevicesWarning = 0; // Set this to 0 so the "No active devices" warning can print again

      if (verbosity >= 1)
        console.error(
          "Failed to get currently playing song. Status code was ",
          response.status
        );
      return nothingPlayingSong;
    }
  } catch (ex) {
    if (verbosity >= 1)
      console.error("Error getting currently playing song: ", ex.message);
    return nothingPlayingSong;
  }
}

const spotifyapi = {
  GetTokens,
  EnsureValidToken,
  GetCurrentlyPlaying,
  SetConfig,
};

export default spotifyapi;