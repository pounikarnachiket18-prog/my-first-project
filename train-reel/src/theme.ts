/** Colour themes for the whole reel. Pick one with the `theme` input prop. */
export type Trio = [string, string, string]; // bg, text, waveform

export type Theme = {
  id: string;
  name: string;
  // world + light
  bg: string;
  hemiSky: string;
  hemiGround: string;
  hemiI: number;
  dirColor: string;
  dirI: number;
  // station
  tileBase: string;
  tileGrout: string;
  platSide: string;
  platFront: string;
  coping: string;
  safety: string;
  track: string;
  rail: string;
  wall: string;
  roofA: string;
  roofB: string;
  beam: string;
  column: string;
  // train livery
  trainTop: string;
  trainUpper: string;
  windowBand: string;
  windowGlass: string;
  lowerA: string;
  lowerB: string;
  stripe: string;
  doorLine: string;
  trainRoof: string;
  trainEnd: string;
  // props
  horn: string;
  hornRim: string;
  boardText: string;
  boardLabel: string;
  frame: string;
  glass: string;
  signBg: string;
  signBorder: string;
  signText: string;
  roomWall: string;
  roomWall2: string;
  desk: string;
  deskPanel: string;
  sleeve: string;
  // clip cards
  cardNormal: Trio;
  cardActive: Trio;
  cardGold: Trio;
  cardDim: Trio;
  pill: string;
  // operator screen
  uiBg: string;
  uiHeader: string;
  uiHeaderText: string;
  uiTabs: string;
  uiTabText: string;
  uiAccent: string;
  uiAccentDark: string;
  uiTableHead: string;
  uiRowA: string;
  uiRowB: string;
  uiRowLate: string;
  uiText: string;
  uiPanel: string;
  uiField: string;
  uiMuted: string;
  uiOk: string;
  uiWarn: string;
  uiOnAccent: string;
  // title
  title1: string;
  title2: string;
  titleGlow: string; // rgb triplet "r,g,b"
};

const DEFAULT: Theme = {
  id: "default",
  name: "Original (white & red)",
  bg: "#E8EBF0",
  hemiSky: "#FFFFFF",
  hemiGround: "#A9AFBB",
  hemiI: 1.5,
  dirColor: "#FFFFFF",
  dirI: 1.9,
  tileBase: "#E1E4EA",
  tileGrout: "#C3C8D1",
  platSide: "#BFC4CD",
  platFront: "#9EA4AF",
  coping: "#D0D4DB",
  safety: "#E6B526",
  track: "#6E727B",
  rail: "#A4AAB4",
  wall: "#D9DCE2",
  roofA: "#E9ECF1",
  roofB: "#C3C8D0",
  beam: "#24272D",
  column: "#CDD1D8",
  trainTop: "#AEB3BC",
  trainUpper: "#CDD1D8",
  windowBand: "#30343D",
  windowGlass: "#4A5363",
  lowerA: "#C42430",
  lowerB: "#8E1720",
  stripe: "#E7B53E",
  doorLine: "#6E1018",
  trainRoof: "#B5BAC3",
  trainEnd: "#2A2C31",
  horn: "#2C2F36",
  hornRim: "#3B3F47",
  boardText: "#FFFFFF",
  boardLabel: "#D7DAE0",
  frame: "#F4F5F7",
  glass: "#CFE2EC",
  signBg: "#F7F7F9",
  signBorder: "#B3202A",
  signText: "#1D1F24",
  roomWall: "#F1F2F5",
  roomWall2: "#E9EBEF",
  desk: "#F4F5F7",
  deskPanel: "#DDE0E6",
  sleeve: "#2E8C86",
  cardNormal: ["#F2F3F6", "#24272E", "#3F4450"],
  cardActive: ["#2F55E4", "#FFFFFF", "#DCE4FF"],
  cardGold: ["#C9A15A", "#2E220D", "#4B3814"],
  cardDim: ["#F3F4F7", "#A9AEB8", "#C3C7CF"],
  pill: "#2F55E4",
  uiBg: "#F4F6FA",
  uiHeader: "#151E5C",
  uiHeaderText: "#FFFFFF",
  uiTabs: "#D9E1F6",
  uiTabText: "#2A3A7A",
  uiAccent: "#2F55E4",
  uiAccentDark: "#1B3BB8",
  uiTableHead: "#2B3A8F",
  uiRowA: "#EDF1F9",
  uiRowB: "#FFFFFF",
  uiRowLate: "#FBE2E5",
  uiText: "#2A2F3C",
  uiPanel: "#E6EBF6",
  uiField: "#FFFFFF",
  uiMuted: "#5A6488",
  uiOk: "#3BE38A",
  uiWarn: "#FFC83D",
  uiOnAccent: "#FFFFFF",
  title1: "#111317",
  title2: "#2B3FD9",
  titleGlow: "255,255,255",
};

