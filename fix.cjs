const fs = require("fs");
let f = fs.readFileSync("src/lib/videoUpload.js", "utf8");
f = f.replace("Error`Upload", "Error(`Upload");
f = f.replace("`));", "`));");
fs.writeFileSync("src/lib/videoUpload.js", f);
console.log("Fixed!");
