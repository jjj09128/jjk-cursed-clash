// ========================================
// 咒术回战：咒力交织 — 版本与更新日志
// ========================================
const GAME_VERSION = 'v1.16.0';
const GAME_CHANGELOG = [
  {
    version: 'v1.16.0',
    date: '2026-10-22',
    title: '双人对战模式（1v1 本地双人）',
    items: [
      '新增双人对战模式：P1（主键盘区）vs P2（小键盘区），双方本地同屏操作',
      '菜单界面新增「VS AI」/「1v1 对战」模式切换按钮',
      '双人模式下轮流选人：P1 先选 3 人 → P2 再选 3 人，各自独立登场顺序',
      'P2 默认键位（小键盘）：←↑→ 移动，1 攻击，2/3/*/. 技能，0 领域，Enter 闪避',
      '输入系统重构：双玩家独立 inputState 与冷却计时器，互不干扰',
      'CombatSystem 新增完整敌方操作方法（enemyAttack/UseSkill/Ultimate/SimpleDomain/Dodge）',
      '战斗循环在双人模式下自动跳过 AI 控制逻辑',
      '全量 JS 文件语法检查通过，已重新部署'
    ]
  },
  {
    version: 'v1.15.1',
    date: '2026-07-29',
    title: '简易领域削弱与虎杖平衡调整',
    items: [
      '简易领域持续时间由 5 秒削弱至 4 秒',
      '简易领域冷却时间由 10 秒延长至 15 秒',
      '虎杖悠仁生命值由 1200 下调至 1100',
      '虎杖悠仁攻击力由 145 下调至 135',
      '虎杖悠仁黑闪触发概率由 18% 下调至 16%',
      '虎杖悠仁赤磷悦动增益全面下调：伤害 ×1.35→×1.28、防御 +0.25→+0.15、速度 ×1.3→×1.2',
      '虎杖悠仁赤磷悦动触发的赤血操术回血效率由 1% 削弱至 0.5%',
      '宿傩技能 3「捌」自适应伤害系数由 1.0 轻微下调至 0.92',
      '清除未应用角色数据：移除伏黑惠、钉崎野蔷薇占位角色与相关音频/立绘映射',
      '图鉴更新：移除未实装角色条目，完善虎杖悠仁技能与领域描述',
      '领域持续时间增加：完整领域总时长由 12 秒延长至 14 秒',
      '新机制：每回合开始时，上场角色的领域展开与强力技能（skill3/skill4）进入初始冷却',
      '新机制：领域展开新增通用使用条件——角色在场上累计造成 300 点伤害后方可释放，全部角色一致'
    ]
  },
  {
    version: 'v1.15.0',
    date: '2026-07-29',
    title: '新增角色：虎杖悠仁',
    items: [
      '新增可选角色「虎杖悠仁」，拥有超凡肉体天赋与高黑闪概率',
      '技能 1「迳庭拳」：物理撞击 + 延迟咒力爆破两段伤害',
      '技能 2「赤磷悦动」：短时提升攻击、防御与移动速度',
      '技能 3「穿血」：发射可贯穿敌人的超音速血弹',
      '领域展开「农家乐领域」：开放式领域，领域内灵魂限定・解必中，造成灵魂伤害',
      '被动：简易领域 + 反转术式自动回血'
    ]
  },
  {
    version: 'v1.14.5',
    date: '2026-07-22',
    title: '性能优化：减少卡顿与 DOM 重排',
    items: [
      '缓存 HUD DOM 元素，避免每帧 getElementById/querySelector',
      '技能冷却、血条、咒力条等 UI 改为状态变化时才更新，并降低刷新频率',
      '队伍进度文字仅在切换角色时更新',
      '减少主循环中不必要的 DOM 写入，降低布局抖动',
      '整体降低移动端/低配置设备上的卡顿概率'
    ]
  },
  {
    version: 'v1.14.4',
    date: '2026-07-22',
    title: '角色数值调整：加快战斗节奏',
    items: [
      '整体下调角色最大生命值，提升攻击力与技能伤害，确保单回合 60 秒内可决出胜负',
      '五条悟：HP 1050→850，攻 100→125，防御下调，苍/赫/茈伤害提升，冷却缩短',
      '两面宿傩：HP 2000→1300，攻 145→170，防御下调，解/捌/灶伤害与范围提升，冷却缩短',
      '普通咒灵：HP 900→700，攻 70→85，技能伤害与冷却优化',
      '全体能量恢复速度提升，技能释放更加频繁'
    ]
  },
  {
    version: 'v1.14.3',
    date: '2026-07-22',
    title: '回合开始倒计时、回合总结与比赛结束动画',
    items: [
      '每回合开始新增 3 秒倒计时，显示当前回合数',
      '回合结束新增总结面板：展示胜者、剩余 HP 与结束原因（K.O. / 时间到 / 同时 K.O.）',
      '比赛结束时新增结束动画，之后进入结算界面',
      '回合切换与比赛结束期间暂停战斗逻辑，避免误操作'
    ]
  },
  {
    version: 'v1.14.2',
    date: '2026-07-22',
    title: '回合制战斗规则实装与宿傩平衡调整',
    items: [
      '战斗改为回合制：任意一方角色死亡后进入下一回合，胜方保留当前血量继续作战',
      '回合切换时清除当场所有特效、弹道、领域状态与简易领域残留',
      '每回合限时 60 秒，超时后血量比例较低的一方判负；比例相同则双方同时切换',
      '顶部 HUD 新增回合计时器显示，剩余 10 秒时变为红色闪烁提醒',
      '宿傩全技能咒力消耗降低：解・連弾 22→18、解・広域 36→30、捌 90→75、灶（開） 110→90、伏魔御厨子 120→100',
      '宿傩技能效果略微下调，以匹配降低的咒力消耗'
    ]
  },
  {
    version: 'v1.14.1',
    date: '2026-07-21',
    title: '修复宿傩领域伤害 Bug',
    items: [
      '修复开放型领域「伏魔御厨子」在规则抵消时不造成伤害的问题',
      '简易领域/领域对抗规则抵消时，宿傩领域仍造成 40 点伤害（减半）',
      '规则抵消时伤害文字显示「捌解(減)」，必中状态下显示「捌解」',
      '规则抵消时不再穿透屏障（pierceBarrier=false）'
    ]
  },
  {
    version: 'v1.14.0',
    date: '2026-07-21',
    title: '宿傩伏魔御厨子领域特效',
    items: [
      '新增宿傩领域专属视觉特效：日式神社建筑、鸟居、骸骨散布',
      '领域内暗红黑天空底色，营造恐怖威压氛围',
      '地面散落大量骸骨与头骨，两侧有骸骨堆砌',
      '血雾、漂浮骸骨碎片、随机斩击痕迹等前景效果',
      '领域展开/解除/残留各阶段均有专属动画',
      '新增 sukunaDomain 屏幕特效（血红闪光+斩击线条）',
      '角色图层始终在领域特效之上，确保可见性'
    ]
  },
  {
    version: 'v1.13.8',
    date: '2026-07-21',
    title: '技能3按钮按角色动态配色',
    items: [
      '技能3按钮配色改为按角色动态切换：五条悟「茈」保持紫色主题，宿傩「捌」改为血红主题',
      '通过 CSS 变量 --skill3-rgb 动态控制按钮背景、边框、光晕动画颜色'
    ]
  },
  {
    version: 'v1.13.7',
    date: '2026-07-21',
    title: '战斗 UI 细节优化',
    items: [
      '战斗界面右下角技能按钮改为自动换行，避免技能3/技能4显示后超出屏幕',
      '底部键盘提示统一为「O 術式3」「I 術式4」，与不同角色技能动态匹配',
      '设置面板中键位标签同步改为「術式3」「術式4」'
    ]
  },
  {
    version: 'v1.13.6',
    date: '2026-07-21',
    title: '修复宿傩「捌」技能按钮',
    items: [
      '技能3按钮现在会在拥有第 3 个技能的角色上显示，不再仅限五条悟',
      '宿傩的「捌」现在可通过 O 键/技能3按钮正常使用',
      '键位设置中技能3/技能4标签统一显示为「術式3」「術式4」'
    ]
  },
  {
    version: 'v1.13.5',
    date: '2026-07-21',
    title: '宿傩领域效果精简',
    items: [
      '宿傩「伏魔御厨子」开放型领域内仅持续施加捌解斩击（真实伤害+穿透屏障）',
      '移除伏魔御厨子的信息灌注伤害、自身增益与 allyBuff 等额外效果',
      '开放型领域不再对敌人附加僵直等控制效果'
    ]
  },
  {
    version: 'v1.13.4',
    date: '2026-07-21',
    title: '五条悟领域效果精简',
    items: [
      '五条悟「无量空处」领域内敌人仅全程僵直，不再造成任何伤害',
      '移除无量空处的自身增益与 allyBuff 等额外效果'
    ]
  },
  {
    version: 'v1.13.3',
    date: '2026-07-21',
    title: '领域机制调整与通用简易领域',
    items: [
      '五条悟「无量空处」与宿傩「伏魔御厨子」领域内不再回复生命与咒力',
      '宿傩开放型领域：领域内敌人除信息伤害外，每 0.5 秒持续受到捌解斩击（真实伤害+穿透屏障）',
      '普通咒灵完全移除领域展开能力，对应 UI 按钮隐藏',
      '新增通用简易领域：所有角色在对方完整领域内可按 V 手动触发，消耗 50 咒力，持续 5 秒，抵消自身受到的必中规则',
      '修复简易领域按钮冷却进度显示'
    ]
  },
  {
    version: 'v1.13.2',
    date: '2026-07-21',
    title: '英雄平衡性调整：移除复活与手动屏障',
    items: [
      '五条悟与宿傩删除反转术式复活机制',
      '五条悟空间斥力削弱：击退 150→100，冷却 2 秒→3 秒，硬直略微降低',
      '删除五条悟手动屏障（长按闪避触发）',
      '虚式「茈」伤害加强：450→550',
      'AI 不再使用已删除的屏障技能'
    ]
  },
  {
    version: 'v1.13.1',
    date: '2026-07-21',
    title: '宿傩「灶（开）」技能实装：烈焰箭矢',
    items: [
      '新增宿傩第 4 技能「灶（开）」：先用解/捌斩击铺垫，咏唱「灶！开！」后双手拉弓射出巨型高温火焰箭矢',
      '火焰温度远超特级火系咒灵，命中后将目标焚烧成灰烬并附加持续灼烧',
      '弹道迟缓、范围极小，敏捷对手易于闪避；领域内解除束缚，引发大范围爆破',
      '新增第 4 技能按钮，仅宿傩等拥有 4 技能的角色显示，默认键位 I',
      '新增火焰箭拉弓凝聚、飞行尾焰、命中爆炸与领域内大地龟裂火光特效'
    ]
  },
  {
    version: 'v1.13.0',
    date: '2026-07-21',
    title: '宿傩「捌」技能实装：自适应一击终结',
    items: [
      '「捌」：根据目标咒力总量、术式防御强度、肉体坚韧程度自动适配威力，常态下必须以手掌/肢体接触触发',
      '「伏魔御厨子」领域内解除接触限制，斩击可无差别自由释放并依托必中规则无法闪避',
      '视觉：接触点瞬间爆发浓烈黑红色咒力，目标体表浮现密集交错的平整切割断面',
      '音效：短促沉闷的切割爆响 + 物体被瞬间绞碎的厚重质感',
      '真实伤害 + 穿透屏障 + 完全无视防御，单体终结能力极强'
    ]
  },
  {
    version: 'v1.12.9',
    date: '2026-07-21',
    title: '宿傩「解」技能体系重构：无形斩击与切割世界的空间斩',
    items: [
      '「解・連弾」：瞬发三道无形斩击弹道，命中前几乎无迹可循（极淡黑红残影 + 空间扭曲），接触瞬间闪过极细暗色斩痕，高频破空锐响',
      '「解・広域」：大范围蛛网式均匀切割痕迹，卷起强烈风压带动尘土碎石飞溅，物体沿断面平整滑落崩解，无爆炸效果',
      '「解・界断」：规则级空间斩，横贯天地的平整切口，画面短暂暗化后世界本身被错开一道缝隙，绕过一切防御（trueDamage + pierceBarrier + ignoreDefense:1.0）',
      '新增音频：sawtooth 8800Hz→2600Hz 高频破空锐响（bandpass 滤波模拟金属切割啸声）',
      '新增音频：18Hz 次声前奏 + 延迟 0.18s 低频闷爆 + 建筑坍塌碎裂噪声，营造「无声的宏大破坏」反差感',
    ]
  },
  {
    version: 'v1.12.8',
    date: '2026-07-21',
    title: '修复摇杆方向卡住问题',
    items: [
      '移除摇杆 setInterval 持续输入，改为方向变化时单次触发，避免释放后方向仍被卡住',
      '新增 pointerleave / blur 兜底释放，切屏或鼠标移出时自动停止移动',
      '全局 html/body 添加 touch-action: none，防止页面滚动拦截摇杆操作',
      '进入战斗前强制重置摇杆状态，避免上一局残留输入影响新战斗',
    ]
  },
  {
    version: 'v1.12.7',
    date: '2026-07-20',
    title: '修复摇杆持续自动跳跃问题',
    items: [
      '增大摇杆中心死区（15→18px），避免轻微偏移误触方向',
      '优化方向判断算法：必须明显偏向某一轴才触发跳跃，左右移动时不会因轻微偏上而跳起',
      '新增跳跃冷却（约 200ms），即使摇杆持续发送 jump 也不会连续自动连跳',
      '摇杆向下方向现在被忽略，避免无效输入干扰左右移动',
    ]
  },
  {
    version: 'v1.12.6',
    date: '2026-07-20',
    title: '修复虚拟摇杆与按钮在移动端的触控问题',
    items: [
      '虚拟摇杆新增 touch 事件兜底，兼容只支持 touch 事件的移动设备',
      '摇杆同时支持 pointer 与 touch 双事件，避免 pointer 未触发导致无法控制角色',
      '修复多点触控、pointerleave 重复释放、触摸滚动拦截等问题',
      '攻击/技能按钮同样增加 touch 事件支持，防止移动端点击无响应',
      '摇杆释放时现在会正确调用 releasePointerCapture 并清空 active 状态',
    ]
  },
  {
    version: 'v1.12.5',
    date: '2026-07-20',
    title: '宿傩「解」技能体系实装',
    items: [
      '宿傩新增三套「解」衍生技能：',
      '　解・連弾：连续发射三发无形咒力斩击，远程消耗手段',
      '　解・広域：调整斩击范围，对前方中距离目标进行大范围斩击',
      '　解・甲：在体表释放微型解斩击，获得 50% 伤害减免（攻防一体）',
      '战斗系统新增支持：多发射弹技能（multiShot）与自 buff 技能',
      'AI 敌人现在会使用宿傩的解技能与防御buff',
    ]
  },
  {
    version: 'v1.12.4',
    date: '2026-07-20',
    title: '修复角色选择：允许重复选择同一英雄',
    items: [
      '修复仅有两个可选角色时无法凑齐 3 人队伍的问题',
      '点击缩略图现在会将该角色加入队伍；满员时替换最早入队的角色',
      '缩略图新增数量角标，显示当前已选该角色的人数',
      '队伍始终维持 3 人，不会出现开始按钮无法点击的情况',
    ]
  },
  {
    version: 'v1.12.3',
    date: '2026-07-20',
    title: '新增角色：两面宿傩（诅咒之王）',
    items: [
      '新增可选角色「两面宿傩」，当前版本仅保留普攻「解」',
      '宿傩基础属性：2000 HP / 145 攻 / 85 防 / 9 速 / 200 咒力',
      '参考设定：诅咒之王咒力总量与出力天花板级，反转术式可修复肉身',
      '普攻「解」为无形高速斩击，4 段连击，基础伤害 55-120',
      '保留伏魔御厨子作为领域展开大招（开放式领域，持续斩击）',
      '角色选择界面现在显示五条悟 + 宿傩两个缩略图',
      'AI 敌人池现在包含普通咒灵与宿傩',
    ]
  },
  {
    version: 'v1.12.2',
    date: '2026-07-20',
    title: '角色精简：仅保留五条悟，其余用普通咒灵替代',
    items: [
      '可选角色仅保留五条悟，玩家队伍固定为 3 个五条悟',
      '虎杖悠仁 / 伏黑惠 / 钉崎野蔷薇 的数据替换为普通咒灵模板（保留原 id 避免代码引用错误）',
      '普通角色拥有简易技能：咒力弹、强化打击、简易领域',
      'AI 敌人角色池改为 3 个普通咒灵，不再随机出现五条悟',
      '角色选择 UI 仅显示五条悟缩略图，点击即锁定 3 个五条悟队伍',
    ]
  },
  {
    version: 'v1.12.1',
    date: '2026-07-20',
    title: '本地排行榜与战绩持久化',
    items: [
      '每场对战结束后自动保存战绩到 localStorage（胜/负、出战角色、总伤害、时间）',
      '结算界面新增「本局统计 / 历史战绩」标签切换',
      '历史战绩显示：总场次、胜率、胜场、当前连胜',
      '最近 30 条对战记录列表：结果 / 出战队伍 / 伤害 / 时间',
      '排行榜采用漫画涂黑墨迹风样式，与 v1.12.0 新 UI 统一',
    ]
  },
  {
    version: 'v1.12.0',
    date: '2026-07-20',
    title: 'UI 完全重制：漫画涂黑墨迹风',
    items: [
      '视觉体系：墨黑(#0a0a0c) + 血红(#e11d2a) + 咒力紫(#6b1f5e) 三色主调，引入 Zen Old Mincho / Shippori Mincho 毛笔体字体',
      '全局装饰层：ink-splatter 墨迹溅射 + halftone-overlay 网点纹理 + brush-stroke 毛笔笔触',
      '主菜单：全屏角色立绘布局（左侧大角色立绘 + 右侧浮出技能/属性面板 + 底部角色缩略图横排）',
      '立绘系统：portrait-silhouette + portrait-breath 呼吸光晕 + portrait-bg-kanji 背景汉字 + portrait-nameplate 名牌，通过 CSS 变量 --char-color/--char-glow 动态切换角色主题色',
      '战斗 HUD：从 canvas 绘制迁移到 DOM 顶部极简条带（hud-top），血条/咒力条贴顶 + 中间 VS 计时 + 队伍进度 "1/3"',
      '动效系统：ripple 涟漪 / portraitSwitch 立绘切换 / kanjiSwitch 汉字切换 / nameSwitch 名牌切换 / skillRipple 技能涟漪 / thumbPing 缩略图波纹',
      '黑闪红光闪屏层 + 技能释放震屏层',
      'UI 音效扩展：playPortraitSwitch 立绘切换 / playThumbHover 缩略图悬停 / playSkillCast 技能释放 / playBlackFlashUI 黑闪反馈',
      '响应式适配：小屏 flex-direction 切换 + 横屏手机 HUD 优化',
    ]
  },
  {
    version: 'v1.11.0',
    date: '2026-07-20',
    title: '虎杖悠仁完全重制：不死暴君・赤血御厨子',
    items: [
      '基础体质：不老巅峰躯体（1500 HP / 110 攻 / 75 防 / 9 速），咒力总量与恢复全面提升',
      '完全体赤血操术：穿血（瞬发贯穿 + 灵魂伤害）、解（物理+灵魂混合斩击）、捌（高阶蓄力 + 穿透屏障）',
      '御厨子自主进化版：解/捌双属性斩击，前置打断领域可在敌方领域前摇阶段切断术式构筑',
      '常态化黑闪：普攻黑闪触发率 85%，技能自带黑闪加成，命中后 2.5 次方暴击',
      '高阶反转术式：永续续航，半血即可快速自愈，释放技能触发赤血造血修复',
      '生得领域「血厨御殿」：closed 型顶级领域，必中规则绑定灵魂斩击',
      '新增虎杖角色语音：穿血 / 解 / 捌 / 領域展開・血厨御殿 / 黒閃 / 反転術式',
    ]
  },
  {
    version: 'v1.10.14',
    date: '2026-07-20',
    title: 'AI 领域展开特效',
    items: [
      'AI 展开领域时现在会触发与玩家相同的特效：屏幕震动、闪光、領域展開文字、领域名称文字',
      'AI 展开领域时现在会播放角色语音台词',
      '新增 _playSkillVoiceForCaster() 通用语音接口，支持玩家与 AI 统一调用',
    ]
  },
  {
    version: 'v1.10.13',
    date: '2026-07-20',
    title: 'AI 领域对抗优化',
    items: [
      'AI 在玩家展开领域时会高优先级尝试开启自身领域进行领域对抗',
      '修复 AI 中 targetDomainActive 变量未定义即使用的潜在问题',
      '新增 tryCounterDomain() 统一处理领域对抗决策，难度越高越倾向于即时反制',
    ]
  },
  {
    version: 'v1.10.12',
    date: '2026-07-20',
    title: '术士熔断逻辑重制',
    items: [
      '术士熔断改为按生得术式独立计算：techniqueId -> { timer, baseDuration }，每套术式拥有独立熔断状态',
      '触发源：完整生得领域展开（主动解除/自然结束/对冲落败均触发）；熔断仅禁用构筑领域的对应生得术式及其衍生技能',
      '保留能力：普通攻击、咒力肉体强化、反转术式、简易领域等通用手段不受熔断影响',
      '恢复机制：自然恢复（按领域 tier 与维持时长计算周期）；强制修复「先破后立」（反转术式角色可用，成功率随次数递减，失败扣血并延长熔断）',
      '简易领域（body_reinforcement / simple_domain）永不触发熔断',
    ]
  },
  {
    version: 'v1.10.11',
    date: '2026-07-20',
    title: '领域对抗逻辑重制',
    items: [
      '领域对抗改为基于空间控制权争夺：计算领域阶位（tier）、完成度（completion）、范围（range）、自缚束缚（binding）、咒力续航等多维强度',
      '新增三种对抗结果：空间吞噬（强者领域继续，弱者崩溃并受反噬）、術式互角（双方必中规则抵消，领域共存但不再自动命中/控制）、階位圧制（tier 差 ≥3 时低阶领域瞬间崩溃并承受全额必中攻击）',
      '简易领域（虎杖悠仁）：在对方完整领域内撑起规则免疫罩，抵消自身受到的必中效果，但不能扩张或反制对方空间',
      '领域崩溃不再触发术士熔断，但会解除展开时的无敌/保护状态',
    ]
  },
  {
    version: 'v1.10.10',
    date: '2026-07-20',
    title: '黑闪音效重制',
    items: [
      '黑闪音效：高频脆裂起音（< 0.1s 击穿真空锐音）+ 低频闷爆核心（85→32Hz 下扫 + 胸腔共鸣 + 咒力撕裂滋滋声 + 钢化玻璃碎裂细碎锐响）+ 冷冽低频嗡鸣残响（金属钟壁质感，1s 内消散）',
      '连续黑闪音效：每一下爆音独立干脆互不粘连，连击次数越多叠加的低频震颤越强，并隐约浮现空间扭曲背景嗡鸣',
    ]
  },
  {
    version: 'v1.10.9',
    date: '2026-07-20',
    title: '黑闪特效重制 + 战斗巅峰状态',
    items: [
      '黑闪视觉重制：黑色撕裂闪电电弧、纯黑闪光核心、空间褶皱扭曲环、黑色冲击波环、真空震感、纯黑一闪屏幕特效',
      '新增战斗巅峰状态：成功打出黑闪后 8 秒内伤害与咒力回复均为 120%，咒力光晕凝练内敛',
      '连续黑闪触发反转术式回转流动：4 秒内每 0.5 秒微量回血，每 1 秒降低一层反转疲劳，周身出现回转式蓝色光点流动光效',
    ]
  },
  {
    version: 'v1.10.8',
    date: '2026-07-20',
    title: '修复无下限/熔断 + 优化领域对抗',
    items: [
      '修复无下限术式在领域内仍然生效的问题：确保当前上场角色的 opponent 引用始终指向实际对手',
      '修复术士熔断无反馈的问题：熔断期间点击技能/领域/屏障会显示"術式熔断"并播放错误音效',
      'AI 在术士熔断期间会强制取消已开始的 casting 状态',
      '五条悟闪避回蓝在被动禁用时不再生效',
      '优化领域对抗：新增 3 秒"领域对拼"阶段，双方互相造成咒力激突伤害；对拼结束后才按剩余血量比例执行控制/伤害/回血',
    ]
  },
  {
    version: 'v1.10.7',
    date: '2026-07-20',
    title: '新增通用黑闪机制 + 领域内被动全禁用',
    items: [
      '通用黑闪：任意角色普攻/技能命中后 4% 概率触发，刚触发后 1.5 秒内连续概率降至 0.8%',
      '黑闪伤害 = 基础伤害^2.5，上限为目标最大生命的 35%，显示金色"黒閃"字样',
      '技能自带的 critChance / blackFlashBonus 会额外提高一点黑闪概率',
      '领域内被动全禁用：自己领域内、对手领域内、术士熔断期间，所有被动无法使用',
      '受影响被动包括：无下限术式、空间斥力、手动屏障、反转术式回血、六眼强化、黑闪boost',
    ]
  },
  {
    version: 'v1.10.6',
    date: '2026-07-20',
    title: '新增反转疲劳、术士熔断、领域对抗与 AI 优化',
    items: [
      '反转疲劳：每次反转术式自动回血后叠加疲劳，0层100%/1层60%/2层30%/3层+0%，每5秒衰减一层',
      '术士熔断：领域展开结束后进入8秒熔断，期间无法使用技能/屏障/被动（无下限失效），只能普通攻击',
      '延长领域时间：五条悟领域 active 4秒→7秒，总时长 6秒→9秒；伏黑惠领域也延长至约7.6秒',
      '玩家可提前解除领域：领域内再次按下 U/ultimate 按钮即可主动解除',
      '领域对抗：双方同时展开领域时触发对抗；血量差距<15%则领域效果全部抵消；差距大时优势方按血量比例执行控制/伤害/回血',
      'AI 优化：贴地移动不再无脑飞天，仅在追击空中远程目标时小概率跳跃',
      'AI 也会领域展开：玩家开领域时 AI 高概率对抗；非五条悟 AI 在血量低时也会展开领域',
      '技能按钮新增熔断状态显示：红色覆盖+"熔断"闪烁文字',
    ]
  },
  {
    version: 'v1.10.5',
    date: '2026-07-20',
    title: '战斗 BGM 重做（咒术回战热血风格）',
    items: [
      '参考 JJK 战斗配乐：6 层叠加结构，营造战斗临场感',
      '层 1 - 太鼓节奏：4 小节"ドドパ" 三连击循环 + 鼓皮声（参考 JJK 战斗标志节奏）',
      '层 2 - 律动贝斯：电贝斯感，A 小调五声，14 音符 walk bass + 低通滤波',
      '层 3 - 三味线主旋律：27 音符旋律线 + 5.5Hz LFO 颤音，东方战斗感',
      '层 4 - 弦乐 pad：3 个 detuned sine 持续音，0.4-0.7Hz 缓慢颤音，紧张氛围',
      '层 5 - 高频 ping：1760Hz 短促铃音，咒术战斗"叮"标志',
      '层 6 - 压轴 drop：每循环末尾 80Hz → 30Hz 低音 drop，冲击感',
      'BPM 132 → 138 更紧凑，循环 12s → 6.96s 节奏更密集',
    ]
  },
  {
    version: 'v1.10.4',
    date: '2026-07-20',
    title: '修复五条悟「茈」无语音',
    items: [
      '「茈」是单字日语汉字，发音仅 0.2-0.3s 听不见 → 改为原作完整咒语「虚式、茈」',
      'executeSkill 茈分支的 playDomain 立即触发低音轰鸣盖过语音 → 延迟 700ms 播放',
      'voiceCooldown 700ms → 500ms，连招时茈不再被跳过',
      'pitch 0.85 → 0.9 更自然男声，rate 0.95 → 0.9 短词更稳',
      '音量乘数 1.4 → 1.5，茈语音更清晰',
    ]
  },
  {
    version: 'v1.10.3',
    date: '2026-07-20',
    title: '修复五条悟语音问题',
    items: [
      '冷却时间 1500ms → 700ms，连招不再跳过语音',
      'speak() 改为只在有 pending/speaking 时才 cancel，避免打断自身',
      'init() 预加载 voices 并监听 voiceschanged，解决 Chrome 首次空数组导致用默认女声',
      'pitch 0.7 → 0.85，更接近自然男声',
      'rate 0.85 → 0.95，短日语单词更流畅',
      '音量乘数 1.0 → 1.4，五条悟的技能名更清晰',
    ]
  },
  {
    version: 'v1.10.2',
    date: '2026-07-20',
    title: '技能语音简化 + 屏幕台词显示',
    items: [
      '技能释放只读技能名：蒼/赫/茈/領域展開・無量空処/黒閃/反転術式',
      '其他角色同样只读技能名：解/穿/捌/伏魔御廚子/玉犬/鵺/満象/十種影法術/咒言/反転/壊/術式解放',
      '屏幕中央显示台词文字：带缩放+旋转动画，漫画爆点风格',
      '必杀和黑闪使用超大巨字 + 渐变色彩 + 强光晕',
      '普通技能使用中等字号 + 角色主题色（五条悟青蓝/宿傩赤红/伏黑紫/狗卷绿）',
      '动画：缩放 0.4→1.18→1 + 短暂旋转 + 渐隐消失',
      '移动端响应式适配：手机/平板字号自动缩小',
    ]
  },
  {
    version: 'v1.10.1',
    date: '2026-07-20',
    title: '五条悟技能语音重做',
    items: [
      '完整的五条悟个性化台词库（11 个场景，30+ 句日文）',
      '苍：蒼/ちょっとくっついてみようか/引き寄せてやる/こっちへおいで',
      '赫：赫/飛べ/跳ね飛ばす/退け + 命中：弾け飛べ/まっすぐ帰ってもらおうか',
      '茈：虚式、茈/順転と反転の融合/見せましょう最強のオマケ',
      '黑闪：黒閃/それ黒閃だよ/俺ブラックフラッシュ',
      '领域：領域展開、無量空処/ボクが相手してあげよう',
      '胜利：まあ、ボクだからね/これが最強/当然の帰結',
      '复活：反転術式/死なせないよ',
      '受击：あいた/効くな/これはこれで面白い',
      '其他角色也补充台词：宿傩/伏黑/狗卷',
      '声线优化：低音 0.55 pitch、慢速 0.78 rate，符合五条悟强势人设',
    ]
  },
  {
    version: 'v1.10.0',
    date: '2026-07-20',
    title: '音频系统全面升级',
    items: [
      '差异化场景 BGM：菜单/选人/战斗/结算/领域 各有风格',
      '菜单 BGM：和风五声音阶静谧旋律',
      '选人 BGM：C-E-G-C 上行紧凑节拍',
      '战斗 BGM：太鼓底鼓 + 三味线/尺八旋律（咒术回战战斗风格）',
      '结算 BGM：日式上行五声音阶',
      '按钮音效：点击太鼓音、悬浮琴弦音、Tab 切换、选择/取消、错误提示',
      '倒计时音效：3/2/1 滴答 + 战斗开始上行三和弦',
      '技能语音：Web Speech API 合成日文台词',
      '全面排查噪音：所有音符强制淡入淡出，噪声加双滤波(带通+低通)，移除所有锯齿/方波',
    ]
  },
  {
    version: 'v1.9.1',
    date: '2026-07-20',
    title: '领域展开「无量空处」视觉重做',
    items: [
      '重做领域内部巨眼效果：纯黑瞳孔+虹彩虹膜+多层旋转光环',
      '新增白色墨云/溅墨效果环绕巨眼',
      '新增空间碎屑、信息碎片漂浮',
      '角色绘制层级提升：领域背景在角色之下，前景特效在角色之上',
      '优化虹膜虹彩效果：金/青/紫三色渐变亮边交替旋转',
    ]
  },
  {
    version: 'v1.9.0',
    date: '2026-07-19',
    title: '五条悟领域展开「无量空处」全面重做',
    items: [
      '6阶段领域展开：起手→宣告→扩张→维持→解除→残留',
      '起手：淡蓝咒力场爆发、空间震颤、六眼瞳孔光晕+星辰',
      '宣告：白光填满视野→黑暗吞噬现实→咒力场收缩圆环',
      '扩张：纯黑球体结界+引力弯折条纹+边缘微光',
      '维持：虚空星点+信息光粒+暗紫色巨眼凝视+数据流灌注',
      '解除：结界收缩消散+退潮光效+空间扭曲残留',
      '残留：意识涣散+咒力波纹+淡去星点',
      '声效重做：低频嗡鸣+次低频压迫+信息流噪声+虚空回响',
      '领域不再造成物理伤害，改为纯信息灌注意识瘫痪',
      '敌人全程僵直+残留阶段瘫软下坠',
    ]
  },
  {
    version: 'v1.8.1',
    date: '2026-07-19',
    title: '移除账号系统',
    items: [
      '移除账号登录/注册系统，游戏可直接游玩',
      '移除设置面板中的账号信息区域',
      '简化游戏启动流程，无需登录',
    ]
  },
  {
    version: 'v1.8.0',
    date: '2026-07-19',
    title: '账号系统：密码登录 & 手机绑定 & 云端同步',
    items: [
      '账号注册：账号名 + 密码 + 手机号绑定（选填）',
      '密码登录：验证账号密码，错误时提示',
      '记住账号：自动填入上次登录的账号名',
      '云端存储：所有预设（键位、音量）绑定账号，登录即同步',
      '设置面板：显示当前账号名和脱敏手机号',
      '支持退出登录 / 切换账号，数据自动归档',
    ]
  },
  {
    version: 'v1.7.1',
    date: '2026-07-19',
    title: 'UI 优化 & 摇杆 & 战斗文字',
    items: [
      '队伍 HUD 重构为顶部紧凑横排，避免与 HP 面板重叠',
      'HP / 咒力面板重做：漫画风暗色面板 + 发光边框 + 百分比 + 低血量闪烁',
      '移动按钮改为虚拟摇杆（十字键 + 拖拽拇指）',
      '释放技能时显示技能名文字（角色辉光色浮动）',
      '攻击命中/受伤时显示伤害数字（带发光阴影 + 高光）',
      '无下限格挡显示「無下限」文字，复活显示「REVIVE」',
      '自动回血 / 领域回血显示绿色 +治疗数字',
      '修复背景音乐噪音：移除持续嗡鸣 drone、修复循环重叠',
      '修复未选满 3 角色即可开始游戏的问题',
    ]
  },
  {
    version: 'v1.7.0',
    date: '2026-07-19',
    title: '背景音乐 & 设置面板',
    items: [
      '新增场景背景音乐：菜单（和风静谧）、战斗（紧张节奏）、结算（和弦进行）',
      '新增设置面板：主音量 / BGM 音量独立调节',
      '新增自定义键位：点击键位后按新键即可重映射',
      '键位数据保存到本地，下次打开仍保留',
      '支持一键恢复默认键位',
    ]
  },
  {
    version: 'v1.6.2',
    date: '2026-07-19',
    title: '五条悟平衡性调整',
    items: [
      '无下限术式格挡率 70% → 50%',
      '反转术式回血 3%/0.5s → 2%/1s（效率降为 1/3）',
      '反转术式复活血量 50% → 35%',
      '六眼咒力减耗 40% → 30%',
    ]
  },
  {
    version: 'v1.6.1',
    date: '2026-07-19',
    title: '更新公告 & 设备适配',
    items: [
      '新增更新公告面板，记录所有版本变更',
      '设备识别：自动检测手机/平板/桌面',
      'Canvas 尺寸按设备类型智能适配',
      '手机竖屏提示横屏游玩',
      '触屏按钮增大点击区域，按下反馈动画',
      '桌面端显示键盘快捷键提示',
    ]
  },
  {
    version: 'v1.6.0',
    date: '2026-07-19',
    title: '性能优化',
    items: [
      '固定时间步长（60FPS），高低刷新率设备速度一致',
      '渲染与逻辑分离，高刷设备保持流畅画面',
    ]
  },
  {
    version: 'v1.5.0',
    date: '2026-07-19',
    title: '赫技能特效重制',
    items: [
      '赫（赤红斥力球）三阶段：凝聚→行进→爆炸',
      '掌心光点外扩 + 空间向外鼓胀 + 热浪蒸腾畸变',
      '金色电芒 + 斥力涟漪 + 放射状碎裂坑洞',
      '高亢能量爆鸣 + 气流外冲呼啸 + 音爆音效',
    ]
  },
  {
    version: 'v1.4.0',
    date: '2026-07-19',
    title: '苍技能特效重制',
    items: [
      '苍（暗蓝引力球）三阶段：凝聚→行进→坍缩',
      '指尖光点收缩 + 空间预畸变 + 引力透镜 + 螺旋碎片',
      '向内坍缩坑洞 + 无向外飞溅 + 空间裂隙光纹',
      '低沉嗡鸣 + 气流内涌呼啸 + 坍缩音效',
    ]
  },
  {
    version: 'v1.3.0',
    date: '2026-07-19',
    title: '茈技能特效重制',
    items: [
      '茈（虚式·茈/虚式紫）双球融合 + 紫色虚质量球体',
      '空间湮灭轨迹 + 干净环形切割 + 紫光镜面残光',
      '多阶段粒子：预融合→融合闪光→湮灭轨迹→空间扭曲',
    ]
  },
  {
    version: 'v1.2.1',
    date: '2026-07-19',
    title: 'UI 优化',
    items: [
      '技能按钮显示名称和冷却时间',
      '战斗前 3 秒倒计时 + "戦闘開始" 文字特效',
      '不同角色显示专属技能按钮',
    ]
  },
  {
    version: 'v1.2.0',
    date: '2026-07-19',
    title: '3v3 车轮战',
    items: [
      '玩法从 1v1 改为 3v3 车轮战',
      '选择 3 名角色按顺序上场，赢者继承状态继续',
      '败者下一角色接替，先耗尽队伍的一方失败',
    ]
  },
  {
    version: 'v1.1.0',
    date: '2026-07-19',
    title: '五条悟技能重制',
    items: [
      '完整五条悟技能体系：无下限术式/六眼/反转术式',
      '苍（引力吸引）+ 赫（斥力击飞）+ 茈（虚式）',
      '无量空处领域展开 + 5 段普攻连击',
      '被动：70% 格挡 / 40% 咒力减耗 / 低血量自愈 / 一次复活',
    ]
  },
  {
    version: 'v1.0.0',
    date: '2026-07-19',
    title: '初始版本',
    items: [
      '4 名可选角色：五条悟 / 虎杖悠仁 / 伏黑惠 / 钉崎野蔷薇',
      'Canvas 2D 格斗游戏引擎 + PvE AI 对战',
      '粒子特效系统 + Web Audio API 音效',
      '漫画风格 UI：深灰暗紫基底 / 荧光青赤红咒力光效',
      'Electron 桌面打包支持',
    ]
  }
];

