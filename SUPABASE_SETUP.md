# Supabase Setup Guide

This guide will help you set up Supabase for the Mixtape Creator app, enabling user authentication and cloud storage for mixtapes.

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up for a free account or log in
3. Click "New Project"
4. Fill in the project details:
   - **Name**: Choose a name (e.g., "mixtape-app")
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose the region closest to you
   - **Pricing Plan**: Free tier is fine for development
5. Click "Create new project"
6. Wait for the project to be set up (takes 1-2 minutes)

## Step 2: Get Your Supabase Credentials

Once your project is ready:

1. In the Supabase dashboard, go to **Settings** (gear icon in sidebar)
2. Click on **API** in the settings menu
3. You'll see two important values:
   - **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")
4. Copy these values - you'll need them for your `.env` file

## Step 3: Set Up the Database Schema

1. In your Supabase dashboard, click on the **SQL Editor** icon in the sidebar
2. Click "New Query"
3. Copy and paste the following SQL code:

```sql
-- Create the mixtapes table
CREATE TABLE mixtapes (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  cassette_length INTEGER NOT NULL,
  side_a JSONB NOT NULL DEFAULT '[]'::jsonb,
  side_b JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create an index on user_id for faster queries
CREATE INDEX mixtapes_user_id_idx ON mixtapes(user_id);

-- Create an index on updated_at for sorting
CREATE INDEX mixtapes_updated_at_idx ON mixtapes(updated_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE mixtapes ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see their own mixtapes
CREATE POLICY "Users can view their own mixtapes"
  ON mixtapes
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can insert their own mixtapes
CREATE POLICY "Users can insert their own mixtapes"
  ON mixtapes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can update their own mixtapes
CREATE POLICY "Users can update their own mixtapes"
  ON mixtapes
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can delete their own mixtapes
CREATE POLICY "Users can delete their own mixtapes"
  ON mixtapes
  FOR DELETE
  USING (auth.uid() = user_id);
```

4. Click **Run** or press `Ctrl+Enter` to execute the SQL
5. You should see a success message

## Step 4: Configure Authentication

1. In the Supabase dashboard, click on **Authentication** in the sidebar
2. Click on **Providers** under Configuration
3. Make sure **Email** is enabled (it should be by default)
4. Optionally, configure email templates:
   - Click on **Email Templates** under Configuration
   - Customize the confirmation email if desired

## Step 5: Configure Your .env File

1. In your project root, open or create the `.env` file
2. Add your Supabase credentials:

```env
# Spotify Configuration (you should already have these)
VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id
VITE_SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Replace `your_supabase_project_url` with your Project URL from Step 2
4. Replace `your_supabase_anon_key` with your anon public key from Step 2

## Step 6: Test Your Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open the app in your browser

3. Click "Sign In / Sign Up"

4. Create a test account with your email and a password

5. Check your email for a confirmation link (check spam folder)

6. Click the confirmation link to verify your account

7. Sign in to your account

8. Create a mixtape and click "Save to Cloud"

9. You should see a success message

10. Click "My Library" to see your saved mixtape

## Database Schema Explanation

The `mixtapes` table stores all user mixtapes with the following columns:

- **id**: Unique identifier for each mixtape (TEXT)
- **user_id**: References the authenticated user (UUID)
- **title**: The mixtape name (TEXT)
- **cassette_length**: 60, 90, or 120 minutes (INTEGER)
- **side_a**: Array of songs as JSON (JSONB)
- **side_b**: Array of songs as JSON (JSONB)
- **created_at**: When the mixtape was first created (TIMESTAMPTZ)
- **updated_at**: When the mixtape was last modified (TIMESTAMPTZ)

### Row Level Security (RLS)

RLS ensures that users can only access their own mixtapes. The policies we created:

- **SELECT**: Users can only view their own mixtapes
- **INSERT**: Users can only create mixtapes for themselves
- **UPDATE**: Users can only modify their own mixtapes
- **DELETE**: Users can only delete their own mixtapes

This means your data is secure - users can't see or modify each other's mixtapes!

## Troubleshooting

### "Invalid API key" error
- Double-check that you copied the **anon public** key (not the service_role key)
- Make sure there are no extra spaces in your `.env` file

### Email confirmation not arriving
- Check your spam/junk folder
- In Supabase dashboard → Authentication → Settings, you can disable email confirmation for testing (not recommended for production)

### "Failed to save mixtape" error
- Make sure you ran the SQL schema script completely
- Check that RLS policies were created successfully
- Look at the browser console for detailed error messages

### Can't see saved mixtapes
- Make sure you're signed in
- Check the browser console for errors
- Verify the RLS policies are set up correctly

## Optional: Disable Email Confirmation (Development Only)

For faster development, you can disable email confirmation:

1. Go to **Authentication** → **Providers** in Supabase
2. Scroll down to "Email"
3. Click "Edit"
4. Toggle off "Confirm email"
5. Save

**Warning**: Don't do this in production! Email confirmation is important for security.

## Next Steps

Now that Supabase is set up, you can:

- Create multiple mixtapes and save them to the cloud
- View all your mixtapes in the library
- Load any saved mixtape to edit it
- Delete mixtapes you no longer want

## Need Help?

If you run into issues:

1. Check the browser console for error messages
2. Check the Supabase logs: Dashboard → Logs → API Logs
3. Make sure your `.env` file has the correct values
4. Verify the SQL schema was created successfully: Dashboard → Table Editor

Enjoy creating your mixtapes! 🎵📼
