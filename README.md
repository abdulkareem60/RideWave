# 🚗 RideWave

**RideWave** is a modern ride-sharing platform that connects drivers and passengers through a secure, real-time, and user-friendly experience. Built with a full-stack architecture, RideWave focuses on safety, trust, driver verification, and efficient ride management.

---

## ✨ Features

### 👤 Authentication & Security

* JWT-based Authentication
* Email Verification (OTP)
* Forgot Password & Reset Password
* Role-Based Access Control (Passenger, Driver, Admin)

### 🚘 Driver Onboarding

* Profile Photo Upload
* Vehicle Registration
* Driving License Upload
* OCR-Based Document Verification
* Verification Scoring System
* Admin Review Workflow

### 🛣 Ride Management

* Create Ride
* Search Rides
* View Ride Details
* Seat Availability Tracking
* Booking Requests
* Ride Status Management

### 🎫 Booking System

* Request Seats
* Driver Approval Flow
* Booking Management
* OTP Ride Start Verification
* Booking History

### 🔔 Notification System

* Real-Time In-App Notifications
* Booking Updates
* Ride Status Alerts
* Driver Verification Updates

### 👨‍💼 Admin Panel

* User Management
* Driver Verification Review
* Reports Management
* Platform Monitoring

---

## 🏗 Tech Stack

### Frontend

* React.js
* Vite
* Tailwind CSS
* React Router
* Axios

### Backend

* Spring Boot
* Spring Security
* JWT Authentication
* Hibernate / JPA
* Maven

### Database

* PostgreSQL

### Integrations

* Google Maps
* OCR Processing
* Email Services

---

## 📂 Project Structure

```text
RideWave/
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── backend/
│   ├── src/
│   ├── pom.xml
│   └── application.yml
│
└── README.md
```

---

## 🚀 Getting Started

### Clone Repository

```bash
git clone https://github.com/abdulkareem60/RideWave.git
cd RideWave
```

### Backend Setup

```bash
cd backend
mvn clean install
mvn spring-boot:run
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

## 🔒 Security Highlights

* JWT Authentication
* Protected Routes
* Role-Based Permissions
* Driver Verification Workflow
* OTP Verification
* Secure Password Handling

---

## 🎯 Vision

RideWave aims to provide a trusted and efficient ride-sharing ecosystem where passengers can travel confidently and drivers can build credibility through a transparent verification process.

---

### Made with ❤️ using React, Spring Boot & PostgreSQL
