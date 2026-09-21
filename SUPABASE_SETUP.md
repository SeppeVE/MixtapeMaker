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

## Step 3b: Add Shareable Links (Optional)

If your `mixtapes` table predates the share-link feature, run this in the SQL Editor to add it:

```sql
-- Add a nullable share token. NULL means "not shared"; a tape becomes shareable
-- the moment a token is set, independent of the is_public flag.
ALTER TABLE mixtapes ADD COLUMN share_token UUID DEFAULT NULL;
CREATE UNIQUE INDEX mixtapes_share_token_idx ON mixtapes(share_token) WHERE share_token IS NOT NULL;

-- Allow anyone holding a valid token to read that single row, regardless of is_public.
CREATE POLICY "Anyone can view mixtapes via share token"
  ON mixtapes FOR SELECT
  USING (share_token IS NOT NULL);
```

## Step 3c: Flag Copies from Explore (Optional)

If your `mixtapes` table predates the "copy from explore" feature, run this in the SQL Editor to add it:

```sql
-- True for a fresh copy of another user's mixtape, cleared as soon as the user
-- edits it. Used client-side to block "Make Public" on unedited duplicates.
ALTER TABLE mixtapes ADD COLUMN is_copy boolean NOT NULL DEFAULT false;
```

## Step 3d: Feedback / Feature Requests (Optional)

Powers the "💡 Feedback" button in the footer. Run this in the SQL Editor:

```sql
-- Create the feedback table. The message cap keeps individual rows (and
-- repeated spam inserts) bounded while still leaving room for a real bug
-- report or a detailed feature request.
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  message TEXT NOT NULL CHECK (char_length(message) <= 2000),
  page TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create an index on created_at for sorting
CREATE INDEX feedback_created_at_idx ON feedback(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Bypasses RLS to check the submitter's own recent rows. The feedback table
-- has no SELECT policy (see below), so a plain subquery inside the INSERT
-- policy would see zero rows and the rate limit would never trigger — this
-- function runs as its owner instead of the calling role.
CREATE OR REPLACE FUNCTION public.feedback_rate_limit_ok(p_user_id UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM feedback
    WHERE user_id = p_user_id
      AND created_at > NOW() - INTERVAL '10 minutes'
  );
$$;

REVOKE ALL ON FUNCTION public.feedback_rate_limit_ok(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.feedback_rate_limit_ok(UUID) TO anon, authenticated;

-- Anyone (signed in or anonymous) can submit feedback, but:
--  - user_id must be their own (or NULL) — nobody can attribute feedback to
--    someone else's account by passing an arbitrary user_id
--  - a signed-in user is limited to one submission per 10 minutes
-- (Anonymous submitters have no server-side identity to rate-limit against;
-- the client applies a soft, best-effort cooldown of its own for them.)
-- No SELECT policy for regular users: submitters can't read feedback back.
-- Admins get read/delete access in Step 3f.7 so the /admin page can show it.
CREATE POLICY "Anyone can submit feedback"
  ON feedback
  FOR INSERT
  WITH CHECK (
    (user_id IS NULL OR user_id = auth.uid())
    AND (auth.uid() IS NULL OR public.feedback_rate_limit_ok(auth.uid()))
  );
```

### Step 3e: Harden Feedback — Length Cap, Anti-Spoofing, Rate Limit (Optional)

If your `feedback` table predates the hardening above (message length cap,
ownership check on `user_id`, and a per-user rate limit), run this instead:

```sql
ALTER TABLE feedback ADD CONSTRAINT feedback_message_length CHECK (char_length(message) <= 2000);

CREATE OR REPLACE FUNCTION public.feedback_rate_limit_ok(p_user_id UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM feedback
    WHERE user_id = p_user_id
      AND created_at > NOW() - INTERVAL '10 minutes'
  );
$$;

REVOKE ALL ON FUNCTION public.feedback_rate_limit_ok(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.feedback_rate_limit_ok(UUID) TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can submit feedback" ON feedback;
CREATE POLICY "Anyone can submit feedback"
  ON feedback
  FOR INSERT
  WITH CHECK (
    (user_id IS NULL OR user_id = auth.uid())
    AND (auth.uid() IS NULL OR public.feedback_rate_limit_ok(auth.uid()))
  );
```

## Step 3f: User Profiles, Notifications & Public J-Cards

