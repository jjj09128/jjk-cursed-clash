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
    this.initBackground();
  }

  initBackground() {
    // 生成背景星星/粒子
    this.bgStars = [];
    for (let i = 0; i < 50; i++) {
      this.bgStars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height * 0.7,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.5 + 0.1,
        alpha: Math.random() * 0.5 + 0.2
      });
    }
    // 生成建筑剪影
    this.bgBuildings = [];
    for (let i = 0; i < 8; i++) {
      this.bgBuildings.push({
        x: (i / 8) * this.width * 1.2 - this.width * 0.1,
        w: Math.random() * 80 + 40,
        h: Math.random() * 150 + 80,
        color: `hsl(260, 30%, ${8 + Math.random() * 5}%)`
      });
    }
  }

  resize() {
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.groundY = this.height * 0.78;
    this.initBackground();
  }

  drawBackground() {
    const ctx = this.ctx;
    // 天空渐变
    const skyGrad = ctx.createLinearGradient(0, 0, 0, this.height);
    skyGrad.addColorStop(0, '#0a0015');
    skyGrad.addColorStop(0.4, '#1a0030');
    skyGrad.addColorStop(0.7, '#2d1050');
    skyGrad.addColorStop(1, '#1a0a2e');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // 月亮
    ctx.save();
    ctx.fillStyle = '#f5f6fa';
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(this.width * 0.8, this.height * 0.15, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a0015';
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(this.width * 0.8 + 12, this.height * 0.15 - 5, 35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 星星
    for (const star of this.bgStars) {
      ctx.save();
      ctx.fillStyle = `rgba(200, 180, 255, ${star.alpha})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // 移动
      star.y -= star.speed * 0.1;
      if (star.y < 0) {
        star.y = this.height * 0.7;
        star.x = Math.random() * this.width;
      }
    }

    // 建筑剪影
    for (const b of this.bgBuildings) {
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, this.groundY - b.h, b.w, b.h);
      // 窗户
      ctx.fillStyle = 'rgba(255, 200, 100, 0.3)';
      for (let wy = this.groundY - b.h + 15; wy < this.groundY - 15; wy += 25) {
        for (let wx = b.x + 10; wx < b.x + b.w - 10; wx += 20) {
          if (Math.random() > 0.4) {
            ctx.fillRect(wx, wy, 6, 10);
          }
        }
      }
    }

    // 地面
    const groundGrad = ctx.createLinearGradient(0, this.groundY, 0, this.height);
    groundGrad.addColorStop(0, '#1a1030');
    groundGrad.addColorStop(0.3, '#150a25');
    groundGrad.addColorStop(1, '#0a0015');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);

    // 地面线
    ctx.strokeStyle = 'rgba(108, 92, 231, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, this.groundY);
    ctx.lineTo(this.width, this.groundY);
    ctx.stroke();

    // 咒力粒子飘浮
    const time = Date.now() * 0.001;
    for (let i = 0; i < 12; i++) {
      const px = (Math.sin(time * 0.7 + i * 1.2) * 0.5 + 0.5) * this.width;
      const py = this.groundY - 20 - Math.abs(Math.cos(time * 0.5 + i)) * 200;
      ctx.save();
      ctx.fillStyle = `rgba(108, 92, 231, ${0.1 + Math.sin(time * 2 + i) * 0.05})`;
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
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

    // 无下限屏障全开（五条悟手动屏障）
    if (character.id === 'gojo' && fighter.barrierActive) {
      const time = Date.now() * 0.001;
      // 厚重蓝色球形结界
      const barrierGrad = ctx.createRadialGradient(0, -30, 30, 0, -30, 55);
      barrierGrad.addColorStop(0, 'rgba(0, 212, 255, 0.05)');
      barrierGrad.addColorStop(0.6, 'rgba(0, 180, 255, 0.25)');
      barrierGrad.addColorStop(0.85, 'rgba(0, 150, 255, 0.4)');
      barrierGrad.addColorStop(1, 'rgba(0, 212, 255, 0.1)');
      ctx.fillStyle = barrierGrad;
      ctx.beginPath();
      ctx.arc(0, -30, 55, 0, Math.PI * 2);
      ctx.fill();
      // 结界边框
      ctx.strokeStyle = `rgba(0, 212, 255, ${0.7 + Math.sin(time * 4) * 0.2})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, -30, 53, 0, Math.PI * 2);
      ctx.stroke();
      // 内部光纹
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 + Math.sin(time * 3) * 0.15})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, -30, 38, 0, Math.PI * 2);
      ctx.stroke();
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

    // 绘制角色身体
    this.drawCharacterBody(fighter);

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
                    character.id === 'nobara' ? '#8B4513' :
                    character.id === 'megumi' ? '#1a1a2e' : '#e8956a';
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
    ctx.fillStyle = character.id === 'gojo' ? '#0984e3' : '#1a1a2e';
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

  drawHUD(player, enemy) {
    const ctx = this.ctx;
    const barWidth = 300;
    const barHeight = 16;
    const barY = 20;

    // 左侧玩家血条
    this.drawHealthBar(30, barY, barWidth, barHeight, player, true);
    // 右侧敌人血条
    this.drawHealthBar(this.width - 30 - barWidth, barY, barWidth, barHeight, enemy, false);
  }

  // 3v3 队伍HUD
  drawTeamHUD(playerTeam, enemyTeam, pIdx, eIdx) {
    const ctx = this.ctx;
    const barW = 80;
    const barH = 6;
    const gap = 4;
    const startX = 10;
    const startY = 52;

    // 玩家队伍
    ctx.save();
    for (let i = 0; i < playerTeam.length; i++) {
      const f = playerTeam[i];
      const y = startY + i * (barH + gap + 12);
      const isActive = i === pIdx;
      const isDead = f.state === 'dead';

      // 名字
      ctx.fillStyle = isActive ? '#00f0ff' : isDead ? '#555555' : '#999999';
      ctx.font = `${isActive ? 'bold ' : ''}10px "Noto Sans SC", sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(f.character.name, startX + 2, y + 8);

      // 活跃指示器
      ctx.strokeStyle = isActive ? '#00f0ff' : isDead ? '#333333' : '#555555';
      ctx.lineWidth = isActive ? 2 : 1;
      ctx.strokeRect(startX, y - 2, 4, 4);

      // HP条
      const hpRatio = isDead ? 0 : Math.max(0, f.currentHp / f.maxHp);
      const barX = startX + 90;
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(barX, y, barW, barH);
      if (hpRatio > 0) {
        const hpColor = hpRatio > 0.5 ? '#00ff88' : hpRatio > 0.25 ? '#ffaa00' : '#ff3333';
        ctx.fillStyle = hpColor;
        ctx.fillRect(barX, y, barW * hpRatio, barH);
      }
      ctx.strokeStyle = isActive ? '#00f0ff' : '#333333';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, y, barW, barH);

      // 活跃标记
      if (isActive) {
        ctx.fillStyle = '#00f0ff';
        ctx.beginPath();
        ctx.arc(barX + barW + 10, y + barH / 2, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 敌人队伍
    const eStartX = this.width - 10 - 90 - barW;
    for (let i = 0; i < enemyTeam.length; i++) {
      const f = enemyTeam[i];
      const y = this.height - 52 - (enemyTeam.length - 1 - i) * (barH + gap + 12);
      const isActive = i === eIdx;
      const isDead = f.state === 'dead';

      ctx.fillStyle = isActive ? '#ff4444' : isDead ? '#555555' : '#999999';
      ctx.font = `${isActive ? 'bold ' : ''}10px "Noto Sans SC", sans-serif`;
      ctx.textAlign = 'right';
      ctx.fillText(f.character.name, eStartX + barW - 2, y + 8);

      const hpRatio = isDead ? 0 : Math.max(0, f.currentHp / f.maxHp);
      const barX = eStartX;
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(barX, y, barW, barH);
      if (hpRatio > 0) {
        const hpColor = hpRatio > 0.5 ? '#00ff88' : hpRatio > 0.25 ? '#ffaa00' : '#ff3333';
        ctx.fillStyle = hpColor;
        ctx.fillRect(barX + barW * (1 - hpRatio), y, barW * hpRatio, barH);
      }
      ctx.strokeStyle = isActive ? '#ff4444' : '#333333';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, y, barW, barH);

      if (isActive) {
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.arc(barX - 10, y + barH / 2, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  drawHealthBar(x, y, w, h, fighter, isPlayer) {
    const ctx = this.ctx;
    const char = fighter.character;
    const hpRatio = fighter.currentHp / fighter.maxHp;
    const energyRatio = fighter.cursedEnergy / fighter.maxCursedEnergy;

    // 角色名
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px "Noto Sans SC", sans-serif';
    ctx.textAlign = isPlayer ? 'left' : 'right';
    const nameX = isPlayer ? x : x + w;
    ctx.fillText(char.name, nameX, y - 5);

    // 血条背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 4);
    ctx.fill();
    ctx.stroke();

    // 血条 - 根据血量比例动态变色
    let hpColor;
    if (hpRatio > 0.5) {
      // 绿→黄：hpRatio 1.0→0.5，红色通道 0→255
      const r = Math.round(255 * (1 - hpRatio) * 2);
      hpColor = `rgb(${r}, 255, 50)`;
    } else if (hpRatio > 0.25) {
      // 黄→红：hpRatio 0.5→0.25，绿色通道 255→0
      const g = Math.round(255 * (hpRatio - 0.25) * 4);
      hpColor = `rgb(255, ${g}, 0)`;
    } else {
      hpColor = '#ff2d55';
    }

    // 用 hexToRgb 统一处理颜色
    const baseRgb = hpColor.startsWith('#') ? this.hexToRgb(hpColor) : this.parseRgb(hpColor);
    const lightRgb = {
      r: Math.round(baseRgb.r + (255 - baseRgb.r) * 0.3),
      g: Math.round(baseRgb.g + (255 - baseRgb.g) * 0.3),
      b: Math.round(baseRgb.b + (255 - baseRgb.b) * 0.3)
    };

    const barFillW = Math.max(0, (w - 2) * Math.max(0, Math.min(1, hpRatio)));
    if (barFillW > 0) {
      const hpGrad = ctx.createLinearGradient(x, y, x + barFillW, y);
      hpGrad.addColorStop(0, hpColor);
      hpGrad.addColorStop(1, `rgb(${lightRgb.r}, ${lightRgb.g}, ${lightRgb.b})`);
      ctx.fillStyle = hpGrad;
      ctx.beginPath();
      ctx.roundRect(x + 1, y + 1, barFillW, h - 2, 3);
      ctx.fill();
    }

    // 血量数字
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(fighter.currentHp)} / ${fighter.maxHp}`, x + w / 2, y + h - 3);

    // 咒力条
    const energyY = y + h + 6;
    const energyH = 6;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.roundRect(x, energyY, w, energyH, 3);
    ctx.fill();

    const energyGrad = ctx.createLinearGradient(x, energyY, x + w * energyRatio, energyY);
    energyGrad.addColorStop(0, char.glowColor);
    energyGrad.addColorStop(1, '#00d4ff');
    ctx.fillStyle = energyGrad;
    ctx.beginPath();
    ctx.roundRect(x + 1, energyY + 1, Math.max(0, (w - 2) * energyRatio), energyH - 2, 2);
    ctx.fill();

    // 咒力标签
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '9px "Noto Sans SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('咒力', x + w / 2, energyY + energyH - 1);
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

  // 无量空处领域全屏UI覆盖
  drawDomainOverlay(fighter) {
    if (!fighter || !fighter.domainActive) return;
    if (fighter.character.id !== 'gojo') return;
    const ctx = this.ctx;
    const domain = fighter.character.ultimate;
    if (!domain || domain.type !== 'domain') return;

    const progress = 1 - fighter.domainTimer / domain.duration;
    const time = Date.now() * 0.001;

    ctx.save();

    // 半透明淡化原HUD
    ctx.fillStyle = `rgba(255, 255, 255, ${0.85 * Math.min(1, progress * 2)})`;
    ctx.fillRect(0, 0, this.width, this.height);

    // 四边白色数据流边框
    const borderAlpha = 0.5 + Math.sin(time * 3) * 0.15;
    ctx.strokeStyle = `rgba(255, 255, 255, ${borderAlpha})`;
    ctx.lineWidth = 3;
    ctx.strokeRect(15, 15, this.width - 30, this.height - 30);
    ctx.strokeStyle = `rgba(200, 220, 255, ${borderAlpha * 0.5})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(25, 25, this.width - 50, this.height - 50);

    // 几何破碎线条
    ctx.strokeStyle = `rgba(0, 0, 0, 0.1)`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const lx = (Math.sin(time * 1.3 + i * 0.8) * 0.5 + 0.5) * this.width;
      const ly = (Math.cos(time * 0.9 + i * 1.1) * 0.5 + 0.5) * this.height;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx + Math.cos(time + i) * 80, ly + Math.sin(time + i) * 80);
      ctx.stroke();
    }

    // 日文信息流漂浮
    ctx.fillStyle = 'rgba(60, 60, 80, 0.15)';
    ctx.font = '12px monospace';
    const infoChars = ['術式', '情報', '無限', '虚式', '領域', '展開', '無量', '空処', '蒼', '赫', '茈', '黒閃'];
    for (let i = 0; i < infoChars.length; i++) {
      const ix = (Math.sin(time * 0.7 + i * 1.5) * 0.5 + 0.5) * this.width;
      const iy = (Math.cos(time * 0.6 + i * 1.3) * 0.5 + 0.5) * this.height;
      ctx.fillText(infoChars[i], ix, iy);
    }

    // 中央漫画粗体大字「领域展开・无量空处」
    const titleAlpha = Math.min(1, progress * 3);
    if (titleAlpha > 0.01) {
      ctx.save();
      ctx.globalAlpha = titleAlpha;
      // 文字阴影
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.font = 'bold 36px "Noto Sans SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('領域展開', this.width / 2 + 2, this.height * 0.45 + 2);
      ctx.fillText('無量空処', this.width / 2 + 2, this.height * 0.55 + 2);
      // 主文字
      const titleGrad = ctx.createLinearGradient(0, this.height * 0.4, 0, this.height * 0.6);
      titleGrad.addColorStop(0, '#000000');
      titleGrad.addColorStop(0.5, '#333366');
      titleGrad.addColorStop(1, '#000000');
      ctx.fillStyle = titleGrad;
      ctx.fillText('領域展開', this.width / 2, this.height * 0.45);
      ctx.fillText('無量空処', this.width / 2, this.height * 0.55);
      ctx.restore();
    }

    ctx.restore();
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