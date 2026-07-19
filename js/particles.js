// 粒子特效系统
class ParticleSystem {
  constructor() {
    this.particles = [];
    this.screenShake = { intensity: 0, duration: 0 };
    this.screenFlash = { color: null, alpha: 0, duration: 0 };
    this.screenFilter = { type: null, alpha: 0, duration: 0 };
  }

  update() {
    const dt = 1 / 60;
    // 更新粒子
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.vy += p.gravity * dt * 60;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
    // 屏幕震动衰减
    if (this.screenShake.duration > 0) {
      this.screenShake.duration -= dt;
      this.screenShake.intensity *= 0.9;
    }
    // 屏幕闪光衰减
    if (this.screenFlash.duration > 0) {
      this.screenFlash.duration -= dt;
      this.screenFlash.alpha *= 0.92;
    }
    // 屏幕滤镜衰减
    if (this.screenFilter.duration > 0) {
      this.screenFilter.duration -= dt;
      this.screenFilter.alpha = Math.max(0, this.screenFilter.alpha - dt * 1.5);
    }
  }

  // 添加粒子
  emit(x, y, count, options = {}) {
    const {
      color = '#ffffff',
      speed = 5,
      spread = Math.PI * 2,
      life = 0.5,
      size = 4,
      gravity = 0,
      angle = 0,
      type = 'circle'
    } = options;

    for (let i = 0; i < count; i++) {
      const a = angle + (Math.random() - 0.5) * spread;
      const s = speed * (0.5 + Math.random());
      this.particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: life * (0.5 + Math.random() * 0.5),
        maxLife: life,
        color,
        size: size * (0.5 + Math.random()),
        gravity,
        type
      });
    }
  }

  // 斩击特效
  slashEffect(x, y, direction, color = '#ffffff') {
    const count = 15;
    const angle = direction === 'right' ? 0 : Math.PI;
    this.emit(x, y, count, {
      color,
      speed: 8,
      spread: Math.PI * 0.6,
      life: 0.3,
      size: 3,
      angle,
      type: 'line'
    });
  }

  // 黑闪特效
  blackFlashEffect(x, y) {
    this.emit(x, y, 30, {
      color: '#ff0000',
      speed: 10,
      spread: Math.PI * 2,
      life: 0.4,
      size: 5,
      gravity: 0
    });
    this.emit(x, y, 20, {
      color: '#000000',
      speed: 6,
      spread: Math.PI * 2,
      life: 0.5,
      size: 6,
      gravity: 0
    });
    this.screenShake = { intensity: 8, duration: 0.3 };
    this.screenFlash = { color: '#ff0000', alpha: 0.3, duration: 0.2 };
  }

  // 技能命中特效
  hitEffect(x, y, color) {
    this.emit(x, y, 12, {
      color,
      speed: 6,
      spread: Math.PI * 2,
      life: 0.3,
      size: 4,
      gravity: 0
    });
  }

  // 领域展开特效
  domainEffect(type) {
    switch (type) {
      case 'redFlash':
        this.screenFlash = { color: '#ff0000', alpha: 0.5, duration: 0.5 };
        this.screenShake = { intensity: 12, duration: 0.6 };
        this.screenFilter = { type: 'redFlash', alpha: 0.6, duration: 1.0 };
        break;
      case 'darkDomain':
        this.screenFilter = { type: 'darkDomain', alpha: 0.7, duration: 1.5 };
        this.screenShake = { intensity: 6, duration: 0.4 };
        break;
      case 'purpleWave':
        this.screenFilter = { type: 'purpleWave', alpha: 0.6, duration: 1.2 };
        this.screenShake = { intensity: 8, duration: 0.5 };
        break;
      case 'purpleDomain':
        this.screenFilter = { type: 'purpleDomain', alpha: 0.8, duration: 2.0 };
        this.screenShake = { intensity: 15, duration: 0.8 };
        this.screenFlash = { color: '#6c5ce7', alpha: 0.4, duration: 0.6 };
        break;
      case 'infiniteVoid':
        this.screenFilter = { type: 'infiniteVoid', alpha: 1.0, duration: 12.0 };
        this.screenFlash = { color: '#ffffff', alpha: 0.8, duration: 1.0 };
        this.screenShake = { intensity: 12, duration: 0.8 };
        break;
      case 'barrierBurst':
        this.screenFilter = { type: 'barrierBurst', alpha: 0.7, duration: 1.0 };
        this.screenFlash = { color: '#00d4ff', alpha: 0.5, duration: 0.4 };
        this.screenShake = { intensity: 8, duration: 0.4 };
        break;
    }
  }

  // 无下限空间波纹
  spaceRipple(x, y, time) {
    const count = 3;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 40,
        y: y - 30 + (Math.random() - 0.5) * 30,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5 - 1,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1.0,
        color: '#00d4ff',
        size: 2 + Math.random() * 2,
        gravity: -0.5,
        type: 'spaceDistortion'
      });
    }
  }

  // 苍引力黑洞特效
  bluePullEffect(x, y) {
    this.emit(x, y, 25, {
      color: '#0984e3',
      speed: 4,
      spread: Math.PI * 2,
      life: 0.6,
      size: 5,
      gravity: -3
    });
    this.emit(x, y, 15, {
      color: '#ffffff',
      speed: 2,
      spread: Math.PI * 2,
      life: 0.4,
      size: 3,
      gravity: -2
    });
  }

  // 赫斥力爆炸特效
  redRepulsionEffect(x, y) {
    this.emit(x, y, 30, {
      color: '#e74c3c',
      speed: 9,
      spread: Math.PI * 2,
      life: 0.35,
      size: 5,
      gravity: 0
    });
    this.emit(x, y, 15, {
      color: '#ff6b35',
      speed: 6,
      spread: Math.PI * 1.5,
      life: 0.3,
      size: 4,
      gravity: 0
    });
    this.screenShake = { intensity: 6, duration: 0.25 };
  }

  // 茈紫色光束轨迹
  purpleBeamTrail(progress) {
    // 在屏幕中央生成光束两侧粒子
    const cx = 400; // 默认，实际由调用方提供
    const trailCount = 8;
    const time = Date.now() * 0.001;
    for (let i = 0; i < trailCount; i++) {
      this.particles.push({
        x: this._beamCx + (Math.random() - 0.5) * 30,
        y: 50 + Math.random() * 400,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 3,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 1.0,
        color: Math.random() < 0.5 ? '#6c5ce7' : '#a29bfe',
        size: 3 + Math.random() * 4,
        gravity: 0.5,
        type: 'beamSpray'
      });
    }
  }

  setBeamCenter(cx) {
    this._beamCx = cx;
  }

  // 屏障展开特效
  barrierExpandEffect(x, y) {
    this.emit(x, y - 30, 20, {
      color: '#00d4ff',
      speed: 5,
      spread: Math.PI * 2,
      life: 0.8,
      size: 4,
      gravity: -1
    });
    this.emit(x, y - 30, 10, {
      color: '#ffffff',
      speed: 3,
      spread: Math.PI * 2,
      life: 0.6,
      size: 3,
      gravity: -0.5
    });
  }

  // 复活冲击波特效
  reviveShockwave(x, y) {
    this.emit(x, y - 30, 40, {
      color: '#00d4ff',
      speed: 10,
      spread: Math.PI * 2,
      life: 0.7,
      size: 6,
      gravity: -2
    });
    this.emit(x, y - 30, 20, {
      color: '#ffffff',
      speed: 5,
      spread: Math.PI * 2,
      life: 0.5,
      size: 4,
      gravity: -1
    });
    this.screenFlash = { color: '#00d4ff', alpha: 0.6, duration: 0.5 };
    this.screenShake = { intensity: 10, duration: 0.5 };
  }

  // 茈前置特效：苍/赫双球凝聚粒子
  purplePreFusion(x, y, type) {
    if (type === 'blue') {
      this.emit(x, y, 8, {
        color: '#0984e3',
        speed: 2,
        spread: Math.PI * 2,
        life: 0.5,
        size: 3,
        gravity: -3
      });
      this.emit(x, y, 4, {
        color: '#ffffff',
        speed: 1,
        spread: Math.PI * 1.5,
        life: 0.3,
        size: 2,
        gravity: -2
      });
    } else {
      this.emit(x, y, 8, {
        color: '#e74c3c',
        speed: 3,
        spread: Math.PI * 2,
        life: 0.4,
        size: 3,
        gravity: -1
      });
      this.emit(x, y, 4, {
        color: '#ffaa00',
        speed: 2,
        spread: Math.PI * 1.5,
        life: 0.3,
        size: 2,
        gravity: -0.5
      });
    }
  }

  // 茈融合闪光
  purpleFusionFlash(x, y) {
    this.emit(x, y, 30, {
      color: '#ffffff',
      speed: 6,
      spread: Math.PI * 2,
      life: 0.4,
      size: 4,
      gravity: 0
    });
    this.emit(x, y, 20, {
      color: '#6c5ce7',
      speed: 4,
      spread: Math.PI * 2,
      life: 0.5,
      size: 5,
      gravity: 0
    });
    this.emit(x, y, 10, {
      color: '#0984e3',
      speed: 3,
      spread: Math.PI * 1.5,
      life: 0.35,
      size: 3,
      gravity: -1
    });
    this.emit(x, y, 10, {
      color: '#e74c3c',
      speed: 3,
      spread: Math.PI * 1.5,
      life: 0.35,
      size: 3,
      gravity: -1
    });
    this.screenFlash = { color: '#6c5ce7', alpha: 0.3, duration: 0.3 };
  }

  // 空间扭曲/褶皱粒子
  spaceDistortion(x, y, count) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 60,
        y: y + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 1,
        vy: (Math.random() - 0.5) * 1 - 0.5,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1.0,
        color: '#6c5ce7',
        size: 2 + Math.random() * 3,
        gravity: 0.3,
        type: 'spaceDistortion'
      });
    }
  }

  // 湮灭轨迹粒子（无碎屑，纯能量残留）
  annihilationTrail(x, y) {
    for (let i = 0; i < 4; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5 - 0.5,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7,
        color: Math.random() < 0.5 ? '#6c5ce7' : '#a29bfe',
        size: 1.5 + Math.random() * 2,
        gravity: 0.2,
        type: 'beamSpray'
      });
    }
  }

  // 苍螺旋碎片（尘埃/碎屑从周围被引力吸入，螺旋向心汇聚）
  blueSpiralDebris(x, y) {
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 20 + Math.random() * 35;
      this.particles.push({
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        vx: -Math.cos(angle) * 3,
        vy: -Math.sin(angle) * 3,
        life: 0.35 + Math.random() * 0.35,
        maxLife: 0.7,
        color: Math.random() < 0.5 ? '#9ec8f0' : '#5a9fd4',
        size: 1 + Math.random() * 2.5,
        gravity: -5,
        type: 'spiralDebris'
      });
    }
    // 微小尘埃（更轻，更快螺旋）
    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 10 + Math.random() * 15;
      this.particles.push({
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        vx: -Math.cos(angle) * 5,
        vy: -Math.sin(angle) * 5,
        life: 0.2 + Math.random() * 0.25,
        maxLife: 0.45,
        color: '#c8e0ff',
        size: 0.5 + Math.random() * 1.5,
        gravity: -6,
        type: 'spiralDebris'
      });
    }
  }

  // 苍气流内涌粒子（形成阶段的气流呼啸视觉）
  blueAirInflow(x, y) {
    for (let i = 0; i < 4; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * 50;
      this.particles.push({
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        vx: -Math.cos(angle) * 6,
        vy: -Math.sin(angle) * 6,
        life: 0.15 + Math.random() * 0.15,
        maxLife: 0.3,
        color: 'rgba(100, 180, 255, 0.6)',
        size: 0.8 + Math.random() * 1.2,
        gravity: -8,
        type: 'airInflow'
      });
    }
  }

  // 引力透镜闪光
  gravityLensFlash(x, y) {
    this.emit(x, y, 12, {
      color: '#0984e3',
      speed: 3,
      spread: Math.PI * 2,
      life: 0.35,
      size: 3,
      gravity: -1
    });
    this.emit(x, y, 6, {
      color: '#ffffff',
      speed: 1.5,
      spread: Math.PI * 2,
      life: 0.25,
      size: 2,
      gravity: -0.5
    });
  }

  // 引力坍缩（命中时物质向内收缩压碎，无向外飞溅）
  gravityCollapse(x, y) {
    // 主坍缩粒子：从外围高速向心汇聚
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 8 + Math.random() * 30;
      this.particles.push({
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        vx: -Math.cos(angle) * 6,
        vy: -Math.sin(angle) * 6,
        life: 0.2 + Math.random() * 0.25,
        maxLife: 0.45,
        color: '#0984e3',
        size: 1.5 + Math.random() * 2.5,
        gravity: -8,
        type: 'collapseDebris'
      });
    }
    // 中心压碎闪光（纯白，极小，快速消失）
    this.emit(x, y, 8, {
      color: '#ffffff',
      speed: 0.5,
      spread: Math.PI * 2,
      life: 0.12,
      size: 2,
      gravity: 0,
      type: 'circle'
    });
    // 暗蓝残余能量（球心坍缩后的余烬）
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5 - 1,
        life: 0.3 + Math.random() * 0.3,
        maxLife: 0.6,
        color: '#0a2a5e',
        size: 2 + Math.random() * 3,
        gravity: 0.5,
        type: 'circle'
      });
    }
  }

  // 苍命中坑洞效果（向内凹陷的挤压坑洞，无向外飞溅）
  blueCraterEffect(x, y) {
    // 坑壁纹理：向中心收拢的挤压状粒子
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 5 + Math.random() * 15;
      this.particles.push({
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        vx: -Math.cos(angle) * 2,
        vy: -Math.sin(angle) * 2,
        life: 0.25 + Math.random() * 0.25,
        maxLife: 0.5,
        color: '#2c3e50',
        size: 1.5 + Math.random() * 2,
        gravity: -3,
        type: 'craterDebris'
      });
    }
    // 坑洞边缘光滑光晕
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 10 + Math.random() * 10;
      this.particles.push({
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        vx: -Math.cos(angle) * 1,
        vy: -Math.sin(angle) * 1,
        life: 0.3 + Math.random() * 0.2,
        maxLife: 0.5,
        color: '#0984e3',
        size: 1 + Math.random() * 1.5,
        gravity: -2,
        type: 'craterDebris'
      });
    }
  }

  // 空间裂隙光纹（球体边缘溢出的淡蓝碎光）
  blueFissure(x, y, radius, angle) {
    this.particles.push({
      x: x + Math.cos(angle) * radius,
      y: y + Math.sin(angle) * radius,
      vx: Math.cos(angle) * 1.5,
      vy: Math.sin(angle) * 1.5,
      life: 0.15 + Math.random() * 0.15,
      maxLife: 0.3,
      color: '#5dade2',
      size: 0.5 + Math.random() * 1.5,
      gravity: 0,
      type: 'fissure'
    });
  }

  // ── 赫粒子特效 ──

  // 赫形成阶段：掌心光点外扩粒子
  redFormationParticles(x, y) {
    this.emit(x, y, 10, {
      color: '#ff4444',
      speed: 3,
      spread: Math.PI * 2,
      life: 0.35,
      size: 3,
      gravity: 0,
      type: 'circle'
    });
    this.emit(x, y, 6, {
      color: '#ffffff',
      speed: 2,
      spread: Math.PI * 2,
      life: 0.25,
      size: 2.5,
      gravity: 0,
      type: 'circle'
    });
    // 橘红色外扩粒子
    this.emit(x, y, 8, {
      color: '#ff6b35',
      speed: 5,
      spread: Math.PI * 2,
      life: 0.3,
      size: 2,
      gravity: 0,
      type: 'circle'
    });
  }

  // 赫斥力气浪涟漪（向外扩散的环形波纹）
  redRepulsionRipple(x, y) {
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 5 + Math.random() * 10;
      this.particles.push({
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        vx: Math.cos(angle) * 8,
        vy: Math.sin(angle) * 8,
        life: 0.2 + Math.random() * 0.2,
        maxLife: 0.4,
        color: Math.random() < 0.5 ? '#e74c3c' : '#ff6b35',
        size: 1 + Math.random() * 2,
        gravity: 0,
        type: 'redRipple'
      });
    }
  }

  // 赫热浪蒸腾畸变粒子（空间被斥力撑开的热浪扭曲）
  redHeatHaze(x, y) {
    for (let i = 0; i < 4; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 15 + Math.random() * 30;
      this.particles.push({
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        vx: Math.cos(angle) * 2,
        vy: Math.sin(angle) * 2 - 1,
        life: 0.3 + Math.random() * 0.3,
        maxLife: 0.6,
        color: 'rgba(255, 100, 50, 0.4)',
        size: 2 + Math.random() * 3,
        gravity: -0.5,
        type: 'heatHaze'
      });
    }
  }

  // 赫金色电芒（空气被电离迸发的金色电火花）
  redElectricSpark(x, y) {
    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 8 + Math.random() * 15;
      this.particles.push({
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        vx: Math.cos(angle) * 4,
        vy: Math.sin(angle) * 4,
        life: 0.08 + Math.random() * 0.12,
        maxLife: 0.2,
        color: Math.random() < 0.5 ? '#ffd700' : '#ffaa00',
        size: 0.5 + Math.random() * 1.5,
        gravity: 0,
        type: 'electricSpark'
      });
    }
  }

  // 赫向外爆炸（命中时放射状碎片飞溅，与苍向内坍缩相反）
  redOutwardExplosion(x, y) {
    // 主爆炸粒子：放射状高速向外飞散
    this.emit(x, y, 30, {
      color: '#e74c3c',
      speed: 10,
      spread: Math.PI * 2,
      life: 0.35,
      size: 4,
      gravity: 0,
      type: 'circle'
    });
    this.emit(x, y, 20, {
      color: '#ff6b35',
      speed: 7,
      spread: Math.PI * 2,
      life: 0.3,
      size: 3.5,
      gravity: 0,
      type: 'circle'
    });
    // 白色核心闪光
    this.emit(x, y, 12, {
      color: '#ffffff',
      speed: 4,
      spread: Math.PI * 2,
      life: 0.2,
      size: 3,
      gravity: 0,
      type: 'circle'
    });
    // 金色电芒伴随
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      this.particles.push({
        x: x + Math.cos(angle) * 5,
        y: y + Math.sin(angle) * 5,
        vx: Math.cos(angle) * 6,
        vy: Math.sin(angle) * 6,
        life: 0.1 + Math.random() * 0.15,
        maxLife: 0.25,
        color: '#ffd700',
        size: 0.5 + Math.random() * 1,
        gravity: 0,
        type: 'electricSpark'
      });
    }
  }

  // 赫放射状裂纹坑洞（中心平整、边缘放射状碎裂，与苍边缘光滑内凹相反）
  redRadialCrater(x, y) {
    // 放射状裂纹（沿冲击方向向外延伸）
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const dist = 5 + Math.random() * 20;
      this.particles.push({
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        vx: Math.cos(angle) * 5,
        vy: Math.sin(angle) * 5,
        life: 0.25 + Math.random() * 0.25,
        maxLife: 0.5,
        color: Math.random() < 0.5 ? '#c0392b' : '#a93226',
        size: 1.5 + Math.random() * 2.5,
        gravity: 0.5,
        type: 'radialCrack'
      });
    }
    // 边缘碎屑（向外飞溅）
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      this.particles.push({
        x: x + Math.cos(angle) * 8,
        y: y + Math.sin(angle) * 8,
        vx: Math.cos(angle) * 7,
        vy: Math.sin(angle) * 7 - 2,
        life: 0.3 + Math.random() * 0.3,
        maxLife: 0.6,
        color: '#7f8c8d',
        size: 1 + Math.random() * 2,
        gravity: 1,
        type: 'radialCrack'
      });
    }
  }

  // 闪避残影
  dodgeEffect(x, y, color) {
    this.emit(x, y, 8, {
      color,
      speed: 3,
      spread: Math.PI * 2,
      life: 0.4,
      size: 3,
      gravity: -1,
      type: 'shadow'
    });
  }

  // 绘制所有粒子
  draw(ctx, cameraOffset = { x: 0, y: 0 }) {
    // 屏幕滤镜
    if (this.screenFilter.type && this.screenFilter.alpha > 0.01) {
      const alpha = this.screenFilter.alpha;
      const cx = ctx.canvas.width / 2;
      const cy = ctx.canvas.height / 2;
      ctx.save();
      switch (this.screenFilter.type) {
        case 'redFlash':
          ctx.fillStyle = `rgba(255, 0, 0, ${alpha * 0.3})`;
          ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
          break;
        case 'darkDomain':
          ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.5})`;
          ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
          const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 400);
          gradient.addColorStop(0, `rgba(30, 30, 60, ${alpha})`);
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
          break;
        case 'purpleWave':
          ctx.fillStyle = `rgba(108, 92, 231, ${alpha * 0.3})`;
          ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
          break;
        case 'purpleDomain':
          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 500);
          g.addColorStop(0, `rgba(108, 92, 231, ${alpha})`);
          g.addColorStop(0.5, `rgba(162, 155, 254, ${alpha * 0.5})`);
          g.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
          break;
        case 'infiniteVoid':
          // 纯白虚空基底
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.85})`;
          ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
          // 几何破碎线条
          ctx.strokeStyle = `rgba(0, 0, 0, ${alpha * 0.15})`;
          ctx.lineWidth = 1;
          const time = Date.now() * 0.001;
          for (let i = 0; i < 12; i++) {
            const lx = (Math.sin(time * 1.3 + i * 0.8) * 0.5 + 0.5) * ctx.canvas.width;
            const ly = (Math.cos(time * 0.9 + i * 1.1) * 0.5 + 0.5) * ctx.canvas.height;
            ctx.beginPath();
            ctx.moveTo(lx, ly);
            ctx.lineTo(lx + Math.cos(time + i) * 80, ly + Math.sin(time + i) * 80);
            ctx.stroke();
          }
          // 日文信息流漂浮
          ctx.fillStyle = `rgba(60, 60, 80, ${alpha * 0.2})`;
          ctx.font = '10px monospace';
          const infoChars = ['術式', '情報', '無限', '虚式', '領域', '展開', '無量', '空処', '蒼', '赫', '茈', '黒閃'];
          for (let i = 0; i < infoChars.length; i++) {
            const ix = (Math.sin(time * 0.7 + i * 1.5) * 0.5 + 0.5) * ctx.canvas.width;
            const iy = (Math.cos(time * 0.6 + i * 1.3) * 0.5 + 0.5) * ctx.canvas.height;
            ctx.fillText(infoChars[i], ix, iy);
          }
          // 四边白色数据流边框
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
          ctx.lineWidth = 3;
          ctx.strokeRect(15, 15, ctx.canvas.width - 30, ctx.canvas.height - 30);
          ctx.strokeStyle = `rgba(200, 220, 255, ${alpha * 0.3})`;
          ctx.lineWidth = 1;
          ctx.strokeRect(25, 25, ctx.canvas.width - 50, ctx.canvas.height - 50);
          break;
        case 'barrierBurst':
          const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 500);
          bg.addColorStop(0, `rgba(0, 212, 255, ${alpha * 0.4})`);
          bg.addColorStop(0.6, `rgba(0, 180, 255, ${alpha * 0.15})`);
          bg.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
          break;
      }
      ctx.restore();
    }

    // 屏幕闪光
    if (this.screenFlash.alpha > 0.01) {
      ctx.save();
      ctx.globalAlpha = this.screenFlash.alpha;
      ctx.fillStyle = this.screenFlash.color;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.restore();
    }

    // 绘制粒子
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      const px = p.x + cameraOffset.x;
      const py = p.y + cameraOffset.y;

      ctx.save();
      ctx.globalAlpha = alpha;

      if (p.type === 'circle') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(px, py, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
        // 光晕
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha * 0.3;
        ctx.beginPath();
        ctx.arc(px, py, p.size * alpha * 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'line') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size * alpha;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px - p.vx * 2, py - p.vy * 2);
        ctx.stroke();
      } else if (p.type === 'shadow') {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha * 0.5;
        ctx.beginPath();
        ctx.arc(px, py, p.size * alpha * 1.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'spaceDistortion') {
        // 空间扭曲波纹
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = alpha * 0.6;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, py, p.size * alpha * 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha * 0.2;
        ctx.beginPath();
        ctx.arc(px, py, p.size * alpha * 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'beamSpray') {
        // 光束飞溅粒子
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha * 0.8;
        ctx.beginPath();
        ctx.arc(px, py, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = alpha * 0.3;
        ctx.beginPath();
        ctx.arc(px, py, p.size * alpha * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'spiralDebris') {
        // 螺旋碎片粒子
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha * 0.7;
        ctx.beginPath();
        ctx.arc(px, py, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'collapseDebris') {
        // 坍缩碎片粒子（向内收缩）
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha * 0.8;
        ctx.beginPath();
        ctx.arc(px, py, p.size * alpha * 0.7, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'airInflow') {
        // 气流内涌粒子（细长拖尾线）
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = alpha * 0.5;
        ctx.lineWidth = p.size * alpha * 0.8;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px - p.vx * 1.5, py - p.vy * 1.5);
        ctx.stroke();
      } else if (p.type === 'craterDebris') {
        // 坑洞粒子（向心收拢）
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha * 0.6;
        ctx.beginPath();
        ctx.arc(px, py, p.size * alpha * 0.6, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'fissure') {
        // 空间裂隙光纹（细碎淡蓝短线）
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = alpha * 0.7;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + p.vx * 2, py + p.vy * 2);
        ctx.stroke();
      } else if (p.type === 'redRipple') {
        // 赫斥力涟漪（向外扩散的环形波纹）
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = alpha * 0.5;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, py, p.size * alpha * 2, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === 'heatHaze') {
        // 赫热浪蒸腾畸变（模糊扭曲光斑）
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha * 0.35;
        ctx.beginPath();
        ctx.arc(px, py, p.size * alpha * 1.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'electricSpark') {
        // 金色电芒（细小闪电状短线）
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = alpha * 0.9;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + p.vx * 1.5, py + p.vy * 1.5);
        ctx.lineTo(px + p.vx * 1.5 + (Math.random() - 0.5) * 3, py + p.vy * 1.5 + (Math.random() - 0.5) * 3);
        ctx.stroke();
      } else if (p.type === 'radialCrack') {
        // 赫放射状裂纹/碎屑
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha * 0.7;
        ctx.beginPath();
        ctx.arc(px, py, p.size * alpha * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // 获取屏幕震动偏移
  getShakeOffset() {
    if (this.screenShake.duration > 0) {
      const i = this.screenShake.intensity;
      return {
        x: (Math.random() - 0.5) * i * 2,
        y: (Math.random() - 0.5) * i * 2
      };
    }
    return { x: 0, y: 0 };
  }
}