Powers user profiles (`/profile`, `/user/{username}`), author bylines on
Explore, the "What's new" popup for signed-in users, the `/admin` panel, and
the Public / Private toggle on J-cards. Run the whole block in the SQL Editor
**in this order** (each part builds on the previous one):

### 1. Profiles

```sql
-- One row per account, created automatically on sign-up (trigger below).
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Keep this regex in sync with USERNAME_RE in app/utils/profileDatabase.ts
  username TEXT NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9_-]{3,24}$'),
  avatar_url TEXT,
  -- Keep the cap in sync with BIO_MAX_LENGTH in app/utils/profileDatabase.ts
  bio TEXT CHECK (char_length(bio) <= 300),
  -- When true, /user/{username} only shows "This user has set their profile to private"
  is_private BOOLEAN NOT NULL DEFAULT false,
  -- Unlocks /admin. Only settable from the dashboard / SQL editor, never from the client.
  is_admin BOOLEAN NOT NULL DEFAULT false,
  -- The notification the user dismissed with "Don't show again". A newer
  -- notification has a different id, so it shows up again automatically.
  seen_notification_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Everyone can read profiles (needed for bylines and /user/{username}).
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- Users manage only their own row.
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Nobody can make themselves admin through the API: the client roles may
-- only ever write these columns. is_admin stays dashboard/SQL-only.
REVOKE INSERT, UPDATE ON profiles FROM anon, authenticated;
GRANT INSERT (id, username, avatar_url, bio, is_private) ON profiles TO authenticated;
GRANT UPDATE (username, avatar_url, bio, is_private, seen_notification_id, updated_at) ON profiles TO authenticated;

-- Default username = the part of the email before the @ (what the nav used
-- to show), sanitised, with a number appended if it's already taken.
CREATE OR REPLACE FUNCTION public.generate_username(p_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base TEXT;
  candidate TEXT;
  n INT := 0;
BEGIN
  base := regexp_replace(lower(split_part(coalesce(p_email, ''), '@', 1)), '[^a-z0-9_-]', '', 'g');
  base := left(base, 20);
  IF char_length(base) < 3 THEN
    base := left('user' || base, 20);
  END IF;
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM profiles WHERE username = candidate) LOOP
    n := n + 1;
    candidate := base || n::text;
  END LOOP;
  RETURN candidate;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_username(TEXT) FROM PUBLIC;

-- Create the profile row the moment an account is created.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, public.generate_username(NEW.email))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for accounts that already exist. (Row by row so the
-- duplicate-username check sees the rows inserted just before it.)
DO $$
DECLARE u RECORD;
BEGIN
  FOR u IN
    SELECT id, email FROM auth.users
    WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.users.id)
  LOOP
    INSERT INTO profiles (id, username) VALUES (u.id, public.generate_username(u.email));
  END LOOP;
END $$;

-- Used by the notification policies below.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_admin FROM profiles WHERE id = auth.uid()), false);
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
```

