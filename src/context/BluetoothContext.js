import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import { BleManager } from "react-native-ble-plx";

const BluetoothContext = createContext({
  status: "Disconnected",
  isConnected: false,
  lastRawValue: null,
  lastReadingAt: 0,
  startScan: async () => {},
});

export const useBluetooth = () => useContext(BluetoothContext);

// මැනේජර් එක රී-රෙන්ඩර් වලදී නැවත හැදීම වැළැක්වීමට Component එකෙන් පිටත තබා ඇත
const bleManager = new BleManager();

export const BluetoothProvider = ({ children }) => {
  const [status, setStatus] = useState("Disconnected");
  const [lastRawValue, setLastRawValue] = useState(null);
  const [lastReadingAt, setLastReadingAt] = useState(0);

  const statusRef = useRef("Disconnected");
  const deviceRef = useRef(null);
  
  const DEVICE_NAME = "ESP32-Glucose-Meter";
  const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
  const CHARACTERISTIC_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

  const updateStatus = (newStatus) => {
    if (statusRef.current === newStatus) return;
    console.log(`[BLE Status] ${statusRef.current} -> ${newStatus}`);
    statusRef.current = newStatus;
    setStatus(newStatus);
  };

  // Base64 වලින් එන දත්ත සාමාන්‍ය String එකක් බවට හරවන Decoder එක
  const base64Decode = (base64) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    let str = "";
    let i = 0;
    base64 = base64.replace(/[^A-Za-z0-9\+\/\=]/g, "");
    while (i < base64.length) {
      const enc1 = chars.indexOf(base64.charAt(i++));
      const enc2 = chars.indexOf(base64.charAt(i++));
      const enc3 = chars.indexOf(base64.charAt(i++));
      const enc4 = chars.indexOf(base64.charAt(i++));
      const chr1 = (enc1 << 2) | (enc2 >> 4);
      const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      const chr3 = ((enc3 & 3) << 6) | enc4;
      str += String.fromCharCode(chr1);
      if (enc3 !== 64) {
        str += String.fromCharCode(chr2);
      }
      if (enc4 !== 64) {
        str += String.fromCharCode(chr3);
      }
    }
    try {
      return decodeURIComponent(escape(str));
    } catch(e) {
      return str;
    }
  };

  const requestPermissions = async () => {
    if (Platform.OS === "android") {
      if (Platform.Version >= 31) {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        return (
          granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED &&
          granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED &&
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED
        );
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    }
    return true; 
  };

  const connectToDevice = async (device) => {
    try {
      updateStatus("Connecting");
      console.log(`[BLE] Connecting to ${device.name}...`);
      
      const connectedDevice = await device.connect();
      console.log(`[BLE] Connected. Discovering services...`);
      deviceRef.current = connectedDevice;

      await connectedDevice.discoverAllServicesAndCharacteristics();
      console.log(`[BLE] Services discovered. Subscribing to characteristic...`);

      updateStatus("Connected");

      // 📡 ලයිව් දත්ත කියවීම මෙතැන් සිට සිදුවේ
      connectedDevice.monitorCharacteristicForService(
        SERVICE_UUID,
        CHARACTERISTIC_UUID,
        (error, characteristic) => {
          if (error) {
            console.error(`[BLE Monitor Error]`, error.message);
            return;
          }

          if (characteristic?.value) {
            // 1. Base64 දත්ත කියවිය හැකි String එකක් කර ගැනීම (e.g., "117")
            const rawString = base64Decode(characteristic.value);
            console.log(`[BLE Raw Data Received]: "${rawString}"`);
            
            // 2. කෙලින්ම Float නම්බර් එකකට හැරවීම (JSON අවශ්‍ය නැත)
            const glucoseValue = parseFloat(rawString);
            
            // 3. අගය නිවැරදි නම් UI එක අප්ඩේට් කිරීමට State එකට දැමීම
            if (!isNaN(glucoseValue) && glucoseValue > 0) {
              console.log(`[BLE Context] 🎉 🎉 SUCCESS! UI Glucose Level: ${glucoseValue} mg/dL`);
              setLastRawValue(glucoseValue);
              setLastReadingAt(Date.now());
            }
          }
        }
      );

      // නොසිතූ මොහොතක කනෙක්ෂන් එක විසන්ධි වුවහොත් හඳුනාගැනීමට
      connectedDevice.onDisconnected((error, dev) => {
        console.log(`[BLE] Device disconnected: ${dev ? dev.name : "ESP32"}`);
        deviceRef.current = null;
        updateStatus("Disconnected");
      });

    } catch (error) {
      console.error("[BLE Connection Error]", error.message);
      deviceRef.current = null;
      updateStatus("Disconnected");
    }
  };

  const startScan = async () => {
    if (statusRef.current === "Scanning" || statusRef.current === "Connecting" || statusRef.current === "Connected") {
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      console.warn("[BLE] Permissions denied. Cannot scan.");
      return;
    }

    updateStatus("Scanning");
    console.log("[BLE] Scanning for devices...");

    bleManager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
      if (error) {
        console.error("[BLE Scan Error]", error.message);
        updateStatus("Disconnected");
        return;
      }

      const name = device.name || device.localName;
      if (name === DEVICE_NAME) {
        console.log(`[BLE] Found target device: ${name}`);
        bleManager.stopDeviceScan();
        connectToDevice(device);
      }
    });
  };

  useEffect(() => {
    // බ්ලූටූත් ඔන්/ඕෆ් වන තත්ත්වය නිරීක්ෂණය
    const subscription = bleManager.onStateChange((state) => {
      if (state === 'PoweredOn') {
        startScan();
      } else if (state === 'PoweredOff') {
        updateStatus("Disconnected");
      }
    }, true);

    // හැම තත්පර 5කට වරක්ම කනෙක්ෂන් එක නැතිනම් ඔටෝ රී-කනෙක්ට් ලූප් එක ක්‍රියාත්මක වීම
    const autoConnectInterval = setInterval(() => {
      if (statusRef.current === "Disconnected") {
        bleManager.state().then((state) => {
          if (state === "PoweredOn") {
            startScan();
          }
        });
      }
    }, 5000);

    return () => {
      subscription.remove();
      clearInterval(autoConnectInterval);
      bleManager.stopDeviceScan();
      if (deviceRef.current) {
        deviceRef.current.cancelConnection().catch(() => {});
      }
    };
  }, []);

  return (
    <BluetoothContext.Provider
      value={{
        status,
        isConnected: status === "Connected",
        lastRawValue,
        lastReadingAt,
        startScan,
      }}
    >
      {children}
    </BluetoothContext.Provider>
  );
};