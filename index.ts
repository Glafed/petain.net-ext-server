/// <reference path="./discord/presence.d.ts" />
import WebSocket from 'ws';
import DiscordRPC from 'discord-rpc';
//import { DiscordActivity, Activity } from './discord';

const port: number = 1488 | 35654;
const server = new WebSocket.Server({ port });

var rpc: DiscordRPC.Client = new DiscordRPC.Client({ transport: 'ipc' });

rpc.login({ clientId: "1286301146281021440"})

rpc.on('ready', () => {
    console.log('Discord RPC is ready');
});

//var activity_manager = new DiscordActivity();

function ResetActivity() {
    
}

function SetActivity(activity: IActivityArgs = {} as IActivityArgs, reset:boolean = true) {
   
    rpc.request("SET_ACTIVITY", {
        pid: process.pid,
        activity: reset ? null : activity
    }).then(() => {
        console.log("Activity set");
    }).catch((e) => {

        console.error(e);

    })
}

server.on('connection', (ws: WebSocket) => {
    console.log("New client connected");

    var isAlive:boolean = true;

    const interval = setInterval(function ping() {
        server.clients.forEach(function each(ws) {
            if (isAlive === false) return ws.terminate();
    
            isAlive = false;
            ws.ping();
        });
    }, 25000);

    function heartbeat() {
        isAlive = true;
    }

    ws.on('pong', heartbeat);

    ws.on('message', (message: string) => {
        //console.log(`Received message: ${message}`);

        var data = JSON.parse(message);
        
        switch(data.state){
            case true: SetActivity(data.activity, false); break;
            case false: SetActivity(); break;
        }

        ws.send(JSON.stringify({ status_code: '200', message: 'OK' }));
    });

    ws.on('close', (code: number, reason: string) => {
        console.log(`Client disconnected. Code: ${code}, Reason: ${reason}`);
        clearInterval(interval);
    });

    ws.on('error', (error: Error) => {
        console.error(`WebSocket error: ${error.message}`);
        clearInterval(interval);
    });
    ws.send(JSON.stringify({ status_code: '1488', message: "Connected" }));
});

console.log(`WebSocket server is running on ws://localhost:${port}`);