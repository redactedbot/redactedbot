#!/usr/bin/env node

import fs from "fs";
import path from "path";
import axios from "axios";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const COOKIE_PATH = path.resolve(".ROBLOSECURITY");

if (!fs.existsSync(COOKIE_PATH)) {
  console.error("❌ .ROBLOSECURITY cookie file not found! Run login.js first.");
  process.exit(1);
}

const ROBLOSECURITY = fs.readFileSync(COOKIE_PATH, "utf8").trim();

const api = axios.create({
  baseURL: "https://www.roblox.com",
  headers: {
    cookie: `.ROBLOSECURITY=${ROBLOSECURITY}`,
    "User-Agent": "Mozilla/5.0 (CLI Roblox Tool)",
    "Content-Type": "application/json",
  },
});

async function userInfo({ username, userid }) {
  try {
    let url;
    if (username) {
      // get userId from username
      const res = await api.get(
        `https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(
          username
        )}&limit=1`
      );
      if (!res.data.data || res.data.data.length === 0)
        throw new Error("User not found.");
      userid = res.data.data[0].id;
    }

    if (!userid) throw new Error("Provide --username or --userid");

    const res = await api.get(`https://users.roblox.com/v1/users/${userid}`);
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error("Error:", err.message);
  }
}

async function userFriends({ userid }) {
  try {
    if (!userid) throw new Error("--userid is required");
    const res = await api.get(
      `https://friends.roblox.com/v1/users/${userid}/friends`
    );
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error("Error:", err.message);
  }
}

async function userFriendsCheck({ userid1, userid2 }) {
  try {
    if (!userid1 || !userid2)
      throw new Error("--userid1 and --userid2 are required");
    const res = await api.get(
      `https://friends.roblox.com/v1/users/${userid1}/friends/${userid2}`
    );
    console.log(
      `Are users friends? ${res.data.isFriend ? "Yes" : "No"}`
    );
  } catch (err) {
    console.error("Error:", err.message);
  }
}

async function groupCheck({ group, user }) {
  try {
    if (!group || !user) throw new Error("--group and --user are required");
    const res = await api.get(
      `https://groups.roblox.com/v1/users/${user}/groups/roles`
    );
    const isMember = res.data.data.some((g) => g.group.id == group);
    if (!isMember) {
      console.log(`User ${user} is NOT in group ${group}`);
      return;
    }
    const groupInfo = res.data.data.find((g) => g.group.id == group);
    console.log(
      `User ${user} is in group ${group} with role: ${groupInfo.role.name} (Rank ${groupInfo.role.rank})`
    );
  } catch (err) {
    console.error("Error:", err.message);
  }
}