// 设备类型检测：手机 / 平板 / 桌面
function detectDevice() {
  const ua = navigator.userAgent || '';
  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const minDim = Math.min(w, h);

  // 显式平板 UA
  const isTabletUA = /iPad|Tablet|PlayBook|Silk/i.test(ua) ||
                     (/Android/i.test(ua) && !/Mobile/i.test(ua));
  // 手机 UA
  const isMobileUA = /iPhone|iPod|Android.*Mobile|Windows Phone|BlackBerry/i.test(ua);

  let device;
  if (isTabletUA) {
    device = 'tablet';
  } else if (isMobileUA) {
    device = 'mobile';
  } else if (isTouch) {
    // 触屏设备但未识别出手机 UA：按屏幕尺寸判断
    // >= 768px 视为平板，否则手机
    device = minDim >= 768 ? 'tablet' : 'mobile';
  } else {
    device = 'desktop';
  }
  return device;
}

// ========================================
// 键位映射系统
// ========================================
// ===== P1 默认键位（左侧玩家，主键盘区）=====
const P1_DEFAULT_KEYS = {
  left:  ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  jump:  ['ArrowUp', 'KeyW'],
  attack:['KeyJ'],
  skill1:['KeyK'],
  skill2:['KeyL'],
  skill3:['KeyO'],
  skill4:['KeyI'],
  dodge: ['Space', 'ShiftLeft'],
  ultimate: ['KeyU'],
  simpleDomain: ['KeyV'],
};

