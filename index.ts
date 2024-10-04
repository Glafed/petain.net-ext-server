/// <reference path="./discord/presence.d.ts" />
import WebSocket from 'ws';
//import DiscordRPC from 'discord-rpc';
import { DiscordActivity } from './discord';

const port: number = 1488 | 35654;
var server: WebSocket.Server;

//var rpc: DiscordRPC.Client = new DiscordRPC.Client({ transport: 'ipc' });

var startServer: () => void = () => { };

var AskActivity: () => void = () => { };

/*rpc.on('ready', () => {
    console.log('Discord RPC is ready');
});*/

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

var activity_manager = new DiscordActivity();

function SetActivity(activity: IActivityArgs = {} as IActivityArgs, reset: boolean = true) {

    /*rpc.request("SET_ACTIVITY", {
        pid: process.pid,
        activity: reset ? null : activity
    }).then(() => {

        console.log("Activity set");
    }).catch((e) => console.error(e))*/
}

/*async function connect(clientId: string): Promise<void> {
    const maxRetries = 5;
    let attempts = 0;

    while (attempts < maxRetries) {
        try {
            if (rpc._connectPromise) {
                return rpc._connectPromise;
            }
            rpc._connectPromise = new Promise((resolve, reject) => {
                rpc.clientId = clientId;
                const timeout = setTimeout(() => reject(new Error('RPC_CONNECTION_TIMEOUT')), 10e3);
                timeout.unref();
                rpc.once('connected', () => {
                    clearTimeout(timeout);
                    resolve(rpc);
                });
                rpc.transport.once('close', () => {
                    rpc._expecting.forEach((e) => {
                        e.reject(new Error('connection closed'));
                    });
                    rpc.emit('disconnected');
                    reject(new Error('connection closed'));
                });
                rpc.transport.connect().catch(reject);
            });
            await rpc._connectPromise;
            rpc.emit('ready');
            console.log("Connected to Discord RPC");
            return;
        } catch (error) {
            attempts++;
            console.error(`Failed to connect to Discord RPC (Attempt ${attempts}/${maxRetries}):`, error);
            if (attempts < maxRetries) {
                console.log(`Retrying in 5 seconds...`);
                await delay(5000);
            } else {
                console.error("Max retries reached. Could not connect to Discord RPC.");
                process.exit(0);
            }
        }
    }
}*/


startServer = () => {

    console.log("Starting WebSocket server...");

    server = new WebSocket.Server({ port: port });

    server.on('connection', (ws: WebSocket) => {
        console.log("New client connected");

        function AskActivity() {
            console.log("Asking for activity...");
            ws.send(JSON.stringify({ event: 'ASK_ACTIVITY' }));
        };

        AskActivity();

        var isAlive: boolean = true;

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
            try {

                //console.log(`Received message: ${message}`);

                var data = JSON.parse(message);

                //console.log(data.activity);

                switch (data.state) {
                    case true: activity_manager.setActivity(data.activity); break;
                    case false: activity_manager.resetActivity(); break;
                }

                ws.send(JSON.stringify({ status_code: '200', message: 'OK' }));
            } catch (error: any) {
                console.error(`Failed to process message: ${error.message}`);
                ws.send(JSON.stringify({ status_code: '400', message: 'Bad Request' }));
            }
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

}

function restartServer() {
    try {
        console.log("Closing server...");
        server.close();

        startServer();
        //connect("1286301146281021440");
    } catch (error: any) {
        console.error(`Failed to restart server: ${error.message}`);
    }
}

/*function connectRPC(retries: number = 10, delay: number = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
        const attemptConnection = (attempt: number) => {
            if (attempt > retries) {
                return reject(new Error("Failed to connect to Discord RPC"));
            }

            rpc.login({ clientId: "1286301146281021440" }).then(() => {
                console.log("Connected to Discord RPC");
                resolve();
            }).catch((error) => {
                console.error(`Failed to connect to Discord RPC: ${error.message}`);
                setTimeout(() => attemptConnection(attempt + 1), delay);
            });
        };

        attemptConnection(1);
    });
}*/

activity_manager.on('disconnected', () => {
    console.log('Discord RPC disconnected');
    restartServer();
});

activity_manager.on('ready', startServer)
//startServer();
//connect('1286301146281021440');
//connectRPC();