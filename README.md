# GymMonitor Pro

通过 Web Bluetooth 连接健身传感器，实时监测杠铃深度、倾斜角度与训练组数据，支持组间回顾与可视化分析。

## 本地运行

**环境要求：** Node.js（建议 18+）

1. 安装依赖：`npm install`
2. 启动开发服务器：`npm run dev`
3. 在浏览器中打开终端显示的本地地址（默认 `http://localhost:5173`）

**说明（网页蓝牙 / GitHub Pages）：** 需 Chrome/Edge 等支持 Web Bluetooth 的浏览器。

## 安卓推荐：ESP WiFi + 自带浏览器

无需安装 Chrome。详见 [`arduino/README.md`](arduino/README.md)。

1. 按 Arduino 说明烧录固件并上传 `data/` 网页  
2. 手机连接 WiFi **`Gym-Tracker`**（密码 `12345678`）  
3. 浏览器打开 **http://192.168.4.1**

构建 ESP 用网页：`npm run build:esp`

## 构建

```bash
npm run build
npm run preview
```

## 在线访问（GitHub Pages）

推送到 `master` 后会自动部署：

**https://totsugekkiin.github.io/gymmonitor-pro/**

首次使用请在仓库 **Settings → Pages → Build and deployment** 中将 Source 设为 **GitHub Actions**。

---

# GymMonitor Pro (English)

Real-time barbell telemetry over Web Bluetooth: depth, tilt angle, and per-set workout data with session review and charts.

## Run locally

**Prerequisites:** Node.js (18+ recommended)

1. Install dependencies: `npm install`
2. Start the dev server: `npm run dev`
3. Open the URL shown in the terminal (default `http://localhost:5173`)

**Note:** Use a browser with [Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API) support (e.g. Chrome, Edge), served over HTTPS or `localhost`.

## Build

```bash
npm run build
npm run preview
```

## Live demo (GitHub Pages)

**https://totsugekkiin.github.io/gymmonitor-pro/**

Auto-deploys on push to `master` (requires Pages source: GitHub Actions).
