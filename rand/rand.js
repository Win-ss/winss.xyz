
let currentGame = null;
let playerCount = 1;
let gameLoop = null;


document.addEventListener('contextmenu', (e) => {
    if (currentGame) {
        e.preventDefault();
    }
});

document.addEventListener('selectstart', (e) => {
    if (currentGame) {
        e.preventDefault();
    }
});


const singlePlayerGames = [
    'blockBreaker',
    'asteroidDodge', 
    'snakeClassic',
    'quickClicker',
    'pongVsCPU',
    'tankVsCPU',
    'ticTacToe'
];

const twoPlayerGames = [
    'pongShowdown',
    'tankBattle',
    'ticTacToe'
];


function selectPlayers(count) {
    playerCount = count;
    const availableGames = count === 1 ? singlePlayerGames : twoPlayerGames;
    const randomGame = availableGames[Math.floor(Math.random() * availableGames.length)];
    startGame(randomGame);
}

function showPlayerSelect() {
    if (gameLoop) {
        clearInterval(gameLoop);
        gameLoop = null;
    }
    
    
    const leftDisplays = document.querySelectorAll('.left-display');
    const rightDisplays = document.querySelectorAll('.right-display');
    leftDisplays.forEach(display => display.remove());
    rightDisplays.forEach(display => display.remove());
    
    document.getElementById('playerSelectScreen').classList.remove('hidden');
    document.getElementById('gameScreen').classList.add('hidden');
    document.getElementById('gameSubtitle').classList.remove('hidden');
    document.querySelector('.title').textContent = 'Rand!';
    currentGame = null;
}

function startGame(gameName) {
    
    const leftDisplays = document.querySelectorAll('.left-display');
    const rightDisplays = document.querySelectorAll('.right-display');
    leftDisplays.forEach(display => display.remove());
    rightDisplays.forEach(display => display.remove());
    
    document.getElementById('playerSelectScreen').classList.add('hidden');
    document.getElementById('gameScreen').classList.remove('hidden');
    document.getElementById('gameSubtitle').classList.add('hidden');
    
    currentGame = gameName;
    
    
    switch(gameName) {
        case 'blockBreaker':
            initBlockBreaker();
            break;
        case 'asteroidDodge':
            initAsteroidDodge();
            break;
        case 'snakeClassic':
            initSnakeClassic();
            break;
        case 'quickClicker':
            initQuickClicker();
            break;
        case 'pongShowdown':
            initPongShowdown();
            break;
        case 'tankBattle':
            initTankBattle();
            break;
        case 'pongVsCPU':
            initPongVsCPU();
            break;
        case 'tankVsCPU':
            initTankVsCPU();
            break;
        case 'ticTacToe':
            initTicTacToe();
            break;
    }
}


function createCanvas(width = 800, height = 400) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.style.border = '2px solid rgba(255,255,255,0.2)';
    canvas.tabIndex = 0; 
    
    
    setTimeout(() => {
        canvas.focus();
    }, 100);
    
    
    canvas.addEventListener('click', () => {
        canvas.focus();
    });
    
    return canvas;
}

function showGameOver(title, message, score = null) {
    const gameArea = document.getElementById('gameArea');
    const gameOverDiv = document.createElement('div');
    gameOverDiv.className = 'game-over-screen';
    gameOverDiv.innerHTML = `
        <h3>${title}</h3>
        <p>${message}</p>
        ${score !== null ? `<p>Score: ${score}</p>` : ''}
        <button class="control-btn" onclick="showPlayerSelect()">Play Again</button>
    `;
    gameArea.appendChild(gameOverDiv);
}


function initBlockBreaker() {
    document.querySelector('.title').textContent = 'Block Breaker Blast';
    const gameArea = document.getElementById('gameArea');
    const gameControls = document.getElementById('gameControls');
    
    gameArea.innerHTML = '';
    gameControls.innerHTML = '<p>Use arrow keys or mouse to move paddle</p>';
    
    const canvas = createCanvas(1200, 700);
    gameArea.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    
    
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    function playBrickBreakSound() {
        try {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.type = 'sawtooth';
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (e) {
            console.log('Audio not supported');
        }
    }
    
    function playPaddleBounceSound() {
        try {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            
            oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(150, audioContext.currentTime + 0.06);
            
            gainNode.gain.setValueAtTime(0.25, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.06);
            
            oscillator.type = 'square';
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.06);
        } catch (e) {
            console.log('Audio not supported');
        }
    }
    
    function playWallHitSound() {
        try {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            
            oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.04);
            
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.04);
            
            oscillator.type = 'triangle';
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.04);
        } catch (e) {
            console.log('Audio not supported');
        }
    }
    
    function playLifeLostSound() {
        try {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            
            oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(110, audioContext.currentTime + 0.5);
            
            gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.type = 'sine';
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (e) {
            console.log('Audio not supported');
        }
    }
    
    const game = {
        paddle: { x: 550, y: 660, width: 100, height: 15, speed: 8 },
        ball: { x: 600, y: 500, radius: 8, dx: 4, dy: -4 },
        blocks: [],
        score: 0,
        lives: 3
    };
    
    
    for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 14; col++) {
            game.blocks.push({
                x: col * 85 + 40,
                y: row * 30 + 50,
                width: 80,
                height: 25,
                destroyed: false
            });
        }
    }
    
    
    const scoreDiv = document.createElement('div');
    scoreDiv.className = 'score-display';
    scoreDiv.innerHTML = 'Score: <span id="blockScore">0</span>';
    gameArea.appendChild(scoreDiv);
    
    const livesDiv = document.createElement('div');
    livesDiv.className = 'lives-display';
    livesDiv.innerHTML = 'Lives: <span id="blockLives">3</span>';
    gameArea.appendChild(livesDiv);
    
    let keys = {};
    let mouseX = 400;
    
    document.addEventListener('keydown', (e) => {
        if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
        }
        keys[e.key] = true;
    });
    document.addEventListener('keyup', (e) => {
        if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
        }
        keys[e.key] = false;
    });
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
    });
    
    function update() {
        
        if (keys['ArrowLeft'] && game.paddle.x > 0) {
            game.paddle.x -= game.paddle.speed;
        }
        if (keys['ArrowRight'] && game.paddle.x < canvas.width - game.paddle.width) {
            game.paddle.x += game.paddle.speed;
        }
        
        
        game.paddle.x = Math.max(0, Math.min(canvas.width - game.paddle.width, mouseX - game.paddle.width / 2));
        
        
        game.ball.x += game.ball.dx;
        game.ball.y += game.ball.dy;
        
        
        if (game.ball.x <= game.ball.radius || game.ball.x >= canvas.width - game.ball.radius) {
            game.ball.dx = -game.ball.dx;
            playWallHitSound();
        }
        if (game.ball.y <= game.ball.radius) {
            game.ball.dy = -game.ball.dy;
            playWallHitSound();
        }
        
        
        if (game.ball.y + game.ball.radius >= game.paddle.y &&
            game.ball.x >= game.paddle.x &&
            game.ball.x <= game.paddle.x + game.paddle.width &&
            game.ball.dy > 0) {
            game.ball.dy = -game.ball.dy;
            playPaddleBounceSound();
            
            
            const hitPos = (game.ball.x - game.paddle.x) / game.paddle.width;
            game.ball.dx = 8 * (hitPos - 0.5);
        }
        
        
        if (game.ball.y > canvas.height) {
            game.lives--;
            document.getElementById('blockLives').textContent = game.lives;
            playLifeLostSound();
            
            if (game.lives <= 0) {
                clearInterval(gameLoop);
                showGameOver('Game Over!', 'All lives lost!', game.score);
                return;
            }
            
            
            game.ball.x = 600;
            game.ball.y = 500;
            game.ball.dx = 4;
            game.ball.dy = -4;
        }
        
        
        game.blocks.forEach(block => {
            if (!block.destroyed &&
                game.ball.x + game.ball.radius >= block.x &&
                game.ball.x - game.ball.radius <= block.x + block.width &&
                game.ball.y + game.ball.radius >= block.y &&
                game.ball.y - game.ball.radius <= block.y + block.height) {
                
                block.destroyed = true;
                playBrickBreakSound();
                
                
                const ballCenterX = game.ball.x;
                const ballCenterY = game.ball.y;
                const blockCenterX = block.x + block.width / 2;
                const blockCenterY = block.y + block.height / 2;
                
                const dx = ballCenterX - blockCenterX;
                const dy = ballCenterY - blockCenterY;
                
                
                if (Math.abs(dx / block.width) > Math.abs(dy / block.height)) {
                    game.ball.dx = -game.ball.dx; 
                } else {
                    game.ball.dy = -game.ball.dy; 
                }
                
                game.score += 10;
                document.getElementById('blockScore').textContent = game.score;
            }
        });
        
        
        if (game.blocks.every(block => block.destroyed)) {
            clearInterval(gameLoop);
            showGameOver('You Win!', 'All blocks destroyed!', game.score);
            return;
        }
    }
    
    function draw() {
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        
        ctx.fillStyle = '#9e59d6';
        ctx.fillRect(game.paddle.x, game.paddle.y, game.paddle.width, game.paddle.height);
        
        
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(game.ball.x, game.ball.y, game.ball.radius, 0, Math.PI * 2);
        ctx.fill();
        
        
        game.blocks.forEach(block => {
            if (!block.destroyed) {
                ctx.fillStyle = '#b767f8';
                ctx.fillRect(block.x, block.y, block.width, block.height);
                ctx.strokeStyle = '#ffffff';
                ctx.strokeRect(block.x, block.y, block.width, block.height);
            }
        });
    }
    
    gameLoop = setInterval(() => {
        update();
        draw();
    }, 1000/60);
}


