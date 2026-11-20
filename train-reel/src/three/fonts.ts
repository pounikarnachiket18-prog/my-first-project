import { useEffect, useState } from "react";
import { useDelayRender } from "remotion";

const FACES: [string, string][] = [
  ["700 40px Hind", "गाड़ी संख्या"],
  ["600 40px Hind", "गाड़ी संख्या"],
  ["800 40px Poppins", "Aa"],
  ["600 40px Poppins", "Aa"],
  ["400 40px Anton", "Aa1"],
];

let ready = false;
const promise = typeof document !== "undefined"
  ? Promise.all(FACES.map(([f, t]) => document.fonts.load(f, t))).then(() => {
      ready = true;
    })
  : Promise.resolve();

/** True once canvas-texture fonts (incl. Devanagari) are loaded. Holds the render until then. */
export const useFontsReady = () => {
  const [ok, setOk] = useState(ready);
  const { delayRender, continueRender } = useDelayRender();
  useEffect(() => {
    if (ok) return;
    const h = delayRender("canvas fonts", { timeoutInMilliseconds: 120000 });
    promise.then(() => {
      setOk(true);
      continueRender(h);
    });
  }, [ok, delayRender, continueRender]);
  return ok;
};
