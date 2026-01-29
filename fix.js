const fs = require("fs");
let f = fs.readFileSync("src/lib/videoUpload.js", "utf8");
f = f.replace(/reject\(new Error`/g, "reject(new Error(`");
f = f.replace(/`\)\);/g, "`));");
fs.writeFileSync("src/lib/videoUpload.js", f);
