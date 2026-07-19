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
    this.blockCooldown = 0;
    this.skillPriority = []; // 技能使用优先级
    this.barrierUsed = false; // 是否已使用屏障
    this.domainUsed = false;  // 是否已使用领域
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
    if (this.blockCooldown > 0) this.blockCooldown--;

    // 僵直状态不做决策
    if (this.fighter.state === 'stunned') return;

    if (this.decisionTimer <= 0) {
      this.makeDecision();
      this.decisionTimer = this.reactionSpeed + Math.floor(Math.random() * 15);
    }

    this.executeAction();
  }

  makeDecision() {
    const dx = this.target.x - this.fighter.x;
    const dy = this.target.y - this.fighter.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const facingTarget = (dx > 0 && this.fighter.facingRight) || (dx < 0 && !this.fighter.facingRight);

    // 面朝目标
    if (dx > 0) this.fighter.facingRight = true;
    else if (dx < 0) this.fighter.facingRight = false;

    // 被击状态不做决策
    if (this.fighter.state === 'hit' || this.fighter.state === 'casting') return;

    const char = this.fighter.character;
    const attackRange = this.fighter.getAttackRange();
    const isGojo = char.id === 'gojo';

    // Gojo AI：屏障全开（HP低于40%时）
    if (isGojo && !this.barrierUsed && this.fighter.currentHp < this.fighter.maxHp * 0.4) {
      if (this.fighter.barrierCooldown <= 0 && Math.random() < 0.3) {
        this.currentAction = 'barrier';
        this.actionTimer = 10;
        this.barrierUsed = true;
        return;
      }
    }

    // Gojo AI：无量空处（HP低于30%且未使用过）
    if (isGojo && !this.domainUsed && this.fighter.currentHp < this.fighter.maxHp * 0.3) {
      if (this.fighter.canUseUltimate() && Math.random() < 0.4) {
        this.currentAction = 'ultimate';
        this.actionTimer = 10;
        this.domainUsed = true;
        return;
      }
    }

    // 领域展开判断
    if (!isGojo && this.fighter.canUseUltimate() && this.fighter.currentHp < this.fighter.maxHp * 0.4 && Math.random() < 0.3) {
      this.currentAction = 'ultimate';
      this.actionTimer = 10;
      return;
    }

    // Gojo AI：茈释放判断（使用skill3）
    if (isGojo && this.fighter.cooldowns['skill3'] <= 0 && this.fighter.cursedEnergy >= 100 && Math.random() < 0.3) {
      this.currentAction = 'skill_skill3';
      this.actionTimer = 10;
      return;
    }

    // 躲避判断
    if (this.target.state === 'attacking' || this.target.state === 'casting') {
      if (dist < 150 && this.dodgeCooldown <= 0 && Math.random() < this.difficulty * 0.7) {
        this.currentAction = 'dodge';
        this.actionTimer = 15;
        this.dodgeCooldown = 60;
        return;
      }
    }

    // 距离判断
    if (dist < attackRange && facingTarget) {
      // 近战范围
      const roll = Math.random();
      if (roll < this.aggressiveness * 0.5) {
        // 普通攻击
        this.currentAction = 'attack';
        this.actionTimer = 12;
      } else if (roll < this.aggressiveness * 0.8) {
        // 使用技能
        this.tryUseSkill();
      } else {
        // 后退
        this.currentAction = 'retreat';
        this.actionTimer = 20;
      }
    } else if (dist < 300) {
      // 中距离
      if (Math.random() < this.aggressiveness * 0.6) {
        this.currentAction = 'approach';
        this.actionTimer = 15;
      } else {
        this.tryUseSkill();
      }
    } else {
      // 远距离
      this.currentAction = 'approach';
      this.actionTimer = 25;
    }
  }

  tryUseSkill() {
    const char = this.fighter.character;
    const availableSkills = char.skills.filter(s => {
      return this.fighter.cooldowns[s.id] <= 0 &&
             this.fighter.cursedEnergy >= s.cost;
    });

    if (availableSkills.length > 0) {
      const skill = availableSkills[Math.floor(Math.random() * availableSkills.length)];
      this.currentAction = 'skill_' + skill.id;
      this.actionTimer = 15;
    } else {
      this.currentAction = 'approach';
      this.actionTimer = 15;
    }
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
        f.velocity.x = f.speed * (f.facingRight ? 1 : -1) * 0.8;
        if (dist < 50 && Math.random() < 0.3) {
          f.velocity.y = -12;
          f.grounded = false;
        }
        break;

      case 'retreat':
        f.velocity.x = -f.speed * (f.facingRight ? 1 : -1) * 0.7;
        break;

      case 'dodge':
        if (dist < 100) {
          f.velocity.x = -f.speed * 2 * (f.facingRight ? 1 : -1);
          f.velocity.y = -8;
          f.grounded = false;
          f.invincible = true;
          f.invincibleTimer = 10;
        }
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
      this.currentAction = 'approach';
      this.actionTimer = 20;
    }

    // Gojo 屏障全开
    if (this.currentAction === 'barrier' && f.character.id === 'gojo') {
      f.activateBarrier();
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
    this.blockCooldown = 0;
    this.barrierUsed = false;
    this.domainUsed = false;
  }
}