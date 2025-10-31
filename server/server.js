// Node.js UDP Server to receive health data from ESP32
// Save as server.js and run with: node server.js

const dgram = require('dgram');
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const server = dgram.createSocket('udp4');

const UDP_PORT = 8888;
const HTTP_PORT = 3000;

// Store data in memory
let healthDataHistory = [];
let latestData = {};
let ecgDataBuffer = []; // Buffer for high-frequency ECG data
let deviceStatus = {};

// UDP Server Setup
server.on('listening', () => {
    const address = server.address();
    console.log(`UDP Server listening on ${address.address}:${address.port}`);
});

server.on('message', (message, remote) => {
    try {
        const data = JSON.parse(message.toString());
        
        // Update device status
        deviceStatus[data.deviceId] = {
            lastSeen: new Date(),
            remoteAddress: remote.address,
            remotePort: remote.port,
            packetNumber: data.packetNumber
        };
        
        // Handle different packet types
        if (data.packetType === 'data') {
            // Complete data packet
            data.serverTimestamp = new Date().toISOString();
            data.remoteInfo = { address: remote.address, port: remote.port };
            
            latestData = data;
            healthDataHistory.push(data);
            
            // Keep only last 1000 entries
            if (healthDataHistory.length > 1000) {
                healthDataHistory = healthDataHistory.slice(-1000);
            }
            
            console.log(`Data from ${data.deviceId}: T0=${data.temperatures?.t0}°C, ECG=${data.ecg?.value}, BPM=${data.heartRate?.currentBPM}`);
            saveToFile(data);
            
        } else if (data.packetType === 'ecg') {
            // High-frequency ECG data
            const ecgPoint = {
                timestamp: data.timestamp,
                value: data.ecgValue,
                contact: data.ecgContact,
                deviceId: data.deviceId
            };
            
            ecgDataBuffer.push(ecgPoint);
            
            // Keep only last 200 ECG points (10 seconds at 20Hz)
            if (ecgDataBuffer.length > 200) {
                ecgDataBuffer = ecgDataBuffer.slice(-200);
            }
            
        } else if (data.packetType === 'heartbeat') {
            // Keepalive packet
            console.log(`Heartbeat from ${data.deviceId}, uptime: ${Math.floor(data.uptime/1000)}s`);
        }
        
    } catch (error) {
        console.error('Error parsing UDP message:', error);
        console.log('Raw message:', message.toString());
    }
});

server.on('error', (err) => {
    console.error('UDP Server error:', err);
});

// Start UDP server
server.bind(UDP_PORT);

// Express HTTP Server for Dashboard
app.use(express.json());
app.use(express.static('public'));

// API endpoints
app.get('/api/health-data/latest', (req, res) => {
    if (Object.keys(latestData).length > 0) {
        res.json(latestData);
    } else {
        res.json({ message: 'No data available' });
    }
});

app.get('/api/health-data', (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const recentData = healthDataHistory.slice(-limit);
    res.json(recentData);
});

app.get('/api/ecg-data', (req, res) => {
    res.json(ecgDataBuffer);
});

app.get('/api/device-status', (req, res) => {
    res.json(deviceStatus);
});

