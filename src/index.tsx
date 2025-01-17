import { useEffect, useState } from "react";
import { Icon, MenuBarExtra, Clipboard, showHUD, Color } from "@raycast/api";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);
const PING_COMMAND = "/sbin/ping";

// Add your Raspberry Pi IPs here
const RASPBERRY_PIS = [
  { ip: "192.168.0.224", name: "Master Pi (Pi 5)" },
  { ip: "192.168.0.203", name: "Worker Pi (Pi 5)" },
  { ip: "192.168.0.155", name: "Worker Pi (Pi 2b)" },
];

interface PiStatus {
  ip: string;
  name: string;
  ping: boolean;
  error?: string;
  lastChecked: Date;
  justCopied?: boolean;
}

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

const pingHost = async (host: string): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log("🔍 Attempting to ping:", host);
    const { stdout, stderr } = await execAsync(`${PING_COMMAND} -c 1 -t 1 ${host}`);
    console.log("🔍 Ping output:", stdout);
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

const useRaspberryPiStatus = () => {
  const [statuses, setStatuses] = useState<PiStatus[]>(
    RASPBERRY_PIS.map(pi => ({
      ...pi,
      ping: false,
      lastChecked: new Date(),
      justCopied: false
    }))
  );

  useEffect(() => {
    const checkPings = async () => {
      const newStatuses = await Promise.all(
        RASPBERRY_PIS.map(async (pi) => {
          const result = await pingHost(pi.ip);
          return {
            ...pi,
            ping: result.success,
            error: result.error,
            lastChecked: new Date(),
            justCopied: false
          };
        })
      );
      setStatuses(newStatuses);
    };
    
    checkPings();
    const interval = setInterval(checkPings, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCopy = async (ip: string, index: number) => {
    await Clipboard.copy(ip);
    setStatuses(current => 
      current.map((status, idx) => 
        idx === index ? { ...status, justCopied: true } : status
      )
    );
    // Reset the copied state after 2 seconds
    setTimeout(() => {
      setStatuses(current =>
        current.map((status, idx) =>
          idx === index ? { ...status, justCopied: false } : status
        )
      );
    }, 2000);
  };

  return { statuses, isLoading: false, handleCopy };
};

export default function Command() {
  const { statuses, isLoading, handleCopy } = useRaspberryPiStatus();
  
  const getStatusIcon = (isConnected: boolean) => {
    return isConnected ? "🟢" : "🔴";
  };

  const getLastCheckedTime = (date: Date) => {
    return date.toLocaleTimeString();
  };

  // Calculate overall status - green if all Pis are up, red if any are down
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
          <MenuBarExtra.Item
            title={status.name}
            icon={Icon.Desktop}
            subtitle={getStatusIcon(status.ping)}
          />
          <MenuBarExtra.Item
            title={`${status.ip}`}
            icon={status.justCopied ? Icon.CheckCircle : Icon.CopyClipboard}
            onAction={() => handleCopy(status.ip, index)}
            subtitle={getLastCheckedTime(status.lastChecked)}
          />
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