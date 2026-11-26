/** The five people on the couch. Index 3 is "you" — the one mosquitoes pick. */
import type { PersonLook } from "../models/Human";

export const TARGET = 3;
export const PEOPLE: { look: PersonLook; pos: [number, number, number]; rotY: number }[] = [
  { look: { tone: "#8a5a3e", shirt: "#4b5a6e", pants: "#23262c", hair: "#120e0c", sleeve: "long", headTurn: 0.1, headTilt: 0.5, phone: true, lean: 0.06, seed: 1 }, pos: [-1.02, 0, 0.0], rotY: 0.1 },
  { look: { tone: "#9b6a4a", shirt: "#7a3b36", pants: "#2a2f3a", hair: "#0d0a09", longHair: true, sleeve: "long", headTurn: 0.5, headTilt: 0.1, lean: -0.16, seed: 2 }, pos: [-0.51, 0, 0.0], rotY: 0.05 },
  { look: { tone: "#7a4f37", shirt: "#3c4a3a", pants: "#1f2228", hair: "#100c0a", sleeve: "long", headTurn: 0.0, headTilt: 0.48, phone: true, lean: 0.08, seed: 3 }, pos: [0.0, 0, 0.0], rotY: 0 },
  { look: { tone: "#8f5f42", shirt: "#262d38", pants: "#2b3340", hair: "#0f0b09", sleeve: "short", headTurn: -0.35, headTilt: 0.12, lean: -0.1, seed: 4 }, pos: [0.51, 0, 0.03], rotY: -0.06 },
  { look: { tone: "#9a6a4c", shirt: "#5a4a6a", pants: "#25272d", hair: "#130f0c", longHair: true, sleeve: "long", headTurn: -0.55, headTilt: 0.2, lean: -0.05, seed: 5 }, pos: [1.02, 0, 0.0], rotY: -0.12 },
];
