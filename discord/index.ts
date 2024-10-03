/// <reference path="./presence.d.ts" />
import WebSocket from 'ws';

export class Activity {
    private name: string;
    private type: number;
    private details?: string;
    private state?: string;
    private largeImage?: string;
    private largeText?: string;
    private smallImage?: string;
    private smallText?: string;
    private start?: number;
    private end?: number;

    constructor(name: string, type: number) {
        this.name = name;
        this.type = type;
    }

    setDetails(details: string): Activity {
        this.details = details;
        return this;
    }

    setState(state: string): Activity {
        this.state = state;
        return this;
    }

    setLargeImage(url: string, text?: string): Activity {
        this.largeImage = url;
        this.largeText = text;
        return this;
    }

    setSmallImage(url: string, text?: string): Activity {
        this.smallImage = url;
        this.smallText = text;
        return this;
    }

    setTimestamps(start: number, end: number): Activity {
        this.start = start;
        this.end = end;
        return this;
    };

    toJSON() {
        return {
            name: this.name,
            type: this.type,
            details: this.details,
            timestamps: {
                start: this.start,
                end: this.end
            },
            state: this.state,
            created_at: Date.now(),
            assets: {
                large_image: this.largeImage,
                large_text: this.largeText,
                small_image: this.smallImage,
                small_text: this.smallText
            }
        } as IActivityTemplate;
    }
}

class WebSocketManager {

    private ws: WebSocket | null = null;
    private id: string = '';
    private tries: number = 0;
    private events: { [key: string]: Array<(...args: any[]) => void> } = {};


    constructor(client_id: string) {
        this.id = client_id;
    }

    async connect() {
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

        this.ws.onmessage = this.onmessage.bind(this);

    }

    private onopen() {
        console.log("WebSocket connection opened.");
        this.tries = 0; // Reset tries on successful connection
        console.log("Event 'ready' emitted");
        this.emit('ready');
    }
    
    private onclose(event: WebSocket.CloseEvent) {
        console.log(`WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason}, Clean: ${event.wasClean}`);
        this.emit('close', event);
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

    private onmessage(event: WebSocket.MessageEvent) {
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

    public close() {
        if (this.ws?.readyState !== WebSocket.OPEN) return;
        console.log("Closing WebSocket connection");
        this.ws.close();
    }
    
    public on(event: string, listener: (...args: any[]) => void) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);
        console.log(`Listener added for event '${event}'`);
    }

    private emit(event: string, ...args: any[]) {
        if (this.events[event]) {
            console.log(`Emitting event '${event}' with args:`, args);
            this.events[event].forEach(listener => listener(...args));
        }
    }
}

export class DiscordActivity {//1286301146281021440
    private ws: WebSocketManager;
    private activity: IActivityTemplate;
    private events: { [key: string]: Array<(...args: any[]) => void> } = {};

    constructor(id: string = "1286301146281021440") {
        this.ws = new WebSocketManager(id);
        this.activity = {} as IActivityTemplate;
        this.connect();
    }

    private connect() {
        this.ws.connect();
        this.ws.on('ready', () => {
            console.log("Event 'ready' emitted");
            this.emit('ready');
        });
    
        this.ws.on('message', (message: any) => {
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
        this.ws.send(data);
    }

    public setActivity(activity: Activity) {
        this.activity = activity.toJSON();
    
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

    public on(event: string, listener: (...args: any[]) => void) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);
        console.log(`Listener added for event '${event}'`);
    }
    
    private emit(event: string, ...args: any[]) {
        if (this.events[event]) {
            console.log(`Emitting event '${event}' with args:`, args);
            this.events[event].forEach(listener => listener(...args));
        }
    }

    private uuidv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    public stopConnection() {
        if (this.ws) {
            this.ws.close();
        }
    }
}