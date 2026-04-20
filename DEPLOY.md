# Herbtown Classic — Complete Beginner's Setup Guide

**Estimated time:** 30-45 minutes (take it slow, don't skip steps)

**What you'll end up with:** A URL you share with Herby and Carlos. They tap it on their iPhone, add it to their home screen, and you all have a live-updating scorecard during the trip.

**What you need:** A computer (Mac or PC), a web browser (Chrome or Safari), and an email address.

---

## Before you start — understand what we're doing

Think of it like this:

- **GitHub** = cloud storage for your code (like Google Drive, but for code)
- **Firebase** = the live database that stores everyone's scores
- **Vercel** = the web server that actually runs the app and gives you a URL

All three are free. You're just connecting them together.

---

## STEP 1: Unzip the folder you downloaded

1. Find the `herbtown-classic.zip` file you downloaded
2. Double-click it to unzip
3. You now have a folder called `herbtown-app`
4. **Remember where this folder is** — you'll need it in Step 4

Keep this folder open in a Finder/Explorer window — don't close it.

---

## STEP 2: Create a GitHub account (5 minutes)

1. Open your browser and go to: **https://github.com/signup**

2. Enter your email address → click **Continue**

3. Create a password → click **Continue**

4. Pick a username (anything works — like `adam-golf-2026`) → click **Continue**

5. When asked "Would you like to receive product updates?" — type **n** and press Continue (or just click Continue if that doesn't work)

6. Solve the puzzle to prove you're a human → **Create account**

7. **Check your email** for a verification code from GitHub. Enter it on the page.

8. On the "Welcome to GitHub" screen, scroll down and click **"Skip personalization"** or **"Continue for free"** — you don't need to answer any of the questions

✅ **You should now see a GitHub dashboard.** Leave this tab open.

---

## STEP 3: Create a Firebase project (10 minutes)

This is the live database that will sync scores between phones.

### 3a. Sign in to Firebase

1. Open a new tab and go to: **https://console.firebase.google.com**

2. Click **"Get started with a Firebase project"** (or "Go to console" if you've signed in before)

3. Sign in with any Gmail account. If you don't have one, create one at gmail.com first.

### 3b. Create the project

4. Click the big **"Create a project"** card (it has a + sign)

5. **Project name:** type `herbtown-classic` → click **Continue**

6. When asked about **Google Analytics**:
   - Click the toggle to turn it **OFF** (it should say "Disable Google Analytics for this project")
   - Click **Create project**

7. Wait ~30 seconds while it sets up. When it says "Your new project is ready," click **Continue**.

✅ **You're now in the Firebase Console for your project.**

### 3c. Create the Realtime Database

8. Look at the **left sidebar**. You'll see icons. Click **"Build"** to expand it (or it might already be expanded).

9. Click **"Realtime Database"** (NOT "Firestore Database" — make sure you pick "Realtime Database")

10. Click the blue **"Create Database"** button

11. **Database location:** Leave it on the default (something like "United States (us-central1)") → click **Next**

12. **Security rules:** Click **"Start in test mode"** (the option on the left). This lets the app read/write without authentication.
    - You'll see a warning that it expires in 30 days — that's fine, our trip will be done by then.
    - Click **Enable**

13. Wait a few seconds. You should now see a page with a URL at the top that looks like:
    ```
    https://herbtown-classic-abc12-default-rtdb.firebaseio.com/
    ```
    
    **📝 COPY THIS URL INTO A NOTES APP** — you'll paste it into Vercel later. Call it "databaseURL".

### 3d. Get the Firebase config values

14. Look at the top-left of Firebase. Next to "Project Overview," click the **⚙️ gear icon** → click **"Project settings"**

15. Scroll down until you see a section called **"Your apps"**. It will say "There are no apps in your project"

16. Under "Get started by adding Firebase to your app," click the **`</>`** icon (it's the third one — for Web)

17. **App nickname:** type `herbtown` → **DO NOT** check the "Firebase Hosting" checkbox → click **Register app**

18. You'll now see a code block with `firebaseConfig` in it. It looks like:
    ```javascript
    const firebaseConfig = {
      apiKey: "AIzaSyABC...xyz",
      authDomain: "herbtown-classic-abc12.firebaseapp.com",
      databaseURL: "https://herbtown-classic-abc12-default-rtdb.firebaseio.com",
      projectId: "herbtown-classic-abc12",
      storageBucket: "...",
      messagingSenderId: "...",
      appId: "..."
    };
    ```

19. **📝 COPY these 4 values into your notes app** (you can ignore `storageBucket`, `messagingSenderId`, and `appId`):
    - `apiKey` (starts with "AIzaSy...")
    - `authDomain` (ends with `.firebaseapp.com`)
    - `databaseURL` (should match what you copied in step 13)
    - `projectId` (starts with "herbtown-classic-")

    Important: Copy the text **inside the quotes**, not including the quotes themselves.

20. Click **"Continue to console"**

✅ **Firebase is set up!** You can close this tab if you want — we have what we need.

---

## STEP 4: Put the code on GitHub (10 minutes)

Now we upload your app code to GitHub.

### 4a. Create a new repository

1. Go back to your GitHub tab (or go to **https://github.com**)

2. In the top-right, click the **+** icon → **"New repository"**

3. **Repository name:** type `herbtown-classic`

4. Make sure **"Public"** is selected (required for free Vercel deploys)

5. **Do NOT** check any of the "Initialize this repository" boxes (leave README, .gitignore, and license all unchecked)

6. Click the green **"Create repository"** button

### 4b. Upload the files

7. You're now on a page that says "Quick setup" with some code. **Ignore the code.** 

8. Click the link that says **"uploading an existing file"** (it's in the middle of the page)

9. You'll see a page with a drag-and-drop area that says "Drag files here to add them to your repository"

10. Go back to the `herbtown-app` folder you unzipped in Step 1

11. **Open the folder** — you should see files like `package.json`, `index.html`, `src/`, `public/`, `DEPLOY.md`, etc.

12. **Select ALL the files and folders INSIDE the `herbtown-app` folder**:
    - On **Mac**: Press `Cmd+A` to select all
    - On **Windows**: Press `Ctrl+A` to select all

13. **Drag everything** from the folder into the GitHub upload area in your browser

14. Wait for all files to upload. You should see them listed under "Upload files" with green checkmarks. Make sure you see these:
    - `package.json`
    - `index.html`
    - `vite.config.js`
    - `DEPLOY.md`
    - `README.md`
    - `.gitignore`
    - `src` (folder)
    - `public` (folder)

15. Scroll down to the bottom of the page. You'll see a section called "Commit changes"

16. Leave the default commit message and click the green **"Commit changes"** button

17. Wait a few seconds. You'll be taken back to your repository page. You should now see all your files listed.

✅ **Your code is on GitHub!**

---

## STEP 5: Deploy to Vercel (10 minutes)

This is the final step — getting your URL.

### 5a. Sign up for Vercel

1. Open a new tab, go to: **https://vercel.com/signup**

2. Click **"Continue with GitHub"**

3. GitHub will ask you to authorize Vercel → click **"Authorize Vercel"**

4. Vercel may ask you some setup questions:
    - "What's your name?" → enter your name
    - "For what purpose?" → **"Personal"**
    - Click **Continue**

### 5b. Import your project

5. You're now on the Vercel dashboard. Click **"Add New..."** → **"Project"**

6. You'll see a list of your GitHub repositories. Find `herbtown-classic` and click the **"Import"** button next to it.
    
    *(If you don't see it, click "Adjust GitHub App Permissions" and give Vercel access to your repos.)*

### 5c. Configure environment variables (this is the critical part)

7. On the "Configure Project" page, you'll see sections like "Framework Preset" (should say "Vite") and "Build and Output Settings" — **leave these alone**.

8. Scroll down to find **"Environment Variables"** and click to expand it

9. You need to add **4 environment variables**. For each one, type the name in the "Key" field and paste the value from your notes in the "Value" field, then click **"Add"**.

    **Variable 1:**
    - Key: `VITE_FIREBASE_API_KEY`
    - Value: (paste the `apiKey` value from your notes — starts with "AIzaSy...")
    - Click **Add**
    
    **Variable 2:**
    - Key: `VITE_FIREBASE_AUTH_DOMAIN`
    - Value: (paste the `authDomain` value — ends with `.firebaseapp.com`)
    - Click **Add**
    
    **Variable 3:**
    - Key: `VITE_FIREBASE_DATABASE_URL`
    - Value: (paste the `databaseURL` value — starts with `https://` and contains `firebaseio.com`)
    - Click **Add**
    
    **Variable 4:**
    - Key: `VITE_FIREBASE_PROJECT_ID`
    - Value: (paste the `projectId` value — starts with `herbtown-classic-`)
    - Click **Add**

10. Double-check all 4 variables show up in the list before proceeding. If you made a typo in a Key or Value, click the X to remove it and re-add.

### 5d. Deploy

11. Click the big blue **"Deploy"** button at the bottom

12. Wait 1-3 minutes while Vercel builds and deploys your app. You'll see logs scrolling. Eventually you'll see **"Congratulations! 🎉"** and fireworks.

13. Click **"Continue to Dashboard"** OR click the screenshot of your app

14. You'll see your URL — it will look like `herbtown-classic-abc123.vercel.app`. 

    **📝 COPY THIS URL — this is the URL you share with your friends!**

15. Click the URL to open the app. You should see the Herbtown Classic logo and home screen!

✅ **YOU'RE LIVE!** 🎉

---

## STEP 6: Test it

Before the trip, do a quick test:

1. Open the URL on your phone in Safari
2. Tap a round → tap a hole → enter a score for each player
3. Open the SAME URL on your computer in a different browser tab
4. You should see the score appear on the computer within a couple seconds

If that works — everything is good to go!

---

## STEP 7: Add to iPhone home screen

Share the URL with Herby and Carlos in a text message. Each person does this ONCE:

1. Open the URL in **Safari** (NOT Chrome — Safari is required)
2. Tap the **Share** button (the square with an up arrow at the bottom of the screen)
3. Scroll down through the options and tap **"Add to Home Screen"**
4. Tap **"Add"** in the top-right

The Herbtown Classic icon now lives on the home screen like a regular app.

---

## Troubleshooting

### "The app loads but scores aren't saving"

This almost always means one of the Firebase environment variables has a typo.

1. Go to Vercel → your project → **Settings** tab → **Environment Variables**
2. Double-check each value matches your Firebase config exactly
3. If you fix one, you need to redeploy:
    - Go to the **Deployments** tab
    - Click the "..." menu on the latest deployment
    - Click **"Redeploy"**

### "Permission denied" errors in the browser console

Your Firebase Realtime Database isn't in test mode.

1. Go to Firebase Console → your project → Realtime Database → **Rules** tab
2. Make sure the rules look like this:
    ```json
    {
      "rules": {
        ".read": true,
        ".write": true
      }
    }
    ```
3. Click **"Publish"**

### "Vercel can't find my GitHub repo"

1. In Vercel, click **"Add GitHub Account"** or **"Configure GitHub App"**
2. Give Vercel access to all repositories (or just the `herbtown-classic` one)
3. Go back to Vercel → Add New → Project → it should show up now

### "My iPhone can't open the URL"

- Make sure you're using the FULL URL including `https://`
- Try it on a computer first to make sure the site is live
- If the computer works but iPhone doesn't, check that you're on good WiFi or cellular signal

### I messed up and want to start over

No problem. You can:
- Delete the Firebase project (Project Settings → scroll to bottom → Delete project)
- Delete the Vercel project (Settings → scroll to bottom → Delete Project)
- Delete the GitHub repo (Settings → scroll to bottom → Delete this repository)

Then start over from Step 2.

---

## After the trip

The Firebase database is in "test mode" — anyone with the URL could theoretically add junk data. After the trip:

- **Easiest:** Just delete the Firebase project (everything stops working, but nobody can mess with it)
- Or go to Rules in Realtime Database and change `true` to `false` to lock it down

---

## Still stuck?

Send a message describing:
1. Which step you're on
2. What you see on screen (or screenshot)
3. Any error message that popped up

I can help debug from there!
