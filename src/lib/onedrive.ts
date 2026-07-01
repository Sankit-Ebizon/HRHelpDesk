export interface OneDriveUploadResult {
  itemId: string;
  webUrl: string;
}

export function isOneDriveConfigured(): boolean {
  return Boolean(
    process.env.MICROSOFT_TENANT_ID &&
      process.env.MICROSOFT_CLIENT_ID &&
      process.env.MICROSOFT_CLIENT_SECRET &&
      process.env.ONEDRIVE_USER_ID
  );
}

async function getGraphAccessToken(): Promise<string | null> {
  const tenantId = process.env.MICROSOFT_TENANT_ID;
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  if (!tenantId || !clientId || !clientSecret) return null;

  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });

  if (!res.ok) {
    console.error("OneDrive token request failed:", await res.text());
    return null;
  }

  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

export async function uploadBufferToOneDrive(options: {
  buffer: Buffer;
  fileName: string;
  ticketNumber: string;
  contentType?: string;
}): Promise<OneDriveUploadResult | null> {
  if (!isOneDriveConfigured()) return null;

  const userId = process.env.ONEDRIVE_USER_ID!;
  const folder = (process.env.ONEDRIVE_FOLDER || "HRHelpDesk/Attachments").replace(/^\/+|\/+$/g, "");
  const safeName = options.fileName.replace(/[^\w.-]/g, "_");
  const drivePath = `${folder}/${options.ticketNumber}/${Date.now()}-${safeName}`;
  const encodedPath = drivePath.split("/").map(encodeURIComponent).join("/");

  const token = await getGraphAccessToken();
  if (!token) return null;

  const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userId)}/drive/root:/${encodedPath}:/content`;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": options.contentType || "application/octet-stream",
    },
    body: new Uint8Array(options.buffer),
  });

  if (!res.ok) {
    console.error("OneDrive upload failed:", await res.text());
    return null;
  }

  const data = (await res.json()) as { id?: string; webUrl?: string };
  if (!data.id || !data.webUrl) return null;

  return { itemId: data.id, webUrl: data.webUrl };
}
