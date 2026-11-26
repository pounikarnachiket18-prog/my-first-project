import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setConcurrency(4);
// Headless WebGL (no GPU in CI/cloud): ANGLE on SwiftShader.
Config.setChromiumOpenGlRenderer("angle");
