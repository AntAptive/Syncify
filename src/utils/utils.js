import { execSync } from "child_process";
import path from "path";
import { existsSync, writeFileSync, unlink } from "fs";
import colors from "./colors.js";

// Ensures config.env exists. If it doesn't, creates a default one,
// clears out stale tokens, and exits the process.
function EnsureConfigExists() {
  if (existsSync("./config.env")) return;

  unlink("tokens.json", (err) => {
    // Delete tokens.json as they're likely not usable anymore.
    if (err) {
      console.error(`${colors.red}Failed to delete tokens.json: `, err, reset);
    }
  });

  try {
    const defaultConfig = [
      "# Populate this file with your API credentials and preferences",
      "# SOURCE can be spotify or smtc (Windows only).",
      "SOURCE=spotify",
      "CLIENT_ID=your-client-id-here",
      "CLIENT_SECRET=your-client-secret-here",
      "PORT=8888",
      "THEME=Default",
      "VERBOSITY=2",
    ].join("\n");

    writeFileSync("./config.env", defaultConfig, { encoding: "utf8" });

    console.warn(
      `${colors.yellow}Config.env was not found, and one has been created. Please populate the file with your configuration, then restart Syncify.`,
      colors.reset,
    );
  } catch (err) {
    console.error(
      `${colors.red}Config.env was not found, and one could not be created.\n`,
      err,
      `\n${colors.yellow}Tip:${colors.reset} Please ensure Syncify is in a location with write permissions.`,
    );
  }
  process.exit(1);
}

// Loads config.env via dotenv and validates it. Exits the process on failure.
function LoadAndValidateConfig(dotenv) {
  try {
    dotenv.config({ path: "./config.env" });

    const validConf = ValidateConfig(process.env);
    if (validConf != "") {
      console.error(
        `${colors.red}Error starting Syncify: Config.env could not be validated. `,
        validConf,
        colors.reset,
      );
      process.exit(1);
    }
  } catch (ex) {
    console.error(
      `${colors.red}Error starting Syncify: Config.env could not be loaded. The file may be corrupted.`,
      "\nIn case you'd like to attempt to repair your config file, Syncify has left the file untouched.",
      "\nIf you cannot repair the file, please delete it and reobtain your API credentials at https://developer.spotify.com/dashboard.",
      "\n----\nTechnical mumbo jumbo:\n",
      ex.message,
      colors.reset,
    );
    process.exit(1);
  }
}

function ValidateConfig(env) {
  const { CLIENT_ID, CLIENT_SECRET, PORT, THEME, VERBOSITY, SOURCE } = env;

  let msg = "";

  const source = (SOURCE || "spotify").toLowerCase();
  if (source !== "spotify" && source !== "smtc" && source !== "api") {
    msg += "\nSOURCE must be either 'spotify', 'smtc', or 'api'.";
  }

  if (source === "spotify") {
    if (!CLIENT_ID || CLIENT_ID == "your-client-id-here") {
      msg += "\nCLIENT_ID must be set.";
    }
    if (!CLIENT_SECRET || CLIENT_SECRET == "your-client-secret-here") {
      msg += "\nCLIENT_SECRET must be set.";
    }
  }

  const portNumber = Number(PORT);
  if (!PORT || isNaN(portNumber) || portNumber < 1024 || portNumber > 65535) {
    msg += "\nPORT must be a number between 1024 and 65535.";
  }

  if (
    typeof THEME !== "string" || // Is not a string
    !THEME || // Doesn't exist
    THEME.length > 255 || // Greater than 255 characters
    /[<>:"\/\\|?*\x00-\x1F]/.test(THEME) || // Has illegal characters
    THEME.trim() !== THEME || // Starts or ends with spaces
    !THEME.trim() || // Is whitespace
    THEME.includes('.') // Has a period
  ) {
    if (THEME.includes('/') || THEME.includes('\\'))
      msg += "\nTHEME must be a valid filename, and theme files must be in the root of the themes folder.";
    else if (THEME.includes('.'))
      msg += "\nTHEME must be a valid filename without periods. (Do not include the file extension)"
    else
      msg += "\nTHEME must be a valid filename.";
  }
  
  // Check VERBOSITY
  if (Object.is(VERBOSITY, "-0") || !Number.isInteger(Number(VERBOSITY)) || VERBOSITY < 0) {
    msg += "\nVERBOSITY must be a positive integer.";
  }
  
  return msg;
}

function CheckGitRepoUpdates(repoPath) {
  try {
      // Change to the repository directory
      const originalDir = process.cwd();
      process.chdir(path.resolve(repoPath));

      // Fetch the latest changes from remote
      execSync('git fetch', { stdio: 'pipe' });

      // Get the number of commits behind remote
      const behindCount = execSync('git rev-list HEAD..origin/main --count', { 
          stdio: 'pipe',
          encoding: 'utf-8'
      }).trim();

      // Get the latest remote commit message
      const latestCommit = execSync('git log origin/main -1 --pretty=format:"%s"', {
          stdio: 'pipe',
          encoding: 'utf-8'
      }).trim();

      // Change back to original directory
      process.chdir(originalDir);

      return {
          hasUpdates: parseInt(behindCount) > 0,
          commitsBehinds: parseInt(behindCount),
          latestCommitMessage: latestCommit
      };
  } catch (error) {
      throw new Error(`Failed to check repository updates: ${error.message}`);
  }
}

const utils = {
  ValidateConfig,
  CheckGitRepoUpdates,
  EnsureConfigExists,
  LoadAndValidateConfig,
};

export default utils;