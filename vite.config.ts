import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';

function mediaInfoPlugin(): Plugin {
  return {
    name: 'media-info-api',
    configureServer(server) {
      server.middlewares.use('/api/media-info', (req, res) => {
        const urlObj = new URL(req.url || '', 'http://localhost');
        const mediaUrl = urlObj.searchParams.get('url') || '';
        const cleanUrl = mediaUrl.split('?')[0].toLowerCase();

        res.setHeader('Content-Type', 'application/json');

        if (!mediaUrl) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Missing url parameter' }));
          return;
        }

        if (cleanUrl.includes('.mkv') || cleanUrl.includes('multi-audio') || cleanUrl.includes('gandhari')) {
          res.statusCode = 200;
          res.end(
            JSON.stringify({
              container: 'mkv',
              video: {
                codec: 'H264',
                width: 1920,
                height: 1080,
                frameRate: 23.976
              },
              audioTracks: [
                {
                  id: 0,
                  language: 'ta',
                  label: 'Tamil',
                  codec: 'AAC',
                  channels: 2,
                  default: true
                },
                {
                  id: 1,
                  language: 'te',
                  label: 'Telugu',
                  codec: 'AAC',
                  channels: 2,
                  default: false
                },
                {
                  id: 2,
                  language: 'hi',
                  label: 'Hindi',
                  codec: 'AC3',
                  channels: 6,
                  default: false
                }
              ],
              subtitleTracks: [
                {
                  id: 0,
                  language: 'en',
                  label: 'English',
                  embedded: true,
                  default: false
                },
                {
                  id: 1,
                  language: 'ta',
                  label: 'Tamil',
                  embedded: true,
                  default: false
                }
              ]
            })
          );
          return;
        }

        if (cleanUrl.includes('.m3u8')) {
          res.statusCode = 200;
          res.end(
            JSON.stringify({
              container: 'm3u8',
              video: { codec: 'H264', width: 1920, height: 1080, frameRate: 30 },
              audioTracks: [
                { id: 0, language: 'en', label: 'English', codec: 'AAC', channels: 2, default: true },
                { id: 1, language: 'ta', label: 'Tamil', codec: 'AAC', channels: 2, default: false }
              ],
              subtitleTracks: [
                { id: 0, language: 'en', label: 'English', embedded: false, default: true }
              ]
            })
          );
          return;
        }

        res.statusCode = 200;
        res.end(
          JSON.stringify({
            container: cleanUrl.includes('.mp4') ? 'mp4' : 'mp4',
            video: { codec: 'H264', width: 1920, height: 1080, frameRate: 30 },
            audioTracks: [
              { id: 0, language: 'en', label: 'English', codec: 'AAC', channels: 2, default: true }
            ],
            subtitleTracks: []
          })
        );
      });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), mediaInfoPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
