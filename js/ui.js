// UI 层 - 菜单、角色选择、结算界面
class UIManager {
  constructor() {
    this.selectedCharacters = [];
    this.maxSelect = 3;
    this.container = document.getElementById('game-container');
    this.menuEl = document.getElementById('menu-screen');
    this.fightEl = document.getElementById('fight-screen');
    this.resultEl = document.getElementById('result-screen');
    this.canvasEl = document.getElementById('game-canvas');

    this.setupMenuListeners();
    this.setupFightListeners();
  }

  setupMenuListeners() {
    // 角色选择卡片（多选，最多3个）
    const cards = document.querySelectorAll('.char-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const charId = card.dataset.charId;
        if (!charId) return;

        const idx = this.selectedCharacters.indexOf(charId);
        if (idx >= 0) {
          this.selectedCharacters.splice(idx, 1);
          card.classList.remove('selected');
        } else if (this.selectedCharacters.length < this.maxSelect) {
          this.selectedCharacters.push(charId);
          card.classList.add('selected');
        }

        this.updateSelectionUI();
      });
    });

    // 开始战斗
    const startBtn = document.getElementById('start-btn');
    startBtn.addEventListener('click', () => {
      if (window.startGame) {
        if (this.selectedCharacters.length === 0) {
          const allIds = Object.keys(CHARACTERS);
          this.selectedCharacters = [...allIds].sort(() => Math.random() - 0.5).slice(0, 3);
        } else if (this.selectedCharacters.length < this.maxSelect) {
          const allIds = Object.keys(CHARACTERS).filter(id => !this.selectedCharacters.includes(id));
          const shuffled = [...allIds].sort(() => Math.random() - 0.5);
          while (this.selectedCharacters.length < this.maxSelect) {
            this.selectedCharacters.push(shuffled.shift());
          }
        }
        window.startGame(this.selectedCharacters);
      }
    });
  }

  updateSelectionUI() {
    const startBtn = document.getElementById('start-btn');
    const countEl = document.getElementById('select-count');
    if (countEl) {
      countEl.textContent = `${this.selectedCharacters.length}/${this.maxSelect}`;
    }
    if (startBtn) {
      startBtn.style.opacity = this.selectedCharacters.length > 0 ? '1' : '0.5';
      const btnText = startBtn.querySelector('.btn-text');
      if (btnText) {
        btnText.textContent = this.selectedCharacters.length > 0 ? '戦闘開始' : 'ランダム';
      }
    }
  }

  setupFightListeners() {
    // 移动按钮
    const leftBtn = document.getElementById('btn-left');
    const rightBtn = document.getElementById('btn-right');
    const jumpBtn = document.getElementById('btn-jump');

    this.setupDirectionalButton(leftBtn, 'left');
    this.setupDirectionalButton(rightBtn, 'right');
    this.setupButton(jumpBtn, 'jump');

    // 攻击按钮
    this.setupButton(document.getElementById('btn-attack'), 'attack');
    this.setupButton(document.getElementById('btn-skill1'), 'skill1');
    this.setupButton(document.getElementById('btn-skill2'), 'skill2');
    this.setupButton(document.getElementById('btn-skill3'), 'skill3');
    this.setupButton(document.getElementById('btn-dodge'), 'dodge');
    this.setupButton(document.getElementById('btn-ultimate'), 'ultimate');

    // 键盘控制
    document.addEventListener('keydown', (e) => {
      this.handleKeyboard(e, true);
    });
    document.addEventListener('keyup', (e) => {
      this.handleKeyboard(e, false);
    });
  }

  setupDirectionalButton(el, direction) {
    if (!el) return;
    let interval = null;

    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (window.handleInput) {
        window.handleInput(direction, true);
      }
      interval = setInterval(() => {
        if (window.handleInput) window.handleInput(direction, true);
      }, 50);
    });

    el.addEventListener('pointerup', (e) => {
      e.preventDefault();
      if (interval) clearInterval(interval);
      if (window.handleInput) window.handleInput(direction, false);
    });

    el.addEventListener('pointerleave', () => {
      if (interval) clearInterval(interval);
      if (window.handleInput) window.handleInput(direction, false);
    });
  }

  setupButton(el, action) {
    if (!el) return;
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (window.handleInput) window.handleInput(action, true);
    });
    el.addEventListener('pointerup', (e) => {
      e.preventDefault();
      if (window.handleInput) window.handleInput(action, false);
    });
  }

  handleKeyboard(e, pressed) {
    if (!window.handleInput) return;
    // 仅在战斗状态处理
    if (document.getElementById('fight-screen').classList.contains('hidden')) return;

    switch (e.key) {
      case 'ArrowLeft': case 'a': case 'A':
        e.preventDefault();
        window.handleInput('left', pressed);
        break;
      case 'ArrowRight': case 'd': case 'D':
        e.preventDefault();
        window.handleInput('right', pressed);
        break;
      case 'ArrowUp': case 'w': case 'W':
        e.preventDefault();
        window.handleInput('jump', pressed);
        break;
      case 'j': case 'J':
        e.preventDefault();
        window.handleInput('attack', pressed);
        break;
      case 'k': case 'K':
        e.preventDefault();
        window.handleInput('skill1', pressed);
        break;
      case 'l': case 'L':
        e.preventDefault();
        window.handleInput('skill2', pressed);
        break;
      case 'o': case 'O':
        e.preventDefault();
        window.handleInput('skill3', pressed);
        break;
      case ' ': case 'Shift':
        e.preventDefault();
        window.handleInput('dodge', pressed);
        break;
      case 'u': case 'U':
        e.preventDefault();
        window.handleInput('ultimate', pressed);
        break;
      case 'b': case 'B':
        e.preventDefault();
        window.handleInput('barrier', pressed);
        break;
    }
  }

  showMenu() {
    this.menuEl.classList.remove('hidden');
    this.fightEl.classList.add('hidden');
    this.resultEl.classList.add('hidden');
  }

  showFight(char) {
    this.menuEl.classList.add('hidden');
    this.fightEl.classList.remove('hidden');
    this.resultEl.classList.add('hidden');
    if (char) this.initFightUI(char);
  }

  // 根据角色动态初始化技能按钮
  initFightUI(char) {
    const skill3Btn = document.getElementById('btn-skill3');
    const barrierBtn = document.getElementById('btn-barrier');

    // 技能3按钮：仅五条悟显示
    if (skill3Btn) {
      skill3Btn.style.display = char.id === 'gojo' ? '' : 'none';
      if (char.id === 'gojo') {
        const s3 = char.skills[2];
        const nameEl = skill3Btn.querySelector('.skill-name');
        if (nameEl && s3) nameEl.textContent = s3.name;
      }
    }

    // 技能1名称
    const s1 = char.skills[0];
    const btn1 = document.getElementById('btn-skill1');
    if (btn1 && s1) {
      const nameEl = btn1.querySelector('.skill-name');
      if (nameEl) nameEl.textContent = s1.name;
    }

    // 技能2名称
    const s2 = char.skills[1];
    const btn2 = document.getElementById('btn-skill2');
    if (btn2 && s2) {
      const nameEl = btn2.querySelector('.skill-name');
      if (nameEl) nameEl.textContent = s2.name;
    }

    // 奥义名称
    const ultBtn = document.getElementById('btn-ultimate');
    if (ultBtn && char.ultimate) {
      const nameEl = ultBtn.querySelector('.skill-name');
      if (nameEl) nameEl.textContent = char.ultimate.name;
    }

    // 重置冷却显示
    const cdEls = document.querySelectorAll('.skill-cd');
    cdEls.forEach(el => { el.textContent = '-'; el.className = 'skill-cd'; });
  }

  // 准备倒计时
  startReadyCountdown(callback) {
    const overlay = document.getElementById('ready-overlay');
    const text = document.getElementById('ready-text');
    if (!overlay || !text) return callback();

    overlay.classList.remove('hidden');
    text.textContent = '3';
    let count = 3;

    const tick = () => {
      if (count <= 0) {
        overlay.classList.add('hidden');
        this.showBattleStart();
        callback();
        return;
      }
      text.textContent = count;
      text.style.animation = 'none';
      void text.offsetWidth; // reflow
      text.style.animation = 'countPulse 1s ease-in-out';
      count--;
      setTimeout(tick, 1000);
    };
    tick();
  }

  // 战斗开始文字特效
  showBattleStart() {
    const el = document.getElementById('battle-start');
    if (!el) return;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 1300);
  }

  showResult(playerTeam, enemyTeam, winner) {
    this.menuEl.classList.add('hidden');
    this.fightEl.classList.add('hidden');
    this.resultEl.classList.remove('hidden');

    const resultTitle = document.getElementById('result-title');
    const resultStats = document.getElementById('result-stats');

    const isWin = winner === 'player';

    resultTitle.textContent = isWin ? '胜利！' : '败北...';
    resultTitle.className = isWin ? 'result-title result-win' : 'result-title result-lose';

    const playerAlive = playerTeam.filter(f => f.isAlive()).length;
    const enemyAlive = enemyTeam.filter(f => f.isAlive()).length;
    const totalDmg = playerTeam.reduce((s, f) => s + f.totalDamage, 0);

    let html = `<div class="stat-row">我方剩余: ${playerAlive}/3 &nbsp; 敌方剩余: ${enemyAlive}/3</div>`;
    html += `<div class="stat-row">总伤害: ${totalDmg}</div>`;
    for (let i = 0; i < playerTeam.length; i++) {
      const f = playerTeam[i];
      html += `<div class="stat-row">
        <span>${f.character.name}</span>
        <span class="stat-damage">伤害: ${f.totalDamage}</span>
        <span class="stat-hp">HP: ${Math.ceil(Math.max(0, f.currentHp))}</span>
      </div>`;
    }
    resultStats.innerHTML = html;

    // 重新挑战
    document.getElementById('btn-retry').onclick = () => {
      if (window.restartGame) window.restartGame();
    };
    // 返回菜单
    document.getElementById('btn-menu').onclick = () => {
      this.selectedCharacters = [];
      this.showMenu();
    };
  }

  updateSkillCooldowns(player) {
    if (!player) return;
    const char = player.character;

    const updateBtn = (id, cd) => {
      const btn = document.getElementById(`btn-${id}`);
      if (!btn) return;

      // 冷却覆盖层
      const cdOverlay = btn.querySelector('.cd-overlay');
      if (!cdOverlay) {
        const overlay = document.createElement('div');
        overlay.className = 'cd-overlay';
        btn.appendChild(overlay);
      }
      const overlay = btn.querySelector('.cd-overlay');
      const skill = char.skills.find(s => s.id === id);
      const maxCd = skill ? skill.cooldown : id === 'ultimate' ? (char.ultimate?.cooldown || 1) : 1;
      if (cd > 0) {
        const ratio = cd / maxCd;
        overlay.style.height = `${ratio * 100}%`;
        overlay.style.opacity = '0.7';
      } else {
        overlay.style.height = '0%';
        overlay.style.opacity = '0';
      }

      // 冷却数字文本
      const cdText = btn.querySelector('.skill-cd');
      if (cdText) {
        if (cd > 0) {
          const secs = Math.ceil(cd / 60);
          cdText.textContent = `${secs}s`;
          cdText.className = 'skill-cd';
        } else {
          cdText.textContent = '◇';
          cdText.className = 'skill-cd ready';
        }
      }
    };

    updateBtn('skill1', player.cooldowns['skill1']);
    updateBtn('skill2', player.cooldowns['skill2']);
    updateBtn('skill3', player.cooldowns['skill3'] || 0);
    updateBtn('ultimate', player.cooldowns[char.ultimate.id]);
  }
}