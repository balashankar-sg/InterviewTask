
## ✨ Features

- Create text pastes instantly
- Optional paste expiration using TTL (seconds)
- Optional maximum view count
- Auto-deletes expired or exhausted pastes
- Simple web UI
- RESTful API design
- XSS-safe content rendering
- Health check endpoint
- Deployed using Vercel (serverless compatible)

---

## 🛠 Tech Stack

- **Backend:** Node.js, Express.js
- **ID Generation:** NanoID
- **Storage:** In-memory Map (demo purpose)
- **Deployment:** Vercel

---

# Pastebin Lite – Local Setup Guide

This project is a simple Pastebin-like application built using **Node.js** and **Express**.  
It allows users to create temporary text pastes with optional expiration time (TTL) and view limits.

This document explains **how to run the application locally**.

---

## 📋 Requirements

Before running the project, make sure the following are installed:

- **Node.js** (version 18 or higher)
- **npm** (comes with Node.js)

Check installation:

```bash
node -v
npm -v
