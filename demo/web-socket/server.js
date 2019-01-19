const http = require("http");
const fs = require("fs");


const server = http.createServer(function(req,res) {
    //console.log(req.headers["Upgrade"]);
    let data = "";
    if (req.url === "/") {
        let rs = fs.createReadStream("./index.html");
        rs.pipe(res);
    }
    if (req.url.indexOf(".js") >= 0 ) {
        let arr = req.url.split("/");
        let length = arr.length;
        let fileName = arr[length-1];
        let rs = fs.createReadStream("./" + fileName);
        rs.pipe(res);
    }
});



server.listen(8086);