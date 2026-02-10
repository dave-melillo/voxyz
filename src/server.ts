/**
 * VoxYZ Server
 * Express server with WebSocket support for real-time voice communication
 */
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { config } from './config';
import { VoiceRouter } from './router';
import { TTSService } from './tts';
import { NotificationEvent } from './types';

export class VoxYZServer {
  private app: express.Application;
  private server: ReturnType<typeof createServer>;
  private wss: WebSocketServer;
  private router: VoiceRouter;
  private tts: TTSService;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });
    this.router = new VoiceRouter();
    this.tts = new TTSService();

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
  }

  private setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.static('public'));
  }

  private setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', service: 'VoxYZ' });
    });

    // Voice routing endpoint
    this.app.post('/api/route', async (req, res) => {
      try {
        const { transcript } = req.body;
        const result = await this.router.route(transcript);
        res.json(result);
      } catch (error) {
        console.error('Routing error:', error);
        res.status(500).json({ error: 'Failed to route voice command' });
      }
    });

    // TTS endpoint
    this.app.post('/api/tts', async (req, res) => {
      try {
        const { text, agent } = req.body;
        const audio = await this.tts.synthesize({ text, voiceId: '', agent });
        res.set('Content-Type', 'audio/mpeg');
        res.send(audio.audioData);
      } catch (error) {
        console.error('TTS error:', error);
        res.status(500).json({ error: 'Failed to synthesize speech' });
      }
    });

    // Agent notification endpoint
    this.app.post('/api/notify', async (req, res) => {
      try {
        const event: NotificationEvent = req.body;
        const audio = await this.tts.notifyStatus(event.agent, event.message);

        // Broadcast to all connected WebSocket clients
        this.broadcast({
          type: 'notification',
          agent: event.agent,
          message: event.message,
          audio: audio.audioData.toString('base64'),
        });

        res.json({ success: true });
      } catch (error) {
        console.error('Notification error:', error);
        res.status(500).json({ error: 'Failed to send notification' });
      }
    });

    // Agent list endpoint
    this.app.get('/api/agents', (req, res) => {
      res.json({ agents: config.agents });
    });
  }

  private setupWebSocket() {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('[WebSocket] Client connected');

      ws.on('message', async (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());

          if (message.type === 'voice_command') {
            const result = await this.router.route(message.transcript);
            ws.send(JSON.stringify({ type: 'route_result', ...result }));
          } else if (message.type === 'tts_request') {
            const audio = await this.tts.synthesize({
              text: message.text,
              voiceId: '',
              agent: message.agent,
            });
            ws.send(
              JSON.stringify({
                type: 'audio_response',
                audio: audio.audioData.toString('base64'),
              })
            );
          }
        } catch (error) {
          console.error('[WebSocket] Message error:', error);
          ws.send(JSON.stringify({ type: 'error', message: 'Processing failed' }));
        }
      });

      ws.on('close', () => {
        console.log('[WebSocket] Client disconnected');
      });
    });
  }

  private broadcast(message: any) {
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  start() {
    this.server.listen(config.port, () => {
      console.log(`[VoxYZ] Server running on port ${config.port}`);
      console.log(`[VoxYZ] Configured agents: ${config.agents.map((a) => a.name).join(', ')}`);
    });
  }
}
