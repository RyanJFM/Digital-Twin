// Multi-Sensor Health Monitor with WiFi UDP - ESP32
// Sends DS18B20 Temperature + AD8232 ECG + MAX30105 Heart Rate data via UDP

#include <WiFi.h>
#include <WiFiUdp.h>
#include <ArduinoJson.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Wire.h>
#include "MAX30105.h"
#include "heartRate.h"  

// WiFi Configuration // ADD YOUR DETAILS HERE
const char* ssid = "Your_SSID_HERE";
const char* password = "NETWORK_PASSWORD";

// UDP Configuration
WiFiUDP udp;
const char* udpAddress = "SERVER_IP";  // Change to your server IP
const int udpPort = 8888;
const char* deviceId = "ESP32_HEALTH_001";

// DS18B20 Temperature Sensors
#define ONE_WIRE_BUS 4
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);
DeviceAddress sensor1, sensor2, sensor3;

// AD8232 ECG Sensor
const int ecgPin = 34;
const int loPlus = 25;
const int loMinus = 26;

// MAX30105 Heart Rate Sensor
MAX30105 particleSensor;
const byte RATE_SIZE = 4; 
byte rates[RATE_SIZE];    
byte rateSpot = 0;
long lastBeat = 0;        
float beatsPerMinute = 0;
int beatAvg = 0;

// Timing variables
unsigned long lastTempRead = 0;
unsigned long lastEcgRead = 0;
unsigned long lastHrRead = 0;
unsigned long lastDataSent = 0;
unsigned long lastHeartbeat = 0;
const unsigned long tempInterval = 1000;
const unsigned long ecgInterval = 50;     // 50ms = 20Hz for ECG
const unsigned long hrInterval = 10;
const unsigned long sendInterval = 75;   // Send data every 100ms for real-time
const unsigned long heartbeatInterval = 1000; // Send heartbeat every 5 seconds

// Data storage
struct HealthData {
  float temp0, temp1, temp2;
  int ecgValue;
  bool ecgContactGood;
  float currentBPM;
  int avgBPM;
  unsigned long timestamp;
};

HealthData currentData;
int packetCounter = 0;

void printAddress(DeviceAddress deviceAddress) {
  for (uint8_t i = 0; i < 8; i++) {
    if (deviceAddress[i] < 16) Serial.print("0");
    Serial.print(deviceAddress[i], HEX);
  }
}

void setupWiFi() {
  Serial.println("Connecting to WiFi...");
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("WiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    
    // Start UDP
    udp.begin(udpPort);
    Serial.printf("UDP client started on port %d\n", udpPort);
  } else {
    Serial.println();
    Serial.println("WiFi connection failed!");
  }
}

void setupTemperatureSensors() {
  Serial.println("Initializing DS18B20 temperature sensors...");
  sensors.begin();
  
  int count = sensors.getDeviceCount();
  Serial.print("Found ");
  Serial.print(count);
  Serial.println(" temperature device(s).");
  
  if (count >= 1) sensors.getAddress(sensor1, 0);
  if (count >= 2) sensors.getAddress(sensor2, 1);
  if (count >= 3) sensors.getAddress(sensor3, 2);
  
  sensors.setResolution(sensor1, 12);
  if (count >= 2) sensors.setResolution(sensor2, 12);
  if (count >= 3) sensors.setResolution(sensor3, 12);
}

void setupEcgSensor() {
  Serial.println("Initializing AD8232 ECG sensor...");
  pinMode(loPlus, INPUT);
  pinMode(loMinus, INPUT);
}

void setupHeartRateSensor() {
  Serial.println("Initializing MAX30105 heart rate sensor...");
  Wire.begin();

  if (!particleSensor.begin(Wire, I2C_SPEED_STANDARD)) {
    Serial.println("MAX30105 was not found. Check wiring/power.");
    return;
  }

  particleSensor.setup(); 
  particleSensor.setPulseAmplitudeRed(0x0A);
  particleSensor.setPulseAmplitudeGreen(0);
}

void readTemperatureSensors() {
  sensors.requestTemperatures();
  
  currentData.temp0 = sensors.getTempC(sensor1);
  currentData.temp1 = sensors.getTempC(sensor2);
  currentData.temp2 = sensors.getTempC(sensor3);
  
  Serial.printf("TEMP | T0: %.2f°C | T1: %.2f°C | T2: %.2f°C\n", 
                currentData.temp0, currentData.temp1, currentData.temp2);
}

