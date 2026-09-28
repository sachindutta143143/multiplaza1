# 🚂 Deploy Multi Plaza to Railway (Step-by-Step Guide)

Railway gives you a 24/7 online link (e.g. `https://multiplaza-billing.up.railway.app`) accessible from **any desktop, mobile, tablet, or home computer with live real-time data sync!**

---

## 📋 What You Need
1. A free GitHub account (<https://github.com>)
2. A free Railway account (<https://railway.com>)

---

## 🚀 Step 1: Upload Project to GitHub (Choose ONE Method)

### Method A: Direct Website Drag & Drop (Using the Preparation Tool) ⭐
> **Why GitHub gave the "100 files at a time" warning:**
> Your project folder contains `node_modules` (15,000 files). When you drag the whole folder into GitHub's website, GitHub rejects it because of the 100-file limit.

1. In your project folder, open the **`desktop`** folder.
2. Double-click:
   👉 **`PREPARE-FOR-GITHUB-WEB.bat`**
3. It creates a clean folder named **`GITHUB-READY-FILES`** with **only the source code files (~60 files, no node_modules)** and automatically opens it in Windows!
4. Go to **GitHub.com** ➔ open your repository ➔ click **"uploading an existing file"** (or Add file ➔ Upload files).
5. In the `GITHUB-READY-FILES` folder that opened, press **Ctrl + A** to select all files and folders.
6. **Drag and drop them directly into GitHub.com in your browser!**
7. Click **"Commit changes"** at the bottom. Done!

---

### Method B: Using GitHub Desktop (Visual App, No Limits)
1. Download & install **[GitHub Desktop](https://desktop.github.com)** (free official tool from GitHub).
2. Click **File ➔ Add Local Repository** ➔ select your Multi Plaza folder.
3. If it says "This directory does not appear to be a Git repository", click **"create a repository"**.
4. Click **"Publish repository"** to GitHub!
5. GitHub Desktop automatically excludes `node_modules` using `.gitignore` and uploads everything with one click!

---

### Method C: One-Click Script (`PUSH-TO-GITHUB.bat`)
1. In the `desktop` folder, double-click **`PUSH-TO-GITHUB.bat`**.
2. Paste your GitHub repository URL when prompted and press Enter.

---

## 🗄️ Step 2: Deploy on Railway with PostgreSQL

1. Log in to **[Railway.com](https://railway.com)**.
2. Click **"+ New Project"**.
3. Select **"Deploy from GitHub repo"** and choose your `multiplaza-billing` repository.
4. Next, add a PostgreSQL Database:
   - In your Railway project canvas, click **"+ New"** (or press `Ctrl + K`).
   - Select **"Database"** ➔ **"Add PostgreSQL"**.
   - Railway will immediately spin up a dedicated PostgreSQL database!

---

## 🔗 Step 3: Connect Database to the Next.js Service

1. Click on your `multiplaza-billing` service card in Railway.
2. Go to the **"Variables"** tab.
3. Click **"New Variable"** (or **"Add Reference"**):
   - Set **`DATABASE_URL`** to:
     `${{Postgres.DATABASE_URL}}` *(or copy the `DATABASE_URL` from the Postgres service's Variables tab)*
   - Add another variable:
     - **`AUTH_SECRET`** = `multiplaza-railway-secret-key-2026`
4. Go to the **"Settings"** tab of the service:
   - Under **"Networking"**, click **"Generate Domain"**.
   - You will receive your live domain, for example: `https://multiplaza-billing-production.up.railway.app`.

---

## 🎉 Step 4: Done! Automatic Schema & Seeding

When Railway builds and starts your app:
- It automatically creates all database tables (`bills`, `customers`, `users`, `catalog_items`, etc.).
- It automatically seeds the initial demo data (and admin login).
- You can now open your Railway URL from **any mobile, tablet, or desktop anywhere in the world!**

### Default Login:
- **Username:** `admin`
- **Password:** `admin123`
- Or use the **"Create Account"** tab to register separate logins for each counter or staff member.
- To clear demo data and enter real shop bills, go to **Settings ➔ Data Management ➔ Clear Demo Data**.
