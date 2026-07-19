// 战斗单位逻辑
class Fighter {
  constructor(character, x, y, facingRight, isPlayer) {
    this.character = character;
    this.x = x;
    this.y = y;
    this.facingRight = facingRight;
    this.isPlayer = isPlayer;

    // 属性
    this.maxHp = character.maxHp;
    this.currentHp = character.maxHp;
    this.attack = character.attack;
    this.defense = character.defense;
    this.speed = character.speed;
    this.maxCursedEnergy = character.maxCursedEnergy;
    this.cursedEnergy = character.maxCursedEnergy * 0.5;
    this.energyRegen = character.energyRegen;

    // 状态
    this.state = 'idle'; // idle, moving, attacking, hit, blocking, casting, dodging, dead, stunned
    this.stateTimer = 0;
    this.velocity = { x: 0, y: 0 };
    this.grounded = false;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.lastAttackTime = 0;

    // 冷却
    this.cooldowns = {};
    this.character.skills.forEach(s => {
      this.cooldowns[s.id] = 0;
    });
    this.cooldowns[this.character.ultimate.id] = 0;

    // Buff
    this.buffs = [];
    this.invincible = false;
    this.invincibleTimer = 0;
    this.stealthTimer = 0;

    // 动画
    this.animFrame = 0;
    this.animTimer = 0;
    this.hitFlash = 0;

    // 受击
    this.knockback = { x: 0, y: 0 };

    // 领域展开状态
    this.domainActive = false;
    this.domainTimer = 0;

    // 统计
    this.totalDamage = 0;
    this.comboMax = 0;

    // ====== 五条悟专属被动 ======
    // 无下限术式：空间屏障
    if (character.infinityBarrier) {
      this.infinityActive = true;          // 屏障是否激活
      this.infinityTimer = 0;              // 屏障持续时间
      this.infinityCooldown = 0;           // 屏障冷却
      this.spaceRepulsionReady = true;     // 空间斥力就绪
      this.spaceRepulsionCooldown = 0;     // 斥力冷却
      this.barrierActive = false;          // 手动屏障全开
      this.barrierTimer = 0;               // 手动屏障剩余时间
      this.barrierCooldown = 0;            // 手动屏障冷却
    }

    // 六眼
    if (character.energyCostReduction) {
      this.sixEyesActive = true;
      this.sixEyesBurstTimer = 0;          // 六眼强化剩余时间
      this.blackFlashBoostTimer = 0;       // 黑闪boost剩余时间
    }

    // 反转术式
    if (character.reverseCursed) {
      this.reverseCursedActive = true;
      this.reviveUsed = false;             // 是否已复活
      this.healTimer = 0;                  // 持续回血计时
    }

    // 苍/赫 释放追踪（虚式茈前置条件）
    this.blueUsed = false;
    this.redUsed = false;
  }

