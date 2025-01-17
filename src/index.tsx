import { useEffect, useState } from "react";
import { Icon, MenuBarExtra } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);
const PING_COMMAND = "/sbin/ping";
const RASPBERRY_PI_IP = "192.168.1.231";
const ZIGBEE_PORT = "8080";

interface Status {
  raspberryPi: {
    ping: boolean;
    error?: string;
  };
  zigbee2mqtt: {
    reachable: boolean;
    html: string | null;
    error?: string;
  };
}

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
      error: stderr || undefined
    };
  } catch (error) {
    console.log("🔴 Ping error:", error);
    if (error instanceof Error && error.message.includes("command not found")) {
      return {
        success: false,
        error: "Ping command not available. Please check system configuration."
      };
    }
    return { success: false, error: String(error) };
  }
};

const useRaspberryPiStatus = () => {
  const [pingStatus, setPingStatus] = useState<{ success: boolean; error?: string }>({ success: false });

  useEffect(() => {
    const checkPing = async () => {
      const result = await pingHost(RASPBERRY_PI_IP);
      setPingStatus(result);
    };
    checkPing();
    const interval = setInterval(checkPing, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const { data: zigbeeData, error: zigbeeError } = useFetch(`http://${RASPBERRY_PI_IP}:${ZIGBEE_PORT}`, {
    execute: true,
    timeout: 2000,
    parseResponse: async (response) => {
      const text = await response.text();
      console.log("🔍 Zigbee response:", text.substring(0, 200) + "...");
      return {
        text,
        isZigbee: text.includes("Zigbee2MQTT")
      };
    },
    onError: (error) => {
      console.log("🔴 Zigbee error:", error.message);
    },
    onData: (data) => {
      console.log("🟢 Zigbee data:", data);
    }
  });

  const status: Status = {
    raspberryPi: {
      ping: pingStatus.success,
      error: pingStatus.error
    },
    zigbee2mqtt: {
      reachable: !zigbeeError && zigbeeData?.isZigbee,
      html: zigbeeData?.text || null,
      error: zigbeeError?.message
    }
  };

  return { status, isLoading: false };
};

export default function Command() {
  const { status, isLoading } = useRaspberryPiStatus();
  
  const getStatusIcon = (isConnected: boolean) => {
    return isConnected ? "🟢" : "🔴";
  };

  return (
    <MenuBarExtra
      icon={status.raspberryPi.ping ? Icon.CircleFilled : Icon.Circle}
      title={`Pi: ${RASPBERRY_PI_IP}`}
      tooltip={`Raspberry Pi (${RASPBERRY_PI_IP})`}
      isLoading={isLoading}
    >
      <MenuBarExtra.Section title="Raspberry Pi">
        <MenuBarExtra.Item
          title={`Ping: ${getStatusIcon(status.raspberryPi.ping)}`}
          subtitle={RASPBERRY_PI_IP}
        />
        {status.raspberryPi.error && (
          <MenuBarExtra.Item
            title="Error"
            subtitle={status.raspberryPi.error}
          />
        )}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Zigbee2MQTT">
        <MenuBarExtra.Item
          title={`Status: ${getStatusIcon(status.zigbee2mqtt.reachable)}`}
          subtitle={`Port ${ZIGBEE_PORT}`}
        />
        {status.zigbee2mqtt.html && (
          <MenuBarExtra.Item
            title="Details"
            subtitle={status.zigbee2mqtt.reachable ? "Zigbee2MQTT UI detected" : "No Zigbee2MQTT UI found"}
          />
        )}
        {status.zigbee2mqtt.error && (
          <MenuBarExtra.Item
            title="Error"
            subtitle={status.zigbee2mqtt.error}
          />
        )}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
} 