# AI Chatbot Device Configuration & Topology Editing Guide

## Overview
The AI chatbot in D-NetWiz-3D now supports **comprehensive device configuration and topology editing** through natural language commands. Users can build networks from scratch, modify existing topologies, and configure individual device properties.

## Features Implemented ✅

### 1. **Topology Generation** (Existing + Enhanced)
Generate complete network topologies with a single command:
```
"Create a star topology with 5 PCs"
"Build a mesh network with 4 nodes"
"Generate a tree topology with 6 devices"
"Create a LAN layout"
"Design a ring topology with 8 nodes"
"Build a bus topology with 4 PCs"
```

### 2. **Device Configuration Commands** (NEW)

#### IP Address Configuration
```
"Change PC-1 IP to 10.0.0.5"
"Set IP address of Router-1 to 192.168.1.1"
"Update PC-2 IP to 172.16.0.100"
```

#### Subnet Mask Configuration
```
"Set subnet mask of PC-1 to 255.255.0.0"
"Change Router-1 subnet to 255.255.254.0"
"Update PC-3 subnet mask to 255.255.255.128"
```

#### Device Status Management
```
"Set PC-1 status to active"
"Make Router offline"
"Mark Server-1 as inactive"
"Set all PCs to online"
```

#### Device Type Changes
```
"Change PC-1 type to server"
"Convert PC-2 to router"
"Change Laptop-1 to printer"
"Convert Router to switch"
```

#### MAC Address Configuration
```
"Set MAC of PC-1 to AA:BB:CC:DD:EE:FF"
"Change PC-2 MAC address to 00:11:22:33:44:55"
"Update Router-1 MAC to FF:FF:FF:FF:FF:FF"
```

#### Device Renaming
```
"Rename PC-1 to WebServer"
"Change Router-1 name to CoreRouter"
"Rename Server-1 to DatabaseServer"
```

#### Batch Configuration (NEW)
Configure multiple properties at once:
```
"Configure PC-1: IP 192.168.1.50, subnet 255.255.255.0, hostname WebServer1"
"Setup Router-1: IP 10.0.0.1, subnet 255.0.0.0, hostname MainRouter"
"Configure Server-1: IP 10.0.0.100, subnet 255.255.255.0, hostname FileServer"
```

### 3. **Connection Management**

#### Create Links
```
"Connect PC-1 to Router-1"
"Connect Router-1 to Server-1 with fiber cable"
"Link PC-2 to Switch-1 using wireless"
```

#### Remove Links
```
"Disconnect PC-1 from Router-1"
"Remove link between Router and Server"
"Disconnect PC-2 and Switch-1"
```

### 4. **Device Management**

#### Add Devices
```
"Add 3 PCs to the topology"
"Add 2 servers to the network"
"Insert 5 workstations"
```

#### Remove Devices
```
"Remove PC-1"
"Delete Router-2"
"Remove all printers"
"Delete 2 PCs from the network"
```

## How It Works

### Command Processing Pipeline
1. User types a command in the chat
2. `generateTopologyCommandFromPrompt()` parses the command
3. Command is dispatched as a custom event
4. `LabBuilder3D` component processes the command
5. Network visualization updates in real-time

### Supported Natural Language Patterns
- Device names: "PC-1", "Router", "Server-1", "Switch-2", etc.
- IP addresses: "192.168.1.1", "10.0.0.5", "172.16.0.10"
- Subnet masks: "255.255.255.0", "255.255.0.0", "255.0.0.0"
- MAC addresses: "AA:BB:CC:DD:EE:FF"
- Device types: "pc", "server", "router", "switch", "printer", "ip-phone", "iot-device", "firewall", etc.

## Technical Implementation

### Files Modified

#### 1. **topologyGenerator.js**
- Added `parseSubnetMaskCommand()` - Handle subnet mask updates
- Added `parseStatusCommand()` - Handle device status changes
- Added `parseDeviceTypeChangeCommand()` - Handle device type conversion
- Added `parseMacAddressCommand()` - Handle MAC address updates
- Added `parseBatchConfigCommand()` - Handle multiple property updates in one command
- Updated `generateTopologyCommandFromPrompt()` - Register all parsing functions

