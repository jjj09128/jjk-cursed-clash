// 设备性能检测与画质推荐
class QualityAdvisor {
  static _cached = null;
  static _benchmarkDone = false;

  // 供 UI 直接调用：立即返回一个推荐值（先同步估算，后台跑 benchmark 修正）
  static getRecommendedQuality() {
    if (this._cached) return this._cached;
    this._cached = this._syncDetect();
    // 后台跑一次轻量 Canvas 帧率测试，完成后更新缓存
    if (!this._benchmarkDone && typeof document !== 'undefined') {
      this._runBenchmark().then((q) => {
        this._cached = q;
        this._benchmarkDone = true;
      }).catch(() => {
        this._benchmarkDone = true;
      });
    }
    return this._cached;
  }

  // 同步快速估算（基于 UA、触控、CPU 核心数、分辨率）
  static _syncDetect() {
    const ua = (navigator.userAgent || '').toLowerCase();
    const mobile = /android|iphone|ipod/.test(ua);
    const tablet = /ipad|android(?!.*mobile)|tablet/.test(ua);
    const touch = navigator.maxTouchPoints > 0;
    const cores = navigator.hardwareConcurrency || 2;
    const pixels = (window.screen.width * window.screen.height) || (window.innerWidth * window.innerHeight) || 0;

    if (mobile || tablet) {
      if (pixels > 2073600 || cores <= 4) return 'low';   // 2K+ 或低核
      return 'medium';
    }
    // 桌面
    if (touch && cores <= 4) return 'low';
    if (cores <= 2) return 'low';
    if (cores <= 4) return 'medium';
    return 'high';
  }

  // 轻量 Canvas 帧率测试（约 500ms）
  static _runBenchmark() {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(this._syncDetect());
        return;
      }

      const start = performance.now();
      const duration = 500;
      let frames = 0;

      const draw = () => {
        const now = performance.now();
        if (now - start >= duration) {
          const fps = frames / ((now - start) / 1000);
          resolve(this._qualityFromFPS(fps));
          return;
        }

        // 模拟轻量战斗粒子负载
        ctx.fillStyle = '#0a0a0c';
        ctx.fillRect(0, 0, 320, 240);
        for (let i = 0; i < 160; i++) {
          const x = Math.random() * 320;
          const y = Math.random() * 240;
          const r = Math.random() * 6 + 2;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${Math.random() * 255 | 0}, ${Math.random() * 255 | 0}, ${Math.random() * 255 | 0}, 0.4)`;
          ctx.fill();
        }
        frames++;
        requestAnimationFrame(draw);
      };

      requestAnimationFrame(draw);
    });
  }

  static _qualityFromFPS(fps) {
    const ua = (navigator.userAgent || '').toLowerCase();
    const mobile = /android|iphone|ipod/.test(ua);
    const tablet = /ipad|android(?!.*mobile)|tablet/.test(ua);

    if (fps < 30) return 'low';
    if (fps < 50) return 'medium';
    // 高性能移动设备仍建议中，避免过热/耗电
    if (mobile || tablet) return 'medium';
    return 'high';
  }
}
