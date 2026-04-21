#!/usr/bin/env node
/**
 * Test Examples for AI Chatbot Device Configuration
 * 
 * Run these commands in the chat interface to test the new features
 * Copy and paste each command into the chatbot to verify functionality
 */

// ============================================================================
// SECTION 1: TOPOLOGY GENERATION
// ============================================================================

const TOPOLOGY_COMMANDS = [
  // Star topology
  "Create a star topology with 5 PCs",
  "Generate a star network with 4 workstations",
  
  // Mesh topology
  "Build a mesh topology with 4 nodes",
  "Create a mesh network with 6 devices",
  
  // Ring topology
  "Design a ring topology with 5 PCs",
  "Generate a ring network with 4 workstations",
  
  // Bus topology
  "Create a bus topology with 6 devices",
  "Build a bus network with 5 PCs",
  
  // Tree topology
  "Design a tree topology with 8 nodes",
  "Generate a tree network with 6 devices",
  
  // LAN template
  "Create a LAN layout",
  "Generate a LAN network",
]

// ============================================================================
// SECTION 2: DEVICE IP CONFIGURATION (NEW)
// ============================================================================

const IP_CONFIGURATION_COMMANDS = [
  // Simple IP updates
  "Change PC-1 IP to 10.0.0.5",
  "Set IP address of Router-1 to 192.168.1.1",
  "Update PC-2 IP to 172.16.0.100",
  "Set IP of Server-1 to 10.0.0.100",
  
  // IP on different device types
  "Change Router IP to 192.168.1.254",
  "Update Switch-1 IP address to 10.0.0.2",
  "Set Firewall-1 IP to 172.31.0.1",
]

// ============================================================================
// SECTION 3: DEVICE SUBNET MASK CONFIGURATION (NEW)
// ============================================================================

const SUBNET_CONFIGURATION_COMMANDS = [
  // Standard subnet masks
  "Set subnet mask of PC-1 to 255.255.0.0",
  "Change Router-1 subnet to 255.255.254.0",
  "Update PC-3 subnet mask to 255.255.255.128",
  "Set subnet of Server-1 to 255.255.255.0",
  "Configure PC-2 subnet mask to 255.0.0.0",
  
  // With "of" keyword
  "Set subnet mask of Router-1 to 255.255.255.0",
  "Update subnet mask of PC-5 to 255.255.240.0",
]

// ============================================================================
// SECTION 4: DEVICE STATUS MANAGEMENT (NEW)
// ============================================================================

const STATUS_COMMANDS = [
  // Active status
  "Set PC-1 status to active",
  "Mark Server-1 as active",
  "Set Router-1 active",
  
  // Inactive status
  "Make Router offline",
  "Set PC-1 status to inactive",
  "Mark Server-1 as down",
  "Change PC-2 to offline",
  
  // Online/Offline variants
  "Mark PC-3 as online",
  "Set Router-1 to up",
]

// ============================================================================
// SECTION 5: DEVICE TYPE CHANGES (NEW)
// ============================================================================

const DEVICE_TYPE_COMMANDS = [
  // Change to server
  "Change PC-1 type to server",
  "Convert PC-2 to server",
  "Change Laptop-1 to server",
  
  // Change to router
  "Convert PC-3 to router",
  "Change Server-1 type to router",
  
  // Change to other types
  "Change PC-4 to printer",
  "Convert Router-1 to switch",
  "Change PC-5 to ip-phone",
  "Convert Server-1 to firewall",
  "Change Laptop-1 to iot-device",
]

// ============================================================================
// SECTION 6: MAC ADDRESS CONFIGURATION (NEW)
// ============================================================================

