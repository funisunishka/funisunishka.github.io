const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let spaceship, planets, stars, meteors, explosions, score, frames, lives;
let gameOver = false;
let qualified = false;
let gameStarted = false;

const gravity = 0.1; // Reduced gravity for mobile
const lift = -3; // Reduced lift for mobile
const qualificationScore = 10;

let planetImages = [];
let spaceshipImage = new Image();
let meteorImage = new Image();

function loadResources() {
    return fetch('resources.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load resources.json');
            }
            return response.json();
        })
        .then(data => {
            spaceshipImage.src = data.spaceship;
            meteorImage.src = data.meteor;

            let planetPromises = data.planets.map(src => {
                return new Promise((resolve, reject) => {
                    let img = new Image();
                    img.src = src;
                    img.onload = () => {
                        planetImages.push(img);
                        resolve();
                    };
                    img.onerror = () => {
                        reject(new Error(`Failed to load image: ${src}`));
                    };
                });
            });

            return Promise.all(planetPromises);
        })
        .catch(error => {
            console.error('Error loading resources:', error);
        });
}

function drawSpaceship() {
    ctx.save();
    ctx.translate(spaceship.x + spaceship.width / 2, spaceship.y + spaceship.height / 2);
    ctx.rotate(spaceship.angle);
    ctx.drawImage(spaceshipImage, -spaceship.width / 2, -spaceship.height / 2, spaceship.width, spaceship.height);
    ctx.restore();
}

function drawPlanet(planet) {
    ctx.save();
    ctx.translate(planet.x + planet.width / 2, planet.y + planet.height / 2);
    ctx.rotate(planet.rotation);
    ctx.drawImage(planet.image, -planet.width / 2, -planet.height / 2, planet.width, planet.height);
    ctx.restore();
}

function drawMeteor(meteor) {
    ctx.save();
    ctx.translate(meteor.x, meteor.y);
    ctx.rotate(meteor.angle);
    ctx.drawImage(meteorImage, -meteor.width / 2, -meteor.height / 2, meteor.width, meteor.height);
    ctx.restore();
}