function initAsteroidDodge() {
    document.querySelector('.title').textContent = 'Asteroid Dodge';
    const gameArea = document.getElementById('gameArea');
    const gameControls = document.getElementById('gameControls');
    
    gameArea.innerHTML = '';
    gameControls.innerHTML = '<p>Use WASD or Arrow keys to move your ship</p>';
    
    const canvas = createCanvas(1200, 700);
    gameArea.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    
    const game = {
        ship: { x: 600, y: 350, width: 20, height: 20, speed: 6 },
        asteroids: [],
        score: 0,
        gameTime: 0
    };
    
    
    const scoreDiv = document.createElement('div');
    scoreDiv.className = 'score-display';
    scoreDiv.innerHTML = 'Score: <span id="asteroidScore">0</span>';
    gameArea.appendChild(scoreDiv);
    
    let keys = {};
    document.addEventListener('keydown', (e) => {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'w', 'W', 'a', 'A', 's', 'S', 'd', 'D'].includes(e.key)) {
            e.preventDefault();
        }
        keys[e.key] = true;
    });
    document.addEventListener('keyup', (e) => {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'w', 'W', 'a', 'A', 's', 'S', 'd', 'D'].includes(e.key)) {
            e.preventDefault();
        }
        keys[e.key] = false;
    });
    
    function spawnAsteroid() {
        const side = Math.floor(Math.random() * 4); 
        let x, y, dx, dy;
        
        switch(side) {
            case 0: 
                x = Math.random() * canvas.width;
                y = -30;
                dx = (Math.random() - 0.5) * 4;
                dy = Math.random() * 3 + 2;
                break;
            case 1: 
                x = canvas.width + 30;
                y = Math.random() * canvas.height;
                dx = -(Math.random() * 3 + 2);
                dy = (Math.random() - 0.5) * 4;
                break;
            case 2: 
                x = Math.random() * canvas.width;
                y = canvas.height + 30;
                dx = (Math.random() - 0.5) * 4;
                dy = -(Math.random() * 3 + 2);
                break;
            case 3: 
                x = -30;
                y = Math.random() * canvas.height;
                dx = Math.random() * 3 + 2;
                dy = (Math.random() - 0.5) * 4;
                break;
        }
        
        game.asteroids.push({
            x, y, dx, dy,
            size: Math.random() * 20 + 10,
            rotation: 0,
            rotSpeed: (Math.random() - 0.5) * 0.2
        });
    }
    
    function update() {
        game.gameTime++;
        
        
        if ((keys['ArrowLeft'] || keys['a'] || keys['A']) && game.ship.x > 0) {
            game.ship.x -= game.ship.speed;
        }
        if ((keys['ArrowRight'] || keys['d'] || keys['D']) && game.ship.x < canvas.width - game.ship.width) {
            game.ship.x += game.ship.speed;
        }
        if ((keys['ArrowUp'] || keys['w'] || keys['W']) && game.ship.y > 0) {
            game.ship.y -= game.ship.speed;
        }
        if ((keys['ArrowDown'] || keys['s'] || keys['S']) && game.ship.y < canvas.height - game.ship.height) {
            game.ship.y += game.ship.speed;
        }
        
        
        if (Math.random() < 0.02 + game.gameTime * 0.00001) {
            spawnAsteroid();
        }
        
        
        game.asteroids = game.asteroids.filter(asteroid => {
            asteroid.x += asteroid.dx;
            asteroid.y += asteroid.dy;
            asteroid.rotation += asteroid.rotSpeed;
            
            
            if (asteroid.x < -50 || asteroid.x > canvas.width + 50 ||
                asteroid.y < -50 || asteroid.y > canvas.height + 50) {
                game.score += 5; 
                document.getElementById('asteroidScore').textContent = game.score;
                return false;
            }
            
            
            const dx = asteroid.x - (game.ship.x + game.ship.width/2);
            const dy = asteroid.y - (game.ship.y + game.ship.height/2);
            const distance = Math.sqrt(dx*dx + dy*dy);
            
            if (distance < asteroid.size/2 + Math.min(game.ship.width, game.ship.height)/2) {
                clearInterval(gameLoop);
                showGameOver('Game Over!', 'Hit by asteroid!', game.score);
                return false;
            }
            
            return true;
        });
    }
    
    function draw() {
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        
        ctx.save();
        ctx.translate(game.ship.x + game.ship.width/2, game.ship.y + game.ship.height/2);
        ctx.fillStyle = '#9e59d6';
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(-8, 10);
        ctx.lineTo(8, 10);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        
        
        game.asteroids.forEach(asteroid => {
            ctx.save();
            ctx.translate(asteroid.x, asteroid.y);
            ctx.rotate(asteroid.rotation);
            ctx.fillStyle = '#b767f8';
            ctx.beginPath();
            ctx.arc(0, 0, asteroid.size/2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();
            ctx.restore();
        });
    }
    
    gameLoop = setInterval(() => {
        update();
        draw();
    }, 1000/60);
}


function initSnakeClassic() {
    document.querySelector('.title').textContent = 'Snake Classic';
    const gameArea = document.getElementById('gameArea');
    const gameControls = document.getElementById('gameControls');
    
    gameArea.innerHTML = '';
    gameControls.innerHTML = '<p>Use Arrow keys to control the snake</p>';
    
    const canvas = createCanvas(700, 700);
    gameArea.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    
    const gridSize = 100; 
    const game = {
        snake: [{x: 3, y: 3}], 
        direction: {x: 1, y: 0},
        food: {x: 5, y: 3},
        score: 0,
        gameSpeed: 400 
    };
    
    
    const scoreDiv = document.createElement('div');
    scoreDiv.className = 'score-display';
    scoreDiv.innerHTML = 'Score: <span id="snakeScore">0</span>';
    gameArea.appendChild(scoreDiv);
    
    function randomFood() {
        let newFood;
        do {
            newFood = {
                x: Math.floor(Math.random() * 7), 
                y: Math.floor(Math.random() * 7)  
            };
        } while (game.snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
        return newFood;
    }
    
    
    game.food = randomFood();
    
    document.addEventListener('keydown', (e) => {
        switch(e.key) {
            case 'ArrowUp':
                e.preventDefault();
                if (game.direction.y === 0) game.direction = {x: 0, y: -1};
                break;
            case 'ArrowDown':
                e.preventDefault();
                if (game.direction.y === 0) game.direction = {x: 0, y: 1};
                break;
            case 'ArrowLeft':
                e.preventDefault();
                if (game.direction.x === 0) game.direction = {x: -1, y: 0};
                break;
            case 'ArrowRight':
                e.preventDefault();
                if (game.direction.x === 0) game.direction = {x: 1, y: 0};
                break;
        }
    });
    
    function update() {
        const head = {...game.snake[0]};
        head.x += game.direction.x;
        head.y += game.direction.y;
        
        
        if (head.x < 0 || head.x >= 7 ||
            head.y < 0 || head.y >= 7) {
            clearInterval(gameLoop);
            showGameOver('Game Over!', 'Snake hit the wall!', game.score);
            return;
        }
        
        
        if (game.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
            clearInterval(gameLoop);
            showGameOver('Game Over!', 'Snake hit itself!', game.score);
            return;
        }
        
        game.snake.unshift(head);
        
        
        if (head.x === game.food.x && head.y === game.food.y) {
            game.score += 10;
            document.getElementById('snakeScore').textContent = game.score;
            game.food = randomFood();
            
            
            while (game.snake.some(segment => segment.x === game.food.x && segment.y === game.food.y)) {
                game.food = randomFood();
            }
            
            
            game.gameSpeed = Math.max(100, game.gameSpeed - 5);
            clearInterval(gameLoop);
            gameLoop = setInterval(() => {
                update();
                draw();
            }, game.gameSpeed);
        } else {
            game.snake.pop();
        }
    }
    
    function draw() {
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 7; i++) {
            ctx.beginPath();
            ctx.moveTo(i * gridSize, 0);
            ctx.lineTo(i * gridSize, canvas.height);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(0, i * gridSize);
            ctx.lineTo(canvas.width, i * gridSize);
            ctx.stroke();
        }
        
        
        game.snake.forEach((segment, index) => {
            if (index === 0) {
                ctx.fillStyle = '#b767f8'; 
            } else {
                ctx.fillStyle = '#9e59d6'; 
            }
            ctx.fillRect(segment.x * gridSize + 5, segment.y * gridSize + 5, gridSize - 10, gridSize - 10);
            
            
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(segment.x * gridSize + 5, segment.y * gridSize + 5, gridSize - 10, gridSize - 10);
        });
        
        
        ctx.fillStyle = '#ffeb3b';
        ctx.beginPath();
        ctx.arc(game.food.x * gridSize + gridSize/2, game.food.y * gridSize + gridSize/2, gridSize/2 - 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
    }
    
    gameLoop = setInterval(() => {
        update();
        draw();
    }, game.gameSpeed);
}


function initQuickClicker() {
    document.querySelector('.title').textContent = 'Quick Clicker Challenge';
    const gameArea = document.getElementById('gameArea');
    const gameControls = document.getElementById('gameControls');
    
    gameArea.innerHTML = '';
    gameControls.innerHTML = '<p>Click the targets as fast as possible!</p>';
    
    const canvas = createCanvas(1000, 600);
    gameArea.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    
    
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    function playTargetHitSound() {
        try {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.08);
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);
            
            oscillator.type = 'sine';
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.08);
        } catch (e) {
            console.log('Audio not supported');
        }
    }
    
    function playTargetSpawnSound() {
        try {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            
            oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.05);
            
            gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
            
            oscillator.type = 'triangle';
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.05);
        } catch (e) {
            console.log('Audio not supported');
        }
    }
    
    const game = {
        targets: [],
        score: 0,
        timeLeft: 30,
        targetSize: 40
    };
    
    
    const scoreDiv = document.createElement('div');
    scoreDiv.className = 'score-display';
    scoreDiv.innerHTML = 'Score: <span id="clickerScore">0</span>';
    gameArea.appendChild(scoreDiv);
    
    const timeDiv = document.createElement('div');
    timeDiv.className = 'lives-display';
    timeDiv.innerHTML = 'Time: <span id="clickerTime">30</span>s';
    gameArea.appendChild(timeDiv);
    
    function spawnTarget() {
        game.targets = [{
            x: Math.random() * (canvas.width - game.targetSize),
            y: Math.random() * (canvas.height - game.targetSize),
            time: 0
        }];
        playTargetSpawnSound();
    }
    
    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        
        game.targets = game.targets.filter(target => {
            const dx = clickX - (target.x + game.targetSize/2);
            const dy = clickY - (target.y + game.targetSize/2);
            const distance = Math.sqrt(dx*dx + dy*dy);
            
            if (distance <= game.targetSize/2) {
                game.score++;
                document.getElementById('clickerScore').textContent = game.score;
                playTargetHitSound();
                spawnTarget();
                return false;
            }
            return true;
        });
    });
    
    
    const timer = setInterval(() => {
        game.timeLeft--;
        document.getElementById('clickerTime').textContent = game.timeLeft;
        
        if (game.timeLeft <= 0) {
            clearInterval(timer);
            clearInterval(gameLoop);
            showGameOver('Time\'s Up!', `You clicked ${game.score} targets!`, game.score);
        }
    }, 1000);
    
    function update() {
        game.targets.forEach(target => target.time++);
        
        
        if (game.targets.length > 0 && game.targets[0].time > 120) { 
            game.targets = [];
        }
        
        
        if (game.targets.length === 0) {
            spawnTarget();
        }
    }
    
    function draw() {
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        
        game.targets.forEach(target => {
            const alpha = Math.max(0.3, 1 - target.time / 120);
            ctx.fillStyle = `rgba(183, 103, 248, ${alpha})`;
            ctx.beginPath();
            ctx.arc(target.x + game.targetSize/2, target.y + game.targetSize/2, game.targetSize/2, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.lineWidth = 2;
            ctx.stroke();
            
            
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(target.x + game.targetSize/2 - 10, target.y + game.targetSize/2);
            ctx.lineTo(target.x + game.targetSize/2 + 10, target.y + game.targetSize/2);
            ctx.moveTo(target.x + game.targetSize/2, target.y + game.targetSize/2 - 10);
            ctx.lineTo(target.x + game.targetSize/2, target.y + game.targetSize/2 + 10);
            ctx.stroke();
        });
    }
    
    spawnTarget(); 
    gameLoop = setInterval(() => {
        update();
        draw();
    }, 1000/60);
}


