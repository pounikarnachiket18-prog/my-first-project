import fs from "node:fs";
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setConcurrency(4);
// Headless WebGL without a GPU: ANGLE (SwiftShader fallback).
Config.setChromiumOpenGlRenderer("angle");
// Use a locally installed headless Chromium when present (offline/cloud boxes).
const LOCAL_SHELL = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
if (fs.existsSync(LOCAL_SHELL)) Config.setBrowserExecutable(LOCAL_SHELL);
