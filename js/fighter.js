// 战斗单位逻辑

// 领域展开通用使用条件：角色在场上累计造成指定伤害后方可释放
const DOMAIN_DAMAGE_REQUIRED = 300;

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
    this.jumpCooldown = 0; // 跳跃冷却帧数，防止按住摇杆持续自动跳跃
    this.comboCount = 0;
    this.comboTimer = 0;
    this.lastAttackTime = 0;

    // 冷却
    this.cooldowns = {};
    this.character.skills.forEach(s => {
      this.cooldowns[s.id] = 0;
    });
    if (this.character.ultimate) {
      this.cooldowns[this.character.ultimate.id] = 0;
    }

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
    this.domainPhase = 'idle'; // idle, preCast, declaration, expanding, active, releasing, aftermath
    this.domainPhaseTimer = 0;
    this.domainPhaseData = {}; // 阶段特定数据
    // 领域对抗状态
    this.domainClashRole = null;      // 'winner' / 'loser' / 'neutral'
    this.domainClashResult = null;    // 当前对抗结果文本
    this.domainSureHitDisabled = false; // 规则抵消/简易领域下，领域内必中规则失效
    this.domainCollapsed = false;     // 是否因对抗崩溃（熔断前结算）

    // 统计
    this.totalDamage = 0;
    this.comboMax = 0;

    // 领域展开伤害充能（上场后累计造成伤害，达到阈值方可开大）
    this.domainDamageCharge = 0;

    // ====== 五条悟专属被动 ======
    // 无下限术式：空间屏障
    if (character.infinityBarrier) {
      this.infinityActive = true;          // 屏障是否激活
      this.infinityTimer = 0;              // 屏障持续时间
      this.infinityCooldown = 0;           // 屏障冷却
      this.spaceRepulsionReady = true;     // 空间斥力就绪
      this.spaceRepulsionCooldown = 0;     // 斥力冷却
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
      this.healTimer = 0;                  // 持续回血计时
      this.lastHealAmount = 0;             // 上次治疗量（用于显示文字）
      this.reverseFatigueStacks = 0;       // 反转疲劳层数
      this.reverseFatigueTimer = 0;        // 疲劳层数衰减计时（帧）
      this._forcedRepairCount = 0;         // 强制修复次数（先破后立大脑负荷）
      this._bloodRegenPending = 0;         // 虎杖赤血操术造血剩余帧
      this._bloodRegenRate = 0.01;         // 虎杖赤血操术造血比例
    }

    // 术士熔断：按生得术式独立计算（techniqueId -> { timer, baseDuration }）
    this.techniqueBurnouts = {};

    // 通用黑闪：冷却计时器（避免连续触发）
    this._blackFlashCooldown = 0;
    // 黑闪后战斗巅峰状态（120% 潜能 + 凝练内敛咒力光晕）
    this.blackFlashPeakTimer = 0;
    this.blackFlashComboCount = 0;        // 连续黑闪次数
    // 连续黑闪：反转术式回转流动（咒力续航回升）
    this.blackFlashReverseFlowTimer = 0;
    this._blackFlashFlowAngle = 0;        // 回转流动光效当前角度

    // 对手引用（用于判断领域压制）
    this.opponent = null;

    // 苍/赫 释放追踪（虚式茈前置条件）
    this.blueUsed = false;
    this.redUsed = false;

    // 通用简易领域：对方展开完整领域时可手动触发，抵消自身受到的必中效果
    this.simpleDomainTimer = 0;      // 简易领域持续剩余帧
    this.simpleDomainCooldown = 0;   // 简易领域冷却帧
  }

  update() {
    const dt = 1 / 60;
    const isGojo = this.character.id === 'gojo';

    // 咒力恢复（领域内被动禁用：黑闪boost 不生效）
    if (this.cursedEnergy < this.maxCursedEnergy) {
      let regen = this.energyRegen;
      if (isGojo && this.blackFlashBoostTimer > 0 && !this.isPassiveDisabled()) {
        regen *= 2; // 黑闪boost：咒力回复翻倍
      }
      // 黑闪战斗巅峰状态：咒力流转顺滑，回复 ×1.2
      if (this.blackFlashPeakTimer > 0) {
        regen *= 1.2;
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
    }

    // 反转术式：自动回血（所有反转术式角色通用，领域内被动禁用则不生效）
    if (this.reverseCursedActive && this.currentHp > 0 && !this.isPassiveDisabled()) {
      const isYuji = this.character.id === 'yuji';
      // 虎杖高阶反转术式：更快触发、更高阈值、更低疲劳
      const healThreshold = isYuji ? 0.5 : 0.3;
      const healInterval = isYuji ? 30 : 60;
      const baseHealRate = isYuji ? 0.025 : 0.02;
      const fatigueGain = isYuji ? 0.5 : 1;
      if (this.currentHp < this.maxHp * healThreshold) {
        this.healTimer++;
        if (this.healTimer >= healInterval) {
          this.healTimer = 0;
          const baseHeal = this.maxHp * baseHealRate;
          const eff = this.getReverseCursedEfficiency();
          const healAmt = Math.max(0, Math.round(baseHeal * eff));
          if (healAmt > 0) {
            this.currentHp = Math.min(this.maxHp, this.currentHp + healAmt);
            this.lastHealAmount = healAmt;
          }
          this.addReverseFatigue(fatigueGain);
        }
      } else {
        this.healTimer = 0;
      }

      // 反转疲劳层数自然衰减
      if (this.reverseFatigueStacks > 0) {
        this.reverseFatigueTimer--;
        if (this.reverseFatigueTimer <= 0) {
          this.reverseFatigueStacks = Math.max(0, this.reverseFatigueStacks - 1);
          // 虎杖半咒灵体质：每 3 秒衰减一层；其他 5 秒
          this.reverseFatigueTimer = isYuji ? 180 : 300;
        }
      }

      // 虎杖专属：赤血操术 + 反转术式造血续航
      // 释放技能后若 HP 未满，额外消耗少量咒力进行快速修复
      if (isYuji && this._bloodRegenPending > 0) {
        this._bloodRegenPending--;
        if (this._bloodRegenPending % 10 === 0 && this.currentHp < this.maxHp) {
          const regen = Math.round(this.maxHp * this._bloodRegenRate);
          this.currentHp = Math.min(this.maxHp, this.currentHp + regen);
          this.lastHealAmount = (this.lastHealAmount || 0) + regen;
        }
      }
    }

    // 术士熔断计时器递减（按生得术式独立）
    for (const tid in this.techniqueBurnouts) {
      const b = this.techniqueBurnouts[tid];
      if (b && b.timer > 0) {
        b.timer--;
      }
    }

    // 黑闪冷却递减
    if (this._blackFlashCooldown > 0) {
      this._blackFlashCooldown--;
    }

    // 速度 Buff 实时生效
    let speedMult = 1;
    for (const buff of this.buffs) {
      if (buff.type === 'speed') speedMult *= buff.value;
    }
    this.speed = this.character.speed * speedMult;

    // 黑闪战斗巅峰状态计时
    if (this.blackFlashPeakTimer > 0) {
      this.blackFlashPeakTimer--;
      // 巅峰期间回转角度持续推进（用于光效）
      this._blackFlashFlowAngle += 0.15;
    } else {
      this.blackFlashComboCount = 0; // 巅峰结束后清空连击
    }

    // 连续黑闪反转术式回转流动：咒力续航回升
    if (this.blackFlashReverseFlowTimer > 0) {
      this.blackFlashReverseFlowTimer--;
      // 每 30 帧（0.5 秒）恢复少量生命（仅反转术式角色）
      if (this.blackFlashReverseFlowTimer % 30 === 0 && this.character.reverseCursed && this.currentHp < this.maxHp) {
        const healAmt = Math.round(this.maxHp * 0.015);
        if (healAmt > 0) {
          this.currentHp = Math.min(this.maxHp, this.currentHp + healAmt);
          this.lastHealAmount = healAmt;
        }
      }
      // 每 60 帧（1 秒）降低一层反转疲劳（咒力续航回升）
      if (this.blackFlashReverseFlowTimer % 60 === 0 && this.reverseFatigueStacks > 0) {
        this.reverseFatigueStacks = Math.max(0, this.reverseFatigueStacks - 1);
      }
      // 回转流动角度
      this._blackFlashFlowAngle += 0.18;
    }

    // 通用简易领域计时器
    if (this.simpleDomainTimer > 0) {
      this.simpleDomainTimer--;
    }
    if (this.simpleDomainCooldown > 0) {
      this.simpleDomainCooldown--;
    }

    // 领域计时器 + 阶段推进
    if (this.domainTimer > 0) {
      this.domainTimer--;
      this.domainPhaseTimer--;

      // 阶段推进
      if (this.domainPhaseTimer <= 0 && this.domainPhase !== 'idle') {
        const phases = this.character.ultimate.phases;
        switch (this.domainPhase) {
          case 'preCast':
            this.domainPhase = 'declaration';
            this.domainPhaseTimer = phases.declaration;
            this.domainPhaseData.fieldExpanding = 1; // 咒力场已展开
            break;
          case 'declaration':
            this.domainPhase = 'expanding';
            this.domainPhaseTimer = phases.expanding;
            break;
          case 'expanding':
            this.domainPhase = 'active';
            this.domainPhaseTimer = phases.active;
            this.domainPhaseData.barrierRadius = 1; // 结界完全展开
            break;
          case 'active':
            this.domainPhase = 'releasing';
            this.domainPhaseTimer = phases.releasing;
            break;
          case 'releasing':
            this.domainPhase = 'aftermath';
            this.domainPhaseTimer = phases.aftermath;
            break;
          case 'aftermath':
            this.domainPhase = 'idle';
            this.domainActive = false;
            break;
        }
      }

      if (this.domainTimer <= 0) {
        this.endDomainAndBurnout();
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
    if (this.character.id === 'gojo' && this.blackFlashBoostTimer > 0 && !this.isPassiveDisabled()) {
      dmg *= 1.5; // 黑闪boost：暴击伤害提升（领域内被动禁用则不生效）
    }
    // 黑闪战斗巅峰状态：整体战斗潜能发挥至 120%
    if (this.blackFlashPeakTimer > 0) {
      dmg *= 1.2;
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

  setOpponent(opponent) {
    this.opponent = opponent;
  }

  // 被动技能禁用判定：自己领域内、对手领域内、核心生得术式熔断时均禁用
  isPassiveDisabled() {
    if (this.isPrimaryTechniqueBurnout()) return true;
    if (this.domainActive && this.domainTimer > 0) return true;
    if (this.opponent && this.opponent.domainActive && this.opponent.domainTimer > 0) return true;
    return false;
  }

  // 黑闪后触发战斗巅峰状态（连续黑闪会触发反转术式回转流动）
  triggerBlackFlashPeak() {
    // 巅峰状态仍在：算作连续黑闪，触发回转流动
    if (this.blackFlashPeakTimer > 0) {
      this.blackFlashComboCount++;
      // 连续黑闪：反转术式回转流动，咒力续航回升
      this.blackFlashReverseFlowTimer = 240; // 4 秒回转流动
    } else {
      this.blackFlashComboCount = 1;
    }
    // 巅峰状态：8 秒 120% 潜能
    this.blackFlashPeakTimer = 480;
  }

  // 简易领域：所有角色通用的对抗手段，可抵消对方完整领域内的必中规则
  hasSimpleDomain() {
    return true;
  }

  // 简易领域是否生效（手动触发后持续期间，且对方完整领域存在）
  isSimpleDomainActive() {
    if (this.simpleDomainTimer <= 0) return false;
    if (!this.opponent || !this.opponent.domainActive || this.opponent.domainTimer <= 0) return false;
    return true;
  }

  // 开启通用简易领域
  activateSimpleDomain() {
    if (this.simpleDomainCooldown > 0) return false;
    if (this.simpleDomainTimer > 0) return false;
    if (!this.opponent || !this.opponent.domainActive || this.opponent.domainTimer <= 0) return false;
    if (this.state === 'hit' || this.state === 'dead' || this.state === 'casting' || this.state === 'stunned') return false;

    const cost = 50;
    const duration = 240;  // 4 秒
    const cooldown = 900;  // 15 秒

    if (this.cursedEnergy < cost) return false;
    this.cursedEnergy -= cost;

    this.simpleDomainTimer = duration;
    this.simpleDomainCooldown = cooldown;
    return true;
  }

  // 无下限术式：空间屏障生效
  infinityBlock(damage) {
    if (!this.character.infinityBarrier) return false;
    // 无下限术式熔断 / 领域内：无下限术式失效
    if (this.isTechniqueBurnout('limitless') || this.isPassiveDisabled()) return false;
    // 屏障激活时，50%概率自动弹开/减速
    if (this.infinityActive) {
      if (Math.random() < 0.5) {
        return true; // 阻挡成功
      }
    }
    return false;
  }

  // 空间斥力：被贴身时自动触发
  triggerSpaceRepulsion(target) {
    if (!this.character.infinityBarrier) return false;
    if (this.isTechniqueBurnout('limitless') || this.isPassiveDisabled()) return false;
    if (!this.spaceRepulsionReady) return false;
    const dx = target.x - this.x;
    const dist = Math.abs(dx);
    if (dist < 50) {
      const dir = dx > 0 ? 1 : -1;
      target.knockback.x = dir * 100;
      target.knockback.y = -3;
      target.state = 'hit';
      target.stateTimer = 8;
      this.spaceRepulsionReady = false;
      this.spaceRepulsionCooldown = 180; // 3秒冷却
      return true;
    }
    return false;
  }

  takeDamage(damage, knockbackX = 0, knockbackY = 0, hitstun = 8, pierceBarrier = false) {
    if (this.invincible || this.state === 'dead') return 0;

    // 无下限术式屏障（可被捌等术式贯穿）
    if (!pierceBarrier && this.infinityBlock(damage)) {
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
      this.state = 'dead';
      this.velocity.x = 0;
      this.velocity.y = 0;
    }

    return actualDamage;
  }

  // 术士熔断：获取指定生得术式的熔断状态
  getTechniqueBurnout(techniqueId) {
    if (!techniqueId) return null;
    return this.techniqueBurnouts[techniqueId] || null;
  }

  // 指定生得术式是否处于熔断
  isTechniqueBurnout(techniqueId) {
    if (techniqueId) {
      const b = this.techniqueBurnouts[techniqueId];
      return !!(b && b.timer > 0);
    }
    return this.isPrimaryTechniqueBurnout();
  }

  // 主要生得术式是否熔断（兼容旧逻辑）
  isPrimaryTechniqueBurnout() {
    const primary = this.getPrimaryTechniqueId();
    if (!primary) return false;
    return this.isTechniqueBurnout(primary);
  }

  // 获取主要生得术式 ID
  getPrimaryTechniqueId() {
    return this.character.innateTechnique || null;
  }

  // 获取技能对应的生得术式 ID
  getSkillTechniqueId(skill) {
    if (!skill) return this.getPrimaryTechniqueId();
    if (skill.techniqueId) return skill.techniqueId;
    // 领域展开默认绑定主要生得术式
    if (skill.type === 'domain') return this.getPrimaryTechniqueId();
    return this.getPrimaryTechniqueId();
  }

  // 应用术士熔断到指定生得术式
  applyTechniqueBurnout(techniqueId, baseDuration, options = {}) {
    if (!techniqueId) return;
    // 简易领域不依赖生得术式刻印，不会触发熔断
    if (techniqueId === 'simple_domain' || techniqueId === 'body_reinforcement') return;
    const clashDefeat = options.clashDefeat || false;
    const domainDurationSec = options.domainDurationSec || 0;
    // 基础恢复周期：弱级术师默认 12s，特级按 tier 递减；这里用帧计算
    let duration = baseDuration;
    // 领域维持时间越长，负荷越高，恢复周期越长
    duration += domainDurationSec * 30; // 每多 1 秒 + 0.5s
    // 领域对冲惨败：周期大幅延长
    if (clashDefeat) {
      duration = Math.round(duration * 1.8);
    }
    this.techniqueBurnouts[techniqueId] = {
      timer: Math.round(duration),
      baseDuration: Math.round(duration)
    };
  }

  // 强制修复（五条悟式「先破后立」）：用反转术式瞬间重置熔断状态
  // 每次强制修复会叠加大脑负荷，降低成功率
  forcedRepairTechnique(techniqueId) {
    if (!techniqueId) techniqueId = this.getPrimaryTechniqueId();
    if (!techniqueId || !this.reverseCursedActive) return false;
    const b = this.techniqueBurnouts[techniqueId];
    if (!b || b.timer <= 0) return false;
    // 大脑负荷：根据已强制修复次数递减成功率
    this._forcedRepairCount = this._forcedRepairCount || 0;
    this._forcedRepairCount++;
    const successRate = Math.max(0.15, 1 - this._forcedRepairCount * 0.25);
    if (Math.random() < successRate) {
      // 成功：瞬间清除熔断
      b.timer = 0;
      // 成功修复带来短暂大脑负荷 debuff（防御降低、易受暴击）
      this.addBuff('defense', 0.85, 180);
      return true;
    } else {
      // 失败：造成真实伤害并延长熔断
      const dmg = Math.round(this.maxHp * 0.12);
      this.currentHp = Math.max(1, this.currentHp - dmg);
      b.timer = Math.round(b.timer * 1.3);
      return false;
    }
  }

  getReverseCursedEfficiency() {
    // 0 层 100%，1 层 60%，2 层 30%，3 层+ 0%
    const eff = [1, 0.6, 0.3, 0][Math.min(this.reverseFatigueStacks, 3)];
    return eff;
  }

  addReverseFatigue(stacks = 1) {
    if (!this.reverseCursedActive) return;
    const prev = this.reverseFatigueStacks;
    this.reverseFatigueStacks = Math.min(5, this.reverseFatigueStacks + stacks);
    if (this.reverseFatigueStacks > prev) {
      // 新叠加一层时重置衰减计时
      this.reverseFatigueTimer = 300;
    }
  }

  useSkill(skillId) {
    let skill = this.character.skills.find(s => s.id === skillId);
    if (!skill) skill = (this.character.ultimate && this.character.ultimate.id === skillId) ? this.character.ultimate : null;
    if (!skill) return null;

    // 术士熔断：仅禁用该技能所属的生得术式
    const tid = this.getSkillTechniqueId(skill);
    if (this.isTechniqueBurnout(tid)) return null;

    if (this.cooldowns[skillId] > 0) return null;

    // 六眼：咒力消耗降低（领域内被动禁用时不生效）
    let cost = skill.cost;
    if (this.character.energyCostReduction && this.sixEyesBurstTimer <= 0 && !this.isPassiveDisabled()) {
      cost = Math.round(cost * (1 - this.character.energyCostReduction));
    }
    if (this.sixEyesBurstTimer > 0 && !this.isPassiveDisabled()) {
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

    // 虎杖专属：赤血操术 + 反转术式造血续航
    if (this.character.id === 'yuji' && (!this.character.ultimate || skillId !== this.character.ultimate.id)) {
      this._bloodRegenPending = 60; // 1 秒内持续造血修复
      // 赤磷悦动触发的造血效率削弱：其他技能 1%，赤磷悦动 0.5%
      this._bloodRegenRate = skillId === 'skill2' ? 0.005 : 0.01;
    }

    return skill;
  }

  isDomainChargeReady() {
    return this.domainDamageCharge >= DOMAIN_DAMAGE_REQUIRED;
  }

  canUseUltimate() {
    if (!this.character.ultimate) return false;
    if (this.cooldowns[this.character.ultimate.id] > 0) return false;
    if (this.cursedEnergy < this.character.ultimate.cost) return false;
    if (this.state === 'hit' || this.state === 'dead' || this.state === 'casting' || this.state === 'stunned') return false;
    // 领域展开通用条件：必须累计造成指定伤害
    if (!this.isDomainChargeReady()) return false;
    // 领域展开绑定主要生得术式
    const tid = this.getPrimaryTechniqueId();
    if (tid && this.isTechniqueBurnout(tid)) return false;
    return true;
  }

  useUltimate() {
    if (!this.character.ultimate) return null;
    const skill = this.useSkill(this.character.ultimate.id);
    if (!skill) return null;

    this.domainActive = true;
    this.domainTimer = skill.duration;
    this.domainPhase = 'preCast';
    this.domainPhaseTimer = skill.phases.preCast;
    // 释放领域后清零伤害充能
    this.domainDamageCharge = 0;
    this.domainPhaseData = {
      fieldExpanding: 0,      // 咒力场扩张半径
      barrierRadius: 0,       // 结界球体半径
      eyeScale: 0,            // 巨眼缩放
      infoParticles: [],      // 信息粒子
      spaceDistortion: 0,     // 空间扭曲强度
    };

    // 无量空处：领域展开
    if (skill.type === 'domain') {
      this.invincible = true;
      this.invincibleTimer = skill.duration;
    }
    if (skill.selfBuff) {
      this.buffs.push({ ...skill.selfBuff });
    }
    if (skill.stealth) {
      this.stealthTimer = skill.stealth.duration;
    }

    return skill;
  }

  // 提前解除领域（玩家主动取消）
  releaseDomainEarly() {
    if (!this.domainActive || this.domainTimer <= 0) return false;
    // 只有进入 active 阶段后才能主动解除
    if (this.domainPhase !== 'active' && this.domainPhase !== 'expanding') return false;
    this.domainTimer = 1;  // 下一帧进入结束流程
    this.domainPhase = 'releasing';
    this.domainPhaseTimer = this.character.ultimate?.phases?.releasing || 20;
    return true;
  }

  // 结束领域时触发术士熔断（自然结束 / 主动解除）
  endDomainAndBurnout() {
    if (!this.domainActive) return;
    const durationSec = (this.character.ultimate?.duration || 0) / 60;
    const techniqueId = this.getPrimaryTechniqueId();
    this.domainActive = false;
    this.domainTimer = 0;
    this.domainPhase = 'idle';
    // 术士熔断：针对构筑该领域的生得术式
    // 基础 8s = 480 帧；按领域 tier 微调：tier 越高自身越完善，恢复略快
    const tier = this.character.ultimate?.domainTier || 1;
    const base = Math.max(360, 540 - tier * 30);
    this.applyTechniqueBurnout(techniqueId, base, { domainDurationSec });
    // 清除领域对抗临时状态
    this.domainClashRole = null;
    this.domainClashResult = null;
    this.domainSureHitDisabled = false;
    this.domainCollapsed = false;
  }

  // 领域崩溃（被对方吞噬/碾碎）—— 立即结束领域并触发更长熔断
  collapseDomain() {
    if (!this.domainActive) return;
    const durationSec = (this.character.ultimate?.duration || 0) / 60;
    const techniqueId = this.getPrimaryTechniqueId();
    this.domainActive = false;
    this.domainTimer = 0;
    this.domainPhase = 'idle';
    this.domainCollapsed = true;
    // 崩溃后无敌/保护状态一并解除
    this.invincible = false;
    this.invincibleTimer = 0;
    // 领域对冲惨败：熔断周期大幅延长
    const tier = this.character.ultimate?.domainTier || 1;
    const base = Math.max(540, 720 - tier * 30);
    this.applyTechniqueBurnout(techniqueId, base, { domainDurationSec, clashDefeat: true });
  }

  // 回合切换时强制清除领域状态（不触发术士熔断）
  clearDomainState() {
    if (!this.domainActive) {
      this.domainClashRole = null;
      this.domainClashResult = null;
      this.domainSureHitDisabled = false;
      this.domainCollapsed = false;
      this.domainPhaseData = {};
      return;
    }
    this.domainActive = false;
    this.domainTimer = 0;
    this.domainPhase = 'idle';
    this.domainPhaseTimer = 0;
    this.domainPhaseData = {};
    this.domainClashRole = null;
    this.domainClashResult = null;
    this.domainSureHitDisabled = false;
    this.domainCollapsed = false;
    // 同时清除简易领域残留
    this.simpleDomainTimer = 0;
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

  // 赤磷悦动是否激活（同时拥有 damage + defense + speed 三类 buff）
  hasBloodSurge() {
    let hasDmg = false, hasDef = false, hasSpd = false;
    for (const b of this.buffs) {
      if (b.type === 'damage') hasDmg = true;
      if (b.type === 'defense') hasDef = true;
      if (b.type === 'speed') hasSpd = true;
    }
    return hasDmg && hasDef && hasSpd;
  }

  // 赤磷悦动剩余时长（取三类 buff 中最短）
  getBloodSurgeTimer() {
    let min = Infinity;
    for (const b of this.buffs) {
      if (b.type === 'damage' || b.type === 'defense' || b.type === 'speed') {
        if (b.duration < min) min = b.duration;
      }
    }
    return min === Infinity ? 0 : min;
  }

  removeDebuffs() {
    this.buffs = this.buffs.filter(b => b.type === 'damage' || b.type === 'crit');
  }

  // 每回合开始时给强力技能加上初始冷却，并重置领域伤害充能
  applyRoundStartCooldowns() {
    // 新上场后需重新累计伤害才能展开领域
    this.domainDamageCharge = 0;

    const skills = this.character.skills || [];
    // 比较厉害的技能：skill3、skill4（灶开等）
    for (const skill of skills) {
      if (skill.id === 'skill3' || skill.id === 'skill4') {
        const cd = Math.floor(skill.cooldown * 0.35);
        if (cd > this.cooldowns[skill.id]) {
          this.cooldowns[skill.id] = cd;
        }
      }
    }
    // 领域展开
    if (this.character.ultimate) {
      const ultCd = Math.floor(this.character.ultimate.cooldown * 0.25);
      const ultId = this.character.ultimate.id;
      if (ultCd > this.cooldowns[ultId]) {
        this.cooldowns[ultId] = ultCd;
      }
    }
  }

  getAttackRange() {
    return this.character.basicAttack.range;
  }

  isAlive() {
    return this.currentHp > 0;
  }
}