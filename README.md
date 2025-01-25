# Raspberry Pi Monitor - Raycast Extension

A Raycast extension that provides real-time monitoring of multiple Raspberry Pi devices directly from your macOS menu bar. Keep track of your Raspberry Pi fleet's status with ease!

![Raycast Extension](assets/preview.png)

## Features

- 🔍 Real-time monitoring of multiple Raspberry Pi devices
- 🚦 Visual status indicators (🟢 online, 🔴 offline)
- ⏰ Automatic status updates every 100 seconds
- 📋 Quick IP address copying with one click
- 🔧 Detailed troubleshooting information when devices are offline
- 🖥️ Support for custom device names and IPs

## Prerequisites

- macOS
- [Raycast](https://raycast.com/) installed
- Network access to your Raspberry Pi devices
- Node.js 16 or later
- npm (Node Package Manager)

## Installation

1. Clone this repository:
```bash
git clone https://github.com/yourusername/raspberry-pi-monitor.git
cd raspberry-pi-monitor
```

2. Install dependencies:
```bash
npm install
```

3. Development mode:
```bash
npm run dev
```

## Configuration

Edit the `RASPBERRY_PIS` array in `src/index.tsx` to add or remove devices:

```typescript
const RASPBERRY_PIS = [
  { ip: "192.168.0.224", name: "Master Pi (Pi 5)" },
  { ip: "192.168.0.203", name: "Worker Pi (Pi 5)" },
  { ip: "192.168.0.155", name: "Worker Pi (Pi 2b)" },
];
```

## Features Explained

### Status Monitoring
- The extension pings each configured Raspberry Pi every 100 seconds
- Status is displayed using color-coded indicators:
  - 🟢 Green: Device is online and responding
  - 🔴 Red: Device is offline or not responding

### Quick Actions
- Click on any IP address to copy it to your clipboard
- View detailed status information for each device
- Access troubleshooting tips when a device is offline

### Error Handling
The extension provides detailed error messages for common issues:
- Network connectivity problems
- Incorrect IP addresses
- Device power status
- Network configuration issues

## Development

1. Make your changes in the `src` directory
2. Test using:
```bash
npm run dev
```

3. Build the extension:
```bash
npm run build
```

4. Lint your code:
```bash
npm run lint
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

If you encounter any issues or have questions, please file an issue on the GitHub repository.
 
