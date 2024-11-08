![Syncify Banner](/readme/SyncifyBanner.png)
# Syncify
An open-source "Now Playing" widget that displays what you're currently playing on Spotify®

**NOTE:** Syncify currently only works with songs and not podcasts or audiobooks. Since this is not Syncify's main purpose, the developer does not intend to add such functionality, but happily invites contributors to!

*This is an independent project that uses the Spotify API but is not affiliated with, sponsored, or endorsed by Spotify. Spotify is a registered trademark of Spotify AB.*

### [Check out my other projects!](https://antaptive.com/projects)

## Themes
### Default<br>
Shows cover art and scrolls if text is too long<br>
![Default Theme](/readme/DefaultExample.png)<br>![Default Theme](/readme/DefaultExample2.png)<br>

### Minimal<br>
Scrolls if text is too long<br>
![Minimal Theme](/readme/MinimalExample.png)<br>![Minimal Theme](/readme/MinimalExample2.png)<br>

## Setup & Usage Guide
**Syncify requires [Node.js](https://nodejs.org/en) to run and [Git](https://git-scm.com/downloads) to build. Please download both before continuing.**

**Syncify requires 75 MB of disk space**.

### Initial Setup
**You will only have to do this once!**<br/>
**Stuck? Need a video instead? [Click here](https://www.youtube.com/watch?v=1YG_Po0OduQ) for a full walkthrough.**
1. Clone the repo: `git clone https://github.com/AntAptive/Syncify`
2. Enter the newly created folder and install all necessary packages: `cd Syncify && npm install`
3. Build the project: Open `build.bat` or run `npm run build`
    * **NOTE:** You will need to do this every time you make changes to your config or Syncify's code.
	* This will create your `config.env` file, which you can find in the root of the project directory.
4. Go to your [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and create a new app.
	1. Click **Create App**.
	2. Set **App name** & **App description** to whatever you want.
	3. Add the **Redirect URI**: `http://localhost:PORT/callback`, **PORT** being the port which you want Syncify to use on your machine. (The default port is 8888. You can change it in your `config.env` file)
	4. Agree to Spotify's Developer ToS and Design Guidelines.
	5. Click **Save**, then **Settings** at the top-right.
	6. Copy the **Client ID** and replace `your-client-id-here` in `config.env` with your client ID. Do the same with your client secret by clicking **View client secret**.
5. Populate `config.env` with your credentials and preferences, then build the project again: Open `build.bat` or run `npm run build`
    * The reason we're building again is to generate essential files for Syncify that rely on information in `config.env`.
	* **NOTE:** Ensure your `config.env` is configured properly or you will encounter issues.
6. Open `start.bat` to start Syncify.
7. Syncify will now say `Please visit http://localhost:PORT/login to authenticate with Spotify`. Visit the supplied link in a web browser to complete authentication with Spotify.
8. Visit `http://localhost:PORT` in a web browser or an OBS browser source to begin using Syncify.

Syncify can be closed by simply clicking the X button for its command prompt window.

### Using Syncify after setup
It's as easy as opening `start.bat`!<br/>
If your `tokens.json` file is corrupted or missing, you will have to re-authenticate with Spotify.<br/>
Syncify can be closed by simply clicking the X button for its command prompt window.

### Using Spotify in OBS Studio
**NOTE:** Syncify will only display if the server is running. Open `start.bat` in Syncify's files to start the server.
1. Create a new **Browser** source by clicking the Add (+) button at the bottom of your **Sources** dock. Call it whatever you want.
2. Set the **URL** to `localhost:PORT`, **PORT** being the port which Syncify is using on your machine (The default port is 8888. You can change it in your `config.env` file)
3. Click **OK**.

## Troubleshooting
If you're encountering issues, ensure your `config.env` file is configured properly and run `npm run build`.<br/>
For other issues, see our [wiki](https://github.com/AntAptive/Syncify/wiki/Troubleshooting) for troubleshooting steps.<br/>
If issues are persistent and you're unsure how to resolve them, contact me on Discord (**AntAptive**) or [open an issue](https://github.com/AntAptive/Syncify/issues/new).

## Configuration
All of Syncify's config is in `config.env`, which is generated after running `npm run build` for the first time.
* **CLIENT_ID** & **CLIENT_SECRET**: Your Spotify API credentials. See above in Setup & Usage Guide for how to create a Spotify app and figure out what to put here.
* **PORT**: The port on your machine that Syncify will run on. Must be a number between 1024 and 65535.
* **THEME**: What theme file (in [src/themes](/src/themes)) Syncify will serve.
    * **TIP:** While Syncify should handle case-insensitivity, ensure **THEME** matches the filename’s exact case to avoid IDE errors.
* **VERBOSITY**: The level of messages sent to the console. 
	* **0**: Critical messages only
    * **1** *(Default)*: Errors
	* **2**: Important info
	* **3**: Debug | **NOTE:** A verbosity level of 3 or higher may output sensitive information to the console and is intended for developers and advanced users only. **DO NOT** use level 3 if you are a streamer.