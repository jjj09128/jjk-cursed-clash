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
    this._audio = null;
    this._particles = null;
    this._qualityChangeCallback = null;
    this._pauseCallback = null;
    this._resumeCallback = null;
    this._skillBtnCache = null;
    this._hudTimerEl = null;
    this._hudTimerLast = '';

    this.setupMenuListeners();
    this.setupModeSwitchListeners(); // 模式切换（单人/双人）
    this.setupFightListeners();
    this.setupChangelog();
    this.setupButtonAudio();
    this.setupResultTabs();
    this.renderChangelog();
    this.showChangelogIfNew();
  }

  setParticles(particles) {
    this._particles = particles;
  }

  setQualityChangeCallback(cb) {
    this._qualityChangeCallback = cb;
  }

  setPauseCallbacks(pause, resume) {
    this._pauseCallback = pause;
    this._resumeCallback = resume;
  }

  // ===== 本地战绩存储（localStorage）=====
  _storageKey = 'jjk_battle_records';

  _loadRecords() {
    try {
      const raw = localStorage.getItem(this._storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  _saveRecords(records) {
    try {
      localStorage.setItem(this._storageKey, JSON.stringify(records));
    } catch (e) {}
  }

  // 记录一场对战结果
  saveBattleRecord(winner, playerTeam, enemyTeam) {
    const records = this._loadRecords();
    const totalDmg = playerTeam.reduce((s, f) => s + (f.totalDamage || 0), 0);
    const playerChars = playerTeam.map(f => ({ id: f.character.id, name: f.character.name }));
    const enemyChars = enemyTeam.map(f => ({ id: f.character.id, name: f.character.name }));

    records.unshift({
      timestamp: Date.now(),
      date: new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      result: winner === 'player' ? 'win' : 'lose',
      playerChars,
      enemyChars,
      totalDmg,
    });

    // 最多保留 30 条
    if (records.length > 30) records.length = 30;
    this._saveRecords(records);
  }

  // 计算统计
  getBattleStats() {
    const records = this._loadRecords();
    const total = records.length;
    const wins = records.filter(r => r.result === 'win').length;
    const losses = total - wins;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

    // 当前连胜/连败
    let streak = 0;
    for (const r of records) {
      if (r.result === 'win') {
        if (streak >= 0) streak++;
        else break;
      } else {
        if (streak <= 0) streak--;
        else break;
      }
    }

    return { total, wins, losses, winRate, streak };
  }

  // 渲染历史战绩面板
  renderLeaderboard() {
    const statsEl = document.getElementById('leaderboard-stats');
    const listEl = document.getElementById('leaderboard-list');
    if (!statsEl || !listEl) return;

    const stats = this.getBattleStats();
    const records = this._loadRecords();

    statsEl.innerHTML = `
      <div class="lb-stat-item">
        <span class="lb-stat-num">${stats.total}</span>
        <span class="lb-stat-label">总场次</span>
      </div>
      <div class="lb-stat-item">
        <span class="lb-stat-num">${stats.winRate}%</span>
        <span class="lb-stat-label">胜率</span>
      </div>
      <div class="lb-stat-item">
        <span class="lb-stat-num">${stats.wins}</span>
        <span class="lb-stat-label">胜场</span>
      </div>
      <div class="lb-stat-item">
        <span class="lb-stat-num">${stats.streak > 0 ? '+' + stats.streak : stats.streak}</span>
        <span class="lb-stat-label">连胜</span>
      </div>
    `;

    if (records.length === 0) {
      listEl.innerHTML = '<div class="leaderboard-empty">暂无对战记录</div>';
      return;
    }

    listEl.innerHTML = records.map((r, idx) => {
      const teamNames = r.playerChars.map(c => c.name.charAt(0)).join(' / ');
      return `
        <div class="leaderboard-row ${r.result}">
          <span class="lb-result">${r.result === 'win' ? '胜' : '负'}</span>
          <span class="lb-team" title="${r.playerChars.map(c => c.name).join(' / ')}">${teamNames}</span>
          <span class="lb-damage">${r.totalDmg}</span>
          <span class="lb-date">${r.date}</span>
        </div>
      `;
    }).join('');
  }

  // 结算界面 tab 切换
  setupResultTabs() {
    const tabs = document.querySelectorAll('.result-tab');
    const panels = document.querySelectorAll('.result-tab-panel');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        tabs.forEach(t => t.classList.toggle('active', t === tab));
        panels.forEach(p => p.classList.toggle('active', p.id === `result-tab-${target}`));
        if (target === 'history') this.renderLeaderboard();
      });
    });
  }

  // 全局按钮音效委托
  setupButtonAudio() {
    // 点击音效
    document.addEventListener('click', (e) => {
      if (!this._audio) return;
      const t = e.target;
      if (!t) return;
      const btn = t.closest && t.closest('button, .charcard, .tab, .login-tab, .manga-btn, .character-card, [data-tab], [data-audio]');
      if (btn && !btn.disabled) {
        if (btn.dataset && btn.dataset.audio === 'select') {
          this._audio.playSelect();
        } else if (btn.dataset && btn.dataset.audio === 'error') {
          this._audio.playError();
        } else if (btn.dataset && btn.dataset.audio === 'tab') {
          this._audio.playTabSwitch();
        } else {
          this._audio.playButtonClick();
        }
      }
    }, true);

    // 悬浮音效（节流，避免疯狂触发）
    let lastHover = 0;
    document.addEventListener('mouseover', (e) => {
      if (!this._audio) return;
      const t = e.target;
      if (!t) return;
      const btn = t.closest && t.closest('button, .charcard, .manga-btn, [data-audio]');
      if (btn && Date.now() - lastHover > 60) {
        lastHover = Date.now();
        this._audio.playButtonHover();
      }
    });
  }

  showChangelogIfNew() {
    // 如果当前版本未看过更新公告，自动弹出一次
    try {
      const seenVersion = localStorage.getItem('jjk_changelog_seen');
      if (typeof GAME_VERSION !== 'undefined' && seenVersion !== GAME_VERSION) {
        const modal = document.getElementById('changelog-modal');
        if (modal) {
          // 延迟弹出，等页面渲染完成
          setTimeout(() => { modal.classList.remove('hidden'); }, 600);
          localStorage.setItem('jjk_changelog_seen', GAME_VERSION);
        }
      }
    } catch (e) {
      // localStorage 不可用则忽略
    }
  }

  setupChangelog() {
    const btn = document.getElementById('changelog-btn');
    const modal = document.getElementById('changelog-modal');
    const close = document.getElementById('changelog-close');
    const overlay = modal ? modal.querySelector('.changelog-overlay') : null;

    if (btn && modal) {
      btn.addEventListener('click', () => { modal.classList.remove('hidden'); });
    }
    if (close && modal) {
      close.addEventListener('click', () => { modal.classList.add('hidden'); });
    }
    if (overlay && modal) {
      overlay.addEventListener('click', () => { modal.classList.add('hidden'); });
    }
  }

  // 设置面板：音量滑块 + 键位自定义
  setupSettings(audio) {
    const modal = document.getElementById('settings-modal');
    const btn = document.getElementById('settings-btn');
    const close = document.getElementById('settings-close');
    const overlay = modal ? modal.querySelector('.settings-overlay') : null;
    const resetBtn = document.getElementById('settings-reset');
    const masterSlider = document.getElementById('vol-master');
    const bgmSlider = document.getElementById('vol-bgm');
    const masterVal = document.getElementById('vol-master-val');
    const bgmVal = document.getElementById('vol-bgm-val');
    const qualitySelect = document.getElementById('quality-select');
    const qualityHint = document.getElementById('quality-hint');

    // 读取保存的画质
    let savedQuality = 'medium';
    try {
      savedQuality = localStorage.getItem('jjk_quality') || 'medium';
    } catch (e) {}
    if (!['low', 'medium', 'high'].includes(savedQuality)) savedQuality = 'medium';

    if (qualitySelect) {
      qualitySelect.value = savedQuality;
      qualitySelect.addEventListener('change', () => {
        const q = qualitySelect.value;
        try { localStorage.setItem('jjk_quality', q); } catch (e) {}
        if (this._particles) this._particles.setQuality(q);
        if (this._qualityChangeCallback) this._qualityChangeCallback(q);
        if (qualityHint) {
          const recommended = QualityAdvisor.getRecommendedQuality();
          if (q !== recommended) {
            qualityHint.textContent = `当前设置超出设备推荐（推荐：${this._qualityLabel(recommended)}），若卡顿请调低`;
            qualityHint.style.color = '#ffaa44';
          } else {
            qualityHint.textContent = '画质设置与设备推荐一致';
            qualityHint.style.color = '#88ffaa';
          }
        }
      });
    }

    // 打开/关闭
    if (btn && modal) {
      btn.addEventListener('click', () => {
        this.renderKeybindKeys();
        this._refreshQualityHint();
        modal.classList.remove('hidden');
      });
    }

    // 战斗中也可打开设置
    const fightSettingsBtn = document.getElementById('fight-settings-btn');
    if (fightSettingsBtn && modal) {
      fightSettingsBtn.addEventListener('click', () => {
        if (this._pauseCallback) this._pauseCallback();
        this.renderKeybindKeys();
        this._refreshQualityHint();
        modal.classList.remove('hidden');
      });
    }

    if (close && modal) {
      close.addEventListener('click', () => {
        modal.classList.add('hidden');
        if (this._resumeCallback) this._resumeCallback();
      });
    }
    if (overlay && modal) {
      overlay.addEventListener('click', () => {
        modal.classList.add('hidden');
        if (this._resumeCallback) this._resumeCallback();
      });
    }

    // 初始化音量滑块
    if (masterSlider && audio) {
      masterSlider.value = Math.round(audio.masterVolume * 100);
      if (masterVal) masterVal.textContent = masterSlider.value + '%';
      masterSlider.addEventListener('input', () => {
        const v = parseInt(masterSlider.value) / 100;
        audio.setMasterVolume(v);
        localStorage.setItem('jjk_master_volume', v);
        if (masterVal) masterVal.textContent = masterSlider.value + '%';
      });
    }

    if (bgmSlider && audio) {
      bgmSlider.value = Math.round(audio.bgmVolume * 100);
      if (bgmVal) bgmVal.textContent = bgmSlider.value + '%';
      bgmSlider.addEventListener('input', () => {
        const v = parseInt(bgmSlider.value) / 100;
        audio.setBGMVolume(v);
        localStorage.setItem('jjk_bgm_volume', v);
        if (bgmVal) bgmVal.textContent = bgmSlider.value + '%';
      });
    }

    // 键位重置
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (typeof resetKeyMap === 'function') {
          window.KEY_MAP = resetKeyMap();
          this.renderKeybindKeys();
        }
      });
    }

    // ESC 关闭
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && modal && !modal.classList.contains('hidden')) {
        const listening = modal.querySelector('.keybind-key.listening');
        if (listening) {
          listening.classList.remove('listening');
          return;
        }
        modal.classList.add('hidden');
        if (this._resumeCallback) this._resumeCallback();
      }
    });
  }

  _qualityLabel(q) {
    return { low: '低', medium: '中', high: '高' }[q] || q;
  }

  _refreshQualityHint() {
    const qualityHint = document.getElementById('quality-hint');
    const qualitySelect = document.getElementById('quality-select');
    if (!qualityHint || !qualitySelect) return;
    const q = qualitySelect.value;
    const recommended = QualityAdvisor.getRecommendedQuality();
    if (q !== recommended) {
      qualityHint.textContent = `当前设置超出设备推荐（推荐：${this._qualityLabel(recommended)}），若卡顿请调低`;
      qualityHint.style.color = '#ffaa44';
    } else {
      qualityHint.textContent = '画质设置与设备推荐一致';
      qualityHint.style.color = '#88ffaa';
    }
  }

  applySavedQuality() {
    let savedQuality = 'medium';
    try {
      savedQuality = localStorage.getItem('jjk_quality') || 'medium';
    } catch (e) {}
    if (!['low', 'medium', 'high'].includes(savedQuality)) savedQuality = 'medium';
    const qualitySelect = document.getElementById('quality-select');
    if (qualitySelect) qualitySelect.value = savedQuality;
    if (this._particles) this._particles.setQuality(savedQuality);
    if (this._qualityChangeCallback) this._qualityChangeCallback(savedQuality);
  }

  // 将 KeyboardEvent.code 转换为可显示文本
  codeToDisplay(code) {
    const map = {
      'ArrowLeft': '←', 'ArrowRight': '→', 'ArrowUp': '↑', 'ArrowDown': '↓',
      'Space': 'Space', 'ShiftLeft': 'LShift', 'ShiftRight': 'RShift',
      'ControlLeft': 'LCtrl', 'ControlRight': 'RCtrl',
      'AltLeft': 'LAlt', 'AltRight': 'RAlt',
    };
    if (map[code]) return map[code];
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    return code;
  }

  // 渲染键位显示
  renderKeybindKeys() {
    const keyMap = (typeof KEY_MAP !== 'undefined') ? KEY_MAP : null;
    if (!keyMap) return;

    const actionLabels = {
      left: '移動左', right: '移動右', jump: '跳躍',
      attack: '攻撃', skill1: '術式1', skill2: '術式2',
      skill3: '術式3', skill4: '術式4', dodge: '閃避', ultimate: '領域',
    };

    for (const action of Object.keys(actionLabels)) {
      const container = document.getElementById('kb-' + action);
      if (!container) continue;
      container.innerHTML = '';

      const codes = keyMap[action] || [];
      codes.forEach((code) => {
        const el = document.createElement('span');
        el.className = 'keybind-key';
        el.textContent = this.codeToDisplay(code);
        el.dataset.action = action;
        el.dataset.code = code;

        el.addEventListener('click', () => {
          // 如果已处于监听状态，取消
          if (el.classList.contains('listening')) {
            el.classList.remove('listening');
            return;
          }
          // 取消所有监听
          document.querySelectorAll('.keybind-key.listening').forEach(k => k.classList.remove('listening'));
          // 进入监听
          el.classList.add('listening');
        });

        container.appendChild(el);
      });
    }

    // 监听按键捕获
    this._setupKeyCapture();
  }

  _keyCaptureHandler = null;

  _setupKeyCapture() {
    if (this._keyCaptureHandler) {
      document.removeEventListener('keydown', this._keyCaptureHandler);
    }

    this._keyCaptureHandler = (e) => {
      const listening = document.querySelector('.keybind-key.listening');
      if (!listening) return;

      e.preventDefault();
      e.stopPropagation();

      const newCode = e.code;
      const action = listening.dataset.action;
      const oldCode = listening.dataset.code;

      // 不允许重复绑定同一动作
      if (window.KEY_MAP[action].includes(newCode)) {
        listening.classList.remove('listening');
        return;
      }

      // 检查是否被其他动作占用
      for (const act of Object.keys(window.KEY_MAP)) {
        if (act === action) continue;
        const idx = window.KEY_MAP[act].indexOf(newCode);
        if (idx >= 0) {
          window.KEY_MAP[act].splice(idx, 1);
        }
      }

      // 更新当前动作
      const idx = window.KEY_MAP[action].indexOf(oldCode);
      if (idx >= 0) {
        window.KEY_MAP[action][idx] = newCode;
      }

      // 保存并重新渲染
      if (typeof saveKeyMap === 'function') {
        saveKeyMap(window.KEY_MAP);
      }
      listening.classList.remove('listening');
      this.renderKeybindKeys();
    };

    document.addEventListener('keydown', this._keyCaptureHandler);
  }

  renderChangelog() {
    const list = document.getElementById('changelog-list');
    if (!list || typeof GAME_CHANGELOG === 'undefined') return;

    let html = '';
    GAME_CHANGELOG.forEach((entry) => {
      html += `<div class="changelog-entry">
        <div class="changelog-entry-header">
          <span class="changelog-entry-ver">${entry.version}</span>
          <span class="changelog-entry-date">${entry.date}</span>
        </div>
        <div class="changelog-entry-title">${entry.title}</div>
        <ul class="changelog-entry-items">
          ${entry.items.map(item => `<li>${item}</li>`).join('')}
        </ul>
      </div>`;
    });
    list.innerHTML = html;

    // 更新版本号显示
    const verEl = document.querySelector('.version-number');
    const headVerEl = document.querySelector('.changelog-head-ver');
    const fightVerEl = document.querySelector('.version-number-fight');
    if (verEl && typeof GAME_VERSION !== 'undefined') verEl.textContent = GAME_VERSION;
    if (headVerEl && typeof GAME_VERSION !== 'undefined') headVerEl.textContent = GAME_VERSION;
    if (fightVerEl && typeof GAME_VERSION !== 'undefined') fightVerEl.textContent = GAME_VERSION;
  }

  setupMenuListeners() {
    // 初始化角色缩略图条
    this.p2SelectedCharacters = [];
    this.isP2Selecting = false; // 双人模式下 P1 选完后才会变成 true
    this.initThumbStrip();

    // 默认聚焦五条悟
    if (typeof CHARACTERS !== 'undefined' && CHARACTERS.gojo) {
      this.focusCharacter('gojo');
    }

    // 开始战斗
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
      startBtn.addEventListener('click', (e) => {
        this._spawnRipple(e, startBtn);
        if (!window.startGame) return;

        // 双人模式检查 P2 队伍
        if (typeof GAME_MODE !== 'undefined' && GAME_MODE === 'versus') {
          if (this.p2SelectedCharacters.length < this.maxSelect) {
            this.flashSelectionHint();
            // 如果 P1 已选满但 P2 还没选完，自动切换到 P2 选角
            if (this.selectedCharacters.length >= this.maxSelect && !this.isP2Selecting) {
              this.isP2Selecting = true;
              this._updateSelectingState();
            }
            return;
          }
          // 双人模式启动
          window.startGame(this.selectedCharacters, true, this.p2SelectedCharacters);
        } else {
          // 单人模式
          if (this.selectedCharacters.length < this.maxSelect) {
            this.flashSelectionHint();
            return;
          }
          window.startGame(this.selectedCharacters, false);
        }
      });
    }
  }

  // 模式切换（单人/双人）
  setupModeSwitchListeners() {
    const btns = document.querySelectorAll('.mode-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.toggle('active', b === btn));
        const mode = btn.dataset.mode;
        if (typeof GAME_MODE !== 'undefined') {
          GAME_MODE = mode;
        }
        // 在 body 上加 class，让 CSS 能根据模式调整布局
        document.body.classList.toggle('versus-mode', mode === 'versus');
        // 重置选角状态
        this.p2SelectedCharacters = [];
        this.isP2Selecting = false;
        this._updateSelectingState();
      });
    });
    // 初始状态也同步 body class
    if (typeof GAME_MODE !== 'undefined' && GAME_MODE === 'versus') {
      document.body.classList.add('versus-mode');
    }
  }

  _updateSelectingState() {
    const p2Bar = document.getElementById('p2-team-order-bar');
    const thumbStrip = document.querySelector('.char-thumb-strip');
    const hint = document.querySelector('.team-order-hint');

    if (typeof GAME_MODE !== 'undefined' && GAME_MODE === 'versus') {
      if (p2Bar) p2Bar.classList.remove('hidden');
      if (thumbStrip) thumbStrip.classList.toggle('p2-selecting', this.isP2Selecting);
      if (hint) {
        if (this.isP2Selecting) {
          hint.textContent = 'P2 选角中，点击已选可取消';
          hint.style.color = '#6b9aff';
        } else {
          hint.textContent = 'P1 选角中：点击缩略图加入 / 点击槽位移除';
          hint.style.color = '';
        }
      }
    } else {
      if (p2Bar) p2Bar.classList.add('hidden');
      if (thumbStrip) thumbStrip.classList.remove('p2-selecting');
      if (hint) hint.textContent = '点击已选角色可取消，重新选择以调整顺序';
      if (hint) hint.style.color = '';
    }

    // 开始按钮文字
    const btnSub = document.getElementById('btn-sub-text');
    if (btnSub) {
      if (typeof GAME_MODE !== 'undefined' && GAME_MODE === 'versus') {
        btnSub.innerHTML = this.isP2Selecting
          ? `P2: ${this.p2SelectedCharacters.length}/${this.maxSelect}`
          : `P1: ${this.selectedCharacters.length}/${this.maxSelect}`;
      } else {
        btnSub.innerHTML = `SELECT <span id="select-count">${this.selectedCharacters.length}/${this.maxSelect}</span>`;
      }
    }
  }

  // 初始化底部角色缩略图条
  initThumbStrip() {
    const strip = document.getElementById('thumb-strip-inner');
    if (!strip || typeof CHARACTERS === 'undefined') return;
    strip.innerHTML = '';

    const sealMap = { gojo: '無', sukuna: '宿', yuji: '虎' };
    const playableIds = ['gojo', 'sukuna', 'yuji'];

    playableIds.forEach(id => {
      const char = CHARACTERS[id];
      if (!char) return;
      const thumb = document.createElement('div');
      thumb.className = 'char-thumb';
      thumb.dataset.charId = id;
      thumb.innerHTML = `<span class="thumb-seal">${sealMap[id] || char.name[0]}</span><span class="thumb-count"></span>`;

      // 悬停：预览角色（不点击）
      thumb.addEventListener('mouseenter', () => {
        if (this._audio) this._audio.playThumbHover();
        this.focusCharacter(id);
      });

      // 点击：根据当前阶段决定加入哪个队伍
      const self = this;
      thumb.addEventListener('click', (e) => {
        this._spawnRipple(e, thumb);
        thumb.classList.remove('thumbing');
        void thumb.offsetWidth;
        thumb.classList.add('thumbing');

        const isVersus = typeof GAME_MODE !== 'undefined' && GAME_MODE === 'versus';

        if (isVersus && this.isP2Selecting) {
          // P2 选角阶段
          const idx = this.p2SelectedCharacters.indexOf(id);
          if (idx !== -1) {
            this.p2SelectedCharacters.splice(idx, 1);
            if (this._audio) this._audio.playError();
            this.updateSelectionUI();
            return;
          }
          if (this.p2SelectedCharacters.length >= this.maxSelect) {
            if (this._audio) this._audio.playError();
            this.flashSelectionHint();
            return;
          }
          this.p2SelectedCharacters.push(id);
          if (this._audio) this._audio.playSelect();
          this.updateSelectionUI();
          // P2 选满后切换回 P1 预览
          if (this.p2SelectedCharacters.length >= this.maxSelect && this._audio) {
            this._audio.playSelect();
          }
        } else {
          // P1 选角阶段（或单人模式）
          const idx = this.selectedCharacters.indexOf(id);
          if (idx !== -1) {
            this.selectedCharacters.splice(idx, 1);
            if (this._audio) this._audio.playError();
            this.updateSelectionUI();
            return;
          }
          if (this.selectedCharacters.length >= this.maxSelect) {
            if (this._audio) this._audio.playError();
            // 双人模式下 P1 选满后自动进入 P2 选角
            if (isVersus) {
              this.isP2Selecting = true;
              this._updateSelectingState();
            } else {
              this.flashSelectionHint();
            }
            return;
          }
          this.selectedCharacters.push(id);
          if (this._audio) this._audio.playSelect();
          this.updateSelectionUI();
        }
      });

      strip.appendChild(thumb);
    });

    // 绑定登场顺序槽位点击（P1）
    const orderSlots = document.getElementById('team-order-slots');
    if (orderSlots) {
      orderSlots.querySelectorAll('.team-order-slot').forEach(slot => {
        slot.addEventListener('click', () => {
          if (this.isP2Selecting) return; // P2 选角阶段不响应 P1 槽位
          const slotIndex = parseInt(slot.dataset.slot, 10);
          if (slotIndex < this.selectedCharacters.length) {
            this.selectedCharacters.splice(slotIndex, 1);
            if (this._audio) this._audio.playError();
            this.updateSelectionUI();
          }
        });
      });
    }

    // P2 槽位点击
    const p2OrderSlots = document.getElementById('p2-team-order-slots');
    if (p2OrderSlots) {
      p2OrderSlots.querySelectorAll('.team-order-slot').forEach(slot => {
        slot.addEventListener('click', () => {
          const slotIndex = parseInt(slot.dataset.p2Slot, 10);
          if (slotIndex < this.p2SelectedCharacters.length) {
            this.p2SelectedCharacters.splice(slotIndex, 1);
            if (this._audio) this._audio.playError();
            this.updateSelectionUI();
          }
        });
      });
    }

    // 默认队伍
    this.selectedCharacters = ['gojo', 'sukuna', 'yuji'];
    this.p2SelectedCharacters = [];
    this.isP2Selecting = false;
    this._updateSelectingState();
    this.updateSelectionUI();
  }

  // 聚焦/预览某个角色：更新立绘 + 名牌 + 属性 + 技能
  focusCharacter(charId) {
    if (typeof CHARACTERS === 'undefined' || !CHARACTERS[charId]) return;
    const char = CHARACTERS[charId];

    // 高亮当前缩略图
    document.querySelectorAll('.char-thumb').forEach(t => {
      t.classList.toggle('active', t.dataset.charId === charId);
    });

    // 立绘颜色主题
    const portraitArea = document.getElementById('char-portrait-area');
    if (portraitArea) {
      portraitArea.style.setProperty('--char-color', char.color || '#e11d2a');
      portraitArea.style.setProperty('--char-glow', this._hexToRgba(char.glowColor || char.color || '#e11d2a', 0.35));
    }

    // 角色名
    const nameKanji = document.getElementById('portrait-name-kanji');
    const nameEn = document.getElementById('portrait-name-en');
    const nameTitle = document.getElementById('portrait-name-title');
    const bgKanji = document.getElementById('portrait-bg-kanji');
    if (nameKanji) nameKanji.textContent = char.name;
    if (nameEn) nameEn.textContent = this._charIdToEn(charId);
    if (nameTitle) nameTitle.textContent = char.title || '';
    const sealMap = { yuji: '虎', sukuna: '宿', gojo: '無' };
    if (bgKanji) bgKanji.textContent = sealMap[charId] || char.name[0];

    // 切换动画
    const figure = document.getElementById('portrait-figure');
    const nameplate = document.querySelector('.portrait-nameplate');
    [figure, nameplate, bgKanji].forEach(el => {
      if (!el) return;
      el.classList.remove('switching');
      void el.offsetWidth;
      el.classList.add('switching');
    });
    if (this._audio) this._audio.playPortraitSwitch();

    // 属性
    const detailType = document.getElementById('detail-type');
    if (detailType) detailType.textContent = this._charTypeLabel(charId);

    const hpVal = document.getElementById('stat-hp-val');
    const atkVal = document.getElementById('stat-atk-val');
    const spdVal = document.getElementById('stat-spd-val');
    const ceVal = document.getElementById('stat-ce-val');
    if (hpVal) hpVal.textContent = char.maxHp;
    if (atkVal) atkVal.textContent = char.attack;
    if (spdVal) spdVal.textContent = char.speed;
    if (ceVal) ceVal.textContent = char.maxCursedEnergy;

    // 属性条填充
    const maxHpRef = 1600, maxAtkRef = 120, maxSpdRef = 12, maxCeRef = 160;
    this._setStatFill('stat-hp', Math.min(1, char.maxHp / maxHpRef));
    this._setStatFill('stat-atk', Math.min(1, char.attack / maxAtkRef));
    this._setStatFill('stat-spd', Math.min(1, char.speed / maxSpdRef));
    this._setStatFill('stat-ce', Math.min(1, char.maxCursedEnergy / maxCeRef));

    // 技能列表
    const skillList = document.getElementById('skill-list');
    if (skillList) {
      skillList.innerHTML = '';
      (char.skills || []).forEach(s => {
        const item = document.createElement('div');
        item.className = 'skill-item';
        item.innerHTML = `<span class="skill-item-name">${s.name}</span><span class="skill-item-desc">${s.description || ''}</span>`;
        item.addEventListener('mouseenter', () => {
          item.classList.remove('rippling');
          void item.offsetWidth;
          item.classList.add('rippling');
        });
        skillList.appendChild(item);
      });
    }

    // 领域
    const domainName = document.getElementById('domain-name');
    if (domainName && char.ultimate) domainName.textContent = char.ultimate.name || '—';
  }

  _setStatFill(cls, ratio) {
    const el = document.querySelector(`.stat-fill.${cls}`);
    if (el) {
      el.style.width = '0%';
      requestAnimationFrame(() => {
        el.style.width = (ratio * 100) + '%';
      });
    }
  }

  _charIdToEn(id) {
    const map = {
      yuji: 'YUJI ITADORI',
      sukuna: 'RYOMEN SUKUNA',
      gojo: 'SATORU GOJO'
    };
    return map[id] || id.toUpperCase();
  }

  _charTypeLabel(id) {
    const map = {
      yuji: '近战强攻',
      sukuna: '诅咒之王',
      gojo: '全能天花板'
    };
    return map[id] || '术师';
  }

  _hexToRgba(hex, alpha) {
    if (!hex || hex[0] !== '#') return `rgba(225,29,42,${alpha})`;
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  // 通用涟漪生成
  _spawnRipple(event, container) {
    if (!event || !container) return;
    const rect = container.getBoundingClientRect();
    const x = (event.clientX || rect.left + rect.width / 2) - rect.left;
    const y = (event.clientY || rect.top + rect.height / 2) - rect.top;
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    container.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }

  // 未选满角色时闪烁提示
  flashSelectionHint() {
    const countEl = document.getElementById('select-count');
    if (!countEl) return;
    countEl.style.color = '#ff2a3a';
    countEl.style.textShadow = '0 0 10px rgba(255, 42, 58, 0.8)';
    setTimeout(() => {
      countEl.style.color = '';
      countEl.style.textShadow = '';
    }, 500);
    if (this._audio) this._audio.playError();
  }

  updateSelectionUI() {
    const startBtn = document.getElementById('start-btn');
    const countEl = document.getElementById('select-count');
    if (countEl) {
      countEl.textContent = `${this.selectedCharacters.length}/${this.maxSelect}`;
    }

    // 双人模式下实时更新 _updateSelectingState 里的按钮文字
    if (typeof GAME_MODE !== 'undefined' && GAME_MODE === 'versus') {
      this._updateSelectingState();
    }

    if (startBtn) {
      const isVersus = typeof GAME_MODE !== 'undefined' && GAME_MODE === 'versus';
      const ready = isVersus
        ? (this.selectedCharacters.length === this.maxSelect && this.p2SelectedCharacters.length === this.maxSelect)
        : (this.selectedCharacters.length === this.maxSelect);
      startBtn.style.opacity = ready ? '1' : '0.55';
      startBtn.style.pointerEvents = ready ? '' : 'none';
      const btnText = startBtn.querySelector('.btn-text');
      if (btnText) {
        btnText.textContent = ready ? '戦闘開始' : (isVersus ? '選択中' : `3人選択`);
      }
    }

    // 更新缩略图选中状态与数量
    document.querySelectorAll('.char-thumb').forEach(t => {
      const count = this.selectedCharacters.filter(id => id === t.dataset.charId).length;
      // P2 也选了的话显示更多，但缩略图只显示 P1 选中数
      t.classList.toggle('selected', count > 0);
      const countEl = t.querySelector('.thumb-count');
      if (countEl) countEl.textContent = count > 0 ? count : '';
    });

    // 更新登场顺序条 P1
    const slots = document.querySelectorAll('#team-order-slots .team-order-slot');
    const sealMap = { gojo: '無', sukuna: '宿', yuji: '虎' };
    slots.forEach((slot, i) => {
      const id = this.selectedCharacters[i];
      slot.innerHTML = '';
      if (id) {
        const char = CHARACTERS[id];
        slot.classList.add('filled');
        slot.dataset.char = id;
        slot.innerHTML = `<span class="order-num">${i === 0 ? '1st' : i === 1 ? '2nd' : '3rd'}</span><span class="slot-char">${sealMap[id] || char.name[0]}</span>`;
      } else {
        slot.classList.remove('filled');
        slot.removeAttribute('data-char');
        slot.innerHTML = `<span class="order-num">${i === 0 ? '1st' : i === 1 ? '2nd' : '3rd'}</span>`;
      }
    });

    // P2 登场顺序条
    const p2Slots = document.querySelectorAll('#p2-team-order-slots .team-order-slot');
    p2Slots.forEach((slot, i) => {
      const id = this.p2SelectedCharacters[i];
      slot.innerHTML = '';
      if (id) {
        const char = CHARACTERS[id];
        slot.classList.add('filled');
        slot.dataset.p2Char = id;
        slot.innerHTML = `<span class="order-num">${i === 0 ? '1st' : i === 1 ? '2nd' : '3rd'}</span><span class="slot-char">${sealMap[id] || char.name[0]}</span>`;
      } else {
        slot.classList.remove('filled');
        slot.removeAttribute('data-p2-char');
        slot.innerHTML = `<span class="order-num">${i === 0 ? '1st' : i === 1 ? '2nd' : '3rd'}</span>`;
      }
    });
  }

  setupFightListeners() {
    // 摇杆
    this.setupJoystick();

    // 攻击按钮
    this.setupButton(document.getElementById('btn-attack'), 'attack');
    this.setupButton(document.getElementById('btn-skill1'), 'skill1');
    this.setupButton(document.getElementById('btn-skill2'), 'skill2');
    this.setupButton(document.getElementById('btn-skill3'), 'skill3');
    this.setupButton(document.getElementById('btn-skill4'), 'skill4');
    this.setupButton(document.getElementById('btn-dodge'), 'dodge');
    this.setupButton(document.getElementById('btn-ultimate'), 'ultimate');
    this.setupButton(document.getElementById('btn-simple-domain'), 'simpleDomain');

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

  // 强制重置摇杆状态（切屏/重新开始时调用）
  resetJoystick() {
    if (this._resetJoystick) this._resetJoystick();
  }

  // 虚拟摇杆（同时支持 touch 与 pointer，修复移动端偶发失效）
  setupJoystick() {
    const stick = document.getElementById('joystick');
    if (!stick) return;

    const thumb = stick.querySelector('.joystick-thumb');
    const zones = stick.querySelectorAll('.joystick-zone');
    const maxDist = 65 - 22; // 半径 65px，thumb 半径约 18px，留边距

    let activeDir = null;
    let tracking = false;
    let touchId = null;

    const getDir = (dx, dy) => {
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 18) return null; // 中心死区，避免轻微偏移误触
      // 必须明显偏向某一轴才触发方向，防止左右移动时轻微偏上变成跳跃
      const ratio = 0.55;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > dist * ratio) {
        return dx > 0 ? 'right' : 'left';
      }
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > dist * ratio) {
        return dy < 0 ? 'jump' : null; // 向下无实际作用，忽略
      }
      return null;
    };

    const clearActive = () => {
      if (activeDir && window.handleInput) {
        window.handleInput(activeDir, false);
      }
      activeDir = null;
      zones.forEach(z => z.classList.remove('active'));
    };

    const setActive = (dir) => {
      if (dir === activeDir) return;
      clearActive();
      activeDir = dir;
      if (dir) {
        zones.forEach(z => {
          z.classList.toggle('active', z.dataset.dir === dir);
        });
        if (window.handleInput) window.handleInput(dir, true);
      }
    };

    const endTracking = () => {
      tracking = false;
      touchId = null;
      if (thumb) thumb.style.transform = '';
      clearActive();
    };
    this._resetJoystick = endTracking;

    const handleMove = (clientX, clientY) => {
      if (!tracking) return;
      const r = stick.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const dist = Math.min(maxDist, Math.sqrt(dx * dx + dy * dy));
      const angle = Math.atan2(dy, dx);

      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist;
      if (thumb) {
        thumb.style.transform = `translate(${tx}px, ${ty}px)`;
      }

      setActive(getDir(dx, dy));
    };

    // Pointer 事件（桌面端 + 支持 pointer 的移动设备）
    stick.addEventListener('pointerdown', (e) => {
      if (tracking) return;
      e.preventDefault();
      tracking = true;
      try { stick.setPointerCapture(e.pointerId); } catch (_) {}
      handleMove(e.clientX, e.clientY);
    }, { passive: false });

    stick.addEventListener('pointermove', (e) => {
      if (!tracking) return;
      e.preventDefault();
      handleMove(e.clientX, e.clientY);
    }, { passive: false });

    const pointerEnd = (e) => {
      if (!tracking) return;
      e.preventDefault();
      try { stick.releasePointerCapture(e.pointerId); } catch (_) {}
      endTracking();
    };
    stick.addEventListener('pointerup', pointerEnd, { passive: false });
    stick.addEventListener('pointercancel', pointerEnd, { passive: false });
    // 鼠标移出摇杆区域也释放，防止指针未捕获时状态卡住
    stick.addEventListener('pointerleave', pointerEnd, { passive: false });

    // Touch 事件（兼容性兜底，防止 pointer 事件未触发或滚动拦截）
    stick.addEventListener('touchstart', (e) => {
      if (tracking) return;
      e.preventDefault();
      tracking = true;
      touchId = e.changedTouches[0].identifier;
      handleMove(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    }, { passive: false });

    stick.addEventListener('touchmove', (e) => {
      if (!tracking) return;
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === touchId) {
          handleMove(t.clientX, t.clientY);
          break;
        }
      }
    }, { passive: false });

    const touchEnd = (e) => {
      if (!tracking) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchId) {
          e.preventDefault();
          endTracking();
          break;
        }
      }
    };
    stick.addEventListener('touchend', touchEnd, { passive: false });
    stick.addEventListener('touchcancel', touchEnd, { passive: false });

    // 切出页面时强制释放，避免后台回来仍卡住方向
    window.addEventListener('blur', endTracking);
  }

  setupButton(el, action) {
    if (!el) return;
    const start = (e) => {
      e.preventDefault();
      if (window.handleInput) window.handleInput(action, true);
    };
    const end = (e) => {
      e.preventDefault();
      if (window.handleInput) window.handleInput(action, false);
    };
    el.addEventListener('pointerdown', start, { passive: false });
    el.addEventListener('pointerup', end, { passive: false });
    el.addEventListener('pointercancel', end, { passive: false });
    el.addEventListener('touchstart', start, { passive: false });
    el.addEventListener('touchend', end, { passive: false });
    el.addEventListener('touchcancel', end, { passive: false });
  }

  handleKeyboard(e, pressed) {
    if (!window.handleInput) return;
    if (document.getElementById('fight-screen').classList.contains('hidden')) return;

    const code = e.code;
    const keyMap = (typeof KEY_MAP !== 'undefined') ? KEY_MAP : null;
    if (!keyMap) return;

    // 检查 P1 键位
    const p1Map = keyMap.p1 || keyMap;
    for (const act of Object.keys(p1Map)) {
      if (p1Map[act].includes(code)) {
        e.preventDefault();
        window.handleInput(act, pressed, 'p1');
        return;
      }
    }

    // 检查 P2 键位（仅双人模式）
    if (keyMap.p2 && typeof GAME_MODE !== 'undefined' && GAME_MODE === 'versus') {
      for (const act of Object.keys(keyMap.p2)) {
        if (keyMap.p2[act].includes(code)) {
          e.preventDefault();
          window.handleInput(act, pressed, 'p2');
          return;
        }
      }
    }
  }

  showMenu() {
    this.menuEl.classList.remove('hidden');
    this.fightEl.classList.add('hidden');
    this.resultEl.classList.add('hidden');

    // 重置角色选择状态
    document.querySelectorAll('.char-card.selected').forEach(c => c.classList.remove('selected'));
    this.selectedCharacters = [];
    this.updateSelectionUI();
  }

  // 根据设备类型调整 UI
  adaptToDevice() {
    const device = document.documentElement.getAttribute('data-device');
    const keyHints = document.querySelector('.key-hints');

    if (device === 'desktop') {
      // 桌面：显示键盘提示
      if (keyHints) keyHints.style.display = '';
    } else {
      // 手机/平板：隐藏键盘提示
      if (keyHints) keyHints.style.display = 'none';
    }

    // 触屏设备：增大按钮点击区域
    if (device !== 'desktop') {
      document.body.classList.add('touch-ui');
    } else {
      document.body.classList.remove('touch-ui');
    }
  }

  showFight(char) {
    this.resetJoystick();
    this.menuEl.classList.add('hidden');
    this.fightEl.classList.remove('hidden');
    this.resultEl.classList.add('hidden');
    if (char) this.initFightUI(char);
  }

  // 根据角色动态初始化技能按钮
  initFightUI(char) {
    const skill3Btn = document.getElementById('btn-skill3');
    const skill4Btn = document.getElementById('btn-skill4');

    // 根据设备类型显示/隐藏键盘提示
    this.adaptToDevice();

    // 技能3按钮：当角色拥有第 3 个技能时显示（如五条悟「茈」、宿傩「捌」）
    if (skill3Btn) {
      const hasSkill3 = char.skills.length >= 3;
      skill3Btn.style.display = hasSkill3 ? '' : 'none';
      if (hasSkill3) {
        const s3 = char.skills[2];
        const nameEl = skill3Btn.querySelector('.skill-name');
        if (nameEl && s3) nameEl.textContent = s3.name;
        // 按角色动态切换技能3按钮配色：宿傩血红，其余沿用紫色（五条悟）
        if (char.id === 'sukuna') {
          skill3Btn.style.setProperty('--skill3-rgb', '180, 30, 30');
          skill3Btn.style.setProperty('--skill3-rgb-bright', '255, 80, 80');
        } else {
          skill3Btn.style.setProperty('--skill3-rgb', '108, 92, 231');
          skill3Btn.style.setProperty('--skill3-rgb-bright', '162, 155, 254');
        }
      }
    }

    // 技能4按钮：仅当角色拥有第 4 个技能时显示（如宿傩的「灶（开）」）
    if (skill4Btn) {
      const hasSkill4 = char.skills.length >= 4;
      skill4Btn.style.display = hasSkill4 ? '' : 'none';
      if (hasSkill4) {
        const s4 = char.skills[3];
        const nameEl = skill4Btn.querySelector('.skill-name');
        if (nameEl && s4) nameEl.textContent = s4.name;
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

    // 奥义名称（没有领域的角色隐藏按钮）
    const ultBtn = document.getElementById('btn-ultimate');
    if (ultBtn) {
      if (char.ultimate) {
        ultBtn.style.display = 'flex';
        const nameEl = ultBtn.querySelector('.skill-name');
        if (nameEl) nameEl.textContent = char.ultimate.name;
      } else {
        ultBtn.style.display = 'none';
      }
    }

    // 简易领域按钮默认显示
    const simpleBtn = document.getElementById('btn-simple-domain');
    if (simpleBtn) {
      simpleBtn.style.display = 'flex';
      const nameEl = simpleBtn.querySelector('.skill-name');
      if (nameEl) nameEl.textContent = '簡易領域';
    }

    // 重置冷却显示并缓存按钮元素，避免每帧 querySelector
    this._skillBtnCache = {};
    const ensureOverlay = (btn) => {
      let overlay = btn.querySelector('.cd-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'cd-overlay';
        btn.appendChild(overlay);
      }
      let cdText = btn.querySelector('.skill-cd');
      if (!cdText) {
        cdText = document.createElement('span');
        cdText.className = 'skill-cd';
        btn.appendChild(cdText);
      }
      return { overlay, cdText };
    };
    const cacheBtn = (id, skill, maxCd) => {
      const btn = document.getElementById(`btn-${id}`);
      if (!btn) return;
      const { overlay, cdText } = ensureOverlay(btn);
      cdText.textContent = '-';
      cdText.className = 'skill-cd';
      this._skillBtnCache[id] = { btn, overlay, cdText, skill, maxCd, _lastState: null };
    };

    const skills = char.skills || [];
    cacheBtn('skill1', skills[0]);
    cacheBtn('skill2', skills[1]);
    cacheBtn('skill3', skills[2]);
    cacheBtn('skill4', skills[3]);
    cacheBtn('ultimate', char.ultimate, char.ultimate ? char.ultimate.cooldown : 0);
    cacheBtn('simpleDomain', null, 600);
  }

  // 准备倒计时
  startReadyCountdown(callback) {
    const overlay = document.getElementById('ready-overlay');
    const text = document.getElementById('ready-text');
    if (!overlay || !text) return callback();

    overlay.classList.remove('hidden');
    text.textContent = '3';
    let count = 3;
    let ticked = false;
    if (this._audio) this._audio.playCountdown();

    const tick = () => {
      if (ticked) return; // 防止双重触发
      if (count <= 0) {
        ticked = true;
        overlay.classList.add('hidden');
        this.showBattleStart();
        callback();
        return;
      }
      text.textContent = count;
      text.style.animation = 'none';
      void text.offsetWidth; // reflow
      text.style.animation = 'countPulse 1s ease-in-out';
      if (this._audio && count < 3) this._audio.playCountdown();
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

  // 回合开始倒计时（带回合数显示）
  startRoundCountdown(round, callback) {
    const overlay = document.getElementById('ready-overlay');
    const text = document.getElementById('ready-text');
    const roundLabel = document.getElementById('ready-round');
    if (!overlay || !text) return callback();

    overlay.classList.remove('hidden');
    if (roundLabel) roundLabel.textContent = `第 ${round} 回戦`;
    text.textContent = '3';
    let count = 3;
    let ticked = false;
    if (this._audio) this._audio.playCountdown();

    const tick = () => {
      if (ticked) return;
      if (count <= 0) {
        ticked = true;
        overlay.classList.add('hidden');
        this.showBattleStart();
        callback();
        return;
      }
      text.textContent = count;
      text.style.animation = 'none';
      void text.offsetWidth;
      text.style.animation = 'countPulse 1s ease-in-out';
      if (this._audio && count < 3) this._audio.playCountdown();
      count--;
      setTimeout(tick, 1000);
    };
    tick();
  }

  // 回合结束总结
  showRoundSummary({ round, winnerName, winnerHp, winnerMaxHp, loserName, reason }) {
    const overlay = document.getElementById('round-summary');
    if (!overlay) return;
    const title = document.getElementById('round-summary-title');
    const winnerEl = document.getElementById('round-summary-winner');
    const hpEl = document.getElementById('round-summary-hp');
    const reasonEl = document.getElementById('round-summary-reason');

    if (title) title.textContent = `第 ${round} 回戦終了`;
    if (winnerEl) winnerEl.textContent = winnerName ? `勝者：${winnerName}` : '同時判負';
    if (hpEl) hpEl.textContent = winnerName ? `残り HP：${Math.max(0, Math.ceil(winnerHp))} / ${winnerMaxHp}` : `${loserName || ''}`;
    if (reasonEl) {
      const reasonMap = { ko: 'K.O.', timeup: '時間切れ', tie: '同時 K.O.' };
      reasonEl.textContent = reasonMap[reason] || reason;
    }

    overlay.classList.remove('hidden');
  }

  hideRoundSummary() {
    const overlay = document.getElementById('round-summary');
    if (overlay) overlay.classList.add('hidden');
  }

  // 比赛结束动画
  showMatchEndAnimation(winner, callback) {
    const overlay = document.getElementById('match-end');
    const text = document.getElementById('match-end-text');
    if (!overlay) return callback();

    if (text) text.textContent = winner === 'player' ? '勝利' : 'K.O.';
    overlay.classList.remove('hidden');
    if (this._audio) this._audio.playSkill('heavy');

    setTimeout(() => {
      overlay.classList.add('hidden');
      callback();
    }, 2200);
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
    const totalDmg = playerTeam.reduce((s, f) => s + (f.totalDamage || 0), 0);

    let html = `<div class="stat-row">我方剩余: ${playerAlive}/3 &nbsp; 敌方剩余: ${enemyAlive}/3</div>`;
    html += `<div class="stat-row">总伤害: ${totalDmg}</div>`;
    for (let i = 0; i < playerTeam.length; i++) {
      const f = playerTeam[i];
      html += `<div class="stat-row">
        <span>${f.character.name}</span>
        <span class="stat-damage">伤害: ${f.totalDamage || 0}</span>
        <span class="stat-hp">HP: ${Math.ceil(Math.max(0, f.currentHp))}</span>
      </div>`;
    }
    resultStats.innerHTML = html;

    // 保存对战记录并刷新排行榜
    this.saveBattleRecord(winner, playerTeam, enemyTeam);
    this.renderLeaderboard();

    // 默认显示本局统计
    document.querySelectorAll('.result-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'current'));
    document.querySelectorAll('.result-tab-panel').forEach(p => p.classList.toggle('active', p.id === 'result-tab-current'));

    // 重新挑战
    document.getElementById('btn-retry').onclick = () => {
      if (window.restartGame) window.restartGame();
    };
    // 返回菜单
    document.getElementById('btn-menu').onclick = () => {
      this.showMenu();
    };
  }

  updateSkillCooldowns(player) {
    if (!player || !this._skillBtnCache) return;
    const char = player.character;

    const updateCachedBtn = (id, cd) => {
      const c = this._skillBtnCache[id];
      if (!c) return;
      const { btn, overlay, cdText, skill, maxCd } = c;

      const tid = skill && player.getSkillTechniqueId ? player.getSkillTechniqueId(skill) : null;
      const burnout = tid && player.isTechniqueBurnout ? player.isTechniqueBurnout(tid) : false;
      const sec = cd > 0 ? Math.ceil(cd / 60) : 0;

      let cost = 0;
      if (id === 'ultimate') {
        cost = char.ultimate ? char.ultimate.cost : 0;
      } else if (id === 'simpleDomain') {
        cost = 50;
      } else if (skill) {
        cost = skill.cost || 0;
      }
      const chargeReady = id !== 'ultimate' || player.isDomainChargeReady();
      const ready = cd <= 0 && player.cursedEnergy >= cost && chargeReady;

      // 只有状态变化时才写 DOM，减少每帧重排
      const charge = id === 'ultimate' ? (player.domainDamageCharge || 0) : null;
      const last = c._lastState;
      if (last && last.sec === sec && last.burnout === burnout && last.ready === ready && last.charge === charge) return;
      c._lastState = { sec, burnout, ready, charge };

      // 术士熔断：该技能所属生得术式熔断时按钮变红
      if (burnout && id !== 'attack') {
        overlay.style.height = '100%';
        overlay.style.opacity = '0.85';
        overlay.style.background = 'rgba(255, 30, 30, 0.55)';
        const b = player.getTechniqueBurnout ? player.getTechniqueBurnout(tid) : null;
        const bSecs = b ? Math.ceil(b.timer / 60) : 0;
        cdText.textContent = bSecs > 0 ? `熔断 ${bSecs}s` : '熔断';
        cdText.className = 'skill-cd burnout';
        btn.classList.remove('ready');
        return;
      }

      overlay.style.background = '';
      if (cd > 0) {
        const ratio = cd / (maxCd || skill?.cooldown || 1);
        overlay.style.height = `${ratio * 100}%`;
        overlay.style.opacity = '0.7';
      } else {
        overlay.style.height = '0%';
        overlay.style.opacity = '0';
      }

      if (cd > 0) {
        cdText.textContent = `${sec}s`;
        cdText.className = 'skill-cd';
      } else if (id === 'ultimate' && !player.isDomainChargeReady()) {
        const ratio = Math.min(1, (player.domainDamageCharge || 0) / 300);
        cdText.textContent = `${Math.floor(ratio * 100)}%`;
        cdText.className = 'skill-cd';
      } else {
        cdText.textContent = '◇';
        cdText.className = 'skill-cd ready';
      }

      btn.classList.toggle('ready', ready);
    };

    updateCachedBtn('skill1', player.cooldowns['skill1']);
    updateCachedBtn('skill2', player.cooldowns['skill2']);
    updateCachedBtn('skill3', player.cooldowns['skill3'] || 0);
    updateCachedBtn('skill4', player.cooldowns['skill4'] || 0);
    if (char.ultimate) {
      updateCachedBtn('ultimate', player.cooldowns[char.ultimate.id]);
    }
    updateCachedBtn('simpleDomain', player.simpleDomainCooldown || 0);
  }

  // 更新顶部回合计时器显示
  updateRoundTimer(seconds) {
    if (!this._hudTimerEl) {
      this._hudTimerEl = document.getElementById('hud-timer');
    }
    const el = this._hudTimerEl;
    if (!el) return;
    const s = Math.max(0, Math.ceil(seconds));
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    const text = `${m}:${sec}`;
    if (this._hudTimerLast !== text) {
      el.textContent = text;
      this._hudTimerLast = text;
    }
    if (s <= 10) {
      el.classList.add('urgent');
    } else {
      el.classList.remove('urgent');
    }
  }
}