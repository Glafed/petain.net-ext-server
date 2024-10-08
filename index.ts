/// <reference path="./discord/presence.d.ts" />
import WebSocket from 'ws';
import { DiscordActivity } from './discord';

const port: number = 1488 | 35654;
var serverRunning = false;
var server: WebSocket.Server;

var stopServer: () => Promise<void> = async () => { return Promise.resolve(); };
var startServer: () => void = () => { };

var activity_manager = new DiscordActivity();

activity_manager.on('ready', () => {
    console.log('Discord RPC connected');
    startServer();
})

activity_manager.on('disconnect', async () => {
    console.log('Discord RPC disconnected');
    await stopServer();
})

activity_manager.on('error', (error: Error) => {
    switch (true) {
        case error.message.includes('No valid application'):
            console.error('No valid application ID provided');
            break;
        case error.message.includes('No valid connection'):
            console.error('IPC connection error:', error);
            break;
        case error.message.includes('ENOENT'):
            // Do not log the IPC pipe not found error
            break;
        case error.message.includes('ECONNREFUSED'):
            console.error('Discord is not running. Please start Discord and try again.');
            break;
        default:
            console.error('Error with Discord IPC connection:', error);
            break;
    }
});

stopServer = async (): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
        if (!server || !server.address()) return resolve();

        console.log("Closing WebSocket server...");

        for (var client of server.clients) {
            client.close();
            client.terminate();
        }

        if (!server.address()) {
            console.log("WebSocket server is not running.");
            return resolve();
        }

        server.close((err) => {
            if (err) {
                console.error(`Failed to close WebSocket server: ${err.message}`);
            }
            console.log("WebSocket server closed successfully.");
            serverRunning = false;
            resolve();
        });
    });
};

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
                var data = JSON.parse(message);

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
    serverRunning = true;
};