void readEcgSensor() {
  if ((digitalRead(loPlus) == 1) || (digitalRead(loMinus) == 1)) {
    currentData.ecgContactGood = false;
    currentData.ecgValue = 0;
  } else {
    currentData.ecgContactGood = true;
    currentData.ecgValue = analogRead(ecgPin);
  }
}

void readHeartRateSensor() {
  long irValue = particleSensor.getIR();

  if (checkForBeat(irValue)) {
    long delta = millis() - lastBeat;
    lastBeat = millis();

    beatsPerMinute = 60 / (delta / 1000.0);

    if (beatsPerMinute < 255 && beatsPerMinute > 20) {
      rates[rateSpot++] = (byte)beatsPerMinute;
      rateSpot %= RATE_SIZE;

      beatAvg = 0;
      for (byte x = 0; x < RATE_SIZE; x++)
        beatAvg += rates[x];
      beatAvg /= RATE_SIZE;
    }

    currentData.currentBPM = beatsPerMinute;
    currentData.avgBPM = beatAvg;
    
    Serial.printf("HR | BPM: %.1f | Avg BPM: %d\n", beatsPerMinute, beatAvg);
  }
}

void sendDataPacket(const char* packetType) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected, skipping data send");
    return;
  }

  // Create JSON payload
  DynamicJsonDocument doc(512);
  doc["deviceId"] = deviceId;
  doc["packetType"] = packetType;
  doc["packetNumber"] = ++packetCounter;
  doc["timestamp"] = millis();
  
  if (strcmp(packetType, "data") == 0) {
    // Full data packet
    JsonObject temperatures = doc.createNestedObject("temperatures");
    temperatures["t0"] = currentData.temp0;
    temperatures["t1"] = currentData.temp1;
    temperatures["t2"] = currentData.temp2;
    
    JsonObject ecg = doc.createNestedObject("ecg");
    ecg["value"] = currentData.ecgValue;
    ecg["contactGood"] = currentData.ecgContactGood;
    
    JsonObject heartRate = doc.createNestedObject("heartRate");
    heartRate["currentBPM"] = currentData.currentBPM;
    heartRate["avgBPM"] = currentData.avgBPM;
  } else if (strcmp(packetType, "ecg") == 0) {
    // High-frequency ECG data packet
    doc["ecgValue"] = currentData.ecgValue;
    doc["ecgContact"] = currentData.ecgContactGood;
  } else if (strcmp(packetType, "heartbeat") == 0) {
    // Keepalive packet
    doc["status"] = "alive";
    doc["uptime"] = millis();
  }
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  // Send UDP packet
  udp.beginPacket(udpAddress, udpPort);
  udp.print(jsonString);
  udp.endPacket();
  
  if (strcmp(packetType, "data") == 0) {
    Serial.printf("UDP Data sent: %s\n", jsonString.c_str());
  }
}

void setup() {
  Serial.begin(115200);
  Serial.println("=== WiFi UDP Health Monitor Starting ===");
  
  // Initialize WiFi first
  setupWiFi();
  
  // Initialize all sensors
  setupTemperatureSensors();
  setupEcgSensor();
  setupHeartRateSensor();
  
  // Initialize data structure
  currentData = {0, 0, 0, 0, false, 0, 0, 0};
  
  Serial.println("=== System Ready ===");
}

void loop() {
  unsigned long currentTime = millis();
  
  // Read temperature sensors every 1 second
  if (currentTime - lastTempRead >= tempInterval) {
    readTemperatureSensors();
    lastTempRead = currentTime;
  }
  
  // Read ECG sensor every 50ms (20Hz)
  if (currentTime - lastEcgRead >= ecgInterval) {
    readEcgSensor();
    
    // Send high-frequency ECG data for real-time monitoring
    sendDataPacket("ecg");
    
    lastEcgRead = currentTime;
  }
  
  // Read heart rate sensor every 10ms
  if (currentTime - lastHrRead >= hrInterval) {
    readHeartRateSensor();
    lastHrRead = currentTime;
  }
  
  // Send complete data packet every 100ms
  if (currentTime - lastDataSent >= sendInterval) {
    sendDataPacket("data");
    lastDataSent = currentTime;
  }
  
  // Send heartbeat every 5 seconds
  if (currentTime - lastHeartbeat >= heartbeatInterval) {
    sendDataPacket("heartbeat");
    lastHeartbeat = currentTime;
  }
  
  // Check WiFi connection periodically
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected, attempting reconnection...");
    setupWiFi();
  }
}
