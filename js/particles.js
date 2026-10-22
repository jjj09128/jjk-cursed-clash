// 粒子特效系统
class ParticleSystem {
  constructor() {
    this.particles = [];
    this.screenShake = { intensity: 0, duration: 0 };
    this.screenFlash = { color: null, alpha: 0, duration: 0 };
    this.screenFilter = { type: null, alpha: 0, duration: 0 };
    // 画质档位：low / medium / high
    this.quality = 'medium';
    // 活跃粒子始终位于数组前部，draw/update 只遍历活跃区
    this.activeCount = 0;
    // 震动偏移对象复用
    this._cachedShakeOffset = { x: 0, y: 0 };
  }

  // 按画质返回粒子池上限
  _getMaxParticles() {
    switch (this.quality) {
      case 'low': return 600;
      case 'high': return 2500;
      default: return 1500;
    }
  }

  // 从对象池获取或创建粒子（活跃粒子维持在前部）
  _acquireParticle(data) {
    const max = this._getMaxParticles();
    if (this.activeCount < this.particles.length) {
      // 复用尾部非活跃槽位
      this.particles[this.activeCount] = { ...data, active: true };
      this.activeCount++;
      return;
    }
    if (this.particles.length >= max) {
      return; // 达到上限，丢弃新粒子
    }
    this.particles.push({ ...data, active: true });
    this.activeCount++;
  }

  // 压缩对象池：当非活跃区过大时清理尾部
  _compactPool() {
    const max = this._getMaxParticles();
    const inactive = this.particles.length - this.activeCount;
    if (inactive > max * 0.3) {
      this.particles.length = this.activeCount;
    }
  }

  // 设置画质档位
  setQuality(level) {
    if (['low', 'medium', 'high'].includes(level)) {
      this.quality = level;
    }
  }

  // 清场：清除所有粒子、震屏、闪光等画面特效
  clearEffects() {
    this.activeCount = 0;
    this.screenShake = { intensity: 0, duration: 0 };
    this.screenFlash = { color: null, alpha: 0, duration: 0 };
    this.screenFilter = { type: null, alpha: 0, duration: 0 };
  }

  // 根据画质返回粒子数量倍率
  getParticleMultiplier() {
    switch (this.quality) {
      case 'low': return 0.4;
      case 'high': return 1.25;
      default: return 1.0;
    }
  }

  // 根据画质筛选是否执行某类特效
  allowEffect(type) {
    switch (this.quality) {
      case 'low':
        return ['essential', 'damageNumber', 'skillText'].includes(type);
      case 'medium':
        return !['ambient', 'heavy'].includes(type);
      case 'high':
        return true;
      default:
        return true;
    }
  }

  // 应用画质倍率到 emit 数量
  scaleCount(count) {
    return Math.max(1, Math.round(count * this.getParticleMultiplier()));
  }