async function groupRoles({ group, user }) {
  try {
    if (!group) throw new Error("--group is required");

    if (user) {
      // Get user's role in the group
      const res = await api.get(
        `https://groups.roblox.com/v1/users/${user}/groups/roles`
      );
      const groupRole = res.data.data.find((g) => g.group.id == group);
      if (!groupRole) {
        console.log(`User ${user} is NOT in group ${group}`);
        return;
      }
      console.log(
        `User ${user} role in group ${group}: ${groupRole.role.name} (Rank ${groupRole.role.rank})`
      );
    } else {
      // List all roles in group
      const res = await api.get(
        `https://groups.roblox.com/v1/groups/${group}/roles`
      );
      console.log(JSON.stringify(res.data.roles, null, 2));
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

async function groupInvite({ group, user }) {
  try {
    if (!group || !user) throw new Error("--group and --user are required");

    // Roblox API for invites requires CSRF token, simulate this:
    const csrf = await getCsrfToken();
    const res = await api.post(
      `https://groups.roblox.com/v1/groups/${group}/users/${user}/invite`,
      {},
      { headers: { "X-CSRF-TOKEN": csrf } }
    );
    console.log("Invite sent:", res.data);
  } catch (err) {
    console.error("Error:", err.response?.data || err.message);
  }
}

async function groupListRoles({ group }) {
  try {
    if (!group) throw new Error("--group is required");
    const res = await api.get(`https://groups.roblox.com/v1/groups/${group}/roles`);
    console.log(JSON.stringify(res.data.roles, null, 2));
  } catch (err) {
    console.error("Error:", err.message);
  }
}

async function groupWallPosts({ group }) {
  try {
    if (!group) throw new Error("--group is required");
    const res = await api.get(
      `https://groups.roblox.com/v1/groups/${group}/wall/posts?limit=10`
    );
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error("Error:", err.message);
  }
}

async function assetUpload({ type, file, name, description }) {
  try {
    if (!type || !file) throw new Error("--type and --file required");
    if (!fs.existsSync(file)) throw new Error("File does not exist");

    const fileBuffer = fs.readFileSync(file);
    // NOTE: This is a simplified example. The real Roblox asset upload process is complex.
    // Here we upload a decal via Roblox asset upload endpoint as an example.

    if (type.toLowerCase() !== "decal") {
      console.warn(
        "Currently only 'decal' upload is implemented in this example."
      );
    }

    // Get CSRF token
    const csrf = await getCsrfToken();

    // Step 1: Upload the file to Roblox (this is an example endpoint for decals)
    const uploadRes = await api.post(
      "https://www.roblox.com/asset/upload",
      fileBuffer,
      {
        headers: {
          "Content-Type": "application/octet-stream",
          "X-CSRF-TOKEN": csrf,
        },
        maxBodyLength: Infinity,
      }
    );

    console.log("Upload response:", uploadRes.data);
    console.log("⚠️ NOTE: This is a stub — real Roblox asset upload requires multi-step process.");

  } catch (err) {
    console.error("Error:", err.response?.data || err.message);
  }
}

async function assetInfo({ assetid }) {
  try {
    if (!assetid) throw new Error("--assetid required");
    const res = await api.get(`https://api.roblox.com/marketplace/productinfo?assetId=${assetid}`);
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error("Error:", err.message);
  }
}

async function assetDelete({ assetid }) {
  try {
    if (!assetid) throw new Error("--assetid required");

    // Get CSRF token
    const csrf = await getCsrfToken();

    const res = await api.post(
      `https://www.roblox.com/asset/delete-from-inventory`,
      { assetId: assetid },
      { headers: { "X-CSRF-TOKEN": csrf } }
    );
    console.log("Delete response:", res.data);
  } catch (err) {
    console.error("Error:", err.response?.data || err.message);
  }
}

async function assetSetInfo({ assetid, name, description }) {
  try {
    if (!assetid) throw new Error("--assetid required");

    // Get CSRF token
    const csrf = await getCsrfToken();

    const body = {};
    if (name) body.name = name;
    if (description) body.description = description;

    if (Object.keys(body).length === 0)
      throw new Error("Specify at least --name or --description");

    const res = await api.post(
      `https://www.roblox.com/asset/set-info`,
      { assetId: assetid, ...body },
      { headers: { "X-CSRF-TOKEN": csrf } }
    );
    console.log("Set info response:", res.data);
  } catch (err) {
    console.error("Error:", err.response?.data || err.message);
  }
}

async function assetUploadStatus({ uploadid }) {
  try {
    if (!uploadid) throw new Error("--uploadid required");
    const res = await api.get(
      `https://www.roblox.com/asset/upload/status?uploadId=${uploadid}`
    );
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error("Error:", err.message);
  }
}

async function bulkUpload({ manifest }) {
  try {
    if (!manifest) throw new Error("--manifest is required");
    if (!fs.existsSync(manifest)) throw new Error("Manifest file not found");
    const json = JSON.parse(fs.readFileSync(manifest, "utf8"));
    for (const asset of json.assets) {
      console.log(`Uploading ${asset.file} as ${asset.type}...`);
      await assetUpload(asset);
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

// Helper: Get Roblox CSRF token (required for POST requests)
async function getCsrfToken() {
  try {
    const res = await api.post("https://auth.roblox.com/v2/logout");
    const csrf = res.headers["x-csrf-token"];
    if (!csrf) throw new Error("CSRF token not found");
    api.defaults.headers["X-CSRF-TOKEN"] = csrf;
    return csrf;
  } catch (err) {
    if (err.response && err.response.status === 403) {
      const csrf = err.response.headers["x-csrf-token"];
      if (!csrf) throw new Error("CSRF token not found");
      api.defaults.headers["X-CSRF-TOKEN"] = csrf;
      return csrf;
    }
    throw err;
  }
}

yargs(hideBin(process.argv))
  .command(
    "user-info",
    "Get Roblox user info by username or userId",
    (y) =>
      y.option("username", {
        type: "string",
        describe: "Roblox username",
      }).option("userid", {
        type: "number",
        describe: "Roblox user ID",
      }),
    userInfo
  )
  .command(
    "user-friends",
    "List friends of a Roblox user by userId",
    (y) =>
      y.option("userid", {
        type: "number",
        demandOption: true,
        describe: "User ID",
      }),
    userFriends
  )
  .command(
    "user-friends-check",
    "Check friendship status between two users",
    (y) =>
      y
        .option("userid1", {
          type: "number",
          demandOption: true,
          describe: "User ID 1",
        })
        .option("userid2", {
          type: "number",
          demandOption: true,
          describe: "User ID 2",
        }),
    userFriendsCheck
  )
  .command(
    "group-check",
    "Check if a user is in a group and show their role",
    (y) =>
      y
        .option("group", {
          type: "number",
          demandOption: true,
          describe: "Group ID",
        })
        .option("user", {
          type: "number",
          demandOption: true,
          describe: "User ID",
        }),
    groupCheck
  )
  .command(
    "group-roles",
    "Get user's role in group or list all roles",
    (y) =>
      y
        .option("group", {
          type: "number",
          demandOption: true,
          describe: "Group ID",
        })
        .option("user", {
          type: "number",
          describe: "User ID",
        }),
    groupRoles
  )
  .command(
    "group-invite",
    "Send group invite to a user",
    (y) =>
      y
        .option("group", {
          type: "number",
          demandOption: true,
          describe: "Group ID",
        })
        .option("user", {
          type: "number",
          demandOption: true,
          describe: "User ID",
        }),
    groupInvite
  )
  .command(
    "group-list-roles",
    "List all roles in a group",
    (y) =>
      y.option("group", {
        type: "number",
        demandOption: true,
        describe: "Group ID",
      }),
    groupListRoles
  )
  .command(
    "group-wall-posts",
    "Get latest wall posts from a group",
    (y) =>
      y.option("group", {
        type: "number",
        demandOption: true,
        describe: "Group ID",
      }),
    groupWallPosts
  )
  .command(
    "asset-upload",
    "Upload an asset file (only decal stub currently)",
    (y) =>
      y
        .option("type", {
          type: "string",
          demandOption: true,
          describe: "Asset type (e.g., decal)",
        })
        .option("file", {
          type: "string",
          demandOption: true,
          describe: "Path to file",
        })
        .option("name", {
          type: "string",
          describe: "Asset name",
        })
        .option("description", {
          type: "string",
          describe: "Asset description",
        }),
    assetUpload
  )
  .command(
    "asset-info",
    "Get asset info by assetId",
    (y) =>
      y.option("assetid", {
        type: "number",
        demandOption: true,
        describe: "Asset ID",
      }),
    assetInfo
  )
  .command(
    "asset-delete",
    "Delete an asset you own by assetId",
    (y) =>
      y.option("assetid", {
        type: "number",
        demandOption: true,
        describe: "Asset ID",
      }),
    assetDelete
  )
  .command(
    "asset-set-info",
    "Update asset name and/or description",
    (y) =>
      y
        .option("assetid", {
          type: "number",
          demandOption: true,
          describe: "Asset ID",
        })
        .option("name", {
          type: "string",
          describe: "New asset name",
        })
        .option("description", {
          type: "string",
          describe: "New asset description",
        }),
    assetSetInfo
  )
  .command(
    "asset-upload-status",
    "Check upload status by uploadId",
    (y) =>
      y.option("uploadid", {
        type: "string",
        demandOption: true,
        describe: "Upload ID",
      }),
    assetUploadStatus
  )
  .command(
    "bulk-upload",
    "Bulk upload assets from manifest JSON file",
    (y) =>
      y.option("manifest", {
        type: "string",
        demandOption: true,
        describe: "Path to manifest JSON file",
      }),
    bulkUpload
  )
  .demandCommand(1, "You need to specify a command")
  .strict()
  .help()
  .parse();
