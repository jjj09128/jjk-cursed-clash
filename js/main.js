// 游戏主入口与循环
class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.renderer = new Renderer(this.canvas);
    this.particles = new ParticleSystem();
    this.audio = new AudioSystem();
    this.combat = new CombatSystem(this.canvas, this.particles, this.audio);
    this.ui = new UIManager();

    this.gameState = 'menu'; // menu, ready, fighting, result
    this.playerTeam = null;    // [Fighter, Fighter, Fighter]
    this.enemyTeam = null;     // [Fighter, Fighter, Fighter]
    this.activePlayerIdx = 0;
    this.activeEnemyIdx = 0;
    this.player = null;        // 当前活跃玩家
    this.enemy = null;         // 当前活跃敌人
    this.ai = null;
    this.inputState = {};
    this.animationId = null;
    this.lastTime = 0;
    this.attackCooldown = 0;
    this.skill1Cooldown = 0;
    this.skill2Cooldown = 0;
    this.skill3Cooldown = 0;

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.setupGlobalCallbacks();
    this.loop(0);
  }

  setupGlobalCallbacks() {
    window.startGame = (charIds) => this.startGame(charIds);
    window.restartGame = () => this.restartGame();
    window.handleInput = (action, pressed) => this.handleInput(action, pressed);
  }

  resize() {
    const container = document.getElementById('game-container');
    const w = Math.min(container.clientWidth, 1200);
    const h = w * 9 / 16;
    this.canvas.width = w;
    this.canvas.height = h;
    this.renderer.resize();
    if (this.combat) {
      this.combat.groundY = h * 0.78;
    }
  }

  startGame(charIds) {
    this.audio.init();

    const cx = this.canvas.width / 2;
    const gy = this.canvas.height * 0.78;

    // 创建玩家队伍（3人）
    this.playerTeam = charIds.map(id => {
      const char = CHARACTERS[id];
      return new Fighter(char, cx - 150, gy, true, true);
    });

    // 创建AI队伍（随机3人，避免重复）
    const aiCharIds = [];
    const shuffled = [...AI_CHARACTERS].sort(() => Math.random() - 0.5);
    for (let i = 0; i < 3; i++) {
      aiCharIds.push(shuffled[i % shuffled.length]);
    }
    this.enemyTeam = aiCharIds.map(id => {
      const char = CHARACTERS[id];
      return new Fighter(char, cx + 150, gy, false, false);
    });

    this.activePlayerIdx = 0;
    this.activeEnemyIdx = 0;
    this.player = this.playerTeam[0];
    this.enemy = this.enemyTeam[0];
    this.ai = new AIController(this.enemy);
    this.ai.setTarget(this.player);
    this.ai.setDifficulty(0.55 + Math.random() * 0.3);

    this.combat.init(this.playerTeam, this.enemyTeam, this.activePlayerIdx, this.activeEnemyIdx, this.ai);
    this.inputState = {};
    this.attackCooldown = 0;
    this.skill1Cooldown = 0;
    this.skill2Cooldown = 0;
    this.skill3Cooldown = 0;

    this.ui.showFight(this.player.character);
    this.gameState = 'ready';

    this.ui.startReadyCountdown(() => {
      this.gameState = 'fighting';
      this.audio.playSkill('ranged');
    });
  }

  restartGame() {
    if (this.playerTeam) {
      const ids = this.playerTeam.map(f => f.character.id);
      this.startGame(ids);
    }
  }

  // 切换玩家角色
  swapPlayer() {
    for (let i = 0; i < this.playerTeam.length; i++) {
      const idx = (this.activePlayerIdx + 1 + i) % this.playerTeam.length;
      if (this.playerTeam[idx].isAlive()) {
        this.activePlayerIdx = idx;
        this.player = this.playerTeam[idx];
        this.player.x = this.canvas.width / 2 - 150;
        this.player.y = this.canvas.height * 0.78;
        this.player.state = 'idle';
        this.player.grounded = true;
        this.player.velocity.x = 0;
        this.player.velocity.y = 0;
        this.player.invincible = true;
        this.player.invincibleTimer = 60;
        this.ai.setTarget(this.player);
        this.combat.setActivePlayer(this.activePlayerIdx);
        this.particles.emit(this.player.x, this.player.y - 30, 20, {
          color: '#00ff88', speed: 5, spread: Math.PI * 2, life: 0.6, size: 4, gravity: -1
        });
        this.audio.playSkill('ranged');
        return true;
      }
    }
    return false;
  }

  // 切换敌人角色
  swapEnemy() {
    for (let i = 0; i < this.enemyTeam.length; i++) {
      const idx = (this.activeEnemyIdx + 1 + i) % this.enemyTeam.length;
      if (this.enemyTeam[idx].isAlive()) {
        this.activeEnemyIdx = idx;
        this.enemy = this.enemyTeam[idx];
        this.enemy.x = this.canvas.width / 2 + 150;
        this.enemy.y = this.canvas.height * 0.78;
        this.enemy.state = 'idle';
        this.enemy.grounded = true;
        this.enemy.velocity.x = 0;
        this.enemy.velocity.y = 0;
        this.enemy.invincible = true;
        this.enemy.invincibleTimer = 60;
        this.ai.fighter = this.enemy;
        this.ai.setTarget(this.player);
        this.combat.setActiveEnemy(this.activeEnemyIdx);
        this.particles.emit(this.enemy.x, this.enemy.y - 30, 20, {
          color: '#ff4444', speed: 5, spread: Math.PI * 2, life: 0.6, size: 4, gravity: -1
        });
        this.audio.playSkill('ranged');
        return true;
      }
    }
    return false;
  }

  // 检查队伍全灭
  checkTeamWipe() {
    const playerAlive = this.playerTeam.some(f => f.isAlive());
    const enemyAlive = this.enemyTeam.some(f => f.isAlive());
    if (!playerAlive) return 'enemy';
    if (!enemyAlive) return 'player';
    return null;
  }

  handleInput(action, pressed) {
    if (pressed) {
      this.inputState[action] = true;
    } else {
      this.inputState[action] = false;
    }
  }

  processInput() {
    if (!this.player || this.gameState !== 'fighting') return;

    const p = this.player;

    // 移动
    if (this.inputState['left']) {
      p.velocity.x = -p.speed;
      p.facingRight = false;
      if (p.state === 'idle') p.state = 'moving';
    } else if (this.inputState['right']) {
      p.velocity.x = p.speed;
      p.facingRight = true;
      if (p.state === 'idle') p.state = 'moving';
    } else {
      if (p.grounded) {
        p.velocity.x *= 0.85;
        if (Math.abs(p.velocity.x) < 0.5 && p.state === 'moving') {
          p.state = 'idle';
        }
      }
    }

    // 跳跃
    if (this.inputState['jump'] && p.grounded && p.state !== 'hit' && p.state !== 'casting') {
      p.velocity.y = -14;
      p.grounded = false;
      this.inputState['jump'] = false;
    }

    // 攻击
    if (this.attackCooldown > 0) this.attackCooldown--;
    if (this.inputState['attack'] && this.attackCooldown <= 0) {
      this.combat.playerAttack();
      this.attackCooldown = 15;
      this.inputState['attack'] = false;
    }

    // 技能1
    if (this.skill1Cooldown > 0) this.skill1Cooldown--;
    if (this.inputState['skill1'] && this.skill1Cooldown <= 0) {
      this.combat.playerUseSkill('skill1');
      this.skill1Cooldown = 20;
      this.inputState['skill1'] = false;
    }

    // 技能2
    if (this.skill2Cooldown > 0) this.skill2Cooldown--;
    if (this.inputState['skill2'] && this.skill2Cooldown <= 0) {
      this.combat.playerUseSkill('skill2');
      this.skill2Cooldown = 20;
      this.inputState['skill2'] = false;
    }

    // 技能3
    if (this.skill3Cooldown > 0) this.skill3Cooldown--;
    if (this.inputState['skill3'] && this.skill3Cooldown <= 0) {
      this.combat.playerUseSkill('skill3');
      this.skill3Cooldown = 20;
      this.inputState['skill3'] = false;
    }

    // 闪避
    if (this.inputState['dodge']) {
      this.combat.playerDodge();
      this.inputState['dodge'] = false;
    }

    // 领域展开
    if (this.inputState['ultimate']) {
      this.combat.playerUltimate();
      this.inputState['ultimate'] = false;
    }

    // 无下限屏障
    if (this.inputState['barrier']) {
      this.combat.playerBarrier();
      this.inputState['barrier'] = false;
    }
  }

  loop(time) {
    this.animationId = requestAnimationFrame((t) => this.loop(t));

    const dt = (time - this.lastTime) / 1000;
    this.lastTime = time;

    if (this.gameState === 'fighting') {
      this.processInput();
      this.combat.update();

      // 检查当前活跃角色是否死亡，自动切换
      if (!this.player.isAlive()) {
        if (!this.swapPlayer()) {
          // 全灭
          this.gameState = 'result';
          this.audio.playDefeat();
          this.ui.showResult(this.playerTeam, this.enemyTeam, 'enemy');
          this.render();
          return;
        }
      }
      if (!this.enemy.isAlive()) {
        if (!this.swapEnemy()) {
          this.gameState = 'result';
          this.audio.playVictory();
          this.ui.showResult(this.playerTeam, this.enemyTeam, 'player');
          this.render();
          return;
        }
      }

      this.combat.checkAIAttack();
      this.particles.update();

      // 更新技能冷却 UI
      this.ui.updateSkillCooldowns(this.player);
    }

    if (this.gameState === 'ready') {
      this.particles.update();
    }

    this.render();
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const shake = this.particles.getShakeOffset();
    ctx.save();
    ctx.translate(shake.x, shake.y);

    this.renderer.drawBackground();

    if (this.gameState === 'fighting' || this.gameState === 'ready') {
      this.renderer.drawDomainIndicator(this.player);
      this.renderer.drawDomainIndicator(this.enemy);

      this.renderer.drawFighter(this.player);
      this.renderer.drawFighter(this.enemy);

  this.combat.draw(ctx);

      // 粒子
      this.particles.draw(ctx, { x: 0, y: 0 });

      // 无量空处领域UI覆盖
      this.renderer.drawDomainOverlay(this.player);

      // 队伍HUD（3v3）
      this.renderer.drawTeamHUD(this.playerTeam, this.enemyTeam, this.activePlayerIdx, this.activeEnemyIdx);

      this.renderer.drawCombo(this.combat.comboDisplay);
    }

    ctx.restore();
  }
}

// 启动
document.addEventListener('DOMContentLoaded', () => {
  new Game();
});