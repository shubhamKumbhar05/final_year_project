# 🤖 AI Chatbot Device Configuration - Quick Reference

## 🚀 Quick Start Commands

```
💬 Chat Examples:

1. Build a network: "Create a star topology with 5 PCs"
2. Change IP: "Change PC-1 IP to 192.168.1.10"  
3. Configure device: "Configure PC-1: IP 192.168.1.50, subnet 255.255.255.0"
4. Change type: "Change PC-1 type to server"
5. Rename: "Rename PC-1 to WebServer"
6. Add device: "Add 3 PCs"
7. Connect: "Connect PC-1 to Router"
```

---

## 📋 Command Categories

### 🏗️ TOPOLOGY GENERATION
| Command | Example | Notes |
|---------|---------|-------|
| Star | "Create star topology with 5 PCs" | Central hub design |
| Mesh | "Build mesh topology with 4 nodes" | All connected |
| Ring | "Design ring topology with 6 devices" | Circular chain |
| Bus | "Create bus topology with 4 PCs" | Linear chain |
| Tree | "Generate tree topology with 8 nodes" | Hierarchical |
| LAN | "Create a LAN layout" | Office template |

### 🌐 IP ADDRESS & SUBNET
| Command | Example | Notes |
|---------|---------|-------|
| IP | "Change PC-1 IP to 10.0.0.5" | Any valid IPv4 |
| Subnet | "Set subnet mask of PC-1 to 255.255.0.0" | Standard CIDR |
| Both | "Configure PC-1: IP 10.0.0.5, subnet 255.255.0.0" | Batch config |

### 🎛️ DEVICE STATUS
| Command | Example | Notes |
|---------|---------|-------|
| Active | "Set PC-1 status to active" | Device online |
| Inactive | "Mark Router offline" | Device down |
| Toggle | "Make PC-1 up" | Up/Down variants |

### 🔄 DEVICE TYPE
| Command | Example | Notes |
|---------|---------|-------|
| Change | "Change PC-1 type to server" | Any device type |
| Convert | "Convert PC-2 to router" | Same as change |
| Support | All 19 device types available | See device list |

### 🏷️ MAC ADDRESS
| Command | Example | Notes |
|---------|---------|-------|
| Set MAC | "Set MAC of PC-1 to AA:BB:CC:DD:EE:FF" | XX:XX format |
| Update | "Change PC-2 MAC to 00:11:22:33:44:55" | Case insensitive |
| Assign | "Assign MAC to PC-3: FF:FF:FF:FF:FF:FF" | Legacy pattern |

### 📝 RENAMING
| Command | Example | Notes |
|---------|---------|-------|
| Rename | "Rename PC-1 to WebServer" | Any name |
| Change | "Change Router-1 name to CoreRouter" | Case preserved |
| As | "Rename PC-2 as FileServer" | Alternative |

### ⚙️ BATCH CONFIG (NEW!)
| Command | Example | Notes |
|---------|---------|-------|
| Full | "Configure PC-1: IP ..., subnet ..., hostname ..." | All in one |
| Partial | "Configure PC-1: IP 10.0.0.5, hostname Server1" | Pick what you need |

### 🔗 CONNECTIONS
| Command | Example | Notes |
|---------|---------|-------|
| Connect | "Connect PC-1 to Router-1" | Create link |
| Fiber | "Connect Router-1 to Server with fiber" | Link type |
| Wireless | "Link AP to PC-1 using wireless" | Wireless option |
| Disconnect | "Disconnect PC-1 from Router" | Remove link |

### ➕➖ DEVICE MANAGEMENT
| Command | Example | Notes |
|---------|---------|-------|
| Add | "Add 3 PCs" | Count based |
| Add Type | "Add 2 servers" | Type based |
| Remove | "Remove PC-1" | By name |
| Remove Type | "Remove all printers" | By type |
| Count | "Delete 2 switches" | Count based |

---

## 📱 Device Types

**End Devices**: pc, laptop, server, printer, ip-phone, iot-device  
**Network**: router, switch, hub, access-point, firewall  
**Services**: dns-server, dhcp-server, web-server, ftp-server  
**WAN**: internet-cloud, isp-node, modem

---

## ✅ Valid Formats

| Type | Format | Example |
|------|--------|---------|
| IP | xxx.xxx.xxx.xxx | 192.168.1.1 |
| Subnet | CIDR standard | 255.255.255.0 |
| MAC | XX:XX:XX:XX:XX:XX | AA:BB:CC:DD:EE:FF |
| Device | [Name/Type]-[#] | PC-1, Router-2 |
| Name | Alphanumeric+hyphens | WebServer-1 |

---

## 🎯 Common Tasks

### Build Office Network
```bash
"Create a star topology with 5 PCs"
"Configure Router-1: IP 192.168.1.1, subnet 255.255.255.0"
"Configure PC-1: IP 192.168.1.10, hostname WebServer"
"Configure PC-2: IP 192.168.1.11, hostname FileServer"
```

### Modify Existing Network  
```bash
"Change PC-3 type to printer"
"Set PC-4 status to offline"
"Rename Server-1 to DatabaseServer"
"Set MAC of PC-5 to AA:BB:CC:DD:EE:FF"
```

### Build Resilient Network
```bash
"Create a mesh topology with 5 nodes"
"Configure PC-1: IP 10.0.0.1, subnet 255.255.255.0"
"Configure PC-2: IP 10.0.0.2, subnet 255.255.255.0"
"Connect all devices with fiber cable"
```

---

## 🐛 Troubleshooting Quick Tips

| Problem | Solution |
|---------|----------|
| Command not recognized | Check device name spelling |
| Invalid IP | Ensure xxx.xxx.xxx.xxx format |
| Subnet not accepted | Use standard CIDR only |
| Device type unknown | Use supported device types |
| Changes not visible | Click "OPEN LAB" to refresh |
| MAC invalid | Use XX:XX:XX:XX:XX:XX format |

---

## 💡 Pro Tips

✨ **Device aliases work**: Use device ID or custom name  
✨ **Batch config saves time**: Multiple settings in one command  
✨ **Case insensitive**: "PC-1", "pc-1", "Pc-1" all work  
✨ **Order matters**: Some commands tried before others  
✨ **Copy-paste friendly**: Commands work in chat exactly as written  
✨ **Natural language**: Use "to", "as", "of", "for" naturally  

---

## 📊 Statistics

| Metric | Value |
|--------|-------|
| Device Types Supported | 19 |
| Parsing Functions | 15+ |
| Command Categories | 10 |
| Batch Config Options | 4 |
| Topology Types | 6 |
| Subnet Masks Available | 24 |

---

## 🔗 Related Documentation

- [CHATBOT_DEVICE_CONFIGURATION.md](./CHATBOT_DEVICE_CONFIGURATION.md) - Full documentation
- [TEST_CHATBOT_COMMANDS.js](./TEST_CHATBOT_COMMANDS.js) - Test examples
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Technical details
- [REASSEMBLY_POSITIONING_FIX.md](./REASSEMBLY_POSITIONING_FIX.md) - Other fixes

---

## 🚀 Getting Started

1. **Open Chat**: Click 💬 button (bottom right)
2. **See Examples**: Bot lists available commands
3. **Try Simple**: Start with "Create a star topology"
4. **View Result**: Click "OPEN LAB" to see changes
5. **Configure**: Use "Configure PC-1: ..." for detailed setup
6. **Verify**: Check right panel for device properties

---

**Version**: 1.0 | **Status**: ✅ Ready | **Last Updated**: April 8, 2026
