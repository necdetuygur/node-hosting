import express from "express";
import vhost from "vhost";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import serveIndex from "serve-index";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const vhostConfigPath = path.join(__dirname, "vhost.json");
const vhostConfig = JSON.parse(fs.readFileSync(vhostConfigPath, "utf8"));

const app = express();

Object.entries(vhostConfig).forEach(([domain, folder]) => {
  const domainApp = express();
  domainApp.use(express.static(folder), serveIndex(folder, { icons: true }));

  app.use(vhost(domain, domainApp));
});

app.listen(80, () => {
  console.log("Server running on port 80 with the following domains:");
  Object.keys(vhostConfig).forEach((domain) => {
    console.log(`- ${domain}`);
  });
});
