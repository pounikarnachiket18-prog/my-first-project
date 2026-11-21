// Standalone entry for the Vigilance Control Device video only.
//   npx remotion studio src/vcd/index.ts
//   npx remotion render src/vcd/index.ts VigilanceVCD out/vigilance-vcd.mp4
// It is also registered in the main src/Root.tsx.
import { registerRoot } from "remotion";
import { VcdRoot } from "./VcdRoot";

registerRoot(VcdRoot);
