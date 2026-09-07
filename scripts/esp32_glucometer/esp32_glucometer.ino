/**
 * ============================================================
 *  GlucoMApp – ESP32 Firmware
 *  File   : esp32_glucometer.ino
 *  Purpose: USB-Serial handshake broadcaster + glucose sensor
 *           reader for the GlucoMApp React Native project.
 *
 *  Protocol (sent every 2 s when USB host is ready):
 *    Line 1 → "ESP32_HANDSHAKE_OK\n"
 *    Line 2 → JSON  {"status":"OK","glucose":<mg/dL value>}\n
 *
 *  Baud rate : 115200  (must match RNSerialport.setAutoConnectBaudRate)
 *  Platform  : ESP32 (tested on ESP32-WROOM-32)
 * ============================================================
 */

// ── Configuration ────────────────────────────────────────────
#define BAUD_RATE          115200
#define BROADCAST_INTERVAL 2000   // milliseconds between each broadcast
#define GLUCOSE_SENSOR_PIN 34     // ADC1 channel 6 (GPIO34) – analogue input

// ── Globals ──────────────────────────────────────────────────
unsigned long lastBroadcastTime = 0;   // tracks the last time we sent a frame

// ─────────────────────────────────────────────────────────────
void setup() {
  // Initialise the USB-Serial port at the agreed baud rate.
  // The host (Android / RNSerialport) MUST use the same rate.
  Serial.begin(BAUD_RATE);

  // Brief startup delay – gives the host a moment to enumerate
  // the CDC device before we start blasting data.
  delay(500);

  // Configure the ADC pin as an analogue input (no pull-up needed
  // because the sensor provides its own voltage reference).
  pinMode(GLUCOSE_SENSOR_PIN, INPUT);

  Serial.println(F("ESP32 GlucoMApp Firmware Ready"));
}

// ─────────────────────────────────────────────────────────────
void loop() {
  unsigned long now = millis();

  // Only broadcast when the USB-Serial host has opened a port
  // AND the broadcast interval has elapsed.
  if (Serial && (now - lastBroadcastTime >= BROADCAST_INTERVAL)) {
    lastBroadcastTime = now;

    // ── Step 1: Read the raw analogue value ──────────────────
    // The ESP32 ADC is 12-bit (0–4095).
    // Replace readGlucoseSensor() with your actual sensor driver
    // (e.g. a linearised ADC-to-mg/dL lookup table or I²C call).
    int rawADC = readGlucoseSensor();

    // ── Step 2: Convert ADC → mg/dL ─────────────────────────
    // This is a simple linear mapping example.
    // Calibrate the constants for your specific sensor hardware.
    int glucoseMgDL = convertADCToGlucose(rawADC);

    // ── Step 3: Send the handshake line ─────────────────────
    // The React Native app listens for this EXACT string.
    // Do NOT add extra characters or spaces – keep it pristine.
    Serial.println(F("ESP32_HANDSHAKE_OK"));

    // ── Step 4: Send the JSON data line ─────────────────────
    // Keep the JSON compact (no extra whitespace) so the app
    // can parse it even if it arrives in a single chunk.
    Serial.print(F("{\"status\":\"OK\",\"glucose\":"));
    Serial.print(glucoseMgDL);
    Serial.println(F("}"));

    // Flush ensures every byte is actually transmitted before
    // the ESP32 goes back to other work.
    Serial.flush();
  }

  // ── Housekeeping / other sensor tasks can go here ──────────
  // Keep this loop non-blocking – do NOT use delay() here.
}

// ─────────────────────────────────────────────────────────────
/**
 * readGlucoseSensor()
 * Reads the raw 12-bit ADC value from the glucose sensor pin.
 * Uses analogRead() with a small averaging loop to reduce noise.
 *
 * @return int  Averaged ADC value in the range [0, 4095]
 */
int readGlucoseSensor() {
  const int SAMPLES = 8;    // number of readings to average
  long sum = 0;

  for (int i = 0; i < SAMPLES; i++) {
    sum += analogRead(GLUCOSE_SENSOR_PIN);
    delayMicroseconds(500); // short pause between samples
  }

  return (int)(sum / SAMPLES);
}

// ─────────────────────────────────────────────────────────────
/**
 * convertADCToGlucose()
 * Maps a raw 12-bit ADC reading to a blood-glucose value in mg/dL.
 *
 * The formula below is a LINEAR approximation:
 *   glucoseMgDL = (rawADC / 4095.0) * MAX_GLUCOSE
 *
 * ⚠️  Replace this with a calibrated formula or lookup table
 *     specific to your sensor's datasheet for clinical accuracy.
 *
 * @param  rawADC       Raw ADC value [0 – 4095]
 * @return int          Estimated glucose in mg/dL [0 – 400]
 */
int convertADCToGlucose(int rawADC) {
  const float MAX_GLUCOSE_MGDL = 400.0f; // sensor's maximum measurable range

  // Clamp raw value to valid ADC range
  rawADC = constrain(rawADC, 0, 4095);

  int glucoseMgDL = (int)((rawADC / 4095.0f) * MAX_GLUCOSE_MGDL);

  // Clamp output to physiologically plausible range
  glucoseMgDL = constrain(glucoseMgDL, 0, 400);

  return glucoseMgDL;
}
