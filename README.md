# Roblox CLI Tool

A command-line interface tool to interact with Roblox APIs using your `.ROBLOSECURITY` cookie.  
Manage user info, friends, groups, and upload/manage assets directly from your terminal.

---

## Features

- Get Roblox user info by username or user ID  
- List user friends and check friendship status  
- Check if a user is a member of a group and their role  
- List group roles and invite users to groups  
- View recent group wall posts  
- Upload assets (currently supports decal stub)  
- Get asset info, update asset info, delete assets  
- Check asset upload status  
- Bulk upload assets using a JSON manifest file  

---

## Requirements

- Node.js (v16+ recommended)  
- `.ROBLOSECURITY` cookie saved in the project root (see **Login** below)  
- Internet connection  

---

## Setup

1. Clone or download this repository.  
2. Run `npm install` to install dependencies (`axios`, `yargs`).  
3. Obtain your `.ROBLOSECURITY` cookie and save it to a file named `.ROBLOSECURITY` in the root directory.  
   - You can use the provided `login.js` script or obtain it manually from your browser.  

---

## Usage

Run commands with:

```bash
node cli.js <command> [options]