  update() {
    const dt = 1 / 60;
    const isGojo = this.character.id === 'gojo';

    // 咒力恢复
    if (this.cursedEnergy < this.maxCursedEnergy) {
      let regen = this.energyRegen;
      if (isGojo && this.blackFlashBoostTimer > 0) {
        regen *= 2; // 黑闪boost：咒力回复翻倍
      }
      this.cursedEnergy = Math.min(this.maxCursedEnergy, this.cursedEnergy + regen);
    }

    // 冷却递减
    Object.keys(this.cooldowns).forEach(key => {
      if (this.cooldowns[key] > 0) {
        this.cooldowns[key] = Math.max(0, this.cooldowns[key] - 1);
      }
    });

    // 状态计时器
    if (this.stateTimer > 0) {
      this.stateTimer--;
      if (this.stateTimer <= 0 && (this.state === 'hit' || this.state === 'attacking' || this.state === 'casting' || this.state === 'stunned')) {
        this.state = 'idle';
      }
    }

    // 无敌计时器
    if (this.invincibleTimer > 0) {
      this.invincibleTimer--;
      if (this.invincibleTimer <= 0) this.invincible = false;
    }

    // 隐身计时器
    if (this.stealthTimer > 0) {
      this.stealthTimer--;
    }

    // 受击闪烁
    if (this.hitFlash > 0) this.hitFlash--;

    // Buff 计时器
    for (let i = this.buffs.length - 1; i >= 0; i--) {
      this.buffs[i].duration--;
      if (this.buffs[i].duration <= 0) {
        this.buffs.splice(i, 1);
      }
    }

    // ====== Gojo 被动更新 ======
    if (isGojo) {
      // 无下限术式：空间屏障
      if (this.infinityCooldown > 0) {
        this.infinityCooldown--;
      }
      if (this.infinityTimer > 0) {
        this.infinityTimer--;
      } else if (this.infinityCooldown <= 0) {
        this.infinityActive = true;
      }

      // 手动屏障
      if (this.barrierCooldown > 0) {
        this.barrierCooldown--;
      }
      if (this.barrierTimer > 0) {
        this.barrierTimer--;
        if (this.barrierTimer <= 0) {
          this.barrierActive = false;
        }
      }

      // 空间斥力冷却
      if (this.spaceRepulsionCooldown > 0) {
        this.spaceRepulsionCooldown--;
      } else {
        this.spaceRepulsionReady = true;
      }

      // 六眼强化计时
      if (this.sixEyesBurstTimer > 0) {
        this.sixEyesBurstTimer--;
      }

      // 黑闪boost计时
      if (this.blackFlashBoostTimer > 0) {
        this.blackFlashBoostTimer--;
      }

      // 反转术式：自动回血 (HP < 30%)
      if (this.currentHp > 0 && this.currentHp < this.maxHp * 0.3) {
        this.healTimer++;
        if (this.healTimer >= 30) { // 每0.5秒回血
          this.healTimer = 0;
          this.currentHp = Math.min(this.maxHp, this.currentHp + Math.round(this.maxHp * 0.03));
        }
      } else {
        this.healTimer = 0;
      }
    }

    // 领域计时器
    if (this.domainTimer > 0) {
      this.domainTimer--;
      if (this.domainTimer <= 0) {
        this.domainActive = false;
      }
    }

    // 连击计时器
    if (this.comboTimer > 0) {
      this.comboTimer--;
      if (this.comboTimer <= 0) {
        this.comboCount = 0;
      }
    }

    // 击退衰减
    this.knockback.x *= 0.85;
    this.knockback.y *= 0.85;

    // 应用速度
    if (this.state !== 'hit' && this.state !== 'casting' && this.state !== 'stunned') {
      this.x += this.velocity.x;
      this.y += this.velocity.y;
    }
    this.x += this.knockback.x;
    this.y += this.knockback.y;

    // 重力
    if (!this.grounded) {
      this.velocity.y += 0.8;
    }

    // 动画
    this.animTimer++;
    if (this.animTimer > 6) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 4;
    }
  }

  getAttackDamage() {
    let dmg = this.attack;
    for (const buff of this.buffs) {
      if (buff.type === 'damage') {
        dmg *= buff.value;
      }
    }
    if (this.character.id === 'gojo' && this.blackFlashBoostTimer > 0) {
      dmg *= 1.5; // 黑闪boost：暴击伤害提升
    }
    return dmg;
  }

  getDefenseMultiplier() {
    let mult = 1;
    for (const buff of this.buffs) {
      if (buff.type === 'defense') {
        mult *= (1 - buff.value);
      }
    }
    return mult;
  }

  // 无下限术式：空间屏障生效
  infinityBlock(damage) {
    if (!this.character.infinityBarrier) return false;
    // 屏障破碎判定：领域压制
    if (this.domainTimer > 0) return false;
    // 屏障激活时，70%概率自动弹开/减速
    if (this.infinityActive) {
      if (Math.random() < 0.7) {
        return true; // 阻挡成功
      }
    }
    return false;
  }

  // 空间斥力：被贴身时自动触发
  triggerSpaceRepulsion(target) {
    if (!this.character.infinityBarrier) return false;
    if (!this.spaceRepulsionReady) return false;
    const dx = target.x - this.x;
    const dist = Math.abs(dx);
    if (dist < 50) {
      const dir = dx > 0 ? 1 : -1;
      target.knockback.x = dir * 150;
      target.knockback.y = -4;
      target.state = 'hit';
      target.stateTimer = 10;
      this.spaceRepulsionReady = false;
      this.spaceRepulsionCooldown = 120; // 2秒冷却
      return true;
    }
    return false;
  }

  takeDamage(damage, knockbackX = 0, knockbackY = 0, hitstun = 8) {
    if (this.invincible || this.state === 'dead') return 0;

    // 无下限术式屏障
    if (this.infinityBlock(damage)) {
      return 0;
    }

    // 防御计算
    const defMult = this.getDefenseMultiplier();
    const actualDamage = Math.max(1, Math.round(damage * (1 - this.defense / 300) * defMult));

    this.currentHp = Math.max(0, this.currentHp - actualDamage);
    this.hitFlash = 4;
    this.state = 'hit';
    this.stateTimer = hitstun;
    this.knockback.x = knockbackX;
    this.knockback.y = knockbackY;

    if (this.currentHp <= 0) {
      // 反转术式：复活
      if (this.character.reverseCursed && !this.reviveUsed) {
        this.reviveUsed = true;
        this.currentHp = Math.round(this.maxHp * 0.5);
        this.cursedEnergy = this.maxCursedEnergy;
        this.state = 'idle';
        this.stateTimer = 0;
        this.knockback.x = 0;
        this.knockback.y = 0;
        this.invincible = true;
        this.invincibleTimer = 30;
        // 复活冲击波：震飞周围敌人
        return -1; // 特殊返回值表示复活触发
      }

      this.state = 'dead';
      this.velocity.x = 0;
      this.velocity.y = 0;
    }

    return actualDamage;
  }

  useSkill(skillId) {
    let skill = this.character.skills.find(s => s.id === skillId);
    if (!skill) skill = (this.character.ultimate.id === skillId) ? this.character.ultimate : null;
    if (!skill) return null;

    if (this.cooldowns[skillId] > 0) return null;

    // 六眼：咒力消耗降低
    let cost = skill.cost;
    if (this.character.energyCostReduction && this.sixEyesBurstTimer <= 0) {
      cost = Math.round(cost * (1 - this.character.energyCostReduction));
    }
    if (this.sixEyesBurstTimer > 0) {
      cost = 0; // 六眼强化：无消耗
    }

    if (this.cursedEnergy < cost) return null;
    if (this.state === 'hit' || this.state === 'dead' || this.state === 'casting' || this.state === 'stunned') return null;

    this.cursedEnergy -= cost;
    this.cooldowns[skillId] = skill.cooldown;
    this.state = 'casting';
    this.stateTimer = 15;

    // 追踪苍/赫使用
    if (this.character.id === 'gojo') {
      if (skillId === 'skill1') this.blueUsed = true;
      if (skillId === 'skill2') this.redUsed = true;
      // 茈释放后：重置苍赫冷却 + 六眼强化
      if (skillId === 'skill3' && skill.resetCooldowns) {
        this.cooldowns['skill1'] = 0;
        this.cooldowns['skill2'] = 0;
        this.blueUsed = false;
        this.redUsed = false;
      }
      if (skillId === 'skill3' && skill.sixEyesBurst) {
        this.sixEyesBurstTimer = skill.sixEyesBurst.duration;
      }
    }

    // 反转术式：释放技能清除debuff
    if (this.character.reverseCursed) {
      this.buffs = this.buffs.filter(b => b.type !== 'defense');
    }

    return skill;
  }

  canUseUltimate() {
    if (this.cooldowns[this.character.ultimate.id] > 0) return false;
    if (this.cursedEnergy < this.character.ultimate.cost) return false;
    if (this.state === 'hit' || this.state === 'dead' || this.state === 'casting' || this.state === 'stunned') return false;
    return true;
  }

  useUltimate() {
    const skill = this.useSkill(this.character.ultimate.id);
    if (!skill) return null;

    this.domainActive = true;
    this.domainTimer = skill.duration;

    // 无量空处：领域展开
    if (skill.type === 'domain') {
      this.invincible = true;
      this.invincibleTimer = skill.duration;
    }
    if (skill.selfBuff) {
      this.buffs.push({ ...skill.selfBuff });
    }

    return skill;
  }

  // 无下限屏障全开（长按闪避）
  activateBarrier() {
    if (!this.character.infinityBarrier) return false;
    if (this.barrierCooldown > 0) return false;
    if (this.state === 'hit' || this.state === 'dead' || this.state === 'stunned') return false;

    this.barrierActive = true;
    this.barrierTimer = 180;        // 3秒
    this.barrierCooldown = 720;     // 12秒冷却
    this.invincible = true;
    this.invincibleTimer = 180;

    // 屏障内苍、赫伤害提升60%，暴击率翻倍
    this.addBuff('damage', 1.6, 180);
    this.addBuff('crit', 2.0, 180);

    return true;
  }

  basicAttack() {
    if (this.state === 'hit' || this.state === 'dead' || this.state === 'casting' || this.state === 'stunned') return null;
    if (this.state === 'attacking' && this.stateTimer > 8) return null;

    this.state = 'attacking';
    this.stateTimer = 12;
    this.lastAttackTime = Date.now();

    const comboIdx = Math.min(this.comboCount, this.character.basicAttack.comboCount - 1);
    const dmg = this.character.basicAttack.comboDamage[comboIdx];
    const adjustedDmg = Math.round(dmg * this.getAttackDamage() / this.character.attack);

    this.comboCount++;
    this.comboTimer = 45;
    if (this.comboCount > this.comboMax) this.comboMax = this.comboCount;

    // Gojo 5段连击特殊效果
    let extraEffects = {};
    if (this.character.id === 'gojo' && this.character.basicAttack.comboEffects) {
      extraEffects = this.character.basicAttack.comboEffects[comboIdx] || {};
    }

    return {
      damage: adjustedDmg,
      range: this.character.basicAttack.range,
      knockback: this.character.basicAttack.knockback,
      ranged: this.character.basicAttack.ranged || false,
      comboIndex: comboIdx,
      extraEffects: extraEffects
    };
  }

  addBuff(type, value, duration) {
    this.buffs.push({ type, value, duration });
  }

  removeDebuffs() {
    this.buffs = this.buffs.filter(b => b.type === 'damage' || b.type === 'crit');
  }

  getAttackRange() {
    return this.character.basicAttack.range;
  }

  isAlive() {
    return this.currentHp > 0;
  }
}