// ===== P2 默认键位（右侧玩家，小键盘区）=====
const P2_DEFAULT_KEYS = {
  left:  ['Numpad4'],
  right: ['Numpad6'],
  jump:  ['Numpad5'],
  attack:['Numpad1'],
  skill1:['Numpad2'],
  skill2:['Numpad3'],
  skill3:['NumpadDecimal'],
  skill4:['NumpadMultiply'],
  dodge: ['ControlRight'],
  ultimate: ['Numpad0'],
  simpleDomain: ['NumpadAdd'],
};

// 兼容旧版本 KEY_MAP：如果是旧单对象格式，转为 {p1, p2} 格式
function normalizeKeyMap(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      p1: JSON.parse(JSON.stringify(P1_DEFAULT_KEYS)),
      p2: JSON.parse(JSON.stringify(P2_DEFAULT_KEYS)),
    };
  }
  if (!raw.p1 && !raw.p2) {
    // 旧单对象格式
    return {
      p1: raw,
      p2: JSON.parse(JSON.stringify(P2_DEFAULT_KEYS)),
    };
  }
  return raw;
}

function loadKeyMap() {
  try {
    const saved = localStorage.getItem('jjk_keymap');
    if (saved) return normalizeKeyMap(JSON.parse(saved));
  } catch (e) {}
  return {
    p1: JSON.parse(JSON.stringify(P1_DEFAULT_KEYS)),
    p2: JSON.parse(JSON.stringify(P2_DEFAULT_KEYS)),
  };
}

