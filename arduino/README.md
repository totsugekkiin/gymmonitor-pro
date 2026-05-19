# Gym-Tracker WiFi 固件（Arduino IDE）

## 硬件

ESP32-C3 SuperMini，传感器与引脚同项目根目录 `test.txt`（BLE 版）。

## 所需 Arduino 库

在 **库管理器** 安装：

| 库 | 说明 |
|----|------|
| **WebSockets** by Markus Sattler | WebSocket 服务 |
| **MPU6050** by tockn | 已有则跳过 |
| **Adafruit VL53L1X** | 已有则跳过 |
| **U8g2** | OLED |

`WiFi`、`WebServer`、`LittleFS` 随 ESP32 板卡支持包自带。

## 板卡设置

- 开发板：**ESP32C3 Dev Module**（或对应 C3 板）
- Partition Scheme：**带 LittleFS 的分区**（如 `Default 4MB with spiffs` / `Huge APP` 等，名称因包版本而异）
- 上传速度：921600（可选）

## 烧录步骤

### 1. 编译网页并复制到 `data/`

在项目根目录：

```bash
npm run build:esp
```

会把 `dist/` 复制到 `arduino/gym-tracker-wifi/data/`。

### 2. 上传 LittleFS（网页文件）

1. 用 Arduino IDE 打开 `arduino/gym-tracker-wifi/gym-tracker-wifi.ino`
2. 安装插件 **「ESP32 Sketch Data Upload」** 或使用 **arduino-esp32 3.x** 自带的 **Tools → ESP32 LittleFS Data Upload**（菜单名可能为 “LittleFS Upload”）
3. 先执行 **上传文件系统 / Upload LittleFS**，等待完成

### 3. 上传固件

点击 **上传**（→），烧录 `.ino` 程序。

### 4. 使用

1. 手机 WiFi 连接 **`Gym-Tracker`**，密码 **`12345678`**
2. 无互联网提示时选择 **保持连接**
3. 浏览器打开 **http://192.168.4.1**（不要用 https）
4. 界面会自动尝试 WebSocket 连接

## 网络说明

| 项目 | 值 |
|------|-----|
| AP 名称 | `Gym-Tracker` |
| AP 密码 | `12345678` |
| 网页 | http://192.168.4.1 |
| WebSocket | ws://192.168.4.1:81 |

## 改 WiFi 密码

编辑 `gym-tracker-wifi.ino` 中的 `AP_SSID` / `AP_PASS` 后重新上传固件。

## 串口调试

115200 baud，启动后应看到 `AP IP: 192.168.4.1` 与 `Gym-Tracker WiFi ready`。
