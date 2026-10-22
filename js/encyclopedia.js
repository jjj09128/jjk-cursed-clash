// 图鉴与新手教程系统

const ENCYCLOPEDIA_DATA = {
  mechanics: {
    title: '戰鬥機制',
    icon: '⚔️',
    items: [
      {
        name: '領域展開',
        desc: '消耗大量咒力展開生得領域，領域內敵人會受到「必中」規則影響。完整領域持續約 14 秒，結束後會進入術士熔斷。開啟時機：敵人貼身、血量危急或敵人也開領域時進行對抗。'
      },
      {
        name: '簡易領域',
        desc: '通用防禦手段，在敵方完整領域內按 V 可手動觸發。消耗 50 咒力，持續 4 秒，能抵消自身受到的必中規則。簡易領域不會觸發術士熔斷。'
      },
      {
        name: '術士熔斷',
        desc: '完整領域結束後進入的封印狀態，期間無法使用技能、領域與部分被動。熔斷時長與領域等級和持續時間有關，只能依靠時間或反轉術式「先破後立」恢復。'
      },
      {
        name: '黑閃',
        desc: '普攻或技能命中後有機率觸發的極致打擊，傷害按基礎傷害的 2.5 次方計算。連續黑閃會進入「戰鬥巔峰」狀態，傷害與咒力回復提升。'
      },
      {
        name: '反轉術式',
        desc: '將負向咒力轉為正向，從而治癒自身。每次自動回血會疊加「反轉疲勞」，層數越高回復效率越低，每 5 秒衰減一層。'
      },
      {
        name: '咒力與技能',
        desc: '攻擊命中、受擊與隨時間都會恢復咒力。技能需要消耗咒力，冷卻結束後才能再次使用。部分技能可在領域內獲得強化或解除限制。'
      }
    ]
  },
  characters: {
    title: '角色圖鑑',
    icon: '👤',
    items: [
      {
        name: '五條悟',
        desc: '最強咒術師。術式「無下限術式」可無效化絕大多數攻擊；「蒼」吸引、「赫」排斥，融合為虛式「茈」。領域「無量空處」讓敵人陷入無限信息而全身僵直。'
      },
      {
        name: '兩面宿儺',
        desc: '詛咒之王。斬擊術式「解」可遠程無形斬切；「捌」依據目標強度自適應威力，接觸時觸發。「灶（開）」能射出高溫烈焰箭矢。領域「伏魔御廚子」為開放型，持續斬擊範圍內敵人。'
      },
      {
        name: '虎杖悠仁',
        desc: '肉體特級，黑閃率極高。技能「迳庭拳」物理+延遲咒力雙段傷害；「赤磷悦动」短時提升攻防速；「穿血」發射可貫穿敵人的超音速血彈。領域「農家樂領域」為開放型，靈魂限定・解必中造成靈魂傷害。被動：簡易領域 + 反轉術式自動回血。'
      }
    ]
  },
  terms: {
    title: '術語解釋',
    icon: '📜',
    items: [
      {
        name: '必中規則',
        desc: '領域內的強制效果，只要身處對方領域，敵人的術式攻擊就無法閃避。可用簡易領域或更高階領域對抗來抵消。'
      },
      {
        name: '開放型領域',
        desc: '領域範圍極大，通常將外部現實也納入術式效果中。代表：宿儺「伏魔御廚子」。'
      },
      {
        name: '封閉型領域',
        desc: '以領域外殼隔絕內外的獨立空間，必中效果更集中。代表：五條悟「無量空處」。'
      },
      {
        name: '術式順轉 / 反轉',
        desc: '順轉是將咒力以術式釋放；反轉則是將負向咒力轉為正向，多用於治癒或強化術式。'
      },
      {
        name: '術式對抗',
        desc: '雙方同時展開完整領域時，會先進行 3 秒對拼，再按剩餘血量與領域強度判定勝負。弱者領域崩潰並承受反噬。'
      }
    ]
  }
};

const TUTORIAL_PAGES = [
  {
    title: '歡迎來到 咒術迴戰：咒力交織',
    content: '這是一款 1v1 咒術對戰遊戲。選擇 3 名角色組成隊伍，擊敗對手即可獲勝。本教程會帶你快速了解核心戰鬥機制。'
  },
  {
    title: '基本操作',
    content: 'A/D 左右移動，W/Space 跳躍，J 普攻。術式按鈕與鍵位可在設定中修改。手機玩家使用左下角虛擬搖桿與右下角技能按鈕。'
  },
  {
    title: '領域與簡易領域',
    content: 'U 鍵展開領域，可發動必中規則。被敵人領域籠罩時，按 V 可展開簡易領域抵消必中。領域結束後會進入術士熔斷，短時間內無法再使用技能。'
  },
  {
    title: '黑閃與反轉術式',
    content: '命中時有機率打出金色「黑閃」，造成極高傷害並進入短暫強化。血量低時會自動觸發反轉術式回血，但次數越多效率越低。'
  },
  {
    title: '圖鑑入口',
    content: '主菜單右上角「圖鑑」按鈕可隨時查看所有機制說明。現在就開始你的咒術對戰吧！'
  }
];

class EncyclopediaManager {
  constructor() {
    this.currentCategory = 'mechanics';
    this.tutorialPage = 0;
    this.elements = {};
    this._bindElements();
  }