function saveKeyMap(keyMap) {
  try {
    localStorage.setItem('jjk_keymap', JSON.stringify(keyMap));
  } catch (e) {}
}

function resetKeyMap() {
  const fresh = {
    p1: JSON.parse(JSON.stringify(P1_DEFAULT_KEYS)),
    p2: JSON.parse(JSON.stringify(P2_DEFAULT_KEYS)),
  };
  saveKeyMap(fresh);
  return fresh;
}

// 全局键位映射实例（双玩家）
let KEY_MAP = loadKeyMap();

// 全局游戏模式：'single' = VS AI, 'versus' = 双人对战
let GAME_MODE = 'single';

// 双人模式下 P2 选角的队伍
let P2_SELECTED_CHARS = [];

// 游戏主入口与循环
class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.renderer = new Renderer(this.canvas);
    this.particles = new ParticleSystem();
    this.audio = new AudioSystem();
    this.combat = new CombatSystem(this.canvas, this.particles, this.audio);
    // 语音播报时同步显示屏幕台词
    this.audio.onCastText = (text, charId, skillId) => {
      this.combat.showCastText(text, charId, skillId);
    };
    this.ui = new UIManager();
    this.ui._audio = this.audio;
    this.ui.setParticles(this.particles);
    this.ui.setQualityChangeCallback((q) => {
      if (this.renderer) this.renderer.setQuality(q);
    });
    this.ui.setPauseCallbacks(
      () => this.pauseGame(),
      () => this.resumeGame()
    );
    this.ui.setupSettings(this.audio);
    this.ui.applySavedQuality();

    // 图鉴与新手教程
    this.encyclopedia = new EncyclopediaManager();
    this.encyclopedia.init();

    this.gameState = 'menu';

    this.playerTeam = null;    // [Fighter, Fighter, Fighter]
    this.enemyTeam = null;     // [Fighter, Fighter, Fighter]
    this.activePlayerIdx = 0;
    this.activeEnemyIdx = 0;
    this.player = null;        // 当前活跃玩家
    this.enemy = null;         // 当前活跃敌人
    this.ai = null;
    this.gameMode = GAME_MODE; // 'single' | 'versus'
    this.inputState = { p1: {}, p2: {} };
    this.animationId = null;
    this.lastTime = 0;
    this.accumulator = 0;
    this.fps = 60;
    this.frameTime = 1000 / 60;  // 目标 60FPS 固定步长
    this.attackCooldown = 0;
    this.skill1Cooldown = 0;
    this.skill2Cooldown = 0;
    this.skill3Cooldown = 0;
    this.skill4Cooldown = 0;

    // 回合制状态
    this.currentRound = 1;
    this.roundTimer = 60;
    this.maxRoundTime = 60;
    this._roundEnding = false;
    this._uiUpdateCounter = 0;

    // 设备识别（mobile / tablet / desktop）
    this.device = detectDevice();
    document.documentElement.classList.add('device-' + this.device);
    document.documentElement.setAttribute('data-device', this.device);
    // 触屏设备标记
    if (this.device !== 'desktop') {
      document.documentElement.classList.add('touch');
    }
    console.log('[设备识别]', this.device, `${window.innerWidth}x${window.innerHeight}`);

    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 200));
    this.setupGlobalCallbacks();
    this.loop(0);

    // 首次进入显示新手教程
    if (this.encyclopedia && this.encyclopedia.shouldShowTutorial()) {
      setTimeout(() => {
        if (this.encyclopedia) this.encyclopedia.startTutorial();
      }, 400);
    }
  }

  setupGlobalCallbacks() {
    window.startGame = (charIds) => this.startGame(charIds);
    window.restartGame = () => this.restartGame();
    window.handleInput = (action, pressed) => this.handleInput(action, pressed);

    // 菜单 BGM 在首次用户交互时启动
    document.addEventListener('click', () => {
      this.audio.init();
      this.audio.startBGM('menu');
    }, { once: true });
  }

  resize() {
    const container = document.getElementById('game-container');
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const isPortrait = window.innerHeight > window.innerWidth;
    const isTouch = this.device !== 'desktop';

    let w, h;

    if (this.device === 'mobile') {
      // 手机：竖屏时优先填满宽度，横屏时为操作按钮预留底部空间
      if (isPortrait) {
        // 竖屏：填满宽度，16:9 画面
        w = cw;
        h = w * 9 / 16;
      } else {
        // 横屏：填满宽度，高度为可用空间减去按钮区
        w = cw;
        const availH = ch - 140;  // 预留底部 140px 给操作按钮
        h = Math.min(w * 9 / 16, availH);
        // 保证最小可玩高度
        if (h < 200) h = Math.min(availH, 240);
      }
    } else if (this.device === 'tablet') {
      // 平板：填满宽度，横屏预留按钮空间
      if (isPortrait) {
        w = Math.min(cw, 900);
        h = w * 9 / 16;
      } else {
        w = cw;
        const availH = ch - 130;
        h = Math.min(w * 9 / 16, availH);
      }
    } else {
      // 桌面：限制最大宽度
      w = Math.min(cw, 1200);
      h = w * 9 / 16;
      // 限制最大高度，避免超屏
      const maxH = ch - 80;
      if (h > maxH) {
        h = maxH;
        w = h * 16 / 9;
      }
    }

    // 兜底：保证合理范围
    w = Math.max(320, Math.floor(w));
    h = Math.max(180, Math.floor(h));

    this.canvas.width = w;
    this.canvas.height = h;
    this.renderer.resize();
    if (this.combat) {
      this.combat.groundY = h * 0.78;
    }
  }

  startGame(charIds, isVersusMode = false, p2CharIds = null) {
    this.audio.init();

    // 同步全局模式
    this.gameMode = isVersusMode ? 'versus' : 'single';
    if (typeof GAME_MODE !== 'undefined') GAME_MODE = this.gameMode;

    const cx = this.canvas.width / 2;
    const gy = this.canvas.height * 0.78;

    // 创建玩家队伍（P1）
    this.playerTeam = charIds.map(id => {
      const char = CHARACTERS[id];
      return new Fighter(char, cx - 150, gy, true, true);
    });

    // 创建敌人队伍（AI / P2）
    if (isVersusMode && p2CharIds) {
      // 双人模式：P2 选的队伍
      this.enemyTeam = p2CharIds.map(id => {
        const char = CHARACTERS[id];
        return new Fighter(char, cx + 150, gy, false, false);
      });
      this.ai = null; // 双人模式不使用 AI
    } else {
      // 单人模式：AI 随机队
      const aiCharIds = [];
      const shuffled = [...AI_CHARACTERS].sort(() => Math.random() - 0.5);
      for (let i = 0; i < 3; i++) {
        aiCharIds.push(shuffled[i % shuffled.length]);
      }
      this.enemyTeam = aiCharIds.map(id => {
        const char = CHARACTERS[id];
        return new Fighter(char, cx + 150, gy, false, false);
      });
      this.ai = new AIController(this.enemy);
      this.ai.setTarget(this.player);
      this.ai.setDifficulty(0.55 + Math.random() * 0.3);
    }

    // 为每个战士设置对手引用（用于领域被动禁用判定）
    for (let i = 0; i < this.playerTeam.length; i++) {
      this.playerTeam[i].setOpponent(this.enemyTeam[i] || this.enemyTeam[0]);
      this.enemyTeam[i].setOpponent(this.playerTeam[i] || this.playerTeam[0]);
    }

    this.activePlayerIdx = 0;
    this.activeEnemyIdx = 0;
    this.player = this.playerTeam[0];
    this.enemy = this.enemyTeam[0];

    this.combat.init(this.playerTeam, this.enemyTeam, this.activePlayerIdx, this.activeEnemyIdx, this.ai);
    this.inputState = { p1: {}, p2: {} };
    this.attackCooldown = 0;
    this.skill1Cooldown = 0;
    this.skill2Cooldown = 0;
    this.skill3Cooldown = 0;
    this.skill4Cooldown = 0;
    // P2 冷却（双人模式用）
    this.p2AttackCooldown = 0;
    this.p2Skill1Cooldown = 0;
    this.p2Skill2Cooldown = 0;
    this.p2Skill3Cooldown = 0;
    this.p2Skill4Cooldown = 0;

    // 第一回合：初始上场角色直接进入强力技能冷却
    this.player.applyRoundStartCooldowns();
    this.enemy.applyRoundStartCooldowns();

    // 初始化回合制状态
    this.currentRound = 1;
    this.roundTimer = this.maxRoundTime;
    this._roundEnding = false;
    this._uiUpdateCounter = 0;
    this.ui.updateRoundTimer(this.roundTimer);

    this.ui.showFight(this.player.character);
    this.gameState = 'ready';
    this.audio.startBGM('select'); // 选人 BGM

    // 第 1 回直接使用回合倒计时
    this.startRound();
  }

  // 开始当前回合（倒计时后进入 fighting）
  startRound() {
    if (this.checkTeamWipe()) {
      this.endMatch(this.checkTeamWipe());
      return;
    }
    this.gameState = 'roundReady';
    this.accumulator = 0;
    this.inputState = {
      p1: { left: false, right: false, up: false, down: false, attack: false, skill1: false, skill2: false, skill3: false, skill4: false, ultimate: false, simpleDomain: false, dodge: false },
      p2: { left: false, right: false, up: false, down: false, attack: false, skill1: false, skill2: false, skill3: false, skill4: false, ultimate: false, simpleDomain: false, dodge: false },
    };
    this.ui.startRoundCountdown(this.currentRound, () => {
      this.gameState = 'fighting';
      this.audio.startBGM('fighting');
      this.audio.playGo();
    });
  }

  // 比赛结束动画 + 结算
  endMatch(winnerSide) {
    this.gameState = 'resultAnim';
    this.accumulator = 0;
    this.ui.showMatchEndAnimation(winnerSide, () => {
      this.gameState = 'result';
      this.audio.startBGM('result');
      if (winnerSide === 'player') {
        this.audio.playVictory();
        this.ui.showResult(this.playerTeam, this.enemyTeam, 'player');
      } else {
        this.audio.playDefeat();
        this.ui.showResult(this.playerTeam, this.enemyTeam, 'enemy');
      }
    });
  }

  restartGame() {
    this.audio.stopBGM();
    this.audio.startBGM('menu');
    if (this.playerTeam) {
      const ids = this.playerTeam.map(f => f.character.id);
      this.startGame(ids);
    }
  }

  // 切换玩家角色
  swapPlayer() {
    for (let i = 0; i < this.playerTeam.length; i++) {
      const idx = (this.activePlayerIdx + 1 + i) % this.playerTeam.length;
      if (this.playerTeam[idx].isAlive()) {
        this.activePlayerIdx = idx;
        this.player = this.playerTeam[idx];
        this.player.x = this.canvas.width / 2 - 150;
        this.player.y = this.canvas.height * 0.78;
        this.player.state = 'idle';
        this.player.grounded = true;
        this.player.velocity.x = 0;
        this.player.velocity.y = 0;
        this.player.invincible = true;
        this.player.invincibleTimer = 60;
        this.ai.setTarget(this.player);
        this.combat.setActivePlayer(this.activePlayerIdx);
        this.ui.initFightUI(this.player.character); // 更新技能按钮
        this.player.applyRoundStartCooldowns();
        this.particles.emit(this.player.x, this.player.y - 30, 20, {
          color: '#00ff88', speed: 5, spread: Math.PI * 2, life: 0.6, size: 4, gravity: -1
        });
        this.audio.playSkill('ranged');
        return true;
      }
    }
    return false;
  }

  // 切换敌人角色
  swapEnemy() {
    for (let i = 0; i < this.enemyTeam.length; i++) {
      const idx = (this.activeEnemyIdx + 1 + i) % this.enemyTeam.length;
      if (this.enemyTeam[idx].isAlive()) {
        this.activeEnemyIdx = idx;
        this.enemy = this.enemyTeam[idx];
        this.enemy.x = this.canvas.width / 2 + 150;
        this.enemy.y = this.canvas.height * 0.78;
        this.enemy.state = 'idle';
        this.enemy.grounded = true;
        this.enemy.velocity.x = 0;
        this.enemy.velocity.y = 0;
        this.enemy.invincible = true;
        this.enemy.invincibleTimer = 60;
        this.ai.fighter = this.enemy;
        this.ai.setTarget(this.player);
        this.combat.setActiveEnemy(this.activeEnemyIdx);
        this.enemy.applyRoundStartCooldowns();
        this.particles.emit(this.enemy.x, this.enemy.y - 30, 20, {
          color: '#ff4444', speed: 5, spread: Math.PI * 2, life: 0.6, size: 4, gravity: -1
        });
        this.audio.playSkill('ranged');
        return true;
      }
    }
    return false;
  }

  // 检查队伍全灭
  checkTeamWipe() {
    const playerAlive = this.playerTeam.some(f => f.isAlive());
    const enemyAlive = this.enemyTeam.some(f => f.isAlive());
    if (!playerAlive) return 'enemy';
    if (!enemyAlive) return 'player';
    return null;
  }

  // 结束当前回合：先展示总结，再清场切换并进入下一回合倒计时
  endRound(loserSide, reason = 'ko') {
    if (this._roundEnding) return;
    if (loserSide !== 'player' && loserSide !== 'enemy') return;
    this._roundEnding = true;

    const winnerSide = loserSide === 'player' ? 'enemy' : 'player';
    const winner = winnerSide === 'player' ? this.player : this.enemy;
    const loser = loserSide === 'player' ? this.player : this.enemy;

    this.gameState = 'roundEnd';
    this.ui.showRoundSummary({
      round: this.currentRound,
      winnerName: winner.character.name,
      winnerHp: winner.currentHp,
      winnerMaxHp: winner.maxHp,
      loserName: loser.character.name,
      reason
    });

    setTimeout(() => {
      this.ui.hideRoundSummary();
      this._finishRoundTransition(loserSide, reason);
      this._roundEnding = false;
    }, 2500);
  }

  // 超时且双方血量比例相同：双方同时判负
  _handleTimeupTie() {
    if (this._roundEnding) return;
    this._roundEnding = true;

    this.gameState = 'roundEnd';
    this.ui.showRoundSummary({
      round: this.currentRound,
      winnerName: '',
      winnerHp: 0,
      winnerMaxHp: 0,
      loserName: '',
      reason: 'tie'
    });

    setTimeout(() => {
      this.ui.hideRoundSummary();
      this._finishTimeupTie();
      this._roundEnding = false;
    }, 2500);
  }

  // 回合过渡：清场、切换败者、胜方保留血量，然后开启下一回合倒计时
  _finishRoundTransition(loserSide, reason) {
    const winnerSide = loserSide === 'player' ? 'enemy' : 'player';
    const winner = winnerSide === 'player' ? this.player : this.enemy;

    // 清场：清除所有特效、弹道、领域状态
    this.combat.clearRoundEffects();
    this.particles.clearEffects();

    if (winner) {
      winner.clearDomainState();
      // 胜方保留血量，仅重置位置与状态
      winner.x = this.canvas.width / 2 + (winnerSide === 'player' ? -150 : 150);
      winner.y = this.canvas.height * 0.78;
      winner.state = 'idle';
      winner.stateTimer = 0;
      winner.grounded = true;
      winner.velocity.x = 0;
      winner.velocity.y = 0;
      winner.knockback.x = 0;
      winner.knockback.y = 0;
      winner.removeDebuffs();
      winner.invincible = true;
      winner.invincibleTimer = 60;
      winner.applyRoundStartCooldowns();
    }

    // 败方切换下一位存活角色
    const swapped = loserSide === 'player' ? this.swapPlayer() : this.swapEnemy();
    if (!swapped) {
      this.endMatch(winnerSide);
      return;
    }

    this.currentRound++;
    this.roundTimer = this.maxRoundTime;
    this.ui.updateRoundTimer(this.roundTimer);
    this.ui.initFightUI(this.player.character);
    this.ai.setTarget(this.player);
    this.accumulator = 0;

    this.startRound();
  }

  // 超时平局的过渡处理
  _finishTimeupTie() {
    this.combat.clearRoundEffects();
    this.particles.clearEffects();

    const resetFighter = (fighter, side) => {
      if (!fighter) return;
      fighter.clearDomainState();
      fighter.x = this.canvas.width / 2 + (side === 'player' ? -150 : 150);
      fighter.y = this.canvas.height * 0.78;
      fighter.state = 'idle';
      fighter.stateTimer = 0;
      fighter.grounded = true;
      fighter.velocity.x = 0;
      fighter.velocity.y = 0;
      fighter.knockback.x = 0;
      fighter.knockback.y = 0;
      fighter.removeDebuffs();
      fighter.invincible = true;
      fighter.invincibleTimer = 60;
      fighter.applyRoundStartCooldowns();
    };

    resetFighter(this.player, 'player');
    resetFighter(this.enemy, 'enemy');

    const playerSwapped = this.swapPlayer();
    const enemySwapped = this.swapEnemy();

    if (!playerSwapped || !enemySwapped) {
      if (!playerSwapped && !enemySwapped) {
        this.endMatch('enemy');
      } else if (!playerSwapped) {
        this.endMatch('enemy');
      } else {
        this.endMatch('player');
      }
      return;
    }

    this.currentRound++;
    this.roundTimer = this.maxRoundTime;
    this.ui.updateRoundTimer(this.roundTimer);
    this.ui.initFightUI(this.player.character);
    this.ai.setTarget(this.player);
    this.accumulator = 0;

    this.startRound();
  }

  handleInput(action, pressed, playerIndex = 'p1') {
    const key = playerIndex === 'p2' ? 'p2' : 'p1';
    if (pressed) {
      this.inputState[key][action] = true;
    } else {
      this.inputState[key][action] = false;
    }
  }

  pauseGame() {
    if (this.gameState !== 'fighting' && this.gameState !== 'ready') return;
    this._pausedFromState = this.gameState;
    this.gameState = 'paused';
    // 暂停时清空输入，避免恢复后残留按键导致角色乱跑
    this.inputState = {
      p1: { left: false, right: false, up: false, down: false, attack: false, skill1: false, skill2: false, skill3: false, skill4: false, ultimate: false, simpleDomain: false, dodge: false },
      p2: { left: false, right: false, up: false, down: false, attack: false, skill1: false, skill2: false, skill3: false, skill4: false, ultimate: false, simpleDomain: false, dodge: false },
    };
    const overlay = document.getElementById('pause-overlay');
    if (overlay) overlay.classList.remove('hidden');
  }

  resumeGame() {
    if (this.gameState !== 'paused') return;
    this.gameState = this._pausedFromState || 'fighting';
    this._pausedFromState = null;
    // 重置上一帧时间，避免恢复瞬间 delta 过大导致追帧
    this.lastTime = 0;
    const overlay = document.getElementById('pause-overlay');
    if (overlay) overlay.classList.add('hidden');
  }

  // 通用：根据输入状态操作指定角色
  processInputFor(actor, input, cooldowns, prefix = '') {
    if (!actor || actor.state === 'dead') return;

    // 递减跳跃冷却
    if (actor.jumpCooldown > 0) actor.jumpCooldown--;

    // 移动
    if (input['left']) {
      actor.velocity.x = -actor.speed;
      actor.facingRight = false;
      if (actor.state === 'idle') actor.state = 'moving';
    } else if (input['right']) {
      actor.velocity.x = actor.speed;
      actor.facingRight = true;
      if (actor.state === 'idle') actor.state = 'moving';
    } else {
      if (actor.grounded) {
        actor.velocity.x *= 0.85;
        if (Math.abs(actor.velocity.x) < 0.5 && actor.state === 'moving') {
          actor.state = 'idle';
        }
      }
    }

    // 跳跃
    if (input['jump'] && actor.grounded && actor.state !== 'hit' && actor.state !== 'casting' && actor.jumpCooldown <= 0) {
      actor.velocity.y = -14;
      actor.grounded = false;
      actor.jumpCooldown = 12;
    }

    // 攻击
    if (cooldowns.attack > 0) cooldowns.attack--;
    if (input['attack'] && cooldowns.attack <= 0) {
      if (prefix === 'p2') this.combat.enemyAttack();
      else this.combat.playerAttack();
      cooldowns.attack = 15;
      input['attack'] = false;
    }

    // 技能1~4
    for (let i = 1; i <= 4; i++) {
      const cdKey = 'skill' + i;
      const cdState = cooldowns[cdKey];
      if (cdState > 0) cooldowns[cdKey]--;
      if (input[cdKey] && cooldowns[cdKey] <= 0) {
        if (prefix === 'p2') this.combat.enemyUseSkill(cdKey);
        else this.combat.playerUseSkill(cdKey);
        cooldowns[cdKey] = 20;
        input[cdKey] = false;
      }
    }

    // 闪避
    if (input['dodge']) {
      if (prefix === 'p2') this.combat.enemyDodge();
      else this.combat.playerDodge();
      input['dodge'] = false;
    }

    // 领域展开
    if (input['ultimate']) {
      if (prefix === 'p2') this.combat.enemyUltimate();
      else this.combat.playerUltimate();
      input['ultimate'] = false;
    }

    // 简易领域
    if (input['simpleDomain']) {
      if (prefix === 'p2') this.combat.enemySimpleDomain();
      else this.combat.playerSimpleDomain();
      input['simpleDomain'] = false;
    }
  }

  processInput() {
    if (this.gameState !== 'fighting') return;
    if (this.gameMode === 'versus') {
      // 双人模式：同时处理 P1 和 P2
      this.processInputFor(this.player, this.inputState.p1, {
        attack: this.attackCooldown, skill1: this.skill1Cooldown, skill2: this.skill2Cooldown,
        skill3: this.skill3Cooldown, skill4: this.skill4Cooldown,
      }, 'p1');
      this.processInputFor(this.enemy, this.inputState.p2, {
        attack: this.p2AttackCooldown, skill1: this.p2Skill1Cooldown, skill2: this.p2Skill2Cooldown,
        skill3: this.p2Skill3Cooldown, skill4: this.p2Skill4Cooldown,
      }, 'p2');
    } else {
      // 单人模式：只处理 P1，冷却递减
      const p = this.player;
      if (p && p.jumpCooldown > 0) p.jumpCooldown--;
      const input = this.inputState.p1;

      if (input['left']) {
        p.velocity.x = -p.speed;
        p.facingRight = false;
        if (p.state === 'idle') p.state = 'moving';
      } else if (input['right']) {
        p.velocity.x = p.speed;
        p.facingRight = true;
        if (p.state === 'idle') p.state = 'moving';
      } else {
        if (p.grounded) {
          p.velocity.x *= 0.85;
          if (Math.abs(p.velocity.x) < 0.5 && p.state === 'moving') {
            p.state = 'idle';
          }
        }
      }

      if (input['jump'] && p.grounded && p.state !== 'hit' && p.state !== 'casting' && p.jumpCooldown <= 0) {
        p.velocity.y = -14;
        p.grounded = false;
        p.jumpCooldown = 12;
      }

      if (this.attackCooldown > 0) this.attackCooldown--;
      if (input['attack'] && this.attackCooldown <= 0) {
        this.combat.playerAttack();
        this.attackCooldown = 15;
        input['attack'] = false;
      }

      if (this.skill1Cooldown > 0) this.skill1Cooldown--;
      if (input['skill1'] && this.skill1Cooldown <= 0) {
        this.combat.playerUseSkill('skill1');
        this.skill1Cooldown = 20;
        input['skill1'] = false;
      }

      if (this.skill2Cooldown > 0) this.skill2Cooldown--;
      if (input['skill2'] && this.skill2Cooldown <= 0) {
        this.combat.playerUseSkill('skill2');
        this.skill2Cooldown = 20;
        input['skill2'] = false;
      }

      if (this.skill3Cooldown > 0) this.skill3Cooldown--;
      if (input['skill3'] && this.skill3Cooldown <= 0) {
        this.combat.playerUseSkill('skill3');
        this.skill3Cooldown = 20;
        input['skill3'] = false;
      }

      if (this.skill4Cooldown > 0) this.skill4Cooldown--;
      if (input['skill4'] && this.skill4Cooldown <= 0) {
        this.combat.playerUseSkill('skill4');
        this.skill4Cooldown = 20;
        input['skill4'] = false;
      }

      if (input['dodge']) {
        this.combat.playerDodge();
        input['dodge'] = false;
      }

      if (input['ultimate']) {
        this.combat.playerUltimate();
        input['ultimate'] = false;
      }

      if (input['simpleDomain']) {
        this.combat.playerSimpleDomain();
        input['simpleDomain'] = false;
      }
    }
  }

  loop(time) {
    this.animationId = requestAnimationFrame((t) => this.loop(t));

    // 固定时间步长：保证不同刷新率设备（60/120/144Hz）游戏速度一致
    if (this.lastTime === 0) this.lastTime = time;
    let delta = time - this.lastTime;
    this.lastTime = time;

    // 暂停时不累计时间，避免恢复后一次性追帧
    if (this.gameState !== 'paused') {
      // 防止页面切换返回时的大跳（卡顿后一次性追帧）
      if (delta > 200) delta = 200;
      this.accumulator += delta;
    }

    // 以固定 60FPS 步长更新游戏逻辑
    // 高刷新率设备每帧只更新一小部分逻辑；低刷新率设备会多更新几次追上
    let steps = 0;
    while (this.accumulator >= this.frameTime && steps < 5) {
      this.update();
      this.accumulator -= this.frameTime;
      steps++;
    }

    // 渲染始终按设备原生刷新率（暂停时也渲染，显示冻结画面+暂停遮罩）
    this.render();
  }

  // 固定步长更新逻辑（60FPS）
  update() {
    if (this.gameState === 'fighting') {
      this.processInput();
      this.combat.update();

      // 回合计时
      this.roundTimer -= 1 / 60;
      this.ui.updateRoundTimer(this.roundTimer);

      // 回合结束判定：超时 / 角色死亡
      if (this.roundTimer <= 0) {
        const pRatio = this.player.currentHp / this.player.maxHp;
        const eRatio = this.enemy.currentHp / this.enemy.maxHp;
        if (Math.abs(pRatio - eRatio) < 0.001) {
          this._handleTimeupTie();
        } else {
          this.endRound(pRatio < eRatio ? 'player' : 'enemy', 'timeup');
        }
        return;
      }
      if (!this.player.isAlive()) {
        this.endRound('player', 'ko');
        return;
      }
      if (!this.enemy.isAlive()) {
        this.endRound('enemy', 'ko');
        return;
      }

      // AI 更新（仅单人模式）
      if (this.gameMode === 'single') {
        this.combat.checkAIAttack();
      }
      this.particles.update();

      // UI 更新：降低频率以减少 DOM 重排
      this._uiUpdateCounter++;
      if (this._uiUpdateCounter % 3 === 0) {
        this.ui.updateSkillCooldowns(this.player);
      }
      if (this._uiUpdateCounter % 5 === 0) {
        this.ui.updateRoundTimer(this.roundTimer);
      }
    } else if (this.gameState === 'ready') {
      this.particles.update();
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const shake = this.particles.getShakeOffset();
    ctx.save();
    ctx.translate(shake.x, shake.y);

    this.renderer.drawBackground();

    if (['fighting', 'ready', 'paused', 'roundReady', 'roundEnd', 'resultAnim'].includes(this.gameState)) {
      this.renderer.drawDomainIndicator(this.player);
      this.renderer.drawDomainIndicator(this.enemy);

      // 领域背景覆盖（在角色之下）
      this.renderer.drawDomainOverlay(this.player, 'behind');
      this.renderer.drawDomainOverlay(this.enemy, 'behind');

      this.renderer.drawFighter(this.player);
      this.renderer.drawFighter(this.enemy);

      // 简易领域特效（脚下蓝色水波光圈）
      this.renderer.drawSimpleDomain(this.player);
      this.renderer.drawSimpleDomain(this.enemy);

  this.combat.draw(ctx);

      // 粒子
      this.particles.draw(ctx, { x: 0, y: 0 });

      // 领域前景覆盖（在角色之上的部分，如信息粒子、巨眼前景）
      this.renderer.drawDomainOverlay(this.player, 'front');
      this.renderer.drawDomainOverlay(this.enemy, 'front');

      // 队伍HUD（3v3）
      this.renderer.drawTeamHUD(this.playerTeam, this.enemyTeam, this.activePlayerIdx, this.activeEnemyIdx);

      // 当前活跃角色 HUD（HP + 咒力）
      this.renderer.drawHUD(this.player, this.enemy);

      this.renderer.drawCombo(this.combat.comboDisplay);
    }

    ctx.restore();
  }
}

// 启动
document.addEventListener('DOMContentLoaded', () => {
  new Game();
});