## Hardware

### Multi Sensor Health Monitor – Wiring
This project was developed for EngEx 2025, the Engineering Exhibition organized by the Faculty of Engineering, University of Peradeniya, in celebration of its Diamond Jubilee.

#### Overview
A wearable multi-sensor device built using an ESP32 microcontroller that measures:

- ECG signal using AD8232
- Heart rate and SpO₂ using MAX30105
- Body temperature using three DS18B20 sensors

All sensor data is transmitted via Wi-Fi UDP to a server for real-time monitoring and visualization.

#### Hardware Components

| Component           | Function                | Connection Notes                |
|--------------------|-------------------------|---------------------------------|
| ESP32              | Main controller         | 3.3 V logic                     |
| AD8232 ECG Module  | ECG acquisition         | Analog output to GPIO 34        |
| MAX30105           | Heart rate / SpO₂       | I²C interface (SDA 21, SCL 22)  |
| DS18B20 ×3         | Temperature sensors     | One-Wire bus on GPIO 4          |
| Buck Converter     | 7.4 V → 3.7–5 V         | Powers ESP32 safely             |

#### Wiring for each input IoT device

##### AD8232 ECG Sensor — Heart ECG

| AD8232 Pin | ESP32 Pin | Description           |
|------------|-----------|-----------------------|
| LO+        | GPIO 25   | Lead-off detect (+)   |
| LO-        | GPIO 26   | Lead-off detect (–)   |
| OUT        | GPIO 34   | Analog ECG signal     |
| 3.3V       | 3.3V      | Power                 |
| GND        | GND       | Common ground         |

##### DS18B20 Sensors (x3) — Temperature sensors

| DS18B20 Pin | ESP32 Pin | Description   |
|-------------|-----------|---------------|
| VDD         | 3.3V      | Power         |
| DQ          | GPIO 4    | One-Wire bus  |
| GND         | GND       | Common ground |

Note: Add a 4.7 kΩ pull-up resistor between DQ and 3.3 V. All three DS18B20 sensors share the same data line.

##### MAX30105 Heart Rate Sensor — Beats per minute of the heart

| MAX30105 Pin | ESP32 Pin | Description |
|--------------|-----------|-------------|
| VIN          | 3.3V      | Power       |
| GND          | GND       | Ground      |
| SDA          | GPIO 21   | I²C data    |
| SCL          | GPIO 22   | I²C clock   |

#### Power Setup

- Power Source: 7.4 V Li-Po battery  
- Buck Converter output: 3.7–5.0 V  
- Buck OUT+ → ESP32 VIN (or 5V pin)  
- Buck OUT– → ESP32 GND  
- All sensors share the same ground as the ESP32

---

## Firmware Configuration (Wi-Fi SSID, Password, and Server IP)

Edit the following constants in your Arduino sketch:

```cpp
// WiFi Configuration
const char* ssid = "EngEx_Router";        // <— replace with your router SSID
const char* password = "StrongPass123";   // <— replace with your router password

// UDP target (receiver server)
const char* udpAddress = "192.168.1.100"; // <— replace with the server machine's IP
const int udpPort = 8888;
