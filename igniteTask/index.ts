import tl = require('azure-pipelines-task-lib/task');
import { v4 as uuidv4 } from 'uuid';
import * as net from "net"
import * as process from 'process'
import { ToolRunner } from 'azure-pipelines-task-lib/toolrunner';
import * as path from 'path';
import { debuglog } from 'util';
import { exit } from 'process';

enum MessageType {
    None = 0,
    Error = 1,
    Progress = 2,
    
}

function WriteStringToPipe(value: string, socket: net.Socket) {
    var buffer = stringToByteArray(value);
    WriteNumberToPipe(buffer.length, socket);
    socket.write(buffer);
}

function ReadNumberFromPipe(buffer: Buffer) {
    return buffer.readInt32LE();
}
function WriteNumberToPipe(value: number, socket: net.Socket) {
    socket.write(numberToBytesArray(value));
}

function stringToByteArray(value: string): Buffer {
    const result = Buffer.from(value, 'utf16le'); 
    return result;
}

function completeMessage(socket: net.Socket) {
    WriteNumberToPipe(0xF0000002, socket)
    WriteNumberToPipe(4, socket)
    WriteNumberToPipe(0, socket)
}

function numberToBytesArray (num: number): Uint8Array {
    const arr = new ArrayBuffer(4); // an Int32 takes 4 bytes
    const view = new DataView(arr);
    view.setUint32(0, num, true); // byteOffset = 0; littleEndian = false
    return new Uint8Array(arr);
}

function processProgressMessage(buffer: Buffer): number {
    return buffer.readInt32LE(8);
}

function processErrorMessage(buffer: Buffer) {
    const length = buffer.readInt32LE();
    const errorMessage = buffer.toString("utf16le", 4, (length*2)+4);
    tl.error(errorMessage)
}

async function executeBundle(bundlePath: string, commandLineParameters: string|undefined, logFile: string): Promise<number> {
    const pipeSecret = uuidv4().toString();
    var pipeName = `bpe_${process.pid}`;
    var pipePath = `\\\\.\\pipe\\${pipeName}`;

    tl.debug("starting listener")
    var server = net.createServer();

    server.on("connection", socket => {
        console.log("Sending secret through pipeline")
        WriteStringToPipe(pipeSecret, socket);
        WriteNumberToPipe(process.pid, socket);
        
        let hasClientIdBeenReceived = false;
        let lastProgress = 0;
        socket.on("data", buffer => {
            if (!hasClientIdBeenReceived) {
                // We'll ignore the PID from the child process. I think, this security measure doesn't work any longer since the clean room was introduced.
                hasClientIdBeenReceived = true;
                return;
            }
            const messageType = <MessageType> buffer.readUInt32LE();
            switch (messageType) {
                case MessageType.Error: {
                    processErrorMessage(buffer);
                    break;
                }
                case MessageType.Progress: 
                    const progress = processProgressMessage(buffer);
                    if (progress !== lastProgress) {
                        tl.setProgress(progress, "Installing bundle");
                        lastProgress = progress;
                    }
                    break;
            }
            
            completeMessage(socket);   
        });
        
    });
    server.listen(pipePath);

    let bundleTool: ToolRunner = tl.tool(bundlePath);
    bundleTool.argIf(commandLineParameters, commandLineParameters)
    bundleTool.arg("-passive")
    bundleTool.arg("-log")
    bundleTool.arg(logFile)
    bundleTool.arg("-burn.embedded");
    bundleTool.arg(pipeName);
    bundleTool.arg(pipeSecret)
    bundleTool.arg(process.pid.toString())


    try {
        return await bundleTool.exec({ignoreReturnCode: true});
    }
    finally {
        server.close();
    }
}

function attachLogs(path: string) {
    tl.debug(`Finding logs in ${path}`)
    const files = tl.findMatch(path, "*.log");
    files.forEach(element => {
        tl.uploadFile(element)
        tl.uploadBuildLog
    });
}

async function run() {
    try {
        const bundlePath = tl.getInput('bundlePath', true);
        const commandLineParameters: string | undefined = tl.getInput("commandLineParameters")
        const alwaysAttachLogFiles = tl.getBoolInput("alwaysAttachLogfiles", false);
        if (!bundlePath) throw new Error("Parameter bundlePath not set.")

        const tempPath =  tl.getVariable("Agent.TempDirectory");
        if (!tempPath) throw new Error("Agent.TempDirectory not set.")
        const logFile = path.join(tempPath, uuidv4(), path.basename(bundlePath, path.extname(bundlePath)) + ".log");
        tl.debug(`Log file is ${logFile}`)

        const exitCode = await executeBundle(bundlePath, commandLineParameters, logFile);
        tl.debug(`Exit code is ${exitCode}`);

        if (exitCode !== 0 || alwaysAttachLogFiles) {
            attachLogs(path.dirname(logFile));
        }
        if (exitCode == 0) {
            tl.setResult(tl.TaskResult.Succeeded, "Bundle installed successfully.", true);
            return;
        }
        
        tl.setResult(tl.TaskResult.Failed, `Bundle failed with error ${exitCode}`, true);
    }
    catch (err) {
        tl.debug("Exception.")
        tl.setResult(tl.TaskResult.Failed, err.message);
    }
}

run();