import { useEffect, useState } from "react";
import { Icon, MenuBarExtra, Clipboard } from "@raycast/api";
import { exec } from "node:child_process";
import { promisify } from "node:util";

// Promisify the exec function to use async/await instead of callbacks
const execAsync = promisify(exec);
const PING_COMMAND = "/sbin/ping";

// Configuration: List of Raspberry Pis to monitor
// Add or remove Pis by modifying this array
const RASPBERRY_PIS = [
  { ip: "192.168.0.15", name: "K3S-Master" },
  { ip: "192.168.0.224", name: "K3S-Worker-1" },
  { ip: "192.168.0.203", name: "K3S-Worker-2" },
  { ip: "192.168.0.155", name: "K3S-Worker-3" },
  { ip: "192.168.0.171", name: "Pi5-4gb-64gb-2" },
];

// Type definition for the status of each Raspberry Pi
interface PiStatus {
  ip: string;          // IP address of the Pi
  name: string;       // Display name of the Pi
  ping: boolean;       // Whether the Pi is responding to pings
  error?: string;      // Error message if ping fails
  lastChecked: Date;   // Timestamp of last status check
}

/**
 * Converts error messages into user-friendly troubleshooting instructions
 * @param error - The error object from ping command
 * @param stdout - The stdout from ping command
 * @returns A readable error message with troubleshooting steps
 */
const getReadableError = (error: unknown, stdout: string): string => {
  if (stdout.includes("100.0% packet loss")) {
    return "Pi is unreachable. Please check if:\n• Pi is powered on\n• Connected to the network\n• IP address is correct";
  }
  
  if (error instanceof Error) {
    if (error.message.includes("command not found")) {
      return "Ping command not available. Please check system configuration.";
    }
    if (error.message.includes("Name or service not known")) {
      return "Invalid IP address format";
    }
  }
  
  return "Connection failed. Check network connectivity.";
};

/**
 * Pings a host and returns its status
 * @param host - IP address to ping
 * @returns Object containing success status and any error message
 */
const pingHost = async (host: string): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log("🔍 Attempting to ping:", host);
    // Execute ping command with 1 packet and 1 second timeout
    const { stdout, stderr } = await execAsync(`${PING_COMMAND} -c 1 -t 1 ${host}`);
    console.log("🔍 Ping output:", stdout);
    
    // Check if ping was successful by parsing the output
    const isSuccess = !stderr && stdout.includes("1 packets transmitted") && !stdout.includes("100.0% packet loss");
    if (isSuccess) {
      console.log("🟢 Ping successful");
    } else {
      console.log("🔴 Ping failed:", stderr || stdout);
    }
    
    return {
      success: isSuccess,
      error: isSuccess ? undefined : getReadableError(stderr, stdout)
    };
  } catch (error) {
    console.log("🔴 Ping error:", error);
    return { 
      success: false, 
      error: getReadableError(error, "") 
    };
  }
};

/**
 * Custom hook to manage Raspberry Pi status monitoring
 * Handles periodic status checks and clipboard functionality
 */
const useRaspberryPiStatus = () => {
  // Initialize status for each Pi
  const [statuses, setStatuses] = useState<PiStatus[]>(
    RASPBERRY_PIS.map(pi => ({
      ...pi,
      ping: false,
      lastChecked: new Date()
    }))
  );

  // Set up periodic status checking
  useEffect(() => {
    const checkPings = async () => {
      // Check all Pis in parallel
      const newStatuses = await Promise.all(
        RASPBERRY_PIS.map(async (pi) => {
          const result = await pingHost(pi.ip);
          return {
            ...pi,
            ping: result.success,
            error: result.error,
            lastChecked: new Date()
          };
        })
      );
      setStatuses(newStatuses);
    };
    
    // Initial check
    checkPings();
    // Set up interval for periodic checks (every 100 seconds)
    const interval = setInterval(checkPings, 100000);
    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);

  /**
   * Handles copying IP address to clipboard
   * @param ip - IP address to copy
   */
  const handleCopy = async (ip: string) => {
    await Clipboard.copy(ip);
  };

  return { statuses, isLoading: false, handleCopy };
};

/**
 * Main component for the Raycast extension
 * Renders the menu bar interface and handles user interactions
 */
export default function Command() {
  const { statuses, isLoading, handleCopy } = useRaspberryPiStatus();
  
  // Helper function to get status indicator emoji
  const getStatusIcon = (isConnected: boolean) => {
    return isConnected ? "🟢" : "🔴";
  };

  // Format timestamp for display
  const getLastCheckedTime = (date: Date) => {
    return date.toLocaleTimeString();
  };

  // Determine overall status for menu bar icon
  const allPisUp = statuses.every(status => status.ping);

  return (
    <MenuBarExtra
      icon={allPisUp ? Icon.CircleFilled : Icon.Circle}
      title={`Pis: ${statuses.filter(s => s.ping).length}/${statuses.length}`}
      tooltip="Raspberry Pi Status Monitor"
      isLoading={isLoading}
    >
      {statuses.map((status, index) => (
        <MenuBarExtra.Section key={status.ip}>
          {/* Pi name and status indicator */}
          <MenuBarExtra.Item
            title={status.name}
            icon={Icon.Desktop}
            subtitle={getStatusIcon(status.ping)}
          />
          {/* IP address with copy functionality */}
          <MenuBarExtra.Item
            title={`${status.ip}`}
            icon={Icon.CopyClipboard}
            onAction={() => handleCopy(status.ip)}
            subtitle={getLastCheckedTime(status.lastChecked)}
          />
          {/* Error message if any */}
          {status.error && (
            <MenuBarExtra.Item
              title="Troubleshooting"
              icon={Icon.ExclamationMark}
              subtitle={status.error}
            />
          )}
        </MenuBarExtra.Section>
      ))}
    </MenuBarExtra>
  );
} 