const MAC_ADDRESS_COMMANDS = [
  // Standard MAC address format
  "Set MAC of PC-1 to AA:BB:CC:DD:EE:FF",
  "Change PC-2 MAC address to 00:11:22:33:44:55",
  "Update Router-1 MAC to FF:EE:DD:CC:BB:AA",
  
  // Different case
  "Set MAC address of PC-3 to ff:ff:ff:ff:ff:ff",
  "Change Server-1 MAC to 01:02:03:04:05:06",
  
  // Alternative patterns
  "Assign MAC of PC-4 to AA:BB:CC:DD:EE:00",
]

// ============================================================================
// SECTION 7: DEVICE NAMING (RENAME)
// ============================================================================

const RENAME_COMMANDS = [
  // Simple rename
  "Rename PC-1 to WebServer",
  "Change Router-1 name to CoreRouter",
  "Rename Server-1 to DatabaseServer",
  
  // Alternative patterns
  "Rename PC-2 as FileServer",
  "Change PC-3 to AppServer",
  "Rename Router-1 as MainRouter",
]

// ============================================================================
// SECTION 8: BATCH CONFIGURATION (NEW - ADVANCED)
// ============================================================================

const BATCH_CONFIG_COMMANDS = [
  // Multiple settings in one command
  "Configure PC-1: IP 192.168.1.50, subnet 255.255.255.0, hostname WebServer1",
  "Setup Router-1: IP 10.0.0.1, subnet 255.0.0.0, hostname MainRouter",
  "Configure Server-1: IP 10.0.0.100, subnet 255.255.255.0, hostname FileServer",
  
  // With MAC address
  "Configure PC-2: IP 192.168.1.100, subnet 255.255.255.0, hostname WorkPC1, MAC AA:BB:CC:DD:EE:01",
  
  // Just IP and name
  "Configure PC-3: IP 192.168.1.101, hostname WorkPC2",
  
  // Setup command variant
  "Set up Router-2: IP 10.0.0.2, subnet 255.0.0.0",
]

// ============================================================================
// SECTION 9: CONNECTION MANAGEMENT
// ============================================================================

const CONNECTION_COMMANDS = [
  // Create connections
  "Connect PC-1 to Router-1",
  "Connect Router-1 to Server-1 with fiber cable",
  "Link PC-2 to Switch-1 using wireless",
  
  // Remove connections
  "Disconnect PC-1 from Router-1",
  "Remove link between Router and Server",
  "Disconnect PC-2 and Switch-1",
]

// ============================================================================
// SECTION 10: DEVICE MANAGEMENT
// ============================================================================

const DEVICE_MANAGEMENT_COMMANDS = [
  // Add devices
  "Add 3 PCs to the topology",
  "Add 2 servers to the network",
  "Insert 5 workstations",
  "Add a printer",
  
  // Remove devices
  "Remove PC-1",
  "Delete Router-2",
  "Remove Server-1",
  "Delete all printers",
  "Remove 2 PCs from the network",
]

// ============================================================================
// SECTION 11: REALISTIC SCENARIOS
// ============================================================================

const REALISTIC_SCENARIOS = [
  // Scenario 1: Build a simple office network
  [
    "Create a star topology with 5 PCs",
    "Configure Router-1: IP 192.168.1.1, subnet 255.255.255.0, hostname OfficeRouter",
    "Configure PC-1: IP 192.168.1.10, subnet 255.255.255.0, hostname PrintServer",
    "Configure PC-2: IP 192.168.1.11, subnet 255.255.255.0, hostname FileServer",
    "Set PC-3 IP to 192.168.1.20",
    "Set PC-4 IP to 192.168.1.21",
    "Set PC-5 IP to 192.168.1.22",
  ],
  
  // Scenario 2: Build and modify a network
  [
    "Create a mesh topology with 4 nodes",
    "Change PC-1 type to server",
    "Change PC-2 type to router", 
    "Rename PC-1 to WebServer",
    "Rename PC-2 to CoreRouter",
    "Set PC-3 IP to 10.0.0.5",
    "Set PC-4 IP to 10.0.0.6",
  ],
  
  // Scenario 3: Complex device configuration
  [
    "Create a star topology with 6 PCs",
    "Configure Router-1: IP 172.16.0.1, subnet 255.255.0.0, hostname MainRouter",
    "Configure PC-1: IP 172.16.0.10, subnet 255.255.0.0, hostname Database",
    "Configure PC-2: IP 172.16.0.11, subnet 255.255.0.0, hostname WebServer",
    "Configure PC-3: IP 172.16.0.12, subnet 255.255.0.0, hostname AppServer",
    "Convert PC-4 to ip-phone",
    "Set PC-5 status to offline",
  ],
]

