# Lampd

Lampd is a Linux desktop app that helps you manage local development services from a simple dashboard.

If you are new to Linux and often feel lost with commands like `systemctl`, `journalctl`, `apt`, `dnf`, or `pacman`, Lampd is designed to make those tasks easier.

With Lampd, you can:

- see whether a development service is running or not
- start, stop, restart, enable, or disable services
- read service logs without opening a terminal
- install missing services
- install specific PHP versions
- switch between PHP-FPM versions when more than one version is installed

## Supported Services

Lampd currently focuses on common Linux development services:

- Apache
- Nginx
- MySQL
- PHP-FPM
- PostgreSQL
- Docker
- Podman

## Who Is Lampd For?

Lampd is a good fit for:

- beginner Linux developers
- Ubuntu, Debian, Fedora, or Arch users
- PHP, Laravel, or WordPress developers
- developers who want to manage services without memorizing terminal commands
- anyone who wants quick access to service logs and status

## What Can Lampd Do?

### 1. Manage Linux Services

For each supported service, Lampd can:

- `Start`
- `Stop`
- `Restart`
- `Enable`
- `Disable`

### 2. Show Service Status

Lampd shows whether a service is:

- running
- stopped
- unavailable / not installed
- enabled at boot or not

### 3. View Logs

Lampd includes a built-in log panel so you can inspect service output in real time.

This is useful for things like:

- finding out why Apache failed to start
- checking PHP-FPM errors
- inspecting PostgreSQL logs
- reviewing Docker service output without leaving the app

### 4. Install Missing Services

If a service is not installed, Lampd can show:

- the correct install command for your Linux distribution
- an option to copy the command
- an option to run the install directly from the app, when supported

### 5. Install a Specific PHP Version

For `PHP-FPM`, Lampd supports installing specific PHP versions.

Examples include:

- PHP 5.6
- PHP 7.4
- PHP 8.1
- PHP 8.2
- PHP 8.3
- PHP 8.4
- PHP 8.5

Lampd also labels the support level for each version, such as:

- `Ready`
- `Needs Repo`
- `Legacy`

### 6. Switch PHP-FPM Versions

If you have more than one PHP-FPM version installed, Lampd can help you switch between them.

Behavior:

- the selected PHP version is started
- other active PHP-FPM versions are stopped automatically
- logs follow the newly active version

This is especially useful when different projects require different PHP versions.

## Why Lampd Exists

Linux development often depends on terminal commands. That is powerful, but it can be intimidating for beginners.

Common problems include:

- forgetting the correct systemd service name
- not knowing how to check logs
- confusion around package names across distributions
- not knowing whether a service failed to start or is simply not installed
- managing multiple PHP versions by hand

Lampd aims to solve that with a desktop UI that is easier to understand.

## How Lampd Works

In simple terms:

- the frontend shows a dashboard
- the Rust backend talks to your Linux system
- Lampd uses `systemctl` to control services
- Lampd uses `journalctl` to read logs
- Lampd adjusts install commands based on your Linux distribution

Lampd is not a replacement for Linux tools. It is a simpler interface on top of the tools that already exist.

## Supported Linux Distributions

For installation features, Lampd currently focuses on:

- Ubuntu / Debian
- Fedora
- Arch Linux

Distribution detection is automatic.

## PHP Install Support Levels

When installing PHP versions, Lampd uses three labels:

- `Ready`
  This version is relatively reasonable to install on the current distribution.

- `Needs Repo`
  This version may require an additional repository.

- `Legacy`
  This is an older version and may be harder to install or no longer available in standard repositories.

This helps set the right expectations before you run an install.

## Requirements

Before running Lampd, make sure you have:

- Linux
- `systemd`
- Node.js installed
- Rust installed
- Tauri Linux dependencies available

## Tauri Linux Dependencies

On Ubuntu or Debian, you will usually need:

```bash
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```

If you use Fedora or Arch, you will need equivalent packages for your distribution.

## Run in Development Mode

```bash
npm install
npm run tauri dev
```

## Build the App

```bash
npm run tauri build
```

Typical build output includes:

- `.deb`
- `AppImage`

## Example Beginner Workflows

### Example 1: Apache Is Not Installed

1. Open Lampd
2. Find the `Apache` card
3. Notice the status says `Not Installed`
4. Click `Install`
5. Choose either:
   - `Copy Command`
   - `Run Install`
6. After installation, refresh the service list
7. Click `Start`

### Example 2: Install Another PHP Version

1. Open the `PHP-FPM` card
2. Click `Install Version`
3. Choose the version you want
4. Review the support label and command preview
5. Copy the command or run the install directly
6. Once installed, the new version will appear in the PHP version switcher

### Example 3: A Service Will Not Start

1. Click `Logs` on the service card
2. Read the latest output
3. Use the log messages to understand the failure

## Current Limitations

Lampd still has some limitations:

- it does not switch the default `php` CLI binary
- it does not rewrite Apache or Nginx config for a selected PHP version
- some older PHP versions may require additional repositories
- package names and service names may still vary by distribution
- direct installation depends on `pkexec` if you want to run installs from inside the app

## Tech Stack

- React
- Vite
- TypeScript
- Tailwind CSS
- Zustand
- Rust
- Tauri
- systemd (`systemctl`, `journalctl`)

## Tips for Beginners

If a button or action fails, the cause is usually one of these:

- the service is not installed
- the system needs elevated permissions
- the package manager is locked by another process
- your distribution requires an additional repository
- the service unit name is different on your system

If you are unsure where to start, do this:

1. check the service status in Lampd
2. open the logs
3. see whether the service is `Not Installed`, `Stopped`, or `Error`

## Main Goal

Lampd has one simple goal:

> make Linux development service management easier, especially for people who are not yet comfortable living in the terminal.

## License

MIT
