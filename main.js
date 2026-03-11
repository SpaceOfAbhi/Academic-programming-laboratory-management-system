const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');
const { v4: uuidv4 } = require('uuid');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    mainWindow.loadFile('pages/index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

const TEMP_DIR = path.join(app.getAppPath(), 'temp_runs');
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Track active child processes
let activeProcess = null;

ipcMain.handle('execute-code', async (event, { language, code, stdin }) => {
    // Kill any existing process before starting a new one
    if (activeProcess) {
        try { activeProcess.kill('SIGKILL'); } catch (e) {}
        activeProcess = null;
    }

    const runId = uuidv4();
    const folderPath = path.join(TEMP_DIR, runId);
    
    try {
        fs.mkdirSync(folderPath, { recursive: true });
    } catch (e) {
        return { error: `Failed to create temp directory: ${e.message}` };
    }

    let fileName = '';
    let runCommand = '';
    let compileCommand = '';

    const langLower = language.toLowerCase();
    if (langLower.includes('python')) {
        fileName = 'program.py';
        runCommand = `python -u ${fileName}`;
    } else if (langLower.includes('cpp') || langLower.includes('c++')) {
        fileName = 'program.cpp';
        compileCommand = `g++ ${fileName} -o program`;
        runCommand = process.platform === 'win32' ? 'program.exe' : './program';
    } else if (langLower.includes('java')) {
        fileName = 'Program.java';
        compileCommand = `javac ${fileName}`;
        runCommand = `java Program`;
    } else if (langLower === 'c') {
        fileName = 'program.c';
        compileCommand = `gcc ${fileName} -o program`;
        runCommand = process.platform === 'win32' ? 'program.exe' : './program';
    } else if (langLower.includes('js') || langLower.includes('node')) {
        fileName = 'program.js';
        runCommand = `node ${fileName}`;
    } else {
        return { error: `Unsupported language: ${language}` };
    }

    const filePath = path.join(folderPath, fileName);
    try {
        fs.writeFileSync(filePath, code);
    } catch (e) {
        return { error: `Failed to write source file: ${e.message}` };
    }

    return new Promise((resolve) => {
        let isFinalized = false;
        
        const finalize = (result) => {
            if (isFinalized) return;
            isFinalized = true;
            activeProcess = null;
            
            // Non-blocking cleanup with longer delay to avoid EBUSY on Windows
            setTimeout(() => {
                try {
                    if (fs.existsSync(folderPath)) {
                        fs.rmSync(folderPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 1000 });
                    }
                } catch (err) {
                    // Silently ignore cleanup errors to prevent process exit
                }
            }, 5000);
            
            resolve(result);
        };

        const runExecution = () => {
            try {
                const child = spawn(runCommand, {
                    shell: true,
                    cwd: folderPath,
                    stdio: ['pipe', 'pipe', 'pipe']
                });

                activeProcess = child;

                let stdout = '';
                let stderr = '';

                if (stdin) {
                    try { child.stdin.write(stdin); } catch (e) {}
                }

                child.stdout.on('data', (data) => {
                    const chunk = data.toString();
                    stdout += chunk;
                    event.sender.send('terminal-out', chunk);
                });

                child.stderr.on('data', (data) => {
                    const chunk = data.toString();
                    stderr += chunk;
                    event.sender.send('terminal-err', chunk);
                });

                child.on('close', (exitCode) => {
                    finalize({ stdout, stderr, exitCode });
                });

                child.on('error', (err) => {
                    event.sender.send('terminal-err', `Execution Error: ${err.message}`);
                    finalize({ stdout, stderr: stderr + err.message, exitCode: 1 });
                });

                // 60 second timeout for long labs
                setTimeout(() => {
                    if (activeProcess === child && !isFinalized) {
                        child.kill('SIGKILL');
                        finalize({ stdout, stderr: stderr + '\n[Execution Timed Out]', exitCode: 1 });
                    }
                }, 60000);

            } catch (spawnErr) {
                event.sender.send('terminal-err', `Spawn Error: ${spawnErr.message}`);
                finalize({ error: spawnErr.message, exitCode: 1 });
            }
        };

        if (compileCommand) {
            exec(compileCommand, { cwd: folderPath }, (error, stdout, stderr) => {
                if (error) {
                    const errMsg = stderr || error.message;
                    event.sender.send('terminal-err', `[Compilation Error]\n${errMsg}`);
                    finalize({ compile_output: errMsg, exitCode: 1 });
                } else {
                    runExecution();
                }
            });
        } else {
            runExecution();
        }
    });
});

ipcMain.on('send-stdin', (event, text) => {
    if (activeProcess && activeProcess.stdin && activeProcess.stdin.writable) {
        try {
            activeProcess.stdin.write(text);
        } catch (e) {
            // Stdin write errors are usually due to process already closed
        }
    }
});
