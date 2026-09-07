# 🩸 GlucoMApp – Smart Glucose Monitoring System

![Status](https://img.shields.io/badge/Status-In%20Development-orange)
![ESP32](https://img.shields.io/badge/Hardware-ESP32--S3-green)
![React Native](https://img.shields.io/badge/React%20Native-Expo-blue)
![Firebase](https://img.shields.io/badge/Database-Firebase-yellow)

## 📌 About

**GlucoMApp** is a smart glucose monitoring and healthcare management system that connects a glucose sensing device with a mobile application.

The system uses an **ESP32-S3**, **React Native/Expo**, and **Firebase** to collect, process, store, and display glucose data for patients and doctors.

## 🎯 Objectives

- 🩸 Monitor glucose measurements
- 🔌 Connect glucose hardware with a mobile device
- 📱 Develop a user-friendly mobile application
- 👤 Support Patient and Doctor accounts
- ☁️ Store glucose records using Firebase
- 📊 Display glucose history and trends
- 🔔 Provide abnormal glucose alerts
- 🔄 Support online/offline data management

## ✨ Main Features

### 👤 Patient
- Login & Registration
- Glucose Dashboard
- Current Glucose Level
- Glucose History
- Trends & Graphs
- Device Connection Status

### 👨‍⚕️ Doctor
- Doctor Dashboard
- Patient List
- Patient Profiles
- Glucose History
- Glucose Trends
- Abnormal Reading Monitoring

## 🔌 System Architecture

```text
Glucose Test Strip
        ↓
Glucose Sensor Circuit
        ↓
     ESP32-S3
        ↓
   USB Type-C
        ↓
   Mobile App
        ↓
     Firebase
        ↓
Patient / Doctor


🛠️ Technologies
Hardware
ESP32-S3
Glucose Test Strips
Sensor Interface
Analog Signal Conditioning
USB Type-C
Software
React Native
Expo
TypeScript
Expo Router
Firebase Authentication
Cloud Firestore
Arduino IDE
C/C++
📁 Project Structure
GlucoMApp/
├── src/
├── assets/
├── esp32/
├── hardware/
├── firebase/
├── docs/
├── README.md
├── package.json
└── app.json
🚀 Installation
git clone YOUR_GITHUB_REPOSITORY_URL
cd GlucoMApp
npm install
npx expo start
🔥 Firebase

The project uses:

Firebase Authentication
Cloud Firestore

Create your Firebase project and configure the Firebase settings before running the application.

⚠️ Do not upload private credentials or service-account JSON files to GitHub.

📊 Data Flow
Sensor
  ↓
ESP32-S3
  ↓
Mobile Application
  ↓
Data Processing
  ↓
Firebase
  ↓
Glucose History / Dashboard
🚧 Project Status

Currently under development.

The project is being developed as an academic IoT and healthcare technology project, including mobile application development, ESP32 communication, and glucose sensor integration.

🔮 Future Improvements
Advanced sensor calibration
Continuous glucose monitoring
AI-based glucose trend prediction
Doctor-patient messaging
Automated alerts
PDF health reports
Wearable integration
⚠️ Medical Disclaimer

GlucoMApp is an academic/research prototype and is not a certified medical device.

Glucose readings should not be used for diagnosis, treatment, or medication decisions. Hardware readings should be validated against a certified glucose meter before clinical use.

🎓 Academic Project

Project: GlucoMApp
Type: Smart Healthcare / IoT
Hardware: ESP32-S3
Mobile: React Native + Expo
Database: Firebase / Cloud Firestore

📄 License

This project is developed for academic and educational purposes.
