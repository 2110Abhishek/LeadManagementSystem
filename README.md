# Lead Management – CSV Import & Dashboard

This project implements:
- CSV/XLS/XLSX import (with column mapping)
- Preview with validation & row selection
- Lead listing dashboard with filters, edit, view and delete
- REST APIs + MySQL database

## Tech Stack
- Backend: <your stack here> (e.g. Node.js/Express or Spring Boot)
- Frontend: React
- DB: MySQL

## Setup

### 1. Database
- Create database: `lead_management`
- Import: `database/lead_management.sql`

### 2. Backend
```bash
cd backend
# install deps
npm install / mvn clean install
# set env (DB credentials)
cp .env.example .env
# run
npm start / mvn spring-boot:run
