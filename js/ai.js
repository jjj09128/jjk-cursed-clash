// AI 对手行为系统
class AIController {
  constructor(fighter) {
    this.fighter = fighter;
    this.target = null;
    this.decisionTimer = 0;
    this.currentAction = null;
    this.actionTimer = 0;
    this.difficulty = 0.6; // 0-1, 越高越难
    this.reactionSpeed = 30; // 反应帧数
    this.aggressiveness = 0.5;
    this.dodgeCooldown = 0;
    // 领域使用：可多次使用，但有冷却和使用次数惩罚
    this.domainCooldown = 0;        // 领域展开冷却（帧）
    this.domainDecisionCooldown = 0;// 领域决策冷却，避免连续判定
    this.domainUseCount = 0;        // 本局已展开次数
  }

  setTarget(target) {
    this.target = target;
  }

  setDifficulty(level) {
    this.difficulty = Math.max(0, Math.min(1, level));
    this.reactionSpeed = Math.max(10, 40 - level * 30);
    this.aggressiveness = 0.3 + level * 0.5;
  }

  update() {
    if (!this.target || this.fighter.state === 'dead') return;

    this.decisionTimer--;
    if (this.dodgeCooldown > 0) this.dodgeCooldown--;
    if (this.domainCooldown > 0) this.domainCooldown--;
    if (this.domainDecisionCooldown > 0) this.domainDecisionCooldown--;

    // 僵直/被击/咏唱状态不做决策
    if (this.fighter.state === 'stunned') return;

    // 高优先级：玩家刚展开领域，AI 立即尝试开启领域进行对抗
    if (this.target.domainActive && this.target.domainTimer > 0) {
      if (this.tryCounterDomain()) {
        this.executeAction();
        return;
      }
    }

    // 危机情况加快反应（玩家攻击/咏唱且距离较近时）
    if (this.target && (this.target.state === 'attacking' || this.target.state === 'casting')) {
      const dist = Math.abs(this.target.x - this.fighter.x);
      if (dist < 220) {
        this.decisionTimer = Math.min(this.decisionTimer, 8);
      }
    }

    if (this.decisionTimer <= 0) {
      this.makeDecision();
      this.decisionTimer = this.reactionSpeed + Math.floor(Math.random() * 12);
    }

    this.executeAction();
  }

  // 综合局势评估是否值得展开领域（0-1）
  evaluateDomainUse(isCounter = false) {
    const f = this.fighter;
    const t = this.target;
    if (!f || !t) return 0;
    if (!f.canUseUltimate()) return 0;
    if (this.domainCooldown > 0) return 0;
    if (this.domainDecisionCooldown > 0) return 0;

    const ult = f.character.ultimate;
    if (!ult || ult.domainType === 'none' || (ult.domainTier || 0) <= 0) return 0;

    // 自己已在领域内，不重复展开
    if (f.domainActive && f.domainTimer > 0) return 0;

    const dist = Math.abs(t.x - f.x);
    const hpRatio = f.currentHp / f.maxHp;
    const energyRatio = f.cursedEnergy / f.maxCursedEnergy;

    let score = 0;

    // 1. 反击玩家领域：最高优先级
    if (isCounter && t.domainActive && t.domainTimer > 0) {
      score += 0.95;
    }

    // 2. 玩家在咏唱大招/领域：打断机会
    if (t.state === 'casting' && t.castingSkill) {
      const castingUlt = t.character.ultimate && t.castingSkill.id === t.character.ultimate.id;
      if (castingUlt) score += 0.55;
      else score += 0.25;
    }

    // 3. 距离因素：太远开了浪费，贴身收益高
    if (dist < 200) score += 0.25;
    else if (dist < 400) score += 0.1;
    else score -= 0.35;

    // 4. 血量因素：越危急越想开
    if (hpRatio < 0.3) score += 0.4;
    else if (hpRatio < 0.5) score += 0.25;
    else if (hpRatio < 0.7) score += 0.1;
    else if (hpRatio > 0.9) score -= 0.15;

    // 5. 咒力储备：充足更敢开，不足则缓一缓
    if (energyRatio > 0.75) score += 0.15;
    else if (energyRatio < 0.4) score -= 0.25;

    // 6. 使用次数惩罚：越用展开条件越苛刻
    const usePenalty = Math.min(0.45, this.domainUseCount * 0.15);
    score -= usePenalty;

    // 7. 难度修正：高难度 AI 更愿意主动展开
    score += (this.difficulty - 0.5) * 0.2;

    return Math.max(0, Math.min(1, score));
  }

