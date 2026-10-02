// Runs at deploy time (wrangler "build" command). Records byte sizes of files in public/
// so the Worker can answer HTTP range requests (video seeking) without reading content-length.
import fs from "node:fs";
import path from "node:path";
const dir = new URL("../public/", import.meta.url).pathname;
const sizes = {};
for (const f of fs.readdirSync(dir)) {
  const s = fs.statSync(path.join(dir, f));
  if (s.isFile()) sizes["/" + f] = s.size;
}
fs.writeFileSync(new URL("../src/media-sizes.json", import.meta.url), JSON.stringify(sizes, null, 2) + "\n");
console.log("media-sizes.json:", sizes);
