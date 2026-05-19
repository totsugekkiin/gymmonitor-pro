# GymMonitor Pro

通过 Web Bluetooth 连接健身传感器，实时监测杠铃深度、倾斜角度与训练组数据，支持组间回顾与可视化分析。

## 本地运行

**环境要求：** Node.js（建议 18+）

1. 安装依赖：`npm install`
2. 启动开发服务器：`npm run dev`
3. 在浏览器中打开终端显示的本地地址（默认 `http://localhost:5173`）

**说明：** 需使用支持 [Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API) 的浏览器（如 Chrome、Edge），并通过 HTTPS 或 `localhost` 访问。

## 构建

```bash
npm run build
npm run preview
```

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
