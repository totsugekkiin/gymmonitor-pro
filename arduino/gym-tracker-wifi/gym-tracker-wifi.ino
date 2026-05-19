/*
 * Gym-Tracker WiFi — ESP32-C3 SuperMini
 * AP: Gym-Tracker / 12345678
 * 手机连热点后打开 http://192.168.4.1
 * WebSocket :81 遥测与命令
 *
 * Arduino 库：WiFi, WebServer, LittleFS, WebSockets (Markus Sattler)
 * 分区：带 LittleFS 的 scheme（如 "Default 4MB with spiffs" 或 LittleFS）
 */

#include <Wire.h>
#include <WiFi.h>
#include <WebServer.h>
#include <WebSocketsServer.h>
#include <LittleFS.h>
#include <MPU6050_tockn.h>
#include <Adafruit_VL53L1X.h>
#include <U8g2lib.h>
#include <math.h>

#define TRIG_PIN 2
#define ECHO_PIN 3
#define SDA_PIN 8
#define SCL_PIN 9
#define BUZZER_PIN 10

#define AP_SSID "Gym-Tracker"
#define AP_PASS "12345678"
#define HTTP_PORT 80
#define WS_PORT 81

#define TILT_LIMIT_DEG 10.0f
#define DEPTH_BOTTOM_CM 5
#define DEPTH_TOP_CM 30
#define LOOP_DELAY_MS 20
#define TILT_BEEP_INTERVAL_MS 800
#define TILT_BEEP_DURATION_MS 80
#define ANGLE_LPF_ALPHA 0.85f

MPU6050 mpu(Wire);
Adafruit_VL53L1X vl53(-1, -1);
U8G2_SSD1306_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0, U8X8_PIN_NONE);

WebServer httpServer(HTTP_PORT);
WebSocketsServer webSocket(WS_PORT);

bool clientConnected = false;

enum SystemState { SYS_STARTING, SYS_RUNNING };
SystemState currentState = SYS_STARTING;
unsigned long startDelayTimer = 0;

enum RepState { WAIT_DOWN, WAIT_UP };
RepState repState = WAIT_DOWN;
int totalReps = 0;
bool repEventThisFrame = false;

float tiltFiltered = 0.0f;
bool tiltWarning = false;

unsigned long lastBuzzerMillis = 0;
bool buzzerActive = false;
unsigned long buzzerDuration = 0;
unsigned long lastTiltBeepMs = 0;

int lastLaserDist = -1;
const char *currentDataSource = "NONE";

void triggerBuzzer(unsigned long duration) {
  digitalWrite(BUZZER_PIN, HIGH);
  lastBuzzerMillis = millis();
  buzzerDuration = duration;
  buzzerActive = true;
}

void updateBuzzer() {
  if (buzzerActive && (millis() - lastBuzzerMillis >= buzzerDuration)) {
    digitalWrite(BUZZER_PIN, LOW);
    buzzerActive = false;
  }
}

void updateTiltBuzzer() {
  if (!tiltWarning) return;
  unsigned long now = millis();
  if (now - lastTiltBeepMs >= TILT_BEEP_INTERVAL_MS) {
    triggerBuzzer(TILT_BEEP_DURATION_MS);
    lastTiltBeepMs = now;
  }
}

void updateOLED(const char *topText, const char *bigNumber, const char *subText) {
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_6x12_tf);
  u8g2.drawStr(0, 10, topText);
  u8g2.drawHLine(0, 14, 128);
  u8g2.setFont(u8g2_font_logisoso32_tn);
  u8g2.drawStr(36, 50, bigNumber);
  u8g2.setFont(u8g2_font_6x12_tf);
  u8g2.drawStr(0, 62, subText);
  u8g2.sendBuffer();
}

