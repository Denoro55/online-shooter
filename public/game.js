const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const socket = io();

let lastResponseTime = Date.now();
let responseTimes = [];

let myId;
let otherPlayers = [];

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

function getRandomId() {
    return myId + Date.now() + Math.random();
}

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

    socket.emit("playerInfo", {
        x: circle.x,
        y: circle.y,
        id: myId,
        score: circle.score,
        leftPressed,
        rightPressed,
        upPressed,
        downPressed,
    });

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

        if (otherPlayer.leftPressed) {
            otherPlayer.x -= circle.speed;
        }
        if (otherPlayer.rightPressed) {
            otherPlayer.x += circle.speed;
        }
        if (otherPlayer.upPressed) {
            otherPlayer.y -= circle.speed;
        }
        if (otherPlayer.downPressed) {
            otherPlayer.y += circle.speed;
        }

        if (otherPlayer.x < otherPlayer.xx && !otherPlayer.rightPressed) {
            otherPlayer.x += circle.speed;
        }
        if (otherPlayer.x > otherPlayer.xx && !otherPlayer.leftPressed) {
            otherPlayer.x -= circle.speed;
        }
        if (otherPlayer.y < otherPlayer.yy && !otherPlayer.downPressed) {
            otherPlayer.y += circle.speed;
        }
        if (otherPlayer.y > otherPlayer.yy && !otherPlayer.upPressed) {
            otherPlayer.y -= circle.speed;
        }

        // Ограничение перемещения круга за границы экрана
        if (otherPlayer.x - circle.radius < 0) {
            otherPlayer.x = circle.radius;
        }
        if (otherPlayer.x + circle.radius > canvas.width) {
            otherPlayer.x = canvas.width - circle.radius;
        }
        if (otherPlayer.y - circle.radius < 0) {
            otherPlayer.y = circle.radius;
        }
        if (otherPlayer.y + circle.radius > canvas.height) {
            otherPlayer.y = canvas.height - circle.radius;
        }

        drawText(otherPlayer.score, otherPlayer.x, otherPlayer.y - 30);

        // Рисование круга
        ctx.fillStyle = "red";
        ctx.beginPath();
        ctx.arc(otherPlayer.x, otherPlayer.y, circle.radius, 0, 2 * Math.PI);
        ctx.fill();
    }

    const enemiesBullets = otherPlayers.reduce((acc, pl) => {
        return [...acc, ...pl.bullets];
    }, []);
    const allBullets = [...bullets, ...enemiesBullets];

    // перемещаем каждую пулю в направлении ее движения
    for (let i = 0; i < allBullets.length; i++) {
        const bullet = allBullets[i];

        bullet.x += bullet.direction.x * bulletSpeed;
        bullet.y += bullet.direction.y * bulletSpeed;
    }

    // проверяем столкновения наших пуль с врагами
    for (let i = 0; i < bullets.length; i++) {
        const playerBullet = bullets[i];

        for (let p = 0; p < otherPlayers.length; p++) {
            const otherPlayer = otherPlayers[p];

            if (
                isCollidingCircle(
                    {
                        x: playerBullet.x,
                        y: playerBullet.y,
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
                    if (b == playerBullet) {
                        socket.emit("enemyBulletDestroyed", playerBullet);

                        return false;
                    }

                    return true;
                });

                circle.score += 1;
            }
        }
    }

    // удаляем пули, которые вышли за пределы холста
    bullets = bullets.filter((bullet) => {
        return bullet.x > 0 && bullet.y > 0 && bullet.x < canvas.width && bullet.y < canvas.height;
    });

    for (let i = 0; i < otherPlayers.length; i++) {
        const otherPlayer = otherPlayers[i];

        otherPlayer.bullets = otherPlayer.bullets.filter((bullet) => {
            return bullet.x > 0 && bullet.y > 0 && bullet.x < canvas.width && bullet.y < canvas.height;
        });
    }

    if (isMouseDown && reloadTime <= 0) {
        shoot();

        reloadTime = reloadTimeMax;
    }

    if (reloadTime > 0) {
        reloadTime -= 1;
    }

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

    const bullet = {
        x: playerX,
        y: playerY,
        direction: direction,
        id: getRandomId(),
        playerId: myId,
    };

    bullets.push(bullet);

    socket.emit("enemyBulletCreated", bullet);
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

function getAverage(arr) {
    if (arr.length === 0) return 0; // если массив пустой, вернуть 0, чтобы избежать ошибок
    const sum = arr.reduce((acc, val) => acc + val); // суммируем все элементы массива
    return sum / arr.length; // делим сумму на количество элементов, чтобы найти среднее значение
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

    socket.on("playerDisconnected", (player) => {
        otherPlayers = otherPlayers.filter((pl) => {
            return pl.id !== player.id;
        });
    });

    socket.on("playerInfo", (playerInfo) => {
        // const dateNow = Date.now();
        // responseTimes.push(dateNow - lastResponseTime);
        // lastResponseTime = dateNow;

        // if (responseTimes.length > 100) {
        //     console.info("network speed ===>", getAverage(responseTimes));

        //     responseTimes = [];
        // }

        const pl = otherPlayers.find((pl) => pl.id === playerInfo.id);

        if (pl) {
            pl.xx = playerInfo.x;
            pl.yy = playerInfo.y;
            pl.score = playerInfo.score;

            pl.leftPressed = playerInfo.leftPressed;
            pl.rightPressed = playerInfo.rightPressed;
            pl.upPressed = playerInfo.upPressed;
            pl.downPressed = playerInfo.downPressed;
        }
    });

    socket.on("enemyBulletCreated", (bullet) => {
        const pl = otherPlayers.find((pl) => pl.id === bullet.playerId);

        if (pl) {
            pl.bullets.push(bullet);
        }
    });

    socket.on("enemyBulletDestroyed", (bullet) => {
        const pl = otherPlayers.find((pl) => pl.id === bullet.playerId);

        if (pl) {
            pl.bullets = pl.bullets.filter((b) => b.id !== bullet.id);
        }
    });

    // socket.emit("chat message", input.value);
}

initSockets();

setInterval(() => {
    console.info(bullets, otherPlayers);
}, 10000);
