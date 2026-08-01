![Syncify Banner](/readme/SyncifyBanner.png)
# Syncify
An open-source "Now Playing" widget that displays what you're currently playing on Spotify®.

Syncify can also display information from any platform using [Syncify's API](https://github.com/AntAptive/Syncify/wiki/API#apisetsong).

**NOTE:** Syncify currently only works with songs, not podcasts or audiobooks. This isn't planned, but contributions are welcome!

*This is an independent project that uses the Spotify API but is not affiliated with, sponsored, or endorsed by Spotify. Spotify is a registered trademark of Spotify AB.*

### [Check out my other projects!](https://antaptive.com/projects)

### Consider supporting the creator!
[Patreon](https://www.patreon.com/c/antaptive) | [Kofi](https://ko-fi.com/antaptive) | [Merch Store](http://shop.antaptive.com)

## Themes
### Default
Shows cover art and scrolls if text is too long.<br>
![Default Theme](/readme/DefaultExample.png)![Default Theme](/readme/DefaultExample2.png)

### Minimal
Scrolls if text is too long.<br>
![Minimal Theme](/readme/MinimalExample.png)![Minimal Theme](/readme/MinimalExample2.png)

## Data Sources
Syncify can get "now playing" info in two ways, set via `SOURCE` in `config.env`:

| SOURCE | How it works | Requires |
|---|---|---|
| `spotify` *(default)* | Polls the Spotify Web API. Works across devices (phone, other computers, speakers). | A Spotify app + login |
| `smtc` | Reads directly from Windows' local "Now Playing" system (the same info shown in your volume flyout). No login needed. | Windows 10/11 desktop only, [.NET SDK](https://dotnet.microsoft.com/en-us/download), [Build Tools for Visual Studio](https://aka.ms/vs/stable/vs_BuildTools.exe) |

If you're not sure which to use: pick `spotify` if you want Syncify to reflect Spotify running on your phone or another device. Pick `smtc` if you only care about the Spotify desktop app on the same PC and want to skip the login/API setup entirely.

## Requirements
- [Node.js](https://nodejs.org/en): required
- [Git](https://git-scm.com/downloads): required to build
- [.NET SDK](https://dotnet.microsoft.com/en-us/download): **only required if using `SOURCE=smtc`**
- [Build Tools for Visual Studio](https://aka.ms/vs/stable/vs_BuildTools.exe): **only required if using `SOURCE=smtc`**. During install, check the **"Desktop development with C++"** workload.
- ~75 MB of disk space

## Setup Guide
**You'll only have to do this once. Need a video instead? [Click here](https://www.youtube.com/watch?v=1YG_Po0OduQ).**

1. Clone the repo and install packages:
   ```
   git clone https://github.com/AntAptive/Syncify && cd syncify && npm install
   ```
2. Run `Build.bat` once. This creates your `config.env` file in the root folder.
3. Open `config.env` and decide your `SOURCE`:
   - **Using `spotify`** (default): follow the [Spotify setup steps](#spotify-setup) below, then fill in `CLIENT_ID` and `CLIENT_SECRET`.
   - **Using `smtc`**: set `SOURCE=smtc`, make sure both the [.NET SDK](https://dotnet.microsoft.com/en-us/download) and [Build Tools for Visual Studio](https://aka.ms/vs/stable/vs_BuildTools.exe) (with the "Desktop development with C++" workload checked) are installed.
4. Set your `PORT` and `THEME` preferences in `config.env` (see [Configuration](#configuration)).
5. Run `Build.bat` again to apply your config.
   - `Start.bat` will also auto-build for you if it detects the project hasn't been built yet, so this step is optional if you're about to open `Start.bat` next anyway.
6. Open `Start.bat` to launch Syncify.
   - If using `SOURCE=spotify`, visit `http://127.0.0.1:PORT/login` when prompted to authenticate.
7. Visit `http://127.0.0.1:PORT` in a browser or OBS browser source to see it running.

Close Syncify anytime by clicking the X on its command prompt window.

### Spotify Setup
Only needed if `SOURCE=spotify`.
1. Go to your [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and click **Create App**.
2. Set any **App name** and **App description**.
3. Add the **Redirect URI**: `http://127.0.0.1:PORT/callback` (replace `PORT` with the port you plan to use - default is `8888`).
4. Agree to Spotify's Developer ToS and Design Guidelines, then click **Save**.
5. Open **Settings**, copy your **Client ID** and **Client Secret** into `config.env`.

## Using Syncify after setup
Just open `Start.bat`. If `tokens.json` is missing or corrupted (Spotify mode only), you'll need to re-authenticate.

## Using Syncify in OBS Studio
Syncify only displays while `Start.bat` is running.
1. Add a new **Browser** source in OBS.
2. Set the **URL** to `localhost:PORT` (default port is `8888`).
3. Click **OK**.

## Configuration
All config lives in `config.env`, generated the first time you run `Build.bat`.

| Key | Description |
|---|---|
| `SOURCE` | `spotify` or `smtc`. See [Data Sources](#data-sources). |
| `CLIENT_ID` / `CLIENT_SECRET` | Your Spotify API credentials. Only needed if `SOURCE=spotify`. |
| `PORT` | The port Syncify runs on. Must be a number between 1024–65535. |
| `THEME` | Which theme file (from [src/themes](/src/themes)) to serve. Must match the filename exactly (case-sensitive), without the extension. |
| `VERBOSITY` | Console log detail level: `0` critical only, `1` errors, `2` important info *(default)*, `3` debug. **Streamers: keep this below 3** - level 3+ can print sensitive info to the console. |

## Troubleshooting
Make sure `config.env` is configured correctly, then run `Build.bat` again. For further help, see the [wiki](https://github.com/AntAptive/Syncify/wiki/Troubleshooting), contact **AntAptive** on Discord, or [open an issue](https://github.com/AntAptive/Syncify/issues/new).

## Using Syncify with other platforms
Syncify can display data from platforms other than Spotify via the [setsong API endpoint](https://github.com/AntAptive/Syncify/wiki/API#apisetsong). This is intended for advanced users - feel free to [open an issue](https://github.com/AntAptive/Syncify/issues/new) to request native support for a specific platform.