void drawTiltScreen(float angle, int dist, int reps) {
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_6x12_tf);
  u8g2.drawStr(0, 10, "!! TILT WARNING !!");
  u8g2.drawHLine(0, 14, 128);
  u8g2.setFont(u8g2_font_logisoso32_tn);
  char buf[8];
  snprintf(buf, sizeof(buf), "%d", reps);
  u8g2.drawStr(36, 50, buf);
  u8g2.setFont(u8g2_font_6x12_tf);
  char sub[32];
  snprintf(sub, sizeof(sub), "A:%.0f  D:%dcm", fabs(angle), dist);
  u8g2.drawStr(0, 62, sub);
  u8g2.sendBuffer();
}

void drawNormalScreen(int dist, int reps) {
  const char *top = clientConnected ? "ONLINE" : "OFFLINE";
  char big[8];
  snprintf(big, sizeof(big), "%02d", reps % 100);
  char sub[32];
  snprintf(sub, sizeof(sub), "%s %dCM", currentDataSource, dist);
  updateOLED(top, big, sub);
}

int getFilteredUltrasonic() {
  int samples[5];
  for (int i = 0; i < 5; i++) {
    digitalWrite(TRIG_PIN, LOW);
    delayMicroseconds(2);
    digitalWrite(TRIG_PIN, HIGH);
    delayMicroseconds(10);
    digitalWrite(TRIG_PIN, LOW);
    long duration = pulseIn(ECHO_PIN, HIGH, 15000);
    int cm = duration * 0.034 / 2;
    samples[i] = (cm == 0 || cm > 150) ? 150 : cm;
    delay(5);
  }
  for (int i = 0; i < 4; i++) {
    for (int j = i + 1; j < 5; j++) {
      if (samples[i] > samples[j]) {
        int t = samples[i];
        samples[i] = samples[j];
        samples[j] = t;
      }
    }
  }
  return samples[2];
}

int getFusedDistance() {
  int laserDist = -1;
  if (vl53.dataReady()) {
    int16_t distance_mm = vl53.distance();
    vl53.clearInterrupt();
    if (distance_mm != -1) {
      laserDist = distance_mm / 10;
      lastLaserDist = laserDist;
    }
  } else if (lastLaserDist > 0) {
    laserDist = lastLaserDist;
  }

  if (laserDist > 0 && laserDist <= 120) {
    currentDataSource = "LASER";
    return laserDist;
  }
  currentDataSource = "ULTRA";
  return getFilteredUltrasonic();
}

float readTiltAngle() {
  float raw = mpu.getAngleX();
  tiltFiltered = ANGLE_LPF_ALPHA * tiltFiltered + (1.0f - ANGLE_LPF_ALPHA) * raw;
  return tiltFiltered;
}

void updateRepCounter(int currentDist) {
  repEventThisFrame = false;

  if (repState == WAIT_DOWN) {
    if (currentDist <= DEPTH_BOTTOM_CM) {
      repState = WAIT_UP;
      triggerBuzzer(50);
    }
  } else if (repState == WAIT_UP) {
    if (currentDist >= DEPTH_TOP_CM) {
      repState = WAIT_DOWN;
      if (totalReps < 999) {
        totalReps++;
      }
      repEventThisFrame = true;
      triggerBuzzer(150);
    }
  }
}

void handleCommand(const String &cmd) {
  if (cmd == "RESET") {
    totalReps = 0;
    repState = WAIT_DOWN;
    repEventThisFrame = false;
    triggerBuzzer(300);
    Serial.println("[CMD] RESET");
  } else if (cmd == "CAL") {
    Serial.println("[CMD] CAL start - keep still");
    mpu.calcGyroOffsets(true);
    tiltFiltered = 0;
    triggerBuzzer(500);
    Serial.println("[CMD] CAL done");
  }
}

void sendTelemetry(int dist, float angle, int reps) {
  if (webSocket.connectedClients() == 0) return;

  tiltWarning = (fabs(angle) > TILT_LIMIT_DEG);
  int w = tiltWarning ? 1 : 0;
  int e = repEventThisFrame ? 1 : 0;

  char buf[80];
  snprintf(buf, sizeof(buf), "D:%d,A:%.1f,R:%d,W:%d,T:%lu,E:%d\n",
           dist, angle, reps, w, (unsigned long)millis(), e);
  webSocket.broadcastTXT(buf);
}

