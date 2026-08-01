import dotenv from "dotenv";
import { existsSync, writeFileSync } from "fs";
import utils from "./src/utils/utils.js";
import colors from "./src/utils/colors.js";

utils.EnsureConfigExists();
utils.LoadAndValidateConfig(dotenv);

if (!existsSync(`./src/themes/${process.env.THEME}.jsx`)) {
  console.log(
    `${colors.red}Build encountered an error: ${process.env.THEME}.jsx does not exist.`,
    `This is because your THEME variable (${process.env.THEME}) in config.env does not match the name of any theme files in src/themes.`,
    colors.reset,
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
  "  </React.StrictMode>\n" +
  ")";
try {
  writeFileSync("src/main.jsx", content);
} catch (err) {
  console.log(
    `${colors.red}Build encountered an error: Failed to write src/main.jsx.`,
    err.message,
    colors.reset,
  );
  process.exit(1);
}

console.log(
  `${colors.green}Syncify file build succeeded!\n${colors.yellow}Vite build running...\n${colors.reset}`,
);
process.exit(0);