  // 尝试开启领域进行对抗；成功返回 true
  tryCounterDomain() {
    const score = this.evaluateDomainUse(true);
    // 反击场景阈值略低，保证有完整领域时大概率能对抗
    if (score >= 0.55 + Math.random() * 0.25) {
      this.currentAction = 'ultimate';
      this.actionTimer = 10;
      return true;
    }
    return false;
  }

  makeDecision() {
    const f = this.fighter;
    const t = this.target;
    const dx = t.x - f.x;
    const dy = t.y - f.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const facingTarget = (dx > 0 && f.facingRight) || (dx < 0 && !f.facingRight);

    // 面朝目标
    if (dx > 0) f.facingRight = true;
    else if (dx < 0) f.facingRight = false;

    // 被击/咏唱状态不做决策
    if (f.state === 'hit' || f.state === 'casting') return;

    const char = f.character;
    const attackRange = f.getAttackRange();

    // 主动领域展开：综合局势评估
    const domainScore = this.evaluateDomainUse(false);
    if (domainScore > 0.72 + Math.random() * 0.13) {
      this.currentAction = 'ultimate';
      this.actionTimer = 10;
      return;
    }

    // 躲避判断（优先于普通行动）
    if (this.shouldDodge(dist)) {
      this.currentAction = 'dodge';
      this.actionTimer = 15;
      this.dodgeCooldown = 55 - Math.floor(this.difficulty * 15);
      return;
    }

    // 基于局势选择最优技能
    const bestSkill = this.selectBestSkill();

    if (bestSkill) {
      const effRange = this.getSkillEffectiveRange(bestSkill);
      const melee = this.isMeleeSkill(bestSkill);

      if (melee) {
        // 近战技能：距离太远先接近
        if (dist < effRange + 40) {
          this.currentAction = 'skill_' + bestSkill.id;
          this.actionTimer = 15;
        } else {
          this.currentAction = 'approach';
          this.actionTimer = 20;
        }
      } else {
        // 远程/全屏技能：太近拉开，太远接近，合适距离释放
        if (dist < 110) {
          this.currentAction = 'retreat';
          this.actionTimer = 18;
        } else if (dist > effRange + 100) {
          this.currentAction = 'approach';
          this.actionTimer = 22;
        } else {
          this.currentAction = 'skill_' + bestSkill.id;
          this.actionTimer = 15;
        }
      }
      return;
    }

    // 无可用技能时的距离判断
    if (dist < attackRange && facingTarget) {
      const roll = Math.random();
      if (roll < this.aggressiveness * 0.55) {
        this.currentAction = 'attack';
        this.actionTimer = 12;
      } else if (roll < this.aggressiveness * 0.85) {
        this.currentAction = 'approach';
        this.actionTimer = 15;
      } else {
        this.currentAction = 'retreat';
        this.actionTimer = 20;
      }
    } else if (dist < 320) {
      if (Math.random() < this.aggressiveness * 0.7) {
        this.currentAction = 'approach';
        this.actionTimer = 15;
      } else {
        this.currentAction = 'retreat';
        this.actionTimer = 18;
      }
    } else {
      this.currentAction = 'approach';
      this.actionTimer = 25;
    }
  }

  // 判断是否应该闪避
  shouldDodge(dist) {
    const t = this.target;
    if (!t || (t.state !== 'attacking' && t.state !== 'casting')) return false;
    if (dist > 160) return false;
    if (this.dodgeCooldown > 0) return false;
    if (this.fighter.state === 'hit' || this.fighter.state === 'casting' || this.fighter.state === 'stunned') return false;
    return Math.random() < this.difficulty * 0.75;
  }

  // 从可用技能中选择评分最高者
  selectBestSkill() {
    const f = this.fighter;
    const available = (f.character.skills || []).filter(s => {
      return f.cooldowns[s.id] <= 0 && f.cursedEnergy >= s.cost;
    });
    if (available.length === 0) return null;

    let best = null;
    let bestScore = -Infinity;
    for (const skill of available) {
      const score = this.scoreSkill(skill);
      if (score > bestScore) {
        bestScore = score;
        best = skill;
      }
    }
    return best;
  }

