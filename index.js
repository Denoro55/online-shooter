const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

let players = [];

app.use(express.static("public"));

io.on("connection", (socket) => {
    console.log("a user connected", players);

    socket.emit("init", {
        id: socket.id,
        otherPlayers: players,
    });

    const newPlayer = {
        x: 150,
        y: 150,
        id: socket.id,
        bullets: [],
        score: 0,
        rightPressed: false,
        downPressed: false,
        leftPressed: false,
        upPressed: false,
    };

    players.push(newPlayer);

    // отправка самому себе
    socket.emit("hello", "world");

    // отправка всем кроме себя
    socket.broadcast.emit("newPlayerConnected", newPlayer);

    socket.on("playerInfo", (msg) => {
        socket.broadcast.emit("playerInfo", msg);
    });

    socket.on("disconnect", () => {
        console.log("user disconnected");

        players = players.filter((pl) => pl.id !== socket.id);

        socket.broadcast.emit("playerDisconnected", {
            id: socket.id,
        });
    });
});

server.listen(3000, () => {
    console.log("listening on *:3000");
});
