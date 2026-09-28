# 💻 Multi Plaza Billing — Desktop & Mobile Network Guide

This billing software runs **100% locally on your computer**. All customer data, bills, and payments remain safely stored in your local directory. After initial setup, it operates **completely offline** without needing internet.

---

## 🚀 How to Start the App on Your Computer

Inside the project folder, open the **`desktop`** folder:

1. **`START-FAST-DEV.bat`** (Fastest, Recommended)
   - Double-click to start immediately.
   - Automatically opens <http://localhost:3000/dashboard> in your browser within 5 seconds!

2. **`START-MULTIPLAZA.bat`** (Production Mode)
   - Runs the optimized production build.

---

## 📱 How to Open on Mobile Phone or Second Desktop

You have **TWO simple methods** to connect your mobile phone or a second computer:

### METHOD 1: Same Wi-Fi (Direct Local Network)

1. **Run Firewall Unlock Once (As Administrator):**
   - In the `desktop` folder, right-click **`ALLOW-MOBILE-WIFI-FIREWALL.bat`** ➔ **Run as Administrator**.
   - Click **Yes** when Windows prompts.
   - It will cleanly unblock Port 3000 and Node.js in Windows Defender Firewall.

2. **Start the App:**
   - Double-click **`START-FAST-DEV.bat`**.
   - Look at the yellow text in the command window. It will list your computer's exact Wi-Fi address, for example:
     ```text
     📱 MOBILE & OTHER DEVICES ON YOUR WI-FI:
        * Wi-Fi: http://192.168.1.15:3000
     ```

3. **Open on Phone:**
   - Connect phone to the **same Wi-Fi router**.
   - Open Chrome on phone and type the URL shown (e.g. `http://192.168.1.15:3000`).
   - Tap **"Open Demo ➔"** or sign in!

---

### METHOD 2: Instant Link Anywhere (Works on 4G / 5G / Any Wi-Fi) ⭐ *100% Guaranteed*

If your Wi-Fi router blocks devices from talking to each other (common with JioFiber & Airtel Xstream "AP Isolation"):

1. Keep Multi Plaza running in your first window.
2. In the `desktop` folder, double-click:
   **`SHARE-ONLINE-ANYWHERE.bat`**
3. It will generate a live public link, like:
   `https://xxxxx.loca.lt`
4. Open that link on **ANY mobile phone or computer anywhere in the world** (even on mobile 4G/5G data)!
5. Your billing app opens instantly with full live access to your desktop's database!

---

## 🔑 Login Credentials

- **Username:** `admin`
- **Password:** `admin123`
- Or click **"Open Demo"** to access the dashboard directly.
- Or use the **"Create Account"** tab to register separate staff logins for each counter/phone.

---

## 🧹 Clearing Demo Data & Starting Fresh

When you are ready to start entering real shop bills:
1. Go to **Settings** (or look under **Quick Actions** on the Dashboard).
2. Click **"Clear Demo Data"**.
3. All sample demo bills will be cleared, leaving your database completely fresh (`0 Bills`) for your real shop transactions!
