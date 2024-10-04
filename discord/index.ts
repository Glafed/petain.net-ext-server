/// <reference path="./presence.d.ts" />
import WebSocket from 'ws';
import net from 'net';
import EventEmitter from 'events';

enum EConnectionType {
    IPC = 0,
    WebSocket
}

class WebSocketManager extends EventEmitter {

    private ws: WebSocket | null = null;
    private id: string = '';
    private tries: number = 0;


    constructor(client_id: string) {
        super();
        this.id = client_id;
    }

    public async connect() {
        var port: number = 6463 + (this.tries % 10);
        this.tries++;

        this.ws = new WebSocket(`ws://localhost:${port}/?v=1&client_id=${this.id}&encoding=json`, {
            headers: {
                'Origin': `http://localhost:${1488 |
                    35654}`
            }
        });

        this.ws.onopen = this.onopen.bind(this);

        this.ws.onclose = this.onclose.bind(this);

        this.ws.onerror = this.onerror.bind(this);

        this.ws.onmessage = this.handleMessage.bind(this);

    }

    private onopen() {
        console.log("WebSocket connection opened.");
        this.tries = 0; // Reset tries on successful connection
        console.log("Event 'ready' emitted");
        this.emit('ready');
    }

    private onclose(event: WebSocket.CloseEvent) {
        console.log(`WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason}, Clean: ${event.wasClean}`);
        this.emit('disconnect', event);
        if (this.tries < 10) {
            setTimeout(() => {
                this.connect();
            }, 500);
        } else {
            console.error("Max reconnect attempts reached. Giving up.");
        }
    }

    private onerror(event: WebSocket.Event) {
        console.error("WebSocket error:", event);
        this.emit('error', event);
        this.ws?.close();
    }

    private handleMessage(event: WebSocket.MessageEvent) {
        console.log("WebSocket message received:", event.data);
        var message = JSON.parse(event.data.toString());
        console.log("Parsed message:", message);
        this.emit('message', message);
    }

    public send(data: any) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            console.log("Sending data:", data);
            this.ws.send(JSON.stringify(data));
        } else {
            console.error("WebSocket is not open. Cannot send data.");
        }
    }

    public disconnect() {
        if (this.ws?.readyState !== WebSocket.OPEN) return;
        console.log("Closing WebSocket connection");
        this.ws.close();
    }
}

class IPCManager extends EventEmitter {
    private clientId: string;
    private ipcPath: string;
    private socket: net.Socket | null = null;
    private tries: number = 0;

    constructor(clientId: string) {
        super();
        this.clientId = clientId;
        this.ipcPath = this.getIPCPath();
    }

    private getIPCPath(): string {
        const platform = process.platform;
        if (platform === 'win32') {
            return `\\\\?\\pipe\\discord-ipc-0`;
        } else {
            const { env } = process;
            const prefix = env.XDG_RUNTIME_DIR || env.TMPDIR || env.TMP || env.TEMP || '/tmp';
            return `${prefix}/discord-ipc-0`;
        }
    }

    public connect(): void {
        this.socket = net.createConnection(this.ipcPath, () => {
            console.log('Connected to Discord IPC');
            this.emit('ready');
            this.sendHandshake();
        });

        this.socket.on('data', (data: Buffer) => {
            this.handleMessage(data);
        });

        this.socket.on('close', () => {
            console.log('Disconnected from Discord IPC');
            this.emit('disconnected');
            this.retryConnection();
        });

        this.socket.on('error', (error: Error) => {
            if (error.message.includes('ECONNREFUSED')) {
                console.error('Discord is not running. Please start Discord and try again.');
            } else {
                console.error('Error with Discord IPC connection:', error);
            }
            this.emit('error', error);
            this.retryConnection();
        });
    }

    private retryConnection(): void {
        if (this.tries < 10) {
            this.tries++;
            console.log(`Retrying connection in ${5000 / 1000} seconds... (Attempt ${this.tries}/10)`);
            setTimeout(() => this.connect(), 5000);
        } else {
            console.error('Max retries reached. Could not connect to Discord IPC.');
        }
    }

    private sendHandshake(): void {
        const handshake = {
            v: 1,
            client_id: this.clientId
        };
        this.send(handshake, 0);
    }

    public send(payload: object, opcode: number = 1): void {
        const data = JSON.stringify(payload);
        const length = Buffer.byteLength(data);
        const packet = Buffer.alloc(8 + length);
        packet.writeInt32LE(opcode, 0);
        packet.writeInt32LE(length, 4);
        packet.write(data, 8, length);
        this.socket?.write(packet);
    }

    private handleMessage(data: Buffer): void {
        const opcode = data.readInt32LE(0);
        const length = data.readInt32LE(4);
        const message = data.toString('utf8', 8, 8 + length);
        const payload = JSON.parse(message);
        this.emit('message', opcode, payload);
    }

    public disconnect(): void {
        if (this.socket) {
            this.socket.end();
        }
    }
}
export class DiscordActivity extends EventEmitter {//1286301146281021440
    private server: WebSocketManager | IPCManager;
    private activity: IActivityTemplate;

    constructor(connection: EConnectionType = 0, id: string = "1286301146281021440") {
        super();
        switch (connection) {
            case EConnectionType.IPC:
                console.log("Using IPC connection");
                this.server = new IPCManager(id);
                break;
            case EConnectionType.WebSocket:
                console.log("Using WebSocket connection");
                this.server = new WebSocketManager(id);
                break;
        }
        this.activity = {} as IActivityTemplate;
        this.connect();
    }

    private connect() {
        this.server.connect();
        this.server.on('ready', () => {
            console.log("Event 'ready' emitted");
            this.emit('ready');
        });

        this.server.on('message', (message: any) => {
            console.log("WebSocket message received:", message);
            if (message.cmd === 'SET_ACTIVITY' && message.evt === 'SUCCESS') {
                console.log("Event 'activitySet' emitted");
                this.emit('activitySet');
            }
        });

    }

    private send(args: IActivityArgs) {
        var data = {
            cmd: 'SET_ACTIVITY',
            args,
            nonce: this.uuidv4()
        }
        console.log("Sending data:", data);
        this.server.send(data);
    }

    public setActivity(activity: Object) {

        this.activity = activity as IActivityTemplate;

        var args: IActivityArgs = {
            pid: process.pid,
            activity: this.activity
        };

        console.log("Setting activity:", this.activity);
        this.send(args);
    }

    public resetActivity() {
        var args: IActivityArgs = {
            pid: process.pid,
        };

        console.log("Resetting activity");
        this.send(args);
    }

    private uuidv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    public stopConnection() {
        if (this.server) {
            this.server.disconnect();
        }
    }
}