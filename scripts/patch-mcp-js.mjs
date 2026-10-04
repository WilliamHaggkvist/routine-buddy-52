// Patchar @lovable.dev/mcp-js så att dess sökvägskontroll fungerar på Windows.
// Pluginet jämför Vites rotmapp (framåtlutande snedstreck) med upplösta sökvägar
// (bakåtlutande snedstreck på Windows) och kastar då ett falskt fel vid uppstart.
// Körs automatiskt via "postinstall" i package.json.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const file = "node_modules/@lovable.dev/mcp-js/dist/stacks/tanstack/vite.js";
if (!existsSync(file)) {
  console.log("[patch-mcp-js] paketet saknas, hoppar över");
  process.exit(0);
}

const original = `function assertContains(parent, child, label) {
	if (child !== parent && !child.startsWith(parent + sep)) throw new Error(\`@lovable.dev/mcp-js: \${label} must resolve under \${parent}, got \${child}\`);
}`;

const patched = `function assertContains(parent, child, label) {
	const p = parent.split(sep).join("/");
	const c = child.split(sep).join("/");
	if (c !== p && !c.startsWith(p + "/")) throw new Error(\`@lovable.dev/mcp-js: \${label} must resolve under \${parent}, got \${child}\`);
}`;

const source = readFileSync(file, "utf8");
if (source.includes(patched)) {
  console.log("[patch-mcp-js] redan patchad");
  process.exit(0);
}
if (!source.includes(original)) {
  console.warn("[patch-mcp-js] hittade inte koden att patcha – pluginet kan ha ändrats");
  process.exit(0);
}
writeFileSync(file, source.replace(original, patched));
console.log("[patch-mcp-js] Windows-fix applicerad");