const NIGHT: Theme = {
  ...DEFAULT,
  id: "night",
  name: "Night / dark blue",
  bg: "#0B1430",
  hemiSky: "#7D90D0",
  hemiGround: "#0A0F22",
  hemiI: 1.0,
  dirColor: "#FFD9A0",
  dirI: 1.4,
  tileBase: "#2A3352",
  tileGrout: "#161C33",
  platSide: "#1E2642",
  platFront: "#141A30",
  coping: "#3A4466",
  safety: "#FFC83D",
  track: "#151A28",
  rail: "#5A6480",
  wall: "#121A33",
  roofA: "#2E3A60",
  roofB: "#1A2342",
  beam: "#070A14",
  column: "#36406A",
  trainTop: "#2A3F78",
  trainUpper: "#3657A6",
  windowBand: "#0E1426",
  windowGlass: "#FFD98A",
  lowerA: "#2747A0",
  lowerB: "#152C6A",
  stripe: "#F5C542",
  doorLine: "#0F1F52",
  trainRoof: "#2A3A66",
  trainEnd: "#0C1020",
  horn: "#1A1D26",
  hornRim: "#2C3040",
  boardText: "#FFB000",
  boardLabel: "#C98B00",
  frame: "#2E3756",
  glass: "#6FA8FF",
  signBg: "#10162B",
  signBorder: "#FFB000",
  signText: "#FFB000",
  roomWall: "#1C2442",
  roomWall2: "#18203B",
  desk: "#2C3556",
  deskPanel: "#222A48",
  sleeve: "#F2A33A",
  cardNormal: ["#1E2747", "#E8ECF8", "#8FA0D0"],
  cardActive: ["#FFC83D", "#1A1300", "#5A4300"],
  cardGold: ["#2EC4B6", "#06231F", "#0B4A42"],
  cardDim: ["#161D36", "#56608A", "#3A4468"],
  pill: "#FFC83D",
  uiBg: "#0F1730",
  uiHeader: "#060B1C",
  uiHeaderText: "#FFFFFF",
  uiTabs: "#1A2446",
  uiTabText: "#9FB0E8",
  uiAccent: "#FFB000",
  uiAccentDark: "#C98B00",
  uiTableHead: "#232F5C",
  uiRowA: "#152043",
  uiRowB: "#111A36",
  uiRowLate: "#3A1E33",
  uiText: "#DDE3F5",
  uiPanel: "#182244",
  uiField: "#0B1228",
  uiMuted: "#8796C6",
  uiOnAccent: "#1A1300",
  title1: "#FFFFFF",
  title2: "#FFC83D",
  titleGlow: "6,11,28",
};

