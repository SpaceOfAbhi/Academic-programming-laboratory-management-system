const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const fsPromises = fs.promises;
const { spawn, exec } = require('child_process');
const { v4: uuidv4 } = require('uuid');

// Optimization: Disable hardware acceleration as it can cause freezes on some Windows GPUs
app.disableHardwareAcceleration();

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

app.whenReady().then(async () => {
    await ensureTempDir();
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

const TEMP_DIR = path.join(app.getAppPath(), 'temp_runs');

async function ensureTempDir() {
    try {
        await fsPromises.mkdir(TEMP_DIR, { recursive: true });
    } catch (e) {
        // Directory might already exist
    }
}

// Track active child processes
let activeProcess = null;

ipcMain.handle('execute-code', async (event, { language, code, stdin }) => {
    // Kill any existing process before starting a new one
    if (activeProcess) {
        try { 
            activeProcess.kill('SIGKILL'); 
        } catch (e) {}
        activeProcess = null;
    }

    const runId = uuidv4();
    const folderPath = path.join(TEMP_DIR, runId);
    
    try {
        await fsPromises.mkdir(folderPath, { recursive: true });
    } catch (e) {
        return { error: `Failed to create temp directory: ${e.message}` };
    }

    let fileName = '';
    let baseCommand = '';
    let commandArgs = [];
    let compileCommand = '';

    const langLower = language.toLowerCase();
    if (langLower.includes('python')) {
        fileName = 'program.py';
        baseCommand = 'python';
        commandArgs = ['-u', fileName];
    } else if (langLower.includes('cpp') || langLower.includes('c++')) {
        fileName = 'program.cpp';
        compileCommand = `g++ ${fileName} -o program`;
        baseCommand = process.platform === 'win32' ? path.join(folderPath, 'program.exe') : './program';
    } else if (langLower.includes('java')) {
        fileName = 'Program.java';
        compileCommand = `javac ${fileName}`;
        baseCommand = 'java';
        commandArgs = ['Program'];
    } else if (langLower === 'c') {
        fileName = 'program.c';
        compileCommand = `gcc ${fileName} -o program`;
        baseCommand = process.platform === 'win32' ? path.join(folderPath, 'program.exe') : './program';
    } else if (langLower.includes('js') || langLower.includes('node')) {
        fileName = 'program.js';
        baseCommand = 'node';
        commandArgs = [fileName];
    } else {
        return { error: `Unsupported language: ${language}` };
    }

    const filePath = path.join(folderPath, fileName);
    try {
        await fsPromises.writeFile(filePath, code);
    } catch (e) {
        return { error: `Failed to write source file: ${e.message}` };
    }

    return new Promise((resolve) => {
        let isFinalized = false;
        let stdoutBuffer = "";
        let stderrBuffer = "";
        let flushInterval = null;

        const flushBuffers = () => {
            if (stdoutBuffer) {
                event.sender.send('terminal-out', stdoutBuffer);
                stdoutBuffer = "";
            }
            if (stderrBuffer) {
                event.sender.send('terminal-err', stderrBuffer);
                stderrBuffer = "";
            }
        };

        const finalize = async (result) => {
            if (isFinalized) return;
            isFinalized = true;
            activeProcess = null;

            if (flushInterval) clearInterval(flushInterval);
            flushBuffers(); // Final flush

            // Asynchronous cleanup
            setTimeout(async () => {
                try {
                    const stats = await fsPromises.stat(folderPath).catch(() => null);
                    if (stats && stats.isDirectory()) {
                        await fsPromises.rm(folderPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 1000 });
                    }
                } catch (err) { /* ignore */ }
            }, 3000);
            
            resolve(result);
        };

        // Start flushing buffers every 50ms to prevent IPC flooding
        flushInterval = setInterval(flushBuffers, 50);

        const runExecution = () => {
            try {
                const child = spawn(baseCommand, commandArgs, {
                    cwd: folderPath,
                    stdio: ['pipe', 'pipe', 'pipe']
                });

                activeProcess = child;

                let stdoutAccumulator = '';
                let stderrAccumulator = '';

                if (stdin) {
                    try { child.stdin.write(stdin); } catch (e) {}
                }

                child.stdout.on('data', (data) => {
                    const chunk = data.toString();
                    stdoutAccumulator += chunk;
                    stdoutBuffer += chunk; // For throttled IPC
                });

                child.stderr.on('data', (data) => {
                    const chunk = data.toString();
                    stderrAccumulator += chunk;
                    stderrBuffer += chunk; // For throttled IPC
                });

                child.on('close', (exitCode) => {
                    finalize({ stdout: stdoutAccumulator, stderr: stderrAccumulator, exitCode });
                });

                child.on('error', (err) => {
                    finalize({ stdout: stdoutAccumulator, stderr: stderrAccumulator + `\nExecution Error: ${err.message}`, exitCode: 1 });
                });

                // 60 second timeout
                setTimeout(() => {
                    if (activeProcess === child && !isFinalized) {
                        child.kill('SIGKILL');
                        finalize({ stdout: stdoutAccumulator, stderr: stderrAccumulator + '\n[Execution Timed Out]', exitCode: 1 });
                    }
                }, 60000);

            } catch (spawnErr) {
                finalize({ error: spawnErr.message, exitCode: 1 });
            }
        };

        if (compileCommand) {
            exec(compileCommand, { cwd: folderPath }, (error, stdout, stderr) => {
                if (error) {
                    const errMsg = stderr || error.message;
                    event.sender.send('terminal-err', `[Compilation Error]\n${errMsg}\n`);
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
        } catch (e) {}
    }
});

// ─── Groq API handler (main process — no CORS/CSP restrictions) ───
const https = require('https');

function groqRequest(apiKey, model, body) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'api.groq.com',
            path: '/openai/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'Content-Length': Buffer.byteLength(body)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                resolve({ statusCode: res.statusCode, body: data });
            });
        });

        req.on('error', (e) => resolve({ statusCode: 0, body: '', networkError: e.message }));
        req.write(body);
        req.end();
    });
}

// Groq models to try
const GROQ_MODELS = [
    'llama-3.1-70b-versatile',
    'llama-3.3-70b-versatile',
    'llama3-70b-8192',
    'mixtral-8x7b-32768'
];

ipcMain.handle('call-ai', async (event, { apiKey, prompt }) => {
    const bodyStr = JSON.stringify({
        model: GROQ_MODELS[0], // Will be updated in loop
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
    });

    for (const model of GROQ_MODELS) {
        // Try each model with a retry for rate limits
        for (let attempt = 0; attempt < 1; attempt++) {
            const currentBody = JSON.parse(bodyStr);
            currentBody.model = model;
            const body = JSON.stringify(currentBody);

            const result = await groqRequest(apiKey, model, body);

            if (result.networkError) {
                return { error: 'Network error: ' + result.networkError };
            }

            if (result.statusCode === 200) {
                try {
                    const parsed = JSON.parse(result.body);
                    return { text: parsed.choices[0].message.content };
                } catch (e) {
                    return { error: 'Failed to parse response: ' + e.message };
                }
            }

            if (result.statusCode === 429) {
                console.log(`[Groq] ${model} rate limited, trying next...`);
                event.sender.send('ai-status', `Rate limited on ${model}. Trying next model...`);
                break; // Try next model immediately for better responsiveness
            }

            if (result.statusCode !== 200) {
                console.log(`[Groq] ${model} error ${result.statusCode}: ${result.body}`);
            }
        }
    }

    return { error: 'AI evaluation failed on all available models. Please check your API key or try again later.' };
});
