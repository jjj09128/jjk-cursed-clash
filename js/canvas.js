// Canvas 渲染引擎 - 绘制场景、角色、特效

// roundRect polyfill
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    if (typeof r === 'number') r = { tl: r, tr: r, br: r, bl: r };
    this.beginPath();
    this.moveTo(x + r.tl, y);
    this.lineTo(x + w - r.tr, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r.tr);
    this.lineTo(x + w, y + h - r.br);
    this.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
    this.lineTo(x + r.bl, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r.bl);
    this.lineTo(x, y + r.tl);
    this.quadraticCurveTo(x, y, x + r.tl, y);
    this.closePath();
  };
}

class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.groundY = this.height * 0.78;
    this.bgStars = [];
    this.bgBuildings = [];
    this.quality = 'medium';
    // 缓存每帧不变的渐变，避免重复 createGradient
    this._skyGradient = null;
    this._groundGradient = null;
    // 缓存 HUD DOM 元素，避免每帧 getElementById
    this._hudEls = null;
    this._hudTick = 0;
    this._hudLast = {};
    // 缓存队伍进度 DOM 元素
    this._teamHudEls = null;
    this._teamHudLast = { pIdx: -1, eIdx: -1 };
    this.initBackground();
    this._updateGradients();
  }

  setQuality(level) {
    if (['low', 'medium', 'high'].includes(level)) {
      this.quality = level;
      this.initBackground();
    }
  }

  _bgCounts() {
    switch (this.quality) {
      case 'low': return { stars: 20, buildings: 5, floaters: 6 };
      case 'high': return { stars: 80, buildings: 12, floaters: 18 };
      default: return { stars: 50, buildings: 8, floaters: 12 };
    }
  }

  initBackground() {
    const counts = this._bgCounts();
    // 生成背景星星/粒子
    this.bgStars = [];
    for (let i = 0; i < counts.stars; i++) {
      this.bgStars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height * 0.7,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.5 + 0.1,
        alpha: Math.random() * 0.5 + 0.2
      });
    }
    // 生成建筑剪影（窗户位置一次性随机，避免每帧 Math.random）
    this.bgBuildings = [];
    for (let i = 0; i < counts.buildings; i++) {
      const b = {
        x: (i / counts.buildings) * this.width * 1.2 - this.width * 0.1,
        w: Math.random() * 80 + 40,
        h: Math.random() * 150 + 80,
        color: `hsl(260, 30%, ${8 + Math.random() * 5}%)`,
        windows: []
      };
      for (let wy = this.groundY - b.h + 15; wy < this.groundY - 15; wy += 25) {
        for (let wx = b.x + 10; wx < b.x + b.w - 10; wx += 20) {
          if (Math.random() > 0.4) {
            b.windows.push({ x: wx, y: wy, w: 6, h: 10 });
          }
        }
      }
      this.bgBuildings.push(b);
    }
  }

  resize() {
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.groundY = this.height * 0.78;
    this.initBackground();
    this._updateGradients();
  }

  _updateGradients() {
    const ctx = this.ctx;
    const skyGrad = ctx.createLinearGradient(0, 0, 0, this.height);
    skyGrad.addColorStop(0, '#0a0015');
    skyGrad.addColorStop(0.4, '#1a0030');
    skyGrad.addColorStop(0.7, '#2d1050');
    skyGrad.addColorStop(1, '#1a0a2e');
    this._skyGradient = skyGrad;

    const groundGrad = ctx.createLinearGradient(0, this.groundY, 0, this.height);
    groundGrad.addColorStop(0, '#1a1030');
    groundGrad.addColorStop(0.3, '#150a25');
    groundGrad.addColorStop(1, '#0a0015');
    this._groundGradient = groundGrad;
  }

  drawBackground() {
    const ctx = this.ctx;
    // 天空渐变（缓存）
    ctx.fillStyle = this._skyGradient;
    ctx.fillRect(0, 0, this.width, this.height);

    // 月亮（合并绘制，减少 save/restore）
    const moonX = this.width * 0.8;
    const moonY = this.height * 0.15;
    ctx.fillStyle = '#f5f6fa';
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a0015';
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(moonX + 12, moonY - 5, 35, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // 星星（批量设置样式，无 save/restore）
    ctx.fillStyle = 'rgba(200, 180, 255, 0.35)';
    for (const star of this.bgStars) {
      ctx.globalAlpha = star.alpha;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
      // 移动
      star.y -= star.speed * 0.1;
      if (star.y < 0) {
        star.y = this.height * 0.7;
        star.x = Math.random() * this.width;
      }
    }
    ctx.globalAlpha = 1;

    // 建筑剪影
    for (const b of this.bgBuildings) {
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, this.groundY - b.h, b.w, b.h);
      // 窗户（预计算）
      ctx.fillStyle = 'rgba(255, 200, 100, 0.3)';
      for (const w of b.windows) {
        ctx.fillRect(w.x, w.y, w.w, w.h);
      }
    }

    // 地面（缓存渐变）
    ctx.fillStyle = this._groundGradient;
    ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);

    // 地面线
    ctx.strokeStyle = 'rgba(108, 92, 231, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, this.groundY);
    ctx.lineTo(this.width, this.groundY);
    ctx.stroke();

    // 咒力粒子飘浮（批量绘制，无 save/restore）
    const time = Date.now() * 0.001;
    const floaters = this._bgCounts().floaters;
    ctx.fillStyle = 'rgba(108, 92, 231, 0.15)';
    for (let i = 0; i < floaters; i++) {
      const px = (Math.sin(time * 0.7 + i * 1.2) * 0.5 + 0.5) * this.width;
      const py = this.groundY - 20 - Math.abs(Math.cos(time * 0.5 + i)) * 200;
      ctx.globalAlpha = 0.1 + Math.sin(time * 2 + i) * 0.05;
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawFighter(fighter) {
    if (!fighter || fighter.state === 'dead') return;
    const ctx = this.ctx;
    const { x, y, facingRight, character, state, hitFlash, stealthTimer } = fighter;

    // 隐身时不绘制（或半透明）
    if (stealthTimer > 0 && !fighter.isPlayer) {
      ctx.globalAlpha = 0.2;
    }

    ctx.save();
    ctx.translate(x, y);

    // 受击闪烁
    if (hitFlash > 0 && hitFlash % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    // 无下限术式：空间波纹（五条悟常驻视觉）
    if (character.id === 'gojo' && fighter.infinityActive) {
      const time = Date.now() * 0.001;
      // 外层空间波纹
      ctx.strokeStyle = `rgba(0, 212, 255, ${0.15 + Math.sin(time * 2) * 0.05})`;
      ctx.lineWidth = 1.5;
      for (let r = 0; r < 3; r++) {
        const rippleR = 40 + r * 10 + Math.sin(time * 3 + r) * 5;
        ctx.beginPath();
        ctx.arc(0, -30, rippleR, 0, Math.PI * 2);
        ctx.stroke();
      }
      // 空间扭曲光晕
      const rippleGrad = ctx.createRadialGradient(0, -30, 25, 0, -30, 55);
      rippleGrad.addColorStop(0, 'rgba(0, 212, 255, 0)');
      rippleGrad.addColorStop(0.5, 'rgba(0, 212, 255, 0.08)');
      rippleGrad.addColorStop(0.8, 'rgba(9, 132, 227, 0.15)');
      rippleGrad.addColorStop(1, 'rgba(0, 212, 255, 0)');
      ctx.fillStyle = rippleGrad;
      ctx.beginPath();
      ctx.arc(0, -30, 55, 0, Math.PI * 2);
      ctx.fill();
    }

    // 护盾效果（旧版兼容）
    if (character.id !== 'gojo' && fighter.shieldTimer > 0) {
      ctx.strokeStyle = 'rgba(108, 92, 231, 0.6)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, -30, 45, 0, Math.PI * 2);
      ctx.stroke();
      const shieldGrad = ctx.createRadialGradient(0, -30, 30, 0, -30, 50);
      shieldGrad.addColorStop(0, 'rgba(162, 155, 254, 0.1)');
      shieldGrad.addColorStop(1, 'rgba(108, 92, 231, 0.3)');
      ctx.fillStyle = shieldGrad;
      ctx.beginPath();
      ctx.arc(0, -30, 50, 0, Math.PI * 2);
      ctx.fill();
    }

    // 黑闪战斗巅峰状态：凝练内敛的咒力光晕
    if (fighter.blackFlashPeakTimer && fighter.blackFlashPeakTimer > 0) {
      const time = Date.now() * 0.001;
      const pulse = Math.sin(time * 4) * 0.08;
      // 内层凝练光晕（不外溢，紧贴身体）
      const peakGrad = ctx.createRadialGradient(0, -30, 15, 0, -30, 38);
      peakGrad.addColorStop(0, 'rgba(255, 215, 0, 0)');
      peakGrad.addColorStop(0.6, `rgba(255, 215, 0, ${0.18 + pulse})`);
      peakGrad.addColorStop(0.9, `rgba(255, 180, 50, ${0.25 + pulse})`);
      peakGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
      ctx.fillStyle = peakGrad;
      ctx.beginPath();
      ctx.arc(0, -30, 38, 0, Math.PI * 2);
      ctx.fill();
      // 内圈细金线（凝练感）
      ctx.strokeStyle = `rgba(255, 230, 120, ${0.5 + pulse})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, -30, 32, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 连续黑闪反转术式回转流动光效
    if (fighter.blackFlashReverseFlowTimer && fighter.blackFlashReverseFlowTimer > 0) {
      const angle = fighter._blackFlashFlowAngle || 0;
      const flowR = 30;
      const cx = 0, cy = -30;
      // 3 颗回转光点
      for (let i = 0; i < 3; i++) {
        const a = angle + (i / 3) * Math.PI * 2;
        const px = cx + Math.cos(a) * flowR;
        const py = cy + Math.sin(a) * flowR * 0.7; // 椭圆轨迹
        // 拖尾
        for (let t = 0; t < 6; t++) {
          const ta = a - t * 0.12;
          const tx = cx + Math.cos(ta) * flowR;
          const ty = cy + Math.sin(ta) * flowR * 0.7;
          ctx.fillStyle = `rgba(120, 200, 255, ${0.4 * (1 - t / 6)})`;
          ctx.beginPath();
          ctx.arc(tx, ty, 3 - t * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
        // 头部光点
        ctx.fillStyle = 'rgba(200, 240, 255, 0.95)';
        ctx.beginPath();
        ctx.arc(px, py, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(px, py, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      // 整体淡蓝光晕（咒力续航回升）
      const flowGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, 50);
      flowGrad.addColorStop(0, 'rgba(100, 200, 255, 0)');
      flowGrad.addColorStop(0.7, 'rgba(100, 200, 255, 0.1)');
      flowGrad.addColorStop(1, 'rgba(100, 200, 255, 0)');
      ctx.fillStyle = flowGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 50, 0, Math.PI * 2);
      ctx.fill();
    }

    // 赤磷悦动：全身流动血鳞光晕（持续 buff 视觉）
    if (typeof fighter.hasBloodSurge === 'function' && fighter.hasBloodSurge()) {
      this.drawBloodSurgeAura(fighter);
    }

    // 绘制角色身体
    this.drawCharacterBody(fighter);

    // 赤磷悦动：面部血纹印记（绘制在身体之上）
    if (typeof fighter.hasBloodSurge === 'function' && fighter.hasBloodSurge()) {
      this.drawBloodSurgeFaceMark(fighter);
    }

    ctx.restore();
  }

  drawCharacterBody(fighter) {
    const ctx = this.ctx;
    const { character, state, animFrame, facingRight, isPlayer } = fighter;
    const color = character.color;
    const darkerColor = this.darkenColor(color, 0.5);
    const lighterColor = this.lightenColor(color, 0.3);

    const dir = facingRight ? 1 : -1;

    // 根据状态选择动画偏移
    let bodyOffsetY = 0;
    let armAngle = 0;
    let legSpread = 0;

    if (state === 'attacking') {
      bodyOffsetY = -3;
      armAngle = 0.8 * dir;
      legSpread = 15;
    } else if (state === 'hit') {
      bodyOffsetY = -2;
      armAngle = -0.4 * dir;
      legSpread = 8;
    } else if (state === 'casting') {
      bodyOffsetY = -5;
      armAngle = 1.5 * dir;
      legSpread = 5;
    } else if (state === 'dodging') {
      bodyOffsetY = -8;
      armAngle = 1.2 * dir;
      legSpread = 20;
    } else {
      // idle 呼吸动画
      bodyOffsetY = Math.sin(Date.now() * 0.005 + animFrame) * 1;
      armAngle = Math.sin(Date.now() * 0.003) * 0.1 * dir;
      legSpread = 10;
    }

    // 阴影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 5, 20, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // 腿部
    ctx.fillStyle = darkerColor;
    ctx.fillRect(-8, -10, 7, 18);
    ctx.fillRect(1, -10, 7, 18);

    // 腿部动画（跑步/站立）
    if (state === 'moving' || state === 'dodging') {
      ctx.fillStyle = darkerColor;
      const legAnim = Math.sin(animFrame * 0.5) * legSpread;
      ctx.save();
      ctx.translate(-4, 8);
      ctx.rotate(legAnim * 0.03);
      ctx.fillRect(-3, -15, 6, 18);
      ctx.restore();
      ctx.save();
      ctx.translate(4, 8);
      ctx.rotate(-legAnim * 0.03);
      ctx.fillRect(-3, -15, 6, 18);
      ctx.restore();
    }

    // 身体
    const bodyGrad = ctx.createLinearGradient(0, -40, 0, -5);
    bodyGrad.addColorStop(0, lighterColor);
    bodyGrad.addColorStop(1, color);
    ctx.fillStyle = bodyGrad;
    ctx.fillRect(-12, -40 + bodyOffsetY, 24, 35);

    // 身体高光
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(-8, -38 + bodyOffsetY, 6, 30);

    // 头部
    ctx.fillStyle = '#f5d5b8';
    ctx.beginPath();
    ctx.arc(0, -48 + bodyOffsetY, 14, 0, Math.PI * 2);
    ctx.fill();

    // 头发
    ctx.fillStyle = character.id === 'gojo' ? '#ffffff' :
                    character.id === 'sukuna' ? '#0a0a0a' :
                    character.id === 'yuji' ? '#e8956a' : '#7f8c8d';
    ctx.beginPath();
    ctx.arc(0, -52 + bodyOffsetY, 14, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-14, -52 + bodyOffsetY, 28, 8);

    // 眼睛
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-4 * dir, -50 + bodyOffsetY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(4 * dir, -50 + bodyOffsetY, 4, 0, Math.PI * 2);
    ctx.fill();
    // 瞳孔
    ctx.fillStyle = character.id === 'gojo' ? '#0984e3' :
                    character.id === 'sukuna' ? '#8b0000' : '#1a1a2e';
    ctx.beginPath();
    ctx.arc(-4 * dir + dir, -50 + bodyOffsetY, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(4 * dir + dir, -50 + bodyOffsetY, 2, 0, Math.PI * 2);
    ctx.fill();

    // 手臂
    ctx.save();
    ctx.translate(-10 * dir, -35 + bodyOffsetY);
    ctx.rotate(armAngle);
    ctx.fillStyle = color;
    ctx.fillRect(-3, 0, 6, 18);
    // 拳头
    ctx.fillStyle = '#f5d5b8';
    ctx.beginPath();
    ctx.arc(0, 19, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 另一只手
    ctx.save();
    ctx.translate(10 * dir, -35 + bodyOffsetY);
    ctx.rotate(-armAngle * 0.5);
    ctx.fillStyle = color;
    ctx.fillRect(-3, 0, 6, 16);
    ctx.fillStyle = '#f5d5b8';
    ctx.beginPath();
    ctx.arc(0, 17, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 角色名字标签
    if (isPlayer) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px "Noto Sans SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(character.name, 0, -65 + bodyOffsetY);
    }

    // 角色光环
    const glowGrad = ctx.createRadialGradient(0, -30 + bodyOffsetY, 15, 0, -30 + bodyOffsetY, 30);
    glowGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    const rgb = this.hexToRgb(color);
    glowGrad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`);
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(0, -30 + bodyOffsetY, 30, 0, Math.PI * 2);
    ctx.fill();
  }

  // 赤磷悦动：全身流动血鳞光晕
  drawBloodSurgeAura(fighter) {
    const ctx = this.ctx;
    const time = Date.now() * 0.001;
    const pulse = Math.sin(time * 5) * 0.05;
    const timer = fighter.getBloodSurgeTimer ? fighter.getBloodSurgeTimer() : 0;
    // 最后 3 秒闪烁警告
    const flicker = timer < 180 ? (Math.sin(time * 15) > 0 ? 0.4 : 1) : 1;

    // 1. 暗红色滚烫底色光晕（紧贴身体轮廓）
    const auraGrad = ctx.createRadialGradient(0, -30, 12, 0, -30, 42);
    auraGrad.addColorStop(0, 'rgba(255, 60, 60, 0)');
    auraGrad.addColorStop(0.5, `rgba(220, 40, 50, ${0.12 + pulse})`);
    auraGrad.addColorStop(0.85, `rgba(180, 20, 30, ${0.2 + pulse})`);
    auraGrad.addColorStop(1, 'rgba(139, 0, 0, 0)');
    ctx.globalAlpha = flicker;
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(0, -30, 42, 0, Math.PI * 2);
    ctx.fill();

    // 2. 血色鳞纹虚影（细密血鳞顺着肌肉线条起伏开合）
    ctx.globalAlpha = flicker * 0.5;
    for (let i = 0; i < 7; i++) {
      const phase = time * 2 + i * 0.9;
      const openRatio = 0.5 + Math.sin(phase) * 0.5; // 鳞片开合
      const y = -42 + i * 5;
      const w = 10 + openRatio * 4;
      const h = 2.5 + openRatio * 1.5;
      const alpha = 0.15 + openRatio * 0.2;
      ctx.fillStyle = `rgba(255, 80, 80, ${alpha})`;
      ctx.beginPath();
      ctx.ellipse(-w * 0.5, y, w, h, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(w * 0.5, y, w, h, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. 四肢经脉循环血流（沿身体轮廓流动的赤红光点）
    for (let i = 0; i < 4; i++) {
      const t = (time * 0.8 + i * 0.25) % 1;
      const angle = t * Math.PI * 2;
      const r = 22 + Math.sin(angle * 3) * 4;
      const px = Math.cos(angle) * r;
      const py = -30 + Math.sin(angle) * r * 0.8;
      ctx.fillStyle = `rgba(255, 100, 100, ${0.6 * (1 - t)})`;
      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fill();
      // 拖尾
      for (let s = 1; s <= 3; s++) {
        const ta = angle - s * 0.1;
        const tx = Math.cos(ta) * r;
        const ty = -30 + Math.sin(ta) * r * 0.8;
        ctx.fillStyle = `rgba(255, 60, 60, ${0.25 * (1 - s / 3)})`;
        ctx.beginPath();
        ctx.arc(tx, ty, 2 - s * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 4. 脚下环形血色波纹（踏步时漾开）
    if (fighter.state === 'moving' || fighter.state === 'dodging') {
      const ringR = 16 + (time * 30 % 20);
      const ringAlpha = Math.max(0, 0.3 - (ringR - 16) / 60);
      ctx.strokeStyle = `rgba(255, 50, 50, ${ringAlpha})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 5, ringR, ringR * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 5. 高速移动时赤红色血气尾迹
    if (fighter.state === 'moving' || fighter.state === 'dodging') {
      const dir = fighter.facingRight ? 1 : -1;
      for (let i = 1; i <= 3; i++) {
        ctx.fillStyle = `rgba(220, 40, 50, ${0.15 / i})`;
        ctx.beginPath();
        ctx.ellipse(-dir * i * 8, -30, 10, 18, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.globalAlpha = 1;
  }

  // 赤磷悦动：面部血纹印记（眼周细碎分叉血线）
  drawBloodSurgeFaceMark(fighter) {
    const ctx = this.ctx;
    const { facingRight } = fighter;
    const dir = facingRight ? 1 : -1;
    const time = Date.now() * 0.001;
    const pulse = 0.5 + Math.sin(time * 4) * 0.2;
    const timer = fighter.getBloodSurgeTimer ? fighter.getBloodSurgeTimer() : 0;
    const flicker = timer < 180 ? (Math.sin(time * 15) > 0 ? 0.4 : 1) : 1;

    ctx.globalAlpha = flicker * 0.75;
    ctx.strokeStyle = `rgba(255, 40, 50, ${pulse})`;
    ctx.lineWidth = 0.8;

    // 左眼血纹（主线条 + 分叉）
    const lex = -4 * dir, ley = -50;
    ctx.beginPath();
    ctx.moveTo(lex - 5, ley - 2);
    ctx.lineTo(lex + 5, ley + 1);
    ctx.stroke();
    // 分叉
    ctx.beginPath();
    ctx.moveTo(lex - 2, ley);
    ctx.lineTo(lex - 5, ley - 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(lex + 2, ley);
    ctx.lineTo(lex + 6, ley - 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(lex, ley + 1);
    ctx.lineTo(lex - 3, ley + 4);
    ctx.stroke();

    // 右眼血纹
    const rex = 4 * dir, rey = -50;
    ctx.beginPath();
    ctx.moveTo(rex - 5, rey + 1);
    ctx.lineTo(rex + 5, rey - 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(rex - 2, rey);
    ctx.lineTo(rex - 6, rey - 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(rex + 2, rey);
    ctx.lineTo(rex + 5, rey - 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(rex, rey + 1);
    ctx.lineTo(rex + 3, rey + 4);
    ctx.stroke();

    // 眼球淡血膜
    ctx.fillStyle = `rgba(255, 80, 80, ${pulse * 0.25})`;
    ctx.beginPath();
    ctx.arc(-4 * dir, -50, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(4 * dir, -50, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
  }

  drawHUD(player, enemy) {
    // 顶部极简 HUD 改用 DOM 实现（v1.12.0）
    // canvas 不再绘制血条，由 #hud-top DOM 层显示
    this._updateDomHUD(player, enemy);
  }

  // 更新 DOM HUD（顶部极简血条/咒力条）
  _updateDomHUD(player, enemy) {
    if (!player || !enemy) return;

    // 每 2 帧更新一次 DOM，并跳过未变化的值，减少布局抖动
    this._hudTick++;
    if (this._hudTick % 2 !== 0) return;

    if (!this._hudEls) {
      this._hudEls = {
        pHpFill: document.getElementById('hud-p-hp'),
        pHpText: document.getElementById('hud-p-hp-text'),
        pCeFill: document.getElementById('hud-p-ce'),
        pName: document.getElementById('hud-p-name'),
        eHpFill: document.getElementById('hud-e-hp'),
        eHpText: document.getElementById('hud-e-hp-text'),
        eCeFill: document.getElementById('hud-e-ce'),
        eName: document.getElementById('hud-e-name')
      };
    }
    const e = this._hudEls;

    const setBar = (fill, text, current, max, nameEl, name, key) => {
      const ratio = Math.max(0, Math.min(1, current / max));
      const pct = (ratio * 100).toFixed(1) + '%';
      const txt = `${Math.ceil(current)}/${max}`;
      const last = this._hudLast[key] || {};
      if (fill && last.pct !== pct) {
        fill.style.width = pct;
        last.pct = pct;
        const bar = fill.parentElement;
        if (bar) bar.classList.toggle('critical', ratio > 0 && ratio < 0.25);
      }
      if (text && last.txt !== txt) {
        text.textContent = txt;
        last.txt = txt;
      }
      if (nameEl && last.name !== name) {
        nameEl.textContent = name;
        last.name = name;
      }
      this._hudLast[key] = last;
    };

    setBar(e.pHpFill, e.pHpText, player.currentHp, player.maxHp, e.pName, player.character.name, 'p');
    setBar(e.eHpFill, e.eHpText, enemy.currentHp, enemy.maxHp, e.eName, enemy.character.name, 'e');

    const pCeRatio = Math.max(0, Math.min(1, player.cursedEnergy / player.maxCursedEnergy));
    const eCeRatio = Math.max(0, Math.min(1, enemy.cursedEnergy / enemy.maxCursedEnergy));
    const pCePct = (pCeRatio * 100).toFixed(1) + '%';
    const eCePct = (eCeRatio * 100).toFixed(1) + '%';
    if (e.pCeFill && this._hudLast.pCe !== pCePct) {
      e.pCeFill.style.width = pCePct;
      this._hudLast.pCe = pCePct;
    }
    if (e.eCeFill && this._hudLast.eCe !== eCePct) {
      e.eCeFill.style.width = eCePct;
      this._hudLast.eCe = eCePct;
    }
  }

  drawHealthBar(x, y, w, h, fighter, isPlayer) {
    // 已迁移至 DOM HUD，保留空实现以兼容旧调用
    return;
  }

  // 3v3 队伍HUD：仅更新 DOM 中的队伍进度文字（如 "1/3"）
  drawTeamHUD(playerTeam, enemyTeam, pIdx, eIdx) {
    if (!this._teamHudEls) {
      this._teamHudEls = {
        pTeam: document.getElementById('hud-p-team'),
        eTeam: document.getElementById('hud-e-team')
      };
    }
    const e = this._teamHudEls;
    if (e.pTeam && playerTeam && playerTeam.length && this._teamHudLast.pIdx !== pIdx) {
      e.pTeam.textContent = `${pIdx + 1}/${playerTeam.length}`;
      this._teamHudLast.pIdx = pIdx;
    }
    if (e.eTeam && enemyTeam && enemyTeam.length && this._teamHudLast.eIdx !== eIdx) {
      e.eTeam.textContent = `${eIdx + 1}/${enemyTeam.length}`;
      this._teamHudLast.eIdx = eIdx;
    }
  }

  // 原canvas队伍HUD实现（已废弃，保留以备回滚）
  _drawTeamHUDLegacy(playerTeam, enemyTeam, pIdx, eIdx) {
    const ctx = this.ctx;
    const topY = 6;
    const iconR = 7;

    // 玩家队伍（左上角横排）
    ctx.save();
    const pLabelX = 14;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.roundRect(8, topY, 230, 24, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,240,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(8, topY, 230, 24, 4);
    ctx.stroke();

    ctx.fillStyle = 'rgba(0,240,255,0.6)';
    ctx.font = 'bold 9px "Noto Sans SC", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('我', pLabelX, topY + 17);

    let px = pLabelX + 16;
    for (let i = 0; i < playerTeam.length; i++) {
      const f = playerTeam[i];
      const isActive = i === pIdx;
      const isDead = f.state === 'dead';
      const hpRatio = isDead ? 0 : Math.max(0, f.currentHp / f.maxHp);

      // 背景圆
      ctx.fillStyle = isDead ? '#333' : isActive ? 'rgba(0,240,255,0.2)' : 'rgba(255,255,255,0.05)';
      ctx.beginPath();
      ctx.arc(px + iconR, topY + 12, iconR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = isActive ? '#00f0ff' : isDead ? '#555' : '#666';
      ctx.lineWidth = isActive ? 2 : 1;
      ctx.beginPath();
      ctx.arc(px + iconR, topY + 12, iconR, 0, Math.PI * 2);
      ctx.stroke();

      // HP 弧形
      if (hpRatio > 0 && !isDead) {
        ctx.strokeStyle = hpRatio > 0.5 ? '#00ff88' : hpRatio > 0.25 ? '#ffaa00' : '#ff3333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px + iconR, topY + 12, iconR - 1, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * hpRatio);
        ctx.stroke();
      }

      // 名字简称
      const name = f.character.name.charAt(0);
      ctx.fillStyle = isActive ? '#00f0ff' : isDead ? '#555' : '#aaa';
      ctx.font = 'bold 8px "Noto Sans SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(name, px + iconR, topY + 15);

      // 活跃三角
      if (isActive) {
        ctx.fillStyle = '#00f0ff';
        ctx.beginPath();
        ctx.moveTo(px + iconR, topY + 2);
        ctx.lineTo(px + iconR - 4, topY - 2);
        ctx.lineTo(px + iconR + 4, topY - 2);
        ctx.closePath();
        ctx.fill();
      }

      px += 28;
    }

    // 敌人队伍（右上角横排）
    const eLabelX = this.width - 230;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.roundRect(this.width - 238, topY, 230, 24, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,68,68,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(this.width - 238, topY, 230, 24, 4);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,68,68,0.6)';
    ctx.font = 'bold 9px "Noto Sans SC", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('敵', this.width - 14, topY + 17);

    let ex = this.width - 14 - 16 - (enemyTeam.length - 1) * 28;
    for (let i = 0; i < enemyTeam.length; i++) {
      const f = enemyTeam[i];
      const isActive = i === eIdx;
      const isDead = f.state === 'dead';
      const hpRatio = isDead ? 0 : Math.max(0, f.currentHp / f.maxHp);

      ctx.fillStyle = isDead ? '#333' : isActive ? 'rgba(255,68,68,0.2)' : 'rgba(255,255,255,0.05)';
      ctx.beginPath();
      ctx.arc(ex + iconR, topY + 12, iconR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = isActive ? '#ff4444' : isDead ? '#555' : '#666';
      ctx.lineWidth = isActive ? 2 : 1;
      ctx.beginPath();
      ctx.arc(ex + iconR, topY + 12, iconR, 0, Math.PI * 2);
      ctx.stroke();

      if (hpRatio > 0 && !isDead) {
        ctx.strokeStyle = hpRatio > 0.5 ? '#00ff88' : hpRatio > 0.25 ? '#ffaa00' : '#ff3333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ex + iconR, topY + 12, iconR - 1, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * hpRatio);
        ctx.stroke();
      }

      const name = f.character.name.charAt(0);
      ctx.fillStyle = isActive ? '#ff4444' : isDead ? '#555' : '#aaa';
      ctx.font = 'bold 8px "Noto Sans SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(name, ex + iconR, topY + 15);

      if (isActive) {
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.moveTo(ex + iconR, topY + 2);
        ctx.lineTo(ex + iconR - 4, topY - 2);
        ctx.lineTo(ex + iconR + 4, topY - 2);
        ctx.closePath();
        ctx.fill();
      }

      ex += 28;
    }

    ctx.restore();
  }

  drawCombo(comboDisplay) {
    if (comboDisplay.timer <= 0) return;
    const ctx = this.ctx;
    const alpha = Math.min(1, comboDisplay.timer / 20);
    const scale = 1 + (1 - alpha) * 0.3;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.width / 2, this.height * 0.3);
    ctx.scale(scale, scale);

    // 阴影
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 48px "Noto Sans SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(comboDisplay.text, 3, 3);

    // 主文字
    const comboGrad = ctx.createLinearGradient(0, -30, 0, 10);
    comboGrad.addColorStop(0, '#ffd700');
    comboGrad.addColorStop(1, '#ff6b35');
    ctx.fillStyle = comboGrad;
    ctx.fillText(comboDisplay.text, 0, 0);

    ctx.restore();
  }

  // 简易领域特效：脚下蓝色水波光圈，随技能时间缩小消失
  drawSimpleDomain(fighter) {
    if (!fighter.isSimpleDomainActive()) return;
    const ctx = this.ctx;
    const MAX_DURATION = 300; // 与 fighter.activateSimpleDomain 中 duration 一致
    const progress = fighter.simpleDomainTimer / MAX_DURATION; // 1 → 0
    const time = Date.now() * 0.001;

    ctx.save();
    ctx.translate(fighter.x, fighter.y);

    // 基础半径随时间收缩：从 70 → 15
    const baseR = 15 + progress * 55;
    // 整体透明度：末段加速衰减
    const alpha = progress < 0.25 ? progress * 4 : 1;

    // 地面投影渐变光晕
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, baseR * 1.8);
    glow.addColorStop(0, `rgba(0, 212, 255, ${0.45 * alpha})`);
    glow.addColorStop(0.4, `rgba(0, 180, 255, ${0.25 * alpha})`);
    glow.addColorStop(1, 'rgba(0, 120, 255, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(0, 0, baseR * 1.8, baseR * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();

    // 主光圈：蓝色实线环
    ctx.strokeStyle = `rgba(120, 220, 255, ${0.9 * alpha})`;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.ellipse(0, 0, baseR, baseR * 0.32, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 水波涟漪：3 层向外扩散的圆环
    ctx.shadowBlur = 6;
    for (let i = 0; i < 3; i++) {
      const phase = (time * 0.8 + i * 0.33) % 1; // 0 → 1 循环
      const rippleR = baseR * (0.6 + phase * 0.9);
      const rippleAlpha = (1 - phase) * 0.5 * alpha;
      ctx.strokeStyle = `rgba(150, 230, 255, ${rippleAlpha})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, rippleR, rippleR * 0.32, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 内圈高频细纹：增强水波质感
    ctx.shadowBlur = 0;
    ctx.strokeStyle = `rgba(200, 240, 255, ${0.3 * alpha})`;
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 2; i++) {
      const innerR = baseR * (0.35 + i * 0.2 + Math.sin(time * 4 + i) * 0.05);
      ctx.beginPath();
      ctx.ellipse(0, 0, innerR, innerR * 0.32, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 上升光点粒子（水面反光）
    for (let i = 0; i < 4; i++) {
      const pa = (time * 0.7 + i * 0.25) % 1;
      const px = Math.cos(i * 1.7 + time) * baseR * 0.7;
      const py = -pa * 25;
      const pAlpha = (1 - pa) * 0.7 * alpha;
      ctx.fillStyle = `rgba(180, 240, 255, ${pAlpha})`;
      ctx.beginPath();
      ctx.arc(px, py, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawDomainIndicator(fighter) {
    if (!fighter.domainActive) return;
    const ctx = this.ctx;
    const text = `${fighter.character.ultimate.name}`;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.font = 'bold 16px "Noto Sans SC", sans-serif';
    ctx.textAlign = 'center';
    const tx = fighter.isPlayer ? this.width * 0.25 : this.width * 0.75;
    ctx.fillText(text, tx, 70);
    ctx.restore();
  }

  // 领域全屏UI覆盖 - 多阶段特效（layer: 'behind' | 'front'）
  drawDomainOverlay(fighter, layer = 'behind') {
    if (!fighter || !fighter.domainActive) return;
    const domain = fighter.character.ultimate;
    if (!domain || domain.type !== 'domain') return;

    if (fighter.character.id === 'sukuna') {
      this.drawSukunaDomainOverlay(fighter, layer);
      return;
    }
    if (fighter.character.id === 'yuji') {
      this.drawYujiDomainOverlay(fighter, layer);
      return;
    }
    if (fighter.character.id !== 'gojo') return;
    this.drawGojoDomainOverlay(fighter, layer);
  }

  // ====== 虎杖「农家乐领域」特效 ======
  // 暖调怀旧乡间场景：北上车站、农田、暖光帷幕、白光灵魂斩、记忆光影
  drawYujiDomainOverlay(fighter, layer = 'behind') {
    const ctx = this.ctx;
    const domain = fighter.character.ultimate;
    const phase = fighter.domainPhase;
    const time = Date.now() * 0.001;
    const w = this.width;
    const h = this.height;
    const cx = w / 2;
    const cy = h / 2;
    const groundY = h * 0.78;

    ctx.save();

    // ====== 阶段1：起手结印 —— 咒力血气收拢于胸口，不外放 ======
    if (phase === 'preCast' && layer === 'behind') {
      const phaseProgress = 1 - fighter.domainPhaseTimer / domain.phases.preCast;
      // 周遭新宿崩塌的都市空间开始柔和扭曲（边缘渐隐）
      const fadeOut = phaseProgress;
      ctx.fillStyle = `rgba(10, 0, 20, ${fadeOut * 0.4})`;
      ctx.fillRect(0, 0, w, h);
      // 边缘视野泛起暖米色柔光帷幕（缓慢铺展）
      const veilAlpha = phaseProgress * 0.5;
      const veilGrad = ctx.createRadialGradient(cx, cy, w * 0.2, cx, cy, w * 0.7);
      veilGrad.addColorStop(0, 'rgba(255, 243, 214, 0)');
      veilGrad.addColorStop(0.6, `rgba(255, 240, 200, ${veilAlpha * 0.3})`);
      veilGrad.addColorStop(1, `rgba(255, 230, 180, ${veilAlpha * 0.6})`);
      ctx.fillStyle = veilGrad;
      ctx.fillRect(0, 0, w, h);
    }

    // ====== 阶段2：宣告 —— 空间褶皱蔓延，氛围置换 ======
    if (phase === 'declaration' && layer === 'behind') {
      const phaseProgress = fighter.domainPhaseTimer / domain.phases.declaration;
      // 漆黑破碎建筑、硝烟、厮杀戾气被层层褪去
      const fadeDark = 1 - phaseProgress;
      ctx.fillStyle = `rgba(0, 0, 0, ${fadeDark * 0.5})`;
      ctx.fillRect(0, 0, w, h);
      // 暖米色帷幕从中心向四面铺展
      const veilR = (1 - phaseProgress) * w * 0.8;
      const veilGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, veilR);
      veilGrad.addColorStop(0, `rgba(255, 243, 214, ${(1 - phaseProgress) * 0.6})`);
      veilGrad.addColorStop(0.6, `rgba(255, 235, 195, ${(1 - phaseProgress) * 0.3})`);
      veilGrad.addColorStop(1, 'rgba(255, 230, 180, 0)');
      ctx.fillStyle = veilGrad;
      ctx.fillRect(0, 0, w, h);
    }

    // ====== 阶段3：扩张 —— 乡间场景展开（北上乡间小镇复刻） ======
    if (phase === 'expanding' && layer === 'behind') {
      const phaseProgress = 1 - fighter.domainPhaseTimer / domain.phases.expanding;
      // 整体淡入乡间场景
      this._drawYujiCountryside(ctx, w, h, groundY, time, phaseProgress);
    }

    // ====== 阶段4：维持 —— 完整乡间场景 + 记忆光影 + 边界光晕 ======
    if (phase === 'active' && layer === 'behind') {
      this._drawYujiCountryside(ctx, w, h, groundY, time, 1);
      // 开放式平缓领域边界：淡乳白色朦胧光晕勾勒轮廓
      this._drawYujiDomainBoundary(ctx, w, h, cx, cy, time);
    }

    // ====== 阶段4：维持（前景层）—— 暖光氛围 + 记忆沉浸提示 ======
    if (phase === 'active' && layer === 'front') {
      // 整体暖色调柔和滤镜
      const warmGrad = ctx.createLinearGradient(0, 0, 0, h);
      warmGrad.addColorStop(0, 'rgba(255, 240, 200, 0.06)');
      warmGrad.addColorStop(0.5, 'rgba(255, 235, 190, 0.04)');
      warmGrad.addColorStop(1, 'rgba(255, 225, 170, 0.08)');
      ctx.fillStyle = warmGrad;
      ctx.fillRect(0, 0, w, h);
    }

    // ====== 阶段5：解除 —— 景物从边缘化作光点碎屑飘散 ======
    if (phase === 'releasing' && layer === 'behind') {
      const releaseProgress = 1 - fighter.domainPhaseTimer / domain.phases.releasing;
      // 乡间场景从边缘开始消融
      this._drawYujiCountryside(ctx, w, h, groundY, time, 1 - releaseProgress);
      // 边缘光点碎屑消散遮罩
      const edgeGrad = ctx.createRadialGradient(cx, cy, w * 0.2, cx, cy, w * 0.7);
      edgeGrad.addColorStop(0, 'rgba(255, 240, 200, 0)');
      edgeGrad.addColorStop(0.6, `rgba(255, 235, 190, ${releaseProgress * 0.2})`);
      edgeGrad.addColorStop(1, `rgba(255, 230, 180, ${releaseProgress * 0.5})`);
      ctx.fillStyle = edgeGrad;
      ctx.fillRect(0, 0, w, h);
    }

    // ====== 阶段6：残留 —— 新宿战场复原，漫天白光散尽 ======
    if (phase === 'aftermath' && layer === 'front') {
      const aftermathProgress = 1 - fighter.domainPhaseTimer / domain.phases.aftermath;
      const fadeAlpha = 1 - aftermathProgress;
      // 漫天细碎白光散尽
      ctx.fillStyle = `rgba(255, 245, 220, ${fadeAlpha * 0.15})`;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.restore();
  }

  // 绘制北上乡间小镇场景（progress 控制淡入淡出）
  _drawYujiCountryside(ctx, w, h, groundY, time, progress) {
    if (progress <= 0) return;
    ctx.globalAlpha = progress;

    // 天空：清淡多云的白日，光线温润不刺眼
    const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
    skyGrad.addColorStop(0, '#c8dde8');
    skyGrad.addColorStop(0.4, '#e8e0d0');
    skyGrad.addColorStop(0.8, '#f5ead0');
    skyGrad.addColorStop(1, '#fff0d4');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, groundY);

    // 多云天空（柔和云朵）
    ctx.fillStyle = 'rgba(255, 250, 240, 0.5)';
    for (let i = 0; i < 5; i++) {
      const cx = (i / 5) * w + Math.sin(time * 0.1 + i) * 20;
      const cy = h * 0.1 + i * h * 0.04;
      const cw = 80 + i * 15;
      ctx.beginPath();
      ctx.ellipse(cx, cy, cw, cw * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 远山轮廓（淡蓝绿色，温润）
    ctx.fillStyle = 'rgba(160, 180, 165, 0.6)';
    ctx.beginPath();
    ctx.moveTo(0, groundY - 80);
    for (let x = 0; x <= w; x += 30) {
      const y = groundY - 80 - Math.sin(x * 0.008) * 25 - Math.sin(x * 0.02) * 12;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, groundY);
    ctx.lineTo(0, groundY);
    ctx.closePath();
    ctx.fill();

    // 中景：成片树木（翠绿，柔和）
    ctx.fillStyle = 'rgba(110, 145, 95, 0.7)';
    for (let i = 0; i < 12; i++) {
      const tx = (i / 12) * w + Math.sin(i * 1.7) * 30;
      const ty = groundY - 40 - Math.sin(i * 2.3) * 10;
      ctx.beginPath();
      ctx.ellipse(tx, ty, 18, 28, 0, 0, Math.PI * 2);
      ctx.fill();
      // 树干
      ctx.fillStyle = 'rgba(110, 80, 55, 0.7)';
      ctx.fillRect(tx - 2, ty + 15, 4, 20);
      ctx.fillStyle = 'rgba(110, 145, 95, 0.7)';
    }

    // 核心中心：北上车站老旧月台（场景中心）
    this._drawYujiStation(ctx, w * 0.5, groundY, time);

    // 大片翠绿农田（左右两侧）
    ctx.fillStyle = 'rgba(120, 165, 95, 0.85)';
    // 左侧农田
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(w * 0.3, groundY - 20);
    ctx.lineTo(w * 0.3, groundY);
    ctx.closePath();
    ctx.fill();
    // 右侧农田
    ctx.beginPath();
    ctx.moveTo(w * 0.7, groundY);
    ctx.lineTo(w * 0.7, groundY - 20);
    ctx.lineTo(w, groundY);
    ctx.closePath();
    ctx.fill();
    // 农田纹理（横向条纹）
    ctx.strokeStyle = 'rgba(95, 135, 75, 0.4)';
    ctx.lineWidth = 1;
    for (let y = groundY - 3; y > groundY - 20; y -= 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w * 0.3, y - 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w * 0.7, y - 2);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // 错落低矮民居（远处剪影）
    ctx.fillStyle = 'rgba(140, 110, 85, 0.5)';
    for (let i = 0; i < 6; i++) {
      const hx = w * 0.1 + i * w * 0.15;
      if (Math.abs(hx - w * 0.5) < 80) continue; // 避开车站
      const hy = groundY - 35;
      const hw = 30 + (i % 2) * 10;
      ctx.fillRect(hx, hy, hw, 25);
      // 屋顶（三角）
      ctx.beginPath();
      ctx.moveTo(hx - 3, hy);
      ctx.lineTo(hx + hw / 2, hy - 12);
      ctx.lineTo(hx + hw + 3, hy);
      ctx.closePath();
      ctx.fill();
    }

    // 蜿蜒乡间小路（淡黄褐色）
    ctx.strokeStyle = 'rgba(200, 175, 130, 0.6)';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(0, groundY - 5);
    ctx.quadraticCurveTo(w * 0.3, groundY + 2, w * 0.5, groundY - 8);
    ctx.quadraticCurveTo(w * 0.7, groundY + 2, w, groundY - 5);
    ctx.stroke();

    // 地面（温暖土黄色）
    const groundGrad = ctx.createLinearGradient(0, groundY, 0, h);
    groundGrad.addColorStop(0, '#d4b886');
    groundGrad.addColorStop(0.5, '#c4a878');
    groundGrad.addColorStop(1, '#b89868');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, groundY, w, h - groundY);

    // 微风吹动草木的细微动态（地面草丛）
    ctx.strokeStyle = 'rgba(95, 130, 75, 0.5)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 30; i++) {
      const gx = (i / 30) * w;
      const gy = groundY + 2 + (i % 3) * 3;
      const sway = Math.sin(time * 1.5 + i * 0.5) * 2;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx + sway, gy - 5);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }

  // 绘制北上车站老旧月台
  _drawYujiStation(ctx, cx, groundY, time) {
    const sway = Math.sin(time * 0.8) * 0.5;
    // 月台基座（褪色木质）
    ctx.fillStyle = 'rgba(120, 95, 65, 0.85)';
    ctx.fillRect(cx - 80, groundY - 30, 160, 30);
    // 月台木板纹理
    ctx.strokeStyle = 'rgba(90, 70, 45, 0.6)';
    ctx.lineWidth = 1;
    for (let x = cx - 75; x < cx + 80; x += 12) {
      ctx.beginPath();
      ctx.moveTo(x, groundY - 30);
      ctx.lineTo(x, groundY);
      ctx.stroke();
    }

    // 褪色木质长椅
    ctx.fillStyle = 'rgba(140, 105, 70, 0.9)';
    ctx.fillRect(cx - 35, groundY - 50, 50, 4);
    ctx.fillRect(cx - 35, groundY - 50, 4, 20);
    ctx.fillRect(cx + 11, groundY - 50, 4, 20);

    // 斑驳站牌（"北上" 字样暗示）
    ctx.fillStyle = 'rgba(180, 165, 130, 0.9)';
    ctx.fillRect(cx - 18, groundY - 75, 36, 22);
    ctx.fillStyle = 'rgba(80, 60, 40, 0.85)';
    ctx.font = 'bold 14px "Noto Sans SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('北上', cx, groundY - 60);

    // 泛黄候车小屋（简化的木质小屋）
    const houseX = cx + 50 + sway;
    ctx.fillStyle = 'rgba(155, 125, 85, 0.85)';
    ctx.fillRect(houseX, groundY - 60, 45, 35);
    // 屋顶
    ctx.fillStyle = 'rgba(120, 90, 60, 0.9)';
    ctx.beginPath();
    ctx.moveTo(houseX - 4, groundY - 60);
    ctx.lineTo(houseX + 22, groundY - 75);
    ctx.lineTo(houseX + 49, groundY - 60);
    ctx.closePath();
    ctx.fill();
    // 小屋窗户（泛黄）
    ctx.fillStyle = 'rgba(220, 195, 130, 0.7)';
    ctx.fillRect(houseX + 8, groundY - 50, 12, 12);

    // 铁轨向远方平缓延伸（透视）
    ctx.strokeStyle = 'rgba(100, 85, 65, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 30, groundY);
    ctx.lineTo(cx - 80, groundY + 25);
    ctx.moveTo(cx + 30, groundY);
    ctx.lineTo(cx + 80, groundY + 25);
    ctx.stroke();
    // 枕木
    ctx.strokeStyle = 'rgba(90, 70, 50, 0.6)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      const ty = groundY + i * 5;
      const spread = 30 + i * 8;
      ctx.beginPath();
      ctx.moveTo(cx - spread, ty);
      ctx.lineTo(cx + spread, ty);
      ctx.stroke();
    }
  }

  // 绘制开放式领域边界（淡乳白色朦胧光晕，触碰边界温柔弹开）
  _drawYujiDomainBoundary(ctx, w, h, cx, cy, time) {
    const pulse = 0.5 + Math.sin(time * 0.8) * 0.1;
    // 边界朦胧光晕（开放式，无坚硬壁垒）
    const boundaryGrad = ctx.createRadialGradient(cx, cy, w * 0.35, cx, cy, w * 0.65);
    boundaryGrad.addColorStop(0, 'rgba(255, 245, 220, 0)');
    boundaryGrad.addColorStop(0.7, `rgba(255, 240, 200, ${pulse * 0.15})`);
    boundaryGrad.addColorStop(0.95, `rgba(255, 235, 190, ${pulse * 0.25})`);
    boundaryGrad.addColorStop(1, `rgba(255, 230, 180, ${pulse * 0.35})`);
    ctx.fillStyle = boundaryGrad;
    ctx.fillRect(0, 0, w, h);
    // 边界细线轮廓（极淡）
    ctx.strokeStyle = `rgba(255, 245, 220, ${pulse * 0.2})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, w * 0.48, h * 0.46, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawGojoDomainOverlay(fighter, layer = 'behind') {
    if (!fighter || !fighter.domainActive) return;
    const domain = fighter.character.ultimate;
    const ctx = this.ctx;

    const phase = fighter.domainPhase;
    const time = Date.now() * 0.001;
    const w = this.width;
    const h = this.height;
    const cx = w / 2;
    const cy = h / 2;

    ctx.save();

    // ====== 阶段1：起手 - 手印+摘眼罩+六眼+咒力爆发（全部在角色之后） ======
    if (phase === 'preCast' && layer === 'behind') {
      const phaseProgress = 1 - fighter.domainPhaseTimer / domain.phases.preCast;
      const burstAlpha = Math.min(1, phaseProgress * 2);

      // 淡蓝色咒力场从角色中心爆发
      const fieldRadius = phaseProgress * 300;
      const fieldGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, fieldRadius);
      fieldGrad.addColorStop(0, `rgba(0, 180, 255, ${0.6 * burstAlpha})`);
      fieldGrad.addColorStop(0.4, `rgba(100, 160, 255, ${0.3 * burstAlpha})`);
      fieldGrad.addColorStop(0.7, `rgba(60, 100, 200, ${0.1 * burstAlpha})`);
      fieldGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = fieldGrad;
      ctx.fillRect(0, 0, w, h);

      // 空间震颤 - 屏幕边缘扭曲波动
      if (phaseProgress > 0.3) {
        const trembleAlpha = (phaseProgress - 0.3) * 1.5;
        ctx.strokeStyle = `rgba(200, 220, 255, ${0.3 * trembleAlpha})`;
        ctx.lineWidth = 1;
        for (let i = 0; i < 10; i++) {
          const yOff = Math.sin(time * 20 + i * 0.7) * 15 * trembleAlpha;
          ctx.beginPath();
          ctx.moveTo(0, h * 0.1 + i * h * 0.08 + yOff);
          ctx.lineTo(w, h * 0.1 + i * h * 0.08 + yOff);
          ctx.stroke();
        }
      }

      // 六眼瞳孔光晕 - 中央闪现
      if (phaseProgress > 0.5) {
        const eyeAlpha = (phaseProgress - 0.5) * 2;
        const eyeGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 80);
        eyeGrad.addColorStop(0, `rgba(0, 200, 255, ${0.8 * eyeAlpha})`);
        eyeGrad.addColorStop(0.3, `rgba(0, 150, 255, ${0.4 * eyeAlpha})`);
        eyeGrad.addColorStop(0.6, `rgba(0, 80, 180, ${0.1 * eyeAlpha})`);
        eyeGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = eyeGrad;
        ctx.fillRect(0, 0, w, h);

        // 星辰光点
        for (let i = 0; i < 20; i++) {
          const sx = cx + Math.cos(time * 3 + i * 0.5) * 60 * eyeAlpha;
          const sy = cy + Math.sin(time * 2.5 + i * 0.7) * 60 * eyeAlpha;
          const starAlpha = 0.3 + Math.sin(time * 5 + i) * 0.3;
          ctx.fillStyle = `rgba(255, 255, 255, ${starAlpha * eyeAlpha})`;
          ctx.beginPath();
          ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // ====== 阶段2：宣告 - 咒力场收缩后扩张，黑暗吞噬（全部在角色之后） ======
    if (phase === 'declaration' && layer === 'behind') {
      const phaseProgress = fighter.domainPhaseTimer / domain.phases.declaration;
      const shrinkPhase = phaseProgress > 0.5;

      // 白光填满视野 -> 极速收敛
      if (phaseProgress > 0.7) {
        const whiteAlpha = (phaseProgress - 0.7) / 0.3;
        ctx.fillStyle = `rgba(255, 255, 255, ${whiteAlpha * 0.9})`;
        ctx.fillRect(0, 0, w, h);
      }

      // 黑暗从边缘向内吞噬
      const darkProgress = shrinkPhase ? (1 - phaseProgress) * 2 : 0;
      const darkRadius = 50 + darkProgress * Math.max(w, h);
      const darkGrad = ctx.createRadialGradient(cx, cy, darkRadius * 0.7, cx, cy, darkRadius);
      darkGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      darkGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.5)');
      darkGrad.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
      ctx.fillStyle = darkGrad;
      ctx.fillRect(0, 0, w, h);

      // 咒力场向内收缩的圆环
      if (shrinkPhase) {
        const ringRadius = darkProgress * 150;
        ctx.strokeStyle = `rgba(150, 200, 255, ${0.6 * darkProgress})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(0, ringRadius), 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // ====== 阶段3：扩张 - 黑色结界球体扩张（全部在角色之后） ======
    if (phase === 'expanding' && layer === 'behind') {
      const phaseProgress = 1 - fighter.domainPhaseTimer / domain.phases.expanding;
      const barrierRadius = phaseProgress * Math.max(w, h) * 0.7;

      // 纯黑球体结界
      const sphereGrad = ctx.createRadialGradient(cx, cy, barrierRadius * 0.3, cx, cy, barrierRadius);
      sphereGrad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
      sphereGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.95)');
      sphereGrad.addColorStop(1, 'rgba(0, 0, 0, 1)');
      ctx.fillStyle = sphereGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, barrierRadius, 0, Math.PI * 2);
      ctx.fill();

      // 球体边缘引力弯折效果
      const lensAlpha = 0.4 + phaseProgress * 0.3;
      for (let i = 0; i < 6; i++) {
        const angle = time * 0.8 + i * Math.PI / 3;
        const lx = cx + Math.cos(angle) * barrierRadius * 0.85;
        const ly = cy + Math.sin(angle) * barrierRadius * 0.85;
        ctx.strokeStyle = `rgba(100, 140, 200, ${lensAlpha * 0.3})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(lx, ly, barrierRadius * 0.25, angle - 0.5, angle + 0.5);
        ctx.stroke();
      }

      // 球体边缘微光
      ctx.strokeStyle = `rgba(60, 80, 140, ${0.5 + phaseProgress * 0.3})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, barrierRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // ====== 阶段4：维持 - 领域内部虚空空间（分前后层） ======
    if (phase === 'active') {
      const eyeX = cx;
      const eyeY = cy;
      const eyeScale = 1.0 + Math.sin(time * 0.3) * 0.03;
      const pupilR = Math.min(w, h) * 0.12 * eyeScale;
      const irisR = Math.min(w, h) * 0.32 * eyeScale;
      const outerR = Math.min(w, h) * 0.48 * eyeScale;

      if (layer === 'behind') {
        // ---- 背景层：虚空底色 + 墨云 + 巨眼主体（虹膜+瞳孔） ----

        // 深空蓝黑背景
        const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.7);
        bgGrad.addColorStop(0, 'rgba(5, 8, 20, 0.95)');
        bgGrad.addColorStop(0.5, 'rgba(3, 5, 15, 0.97)');
        bgGrad.addColorStop(1, 'rgba(0, 0, 0, 1)');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // 飘散的空间碎屑/小方块
        for (let i = 0; i < 50; i++) {
          const seed = i * 97.3;
          const px = ((Math.sin(time * 0.15 + seed * 0.1) * 0.5 + 0.5) * w + seed * 13) % w;
          const py = ((Math.cos(time * 0.12 + seed * 0.09) * 0.5 + 0.5) * h + seed * 7) % h;
          const twinkle = 0.2 + Math.sin(time * 2 + i) * 0.15;
          const size = 1 + (i % 4) * 0.5;
          ctx.fillStyle = `rgba(180, 200, 255, ${twinkle * 0.5})`;
          ctx.fillRect(px, py, size, size);
        }

        // 巨眼外圈光晕（深紫蓝）
        const outerGrad = ctx.createRadialGradient(eyeX, eyeY, irisR, eyeX, eyeY, outerR * 1.8);
        outerGrad.addColorStop(0, 'rgba(20, 10, 40, 0.85)');
        outerGrad.addColorStop(0.4, 'rgba(15, 8, 30, 0.6)');
        outerGrad.addColorStop(0.7, 'rgba(10, 5, 20, 0.3)');
        outerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = outerGrad;
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, outerR * 1.8, 0, Math.PI * 2);
        ctx.fill();

        // 虹彩虹膜 - 多层旋转光环
        for (let ring = 0; ring < 5; ring++) {
          const ringR = pupilR + (irisR - pupilR) * (0.15 + ring * 0.18);
          const ringAngle = time * (0.2 + ring * 0.1) + ring * 0.5;
          for (let seg = 0; seg < 24; seg++) {
            const a1 = ringAngle + (seg / 24) * Math.PI * 2;
            const a2 = ringAngle + ((seg + 0.6) / 24) * Math.PI * 2;
            const hueShift = (seg / 24) * 360 + ring * 30;
            ctx.strokeStyle = `hsla(${hueShift}, 70%, 55%, 0.15)`;
            ctx.lineWidth = 4 + ring * 2;
            ctx.beginPath();
            ctx.arc(eyeX, eyeY, ringR, a1, a2);
            ctx.stroke();
          }
        }

        // 虹膜主色 - 金蓝紫渐变圆环
        const irisGrad = ctx.createRadialGradient(eyeX, eyeY, pupilR * 0.9, eyeX, eyeY, irisR);
        irisGrad.addColorStop(0, 'rgba(255, 220, 140, 0.0)');
        irisGrad.addColorStop(0.15, 'rgba(255, 200, 100, 0.25)');
        irisGrad.addColorStop(0.35, 'rgba(120, 180, 255, 0.35)');
        irisGrad.addColorStop(0.55, 'rgba(180, 120, 255, 0.3)');
        irisGrad.addColorStop(0.75, 'rgba(80, 100, 200, 0.2)');
        irisGrad.addColorStop(1, 'rgba(20, 20, 60, 0.0)');
        ctx.fillStyle = irisGrad;
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, irisR, 0, Math.PI * 2);
        ctx.fill();

        // 虹彩薄膜亮边（金/青/紫交替）
        for (let i = 0; i < 3; i++) {
          const edgeR = irisR * (0.88 + i * 0.07);
          const edgeAlpha = 0.25 - i * 0.07;
          const colors = ['rgba(255, 210, 120, ', 'rgba(100, 200, 255, ', 'rgba(200, 130, 255, '];
          ctx.strokeStyle = colors[i] + edgeAlpha + ')';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(eyeX, eyeY, edgeR, time * 0.3 + i * 0.7, time * 0.3 + i * 0.7 + Math.PI * 1.3);
          ctx.stroke();
        }

        // 纯黑瞳孔（中心黑洞）
        const pupilGrad = ctx.createRadialGradient(eyeX, eyeY, 0, eyeX, eyeY, pupilR);
        pupilGrad.addColorStop(0, '#000000');
        pupilGrad.addColorStop(0.7, 'rgba(5, 0, 10, 0.95)');
        pupilGrad.addColorStop(1, 'rgba(20, 10, 40, 0.5)');
        ctx.fillStyle = pupilGrad;
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, pupilR, 0, Math.PI * 2);
        ctx.fill();

        // 瞳孔边缘微弱蓝光
        ctx.strokeStyle = 'rgba(100, 140, 220, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, pupilR, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (layer === 'front') {
        // ---- 前景层：墨云/墨迹 + 信息碎片 ----

        // 白色墨云/墨迹斑块（不规则分布，从图片看是白色絮状/溅墨效果）
        ctx.save();
        for (let cloud = 0; cloud < 12; cloud++) {
          const angle = time * 0.08 + cloud * 0.52;
          const dist = outerR * (0.8 + Math.sin(time * 0.15 + cloud) * 0.15);
          const cdx = eyeX + Math.cos(angle) * dist;
          const cdy = eyeY + Math.sin(angle) * dist;
          const cloudSize = 40 + (cloud % 5) * 20 + Math.sin(time * 0.4 + cloud * 0.9) * 10;
          const cloudAlpha = 0.5 + Math.sin(time * 0.6 + cloud * 0.7) * 0.2;

          // 用多个重叠圆模拟不规则墨云
          for (let blob = 0; blob < 7; blob++) {
            const ba = cloud * 1.3 + blob * 0.9;
            const bx = cdx + Math.cos(ba) * cloudSize * 0.4;
            const by = cdy + Math.sin(ba * 1.4) * cloudSize * 0.3;
            const bs = cloudSize * (0.3 + (blob % 4) * 0.18);
            const blobGrad = ctx.createRadialGradient(bx, by, 0, bx, by, bs);
            blobGrad.addColorStop(0, `rgba(255, 255, 255, ${cloudAlpha * 0.7})`);
            blobGrad.addColorStop(0.5, `rgba(240, 245, 255, ${cloudAlpha * 0.4})`);
            blobGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = blobGrad;
            ctx.beginPath();
            ctx.arc(bx, by, bs, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();

        // 墨点/溅墨小斑点
        for (let dot = 0; dot < 30; dot++) {
          const dAngle = time * 0.05 + dot * 0.37;
          const dDist = outerR * (0.5 + (dot % 7) * 0.08 + Math.sin(time * 0.2 + dot) * 0.1);
          const dx = eyeX + Math.cos(dAngle) * dDist;
          const dy = eyeY + Math.sin(dAngle * 1.2) * dDist;
          const ds = 2 + (dot % 5) * 1.5 + Math.sin(time + dot * 0.5) * 1;
          ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + Math.sin(time * 1.5 + dot) * 0.2})`;
          ctx.beginPath();
          ctx.arc(dx, dy, ds, 0, Math.PI * 2);
          ctx.fill();
        }

        // 漂浮的信息碎片（小方块）
        for (let i = 0; i < 20; i++) {
          const seed = i * 41.2;
          const fx = ((Math.sin(time * 0.4 + seed * 0.15) * 0.5 + 0.5) * w + seed * 3) % w;
          const fy = ((Math.cos(time * 0.3 + seed * 0.11) * 0.5 + 0.5) * h + seed * 5) % h;
          const fAlpha = 0.15 + Math.sin(time * 3 + i) * 0.1;
          const fs = 3 + (i % 3) * 2;
          ctx.fillStyle = `rgba(200, 220, 255, ${fAlpha})`;
          ctx.fillRect(fx, fy, fs, fs * 0.7);
        }

        // 向目标流动的信息粒子
        const targetX = fighter.isPlayer ? w * 0.75 : w * 0.25;
        const targetY = cy;
        for (let i = 0; i < 20; i++) {
          const streamProgress = (time * 0.4 + i * 0.12) % 1;
          const sx = eyeX + (targetX - eyeX) * streamProgress;
          const sy = eyeY + (targetY - eyeY) * streamProgress + Math.sin(time * 4 + i) * 15;
          const streamAlpha = (1 - Math.abs(streamProgress - 0.5) * 2) * 0.5;
          ctx.fillStyle = `rgba(180, 200, 255, ${streamAlpha})`;
          ctx.fillRect(sx - 1, sy - 1, 3, 3);
        }
      }
    }

    // ====== 阶段5：解除 - 结界收缩消散（全部在角色之后） ======
    if (phase === 'releasing' && layer === 'behind') {
      const releaseProgress = 1 - fighter.domainPhaseTimer / domain.phases.releasing;
      const barrierRadius = (1 - releaseProgress) * Math.max(w, h) * 0.7;

      // 收缩中的黑色球体
      const sphereGrad = ctx.createRadialGradient(cx, cy, barrierRadius * 0.2, cx, cy, barrierRadius);
      sphereGrad.addColorStop(0, `rgba(0, 0, 0, ${0.9 * (1 - releaseProgress)})`);
      sphereGrad.addColorStop(0.7, `rgba(0, 0, 0, ${0.8 * (1 - releaseProgress)})`);
      sphereGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = sphereGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, barrierRadius, 0, Math.PI * 2);
      ctx.fill();

      // 边缘退潮光效
      ctx.strokeStyle = `rgba(100, 140, 200, ${0.5 * (1 - releaseProgress)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, barrierRadius, 0, Math.PI * 2);
      ctx.stroke();

      // 空间扭曲残留
      if (releaseProgress > 0.5) {
        const residualAlpha = (releaseProgress - 0.5) * 2 * 0.3;
        for (let i = 0; i < 5; i++) {
          const rx = cx + Math.cos(time * 2 + i) * barrierRadius * 0.5;
          const ry = cy + Math.sin(time * 1.5 + i) * barrierRadius * 0.5;
          ctx.strokeStyle = `rgba(150, 180, 220, ${residualAlpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(rx, ry, barrierRadius * 0.1, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }

    // ====== 阶段6：残留 - 意识涣散（全部在角色之上，淡化效果） ======
    if (phase === 'aftermath' && layer === 'front') {
      const aftermathProgress = 1 - fighter.domainPhaseTimer / domain.phases.aftermath;
      const fadeAlpha = 1 - aftermathProgress;

      // 逐渐淡出的空间扭曲
      ctx.fillStyle = `rgba(0, 0, 0, ${0.2 * fadeAlpha})`;
      ctx.fillRect(0, 0, w, h);

      // 残余咒力波纹
      for (let i = 0; i < 3; i++) {
        const rippleR = 50 + aftermathProgress * 200 + i * 30;
        const rippleAlpha = (1 - aftermathProgress) * (0.3 - i * 0.08);
        ctx.strokeStyle = `rgba(100, 150, 220, ${rippleAlpha})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, rippleR, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 淡去的星点
      for (let i = 0; i < 10; i++) {
        const sx = cx + Math.cos(i * 0.7) * 80 * fadeAlpha;
        const sy = cy + Math.sin(i * 0.9) * 80 * fadeAlpha;
        ctx.fillStyle = `rgba(150, 180, 220, ${0.2 * fadeAlpha})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  // ====== 伏魔御厨子领域特效 ======
  drawSukunaDomainOverlay(fighter, layer = 'behind') {
    const ctx = this.ctx;
    const domain = fighter.character.ultimate;
    const phase = fighter.domainPhase;
    const time = Date.now() * 0.001;
    const w = this.width;
    const h = this.height;
    const cx = w / 2;
    const cy = h / 2;

    ctx.save();

    // ====== 阶段1：起手 - 血红咒力爆发 ======
    if (phase === 'preCast' && layer === 'behind') {
      const phaseProgress = 1 - fighter.domainPhaseTimer / domain.phases.preCast;
      const burstAlpha = Math.min(1, phaseProgress * 2);

      // 血红咒力场从角色中心爆发
      const fieldRadius = phaseProgress * 300;
      const fieldGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, fieldRadius);
      fieldGrad.addColorStop(0, `rgba(200, 20, 20, ${0.6 * burstAlpha})`);
      fieldGrad.addColorStop(0.4, `rgba(150, 10, 10, ${0.3 * burstAlpha})`);
      fieldGrad.addColorStop(0.7, `rgba(80, 5, 5, ${0.1 * burstAlpha})`);
      fieldGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = fieldGrad;
      ctx.fillRect(0, 0, w, h);

      // 斩击痕迹 - 随机方向的暗色斩痕
      if (phaseProgress > 0.3) {
        const slashAlpha = (phaseProgress - 0.3) * 1.5;
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2 + time * 3;
          const len = 60 + Math.random() * 80;
          const sx = cx + Math.cos(angle) * 20;
          const sy = cy + Math.sin(angle) * 20;
          ctx.strokeStyle = `rgba(180, 0, 0, ${slashAlpha * 0.6})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + Math.cos(angle) * len, sy + Math.sin(angle) * len);
          ctx.stroke();
        }
      }
    }

    // ====== 阶段2：宣告 - 血红吞噬 ======
    if (phase === 'declaration' && layer === 'behind') {
      const phaseProgress = fighter.domainPhaseTimer / domain.phases.declaration;

      // 血红闪光
      if (phaseProgress > 0.7) {
        const redAlpha = (phaseProgress - 0.7) / 0.3;
        ctx.fillStyle = `rgba(180, 0, 0, ${redAlpha * 0.7})`;
        ctx.fillRect(0, 0, w, h);
      }

      // 黑暗从边缘向内吞噬
      const darkProgress = phaseProgress > 0.5 ? (1 - phaseProgress) * 2 : 0;
      const darkRadius = 50 + darkProgress * Math.max(w, h);
      const darkGrad = ctx.createRadialGradient(cx, cy, darkRadius * 0.7, cx, cy, darkRadius);
      darkGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      darkGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.5)');
      darkGrad.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
      ctx.fillStyle = darkGrad;
      ctx.fillRect(0, 0, w, h);
    }

    // ====== 阶段3：扩张 - 神社环境展开（开放型无结界） ======
    if (phase === 'expanding' && layer === 'behind') {
      const phaseProgress = 1 - fighter.domainPhaseTimer / domain.phases.expanding;

      // 暗红底色渐入
      const bgAlpha = phaseProgress * 0.9;
      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.7);
      bgGrad.addColorStop(0, `rgba(30, 5, 5, ${bgAlpha})`);
      bgGrad.addColorStop(0.5, `rgba(15, 3, 3, ${bgAlpha})`);
      bgGrad.addColorStop(1, `rgba(5, 0, 0, ${bgAlpha})`);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // 地面渐现
      if (phaseProgress > 0.2) {
        const groundAlpha = (phaseProgress - 0.2) * 1.2;
        const groundY = h * 0.7;
        const groundGrad = ctx.createLinearGradient(0, groundY, 0, h);
        groundGrad.addColorStop(0, `rgba(20, 8, 5, ${groundAlpha})`);
        groundGrad.addColorStop(1, `rgba(10, 3, 2, ${groundAlpha})`);
        ctx.fillStyle = groundGrad;
        ctx.fillRect(0, groundY, w, h - groundY);
      }
    }

    // ====== 阶段4：维持 - 伏魔御厨子完整环境 ======
    if (phase === 'active') {
      if (layer === 'behind') {
        // ---- 背景层：暗色天空 + 神社建筑 + 地面骸骨 ----

        // 暗红黑天空底色
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.7);
        skyGrad.addColorStop(0, 'rgba(10, 2, 2, 0.98)');
        skyGrad.addColorStop(0.4, 'rgba(20, 5, 5, 0.95)');
        skyGrad.addColorStop(0.7, 'rgba(30, 8, 8, 0.92)');
        skyGrad.addColorStop(1, 'rgba(15, 3, 3, 0.9)');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);

        // 远处山影/建筑轮廓
        ctx.fillStyle = 'rgba(15, 5, 5, 0.8)';
        ctx.beginPath();
        ctx.moveTo(0, h * 0.45);
        for (let x = 0; x <= w; x += 30) {
          const y = h * 0.45 + Math.sin(x * 0.01 + 1) * 20 + Math.sin(x * 0.025) * 10;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h * 0.7);
        ctx.lineTo(0, h * 0.7);
        ctx.closePath();
        ctx.fill();

        // 主殿宇建筑（背景中央）
        this._drawShrineBuilding(ctx, w, h, time);

        // 鸟居（左右各一个，营造纵深感）
        this._drawToriiGate(ctx, w * 0.15, h * 0.55, 0.7, time);
        this._drawToriiGate(ctx, w * 0.85, h * 0.52, 0.85, time);

        // 地面
        const groundY = h * 0.72;
        const groundGrad = ctx.createLinearGradient(0, groundY, 0, h);
        groundGrad.addColorStop(0, 'rgba(25, 10, 8, 0.95)');
        groundGrad.addColorStop(0.3, 'rgba(18, 6, 5, 0.97)');
        groundGrad.addColorStop(1, 'rgba(8, 2, 2, 1)');
        ctx.fillStyle = groundGrad;
        ctx.fillRect(0, groundY, w, h - groundY);

        // 地面纹理 - 石板/裂纹
        ctx.strokeStyle = 'rgba(40, 15, 10, 0.3)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 15; i++) {
          const lx = (i * 97.3) % w;
          const ly = groundY + 10 + (i * 53.7) % (h - groundY - 20);
          const ll = 20 + (i * 31) % 40;
          ctx.beginPath();
          ctx.moveTo(lx, ly);
          ctx.lineTo(lx + ll, ly + (i % 3) * 5 - 2);
          ctx.stroke();
        }

        // 骸骨散布 - 地面层
        this._drawBones(ctx, w, h, groundY, time);

        // 暗红环境光
        const ambientGrad = ctx.createRadialGradient(cx, cy * 0.8, 0, cx, cy * 0.8, Math.max(w, h) * 0.6);
        ambientGrad.addColorStop(0, 'rgba(120, 10, 10, 0.08)');
        ambientGrad.addColorStop(0.5, 'rgba(60, 5, 5, 0.04)');
        ambientGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = ambientGrad;
        ctx.fillRect(0, 0, w, h);

        // 飘散的暗红粒子（咒力余烬）
        for (let i = 0; i < 30; i++) {
          const seed = i * 73.1;
          const px = ((Math.sin(time * 0.1 + seed * 0.08) * 0.5 + 0.5) * w + seed * 11) % w;
          const py = ((Math.cos(time * 0.08 + seed * 0.06) * 0.5 + 0.5) * h * 0.7 + seed * 5) % (h * 0.7);
          const twinkle = 0.15 + Math.sin(time * 1.5 + i * 0.7) * 0.1;
          const size = 1 + (i % 3) * 0.8;
          ctx.fillStyle = `rgba(200, 40, 30, ${twinkle})`;
          ctx.beginPath();
          ctx.arc(px, py, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (layer === 'front') {
        // ---- 前景层：血雾 + 漂浮骸骨碎片 + 斩击痕迹 ----

        // 底部血雾
        const fogY = h * 0.75;
        for (let fog = 0; fog < 8; fog++) {
          const fogX = (fog / 8) * w + Math.sin(time * 0.3 + fog * 1.2) * 30;
          const fogSize = 60 + (fog % 4) * 20;
          const fogAlpha = 0.12 + Math.sin(time * 0.5 + fog * 0.8) * 0.05;
          const fogGrad = ctx.createRadialGradient(fogX, fogY, 0, fogX, fogY, fogSize);
          fogGrad.addColorStop(0, `rgba(120, 10, 10, ${fogAlpha})`);
          fogGrad.addColorStop(0.5, `rgba(80, 5, 5, ${fogAlpha * 0.5})`);
          fogGrad.addColorStop(1, 'rgba(40, 0, 0, 0)');
          ctx.fillStyle = fogGrad;
          ctx.beginPath();
          ctx.ellipse(fogX, fogY, fogSize * 1.5, fogSize * 0.4, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // 漂浮的骸骨碎片/头骨
        for (let i = 0; i < 6; i++) {
          const seed = i * 47.3;
          const bx = w * 0.1 + ((Math.sin(time * 0.15 + seed * 0.1) * 0.5 + 0.5) * w * 0.8 + seed * 7) % (w * 0.8);
          const by = h * 0.2 + ((Math.cos(time * 0.12 + seed * 0.09) * 0.5 + 0.5) * h * 0.4 + seed * 3) % (h * 0.4);
          const bAlpha = 0.2 + Math.sin(time * 0.8 + i * 1.1) * 0.1;
          const bSize = 8 + (i % 3) * 5;
          const bRot = time * 0.3 + i * 1.5;

          ctx.save();
          ctx.translate(bx, by);
          ctx.rotate(bRot);
          ctx.fillStyle = `rgba(180, 160, 140, ${bAlpha})`;
          // 简化头骨形状
          ctx.beginPath();
          ctx.arc(0, 0, bSize * 0.5, 0, Math.PI * 2);
          ctx.fill();
          // 眼窝
          ctx.fillStyle = `rgba(10, 2, 2, ${bAlpha * 1.5})`;
          ctx.beginPath();
          ctx.arc(-bSize * 0.15, -bSize * 0.05, bSize * 0.12, 0, Math.PI * 2);
          ctx.arc(bSize * 0.15, -bSize * 0.05, bSize * 0.12, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // 随机斩击痕迹（暗色细线，一闪而过）
        for (let i = 0; i < 3; i++) {
          const slashPhase = (time * 0.5 + i * 2.3) % 4;
          if (slashPhase < 0.3) {
            const slashAlpha = (0.3 - slashPhase) / 0.3 * 0.4;
            const sx = Math.random() * w;
            const sy = Math.random() * h * 0.7;
            const sAngle = Math.random() * Math.PI;
            const sLen = 40 + Math.random() * 60;
            ctx.strokeStyle = `rgba(200, 20, 20, ${slashAlpha})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + Math.cos(sAngle) * sLen, sy + Math.sin(sAngle) * sLen);
            ctx.stroke();
          }
        }

        // 暗红暗角（vignette）
        const vignetteGrad = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.3, cx, cy, Math.max(w, h) * 0.75);
        vignetteGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignetteGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.15)');
        vignetteGrad.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
        ctx.fillStyle = vignetteGrad;
        ctx.fillRect(0, 0, w, h);
      }
    }

    // ====== 阶段5：解除 - 环境消散 ======
    if (phase === 'releasing' && layer === 'behind') {
      const releaseProgress = 1 - fighter.domainPhaseTimer / domain.phases.releasing;

      // 整体淡出
      ctx.fillStyle = `rgba(5, 0, 0, ${0.3 * releaseProgress})`;
      ctx.fillRect(0, 0, w, h);

      // 斩击痕迹爆发消散
      if (releaseProgress > 0.3 && releaseProgress < 0.7) {
        const burstAlpha = (releaseProgress - 0.3) * 2.5;
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2 + time * 5;
          const dist = releaseProgress * 200;
          const sx = cx + Math.cos(angle) * dist;
          const sy = cy + Math.sin(angle) * dist;
          ctx.strokeStyle = `rgba(200, 20, 20, ${burstAlpha * 0.5})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + Math.cos(angle) * 30, sy + Math.sin(angle) * 30);
          ctx.stroke();
        }
      }
    }

    // ====== 阶段6：残留 - 环境余韵 ======
    if (phase === 'aftermath' && layer === 'front') {
      const aftermathProgress = 1 - fighter.domainPhaseTimer / domain.phases.aftermath;
      const fadeAlpha = 1 - aftermathProgress;

      // 逐渐淡出的暗红残影
      ctx.fillStyle = `rgba(20, 5, 5, ${0.15 * fadeAlpha})`;
      ctx.fillRect(0, 0, w, h);

      // 残余斩击波纹
      for (let i = 0; i < 3; i++) {
        const rippleR = 50 + aftermathProgress * 200 + i * 30;
        const rippleAlpha = (1 - aftermathProgress) * (0.2 - i * 0.05);
        ctx.strokeStyle = `rgba(180, 20, 20, ${rippleAlpha})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, rippleR, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 淡去的血粒子
      for (let i = 0; i < 8; i++) {
        const sx = cx + Math.cos(i * 0.8 + time) * 60 * fadeAlpha;
        const sy = cy + Math.sin(i * 1.1 + time * 0.7) * 60 * fadeAlpha;
        ctx.fillStyle = `rgba(180, 30, 20, ${0.15 * fadeAlpha})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  // 绘制神社主殿宇
  _drawShrineBuilding(ctx, w, h, time) {
    const bx = w * 0.5;
    const by = h * 0.35;
    const bw = w * 0.35;
    const bh = h * 0.35;

    // 殿宇主体 - 深色木质
    ctx.fillStyle = 'rgba(20, 8, 6, 0.9)';
    ctx.fillRect(bx - bw * 0.4, by, bw * 0.8, bh);

    // 屋顶 - 多层歇山顶
    // 上层屋顶
    ctx.fillStyle = 'rgba(15, 5, 5, 0.95)';
    ctx.beginPath();
    ctx.moveTo(bx - bw * 0.5, by);
    ctx.lineTo(bx, by - bh * 0.3);
    ctx.lineTo(bx + bw * 0.5, by);
    ctx.closePath();
    ctx.fill();

    // 屋顶边缘装饰
    ctx.strokeStyle = 'rgba(40, 12, 10, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx - bw * 0.52, by + 2);
    ctx.lineTo(bx, by - bh * 0.32);
    ctx.lineTo(bx + bw * 0.52, by + 2);
    ctx.stroke();

    // 下层屋檐
    ctx.fillStyle = 'rgba(18, 6, 5, 0.92)';
    ctx.beginPath();
    ctx.moveTo(bx - bw * 0.55, by + bh * 0.15);
    ctx.lineTo(bx - bw * 0.48, by + bh * 0.05);
    ctx.lineTo(bx + bw * 0.48, by + bh * 0.05);
    ctx.lineTo(bx + bw * 0.55, by + bh * 0.15);
    ctx.closePath();
    ctx.fill();

    // 柱子
    ctx.fillStyle = 'rgba(25, 10, 8, 0.85)';
    const pillarW = bw * 0.06;
    const pillarH = bh * 0.85;
    const pillarY = by + bh * 0.15;
    // 左柱
    ctx.fillRect(bx - bw * 0.35, pillarY, pillarW, pillarH);
    // 右柱
    ctx.fillRect(bx + bw * 0.35 - pillarW, pillarY, pillarW, pillarH);
    // 中柱
    ctx.fillRect(bx - pillarW * 0.5, pillarY, pillarW, pillarH);

    // 柱子暗红纹路
    ctx.strokeStyle = 'rgba(80, 15, 10, 0.3)';
    ctx.lineWidth = 1;
    for (let p = 0; p < 3; p++) {
      const px = bx + (p - 1) * bw * 0.35;
      for (let v = 0; v < 4; v++) {
        const vy = pillarY + v * pillarH * 0.25;
        ctx.beginPath();
        ctx.moveTo(px, vy);
        ctx.lineTo(px, vy + pillarH * 0.15);
        ctx.stroke();
      }
    }

    // 殿内暗光（从内部透出的暗红）
    const innerGlow = ctx.createRadialGradient(bx, by + bh * 0.4, 0, bx, by + bh * 0.4, bw * 0.3);
    innerGlow.addColorStop(0, 'rgba(100, 15, 10, 0.15)');
    innerGlow.addColorStop(0.5, 'rgba(60, 8, 5, 0.08)');
    innerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = innerGlow;
    ctx.fillRect(bx - bw * 0.4, by + bh * 0.1, bw * 0.8, bh * 0.8);

    // 屋顶上的装饰物（鸱尾/脊兽剪影）
    ctx.fillStyle = 'rgba(10, 3, 3, 0.9)';
    // 左脊兽
    ctx.beginPath();
    ctx.arc(bx - bw * 0.48, by - bh * 0.05, 6, 0, Math.PI * 2);
    ctx.fill();
    // 右脊兽
    ctx.beginPath();
    ctx.arc(bx + bw * 0.48, by - bh * 0.05, 6, 0, Math.PI * 2);
    ctx.fill();
    // 正中鸱尾
    ctx.beginPath();
    ctx.moveTo(bx - 4, by - bh * 0.3);
    ctx.lineTo(bx, by - bh * 0.38);
    ctx.lineTo(bx + 4, by - bh * 0.3);
    ctx.closePath();
    ctx.fill();

    // 建筑边缘微光（随时间脉动）
    const edgePulse = 0.15 + Math.sin(time * 0.8) * 0.05;
    ctx.strokeStyle = `rgba(120, 20, 15, ${edgePulse})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(bx - bw * 0.4, by, bw * 0.8, bh);
  }

  // 绘制鸟居
  _drawToriiGate(ctx, x, y, scale, time) {
    const s = scale;
    const postW = 12 * s;
    const postH = 120 * s;
    const topW = 100 * s;
    const topH = 10 * s;
    const midW = 80 * s;

    // 柱子
    ctx.fillStyle = 'rgba(25, 8, 6, 0.9)';
    ctx.fillRect(x - postW * 0.5, y - postH, postW, postH);
    ctx.fillRect(x + postW * 0.5 - postW, y - postH, postW, postH);

    // 顶部横梁（笠木）- 两端上翘
    ctx.fillStyle = 'rgba(20, 6, 5, 0.95)';
    ctx.beginPath();
    ctx.moveTo(x - topW * 0.55, y - postH + 5 * s);
    ctx.quadraticCurveTo(x - topW * 0.5, y - postH - 5 * s, x - topW * 0.45, y - postH);
    ctx.lineTo(x + topW * 0.45, y - postH);
    ctx.quadraticCurveTo(x + topW * 0.5, y - postH - 5 * s, x + topW * 0.55, y - postH + 5 * s);
    ctx.lineTo(x + topW * 0.5, y - postH + topH + 5 * s);
    ctx.lineTo(x - topW * 0.5, y - postH + topH + 5 * s);
    ctx.closePath();
    ctx.fill();

    // 中间横梁（额木）
    ctx.fillStyle = 'rgba(22, 7, 5, 0.9)';
    ctx.fillRect(x - midW * 0.5, y - postH * 0.7, midW, 8 * s);

    // 柱子暗红微光
    const pillarGlow = 0.1 + Math.sin(time * 0.6 + x * 0.01) * 0.05;
    ctx.strokeStyle = `rgba(100, 15, 10, ${pillarGlow})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(x - postW * 0.5, y - postH, postW, postH);
    ctx.strokeRect(x + postW * 0.5 - postW, y - postH, postW, postH);
  }

  // 绘制骸骨
  _drawBones(ctx, w, h, groundY, time) {
    const bonePositions = [
      { x: w * 0.1, y: groundY + 15, rot: 0.3, size: 1 },
      { x: w * 0.25, y: groundY + 25, rot: -0.5, size: 0.8 },
      { x: w * 0.4, y: groundY + 10, rot: 0.8, size: 1.2 },
      { x: w * 0.55, y: groundY + 30, rot: -0.2, size: 0.9 },
      { x: w * 0.7, y: groundY + 18, rot: 0.6, size: 1.1 },
      { x: w * 0.85, y: groundY + 22, rot: -0.7, size: 0.85 },
      { x: w * 0.15, y: groundY + 40, rot: 0.1, size: 0.7 },
      { x: w * 0.35, y: groundY + 35, rot: -0.4, size: 1.0 },
      { x: w * 0.6, y: groundY + 45, rot: 0.9, size: 0.75 },
      { x: w * 0.8, y: groundY + 38, rot: -0.3, size: 0.95 },
      { x: w * 0.05, y: groundY + 50, rot: 0.5, size: 0.6 },
      { x: w * 0.5, y: groundY + 55, rot: -0.6, size: 0.65 },
      { x: w * 0.95, y: groundY + 48, rot: 0.2, size: 0.7 },
      { x: w * 0.2, y: groundY + 60, rot: -0.8, size: 0.55 },
      { x: w * 0.75, y: groundY + 58, rot: 0.4, size: 0.6 },
    ];

    for (const bone of bonePositions) {
      ctx.save();
      ctx.translate(bone.x, bone.y);
      ctx.rotate(bone.rot);
      const s = bone.size;

      // 骨骼主体颜色（暗白骨色）
      const boneColor = `rgba(160, 145, 130, ${0.4 + Math.sin(time * 0.3 + bone.x * 0.01) * 0.1})`;
      ctx.fillStyle = boneColor;

      // 长骨
      ctx.fillRect(-15 * s, -3 * s, 30 * s, 6 * s);
      // 骨端
      ctx.beginPath();
      ctx.arc(-15 * s, 0, 5 * s, 0, Math.PI * 2);
      ctx.arc(15 * s, 0, 5 * s, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // 头骨（较大的）
    const skullPositions = [
      { x: w * 0.2, y: groundY + 20, size: 1.2 },
      { x: w * 0.45, y: groundY + 35, size: 1.0 },
      { x: w * 0.65, y: groundY + 15, size: 1.1 },
      { x: w * 0.9, y: groundY + 30, size: 0.9 },
      { x: w * 0.35, y: groundY + 50, size: 0.8 },
    ];

    for (const skull of skullPositions) {
      ctx.save();
      ctx.translate(skull.x, skull.y);
      const s = skull.size;
      const skullAlpha = 0.35 + Math.sin(time * 0.4 + skull.x * 0.01) * 0.1;

      // 头骨主体
      ctx.fillStyle = `rgba(170, 155, 140, ${skullAlpha})`;
      ctx.beginPath();
      ctx.arc(0, -3 * s, 10 * s, 0, Math.PI * 2);
      ctx.fill();

      // 下颌
      ctx.fillRect(-7 * s, 4 * s, 14 * s, 6 * s);

      // 眼窝
      ctx.fillStyle = `rgba(5, 1, 1, ${skullAlpha * 1.5})`;
      ctx.beginPath();
      ctx.arc(-4 * s, -4 * s, 3 * s, 0, Math.PI * 2);
      ctx.arc(4 * s, -4 * s, 3 * s, 0, Math.PI * 2);
      ctx.fill();

      // 鼻腔
      ctx.beginPath();
      ctx.moveTo(-1.5 * s, 1 * s);
      ctx.lineTo(0, 4 * s);
      ctx.lineTo(1.5 * s, 1 * s);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    // 堆砌的骸骨堆（右侧）
    const pileX = w * 0.88;
    const pileY = groundY + 10;
    ctx.fillStyle = 'rgba(150, 135, 120, 0.3)';
    for (let i = 0; i < 8; i++) {
      const px = pileX + (Math.random() - 0.5) * 30;
      const py = pileY - i * 5 + Math.random() * 3;
      const ps = 8 + Math.random() * 12;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(Math.random() * Math.PI);
      ctx.fillRect(-ps * 0.5, -2, ps, 4);
      ctx.beginPath();
      ctx.arc(-ps * 0.5, 0, 3, 0, Math.PI * 2);
      ctx.arc(ps * 0.5, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 左侧骸骨堆
    const pileX2 = w * 0.12;
    ctx.fillStyle = 'rgba(150, 135, 120, 0.25)';
    for (let i = 0; i < 6; i++) {
      const px = pileX2 + (Math.random() - 0.5) * 25;
      const py = pileY + 5 - i * 4 + Math.random() * 3;
      const ps = 6 + Math.random() * 10;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(Math.random() * Math.PI);
      ctx.fillRect(-ps * 0.5, -2, ps, 4);
      ctx.restore();
    }
  }

  // 茈紫色光束
  drawPurpleBeam(cx) {
    const ctx = this.ctx;
    const time = Date.now() * 0.001;
    ctx.save();
    // 主光束
    const beamGrad = ctx.createLinearGradient(cx - 20, 0, cx + 20, 0);
    beamGrad.addColorStop(0, 'rgba(108, 92, 231, 0)');
    beamGrad.addColorStop(0.2, 'rgba(162, 155, 254, 0.5)');
    beamGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.8)');
    beamGrad.addColorStop(0.8, 'rgba(162, 155, 254, 0.5)');
    beamGrad.addColorStop(1, 'rgba(108, 92, 231, 0)');
    ctx.fillStyle = beamGrad;
    ctx.fillRect(cx - 30, 0, 60, this.height);
    // 核心白线
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.8 + Math.sin(time * 5) * 0.2})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, this.height);
    ctx.stroke();
    // 空间切割裂痕（两侧暗色条纹）
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 25, 0);
    ctx.lineTo(cx - 25, this.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 25, 0);
    ctx.lineTo(cx + 25, this.height);
    ctx.stroke();
    ctx.restore();
  }

  // 工具函数
  darkenColor(hex, factor) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)})`;
  }

  lightenColor(hex, factor) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.round(r + (255 - r) * factor)}, ${Math.round(g + (255 - g) * factor)}, ${Math.round(b + (255 - b) * factor)})`;
  }

  hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  }

  parseRgb(rgb) {
    const m = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (m) {
      return { r: parseInt(m[1]), g: parseInt(m[2]), b: parseInt(m[3]) };
    }
    return { r: 255, g: 0, b: 0 };
  }
}