// Real-time dashboard
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>UDP Health Monitor Dashboard</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { 
                font-family: Arial, sans-serif; 
                margin: 20px; 
                background-color: #f0f0f0;
            }
            .container { 
                max-width: 1200px; 
                margin: 0 auto; 
            }
            .sensor-card { 
                background: white; 
                border-radius: 8px; 
                padding: 20px; 
                margin: 10px 0; 
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .sensor-title { 
                color: #333; 
                border-bottom: 2px solid #007bff; 
                padding-bottom: 10px; 
            }
            .value { 
                font-size: 24px; 
                font-weight: bold; 
                color: #007bff; 
            }
            .timestamp { 
                color: #666; 
                font-size: 12px; 
            }
            .status { 
                padding: 5px 10px; 
                border-radius: 4px; 
                color: white; 
            }
            .good { background-color: #28a745; }
            .bad { background-color: #dc3545; }
            .warning { background-color: #ffc107; color: #000; }
            #ecgChart { 
                width: 100%; 
                height: 400px; 
                border: 2px solid #ddd; 
                background: #000; 
                border-radius: 8px;
            }
            .grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
            }
            .full-width {
                grid-column: 1 / -1;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Digital Twin Dashboard</h1>
            
            <div class="sensor-card">
                <h2 class="sensor-title">📡 Connection Status</h2>
                <div id="status">Waiting for data...</div>
                <div id="lastUpdate" class="timestamp"></div>
                <div id="packetInfo" class="timestamp"></div>
            </div>
            
            <div class="grid">
                <div class="sensor-card">
                    <h2 class="sensor-title">🌡️ Temperature Sensors</h2>
                    <div id="temperatures">No data</div>
                </div>
                
                <div class="sensor-card">
                    <h2 class="sensor-title">❤️ Heart Rate</h2>
                    <div id="heartRate">No data</div>
                </div>
            </div>
            
            <div class="sensor-card full-width">
                <h2 class="sensor-title">💓 ECG Monitor (Real-time) - Live Cardiac Signal</h2>
                <div id="ecgStatus" style="margin-bottom: 15px; font-size: 18px;">No data</div>
                <div style="background: #f8f9fa; padding: 10px; border-radius: 5px; margin-bottom: 10px;">
                    <small><strong>Chart Info:</strong> Green line = ECG signal | Dashed line = Zero reference | Grid = Timing marks (25ms per small square)</small>
                </div>
                <canvas id="ecgChart"></canvas>
            </div>
            
            <div class="sensor-card">
                <h2 class="sensor-title">📊 Raw Data</h2>
                <pre id="data">No data received yet</pre>
            </div>
        </div>

        <script>
            let ecgChart;
            let ecgData = [];
            
            function initECGChart() {
                const canvas = document.getElementById('ecgChart');
                ecgChart = canvas.getContext('2d');
                canvas.width = canvas.offsetWidth;
                canvas.height = 400; // Increased height
            }
            
            function drawECGChart(data) {
                if (!ecgChart) return;
                
                const canvas = ecgChart.canvas;
                const width = canvas.width;
                const height = canvas.height;
                
                // Clear canvas
                ecgChart.fillStyle = '#000';
                ecgChart.fillRect(0, 0, width, height);
                
                // Draw grid
                ecgChart.strokeStyle = '#333';
                ecgChart.lineWidth = 1;
                // Vertical grid lines (time)
                for (let i = 0; i < width; i += 25) {
                    ecgChart.beginPath();
                    ecgChart.moveTo(i, 0);
                    ecgChart.lineTo(i, height);
                    ecgChart.stroke();
                }
                // Horizontal grid lines (voltage)
                for (let i = 0; i < height; i += 25) {
                    ecgChart.beginPath();
                    ecgChart.moveTo(0, i);
                    ecgChart.lineTo(width, i);
                    ecgChart.stroke();
                }
                
                // Major grid lines (every 5th line)
                ecgChart.strokeStyle = '#555';
                ecgChart.lineWidth = 2;
                for (let i = 0; i < width; i += 125) {
                    ecgChart.beginPath();
                    ecgChart.moveTo(i, 0);
                    ecgChart.lineTo(i, height);
                    ecgChart.stroke();
                }
                for (let i = 0; i < height; i += 125) {
                    ecgChart.beginPath();
                    ecgChart.moveTo(0, i);
                    ecgChart.lineTo(width, i);
                    ecgChart.stroke();
                }
                
                // Draw ECG waveform
                if (data.length > 1) {
                    ecgChart.strokeStyle = '#00ff00';
                    ecgChart.lineWidth = 3; // Thicker line for better visibility
                    ecgChart.beginPath();
                    
                    const maxPoints = Math.min(data.length, Math.floor(width / 3));
                    const step = width / maxPoints;
                    
                    for (let i = 0; i < maxPoints; i++) {
                        const point = data[data.length - maxPoints + i];
                        const x = i * step;
                        // Better scaling for larger canvas
                        const normalizedValue = (point.value - 2048) / 2048; // Center around 2048
                        const y = (height / 2) - (normalizedValue * height * 0.4); // Use 40% of height for signal
                        
                        if (i === 0) {
                            ecgChart.moveTo(x, y);
                        } else {
                            ecgChart.lineTo(x, y);
                        }
                    }
                    ecgChart.stroke();
                    
                    // Add center line for reference
                    ecgChart.strokeStyle = '#666';
                    ecgChart.lineWidth = 1;
                    ecgChart.setLineDash([5, 5]);
                    ecgChart.beginPath();
                    ecgChart.moveTo(0, height / 2);
                    ecgChart.lineTo(width, height / 2);
                    ecgChart.stroke();
                    ecgChart.setLineDash([]);
                }
            }
            
            function fetchLatestData() {
                fetch('/api/health-data/latest')
                    .then(response => response.json())
                    .then(data => {
                        if (data.message) {
                            document.getElementById('status').innerHTML = '<span class="status bad">No Data Available</span>';
                            return;
                        }
                        
                        // Update status
                        const timeDiff = new Date() - new Date(data.serverTimestamp);
                        const statusClass = timeDiff < 5000 ? 'good' : 'warning';
                        const statusText = timeDiff < 5000 ? 'Connected' : 'Delayed';
                        
                        document.getElementById('status').innerHTML = '<span class="status ' + statusClass + '">' + statusText + '</span>';
                        document.getElementById('lastUpdate').textContent = 'Last update: ' + new Date(data.serverTimestamp).toLocaleString();
                        document.getElementById('packetInfo').textContent = 'Packet #' + (data.packetNumber || 'N/A') + ' from ' + (data.remoteInfo?.address || 'unknown');
                        
                        // Update temperatures
                        const temps = data.temperatures || {};
                        document.getElementById('temperatures').innerHTML = 
                            '<div>Sensor 0: <span class="value">' + (temps.t0?.toFixed(2) || 'N/A') + '°C</span></div>' +
                            '<div>Sensor 1: <span class="value">' + (temps.t1?.toFixed(2) || 'N/A') + '°C</span></div>' +
                            '<div>Sensor 2: <span class="value">' + (temps.t2?.toFixed(2) || 'N/A') + '°C</span></div>';
                        
                        // Update heart rate
                        const hr = data.heartRate || {};
                        document.getElementById('heartRate').innerHTML = 
                            '<div>Current BPM: <span class="value">' + (hr.currentBPM?.toFixed(1) || 0) + '</span></div>' +
                            '<div>Average BPM: <span class="value">' + (hr.avgBPM || 0) + '</span></div>';
                        
                        // Update raw data
                        document.getElementById('data').textContent = JSON.stringify(data, null, 2);
                    })
                    .catch(error => {
                        console.error('Error fetching data:', error);
                        document.getElementById('status').innerHTML = '<span class="status bad">Connection Error</span>';
                    });
            }
            
            function fetchECGData() {
                fetch('/api/ecg-data')
                    .then(response => response.json())
                    .then(data => {
                        ecgData = data;
                        
                        if (data.length > 0) {
                            const latest = data[data.length - 1];
                            const ecgStatus = latest.contact ? 'good' : 'bad';
                            const ecgStatusText = latest.contact ? 'Good Contact' : 'Poor Contact';
                            document.getElementById('ecgStatus').innerHTML = 
                                'Status: <span class="status ' + ecgStatus + '">' + ecgStatusText + '</span> | ' +
                                'Latest Value: <span class="value">' + (latest.value || 0) + '</span>';
                        }
                        
                        drawECGChart(data);
                    })
                    .catch(error => {
                        console.error('Error fetching ECG data:', error);
                    });
            }
            
            // Initialize
            window.onload = function() {
                initECGChart();
                fetchLatestData();
                fetchECGData();
                
                // Fetch data regularly
                setInterval(fetchLatestData, 1000);
                setInterval(fetchECGData, 100); // Update ECG more frequently
            };
            
            // Handle window resize
            window.addEventListener('resize', function() {
                const canvas = document.getElementById('ecgChart');
                canvas.width = canvas.offsetWidth;
                canvas.height = 400; // Keep consistent height
                drawECGChart(ecgData);
            });
        </script>
    </body>
    </html>
    `);
});

// Function to save data to file
function saveToFile(data) {
    const logDir = path.join(__dirname, 'logs');
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir);
    }
    
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const logFile = path.join(logDir, `health_data_udp_${date}.json`);
    
    // Append data to daily log file
    const logEntry = JSON.stringify(data) + '\n';
    fs.appendFileSync(logFile, logEntry);
}

// Start HTTP server
app.listen(HTTP_PORT, () => {
    console.log(`Health Monitor Dashboard running on http://localhost:${HTTP_PORT}`);
    console.log('Data will be saved to ./logs/ directory');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down servers...');
    server.close();
    process.exit(0);
});