#### 2. **LabBuilder3D.jsx**
- Added 'change-type' operation handler in `applyModifyOperations()`
- Updates device type, color, and height according to component library
- Maintains device position while changing type

#### 3. **ConvaiChat.jsx**
- Enhanced initial bot message with examples of all capabilities
- Added emojis and clear formatting for better user guidance
- Provides quick reference for available commands

### Operation Types Supported
- `create`: Build new topology from scratch
- `add`: Add devices to existing topology
- `remove`: Remove specific named device
- `remove-type`: Remove all devices of a type
- `connect`: Create link between two devices
- `disconnect`: Remove link between two devices
- `rename`: Change device hostname/name
- `change-type`: Convert device to different type
- `set-config`: Update device configuration (IP, subnet, MAC, status)

## Usage Examples

### Building a Complete Network
```
User: "Create a star topology with 5 PCs"
Bot: "Generated star topology with 6 nodes and 5 links. Open LAB to view updates."

User: "Change PC-1 IP to 192.168.1.10"
Bot: "Updating IP of PC-1 to 192.168.1.10."

User: "Rename PC-1 to WebServer"
Bot: "Renaming PC-1 to WebServer."

User: "Configure Router-1: IP 192.168.1.1, subnet 255.255.255.0"
Bot: "Configuring Router-1 with 2 setting(s)."
```

### Modifying Existing Topology
```
User: "Set PC-2 status to offline"
Bot: "Setting PC-2 status to inactive."

User: "Convert PC-3 type to printer"
Bot: "Changing PC-3 type to printer."

User: "Change PC-4 MAC to AA:BB:CC:DD:EE:FF"
Bot: "Updating MAC address of PC-4 to AA:BB:CC:DD:EE:FF."
```

### Advanced Configuration
```
User: "Configure PC-1: IP 10.0.0.50, subnet 255.255.254.0, hostname DataCollector"
Bot: "Configuring PC-1 with 3 setting(s)."
```

## Limitations & Notes

1. **Device Alias Resolution**: Devices can be referenced by:
   - Exact ID (e.g., "PC-1")
   - Exact name (case-insensitive)
   - Device type that matches (if unambiguous)

2. **Valid Device Types**:
   - End Devices: pc, laptop, server, printer, ip-phone, iot-device
   - Network Devices: router, switch, hub, access-point, firewall
   - Service Devices: dns-server, dhcp-server, web-server, ftp-server
   - WAN: internet-cloud, isp-node, modem

3. **Valid Subnet Masks**: Only standard CIDR-based subnet masks are accepted
   - Examples: 255.255.255.0, 255.255.0.0, 255.0.0.0, 255.255.255.128, etc.

4. **MAC Address Format**: Must be in standard format (XX:XX:XX:XX:XX:XX)
   - Example: AA:BB:CC:DD:EE:FF

## Troubleshooting

### Command Not Recognized
- Check device names match existing devices
- Verify IP address format (must be 4 octets 0-255)
- Ensure subnet mask is a valid CIDR mask

### Device Configuration Not Applied
- Make sure you're in the LAB view
- Check that the device name is spelled correctly
- Try using the device ID instead of name

### Build Issues
- Run `npm run build` to verify syntax
- Check browser console for error messages
- Ensure all files were saved properly

## Future Enhancements

Potential features to add:
- VLAN configuration via chatbot
- Port configuration commands
- Interface speed/bandwidth settings
- Protocol configuration (TCP/UDP ports)
- Device group operations
- Network simulation via voice commands
- Visual confirmation of changes
- Undo/Redo capability for chatbot commands
- Voice input integration with Convai

## Support

For issues or feature requests, check:
1. Browser console for JavaScript errors
2. Build output for syntax issues
3. Device validation panel in the UI
4. Chat history for command examples

---

**Last Updated**: April 8, 2026  
**Version**: 1.0  
**Status**: ✅ Production Ready
