#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

// Read .ROBLOSECURITY cookie from file
const COOKIE_FILE = '.ROBLOSECURITY';
function getCookie() {
  if (!fs.existsSync(COOKIE_FILE)) {
    console.error(`❌ Cookie file "${COOKIE_FILE}" not found. Please login first.`);
    process.exit(1);
  }
  return fs.readFileSync(COOKIE_FILE, 'utf8').trim();
}

// Roblox API base URLs
const GROUPS_API = 'https://groups.roblox.com/v1';
const ASSET_API = 'https://apis.roblox.com/asset-delivery/v1';

// Helper: Get user ID from cookie
async function getUserId(cookie) {
  try {
    const res = await axios.get('https://users.roblox.com/v1/users/authenticated', {
      headers: { Cookie: `.ROBLOSECURITY=${cookie}` },
    });
    return res.data.id;
  } catch (err) {
    console.error('Failed to get authenticated user ID:', err.response?.data || err.message);
    process.exit(1);
  }
}

// Group check function
async function checkGroupMembership(userId, groupId, cookie) {
  try {
    const url = `${GROUPS_API}/users/${userId}/groups/roles`;
    const res = await axios.get(url, {
      headers: { Cookie: `.ROBLOSECURITY=${cookie}` },
    });
    const groups = res.data.data;
    const isMember = groups.some(g => g.group.id === groupId);
    console.log(`User ${userId} is ${isMember ? '' : 'NOT '}a member of group ${groupId}`);
  } catch (err) {
    console.error('Group membership check failed:', err.response?.data || err.message);
  }
}

// Upload asset function (supports Audio, Model, Mesh, Plugin, etc.)
async function uploadAsset({ filePath, assetType, name, description }, cookie) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  // Roblox asset type IDs (simplified common ones)
  // See: https://create.roblox.com/docs/resources/asset-api/upload-assets
  const assetTypeMap = {
    Audio: 3,
    Mesh: 4,
    Plugin: 6,
    Model: 7,
    Image: 13,
    Lua: 18,
    TShirt: 8,
    Shirt: 11,
    Pants: 12,
    Decal: 13,
  };

  const assetTypeId = assetTypeMap[assetType];
  if (!assetTypeId) {
    console.error(`❌ Unsupported asset type "${assetType}". Supported: ${Object.keys(assetTypeMap).join(', ')}`);
    process.exit(1);
  }

  console.log(`📤 Preparing to upload ${assetType} asset from file: ${filePath}`);

  try {
    // Step 1: Get upload URL
    const uploadInfoRes = await axios.post(
      'https://develop.roblox.com/v1/assets/upload',
      {
        assetTypeId,
        name,
        description,
      },
      {
        headers: {
          Cookie: `.ROBLOSECURITY=${cookie}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const { uploadUrl, assetId, uploadTicket } = uploadInfoRes.data;

    if (!uploadUrl || !uploadTicket) {
      console.error('❌ Failed to get upload URL or ticket.');
      process.exit(1);
    }

    console.log('✅ Upload URL and ticket received.');

    // Step 2: Upload file to provided upload URL with form data
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    const uploadRes = await axios.post(uploadUrl, form, {
      headers: {
        ...form.getHeaders(),
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    if (!(uploadRes.status >= 200 && uploadRes.status < 300)) {
      console.error('❌ Upload failed:', uploadRes.status, uploadRes.statusText);
      process.exit(1);
    }

    console.log('✅ File uploaded successfully.');

    // Step 3: Confirm upload with Roblox
    const confirmRes = await axios.post(
      `https://develop.roblox.com/v1/assets/${assetId}/upload-tickets/${uploadTicket}/complete`,
      {},
      {
        headers: {
          Cookie: `.ROBLOSECURITY=${cookie}`,
        },
      }
    );

    if (!(confirmRes.status >= 200 && confirmRes.status < 300)) {
      console.error('❌ Upload confirmation failed:', confirmRes.status, confirmRes.statusText);
      process.exit(1);
    }

    console.log(`🎉 Asset uploaded successfully! Asset ID: ${assetId}`);

  } catch (err) {
    console.error('❌ Upload error:', err.response?.data || err.message);
    process.exit(1);
  }
}

// CLI setup with yargs
yargs(hideBin(process.argv))
  .command(
    'group-check',
    'Check if a user is a member of a Roblox group',
    (yargs) => {
      yargs
        .option('user', {
          describe: 'Roblox user ID to check',
          type: 'number',
          demandOption: false,
        })
        .option('group', {
          describe: 'Roblox group ID to check',
          type: 'number',
          demandOption: true,
        });
    },
    async (argv) => {
      const cookie = getCookie();
      let userId = argv.user;
      if (!userId) {
        // get authenticated user id if user not specified
        userId = await getUserId(cookie);
      }
      await checkGroupMembership(userId, argv.group, cookie);
    }
  )
  .command(
    'upload-asset',
    'Upload an asset to Roblox',
    (yargs) => {
      yargs
        .option('file', {
          describe: 'Path to asset file',
          type: 'string',
          demandOption: true,
        })
        .option('type', {
          describe: 'Asset type (Audio, Model, Mesh, Plugin, Image, etc.)',
          type: 'string',
          demandOption: true,
        })
        .option('name', {
          describe: 'Asset name',
          type: 'string',
          demandOption: true,
        })
        .option('description', {
          describe: 'Asset description',
          type: 'string',
          demandOption: false,
          default: '',
        });
    },
    async (argv) => {
      const cookie = getCookie();
      await uploadAsset(
        {
          filePath: argv.file,
          assetType: argv.type,
          name: argv.name,
          description: argv.description,
        },
        cookie
      );
    }
  )
  .demandCommand(1, 'You need to specify a command.')
  .help()
  .strict()
  .parse();