  update() {
    const dt = 1 / 60;
    // 更新粒子（仅遍历活跃区；死亡时与尾部交换，维持活跃区在前）
    for (let i = 0; i < this.activeCount; i++) {
      const p = this.particles[i];
      // 延迟未结束的粒子（如空间褶皱环）保持等待，不更新位置/生命
      if (p.delay && p.delay > 0) {
        p.delay -= dt;
      } else {
        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;
        p.vy += p.gravity * dt * 60;
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
          // swap-to-end：与活跃区最后一个交换
          this.activeCount--;
          if (i !== this.activeCount) {
            this.particles[i] = this.particles[this.activeCount];
            this.particles[this.activeCount] = p;
            i--; // 重新处理交换过来的粒子
          }
        }
      }
    }
    // 压缩对象池，防止数组无限增长
    this._compactPool();
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
      type = 'circle',
      quality = null  // 'essential' | 'normal' | 'heavy' | 'ambient'
    } = options;

    // 低画质下跳过非必要粒子
    if (quality && !this.allowEffect(quality)) return;

    const finalCount = this.scaleCount(count);

    for (let i = 0; i < finalCount; i++) {
      const a = angle + (Math.random() - 0.5) * spread;
      const s = speed * (0.5 + Math.random());
      this._acquireParticle({
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

  // 黑闪特效：黑红色闪电从命中点炸裂迸射
  blackFlashEffect(x, y) {
    // 1. 黑红色闪电主干（从中心向四面八方炸开）
    const boltCount = 16;
    for (let i = 0; i < boltCount; i++) {
      const angle = (i / boltCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
      const len = 50 + Math.random() * 60;
      this._acquireParticle({
        x, y,
        vx: 0, vy: 0,
        life: 0.16 + Math.random() * 0.06,
        maxLife: 0.22,
        color: '#000000',
        size: 3 + Math.random() * 2.5,
        gravity: 0,
        type: 'blackRedBolt',
        angle,
        length: len,
        seed: Math.random() * 100,
        branches: Math.floor(2 + Math.random() * 3)
      });
    }
    // 2. 短促二次闪电（延迟闪现，模拟余电放电）
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const len = 30 + Math.random() * 35;
      this._acquireParticle({
        x, y,
        vx: 0, vy: 0,
        life: 0.12,
        maxLife: 0.12,
        color: '#000000',
        size: 2 + Math.random() * 1.5,
        gravity: 0,
        type: 'blackRedBolt',
        angle,
        length: len,
        seed: Math.random() * 100,
        branches: 1 + Math.floor(Math.random() * 2),
        delay: 0.04
      });
    }
    // 3. 中心黑红色爆发核心
    this._acquireParticle({
      x, y,
      vx: 0, vy: 0,
      life: 0.14,
      maxLife: 0.14,
      color: '#000000',
      size: 38,
      gravity: 0,
      type: 'blackRedCore'
    });
    // 4. 红色火花飞溅
    this.emit(x, y, 20, {
      color: '#ff1a1a', speed: 8, spread: Math.PI * 2, life: 0.3, size: 2.5, gravity: 0.1, quality: 'normal'
    });
    this.emit(x, y, 10, {
      color: '#ff6600', speed: 5, spread: Math.PI * 2, life: 0.22, size: 1.8, gravity: 0.15, quality: 'normal'
    });
    // 5. 暗红色烟雾扩散
    this.emit(x, y, 8, {
      color: '#4a0008', speed: 3, spread: Math.PI * 2, life: 0.45, size: 6, gravity: -0.1, type: 'fireSmoke', quality: 'ambient'
    });
    // 6. 黑红色冲击波环
    this._acquireParticle({
      x, y,
      vx: 0, vy: 0,
      life: 0.32,
      maxLife: 0.32,
      color: '#000000',
      size: 22,
      gravity: 0,
      type: 'blackRedShockwave'
    });
    // 7. 屏幕震动 + 黑红一闪
    this.screenShake = { intensity: 16, duration: 0.3 };
    this.screenFlash = { color: '#1a0008', alpha: 0.6, duration: 0.1 };
  }

  // 技能命中特效
  hitEffect(x, y, color) {
    this.emit(x, y, 12, {
      color,
      speed: 6,
      spread: Math.PI * 2,
      life: 0.3,
      size: 4,
      gravity: 0,
      quality: 'essential'
    });
  }

  // ===== 虎杖「迳庭拳」三段视觉特效 =====

  // 第一段：肉体直击冲击 —— 灰白气浪波纹 + 尘土碎石飞溅 + 轻震屏
  divergentFistImpact(x, y, dir) {
    // 1. 浅白色环形气浪波纹（从受击点向外扩散）
    this._acquireParticle({
      x, y,
      vx: 0, vy: 0,
      life: 0.3,
      maxLife: 0.3,
      color: '#e8e8e8',
      size: 12,
      gravity: 0,
      type: 'airRing',
      maxRadius: 55,
      lineWidth: 3
    });
    // 2. 尘土飞溅（棕色小颗粒，向外四散+重力下落）
    this.emit(x, y + 5, 16, {
      color: '#a09080', speed: 6, spread: Math.PI * 1.4, life: 0.45, size: 2.5, gravity: 0.35,
      angle: dir > 0 ? -Math.PI * 0.1 : Math.PI + Math.PI * 0.1, quality: 'normal'
    });
    // 3. 碎石碎片（较大深色块，模拟混凝土碎块飞溅）
    this.emit(x, y + 3, 8, {
      color: '#6b6b6b', speed: 5, spread: Math.PI, life: 0.5, size: 3.5, gravity: 0.4,
      angle: dir > 0 ? 0 : Math.PI, type: 'line', quality: 'normal'
    });
    // 4. 受击点白色撞击闪光（短暂）
    this._acquireParticle({
      x, y,
      vx: 0, vy: 0,
      life: 0.08,
      maxLife: 0.08,
      color: '#ffffff',
      size: 28,
      gravity: 0,
      type: 'flash'
    });
    // 5. 轻震屏（一轻）
    this.screenShake = { intensity: 6, duration: 0.15 };
  }

  // 滞留期间：淡蓝咒力在创口表层脉动（迟迟不迸发）
  divergentFistLinger(x, y) {
    this._acquireParticle({
      x: x + (Math.random() - 0.5) * 8,
      y: y + (Math.random() - 0.5) * 12,
      vx: 0, vy: 0,
      life: 0.35,
      maxLife: 0.35,
      color: '#5b8def',
      size: 10 + Math.random() * 4,
      gravity: 0,
      type: 'cursedLinger',
      pulse: Math.random() * Math.PI * 2
    });
    // 少量蓝色咒力微光散逸
    this.emit(x, y, 3, {
      color: '#7aa8ff', speed: 1.2, spread: Math.PI * 2, life: 0.25, size: 1.5, gravity: -0.05, quality: 'essential'
    });
  }

  // 第二段：滞后咒力爆破 —— 靛蓝大范围冲击波 + 蓝色残影 + 重震屏
  divergentFistBurst(x, y, dir) {
    // 1. 大范围靛蓝色咒力冲击波环（快速向外扩张）
    this._acquireParticle({
      x, y,
      vx: 0, vy: 0,
      life: 0.4,
      maxLife: 0.4,
      color: '#3d5fdb',
      size: 16,
      gravity: 0,
      type: 'cursedShockwave',
      maxRadius: 90,
      lineWidth: 5
    });
    // 2. 二次内层冲击波（稍小、更亮）
    this._acquireParticle({
      x, y,
      vx: 0, vy: 0,
      life: 0.28,
      maxLife: 0.28,
      color: '#5b8def',
      size: 10,
      gravity: 0,
      type: 'cursedShockwave',
      maxRadius: 55,
      lineWidth: 3
    });
    // 3. 蓝色咒力爆发粒子（向外炸裂飞溅）
    this.emit(x, y, 24, {
      color: '#4a7eff', speed: 10, spread: Math.PI * 2, life: 0.4, size: 3, gravity: 0.05, quality: 'normal'
    });
    this.emit(x, y, 12, {
      color: '#7aa8ff', speed: 7, spread: Math.PI * 2, life: 0.3, size: 2, gravity: 0.08, quality: 'normal'
    });
    // 4. 蓝色残影轨迹（沿击退方向拖尾）
    for (let i = 0; i < 5; i++) {
      const offset = (i + 1) * 12;
      this._acquireParticle({
        x: x + dir * offset,
        y: y + (Math.random() - 0.5) * 10,
        vx: dir * 1.5,
        vy: 0,
        life: 0.2 + i * 0.03,
        maxLife: 0.3,
        color: '#5b8def',
        size: 6 - i * 0.5,
        gravity: 0,
        type: 'cursedTrail'
      });
    }
    // 5. 中心靛蓝爆发核心闪光
    this._acquireParticle({
      x, y,
      vx: 0, vy: 0,
      life: 0.12,
      maxLife: 0.12,
      color: '#3d5fdb',
      size: 40,
      gravity: 0,
      type: 'flash'
    });
    // 6. 碎屑被二次风压裹挟四散
    this.emit(x, y + 5, 10, {
      color: '#8a8a8a', speed: 8, spread: Math.PI * 2, life: 0.35, size: 2, gravity: 0.3, quality: 'normal'
    });
    // 7. 重震屏（一重）+ 蓝色屏幕闪光
    this.screenShake = { intensity: 13, duration: 0.35 };
    this.screenFlash = { color: '#3d5fdb', alpha: 0.35, duration: 0.12 };
  }

  // 赤磷悦动联动：拳锋血雾 + 血气灌入创口
  bloodFistClash(x, y, dir) {
    // 浓稠血雾缠绕拳面
    this.emit(x, y, 14, {
      color: '#cc1818', speed: 5, spread: Math.PI * 0.8, life: 0.35, size: 4, gravity: 0.05,
      angle: dir > 0 ? 0 : Math.PI, quality: 'normal'
    });
    // 血气灌入创口（向内汇聚）
    this._acquireParticle({
      x, y,
      vx: 0, vy: 0,
      life: 0.25,
      maxLife: 0.25,
      color: '#ff2020',
      size: 22,
      gravity: 0,
      type: 'bloodImpale'
    });
    // 细碎血屑火花
    this.emit(x, y, 8, {
      color: '#ff5050', speed: 6, spread: Math.PI * 1.2, life: 0.25, size: 1.5, gravity: 0.2, quality: 'normal'
    });
  }

  // 赤磷悦动联动：双重色泽爆破 —— 外圈赤红 + 内里青蓝
  bloodCursedBurst(x, y, dir) {
    // 外圈赤红色冲击波
    this._acquireParticle({
      x, y,
      vx: 0, vy: 0,
      life: 0.35,
      maxLife: 0.35,
      color: '#dc1818',
      size: 14,
      gravity: 0,
      type: 'cursedShockwave',
      maxRadius: 100,
      lineWidth: 4
    });
    // 赤红血雾爆发
    this.emit(x, y, 18, {
      color: '#ff2020', speed: 9, spread: Math.PI * 2, life: 0.38, size: 3, gravity: 0.05, quality: 'normal'
    });
    // 赤红残影拖尾
    for (let i = 0; i < 4; i++) {
      const offset = (i + 1) * 14;
      this._acquireParticle({
        x: x + dir * offset,
        y: y + (Math.random() - 0.5) * 10,
        vx: dir * 1.2,
        vy: 0,
        life: 0.18 + i * 0.03,
        maxLife: 0.28,
        color: '#ff3030',
        size: 5 - i * 0.4,
        gravity: 0,
        type: 'cursedTrail'
      });
    }
    // 暗红屏幕闪光叠加
    this.screenFlash = { color: '#8b0000', alpha: 0.3, duration: 0.1 };
  }

  // ===== 虎杖「穿血」完整视觉特效 =====

  // 起手蓄力：指尖血液聚拢涌动 + 血色涡流 + 血沫翻涌 + 空气扭曲
  piercingBloodCharge(x, y, dir, bloodActive) {
    const color = bloodActive ? '#ff2020' : '#c0392b';

    // 1. 指尖血色涡流（旋转汇聚）
    for (let i = 0; i < 3; i++) {
      const angle = Date.now() * 0.015 + i * (Math.PI * 2 / 3);
      const r = 6 + Math.sin(Date.now() * 0.01 + i) * 2;
      this._acquireParticle({
        x: x + Math.cos(angle) * r,
        y: y + Math.sin(angle) * r,
        vx: -Math.cos(angle) * 1.5,
        vy: -Math.sin(angle) * 1.5,
        life: 0.2,
        maxLife: 0.2,
        color,
        size: 2.5,
        gravity: 0,
        type: 'circle'
      });
    }

    // 2. 细碎血沫翻涌（向外微溅后回落）
    this.emit(x, y, 4, {
      color: bloodActive ? '#ff4040' : '#a02828', speed: 1.5, spread: Math.PI * 2, life: 0.15, size: 1.5, gravity: 0.3, quality: 'essential'
    });

    // 3. 指尖饱满血囊核心（脉动膨胀）
    this._acquireParticle({
      x, y,
      vx: 0, vy: 0,
      life: 0.15,
      maxLife: 0.15,
      color,
      size: 8 + Math.sin(Date.now() * 0.02) * 2,
      gravity: 0,
      type: 'bloodChargeCore'
    });

    // 4. 空气被血液温度烘得微微扭曲（淡红热浪线）
    if (Math.random() < 0.5) {
      this.emit(x, y, 2, {
        color: bloodActive ? '#ff8080' : '#cc6060', speed: 0.8, spread: Math.PI * 0.5, life: 0.2, size: 1, gravity: -0.15, type: 'line', quality: 'essential'
      });
    }
  }

  // 飞行途中：殷红血气尾迹 + 飞溅血滴残影
  piercingBloodTrail(x, y, dir, bloodActive) {
    const color = bloodActive ? '#ff2020' : '#c0392b';

    // 1. 狭长血气尾迹粒子（沿飞行反方向拖拽）
    this.emit(x - dir * 8, y, 3, {
      color, speed: 1, spread: Math.PI * 0.3, life: 0.25, size: 3, gravity: 0,
      angle: dir > 0 ? Math.PI : 0, quality: 'essential'
    });

    // 2. 飞溅血滴残影（细碎小点散落）
    this.emit(x - dir * 5, y, 2, {
      color: bloodActive ? '#ff4040' : '#a02828', speed: 2, spread: Math.PI * 0.8, life: 0.2, size: 1.5, gravity: 0.1, quality: 'essential'
    });

    // 3. 淡红色光轨残影（极淡的线条）
    this._acquireParticle({
      x: x - dir * 10, y,
      vx: -dir * 0.5, vy: 0,
      life: 0.15,
      maxLife: 0.15,
      color: bloodActive ? 'rgba(255,60,60,0.3)' : 'rgba(192,57,43,0.25)',
      size: 2,
      gravity: 0,
      type: 'line'
    });
  }

  // 命中打击：贯穿孔洞 + 体内血能迸发 + 灼烧血色光晕
  piercingBloodHit(x, y, dir, bloodActive) {
    const color = bloodActive ? '#ff2020' : '#c0392b';

    // 1. 贯穿孔洞特效（圆滑贯穿孔 + 向外撕裂扩张）
    this._acquireParticle({
      x, y,
      vx: 0, vy: 0,
      life: 0.3,
      maxLife: 0.3,
      color,
      size: 20,
      gravity: 0,
      type: 'piercingHole',
      maxRadius: 30
    });

    // 2. 体内血能迸发（从贯穿孔向外四散流窜）
    this.emit(x, y, 20, {
      color: bloodActive ? '#ff3030' : '#c0392b', speed: 8, spread: Math.PI * 2, life: 0.4, size: 3, gravity: 0.05, quality: 'normal'
    });
    this.emit(x, y, 12, {
      color: '#ff6060', speed: 5, spread: Math.PI * 2, life: 0.3, size: 2, gravity: 0.08, quality: 'normal'
    });

    // 3. 患处红肿灼烧血色光晕（持续残留）
    this._acquireParticle({
      x, y,
      vx: 0, vy: 0,
      life: 0.6,
      maxLife: 0.6,
      color: '#cc1818',
      size: 25,
      gravity: 0,
      type: 'burnGlow'
    });

    // 4. 贯穿方向血液飞溅（从背后穿出）
    this.emit(x + dir * 15, y, 10, {
      color: '#8b0000', speed: 6, spread: Math.PI * 0.6, life: 0.35, size: 2.5, gravity: 0.3,
      angle: dir > 0 ? 0 : Math.PI, quality: 'normal'
    });

    // 5. 干涸血渍碎片（附着残渣飞溅）
    this.emit(x, y, 6, {
      color: '#5a0000', speed: 3, spread: Math.PI * 2, life: 0.5, size: 2, gravity: 0.4, quality: 'normal'
    });

    // 6. 屏幕震动 + 血色闪屏
    this.screenShake = { intensity: 7, duration: 0.25 };
    this.screenFlash = { color: bloodActive ? '#ff2020' : '#c0392b', alpha: 0.2, duration: 0.1 };
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
      case 'sukunaDomain':
        this.screenFilter = { type: 'sukunaDomain', alpha: 0.8, duration: 2.0 };
        this.screenFlash = { color: '#b40000', alpha: 0.6, duration: 0.8 };
        this.screenShake = { intensity: 15, duration: 1.0 };
        break;
    }
  }

  // 无下限空间波纹
  spaceRipple(x, y, time) {
    const count = 3;
    for (let i = 0; i < count; i++) {
      this._acquireParticle({
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
      gravity: -3,
      quality: 'normal'
    });
    this.emit(x, y, 15, {
      color: '#ffffff',
      speed: 2,
      spread: Math.PI * 2,
      life: 0.4,
      size: 3,
      gravity: -2,
      quality: 'normal'
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
      gravity: 0,
      quality: 'normal'
    });
    this.emit(x, y, 15, {
      color: '#ff6b35',
      speed: 6,
      spread: Math.PI * 1.5,
      life: 0.3,
      size: 4,
      gravity: 0,
      quality: 'ambient'
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
      this._acquireParticle({
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
      gravity: -1,
      quality: 'normal'
    });
    this.emit(x, y - 30, 10, {
      color: '#ffffff',
      speed: 3,
      spread: Math.PI * 2,
      life: 0.6,
      size: 3,
      gravity: -0.5,
      quality: 'normal'
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
      gravity: -2,
      quality: 'heavy'
    });
    this.emit(x, y - 30, 20, {
      color: '#ffffff',
      speed: 5,
      spread: Math.PI * 2,
      life: 0.5,
      size: 4,
      gravity: -1,
      quality: 'normal'
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
        gravity: -3,
        quality: 'normal'
      });
      this.emit(x, y, 4, {
        color: '#ffffff',
        speed: 1,
        spread: Math.PI * 1.5,
        life: 0.3,
        size: 2,
        gravity: -2,
        quality: 'normal'
      });
    } else {
      this.emit(x, y, 8, {
        color: '#e74c3c',
        speed: 3,
        spread: Math.PI * 2,
        life: 0.4,
        size: 3,
        gravity: -1,
        quality: 'normal'
      });
      this.emit(x, y, 4, {
        color: '#ffaa00',
        speed: 2,
        spread: Math.PI * 1.5,
        life: 0.3,
        size: 2,
        gravity: -0.5,
        quality: 'normal'
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
      gravity: 0,
      quality: 'normal'
    });
    this.emit(x, y, 20, {
      color: '#6c5ce7',
      speed: 4,
      spread: Math.PI * 2,
      life: 0.5,
      size: 5,
      gravity: 0,
      quality: 'heavy'
    });
    this.emit(x, y, 10, {
      color: '#0984e3',
      speed: 3,
      spread: Math.PI * 1.5,
      life: 0.35,
      size: 3,
      gravity: -1,
      quality: 'normal'
    });
    this.emit(x, y, 10, {
      color: '#e74c3c',
      speed: 3,
      spread: Math.PI * 1.5,
      life: 0.35,
      size: 3,
      gravity: -1,
      quality: 'normal'
    });
    this.screenFlash = { color: '#6c5ce7', alpha: 0.3, duration: 0.3 };
  }

  // 空间扭曲/褶皱粒子
  spaceDistortion(x, y, count) {
    if (this.quality === 'low') return;
    const finalCount = this.quality === 'medium' ? Math.ceil(count * 0.5) : count;
    for (let i = 0; i < finalCount; i++) {
      this._acquireParticle({
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
    if (this.quality === 'low') return;
    for (let i = 0; i < 4; i++) {
      this._acquireParticle({
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
      this._acquireParticle({
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
      this._acquireParticle({
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
      this._acquireParticle({
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
      gravity: -1,
      quality: 'normal'
    });
    this.emit(x, y, 6, {
      color: '#ffffff',
      speed: 1.5,
      spread: Math.PI * 2,
      life: 0.25,
      size: 2,
      gravity: -0.5,
      quality: 'normal'
    });
  }

  // 引力坍缩（命中时物质向内收缩压碎，无向外飞溅）
  gravityCollapse(x, y) {
    // 主坍缩粒子：从外围高速向心汇聚
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 8 + Math.random() * 30;
      this._acquireParticle({
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
      this._acquireParticle({
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
      this._acquireParticle({
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
      this._acquireParticle({
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
    this._acquireParticle({
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
      type: 'circle',
      quality: 'normal'
    });
    this.emit(x, y, 6, {
      color: '#ffffff',
      speed: 2,
      spread: Math.PI * 2,
      life: 0.25,
      size: 2.5,
      gravity: 0,
      type: 'circle',
      quality: 'normal'
    });
    // 橘红色外扩粒子
    this.emit(x, y, 8, {
      color: '#ff6b35',
      speed: 5,
      spread: Math.PI * 2,
      life: 0.3,
      size: 2,
      gravity: 0,
      type: 'circle',
      quality: 'ambient'
    });
  }

  // 赫斥力气浪涟漪（向外扩散的环形波纹）
  redRepulsionRipple(x, y) {
    if (this.quality === 'low') return;
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 5 + Math.random() * 10;
      this._acquireParticle({
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
    if (this.quality === 'low') return;
    for (let i = 0; i < 4; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 15 + Math.random() * 30;
      this._acquireParticle({
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
    if (this.quality === 'low') return;
    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 8 + Math.random() * 15;
      this._acquireParticle({
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
      type: 'circle',
      quality: 'normal'
    });
    this.emit(x, y, 20, {
      color: '#ff6b35',
      speed: 7,
      spread: Math.PI * 2,
      life: 0.3,
      size: 3.5,
      gravity: 0,
      type: 'circle',
      quality: 'ambient'
    });
    // 白色核心闪光
    this.emit(x, y, 12, {
      color: '#ffffff',
      speed: 4,
      spread: Math.PI * 2,
      life: 0.2,
      size: 3,
      gravity: 0,
      type: 'circle',
      quality: 'normal'
    });
    // 金色电芒伴随
    if (this.quality !== 'low') for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      this._acquireParticle({
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
      this._acquireParticle({
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
      this._acquireParticle({
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
      type: 'shadow',
      quality: 'normal'
    });
  }

  // 宿傩「解」连射型命中：极细暗色斩痕 + 暗红咒力余波
  sukunaSlashCut(x, y, dir) {
    const baseAngle = dir > 0 ? -Math.PI / 4 : Math.PI + Math.PI / 4;
    const cutCount = this.quality === 'low' ? 2 : 3;
    for (let i = 0; i < cutCount; i++) {
      this._acquireParticle({
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 20,
        vx: 0, vy: 0,
        life: 0.10 + i * 0.04,
        maxLife: 0.16,
        color: '#1a0008',
        size: 22 + Math.random() * 14,
        gravity: 0,
        type: 'sukunaCut',
        angle: baseAngle + (Math.random() - 0.5) * 0.3,
        seed: Math.random() * 100
      });
    }
    // 暗红色咒力火花飞溅
    this.emit(x, y, 5, {
      color: '#8b0000', speed: 3, spread: Math.PI * 2, life: 0.18, size: 1.5, gravity: 0.2, quality: 'normal'
    });
    // 斩痕边缘一瞬暗红光晕
    this._acquireParticle({
      x, y, vx: 0, vy: 0,
      life: 0.08, maxLife: 0.08,
      color: '#cc1122',
      size: 30,
      gravity: 0,
      type: 'sukunaCutGlow',
      angle: baseAngle
    });
  }

  // 虎杖「赤磷悦动」：血液高速循环，全身气血蒸腾（多阶段起手特效）
  bloodSurgeEffect(x, y, color = '#ff7675') {
    const time = Date.now() * 0.001;

    // ===== 阶段1：心脏为源头迸发滚烫血气 =====
    // 心脏位置爆发核心（胸口位置 y-35）
    this._acquireParticle({
      x, y: y - 35,
      vx: 0, vy: 0,
      life: 0.25,
      maxLife: 0.25,
      color: '#ff2020',
      size: 50,
      gravity: 0,
      type: 'bloodHeartCore'
    });
    // 血气从心脏向四肢扩散（放射状）
    this.emit(x, y - 35, 24, {
      color: '#ff3030', speed: 7, spread: Math.PI * 2, life: 0.45, size: 3, gravity: 0, quality: 'normal'
    });

    // ===== 阶段2：周身血管贲张，血色气流循环流转 =====
    // 环形血色气流带（沿身体轮廓旋转上升）
    for (let i = 0; i < 3; i++) {
      const startAngle = (i / 3) * Math.PI * 2;
      this._acquireParticle({
        x, y: y - 30,
        vx: 0, vy: -0.5,
        life: 0.6 + i * 0.1,
        maxLife: 0.7,
        color: '#dc2828',
        size: 6,
        gravity: 0,
        type: 'bloodCircuitFlow',
        angle: startAngle,
        radius: 22,
        speed: 0.08
      });
    }

    // ===== 阶段3：赤红薄雾萦绕全身轮廓 =====
    this.emit(x, y - 30, 30, {
      color: '#ff4d4d', speed: 3.5, spread: Math.PI * 2, life: 0.6, size: 5, gravity: -0.6, quality: 'normal'
    });
    this.emit(x, y - 30, 16, {
      color: '#ff8080', speed: 2, spread: Math.PI * 2, life: 0.5, size: 7, gravity: -0.4, quality: 'ambient'
    });

    // ===== 阶段4：高温空气扭曲（热浪碎片） =====
    this.emit(x, y - 30, 12, {
      color: '#ffa0a0', speed: 1.5, spread: Math.PI * 2, life: 0.4, size: 2, gravity: -0.2, type: 'line', quality: 'essential'
    });

    // ===== 阶段5：内聚闪光（体温急速攀升） =====
    this._acquireParticle({
      x, y: y - 30,
      vx: 0, vy: 0,
      life: 0.2,
      maxLife: 0.2,
      color: '#ff3030',
      size: 65,
      gravity: 0,
      type: 'bloodSurgeFlash'
    });

    // ===== 阶段6：身体强化碎片（肌肉紧绷膨胀） =====
    this.emit(x, y - 10, 14, {
      color: '#ff6060', speed: 4, spread: Math.PI * 2, life: 0.35, size: 2.5, gravity: 0.15, quality: 'normal'
    });

    // 屏幕震动 + 暗红闪屏
    this.screenShake = { intensity: 5, duration: 0.35 };
    this.screenFlash = { color: '#8b0000', alpha: 0.25, duration: 0.15 };
  }

  // 虎杖「农家乐领域」：灵魂限定・解 —— 纤细通透淡白光刃（不伤实物，直击灵魂）
  soulSlashCut(x, y, dir) {
    const baseAngle = dir > 0 ? -Math.PI / 6 : Math.PI + Math.PI / 6;

    // 1. 淡白光刃本体（纤细通透、轻盈内敛）
    this._acquireParticle({
      x: x + (Math.random() - 0.5) * 6,
      y: y + (Math.random() - 0.5) * 18,
      vx: 0, vy: 0,
      life: 0.22,
      maxLife: 0.26,
      color: '#fffef5',
      size: 32 + Math.random() * 10,
      gravity: 0,
      type: 'yujiSoulCut',
      angle: baseAngle + (Math.random() - 0.5) * 0.18,
      seed: Math.random() * 100
    });

    // 2. 灵魂光晕震颤（命中刹那周身闪过微弱灵魂光晕）
    this._acquireParticle({
      x, y,
      vx: 0, vy: 0,
      life: 0.32,
      maxLife: 0.32,
      color: '#ffffff',
      size: 38,
      gravity: 0,
      type: 'yujiSoulTremor'
    });

    // 3. 灵魂碎屑（极淡白光飘散，无血色）
    this.emit(x, y, 5, {
      color: '#fffbf0', speed: 1.8, spread: Math.PI * 2, life: 0.35, size: 1.2, gravity: -0.05, quality: 'normal'
    });
  }

  // 虎杖「农家乐领域」：起手结印 —— 咒力血气尽数收拢于胸口，不再外放
  yujiDomainPreCast(x, y) {
    // 向内汇聚的米白咒力光点（不爆发，仅收拢）
    const count = this.quality === 'low' ? 8 : 16;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const dist = 60 + Math.random() * 25;
      this._acquireParticle({
        x: x + Math.cos(angle) * dist,
        y: y - 30 + Math.sin(angle) * dist,
        vx: -Math.cos(angle) * 1.2,
        vy: -Math.sin(angle) * 1.2,
        life: 0.6 + Math.random() * 0.2,
        maxLife: 0.8,
        color: '#fff6dc',
        size: 2 + Math.random() * 1.5,
        gravity: 0,
        type: 'yujiWarmMote'
      });
    }
    // 胸口收拢核心（极柔和的暖光晕，不爆发）
    this._acquireParticle({
      x, y: y - 30,
      vx: 0, vy: 0,
      life: 0.7,
      maxLife: 0.7,
      color: '#fff3d6',
      size: 24,
      gravity: 0,
      type: 'yujiWarmCore'
    });
  }

  // 虎杖「农家乐领域」：空间褶皱蔓延 —— 暖米色柔光帷幕向四面铺展
  yujiDomainFold(cx, cy, maxRadius) {
    const ringCount = this.quality === 'low' ? 2 : 3;
    for (let i = 0; i < ringCount; i++) {
      this._acquireParticle({
        x: cx, y: cy,
        vx: 0, vy: 0,
        life: 1.2 + i * 0.2,
        maxLife: 1.4 + i * 0.2,
        color: '#fff3d6',
        size: 40,
        gravity: 0,
        type: 'yujiFoldRipple',
        maxRadius: maxRadius + i * 60,
        delay: i * 0.12
      });
    }
    // 暖光氛围微粒铺散
    const moteCount = this.quality === 'low' ? 6 : 12;
    for (let i = 0; i < moteCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.8 + Math.random() * 1.2;
      this._acquireParticle({
        x: cx + (Math.random() - 0.5) * 60,
        y: cy + (Math.random() - 0.5) * 60,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.6 - 0.2,
        life: 1.6 + Math.random() * 0.8,
        maxLife: 2.4,
        color: '#ffefc8',
        size: 1.6 + Math.random() * 1.2,
        gravity: -0.02,
        type: 'yujiWarmMote'
      });
    }
  }

  // 虎杖「农家乐领域」：记忆沉浸式光影 —— 半透明虚影浮现又消散
  // kind: 'grandpa_eat' / 'grandpa_walk' / 'grandpa_talk' / 'child_play'
  yujiDomainMemoryGhost(x, y, kind) {
    const palettes = {
      grandpa_eat:  { color: '#ffe8b8', w: 60, h: 50 },
      grandpa_walk: { color: '#ffdca0', w: 70, h: 60 },
      grandpa_talk: { color: '#ffe0c0', w: 55, h: 55 },
      child_play:   { color: '#fff0d0', w: 50, h: 50 }
    };
    const p = palettes[kind] || palettes.grandpa_walk;
    this._acquireParticle({
      x, y,
      vx: 0, vy: -0.15,
      life: 2.4,
      maxLife: 2.4,
      color: p.color,
      size: p.w,
      height: p.h,
      kind,
      gravity: 0,
      type: 'yujiMemoryGhost'
    });
  }

  // 虎杖「农家乐领域」：乡间落叶飘荡（场景动态点缀）
  yujiDomainLeaf(w, h) {
    this._acquireParticle({
      x: Math.random() * w,
      y: h * 0.3 + Math.random() * h * 0.2,
      vx: -0.4 + Math.random() * 0.3,
      vy: 0.15 + Math.random() * 0.15,
      life: 6 + Math.random() * 3,
      maxLife: 9,
      color: ['#d4a85a', '#c89858', '#b08848', '#e0b870'][Math.floor(Math.random() * 4)],
      size: 2.5 + Math.random() * 1.5,
      gravity: 0.01,
      type: 'yujiLeaf',
      spin: (Math.random() - 0.5) * 0.06,
      angle: Math.random() * Math.PI * 2
    });
  }

  // 虎杖「农家乐领域」：消散收尾 —— 景物化作光点碎屑飘散
  yujiDomainDissipate(w, h, groundY) {
    const count = this.quality === 'low' ? 24 : 48;
    for (let i = 0; i < count; i++) {
      this._acquireParticle({
        x: Math.random() * w,
        y: groundY - Math.random() * (h - groundY + 100),
        vx: (Math.random() - 0.5) * 0.8,
        vy: -0.5 - Math.random() * 0.6,
        life: 1.4 + Math.random() * 0.8,
        maxLife: 2.2,
        color: '#fff6dc',
        size: 1.5 + Math.random() * 1.8,
        gravity: -0.04,
        type: 'yujiDissipateMote'
      });
    }
  }

  // 宿傩「解・広域」：蛛网式均匀切割痕迹 + 暗红风压
  sukunaWideSlash(x, y, dir, range, radius, groundY) {
    const count = this.quality === 'low' ? 5 : 9;
    for (let i = 0; i < count; i++) {
      const offset = (i / (count - 1) - 0.5) * radius * 2;
      const len = range * (0.55 + Math.random() * 0.45);
      const angleVar = (Math.random() - 0.5) * 0.45;
      this._acquireParticle({
        x: x + dir * 15,
        y: y + offset,
        vx: 0, vy: 0,
        life: 0.35 + Math.random() * 0.15,
        maxLife: 0.5,
        color: '#1a0008',
        size: len,
        gravity: 0,
        type: 'sukunaWeb',
        angle: (dir > 0 ? 0 : Math.PI) + angleVar,
        seed: Math.random() * 100
      });
    }
    // 地面蛛网切割痕迹
    const groundCount = this.quality === 'low' ? 3 : 6;
    for (let i = 0; i < groundCount; i++) {
      const gx = x + dir * (25 + Math.random() * range * 0.65);
      this._acquireParticle({
        x: gx,
        y: groundY,
        vx: 0, vy: 0,
        life: 0.4 + Math.random() * 0.2,
        maxLife: 0.6,
        color: '#0a0004',
        size: 16 + Math.random() * 22,
        gravity: 0,
        type: 'sukunaWeb',
        angle: Math.PI / 2 + (Math.random() - 0.5) * 0.6,
        seed: Math.random() * 100
      });
    }
    // 暗红色风压扩散环
    this._acquireParticle({
      x: x + dir * 20, y,
      vx: 0, vy: 0,
      life: 0.3, maxLife: 0.3,
      color: '#8b0000',
      size: radius * 0.8,
      gravity: 0,
      type: 'sukunaWindPressure'
    });
    // 暗红咒力碎屑飞散
    this.emit(x + dir * 20, y, 14, {
      color: '#660012', speed: 5, spread: Math.PI * 2, life: 0.35, size: 2, gravity: 0.25, quality: 'ambient'
    });
    // 屏幕震动
    this.screenShake = { intensity: 8, duration: 0.25 };
  }

  // 宿傩「捌」：接触点黑红色咒力爆发 + 密集交错平整切割断面
  sukunaDismantleEffect(x, y, dir, inDomain = false) {
    // 1. 接触点浓烈黑红色咒力爆发（短促一瞬）
    this.emit(x, y, 22, {
      color: '#4a0008', speed: 5, spread: Math.PI * 2, life: 0.22, size: 4, gravity: 0.1, quality: 'normal'
    });
    this.emit(x, y, 14, {
      color: '#8b0000', speed: 3, spread: Math.PI * 2, life: 0.18, size: 3, gravity: 0, quality: 'normal'
    });
    // 核心极暗红点
    this._acquireParticle({
      x, y, vx: 0, vy: 0,
      life: 0.15, maxLife: 0.15,
      color: '#1a0008',
      size: 45,
      gravity: 0,
      type: 'sukunaDismantleBurst'
    });

    // 2. 目标体表密集交错的平整切割断面
    let cutCount = inDomain ? 10 : 7;
    if (this.quality === 'low') cutCount = Math.ceil(cutCount * 0.5);
    for (let i = 0; i < cutCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const len = 28 + Math.random() * 26;
      const ox = Math.cos(angle) * (Math.random() * 25);
      const oy = Math.sin(angle) * (Math.random() * 35);
      this._acquireParticle({
        x: x + ox,
        y: y + oy,
        vx: 0, vy: 0,
        life: 0.28 + Math.random() * 0.12,
        maxLife: 0.4,
        color: '#0f0004',
        size: len,
        gravity: 0,
        type: 'sukunaDismantleCut',
        angle: angle,
        seed: Math.random() * 100
      });
    }

    // 3. 粗重暗色撕裂斩痕向内部扩散
    const tearCount = this.quality === 'low' ? 2 : 5;
    for (let i = 0; i < tearCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 5 + Math.random() * 18;
      this._acquireParticle({
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        vx: -Math.cos(angle) * 2.5,
        vy: -Math.sin(angle) * 2.5,
        life: 0.18 + Math.random() * 0.12,
        maxLife: 0.3,
        color: '#1a0008',
        size: 18 + Math.random() * 14,
        gravity: 0,
        type: 'sukunaDismantleCut',
        angle: angle + Math.PI,
        seed: Math.random() * 100
      });
    }

    // 4. 鲜红咒力火花飞溅（增加视觉冲击力）
    this.emit(x, y, 16, {
      color: '#ff1a1a', speed: 6, spread: Math.PI * 2, life: 0.25, size: 2, gravity: 0.15, quality: 'normal'
    });
    this.emit(x, y, 8, {
      color: '#ff6600', speed: 4, spread: Math.PI * 2, life: 0.18, size: 1.5, gravity: 0.2, quality: 'ambient'
    });

    // 5. 少量暗色碎屑（物体被绞碎，无爆炸效果）
    this.emit(x, y, 10, {
      color: '#1a0008', speed: 2.5, spread: Math.PI * 2, life: 0.35, size: 2, gravity: 0.3, quality: 'ambient'
    });

    // 6. 屏幕震动
    this.screenShake = { intensity: inDomain ? 12 : 8, duration: 0.3 };

    // 7. 领域内额外：范围压迫感残影
    if (inDomain) {
      this.emit(x, y, 10, {
        color: '#2a000a', speed: 1.5, spread: Math.PI * 2, life: 0.4, size: 5, gravity: 0, quality: 'ambient'
      });
    }
  }

  // 宿傩「灶開」：掌心凝聚浓稠暗绯烈焰
  fireArrowCharge(x, y, dir) {
    const handOffset = dir * 28;
    // 暗绯色火焰核心（外层炭黑烟尘包裹）
    this._acquireParticle({
      x: x + handOffset, y,
      vx: 0, vy: 0,
      life: 0.5, maxLife: 0.5,
      color: '#8b0000',
      size: 20,
      gravity: 0,
      type: 'kamudoCore'
    });
    // 亮金内核
    this._acquireParticle({
      x: x + handOffset, y,
      vx: 0, vy: 0,
      life: 0.4, maxLife: 0.4,
      color: '#ffcc44',
      size: 10,
      gravity: 0,
      type: 'kamudoCore'
    });
    // 炭黑烟尘包裹
    this.emit(x + handOffset, y, 16, {
      color: '#0a0a0a', speed: 1.5, spread: Math.PI * 2, life: 0.5, size: 7, gravity: -0.15, type: 'kamudoSmoke', quality: 'ambient'
    });
    // 向掌心汇聚的暗绯色火焰流
    this.emit(x + handOffset, y, 20, {
      color: '#660012', speed: 4, spread: Math.PI * 2, life: 0.4, size: 3, gravity: -0.2, type: 'kamudoSpark', quality: 'normal'
    });
    this.emit(x + handOffset, y, 10, {
      color: '#cc3322', speed: 2.5, spread: Math.PI * 2, life: 0.3, size: 2, gravity: -0.1, type: 'kamudoSpark', quality: 'normal'
    });
    // 蓄力低沉炉膛闷响（低频震动）
    this.screenShake = { intensity: 3, duration: 0.15 };
  }

  // 宿傩「灶開」：暗绯火矢飞行尾焰（流动长条暗绯火焰 + 炭黑烟尘）
  fireArrowTrail(x, y, vx, vy) {
    if (this.quality === 'low') return;
    const backDir = Math.atan2(-vy, -vx);
    // 暗绯色主尾焰
    this.emit(x, y, 3, {
      color: '#8b0000', speed: 1.5, spread: 0.5, life: 0.4, size: 6,
      angle: backDir, gravity: -0.05, type: 'kamudoSmoke', quality: 'normal'
    });
    // 亮金核心尾迹
    this.emit(x, y, 2, {
      color: '#ffaa22', speed: 1.2, spread: 0.4, life: 0.25, size: 3,
      angle: backDir, gravity: -0.05, type: 'kamudoSpark', quality: 'normal'
    });
    // 炭黑烟尘飘散
    this.emit(x, y, 2, {
      color: '#0a0a0a', speed: 1, spread: 0.8, life: 0.5, size: 5,
      angle: backDir, gravity: -0.1, type: 'kamudoSmoke', quality: 'ambient'
    });
  }

  // 宿傩「灶開」：火矢命中爆炸 / 领域内连锁热压爆轰
  fireArrowExplosion(x, y, radius, inDomain = false) {
    if (inDomain) {
      this._kamudoDomainExplosion(x, y, radius);
      return;
    }
    // ===== 单体命中：持续高温熔蚀 =====
    // 暗绯色火球核心
    this._acquireParticle({
      x, y, vx: 0, vy: 0,
      life: 0.45, maxLife: 0.45,
      color: '#8b0000',
      size: radius * 0.7,
      gravity: 0,
      type: 'kamudoFireball'
    });
    // 亮金内核
    this._acquireParticle({
      x, y, vx: 0, vy: 0,
      life: 0.3, maxLife: 0.3,
      color: '#ffcc44',
      size: radius * 0.25,
      gravity: 0,
      type: 'kamudoFireball'
    });
    // 暗绯色火环外扩
    this._acquireParticle({
      x, y, vx: 0, vy: 0,
      life: 0.4, maxLife: 0.4,
      color: '#660012',
      size: radius,
      gravity: 0,
      type: 'kamudoRing'
    });
    // 暗绯火星飞溅
    this.emit(x, y, 24, {
      color: '#cc2222', speed: 5, spread: Math.PI * 2, life: 0.45, size: 2.5, gravity: 0.25, type: 'kamudoSpark', quality: 'normal'
    });
    this.emit(x, y, 12, {
      color: '#ffaa22', speed: 3.5, spread: Math.PI * 2, life: 0.3, size: 2, gravity: 0.2, type: 'kamudoSpark', quality: 'normal'
    });
    // 炭黑烟尘升腾
    this.emit(x, y, 14, {
      color: '#0a0a0a', speed: 1.5, spread: Math.PI * 2, life: 0.7, size: 6, gravity: -0.4, type: 'kamudoSmoke', quality: 'ambient'
    });
    this.emit(x, y, 8, {
      color: '#1a1a1a', speed: 2.5, spread: Math.PI * 2, life: 0.5, size: 4, gravity: -0.3, type: 'kamudoSmoke', quality: 'ambient'
    });
    // 灰烬
    this.emit(x, y, 10, {
      color: '#3a3a3a', speed: 3, spread: Math.PI * 2, life: 0.55, size: 2, gravity: 0.35, type: 'ash', quality: 'ambient'
    });
    // 熔蚀地面残留
    this._acquireParticle({
      x, y: y + 25, vx: 0, vy: 0,
      life: 0.6, maxLife: 0.6,
      color: '#4a0008',
      size: radius * 0.9,
      gravity: 0,
      type: 'kamudoGroundBurn'
    });
    // 屏幕震动
    this.screenShake = { intensity: 10, duration: 0.3 };
    this.screenFlash = { color: '#330011', alpha: 0.4, duration: 0.12 };
  }

  // 领域内连锁热压爆轰：引燃全域粉尘，冲击波扫荡整片领域
  _kamudoDomainExplosion(x, y, radius) {
    // 1. 中心巨型暗绯火球
    this._acquireParticle({
      x, y, vx: 0, vy: 0,
      life: 0.7, maxLife: 0.7,
      color: '#8b0000',
      size: radius * 0.8,
      gravity: 0,
      type: 'kamudoFireball'
    });
    // 亮金核心
    this._acquireParticle({
      x, y, vx: 0, vy: 0,
      life: 0.5, maxLife: 0.5,
      color: '#ffcc44',
      size: radius * 0.3,
      gravity: 0,
      type: 'kamudoFireball'
    });

    // 2. 连锁爆轰：多点粉尘引爆
    const chainCount = this.quality === 'low' ? 3 : 8;
    for (let i = 0; i < chainCount; i++) {
      const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.3;
      const dist = radius * (0.3 + Math.random() * 0.6);
      const ex = x + Math.cos(angle) * dist;
      const ey = y + Math.sin(angle) * dist * 0.5;
      this._acquireParticle({
        x: ex, y: ey, vx: 0, vy: 0,
        life: 0.35 + Math.random() * 0.2, maxLife: 0.55,
        color: '#660012',
        size: radius * (0.2 + Math.random() * 0.2),
        gravity: 0,
        type: 'kamudoFireball',
        delay: i * 0.04
      });
    }

    // 3. 多层冲击波环（热压波交替扩散）
    const waveCount = this.quality === 'low' ? 2 : 4;
    for (let i = 0; i < waveCount; i++) {
      this._acquireParticle({
        x, y, vx: 0, vy: 0,
        life: 0.6 + i * 0.1, maxLife: 0.6 + i * 0.1,
        color: i % 2 === 0 ? '#8b0000' : '#0a0a0a',
        size: radius * (0.4 + i * 0.2),
        gravity: 0,
        type: 'kamudoShockwave',
        delay: i * 0.06
      });
    }

    // 4. 全域地面龟裂熔蚀
    this._acquireParticle({
      x, y: y + 30, vx: 0, vy: 0,
      life: 0.9, maxLife: 0.9,
      color: '#4a0008',
      size: radius * 1.2,
      gravity: 0,
      type: 'kamudoGroundBurn'
    });

    // 5. 大量暗绯火星 + 亮金火花飞散
    this.emit(x, y, 50, {
      color: '#cc2222', speed: 9, spread: Math.PI * 2, life: 0.75, size: 4, gravity: 0.25, type: 'kamudoSpark', quality: 'heavy'
    });
    this.emit(x, y, 25, {
      color: '#ffaa22', speed: 6, spread: Math.PI * 2, life: 0.5, size: 3, gravity: 0.2, type: 'kamudoSpark', quality: 'heavy'
    });

    // 6. 浓密炭黑烟尘笼罩全域
    this.emit(x, y, 30, {
      color: '#0a0a0a', speed: 2.5, spread: Math.PI * 2, life: 1.2, size: 10, gravity: -0.4, type: 'kamudoSmoke', quality: 'ambient'
    });
    this.emit(x, y, 20, {
      color: '#1a1a1a', speed: 4, spread: Math.PI * 2, life: 0.9, size: 6, gravity: -0.3, type: 'kamudoSmoke', quality: 'ambient'
    });

    // 7. 灰烬纷飞
    this.emit(x, y, 25, {
      color: '#3a3a3a', speed: 5, spread: Math.PI * 2, life: 0.85, size: 3, gravity: 0.35, type: 'ash', quality: 'ambient'
    });

    // 8. 低频巨响：强烈屏幕震动 + 暗绯色全屏闪光
    this.screenShake = { intensity: 22, duration: 0.6 };
    this.screenFlash = { color: '#2a0008', alpha: 0.7, duration: 0.25 };
  }

  // 宿傩「解・界断」：横贯天地的平整切口（世界本身被错开一道缝隙）
  sukunaWorldSlash(width, height, dir, y, groundY) {
    // 主切口：横贯屏幕的平整黑色裂缝
    this._acquireParticle({
      x: width / 2,
      y: y,
      vx: 0, vy: 0,
      life: 1.1,
      maxLife: 1.1,
      color: '#000000',
      size: width,
      gravity: 0,
      type: 'sukunaWorldCut',
      angle: dir > 0 ? 0 : Math.PI,
      seed: Math.random() * 100,
      worldW: width,
      worldH: height,
      groundY: groundY
    });
    // 切口两侧碎屑沿断面缓慢错位、坍塌
    const debrisCount = this.quality === 'low' ? 10 : 24;
    for (let i = 0; i < debrisCount; i++) {
      const cx = Math.random() * width;
      this._acquireParticle({
        x: cx + (Math.random() - 0.5) * 16,
        y: groundY,
        vx: dir * (0.4 + Math.random() * 1.4),
        vy: -Math.random() * 2.5,
        life: 0.6 + Math.random() * 0.5,
        maxLife: 1.1,
        color: '#1a0008',
        size: 2 + Math.random() * 3,
        gravity: 0.4,
        type: 'circle'
      });
    }
    // 远端延伸至视野尽头的巨大鸿沟（沿地面的暗色长线）
    this._acquireParticle({
      x: width / 2,
      y: groundY,
      vx: 0, vy: 0,
      life: 1.2,
      maxLife: 1.2,
      color: '#000000',
      size: width,
      gravity: 0,
      type: 'sukunaWorldCut',
      angle: 0,
      seed: Math.random() * 100,
      worldW: width,
      worldH: height,
      groundY: groundY
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
        case 'sukunaDomain':
          // 暗红血色基底
          ctx.fillStyle = `rgba(80, 5, 5, ${alpha * 0.7})`;
          ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
          // 中心血光
          const sg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 400);
          sg.addColorStop(0, `rgba(180, 20, 20, ${alpha * 0.5})`);
          sg.addColorStop(0.5, `rgba(100, 10, 10, ${alpha * 0.2})`);
          sg.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = sg;
          ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
          // 斩击线条
          ctx.strokeStyle = `rgba(200, 30, 30, ${alpha * 0.3})`;
          ctx.lineWidth = 2;
          const st = Date.now() * 0.001;
          for (let i = 0; i < 8; i++) {
            const sa = st * 2 + i * 0.8;
            const sl = 100 + Math.sin(st * 3 + i) * 50;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(sa) * 30, cy + Math.sin(sa) * 30);
            ctx.lineTo(cx + Math.cos(sa) * sl, cy + Math.sin(sa) * sl);
            ctx.stroke();
          }
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

    // 绘制粒子（仅遍历活跃区；单帧一次 save/restore，每粒子只重置可变状态，减少开销）
    ctx.save();
    for (let i = 0; i < this.activeCount; i++) {
      const p = this.particles[i];
      const alpha = p.life / p.maxLife;
      const px = p.x + cameraOffset.x;
      const py = p.y + cameraOffset.y;

      // 重置可能跨粒子泄漏的状态
      ctx.globalAlpha = alpha;
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
      ctx.lineWidth = 1;
      ctx.lineCap = 'butt';
      ctx.globalCompositeOperation = 'source-over';

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
      } else if (p.type === 'blackRedBolt') {
        // 黑闪：黑红色锯齿状闪电从中心炸裂
        if (p.delay && p.delay > 0) { continue; }
        const dx = Math.cos(p.angle);
        const dy = Math.sin(p.angle);
        const nx = -dy, ny = dx;
        const len = p.length * (0.3 + alpha * 0.7);
        const segs = 7;
        ctx.lineCap = 'round';

        // 生成锯齿路径点
        const pts = [[px, py]];
        for (let s = 1; s <= segs; s++) {
          const f = s / segs;
          const jitter = (Math.sin(p.seed * 17.3 + s * 3.7) + Math.sin(p.seed * 9.1 + s * 2.3) * 0.7) * 5.5 * (1 - f * 0.3);
          pts.push([px + dx * len * f + nx * jitter, py + dy * len * f + ny * jitter]);
        }

        // 红色外光晕（宽幅红色底光）
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#ff1a1a';
        ctx.strokeStyle = `rgba(255,30,30,${alpha * 0.5})`;
        ctx.lineWidth = p.size * 2.2;
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let s = 1; s < pts.length; s++) ctx.lineTo(pts[s][0], pts[s][1]);
        ctx.stroke();

        // 分支闪电
        for (let b = 0; b < (p.branches || 0); b++) {
          const branchSeg = 2 + Math.floor(Math.random() * (segs - 2));
          if (branchSeg >= pts.length - 1) continue;
          const bx = pts[branchSeg][0], by = pts[branchSeg][1];
          const bAngle = p.angle + (Math.random() - 0.5) * 1.8;
          const bLen = len * (0.2 + Math.random() * 0.25);
          const bEndX = bx + Math.cos(bAngle) * bLen;
          const bEndY = by + Math.sin(bAngle) * bLen;
          ctx.strokeStyle = `rgba(255,30,30,${alpha * 0.4})`;
          ctx.lineWidth = p.size * 1.3;
          ctx.beginPath();
          ctx.moveTo(bx, by);
          const bMid = 3;
          for (let s = 1; s <= bMid; s++) {
            const f = s / bMid;
            const jx = (Math.sin(p.seed * 22 + s * 5 + b * 3) * 4) * (1 - f * 0.3);
            const jy = (Math.cos(p.seed * 18 + s * 4 + b * 2) * 4) * (1 - f * 0.3);
            ctx.lineTo(bx + (bEndX - bx) * f + jx, by + (bEndY - by) * f + jy);
          }
          ctx.stroke();
          // 分支黑色芯
          ctx.shadowBlur = 0;
          ctx.strokeStyle = `rgba(0,0,0,${alpha * 0.85})`;
          ctx.lineWidth = p.size * 0.5;
          ctx.stroke();
          ctx.shadowBlur = 12;
          ctx.shadowColor = '#ff1a1a';
        }

        // 黑色主体芯（最上层，纯黑锯齿主干）
        ctx.shadowBlur = 0;
        ctx.strokeStyle = `rgba(0,0,0,${alpha * 0.95})`;
        ctx.lineWidth = p.size * (0.7 + alpha * 0.5);
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let s = 1; s < pts.length; s++) ctx.lineTo(pts[s][0], pts[s][1]);
        ctx.stroke();

        // 白色亮芯（最细的中心高光）
        ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.4})`;
        ctx.lineWidth = p.size * 0.3 * alpha;
        ctx.stroke();

      } else if (p.type === 'blackRedCore') {
        // 黑闪：中心黑红色爆发核心
        const r = p.size * (1 + (1 - alpha) * 1.8);
        // 红色外光晕
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ff1a1a';
        ctx.fillStyle = `rgba(255,30,30,${alpha * 0.7})`;
        ctx.beginPath();
        ctx.arc(px, py, r * 1.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        // 黑色主体
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
        // 红色内圈
        ctx.fillStyle = `rgba(180,20,20,${alpha * 0.8})`;
        ctx.beginPath();
        ctx.arc(px, py, r * 0.6, 0, Math.PI * 2);
        ctx.fill();
        // 中心白点高光
        if (alpha > 0.4) {
          ctx.fillStyle = `rgba(255,255,255,${(alpha - 0.4) * 1.5})`;
          ctx.beginPath();
          ctx.arc(px, py, r * 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (p.type === 'blackRedShockwave') {
        // 黑闪：黑红色冲击波环
        const expand = p.size + (1 - alpha) * 140;
        const ringWidth = 10 * alpha + 2;
        // 红色外光晕
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff1a1a';
        ctx.strokeStyle = `rgba(255,30,30,${alpha * 0.5})`;
        ctx.lineWidth = ringWidth * 1.8;
        ctx.beginPath();
        ctx.arc(px, py, expand, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        // 黑色主体环
        ctx.strokeStyle = `rgba(0,0,0,${alpha * 0.9})`;
        ctx.lineWidth = ringWidth;
        ctx.beginPath();
        ctx.arc(px, py, expand, 0, Math.PI * 2);
        ctx.stroke();
        // 红色内边
        ctx.strokeStyle = `rgba(255,50,50,${alpha * 0.5})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(2, expand - ringWidth * 0.5), 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === 'sukunaCut') {
        // 宿傩「解」命中：极细暗色斩痕，接触瞬间闪过
        const len = p.size;
        const dx = Math.cos(p.angle);
        const dy = Math.sin(p.angle);
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = alpha * 0.85;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(px - dx * len * 0.5, py - dy * len * 0.5);
        ctx.lineTo(px + dx * len * 0.5, py + dy * len * 0.5);
        ctx.stroke();
        // 暗色斩痕中的极淡暗红高光
        ctx.strokeStyle = `rgba(120,15,20,${alpha * 0.35})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      } else if (p.type === 'sukunaCutGlow') {
        // 宿傩「解」斩痕边缘暗红光晕（一瞬而逝）
        const len = p.size;
        const dx = Math.cos(p.angle);
        const dy = Math.sin(p.angle);
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#cc1122';
        ctx.strokeStyle = `rgba(180,30,40,${alpha * 0.5})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(px - dx * len * 0.5, py - dy * len * 0.5);
        ctx.lineTo(px + dx * len * 0.5, py + dy * len * 0.5);
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (p.type === 'sukunaWindPressure') {
        // 宿傩「解・広域」暗红风压扩散环
        const expand = p.size * (0.3 + (1 - alpha) * 0.9);
        ctx.strokeStyle = `rgba(139,0,0,${alpha * 0.45})`;
        ctx.lineWidth = 4 * alpha + 1;
        ctx.beginPath();
        ctx.arc(px, py, expand, 0, Math.PI * 2);
        ctx.stroke();
        // 内层暗红
        ctx.strokeStyle = `rgba(200,40,40,${alpha * 0.25})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(2, expand - 4), 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === 'sukunaWeb') {
        // 宿傩「解・広域」：蛛网式切割痕迹（极细暗色斩痕线）
        const len = p.size;
        const dx = Math.cos(p.angle);
        const dy = Math.sin(p.angle);
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = alpha * 0.6;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(px - dx * len * 0.5, py - dy * len * 0.5);
        ctx.lineTo(px + dx * len * 0.5, py + dy * len * 0.5);
        ctx.stroke();
      } else if (p.type === 'sukunaWorldCut') {
        // 宿傩「解・界断」：横贯天地的平整切口，世界被错开一道缝隙
        const w = p.worldW || p.size;
        const gap = (1 - alpha) * 14 + 1.5; // 切口逐渐裂开
        const cy = py;
        // 切口黑色裂缝（横贯屏幕）
        ctx.fillStyle = '#000000';
        ctx.globalAlpha = alpha * 0.92;
        ctx.fillRect(0, cy - gap * 0.5, w, gap);
        // 切口断面极淡暗红（光滑断面）
        ctx.fillStyle = `rgba(90,5,12,${alpha * 0.5})`;
        ctx.fillRect(0, cy - gap * 0.5 - 1, w, 1.2);
        ctx.fillRect(0, cy + gap * 0.5, w, 1.2);
        // 切口边缘细微空间扭曲（极淡白线）
        ctx.strokeStyle = `rgba(200,200,210,${alpha * 0.2})`;
        ctx.lineWidth = 0.4;
        ctx.beginPath();
        ctx.moveTo(0, cy - gap * 0.5 - 2);
        ctx.lineTo(w, cy - gap * 0.5 - 2);
        ctx.stroke();
      } else if (p.type === 'sukunaDismantleBurst') {
        // 宿傩「捌」：接触点浓烈黑红色咒力爆发
        const r = p.size * (1 + (1 - alpha) * 0.6);
        const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
        grad.addColorStop(0, `rgba(60,0,8,${alpha * 0.9})`);
        grad.addColorStop(0.4, `rgba(120,5,15,${alpha * 0.5})`);
        grad.addColorStop(0.75, `rgba(60,0,8,${alpha * 0.2})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'sukunaDismantleCut') {
        // 宿傩「捌」：密集交错平整切割断面
        const len = p.size * (0.7 + alpha * 0.3);
        const dx = Math.cos(p.angle);
        const dy = Math.sin(p.angle);
        ctx.strokeStyle = '#000000';
        ctx.globalAlpha = alpha * 0.85;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(px - dx * len * 0.5, py - dy * len * 0.5);
        ctx.lineTo(px + dx * len * 0.5, py + dy * len * 0.5);
        ctx.stroke();
        // 断面极淡暗红光滑边缘
        ctx.strokeStyle = `rgba(100,10,18,${alpha * 0.45})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      } else if (p.type === 'kamudoCore') {
        // 灶開：掌心暗绯火焰凝聚核心（暗绯基底 + 亮金内核 + 炭黑外缘）
        const r = p.size * (0.8 + alpha * 0.4);
        const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
        if (p.color === '#ffcc44') {
          // 亮金内核
          grad.addColorStop(0, `rgba(255,240,180,${alpha})`);
          grad.addColorStop(0.4, `rgba(255,180,40,${alpha * 0.8})`);
          grad.addColorStop(0.8, `rgba(180,40,10,${alpha * 0.3})`);
        } else {
          // 暗绯色主体
          grad.addColorStop(0, `rgba(255,160,50,${alpha * 0.7})`);
          grad.addColorStop(0.3, `rgba(180,30,20,${alpha * 0.85})`);
          grad.addColorStop(0.7, `rgba(80,10,15,${alpha * 0.5})`);
          grad.addColorStop(1, 'rgba(10,10,10,0)');
        }
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'kamudoFireball') {
        // 灶開：暗绯色火球（暗绯基底 + 亮金核心 + 炭黑外缘）
        if (p.delay && p.delay > 0) { continue; }
        if (this.quality === 'low' && Math.random() < 0.4) { continue; }
        const r = p.size * (0.7 + (1 - alpha) * 0.5);
        const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
        if (p.color === '#ffcc44') {
          grad.addColorStop(0, `rgba(255,240,180,${alpha * 0.95})`);
          grad.addColorStop(0.35, `rgba(255,170,40,${alpha * 0.75})`);
          grad.addColorStop(0.75, `rgba(140,20,10,${alpha * 0.3})`);
        } else {
          grad.addColorStop(0, `rgba(255,140,40,${alpha * 0.6})`);
          grad.addColorStop(0.25, `rgba(180,30,20,${alpha * 0.85})`);
          grad.addColorStop(0.6, `rgba(80,10,15,${alpha * 0.5})`);
          grad.addColorStop(1, 'rgba(10,10,10,0)');
        }
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'kamudoRing') {
        // 灶開：暗绯色火环外扩
        const r = p.size * (0.6 + (1 - alpha) * 1.2);
        ctx.strokeStyle = `rgba(139,0,0,${alpha * 0.6})`;
        ctx.lineWidth = 3 * alpha;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = `rgba(255,170,40,${alpha * 0.3})`;
        ctx.lineWidth = 1.2 * alpha;
        ctx.stroke();
      } else if (p.type === 'kamudoShockwave') {
        // 灶開：热压冲击波环（暗绯与炭黑交替）
        if (p.delay && p.delay > 0) { continue; }
        if (this.quality === 'low' && Math.random() < 0.5) { continue; }
        const r = p.size * (0.3 + (1 - alpha) * 1.1);
        const isDark = p.color === '#0a0a0a';
        ctx.strokeStyle = isDark
          ? `rgba(10,10,10,${alpha * 0.6})`
          : `rgba(139,0,0,${alpha * 0.5})`;
        ctx.lineWidth = 5 * alpha + 1;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.stroke();
        // 内层亮金细线
        ctx.strokeStyle = `rgba(255,170,40,${alpha * 0.25})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(2, r - 4), 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === 'kamudoSpark') {
        // 灶開：暗绯/亮金火星
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        const r = p.size * (0.6 + Math.random() * 0.4);
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'kamudoSmoke') {
        // 灶開：炭黑烟尘（压抑浓黑）
        ctx.fillStyle = p.color || '#0a0a0a';
        ctx.globalAlpha = alpha * 0.45;
        const r = p.size * (1 + (1 - alpha) * 0.8);
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'kamudoGroundBurn') {
        // 灶開：地面熔蚀龟裂（暗绯余烬）
        const r = p.size * (0.6 + Math.sin(Date.now() * 0.015) * 0.08);
        const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
        grad.addColorStop(0, `rgba(180,30,20,${alpha * 0.5})`);
        grad.addColorStop(0.3, `rgba(100,15,10,${alpha * 0.35})`);
        grad.addColorStop(0.7, `rgba(40,5,8,${alpha * 0.2})`);
        grad.addColorStop(1, 'rgba(10,10,10,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(px, py, r, r * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'ash') {
        // 灰烬颗粒
        ctx.fillStyle = '#555555';
        ctx.globalAlpha = alpha * 0.7;
        ctx.beginPath();
        ctx.arc(px, py, p.size * 0.7, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'groundFireCrack') {
        // 领域内地面龟裂火光
        const r = p.size * (0.6 + Math.sin(Date.now() * 0.02) * 0.1);
        const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
        grad.addColorStop(0, `rgba(255,60,0,${alpha * 0.5})`);
        grad.addColorStop(0.5, `rgba(160,20,0,${alpha * 0.25})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(px, py, r, r * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'airRing') {
        // 迳庭拳第一段：灰白色环形气浪波纹（向外扩张+渐隐）
        const r = p.size + (1 - alpha) * (p.maxRadius || 50);
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = alpha * 0.55;
        ctx.lineWidth = (p.lineWidth || 3) * alpha;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(2, r), 0, Math.PI * 2);
        ctx.stroke();
        // 内层淡白填充
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha * 0.08;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(2, r * 0.8), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'cursedLinger') {
        // 迳庭拳滞留：淡蓝咒力在创口表层脉动（迟迟不迸发）
        const pulse = 0.7 + Math.sin(Date.now() * 0.015 + (p.pulse || 0)) * 0.3;
        const r = p.size * pulse;
        const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
        grad.addColorStop(0, `rgba(120,168,255,${alpha * 0.75})`);
        grad.addColorStop(0.5, `rgba(91,141,239,${alpha * 0.4})`);
        grad.addColorStop(1, 'rgba(60,95,219,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
        // 核心亮点
        ctx.fillStyle = '#bcd2ff';
        ctx.globalAlpha = alpha * 0.5 * pulse;
        ctx.beginPath();
        ctx.arc(px, py, r * 0.25, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'cursedShockwave') {
        // 迳庭拳第二段：靛蓝色大范围咒力冲击波环
        const r = p.size + (1 - alpha) * (p.maxRadius || 80);
        // 外环
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = alpha * 0.7;
        ctx.lineWidth = (p.lineWidth || 5) * (0.5 + alpha * 0.5);
        ctx.beginPath();
        ctx.arc(px, py, Math.max(2, r), 0, Math.PI * 2);
        ctx.stroke();
        // 内填充渐变
        const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
        grad.addColorStop(0, `rgba(91,141,239,${alpha * 0.2})`);
        grad.addColorStop(0.6, `rgba(61,95,219,${alpha * 0.1})`);
        grad.addColorStop(1, 'rgba(40,70,180,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(2, r), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'cursedTrail') {
        // 迳庭拳第二段：蓝色咒力残影轨迹
        const r = p.size * (0.4 + alpha * 0.6);
        const grad = ctx.createRadialGradient(px, py, 0, px, py, r * 2);
        grad.addColorStop(0, `rgba(122,168,255,${alpha * 0.6})`);
        grad.addColorStop(0.5, `rgba(91,141,239,${alpha * 0.3})`);
        grad.addColorStop(1, 'rgba(60,95,219,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, r * 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'bloodChargeCore') {
        // 穿血蓄力：指尖饱满血囊核心（脉动膨胀）
        const r = p.size * (0.7 + Math.sin(Date.now() * 0.02) * 0.3);
        const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
        grad.addColorStop(0, `rgba(255, 200, 200, ${alpha * 0.9})`);
        grad.addColorStop(0.3, `rgba(255, 60, 60, ${alpha * 0.7})`);
        grad.addColorStop(0.7, `rgba(180, 20, 20, ${alpha * 0.4})`);
        grad.addColorStop(1, 'rgba(100, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'piercingHole') {
        // 穿血命中：圆滑贯穿孔洞（向外撕裂扩张）
        const r = p.size + (1 - alpha) * (p.maxRadius || 25);
        // 外圈撕裂扩张环
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = alpha * 0.6;
        ctx.lineWidth = 2.5 * alpha;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(2, r), 0, Math.PI * 2);
        ctx.stroke();
        // 内圈暗色孔洞（贯穿感）
        const holeR = r * 0.4;
        const holeGrad = ctx.createRadialGradient(px, py, 0, px, py, holeR);
        holeGrad.addColorStop(0, `rgba(20, 0, 0, ${alpha * 0.8})`);
        holeGrad.addColorStop(0.7, `rgba(80, 10, 10, ${alpha * 0.4})`);
        holeGrad.addColorStop(1, 'rgba(139, 0, 0, 0)');
        ctx.fillStyle = holeGrad;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(px, py, holeR, 0, Math.PI * 2);
        ctx.fill();
        // 孔洞边缘干涸血渍
        ctx.strokeStyle = `rgba(90, 0, 0, ${alpha * 0.4})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(px, py, holeR * 0.8, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === 'burnGlow') {
        // 穿血命中：患处红肿灼烧血色光晕（持续残留）
        const r = p.size * (0.6 + Math.sin(Date.now() * 0.01) * 0.08);
        const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
        grad.addColorStop(0, `rgba(255, 80, 80, ${alpha * 0.5})`);
        grad.addColorStop(0.4, `rgba(200, 30, 30, ${alpha * 0.3})`);
        grad.addColorStop(0.8, `rgba(120, 10, 10, ${alpha * 0.1})`);
        grad.addColorStop(1, 'rgba(60, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'bloodImpale') {
        // 赤磷悦动联动：血气灌入创口（向内汇聚的赤红核心）
        const r = p.size * (0.5 + alpha * 0.5);
        const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
        grad.addColorStop(0, `rgba(255, 100, 100, ${alpha * 0.8})`);
        grad.addColorStop(0.4, `rgba(220, 30, 30, ${alpha * 0.5})`);
        grad.addColorStop(1, 'rgba(139, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
        // 内向汇聚线条
        ctx.strokeStyle = `rgba(255, 60, 60, ${alpha * 0.6})`;
        ctx.lineWidth = 1;
        for (let a = 0; a < 4; a++) {
          const ang = (a / 4) * Math.PI * 2;
          const ir = r * (1 - alpha * 0.6);
          ctx.beginPath();
          ctx.moveTo(px + Math.cos(ang) * r, py + Math.sin(ang) * r);
          ctx.lineTo(px + Math.cos(ang) * ir, py + Math.sin(ang) * ir);
          ctx.stroke();
        }
      } else if (p.type === 'bloodHeartCore') {
        // 赤磷悦动：心脏源头血气爆发核心（暗红渐变 + 脉动）
        const r = p.size * (0.6 + alpha * 0.6);
        const pulse = 0.8 + Math.sin(Date.now() * 0.02) * 0.2;
        const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
        grad.addColorStop(0, `rgba(255, 200, 200, ${alpha * 0.9 * pulse})`);
        grad.addColorStop(0.25, `rgba(255, 50, 50, ${alpha * 0.7})`);
        grad.addColorStop(0.6, `rgba(180, 20, 30, ${alpha * 0.4})`);
        grad.addColorStop(1, 'rgba(100, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'bloodCircuitFlow') {
        // 赤磷悦动：环形血色气流带（沿身体轮廓旋转上升）
        const t = 1 - alpha;
        const angle = p.angle + t * Math.PI * 2 * (p.speed || 0.08) * 10;
        const r = (p.radius || 22) * (1 + t * 0.3);
        const fx = px + Math.cos(angle) * r;
        const fy = py + Math.sin(angle) * r * 0.7 + t * -15;
        // 拖尾
        for (let s = 0; s < 5; s++) {
          const sa = angle - s * 0.15;
          const sr = r * (1 - s * 0.05);
          const sx = px + Math.cos(sa) * sr;
          const sy = py + Math.sin(sa) * sr * 0.7 + t * -15;
          ctx.fillStyle = `rgba(220, 40, 40, ${alpha * 0.3 * (1 - s / 5)})`;
          ctx.beginPath();
          ctx.arc(sx, sy, p.size * (1 - s * 0.15), 0, Math.PI * 2);
          ctx.fill();
        }
        // 头部光点
        ctx.fillStyle = `rgba(255, 100, 100, ${alpha * 0.8})`;
        ctx.beginPath();
        ctx.arc(fx, fy, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255, 200, 200, ${alpha * 0.5})`;
        ctx.beginPath();
        ctx.arc(fx, fy, p.size * 0.4, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'bloodSurgeFlash') {
        // 赤磷悦动：体温急速攀升内聚闪光
        const r = p.size * (0.5 + alpha * 0.5);
        const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
        grad.addColorStop(0, `rgba(255, 180, 180, ${alpha * 0.7})`);
        grad.addColorStop(0.3, `rgba(255, 50, 50, ${alpha * 0.4})`);
        grad.addColorStop(0.7, `rgba(180, 20, 20, ${alpha * 0.15})`);
        grad.addColorStop(1, 'rgba(100, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'flash') {
        // 通用中心闪光（径向渐变）
        const r = p.size * (0.6 + alpha * 0.4);
        const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
        grad.addColorStop(0, `rgba(255,255,255,${alpha * 0.9})`);
        grad.addColorStop(0.4, `${p.color || '#ffffff'}`);
        ctx.globalAlpha = alpha * 0.6;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'yujiSoulCut') {
        // 虎杖「解」：纤细通透淡白光刃（轻盈内敛，不割实物）
        const len = p.size;
        const dx = Math.cos(p.angle);
        const dy = Math.sin(p.angle);
        // 外层极淡白光晕
        ctx.shadowBlur = 6;
        ctx.shadowColor = 'rgba(255, 250, 220, 0.6)';
        ctx.strokeStyle = `rgba(255, 254, 245, ${alpha * 0.85})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(px - dx * len * 0.5, py - dy * len * 0.5);
        ctx.lineTo(px + dx * len * 0.5, py + dy * len * 0.5);
        ctx.stroke();
        ctx.shadowBlur = 0;
        // 内层亮白核心（极细）
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      } else if (p.type === 'yujiSoulTremor') {
        // 灵魂光晕震颤：命中刹那周身闪过微弱灵魂光晕
        const t = 1 - alpha;
        const r = p.size * (0.5 + t * 0.6);
        const tremor = Math.sin(Date.now() * 0.05) * 2;
        const grad = ctx.createRadialGradient(px, py + tremor, 0, px, py + tremor, r);
        grad.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.5})`);
        grad.addColorStop(0.4, `rgba(255, 248, 220, ${alpha * 0.25})`);
        grad.addColorStop(1, 'rgba(255, 240, 200, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py + tremor, r, 0, Math.PI * 2);
        ctx.fill();
        // 内层灵魂轮廓细线（震颤抖动）
        ctx.strokeStyle = `rgba(255, 255, 240, ${alpha * 0.3})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(px, py + tremor, r * 0.6, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === 'yujiWarmMote') {
        // 暖米色咒力微粒（温润浅米白色治愈系咒力）
        const r = p.size;
        ctx.globalAlpha = alpha * 0.7;
        const grad = ctx.createRadialGradient(px, py, 0, px, py, r * 2);
        grad.addColorStop(0, p.color);
        grad.addColorStop(0.5, 'rgba(255, 240, 200, 0.3)');
        grad.addColorStop(1, 'rgba(255, 230, 180, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, r * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else if (p.type === 'yujiWarmCore') {
        // 胸口收拢核心：极柔和的暖光晕（不爆发）
        const r = p.size * (0.6 + alpha * 0.4);
        const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
        grad.addColorStop(0, `rgba(255, 252, 240, ${alpha * 0.85})`);
        grad.addColorStop(0.4, `rgba(255, 243, 214, ${alpha * 0.45})`);
        grad.addColorStop(1, 'rgba(255, 230, 180, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'yujiFoldRipple') {
        // 空间褶皱蔓延：暖米色柔光帷幕向四面铺展
        const t = 1 - alpha;
        const r = p.size + t * (p.maxRadius - p.size);
        // 主帷幕环（淡乳白色朦胧光晕）
        ctx.strokeStyle = `rgba(255, 243, 214, ${alpha * 0.5})`;
        ctx.lineWidth = 3 * alpha + 1;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(2, r), 0, Math.PI * 2);
        ctx.stroke();
        // 内层暖光填充
        const grad = ctx.createRadialGradient(px, py, Math.max(2, r * 0.7), px, py, r);
        grad.addColorStop(0, 'rgba(255, 240, 200, 0)');
        grad.addColorStop(0.7, `rgba(255, 240, 200, ${alpha * 0.12})`);
        grad.addColorStop(1, `rgba(255, 230, 180, ${alpha * 0.25})`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'yujiMemoryGhost') {
        // 记忆沉浸式光影：半透明虚影浮现又消散
        const fadeIn = alpha > 0.7 ? (1 - alpha) / 0.3 : 1;
        const fadeOut = alpha < 0.4 ? alpha / 0.4 : 1;
        const ghostAlpha = Math.min(fadeIn, fadeOut) * 0.35;
        const w = p.size;
        const h = p.height || w;
        // 虚影朦胧光晕背景
        const grad = ctx.createRadialGradient(px, py, 0, px, py, w * 0.8);
        grad.addColorStop(0, `rgba(255, 240, 210, ${ghostAlpha * 0.6})`);
        grad.addColorStop(0.5, `rgba(255, 230, 180, ${ghostAlpha * 0.3})`);
        grad.addColorStop(1, 'rgba(255, 220, 160, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(px, py, w * 0.8, h * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        // 虚影剪影（祖父与幼时虎杖的轮廓暗示）
        ctx.globalAlpha = ghostAlpha;
        ctx.fillStyle = p.color;
        // 简化人物剪影：一大一小两个椭圆
        ctx.beginPath();
        ctx.ellipse(px - w * 0.2, py, w * 0.18, h * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(px + w * 0.25, py + h * 0.1, w * 0.12, h * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else if (p.type === 'yujiLeaf') {
        // 乡间落叶飘荡（细碎，缓缓飘荡）
        p.angle += p.spin;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(p.angle);
        ctx.globalAlpha = alpha * 0.8;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();
      } else if (p.type === 'yujiDissipateMote') {
        // 消散收尾：光点碎屑飘散（向上飘升）
        const r = p.size;
        const flicker = 0.7 + Math.sin(Date.now() * 0.03 + p.x) * 0.3;
        ctx.globalAlpha = alpha * flicker;
        const grad = ctx.createRadialGradient(px, py, 0, px, py, r * 2);
        grad.addColorStop(0, p.color);
        grad.addColorStop(0.5, 'rgba(255, 240, 200, 0.4)');
        grad.addColorStop(1, 'rgba(255, 230, 180, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, r * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
  }

  // 获取屏幕震动偏移（复用对象，避免每帧创建新对象）
  getShakeOffset() {
    if (this.screenShake.duration > 0) {
      const i = this.screenShake.intensity;
      this._cachedShakeOffset.x = (Math.random() - 0.5) * i * 2;
      this._cachedShakeOffset.y = (Math.random() - 0.5) * i * 2;
      return this._cachedShakeOffset;
    }
    this._cachedShakeOffset.x = 0;
    this._cachedShakeOffset.y = 0;
    return this._cachedShakeOffset;
  }
}