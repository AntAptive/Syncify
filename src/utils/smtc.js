import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import colors from "./colors.js";

const execFileAsync = promisify(execFile);

const nothingPlaying = {
    playing: false,
    stopped: true,
    song: "",
    artists: [{ name: "" }],
    firstArtist: "",
    coverArtUrl: "",
};

let exePath;

function SetConfig(dirname) {
    exePath = path.resolve(dirname, "helper", "dist", "NowPlaying.exe");
}

async function GetCurrentlyPlaying() {
    try {
        const { stdout } = await execFileAsync(exePath, {timeout: 3000});
        const data = JSON.parse(stdout);

        if (!data || typeof data !== "object" || !("song" in data)) {
            const verbosity = process.env.VERBOSITY || 1;
            if (verbosity >= 1) {
                console.error(
                    `${colors.red}NowPlaying.exe returned unexpected JSON shape (missing "song" key):`,
                    stdout,
                    colors.reset,
                );
            }
            return nothingPlaying;
        }
        return data;
    } catch (err) {
        const verbosity = process.env.VERBOSITY || 1;
        if (verbosity >= 1) {
            console.error(
                `${colors.red}Error getting currently playing song from NowPlaying.exe:`,
                err.message,
                colors.reset,
            );
        }
        return nothingPlaying;
    }
}

const smtc = { SetConfig, GetCurrentlyPlaying };
export default smtc;