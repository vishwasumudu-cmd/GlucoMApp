import { createContext, useContext, useEffect, useRef, useState } from "react";
import { DeviceEventEmitter, Platform } from "react-native";
const { RNSerialport, actions, definitions } = require("react-native-usb-serialport");

const USBContext = createContext({
  status: "Disconnected",
  isConnected: false,
  lastRawValue: null,
  lastReadingAt: 0,
});

export const useUSB = () => useContext(USBContext);

export const USBProvider = ({ children }) => {
  const [status, setStatus] = useState("Disconnected");
  const [lastRawValue, setLastRawValue] = useState(null);
  const [lastReadingAt, setLastReadingAt] = useState(0);

  const statusRef = useRef("Disconnected");
  const bufferRef = useRef("");
  const isConnectingRef = useRef(false);

  const BAUD_RATE = 9600;

  const updateStatus = (newStatus) => {
    if (statusRef.current === newStatus) return;
    console.log(`[USB Status] ${statusRef.current} -> ${newStatus}`);
    statusRef.current = newStatus;
    setStatus(newStatus);
  };

  const handleDisconnectCleanup = () => {
    console.log("[USB Cleanup] Resetting state...");
    isConnectingRef.current = false;
    updateStatus("Disconnected");
    setLastRawValue(null);
    bufferRef.current = "";
  };

  const extractAndParseJSON = () => {
    let text = bufferRef.current;
    
    while (text.includes("{") && text.includes("}")) {
      const startIndex = text.indexOf("{");
      const endIndex = text.indexOf("}", startIndex) + 1;
      
      if (endIndex === 0) break; // '}' is before '{' or not found after '{'

      const jsonString = text.substring(startIndex, endIndex);
      console.log("[USB Parser] JSON Found:", jsonString);

      try {
        const parsed = JSON.parse(jsonString);
        const glucoseValue =
          parsed.glucose !== undefined ? parseFloat(parsed.glucose) : null;

        if (glucoseValue !== null && !isNaN(glucoseValue) && glucoseValue > 0) {
          console.log(`[USB Context] Success! Glucose: ${glucoseValue}`);
          setLastRawValue(glucoseValue);
          setLastReadingAt(Date.now());
          updateStatus("Connected");
        }
      } catch (e) {
        console.log("[USB Parser Error]", e.message);
      }
      
      text = text.substring(endIndex);
    }
    
    bufferRef.current = text;

    if (bufferRef.current.length > 1000) {
      const lastOpenBrace = bufferRef.current.lastIndexOf("{");
      bufferRef.current = lastOpenBrace !== -1 ? bufferRef.current.substring(lastOpenBrace) : "";
    }
  };

  const startUSBConnection = async () => {
    if (statusRef.current === "Connected" || isConnectingRef.current) return;
    isConnectingRef.current = true;

    try {
      // 1. ඩිවයිස් ලැයිස්තුව ලබා ගැනීම
      const devices = await RNSerialport.getDeviceList();
      console.log("[USB New Lib] Devices Found:", devices);

      if (!devices || devices.length === 0) {
        isConnectingRef.current = false;
        return;
      }

      const targetDevice = devices[0];

      // 2. වර්ෂන් 3.0.0 හි connectDevice භාවිතා කරන්න
      console.log("[USB New Lib] Connecting to device:", targetDevice.name);
      RNSerialport.connectDevice(targetDevice.name, BAUD_RATE);

      updateStatus("Connected");
      isConnectingRef.current = false;
    } catch (err) {
      console.error("[USB Connection Error]:", err.message);
      handleDisconnectCleanup();
    }
  };

  useEffect(() => {
    if (Platform.OS !== "android") return;

    // 4. 💡 FIX: අලුත් ලයිබ්‍රරියේ ඩේටා ලිස්නර් එක වැඩ කරන්නේ මේ Native Event එකෙන්
    const dataSubscription = DeviceEventEmitter.addListener(
      actions.ON_READ_DATA,
      (event) => {
        if (event && event.payload) {
          let strData = "";
          if (typeof event.payload === 'string') {
             strData = RNSerialport.hexToUtf16(event.payload);
          } else if (Array.isArray(event.payload)) {
             strData = RNSerialport.intArrayToUtf16(event.payload);
          } else {
             strData = String(event.payload);
          }
          console.log(`[USB RAW DATA]: "${strData}"`);
          bufferRef.current += strData;
          extractAndParseJSON();
        }
      },
    );

    const detachSubscription = DeviceEventEmitter.addListener(
      actions.ON_DEVICE_DETACHED,
      () => {
        console.log("[USB Event] Device Detached");
        handleDisconnectCleanup();
      }
    );

    const errorSubscription = DeviceEventEmitter.addListener(
      actions.ON_ERROR,
      (error) => {
        console.log("[USB Event] Error:", error);
        handleDisconnectCleanup();
      }
    );

    const disconnectSubscription = DeviceEventEmitter.addListener(
      actions.ON_DISCONNECTED,
      () => {
        console.log("[USB Event] Disconnected");
        handleDisconnectCleanup();
      }
    );

    if (Platform.OS === "android") {
      RNSerialport.startUsbService();
    }

    const initConnection = async () => {
      await startUSBConnection();
    };
    initConnection();

    // ඔටෝ කනෙක්ට් ලූප් එක
    const autoConnectInterval = setInterval(() => {
      if (statusRef.current === "Disconnected") {
        startUSBConnection();
      }
    }, 3000);

    return () => {
      if (dataSubscription) dataSubscription.remove();
      if (detachSubscription) detachSubscription.remove();
      if (errorSubscription) errorSubscription.remove();
      if (disconnectSubscription) disconnectSubscription.remove();
      clearInterval(autoConnectInterval);
      if (Platform.OS === "android") {
        RNSerialport.disconnectAllDevices();
        RNSerialport.stopUsbService();
      }
      handleDisconnectCleanup();
    };
  }, []);

  return (
    <USBContext.Provider
      value={{
        status,
        isConnected: status === "Connected",
        lastRawValue,
        lastReadingAt,
      }}
    >
      {children}
    </USBContext.Provider>
  );
};
