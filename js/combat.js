// 战斗系统 - 处理碰撞、伤害、技能判定（3v3 车轮战）
class CombatSystem {
  constructor(canvas, particles, audio) {
    this.canvas = canvas;
    this.particles = particles;
    this.audio = audio;
    this.playerTeam = null;
    this.enemyTeam = null;
    this.activePlayerIdx = 0;
    this.activeEnemyIdx = 0;
    this.player = null;
    this.enemy = null;
    this.ai = null;
    this.projectiles = [];
    this.hitEffects = [];
    this.comboDisplay = { text: '', timer: 0, damage: 0 };
    this.damageNumbers = [];
    this.groundY = 0;
    this.domainActive = false;
    this.domainTimer = 0;
    this.infiniteVoidStun = 0;
  }

  init(playerTeam, enemyTeam, playerIdx, enemyIdx, ai) {
    this.playerTeam = playerTeam;
    this.enemyTeam = enemyTeam;
    this.activePlayerIdx = playerIdx;
    this.activeEnemyIdx = enemyIdx;
    this.player = playerTeam[playerIdx];
    this.enemy = enemyTeam[enemyIdx];
    this.ai = ai;
    this.projectiles = [];
    this.hitEffects = [];
    this.damageNumbers = [];
    this.groundY = this.canvas.height * 0.78;
  }

  setActivePlayer(idx) {
    this.activePlayerIdx = idx;
    this.player = this.playerTeam[idx];
  }

  setActiveEnemy(idx) {
    this.activeEnemyIdx = idx;
    this.enemy = this.enemyTeam[idx];
  }

  update() {
    this.updateFighters();
    this.updateProjectiles();
    this.updateDamageNumbers();
    this.applyBoundaries();
    this.applyGravity();
    this.updateGojoPassives();
    this.updateDomainEffects();
    this.updateSpaceRipples();
  }

  updateFighters() {
    if (this.player) this.player.update();
    if (this.enemy) this.enemy.update();
    if (this.ai) this.ai.update();
  }

  updateGojoPassives() {
    if (this.player && this.player.character.id === 'gojo' && this.enemy) {
      this.player.triggerSpaceRepulsion(this.enemy);
    }
    if (this.enemy && this.enemy.character.id === 'gojo' && this.player) {
      this.enemy.triggerSpaceRepulsion(this.player);
    }
  }

  updateDomainEffects() {
    if (this.infiniteVoidStun > 0) this.infiniteVoidStun--;

    if (this.player && this.player.domainActive && this.player.character.id === 'gojo') {
      const domain = this.player.character.ultimate;
      if (domain && this.player.domainTimer > 0) {
        if (this.player.domainTimer >= domain.duration - domain.stunDuration) {
          if (this.enemy) {
            this.enemy.state = 'stunned';
            this.enemy.stateTimer = 2;
            this.enemy.velocity.x = 0;
            this.enemy.velocity.y = 0;
          }
        }
        if (this.player.domainTimer % 60 === 0) {
          this.player.currentHp = Math.min(this.player.maxHp, this.player.currentHp + domain.allyBuff.healPerSec);
          this.player.cursedEnergy = Math.min(this.player.maxCursedEnergy, this.player.cursedEnergy + domain.allyBuff.energyPerSec);
        }
      }
      if (this.player.domainTimer === 1 && this.enemy) {
        const actualDamage = this.enemy.takeDamage(domain.damage * 2, 0, -8, 20);
        this.addDamageNumber(this.enemy.x, this.enemy.y - 50, actualDamage, '#6c5ce7');
        this.particles.domainEffect('barrierBurst');
        this.particles.screenShake = { intensity: 15, duration: 0.6 };
        this.audio.playDomain();
      }
    }
  }

  updateSpaceRipples() {
    [this.player, this.enemy].forEach(f => {
      if (f && f.character.id === 'gojo' && f.infinityActive && f.state !== 'dead') {
        if (Math.random() < 0.3) this.particles.spaceRipple(f.x, f.y, Date.now());
      }
    });
  }

  updateProjectiles() {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];

      // 茈紫色球体：多阶段处理
      if (p.type === 'purple') {
        this.updatePurpleProjectile(p, i);
        continue;
      }

      p.x += p.vx;
      p.y += p.vy;

      // 苍暗蓝色引力球：多阶段处理
      if (p.type === 'blue') {
        this.updateBlueProjectile(p);
        // 命中坍缩阶段结束后移除
        if (p.phase === 'hit' && p.phaseTimer <= 0) {
          this.projectiles.splice(i, 1);
          continue;
        }
        // 行进阶段才检查边界和命中
        if (p.phase === 'travel') {
          if (p.x < -200 || p.x > this.canvas.width + 200) {
            this.projectiles.splice(i, 1);
            continue;
          }
          const target = p.owner === this.player ? this.enemy : this.player;
          if (target && this.checkProjectileHit(p, target)) {
            this.handleProjectileHit(p, target);
            // 不删除，转为命中坍缩阶段
            p.phase = 'hit';
            p.phaseTimer = 14;
            p.vx = 0;
            p.vy = 0;
          }
        }
        continue;
      }

      // 赫赤红斥力球：多阶段处理（凝聚→行进→爆炸）
      if (p.type === 'red') {
        this.updateRedProjectile(p);
        if (p.phase === 'hit' && p.phaseTimer <= 0) {
          this.projectiles.splice(i, 1);
          continue;
        }
        if (p.phase === 'travel') {
          if (p.x < -200 || p.x > this.canvas.width + 200) {
            this.projectiles.splice(i, 1);
            continue;
          }
          const target = p.owner === this.player ? this.enemy : this.player;
          if (target && this.checkProjectileHit(p, target)) {
            this.handleProjectileHit(p, target);
            p.phase = 'hit';
            p.phaseTimer = 12;
            p.vx = 0;
            p.vy = 0;
          }
        }
        continue;
      }

      if (p.x < -200 || p.x > this.canvas.width + 200 || p.y < -200 || p.y > this.canvas.height + 200) {
        this.projectiles.splice(i, 1);
        continue;
      }

