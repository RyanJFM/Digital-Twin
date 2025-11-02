# Digital Twin Health Monitor – EngEx 2025

**Bringing Digital Twin Technology to Healthcare**

Digital Twins are already revolutionizing the civil and industrial world —  
but what if we could bring that same concept to **pharma and healthcare**?

That was the question our team explored at **EngEx 2025**, where we built a **3D Humanoid Digital Twin** that mirrors a person’s motion and real-time vital signs.

This repository contains the complete technical implementation of that system — including the **ESP32 firmware**, **Node.js server**, and **Unity visualization** setup.

---

## Overview

The project demonstrates how Digital Twin technology can be extended to the **medical and biomedical** domains to enable **real-time patient monitoring, simulation, and predictive health analysis** — without the risks of physical testing.

We built an IoT-driven system that captures a person’s physiological data using sensors, streams the data over Wi-Fi, and visualizes it in Unity as a live, animated humanoid.

---

## System Architecture

All devices are connected through a **single local router** for synchronized communication:
- **ESP32** transmits JSON-formatted sensor data via UDP.
- **Node.js server** receives, logs, and provides a real-time HTTP dashboard.
- **Unity** fetches and visualizes the incoming data in 3D.

---

## Hardware and Tools

| Component | Purpose |
|------------|----------|
| **ESP32** | Microcontroller handling sensors and UDP transmission |
| **AD8232** | ECG data acquisition |
| **MAX30105** | Heart Rate and SpO₂ sensing |
| **DS18B20 ×3** | Temperature sensing |
| **NVIDIA Quadro P400 / AMD FirePro W9100** | Unity rendering |
| **Local Wi-Fi Router** | Synchronizes ESP32, Server, and Unity workstation |
| **Li-Po 7.4V Battery** | Power source, stepped down to 3.7V |

---

## Folder Overview


Each folder includes its own README for setup and usage details.

---

## How It Works

### 1. Firmware (ESP32)
- Located in the `/firmware` folder.  
- Collects ECG, heart rate, and temperature data from the connected sensors.  
- Formats readings into JSON packets and sends them to the local Node.js server via UDP.  
- Configure Wi-Fi credentials and server IP before flashing.

### 2. Server (Node.js)
- Located in the `/server` folder.  
- Receives UDP packets from ESP32, displays data on a live dashboard, and provides REST API endpoints for external applications.  
- Built using Express.js and UDP sockets.  
- Run locally with:
  ```bash
  npm install
  node server.js

### 3. Unity Visualization (twinMesh)
- Located in the /twinMesh folder.
- Handles 3D visualization using a humanoid mesh rigged with proper joints.
- The Unity scene receives live UDP data and updates the model in real time.
- If available, the Kinect Unity SDK wrapper can be used for live body motion capture.
- Scripts in this folder control animation mapping, vitals display, and synchronization.

### 4. Project Workflow
# 1. Start the Node.js server
```
npm install
node server.js
```
# 2. Upload the firmware to your ESP32 and ensure it connects to the same Wi-Fi network.
# 3. Launch the Unity scene with the scripts from /twinMesh.
# 4. Observe live streaming of sensor data and humanoid animation in real time.

if you have any concerns on twinMesh/ please email me
ryanjffernando@gmail.com
