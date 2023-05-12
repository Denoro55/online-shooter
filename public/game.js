const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const socket = io();

let myId;
let otherPlayers = [];
let otherBullets = [];

// Создание объекта круга
const circle = {
    x: 150,
    y: 150,
    radius: 15,
    color: "blue",
    speed: 4,
    score: 0,
};

const bulletRadius = 5;
const bulletSpeed = 7;

let bullets = [];
let isMouseDown = false; // флаг, указывающий, зажата ли кнопка мыши
let mouseX = 0;
let mouseY = 0;
let reloadTime = 0;
let reloadTimeMax = 5;

// Флаги клавиш управления
let leftPressed = false;
let rightPressed = false;
let upPressed = false;
let downPressed = false;

// Основной игровой цикл
function update() {
    // Изменение позиции круга в зависимости от флагов удерживания клавиш
    if (leftPressed) {
        circle.x -= circle.speed;
    }
    if (rightPressed) {
        circle.x += circle.speed;
    }
    if (upPressed) {
        circle.y -= circle.speed;
    }
    if (downPressed) {
        circle.y += circle.speed;
    }

    // Ограничение перемещения круга за границы экрана
    if (circle.x - circle.radius < 0) {
        circle.x = circle.radius;
    }
    if (circle.x + circle.radius > canvas.width) {
        circle.x = canvas.width - circle.radius;
    }
    if (circle.y - circle.radius < 0) {
        circle.y = circle.radius;
    }
    if (circle.y + circle.radius > canvas.height) {
        circle.y = canvas.height - circle.radius;
    }

    // Очистка экрана
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "blue";
    for (let i = 0; i < bullets.length; i++) {
        ctx.beginPath();
        ctx.arc(bullets[i].x, bullets[i].y, bulletRadius, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.fillStyle = "red";
    for (let i = 0; i < otherPlayers.length; i++) {
        const otherPlayer = otherPlayers[i];

        for (let n = 0; n < otherPlayer.bullets.length; n++) {
            const otherBullet = otherPlayer.bullets[n];

            ctx.beginPath();
            ctx.arc(otherBullet.x, otherBullet.y, bulletRadius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Рисование круга
    ctx.fillStyle = circle.color;
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI);
    ctx.fill();

    drawText(circle.score, circle.x, circle.y - 30);

    for (let i = 0; i < otherPlayers.length; i++) {
        const otherPlayer = otherPlayers[i];

        drawText(otherPlayer.score, otherPlayer.x, otherPlayer.y - 30);

        // Рисование круга
        ctx.fillStyle = "red";
        ctx.beginPath();
        ctx.arc(otherPlayer.x, otherPlayer.y, circle.radius, 0, 2 * Math.PI);
        ctx.fill();
    }

    // перемещаем каждую пулю в направлении ее движения
    for (let i = 0; i < bullets.length; i++) {
        const bullet = bullets[i];

        bullet.x += bullet.direction.x * bulletSpeed;
        bullet.y += bullet.direction.y * bulletSpeed;

        for (let p = 0; p < otherPlayers.length; p++) {
            const otherPlayer = otherPlayers[p];

            if (
                isCollidingCircle(
                    {
                        x: bullet.x,
                        y: bullet.y,
                        radius: bulletRadius,
                    },
                    {
                        x: otherPlayer.x,
                        y: otherPlayer.y,
                        radius: circle.radius,
                    }
                )
            ) {
                bullets = bullets.filter((b) => {
                    return b !== bullet;
                });

                circle.score += 1;
            }
        }
    }

    // удаляем пули, которые вышли за пределы холста
    bullets = bullets.filter((bullet) => bullet.x > 0 && bullet.y > 0 && bullet.x < canvas.width && bullet.y < canvas.height);

    if (isMouseDown && reloadTime <= 0) {
        shoot();

        reloadTime = reloadTimeMax;
    }

    if (reloadTime > 0) {
        reloadTime -= 1;
    }

    socket.emit("playerInfo", {
        x: circle.x,
        y: circle.y,
        id: myId,
        bullets,
        score: circle.score,
    });

    // Запуск следующего цикла
    requestAnimationFrame(update);
}

// Обработчики нажатий и отпусканий клавиш
document.addEventListener("keydown", (event) => {
    if (event.code === "ArrowLeft") {
        leftPressed = true;
    } else if (event.code === "ArrowRight") {
        rightPressed = true;
    } else if (event.code === "ArrowUp") {
        upPressed = true;
    } else if (event.code === "ArrowDown") {
        downPressed = true;
    }
});

document.addEventListener("keyup", (event) => {
    if (event.code === "ArrowLeft") {
        leftPressed = false;
    } else if (event.code === "ArrowRight") {
        rightPressed = false;
    } else if (event.code === "ArrowUp") {
        upPressed = false;
    } else if (event.code === "ArrowDown") {
        downPressed = false;
    }
});

// функция для обработки события движения мыши
function handleMouseMove(event) {
    // получаем координаты мыши относительно холста
    mouseX = event.clientX - canvas.offsetLeft;
    mouseY = event.clientY - canvas.offsetTop;
}

function shoot() {
    const playerX = circle.x;
    const playerY = circle.y;
    const directionX = mouseX - playerX;
    const directionY = mouseY - playerY;
    const directionLength = Math.sqrt(directionX * directionX + directionY * directionY);
    const direction = {
        x: directionX / directionLength,
        y: directionY / directionLength,
    };

    bullets.push({
        x: playerX,
        y: playerY,
        direction: direction,
    });
}

// функция для обработки события нажатия на кнопку мыши
function handleMouseDown(event) {
    isMouseDown = true;
}

// функция для обработки события отпускания кнопки мыши
function handleMouseUp(event) {
    isMouseDown = false;
}

// подписываемся на события мыши
canvas.addEventListener("mousedown", handleMouseDown);
canvas.addEventListener("mouseup", handleMouseUp);
canvas.addEventListener("mousemove", handleMouseMove);

// Запуск игры
requestAnimationFrame(update);

function drawText(text, x, y) {
    ctx.fillStyle = "black";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y);
}

function isCollidingCircle(circle1, circle2) {
    const distance = Math.sqrt(Math.pow(circle2.x - circle1.x, 2) + Math.pow(circle2.y - circle1.y, 2));

    return distance < circle1.radius + circle2.radius;
}

function initSockets() {
    socket.on("init", (params) => {
        myId = params.id;
        otherPlayers = params.otherPlayers;
    });

    socket.on("newPlayerConnected", (player) => {
        otherPlayers.push(player);
    });

    socket.on("playerDisconnected", (player) => {
        otherPlayers = otherPlayers.filter((pl) => {
            return pl.id !== player.id;
        });
    });

    socket.on("playerInfo", (playerInfo) => {
        otherBullets = playerInfo.bullets;

        const pl = otherPlayers.find((pl) => pl.id === playerInfo.id);

        if (pl) {
            pl.x = playerInfo.x;
            pl.y = playerInfo.y;
            pl.bullets = otherBullets;
            pl.score = playerInfo.score;
        }
    });

    // socket.emit("chat message", input.value);
}

initSockets();
