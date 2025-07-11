Smart Farm System

A production-grade, full-stack farm automation platform developed using PHP and MySQL. This system empowers agricultural stakeholders—farmers, agronomists, managers, and administrators—to monitor sensors, manage crop cycles, communicate in real time, and execute core farm operations efficiently. Built as a capstone project, this application demonstrates a complete end-to-end workflow with extensibility in mind.

Table of Contents

Features

Technology Stack

System-Architecture

Project-Structure

Database-Schema-Overview

Setup-and-Installation

Environment-Configuration

Usage-Instructions

API-Documentation

Future-Enhancements

Contributing

License

Features

Role-based access with dedicated dashboards for Admin, Manager, Agronomist, and Farmer

IoT sensor integration for real-time monitoring of environmental conditions

Crop management and task scheduling with irrigation and pesticide tracking

Secure authentication and session management with bcrypt

Integrated messaging module for intra-system communication

PDF/CSV reporting and analytics tools

Simulated payments and financial transaction logging

Technology Stack

Backend: PHP 8.x (Procedural + OOP)Frontend: HTML5, CSS3, Bootstrap, Vanilla JavaScriptDatabase: MySQL 8.x (InnoDB, Foreign Keys)Charts & Reports: Chart.js, TCPDF (optional)DevOps: Docker (optional), Git, Apache/NginxSecurity: Session management, CSRF tokens, hashed credentials

System-Architecture

smart-farm-system/
├── api/                  # Lightweight REST endpoints
├── config/               # Global configuration
├── database/             # Schema and seed scripts
├── public/               # Static assets and entry points
├── src/
│   ├── controllers/      # Request handling logic
│   ├── models/           # DB abstraction and logic entities
│   ├── views/            # UI templates and partials
│   └── helpers/          # Utility functions
└── README.md

Project-Structure

The project is structured to separate logic, presentation, configuration, and public assets in a modular fashion. API routes, business logic, views, and database utilities are all neatly organized under appropriate directories.

Database-Schema-Overview

users: Core user table with hashed credentials and role metadata

sensors: Registered devices for environmental monitoring

readings: Sensor telemetry with timestamps and thresholds

crops: Crop lifecycle metadata including planting/harvest

tasks: Scheduled irrigation/pesticide/harvesting operations

payments: Ledger for transaction records and service usage

messages: Internal chat module

Schema and seed files are located in database/schema.sql and database/seed.sql.

Setup-and-Installation

1. Clone Repository

git clone https://github.com/lixelamos/smart-farm-system.git && cd smart-farm-system

2. Configure Application

Copy and rename config sample:

cp config/config.sample.php config/config.php

Edit DB credentials and base URL in config.php.

3. Provision Database

mysql -u root -p smartfarm < database/schema.sql
mysql -u root -p smartfarm < database/seed.sql   # Optional

4. Launch Application

Option A (Localhost): Configure Apache/Nginx to serve public/ directoryOption B (Docker):