function drawExplosion(explosion) {
    ctx.save();
    ctx.translate(explosion.x, explosion.y);
    ctx.fillStyle = `rgba(255, 69, 0, ${explosion.alpha})`;
    ctx.beginPath();
    ctx.arc(0, 0, explosion.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function createPlanet() {
    const planetImage = planetImages[Math.floor(Math.random() * planetImages.length)];
    const scale = 1.2 + Math.random() * 1.5; // Adjusted scale for mobile
    const width = planetImage.width * scale;
    const height = planetImage.height * scale;
    const y = Math.random() * (canvas.height - height - 50) + 25;
    planets.push({
        image: planetImage,
        x: canvas.width,
        y: y,
        baseY: y,
        width: width,
        height: height,
        rotation: 0,
        rotationSpeed: Math.random() * 0.02,
        wobbleSpeed: 0.01 + Math.random() * 0.02,
        wobbleMagnitude: 5 + Math.random() * 10
    });

    // Random chance to spawn another planet
    if (Math.random() < 0.2) { // Reduced chance for a second planet
        const planetImage2 = planetImages[Math.floor(Math.random() * planetImages.length)];
        const scale2 = 1.2 + Math.random() * 1.5;
        const width2 = planetImage2.width * scale2;
        const height2 = planetImage2.height * scale2;
        const y2 = Math.random() * (canvas.height - height2 - 50) + 25;
        planets.push({
            image: planetImage2,
            x: canvas.width + Math.random() * 200, // Slight horizontal offset
            y: y2,
            baseY: y2,
            width: width2,
            height: height2,
            rotation: 0,
            rotationSpeed: Math.random() * 0.02,
            wobbleSpeed: 0.01 + Math.random() * 0.02,
            wobbleMagnitude: 5 + Math.random() * 10
        });
    }
}

function createStars() {
    stars = [];
    const numStars = 2000; // Increased the number of stars
    const colors = ['#FFFFFF', '#fff0f0', '#fffbf0', '#f0fff0', '#f0f5ff'];
    for (let i = 0; i < numStars; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const radius = Math.random() * 2;
        const luminosity = Math.sqrt(Math.random() * 2) + 0.5;
        const color = colors[Math.floor(Math.random() * colors.length)];
        stars.push({ x, y, radius, luminosity, blinkSpeed: Math.random() * 0.02, color });
    }
}

function createMeteors() {
    meteors = [];
    const numMeteors = 3;
    for (let i = 0; i < numMeteors; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const width = 30 + Math.random() * 20;
        const height = width;
        const angle = Math.random() * Math.PI * 2;
        meteors.push({ x, y, width, height, speed: 1 + Math.random() * 2, angle });
    }
}

function createExplosion(x, y) {
    explosions.push({ x, y, radius: 0, alpha: 1 });
}

function drawStars() {
    ctx.save();
    for (const star of stars) {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        const luminosity = Math.abs(Math.sin(frames * star.blinkSpeed));
        ctx.fillStyle = `rgba(${hexToRgb(star.color)}, ${luminosity})`;
        ctx.shadowBlur = 5;
        ctx.shadowColor = star.color;
        ctx.fill();
    }
    ctx.restore();
}

function drawGradientBackground() {
    const gradient = ctx.createRadialGradient(
        canvas.width / 2, 
        canvas.height / 2, 
        Math.abs(Math.sin(frames * 0.01)) * 100 + 100, // Center radius
        canvas.width / 2,
        canvas.height / 2,
        canvas.width
    );
    gradient.addColorStop(0, '#000000');
    gradient.addColorStop(0.5, '#1a1a40'); // Mid dark blue
    gradient.addColorStop(1, '#221d7a'); // Dark purple
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = (bigint & 255);
    return `${r}, ${g}, ${b}`;
}

function updateStars() {
    for (const star of stars) {
        star.x -= 0.5;
        if (star.x < 0) {
            star.x = canvas.width;
            star.y = Math.random() * canvas.height;
        }
    }
}

function updateMeteors() {
    for (let i = meteors.length - 1; i >= 0; i--) {
        const meteor = meteors[i];
        meteor.x -= meteor.speed * Math.cos(meteor.angle);
        meteor.y -= meteor.speed * Math.sin(meteor.angle);

        if (meteor.x < -meteor.width || meteor.y < -meteor.height || meteor.y > canvas.height) {
            meteor.x = canvas.width + meteor.width;
            meteor.y = Math.random() * canvas.height;
            meteor.angle = Math.random() * Math.PI * 2;
        }

        // Check for collisions with spaceship
        if (
            spaceship.x < meteor.x + meteor.width &&
            spaceship.x + spaceship.width > meteor.x &&
            spaceship.y < meteor.y + meteor.height &&
            spaceship.y + spaceship.height > meteor.y
        ) {
            createExplosion(meteor.x, meteor.y);
            meteors.splice(i, 1); // Remove the meteor
            if (gameStarted) {
                lives--;
                if (lives <= 0) {
                    endGame();
                }
            }
        }

        // Check for collisions with planets
        for (let j = 0; j < planets.length; j++) {
            const planet = planets[j];
            if (
                meteor.x < planet.x + planet.width &&
                meteor.x + meteor.width > planet.x &&
                meteor.y < planet.y + planet.height &&
                meteor.y + meteor.height > planet.y
            ) {
                createExplosion(meteor.x, meteor.y);
                meteors.splice(i, 1); // Remove the meteor
                break;
            }
        }
    }
}

function updateExplosions() {
    for (let i = explosions.length - 1; i >= 0; i--) {
        const explosion = explosions[i];
        explosion.radius += 2;
        explosion.alpha -= 0.02;
        if (explosion.alpha <= 0) {
            explosions.splice(i, 1); // Remove the explosion
        }
    }
}

function checkCollision(obj1, obj2) {
    const distX = obj1.x + obj1.width / 2 - (obj2.x + obj2.width / 2);
    const distY = obj1.y + obj1.height / 2 - (obj2.y + obj2.height / 2);
    const distance = Math.sqrt(distX * distX + distY * distY);

    return distance < (obj1.width + obj2.width) / 2;
}

function update() {
    if (gameStarted) {
        // Apply gravity
        spaceship.dy += gravity;
        spaceship.y += spaceship.dy;
    } else {
        // Simple AI to keep the spaceship afloat
        if (frames % 20 === 0) {
            spaceship.dy = lift;
        }
        spaceship.dy += gravity;
        spaceship.y += spaceship.dy;
        spaceship.y = Math.max(0, Math.min(canvas.height - spaceship.height, spaceship.y));
    }

    // Tilt spaceship
    spaceship.angle = Math.min(Math.PI / 6, Math.max(-Math.PI / 6, spaceship.dy / 20));

    // Create new planets
    if (frames % 150 === 0) { // Less frequent planet spawning
        createPlanet();
    }

    // Move and draw planets
    const remainingPlanets = [];
    for (let i = 0; i < planets.length; i++) {
        planets[i].x -= 3; // Adjusted speed for mobile
        planets[i].rotation += planets[i].rotationSpeed;
        planets[i].y = planets[i].baseY + Math.sin(frames * planets[i].wobbleSpeed) * planets[i].wobbleMagnitude;

        drawPlanet(planets[i]);

        // Check for collisions
        if (checkCollision(spaceship, planets[i])) {
            if (gameStarted) {
                createExplosion(spaceship.x, spaceship.y);
                lives--;
                if (lives <= 0) {
                    endGame();
                    return;
                }
            }
        }

        // Keep planets that are still visible
        if (planets[i].x + planets[i].width > 0) {
            remainingPlanets.push(planets[i]);
        } else {
            if (gameStarted) {
                score++;
                document.getElementById('score').innerText = `Score: ${score}`;
                if (score >= qualificationScore && !qualified) {
                    qualified = true;
                    document.getElementById('qualified').style.display = 'block';
                    document.getElementById('next-level').style.display = 'block';
                    setCookie('qualified', 'true', 365);
                    setTimeout(() => {
                        document.getElementById('qualified').style.display = 'none';
                    }, 3000);
                }
            }
        }
    }
    planets = remainingPlanets;

    // Check for hitting the ground or ceiling
    if (spaceship.y + spaceship.height > canvas.height || spaceship.y < 0) {
        if (gameStarted) {
            createExplosion(spaceship.x, spaceship.y);
            lives--;
            if (lives <= 0) {
                endGame();
            }
        }
    }

    // Draw spaceship
    drawSpaceship();
}

function animate() {
    if (!gameOver) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGradientBackground(); // Draw gradient background
        drawStars(); // Draw the background stars
        updateStars(); // Update star positions
        updateMeteors(); // Update meteor positions
        for (const meteor of meteors) {
            drawMeteor(meteor);
        }
        updateExplosions(); // Update and draw explosions
        for (const explosion of explosions) {
            drawExplosion(explosion);
        }
        update();
        frames++;
        requestAnimationFrame(animate);
    }
}

function endGame() {
    gameOver = true;
    document.getElementById('restart').style.display = 'block';
    document.getElementById('instructions').style.display = 'block';
}

function init() {
    spaceship = {
        x: 200, // Starting x position
        y: canvas.height / 2,
        width: 40,
        height: 30,
        dy: 0,
        angle: 0
    };

    planets = [];
    stars = [];
    meteors = [];
    explosions = [];
    score = 0;
    frames = 0;
    lives = 3;
    gameOver = false;

    createStars(); // Initialize the stars
    createMeteors(); // Initialize the meteors

    document.getElementById('score').innerText = `Score: ${score}`;
    document.getElementById('restart').style.display = 'none';
    document.getElementById('instructions').style.display = 'block';

    animate();
}

function startGame() {
    loadResources().then(() => {
        const qualifiedCookie = getCookie('qualified');
        if (qualifiedCookie === 'true') {
            qualified = true;
            document.getElementById('next-level').style.display = 'block';
        }

        document.getElementById('start').style.display = 'block';

        const controlHandler = (event) => {
            if (event.type === 'touchstart' || event.type === 'mousedown') {
                spaceship.dy = lift;
                gameStarted = true;
                document.getElementById('instructions').style.display = 'none';
            }
        };

        canvas.addEventListener('touchstart', controlHandler);
        canvas.addEventListener('mousedown', controlHandler);

        document.getElementById('start').addEventListener('click', () => {
            document.getElementById('start').style.display = 'none';
            gameStarted = true;
            document.getElementById('instructions').style.display = 'none';
            init();
            document.getElementById('backgroundMusic').play();
        });

        document.getElementById('restart').addEventListener('click', () => {
            document.getElementById('restart').style.display = 'none';
            gameStarted = true;
            init();
            document.getElementById('backgroundMusic').play();
        });
    });
}

function setCookie(name, value, days) {
    const d = new Date();
    d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + d.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

function getCookie(name) {
    const cname = name + "=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(cname) == 0) {
            return c.substring(cname.length, c.length);
        }
    }
    return "";
}

startGame();