  _bindElements() {
    this.elements.encyBtn = document.getElementById('encyclopedia-btn');
    this.elements.encyModal = document.getElementById('encyclopedia-modal');
    this.elements.encyClose = document.getElementById('encyclopedia-close');
    this.elements.encyNav = document.getElementById('encyclopedia-nav');
    this.elements.encyContent = document.getElementById('encyclopedia-content');
    this.elements.tutorialModal = document.getElementById('tutorial-modal');
    this.elements.tutorialTitle = document.getElementById('tutorial-title');
    this.elements.tutorialContent = document.getElementById('tutorial-content');
    this.elements.tutorialPage = document.getElementById('tutorial-page');
    this.elements.tutorialPrev = document.getElementById('tutorial-prev');
    this.elements.tutorialNext = document.getElementById('tutorial-next');
    this.elements.tutorialSkip = document.getElementById('tutorial-skip');
  }

  init() {
    if (!this.elements.encyBtn) return;
    this.elements.encyBtn.addEventListener('click', () => this.openEncyclopedia());
    this.elements.encyClose.addEventListener('click', () => this.closeEncyclopedia());
    this.elements.encyModal.addEventListener('click', (e) => {
      if (e.target === this.elements.encyModal) this.closeEncyclopedia();
    });

    if (this.elements.tutorialPrev) {
      this.elements.tutorialPrev.addEventListener('click', () => this.prevTutorialPage());
    }
    if (this.elements.tutorialNext) {
      this.elements.tutorialNext.addEventListener('click', () => this.nextTutorialPage());
    }
    if (this.elements.tutorialSkip) {
      this.elements.tutorialSkip.addEventListener('click', () => this.closeTutorial());
    }
    if (this.elements.tutorialModal) {
      this.elements.tutorialModal.addEventListener('click', (e) => {
        if (e.target === this.elements.tutorialModal) this.closeTutorial();
      });
    }
  }

  openEncyclopedia(category = 'mechanics') {
    this.currentCategory = category;
    this._renderEncyclopedia();
    if (this.elements.encyModal) {
      this.elements.encyModal.classList.remove('hidden');
    }
  }

  closeEncyclopedia() {
    if (this.elements.encyModal) {
      this.elements.encyModal.classList.add('hidden');
    }
  }

  _renderEncyclopedia() {
    if (!this.elements.encyNav || !this.elements.encyContent) return;
    // 导航
    this.elements.encyNav.innerHTML = '';
    for (const [key, data] of Object.entries(ENCYCLOPEDIA_DATA)) {
      const btn = document.createElement('button');
      btn.className = 'ency-nav-btn' + (key === this.currentCategory ? ' active' : '');
      btn.innerHTML = `<span class="ency-nav-icon">${data.icon}</span><span class="ency-nav-text">${data.title}</span>`;
      btn.addEventListener('click', () => {
        this.currentCategory = key;
        this._renderEncyclopedia();
      });
      this.elements.encyNav.appendChild(btn);
    }
    // 内容
    const data = ENCYCLOPEDIA_DATA[this.currentCategory];
    this.elements.encyContent.innerHTML = `<h3 class="ency-section-title">${data.icon} ${data.title}</h3>` +
      data.items.map(item => `
        <div class="ency-card">
          <div class="ency-card-name">${item.name}</div>
          <div class="ency-card-desc">${item.desc}</div>
        </div>
      `).join('');
  }

  shouldShowTutorial() {
    try {
      return localStorage.getItem('jjk_tutorial_seen') !== '1';
    } catch (e) {
      return true;
    }
  }

  markTutorialSeen() {
    try {
      localStorage.setItem('jjk_tutorial_seen', '1');
    } catch (e) {}
  }

  startTutorial() {
    this.tutorialPage = 0;
    this._updateTutorialPage();
    if (this.elements.tutorialModal) {
      this.elements.tutorialModal.classList.remove('hidden');
    }
  }

  closeTutorial() {
    this.markTutorialSeen();
    if (this.elements.tutorialModal) {
      this.elements.tutorialModal.classList.add('hidden');
    }
  }

  nextTutorialPage() {
    if (this.tutorialPage < TUTORIAL_PAGES.length - 1) {
      this.tutorialPage++;
      this._updateTutorialPage();
    } else {
      this.closeTutorial();
    }
  }

  prevTutorialPage() {
    if (this.tutorialPage > 0) {
      this.tutorialPage--;
      this._updateTutorialPage();
    }
  }

  _updateTutorialPage() {
    const page = TUTORIAL_PAGES[this.tutorialPage];
    if (!page || !this.elements.tutorialTitle || !this.elements.tutorialContent || !this.elements.tutorialPage) return;
    this.elements.tutorialTitle.textContent = page.title;
    this.elements.tutorialContent.textContent = page.content;
    this.elements.tutorialPage.textContent = `${this.tutorialPage + 1} / ${TUTORIAL_PAGES.length}`;

    if (this.elements.tutorialPrev) {
      this.elements.tutorialPrev.disabled = this.tutorialPage === 0;
      this.elements.tutorialPrev.style.visibility = this.tutorialPage === 0 ? 'hidden' : 'visible';
    }
    if (this.elements.tutorialNext) {
      const isLast = this.tutorialPage === TUTORIAL_PAGES.length - 1;
      this.elements.tutorialNext.querySelector('.btn-text').textContent = isLast ? '開始戰鬥' : '下一步';
    }
  }
}
