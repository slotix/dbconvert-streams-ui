# Google Cloud Storage HMAC Keys Setup

This guide explains how to create HMAC (Hash-based Message Authentication Code) keys for Google Cloud Storage. These keys enable S3-compatible access to GCS buckets, which is required for DBConvert Streams.

## Prerequisites

- A Google Cloud Platform account
- A GCS bucket created (e.g., `dbconvert-streams-test`)
- Appropriate permissions (Storage Admin or Owner role)

## Step 1: Access Cloud Storage Settings

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **Cloud Storage** → **Settings**
3. Click on the **Interoperability** tab

   Direct link: https://console.cloud.google.com/storage/settings;tab=interoperability

![Cloud Storage Settings](screenshots/gcs-interoperability-tab.png)

## Step 2: Create a Service Account (if needed)

If you don't have a service account yet:

1. Go to **IAM & Admin** → **Service Accounts**
2. Click **+ Create Service Account**
3. Enter a name (e.g., `dbconvert-streams-sa`)
4. Click **Create and Continue**
5. Assign the **Storage Object Admin** role (or **Storage Admin** for full access)
6. Click **Done**

## Step 3: Create HMAC Keys

1. In the **Interoperability** tab, scroll to **Access keys for service accounts**
2. Click **Create a key for a service account**
3. Select your service account from the dropdown
4. Click **Create**

![Create HMAC Key](screenshots/gcs-create-hmac-key.png)

## Step 4: Save Your Keys

After creation, you'll see:

| Field          | Description                                               |
| -------------- | --------------------------------------------------------- |
| **Access Key** | A string starting with `GOOG1E...` (use as Access Key ID) |
| **Secret**     | A base64-encoded string (use as Secret Access Key)        |

> ⚠️ **Important**: Copy the **Secret** immediately! It will only be shown once and cannot be retrieved later.

Store these credentials securely. You can use a password manager or secure vault.

## Step 5: Configure DBConvert Streams

In the DBConvert Streams UI, create a new S3 connection with these settings:

| Setting               | Value                                                            |
| --------------------- | ---------------------------------------------------------------- |
| **Provider Preset**   | Google Cloud Storage                                             |
| **Access Key ID**     | Your HMAC Access Key (`GOOG1E...`)                               |
| **Secret Access Key** | Your HMAC Secret                                                 |
| **Region**            | `auto` (or leave default)                                        |
| **Endpoint**          | `storage.googleapis.com` (auto-filled)                           |
| **Bucket**            | Your bucket name (e.g., `dbconvert-streams-test`) - **Required** |

> ⚠️ **Important**: Google Cloud Storage **requires a bucket name** for connection testing. Unlike AWS S3, GCS doesn't support the `ListBuckets` operation via the S3 interoperability API.

## Permissions Reference

For DBConvert Streams to work with GCS, the service account needs these permissions:

### Minimum Permissions (Read/Write)
- `storage.objects.create`
- `storage.objects.delete`
- `storage.objects.get`
- `storage.objects.list`
- `storage.buckets.get`

### Recommended Role
- **Storage Object Admin** (`roles/storage.objectAdmin`) - for object operations
- **Storage Admin** (`roles/storage.admin`) - for full bucket and object access

## Managing HMAC Keys

### View Existing Keys
1. Go to **Cloud Storage** → **Settings** → **Interoperability**
2. Scroll to **Access keys for service accounts**
3. View all active keys and their creation dates

### Delete a Key
1. Find the key in the list
2. Click the **Delete** (trash) icon
3. Confirm deletion

> **Note**: Deleting a key immediately revokes access for any application using it.

### Rotate Keys
For security best practices, rotate your HMAC keys periodically:

1. Create a new HMAC key
2. Update DBConvert Streams connection with new credentials
3. Verify the connection works
4. Delete the old key

## Troubleshooting

### "Access Denied" Error
- Verify the service account has the correct IAM roles
- Check that the HMAC key is active (not deleted)
- Ensure the bucket name is correct

### "Invalid Credentials" Error
- Double-check the Access Key ID and Secret
- Ensure no extra spaces were copied
- Verify you're using HMAC keys, not JSON service account keys

### "Bucket Not Found" Error
- Confirm the bucket exists in your project
- Check the bucket name spelling
- Verify the service account has access to the bucket

## Additional Resources

- [Google Cloud Storage Interoperability](https://cloud.google.com/storage/docs/interoperability)
- [HMAC Keys for Service Accounts](https://cloud.google.com/storage/docs/authentication/hmackeys)
- [IAM Roles for Cloud Storage](https://cloud.google.com/storage/docs/access-control/iam-roles)
