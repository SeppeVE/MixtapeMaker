# Google OAuth Setup Guide

This guide shows you how to enable Google sign-in for your Mixtape Creator app.

## Why Google OAuth?

- No passwords for users to remember
- No email verification required
- Instant sign-in with existing Google account
- More secure and better user experience

## Step 1: Set Up Google Cloud Project

1. Go to **https://console.cloud.google.com/**
2. Click the project dropdown at the top
3. Click **"New Project"**
4. Enter project name: `Mixtape Creator`
5. Click **"Create"**

## Step 2: Configure OAuth Consent Screen

1. In the Google Cloud Console, go to **APIs & Services** → **OAuth consent screen**
2. Choose **"External"** (unless you have a Google Workspace)
3. Click **"Create"**
4. Fill in the required fields:
   - **App name**: `Mixtape Creator`
   - **User support email**: Your email
   - **Developer contact email**: Your email
5. Click **"Save and Continue"**
6. Skip "Scopes" - click **"Save and Continue"**
7. Skip "Test users" - click **"Save and Continue"**
8. Review and click **"Back to Dashboard"**

## Step 3: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **"Create Credentials"** → **"OAuth 2.0 Client ID"**
3. Choose **"Web application"**
4. Enter name: `Mixtape Creator Web`
5. Under **"Authorized redirect URIs"**, click **"Add URI"**
6. You need to add the Supabase callback URL:
   - Go to your **Supabase dashboard**
   - Navigate to **Authentication** → **Providers**
   - Find **Google** in the list
   - Copy the **"Callback URL (for OAuth)"** shown there
   - It looks like: `https://your-project-ref.supabase.co/auth/v1/callback`
7. Paste this URL into Google Cloud Console
8. Click **"Create"**
9. A dialog will show your:
   - **Client ID** (looks like: `123456789-abc123.apps.googleusercontent.com`)
   - **Client Secret** (a long random string)
10. **Copy both values** - you'll need them next!

## Step 4: Enable Google in Supabase

1. Go to your **Supabase dashboard**
2. Click **Authentication** in the sidebar
3. Click **Providers**
4. Scroll down and find **Google**
5. Toggle **"Enable Sign in with Google"** to ON
6. Paste your credentials:
   - **Client ID**: Paste the Client ID from Google
   - **Client Secret**: Paste the Client Secret from Google
7. Click **"Save"**

## Step 5: Test Google Sign-In

1. Start your app:
   ```bash
   npm run dev
   ```

2. Open in browser

3. Click **"Sign In / Sign Up"**

4. Click **"Continue with Google"**

5. You'll be redirected to Google to choose your account

6. After signing in with Google, you'll be redirected back to your app

7. You're now signed in! Try creating and saving a mixtape

## For Production Deployment

When you deploy your app to production (e.g., Vercel, Netlify):

1. Add your production domain to **"Authorized JavaScript origins"** in Google Cloud Console:
   - Example: `https://your-app.vercel.app`

2. Add production callback URL to **"Authorized redirect URIs"**:
   - Your Supabase callback URL will be the same
   - But also add your production domain if needed

3. In Supabase → Authentication → URL Configuration:
   - Set **Site URL** to your production URL
   - Add your production domain to **Redirect URLs**

## Keeping Email Sign-Up (Optional)

The code now supports **both** Google and email authentication:

- **Google**: Click "Continue with Google" (recommended)
- **Email**: Fill in email/password form below the divider

Users can choose whichever they prefer!

If you want **only Google** (no email option):

1. In Supabase → Authentication → Providers
2. Find **Email** and toggle it OFF
3. The email form will still show in the modal, but you can hide it with CSS or remove it from the code

## Troubleshooting

### "Error 400: redirect_uri_mismatch"
- The redirect URI in Google Cloud Console doesn't match Supabase's callback URL
- Make sure you copied the EXACT callback URL from Supabase
- Check for typos or missing characters

### "Access blocked: This app's request is invalid"
- You need to configure the OAuth consent screen (see Step 2)
- Make sure you completed all required fields

### Google sign-in button doesn't work
- Check browser console for errors
- Make sure you saved the Google credentials in Supabase
- Verify the Client ID and Secret are correct

### After signing in with Google, nothing happens
- Check that your app is running on `http://localhost:5173` (or update redirect URIs)
- Look at browser console for errors
- Verify Supabase credentials in `.env` are correct

## Benefits Summary

✅ One-click sign-in for users
✅ No password to remember
✅ No email verification required
✅ More secure (Google handles authentication)
✅ Familiar sign-in flow
✅ Works on mobile and desktop

Enjoy the improved authentication experience! 🎵
