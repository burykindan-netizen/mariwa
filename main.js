/* 8-bit Platformer - minimal engine */
(() => {
	const canvas = document.getElementById('game');
	const ctx = canvas.getContext('2d');

	const SCALE = 1; // internal pixels
	const TILE = 16;
	const GRAVITY = 0.7;
	const JUMP_VELOCITY = -10.5;
	const MOVE_ACCEL = 0.7;
	const MOVE_FRICTION = 0.85;
	const MAX_SPEED_X = 3.2;

	const KEY = { left: false, right: false, up: false, down: false, jump: false, pause: false, reset: false, continue: false };
	window.addEventListener('keydown', (e) => {
		if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','KeyZ','KeyX','KeyA','KeyD','KeyW','KeyS','KeyP','KeyR','Enter'].includes(e.code)) e.preventDefault();
		if (e.code === 'ArrowLeft' || e.code === 'KeyA') KEY.left = true;
		if (e.code === 'ArrowRight' || e.code === 'KeyD') KEY.right = true;
		if (e.code === 'ArrowUp' || e.code === 'KeyW') KEY.up = true;
		if (e.code === 'ArrowDown' || e.code === 'KeyS') KEY.down = true;
		if (e.code === 'Space' || e.code === 'KeyZ') KEY.jump = true;
		if (e.code === 'KeyP') KEY.pause = !KEY.pause;
		if (e.code === 'KeyR') KEY.reset = true;
		if (e.code === 'Enter') KEY.continue = true;
	});
	window.addEventListener('keyup', (e) => {
		if (e.code === 'ArrowLeft' || e.code === 'KeyA') KEY.left = false;
		if (e.code === 'ArrowRight' || e.code === 'KeyD') KEY.right = false;
		if (e.code === 'ArrowUp' || e.code === 'KeyW') KEY.up = false;
		if (e.code === 'ArrowDown' || e.code === 'KeyS') KEY.down = false;
		if (e.code === 'Space' || e.code === 'KeyZ') KEY.jump = false;
		if (e.code === 'KeyR') KEY.reset = false;
		if (e.code === 'Enter') KEY.continue = false;
	});

	const COLORS = {
		bg: '#1b1b3a', sky: '#7ec0ff', ground: '#6d4c41', brick: '#b85', coin: '#ffdc5e', player: '#e33', enemy: '#5d9', flag: '#fff', text:'#fff', hud:'#fff', lava:'#f33'
	};

	// Load Mario sprite image
	const marioSprite = new Image();
	marioSprite.src = '163-1637524_super-mario-bros-high-res-sprite-by-mario.png';

	// Load Goomba sprite image
	const goombaSprite = new Image();
	goombaSprite.src = '194-1943501_super-mario-bros-goomba-super-mario-bros-1-4150683722.png';

	// Tiny SFX using WebAudio Oscillators
	let audioCtx;
	function ensureAudio() { if (!audioCtx) { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } }
	function beep(freq = 440, duration = 0.08, type = 'square', volume = 0.05) {
		if (!audioCtx) return;
		const o = audioCtx.createOscillator();
		const g = audioCtx.createGain();
		o.type = type; o.frequency.value = freq;
		g.gain.value = volume;
		o.connect(g); g.connect(audioCtx.destination);
		o.start();
		g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
		o.stop(audioCtx.currentTime + duration);
	}
	const SFX = {
		jump: () => { ensureAudio(); beep(220, 0.12, 'square', 0.06); },
		coin: () => { ensureAudio(); beep(880, 0.06, 'square', 0.05); beep(1320, 0.06, 'square', 0.04); },
		stomp: () => { ensureAudio(); beep(140, 0.08, 'square', 0.06); },
		hurt: () => { ensureAudio(); beep(90, 0.18, 'sawtooth', 0.06); },
		win: () => { ensureAudio(); beep(660, 0.12); setTimeout(()=>beep(880,0.12),120); setTimeout(()=>beep(990,0.2),240); }
	};

	// Level definitions (0=empty,1=ground,2=brick,3=coin,4=enemy,5=flag,6=lava)
	const LEVELS = [
		{
			name: 'Grassland 1',
			spawn: { x: 2, y: 6 },
			tiles: [
				[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
				[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
				[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
				[0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0],
				[0,0,0,0,0,0,0,0,0,2,3,0,0,0,0,0,0,0,0,0],
				[0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,5],
				[1,1,1,1,0,0,0,0,1,1,1,0,0,0,0,0,0,6,6,6],
				[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,6,6,6]
			]
		},
		{
			name: 'Caves 2',
			spawn: { x: 1, y: 2 },
			tiles: [
				[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5],
				[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
				[1,1,0,0,0,0,2,0,0,0,0,0,3,0,0,0,0,0,0,0],
				[1,1,0,0,0,0,2,0,0,0,0,0,0,0,0,4,0,0,0,0],
				[0,0,0,4,0,0,2,0,0,0,0,0,0,0,0,0,0,4,0,0],
				[0,0,0,0,0,0,2,0,0,4,0,0,0,0,0,0,0,0,0,0],
				[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
				[6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6]
			]
		},
		{
			name: 'Goomba Challenge',
			spawn: { x: 1, y: 6 },
			tiles: [
				[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
				[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5],
				[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
				[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
				[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
				[0,0,0,4,0,0,0,4,0,0,0,4,0,0,0,4,0,0,0,0],
				[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
				[6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6]
			]
		},
	];

	function createState() {
		return {
			levelIndex: 0,
			score: 0,
			coins: 0,
			lives: 3,
			paused: false,
			gameOver: false,
			win: false,
			levelComplete: false,
			player: { x: 0, y: 0, vx: 0, vy: 0, w: 12, h: 14, onGround: false, facing: 1, coyote: 0, jumpBuffer: 0, inv: 0 },
			enemies: [],
			camera: { x: 0, y: 0 }
		};
	}

	let state = createState();

	function loadLevel(index) {
		const lvl = LEVELS[index];
		state.levelIndex = index;
		state.enemies = [];
		for (let y = 0; y < lvl.tiles.length; y++) {
			for (let x = 0; x < lvl.tiles[0].length; x++) {
				if (lvl.tiles[y][x] === 4) {
					state.enemies.push({ x: x * TILE + 2, y: y * TILE, vx: 0.6, vy: 0, w: 12, h: 12, alive: true });
					lvl.tiles[y][x] = 0; // remove marker
				}
			}
		}
		state.player.x = lvl.spawn.x * TILE;
		state.player.y = lvl.spawn.y * TILE;
		state.player.vx = 0; state.player.vy = 0; state.player.onGround = false; state.player.coyote = 0; state.player.jumpBuffer = 0; state.player.inv = 0;
		state.camera.x = 0; state.camera.y = 0;
		state.win = false; state.gameOver = false; state.paused = false; state.levelComplete = false;
	}

	loadLevel(0);

	function handleResetKey() {
		if (!KEY.reset) return false;
		KEY.reset = false;
		if (state.gameOver || state.win) {
			state = createState();
			loadLevel(0);
			return true;
		}
		loadLevel(state.levelIndex);
		return true;
	}

	function tileAt(level, x, y) {
		const tx = Math.floor(x / TILE);
		const ty = Math.floor(y / TILE);
		if (ty < 0 || ty >= level.tiles.length || tx < 0 || tx >= level.tiles[0].length) return 0;
		return level.tiles[ty][tx];
	}

	function isSolid(id) { return id === 1 || id === 2; }
	function isHazard(id) { return id === 6; }

	function aabbCollide(ax, ay, aw, ah, bx, by, bw, bh) {
		return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
	}

	function tryMove(entity, level) {
		// Horizontal
		entity.x += entity.vx;
		if (entity.vx !== 0) {
			const dir = Math.sign(entity.vx);
			const aheadX = dir > 0 ? entity.x + entity.w : entity.x;
			const top = entity.y + 1;
			const bottom = entity.y + entity.h - 1;
			for (let y = top; y <= bottom; y += 4) {
				const id = tileAt(level, aheadX, y);
				if (isSolid(id)) {
					entity.x = Math.floor(aheadX / TILE) * TILE - (dir > 0 ? entity.w : -TILE);
					entity.vx = 0; break;
				}
			}
		}
		// Vertical
		entity.y += entity.vy;
		let onGround = false;
		const dirY = Math.sign(entity.vy);
		const feetY = entity.y + entity.h;
		const headY = entity.y;
		const left = entity.x + 2;
		const right = entity.x + entity.w - 2;
		if (entity.vy >= 0) {
			for (let x = left; x <= right; x += 4) {
				const id = tileAt(level, x, feetY);
				if (isSolid(id)) {
					entity.y = Math.floor(feetY / TILE) * TILE - entity.h;
					entity.vy = 0; onGround = true; break;
				}
			}
		} else if (entity.vy < 0) {
			for (let x = left; x <= right; x += 4) {
				const id = tileAt(level, x, headY);
				if (isSolid(id)) {
					entity.y = Math.floor(headY / TILE + 1) * TILE;
					entity.vy = 0; break;
				}
			}
		}
		return onGround;
	}

	function update(dt) {
		// Allow reset regardless of state
		if (handleResetKey()) return;
		
		// Handle continue key when level is complete
		if (state.levelComplete && KEY.continue) {
			KEY.continue = false;
			continueToNextLevel();
			return;
		}
		
		if (state.gameOver || state.win || state.levelComplete) return;
		if (KEY.pause) { state.paused = !state.paused; KEY.pause = false; }
		if (state.paused) return;

		const level = LEVELS[state.levelIndex];
		const p = state.player;

		// Input
		if (KEY.left) p.vx -= MOVE_ACCEL;
		if (KEY.right) p.vx += MOVE_ACCEL;
		p.vx *= MOVE_FRICTION;
		if (p.vx > MAX_SPEED_X) p.vx = MAX_SPEED_X;
		if (p.vx < -MAX_SPEED_X) p.vx = -MAX_SPEED_X;
		p.facing = p.vx > 0 ? 1 : (p.vx < 0 ? -1 : p.facing);

		// Jump mechanics: coyote time + jump buffer
		if (p.coyote > 0) p.coyote -= dt;
		if (p.jumpBuffer > 0) p.jumpBuffer -= dt;
		if (KEY.jump) p.jumpBuffer = 0.15;

		// Gravity
		p.vy += GRAVITY;
		if (p.vy > 12) p.vy = 12;

		const wasOnGround = p.onGround;
		p.onGround = tryMove(p, level);
		if (p.onGround) p.coyote = 0.12;
		if (!wasOnGround && p.onGround && p.vy >= 8) hurtPlayer();

		if (p.jumpBuffer > 0 && p.coyote > 0) {
			p.vy = JUMP_VELOCITY; p.onGround = false; p.coyote = 0; p.jumpBuffer = 0; SFX.jump();
		}

		// Hazard tiles
		const feet = tileAt(level, p.x + p.w/2, p.y + p.h - 1);
		if (isHazard(feet)) hurtPlayer(true);

		// Coins and flag
		collectAt(level, p.x + p.w/2, p.y + p.h/2);
		if (reachFlag(level, p.x + p.w/2, p.y + p.h/2)) { 
			if (state.levelIndex + 1 < LEVELS.length) {
				state.levelComplete = true; 
			} else {
				state.win = true; 
			}
			SFX.win(); 
		}

		// Enemies
		for (const e of state.enemies) {
			if (!e.alive) continue;
			e.vy += GRAVITY;
			const onG = tryMove(e, level);
			if (onG) {
				// Patrol; turn at edges or walls
				const aheadX = e.vx > 0 ? e.x + e.w + 1 : e.x - 1;
				const groundAhead = tileAt(level, aheadX, e.y + e.h + 1);
				const wallAhead = tileAt(level, aheadX, e.y + e.h/2);
				if (!isSolid(groundAhead) || isSolid(wallAhead)) e.vx *= -1;
			}
		}
		// Player-enemy interactions
		for (const e of state.enemies) {
			if (!e.alive) continue;
			if (aabbCollide(p.x, p.y, p.w, p.h, e.x, e.y, e.w, e.h)) {
				if (p.vy > 0 && p.y + p.h - e.y < 12) {
					// stomp
					e.alive = false; state.score += 200; p.vy = JUMP_VELOCITY * 0.6; p.onGround = false; SFX.stomp();
				} else {
					hurtPlayer();
				}
			}
		}

		// Camera follows player
		state.camera.x = Math.max(0, Math.min(p.x - canvas.width/2 + p.w/2, level.tiles[0].length * TILE - canvas.width));
		state.camera.y = Math.max(0, Math.min(p.y - canvas.height/2 + p.h/2, level.tiles.length * TILE - canvas.height));

		if (p.inv > 0) p.inv -= dt;
	}

	function hurtPlayer(insta = false) {
		if (state.player.inv > 0 && !insta) return;
		state.lives -= 1;
		if (state.lives < 0 || insta) {
			state.gameOver = true; return;
		}
		SFX.hurt();
		state.player.inv = 1.2;
		// respawn at start of level
		const lvl = LEVELS[state.levelIndex];
		state.player.x = lvl.spawn.x * TILE; state.player.y = lvl.spawn.y * TILE; state.player.vx = 0; state.player.vy = 0;
	}

	function collectAt(level, x, y) {
		const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
		const id = level.tiles[ty]?.[tx];
		if (id === 3) { level.tiles[ty][tx] = 0; state.coins += 1; state.score += 100; SFX.coin(); }
	}

	function reachFlag(level, x, y) {
		const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
		return level.tiles[ty]?.[tx] === 5;
	}

	function nextLevel() {
		if (state.levelIndex + 1 < LEVELS.length) {
			loadLevel(state.levelIndex + 1);
		} else {
			state.win = true; SFX.win();
		}
	}

	function continueToNextLevel() {
		if (state.levelIndex + 1 < LEVELS.length) {
			loadLevel(state.levelIndex + 1);
		}
	}

	function draw() {
		ctx.fillStyle = COLORS.sky; ctx.fillRect(0, 0, canvas.width, canvas.height);
		const level = LEVELS[state.levelIndex];
		const cam = state.camera;

		// Tiles
		for (let y = 0; y < level.tiles.length; y++) {
			for (let x = 0; x < level.tiles[0].length; x++) {
				const id = level.tiles[y][x];
				if (!id) continue;
				const sx = x * TILE - cam.x; const sy = y * TILE - cam.y;
				switch (id) {
					case 1: ctx.fillStyle = COLORS.ground; ctx.fillRect(sx, sy, TILE, TILE); break;
					case 2: ctx.fillStyle = COLORS.brick; ctx.fillRect(sx, sy, TILE, TILE); ctx.fillStyle = '#0003'; ctx.fillRect(sx+2, sy+2, TILE-4, TILE-4); break;
					case 3: ctx.fillStyle = COLORS.coin; ctx.fillRect(sx+5, sy+4, 6, 8); break;
					case 5: ctx.fillStyle = COLORS.flag; ctx.fillRect(sx+12, sy, 2, TILE); ctx.fillStyle = '#f44'; ctx.fillRect(sx+4, sy+2, 10, 6); break;
					case 6: ctx.fillStyle = COLORS.lava; ctx.fillRect(sx, sy, TILE, TILE); break;
				}
			}
		}

		// Enemies
		for (const e of state.enemies) {
			if (!e.alive) continue;
			
			// Draw Goomba sprite if loaded, otherwise fallback to rectangle
			if (goombaSprite.complete && goombaSprite.naturalWidth > 0) {
				const x = Math.round(e.x - cam.x);
				const y = Math.round(e.y - cam.y);
				ctx.drawImage(goombaSprite, x, y, e.w, e.h);
			} else {
				// Fallback to original rectangle if sprite not loaded
				ctx.fillStyle = COLORS.enemy; 
				ctx.fillRect(Math.round(e.x - cam.x), Math.round(e.y - cam.y), e.w, e.h);
			}
		}

		// Player
		ctx.save();
		if (state.player.inv > 0 && Math.floor(performance.now()/100)%2===0) ctx.globalAlpha = 0.5; else ctx.globalAlpha = 1;
		
		// Draw Mario sprite if loaded, otherwise fallback to rectangle
		if (marioSprite.complete && marioSprite.naturalWidth > 0) {
			// Scale sprite to match player dimensions (12x14)
			const scaleX = state.player.w / marioSprite.naturalWidth;
			const scaleY = state.player.h / marioSprite.naturalHeight;
			const x = Math.round(state.player.x - cam.x);
			const y = Math.round(state.player.y - cam.y);
			
			ctx.drawImage(marioSprite, x, y, state.player.w, state.player.h);
		} else {
			// Fallback to original rectangle if sprite not loaded
			ctx.fillStyle = COLORS.player;
			ctx.fillRect(Math.round(state.player.x - cam.x), Math.round(state.player.y - cam.y), state.player.w, state.player.h);
		}
		
		ctx.restore();

		// HUD
		ctx.fillStyle = COLORS.hud; ctx.font = '10px monospace'; ctx.textBaseline = 'top';
		ctx.fillText(`Score ${state.score}`, 6, 6);
		ctx.fillText(`Coins ${state.coins}`, 110, 6);
		ctx.fillText(`Lives ${state.lives}`, 210, 6);

		if (state.paused) {
			ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0,0,canvas.width,canvas.height);
			ctx.fillStyle = COLORS.text; ctx.font = '16px monospace'; ctx.textAlign = 'center';
			ctx.fillText('Paused', canvas.width/2, canvas.height/2);
		}
		if (state.gameOver) {
			ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0,0,canvas.width,canvas.height);
			ctx.fillStyle = COLORS.text; ctx.font = '16px monospace'; ctx.textAlign = 'center';
			ctx.fillText('Game Over - Press R', canvas.width/2, canvas.height/2);
		}
		if (state.levelComplete) {
			ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0,0,canvas.width,canvas.height);
			ctx.fillStyle = COLORS.text; ctx.font = '16px monospace'; ctx.textAlign = 'center';
			ctx.fillText('Level Complete!', canvas.width/2, canvas.height/2 - 10);
			ctx.font = '12px monospace';
			ctx.fillText('Press ENTER to continue', canvas.width/2, canvas.height/2 + 10);
		}
		if (state.win) {
			ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0,0,canvas.width,canvas.height);
			ctx.fillStyle = COLORS.text; ctx.font = '16px monospace'; ctx.textAlign = 'center';
			ctx.fillText('You Win!', canvas.width/2, canvas.height/2);
		}
	}

	let last = 0; let accumulator = 0; const step = 1/60;
	function loop(ts) {
		const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts; accumulator += dt;
		while (accumulator >= step) { update(step); accumulator -= step; }
		draw();
		requestAnimationFrame(loop);
	}

	// Start overlay
	const overlay = document.querySelector('.overlay');
	document.getElementById('startBtn').addEventListener('click', () => { overlay.classList.add('hidden'); ensureAudio(); });

	requestAnimationFrame(loop);
})();


