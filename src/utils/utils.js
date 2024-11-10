function ValidateConfig(env) {
  const { CLIENT_ID, CLIENT_SECRET, PORT, THEME, VERBOSITY } = env;

  let msg = "";

  // Check CLIENT_ID
  if (!CLIENT_ID && CLIENT_ID != "your-client-id-here") {
    msg += "\nCLIENT_ID must be set.";
  }

  // Check CLIENT_SECRET
  if (!CLIENT_SECRET && CLIENT_SECRET != "your-client-secret-here") {
    msg += "\nCLIENT_SECRET must be set.";
  }

  // Check PORT
  const portNumber = Number(PORT);
  if (!PORT || isNaN(portNumber) || portNumber < 1024 || portNumber > 65535) {
    msg += "\nPORT must be a number between 1024 and 65535.";
  }

  // Check THEME
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

const utils = {
  ValidateConfig
};

export default utils;