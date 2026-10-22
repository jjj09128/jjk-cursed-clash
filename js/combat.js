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
    this.comboDisplay = { text: '', timer: 0, damage: 0 };
    this.damageNumbers = [];
    this.skillTexts = [];
    this.healTexts = [];
    this.groundY = 0;
    this.domainActive = false;
    this.domainTimer = 0;
    this.infiniteVoidStun = 0;
    this.delayedHits = [];
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
    this.damageNumbers = [];
    this.skillTexts = [];
    this.healTexts = [];
    this.groundY = this.canvas.height * 0.78;
    this._domainDeclared = false;
    this._domainClashDeclared = false;
    this._domainClashTimer = 0;
    this._domainClashResolved = false;
    this._syncOpponents();
  }

  _syncOpponents() {
    // 确保当前上场角色的 opponent 指向当前实际对手
    if (this.player && this.enemy) {
      this.player.setOpponent(this.enemy);
      this.enemy.setOpponent(this.player);
    }
  }

  setActivePlayer(idx) {
    this.activePlayerIdx = idx;
    this.player = this.playerTeam[idx];
    this._syncOpponents();
  }

  setActiveEnemy(idx) {
    this.activeEnemyIdx = idx;
    this.enemy = this.enemyTeam[idx];
    this._syncOpponents();
  }

  update() {
    this.updateFighters();
    this.updateProjectiles();
    this.updateDamageNumbers();
    this.updateSkillTexts();
    this.updateHealTexts();
    this.applyBoundaries();
    this.applyGravity();
    this.updateGojoPassives();
    this.updateDomainEffects();
    this.updateSpaceRipples();
    this.updateDelayedHits();
  }

  // 统一记录命中伤害：更新统计与领域展开伤害充能
  recordHitDamage(attacker, damage) {
    if (!attacker || damage <= 0) return;
    attacker.totalDamage += damage;
    attacker.domainDamageCharge += damage;
  }

  updateDelayedHits() {
    for (let i = this.delayedHits.length - 1; i >= 0; i--) {
      const dh = this.delayedHits[i];
      dh.timer--;
      // 滞留期间：淡蓝咒力在创口表层脉动
      if (dh.isDivergentFist && dh.target && dh.target.state !== 'dead' && dh.timer > 0) {
        if (dh.timer % 4 === 0) {
          this.particles.divergentFistLinger(dh.target.x, dh.target.y - 30);
        }
        continue;
      }
      if (dh.timer <= 0) {
        const target = dh.target;
        if (target && target.state !== 'dead') {
          const actual = target.takeDamage(dh.damage, dh.knockbackX, dh.knockbackY, dh.hitstun, dh.pierce);
          if (actual === 0) {
            this.addDamageNumber(target.x, target.y - 50, 0, '#00d4ff', '無下限');
          } else {
            this.addDamageNumber(target.x, target.y - 50, actual, '#5b8def', '迳庭拳');
          }
          if (dh.isDivergentFist) {
            // 第二段：滞后咒力爆破（靛蓝冲击波 + 蓝色残影 + 重震屏）
            this.particles.divergentFistBurst(target.x, target.y - 30, dh.knockbackX > 0 ? 1 : -1);
            // 赤磷悦动激活时：双重色泽碰撞 —— 外圈赤红 + 内里青蓝
            if (dh.bloodSurgeActive) {
              this.particles.bloodCursedBurst(target.x, target.y - 30, dh.knockbackX > 0 ? 1 : -1);
            }
          } else {
            this.particles.hitEffect(target.x, target.y - 30, '#d63031');
          }
          this.audio.playHeavyHit();
        }
        this.delayedHits.splice(i, 1);
      }
    }
  }

  updateFighters() {
    if (this.player) {
      this.player.update();
      this.checkHeal(this.player);
    }
    if (this.enemy) {
      this.enemy.update();
      this.checkHeal(this.enemy);
    }
    if (this.ai) this.ai.update();
  }

  checkHeal(fighter) {
    if (fighter.lastHealAmount && fighter.lastHealAmount > 0) {
      this.addHealText(fighter.x, fighter.y - 40, fighter.lastHealAmount);
      fighter.lastHealAmount = 0;
    }
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

    const pActive = this.player && this.player.domainActive && this.player.domainTimer > 0;
    const eActive = this.enemy && this.enemy.domainActive && this.enemy.domainTimer > 0;

    // 自动开启简易领域：对方展开完整领域而自己没有展开时自动触发
    if (eActive && !pActive && this.player && !this.player.isSimpleDomainActive()) {
      this.playerSimpleDomain();
    }
    if (pActive && !eActive && this.enemy && !this.enemy.isSimpleDomainActive()) {
      if (this.enemy.activateSimpleDomain()) {
        this.addSkillText(this.enemy.x, this.enemy.y - 80, '簡易領域', '#b4dcff');
        this.particles.barrierExpandEffect(this.enemy.x, this.enemy.y);
        this.audio.playDomain();
      }
    }

    // 领域对抗：双方同时展开领域
    if (pActive && eActive) {
      const resolved = this.handleDomainClash();
      // 若已判定为规则抵消（術式互角），双方领域仍存续，需继续施加“无必中”效果
      if (resolved === 'neutral') {
        this.applyDomainEffects(this.player, this.enemy, true);
        this.applyDomainEffects(this.enemy, this.player, false);
      }
      return;
    }

    // 单独处理玩家领域
    if (pActive) {
      this.applyDomainEffects(this.player, this.enemy, true);
    }

    // 单独处理敌方领域
    if (eActive) {
      this.applyDomainEffects(this.enemy, this.player, false);
    }
  }

  // 通用领域效果应用（caster: 展开者, victim: 受害者, isPlayerCaster: 是否玩家展开）
  applyDomainEffects(caster, victim, isPlayerCaster) {
    if (!caster || !victim) return;
    const domain = caster.character.ultimate;
    if (!domain) return;
    const phase = caster.domainPhase;

    // 领域已在对抗中崩溃，不再生效
    if (caster.domainCollapsed) return;

    // 宣告阶段只触发一次特效
    if (phase === 'declaration' && !caster._domainDeclared) {
      caster._domainDeclared = true;
      // 虎杖「农家乐领域」：暖米色柔光启动特效（非暴烈白光闪屏）
      if (caster.character.id === 'yuji') {
        this.particles.screenFlash = { color: '#fff3d6', alpha: 0.85, duration: 0.8 };
        this.particles.screenShake = { intensity: 5, duration: 0.4 };
        this.audio.playDomain();
        this.addSkillText(caster.x, caster.y - 80, '領域展開', '#fff3d6');
        this.addSkillText(caster.x, caster.y - 60, domain.name || '農家楽領域', '#ffe8b8');
        // 空间褶皱蔓延：以虎杖双脚为中心，暖米色柔光帷幕铺展
        this.particles.yujiDomainFold(caster.x, caster.y, 600);
        // 起手结印收拢残留（胸口暖光核心）
        this.particles.yujiDomainPreCast(caster.x, caster.y);
      } else {
        this.particles.screenFlash = { color: '#ffffff', alpha: 0.95, duration: 0.6 };
        this.particles.screenShake = { intensity: 15, duration: 0.8 };
        this.audio.playDomain();
        this.addSkillText(caster.x, caster.y - 80, '領域展開', '#ffffff');
        this.addSkillText(caster.x, caster.y - 60, domain.name || '無量空処', caster.character.glowColor || caster.character.color);
      }
    }

    // 扩张阶段：黑暗吞噬 / 虎杖领域为乡间场景淡入
    if (phase === 'expanding') {
      if (caster.character.id === 'yuji') {
        // 暖米色氛围微粒持续铺散（柔和，无震屏）
        if (caster.domainTimer % 8 === 0) {
          this.particles.yujiDomainFold(caster.x, caster.y, 200);
        }
      } else {
        this.particles.screenShake = { intensity: 4, duration: 0.3 };
      }
    }

    // 判断领域内必中规则是否生效
    // 1. 对抗后规则抵消
    // 2. 受害者有简易领域（规则免疫罩）
    // 3. 受害者是开放型领域（无结界，无法被简易领域抵消，但这里作为 caster 方不适用）
    const sureHitDisabled = caster.domainSureHitDisabled || victim.isSimpleDomainActive();

    // 领域维持期间：敌人僵直 + 持续伤害 + 自己回血回蓝
    const controlPhases = ['active', 'declaration', 'expanding'];
    if (controlPhases.includes(phase)) {
      // 领域内回血回蓝（按配置生效，当前五条悟/宿傩已移除）
      if (caster.domainTimer % 60 === 0) {
        const heal = domain.allyBuff?.healPerSec || 0;
        const energy = domain.allyBuff?.energyPerSec || 0;
        if (heal > 0) {
          caster.currentHp = Math.min(caster.maxHp, caster.currentHp + heal);
          this.addHealText(caster.x, caster.y - 40, heal);
        }
        if (energy > 0) {
          caster.cursedEnergy = Math.min(caster.maxCursedEnergy, caster.cursedEnergy + energy);
        }
      }

      if (sureHitDisabled) {
        if (caster.domainTimer % 180 === 0 && caster.domainClashResult === '術式互角') {
          this.addSkillText((caster.x + victim.x) / 2, caster.y - 70, '必中無効', '#ffd700');
        }
        if (domain.domainType === 'open') {
          // 简易领域完全抵消开放型领域的必中斩击伤害
          if (caster.domainTimer % 60 === 0) {
            this.addSkillText(victim.x, victim.y - 70, '必中無効', '#b4dcff');
          }
        }
      } else if (domain.domainType === 'open') {
        if (caster.domainTimer % 30 === 0) {
          if (caster.character.id === 'yuji' && domain.soulSlash) {
            // 虎杖农家乐领域：灵魂限定・解，只作用于灵魂层面
            const soulDmg = domain.soulSlash.damage || 55;
            if (victim.state !== 'dead') {
              victim.currentHp = Math.max(0, victim.currentHp - soulDmg);
              this.addDamageNumber(victim.x, victim.y - 55, soulDmg, '#ff7675', '魂解');
              this.particles.soulSlashCut(victim.x, victim.y - 30, caster.facingRight ? 1 : -1);
              this.audio.playSukunaSlash('rapid');
            }
          } else {
            const slashDmg = 80;
            const actual = victim.takeDamage(slashDmg, 0, 0, 5, true);
            this.addDamageNumber(victim.x, victim.y - 55, actual, '#ff1a1a', '捌解');
            this.particles.sukunaSlashCut(victim.x, victim.y - 30, caster.facingRight ? 1 : -1);
            this.audio.playSukunaSlash('rapid');
          }
        }
      } else {
        // 封闭型领域：受害者僵直
        if (victim.state !== 'dead') {
          victim.state = 'stunned';
          victim.stateTimer = 2;
          victim.velocity.x = 0;
          if (!victim.grounded) victim.velocity.y = 0;
        }
        // 每 15 帧一次信息灌注伤害（通用化）；五条悟无量空处仅僵直，不产生伤害
        if (caster.character.id !== 'gojo' && caster.domainTimer % 15 === 0) {
          const dmg = Math.round((domain.infoDamage || 30) * (isPlayerCaster ? 1 : 1));
          const actual = victim.takeDamage(dmg, 0, 0, 10);
          if (actual === 0) {
            this.addDamageNumber(victim.x, victim.y - 40, 0, '#00d4ff', '無下限');
          } else {
            this.addDamageNumber(victim.x, victim.y - 40, actual, '#6c5ce7', '情報灌注');
          }
          this.particles.hitEffect(victim.x, victim.y - 30, caster.character.color);
        }
      }
    }

    // 虎杖「农家乐领域」维持期间：记忆沉浸式光影 + 乡间落叶飘荡 + 暖光氛围
    if (phase === 'active' && caster.character.id === 'yuji') {
      // 记忆沉浸式光影：路边间歇性浮现半透明虚影（祖父与幼时虎杖的回忆剪影）
      if (caster.domainTimer % 150 === 0) {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const ghostX = 80 + Math.random() * (w - 160);
        const ghostY = this.groundY - 20 - Math.random() * 30;
        const kinds = ['grandpa_eat', 'grandpa_walk', 'grandpa_talk', 'child_play'];
        const kind = kinds[Math.floor(Math.random() * kinds.length)];
        this.particles.yujiDomainMemoryGhost(ghostX, ghostY, kind);
      }
      // 乡间落叶飘荡（场景动态点缀）
      if (caster.domainTimer % 30 === 0) {
        this.particles.yujiDomainLeaf(this.canvas.width, this.canvas.height);
      }
      // 暖米色治愈系咒力持续流转（少量氛围微粒）
      if (caster.domainTimer % 12 === 0) {
        const w = this.canvas.width;
        this.particles.emit(
          Math.random() * w,
          this.groundY - Math.random() * 100,
          1,
          { color: '#ffefc8', speed: 0.5, spread: Math.PI * 2, life: 2.0, size: 1.5, gravity: -0.03, quality: 'normal' }
        );
      }
    }

    // 解除阶段仍保持僵直（仅封闭型领域）
    if (phase === 'releasing' && !sureHitDisabled && domain.domainType !== 'open') {
      if (victim.state !== 'dead') {
        victim.state = 'stunned';
        victim.stateTimer = 2;
      }
    }

    // 残留阶段：敌人瘫软下坠（仅封闭型领域）
    if (phase === 'aftermath' && !sureHitDisabled && domain.domainType !== 'open') {
      if (victim.state !== 'dead') {
        victim.state = 'stunned';
        victim.stateTimer = 2;
        victim.velocity.y = 2;
      }
    }

    // 领域结束时特效
    if (caster.domainTimer === 1) {
      // 虎杖「农家乐领域」：消散收尾 —— 景物化作光点碎屑飘散，无暴烈震屏
      if (caster.character.id === 'yuji') {
        this.particles.yujiDomainDissipate(this.canvas.width, this.canvas.height, this.groundY);
        this.particles.screenFlash = { color: '#fff6dc', alpha: 0.4, duration: 0.6 };
        this.particles.screenShake = { intensity: 3, duration: 0.3 };
        this.audio.playDomain();
      } else {
        this.particles.domainEffect('barrierBurst');
        this.particles.screenShake = { intensity: 12, duration: 0.5 };
        this.audio.playDomain();
        if (!sureHitDisabled && victim.state !== 'dead' && caster.character.id !== 'gojo' && domain.domainType !== 'open') {
          this.addDamageNumber(victim.x, victim.y - 50, 0, '#6c5ce7', '意識崩壊');
        }
      }
    }
  }

  // 领域对抗：双方同时展开领域
  // 规则：空间吞噬 / 规则抵消 / 阶位碾压 + 简易领域 / 领域展延 / 开放型领域
  // 返回值：'ongoing' 对拼中 / 'resolved' 已分出胜负（一方崩溃） / 'neutral' 规则抵消
  handleDomainClash() {
    const p = this.player;
    const e = this.enemy;
    if (!p || !e) return 'ongoing';

    // 只触发一次对抗宣告
    if (!this._domainClashDeclared) {
      this._domainClashDeclared = true;
      this.particles.screenFlash = { color: '#ffffff', alpha: 1.0, duration: 1.0 };
      this.particles.screenShake = { intensity: 20, duration: 1.2 };
      this.audio.playDomain();
      this.addSkillText((p.x + e.x) / 2, p.y - 100, '領域対抗', '#ffd700');
      // 初始化对抗状态
      p.domainSureHitDisabled = false;
      e.domainSureHitDisabled = false;
      p.domainClashRole = null;
      e.domainClashRole = null;
      p.domainClashResult = null;
      e.domainClashResult = null;
    }

    const pDomain = p.character.ultimate;
    const eDomain = e.character.ultimate;
    const pType = pDomain?.domainType || 'none';
    const eType = eDomain?.domainType || 'none';
    const pTier = pDomain?.domainTier || 0;
    const eTier = eDomain?.domainTier || 0;

    // 阶段 1：领域对拼（持续 3 秒）—— 咒力互相冲刷、空间争夺
    const CLASH_DURATION = 180;
    this._domainClashTimer++;
    if (this._domainClashTimer <= CLASH_DURATION) {
      // 对拼期间：双方每 10 帧受到对方领域的基础伤害
      if (this._domainClashTimer % 10 === 0) {
        const pDmg = Math.round((eDomain?.infoDamage || 30) * 0.15);
        const eDmg = Math.round((pDomain?.infoDamage || 30) * 0.15);
        if (pDmg > 0 && p.state !== 'dead') {
          const actual = p.takeDamage(pDmg, 0, 0, 5);
          this.addDamageNumber(p.x, p.y - 40, actual, '#ff6b35', '咒力激突');
          this.particles.hitEffect(p.x, p.y - 30, e.character.color);
        }
        if (eDmg > 0 && e.state !== 'dead') {
          const actual = e.takeDamage(eDmg, 0, 0, 5);
          this.addDamageNumber(e.x, e.y - 40, actual, '#ff6b35', '咒力激突');
          this.particles.hitEffect(e.x, e.y - 30, p.character.color);
        }
      }
      // 对拼期间双方仍可自由行动，不再强制僵直
      return 'ongoing';
    }

    // 阶段 2：对抗结果判定（只执行一次）
    if (this._domainClashResolved) {
      // 若已判定为规则抵消，领域继续存续
      if (p.domainSureHitDisabled && e.domainSureHitDisabled) return 'neutral';
      return 'resolved';
    }
    this._domainClashResolved = true;

    // 阶位碾压：任意一方 tier 差 >= 3，低阶领域直接崩溃
    if (pTier > 0 && eTier > 0 && Math.abs(pTier - eTier) >= 3) {
      const winner = pTier > eTier ? p : e;
      const loser = winner === p ? e : p;
      this._resolveDomainCrush(winner, loser, '階位圧制');
      return 'resolved';
    }

    // 计算双方领域强度
    const pPower = this._calcDomainPower(p, pDomain);
    const ePower = this._calcDomainPower(e, eDomain);
    const ratio = pPower / Math.max(ePower, 0.001);

    // 空间吞噬阈值：强度比 >= 1.7
    // 规则抵消阈值：强度比在 1/1.5 ~ 1.5 之间
    const DEVOUR_THRESHOLD = 1.7;
    const NEUTRAL_LOW = 1 / 1.5;
    const NEUTRAL_HIGH = 1.5;

    if (ratio >= DEVOUR_THRESHOLD) {
      // 玩家领域吞噬敌方
      this._resolveDomainDevour(p, e, pPower, ePower);
    } else if (ratio <= 1 / DEVOUR_THRESHOLD) {
      // 敌方领域吞噬玩家
      this._resolveDomainDevour(e, p, ePower, pPower);
    } else if (ratio >= NEUTRAL_LOW && ratio <= NEUTRAL_HIGH) {
      // 術式互角：双方必中规则抵消，领域继续存在但无控制/必中伤害
      this._resolveDomainNeutralization(p, e);
      return 'neutral';
    } else {
      // 1/1.7 ~ 1/1.5 或 1.5 ~ 1.7 的过渡区间，视为微弱吞噬
      if (ratio > 1) {
        this._resolveDomainDevour(p, e, pPower, ePower, true);
      } else {
        this._resolveDomainDevour(e, p, ePower, pPower, true);
      }
    }
    return 'resolved';
  }

  // 计算领域综合强度
  _calcDomainPower(fighter, domain) {
    if (!domain || !domain.domainTier) return 0;
    const tier = domain.domainTier;
    const completion = domain.domainCompletion || 0.5;
    const range = domain.domainRange || 400;
    const binding = domain.domainBinding || 0;
    const energyRatio = fighter.maxCursedEnergy > 0 ? fighter.cursedEnergy / fighter.maxCursedEnergy : 0;
    // 开放式领域有额外现实空间权重
    const openBonus = domain.domainType === 'open' ? 8 : 0;
    return tier * 25
      + completion * 20
      + range / 80
      + binding * 35
      + energyRatio * 12
      + openBonus;
  }

  // 阶位碾压 / 空间吞噬：胜者继续领域，败者领域崩溃
  _resolveDomainDevour(winner, loser, winnerPower, loserPower, weak = false) {
    const intensity = Math.min(1, winnerPower / Math.max(loserPower, 0.001));
    winner.domainClashRole = 'winner';
    loser.domainClashRole = 'loser';
    loser.collapseDomain();
    this.addSkillText((winner.x + loser.x) / 2, winner.y - 80, weak ? '領域優勢' : '空間吞噬', winner.character.glowColor || winner.character.color);
    this.particles.screenFlash = { color: winner.character.glowColor || winner.character.color, alpha: 0.7, duration: 0.7 };
    this.particles.screenShake = { intensity: weak ? 10 : 16, duration: 0.6 };
    this.audio.playDomain();
    // 崩溃方受到基于强度差的反噬伤害
    const baseDmg = winner.character.ultimate?.infoDamage || 30;
    const dmg = Math.round(baseDmg * (0.6 + intensity * 1.2));
    if (dmg > 0 && loser.state !== 'dead') {
      const actual = loser.takeDamage(dmg, winner.x < loser.x ? 120 : -120, -3, 20);
      this.addDamageNumber(loser.x, loser.y - 40, actual, '#6c5ce7', '情報灌注');
      this.particles.hitEffect(loser.x, loser.y - 30, winner.character.color);
    }
  }

  // 阶位碾压特殊结算
  _resolveDomainCrush(winner, loser, label) {
    winner.domainClashRole = 'winner';
    loser.domainClashRole = 'loser';
    loser.collapseDomain();
    this.addSkillText((winner.x + loser.x) / 2, winner.y - 80, label, winner.character.glowColor || winner.character.color);
    this.particles.screenFlash = { color: '#ffffff', alpha: 0.9, duration: 0.9 };
    this.particles.screenShake = { intensity: 22, duration: 1.0 };
    this.audio.playDomain();
    // 高阶碾压：全额必中攻击
    const baseDmg = winner.character.ultimate?.infoDamage || 30;
    const dmg = Math.round(baseDmg * 3);
    if (dmg > 0 && loser.state !== 'dead') {
      const actual = loser.takeDamage(dmg, winner.x < loser.x ? 160 : -160, -5, 30);
      this.addDamageNumber(loser.x, loser.y - 40, actual, '#6c5ce7', '情報灌注');
      this.particles.hitEffect(loser.x, loser.y - 30, winner.character.color);
    }
  }

  // 规则抵消：術式互角
  _resolveDomainNeutralization(p, e) {
    p.domainClashRole = 'neutral';
    e.domainClashRole = 'neutral';
    p.domainSureHitDisabled = true;
    e.domainSureHitDisabled = true;
    p.domainClashResult = '術式互角';
    e.domainClashResult = '術式互角';
    this.addSkillText((p.x + e.x) / 2, p.y - 80, '術式互角', '#ffd700');
    this.particles.screenFlash = { color: '#ffd700', alpha: 0.7, duration: 0.8 };
    this.particles.screenShake = { intensity: 8, duration: 0.4 };
    this.audio.playDomain();
  }

  // 前置打断领域：在敌方完成领域展开前摇瞬间，以极速斩击切断术式构筑流程
  _interruptDomainCast(attacker, target) {
    if (!target || !target.domainActive) return;
    // 立即崩溃对方领域并触发更长熔断
    target.collapseDomain();
    // 打断反馈文字与特效
    this.addSkillText(target.x, target.y - 90, '領域打ち切り', '#ff2200');
    this.addSkillText(attacker.x, attacker.y - 80, '術式中断', '#ffd700');
    this.particles.screenShake = { intensity: 14, duration: 0.6 };
    this.particles.screenFlash = { color: '#ff2200', alpha: 0.6, duration: 0.4 };
    this.particles.slashEffect(target.x, target.y - 30, attacker.facingRight ? 'right' : 'left', '#ff2200');
    this.audio.playError();
    // 打断成功造成反噬伤害（基于目标领域 infoDamage）
    const baseDmg = target.character.ultimate?.infoDamage || 30;
    const dmg = Math.round(baseDmg * 1.2);
    if (dmg > 0 && target.state !== 'dead') {
      const dir = attacker.facingRight ? 1 : -1;
      const actual = target.takeDamage(dmg, dir * 100, -4, 18);
      if (actual === 0) {
        this.addDamageNumber(target.x, target.y - 50, 0, '#00d4ff', '無下限');
      } else {
        this.addDamageNumber(target.x, target.y - 50, actual, '#ff2200', '反噬');
      }
      this.particles.hitEffect(target.x, target.y - 30, '#ff2200');
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

      // 穿血：蓄力延迟阶段（指尖血液压缩，不移动）
      if (p.type === 'yuji_piercing_blood' && p.spawnDelay > 0) {
        p.spawnDelay--;
        p.x -= p.vx; // 撤回移动，保持在指尖位置
        // 蓄力期间持续生成指尖血色涡流
        if (p.spawnDelay % 2 === 0) {
          this.particles.piercingBloodCharge(p.x, p.y, p.vx > 0 ? 1 : -1, p.bloodSurgeActive);
        }
        continue;
      }

      // 穿血：飞行途中生成血气尾迹与飞溅血滴
      if (p.type === 'yuji_piercing_blood') {
        p.trailTimer++;
        if (p.trailTimer % 2 === 0) {
          this.particles.piercingBloodTrail(p.x, p.y, p.vx > 0 ? 1 : -1, p.bloodSurgeActive);
        }
      }

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

      // 宿傩「灶（开）」巨型火焰箭矢：斩击铺垫后发射，命中后延迟引爆
      if (p.type === 'sukuna_fire_arrow') {
        this.updateFireArrowProjectile(p);
        if (p.phase === 'exploded' && p.phaseTimer <= 0) {
          this.projectiles.splice(i, 1);
          continue;
        }
        if (p.phase === 'travel') {
          if (p.x < -200 || p.x > this.canvas.width + 200 || p.y < -200 || p.y > this.canvas.height + 200) {
            this.projectiles.splice(i, 1);
            continue;
          }
          const target = p.owner === this.player ? this.enemy : this.player;
          if (target && this.checkProjectileHit(p, target)) {
            // 命中后转为延迟引爆阶段（扩散慢、弹道迟缓的特质）
            p.phase = 'exploding';
            p.phaseTimer = Math.round((p.skill.delayedDetonation || 0.22) * 60);
            p.vx = 0;
            p.vy = 0;
            p.x = target.x;
            p.y = target.y - 30;
            // 命中瞬间再补一道解斩击铺垫
            this.particles.sukunaSlashCut(p.x, p.y, p.owner.facingRight ? 1 : -1);
            this.audio.playSukunaSlash('rapid');
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
        if (p.pierce) {
          // 穿血：可贯穿同一目标一次后继续飞行
          const targetId = target.isPlayer ? 'player' : 'enemy';
          if (!p.hitTargets.has(targetId)) {
            p.hitTargets.add(targetId);
            this.handleProjectileHit(p, target);
          }
          if (p.x < -200 || p.x > this.canvas.width + 200) {
            this.projectiles.splice(i, 1);
          }
        } else {
          this.handleProjectileHit(p, target);
          this.projectiles.splice(i, 1);
        }
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
          if (actualDamage === 0) {
            this.addDamageNumber(target.x, target.y - 50, 0, '#00d4ff', '無下限');
          } else {
            this.addDamageNumber(target.x, target.y - 50, actualDamage, '#6c5ce7');
          }
          this.recordHitDamage(caster, actualDamage);
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
    const attacker = proj.owner;
    const dir = proj.vx > 0 ? 1 : -1;

    if (skill.type === 'gojo_blue') {
      const actualDamage = target.takeDamage(skill.damage, dir * skill.knockback, -3, skill.hitstun);
      if (actualDamage === 0) {
        this.addDamageNumber(target.x, target.y - 40, 0, '#00d4ff', '無下限');
      } else {
        this.addDamageNumber(target.x, target.y - 40, actualDamage, '#0984e3');
      }
      this.recordHitDamage(attacker, actualDamage);
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
      if (actualDamage === 0) {
        this.addDamageNumber(target.x, target.y - 40, 0, '#00d4ff', '無下限');
      } else {
        this.addDamageNumber(target.x, target.y - 40, actualDamage, '#e74c3c');
      }
      this.recordHitDamage(attacker, actualDamage);
      if (skill.vulnerabilityDebuff) target.addBuff('defense', skill.vulnerabilityDebuff.value, skill.vulnerabilityDebuff.duration);
      this.audio.playRedImpact();
      this.particles.screenShake = { intensity: 8, duration: 0.35 };
      this.particles.screenFlash = { color: '#e74c3c', alpha: 0.3, duration: 0.2 };
      return;
    }

    // 宿傩「解」连射型命中：闪过极细暗色斩痕 + 高频破空锐响 + 物体崩裂
    if (skill.type === 'sukuna_slash') {
      const actualDamage = target.takeDamage(skill.damage, dir * skill.knockback, -3, skill.hitstun);
      if (actualDamage === 0) {
        this.addDamageNumber(target.x, target.y - 40, 0, '#00d4ff', '無下限');
      } else {
        this.addDamageNumber(target.x, target.y - 40, actualDamage, '#8b0000');
      }
      this.recordHitDamage(attacker, actualDamage);
      // 命中瞬间闪过极细暗色斩痕
      this.particles.sukunaSlashCut(target.x, target.y - 30, dir);
      // 高频尖锐破空锐响
      this.audio.playSukunaSlash('rapid');
      // 物体崩裂：少量暗色碎屑沿断面飞溅（无爆炸效果，干净利落）
      this.particles.emit(target.x, target.y - 30, 6, {
        color: '#2a0010', speed: 3, spread: Math.PI * 0.8, life: 0.35, size: 2, gravity: 0.4
      });
      return;
    }

    // 虎杖「穿血」命中：贯穿孔洞 + 体内血能迸发 + 灼烧血色光晕
    if (skill.type === 'yuji_piercing_blood') {
      const actualDamage = target.takeDamage(skill.damage, dir * skill.knockback, -4, skill.hitstun, skill.ignoreDefense > 0);
      if (actualDamage === 0) {
        this.addDamageNumber(target.x, target.y - 40, 0, '#00d4ff', '無下限');
      } else {
        this.addDamageNumber(target.x, target.y - 40, actualDamage, proj.bloodSurgeActive ? '#ff2020' : '#c0392b', '穿血');
      }
      this.recordHitDamage(attacker, actualDamage);
      // 命中特效：贯穿 + 体内血能迸发
      this.particles.piercingBloodHit(target.x, target.y - 30, dir, proj.bloodSurgeActive);
      this.audio.playHeavyHit();
      this.particles.screenShake = { intensity: 7, duration: 0.25 };
      return;
    }

    const actualDamage = target.takeDamage(skill.damage, proj.vx > 0 ? skill.knockback : -skill.knockback, skill.launch ? -8 : -3, skill.hitstun);
    if (actualDamage === 0) {
      this.addDamageNumber(target.x, target.y - 40, 0, '#00d4ff', '無下限');
    } else {
      this.addDamageNumber(target.x, target.y - 40, actualDamage, proj.color);
    }
    this.recordHitDamage(attacker, actualDamage);
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
    // 通用黑闪由 tryHitEnemy 统一处理；这里只保留主动位移效果
    this.tryHitEnemy(this.player, this.enemy, atk, false);
  }

  playerUseSkill(skillId) {
    if (!this.player) return null;
    const skill = this.player.character.skills.find(s => s.id === skillId) || this.player.character.ultimate;
    const tid = this.player.getSkillTechniqueId(skill);
    if (this.player.isTechniqueBurnout && this.player.isTechniqueBurnout(tid)) {
      this._showBurnoutFeedback(tid);
      return null;
    }
    const used = this.player.useSkill(skillId);
    if (!used) return null;
    // 释放语音
    this._playSkillVoice(used);
    this.executeSkill(this.player, this.enemy, used);
    return used;
  }

  _showBurnoutFeedback(techniqueId) {
    const techName = techniqueId ? techniqueId.replace(/_/g, ' ') : '術式';
    this.addSkillText(this.player.x, this.player.y - 100, `${techName} 熔断`, '#ff1e1e');
    this.audio.playError();
  }

  // 屏幕显示台词文字
  showCastText(text, characterId, skillId) {
    if (!text) return;
    const overlay = document.getElementById('cast-text-overlay');
    if (!overlay) return;
    const charColor = this._getCharColor(characterId);
    if (skillId === 'ultimate' || skillId === 'blackflash') {
      overlay.className = 'cast-text-overlay cast-text--ultimate';
    } else {
      overlay.className = 'cast-text-overlay cast-text--normal';
    }
    overlay.style.setProperty('--cast-color', charColor);
    overlay.innerHTML = `<span class="cast-line cast-line--ja">${text}</span>`;
    overlay.classList.remove('show');
    void overlay.offsetWidth;
    overlay.classList.add('show');
    clearTimeout(this._castTextTimer);
    this._castTextTimer = setTimeout(() => {
      overlay.classList.remove('show');
    }, 1800);
  }

  _getCharColor(characterId) {
    const map = {
      gojo: '#00d4ff',
      sukuna: '#ff4d6d',
      yuji: '#ff7675'
    };
    return map[characterId] || '#ffffff';
  }

  // 技能语音判定（玩家）
  _playSkillVoice(skill) {
    if (!skill || !this.audio) return;
    const id = skill.id;
    const charId = this.player && this.player.character ? this.player.character.id : null;
    this.audio.castSkill(id, charId);
  }

  // 通用技能语音：支持玩家或 AI
  _playSkillVoiceForCaster(caster, skill) {
    if (!skill || !this.audio || !caster) return;
    this.audio.castSkill(skill.id, caster.character.id);
  }

  playerUltimate() {
    if (!this.player) return null;
    // 如果已经在领域内，再次按 U 可提前解除
    if (this.player.domainActive && this.player.domainTimer > 0) {
      return this.playerReleaseDomain();
    }
    const tid = this.player.getPrimaryTechniqueId();
    if (this.player.isTechniqueBurnout && this.player.isTechniqueBurnout(tid)) {
      this._showBurnoutFeedback(tid);
      return null;
    }
    if (!this.player.canUseUltimate()) return null;
    const skill = this.player.useUltimate();
    if (!skill) return null;
    // 释放语音
    this._playSkillVoice(skill);
    if (skill.type === 'domain') {
      this.executeDomain(this.player, this.enemy, skill);
    } else {
      this.executeSkill(this.player, this.enemy, skill);
    }
    return skill;
  }

  playerReleaseDomain() {
    if (!this.player || !this.player.domainActive) return false;
    if (this.player.releaseDomainEarly()) {
      this.addSkillText(this.player.x, this.player.y - 80, '領域解除', '#ffffff');
      return true;
    }
    return false;
  }

  playerSimpleDomain() {
    if (!this.player) return false;
    if (this.player.activateSimpleDomain()) {
      this.addSkillText(this.player.x, this.player.y - 80, '簡易領域', '#b4dcff');
      this.particles.barrierExpandEffect(this.player.x, this.player.y);
      this.audio.playDomain();
      return true;
    }
    return false;
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

    if (this.player.character.id === 'gojo' && !this.player.isPassiveDisabled()) {
      this.player.invincibleTimer = 20;
      this.player.cursedEnergy = Math.min(this.player.maxCursedEnergy, this.player.cursedEnergy + 15);
      this.particles.emit(this.player.x, this.player.y - 30, 15, {
        color: '#00d4ff', speed: 6, spread: Math.PI * 2, life: 0.5, size: 4, gravity: -1
      });
    }

    this.particles.dodgeEffect(this.player.x, this.player.y - 30, this.player.character.color);
    this.audio.playDodge();
  }

  // ===== 双人模式：P2 操作方法 =====

  enemyAttack() {
    if (!this.enemy || !this.player) return;
    const atk = this.enemy.basicAttack();
    if (!atk) return;

    if (atk.extraEffects && atk.extraEffects.type === 'pull') {
      const dx = this.player.x - this.enemy.x;
      this.player.x -= Math.sign(dx) * atk.extraEffects.pullStrength * 0.5;
    }
    if (atk.extraEffects && atk.extraEffects.type === 'dash') {
      const dir = this.enemy.facingRight ? 1 : -1;
      this.enemy.x += dir * atk.extraEffects.dashDist * 0.5;
    }
    if (atk.extraEffects && atk.extraEffects.type === 'launch') {
      atk.knockback = atk.knockback * 1.5;
    }
    this.tryHitEnemy(this.enemy, this.player, atk, false);
  }

  enemyUseSkill(skillId) {
    if (!this.enemy) return null;
    const skill = this.enemy.character.skills.find(s => s.id === skillId) || this.enemy.character.ultimate;
    const tid = this.enemy.getSkillTechniqueId(skill);
    if (this.enemy.isTechniqueBurnout && this.enemy.isTechniqueBurnout(tid)) {
      this._showBurnoutFeedbackForCaster(this.enemy, tid);
      return null;
    }
    const used = this.enemy.useSkill(skillId);
    if (!used) return null;
    this._playSkillVoiceForCaster(this.enemy, used);
    this.executeSkill(this.enemy, this.player, used);
    return used;
  }

  enemyReleaseDomain() {
    if (!this.enemy || !this.enemy.domainActive) return false;
    if (this.enemy.releaseDomainEarly()) {
      this.addSkillText(this.enemy.x, this.enemy.y - 80, '領域解除', '#ffffff');
      return true;
    }
    return false;
  }

  enemyUltimate() {
    if (!this.enemy) return null;
    if (this.enemy.domainActive && this.enemy.domainTimer > 0) {
      return this.enemyReleaseDomain();
    }
    const tid = this.enemy.getPrimaryTechniqueId();
    if (this.enemy.isTechniqueBurnout && this.enemy.isTechniqueBurnout(tid)) {
      this._showBurnoutFeedbackForCaster(this.enemy, tid);
      return null;
    }
    if (!this.enemy.canUseUltimate()) return null;
    const skill = this.enemy.useUltimate();
    if (!skill) return null;
    this._playSkillVoiceForCaster(this.enemy, skill);
    if (skill.type === 'domain') {
      this.executeDomain(this.enemy, this.player, skill);
    } else {
      this.executeSkill(this.enemy, this.player, skill);
    }
    return skill;
  }

  enemySimpleDomain() {
    if (!this.enemy) return false;
    if (this.enemy.activateSimpleDomain()) {
      this.addSkillText(this.enemy.x, this.enemy.y - 80, '簡易領域', '#b4dcff');
      this.particles.barrierExpandEffect(this.enemy.x, this.enemy.y);
      this.audio.playDomain();
      return true;
    }
    return false;
  }

  enemyDodge() {
    if (!this.enemy || this.enemy.state === 'hit' || this.enemy.state === 'dead' || this.enemy.state === 'stunned') return;
    const dir = this.enemy.facingRight ? -1 : 1;
    this.enemy.velocity.x = dir * this.enemy.speed * 2.5;
    this.enemy.velocity.y = -6;
    this.enemy.grounded = false;
    this.enemy.invincible = true;
    this.enemy.invincibleTimer = 12;
    this.enemy.state = 'dodging';
    this.enemy.stateTimer = 10;

    if (this.enemy.character.id === 'gojo' && !this.enemy.isPassiveDisabled()) {
      this.enemy.invincibleTimer = 20;
      this.enemy.cursedEnergy = Math.min(this.enemy.maxCursedEnergy, this.enemy.cursedEnergy + 15);
      this.particles.emit(this.enemy.x, this.enemy.y - 30, 15, {
        color: '#00d4ff', speed: 6, spread: Math.PI * 2, life: 0.5, size: 4, gravity: -1
      });
    }

    this.particles.dodgeEffect(this.enemy.x, this.enemy.y - 30, this.enemy.character.color);
    this.audio.playDodge();
  }

  _showBurnoutFeedbackForCaster(caster, tid) {
    const techName = tid ? tid.replace(/_/g, ' ') : '術式';
    this.addSkillText(caster.x, caster.y - 100, `${techName} 熔断`, '#ff1e1e');
    this.audio.playError();
  }

  executeSkill(caster, target, skill) {
    const dir = caster.facingRight ? 1 : -1;

    // 技能名文字
    this.addSkillText(caster.x, caster.y - 50, skill.name, caster.character.glowColor || caster.character.color);

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
      // 延迟播放低音轰鸣，确保「茈」语音（约 0.7s）能完整播完
      setTimeout(() => this.audio.playDomain(), 700);
      return;
    }

    // 虎杖悠仁：迳庭拳（两段伤害：物理撞击 + 延迟咒力爆破）
    if (skill.type === 'yuji_divergent_fist') {
      this.tryHitEnemy(caster, target, skill, true);
      if (target && target.state !== 'dead') {
        // 第一段：肉体直击冲击特效（灰白气浪 + 尘土碎石 + 轻震屏）
        this.particles.divergentFistImpact(target.x, target.y - 30, dir);
        // 赤磷悦动激活时：拳锋血雾 + 血气灌入创口
        const bloodActive = typeof caster.hasBloodSurge === 'function' && caster.hasBloodSurge();
        if (bloodActive) {
          this.particles.bloodFistClash(target.x, target.y - 30, dir);
        }
        // 淡蓝咒力滞留在创口表层，等待延迟爆破
        this.delayedHits.push({
          target: target,
          damage: skill.delayedDamage || 60,
          knockbackX: dir * 60,
          knockbackY: -5,
          hitstun: skill.delayedHitstun || 14,
          pierce: false,
          timer: 18,
          isDivergentFist: true,
          bloodSurgeActive: bloodActive
        });
        this.addSkillText(target.x, target.y - 95, '二段爆発', '#5b8def');
      }
      return;
    }

    // 虎杖悠仁：赤磷悦动（自 buff：攻击、防御、速度提升）
    if (skill.type === 'yuji_blood_buff') {
      if (skill.selfBuff) caster.addBuff(skill.selfBuff.type, skill.selfBuff.value, skill.selfBuff.duration);
      if (skill.defenseBuff) caster.addBuff(skill.defenseBuff.type, skill.defenseBuff.value, skill.defenseBuff.duration);
      if (skill.speedBuff) caster.addBuff(skill.speedBuff.type, skill.speedBuff.value, skill.speedBuff.duration);
      this.particles.bloodSurgeEffect(caster.x, caster.y, caster.character.glowColor || '#ff7675');
      this.particles.screenShake = { intensity: 3, duration: 0.3 };
      this.audio.playDomain();
      return;
    }

    // 虎杖悠仁：穿血（超音速血弹，可贯穿目标继续前进）
    if (skill.type === 'yuji_piercing_blood') {
      const bloodActive = typeof caster.hasBloodSurge === 'function' && caster.hasBloodSurge();

      // 起手蓄力：指尖血液聚拢涌动
      this.particles.piercingBloodCharge(caster.x + dir * 25, caster.y - 32, dir, bloodActive);

      // 延迟 8 帧后发射血弹（模拟蓄力压缩）
      const proj = {
        x: caster.x + dir * 35,
        y: caster.y - 32,
        vx: dir * skill.projectileSpeed,
        vy: 0,
        owner: caster,
        skill: skill,
        type: 'yuji_piercing_blood',
        color: bloodActive ? '#ff2020' : (skill.projectileColor || '#c0392b'),
        size: skill.projectileSize || 5,
        pierce: skill.pierce,
        hitTargets: new Set(),
        bloodSurgeActive: bloodActive,
        trailTimer: 0,
        spawnDelay: 8
      };
      this.projectiles.push(proj);
      this.audio.playHeavyHit();
      return;
    }

    if (skill.projectile) {
      // 宿傩「解」连射型无形斩击：弹道几乎不可见，仅极淡空间扭曲
      if (skill.type === 'sukuna_slash') {
        const shots = skill.multiShot || 1;
        for (let i = 0; i < shots; i++) {
          this.projectiles.push({
            x: caster.x + dir * (30 + i * 12),
            y: caster.y - 30 + (i % 2 === 0 ? -3 : 3),
            vx: dir * skill.projectileSpeed,
            vy: 0,
            owner: caster,
            skill: skill,
            type: 'sukuna_slash',
            color: skill.projectileColor,
            size: skill.projectileSize || 4,
            age: 0
          });
        }
        // 发动瞬间极淡黑红色咒力残影（瞬发无预兆，仅施法者位置微弱闪烁）
        this.particles.emit(caster.x + dir * 20, caster.y - 30, 3, {
          color: '#3a000a', speed: 1, spread: Math.PI * 0.4, life: 0.18, size: 2, angle: dir > 0 ? 0 : Math.PI
        });
        return;
      }

      const shots = skill.multiShot || 1;
      for (let i = 0; i < shots; i++) {
        this.projectiles.push({
          x: caster.x + dir * (30 + i * 10),
          y: caster.y - 30 + (i % 2 === 0 ? -4 : 4),
          vx: dir * skill.projectileSpeed,
          vy: 0,
          owner: caster,
          skill: skill,
          color: skill.projectileColor,
          size: skill.projectileSize || 6
        });
      }
      this.particles.emit(caster.x + dir * 30, caster.y - 30, 5 + shots * 2, {
        color: skill.projectileColor, speed: 2, spread: Math.PI * 0.3, life: 0.3, size: 3, angle: dir > 0 ? 0 : Math.PI
      });
    } else if (skill.type === 'sukuna_wide_slash') {
      // 「解・広域」：前方大范围无形斩击，蛛网式均匀切割痕迹 + 强烈风压
      this.particles.sukunaWideSlash(caster.x, caster.y - 30, dir, skill.range || 180, skill.aoeRadius || 130, this.groundY);
      // 强烈风压：尘土碎石沿斩击方向飞溅
      this.particles.emit(caster.x + dir * 60, caster.y, 18, {
        color: '#8b0000', speed: 7, spread: Math.PI * 0.5, life: 0.5, size: 3, gravity: 0.3, angle: dir > 0 ? 0 : Math.PI
      });
      this.particles.emit(caster.x + dir * 80, this.groundY, 14, {
        color: '#5a4030', speed: 5, spread: Math.PI * 0.3, life: 0.6, size: 4, gravity: -0.5, angle: dir > 0 ? 0 : Math.PI
      });
      // 高频破空锐响
      this.audio.playSukunaSlash('wide');
      this.particles.screenShake = { intensity: 4, duration: 0.2 };
      // 命中检测（tryHitEnemy 会处理 aoe/黑闪/打断等）
      this.tryHitEnemy(caster, target, skill, true);
    } else if (skill.type === 'sukuna_world_slash') {
      // 「解・界断」：切割世界的空间斩，横贯天地的平整切口
      // 1. 无声一瞬：画面短暂暗化（无声的宏大破坏前奏）
      this.particles.screenFlash = { color: '#000000', alpha: 0.45, duration: 0.18 };
      // 2. 世界本身被平整切开：横贯屏幕的切口
      this.particles.sukunaWorldSlash(this.canvas.width, this.canvas.height, dir, caster.y, this.groundY);
      // 3. 绕过防御直接命中（trueDamage + pierceBarrier）
      if (target) {
        const actualDamage = target.takeDamage(skill.damage, 0, 0, skill.hitstun, true);
        this.addDamageNumber(target.x, target.y - 50, actualDamage, '#8b0000');
        this.recordHitDamage(caster, actualDamage);
        // 目标被平整切断：少量暗色碎屑沿断面崩解
        this.particles.emit(target.x, target.y - 30, 16, {
          color: '#1a0008', speed: 3, spread: Math.PI * 2, life: 0.6, size: 3, gravity: 0.2
        });
      }
      // 4. 延迟厚重轰鸣（天地安静一瞬，随即大地崩裂建筑倒塌）
      setTimeout(() => {
        this.audio.playWorldSlash();
        this.particles.screenShake = { intensity: 12, duration: 0.8 };
      }, 160);
    } else if (skill.type === 'sukuna_dismantle') {
      // 「捌」：根据目标自适应威力，手掌接触一击终结
      this.executeSukunaDismantle(caster, target, skill);
    } else if (skill.type === 'sukuna_fire_arrow') {
      // 「灶（开）」：解/捌铺垫 → 拉弓咏唱 → 巨型高温火焰箭矢
      this.executeSukunaFireArrow(caster, target, skill);
    } else if (skill.type === 'buff' && skill.selfBuff) {
      // 自 buff 技能：给施法者加增益/防御
      caster.addBuff(skill.selfBuff.type, skill.selfBuff.value, skill.selfBuff.duration);
      if (skill.screenEffect) this.particles.domainEffect(skill.screenEffect);
      this.addSkillText(caster.x, caster.y - 70, skill.name, caster.character.glowColor || caster.character.color);
    } else if (skill.fullScreen) {
      if (target) {
        const actualDamage = target.takeDamage(skill.damage, dir * 200, -6, 24);
        if (actualDamage === 0) {
          this.addDamageNumber(target.x, target.y - 50, 0, '#00d4ff', '無下限');
        } else {
          this.addDamageNumber(target.x, target.y - 50, actualDamage, '#6c5ce7');
        }
        this.recordHitDamage(caster, actualDamage);
      }
      this.particles.domainEffect(skill.screenEffect);
      this.audio.playDomain();
    } else if (skill.type === 'domain' || skill.screenEffect) {
      if (target) {
        const actualDamage = target.takeDamage(skill.damage, dir * 180, -8, 20);
        if (actualDamage === 0) {
          this.addDamageNumber(target.x, target.y - 50, 0, '#00d4ff', '無下限');
        } else {
          this.addDamageNumber(target.x, target.y - 50, actualDamage, '#6c5ce7');
        }
        this.recordHitDamage(caster, actualDamage);
      }
      this.particles.domainEffect(skill.screenEffect);
      this.audio.playDomain();
    } else {
      this.tryHitEnemy(caster, target, skill, true);
    }
  }

  executeSukunaDismantle(caster, target, skill) {
    if (!target || target.state === 'dead') return;

    const dir = caster.facingRight ? 1 : -1;
    const inDomain = caster.domainActive && caster.domainTimer > 0;
    const dx = target.x - caster.x;
    const dy = (target.y - 30) - (caster.y - 30);
    const dist = Math.abs(dx);

    // 接触判定：常态下必须以手掌/肢体触碰（近距离 + 面向目标），无法远程释放
    // 在「伏魔御厨子」领域内则解除接触限制，并依托必中规则无视闪避
    if (!inDomain) {
      if (dist > skill.range + 20 || Math.abs(dy) > 70) {
        this.addSkillText(caster.x, caster.y - 70, '未命中', '#888888');
        return;
      }
      const facingTarget = (dx > 0 && caster.facingRight) || (dx < 0 && !caster.facingRight);
      if (!facingTarget) {
        this.addSkillText(caster.x, caster.y - 70, '未命中', '#888888');
        return;
      }
    }

    // 自适应伤害：根据目标咒力总量、术式防御强度、肉体坚韧程度自动适配
    // 最终输出恰好足以一击终结当前目标，但不会无意义地溢出
    const targetEnergy = target.maxCursedEnergy || 100;
    const targetDefense = target.defense || 0;
    const targetMaxHp = target.maxHp;
    const targetHp = target.currentHp;

    let adaptiveDamage = targetHp * 1.12
      + targetDefense * 2.2
      + targetEnergy * 0.32;
    adaptiveDamage *= (skill.adaptFactor || 1.0);

    // 施术者自身攻击增益（如黑闪战斗巅峰）仍应生效，但以线性方式叠加
    if (typeof caster.getAttackDamage === 'function') {
      const atkDmg = caster.getAttackDamage();
      adaptiveDamage *= (atkDmg / Math.max(caster.attack, 1));
    }

    // 威力限制：避免"威力过剩"，上限为目标最大生命的 1.35 倍
    // 下限：确保足以终结当前目标
    const maxAllowed = targetMaxHp * 1.35;
    const minRequired = Math.min(targetHp * 1.08, targetMaxHp * 0.5);
    adaptiveDamage = Math.max(minRequired, Math.min(adaptiveDamage, maxAllowed));

    const finalDamage = Math.round(adaptiveDamage);

    // 真实伤害 + 穿透屏障 + 完全无视防御
    const actualDamage = target.takeDamage(finalDamage, 0, 0, skill.hitstun || 25, true);

    if (actualDamage === 0) {
      this.addDamageNumber(target.x, target.y - 50, 0, '#00d4ff', '無下限');
    } else {
      this.addDamageNumber(target.x, target.y - 50, actualDamage, '#8b0000', '捌');
    }

    // 视觉特效：接触点黑红色咒力爆发 + 交错切割断面
    this.particles.sukunaDismantleEffect(target.x, target.y - 30, dir, inDomain);

    // 音效：短促沉闷的切割爆响
    this.audio.playSukunaDismantle();

    // 屏幕震动
    this.particles.screenShake = { intensity: inDomain ? 10 : 7, duration: 0.3 };

    if (actualDamage > 0) {
      this.recordHitDamage(caster, actualDamage);
    }
  }

  executeSukunaFireArrow(caster, target, skill) {
    const dir = caster.facingRight ? 1 : -1;

    // 1. 先用「解 / 捌」完成斩击铺垫：两道无形斩击撕开空间
    const prepX = caster.x + dir * 50;
    const prepY = caster.y - 30;
    this.particles.sukunaSlashCut(prepX, prepY, dir);
    this.particles.sukunaSlashCut(prepX + dir * 22, prepY + 8, dir);
    this.audio.playSukunaSlash('rapid');

    // 2. 咏唱咒词「灶！开！」，双手拉弓姿态凝聚火焰
    this.addSkillText(caster.x, caster.y - 85, '灶！开！', '#ff4500');
    this.particles.fireArrowCharge(caster.x, caster.y - 35, dir);

    // 3. 射出巨型高温火焰箭矢（弹道迟缓）
    const arrow = {
      x: caster.x + dir * 35,
      y: caster.y - 32,
      vx: dir * (skill.projectileSpeed || 6.5),
      vy: 0,
      owner: caster,
      skill: skill,
      type: 'sukuna_fire_arrow',
      color: skill.projectileColor || '#ff4500',
      size: skill.projectileSize || 32,
      phase: 'travel',
      phaseTimer: 0,
      age: 0
    };
    this.projectiles.push(arrow);

    // 拉弓凝聚 → 火箭发射音效
    this.audio.playFireArrowLaunch();
  }

  updateFireArrowProjectile(p) {
    if (p.phase === 'travel') {
      p.age++;
      // 巨型火焰箭飞行中持续拖出尾焰与火星
      if (p.age % 2 === 0) {
        this.particles.fireArrowTrail(p.x, p.y, p.vx, p.vy);
      }
      return;
    }
    if (p.phase === 'exploding') {
      p.phaseTimer--;
      if (p.phaseTimer <= 0) {
        this.explodeFireArrow(p);
        p.phase = 'exploded';
        p.phaseTimer = 8;
      }
      return;
    }
    if (p.phase === 'exploded') {
      p.phaseTimer--;
    }
  }

  explodeFireArrow(proj) {
    const skill = proj.skill;
    const caster = proj.owner;
    const inDomain = caster.domainActive && caster.domainTimer > 0;
    const radius = inDomain ? (skill.domainAoeRadius || skill.aoeRadius || 85) : (skill.aoeRadius || 85);
    const centerX = proj.x;
    const centerY = proj.y;

    // 爆炸视觉：高温火球 + 灰烬飞散 + 领域内大范围冲击
    this.particles.fireArrowExplosion(centerX, centerY, radius, inDomain);

    // 音效：火焰爆轰 / 焚烧轰鸣
    this.audio.playFireArrowExplosion(inDomain);

    // 命中目标并施加伤害、灼烧与击退
    const target = caster === this.player ? this.enemy : this.player;
    if (target && target.state !== 'dead') {
      const dx = target.x - centerX;
      const dy = (target.y - 30) - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= radius) {
        const dir = Math.sign(dx) || 1;
        const actualDamage = target.takeDamage(skill.damage, dir * (skill.knockback || 180), -5, skill.hitstun || 22);
        if (actualDamage === 0) {
          this.addDamageNumber(target.x, target.y - 50, 0, '#00d4ff', '無下限');
        } else {
          this.addDamageNumber(target.x, target.y - 50, actualDamage, '#ff4500', '灶');
        }
        if (skill.burn) {
          target.addBuff('burn', skill.burn.damagePerTick, skill.burn.duration);
        }
        if (actualDamage > 0) {
          this.recordHitDamage(caster, actualDamage);
        }
      }
    }

    // 屏幕震动
    this.particles.screenShake = { intensity: inDomain ? 14 : 7, duration: inDomain ? 0.55 : 0.35 };
  }

  executeDomain(caster, target, domain) {
    // 语音：领域展开台词
    this._playSkillVoiceForCaster(caster, domain);
    // 起手阶段：咒力爆发（玩家与 AI 统一特效）
    this.audio.playDomain();
    this.particles.screenShake = { intensity: 8, duration: 0.6 };
    this.particles.screenFlash = { color: '#aaccff', alpha: 0.5, duration: 0.5 };
    this.addSkillText(caster.x, caster.y - 80, '領域展開', '#ffffff');
    this.addSkillText(caster.x, caster.y - 60, domain.name || '無量空処', caster.character.glowColor || caster.character.color);
    this.infiniteVoidStun = domain.stunDuration;
    this._domainDeclared = false;
  }

  tryHitEnemy(attacker, target, attackData, isSkill) {
    if (!target) return;
    const dx = target.x - attacker.x;
    const dy = (target.y - 30) - (attacker.y - 30);
    const dist = Math.abs(dx);
    let range = attackData.range || attacker.getAttackRange();
    if (attackData.aoe && attackData.aoeRadius) {
      range += attackData.aoeRadius * 0.5;
    }

    if (dist > range + 20) return;
    if (Math.abs(dy) > (attackData.aoe ? 90 : 60)) return;

    const facingTarget = (dx > 0 && attacker.facingRight) || (dx < 0 && !attacker.facingRight);
    if (!facingTarget && dist > 30) return;

    const dir = attacker.facingRight ? 1 : -1;
    let dmg = attackData.damage;

    // 通用黑闪机制：命中后小概率触发，领域内被动禁用时无法触发
    let isBlackFlash = false;
    const passiveDisabled = attacker.isPassiveDisabled ? attacker.isPassiveDisabled() : false;
    if (!passiveDisabled) {
      // 普攻自带黑闪概率
      const basicBlackFlashChance = !isSkill && attackData.blackFlashChance ? attackData.blackFlashChance : 0;
      const baseChance = 0.04;          // 基础 4%
      const repeatChance = 0.008;       // 刚触发后连续概率 0.8%
      const bfChance = (attacker._blackFlashCooldown > 0) ? repeatChance : baseChance;
      // 技能自带的 critChance / blackFlashBonus 会额外增加一点黑闪概率
      let critBonus = 0;
      if (isSkill && attackData.critChance) critBonus += attackData.critChance * 0.04;
      if (isSkill && attackData.blackFlashBonus) critBonus += attackData.blackFlashBonus * 0.15;
      if (Math.random() < bfChance + critBonus + basicBlackFlashChance) {
        isBlackFlash = true;
        attacker._blackFlashCooldown = 90; // 1.5 秒内难以再次触发
      }
    }

    // 前置打断领域：在敌方完成领域展开前摇瞬间，以极速斩击切断术式构筑流程
    if (target && target.domainActive && (target.domainPhase === 'preCast' || target.domainPhase === 'declaration')) {
      // 捌 / 解 / 穿血 均可尝试打断；捌成功率最高
      let interruptChance = isSkill ? 0.25 : 0.1;
      if (isSkill && attackData.name === '捌') interruptChance = 0.7;
      if (isSkill && attackData.name === '解') interruptChance = 0.45;
      if (isSkill && attackData.name === '穿血') interruptChance = 0.35;
      if (Math.random() < interruptChance) {
        this._interruptDomainCast(attacker, target);
        return;
      }
    }

    // 伤害计算：灵魂伤害与无视防御部分
    let soulDmg = 0;
    let ignoreDef = 0;
    if (attackData.soulDamage) {
      soulDmg = Math.round(dmg * attackData.soulDamage);
      dmg -= soulDmg; // 灵魂部分单独结算，不受防御影响
    }
    if (attackData.ignoreDefense) {
      ignoreDef = Math.round(dmg * attackData.ignoreDefense);
      dmg -= ignoreDef; // 无视防御部分单独结算
    }

    if (isBlackFlash) {
      // 黑闪：伤害以 2.5 次方输出，但不超过目标最大生命 35%
      const raw = Math.pow(dmg, 2.5);
      dmg = Math.min(Math.round(raw), Math.round(target.maxHp * 0.35));
      this.particles.blackFlashEffect(target.x, target.y - 30);
      // 触发战斗巅峰状态（连续黑闪会触发反转术式回转流动）
      const wasPeak = attacker.blackFlashPeakTimer > 0;
      if (typeof attacker.triggerBlackFlashPeak === 'function') {
        attacker.triggerBlackFlashPeak();
      }
      // 黑闪音效：根据连击次数调整（连击会叠加低频震颤 + 背景嗡鸣）
      if (typeof this.audio.playBlackFlashSound === 'function') {
        this.audio.playBlackFlashSound(attacker.blackFlashComboCount || 1);
      } else {
        this.audio.playHeavyHit();
      }
      this.audio.castBlackFlash(attacker.character.id);
      this.addSkillText(target.x, target.y - 80, '黒閃', '#ffd700');
      // 反馈文字：首次巅峰 / 连续黑闪回转流动
      if (wasPeak) {
        this.addSkillText(attacker.x, attacker.y - 90, '反転術式·回転', '#7fd4ff');
      } else {
        this.addSkillText(attacker.x, attacker.y - 90, '戦闘絶頂', '#ffd700');
      }
    }

    const pierce = attackData.pierceBarrier || false;
    const actualDamage = target.takeDamage(dmg, dir * (attackData.knockback || 60), isSkill ? -4 : -2, attackData.hitstun || 10, pierce);

    // 灵魂伤害与无视防御部分直接作用于 HP（仅受无敌保护）
    let extraDamage = 0;
    if (!target.invincible && target.state !== 'dead' && (soulDmg > 0 || ignoreDef > 0)) {
      extraDamage = soulDmg + ignoreDef;
      target.currentHp = Math.max(0, target.currentHp - extraDamage);
    }

    if (actualDamage === 0) {
      this.addDamageNumber(target.x, target.y - 40, 0, '#00d4ff', '無下限');
      return;
    }

    this.addDamageNumber(target.x, target.y - 40, actualDamage, isBlackFlash ? '#ffd700' : (isSkill ? '#ff6b35' : '#ffffff'), isBlackFlash ? '黒閃' : undefined);
    this.recordHitDamage(attacker, actualDamage);

    if (isSkill) {
      if (!attackData.customHitEffect) {
        this.particles.slashEffect(target.x, target.y - 30, dir > 0 ? 'right' : 'left', attacker.character.color);
      }
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

    // 术士熔断：AI 已处于 casting 状态的技能按所属术式判断是否强制取消
    const activeSkill = f.character.skills.find(s => f.cooldowns[s.id] === s.cooldown && f.state === 'casting')
      || (f.cooldowns[f.character.ultimate.id] === f.character.ultimate.cooldown && f.state === 'casting' ? f.character.ultimate : null);
    if (activeSkill && f.isTechniqueBurnout && f.isTechniqueBurnout(f.getSkillTechniqueId(activeSkill))) {
      if (f.state === 'casting') {
        f.state = 'idle';
        f.stateTimer = 0;
      }
      return;
    }

    // 普通技能
    for (const skill of f.character.skills) {
      if (f.cooldowns[skill.id] === skill.cooldown && f.state === 'casting') {
        this.executeSkill(f, this.player, skill);
        return;
      }
    }

    // AI 领域展开：通过判断 ultimate 冷却刚进入 casting 状态触发
    const ult = f.character.ultimate;
    if (ult && f.cooldowns[ult.id] === ult.cooldown && f.state === 'casting') {
      this.executeDomain(f, this.player, ult);
      return;
    }
  }

  addDamageNumber(x, y, damage, color, label) {
    this.damageNumbers.push({ x: x + (Math.random() - 0.5) * 30, y, text: label || damage.toString(), color, life: 40, maxLife: 40 });
  }

  updateDamageNumbers() {
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      this.damageNumbers[i].y -= 1.5;
      this.damageNumbers[i].life--;
      if (this.damageNumbers[i].life <= 0) this.damageNumbers.splice(i, 1);
    }
  }

  // ── 技能名文字 ──
  addSkillText(x, y, text, color) {
    this.skillTexts.push({ x, y: y - 30, text, color, life: 35, maxLife: 35 });
  }

  updateSkillTexts() {
    for (let i = this.skillTexts.length - 1; i >= 0; i--) {
      this.skillTexts[i].y -= 1;
      this.skillTexts[i].life--;
      if (this.skillTexts[i].life <= 0) this.skillTexts.splice(i, 1);
    }
  }

  // ── 治疗文字 ──
  addHealText(x, y, amount) {
    this.healTexts.push({ x: x + (Math.random() - 0.5) * 20, y: y - 40, text: '+' + amount, life: 35, maxLife: 35 });
  }

  updateHealTexts() {
    for (let i = this.healTexts.length - 1; i >= 0; i--) {
      this.healTexts[i].y -= 1.2;
      this.healTexts[i].life--;
      if (this.healTexts[i].life <= 0) this.healTexts.splice(i, 1);
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
    this.drawSkillTexts(ctx);
    this.drawHealTexts(ctx);
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
      } else if (p.type === 'sukuna_slash') {
        this.drawSukunaSlash(ctx, p);
      } else if (p.type === 'sukuna_fire_arrow') {
        this.drawSukunaFireArrow(ctx, p);
      } else if (p.type === 'yuji_piercing_blood') {
        this.drawPiercingBlood(ctx, p);
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

  // 宿傩「解」无形斩击弹道：几乎不可见，仅极淡空间扭曲感
  drawSukunaSlash(ctx, p) {
    // 无形斩击：命中前几乎看不到轨迹，仅细微空间扭曲
    // 极淡的黑红色残影（仅 1px 级别的暗色线，alpha 极低）
    ctx.globalAlpha = 0.10;
    ctx.strokeStyle = '#3a000a';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(p.x - p.vx * 1.5, p.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();

    // 空间扭曲：微弱的扭曲点（沿路径极淡的暗点）
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#1a0008';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
  }

  // 宿傩「灶（开）」巨型高温火焰箭矢绘制
  drawSukunaFireArrow(ctx, p) {
    if (p.phase !== 'travel') return;
    const dir = p.vx >= 0 ? 1 : -1;
    const angle = Math.atan2(p.vy, p.vx);
    const len = p.size * 2.2;
    const w = p.size * 0.9;

    ctx.translate(p.x, p.y);
    ctx.rotate(angle);

    // 尾焰拖尾（半透明橙红）
    const tailGrad = ctx.createLinearGradient(-len * 1.2, 0, 0, 0);
    tailGrad.addColorStop(0, 'rgba(255,80,0,0)');
    tailGrad.addColorStop(0.4, 'rgba(255,80,0,0.25)');
    tailGrad.addColorStop(1, 'rgba(255,60,0,0.55)');
    ctx.fillStyle = tailGrad;
    ctx.beginPath();
    ctx.moveTo(0, -w * 0.35);
    ctx.lineTo(-len * 1.3, 0);
    ctx.lineTo(0, w * 0.35);
    ctx.closePath();
    ctx.fill();

    // 箭身主体
    const bodyGrad = ctx.createLinearGradient(-len * 0.5, -w * 0.5, len, w * 0.5);
    bodyGrad.addColorStop(0, '#8b0000');
    bodyGrad.addColorStop(0.45, '#ff4500');
    bodyGrad.addColorStop(0.85, '#ff9900');
    bodyGrad.addColorStop(1, '#fff5e6');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(len * 0.4, 0);
    ctx.lineTo(-len * 0.5, -w * 0.45);
    ctx.lineTo(-len * 0.35, 0);
    ctx.lineTo(-len * 0.5, w * 0.45);
    ctx.closePath();
    ctx.fill();

    // 箭头高温尖端
    const tipGrad = ctx.createLinearGradient(0, 0, len * 0.7, 0);
    tipGrad.addColorStop(0, 'rgba(255,200,150,0.9)');
    tipGrad.addColorStop(0.5, 'rgba(255,120,0,0.85)');
    tipGrad.addColorStop(1, 'rgba(255,60,0,0)');
    ctx.fillStyle = tipGrad;
    ctx.beginPath();
    ctx.moveTo(len * 0.55, 0);
    ctx.lineTo(-len * 0.15, -w * 0.55);
    ctx.lineTo(-len * 0.15, w * 0.55);
    ctx.closePath();
    ctx.fill();

    // 外层火光晕
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(255,80,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(0, 0, len * 0.9, w * 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    ctx.rotate(-angle);
    ctx.translate(-p.x, -p.y);
  }

  // 虎杖「穿血」血质弹丸绘制：流线型血弹 + 殷红血气尾迹 + 飞溅血滴
  drawPiercingBlood(ctx, p) {
    // 蓄力延迟阶段：不绘制弹丸（由粒子系统处理指尖蓄力效果）
    if (p.spawnDelay > 0) return;

    const dir = p.vx >= 0 ? 1 : -1;
    const angle = Math.atan2(p.vy, p.vx);
    const baseColor = p.color || '#c0392b';
    const isBlood = p.bloodSurgeActive;

    ctx.translate(p.x, p.y);
    ctx.rotate(angle);

    const len = p.size * 3.5;
    const w = p.size * 1.2;

    // 1. 狭长殷红血气尾迹（拖拽在弹丸身后）
    const trailGrad = ctx.createLinearGradient(-len * 2.5, 0, 0, 0);
    trailGrad.addColorStop(0, 'rgba(139, 0, 0, 0)');
    trailGrad.addColorStop(0.3, `rgba(180, 20, 20, 0.15)`);
    trailGrad.addColorStop(0.7, `rgba(200, 30, 30, 0.35)`);
    trailGrad.addColorStop(1, isBlood ? `rgba(255, 40, 40, 0.6)` : `rgba(192, 57, 43, 0.5)`);
    ctx.fillStyle = trailGrad;
    ctx.beginPath();
    ctx.moveTo(0, -w * 0.3);
    ctx.lineTo(-len * 2.5, 0);
    ctx.lineTo(0, w * 0.3);
    ctx.closePath();
    ctx.fill();

    // 2. 血弹主体（流线型水滴状，前端尖锐）
    const bodyGrad = ctx.createLinearGradient(-len * 0.5, 0, len * 0.8, 0);
    bodyGrad.addColorStop(0, '#5a0000');
    bodyGrad.addColorStop(0.3, '#8b0000');
    bodyGrad.addColorStop(0.65, isBlood ? '#ff2020' : '#c0392b');
    bodyGrad.addColorStop(0.9, '#ff6060');
    bodyGrad.addColorStop(1, '#ffa0a0');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(len * 0.7, 0);                    // 前端尖端
    ctx.lineTo(-len * 0.4, -w * 0.55);            // 上侧
    ctx.lineTo(-len * 0.3, 0);                     // 后端内凹
    ctx.lineTo(-len * 0.4, w * 0.55);             // 下侧
    ctx.closePath();
    ctx.fill();

    // 3. 弹丸边缘飞溅血滴残影（细碎小点围绕弹体）
    ctx.fillStyle = isBlood ? 'rgba(255, 60, 60, 0.6)' : 'rgba(200, 40, 40, 0.5)';
    for (let i = 0; i < 4; i++) {
      const sx = -len * 0.2 + Math.random() * len * 0.5;
      const sy = (Math.random() - 0.5) * w * 1.5;
      ctx.beginPath();
      ctx.arc(sx, sy, 1 + Math.random() * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. 前端高温灼热尖端（白热核心）
    const tipGrad = ctx.createRadialGradient(len * 0.5, 0, 0, len * 0.5, 0, w * 0.8);
    tipGrad.addColorStop(0, 'rgba(255, 220, 220, 0.9)');
    tipGrad.addColorStop(0.4, isBlood ? 'rgba(255, 60, 60, 0.7)' : 'rgba(220, 40, 40, 0.6)');
    tipGrad.addColorStop(1, 'rgba(139, 0, 0, 0)');
    ctx.fillStyle = tipGrad;
    ctx.beginPath();
    ctx.arc(len * 0.5, 0, w * 0.8, 0, Math.PI * 2);
    ctx.fill();

    // 5. 外层血色光晕
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = isBlood ? 'rgba(255, 40, 40, 0.15)' : 'rgba(192, 57, 43, 0.12)';
    ctx.beginPath();
    ctx.ellipse(0, 0, len * 1.1, w * 1.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    ctx.rotate(-angle);
    ctx.translate(-p.x, -p.y);
  }

  drawDamageNumbers(ctx) {
    ctx.save();
    for (const dn of this.damageNumbers) {
      const alpha = dn.life / dn.maxLife;
      const scale = 1 + (1 - alpha) * 0.6;
      const size = Math.round(20 * scale);
      ctx.globalAlpha = alpha;
      // 阴影
      ctx.shadowColor = dn.color;
      ctx.shadowBlur = 8;
      // 描边
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.font = `bold ${size}px "Noto Sans SC", sans-serif`;
      ctx.textAlign = 'center';
      ctx.strokeText(dn.text, dn.x, dn.y);
      // 填充
      ctx.fillStyle = dn.color;
      ctx.fillText(dn.text, dn.x, dn.y);
      // 高光
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = `bold ${size}px "Noto Sans SC", sans-serif`;
      ctx.fillText(dn.text, dn.x - 1, dn.y - 1);
    }
    ctx.restore();
  }

  drawSkillTexts(ctx) {
    ctx.save();
    for (const st of this.skillTexts) {
      const alpha = st.life / st.maxLife;
      const scale = 1 + (1 - alpha) * 0.4;
      ctx.globalAlpha = alpha;
      ctx.shadowColor = st.color;
      ctx.shadowBlur = 10;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.font = `bold ${Math.round(22 * scale)}px "Noto Sans SC", sans-serif`;
      ctx.textAlign = 'center';
      ctx.strokeText(st.text, st.x, st.y);
      ctx.fillStyle = st.color;
      ctx.fillText(st.text, st.x, st.y);
    }
    ctx.restore();
  }

  drawHealTexts(ctx) {
    ctx.save();
    for (const ht of this.healTexts) {
      const alpha = ht.life / ht.maxLife;
      const scale = 1 + (1 - alpha) * 0.5;
      const size = Math.round(18 * scale);
      ctx.globalAlpha = alpha;
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 8;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.font = `bold ${size}px "Noto Sans SC", sans-serif`;
      ctx.textAlign = 'center';
      ctx.strokeText(ht.text, ht.x, ht.y);
      ctx.fillStyle = '#00ff88';
      ctx.fillText(ht.text, ht.x, ht.y);
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

  // 回合切换时清场：弹道、特效、领域状态等全部清除
  clearRoundEffects() {
    this.projectiles = [];
    this.damageNumbers = [];
    this.skillTexts = [];
    this.healTexts = [];
    this.comboDisplay = { text: '', timer: 0, damage: 0 };
    this.domainActive = false;
    this.domainTimer = 0;
    this.infiniteVoidStun = 0;
    this._domainDeclared = false;
    this._domainClashDeclared = false;
    this._domainClashTimer = 0;
    this._domainClashResolved = false;
    if (this.player) this.player.clearDomainState();
    if (this.enemy) this.enemy.clearDomainState();
  }

  reset() {
    this.projectiles = [];
    this.damageNumbers = [];
    this.skillTexts = [];
    this.healTexts = [];
    this.comboDisplay = { text: '', timer: 0, damage: 0 };
    this.domainActive = false;
    this.domainTimer = 0;
    this.infiniteVoidStun = 0;
    this._domainDeclared = false;
    this._domainClashDeclared = false;
    this._domainClashTimer = 0;
    this._domainClashResolved = false;
  }
}