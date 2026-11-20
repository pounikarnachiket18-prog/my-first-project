import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setConcurrency(4);
// three.js needs WebGL; SwiftShader-backed ANGLE works on machines without a GPU.
Config.setChromiumOpenGlRenderer("swangle");
Config.setDelayRenderTimeoutInMilliseconds(120000);
const shell = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
if (require("fs").existsSync(shell)) Config.setBrowserExecutable(shell);