  // 对单个技能进行局势评分
  scoreSkill(skill) {
    const f = this.fighter;
    const t = this.target;
    const dist = Math.abs(t.x - f.x);
    const hpRatio = f.currentHp / f.maxHp;
    const energyRatio = f.cursedEnergy / f.maxCursedEnergy;
    const targetHpRatio = t.currentHp / t.maxHp;

    let score = 10;

    // 基础伤害价值（buff 类技能没有伤害，给基础分）
    score += (skill.damage || 0) * 0.06;

    // 范围匹配
    score += this.scoreRange(skill, dist);

    // 能量效率：能量充足时更倾向高伤，能量低时倾向省蓝
    const costRatio = skill.cost / Math.max(f.maxCursedEnergy, 1);
    score += (energyRatio - costRatio) * 25;
    if (energyRatio < 0.3 && costRatio > 0.3) score -= 15;

    // 血量与局势
    if (hpRatio < 0.35) {
      if (skill.selfBuff || skill.defenseBuff || skill.speedBuff) score += 20;
      else if ((skill.damage || 0) > 120) score -= 8; // 低血量慎用高消耗大招
    }
    if (targetHpRatio < 0.3 && (skill.damage || 0) > 100) score += 12;

    // 目标状态
    if (t.state === 'casting') {
      if (this.isFastSkill(skill)) score += 12;
      if (this.isMeleeSkill(skill) && dist < 130) score += 10;
    }
    if (t.state === 'stunned' || t.state === 'hit') score += 8;

    // 对方展开领域时：优先远程/全屏，避免近战贴脸
    if (t.domainActive && t.domainTimer > 0) {
      if (skill.fullScreen || (skill.projectile && !this.isMeleeSkill(skill))) score += 10;
      if (this.isMeleeSkill(skill)) score -= 20;
    }

    // 角色特定连招加成
    score += this.scoreCharacterCombo(skill);

    // 为解锁领域，优先能造成伤害的技能
    if (!f.isDomainChargeReady() && (skill.damage || 0) > 0) {
      const chargeGap = 300 - f.domainDamageCharge;
      if (chargeGap > 0 && chargeGap < 120) score += 8;
    }

    // 随机波动，避免完全固定
    score *= 0.9 + Math.random() * 0.2;

    return score;
  }

  scoreRange(skill, dist) {
    if (skill.fullScreen) return 25;

    if (this.isMeleeSkill(skill)) {
      if (dist < 100) return 28;
      if (dist < 170) return 5;
      return -dist * 0.15;
    }

    if (skill.projectile) {
      const effRange = Math.min(skill.range || 350, 480);
      if (dist > 120 && dist < effRange + 60) return 22;
      if (dist < 100) return -18;
      return 8 - (dist - effRange) * 0.06;
    }

    if (skill.aoe) {
      const effRange = (skill.range || 150) + (skill.aoeRadius || 0) * 0.5;
      if (dist < effRange + 40) return 18;
      return -10;
    }

    // 默认按技能声明范围
    const effRange = skill.range || 150;
    if (dist < effRange + 30) return 12;
    return -dist * 0.05;
  }

  scoreCharacterCombo(skill) {
    const f = this.fighter;
    const charId = f.character.id;
    let bonus = 0;

    if (charId === 'gojo') {
      // 苍/赫用过之后，茈优先级大幅提升
      if (skill.id === 'skill3') {
        if (f.blueUsed || f.redUsed) bonus += 35;
        if (f.cursedEnergy > f.maxCursedEnergy * 0.65) bonus += 10;
      }
      // 优先先把苍/赫打出去，为茈做铺垫
      if ((skill.id === 'skill1' && !f.blueUsed) || (skill.id === 'skill2' && !f.redUsed)) {
        bonus += 8;
      }
    }

    if (charId === 'sukuna') {
      // 捌：贴身终结技
      if (skill.id === 'skill3') {
        const dist = Math.abs(this.target.x - f.x);
        if (dist < 100) bonus += 25;
        if (this.target.currentHp / this.target.maxHp < 0.45) bonus += 15;
      }
      // 灶（开）：距离越远越合适，太近容易空
      if (skill.id === 'skill4') {
        const dist = Math.abs(this.target.x - f.x);
        if (dist > 220) bonus += 12;
        if (dist < 160) bonus -= 20;
      }
    }

    if (charId === 'yuji') {
      // 赤磷悦动：开场没 buff 时优先开
      if (skill.id === 'skill2') {
        const hasSurge = typeof f.hasBloodSurge === 'function' && f.hasBloodSurge();
        if (!hasSurge) bonus += 22;
        else bonus -= 15;
      }
      // 穿血：中距离消耗
      if (skill.id === 'skill3') {
        const dist = Math.abs(this.target.x - f.x);
        if (dist > 140 && dist < 400) bonus += 10;
      }
    }

    return bonus;
  }

