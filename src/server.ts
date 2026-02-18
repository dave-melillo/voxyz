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
import { STTService } from './stt';
import { NotificationEvent, AgentLifecycleEvent } from './types';

export class VoxYZServer {
  private app: express.Application;
  private server: ReturnType<typeof createServer>;
  private wss: WebSocketServer;
  private router: VoiceRouter;
  private tts: TTSService;
  private stt: STTService;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });
    this.router = new VoiceRouter();
    this.tts = new TTSService();
    this.stt = new STTService();

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

    // OpenClaw lifecycle event webhook
    // Agents POST here when they start, complete, or error.
    // VoxYZ converts the event to audio and broadcasts to all clients.
    this.app.post('/api/openclaw-event', async (req, res) => {
      try {
        const event: AgentLifecycleEvent = req.body;

        if (!event.agent || !event.type) {
          return res.status(400).json({ error: 'agent and type fields required' });
        }

        const message = this.formatLifecycleMessage(event);
        console.log(`[VoxYZ] OpenClaw event: ${message}`);

        // Broadcast text event to all clients immediately (no latency)
        this.broadcast({ type: 'lifecycle', agent: event.agent, message, event });

        // Generate TTS audio (async, non-blocking for caller)
        if (config.elevenlabs.apiKey && config.notifications.ttsEnabled) {
          this.tts.synthesize({ text: message, voiceId: '', agent: event.agent })
            .then((audio) => {
              this.broadcast({
                type: 'notification',
                agent: event.agent,
                message,
                audio: audio.audioData.toString('base64'),
              });
            })
            .catch((err) => console.error('[VoxYZ] TTS error for lifecycle event:', err));
        }

        res.json({ success: true, message });
      } catch (error) {
        console.error('OpenClaw event error:', error);
        res.status(500).json({ error: 'Failed to process lifecycle event' });
      }
    });

    // Transcribe audio buffer (POST with audio/webm body)
    this.app.post('/api/transcribe', async (req, res) => {
      try {
        if (!config.deepgram.apiKey) {
          return res.status(503).json({ error: 'DEEPGRAM_API_KEY not configured' });
        }

        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', async () => {
          try {
            const audioBuffer = Buffer.concat(chunks);
            const contentType = req.headers['content-type'] || 'audio/webm';
            const transcript = await this.stt.transcribeBuffer(audioBuffer, contentType);

            if (!transcript.trim()) {
              return res.json({ transcript: '', routed: false });
            }

            const result = await this.router.route(transcript);
            res.json({ transcript, ...result, routed: true });
          } catch (err: any) {
            res.status(500).json({ error: err.message });
          }
        });
      } catch (error) {
        console.error('Transcribe error:', error);
        res.status(500).json({ error: 'Failed to transcribe audio' });
      }
    });
  }

  private formatLifecycleMessage(event: AgentLifecycleEvent): string {
    const agentName = event.agent.charAt(0).toUpperCase() + event.agent.slice(1);
    switch (event.type) {
      case 'started':
        return `${agentName} started: ${event.task || 'new task'}`;
      case 'complete':
        return `${agentName}: ${event.task || 'task'} complete`;
      case 'error':
        return `${agentName} hit an error${event.task ? ` on ${event.task}` : ''}`;
      case 'handoff':
        return `${agentName} handing off to ${event.toAgent || 'next agent'}`;
      case 'status':
        return `${agentName}: ${event.message || 'status update'}`;
      default:
        return `${agentName}: ${event.message || event.type}`;
    }
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
