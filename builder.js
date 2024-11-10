import dotenv from "dotenv";
import { existsSync, writeFileSync, unlink } from "fs";
import utils from "./src/utils/utils.js";

const red = "\x1b[31m";
const green = "\x1b[32m";
const yellow = "\x1b[33m";
const reset = "\x1b[0m";

if (existsSync("./config.env")) {
    dotenv.config({ path: "./config.env" });
    try {
        const validConf = utils.ValidateConfig(process.env);
        if (validConf != "") {
          console.log(
            `${red}Build encountered an error: Config.env could not be validated. `,
            validConf,
            reset
          );
          process.exit(1);
        }
        if (!existsSync(`./src/themes/${process.env.THEME}.jsx`)) {
            console.log(
              `${red}Build encountered an error: ${process.env.THEME}.jsx does not exist.`,
              `This is because your THEME variable (${process.env.THEME}) in config.env does not match the name of any theme files in src/themes.`,
              reset
            );
            process.exit(1);  
        }

        const content =
        "import React from 'react'\n" + 
        "import ReactDOM from 'react-dom/client'\n" + 
        `import Theme from './themes/${process.env.THEME}.jsx'\n` + 
        "ReactDOM.createRoot(document.getElementById('root')).render(\n" +
        "  <React.StrictMode>\n" +
        "    <Theme />\n" +
        "  </React.StrictMode>\n"+
        ")"
        writeFileSync("src/main.jsx", content);
        
        console.log(`${green}Syncify file build succeeded!\n${yellow}Vite build running...\n${reset}`);
        process.exit(0);
    } catch (ex) {
        console.log(
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
else {
    unlink("tokens.json", (err) => {
      // Delete tokens.json as they're likely not usable anymore.
      if (err) {
        console.log(
          `${red}Failed to delete tokens.json: `,
          err,
          reset);
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

      console.log(
        `${yellow}Config.env was not found, and one has been created. Please populate the file with your configuration, then restart Syncify.`,
        reset
      );
    } catch (err) {
      console.log(
        `${red}Config.env was not found, and one could not be created.\n`,
        err,
        "\nTip: Please ensure Syncify is in a location with write permissions.",
        reset
      );
    }
    process.exit(1);
}