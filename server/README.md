# UDP Health Monitor Server

This project runs a simple Node.js server that receives sensor data from an ESP32 over UDP and shows it on a web dashboard.
---

## 1. Install Node.js

Download and install **Node.js LTS** from  
https://nodejs.org/

Check installation:
```bash
node -v
npm -v
```
## 2. Set up the project

Open a terminal inside the server folder and run:
```
npm init -y
npm install express
```
This creates a package.json file and installs Express (used in server.js).

## 3. Run the server

Start the dashboard with:
```
node server.js
```
If you added a start script in package.json, you can also use:
```
npm start
```
## 4. Connect the ESP32
Make sure the ESP32 and this computer are on the same Wi-Fi network.
Edit these lines in your ESP32 code:

```
const char* ssid = "Your_WiFi_Name";
const char* password = "Your_WiFi_Password";
const char* udpAddress = "Your_Computer_IP"; // Example: 192.168.1.100
const int udpPort = 8888;
```
