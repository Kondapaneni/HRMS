# How to Restore the Acme Chats Module

If you ever need to restore the Acme Chats module that was permanently deleted, follow these steps to bring it back using your database backup and Git history.

## 1. Restore the Database Tables & Columns

We created a backup of the `chats`, `chat_participants`, and `chat_messages` tables before deleting them. We also dropped the `canChat` access column.

1. Locate the backup file: `chat_backup/chat_backup_2026_08_06_151001.sql` (found in your `Acme HRMS` folder).
2. Run this SQL file against your PostgreSQL database to recreate the tables and insert all the previous data. 
   - You can run this via your database client (like DBeaver or pgAdmin) or via the command line: `psql -U your_user -d your_db -f chat_backup_2026_08_06_151001.sql`
3. Add the `canChat` column back to the feature access table by running this SQL command:
   ```sql
   ALTER TABLE user_feature_access ADD COLUMN "canChat" boolean DEFAULT false;
   ```

## 2. Restore the Supabase Storage Bucket

Since the `chat_attachments` bucket was deleted from Supabase:
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Navigate to **Storage**.
3. Create a new bucket named exactly `chat_attachments`. Ensure it is set to **Public**.

## 3. Restore Deleted Backend Files via Git

Since the project uses Git, you can simply restore the deleted files from your repository history.

1. Restore the Chat Routes:
   ```bash
   git restore backend/public/chat_routes.php
   ```
2. Restore the Chat Encryption Utility:
   ```bash
   git restore backend/src/Utils/ChatEncryption.php
   ```

## 4. Restore Deleted Frontend Files via Git

Restore the frontend chat components:

```bash
git restore frontend/src/pages/Chat.jsx
git restore frontend/src/pages/EmployeeMobileChat.jsx
```

## 5. Revert File Modifications

You will also need to revert the removals we made in the following files to re-add imports, routes, and navigation items. You can use Git to check out the versions of these files prior to this deletion:

* **`backend/public/index.php`**: Re-add `require __DIR__ . '/chat_routes.php';`, the `Chat-Attachment` reverse proxy route, and add `canChat` back to the `$user['featureAccess']` SQL queries and arrays.
* **`backend/public/admin_feature_access_routes.php`**: Re-add `canChat` to the SQL queries and `$validFeatures` array.
* **`backend/public/admin_employees_routes.php`**: Re-add `'chat'` to the `AuthMiddleware` allowed routes array.
* **`backend/public/.htaccess`**: Re-add `Chat-Attachment` to the API `RewriteRule`.
* **`frontend/vite.config.js`**: Re-add the `/Chat-Attachment` proxy block.
* **`frontend/src/App.jsx`**: Re-add the routes `/employee/chat/mobile`, `/admin/chat`, and `/employee/chat`.
* **`frontend/src/components/AdminLayout.jsx`**: Re-add the Secure Chat navigation item, `useQuery` for chat data, and unread notification bell.
* **`frontend/src/components/EmployeeLayout.jsx`**: Re-add the Secure Chat item to Business Apps, `useQuery`, and the notification bells.
* **`frontend/src/pages/EmployeeMobileDashboard.jsx`**: Re-add the `canChat` checks and the 'Open Mobile Chat' link in the Business Apps section.
* **`frontend/src/components/ProtectedRoute.jsx`**: Re-add the `canChat` checks for the routing logic.
* **`frontend/src/pages/AdminFeatureAccess.jsx`**: Re-add the `canChat` feature to the available access list.
* **`frontend/src/index.css`**: Restore the `.chat-scrollbar` classes (we renamed it to `.custom-scrollbar`).

If you need to do this in the future, you can simply run `git checkout HEAD~1` (or whichever commit precedes this deletion) or ask an AI assistant to "Restore the chat feature using the git history and the provided SQL backup" and we can handle it for you.