// ============================================================================
// TESTING GUIDE
// ============================================================================

const TEST_GUIDE = `
TESTING THE AI CHATBOT DEVICE CONFIGURATION

1. OPEN THE CHAT INTERFACE
   - Click the chat bubble in the bottom right corner
   - The bot should show a list of available commands

2. TEST BASIC COMMANDS (Start with these)
   - Try: "Create a star topology with 5 PCs"
   - Try: "Change PC-1 IP to 10.0.0.5"
   - Try: "Rename PC-1 to WebServer"

3. TEST CONFIGURATION COMMANDS
   - Try: "Set subnet mask of Router-1 to 255.255.255.0"
   - Try: "Set PC-2 status to active"
   - Try: "Change PC-3 type to server"

4. TEST BATCH CONFIGURATION
   - Try: "Configure PC-1: IP 192.168.1.50, subnet 255.255.255.0, hostname MyServer"

5. VERIFY IN LAB VIEW
   - Click "OPEN LAB" button to see the generated/modified topology
   - Check device properties in the right panel
   - Verify IP addresses, subnet masks, and device names match your commands

6. EXPECTED BEHAVIORS
   ✓ Device appears/disappears in 3D view
   ✓ Device names update in labels
   ✓ Device properties change in sidebar
   ✓ Colors change on device type conversion
   ✓ Connections are created/removed as specified

7. ERROR HANDLING
   - If device not found: Verify exact spelling of device name
   - If invalid IP: Ensure format is 4 octets (0-255 each)
   - If invalid subnet: Use standard CIDR notation
   - If command not recognized: Check console for error messages

NOTES:
- Device names are case-insensitive
- You can use device IDs (PC-1, Router-1) or custom names
- Batch config uses comma-separated key-value pairs
- MAC addresses must be in XX:XX:XX:XX:XX:XX format
- Subnet masks must be valid CIDR notation
`

// ============================================================================
// EXPORT FOR TESTING
// ============================================================================

console.log(TEST_GUIDE)

const ALL_COMMANDS = {
  topology: TOPOLOGY_COMMANDS,
  ipConfiguration: IP_CONFIGURATION_COMMANDS,
  subnetConfiguration: SUBNET_CONFIGURATION_COMMANDS,
  status: STATUS_COMMANDS,
  deviceType: DEVICE_TYPE_COMMANDS,
  macAddress: MAC_ADDRESS_COMMANDS,
  rename: RENAME_COMMANDS,
  batchConfig: BATCH_CONFIG_COMMANDS,
  connections: CONNECTION_COMMANDS,
  deviceManagement: DEVICE_MANAGEMENT_COMMANDS,
  scenarios: REALISTIC_SCENARIOS,
}

console.log("\n\n=== COMMAND REFERENCE ===\n")
Object.entries(ALL_COMMANDS).forEach(([category, commands]) => {
  if (Array.isArray(commands[0])) {
    console.log(`\n[${category.toUpperCase()}]`)
    commands.forEach((scenario, idx) => {
      console.log(`\nScenario ${idx + 1}:`)
      scenario.forEach(cmd => console.log(`  - ${cmd}`))
    })
  } else {
    console.log(`\n[${category.toUpperCase()}]`)
    commands.forEach(cmd => console.log(`  - ${cmd}`))
  }
})

module.exports = ALL_COMMANDS