const SUNSET: Theme = {
  ...DEFAULT,
  id: "sunset",
  name: "Warm sunset",
  bg: "#F7C9A2",
  hemiSky: "#FFE3C4",
  hemiGround: "#B9876A",
  hemiI: 1.4,
  dirColor: "#FFB27A",
  dirI: 2.0,
  tileBase: "#F2E3D1",
  tileGrout: "#D8BEA2",
  platSide: "#D9BCA0",
  platFront: "#BD9A7C",
  coping: "#E8D4BF",
  safety: "#F08A2C",
  track: "#866456",
  rail: "#C2A390",
  wall: "#EBC8AA",
  roofA: "#F3DECA",
  roofB: "#CFAE90",
  beam: "#4A2C2A",
  column: "#E8D3BE",
  trainTop: "#D8C6B0",
  trainUpper: "#EEE1CF",
  windowBand: "#4A2C2A",
  windowGlass: "#7A5148",
  lowerA: "#8A2433",
  lowerB: "#5A1520",
  stripe: "#F2A33A",
  doorLine: "#3E0E15",
  trainRoof: "#D6C2AC",
  trainEnd: "#3A2220",
  horn: "#3A2522",
  hornRim: "#56372F",
  boardText: "#FFE2B8",
  boardLabel: "#E8B884",
  frame: "#FFF4E8",
  glass: "#FFD9B8",
  signBg: "#FFF6EC",
  signBorder: "#E0642A",
  signText: "#3A2522",
  roomWall: "#F8E7D6",
  roomWall2: "#F1DCC6",
  desk: "#FFF4E8",
  deskPanel: "#ECD6C0",
  sleeve: "#8A2433",
  cardNormal: ["#FFF6EC", "#3A2522", "#7A5A4A"],
  cardActive: ["#E8642A", "#FFFFFF", "#FFE0CC"],
  cardGold: ["#8A2433", "#FFFFFF", "#F6C7CF"],
  cardDim: ["#F6E9DC", "#BFA594", "#D9C3B2"],
  pill: "#E8642A",
  uiBg: "#FFF7EE",
  uiHeader: "#4A2C2A",
  uiTabs: "#F6DCC6",
  uiTabText: "#6A3A2A",
  uiAccent: "#E8642A",
  uiAccentDark: "#B8461A",
  uiTableHead: "#7A3A2E",
  uiRowA: "#FCEBDD",
  uiRowB: "#FFFFFF",
  uiRowLate: "#FBD9D2",
  uiText: "#3A2522",
  uiPanel: "#F8E3D2",
  uiMuted: "#8A6252",
  title1: "#3A2522",
  title2: "#E0561E",
  titleGlow: "255,240,226",
};

const CLASSIC: Theme = {
  ...DEFAULT,
  id: "classic",
  name: "Classic Indian Rail (blue & cream)",
  bg: "#EFE6D2",
  hemiSky: "#FFF8EA",
  hemiGround: "#B8AA8C",
  hemiI: 1.5,
  dirColor: "#FFF3DC",
  dirI: 1.9,
  tileBase: "#E8DCC3",
  tileGrout: "#C9B791",
  platSide: "#D3C3A3",
  platFront: "#B5A482",
  coping: "#E2D6BE",
  safety: "#E6B526",
  track: "#776D5B",
  rail: "#B0A68F",
  wall: "#DDD0B4",
  roofA: "#EDE3CF",
  roofB: "#C7B694",
  beam: "#3B2F25",
  column: "#DCCFB4",
  trainTop: "#1F3A7E",
  trainUpper: "#2C4C9C",
  windowBand: "#16285A",
  windowGlass: "#6F86C4",
  lowerA: "#22439A",
  lowerB: "#15306E",
  stripe: "#F1E2B8",
  doorLine: "#0F2257",
  trainRoof: "#8E98A8",
  trainEnd: "#1C2233",
  horn: "#2F2A25",
  hornRim: "#4A4238",
  boardText: "#FFFFFF",
  boardLabel: "#D6CFC0",
  frame: "#FBF6EA",
  glass: "#D9E4EA",
  signBg: "#FFF9EC",
  signBorder: "#9E1B22",
  signText: "#2E2418",
  roomWall: "#F6EFDF",
  roomWall2: "#EEE5D1",
  desk: "#FBF6EA",
  deskPanel: "#E3D8C0",
  sleeve: "#9E1B22",
  cardNormal: ["#FFF9EC", "#2E2418", "#5E5240"],
  cardActive: ["#9E1B22", "#FFFFFF", "#F6CFD2"],
  cardGold: ["#2C4C9C", "#FFFFFF", "#C9D5F4"],
  cardDim: ["#F3ECDD", "#B3A78F", "#CFC4AE"],
  pill: "#9E1B22",
  uiBg: "#FBF7EE",
  uiHeader: "#1F3A7E",
  uiTabs: "#E9DFC9",
  uiTabText: "#1F3A7E",
  uiAccent: "#9E1B22",
  uiAccentDark: "#741319",
  uiTableHead: "#2C4C9C",
  uiRowA: "#F3ECDD",
  uiRowB: "#FFFFFF",
  uiRowLate: "#F7D9D6",
  uiText: "#2E2418",
  uiPanel: "#EFE6D2",
  uiMuted: "#6E6250",
  title1: "#2E2418",
  title2: "#9E1B22",
  titleGlow: "255,250,238",
};

