import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { startWebServer } from './webServer';
import { writeOutput } from './outputRouter';
import { OutputChannelEnum } from '../enums/OutputChannelEnum';

export function runGCCommand(port: number = 3000, rootDir: string = process.cwd()): void {
  const targetUrl = `http://localhost:${port}`;

  // Ensure Web Server is active
  try {
    startWebServer({ port, rootDir });
  } catch {
    // Server already running
  }

  const platform = process.platform;
  let chromePath: string | null = null;
  let launchCommand: string = '';

  // 1. Detect Operating System and locate Google Chrome binary
  if (platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || '';
    const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

    const candidates = [
      path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    ];

    for (const cand of candidates) {
      if (fs.existsSync(cand)) {
        chromePath = cand;
        break;
      }
    }

    if (chromePath) {
      launchCommand = `"${chromePath}" "${targetUrl}"`;
    } else {
      launchCommand = `cmd.exe /c start "" "${targetUrl}"`;
    }
  } else if (platform === 'darwin') {
    const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    if (fs.existsSync(macChrome)) {
      chromePath = macChrome;
      launchCommand = `"${macChrome}" "${targetUrl}"`;
    } else {
      launchCommand = `open "${targetUrl}"`;
    }
  } else if (platform === 'linux') {
    const linuxCandidates = ['/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium'];
    for (const cand of linuxCandidates) {
      if (fs.existsSync(cand)) {
        chromePath = cand;
        break;
      }
    }

    if (chromePath) {
      launchCommand = `"${chromePath}" "${targetUrl}"`;
    } else {
      launchCommand = `xdg-open "${targetUrl}"`;
    }
  } else {
    launchCommand = `open "${targetUrl}"`;
  }

  writeOutput(OutputChannelEnum.USER_REPLY, `🌐 [Google Chrome] Opening iNoU Web UI at ${targetUrl}...`);
  writeOutput(
    OutputChannelEnum.DEBUG,
    `[OS Detection] Platform: ${platform} | Chrome Detected: ${chromePath ? chromePath : 'System Default Browser'}`,
    3
  );

  exec(launchCommand, (err: any) => {
    if (err) {
      writeOutput(OutputChannelEnum.DEBUG, `[GC Command Error] ${err.message}`, 3);
    } else {
      writeOutput(OutputChannelEnum.DEBUG, `[GC Command Success] Executed: ${launchCommand}`, 3);
    }
  });
}
