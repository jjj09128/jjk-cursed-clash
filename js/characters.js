// 角色数据配置 - 咒术回战：咒力交织
const CHARACTERS = {
  yuji: {
    id: 'yuji',
    name: '虎杖悠仁',
    title: '黑闪的继承者',
    maxHp: 1100,
    attack: 90,
    defense: 60,
    speed: 8,
    maxCursedEnergy: 100,
    energyRegen: 0.25,
    color: '#ff6b35',
    glowColor: '#ff4500',
    skills: [
      {
        id: 'skill1',
        name: '径庭拳',
        damage: 85,
        cost: 25,
        cooldown: 240,
        range: 80,
        type: 'melee',
        description: '灌注咒力的直拳，造成大量伤害',
        knockback: 150,
        hitstun: 18
      },
      {
        id: 'skill2',
        name: '黑闪',
        damage: 150,
        cost: 40,
        cooldown: 480,
        range: 90,
        type: 'melee',
        description: '咒力打击与物理打击误差在0.000001秒内时触发，伤害暴击',
        knockback: 200,
        hitstun: 24,
        critChance: 0.6,
        critMultiplier: 2.0
      }
    ],
    ultimate: {
      id: 'ultimate',
      name: '全力一击',
      damage: 350,
      cost: 100,
      cooldown: 900,
      description: '凝聚全部咒力的一击，附带黑闪效果',
      type: 'melee',
      range: 120,
      screenEffect: 'redFlash',
      duration: 60
    },
    passive: '黑闪达人：技能命中时有15%概率触发追加黑闪伤害',
    basicAttack: {
      damage: 30,
      range: 70,
      comboCount: 4,
      comboDamage: [30, 35, 40, 55],
      knockback: 60
    }
  },

  megumi: {
    id: 'megumi',
    name: '伏黑惠',
    title: '十种影法术',
    maxHp: 900,
    attack: 70,
    defense: 50,
    speed: 10,
    maxCursedEnergy: 120,
    energyRegen: 0.3,
    color: '#2d3436',
    glowColor: '#636e72',
    skills: [
      {
        id: 'skill1',
        name: '鵺',
        damage: 65,
        cost: 30,
        cooldown: 300,
        range: 300,
        type: 'ranged',
        description: '召唤鵺进行远程电击攻击',
        projectile: true,
        projectileSpeed: 12,
        projectileColor: '#f1c40f',
        knockback: 80,
        hitstun: 14
      },
      {
        id: 'skill2',
        name: '大蛇',
        damage: 90,
        cost: 35,
        cooldown: 360,
        range: 200,
        type: 'summon',
        description: '召唤大蛇从地面突袭，击飞敌人',
        knockback: 180,
        hitstun: 20,
        launch: true
      }
    ],
    ultimate: {
      id: 'ultimate',
      name: '嵌合暗翳庭',
      damage: 300,
      cost: 100,
      cooldown: 900,
      description: '领域展开：召唤大量式神围杀，自身获得隐身与增伤',
      type: 'domain',
      screenEffect: 'darkDomain',
      duration: 60,
      selfBuff: { type: 'damage', value: 1.5, duration: 120 },
      stealth: { duration: 60 }
    },
    passive: '式神协同：式神命中后自身获得10%移速加成，持续3秒',
    basicAttack: {
      damage: 22,
      range: 65,
      comboCount: 3,
      comboDamage: [22, 28, 35],
      knockback: 40
    }
  },

  nobara: {
    id: 'nobara',
    name: '钉崎野蔷薇',
    title: '刍灵咒法',
    maxHp: 850,
    attack: 80,
    defense: 45,
    speed: 7,
    maxCursedEnergy: 110,
    energyRegen: 0.28,
    color: '#e17055',
    glowColor: '#d63031',
    skills: [
      {
        id: 'skill1',
        name: '共鸣',
        damage: 70,
        cost: 20,
        cooldown: 200,
        range: 350,
        type: 'ranged',
        description: '将钉子打入稻草人，远程咒力共鸣伤害',
        projectile: true,
        projectileSpeed: 15,
        projectileColor: '#e17055',
        knockback: 60,
        hitstun: 12
      },
      {
        id: 'skill2',
        name: '簪',
        damage: 100,
        cost: 30,
        cooldown: 300,
        range: 250,
        type: 'ranged',
        description: '投掷多枚钉子，范围破甲伤害',
        aoe: true,
        aoeRadius: 80,
        defenseReduction: 0.3,
        knockback: 100,
        hitstun: 16
      }
    ],
    ultimate: {
      id: 'ultimate',
      name: '刍灵咒法·簪',
      damage: 320,
      cost: 100,
      cooldown: 900,
      description: '发动稻草人咒术，对全场敌人造成真实伤害并破甲',
      type: 'ranged',
      screenEffect: 'purpleWave',
      duration: 60,
      defenseReduction: 0.5
    },
    passive: '破甲专家：攻击有20%概率降低目标30%防御持续4秒',
    basicAttack: {
      damage: 25,
      range: 250,
      comboCount: 3,
      comboDamage: [25, 30, 38],
      knockback: 30,
      ranged: true
    }
  },

  gojo: {
    id: 'gojo',
    name: '五条悟',
    title: '最强咒术师',
    maxHp: 1050,
    attack: 100,
    defense: 75,
    speed: 10,
    maxCursedEnergy: 150,
    energyRegen: 0.35,
    color: '#6c5ce7',
    glowColor: '#00d4ff',
    // 六眼：咒力消耗永久降低 40%
    energyCostReduction: 0.4,
    // 无下限术式：自动屏障
    infinityBarrier: true,
    // 反转术式：自愈/复活
    reverseCursed: true,
    reviveCount: 1,
    skills: [
      {
        id: 'skill1',
        name: '术式顺转「苍」',
        damage: 90,
        cost: 30,
        cooldown: 240,
        range: 400,
        type: 'gojo_blue',
        description: '蓝色引力球，吸引并禁锢敌人',
        projectile: true,
        projectileSpeed: 9,
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
        damage: 120,
        cost: 30,
        cooldown: 300,
        range: 400,
        type: 'gojo_red',
        description: '赤色斥力冲击波，击退并附加易伤',
        projectile: true,
        projectileSpeed: 13,
        projectileColor: '#e74c3c',
        projectileSize: 8,
        knockback: 280,
        hitstun: 18,
        vulnerabilityDebuff: { value: 0.35, duration: 240 },
        blackFlashBonus: 0.3
      },
      {
        id: 'skill3',
        name: '虚式「茈」',
        damage: 450,
        cost: 100,
        cooldown: 900,
        range: 9999,
        type: 'gojo_purple',
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
      damage: 300,
      cost: 100,
      cooldown: 1200,
      description: '领域展开：全场敌人强制僵直6秒，无法行动',
      type: 'domain',
      screenEffect: 'infiniteVoid',
      duration: 360,
      stunDuration: 180,
      infoOverload: { value: 0.5, duration: 300 },
      allyBuff: { damage: 1.3, critChance: 0.3, healPerSec: 5, energyPerSec: 2 },
      selfBuff: { damage: 1.5, cooldownReduction: 0.5 }
    },
    passive: '无下限术式：周身空间屏障自动减速/弹开攻击；六眼：咒力消耗-40%；反转术式：HP<30%自愈+濒死复活',
    basicAttack: {
      damage: 35,
      range: 80,
      comboCount: 5,
      comboDamage: [28, 32, 38, 45, 60],
      knockback: 60,
      comboEffects: [
        { type: 'normal' },
        { type: 'pull', pullStrength: 60 },
        { type: 'blackFlash', blackFlashChance: 0.1 },
        { type: 'dash', dashDist: 100 },
        { type: 'launch', launchPower: 10 }
      ]
    }
  }
};

// 对手 AI 角色池（镜像或变体）
const AI_CHARACTERS = ['yuji', 'megumi', 'nobara', 'gojo'];

// 显示名称映射
const CHARACTER_DISPLAY = {
  yuji: '虎杖悠仁',
  megumi: '伏黑惠',
  nobara: '钉崎野蔷薇',
  gojo: '五条悟'
};