# Multi Sensor Health Monitor - Wiring 

This project was developed for EngEx 2025, the Engineering Exhibition organized by the Faculty of Engineering, University of Peradeniya, in celebration of its Diamond Jubilee.

It demonstrates the concept of a Digital Twin by streaming real-time physiological data from multiple biomedical sensors to a remote web server and visualizing them in Unity.

---

## Overview

A wearable multi-sensor device built using an ESP32 microcontroller that measures:

- ECG signal using AD8232  
- Heart rate and SpO₂ using MAX30105  
- Body temperature using three DS18B20 sensors  

All sensor data is transmitted via Wi-Fi UDP to a server for real-time monitoring and visualization.

---

## Hardware Components

| Component | Function | Connection Notes |
|------------|-----------|------------------|
| ESP32 | Main controller | 3.3 V logic |
| AD8232 ECG Module | ECG acquisition | Analog output to GPIO 34 |
| MAX30105 | Heart rate and SpO₂ sensor | I2C interface (SDA 21, SCL 22) |
| DS18B20 ×3 | Temperature sensors | One-Wire bus on GPIO 4 |
| Buck Converter | Steps down 7.4 V to 3.7–5 V | Powers ESP32 safely |

---

## Wiring Summary

### AD8232 ECG Sensor
| AD8232 Pin | ESP32 Pin | Description |
|-------------|------------|-------------|
| LO+ | GPIO 25 | Lead-off detect (+) |
| LO- | GPIO 26 | Lead-off detect (–) |
| OUT | GPIO 34 | Analog ECG signal |
| 3.3V | 3.3V | Power |
| GND | GND | Common ground |

### DS18B20 Sensors (x3)
| DS18B20 Pin | ESP32 Pin | Description |
|--------------|------------|-------------|
| VDD | 3.3V | Power |
| DQ | GPIO 4 | One-Wire bus |
| GND | GND | Common ground |

Note: Add a 4.7 kΩ pull-up resistor between DQ and 3.3 V.  
All three DS18B20 sensors share the same data line.

### MAX30105 Heart Rate Sensor
| MAX30105 Pin | ESP32 Pin | Description |
|---------------|------------|-------------|
| VIN | 3.3V | Power |
| GND | GND | Common ground |
| SDA | GPIO 21 | I2C data |
| SCL | GPIO 22 | I2C clock |

---

## Power Setup

- Power Source: 7.4 V Li-Po battery  
- Buck Converter output: 3.7–5.0 V  
- Buck OUT+ → ESP32 VIN (or 5V pin)  
- Buck OUT– → ESP32 GND  
- All sensors share the same ground as the ESP32

---

## Software Overview

### Main Functions
- Reads temperature, ECG, and heart rate in defined intervals  
- Formats data into JSON using ArduinoJson  
- Sends packets via UDP to the specified server IP  
- Includes a periodic heartbeat message for connection status

### Data Packet Example
```json
{
  "deviceId": "ESP32_HEALTH_001",
  "packetType": "data",
  "temperatures": {"t0": 36.5, "t1": 36.7, "t2": 36.6},
  "ecg": {"value": 512, "contactGood": true},
  "heartRate": {"currentBPM": 78.3, "avgBPM": 76}
}
