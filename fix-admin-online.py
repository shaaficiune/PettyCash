#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════╗
║       PETTY CASH — ONLINE SERVER ADMIN FIX SCRIPT               ║
║  Automatically connects to the server and fixes admin login      ║
║  Usage: python fix-admin-online.py                               ║
╚══════════════════════════════════════════════════════════════════╝
"""

import subprocess
import sys

# ─────────────────────────────────────────────────────────
#  ⚙️  CONFIGURATION — Wax ka beddel meelahan keliya
# ─────────────────────────────────────────────────────────
SERVER_HOST = ""          # Example: "192.168.1.100" ama "myserver.com"
SERVER_USER = "ubuntu"    # SSH username (badanaa 'ubuntu' ama 'root')
SERVER_PORT = 22          # SSH port (default 22)
SSH_KEY     = ""          # Path to SSH key file, ama "" haddaad password isticmaashid
                          # Example: r"C:\Users\Shafi\.ssh\id_rsa"

APP_DIR     = ""          # Full path of app on server
                          # Example: "/home/ubuntu/petty-cash"

NEW_ADMIN_PASSWORD = "Admin@2026"   # Password cusub ee admin
# ─────────────────────────────────────────────────────────


def check_ssh_available():
    try:
        subprocess.run(["ssh", "-V"], capture_output=True, text=True)
        return True
    except FileNotFoundError:
        return False


def build_ssh_command(remote_command):
    ssh_args = ["ssh", "-o", "StrictHostKeyChecking=no", "-p", str(SERVER_PORT)]
    if SSH_KEY:
        ssh_args += ["-i", SSH_KEY]
    ssh_args.append(f"{SERVER_USER}@{SERVER_HOST}")
    ssh_args.append(remote_command)
    return ssh_args


def run_ssh(description, remote_command, ignore_error=False):
    print(f"\n  {description}...")
    cmd = build_ssh_command(remote_command)
    result = subprocess.run(cmd, text=True)
    if result.returncode != 0 and not ignore_error:
        print(f"   Warning: exit code {result.returncode}")
    return result.returncode


def validate_config():
    errors = []
    if not SERVER_HOST:
        errors.append("SERVER_HOST waa eber — ku geli IP-ga ama domain-ka server-ka")
    if not APP_DIR:
        errors.append("APP_DIR waa eber — ku geli jidka app-ka (tusaale: /home/ubuntu/petty-cash)")
    return errors


def main():
    print()
    print("=" * 58)
    print("  PETTY CASH — ONLINE SERVER ADMIN FIX")
    print("=" * 58)

    errors = validate_config()
    if errors:
        print("\n  CONFIGURATION NEEDED — Fur fix-admin-online.py oo wax ka beddel:")
        for e in errors:
            print(f"   - {e}")
        print()
        print("  Tusaale:")
        print('    SERVER_HOST = "196.223.12.45"')
        print('    SERVER_USER = "ubuntu"')
        print('    APP_DIR     = "/home/ubuntu/petty-cash"')
        print()
        sys.exit(1)

    if not check_ssh_available():
        print("\n  SSH lama helin. Isticmaal Git Bash ama terminal kale.")
        sys.exit(1)

    print(f"\n  Connecting  : {SERVER_USER}@{SERVER_HOST}:{SERVER_PORT}")
    print(f"  App Dir     : {APP_DIR}")
    print(f"  New Password: {NEW_ADMIN_PASSWORD}")

    # Inline Node.js reset script — no file upload needed
    reset_js = (
        "node -e \""
        "const path=require('path');"
        "require('dotenv').config({path:'" + APP_DIR + "/backend/.env'});"
        "const {PrismaClient}=require('@prisma/client');"
        "const bcrypt=require('bcryptjs');"
        "const prisma=new PrismaClient();"
        "bcrypt.hash('" + NEW_ADMIN_PASSWORD + "',10)"
        ".then(hash=>prisma.user.update({"
        "where:{username:'admin'},"
        "data:{passwordHash:hash,status:'ACTIVE',failedLoginAttempts:0,lockoutUntil:null,lockoutStage:0,resetPasswordRequired:false}"
        "}))"
        ".then(u=>{console.log('SUCCESS admin reset:',u.username,'status:',u.status);return prisma.$disconnect();})"
        ".catch(e=>{console.error('ERROR:',e.message);process.exit(1);});"
        "\""
    )

    steps = [
        ("Step 1/4  Checking PM2 status",
         "pm2 list 2>/dev/null || echo 'PM2 not found'",
         True),
        ("Step 2/4  Resetting admin password + unlocking",
         f"cd {APP_DIR}/backend && {reset_js}",
         False),
        ("Step 3/4  Restarting backend with fresh env",
         "pm2 restart petty-cash-backend --update-env 2>/dev/null || pm2 restart all --update-env 2>/dev/null || echo 'done'",
         True),
        ("Step 4/4  Final PM2 status",
         "pm2 list 2>/dev/null",
         True),
    ]

    ok = 0
    for desc, cmd, ignore in steps:
        code = run_ssh(desc, cmd, ignore_error=ignore)
        if code == 0 or ignore:
            ok += 1

    print()
    print("=" * 58)
    if ok == len(steps):
        print("  ALL STEPS DONE!")
    else:
        print(f"  Completed {ok}/{len(steps)} steps")
    print("=" * 58)
    print()
    print("  Login credentials:")
    print(f"   Username : admin")
    print(f"   Password : {NEW_ADMIN_PASSWORD}")
    print()


if __name__ == "__main__":
    main()