### 2. Notifications

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Keep the caps in sync with NOTIFICATION_*_MAX_LENGTH in app/utils/notificationDatabase.ts
  title TEXT NOT NULL CHECK (char_length(title) <= 120),
  body TEXT NOT NULL CHECK (char_length(body) <= 2000),
  link_url TEXT,
  link_label TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX notifications_created_at_idx ON notifications(created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Only signed-in users see notifications (the popup is on the homepage for logged-in users).
CREATE POLICY "Signed-in users can read notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can post / remove them.
CREATE POLICY "Admins can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin() AND created_by = auth.uid());

CREATE POLICY "Admins can delete notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Deleting a notification un-dismisses it for everyone who had dismissed it.
ALTER TABLE profiles
  ADD CONSTRAINT profiles_seen_notification_fk
  FOREIGN KEY (seen_notification_id) REFERENCES notifications(id) ON DELETE SET NULL;
```

### 3. Public J-cards

```sql
-- Public cards show on the owner's profile and on the linked mixtape's Explore page.
ALTER TABLE jcards ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX jcards_public_mixtape_idx ON jcards(mixtape_id) WHERE is_public;

CREATE POLICY "Anyone can view public jcards"
  ON jcards FOR SELECT
  USING (is_public = true);
```

### 4. Avatar storage bucket

```sql
-- Public bucket; the app uploads a 256×256 JPEG under {user_id}/avatar-….jpg
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatar images are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
```

### 5. Make yourself an admin

```sql
UPDATE profiles
SET is_admin = true
WHERE id = (SELECT id FROM auth.users WHERE email = 'you@example.com');
```

After that, an **Admin** button appears in the nav and `/admin` lets you post
notifications and (after part 7 below) read feedback. Users only ever see the newest one; "Don't show again" is
remembered per user, "Close" only hides it for the current tab.

### 6. Already ran step 3f before the bio field existed?

If your `profiles` table predates the bio, add it with:

```sql
ALTER TABLE profiles ADD COLUMN bio TEXT CHECK (char_length(bio) <= 300);
GRANT INSERT (bio) ON profiles TO authenticated;
GRANT UPDATE (bio) ON profiles TO authenticated;
```

### 7. Feedback in the admin panel

Lets `/admin` list and delete entries from the `feedback` table (Step 3d).
Requires `is_admin()` from part 1 above.

```sql
CREATE POLICY "Admins can read feedback"
  ON feedback FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can delete feedback"
  ON feedback FOR DELETE
  TO authenticated
  USING (public.is_admin());
```

Non-admins still get an empty result rather than an error, so nothing else
in the app changes. Delete entries once they've been dealt with: the privacy
page promises feedback is only kept until it has been read and acted on.

## Step 3g: Account Deletion

Powers "Delete my account" on `/profile` (a GDPR requirement now that the
site has profiles). Deleting the `auth.users` row cascades to the profile,
mixtapes and J-cards; feedback rows keep their text but lose the user link.
The app removes the user's uploaded files through the storage API before
calling this, so no service-role key is needed anywhere.

```sql
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;
```

## Step 3h: Support Prompt Preferences (Optional)

Powers the "Buy me a coffee" block inside the success modals (Spotify export,
share link, J-card PDF) and the muteable print checklist. Signed-out users keep
these preferences in `localStorage`; signed-in users get them mirrored here so
"Don't show this again" follows them across devices. Without this table the
app silently falls back to `localStorage` only.

These live in their own table rather than on `profiles` on purpose: `profiles`
is readable by everyone (bylines, `/user/{username}`) and is locked down with
column-level grants, while "clicked the donate link on <date>" is private.

```sql
-- One row per user, created lazily on the first write.
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- 30-day cooldown between coffee asks
  support_prompt_last_shown_at TIMESTAMPTZ,
  -- "Don't show this again" on the coffee block
  support_prompt_opt_out BOOLEAN NOT NULL DEFAULT false,
  -- 180-day cooldown after clicking through — don't re-ask a donor
  support_prompt_clicked_at TIMESTAMPTZ,
  -- Separate mute for the print checklist in the PDF modal
  print_checklist_opt_out BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only read and write their own row. No SELECT for anyone else.
CREATE POLICY "Users can view their own preferences"
  ON user_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON user_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

Keep the column list in sync with `app/utils/supportDatabase.ts`. Deleting an
account (Step 3g) cascades to this row.

## Step 3i: J-Cards Explore Tab (Copies + Public Previews)

Powers the "J-Cards" tab on `/explore`, "Copy to my library" on `/jcard/{id}`,
and the "Based on … by @user" credit line. Run the whole block in the SQL
Editor **in this order**.

### 1. Copy tracking columns

Mirrors the `is_copy` column mixtapes already have (Step 3c), plus a link back
to the card a copy was made from.

```sql
-- True for a fresh copy of another user's public card, cleared as soon as the
-- user edits it. Used client-side to block "Make Public" on unedited duplicates.
ALTER TABLE jcards ADD COLUMN is_copy boolean NOT NULL DEFAULT false;

-- The card this one was copied from, if any. Cleared automatically if that
-- card is later deleted — the copy keeps its own content either way.
ALTER TABLE jcards ADD COLUMN copied_from_id uuid NULL REFERENCES jcards(id) ON DELETE SET NULL;
```

### 2. Explore listing index

```sql
CREATE INDEX jcards_public_updated_idx ON jcards (updated_at DESC) WHERE is_public;
```

### 3. Public preview view

The Explore grid needs title/byline/badge data for many cards at once, but
must never ship a card's full inside content, custom fonts, or any
locally-embedded (`data:`) image to a page anonymous visitors can load. This
view does that trimming server-side, once, instead of relying on every
client to remember to do it. `security_invoker = true` means it still runs
under the querying role, so the existing "Anyone can view public jcards" RLS
policy applies exactly as it does to the table.

```sql
-- True when any inside panel (within the card's actual flap count) has real
-- text, or the inside has an image anywhere. Mirrors the client-side check in
-- app/utils/jcardPdf.ts (jcardHasInsideContent), computed here so it survives
-- the content-stripping step below.
CREATE OR REPLACE FUNCTION public.jcard_has_inside(content jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(COALESCE(content->'insideFlapContents', '[]'::jsonb)) WITH ORDINALITY AS t(val, ord)
      WHERE ord <= COALESCE((content->>'flaps')::int, 6)
        AND trim(COALESCE(val, '')) <> ''
        AND trim(COALESCE(val, '')) <> '<p><br></p>'
    )
    OR NULLIF(trim(COALESCE(content->>'insideSpineContent', '')), '') IS NOT NULL
    OR NULLIF(trim(COALESCE(content->>'insideBackContent', '')), '') IS NOT NULL
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(COALESCE(content->'insideFlapImageUrls', '[]'::jsonb)) WITH ORDINALITY AS t(val, ord)
      WHERE ord <= COALESCE((content->>'flaps')::int, 6)
        AND COALESCE(val, '') <> ''
    )
    OR COALESCE(content->>'insideBackPanelImageUrl', '') <> ''
    OR COALESCE(content->>'insideBackgroundImageUrl', '') <> '';
$$;

REVOKE ALL ON FUNCTION public.jcard_has_inside(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.jcard_has_inside(jsonb) TO anon, authenticated;

-- Strips everything the Explore preview must never expose: the inside face
-- entirely (content + images), custom font payloads, every content flap but
-- the cover (index 0), and any image field still holding an inline data: URL
-- (a locally-embedded image that never made it to storage).
CREATE OR REPLACE FUNCTION public.jcard_trim_preview_content(content jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  result jsonb := content;
  trimmed jsonb;
  img_key text;
BEGIN
  result := result - 'customFonts' - 'insideContent' - 'insideFlapContents'
                    - 'insideSpineContent' - 'insideBackContent' - 'insideFlapImageUrls'
                    - 'insideBackPanelImageUrl' - 'insideBackgroundImageUrl';

  IF jsonb_typeof(result->'flapContents') = 'array' THEN
    SELECT jsonb_agg(CASE WHEN ord = 1 THEN val ELSE '""'::jsonb END ORDER BY ord)
      INTO trimmed
      FROM jsonb_array_elements(result->'flapContents') WITH ORDINALITY AS t(val, ord);
    result := jsonb_set(result, '{flapContents}', COALESCE(trimmed, result->'flapContents'));
  END IF;

  FOREACH img_key IN ARRAY ARRAY['backgroundImageUrl', 'coverImageUrl', 'backPanelImageUrl']
  LOOP
    IF left(COALESCE(result->>img_key, ''), 5) = 'data:' THEN
      result := jsonb_set(result, ARRAY[img_key], 'null'::jsonb);
    END IF;
  END LOOP;

  IF jsonb_typeof(result->'flapImageUrls') = 'array' THEN
    SELECT jsonb_agg(
             CASE WHEN left(COALESCE(val #>> '{}', ''), 5) = 'data:' THEN 'null'::jsonb ELSE val END
             ORDER BY ord
           )
      INTO trimmed
      FROM jsonb_array_elements(result->'flapImageUrls') WITH ORDINALITY AS t(val, ord);
    result := jsonb_set(result, '{flapImageUrls}', COALESCE(trimmed, result->'flapImageUrls'));
  END IF;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.jcard_trim_preview_content(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.jcard_trim_preview_content(jsonb) TO anon, authenticated;

CREATE VIEW public.public_jcard_previews
WITH (security_invoker = true) AS
SELECT
  j.id,
  j.title,
  j.user_id,
  j.mixtape_id,
  j.updated_at,
  COALESCE((j.content->>'flaps')::int, 6) AS flap_count,
  public.jcard_has_inside(j.content) AS has_inside,
  public.jcard_trim_preview_content(j.content) AS content
FROM jcards j
WHERE j.is_public = true AND j.is_copy = false;

GRANT SELECT ON public.public_jcard_previews TO anon, authenticated;
```

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
