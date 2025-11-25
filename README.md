# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Application Configuration

To run and deploy this application, you need to configure your Firebase credentials.

### 1. Set Up Environment Variables

For the application to start, you must configure your Firebase Admin credentials. Open the `.env` file in the root of this project and add them:

```
# Firebase Admin SDK Credentials
# https://firebase.google.com/docs/admin/setup#initialize-sdk
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

Replace the placeholder values with your actual credentials. The application also uses a secret for the Cron Job endpoint, which is pre-configured in the code but can be overridden here if needed.

### 2. Set Up Twilio for WhatsApp

You have two options for configuring Twilio: via the application's UI (recommended) or via environment variables.

#### Option A: Via the Admin Interface (Recommended)

1.  Navigate to the **Admin > Credenciais** page in your running application.
2.  Enter your **Account SID**, **Auth Token**, and **Twilio Phone Number**.
3.  Save the credentials.

This is the recommended approach as it allows you to manage credentials without restarting the application. The system will always prioritize credentials saved in the UI over those in the `.env` file.

#### Option B: Via Environment Variables (Fallback)

If you do not configure Twilio via the UI, you can add the credentials to your `.env` file. These will be used as a fallback if no credentials are found in the application's database.

```
# Twilio Credentials for WhatsApp (Optional Fallback)
# https://www.twilio.com/console
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+14155238886
```

### 3. Configure the Twilio Webhook

You need to tell Twilio where to send incoming messages. This is done in two different places depending on whether you are using the free "Sandbox" for testing or a purchased Twilio phone number for production.

#### a) For Development (Using the Twilio Sandbox)

1. Go to the [Twilio Console](https://console.twilio.com) and navigate to **Messaging > Try it out > Send a WhatsApp message**.
2. Click on the **"Sandbox Settings"** tab.
3. In the field for **"When a message comes in"**, enter the URL of your development server (e.g., from ngrok) followed by `/api/whatsapp`.
4. Make sure the method is `HTTP POST`.
5. Leave the "Status callback URL" field blank.
6. Click **Save**.

It should look like this:

![Twilio Sandbox Configuration](https://picsum.photos/seed/sandbox-config/800/350)

#### b) For Production (Using a Purchased Phone Number)

1.  Go to your active phone numbers in the Twilio Console.
2.  Select the number you are using for this project.
3.  Scroll down to the "Messaging" configuration section.
4.  In the field for **"A MESSAGE COMES IN"**, enter the URL of your deployed application followed by `/api/whatsapp`.
    *   Example: `https://your-app-name.web.app/api/whatsapp`
5.  Make sure the request method is set to `HTTP POST`.
6.  Save the configuration.

### 4. How to Add a New Brazilian Number for WhatsApp

The Twilio console does not allow the direct purchase of Brazilian mobile numbers. The correct and official process is to use a number you already own. This is known as "Bring Your Own Number" (BYON).

**Summary of Steps:**

1.  **Acquire a Brazilian Mobile Number:** Purchase a new SIM card (pre-paid or post-paid) from any Brazilian carrier (Vivo, Claro, TIM, etc.).
2.  **Ensure the Number is "Clean":**
    *   The number **must not** be associated with any active WhatsApp account (personal or Business app).
    *   To guarantee this, activate the SIM card in a phone, install WhatsApp, and if an account already exists, go to **Settings > Account > Delete my account**. This is a mandatory step.
3.  **Start the Registration on Twilio:**
    *   In the Twilio Console, navigate to **Messaging > Senders > WhatsApp Senders**.
    *   Follow the on-screen instructions to add a new sender. You will be guided through the "Self-Sign-Up" process.
    *   You will need to connect your Meta Business Manager account and provide the Brazilian number you prepared.
4.  **Verify Ownership:**
    *   During the process, Twilio/Meta will send a 6-digit code via **SMS or a voice call** to your new number.
    *   Keep the phone with the new SIM card nearby to receive this code and enter it in the Twilio panel to prove you own the number.
5.  **Configure Webhook:** Once approved and added to your senders, configure the webhook for incoming messages for this new number to point to your application's API endpoint (`/api/whatsapp`), just as you did for the original number.

**Important:** This application is currently configured to send outgoing messages from a single phone number. To send messages from multiple different numbers, the application code would require modifications to manage which number to use for each outgoing message.

### 5. (Production Only) Configure Automated Message Sending (Cron Job)

The application uses a queue to send scheduled messages (from protocols, reminders, etc.). In production, this queue needs to be processed automatically by a "Cron Job". This job periodically calls a secure API endpoint to trigger the message sending process.

We have created a secure API endpoint for this: `/api/cron`. You need to set up an external service to call this endpoint on a regular schedule.

#### Using Google Cloud Scheduler (Free and Recommended)

Google Cloud Scheduler offers a generous free tier of **3 free jobs per month**, which is more than enough for our needs. You will not be charged for this setup.

1.  **Go to the Google Cloud Scheduler** in your Google Cloud console for the same project as your Firebase project.
2.  Click **"Create Job"**.
3.  **Define the job:**
    *   **Name:** `process-message-queue`
    *   **Frequency:** `*/10 * * * *` (This runs the job every 10 minutes, which is recommended for timely messages. You can also use `0 */1 * * *` for every hour if you prefer, and it will still be free).
    *   **Timezone:** Select your desired timezone.
4.  **Configure the execution:**
    *   **Target type:** `HTTP`
    *   **URL:** Enter the full URL of your deployed application followed by `/api/cron`.
        *   Example: `https://your-app-name.web.app/api/cron`
    *   **HTTP method:** `GET`
5.  **Configure Authentication (Crucial Step):**
    *   Expand the advanced settings to show **"Headers"**.
    *   Click **"Add Header"**.
    *   **Header name:** `Authorization`
    *   **Header value:** `Bearer CuidarMeCronSecret123` (Use this exact value).
    *   **Authentication header:** Ensure this is set to `No Auth`.

6.  **Click "Create"**.

Your scheduled messages will now be sent automatically!