String getContentType(const String &path) {
  if (path.endsWith(".html")) return "text/html";
  if (path.endsWith(".css")) return "text/css";
  if (path.endsWith(".js")) return "application/javascript";
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".ico")) return "image/x-icon";
  return "text/plain";
}

void serveFile(String path) {
  if (path == "/") path = "/index.html";
  if (!LittleFS.exists(path)) {
    httpServer.send(404, "text/plain", "Not found: " + path);
    return;
  }
  File file = LittleFS.open(path, "r");
  httpServer.streamFile(file, getContentType(path));
  file.close();
}

void handleNotFound() {
  String path = httpServer.uri();
  if (path.startsWith("/assets/") || path == "/" || path.endsWith(".html") ||
      path.endsWith(".css") || path.endsWith(".js") || path.endsWith(".ico")) {
    serveFile(path);
    return;
  }
  httpServer.send(404, "text/plain", "Not found");
}

void webSocketEvent(uint8_t num, WStype_t type, uint8_t *payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED:
      clientConnected = webSocket.connectedClients() > 0;
      Serial.printf("[WS] client #%u connected\n", num);
      break;
    case WStype_DISCONNECTED:
      clientConnected = webSocket.connectedClients() > 0;
      Serial.printf("[WS] client #%u disconnected\n", num);
      break;
    case WStype_TEXT: {
      String cmd;
      for (size_t i = 0; i < length; i++) {
        cmd += (char)payload[i];
      }
      cmd.trim();
      handleCommand(cmd);
      break;
    }
    default:
      break;
  }
}

void setupWiFiAndServers() {
  WiFi.mode(WIFI_AP);
  WiFi.softAP(AP_SSID, AP_PASS);
  Serial.print("AP IP: ");
  Serial.println(WiFi.softAPIP());

  httpServer.on("/", HTTP_GET, []() { serveFile("/"); });
  httpServer.onNotFound(handleNotFound);
  httpServer.begin();

  webSocket.begin();
  webSocket.onEvent(webSocketEvent);
  Serial.println("HTTP :80  WebSocket :81");
}

void setup() {
  Serial.begin(115200);
  Wire.begin(SDA_PIN, SCL_PIN);

  if (!LittleFS.begin(true)) {
    Serial.println("LittleFS mount failed — upload data folder first");
    updateOLED("FS ERROR", "00", "UPLOAD DATA");
    while (true) delay(1000);
  }

  u8g2.begin();
  updateOLED("PREPARING", "00", "INIT...");

  mpu.begin();
  Serial.println("MPU calibrating - keep still");
  mpu.calcGyroOffsets(true);
  tiltFiltered = mpu.getAngleX();

  if (!vl53.begin(0x29, &Wire)) {
    Serial.println("VL53L1X fail - ultra only");
  } else {
    vl53.startRanging();
  }

  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  digitalWrite(BUZZER_PIN, LOW);

  setupWiFiAndServers();

  triggerBuzzer(200);
  startDelayTimer = millis();
  Serial.println("Gym-Tracker WiFi ready");
}

void loop() {
  httpServer.handleClient();
  webSocket.loop();
  updateBuzzer();

  int currentDist = getFusedDistance();
  mpu.update();
  float tiltAngle = readTiltAngle();

  if (currentState == SYS_STARTING) {
    if (millis() - startDelayTimer >= 1000) {
      currentState = SYS_RUNNING;
      triggerBuzzer(500);
    }
    delay(LOOP_DELAY_MS);
    return;
  }

  updateRepCounter(currentDist);

  tiltWarning = (fabs(tiltAngle) > TILT_LIMIT_DEG);
  if (tiltWarning) {
    drawTiltScreen(tiltAngle, currentDist, totalReps);
    updateTiltBuzzer();
  } else {
    if (!buzzerActive) {
      digitalWrite(BUZZER_PIN, LOW);
    }
    drawNormalScreen(currentDist, totalReps);
  }

  sendTelemetry(currentDist, tiltAngle, totalReps);

  delay(LOOP_DELAY_MS);
}
