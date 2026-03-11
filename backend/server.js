const express = require('express');
const cors = require('cors');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

const TEMP_DIR = path.join(__dirname, 'temp');

if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR);
}

app.post('/execute', async (req, res) => {
    const { language, code, stdin } = req.body;
    const id = uuidv4();
    const folderPath = path.join(TEMP_DIR, id);
    fs.mkdirSync(folderPath);

    let fileName = '';
    let runCommand = '';
    let compileCommand = '';

    switch (language.toLowerCase()) {
        case 'python':
        case 'python3':
            fileName = 'main.py';
            runCommand = `python -u ${fileName}`;
            break;
        case 'javascript':
        case 'node':
        case 'js':
            fileName = 'main.js';
            runCommand = `node ${fileName}`;
            break;
        case 'c':
            fileName = 'main.c';
            compileCommand = `gcc ${fileName} -o main`;
            runCommand = process.platform === 'win32' ? 'main.exe' : './main';
            break;
        case 'cpp':
        case 'c++':
            fileName = 'main.cpp';
            compileCommand = `g++ ${fileName} -o main`;
            runCommand = process.platform === 'win32' ? 'main.exe' : './main';
            break;
        case 'java':
            fileName = 'Main.java';
            compileCommand = `javac ${fileName}`;
            runCommand = `java Main`;
            break;
        default:
            return res.status(400).json({ error: 'Unsupported language' });
    }

    const filePath = path.join(folderPath, fileName);
    fs.writeFileSync(filePath, code);

    const execute = () => {
        return new Promise((resolve) => {
            const child = spawn(runCommand, {
                shell: true,
                cwd: folderPath
            });

            let stdout = '';
            let stderr = '';

            if (stdin) {
                child.stdin.write(stdin);
                child.stdin.end();
            }

            child.stdout.on('data', (data) => stdout += data.toString());
            child.stderr.on('data', (data) => stderr += data.toString());

            child.on('close', (code) => {
                resolve({ stdout, stderr, exitCode: code });
            });

            // Timeout after 10 seconds
            setTimeout(() => {
                child.kill();
                resolve({ stdout, stderr: stderr + '\nExecution Timed Out', exitCode: 1 });
            }, 10000);
        });
    };

    try {
        if (compileCommand) {
            exec(compileCommand, { cwd: folderPath }, async (error, stdout, stderr) => {
                if (error) {
                    res.json({ compile_output: stderr || error.message, status: { description: 'Compilation Error' } });
                    // Clean up
                    fs.rmSync(folderPath, { recursive: true, force: true });
                } else {
                    const result = await execute();
                    res.json({ 
                        stdout: result.stdout, 
                        stderr: result.stderr, 
                        status: { description: result.exitCode === 0 ? 'Accepted' : 'Runtime Error' } 
                    });
                    // Clean up
                    fs.rmSync(folderPath, { recursive: true, force: true });
                }
            });
        } else {
            const result = await execute();
            res.json({ 
                stdout: result.stdout, 
                stderr: result.stderr, 
                status: { description: result.exitCode === 0 ? 'Accepted' : 'Runtime Error' } 
            });
            // Clean up
            fs.rmSync(folderPath, { recursive: true, force: true });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
        fs.rmSync(folderPath, { recursive: true, force: true });
    }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Runner server listening on port ${PORT}`));