      const target = p.owner === this.player ? this.enemy : this.player;
      if (target && this.checkProjectileHit(p, target)) {
        this.handleProjectileHit(p, target);
        this.projectiles.splice(i, 1);
      }
    }
  }

  // 苍暗蓝色引力球更新（三阶段：凝聚→行进→坍缩）
  updateBlueProjectile(p) {
    const caster = p.owner;
    const target = caster === this.player ? this.enemy : this.player;
    const time = Date.now() * 0.001;

    // 阶段一：凝聚阶段（指尖光点→收缩→空间预畸变→碎片螺旋吸入）
    if (p.phase === 'form') {
      p.phaseTimer--;
      p.x = caster.x + (p.vx > 0 ? 30 : -30);
      p.y = caster.y - 30;

      const t = 1 - p.phaseTimer / 15;
      // 光点先收缩再膨胀为球体（模拟"向内收缩压实"后爆发）
      if (t < 0.35) {
        p.radius = 4 * (1 - t / 0.35);  // 从4px收缩到0
      } else {
        p.radius = Math.min(p.maxRadius, ((t - 0.35) / 0.65) * p.maxRadius);
      }
      p.lensDistortion = Math.min(1, p.lensDistortion + 0.08);
      p.coreAlpha = Math.min(1, p.coreAlpha + 0.09);

      // 螺旋碎片（尘埃/碎屑从周围被吸入）
      if (p.phaseTimer % 2 === 0) {
        this.particles.blueSpiralDebris(p.x, p.y);
      }
      // 气流内涌粒子
      if (p.phaseTimer % 3 === 0) {
        this.particles.blueAirInflow(p.x, p.y);
      }

      if (p.phaseTimer <= 0) {
        p.phase = 'travel';
        p.radius = p.maxRadius;
        p.lensDistortion = 1;
        p.coreAlpha = 1;
        this.particles.gravityLensFlash(p.x, p.y);
        this.particles.screenShake = { intensity: 3, duration: 0.15 };
        this.audio.playBlueSkill();
      }
      return;
    }

    // 阶段二：行进阶段（引力透镜+碎片环绕+引力拉扯）
    if (p.phase === 'travel') {
      p.x += p.vx;
      p.lensDistortion = 0.85 + Math.sin(time * 3) * 0.15;
      p.collapseTimer = (p.collapseTimer || 0) + 1;

      // 碎片环绕球体螺旋
      if (p.collapseTimer % 2 === 0) {
        this.particles.blueSpiralDebris(p.x, p.y);
      }
      // 空间裂隙光纹（边缘溢出碎光）
      if (p.collapseTimer % 5 === 0) {
        const fa = Math.random() * Math.PI * 2;
        this.particles.blueFissure(p.x, p.y, p.radius * 1.1, fa);
      }

      // 引力拉扯敌人（范围内物体被强行拽向球心）
      if (target && target.state !== 'dead') {
        const dx = p.x - target.x;
        const dy = p.y - (target.y - 30);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 250) {
          const force = Math.max(0.5, 3.5 * (1 - dist / 250));
          target.x += (dx > 0 ? 1 : -1) * force * 0.6;
          target.y += (dy > 0 ? 1 : -1) * force * 0.35;
        }
      }
      return;
    }

    // 阶段三：命中坍缩阶段（球体急速收缩，物质被压碎，无向外飞溅）
    if (p.phase === 'hit') {
      p.phaseTimer--;
      const collapseT = 1 - p.phaseTimer / 14;
      p.radius = p.maxRadius * (1 - collapseT * 0.85);
      p.lensDistortion *= 0.8;
      p.coreAlpha *= 0.85;

      // 坍缩粒子（向内汇聚，无向外飞溅）
      this.particles.gravityCollapse(p.x, p.y);
      if (p.phaseTimer % 3 === 0) {
        this.particles.blueCraterEffect(p.x, p.y);
      }
      return;
    }
  }

  // 赫赤红斥力球更新（三阶段：凝聚→行进→爆炸）
  updateRedProjectile(p) {
    const caster = p.owner;
    const target = caster === this.player ? this.enemy : this.player;
    const time = Date.now() * 0.001;

    // 阶段一：凝聚阶段（掌心光点→快速鼓胀→空间向外鼓胀→气浪涟漪）
    if (p.phase === 'form') {
      p.phaseTimer--;
      p.x = caster.x + (p.vx > 0 ? 30 : -30);
      p.y = caster.y - 30;

      const t = 1 - p.phaseTimer / 15;
      // 赫从诞生就向外扩张（与苍收缩相反）：光点从亮白快速膨胀
      p.radius = Math.min(p.maxRadius, t * p.maxRadius * 1.2);
      p.distortion = Math.min(1, p.distortion + 0.08);
      p.coreAlpha = Math.min(1, p.coreAlpha + 0.09);

      // 外扩粒子（光点向外鼓胀）
      if (p.phaseTimer % 2 === 0) {
        this.particles.redFormationParticles(p.x, p.y);
      }
      // 斥力气浪涟漪（向外扩散的环形波纹）
      if (p.phaseTimer % 3 === 0) {
        this.particles.redRepulsionRipple(p.x, p.y);
      }
      // 热浪蒸腾畸变
      if (p.phaseTimer % 4 === 0) {
        this.particles.redHeatHaze(p.x, p.y);
      }

      if (p.phaseTimer <= 0) {
        p.phase = 'travel';
        p.radius = p.maxRadius;
        p.distortion = 1;
        p.coreAlpha = 1;
        this.particles.screenShake = { intensity: 4, duration: 0.2 };
        this.audio.playRedSkill();
      }
      return;
    }

    // 阶段二：行进阶段（膨胀球体+热浪畸变+金色电芒+斥力推开敌人）
    if (p.phase === 'travel') {
      p.x += p.vx;
      p.distortion = 0.85 + Math.sin(time * 3.5) * 0.15;
      p.expandTimer = (p.expandTimer || 0) + 1;

      // 球体持续膨胀（体积变大）
      if (p.radius < p.maxRadius * 1.5) {
        p.radius += 0.15;
      }

      // 斥力波纹（层层叠叠向外扩散）
      if (p.expandTimer % 2 === 0) {
        this.particles.redRepulsionRipple(p.x, p.y);
      }
      // 热浪蒸腾畸变
      if (p.expandTimer % 3 === 0) {
        this.particles.redHeatHaze(p.x, p.y);
      }
      // 金色电芒（空气被电离）
      if (p.expandTimer % 6 === 0) {
        this.particles.redElectricSpark(p.x, p.y);
      }

      // 斥力推开敌人（与苍引力拉扯相反）
      if (target && target.state !== 'dead') {
        const dx = target.x - p.x;
        const dy = (target.y - 30) - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 280) {
          const force = Math.max(0.5, 4 * (1 - dist / 280));
          target.x += (dx > 0 ? 1 : -1) * force * 0.7;
          target.y += (dy > 0 ? 1 : -1) * force * 0.4;
        }
      }
      return;
    }

    // 阶段三：爆炸阶段（向外冲击波+放射状碎片飞溅）
    if (p.phase === 'hit') {
      p.phaseTimer--;
      const explodeT = 1 - p.phaseTimer / 12;
      p.radius = p.maxRadius * (1 + explodeT * 3);  // 急速膨胀

      // 向外爆炸粒子
      this.particles.redOutwardExplosion(p.x, p.y);
      if (p.phaseTimer % 2 === 0) {
        this.particles.redRadialCrater(p.x, p.y);
      }
      // 金色电芒伴随爆炸
      if (p.phaseTimer % 3 === 0) {
        this.particles.redElectricSpark(p.x, p.y);
      }
      return;
    }
  }

  // 茈紫色球体更新
  updatePurpleProjectile(p, idx) {
    const caster = p.owner;
    const target = caster === this.player ? this.enemy : this.player;
    const dir = p.vx > 0 ? 1 : -1;

    // 融合阶段
    if (p.phase === 'fuse') {
      p.phaseTimer--;
      p.x = caster.x + dir * 50;
      p.y = caster.y - 40;

      // 双球逐渐靠近
      const t = 1 - p.phaseTimer / 25;
      p.blueOrb.x = -15 + t * 15;
      p.blueOrb.y = -8 + t * 8;
      p.blueOrb.alpha = 1 - t * 0.3;
      p.redOrb.x = 15 - t * 15;
      p.redOrb.y = 8 - t * 8;
      p.redOrb.alpha = 1 - t * 0.3;

      // 融合闪光
      if (p.phaseTimer <= 8) {
        p.flashAlpha = Math.min(1, (8 - p.phaseTimer) / 8 * 0.9);
        p.radius = Math.min(p.maxRadius, p.radius + 5);
        p.spaceWrinkle = Math.min(1, p.spaceWrinkle + 0.15);
      }

      if (p.phaseTimer <= 0) {
        p.phase = 'travel';
        p.phaseTimer = 0;
        p.flashAlpha = 0;
        p.radius = p.maxRadius * 0.7;
        p.spaceWrinkle = 1;
        this.particles.purpleFusionFlash(p.x, p.y);
        this.particles.screenShake = { intensity: 8, duration: 0.3 };
      }
      return;
    }

    // 行进阶段
    if (p.phase === 'travel') {
      p.x += p.vx;
      p.radius = Math.min(p.maxRadius, p.radius + 0.5);
      p.spaceWrinkle = Math.max(0.6, p.spaceWrinkle - 0.005);

      // 湮灭轨迹
      if (p.phaseTimer % 3 === 0) {
        p.trail.push({ x: p.x, y: p.y, life: 30, maxLife: 30 });
        this.particles.annihilationTrail(p.x, p.y);
      }
      p.phaseTimer++;

      // 清理过期轨迹
      for (let j = p.trail.length - 1; j >= 0; j--) {
        p.trail[j].life--;
        if (p.trail[j].life <= 0) p.trail.splice(j, 1);
      }

      // 命中检测
      if (target) {
        const dx = p.x - target.x;
        const dy = p.y - (target.y - 30);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < p.radius + 30) {
          // 命中：湮灭伤害
          const dmg = p.skill.trueDamage ? p.skill.damage : p.skill.damage;
          const actualDamage = target.takeDamage(dmg, dir * 200, -8, 24);
          this.addDamageNumber(target.x, target.y - 50, actualDamage, '#6c5ce7');
          p.phase = 'hit';
          p.phaseTimer = 10;
          p.vx = 0;
          this.particles.spaceDistortion(target.x, target.y - 30, 15);
          this.particles.screenShake = { intensity: 12, duration: 0.4 };
          this.particles.screenFlash = { color: '#6c5ce7', alpha: 0.4, duration: 0.3 };
          this.audio.playDomain();
        }
      }

      // 出界清理
      if (p.x > this.canvas.width + 200 || p.x < -200) {
        this.projectiles.splice(idx, 1);
      }
      return;
    }

    // 命中消散阶段
    if (p.phase === 'hit') {
      p.phaseTimer--;
      p.radius *= 0.85;
      p.spaceWrinkle *= 0.8;
      if (p.phaseTimer <= 0) {
        this.projectiles.splice(idx, 1);
      }
    }
  }

  checkProjectileHit(proj, target) {
    if (!target || target.state === 'dead') return false;
    const dx = proj.x - target.x;
    const dy = proj.y - (target.y - 30);
    return Math.sqrt(dx * dx + dy * dy) < (proj.size || 6) + 30;
  }

  handleProjectileHit(proj, target) {
    const skill = proj.skill;
    const dir = proj.vx > 0 ? 1 : -1;

    if (skill.type === 'gojo_blue') {
      const actualDamage = target.takeDamage(skill.damage, dir * skill.knockback, -3, skill.hitstun);
      this.addDamageNumber(target.x, target.y - 40, actualDamage, '#0984e3');
      // 引力拉扯敌人向命中点
      target.x += dir * skill.pull * 0.6;
      target.y -= 3;
      if (skill.slowDebuff) target.addBuff('slow', skill.slowDebuff.value, skill.slowDebuff.duration);
      // 坍缩音效
      this.audio.playBlueCollapse();
      this.particles.screenShake = { intensity: 5, duration: 0.25 };
      return;
    }

    if (skill.type === 'gojo_red') {
      const actualDamage = target.takeDamage(skill.damage, dir * skill.knockback, -5, skill.hitstun);
      this.addDamageNumber(target.x, target.y - 40, actualDamage, '#e74c3c');
      if (skill.vulnerabilityDebuff) target.addBuff('defense', skill.vulnerabilityDebuff.value, skill.vulnerabilityDebuff.duration);
      this.audio.playRedImpact();
      this.particles.screenShake = { intensity: 8, duration: 0.35 };
      this.particles.screenFlash = { color: '#e74c3c', alpha: 0.3, duration: 0.2 };
      return;
    }

    const actualDamage = target.takeDamage(skill.damage, proj.vx > 0 ? skill.knockback : -skill.knockback, skill.launch ? -8 : -3, skill.hitstun);
    this.addDamageNumber(target.x, target.y - 40, actualDamage, proj.color);
    this.particles.hitEffect(target.x, target.y - 30, proj.color);
    this.audio.playHit(0.6);
    if (skill.pull) target.x += (proj.x - target.x > 0 ? -1 : 1) * skill.pull;
  }

  playerAttack() {
    if (!this.player || !this.enemy) return;
    const atk = this.player.basicAttack();
    if (!atk) return;

    if (atk.extraEffects && atk.extraEffects.type === 'pull') {
      const dx = this.enemy.x - this.player.x;
      this.enemy.x -= Math.sign(dx) * atk.extraEffects.pullStrength * 0.5;
    }
    if (atk.extraEffects && atk.extraEffects.type === 'dash') {
      const dir = this.player.facingRight ? 1 : -1;
      this.player.x += dir * atk.extraEffects.dashDist * 0.5;
    }
    if (atk.extraEffects && atk.extraEffects.type === 'launch') {
      atk.knockback = atk.knockback * 1.5;
    }
    if (atk.extraEffects && atk.extraEffects.type === 'blackFlash') {
      if (Math.random() < atk.extraEffects.blackFlashChance) {
        atk.damage = Math.round(atk.damage * 2.5);
        this.particles.blackFlashEffect(this.player.x + (this.player.facingRight ? 40 : -40), this.player.y - 30);
        this.audio.playHeavyHit();
        if (this.player.character.id === 'gojo') this.player.blackFlashBoostTimer = 600;
      }
    }

    this.tryHitEnemy(this.player, this.enemy, atk, false);
  }

  playerUseSkill(skillId) {
    if (!this.player) return null;
    const skill = this.player.useSkill(skillId);
    if (!skill) return null;
    this.executeSkill(this.player, this.enemy, skill);
    return skill;
  }

  playerUltimate() {
    if (!this.player) return null;
    if (!this.player.canUseUltimate()) return null;
    const skill = this.player.useUltimate();
    if (!skill) return null;
    if (skill.type === 'domain') {
      this.executeDomain(this.player, this.enemy, skill);
    } else {
      this.executeSkill(this.player, this.enemy, skill);
    }
    return skill;
  }

  playerBarrier() {
    if (!this.player) return false;
    if (!this.player.activateBarrier()) return false;
    this.particles.barrierExpandEffect(this.player.x, this.player.y);
    this.particles.domainEffect('barrierBurst');
    this.audio.playDomain();
    return true;
  }

  playerDodge() {
    if (!this.player || this.player.state === 'hit' || this.player.state === 'dead' || this.player.state === 'stunned') return;
    const dir = this.player.facingRight ? -1 : 1;
    this.player.velocity.x = dir * this.player.speed * 2.5;
    this.player.velocity.y = -6;
    this.player.grounded = false;
    this.player.invincible = true;
    this.player.invincibleTimer = 12;
    this.player.state = 'dodging';
    this.player.stateTimer = 10;

    if (this.player.character.id === 'gojo') {
      this.player.invincibleTimer = 20;
      this.player.cursedEnergy = Math.min(this.player.maxCursedEnergy, this.player.cursedEnergy + 15);
      this.particles.emit(this.player.x, this.player.y - 30, 15, {
        color: '#00d4ff', speed: 6, spread: Math.PI * 2, life: 0.5, size: 4, gravity: -1
      });
    }

    this.particles.dodgeEffect(this.player.x, this.player.y - 30, this.player.character.color);
    this.audio.playDodge();
  }

  executeSkill(caster, target, skill) {
    const dir = caster.facingRight ? 1 : -1;

    if (skill.type === 'gojo_blue') {
      // 苍：暗蓝色高密度引力球（三阶段：凝聚→行进→坍缩）
      const blueProj = {
        x: caster.x + dir * 30,
        y: caster.y - 30,
        vx: dir * skill.projectileSpeed,
        vy: 0,
        owner: caster,
        skill: skill,
        type: 'blue',
        phase: 'form',         // form → travel → hit
        phaseTimer: 15,        // 凝聚阶段帧数
        radius: 0,
        maxRadius: 16,
        debris: [],
        lensDistortion: 0,
        coreAlpha: 0,
        collapseTimer: 0
      };
      this.projectiles.push(blueProj);

      // 指尖光点粒子（咒力在指端凝聚）
      this.particles.emit(caster.x + dir * 25, caster.y - 30, 5, {
        color: '#c8e8ff', speed: 1, spread: Math.PI * 0.2, life: 0.4, size: 2.5, angle: dir > 0 ? 0 : Math.PI
      });
      // 空间预畸变：周边微小粒子被无形引力牵引
      this.particles.blueSpiralDebris(caster.x + dir * 30, caster.y - 30);
      this.particles.blueAirInflow(caster.x + dir * 30, caster.y - 30);
      return;
    }

    if (skill.type === 'gojo_red') {
      // 赫：赤红斥力膨胀球（三阶段：凝聚→行进→爆炸）
      const redProj = {
        x: caster.x + dir * 30,
        y: caster.y - 30,
        vx: dir * skill.projectileSpeed,
        vy: 0,
        owner: caster,
        skill: skill,
        type: 'red',
        phase: 'form',         // form → travel → hit
        phaseTimer: 15,        // 凝聚阶段帧数
        radius: 0,
        maxRadius: 18,         // 赫比苍略大（向外扩张）
        distortion: 0,         // 斥力畸变强度
        coreAlpha: 0,
        expandTimer: 0
      };
      this.projectiles.push(redProj);

      // 掌心光点粒子（炽亮赤红，从诞生就向外扩张）
      this.particles.emit(caster.x + dir * 25, caster.y - 30, 6, {
        color: '#ff6666', speed: 2, spread: Math.PI * 0.3, life: 0.35, size: 3, angle: dir > 0 ? 0 : Math.PI
      });
      this.particles.emit(caster.x + dir * 25, caster.y - 30, 4, {
        color: '#ffffff', speed: 1, spread: Math.PI * 0.2, life: 0.25, size: 2, angle: dir > 0 ? 0 : Math.PI
      });
      // 空间向外鼓胀：周边粒子被斥力推开
      this.particles.redRepulsionRipple(caster.x + dir * 30, caster.y - 30);
      return;
    }

    if (skill.type === 'gojo_purple') {
      // 茈：发射紫色假想质量球体（多阶段特效）
      const purpleProj = {
        x: caster.x + dir * 50,
        y: caster.y - 40,
        vx: dir * 6,
        vy: 0,
        owner: caster,
        skill: skill,
        type: 'purple',
        phase: 'fuse',        // fuse → travel → hit
        phaseTimer: 25,       // 融合阶段帧数
        radius: 0,            // 当前半径（动态增长）
        maxRadius: 45,        // 最大半径
        trail: [],            // 湮灭轨迹
        spaceWrinkle: 0,      // 空间褶皱强度
        blueOrb: { x: 0, y: 0, alpha: 1 },
        redOrb: { x: 0, y: 0, alpha: 1 },
        flashAlpha: 0
      };
      this.projectiles.push(purpleProj);

      // 前置特效：苍/赫双球凝聚
      this.particles.purplePreFusion(caster.x + dir * 30, caster.y - 40, 'blue');
      this.particles.purplePreFusion(caster.x + dir * 30, caster.y - 40, 'red');
      this.audio.playDomain();
      return;
    }

    if (skill.projectile) {
      this.projectiles.push({
        x: caster.x + dir * 30, y: caster.y - 30, vx: dir * skill.projectileSpeed, vy: 0,
        owner: caster, skill: skill, color: skill.projectileColor, size: 6
      });
      this.particles.emit(caster.x + dir * 30, caster.y - 30, 5, {
        color: skill.projectileColor, speed: 2, spread: Math.PI * 0.3, life: 0.3, size: 3, angle: dir > 0 ? 0 : Math.PI
      });
    } else if (skill.fullScreen) {
      if (target) {
        const actualDamage = target.takeDamage(skill.damage, dir * 200, -6, 24);
        this.addDamageNumber(target.x, target.y - 50, actualDamage, '#6c5ce7');
      }
      this.particles.domainEffect(skill.screenEffect);
      this.audio.playDomain();
    } else if (skill.type === 'domain' || skill.screenEffect) {
      if (target) {
        const actualDamage = target.takeDamage(skill.damage, dir * 180, -8, 20);
        this.addDamageNumber(target.x, target.y - 50, actualDamage, '#6c5ce7');
      }
      this.particles.domainEffect(skill.screenEffect);
      this.audio.playDomain();
    } else {
      this.tryHitEnemy(caster, target, skill, true);
    }
  }

  executeDomain(caster, target, domain) {
    this.particles.domainEffect(domain.screenEffect);
    this.audio.playDomain();
    this.particles.screenShake = { intensity: 10, duration: 0.5 };
    this.particles.screenFlash = { color: '#ffffff', alpha: 0.7, duration: 0.8 };
    if (target) {
      const actualDamage = target.takeDamage(domain.damage, 0, 0, 30);
      this.addDamageNumber(target.x, target.y - 50, actualDamage, '#ffffff');
    }
    this.infiniteVoidStun = domain.stunDuration;
  }

  tryHitEnemy(attacker, target, attackData, isSkill) {
    if (!target) return;
    const dx = target.x - attacker.x;
    const dy = (target.y - 30) - (attacker.y - 30);
    const dist = Math.abs(dx);
    const range = attackData.range || attacker.getAttackRange();

    if (dist > range + 20) return;
    if (Math.abs(dy) > 60) return;

    const facingTarget = (dx > 0 && attacker.facingRight) || (dx < 0 && !attacker.facingRight);
    if (!facingTarget && dist > 30) return;

    const dir = attacker.facingRight ? 1 : -1;
    let dmg = attackData.damage;
    if (isSkill && attackData.critChance && Math.random() < attackData.critChance) {
      dmg = Math.round(dmg * attackData.critMultiplier);
      this.particles.blackFlashEffect(target.x, target.y - 30);
      this.audio.playHeavyHit();
    }

    const actualDamage = target.takeDamage(dmg, dir * (attackData.knockback || 60), isSkill ? -4 : -2, attackData.hitstun || 10);

    if (actualDamage === -1) {
      this.addDamageNumber(target.x, target.y - 40, 0, '#00d4ff');
      this.particles.reviveShockwave(target.x, target.y);
      this.audio.playDomain();
      attacker.knockback.x = -dir * 200;
      attacker.knockback.y = -6;
      attacker.state = 'hit';
      attacker.stateTimer = 12;
      return;
    }

    this.addDamageNumber(target.x, target.y - 40, actualDamage, isSkill ? '#ff6b35' : '#ffffff');
    attacker.totalDamage += actualDamage;

    if (isSkill) {
      this.particles.slashEffect(target.x, target.y - 30, dir > 0 ? 'right' : 'left', attacker.character.color);
      this.audio.playHeavyHit();
    } else {
      this.particles.hitEffect(target.x, target.y - 30, '#ffffff');
      this.audio.playHit(attackData.comboIndex ? attackData.comboIndex / 3 : 0.3);
    }

    attacker.comboCount++;
    attacker.comboTimer = 45;
    if (attacker.comboCount > 2) {
      this.comboDisplay = { text: attacker.comboCount + ' HIT!', timer: 40, damage: attacker.comboCount * 5 };
    }
  }

  checkAIAttack() {
    if (!this.enemy || !this.player) return;
    if (this.enemy.state !== 'attacking' && this.enemy.state !== 'casting') return;

    if (this.enemy.state === 'casting') this.handleAISkill();
    if (this.enemy.state === 'attacking') {
      const atk = this.enemy.character.basicAttack;
      const fakeAtk = {
        damage: atk.comboDamage[Math.min(this.enemy.comboCount, atk.comboCount - 1)],
        range: atk.range, knockback: atk.knockback, ranged: atk.ranged || false,
        comboIndex: Math.min(this.enemy.comboCount, atk.comboCount - 1)
      };
      this.tryHitEnemy(this.enemy, this.player, fakeAtk, false);
    }
  }

  handleAISkill() {
    const f = this.enemy;
    if (!f) return;
    for (const skill of f.character.skills) {
      if (f.cooldowns[skill.id] === skill.cooldown && f.state === 'casting') {
        this.executeSkill(f, this.player, skill);
        break;
      }
    }
    if (f.domainActive && f.domainTimer > 0 && this.player) {
      if (f.domainTimer % 15 === 0) {
        const actualDamage = this.player.takeDamage(30, 0, 0, 10);
        this.addDamageNumber(this.player.x, this.player.y - 40, actualDamage, '#6c5ce7');
        this.particles.hitEffect(this.player.x, this.player.y - 30, f.character.color);
      }
    }
  }

  addDamageNumber(x, y, damage, color) {
    this.damageNumbers.push({ x: x + (Math.random() - 0.5) * 30, y, text: damage.toString(), color, life: 40, maxLife: 40 });
  }

  updateDamageNumbers() {
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      this.damageNumbers[i].y -= 1.5;
      this.damageNumbers[i].life--;
      if (this.damageNumbers[i].life <= 0) this.damageNumbers.splice(i, 1);
    }
  }

  applyBoundaries() {
    const margin = 40;
    [this.player, this.enemy].forEach(f => {
      if (!f) return;
      f.x = Math.max(margin, Math.min(this.canvas.width - margin, f.x));
      if (f.y > this.groundY) { f.y = this.groundY; f.velocity.y = 0; f.grounded = true; }
      if (f.y < -200) { f.y = -200; f.velocity.y = 0; }
    });
  }

  applyGravity() {
    [this.player, this.enemy].forEach(f => {
      if (f && f.y < this.groundY) f.grounded = false;
    });
  }

  draw(ctx) {
    this.drawProjectiles(ctx);
    this.drawDamageNumbers(ctx);
  }

  drawProjectiles(ctx) {
    for (const p of this.projectiles) {
      if (p.type === 'purple') {
        this.drawPurpleSphere(ctx, p);
        continue;
      }
      ctx.save();
      if (p.type === 'blue') {
        if (p.phase === 'form') {
          this.drawBlueForming(ctx, p);
        } else {
          this.drawBlueSphere(ctx, p);
        }
      } else if (p.type === 'red') {
        if (p.phase === 'form') {
          this.drawRedForming(ctx, p);
        } else {
          this.drawRedSphere(ctx, p);
        }
      } else {
        ctx.fillStyle = p.color; ctx.globalAlpha = 0.3;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1; ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  }

  drawDamageNumbers(ctx) {
    ctx.save();
    for (const dn of this.damageNumbers) {
      const alpha = dn.life / dn.maxLife;
      const scale = 1 + (1 - alpha) * 0.5;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = dn.color;
      ctx.font = `bold ${Math.round(18 * scale)}px "Noto Sans SC", sans-serif`;
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#000000'; ctx.lineWidth = 3;
      ctx.strokeText(dn.text, dn.x, dn.y);
      ctx.fillText(dn.text, dn.x, dn.y);
    }
    ctx.restore();
  }

  // 苍暗蓝色引力球绘制（深邃暗蓝+引力透镜+向内坍缩+空间裂隙）
  drawBlueSphere(ctx, p) {
    const time = Date.now() * 0.001;
    const r = p.radius || p.size || 10;
    const cx = p.x;
    const cy = p.y;

    // ── 引力透镜光晕（球体外围空间扭曲，光照弯折） ──
    const lensR = r * 4;
    const lensGrad = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, lensR);
    lensGrad.addColorStop(0, 'rgba(9, 132, 227, 0)');
    lensGrad.addColorStop(0.25, `rgba(9, 132, 227, ${p.lensDistortion * 0.15})`);
    lensGrad.addColorStop(0.5, `rgba(5, 50, 120, ${p.lensDistortion * 0.08})`);
    lensGrad.addColorStop(0.75, `rgba(3, 20, 60, ${p.lensDistortion * 0.04})`);
    lensGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = lensGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, lensR, 0, Math.PI * 2);
    ctx.fill();

    // 引力透镜光线弯折弧线（模拟背景景物被扭曲）
    if (p.lensDistortion > 0.4) {
      ctx.strokeStyle = `rgba(9, 132, 227, ${p.lensDistortion * 0.25})`;
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 6; i++) {
        const a = time * 1.8 + i * Math.PI * 2 / 6;
        const bendR = r * (1.4 + Math.sin(time * 2.5 + i) * 0.4);
        ctx.beginPath();
        ctx.arc(cx, cy, bendR, a, a + Math.PI * 0.3);
        ctx.stroke();
      }
      // 外层褶皱弧线
      ctx.strokeStyle = `rgba(5, 80, 160, ${p.lensDistortion * 0.12})`;
      ctx.lineWidth = 0.8;
      for (let i = 0; i < 4; i++) {
        const a = time * 1.2 + i * Math.PI / 2;
        const bendR = r * (2.0 + Math.sin(time * 1.8 + i * 1.5) * 0.5);
        ctx.beginPath();
        ctx.arc(cx, cy, bendR, a, a + Math.PI * 0.35);
        ctx.stroke();
      }
    }

    // ── 核心球体：深邃暗蓝渐变（墨蓝近乎发黑→淡蓝光晕） ──
    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    coreGrad.addColorStop(0, 'rgba(2, 5, 20, 0.97)');       // 中心：墨蓝近乎发黑
    coreGrad.addColorStop(0.15, 'rgba(3, 15, 50, 0.95)');
    coreGrad.addColorStop(0.3, 'rgba(5, 40, 100, 0.85)');
    coreGrad.addColorStop(0.55, 'rgba(8, 70, 160, 0.65)');
    coreGrad.addColorStop(0.75, 'rgba(9, 110, 210, 0.35)');
    coreGrad.addColorStop(0.9, 'rgba(9, 140, 230, 0.12)');
    coreGrad.addColorStop(1, 'rgba(9, 132, 227, 0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // ── 向内坍缩的咒力纹理（表面流动，向中心收敛） ──
    ctx.strokeStyle = 'rgba(9, 132, 227, 0.45)';
    ctx.lineWidth = 1.3;
    for (let i = 0; i < 6; i++) {
      const a = time * 2.2 + i * Math.PI * 2 / 6;
      const innerR = r * (0.25 + 0.45 * (1 - Math.abs(Math.sin(time * 1.8 + i))));
      ctx.beginPath();
      ctx.arc(cx, cy, innerR, a, a + Math.PI * 0.35);
      ctx.stroke();
    }

    // 表面向内收敛的次级纹理
    ctx.strokeStyle = 'rgba(9, 132, 227, 0.2)';
    ctx.lineWidth = 0.7;
    for (let i = 0; i < 4; i++) {
      const a = time * 1.5 + i * Math.PI / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.7, a, a + Math.PI * 0.25);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.5, a + Math.PI * 0.3, a + Math.PI * 0.55);
      ctx.stroke();
    }

    // ── 淡蓝光晕边缘（薄而透亮） ──
    const edgeGrad = ctx.createRadialGradient(cx, cy, r * 0.65, cx, cy, r * 1.2);
    edgeGrad.addColorStop(0, 'rgba(9, 132, 227, 0)');
    edgeGrad.addColorStop(0.5, 'rgba(9, 150, 240, 0.18)');
    edgeGrad.addColorStop(0.8, 'rgba(9, 160, 250, 0.08)');
    edgeGrad.addColorStop(1, 'rgba(9, 132, 227, 0)');
    ctx.fillStyle = edgeGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.2, 0, Math.PI * 2);
    ctx.fill();

    // ── 空间裂隙光纹（边缘溢出的细碎淡蓝碎光） ──
    if (p.lensDistortion > 0.6) {
      ctx.strokeStyle = `rgba(100, 200, 255, ${p.lensDistortion * 0.4})`;
      ctx.lineWidth = 0.6;
      for (let i = 0; i < 8; i++) {
        const a = time * 4 + i * Math.PI * 2 / 8;
        const fissureLen = r * (0.08 + Math.abs(Math.sin(time * 3 + i * 1.7)) * 0.15);
        const sx = cx + Math.cos(a) * r * 0.95;
        const sy = cy + Math.sin(a) * r * 0.95;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + Math.cos(a) * fissureLen * r, sy + Math.sin(a) * fissureLen * r);
        ctx.stroke();
      }
    }

    // ── 中心微亮白点（高密度核心） ──
    ctx.fillStyle = 'rgba(160, 200, 255, 0.7)';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }

  // 苍凝聚阶段绘制（指尖光点→空间预畸变→光线向内弯折）
  drawBlueForming(ctx, p) {
    const time = Date.now() * 0.001;
    const t = 1 - p.phaseTimer / 15;
    const cx = p.x;
    const cy = p.y;
    const r = Math.max(1, p.radius);

    // ── 空间预畸变光晕（向内凹陷的扭曲区域） ──
    const preDistR = r * 6;
    const preGrad = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, preDistR);
    preGrad.addColorStop(0, `rgba(9, 132, 227, ${t * 0.25})`);
    preGrad.addColorStop(0.3, `rgba(5, 60, 140, ${t * 0.15})`);
    preGrad.addColorStop(0.6, `rgba(3, 20, 60, ${t * 0.08})`);
    preGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = preGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, preDistR, 0, Math.PI * 2);
    ctx.fill();

    // ── 向内收缩的光线（光线向中心弯折） ──
    ctx.strokeStyle = `rgba(9, 132, 227, ${t * 0.55})`;
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 8; i++) {
      const a = time * 3.5 + i * Math.PI / 4;
      const outerR = r * 3.5 * (1 - t * 0.6);
      const innerR = r * 0.8 * t;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * outerR, cy + Math.sin(a) * outerR);
      ctx.lineTo(cx + Math.cos(a) * innerR, cy + Math.sin(a) * innerR);
      ctx.stroke();
    }

    // 弯折弧线（光线不是直线，而是被引力弯曲）
    ctx.strokeStyle = `rgba(9, 160, 240, ${t * 0.3})`;
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 4; i++) {
      const a = time * 2 + i * Math.PI / 2;
      const bendR = r * 2.5 * (1 - t * 0.3);
      ctx.beginPath();
      ctx.arc(cx, cy, bendR, a, a + Math.PI * 0.3);
      ctx.stroke();
    }

    // ── 指尖光点（核心收缩中的咒力光点） ──
    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.5);
    if (t < 0.35) {
      // 收缩阶段：光点从亮白缩小到微蓝
      const shrinkT = t / 0.35;
      coreGrad.addColorStop(0, `rgba(220, 240, 255, ${1 - shrinkT * 0.5})`);
      coreGrad.addColorStop(0.3, `rgba(9, 132, 227, ${(1 - shrinkT) * 0.9})`);
      coreGrad.addColorStop(0.7, `rgba(5, 60, 140, ${(1 - shrinkT) * 0.5})`);
      coreGrad.addColorStop(1, 'rgba(9, 132, 227, 0)');
    } else {
      // 膨胀阶段：球体形成，暗蓝核心
      coreGrad.addColorStop(0, 'rgba(180, 220, 255, 0.8)');
      coreGrad.addColorStop(0.2, 'rgba(9, 132, 227, 0.7)');
      coreGrad.addColorStop(0.5, 'rgba(5, 40, 100, 0.5)');
      coreGrad.addColorStop(1, 'rgba(9, 132, 227, 0)');
    }
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 赫赤红斥力球绘制（炽亮赤红+向外翻涌+热浪畸变+金色电芒）
  drawRedSphere(ctx, p) {
    const time = Date.now() * 0.001;
    const r = p.radius || p.size || 10;
    const cx = p.x;
    const cy = p.y;

    // ── 斥力空间畸变光晕（热浪蒸腾般的扭曲，向外撑开） ──
    const distR = r * 4.5;
    const distGrad = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, distR);
    distGrad.addColorStop(0, 'rgba(231, 76, 60, 0)');
    distGrad.addColorStop(0.2, `rgba(231, 76, 60, ${p.distortion * 0.2})`);
    distGrad.addColorStop(0.45, `rgba(255, 100, 35, ${p.distortion * 0.12})`);
    distGrad.addColorStop(0.7, `rgba(200, 40, 20, ${p.distortion * 0.06})`);
    distGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = distGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, distR, 0, Math.PI * 2);
    ctx.fill();

    // 热浪蒸腾扭曲弧线（向外撑开，光线被斥力推出）
    if (p.distortion > 0.4) {
      ctx.strokeStyle = `rgba(255, 80, 40, ${p.distortion * 0.3})`;
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 6; i++) {
        const a = time * 2 + i * Math.PI * 2 / 6;
        const bendR = r * (1.3 + Math.sin(time * 2.5 + i) * 0.5);
        ctx.beginPath();
        ctx.arc(cx, cy, bendR, a, a + Math.PI * 0.3);
        ctx.stroke();
      }
      // 外层扩张褶皱
      ctx.strokeStyle = `rgba(255, 120, 60, ${p.distortion * 0.15})`;
      ctx.lineWidth = 0.8;
      for (let i = 0; i < 4; i++) {
        const a = time * 1.5 + i * Math.PI / 2;
        const bendR = r * (2.2 + Math.sin(time * 2 + i * 1.5) * 0.6);
        ctx.beginPath();
        ctx.arc(cx, cy, bendR, a, a + Math.PI * 0.4);
        ctx.stroke();
      }
    }

    // ── 核心球体：炽亮赤红渐变（核心白→赤红→橘红→透明） ──
    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');     // 核心：亮至发白
    coreGrad.addColorStop(0.1, 'rgba(255, 240, 220, 0.9)');
    coreGrad.addColorStop(0.25, 'rgba(255, 80, 40, 0.85)');    // 赤红
    coreGrad.addColorStop(0.5, 'rgba(231, 50, 30, 0.7)');
    coreGrad.addColorStop(0.7, 'rgba(200, 30, 15, 0.45)');     // 橘红
    coreGrad.addColorStop(0.88, 'rgba(255, 80, 30, 0.15)');
    coreGrad.addColorStop(1, 'rgba(231, 76, 60, 0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // ── 向外翻涌的咒力纹理（放射状，持续向外扩张） ──
    ctx.strokeStyle = 'rgba(255, 120, 60, 0.5)';
    ctx.lineWidth = 1.3;
    for (let i = 0; i < 7; i++) {
      const a = time * 2.5 + i * Math.PI * 2 / 7;
      const outerR = r * (0.4 + 0.5 * Math.abs(Math.sin(time * 2 + i)));
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, a, a + Math.PI * 0.3);
      ctx.stroke();
    }

    // 次级放射纹理
    ctx.strokeStyle = 'rgba(255, 180, 100, 0.25)';
    ctx.lineWidth = 0.7;
    for (let i = 0; i < 4; i++) {
      const a = time * 1.8 + i * Math.PI / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.65, a, a + Math.PI * 0.25);
      ctx.stroke();
    }

    // ── 斥力波纹（边缘层层叠叠的红色波纹） ──
    for (let i = 0; i < 3; i++) {
      const rippleR = r * (0.95 + i * 0.25 + Math.sin(time * 4 + i) * 0.1);
      ctx.strokeStyle = `rgba(255, 60, 30, ${0.3 - i * 0.08})`;
      ctx.lineWidth = 1.5 - i * 0.3;
      ctx.beginPath();
      ctx.arc(cx, cy, rippleR, 0, Math.PI * 2);
      ctx.stroke();
    }

    // ── 金色电芒（空气电离迸发的电火花） ──
    if (p.distortion > 0.5) {
      ctx.strokeStyle = `rgba(255, 215, 0, ${p.distortion * 0.5})`;
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 5; i++) {
        const a = time * 6 + i * Math.PI * 2 / 5;
        const sx = cx + Math.cos(a) * r * 0.9;
        const sy = cy + Math.sin(a) * r * 0.9;
        const ex = sx + Math.cos(a) * r * 0.3 + (Math.random() - 0.5) * 8;
        const ey = sy + Math.sin(a) * r * 0.3 + (Math.random() - 0.5) * 8;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      }
    }

    // ── 核心白点（最亮中心） ──
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }

  // 赫凝聚阶段绘制（掌心光点→快速鼓胀→空间向外鼓胀）
  drawRedForming(ctx, p) {
    const time = Date.now() * 0.001;
    const t = 1 - p.phaseTimer / 15;
    const cx = p.x;
    const cy = p.y;
    const r = Math.max(1, p.radius);

    // ── 空间向外鼓胀光晕（斥力撑开空间） ──
    const preDistR = r * 6;
    const preGrad = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, preDistR);
    preGrad.addColorStop(0, `rgba(255, 60, 30, ${t * 0.3})`);
    preGrad.addColorStop(0.3, `rgba(231, 40, 20, ${t * 0.18})`);
    preGrad.addColorStop(0.6, `rgba(180, 20, 10, ${t * 0.1})`);
    preGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = preGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, preDistR, 0, Math.PI * 2);
    ctx.fill();

    // ── 向外撑开的光线（光线被斥力推出弯折） ──
    ctx.strokeStyle = `rgba(255, 80, 40, ${t * 0.6})`;
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 8; i++) {
      const a = time * 3.5 + i * Math.PI / 4;
      const innerR = r * 0.5 * t;
      const outerR = r * 3.5 * (t * 0.7 + 0.3);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * innerR, cy + Math.sin(a) * innerR);
      ctx.lineTo(cx + Math.cos(a) * outerR, cy + Math.sin(a) * outerR);
      ctx.stroke();
    }

    // 外扩弧线（光线被斥力推出后的弯曲）
    ctx.strokeStyle = `rgba(255, 120, 60, ${t * 0.35})`;
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 4; i++) {
      const a = time * 2 + i * Math.PI / 2;
      const bendR = r * 2.5 * (t * 0.6 + 0.4);
      ctx.beginPath();
      ctx.arc(cx, cy, bendR, a, a + Math.PI * 0.3);
      ctx.stroke();
    }

    // ── 掌心光点（炽亮赤红，从诞生就向外扩张） ──
    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.5);
    coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    coreGrad.addColorStop(0.15, 'rgba(255, 200, 150, 0.8)');
    coreGrad.addColorStop(0.4, `rgba(255, 60, 30, ${t * 0.8})`);
    coreGrad.addColorStop(0.7, `rgba(231, 30, 20, ${t * 0.5})`);
    coreGrad.addColorStop(1, 'rgba(231, 76, 60, 0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 茈紫色球体绘制
  drawPurpleSphere(ctx, p) {
    const time = Date.now() * 0.001;

    // 融合阶段：绘制双球
    if (p.phase === 'fuse') {
      this.drawFusionOrbs(ctx, p, time);
      return;
    }

    // 行进/命中阶段：绘制湮灭轨迹
    this.drawAnnihilationTrail(ctx, p);

    // 空间扭曲光晕（球体外围）
    if (p.spaceWrinkle > 0.01) {
      const wrinkleR = p.radius * 2.5;
      const wrinkleGrad = ctx.createRadialGradient(p.x, p.y, p.radius * 0.8, p.x, p.y, wrinkleR);
      wrinkleGrad.addColorStop(0, 'rgba(108, 92, 231, 0)');
      wrinkleGrad.addColorStop(0.4, `rgba(108, 92, 231, ${p.spaceWrinkle * 0.15})`);
      wrinkleGrad.addColorStop(0.7, `rgba(162, 155, 254, ${p.spaceWrinkle * 0.08})`);
      wrinkleGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = wrinkleGrad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, wrinkleR, 0, Math.PI * 2);
      ctx.fill();
    }

    // 空间褶皱线条
    if (p.spaceWrinkle > 0.3) {
      ctx.strokeStyle = `rgba(162, 155, 254, ${p.spaceWrinkle * 0.3})`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        const angle = time * 2 + i * Math.PI / 3;
        const r = p.radius * (1.2 + Math.sin(time * 3 + i) * 0.3);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, angle, angle + Math.PI * 0.4);
        ctx.stroke();
      }
    }

    // 核心球体
    const r = p.radius;
    const coreGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    coreGrad.addColorStop(0.15, 'rgba(220, 200, 255, 0.9)');
    coreGrad.addColorStop(0.4, 'rgba(108, 92, 231, 0.85)');
    coreGrad.addColorStop(0.7, 'rgba(60, 30, 120, 0.7)');
    coreGrad.addColorStop(0.9, 'rgba(30, 10, 60, 0.5)');
    coreGrad.addColorStop(1, 'rgba(10, 5, 30, 0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();

    // 蓝红能量在球体表面碰撞
    const blueX = p.x + Math.cos(time * 4) * r * 0.5;
    const blueY = p.y + Math.sin(time * 4) * r * 0.5;
    const bg = ctx.createRadialGradient(blueX, blueY, 0, blueX, blueY, r * 0.4);
    bg.addColorStop(0, 'rgba(9, 132, 227, 0.6)');
    bg.addColorStop(1, 'rgba(9, 132, 227, 0)');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();

    const redX = p.x + Math.cos(time * 4 + Math.PI) * r * 0.5;
    const redY = p.y + Math.sin(time * 4 + Math.PI) * r * 0.5;
    const rg = ctx.createRadialGradient(redX, redY, 0, redX, redY, r * 0.35);
    rg.addColorStop(0, 'rgba(231, 76, 60, 0.5)');
    rg.addColorStop(1, 'rgba(231, 76, 60, 0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();

    // 咒力纹理（流动纹路）
    ctx.strokeStyle = 'rgba(200, 180, 255, 0.3)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      const a = time * 1.5 + i * Math.PI / 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 0.7, a, a + Math.PI * 0.25);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 0.5, a + Math.PI * 0.3, a + Math.PI * 0.55);
      ctx.stroke();
    }

    // 核心白点
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  // 融合阶段双球绘制
  drawFusionOrbs(ctx, p, time) {
    const cx = p.x;
    const cy = p.y;

    // 苍：暗蓝色高密度光球
    const bx = cx + p.blueOrb.x;
    const by = cy + p.blueOrb.y;
    const blueGrad = ctx.createRadialGradient(bx, by, 0, bx, by, 14);
    blueGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    blueGrad.addColorStop(0.2, 'rgba(9, 132, 227, 0.8)');
    blueGrad.addColorStop(0.5, 'rgba(5, 80, 160, 0.5)');
    blueGrad.addColorStop(1, 'rgba(0, 20, 80, 0)');
    ctx.fillStyle = blueGrad;
    ctx.globalAlpha = p.blueOrb.alpha;
    ctx.beginPath();
    ctx.arc(bx, by, 14, 0, Math.PI * 2);
    ctx.fill();

    // 苍：光线向内弯折效果
    ctx.strokeStyle = `rgba(9, 132, 227, ${p.blueOrb.alpha * 0.5})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const a = time * 2 + i * Math.PI * 2 / 3;
      ctx.beginPath();
      ctx.arc(bx, by, 10, a, a + Math.PI * 0.3);
      ctx.stroke();
    }

    // 赫：赤红色膨胀光球
    const rx = cx + p.redOrb.x;
    const ry = cy + p.redOrb.y;
    const redGrad = ctx.createRadialGradient(rx, ry, 0, rx, ry, 14);
    redGrad.addColorStop(0, 'rgba(255, 255, 200, 0.9)');
    redGrad.addColorStop(0.2, 'rgba(231, 76, 60, 0.8)');
    redGrad.addColorStop(0.5, 'rgba(180, 30, 20, 0.5)');
    redGrad.addColorStop(1, 'rgba(80, 10, 0, 0)');
    ctx.fillStyle = redGrad;
    ctx.globalAlpha = p.redOrb.alpha;
    ctx.beginPath();
    ctx.arc(rx, ry, 14, 0, Math.PI * 2);
    ctx.fill();

    // 赫：向外鼓胀波纹
    ctx.strokeStyle = `rgba(231, 76, 60, ${p.redOrb.alpha * 0.5})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const a = time * 2 + i * Math.PI * 2 / 3;
      const rippleR = 10 + Math.sin(time * 3 + i) * 3;
      ctx.beginPath();
      ctx.arc(rx, ry, rippleR, a, a + Math.PI * 0.3);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;

    // 融合闪光
    if (p.flashAlpha > 0.01) {
      const flashGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 25);
      flashGrad.addColorStop(0, `rgba(255, 255, 255, ${p.flashAlpha})`);
      flashGrad.addColorStop(0.5, `rgba(200, 150, 255, ${p.flashAlpha * 0.5})`);
      flashGrad.addColorStop(1, 'rgba(108, 92, 231, 0)');
      ctx.fillStyle = flashGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 25, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 湮灭轨迹绘制
  drawAnnihilationTrail(ctx, p) {
    for (const t of p.trail) {
      const alpha = t.life / t.maxLife;
      const r = p.radius * 0.8 * alpha;
      if (r < 1) continue;
      const grad = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, r);
      grad.addColorStop(0, `rgba(108, 92, 231, ${alpha * 0.4})`);
      grad.addColorStop(0.5, `rgba(60, 30, 120, ${alpha * 0.2})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  reset() {
    this.projectiles = [];
    this.hitEffects = [];
    this.damageNumbers = [];
    this.comboDisplay = { text: '', timer: 0, damage: 0 };
    this.domainActive = false;
    this.domainTimer = 0;
    this.infiniteVoidStun = 0;
  }
}