  isMeleeSkill(skill) {
    return !!skill.melee || !!skill.contactRequired ||
           (skill.type === 'yuji_divergent_fist') ||
           (skill.type === 'sukuna_dismantle');
  }

  isFastSkill(skill) {
    return skill.projectile && (skill.projectileSpeed || 0) >= 18;
  }

  getSkillEffectiveRange(skill) {
    if (skill.fullScreen) return 9999;
    if (this.isMeleeSkill(skill)) return skill.range || 80;
    if (skill.projectile) return Math.min(skill.range || 350, 480);
    if (skill.aoe) return (skill.range || 150) + (skill.aoeRadius || 0) * 0.5;
    return skill.range || 150;
  }

  executeAction() {
    if (this.actionTimer > 0) {
      this.actionTimer--;
    }

    const f = this.fighter;
    const t = this.target;
    if (!t) return;

    const dx = t.x - f.x;
    const dist = Math.abs(dx);

    switch (this.currentAction) {
      case 'attack':
        if (dist < f.getAttackRange() + 20) {
          const atk = f.basicAttack();
          if (atk) {
            f.velocity.x = 0;
          }
        } else {
          f.velocity.x = f.speed * (f.facingRight ? 1 : -1) * 0.7;
        }
        break;

      case 'approach':
        // 贴地移动，避免无脑飞天
        f.velocity.x = f.speed * (f.facingRight ? 1 : -1) * 0.85;
        // 只有在需要追击空中远程目标时才小跳
        if (f.grounded && dist > 120 && dist < 250 && t.y < f.y - 40 && Math.random() < 0.12) {
          f.velocity.y = -10;
          f.grounded = false;
        }
        break;

      case 'retreat':
        f.velocity.x = -f.speed * (f.facingRight ? 1 : -1) * 0.75;
        break;

      case 'dodge':
        if (dist < 170) {
          f.velocity.x = -f.speed * 2 * (f.facingRight ? 1 : -1);
          f.velocity.y = -8;
          f.grounded = false;
          f.invincible = true;
          f.invincibleTimer = 10;
        }
        break;

      case 'hold':
        f.velocity.x *= 0.7;
        break;

      default:
        if (this.currentAction && this.currentAction.startsWith('skill_')) {
          const skillId = this.currentAction.replace('skill_', '');
          const skill = f.character.skills.find(s => s.id === skillId);
          if (skill && f.cooldowns[skillId] <= 0 && f.cursedEnergy >= skill.cost) {
            f.useSkill(skillId);
          }
          this.currentAction = 'approach';
          this.actionTimer = 15;
        } else {
          f.velocity.x = 0;
        }
        break;
    }

    // 领域展开
    if (this.currentAction === 'ultimate' && f.canUseUltimate()) {
      f.useUltimate();
      this.domainUseCount++;
      // 每次展开后冷却递增：首次 5 秒，之后每次 +3 秒
      this.domainCooldown = 300 + (this.domainUseCount - 1) * 180;
      this.domainDecisionCooldown = 60;
      this.currentAction = 'approach';
      this.actionTimer = 20;
    }

    // 地面摩擦力
    if (f.grounded) {
      f.velocity.x *= 0.85;
    }
  }

  reset() {
    this.decisionTimer = 0;
    this.currentAction = null;
    this.actionTimer = 0;
    this.dodgeCooldown = 0;
    this.domainCooldown = 0;
    this.domainDecisionCooldown = 0;
    this.domainUseCount = 0;
  }
}