const GREEN: Theme = {
  ...DEFAULT,
  id: "green",
  name: "Bold green & yellow",
  bg: "#DDF3E6",
  hemiSky: "#F4FFF8",
  hemiGround: "#8FB8A0",
  hemiI: 1.5,
  dirColor: "#FFFDF0",
  dirI: 1.9,
  tileBase: "#E1F1E7",
  tileGrout: "#B5D6C2",
  platSide: "#B5D3C1",
  platFront: "#93B8A2",
  coping: "#CDE6D7",
  safety: "#FFD43B",
  track: "#567262",
  rail: "#9DBBAA",
  wall: "#CBE6D6",
  roofA: "#DDF1E5",
  roofB: "#A6CBB6",
  beam: "#123A2B",
  column: "#C6E2D1",
  trainTop: "#C9D9CE",
  trainUpper: "#E8F0EA",
  windowBand: "#123A2B",
  windowGlass: "#3B6A55",
  lowerA: "#167048",
  lowerB: "#0C4A2F",
  stripe: "#FFD43B",
  doorLine: "#08301F",
  trainRoof: "#BFD3C6",
  trainEnd: "#0E2A1F",
  horn: "#173B2E",
  hornRim: "#2A5443",
  boardText: "#FFD43B",
  boardLabel: "#B7D9C5",
  frame: "#F5FFF9",
  glass: "#CFEFE0",
  signBg: "#F5FFF9",
  signBorder: "#167048",
  signText: "#123A2B",
  roomWall: "#EEF9F2",
  roomWall2: "#E3F3E9",
  desk: "#F5FFF9",
  deskPanel: "#D3EADC",
  sleeve: "#167048",
  cardNormal: ["#FFFFFF", "#123A2B", "#2F6A50"],
  cardActive: ["#FFD43B", "#123A2B", "#6B5600"],
  cardGold: ["#167048", "#FFFFFF", "#BFE8D2"],
  cardDim: ["#EEF7F1", "#9BB8A7", "#C2D8CB"],
  pill: "#167048",
  uiBg: "#F4FBF7",
  uiHeader: "#0F4A31",
  uiTabs: "#D3EBDD",
  uiTabText: "#0F4A31",
  uiAccent: "#167048",
  uiAccentDark: "#0C4A2F",
  uiTableHead: "#1B6A47",
  uiRowA: "#E8F5ED",
  uiRowB: "#FFFFFF",
  uiRowLate: "#FFF1BF",
  uiText: "#123A2B",
  uiPanel: "#E1F1E7",
  uiMuted: "#4F7A64",
  title1: "#123A2B",
  title2: "#13804F",
  titleGlow: "246,255,250",
};

export const THEMES: Record<string, Theme> = { default: DEFAULT, night: NIGHT, sunset: SUNSET, classic: CLASSIC, green: GREEN };

let current: Theme = DEFAULT;
export const setTheme = (id: string) => {
  current = THEMES[id] ?? DEFAULT;
};
export const TH = () => current;
