// 音频系统 - 咒术回战风格 Web Audio API 合成
class AudioSystem {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.masterVolume = 0.3;
    this.bgmVolume = 0.15;
    this.initialized = false;
    // BGM 状态
    this.bgmActive = false;
    this.bgmScene = null;
    this.bgmNodes = [];
    this.bgmGain = null;
    this.bgmLoop = null;
    // 语音合成
    this.voiceEnabled = true;
    this.voiceCooldown = 0;
  }

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.initialized = true;
    } catch (e) {
      this.enabled = false;
    }
    // 预加载语音列表（Chrome/Safari 需要异步）
    if ('speechSynthesis' in window) {
      this._voices = window.speechSynthesis.getVoices();
      if (!this._voices || this._voices.length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          this._voices = window.speechSynthesis.getVoices();
        };
      }
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // ========================================
  // 工具：带淡入淡出的音符（防咔嗒声核心）
  // ========================================
  note(ctx, freq, start, duration, gainNode, type = 'sine', vol = 0.15) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    // 关键：所有音符必须淡入+淡出，否则边沿会咔嗒响
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(vol, start + 0.015);
    g.gain.setValueAtTime(vol, start + Math.max(0.02, duration - 0.04));
    g.gain.linearRampToValueAtTime(0, start + duration);
    osc.connect(g);
    g.connect(gainNode);
    osc.start(start);
    osc.stop(start + duration + 0.02);
    return { osc, gain: g };
  }

  // 安全的噪声（已经经过滤波+短促淡变，绝不外露纯白噪）
  // startTime 为可选参数，用于 BGM 精确时间编排
  safeNoise(ctx, duration, freq, q, startVol, endFreq, gainNode, startTime = null) {
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    // 带通滤波（窄带通）
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    const start = startTime !== null ? startTime : ctx.currentTime;
    bp.frequency.setValueAtTime(freq, start);
    if (endFreq) {
      bp.frequency.exponentialRampToValueAtTime(endFreq, start + duration);
    }
    bp.Q.setValueAtTime(q, start);
    // 低通滤波（切除高频嘶嘶声，防噪音）
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(Math.min(freq * 3, 4000), start);
    lp.Q.setValueAtTime(0.7, start);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(startVol, start + 0.02);
    g.gain.linearRampToValueAtTime(0, start + duration);
    src.connect(bp);
    bp.connect(lp);
    lp.connect(g);
    g.connect(gainNode);
    src.start(start);
    src.stop(start + duration);
    return { src, g };
  }

  // ========================================
  // 战斗音效
  // ========================================

  // 轻攻击：清脆木鱼/皮击
  playHit(intensity = 0.5) {
    if (!this.ctx || !this.enabled) return;
    this.resume();
    const now = this.ctx.currentTime;

    // 主体：衰减 sine
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280 + intensity * 200, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.08);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(this.masterVolume * (0.3 + intensity * 0.3), now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);

    // 薄噪声点缀（短促）
    if (intensity > 0.6) {
      this.safeNoise(this.ctx, 0.05, 1500, 2, this.masterVolume * 0.08, null, this.ctx.destination);
    }
  }

  // 重击：太鼓 + 闷雷
  playHeavyHit() {
    if (!this.ctx || !this.enabled) return;
    this.resume();
    const now = this.ctx.currentTime;

    // 太鼓低频主体
    const osc1 = this.ctx.createOscillator();
    const g1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(90, now);
    osc1.frequency.exponentialRampToValueAtTime(35, now + 0.18);
    g1.gain.setValueAtTime(0, now);
    g1.gain.linearRampToValueAtTime(this.masterVolume * 0.6, now + 0.005);
    g1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc1.connect(g1);
    g1.connect(this.ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.22);

    // 皮击中频
    const osc2 = this.ctx.createOscillator();
    const g2 = this.ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(180, now);
    osc2.frequency.exponentialRampToValueAtTime(70, now + 0.12);
    g2.gain.setValueAtTime(0, now);
    g2.gain.linearRampToValueAtTime(this.masterVolume * 0.3, now + 0.003);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc2.connect(g2);
    g2.connect(this.ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.15);

    // 受控噪声（短促，已滤波）
    this.safeNoise(this.ctx, 0.08, 800, 1.5, this.masterVolume * 0.15, 200, this.ctx.destination);
  }

  // 黑闪音效：高频脆裂起音 + 低频闷爆核心 + 冷冽嗡鸣残响 + 连击增强
  // comboCount：当前连续黑闪次数（1 = 首次，>1 = 连击）
  playBlackFlashSound(comboCount = 1) {
    if (!this.ctx || !this.enabled) return;
    this.resume();
    const now = this.ctx.currentTime;
    const vol = this.masterVolume;

    // ====== 阶段 1：触发起音 — 高频脆裂（< 0.1s） ======
    // 极短促高频锐音，类似百万伏高压电瞬间击穿真空
    const crackOsc = this.ctx.createOscillator();
    const crackG = this.ctx.createGain();
    crackOsc.type = 'square';
    crackOsc.frequency.setValueAtTime(3400, now);
    crackOsc.frequency.exponentialRampToValueAtTime(1600, now + 0.05);
    crackG.gain.setValueAtTime(0, now);
    crackG.gain.linearRampToValueAtTime(vol * 0.35, now + 0.002);
    crackG.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    crackOsc.connect(crackG);
    crackG.connect(this.ctx.destination);
    crackOsc.start(now);
    crackOsc.stop(now + 0.1);
    // 高频脆裂噪声（带通 6000Hz，极短）
    this.safeNoise(this.ctx, 0.06, 6500, 3, vol * 0.22, 2800, this.ctx.destination);

    // ====== 阶段 2：核心爆音 — 低频闷爆 + 空间震颤（0.05s 后） ======
    const boomStart = now + 0.05;

    // 低频闷爆主体（85→32Hz 下扫，强压迫感 + 胸腔共鸣）
    const boomOsc = this.ctx.createOscillator();
    const boomG = this.ctx.createGain();
    boomOsc.type = 'sine';
    boomOsc.frequency.setValueAtTime(85, boomStart);
    boomOsc.frequency.exponentialRampToValueAtTime(32, boomStart + 0.2);
    boomG.gain.setValueAtTime(0, boomStart);
    boomG.gain.linearRampToValueAtTime(vol * 0.85, boomStart + 0.005);
    boomG.gain.exponentialRampToValueAtTime(0.001, boomStart + 0.3);
    boomOsc.connect(boomG);
    boomG.connect(this.ctx.destination);
    boomOsc.start(boomStart);
    boomOsc.stop(boomStart + 0.32);

    // 次低频胸腔共鸣（55→28Hz，更长）
    const subOsc = this.ctx.createOscillator();
    const subG = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(55, boomStart);
    subOsc.frequency.exponentialRampToValueAtTime(28, boomStart + 0.25);
    subG.gain.setValueAtTime(0, boomStart);
    subG.gain.linearRampToValueAtTime(vol * 0.5, boomStart + 0.008);
    subG.gain.exponentialRampToValueAtTime(0.001, boomStart + 0.28);
    subOsc.connect(subG);
    subG.connect(this.ctx.destination);
    subOsc.start(boomStart);
    subOsc.stop(boomStart + 0.3);

    // 咒力撕裂滋滋声 + 钢化玻璃碎裂细碎锐响（延时 50ms 触发）
    setTimeout(() => {
      if (!this.ctx) return;
      // 撕裂滋滋声（带通 1800Hz 高 Q）
      this.safeNoise(this.ctx, 0.18, 1800, 4, vol * 0.2, 600, this.ctx.destination);
      // 钢化玻璃碎裂：4 段极短高频噪声错位叠加
      for (let i = 0; i < 4; i++) {
        setTimeout(() => {
          if (!this.ctx) return;
          this.safeNoise(this.ctx, 0.04, 3500 + i * 400, 5, vol * 0.12, 1500, this.ctx.destination);
        }, i * 15);
      }
    }, 50);

    // ====== 阶段 3：残响余韵 — 冷冽低频嗡鸣（0.25s 后，1s 内消散） ======
    const ringStart = now + 0.25;
    // 主残响（金属钟壁基音）
    const ringOsc = this.ctx.createOscillator();
    const ringG = this.ctx.createGain();
    ringOsc.type = 'sine';
    ringOsc.frequency.setValueAtTime(110, ringStart);
    ringOsc.frequency.linearRampToValueAtTime(85, ringStart + 0.6);
    ringG.gain.setValueAtTime(0, ringStart);
    ringG.gain.linearRampToValueAtTime(vol * 0.18, ringStart + 0.02);
    ringG.gain.exponentialRampToValueAtTime(0.001, ringStart + 0.8);
    ringOsc.connect(ringG);
    ringG.connect(this.ctx.destination);
    ringOsc.start(ringStart);
    ringOsc.stop(ringStart + 0.85);
    // 次谐音（金属钟壁复合音色）
    const ringOsc2 = this.ctx.createOscillator();
    const ringG2 = this.ctx.createGain();
    ringOsc2.type = 'triangle';
    ringOsc2.frequency.setValueAtTime(165, ringStart);
    ringOsc2.frequency.linearRampToValueAtTime(128, ringStart + 0.5);
    ringG2.gain.setValueAtTime(0, ringStart);
    ringG2.gain.linearRampToValueAtTime(vol * 0.08, ringStart + 0.02);
    ringG2.gain.exponentialRampToValueAtTime(0.001, ringStart + 0.6);
    ringOsc2.connect(ringG2);
    ringG2.connect(this.ctx.destination);
    ringOsc2.start(ringStart);
    ringOsc2.stop(ringStart + 0.65);

    // ====== 阶段 4：连击增强（comboCount > 1 时叠加低频震颤 + 空间扭曲嗡鸣） ======
    if (comboCount > 1) {
      const intensity = Math.min(comboCount / 5, 1);
      // 低频震颤增强（45→38Hz）
      const tremorOsc = this.ctx.createOscillator();
      const tremorG = this.ctx.createGain();
      tremorOsc.type = 'sine';
      tremorOsc.frequency.setValueAtTime(45, boomStart);
      tremorOsc.frequency.linearRampToValueAtTime(38, boomStart + 0.4);
      tremorG.gain.setValueAtTime(0, boomStart);
      tremorG.gain.linearRampToValueAtTime(vol * 0.4 * intensity, boomStart + 0.01);
      tremorG.gain.exponentialRampToValueAtTime(0.001, boomStart + 0.5);
      tremorOsc.connect(tremorG);
      tremorG.connect(this.ctx.destination);
      tremorOsc.start(boomStart);
      tremorOsc.stop(boomStart + 0.52);
      // 空间扭曲背景嗡鸣（低通滤波锯齿，连击越多越明显）
      const droneOsc = this.ctx.createOscillator();
      const droneG = this.ctx.createGain();
      const droneLP = this.ctx.createBiquadFilter();
      droneOsc.type = 'sawtooth';
      droneOsc.frequency.setValueAtTime(120, now);
      droneLP.type = 'lowpass';
      droneLP.frequency.setValueAtTime(300, now);
      droneLP.Q.setValueAtTime(2, now);
      droneG.gain.setValueAtTime(0, now);
      droneG.gain.linearRampToValueAtTime(vol * 0.1 * intensity, now + 0.1);
      droneG.gain.linearRampToValueAtTime(0, now + 1.0);
      droneOsc.connect(droneLP);
      droneLP.connect(droneG);
      droneG.connect(this.ctx.destination);
      droneOsc.start(now);
      droneOsc.stop(now + 1.05);
    }
  }

  // 技能音效（保留接口）
  playSkill(type = 'normal') {
    if (!this.ctx || !this.enabled) return;
    this.resume();
    const now = this.ctx.currentTime;
    if (type === 'ranged') {
      this.playBlueSkill();
    } else if (type === 'summon') {
      this.playRedSkill();
    } else {
      this.playHeavyHit();
    }
  }

  // 领域展开音效
  playDomain() {
    if (!this.ctx || !this.enabled) return;
    this.resume();
    const now = this.ctx.currentTime;

    // 极低频压迫（已淡入淡出，绝不外露裸方波）
    const osc1 = this.ctx.createOscillator();
    const g1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(40, now);
    osc1.frequency.linearRampToValueAtTime(60, now + 0.8);
    osc1.frequency.linearRampToValueAtTime(30, now + 2.5);
    g1.gain.setValueAtTime(0, now);
    g1.gain.linearRampToValueAtTime(this.masterVolume * 0.55, now + 0.4);
    g1.gain.setValueAtTime(this.masterVolume * 0.4, now + 1.5);
    g1.gain.linearRampToValueAtTime(0, now + 3.0);
    osc1.connect(g1);
    g1.connect(this.ctx.destination);
    osc1.start(now);
    osc1.stop(now + 3.0);

    // 次低频
    const osc2 = this.ctx.createOscillator();
    const g2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(22, now);
    osc2.frequency.linearRampToValueAtTime(28, now + 1.0);
    osc2.frequency.linearRampToValueAtTime(18, now + 2.5);
    g2.gain.setValueAtTime(0, now);
    g2.gain.linearRampToValueAtTime(this.masterVolume * 0.3, now + 0.5);
    g2.gain.linearRampToValueAtTime(0, now + 2.8);
    osc2.connect(g2);
    g2.connect(this.ctx.destination);
    osc2.start(now);
    osc2.stop(now + 2.8);

    // 信息流噪声（已严格滤波+振幅调制，绝不外露白噪）
    this.safeNoise(this.ctx, 2.0, 1500, 0.4, this.masterVolume * 0.12, null, this.ctx.destination);

    // 高频 shimmer
    const osc3 = this.ctx.createOscillator();
    const g3 = this.ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(3500, now);
    osc3.frequency.linearRampToValueAtTime(5500, now + 0.5);
    osc3.frequency.linearRampToValueAtTime(2500, now + 1.5);
    g3.gain.setValueAtTime(0, now);
    g3.gain.linearRampToValueAtTime(this.masterVolume * 0.06, now + 0.3);
    g3.gain.linearRampToValueAtTime(0, now + 2.0);
    osc3.connect(g3);
    g3.connect(this.ctx.destination);
    osc3.start(now);
    osc3.stop(now + 2.0);
  }

  // 苍：低频引力嗡鸣 + 短促气流内涌
  playBlueSkill() {
    if (!this.ctx || !this.enabled) return;
    this.resume();
    const now = this.ctx.currentTime;

    // 引力嗡鸣
    const osc1 = this.ctx.createOscillator();
    const g1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(60, now);
    osc1.frequency.linearRampToValueAtTime(45, now + 0.5);
    osc1.frequency.linearRampToValueAtTime(70, now + 1.0);
    g1.gain.setValueAtTime(0, now);
    g1.gain.linearRampToValueAtTime(this.masterVolume * 0.45, now + 0.2);
    g1.gain.setValueAtTime(this.masterVolume * 0.3, now + 0.8);
    g1.gain.linearRampToValueAtTime(0, now + 1.5);
    osc1.connect(g1);
    g1.connect(this.ctx.destination);
    osc1.start(now);
    osc1.stop(now + 1.5);

    // 气流内涌
    this.safeNoise(this.ctx, 0.55, 900, 1.5, this.masterVolume * 0.22, 150, this.ctx.destination);
  }

  // 苍坍缩
  playBlueCollapse() {
    if (!this.ctx || !this.enabled) return;
    this.resume();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(this.masterVolume * 0.4, now + 0.02);
    g.gain.linearRampToValueAtTime(0, now + 0.35);
    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  // 赫：高亢能量爆鸣 + 斥力外冲
  playRedSkill() {
    if (!this.ctx || !this.enabled) return;
    this.resume();
    const now = this.ctx.currentTime;

    // 高频爆鸣（用 triangle 替代 sawtooth，去高频毛刺）
    const osc1 = this.ctx.createOscillator();
    const g1 = this.ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(800, now);
    osc1.frequency.linearRampToValueAtTime(1200, now + 0.15);
    osc1.frequency.exponentialRampToValueAtTime(400, now + 0.5);
    g1.gain.setValueAtTime(0, now);
    g1.gain.linearRampToValueAtTime(this.masterVolume * 0.3, now + 0.05);
    g1.gain.linearRampToValueAtTime(0, now + 0.55);
    osc1.connect(g1);
    g1.connect(this.ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.55);

    // 斥力冲击
    const osc2 = this.ctx.createOscillator();
    const g2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(120, now);
    osc2.frequency.exponentialRampToValueAtTime(40, now + 0.4);
    g2.gain.setValueAtTime(0, now);
    g2.gain.linearRampToValueAtTime(this.masterVolume * 0.35, now + 0.1);
    g2.gain.linearRampToValueAtTime(0, now + 0.5);
    osc2.connect(g2);
    g2.connect(this.ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.5);

    // 气流外冲
    this.safeNoise(this.ctx, 0.45, 200, 1, this.masterVolume * 0.18, 1200, this.ctx.destination);
  }

  // 赫冲击命中
  playRedImpact() {
    if (!this.ctx || !this.enabled) return;
    this.resume();
    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const g1 = this.ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(1400, now);
    osc1.frequency.exponentialRampToValueAtTime(200, now + 0.25);
    g1.gain.setValueAtTime(0, now);
    g1.gain.linearRampToValueAtTime(this.masterVolume * 0.3, now + 0.01);
    g1.gain.linearRampToValueAtTime(0, now + 0.3);
    osc1.connect(g1);
    g1.connect(this.ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    const osc2 = this.ctx.createOscillator();
    const g2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(60, now);
    osc2.frequency.exponentialRampToValueAtTime(20, now + 0.35);
    g2.gain.setValueAtTime(0, now);
    g2.gain.linearRampToValueAtTime(this.masterVolume * 0.45, now + 0.01);
    g2.gain.linearRampToValueAtTime(0, now + 0.4);
    osc2.connect(g2);
    g2.connect(this.ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.4);

    this.safeNoise(this.ctx, 0.2, 1200, 1, this.masterVolume * 0.2, 300, this.ctx.destination);
  }

  // 闪避
  playDodge() {
    if (!this.ctx || !this.enabled) return;
    this.resume();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(this.masterVolume * 0.25, now + 0.01);
    g.gain.linearRampToValueAtTime(0, now + 0.2);
    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  // 宿傩「解」高频尖锐破空锐响（高速金属切割啸声）
  // variant: 'rapid'（连射，短促尖锐）/ 'wide'（广域，更长更强烈 + 风压）
  playSukunaSlash(variant = 'rapid') {
    if (!this.ctx || !this.enabled) return;
    this.resume();
    const now = this.ctx.currentTime;
    const isWide = variant === 'wide';
    const dur = isWide ? 0.35 : 0.18;

    // 1. 高频尖锐啸声（金属切割质感，极高频快速下扫）
    const osc1 = this.ctx.createOscillator();
    const g1 = this.ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(isWide ? 7200 : 8800, now);
    osc1.frequency.exponentialRampToValueAtTime(isWide ? 1800 : 2600, now + dur * 0.7);
    const bp1 = this.ctx.createBiquadFilter();
    bp1.type = 'bandpass';
    bp1.frequency.value = isWide ? 5000 : 6500;
    bp1.Q.value = 6;
    g1.gain.setValueAtTime(0, now);
    g1.gain.linearRampToValueAtTime(this.masterVolume * (isWide ? 0.18 : 0.13), now + 0.005);
    g1.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc1.connect(bp1); bp1.connect(g1); g1.connect(this.ctx.destination);
    osc1.start(now); osc1.stop(now + dur);

    // 2. 次高频锐响（增加切割质感）
    const osc2 = this.ctx.createOscillator();
    const g2 = this.ctx.createGain();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(isWide ? 3400 : 4200, now);
    osc2.frequency.exponentialRampToValueAtTime(isWide ? 900 : 1300, now + dur * 0.6);
    const lp2 = this.ctx.createBiquadFilter();
    lp2.type = 'lowpass';
    lp2.frequency.value = isWide ? 4000 : 5000;
    g2.gain.setValueAtTime(0, now);
    g2.gain.linearRampToValueAtTime(this.masterVolume * 0.08, now + 0.008);
    g2.gain.exponentialRampToValueAtTime(0.001, now + dur * 0.8);
    osc2.connect(lp2); lp2.connect(g2); g2.connect(this.ctx.destination);
    osc2.start(now); osc2.stop(now + dur * 0.8);

    // 3. 广域型额外：低频风压呼啸
    if (isWide) {
      this.safeNoise(this.ctx, 0.3, 800, 0.8, this.masterVolume * 0.12, 300, this.ctx.destination, now);
    }
  }

  // 宿傩「解・界断」无声的宏大破坏（天地安静一瞬，随即大地崩裂建筑倒塌的厚重轰鸣）
  playWorldSlash() {
    if (!this.ctx || !this.enabled) return;
    this.resume();
    const now = this.ctx.currentTime;

    // 1. 前置极短静默感（极低频次声压迫，几乎听不到但能感受到）
    const subOsc = this.ctx.createOscillator();
    const subG = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(18, now);
    subOsc.frequency.linearRampToValueAtTime(14, now + 0.3);
    subG.gain.setValueAtTime(0, now);
    subG.gain.linearRampToValueAtTime(this.masterVolume * 0.4, now + 0.1);
    subG.gain.linearRampToValueAtTime(0, now + 0.4);
    subOsc.connect(subG); subG.connect(this.ctx.destination);
    subOsc.start(now); subOsc.stop(now + 0.4);

    // 2. 延迟的大地崩裂厚重轰鸣（低频闷爆 + 建筑坍塌碎裂）
    const delay = 0.18;
    // 低频闷爆
    const lowOsc = this.ctx.createOscillator();
    const lowG = this.ctx.createGain();
    lowOsc.type = 'sine';
    lowOsc.frequency.setValueAtTime(55, now + delay);
    lowOsc.frequency.linearRampToValueAtTime(28, now + delay + 1.2);
    lowG.gain.setValueAtTime(0, now + delay);
    lowG.gain.linearRampToValueAtTime(this.masterVolume * 0.55, now + delay + 0.15);
    lowG.gain.setValueAtTime(this.masterVolume * 0.4, now + delay + 0.6);
    lowG.gain.linearRampToValueAtTime(0, now + delay + 1.6);
    lowOsc.connect(lowG); lowG.connect(this.ctx.destination);
    lowOsc.start(now + delay); lowOsc.stop(now + delay + 1.6);

    // 次低频大地震颤
    const sub2Osc = this.ctx.createOscillator();
    const sub2G = this.ctx.createGain();
    sub2Osc.type = 'sine';
    sub2Osc.frequency.setValueAtTime(32, now + delay);
    sub2Osc.frequency.linearRampToValueAtTime(20, now + delay + 1.0);
    sub2G.gain.setValueAtTime(0, now + delay);
    sub2G.gain.linearRampToValueAtTime(this.masterVolume * 0.3, now + delay + 0.2);
    sub2G.gain.linearRampToValueAtTime(0, now + delay + 1.4);
    sub2Osc.connect(sub2G); sub2G.connect(this.ctx.destination);
    sub2Osc.start(now + delay); sub2Osc.stop(now + delay + 1.4);

    // 建筑坍塌碎裂噪声（低通滤波的碎石崩落声）
    this.safeNoise(this.ctx, 1.2, 500, 0.6, this.masterVolume * 0.18, 180, this.ctx.destination, now + delay);
  }

  // 宿傩「捌」：短促沉闷的切割爆响 + 物体被瞬间绞碎的厚重质感
  playSukunaDismantle() {
    if (!this.ctx || !this.enabled) return;
    this.resume();
    const now = this.ctx.currentTime;
    const vol = this.masterVolume;

    // 1. 低频闷爆主体（切割命中的厚重核心）
    const osc1 = this.ctx.createOscillator();
    const g1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(95, now);
    osc1.frequency.exponentialRampToValueAtTime(38, now + 0.12);
    g1.gain.setValueAtTime(0, now);
    g1.gain.linearRampToValueAtTime(vol * 0.55, now + 0.005);
    g1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc1.connect(g1); g1.connect(this.ctx.destination);
    osc1.start(now); osc1.stop(now + 0.2);

    // 2. 次低频震颤（物体被绞碎的厚重质感）
    const osc2 = this.ctx.createOscillator();
    const g2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(55, now);
    osc2.frequency.exponentialRampToValueAtTime(22, now + 0.15);
    g2.gain.setValueAtTime(0, now);
    g2.gain.linearRampToValueAtTime(vol * 0.4, now + 0.008);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc2.connect(g2); g2.connect(this.ctx.destination);
    osc2.start(now); osc2.stop(now + 0.25);

    // 3. 中频切割撕裂噪声（bandpass，模拟肉体/物体被切开）
    this.safeNoise(this.ctx, 0.14, 700, 1.4, vol * 0.18, 250, this.ctx.destination);

    // 4. 高频碎裂点缀（短促碎石/纤维断裂声）
    this.safeNoise(this.ctx, 0.06, 2200, 2.5, vol * 0.12, 900, this.ctx.destination);
  }

  // 宿傩「灶（开）」：拉弓凝聚 → 巨型火焰箭发射
  playFireArrowLaunch() {
    if (!this.ctx || !this.enabled) return;
    this.resume();
    const now = this.ctx.currentTime;
    const vol = this.masterVolume;

    // 1. 火焰凝聚的低频嗡鸣（双手拉弓时咒力转为高温）
    const osc1 = this.ctx.createOscillator();
    const g1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(120, now);
    osc1.frequency.exponentialRampToValueAtTime(280, now + 0.35);
    g1.gain.setValueAtTime(0, now);
    g1.gain.linearRampToValueAtTime(vol * 0.28, now + 0.25);
    g1.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc1.connect(g1); g1.connect(this.ctx.destination);
    osc1.start(now); osc1.stop(now + 0.6);

    // 2. 空气被高温灼烧的嘶嘶声
    this.safeNoise(this.ctx, 0.55, 900, 1.2, vol * 0.16, 1400, this.ctx.destination);

    // 3. 火箭发射瞬间的轰鸣（短促强劲）
    const osc2 = this.ctx.createOscillator();
    const g2 = this.ctx.createGain();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(180, now + 0.32);
    osc2.frequency.exponentialRampToValueAtTime(55, now + 0.55);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1200, now + 0.32);
    lp.frequency.exponentialRampToValueAtTime(300, now + 0.55);
    g2.gain.setValueAtTime(0, now + 0.32);
    g2.gain.linearRampToValueAtTime(vol * 0.45, now + 0.36);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    osc2.connect(lp); lp.connect(g2); g2.connect(this.ctx.destination);
    osc2.start(now + 0.32); osc2.stop(now + 0.75);
  }

  // 宿傩「灶（开）」：火焰箭命中爆炸 / 领域内大范围焚烧
  playFireArrowExplosion(inDomain = false) {
    if (!this.ctx || !this.enabled) return;
    this.resume();
    const now = this.ctx.currentTime;
    const vol = this.masterVolume;
    const dur = inDomain ? 0.65 : 0.42;

    // 1. 低频爆轰主体（火焰吞噬目标）
    const osc1 = this.ctx.createOscillator();
    const g1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(85, now);
    osc1.frequency.exponentialRampToValueAtTime(28, now + dur * 0.7);
    g1.gain.setValueAtTime(0, now);
    g1.gain.linearRampToValueAtTime(vol * (inDomain ? 0.7 : 0.5), now + 0.01);
    g1.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc1.connect(g1); g1.connect(this.ctx.destination);
    osc1.start(now); osc1.stop(now + dur);

    // 2. 中高频火焰轰鸣（bandpass 噪声模拟烈火）
    this.safeNoise(this.ctx, dur, 600, 1.1, vol * (inDomain ? 0.26 : 0.18), 220, this.ctx.destination);

    // 3. 灰烬与碎裂点缀
    this.safeNoise(this.ctx, dur * 0.7, 2400, 2.2, vol * 0.12, 900, this.ctx.destination);

    // 4. 领域内额外：大地崩裂般的次低频残响
    if (inDomain) {
      const osc2 = this.ctx.createOscillator();
      const g2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(45, now + 0.1);
      osc2.frequency.exponentialRampToValueAtTime(18, now + 0.8);
      g2.gain.setValueAtTime(0, now + 0.1);
      g2.gain.linearRampToValueAtTime(vol * 0.35, now + 0.18);
      g2.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
      osc2.connect(g2); g2.connect(this.ctx.destination);
      osc2.start(now + 0.1); osc2.stop(now + 0.95);
    }
  }

  // 格挡
  playBlock() {
    if (!this.ctx || !this.enabled) return;
    this.resume();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.setValueAtTime(300, now + 0.05);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(this.masterVolume * 0.3, now + 0.005);
    g.gain.linearRampToValueAtTime(0, now + 0.12);
    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  // 胜利：日式上行五声音阶
  playVictory() {
    if (!this.ctx || !this.enabled) return;
    this.resume();
    const now = this.ctx.currentTime;
    // C E G C 升八度（C大调）
    const notes = [523, 659, 784, 1047, 1318];
    notes.forEach((freq, i) => {
      const t = now + i * 0.13;
      // 主旋律 sine
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(this.masterVolume * 0.35, t + 0.03);
      g.gain.linearRampToValueAtTime(0, t + 0.4);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.42);
      // 八度谐音
      if (i >= 2) {
        const osc2 = this.ctx.createOscillator();
        const g2 = this.ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(freq * 2, t);
        g2.gain.setValueAtTime(0, t);
        g2.gain.linearRampToValueAtTime(this.masterVolume * 0.12, t + 0.03);
        g2.gain.linearRampToValueAtTime(0, t + 0.35);
        osc2.connect(g2);
        g2.connect(this.ctx.destination);
        osc2.start(t);
        osc2.stop(t + 0.37);
      }
    });
  }

  // 失败：下行阴郁音
  playDefeat() {
    if (!this.ctx || !this.enabled) return;
    this.resume();
    const now = this.ctx.currentTime;
    // 下行小三和弦
    const notes = [392, 349, 311, 247, 196];
    notes.forEach((freq, i) => {
      const t = now + i * 0.2;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(this.masterVolume * 0.3, t + 0.05);
      g.gain.linearRampToValueAtTime(0, t + 0.5);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.52);
    });
  }

  // ========================================
  // 按钮 UI 音效（咒术风格：太鼓/木鱼短促）
  // ========================================
  playButtonClick() {
    if (!this.ctx || !this.enabled) return;
    this.resume();
    const now = this.ctx.currentTime;
    // 太鼓单点
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.06);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(this.masterVolume * 0.3, now + 0.004);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.11);

    // 高频打击（清脆木质感）
    const osc2 = this.ctx.createOscillator();
    const g2 = this.ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1200, now);
    osc2.frequency.exponentialRampToValueAtTime(600, now + 0.03);
    g2.gain.setValueAtTime(0, now);
    g2.gain.linearRampToValueAtTime(this.masterVolume * 0.15, now + 0.002);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc2.connect(g2);
    g2.connect(this.ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.06);
  }

  playButtonHover() {
    if (!this.ctx || !this.enabled) return;
    this.resume();
    const now = this.ctx.currentTime;
    // 极轻琴弦拨弦
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(this.masterVolume * 0.08, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  playTabSwitch() {
    if (!this.ctx || !this.enabled) return;
    this.resume();
    const now = this.ctx.currentTime;
    // 上行双音
    [440, 660].forEach((f, i) => {
      const t = now + i * 0.04;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(this.masterVolume * 0.2, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.11);
    });
  }

  playSelect() {
    if (!this.ctx || !this.enabled) return;
    this.resume();
    const now = this.ctx.currentTime;
    // 选择确认音
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523, now);
    osc.frequency.setValueAtTime(784, now + 0.05);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(this.masterVolume * 0.25, now + 0.01);
    g.gain.linearRampToValueAtTime(0, now + 0.18);
    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playDeselect() {
    if (!this.ctx || !this.enabled) return;
    this.resume();
    const now = this.ctx.currentTime;
    // 取消选择音
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523, now);
    osc.frequency.setValueAtTime(330, now + 0.05);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(this.masterVolume * 0.2, now + 0.01);
    g.gain.linearRampToValueAtTime(0, now + 0.15);
    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  playError() {
    if (!this.ctx || !this.enabled) return;
    this.resume();
    const now = this.ctx.currentTime;
    // 错误：下行不和谐双音
    [330, 247].forEach((f, i) => {
      const t = now + i * 0.06;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(this.masterVolume * 0.2, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.13);
    });
  }

  playCountdown() {
    if (!this.ctx || !this.enabled) return;
    this.resume();
    const now = this.ctx.currentTime;
    // 简短滴答
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, now);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(this.masterVolume * 0.3, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  playGo() {
    if (!this.ctx || !this.enabled) return;
    this.resume();
    const now = this.ctx.currentTime;
    // 战斗开始：上行三和弦
    [523, 659, 784].forEach((f, i) => {
      const t = now + i * 0.05;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(this.masterVolume * 0.25, t + 0.01);
      g.gain.linearRampToValueAtTime(0, t + 0.4);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(t);
    osc.stop(t + 0.42);
    });
  }

  // ========================================
  // 新增 UI 音效（v1.12.0）
  // ========================================

  // 立绘切换：短促纸张翻动 + 低频脉冲
  playPortraitSwitch() {
    if (!this.ctx || !this.enabled) return;
    this.resume();
    const now = this.ctx.currentTime;
    // 纸张翻动：滤波噪声
    this.safeNoise(this.ctx, 0.12, 2200, 2, this.masterVolume * 0.12, 800, this.ctx.destination);
    // 低频脉冲
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.15);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(this.masterVolume * 0.2, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  // 缩略图悬停：极短清脆点击
  playThumbHover() {
    if (!this.ctx || !this.enabled) return;
    this.resume();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(2400, now);
    osc.frequency.exponentialRampToValueAtTime(1800, now + 0.03);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(this.masterVolume * 0.1, now + 0.002);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  // 技能释放震屏：低频闷爆 + 短噪声
  playSkillCast() {
    if (!this.ctx || !this.enabled) return;
    this.resume();
    const now = this.ctx.currentTime;
    // 低频闷爆
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(this.masterVolume * 0.4, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.27);
    // 短噪声点缀
    this.safeNoise(this.ctx, 0.08, 1200, 1.5, this.masterVolume * 0.1, 300, this.ctx.destination);
  }

  // 黑闪 UI 闪屏音：高频脆裂 + 低频震颤（与战斗黑闪音区分，更短）
  playBlackFlashUI() {
    if (!this.ctx || !this.enabled) return;
    this.resume();
    const now = this.ctx.currentTime;
    // 高频脆裂
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(2800, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.04);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(this.masterVolume * 0.25, now + 0.002);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
    // 低频震颤
    const sub = this.ctx.createOscillator();
    const subG = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(70, now);
    sub.frequency.exponentialRampToValueAtTime(30, now + 0.15);
    subG.gain.setValueAtTime(0, now);
    subG.gain.linearRampToValueAtTime(this.masterVolume * 0.5, now + 0.005);
    subG.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    sub.connect(subG);
    subG.connect(this.ctx.destination);
    sub.start(now);
    sub.stop(now + 0.22);
  }

  // ========================================
  // 技能语音 - 简化为只读技能名
  // 同时在屏幕中间显示台词文字
  // ========================================

  // 各角色技能台词（短小精炼，仅技能名）
  characterVoices = {
    gojo: {
      skill1: '蒼',
      skill2: '赫',
      // 茈：单字发音太短容易听不见，用原作完整咒语
      skill3: '虚式、茈',
      ultimate: '領域展開・無量空処',
    },
    sukuna: {
      skill1: '解',
      skill2: '穿',
      skill3: '捌',
      ultimate: '伏魔御厨子',
    },
    yuji: {
      skill1: '穿血',
      skill2: '解',
      skill3: '捌',
      ultimate: '領域展開・血厨御殿',
    },
  };

  // 念出技能名 + 屏幕显示台词（外部覆盖此方法实现屏幕显示）
  castSkill(skillId, characterId) {
    if (!characterId) return;
    const charV = this.characterVoices[characterId];
    const text = charV && charV[skillId] ? charV[skillId] : '術式';
    this.speak(text);
    if (typeof this.onCastText === 'function') {
      this.onCastText(text, characterId, skillId);
    }
  }

  // 黑闪也用统一接口
  castBlackFlash(characterId) {
    const map = { gojo: '黒閃', sukuna: '黒閃', yuji: '黒閃' };
    const text = map[characterId] || '黒閃';
    this.speak(text);
    if (typeof this.onCastText === 'function') {
      this.onCastText(text, characterId, 'blackflash');
    }
  }

  // 复活
  castRevive(characterId) {
    const map = { gojo: '反転術式', sukuna: '反転', yuji: '反転術式' };
    const text = map[characterId] || '反転';
    this.speak(text);
    if (typeof this.onCastText === 'function') {
      this.onCastText(text, characterId, 'revive');
    }
  }

  // 通用语音接口（修复：缩短冷却、不打断自身、修正音调）
  speak(text, lang = 'ja-JP', opts = {}) {
    if (!this.voiceEnabled) return;
    if (Date.now() < this.voiceCooldown) return;
    if (!('speechSynthesis' in window)) return;
    // 短技能名用短冷却，必杀/黑闪用稍长冷却避免重叠
    const cd = opts.cooldown != null ? opts.cooldown : 500;
    this.voiceCooldown = Date.now() + cd;
    try {
      // 取消上一个同源语音，避免叠加导致静音
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
      }
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      // 短日语单词用更自然的速度；pitch 0.85 接近自然男声
      u.rate = opts.rate != null ? opts.rate : 0.9;
      u.pitch = opts.pitch != null ? opts.pitch : 0.9;
      u.volume = this.masterVolume * (opts.volumeMul || 1.5);
      // 优先用预加载的 voices（避免首次空数组）
      const voices = (this._voices && this._voices.length) ? this._voices : window.speechSynthesis.getVoices();
      const jp = voices.find(v => v.lang.startsWith('ja') && /male|Male|Microsoft|Haruka|Kenji|Keita|Google 日本語/i.test(v.name));
      const jaAny = voices.find(v => v.lang.startsWith('ja'));
      if (jp) u.voice = jp;
      else if (jaAny) u.voice = jaAny;
      window.speechSynthesis.speak(u);
    } catch (e) { /* 静默失败 */ }
  }

  // ========================================
  // BGM 系统（4 个差异化场景，无噪音）
  // ========================================
  startBGM(scene) {
    if (!this.ctx || !this.enabled) return;
    this.resume();
    if (this.bgmScene === scene && this.bgmActive) return; // 同场景不重启
    this.stopBGM();
    this.bgmScene = scene;
    this.bgmActive = true;
    this.bgmNodes = [];

    // BGM 总增益
    this.bgmGain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    this.bgmGain.gain.setValueAtTime(0, now);
    this.bgmGain.gain.linearRampToValueAtTime(this.bgmVolume, now + 0.5);
    this.bgmGain.connect(this.ctx.destination);

    if (scene === 'menu') this._startMenuBGM();
    else if (scene === 'fighting') this._startFightBGM();
    else if (scene === 'result') this._startResultBGM();
    else if (scene === 'select') this._startSelectBGM();
  }

  // 菜单 BGM：日式静谧，和风五声音阶，缓慢
  _startMenuBGM() {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const bpm = 60;
    const beat = 60 / bpm; // 1秒一拍
    const loopSec = 16;

    // 都节音阶（无半音），C D E G A
    const scale = [261.63, 293.66, 329.63, 392.00, 440.00];
    const pattern = [0, 2, 4, 2, 1, 0, -1, 0]; // 相对音阶
    const playTimes = [0, 2, 4, 6, 8, 10, 12, 14]; // 拍子位（每 2 拍一音）

    playTimes.forEach((p, i) => {
      const t = now + p * beat;
      const idx = pattern[i] >= 0 ? pattern[i] : (scale.length + pattern[i]);
      const freq = scale[idx] || scale[0];
      // 主旋律：竖琴音色（triangle + sine 谐音）
      const n = this.note(ctx, freq, t, beat * 1.6, this.bgmGain, 'triangle', 0.08);
      this.bgmNodes.push(n.osc, n.gain);
      // 高八度点缀
      const n2 = this.note(ctx, freq * 2, t + 0.05, beat * 1.2, this.bgmGain, 'sine', 0.025);
      this.bgmNodes.push(n2.osc, n2.gain);
    });

    // 低音持续（pad，但音量极低）
    const bass = this.note(ctx, 130.81, now, loopSec * 0.9, this.bgmGain, 'sine', 0.03);
    this.bgmNodes.push(bass.osc, bass.gain);

    this._scheduleLoop('menu', loopSec);
  }

  // 战斗 BGM：咒术回战式热血战斗曲（重太鼓 + 律动贝斯 + 三味线 + 弦乐铺垫）
  _startFightBGM() {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const bpm = 138;
    const beat = 60 / bpm;        // 0.435s 一拍
    const bar = beat * 4;          // 4/4 拍
    const loopSec = bar * 4;       // 4 小节循环 = 6.96s

    // ===========================================
    // 第 1 层：太鼓底鼓（"ドドパ" 三连击，咒术战斗标志性节奏）
    // ===========================================
    // 4 小节模式，每小节 4 拍
    const taikoPattern = [
      // 小节 1：ド-ド-パ-ッ
      [1.0, 0.0, 0.7, 0.0],
      // 小节 2：ド-ド-パ-ド
      [1.0, 0.0, 0.7, 0.9],
      // 小节 3：ド-ド-パ-ッ
      [1.0, 0.0, 0.7, 0.0],
      // 小节 4：ド-パ-ド-ド（fill）
      [1.0, 0.7, 0.9, 0.0],
    ];
    taikoPattern.forEach((bar1, barIdx) => {
      bar1.forEach((v, beatIdx) => {
        if (v <= 0) return;
        const t = now + barIdx * bar + beatIdx * beat;
        // 主体鼓：低频脉冲 + 快速衰减（咚～）
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180 * v, t);
        osc.frequency.exponentialRampToValueAtTime(38, t + 0.14);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(this.bgmVolume * 0.32 * v, t + 0.002);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        osc.connect(g);
        g.connect(this.bgmGain);
        osc.start(t);
        osc.stop(t + 0.24);
        this.bgmNodes.push(osc, g);
        // 鼓皮声：滤波短噪（哒～）
        const noise = this.safeNoise(ctx, 0.06, 2200, 1.4, this.bgmVolume * 0.12 * v, null, this.bgmGain, t);
        this.bgmNodes.push(noise.src, noise.g);
      });
    });

    // ===========================================
    // 第 2 层：律动贝斯（电贝斯感：三角波 + 低通滤波 + 滑音）
    // ===========================================
    // 4 小节贝斯线，使用咒术风格的小调五声音阶（A 小调五声）
    // 音阶：A C D E G  (220, 261.63, 293.66, 329.63, 392)
    const bassLine = [
      // 小节 1
      { f: 55,    d: beat * 1.5 },   // A1 长音
      { f: 73.42, d: beat * 0.5 },   // D2
      { f: 65.41, d: beat * 1.0 },   // C2
      { f: 73.42, d: beat * 1.0 },   // D2
      // 小节 2
      { f: 65.41, d: beat * 1.0 },
      { f: 73.42, d: beat * 1.0 },
      { f: 82.41, d: beat * 2.0 },   // E2 长音
      // 小节 3
      { f: 55,    d: beat * 1.0 },
      { f: 73.42, d: beat * 1.0 },
      { f: 65.41, d: beat * 1.0 },
      { f: 82.41, d: beat * 1.0 },
      // 小节 4
      { f: 73.42, d: beat * 1.0 },
      { f: 65.41, d: beat * 1.0 },
      { f: 55,    d: beat * 2.0 },   // 回到 A1
    ];
    let tBass = now;
    bassLine.forEach(n => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(280, tBass);
      lp.Q.setValueAtTime(1.2, tBass);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.f, tBass);
      g.gain.setValueAtTime(0, tBass);
      g.gain.linearRampToValueAtTime(this.bgmVolume * 0.22, tBass + 0.02);
      g.gain.setValueAtTime(this.bgmVolume * 0.22, tBass + n.d - 0.04);
      g.gain.linearRampToValueAtTime(0, tBass + n.d);
      osc.connect(lp);
      lp.connect(g);
      g.connect(this.bgmGain);
      osc.start(tBass);
      osc.stop(tBass + n.d + 0.02);
      this.bgmNodes.push(osc, g, lp);
      tBass += n.d;
    });

    // ===========================================
    // 第 3 层：三味线主旋律（带颤音，更具东方战斗感）
    // ===========================================
    // 旋律：A C D E G 高八度
    const aMinorHigh = [440, 523.25, 587.33, 659.25, 783.99, 880];
    // 4 小节旋律线
    const melody = [
      { i: 4, d: beat * 0.5 },   // G
      { i: 3, d: beat * 0.5 },   // E
      { i: 2, d: beat * 0.5 },   // D
      { i: 3, d: beat * 0.5 },   // E
      { i: 4, d: beat * 1.0 },   // G
      { i: 5, d: beat * 0.5 },   // A 高
      { i: 4, d: beat * 0.5 },   // G
      { i: 2, d: beat * 1.0 },   // D
      // 小节 2
      { i: 1, d: beat * 0.5 },   // C
      { i: 2, d: beat * 0.5 },   // D
      { i: 3, d: beat * 1.0 },   // E
      { i: 4, d: beat * 0.5 },   // G
      { i: 3, d: beat * 0.5 },   // E
      { i: 2, d: beat * 0.5 },   // D
      { i: 1, d: beat * 0.5 },   // C
      { i: 0, d: beat * 0.5 },   // A
      // 小节 3 - 重复变奏
      { i: 4, d: beat * 0.5 },
      { i: 3, d: beat * 0.5 },
      { i: 2, d: beat * 0.5 },
      { i: 3, d: beat * 0.5 },
      { i: 5, d: beat * 1.0 },   // A 高
      { i: 4, d: beat * 1.0 },   // G
      // 小节 4 - 下行结束
      { i: 3, d: beat * 0.5 },
      { i: 2, d: beat * 0.5 },
      { i: 1, d: beat * 1.0 },
      { i: 0, d: beat * 2.0 },   // 收束 A
    ];
    let tMel = now;
    melody.forEach(n => {
      const f = aMinorHigh[n.i];
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();  // 颤音：5.5Hz 调制
      const g = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoG = ctx.createGain();
      osc.type = 'triangle';
      osc2.type = 'triangle';
      osc.frequency.setValueAtTime(f, tMel);
      osc2.frequency.setValueAtTime(f, tMel);
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(5.5, tMel);
      lfoG.gain.setValueAtTime(3.5, tMel);   // 颤音幅度 3.5Hz
      lfo.connect(lfoG);
      lfoG.connect(osc.frequency);
      lfoG.connect(osc2.frequency);
      g.gain.setValueAtTime(0, tMel);
      g.gain.linearRampToValueAtTime(this.bgmVolume * 0.09, tMel + 0.03);
      g.gain.setValueAtTime(this.bgmVolume * 0.09, tMel + n.d - 0.05);
      g.gain.linearRampToValueAtTime(0, tMel + n.d);
      osc.connect(g);
      osc2.connect(g);
      g.connect(this.bgmGain);
      osc.start(tMel);
      osc2.start(tMel);
      lfo.start(tMel);
      osc.stop(tMel + n.d + 0.02);
      osc2.stop(tMel + n.d + 0.02);
      lfo.stop(tMel + n.d + 0.02);
      this.bgmNodes.push(osc, osc2, g, lfo, lfoG);
      tMel += n.d;
    });

    // ===========================================
    // 第 4 层：弦乐铺垫（持续低音 pad，营造紧张氛围）
    // ===========================================
    // 使用 detuned sine 模拟弦乐
    const padFreqs = [110, 130.81, 146.83];   // A2, C3, D3
    padFreqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc2.type = 'sine';
      osc.frequency.setValueAtTime(f, now);
      osc2.frequency.setValueAtTime(f * 1.005, now);   // 微 detune
      // 缓慢的 LFO 颤音
      const lfo = ctx.createOscillator();
      const lfoG = ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.4 + i * 0.15, now);
      lfoG.gain.setValueAtTime(2, now);
      lfo.connect(lfoG);
      lfoG.connect(osc.frequency);
      lfoG.connect(osc2.frequency);
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(this.bgmVolume * 0.045, now + 1.2);
      g.gain.setValueAtTime(this.bgmVolume * 0.045, now + loopSec - 0.5);
      g.gain.linearRampToValueAtTime(0, now + loopSec);
      osc.connect(g);
      osc2.connect(g);
      g.connect(this.bgmGain);
      osc.start(now);
      osc2.start(now);
      lfo.start(now);
      osc.stop(now + loopSec + 0.1);
      osc2.stop(now + loopSec + 0.1);
      lfo.stop(now + loopSec + 0.1);
      this.bgmNodes.push(osc, osc2, g, lfo, lfoG);
    });

    // ===========================================
    // 第 5 层：紧张感高频 ping（"叮" 短促铃音，咒术战斗标志）
    // ===========================================
    const pingPattern = [1, 0, 0, 1, 0, 1, 0, 0];
    pingPattern.forEach((v, i) => {
      if (!v) return;
      const t = now + i * beat * 0.5;
      const f = 1760 + (i % 3) * 110;   // 高频泛音
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 0.7, t + 0.18);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(this.bgmVolume * 0.06, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(g);
      g.connect(this.bgmGain);
      osc.start(t);
      osc.stop(t + 0.22);
      this.bgmNodes.push(osc, g);
    });

    // ===========================================
    // 第 6 层：每 4 小节一次的"压轴"重音（低音 drop 感）
    // ===========================================
    const drop = ctx.createOscillator();
    const dropG = ctx.createGain();
    drop.type = 'sine';
    drop.frequency.setValueAtTime(80, now + loopSec - 0.4);
    drop.frequency.exponentialRampToValueAtTime(30, now + loopSec + 0.2);
    dropG.gain.setValueAtTime(0, now + loopSec - 0.4);
    dropG.gain.linearRampToValueAtTime(this.bgmVolume * 0.35, now + loopSec - 0.38);
    dropG.gain.exponentialRampToValueAtTime(0.001, now + loopSec + 0.4);
    drop.connect(dropG);
    dropG.connect(this.bgmGain);
    drop.start(now + loopSec - 0.4);
    drop.stop(now + loopSec + 0.5);
    this.bgmNodes.push(drop, dropG);

    this._scheduleLoop('fighting', loopSec);
  }

  // 选人 BGM：比菜单更紧凑，节奏稍快
  _startSelectBGM() {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const bpm = 90;
    const beat = 60 / bpm;
    const loopSec = 8;

    const scale = [261.63, 329.63, 392.00, 523.25]; // C E G C
    const pattern = [0, 2, 1, 3, 2, 0, 1, 2];
    pattern.forEach((idx, i) => {
      const t = now + i * beat;
      const f = scale[idx];
      const n = this.note(ctx, f, t, beat * 0.7, this.bgmGain, 'triangle', 0.05);
      this.bgmNodes.push(n.osc, n.gain);
    });

    // 八度点
    for (let i = 0; i < 4; i++) {
      const t = now + i * beat * 2;
      const f = scale[pattern[i * 2]] * 2;
      const n = this.note(ctx, f, t, beat * 1.2, this.bgmGain, 'sine', 0.02);
      this.bgmNodes.push(n.osc, n.gain);
    }

    this._scheduleLoop('select', loopSec);
  }

  // 结算 BGM：日式上行五声音阶
  _startResultBGM() {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const bpm = 72;
    const beat = 60 / bpm;
    const loopSec = 12;

    // 都节音阶上行
    const notes = [261.63, 293.66, 329.63, 392, 440, 392, 329.63, 293.66];
    notes.forEach((f, i) => {
      const t = now + i * beat * 1.2;
      const n = this.note(ctx, f, t, beat * 1, this.bgmGain, 'triangle', 0.07);
      this.bgmNodes.push(n.osc, n.gain);
      // 八度
      if (i % 2 === 0) {
        const n2 = this.note(ctx, f * 2, t + 0.03, beat * 0.8, this.bgmGain, 'sine', 0.025);
        this.bgmNodes.push(n2.osc, n2.gain);
      }
    });

    // 持续低音
    const bass = this.note(ctx, 130.81, now, loopSec * 0.9, this.bgmGain, 'sine', 0.025);
    this.bgmNodes.push(bass.osc, bass.gain);

    this._scheduleLoop('result', loopSec);
  }

  _scheduleLoop(scene, sec) {
    // 先 clear 任何旧循环
    if (this.bgmLoop) clearTimeout(this.bgmLoop);
    this.bgmLoop = setTimeout(() => {
      if (this.bgmActive && this.bgmScene === scene) {
        // 不调用 startBGM（会清空当前节点），直接调度下一段
        // 但需要新建一个独立 gain node，因为旧的会 stop
        this._startBGMInternal(scene);
      }
    }, sec * 1000);
  }

  // 内部：循环重新启动（不重置状态）
  _startBGMInternal(scene) {
    if (!this.ctx || !this.enabled || !this.bgmActive) return;
    // 清理上一段残留（理论上本段已经全部 stop 了）
    this.bgmNodes = [];
    // 重建 BGM gain（旧的 disconnect）
    if (this.bgmGain) {
      try { this.bgmGain.disconnect(); } catch (e) {}
    }
    this.bgmGain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    this.bgmGain.gain.setValueAtTime(0, now);
    this.bgmGain.gain.linearRampToValueAtTime(this.bgmVolume, now + 0.3);
    this.bgmGain.connect(this.ctx.destination);

    if (scene === 'menu') this._startMenuBGM();
    else if (scene === 'fighting') this._startFightBGM();
    else if (scene === 'result') this._startResultBGM();
    else if (scene === 'select') this._startSelectBGM();
  }

  stopBGM() {
    if (this.bgmLoop) {
      clearTimeout(this.bgmLoop);
      this.bgmLoop = null;
    }
    this.bgmActive = false;
    this.bgmScene = null;

    if (this.bgmGain && this.ctx) {
      const now = this.ctx.currentTime;
      try {
        this.bgmGain.gain.cancelScheduledValues(now);
        this.bgmGain.gain.setValueAtTime(this.bgmGain.gain.value, now);
        this.bgmGain.gain.linearRampToValueAtTime(0, now + 0.15);
      } catch (e) {}
    }

    const nodes = this.bgmNodes;
    const gain = this.bgmGain;
    setTimeout(() => {
      nodes.forEach(node => {
        try { node.stop(); } catch (e) { /* 已停止 */ }
        try { node.disconnect(); } catch (e) {}
      });
      if (gain) {
        try { gain.disconnect(); } catch (e) {}
      }
    }, 200);

    this.bgmNodes = [];
    this.bgmGain = null;
  }

  setBGMVolume(vol) {
    this.bgmVolume = Math.max(0, Math.min(1, vol));
    if (this.bgmGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.bgmGain.gain.cancelScheduledValues(now);
      this.bgmGain.gain.setTargetAtTime(this.bgmVolume, now, 0.05);
    }
  }

  setMasterVolume(vol) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
  }

  setVoiceEnabled(b) { this.voiceEnabled = b; }
}
