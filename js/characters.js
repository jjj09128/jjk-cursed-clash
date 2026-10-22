// 角色数据配置 - 咒术回战：咒力交织

const CHARACTERS = {
  yuji: {
    id: 'yuji',
    name: '虎杖悠仁',
    title: '超凡肉体',
    innateTechnique: 'body_reinforcement',
    maxHp: 1100,
    attack: 135,
    defense: 72,
    speed: 10.0,
    maxCursedEnergy: 160,
    energyRegen: 0.5,
    color: '#d63031',
    glowColor: '#ff7675',
    reverseCursed: true,
    simpleDomainPassive: true,
    blackFlashChance: 0.16,
    skills: [
      {
        id: 'skill1',
        name: '迳庭拳',
        damage: 95,
        cost: 18,
        cooldown: 160,
        range: 80,
        type: 'yuji_divergent_fist',
        techniqueId: 'body_reinforcement',
        description: '拳头命中后滞后的咒力延迟冲入体内，造成两段冲击',
        melee: true,
        knockback: 70,
        hitstun: 12,
        customHitEffect: true,
        delayedDamage: 75,
        delayedHitstun: 16,
        blackFlashBonus: 0.35
      },
      {
        id: 'skill2',
        name: '赤磷悦动',
        damage: 0,
        cost: 32,
        cooldown: 420,
        range: 0,
        type: 'yuji_blood_buff',
        techniqueId: 'body_reinforcement',
        description: '催动全身血液高速循环，短时暴涨力量、防御与体能上限',
        selfBuff: { type: 'damage', value: 1.28, duration: 360 },
        defenseBuff: { type: 'defense', value: 0.15, duration: 360 },
        speedBuff: { type: 'speed', value: 1.2, duration: 360 },
        screenEffect: 'bloodSurge'
      },
      {
        id: 'skill3',
        name: '穿血',
        damage: 140,
        cost: 28,
        cooldown: 220,
        range: 480,
        type: 'yuji_piercing_blood',
        techniqueId: 'body_reinforcement',
        description: '压缩血液凝聚成超音速血弹射出，穿刺力极强',
        projectile: true,
        projectileSpeed: 22,
        projectileColor: '#c0392b',
        projectileSize: 5,
        pierce: true,
        knockback: 95,
        hitstun: 14,
        ignoreDefense: 0.3,
        blackFlashBonus: 0.25
      }
    ],
    ultimate: {
      id: 'ultimate',
      name: '农家乐领域',
      damage: 0,
      cost: 100,
      cooldown: 1800,
      description: '开放式领域展开：以温暖故乡为心象风景，领域内灵魂斩击必中',
      type: 'domain',
      domainType: 'open',
      domainTier: 5,
      domainRange: 900,
      domainCompletion: 1.0,
      domainBinding: 0.25,
      screenEffect: 'yujiDomain',
      phases: {
        preCast: 35,
        declaration: 20,
        expanding: 30,
        active: 720,
        releasing: 20,
        aftermath: 10
      },
      duration: 840,
      stunDuration: 0,
      soulSlash: {
        damage: 55,
        interval: 30,
        soulDamageRatio: 1.0
      }
    },
    passive: '超凡肉体：力量、弹跳、爆发力、耐力、抗打击远超常人；高概率触发黑闪；拥有简易领域与反转术式',
    basicAttack: {
      damage: 52,
      range: 80,
      comboCount: 4,
      comboDamage: [48, 58, 72, 95],
      knockback: 75,
      blackFlashChance: 0.12
    }
  },

  gojo: {
    id: 'gojo',
    name: '五条悟',
    title: '最强咒术师',
    maxHp: 850,
    attack: 125,
    defense: 62,
    speed: 10.5,
    maxCursedEnergy: 150,
    energyRegen: 0.5,
    color: '#6c5ce7',
    glowColor: '#00d4ff',
    // 六眼：咒力消耗永久降低 30%
    energyCostReduction: 0.3,
    // 无下限术式：自动屏障
    infinityBarrier: true,
    // 生得术式：无下限术式
    innateTechnique: 'limitless',
    // 反转术式：自愈
    reverseCursed: true,
    skills: [
      {
        id: 'skill1',
        name: '术式顺转「苍」',
        damage: 120,
        cost: 28,
        cooldown: 200,
        range: 400,
        type: 'gojo_blue',
        techniqueId: 'limitless',
        description: '蓝色引力球，吸引并禁锢敌人',
        projectile: true,
        projectileSpeed: 10,
        projectileColor: '#0984e3',
        projectileSize: 10,
        pull: 150,
        pullDuration: 120,
        knockback: -80,
        hitstun: 20,
        slowDebuff: { value: 0.5, duration: 120 }
      },
      {
        id: 'skill2',
        name: '术式反转「赫」',
        damage: 160,
        cost: 28,
        cooldown: 240,
        range: 400,
        type: 'gojo_red',
        techniqueId: 'limitless',
        description: '赤色斥力冲击波，击退并附加易伤',
        projectile: true,
        projectileSpeed: 14,
        projectileColor: '#e74c3c',
        projectileSize: 8,
        knockback: 300,
        hitstun: 18,
        vulnerabilityDebuff: { value: 0.35, duration: 240 },
        blackFlashBonus: 0.3
      },
      {
        id: 'skill3',
        name: '虚式「茈」',
        damage: 620,
        cost: 95,
        cooldown: 800,
        range: 9999,
        type: 'gojo_purple',
        techniqueId: 'limitless',
        description: '苍与赫融合，贯穿全屏的紫色空间光束',
        projectile: false,
        fullScreen: true,
        trueDamage: true,
        bossBonus: 0.8,
        resetCooldowns: true,
        sixEyesBurst: { duration: 180 },
        knockback: 250,
        hitstun: 24
      }
    ],
    ultimate: {
      id: 'ultimate',
      name: '无量空处',
      damage: 0,
      cost: 100,
      cooldown: 1800,
      description: '领域展开：强制信息灌注，全场敌人意识瘫痪',
      type: 'domain',
      domainType: 'closed',
      domainTier: 5,
      domainRange: 900,
      domainCompletion: 1.0,
      domainBinding: 0.3, // 自缚：无副作用发动，规则优先级提升
      screenEffect: 'infiniteVoid',
      // 阶段时长（帧）
      phases: {
        preCast: 40,       // 起手：手印+摘眼罩+六眼+咒力爆发
        declaration: 20,   // 宣告：咒力场收缩后扩张
        expanding: 30,     // 扩张：黑暗吞噬现实
        active: 720,       // 领域维持（12秒）
        releasing: 20,     // 解除：结界收缩
        aftermath: 10      // 残留：意识涣散
      },
      duration: 840,
      stunDuration: 840,   // 整个领域期间+残留都僵直
      infoOverload: { value: 0.5, duration: 300 }
    },
    passive: '无下限术式：周身空间屏障自动减速/弹开攻击；六眼：咒力消耗-30%；反转术式：HP<30%自愈',
    basicAttack: {
      damage: 42,
      range: 80,
      comboCount: 5,
      comboDamage: [36, 42, 52, 64, 88],
      knockback: 60,
      comboEffects: [
        { type: 'normal' },
        { type: 'pull', pullStrength: 60 },
        { type: 'blackFlash', blackFlashChance: 0.1 },
        { type: 'dash', dashDist: 100 },
        { type: 'launch', launchPower: 10 }
      ]
    }
  },

  sukuna: {
    id: 'sukuna',
    name: '两面宿傩',
    title: '诅咒之王',
    innateTechnique: 'shrine',
    maxHp: 1300,
    attack: 170,
    defense: 68,
    speed: 9.5,
    maxCursedEnergy: 200,
    energyRegen: 0.55,
    color: '#8b0000',
    glowColor: '#ff1a1a',
    // 反转术式：自愈
    reverseCursed: true,
    // 「解」技能体系：无形斩击，从基础连射到切割世界的空间斩
    skills: [
      {
        id: 'skill1',
        name: '解・連弾',
        damage: 52,
        cost: 16,
        cooldown: 140,
        range: 340,
        type: 'sukuna_slash',
        techniqueId: 'shrine',
        description: '瞬发三道无形斩击，命中前几乎无迹可循，仅接触瞬间闪过极细暗色斩痕',
        projectile: true,
        multiShot: 3,
        projectileSpeed: 26,
        projectileColor: '#1a0008',
        projectileSize: 4,
        knockback: 40,
        hitstun: 10,
        blackFlashBonus: 0.22,
        slashType: 'rapid' // 连射型无形斩
      },
      {
        id: 'skill2',
        name: '解・広域',
        damage: 155,
        cost: 26,
        cooldown: 250,
        range: 180,
        type: 'sukuna_wide_slash',
        techniqueId: 'shrine',
        description: '大范围无形斩击，场景中呈现蛛网式均匀切割痕迹，卷起强烈风压',
        aoe: true,
        aoeRadius: 130,
        knockback: 120,
        hitstun: 16,
        ignoreDefense: 0.25,
        blackFlashBonus: 0.3,
        slashType: 'wide' // 广域型无形斩
      },
      {
        id: 'skill3',
        name: '捌',
        damage: 0,
        cost: 70,
        cooldown: 520,
        range: 75,
        type: 'sukuna_dismantle',
        techniqueId: 'shrine',
        description: '根据目标咒力总量、术式防御强度、肉体坚韧程度自动适配威力，手掌接触即一击终结',
        melee: true,
        contactRequired: true,
        pierceBarrier: true,
        ignoreDefense: 1.0,
        trueDamage: true,
        knockback: 0,
        hitstun: 22,
        blackFlashBonus: 0.45,
        adaptFactor: 0.92
      },
      {
        id: 'skill4',
        name: '灶（開）',
        damage: 340,
        cost: 85,
        cooldown: 700,
        range: 9999,
        type: 'sukuna_fire_arrow',
        techniqueId: 'shrine',
        description: '先用解/捌斩击铺垫，咏唱「灶！开！」后以拉弓姿态射出巨型高温火焰箭矢，领域内引发大范围爆破',
        projectile: true,
        projectileSpeed: 7,
        projectileSize: 34,
        projectileColor: '#ff4500',
        // 常态范围极小（束缚代价：领域外无法同时对付多名敌人）
        aoeRadius: 90,
        // 领域内大范围爆破
        domainAoeRadius: 260,
        // 扩散慢、弹道迟缓：命中后延迟引爆
        delayedDetonation: 0.22,
        burn: { damagePerTick: 9, interval: 30, duration: 180 },
        knockback: 180,
        hitstun: 22,
        ignoreDefense: 0.45,
        fireDamage: true
      }
    ],
    ultimate: {
      id: 'ultimate',
      name: '伏魔御厨子',
      damage: 0,
      cost: 100,
      cooldown: 1800,
      description: '开放式领域展开：200米半径内斩击必中，对领域内所有敌人持续施加解之斩击',
      type: 'domain',
      domainType: 'open',
      domainTier: 5,
      domainRange: 900,
      domainCompletion: 1.0,
      domainBinding: 0.2,
      screenEffect: 'sukunaDomain',
      phases: {
        preCast: 30,
        declaration: 20,
        expanding: 30,
        active: 720,
        releasing: 20,
        aftermath: 10
      },
      duration: 840,
      stunDuration: 0
    },
    passive: '诅咒之王：咒力总量与出力皆为天花板级；反转术式：HP<30%自愈；普攻「解」为无形高速斩击',
    basicAttack: {
      damage: 68,
      range: 110,
      comboCount: 4,
      comboDamage: [72, 92, 115, 155],
      knockback: 95,
      blackFlashChance: 0.08
    }
  }
};

// 对手 AI 角色池（虎杖悠仁 + 宿傩 + 五条悟；不再使用普通咒灵）
const AI_CHARACTERS = ['yuji', 'sukuna', 'gojo'];

// 显示名称映射
const CHARACTER_DISPLAY = {
  yuji: '虎杖悠仁',
  gojo: '五条悟',
  sukuna: '两面宿傩'
};