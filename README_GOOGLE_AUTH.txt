Smart Kisan – Google Authentication Setup
========================================

1. Create a Google OAuth 2.0 Web Client ID
   - Go to https://console.cloud.google.com/
   - Create / select a project
   - Enable "Google Identity Services" / "OAuth consent screen"
   - Create credentials -> OAuth client ID -> Application type: Web application
   - Add these URIs:
       Authorized JavaScript origins:
         - http://localhost:5173
       Authorized redirect URIs:
         - http://localhost:5173
   - Copy the generated Web Client ID (it looks like: 1234567890-abc123def456.apps.googleusercontent.com)

2. Frontend (.env)
   - Open: smart-kisan-with-crop-disease/smart-kisan/frontend/.env
   - Replace:
       VITE_GOOGLE_CLIENT_ID=YOUR_GOOGLE_OAUTH_WEB_CLIENT_ID
     with your real Web Client ID from step 1.

3. Backend (.env)
   - Open: smart-kisan-with-crop-disease/smart-kisan/backend/.env
   - Replace:
       GOOGLE_CLIENT_ID=YOUR_GOOGLE_OAUTH_WEB_CLIENT_ID
     with the SAME Web Client ID as in the frontend .env

4. Install and run backend
   - Open a terminal in: smart-kisan-with-crop-disease/smart-kisan/backend
   - Run:
       npm install
       npm run dev

5. Install and run frontend
   - Open a second terminal in: smart-kisan-with-crop-disease/smart-kisan/frontend
   - Run:
       npm install
       npm run dev

6. Test
   - Open http://localhost:5173 in your browser
   - Click Login -> then click the Google Login button
   - Choose your Google account. You should now be logged in and redirected to /dashboard.