function initPongShowdown() {
    document.querySelector('.title').textContent = 'Pong Showdown';
    const gameArea = document.getElementById('gameArea');
    const gameControls = document.getElementById('gameControls');
    
    gameArea.innerHTML = '';
    gameControls.innerHTML = '<p>Player 1: W/S keys | Player 2: ↑/↓ keys | First to 5 wins!</p>';
    
    const canvas = createCanvas(1000, 600);
    gameArea.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    
    
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    function playPaddleHitSound() {
        try {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(300, audioContext.currentTime + 0.08);
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);
            
            oscillator.type = 'square';
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.08);
        } catch (e) {
            console.log('Audio not supported');
        }
    }
    
    function playWallBounceSound() {
        try {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            
            oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.05);
            
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
            
            oscillator.type = 'triangle';
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.05);
        } catch (e) {
            console.log('Audio not supported');
        }
    }
    
    function playScoreSound() {
        try {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            
            oscillator.frequency.setValueAtTime(220, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(440, audioContext.currentTime + 0.3);
            
            gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.type = 'sine';
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (e) {
            console.log('Audio not supported');
        }
    }
    
    function playPowerUpSound() {
        try {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            
            oscillator.frequency.setValueAtTime(523, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(784, audioContext.currentTime + 0.2);
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            
            oscillator.type = 'sine';
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (e) {
            console.log('Audio not supported');
        }
    }
    
    const game = {
        paddle1: {x: 20, y: 250, width: 15, height: 100, speed: 6},
        paddle2: {x: 965, y: 250, width: 15, height: 100, speed: 6},
        ball: {x: 500, y: 300, radius: 8, dx: 6, dy: 4}, 
        balls: [], 
        score1: 0,
        score2: 0,
        winScore: 5,
        powerUpActive: false,
        powerUpType: null, 
        powerUpTimer: 0,
        powerUpPulse: 0,
        baseBallSpeed: 6, 
        goalCooldown: 0, 
        ballPaused: false,
        speedBoostTimer: 0
    };
    
    
    const score1Div = document.createElement('div');
    score1Div.className = 'left-display';
    score1Div.innerHTML = '<div style="color: #4a7c29; font-weight: bold; margin-bottom: 6px; font-size: 0.9em;">PLAYER 1</div><div style="font-size: 1.8rem; color: #ffffff; font-weight: bold;"><span id="pongScore1">0</span></div>';
    document.body.appendChild(score1Div);
    
    const score2Div = document.createElement('div');
    score2Div.className = 'right-display';
    score2Div.innerHTML = '<div style="color: #b8a082; font-weight: bold; margin-bottom: 6px; font-size: 0.9em;">PLAYER 2</div><div style="font-size: 1.8rem; color: #ffffff; font-weight: bold;"><span id="pongScore2">0</span></div>';
    document.body.appendChild(score2Div);
    
    let keys = {};
    document.addEventListener('keydown', (e) => {
        if (['w', 'W', 's', 'S', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            e.preventDefault();
        }
        keys[e.key] = true;
    });
    document.addEventListener('keyup', (e) => {
        if (['w', 'W', 's', 'S', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            e.preventDefault();
        }
        keys[e.key] = false;
    });
    
    function resetBall() {
        game.ball.x = canvas.width / 2;
        game.ball.y = canvas.height / 2;
        game.ball.dx = (Math.random() > 0.5 ? 1 : -1) * game.baseBallSpeed;
        game.ball.dy = (Math.random() - 0.5) * 8;
        game.ball.radius = 8; 
        
        
        game.balls = [];
        game.powerUpActive = false;
        game.powerUpType = null;
        game.powerUpTimer = 0;
        game.powerUpPulse = 0;
        game.speedBoostTimer = 0; // Reset speed boost timer
        
        
        game.goalCooldown = 120; 
        game.ballPaused = true;
    }
    
    function triggerPowerUp() {
        
        
    }
    
    function activatePowerUp() {
        if (game.powerUpType === 'red') {
            
            const angle1 = Math.atan2(game.ball.dy, game.ball.dx) + 0.3;
            const angle2 = Math.atan2(game.ball.dy, game.ball.dx) - 0.3;
            const speed = Math.sqrt(game.ball.dx * game.ball.dx + game.ball.dy * game.ball.dy);
            
            game.balls.push({
                x: game.ball.x,
                y: game.ball.y,
                dx: Math.cos(angle1) * speed,
                dy: Math.sin(angle1) * speed,
                radius: 6
            });
            
            game.balls.push({
                x: game.ball.x,
                y: game.ball.y,
                dx: Math.cos(angle2) * speed,
                dy: Math.sin(angle2) * speed,
                radius: 6
            });
            
            
            game.ball.x = -100;
            game.ball.y = -100;
            
        } else if (game.powerUpType === 'green') {
            // Mega Ball powerup
            game.ball.radius = 14;
            const currentSpeed = Math.sqrt(game.ball.dx * game.ball.dx + game.ball.dy * game.ball.dy);
            const newSpeed = currentSpeed * 1.5;
            const angle = Math.atan2(game.ball.dy, game.ball.dx);
            game.ball.dx = Math.cos(angle) * newSpeed;
            game.ball.dy = Math.sin(angle) * newSpeed;
        } else if (game.powerUpType === 'yellow') {
            // Speed Boost powerup - doubles ball speed for 5 seconds
            const currentSpeed = Math.sqrt(game.ball.dx * game.ball.dx + game.ball.dy * game.ball.dy);
            const newSpeed = currentSpeed * 2.0; // Double speed
            const angle = Math.atan2(game.ball.dy, game.ball.dx);
            game.ball.dx = Math.cos(angle) * newSpeed;
            game.ball.dy = Math.sin(angle) * newSpeed;
            
            // Set timer for 5 seconds (300 frames at 60fps)
            game.speedBoostTimer = 300;
        }
    }
    
    function update() {
        
        if ((keys['w'] || keys['W']) && game.paddle1.y > 0) {
            game.paddle1.y -= game.paddle1.speed;
        }
        if ((keys['s'] || keys['S']) && game.paddle1.y < canvas.height - game.paddle1.height) {
            game.paddle1.y += game.paddle1.speed;
        }
        if (keys['ArrowUp'] && game.paddle2.y > 0) {
            game.paddle2.y -= game.paddle2.speed;
        }
        if (keys['ArrowDown'] && game.paddle2.y < canvas.height - game.paddle2.height) {
            game.paddle2.y += game.paddle2.speed;
        }
        
        // Handle speed boost timer separately (only for yellow powerup)
        if (game.speedBoostTimer > 0) {
            game.speedBoostTimer--;
            if (game.speedBoostTimer <= 0) {
                // Return speed to normal when timer expires
                const currentAngle = Math.atan2(game.ball.dy, game.ball.dx);
                game.ball.dx = Math.cos(currentAngle) * game.baseBallSpeed;
                game.ball.dy = Math.sin(currentAngle) * game.baseBallSpeed;
            }
        }
        
        // Handle goal cooldown
        if (game.goalCooldown > 0) {
            game.goalCooldown--;
            if (game.goalCooldown === 0) {
                game.ballPaused = false; 
            }
        }
        
        
        if (game.powerUpActive) {
            game.powerUpPulse += 0.2;
            game.powerUpTimer--;
            
            if (game.powerUpTimer === 300) { 
                activatePowerUp();
            }
            
            if (game.powerUpTimer <= 0) {
                // Reset all powerup effects except speed boost (which has its own timer)
                game.powerUpActive = false;
                game.powerUpType = null;
                game.balls = [];
                game.ball.radius = 8;
                
                // Only reset speed if not in speed boost mode
                if (game.speedBoostTimer <= 0) {
                    const currentAngle = Math.atan2(game.ball.dy, game.ball.dx);
                    game.ball.dx = Math.cos(currentAngle) * game.baseBallSpeed;
                    game.ball.dy = Math.sin(currentAngle) * game.baseBallSpeed;
                }
                
                // Reposition ball if it's hidden
                if (game.ball.x < 0) {
                    game.ball.x = canvas.width / 2;
                    game.ball.y = canvas.height / 2;
                }
            }
        }
        
        
        function handleBall(ball) {
            
            if (!game.ballPaused) {
                ball.x += ball.dx;
                ball.y += ball.dy;
            }
            
            
            if (ball.y <= ball.radius || ball.y >= canvas.height - ball.radius) {
                ball.dy = -ball.dy;
                playWallBounceSound();
            }
            
            
            if (ball.x <= game.paddle1.x + game.paddle1.width &&
                ball.y >= game.paddle1.y &&
                ball.y <= game.paddle1.y + game.paddle1.height &&
                ball.dx < 0) {
                ball.dx = -ball.dx;
                const hitPos = (ball.y - game.paddle1.y) / game.paddle1.height;
                ball.dy = 10 * (hitPos - 0.5); 
                playPaddleHitSound();
                
                
                if (!game.powerUpActive && Math.random() < 0.1) {
                    game.powerUpActive = true;
                    const rand = Math.random();
                    if (rand < 0.33) {
                        game.powerUpType = 'red'; // Split ball
                    } else if (rand < 0.66) {
                        game.powerUpType = 'green'; // Mega ball
                    } else {
                        game.powerUpType = 'yellow'; // Speed boost
                    }
                    game.powerUpTimer = 600; 
                    game.powerUpPulse = 0;
                    playPowerUpSound();
                }
            }
            
            if (ball.x >= game.paddle2.x &&
                ball.y >= game.paddle2.y &&
                ball.y <= game.paddle2.y + game.paddle2.height &&
                ball.dx > 0) {
                ball.dx = -ball.dx;
                const hitPos = (ball.y - game.paddle2.y) / game.paddle2.height;
                ball.dy = 10 * (hitPos - 0.5); 
                playPaddleHitSound();
                
                
                if (!game.powerUpActive && Math.random() < 0.1) {
                    game.powerUpActive = true;
                    const rand = Math.random();
                    if (rand < 0.33) {
                        game.powerUpType = 'red'; // Split ball
                    } else if (rand < 0.66) {
                        game.powerUpType = 'green'; // Mega ball
                    } else {
                        game.powerUpType = 'yellow'; // Speed boost
                    }
                    game.powerUpTimer = 600; 
                    game.powerUpPulse = 0;
                    playPowerUpSound();
                }
            }
            
            
            if (ball.x < 0) {
                game.score2++;
                document.getElementById('pongScore2').textContent = game.score2;
                playScoreSound();
                resetBall();
                return true; 
            } else if (ball.x > canvas.width) {
                game.score1++;
                document.getElementById('pongScore1').textContent = game.score1;
                playScoreSound();
                resetBall();
                return true; 
            }
            
            return false; 
        }
        
        
        if (game.ball.x >= 0) {
            handleBall(game.ball);
        }
        
        
        game.balls = game.balls.filter(ball => !handleBall(ball));
        
        
        if (game.score1 >= game.winScore) {
            clearInterval(gameLoop);
            showGameOver('Player 1 Wins!', `First to ${game.winScore} points!`);
        } else if (game.score2 >= game.winScore) {
            clearInterval(gameLoop);
            showGameOver('Player 2 Wins!', `First to ${game.winScore} points!`);
        }
    }
    
    function draw() {
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(canvas.width/2, 0);
        ctx.lineTo(canvas.width/2, canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);
        
        
        ctx.fillStyle = '#9e59d6';
        ctx.fillRect(game.paddle1.x, game.paddle1.y, game.paddle1.width, game.paddle1.height);
        ctx.fillRect(game.paddle2.x, game.paddle2.y, game.paddle2.width, game.paddle2.height);
        
        
        if (game.ball.x >= 0) {
            let ballColor = '#ffffff';
            let ballRadius = game.ball.radius;
            
            if (game.powerUpActive && game.powerUpTimer > 240) {
                
                const pulseIntensity = Math.sin(game.powerUpPulse) * 0.5 + 0.5;
                ballRadius = game.ball.radius + pulseIntensity * 3;
                
                if (game.powerUpType === 'red') {
                    ballColor = `rgba(255, ${Math.floor(100 + pulseIntensity * 155)}, ${Math.floor(100 + pulseIntensity * 155)}, 1)`;
                } else if (game.powerUpType === 'green') {
                    ballColor = `rgba(${Math.floor(100 + pulseIntensity * 155)}, 255, ${Math.floor(100 + pulseIntensity * 155)}, 1)`;
                } else if (game.powerUpType === 'yellow') {
                    ballColor = `rgba(255, 255, ${Math.floor(100 + pulseIntensity * 155)}, 1)`;
                }
            } else if (game.powerUpActive && game.powerUpType === 'green') {
                // Green mega ball active
                ballColor = '#00ff00';
            } else if (game.speedBoostTimer > 0) {
                // Yellow speed boost active - bright yellow with enhanced effect
                ballColor = '#ffff00';
                ballRadius = game.ball.radius + 2; // Slightly larger
            }
            
            ctx.fillStyle = ballColor;
            ctx.beginPath();
            ctx.arc(game.ball.x, game.ball.y, ballRadius, 0, Math.PI * 2);
            ctx.fill();
            
            
            // Add glow effect for active powerups or speed boost
            if (game.powerUpActive || game.speedBoostTimer > 0) {
                ctx.shadowColor = ballColor;
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.arc(game.ball.x, game.ball.y, ballRadius, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }
        
        
        if (game.balls.length > 0) {
            ctx.fillStyle = '#ff4444';
            ctx.shadowColor = '#ff4444';
            ctx.shadowBlur = 10;
            game.balls.forEach(ball => {
                ctx.beginPath();
                ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.shadowBlur = 0;
        }
        
        // Display powerup text
        if (game.powerUpActive && game.powerUpTimer > 240) {
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            if (game.powerUpType === 'red') {
                ctx.fillStyle = '#ff0000';
                ctx.fillText('SPLIT BALL!', canvas.width / 2, 50);
            } else if (game.powerUpType === 'green') {
                ctx.fillStyle = '#00ff00';
                ctx.fillText('MEGA BALL!', canvas.width / 2, 50);
            } else if (game.powerUpType === 'yellow') {
                ctx.fillStyle = '#ffff00';
                ctx.fillText('SPEED BOOST!', canvas.width / 2, 50);
            }
        }
        
        // Display active speed boost indicator
        if (game.speedBoostTimer > 0) {
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffff00';
            const timeLeft = Math.ceil(game.speedBoostTimer / 60);
            ctx.fillText(`SPEED! ${timeLeft}s`, canvas.width / 2, 80);
        }
    }
    
    gameLoop = setInterval(() => {
        update();
        draw();
    }, 1000/60);
}


function initTankBattle() {
    document.querySelector('.title').textContent = 'Tank Battle Arena';
    const gameArea = document.getElementById('gameArea');
    const gameControls = document.getElementById('gameControls');
    
    gameArea.innerHTML = '';
    gameControls.innerHTML = '<p><span style="color: #4a7c29;">P1 (Green):</span> WASD + Space to shoot | <span style="color: #b8a082;">P2 (Desert):</span> ↑↓←→ + Enter to shoot | First to 3 kills wins!</p>';
    
    const canvas = createCanvas(1000, 600);
    gameArea.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    
    
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    function playHitSound() {
        try {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.type = 'sawtooth';
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (e) {
            console.log('Audio not supported');
        }
    }
    
    function playDeathSound() {
        try {
            
            const oscillators = [];
            const gainNodes = [];
            
            
            const rumbleOsc = audioContext.createOscillator();
            const rumbleGain = audioContext.createGain();
            rumbleOsc.connect(rumbleGain);
            rumbleGain.connect(audioContext.destination);
            
            rumbleOsc.frequency.setValueAtTime(60, audioContext.currentTime);
            rumbleOsc.frequency.exponentialRampToValueAtTime(30, audioContext.currentTime + 0.6);
            rumbleGain.gain.setValueAtTime(0.6, audioContext.currentTime);
            rumbleGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
            rumbleOsc.type = 'square';
            
            
            const crackleOsc = audioContext.createOscillator();
            const crackleGain = audioContext.createGain();
            crackleOsc.connect(crackleGain);
            crackleGain.connect(audioContext.destination);
            
            crackleOsc.frequency.setValueAtTime(200, audioContext.currentTime);
            crackleOsc.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.4);
            crackleGain.gain.setValueAtTime(0.4, audioContext.currentTime);
            crackleGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
            crackleOsc.type = 'sawtooth';
            
            
            const sizzleOsc = audioContext.createOscillator();
            const sizzleGain = audioContext.createGain();
            sizzleOsc.connect(sizzleGain);
            sizzleGain.connect(audioContext.destination);
            
            sizzleOsc.frequency.setValueAtTime(800, audioContext.currentTime);
            sizzleOsc.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.2);
            sizzleGain.gain.setValueAtTime(0.3, audioContext.currentTime);
            sizzleGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            sizzleOsc.type = 'triangle';
            
            
            const bufferSize = audioContext.sampleRate * 0.6;
            const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }
            
            const noiseSource = audioContext.createBufferSource();
            const noiseGain = audioContext.createGain();
            const noiseFilter = audioContext.createBiquadFilter();
            
            noiseSource.buffer = noiseBuffer;
            noiseSource.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(audioContext.destination);
            
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.setValueAtTime(400, audioContext.currentTime);
            noiseFilter.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.6);
            
            noiseGain.gain.setValueAtTime(0.3, audioContext.currentTime);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
            
            
            rumbleOsc.start(audioContext.currentTime);
            rumbleOsc.stop(audioContext.currentTime + 0.6);
            
            crackleOsc.start(audioContext.currentTime);
            crackleOsc.stop(audioContext.currentTime + 0.4);
            
            sizzleOsc.start(audioContext.currentTime);
            sizzleOsc.stop(audioContext.currentTime + 0.2);
            
            noiseSource.start(audioContext.currentTime);
            noiseSource.stop(audioContext.currentTime + 0.6);
            
        } catch (e) {
            console.log('Audio not supported');
        }
    }
    
    function playShootSound() {
        try {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            
            oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.05);
            
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
            
            oscillator.type = 'triangle';
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.05);
        } catch (e) {
            console.log('Audio not supported');
        }
    }
    
    
    function generateObstacles() {
        const obstacles = [];
        const numObstacles = Math.floor(Math.random() * 6) + 5; 
        
        
        const safeZones = [
            {x: 50, y: 50, width: 100, height: 100},   
            {x: 750, y: 350, width: 150, height: 150}  
        ];
        
        for (let i = 0; i < numObstacles; i++) {
            let obstacle;
            let attempts = 0;
            
            do {
                attempts++;
                
                
                const obstacleType = Math.random();
                let width, height;
                
                if (obstacleType < 0.4) {
                    
                    width = Math.floor(Math.random() * 250) + 100;
                    height = Math.floor(Math.random() * 30) + 20;
                } else if (obstacleType < 0.7) {
                    
                    width = Math.floor(Math.random() * 30) + 20;
                    height = Math.floor(Math.random() * 200) + 80;
                } else if (obstacleType < 0.9) {
                    
                    const size = Math.floor(Math.random() * 80) + 40;
                    width = size;
                    height = size;
                } else {
                    
                    width = Math.floor(Math.random() * 120) + 80;
                    height = Math.floor(Math.random() * 120) + 80;
                }
                
                const x = Math.floor(Math.random() * (canvas.width - width - 40)) + 20;
                const y = Math.floor(Math.random() * (canvas.height - height - 40)) + 20;
                
                obstacle = {x, y, width, height, type: obstacleType};
                
                
                const overlapsWithSafeZone = safeZones.some(zone => 
                    obstacle.x < zone.x + zone.width &&
                    obstacle.x + obstacle.width > zone.x &&
                    obstacle.y < zone.y + zone.height &&
                    obstacle.y + obstacle.height > zone.y
                );
                
                
                const overlapsWithObstacle = obstacles.some(existing =>
                    obstacle.x < existing.x + existing.width + 40 &&
                    obstacle.x + obstacle.width + 40 > existing.x &&
                    obstacle.y < existing.y + existing.height + 40 &&
                    obstacle.y + obstacle.height + 40 > existing.y
                );
                
                if (!overlapsWithSafeZone && !overlapsWithObstacle) {
                    obstacles.push(obstacle);
                    break;
                }
            } while (attempts < 50); 
        }
        
        return obstacles;
    }
    
    const game = {
        tank1: {x: 100, y: 100, angle: 0, health: 3, speed: 3, size: 20, shootCooldown: 0},
        tank2: {x: 850, y: 450, angle: Math.PI, health: 3, speed: 3, size: 20, shootCooldown: 0},
        bullets: [],
        walls: generateObstacles(),
        kills1: 0,
        kills2: 0
    };
    
    
    const p1Div = document.createElement('div');
    p1Div.className = 'left-display';
    p1Div.innerHTML = '<div style="color: #4a7c29; font-weight: bold; margin-bottom: 6px; font-size: 0.9em;">PLAYER 1</div><div style="margin-bottom: 4px; font-size: 0.9em;">Kills: <span id="tankKills1" style="color: #ffffff; font-size: 1.3em; font-weight: bold;">0</span></div><div style="font-size: 0.9em;">HP: <span id="tankHP1" style="color: #ffffff; font-size: 1.3em; font-weight: bold;">3</span></div>';
    document.body.appendChild(p1Div);
    
    const p2Div = document.createElement('div');
    p2Div.className = 'right-display';
    p2Div.innerHTML = '<div style="color: #b8a082; font-weight: bold; margin-bottom: 6px; font-size: 0.9em;">PLAYER 2</div><div style="margin-bottom: 4px; font-size: 0.9em;">Kills: <span id="tankKills2" style="color: #ffffff; font-size: 1.3em; font-weight: bold;">0</span></div><div style="font-size: 0.9em;">HP: <span id="tankHP2" style="color: #ffffff; font-size: 1.3em; font-weight: bold;">3</span></div>';
    document.body.appendChild(p2Div);
    
    let keys = {};
    
    
    const keyDownHandler = (e) => {
        if (['w', 'W', 'a', 'A', 's', 'S', 'd', 'D', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Enter'].includes(e.key)) {
            e.preventDefault();
        }
        keys[e.key] = true;
    };
    
    const keyUpHandler = (e) => {
        if (['w', 'W', 'a', 'A', 's', 'S', 'd', 'D', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Enter'].includes(e.key)) {
            e.preventDefault();
        }
        keys[e.key] = false;
    };
    
    document.addEventListener('keydown', keyDownHandler);
    document.addEventListener('keyup', keyUpHandler);
    
    
    const originalGameLoop = gameLoop;
    const cleanup = () => {
        document.removeEventListener('keydown', keyDownHandler);
        document.removeEventListener('keyup', keyUpHandler);
        if (originalGameLoop) clearInterval(originalGameLoop);
    };
    
    function shootBullet(tank, player) {
        const bulletSpeed = 8;
        playShootSound();
        game.bullets.push({
            x: tank.x,
            y: tank.y,
            dx: Math.cos(tank.angle) * bulletSpeed,
            dy: Math.sin(tank.angle) * bulletSpeed,
            player: player,
            life: 120 
        });
    }
    
    function checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
    
    function resetTanks() {
        game.tank1 = {x: 100, y: 100, angle: 0, health: 3, speed: 3, size: 20, shootCooldown: 0};
        game.tank2 = {x: 850, y: 450, angle: Math.PI, health: 3, speed: 3, size: 20, shootCooldown: 0};
        game.bullets = [];
        game.walls = generateObstacles(); 
        document.getElementById('tankHP1').textContent = game.tank1.health;
        document.getElementById('tankHP2').textContent = game.tank2.health;
    }
    
    function update() {
        
        if (game.tank1.shootCooldown > 0) game.tank1.shootCooldown--;
        if (game.tank2.shootCooldown > 0) game.tank2.shootCooldown--;
        
        
        let newX1 = game.tank1.x;
        let newY1 = game.tank1.y;
        
        if (keys['a'] || keys['A']) {
            game.tank1.angle -= 0.05; 
        }
        if (keys['d'] || keys['D']) {
            game.tank1.angle += 0.05; 
        }
        if (keys['w'] || keys['W']) {
            newX1 += Math.cos(game.tank1.angle) * game.tank1.speed;
            newY1 += Math.sin(game.tank1.angle) * game.tank1.speed;
        }
        if (keys['s'] || keys['S']) {
            newX1 -= Math.cos(game.tank1.angle) * game.tank1.speed;
            newY1 -= Math.sin(game.tank1.angle) * game.tank1.speed;
        }
        if (keys[' '] && game.tank1.shootCooldown === 0) {
            shootBullet(game.tank1, 1);
            game.tank1.shootCooldown = 30; 
        }
        
        
        let newX2 = game.tank2.x;
        let newY2 = game.tank2.y;
        
        if (keys['ArrowLeft']) {
            game.tank2.angle -= 0.05; 
        }
        if (keys['ArrowRight']) {
            game.tank2.angle += 0.05; 
        }
        if (keys['ArrowUp']) {
            newX2 += Math.cos(game.tank2.angle) * game.tank2.speed;
            newY2 += Math.sin(game.tank2.angle) * game.tank2.speed;
        }
        if (keys['ArrowDown']) {
            newX2 -= Math.cos(game.tank2.angle) * game.tank2.speed;
            newY2 -= Math.sin(game.tank2.angle) * game.tank2.speed;
        }
        if (keys['Enter'] && game.tank2.shootCooldown === 0) {
            shootBullet(game.tank2, 2);
            game.tank2.shootCooldown = 30; 
        }
        
        
        const tank1Rect = {x: newX1 - game.tank1.size/2, y: newY1 - game.tank1.size/2, width: game.tank1.size, height: game.tank1.size};
        const tank2Rect = {x: newX2 - game.tank2.size/2, y: newY2 - game.tank2.size/2, width: game.tank2.size, height: game.tank2.size};
        
        let tank1CanMove = newX1 >= game.tank1.size/2 && newX1 <= canvas.width - game.tank1.size/2 &&
                          newY1 >= game.tank1.size/2 && newY1 <= canvas.height - game.tank1.size/2;
        let tank2CanMove = newX2 >= game.tank2.size/2 && newX2 <= canvas.width - game.tank2.size/2 &&
                          newY2 >= game.tank2.size/2 && newY2 <= canvas.height - game.tank2.size/2;
        
        game.walls.forEach(wall => {
            if (checkCollision(tank1Rect, wall)) tank1CanMove = false;
            if (checkCollision(tank2Rect, wall)) tank2CanMove = false;
        });
        
        if (tank1CanMove) {
            game.tank1.x = newX1;
            game.tank1.y = newY1;
        }
        if (tank2CanMove) {
            game.tank2.x = newX2;
            game.tank2.y = newY2;
        }
        
        
        game.bullets = game.bullets.filter(bullet => {
            bullet.x += bullet.dx;
            bullet.y += bullet.dy;
            bullet.life--;
            
            
            let hitWall = false;
            game.walls.forEach(wall => {
                if (bullet.x >= wall.x && bullet.x <= wall.x + wall.width &&
                    bullet.y >= wall.y && bullet.y <= wall.y + wall.height) {
                    hitWall = true;
                }
            });
            
            
            const tank1Dist = Math.sqrt((bullet.x - game.tank1.x)**2 + (bullet.y - game.tank1.y)**2);
            const tank2Dist = Math.sqrt((bullet.x - game.tank2.x)**2 + (bullet.y - game.tank2.y)**2);
            
            if (bullet.player !== 1 && tank1Dist < game.tank1.size/2) {
                game.tank1.health--;
                playHitSound();
                document.getElementById('tankHP1').textContent = game.tank1.health;
                if (game.tank1.health <= 0) {
                    playDeathSound();
                    game.kills2++;
                    document.getElementById('tankKills2').textContent = game.kills2;
                    if (game.kills2 >= 3) {
                        cleanup();
                        clearInterval(gameLoop);
                        gameLoop = null;
                        showGameOver('Desert Tank Wins!', 'First to 3 kills!');
                        return false;
                    }
                    resetTanks();
                }
                return false;
            }
            
            if (bullet.player !== 2 && tank2Dist < game.tank2.size/2) {
                game.tank2.health--;
                playHitSound();
                document.getElementById('tankHP2').textContent = game.tank2.health;
                if (game.tank2.health <= 0) {
                    playDeathSound();
                    game.kills1++;
                    document.getElementById('tankKills1').textContent = game.kills1;
                    if (game.kills1 >= 3) {
                        cleanup();
                        clearInterval(gameLoop);
                        gameLoop = null;
                        showGameOver('Green Tank Wins!', 'First to 3 kills!');
                        return false;
                    }
                    resetTanks();
                }
                return false;
            }
            
            return !hitWall && bullet.life > 0 && 
                   bullet.x >= 0 && bullet.x <= canvas.width &&
                   bullet.y >= 0 && bullet.y <= canvas.height;
        });
    }
    
    function draw() {
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        
        game.walls.forEach((wall, index) => {
            
            const hue = (index * 60) % 360;
            ctx.fillStyle = `hsl(${hue}, 30%, 35%)`;
            ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
            
            
            ctx.strokeStyle = `hsl(${hue}, 40%, 55%)`;
            ctx.lineWidth = 2;
            ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
            
            
            ctx.fillStyle = `hsl(${hue}, 50%, 45%)`;
            ctx.fillRect(wall.x + 2, wall.y + 2, wall.width - 4, Math.max(1, wall.height - 4));
        });
        
        
        ctx.save();
        ctx.translate(game.tank1.x, game.tank1.y);
        ctx.rotate(game.tank1.angle);
        
        ctx.fillStyle = '#2d5016'; 
        ctx.fillRect(-game.tank1.size/2, -game.tank1.size/2, game.tank1.size, game.tank1.size);
        
        ctx.fillStyle = '#4a7c29';
        ctx.fillRect(-game.tank1.size/2 + 2, -game.tank1.size/2 + 2, game.tank1.size - 4, game.tank1.size - 4);
        
        ctx.fillStyle = '#1a3009';
        ctx.fillRect(game.tank1.size/2-2, -2, 12, 4);
        ctx.restore();
        
        ctx.save();
        ctx.translate(game.tank2.x, game.tank2.y);
        ctx.rotate(game.tank2.angle);
        
        ctx.fillStyle = '#8b7355'; 
        ctx.fillRect(-game.tank2.size/2, -game.tank2.size/2, game.tank2.size, game.tank2.size);
        
        ctx.fillStyle = '#b8a082';
        ctx.fillRect(-game.tank2.size/2 + 2, -game.tank2.size/2 + 2, game.tank2.size - 4, game.tank2.size - 4);
        
        ctx.fillStyle = '#6b5a47';
        ctx.fillRect(game.tank2.size/2-2, -2, 12, 4);
        ctx.restore();
        
        
        ctx.fillStyle = '#ffeb3b';
        game.bullets.forEach(bullet => {
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
            ctx.fill();
        });
    }
    
    gameLoop = setInterval(() => {
        update();
        draw();
    }, 1000/60);
}


function initPongVsCPU() {
    document.querySelector('.title').textContent = 'Pong vs CPU';
    const gameArea = document.getElementById('gameArea');
    const gameControls = document.getElementById('gameControls');
    
    gameArea.innerHTML = '';
    gameControls.innerHTML = '<p>W/S keys or ↑/↓ keys to move paddle | First to 5 wins!</p>';
    
    const canvas = createCanvas(1000, 600);
    gameArea.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    
    
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    function playPaddleHitSound() {
        try {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(300, audioContext.currentTime + 0.08);
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);
            
            oscillator.type = 'square';
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.08);
        } catch (e) {
            console.log('Audio not supported');
        }
    }
    
    function playWallBounceSound() {
        try {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.05);
            
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
            
            oscillator.type = 'triangle';
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.05);
        } catch (e) {
            console.log('Audio not supported');
        }
    }
    
    function playScoreSound() {
        try {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(220, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(440, audioContext.currentTime + 0.3);
            
            gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.type = 'sine';
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (e) {
            console.log('Audio not supported');
        }
    }
    
    const game = {
        paddle1: {x: 20, y: 250, width: 15, height: 100, speed: 6}, 
        paddle2: {x: 965, y: 250, width: 15, height: 100, speed: 4.5}, 
        ball: {x: 500, y: 300, radius: 8, dx: 5, dy: 3},
        scorePlayer: 0,
        scoreCPU: 0,
        winScore: 5,
        goalCooldown: 0,
        ballPaused: false
    };
    
    
    const scorePlayerDiv = document.createElement('div');
    scorePlayerDiv.className = 'left-display';
    scorePlayerDiv.innerHTML = '<div style="color: #4a7c29; font-weight: bold; margin-bottom: 6px; font-size: 0.9em;">PLAYER</div><div style="font-size: 1.8rem; color: #ffffff; font-weight: bold;"><span id="pongPlayerScore">0</span></div>';
    document.body.appendChild(scorePlayerDiv);
    
    const scoreCPUDiv = document.createElement('div');
    scoreCPUDiv.className = 'right-display';
    scoreCPUDiv.innerHTML = '<div style="color: #b8a082; font-weight: bold; margin-bottom: 6px; font-size: 0.9em;">CPU</div><div style="font-size: 1.8rem; color: #ffffff; font-weight: bold;"><span id="pongCPUScore">0</span></div>';
    document.body.appendChild(scoreCPUDiv);
    
    let keys = {};
    document.addEventListener('keydown', (e) => {
        if (['w', 'W', 's', 'S', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            e.preventDefault();
        }
        keys[e.key] = true;
    });
    document.addEventListener('keyup', (e) => {
        if (['w', 'W', 's', 'S', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            e.preventDefault();
        }
        keys[e.key] = false;
    });
    
    function resetBall() {
        game.ball.x = canvas.width / 2;
        game.ball.y = canvas.height / 2;
        game.ball.dx = (Math.random() > 0.5 ? 1 : -1) * 5;
        game.ball.dy = (Math.random() - 0.5) * 6;
        game.ball.radius = 8;
        
        
        game.goalCooldown = 120; 
        game.ballPaused = true;
    }
    
    
    function updateCPU() {
        const paddleCenter = game.paddle2.y + game.paddle2.height / 2;
        const ballY = game.ball.y;
        
        
        if (game.ball.dx > 0) {
            if (ballY < paddleCenter - 10) {
                game.paddle2.y = Math.max(0, game.paddle2.y - game.paddle2.speed);
            } else if (ballY > paddleCenter + 10) {
                game.paddle2.y = Math.min(canvas.height - game.paddle2.height, game.paddle2.y + game.paddle2.speed);
            }
        }
    }
    
    function update() {
        
        if ((keys['w'] || keys['W'] || keys['ArrowUp']) && game.paddle1.y > 0) {
            game.paddle1.y -= game.paddle1.speed;
        }
        if ((keys['s'] || keys['S'] || keys['ArrowDown']) && game.paddle1.y < canvas.height - game.paddle1.height) {
            game.paddle1.y += game.paddle1.speed;
        }
        
        
        updateCPU();
        
        
        if (game.goalCooldown > 0) {
            game.goalCooldown--;
            if (game.goalCooldown === 0) {
                game.ballPaused = false;
            }
        }
        
        
        if (!game.ballPaused) {
            game.ball.x += game.ball.dx;
            game.ball.y += game.ball.dy;
        }
        
        
        if (game.ball.y <= game.ball.radius || game.ball.y >= canvas.height - game.ball.radius) {
            game.ball.dy = -game.ball.dy;
            playWallBounceSound();
        }
        
        
        if (game.ball.x <= game.paddle1.x + game.paddle1.width &&
            game.ball.y >= game.paddle1.y &&
            game.ball.y <= game.paddle1.y + game.paddle1.height &&
            game.ball.dx < 0) {
            game.ball.dx = -game.ball.dx;
            const hitPos = (game.ball.y - game.paddle1.y) / game.paddle1.height;
            game.ball.dy = 8 * (hitPos - 0.5);
            playPaddleHitSound();
        }
        
        
        if (game.ball.x >= game.paddle2.x &&
            game.ball.y >= game.paddle2.y &&
            game.ball.y <= game.paddle2.y + game.paddle2.height &&
            game.ball.dx > 0) {
            game.ball.dx = -game.ball.dx;
            const hitPos = (game.ball.y - game.paddle2.y) / game.paddle2.height;
            game.ball.dy = 8 * (hitPos - 0.5);
            playPaddleHitSound();
        }
        
        
        if (game.ball.x < 0) {
            game.scoreCPU++;
            document.getElementById('pongCPUScore').textContent = game.scoreCPU;
            playScoreSound();
            resetBall();
        } else if (game.ball.x > canvas.width) {
            game.scorePlayer++;
            document.getElementById('pongPlayerScore').textContent = game.scorePlayer;
            playScoreSound();
            resetBall();
        }
        
        
        if (game.scorePlayer >= game.winScore) {
            clearInterval(gameLoop);
            showGameOver('You Win!', `First to ${game.winScore} points!`, game.scorePlayer);
        } else if (game.scoreCPU >= game.winScore) {
            clearInterval(gameLoop);
            showGameOver('CPU Wins!', `CPU scored ${game.winScore} first!`, game.scorePlayer);
        }
    }
    
    function draw() {
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(canvas.width/2, 0);
        ctx.lineTo(canvas.width/2, canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);
        
        
        ctx.fillStyle = '#9e59d6';
        ctx.fillRect(game.paddle1.x, game.paddle1.y, game.paddle1.width, game.paddle1.height);
        ctx.fillStyle = '#ff6b6b'; 
        ctx.fillRect(game.paddle2.x, game.paddle2.y, game.paddle2.width, game.paddle2.height);
        
        
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(game.ball.x, game.ball.y, game.ball.radius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    gameLoop = setInterval(() => {
        update();
        draw();
    }, 1000/60);
}


function initTankVsCPU() {
    document.querySelector('.title').textContent = 'Tank vs CPU';
    const gameArea = document.getElementById('gameArea');
    const gameControls = document.getElementById('gameControls');
    
    gameArea.innerHTML = '';
    gameControls.innerHTML = '<p><span style="color: #4a7c29;">Player:</span> WASD + Space to shoot | Fight the CPU tank! First to 3 kills wins!</p>';
    
    const canvas = createCanvas(1000, 600);
    gameArea.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    
    
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    function playHitSound() {
        try {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.type = 'sawtooth';
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (e) {
            console.log('Audio not supported');
        }
    }
    
    function playDeathSound() {
        try {
            
            const oscillators = [];
            const gainNodes = [];
            
            
            const rumbleOsc = audioContext.createOscillator();
            const rumbleGain = audioContext.createGain();
            rumbleOsc.connect(rumbleGain);
            rumbleGain.connect(audioContext.destination);
            
            rumbleOsc.frequency.setValueAtTime(60, audioContext.currentTime);
            rumbleOsc.frequency.exponentialRampToValueAtTime(30, audioContext.currentTime + 0.6);
            rumbleGain.gain.setValueAtTime(0.6, audioContext.currentTime);
            rumbleGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
            rumbleOsc.type = 'square';
            
            
            const crackleOsc = audioContext.createOscillator();
            const crackleGain = audioContext.createGain();
            crackleOsc.connect(crackleGain);
            crackleGain.connect(audioContext.destination);
            
            crackleOsc.frequency.setValueAtTime(200, audioContext.currentTime);
            crackleOsc.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.4);
            crackleGain.gain.setValueAtTime(0.4, audioContext.currentTime);
            crackleGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
            crackleOsc.type = 'sawtooth';
            
            
            const sizzleOsc = audioContext.createOscillator();
            const sizzleGain = audioContext.createGain();
            sizzleOsc.connect(sizzleGain);
            sizzleGain.connect(audioContext.destination);
            
            sizzleOsc.frequency.setValueAtTime(800, audioContext.currentTime);
            sizzleOsc.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.2);
            sizzleGain.gain.setValueAtTime(0.3, audioContext.currentTime);
            sizzleGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            sizzleOsc.type = 'triangle';
            
            
            const bufferSize = audioContext.sampleRate * 0.6;
            const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }
            
            const noiseSource = audioContext.createBufferSource();
            const noiseGain = audioContext.createGain();
            const noiseFilter = audioContext.createBiquadFilter();
            
            noiseSource.buffer = noiseBuffer;
            noiseSource.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(audioContext.destination);
            
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.setValueAtTime(400, audioContext.currentTime);
            noiseFilter.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.6);
            
            noiseGain.gain.setValueAtTime(0.3, audioContext.currentTime);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
            
            
            rumbleOsc.start(audioContext.currentTime);
            rumbleOsc.stop(audioContext.currentTime + 0.6);
            
            crackleOsc.start(audioContext.currentTime);
            crackleOsc.stop(audioContext.currentTime + 0.4);
            
            sizzleOsc.start(audioContext.currentTime);
            sizzleOsc.stop(audioContext.currentTime + 0.2);
            
            noiseSource.start(audioContext.currentTime);
            
        } catch (e) {
            console.log('Audio not supported');
        }
    }
    
    function playShootSound() {
        try {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.type = 'square';
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (e) {
            console.log('Audio not supported');
        }
    }
    
    
    function generateObstacles() {
        const obstacles = [];
        const numObstacles = Math.floor(Math.random() * 6) + 5;
        
        const safeZones = [
            {x: 50, y: 50, width: 100, height: 100},
            {x: 750, y: 350, width: 150, height: 150}
        ];
        
        for (let i = 0; i < numObstacles; i++) {
            let validPosition = false;
            let obstacle;
            let attempts = 0;
            
            while (!validPosition && attempts < 50) {
                obstacle = {
                    x: Math.random() * (canvas.width - 60) + 30,
                    y: Math.random() * (canvas.height - 60) + 30,
                    width: Math.random() * 40 + 30,
                    height: Math.random() * 40 + 30
                };
                
                validPosition = true;
                for (const zone of safeZones) {
                    if (obstacle.x < zone.x + zone.width &&
                        obstacle.x + obstacle.width > zone.x &&
                        obstacle.y < zone.y + zone.height &&
                        obstacle.y + obstacle.height > zone.y) {
                        validPosition = false;
                        break;
                    }
                }
                attempts++;
            }
            
            if (validPosition) {
                obstacles.push(obstacle);
            }
        }
        
        return obstacles;
    }
    
    const game = {
        tankPlayer: {x: 100, y: 100, angle: 0, health: 3, speed: 3, size: 20, shootCooldown: 0},
        tankCPU: {x: 850, y: 450, angle: Math.PI, health: 3, speed: 2, size: 20, shootCooldown: 0, aiTimer: 0, targetAngle: Math.PI},
        bullets: [],
        walls: generateObstacles(),
        killsPlayer: 0,
        killsCPU: 0
    };
    
    
    const playerDiv = document.createElement('div');
    playerDiv.className = 'left-display';
    playerDiv.innerHTML = '<div style="color: #4a7c29; font-weight: bold; margin-bottom: 6px; font-size: 0.9em;">PLAYER</div><div style="font-size: 1.1rem; color: #ffffff; margin-bottom: 4px;">HP: <span id="tankPlayerHP">3</span></div><div style="font-size: 1.1rem; color: #ffffff;">Kills: <span id="tankPlayerKills">0</span></div>';
    document.body.appendChild(playerDiv);
    
    const cpuDiv = document.createElement('div');
    cpuDiv.className = 'right-display';
    cpuDiv.innerHTML = '<div style="color: #b8a082; font-weight: bold; margin-bottom: 6px; font-size: 0.9em;">CPU</div><div style="font-size: 1.1rem; color: #ffffff; margin-bottom: 4px;">HP: <span id="tankCPUHP">3</span></div><div style="font-size: 1.1rem; color: #ffffff;">Kills: <span id="tankCPUKills">0</span></div>';
    document.body.appendChild(cpuDiv);
    
    let keys = {};
    document.addEventListener('keydown', (e) => {
        if (['w', 'W', 'a', 'A', 's', 'S', 'd', 'D', ' '].includes(e.key)) {
            e.preventDefault();
        }
        keys[e.key] = true;
    });
    document.addEventListener('keyup', (e) => {
        if (['w', 'W', 'a', 'A', 's', 'S', 'd', 'D', ' '].includes(e.key)) {
            e.preventDefault();
        }
        keys[e.key] = false;
    });
    
    
    function updateCPU() {
        const cpu = game.tankCPU;
        const player = game.tankPlayer;
        
        
        const dx = player.x - cpu.x;
        const dy = player.y - cpu.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angleToPlayer = Math.atan2(dy, dx);
        
        cpu.aiTimer++;
        
        
        if (cpu.aiTimer % 20 === 0 || cpu.aiTimer === 1) { 
            cpu.targetAngle = angleToPlayer + (Math.random() - 0.5) * 0.3; 
        }
        
        
        let angleDiff = cpu.targetAngle - cpu.angle;
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        
        if (Math.abs(angleDiff) > 0.05) { 
            cpu.angle += Math.sign(angleDiff) * 0.08; 
        }
        
        
        if (distance > 120 && distance < 450) { 
            const newX = cpu.x + Math.cos(cpu.angle) * cpu.speed;
            const newY = cpu.y + Math.sin(cpu.angle) * cpu.speed;
            
            
            let canMove = true;
            for (const wall of game.walls) {
                if (newX + cpu.size > wall.x && newX - cpu.size < wall.x + wall.width &&
                    newY + cpu.size > wall.y && newY - cpu.size < wall.y + wall.height) {
                    canMove = false;
                    break;
                }
            }
            
            if (canMove && newX > cpu.size && newX < canvas.width - cpu.size &&
                newY > cpu.size && newY < canvas.height - cpu.size) {
                cpu.x = newX;
                cpu.y = newY;
            }
        }
        
        
        if (cpu.shootCooldown <= 0 && distance < 350 && Math.abs(angleDiff) < 0.2) {
            if (Math.random() < 0.035 || (distance < 200 && Math.random() < 0.05)) { 
                game.bullets.push({
                    x: cpu.x + Math.cos(cpu.angle) * (cpu.size + 5),
                    y: cpu.y + Math.sin(cpu.angle) * (cpu.size + 5),
                    dx: Math.cos(cpu.angle) * 8,
                    dy: Math.sin(cpu.angle) * 8,
                    owner: 'cpu'
                });
                playShootSound();
                cpu.shootCooldown = 40; 
            }
        }
        
        if (cpu.shootCooldown > 0) cpu.shootCooldown--;
    }
    
    function update() {
        
        if (keys['w'] || keys['W']) {
            const newX = game.tankPlayer.x + Math.cos(game.tankPlayer.angle) * game.tankPlayer.speed;
            const newY = game.tankPlayer.y + Math.sin(game.tankPlayer.angle) * game.tankPlayer.speed;
            
            let canMove = true;
            for (const wall of game.walls) {
                if (newX + game.tankPlayer.size > wall.x && newX - game.tankPlayer.size < wall.x + wall.width &&
                    newY + game.tankPlayer.size > wall.y && newY - game.tankPlayer.size < wall.y + wall.height) {
                    canMove = false;
                    break;
                }
            }
            
            if (canMove && newX > game.tankPlayer.size && newX < canvas.width - game.tankPlayer.size &&
                newY > game.tankPlayer.size && newY < canvas.height - game.tankPlayer.size) {
                game.tankPlayer.x = newX;
                game.tankPlayer.y = newY;
            }
        }
        if (keys['s'] || keys['S']) {
            const newX = game.tankPlayer.x - Math.cos(game.tankPlayer.angle) * game.tankPlayer.speed;
            const newY = game.tankPlayer.y - Math.sin(game.tankPlayer.angle) * game.tankPlayer.speed;
            
            let canMove = true;
            for (const wall of game.walls) {
                if (newX + game.tankPlayer.size > wall.x && newX - game.tankPlayer.size < wall.x + wall.width &&
                    newY + game.tankPlayer.size > wall.y && newY - game.tankPlayer.size < wall.y + wall.height) {
                    canMove = false;
                    break;
                }
            }
            
            if (canMove && newX > game.tankPlayer.size && newX < canvas.width - game.tankPlayer.size &&
                newY > game.tankPlayer.size && newY < canvas.height - game.tankPlayer.size) {
                game.tankPlayer.x = newX;
                game.tankPlayer.y = newY;
            }
        }
        if (keys['a'] || keys['A']) {
            game.tankPlayer.angle -= 0.1;
        }
        if (keys['d'] || keys['D']) {
            game.tankPlayer.angle += 0.1;
        }
        
        
        if (keys[' '] && game.tankPlayer.shootCooldown <= 0) {
            game.bullets.push({
                x: game.tankPlayer.x + Math.cos(game.tankPlayer.angle) * (game.tankPlayer.size + 5),
                y: game.tankPlayer.y + Math.sin(game.tankPlayer.angle) * (game.tankPlayer.size + 5),
                dx: Math.cos(game.tankPlayer.angle) * 8,
                dy: Math.sin(game.tankPlayer.angle) * 8,
                owner: 'player'
            });
            playShootSound();
            game.tankPlayer.shootCooldown = 30;
        }
        
        if (game.tankPlayer.shootCooldown > 0) game.tankPlayer.shootCooldown--;
        
        
        updateCPU();
        
        
        game.bullets = game.bullets.filter(bullet => {
            bullet.x += bullet.dx;
            bullet.y += bullet.dy;
            
            
            for (const wall of game.walls) {
                if (bullet.x >= wall.x && bullet.x <= wall.x + wall.width &&
                    bullet.y >= wall.y && bullet.y <= wall.y + wall.height) {
                    return false;
                }
            }
            
            
            const tanks = bullet.owner === 'player' ? [game.tankCPU] : [game.tankPlayer];
            for (const tank of tanks) {
                const dx = bullet.x - tank.x;
                const dy = bullet.y - tank.y;
                if (Math.sqrt(dx*dx + dy*dy) < tank.size + 3) {
                    tank.health--;
                    playHitSound();
                    
                    if (bullet.owner === 'player') {
                        document.getElementById('tankCPUHP').textContent = game.tankCPU.health;
                        if (game.tankCPU.health <= 0) {
                            game.killsPlayer++;
                            document.getElementById('tankPlayerKills').textContent = game.killsPlayer;
                            playDeathSound();
                            
                            if (game.killsPlayer >= 3) {
                                clearInterval(gameLoop);
                                showGameOver('You Win!', 'CPU tank destroyed!', game.killsPlayer);
                                return false;
                            }
                            
                            
                            game.tankCPU.health = 3;
                            game.tankCPU.x = 850;
                            game.tankCPU.y = 450;
                            game.tankCPU.angle = Math.PI;
                            document.getElementById('tankCPUHP').textContent = game.tankCPU.health;
                        }
                    } else {
                        document.getElementById('tankPlayerHP').textContent = game.tankPlayer.health;
                        if (game.tankPlayer.health <= 0) {
                            game.killsCPU++;
                            document.getElementById('tankCPUKills').textContent = game.killsCPU;
                            playDeathSound();
                            
                            if (game.killsCPU >= 3) {
                                clearInterval(gameLoop);
                                showGameOver('CPU Wins!', 'Your tank was destroyed!', game.killsPlayer);
                                return false;
                            }
                            
                            
                            game.tankPlayer.health = 3;
                            game.tankPlayer.x = 100;
                            game.tankPlayer.y = 100;
                            game.tankPlayer.angle = 0;
                            document.getElementById('tankPlayerHP').textContent = game.tankPlayer.health;
                        }
                    }
                    return false;
                }
            }
            
            
            return bullet.x > 0 && bullet.x < canvas.width && bullet.y > 0 && bullet.y < canvas.height;
        });
    }
    
    function draw() {
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        
        ctx.fillStyle = '#666666';
        game.walls.forEach(wall => {
            ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
            ctx.strokeStyle = '#888888';
            ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
        });
        
        
        ctx.save();
        ctx.translate(game.tankPlayer.x, game.tankPlayer.y);
        ctx.rotate(game.tankPlayer.angle);
        ctx.fillStyle = '#4a7c29';
        ctx.fillRect(-game.tankPlayer.size, -game.tankPlayer.size/2, game.tankPlayer.size*2, game.tankPlayer.size);
        ctx.fillStyle = '#2d4a18';
        ctx.fillRect(game.tankPlayer.size, -2, game.tankPlayer.size/2, 4);
        ctx.restore();
        
        
        ctx.save();
        ctx.translate(game.tankCPU.x, game.tankCPU.y);
        ctx.rotate(game.tankCPU.angle);
        ctx.fillStyle = '#b8a082';
        ctx.fillRect(-game.tankCPU.size, -game.tankCPU.size/2, game.tankCPU.size*2, game.tankCPU.size);
        ctx.fillStyle = '#8b7355';
        ctx.fillRect(game.tankCPU.size, -2, game.tankCPU.size/2, 4);
        ctx.restore();
        
        
        ctx.fillStyle = '#ffff00';
        game.bullets.forEach(bullet => {
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
            ctx.fill();
        });
    }
    
    gameLoop = setInterval(() => {
        update();
        draw();
    }, 1000/60);
}


function initTicTacToe() {
    document.querySelector('.title').textContent = 'Chaotic Tic-Tac-Toe';
    const gameArea = document.getElementById('gameArea');
    const gameControls = document.getElementById('gameControls');
    
    gameArea.innerHTML = '';
    
    // Generate random modifiers
    const modifiers = [
        { name: "Classic 3x3", description: "Standard Tic-Tac-Toe - First to 3 wins!", gridSize: 3, winCondition: 3 },
        { name: "Big Grid 4x4", description: "4x4 grid - First to 4 in a row wins!", gridSize: 4, winCondition: 4 },
        { name: "Mega Grid 5x5", description: "5x5 grid - First to 4 in a row wins!", gridSize: 5, winCondition: 4 },
        { name: "Reverse Tic-Tac-Toe", description: "Avoid getting 3 in a row - First to make 3 loses!", gridSize: 3, winCondition: 3, reverse: true }
    ];
    
    const randomModifier = modifiers[Math.floor(Math.random() * modifiers.length)];
    
    // Random events that can happen during the game
    const randomEvents = [
        {
            name: "The Glitch",
            description: "A random mark on the board changes!",
            trigger: () => game.board.flat().filter(cell => cell !== '').length >= 3,
            effect: () => {
                const filledCells = [];
                for (let i = 0; i < game.gridSize; i++) {
                    for (let j = 0; j < game.gridSize; j++) {
                        if (game.board[i][j] !== '' && game.board[i][j] !== '💥') {
                            filledCells.push({row: i, col: j});
                        }
                    }
                }
                if (filledCells.length > 0) {
                    const randomCell = filledCells[Math.floor(Math.random() * filledCells.length)];
                    game.board[randomCell.row][randomCell.col] = game.board[randomCell.row][randomCell.col] === 'X' ? 'O' : 'X';
                    showEventMessage("🔀 The Glitch activated! A mark has changed!");
                }
            }
        },
        {
            name: "The Great Collapse",
            description: "A random square becomes unusable!",
            trigger: () => game.moveCount >= 3,
            effect: () => {
                const emptyCells = [];
                for (let i = 0; i < game.gridSize; i++) {
                    for (let j = 0; j < game.gridSize; j++) {
                        if (game.board[i][j] === '') {
                            emptyCells.push({row: i, col: j});
                        }
                    }
                }
                if (emptyCells.length > 0) {
                    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
                    game.board[randomCell.row][randomCell.col] = '💥';
                    showEventMessage("💥 The Great Collapse! A square is now unusable!");
                }
            }
        },
        {
            name: "Swap Places",
            description: "Players switch markers for one turn!",
            trigger: () => game.moveCount >= 2,
            effect: () => {
                game.swapNextTurn = true;
                showEventMessage("🔄 Swap Places! Markers are switched for the next turn!");
            }
        }
    ];
    
    const game = {
        board: [],
        currentPlayer: 'X',
        gridSize: randomModifier.gridSize,
        winCondition: randomModifier.winCondition,
        reverse: randomModifier.reverse || false,
        gameOver: false,
        moveCount: 0,
        isSinglePlayer: playerCount === 1,
        swapNextTurn: false,
        eventsTriggered: [],
        eventCooldown: 0,
        modifierName: randomModifier.name
    };
    
    // Initialize board
    for (let i = 0; i < game.gridSize; i++) {
        game.board[i] = [];
        for (let j = 0; j < game.gridSize; j++) {
            game.board[i][j] = '';
        }
    }
    
    // Create displays following the existing format
    const currentPlayerDiv = document.createElement('div');
    currentPlayerDiv.className = 'score-display';
    currentPlayerDiv.innerHTML = 'Player: <span id="currentPlayerSpan">X</span>';
    gameArea.appendChild(currentPlayerDiv);
    
    const moveCountDiv = document.createElement('div');
    moveCountDiv.className = 'lives-display';
    moveCountDiv.innerHTML = 'Moves: <span id="moveCounter">0</span>';
    gameArea.appendChild(moveCountDiv);
    
    // Create main container for centered content
    const centerContainer = document.createElement('div');
    centerContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        gap: 20px;
    `;
    gameArea.appendChild(centerContainer);
    
    // Display modifier info at the top
    const modifierDiv = document.createElement('div');
    modifierDiv.className = 'modifier-display';
    modifierDiv.innerHTML = `
        <h3>🎲 ${randomModifier.name}</h3>
        <p>${randomModifier.description}</p>
    `;
    centerContainer.appendChild(modifierDiv);
    
    // Create game board
    const boardContainer = document.createElement('div');
    boardContainer.className = 'tic-tac-toe-board';
    boardContainer.style.cssText = `
        display: grid;
        grid-template-columns: repeat(${game.gridSize}, 1fr);
        gap: 4px;
        max-width: 400px;
        background: rgba(255,255,255,0.1);
        padding: 10px;
        border-radius: 10px;
    `;
    
    // Create cells
    for (let i = 0; i < game.gridSize; i++) {
        for (let j = 0; j < game.gridSize; j++) {
            const cell = document.createElement('button');
            cell.className = 'tic-tac-toe-cell';
            cell.style.cssText = `
                aspect-ratio: 1;
                border: 2px solid rgba(255,255,255,0.3);
                background: rgba(0,0,0,0.3);
                color: white;
                font-size: ${Math.max(20, 60 - game.gridSize * 8)}px;
                font-weight: bold;
                cursor: pointer;
                border-radius: 8px;
                transition: all 0.2s;
                min-height: ${Math.max(40, 120 - game.gridSize * 10)}px;
            `;
            cell.dataset.row = i;
            cell.dataset.col = j;
            
            cell.addEventListener('click', () => makeMove(i, j));
            cell.addEventListener('mouseenter', () => {
                if (!game.gameOver && game.board[i][j] === '') {
                    cell.style.background = 'rgba(183, 103, 248, 0.3)';
                }
            });
            cell.addEventListener('mouseleave', () => {
                cell.style.background = 'rgba(0,0,0,0.3)';
            });
            
            boardContainer.appendChild(cell);
        }
    }
    centerContainer.appendChild(boardContainer);
    
    // Event messages at the bottom
    const eventDiv = document.createElement('div');
    eventDiv.id = 'eventMessages';
    eventDiv.style.cssText = `
        min-height: 60px;
        max-width: 600px;
        background: rgba(255,255,255,0.1);
        border-radius: 8px;
        padding: 15px;
        color: #FFD700;
        font-weight: bold;
        text-align: center;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    centerContainer.appendChild(eventDiv);
    
    gameControls.innerHTML = game.isSinglePlayer 
        ? '<p>Playing vs CPU | Click cells to make your move!</p>'
        : '<p>Two Player Mode | Take turns clicking cells!</p>';
    
    function showEventMessage(message) {
        const eventDiv = document.getElementById('eventMessages');
        eventDiv.textContent = message;
        eventDiv.style.animation = 'pulse 0.5s ease-in-out';
        setTimeout(() => {
            eventDiv.style.animation = '';
        }, 500);
    }
    
    function updateDisplay() {
        // Update board display
        const cells = document.querySelectorAll('.tic-tac-toe-cell');
        cells.forEach((cell, index) => {
            const row = Math.floor(index / game.gridSize);
            const col = index % game.gridSize;
            const value = game.board[row][col];
            
            cell.textContent = value;
            if (value === '💥') {
                cell.style.background = 'rgba(255,0,0,0.5)';
                cell.style.cursor = 'not-allowed';
            } else if (value === 'X') {
                cell.style.color = '#FF6B6B';
            } else if (value === 'O') {
                cell.style.color = '#4ECDC4';
            }
        });
        
        // Update current player
        const actualPlayer = game.swapNextTurn ? (game.currentPlayer === 'X' ? 'O' : 'X') : game.currentPlayer;
        document.getElementById('currentPlayerSpan').textContent = actualPlayer;
        document.getElementById('moveCounter').textContent = game.moveCount;
    }
    
    function makeMove(row, col) {
        if (game.gameOver || game.board[row][col] !== '') return;
        
        const actualPlayer = game.swapNextTurn ? (game.currentPlayer === 'X' ? 'O' : 'X') : game.currentPlayer;
        game.board[row][col] = actualPlayer;
        game.moveCount++;
        
        if (game.swapNextTurn) {
            game.swapNextTurn = false;
            showEventMessage("🔄 Swap effect is over!");
        }
        
        updateDisplay();
        
        if (checkWin()) {
            game.gameOver = true;
            const winner = actualPlayer;
            const message = game.reverse 
                ? `${winner} loses! (Made ${game.winCondition} in a row)`
                : `${winner} wins!`;
            showGameOver('Game Over!', message);
            return;
        }
        
        if (checkDraw()) {
            game.gameOver = true;
            showGameOver('Draw!', 'No more moves available!');
            return;
        }
        
        // Switch player
        game.currentPlayer = game.currentPlayer === 'X' ? 'O' : 'X';
        
        // Trigger random events
        triggerRandomEvent();
        
        // CPU move if single player
        if (game.isSinglePlayer && !game.gameOver && game.currentPlayer === 'O') {
            setTimeout(() => makeCPUMove(), 500);
        }
        
        updateDisplay();
    }
    
    function makeCPUMove() {
        if (game.gameOver) return;
        
        // Find available moves
        const availableMoves = [];
        for (let i = 0; i < game.gridSize; i++) {
            for (let j = 0; j < game.gridSize; j++) {
                if (game.board[i][j] === '') {
                    availableMoves.push({row: i, col: j});
                }
            }
        }
        
        if (availableMoves.length === 0) return;
        
        // Simple AI: try to win, then block, then random
        let move = findWinningMove('O') || findWinningMove('X') || availableMoves[Math.floor(Math.random() * availableMoves.length)];
        
        makeMove(move.row, move.col);
    }
    
    function findWinningMove(player) {
        for (let i = 0; i < game.gridSize; i++) {
            for (let j = 0; j < game.gridSize; j++) {
                if (game.board[i][j] === '') {
                    game.board[i][j] = player;
                    if (checkWinForPlayer(player)) {
                        game.board[i][j] = '';
                        return {row: i, col: j};
                    }
                    game.board[i][j] = '';
                }
            }
        }
        return null;
    }
    
    function checkWin() {
        return checkWinForPlayer('X') || checkWinForPlayer('O');
    }
    
    function checkWinForPlayer(player) {
        // Check rows
        for (let i = 0; i < game.gridSize; i++) {
            for (let j = 0; j <= game.gridSize - game.winCondition; j++) {
                let count = 0;
                for (let k = 0; k < game.winCondition; k++) {
                    if (game.board[i][j + k] === player) count++;
                }
                if (count === game.winCondition) return true;
            }
        }
        
        // Check columns
        for (let i = 0; i <= game.gridSize - game.winCondition; i++) {
            for (let j = 0; j < game.gridSize; j++) {
                let count = 0;
                for (let k = 0; k < game.winCondition; k++) {
                    if (game.board[i + k][j] === player) count++;
                }
                if (count === game.winCondition) return true;
            }
        }
        
        // Check diagonals
        for (let i = 0; i <= game.gridSize - game.winCondition; i++) {
            for (let j = 0; j <= game.gridSize - game.winCondition; j++) {
                let count1 = 0, count2 = 0;
                for (let k = 0; k < game.winCondition; k++) {
                    if (game.board[i + k][j + k] === player) count1++;
                    if (game.board[i + k][j + game.winCondition - 1 - k] === player) count2++;
                }
                if (count1 === game.winCondition || count2 === game.winCondition) return true;
            }
        }
        
        return false;
    }
    
    function checkDraw() {
        for (let i = 0; i < game.gridSize; i++) {
            for (let j = 0; j < game.gridSize; j++) {
                if (game.board[i][j] === '') return false;
            }
        }
        return true;
    }
    
    function triggerRandomEvent() {
        if (game.eventCooldown > 0) {
            game.eventCooldown--;
            return;
        }
        
        // 25% chance per move after move 3
        if (game.moveCount >= 3 && Math.random() < 0.25) {
            const availableEvents = randomEvents.filter(event => 
                event.trigger() && !game.eventsTriggered.includes(event.name)
            );
            
            if (availableEvents.length > 0) {
                const event = availableEvents[Math.floor(Math.random() * availableEvents.length)];
                event.effect();
                game.eventsTriggered.push(event.name);
                game.eventCooldown = 3; // Prevent events for 3 turns
            }
        }
    }
    
    updateDisplay();
    showEventMessage(`🎮 Get ready to play ${randomModifier.name}!`);
}


document.addEventListener('DOMContentLoaded', () => {
    
});
