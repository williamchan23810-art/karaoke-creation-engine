// Karaoke Creation Engine - Lightweight Local Server
// Built with native Node.js HTTP and FS APIs to avoid npm dependencies.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3005;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  console.log(`[Request] ${req.method} ${req.url}`);
  // Decode URL in case of special characters
  const decodedUrl = decodeURIComponent(req.url);

  // Serve proxy for remote resources to bypass CORS
  if (decodedUrl.startsWith('/api/proxy?')) {
    try {
      const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
      const targetUrl = parsedUrl.searchParams.get('url');
      if (!targetUrl) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Missing url parameter');
        return;
      }
      
      const remoteUrl = new URL(targetUrl);
      const requester = remoteUrl.protocol === 'https:' ? require('https') : require('http');
      
      // Forward the range header from the client request
      const headers = {};
      if (req.headers.range) {
        headers['range'] = req.headers.range;
      }
      
      const remoteReq = requester.request(remoteUrl, { method: 'GET', headers: headers }, (remoteRes) => {
        const responseHeaders = {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=86400'
        };
        // Forward range and content-length headers if present
        if (remoteRes.headers['content-type']) responseHeaders['Content-Type'] = remoteRes.headers['content-type'];
        if (remoteRes.headers['content-range']) responseHeaders['Content-Range'] = remoteRes.headers['content-range'];
        if (remoteRes.headers['accept-ranges']) responseHeaders['Accept-Ranges'] = remoteRes.headers['accept-ranges'];
        if (remoteRes.headers['content-length']) responseHeaders['Content-Length'] = remoteRes.headers['content-length'];
        
        res.writeHead(remoteRes.statusCode, responseHeaders);
        remoteRes.pipe(res);
      });
      remoteReq.on('error', (err) => {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Proxy error: ${err.message}`);
      });
      remoteReq.end();
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`500 Proxy Error: ${e.message}`);
    }
    return;
  }

  // GET /api/audio-library - List all uploaded song files
  if (req.method === 'GET' && decodedUrl === '/api/audio-library') {
    try {
      const targetDir = path.join(PUBLIC_DIR, 'audio_library');
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      fs.readdir(targetDir, (err, files) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
          res.end(`Failed to read library: ${err.message}`);
          return;
        }
        const audioFiles = files.filter(file => {
          const ext = path.extname(file).toLowerCase();
          return ext === '.mp3' || ext === '.wav' || ext === '.ogg' || ext === '.m4a';
        });
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify(audioFiles));
      });
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
      res.end(`Server Error: ${e.message}`);
    }
    return;
  }

  // GET /api/audio-library/cleanup - Clean up old files except the active one
  if (req.method === 'GET' && decodedUrl.startsWith('/api/audio-library/cleanup')) {
    try {
      const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
      const keep = parsedUrl.searchParams.get('keep');
      const targetDir = path.join(PUBLIC_DIR, 'audio_library');
      if (fs.existsSync(targetDir)) {
        const files = fs.readdirSync(targetDir);
        files.forEach(file => {
          if (file !== keep && decodeURIComponent(file) !== keep && decodeURIComponent(file) !== decodeURIComponent(keep || '')) {
            try {
              fs.unlinkSync(path.join(targetDir, file));
            } catch (e) {
              console.error(`Failed to cleanup file ${file}:`, e);
            }
          }
        });
      }
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ success: true }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
      res.end(`Cleanup failed: ${e.message}`);
    }
    return;
  }

  // GET /api/image-library/cleanup - Clean up old image files
  if (req.method === 'GET' && decodedUrl.startsWith('/api/image-library/cleanup')) {
    try {
      const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
      const keep = parsedUrl.searchParams.get('keep');
      const targetDir = path.join(PUBLIC_DIR, 'image_library');
      if (fs.existsSync(targetDir)) {
        const files = fs.readdirSync(targetDir);
        files.forEach(file => {
          if (file !== keep && decodeURIComponent(file) !== keep && decodeURIComponent(file) !== decodeURIComponent(keep || '')) {
            try {
              fs.unlinkSync(path.join(targetDir, file));
            } catch (e) {
              console.error(`Failed to cleanup image file ${file}:`, e);
            }
          }
        });
      }
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ success: true }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
      res.end(`Cleanup failed: ${e.message}`);
    }
    return;
  }

  // POST /api/audio-library - Upload a song file (Binary stream upload)
  if (req.method === 'POST' && decodedUrl === '/api/audio-library') {
    try {
      const rawHeaderName = req.headers['x-filename'];
      if (!rawHeaderName) {
        res.writeHead(400, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
        res.end('Missing X-Filename header');
        return;
      }
      const filename = decodeURIComponent(rawHeaderName);
      const safeFilename = path.basename(filename);
      const targetDir = path.join(PUBLIC_DIR, 'audio_library');
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      } else {
        // Enforce ONE SONG system: clear any other files in audio_library before writing
        const existingFiles = fs.readdirSync(targetDir);
        existingFiles.forEach(file => {
          try {
            fs.unlinkSync(path.join(targetDir, file));
          } catch (e) {
            console.error(`Failed to clear old audio file ${file}:`, e);
          }
        });
      }
      const baseExt = path.extname(safeFilename);
      const baseName = path.basename(safeFilename, baseExt);
      const uniqueFilename = `${Date.now()}_${baseName}${baseExt}`;
      const targetPath = path.join(targetDir, uniqueFilename);
      
      const writeStream = fs.createWriteStream(targetPath);
      writeStream.on('error', (err) => {
        console.error("Audio write stream error:", err);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
          res.end(`Write failed: ${err.message}`);
        }
      });

      req.pipe(writeStream);
      req.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ success: true, filename: uniqueFilename }));
      });
      req.on('error', (err) => {
        res.writeHead(500, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
        res.end(`Upload failed: ${err.message}`);
      });
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
      res.end(`Server Error: ${e.message}`);
    }
    return;
  }

  // DELETE /api/audio-library - Delete a song file
  if (req.method === 'DELETE' && decodedUrl.startsWith('/api/audio-library')) {
    try {
      const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
      const filename = parsedUrl.searchParams.get('name');
      if (!filename) {
        res.writeHead(400, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
        res.end('Missing name parameter');
        return;
      }
      const targetPath = path.join(PUBLIC_DIR, 'audio_library', path.basename(filename));
      if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath);
      }
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ success: true }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
      res.end(`Delete failed: ${e.message}`);
    }
    return;
  }

  // GET /api/image-library - List all uploaded image files
  if (req.method === 'GET' && decodedUrl === '/api/image-library') {
    try {
      const targetDir = path.join(PUBLIC_DIR, 'image_library');
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      fs.readdir(targetDir, (err, files) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
          res.end(`Failed to read library: ${err.message}`);
          return;
        }
        const imgFiles = files.filter(file => {
          const ext = path.extname(file).toLowerCase();
          return ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.gif' || ext === '.webp' || ext === '.svg';
        });
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify(imgFiles));
      });
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
      res.end(`Server Error: ${e.message}`);
    }
    return;
  }

  // POST /api/image-library - Upload an image file (Binary stream upload)
  if (req.method === 'POST' && decodedUrl === '/api/image-library') {
    try {
      const rawHeaderName = req.headers['x-filename'];
      if (!rawHeaderName) {
        res.writeHead(400, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
        res.end('Missing X-Filename header');
        return;
      }
      const filename = decodeURIComponent(rawHeaderName);
      const safeFilename = path.basename(filename);
      const targetDir = path.join(PUBLIC_DIR, 'image_library');
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      const baseExt = path.extname(safeFilename);
      const baseName = path.basename(safeFilename, baseExt);
      const uniqueFilename = `${Date.now()}_${baseName}${baseExt}`;
      const targetPath = path.join(targetDir, uniqueFilename);
      
      const writeStream = fs.createWriteStream(targetPath);
      writeStream.on('error', (err) => {
        console.error("Image write stream error:", err);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
          res.end(`Write failed: ${err.message}`);
        }
      });

      req.pipe(writeStream);
      req.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ success: true, filename: uniqueFilename }));
      });
      req.on('error', (err) => {
        res.writeHead(500, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
        res.end(`Upload failed: ${err.message}`);
      });
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
      res.end(`Server Error: ${e.message}`);
    }
    return;
  }

  // POST /api/render - Render the video using local FFmpeg
  if (req.method === 'POST' && decodedUrl === '/api/render') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const config = data.config;
        const resolution = data.resolution || '1920x1080';
        
        if (!config || !config.config) {
          res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ error: 'Missing configuration' }));
          return;
        }

        const songNameClean = (config.metadata?.songName || 'song').replace(/[^a-zA-Z0-9]/g, '_');
        const backingFileName = config.config.audioUrl ? config.config.audioUrl.split('/').pop() : '';
        const vocalsFileName = data.vocalsUrl ? data.vocalsUrl.split('/').pop() : backingFileName;
        const bgFileName = config.config.bgUrl ? config.config.bgUrl.split('/').pop() : '';
        
        const audioPath = path.join(PUBLIC_DIR, 'audio_library', backingFileName);
        const vocalsPath = path.join(PUBLIC_DIR, 'audio_library', vocalsFileName);
        const bgPath = path.join(PUBLIC_DIR, 'image_library', bgFileName);
        
        const exportDir = path.join(PUBLIC_DIR, 'exports');
        if (!fs.existsSync(exportDir)) {
          fs.mkdirSync(exportDir, { recursive: true });
        }
        
        // Output filenames
        const outKaraokeName = `${songNameClean}_karaoke.mp4`;
        const outOriginalName = `${songNameClean}_original.mp4`;
        
        const outKaraokePath = path.join(exportDir, outKaraokeName);
        const outOriginalPath = path.join(exportDir, outOriginalName);
        
        const ffmpegPath = require('ffmpeg-static');
        const { spawn } = require('child_process');
        
        // Helper to check if file exists, fallback to placeholder if not
        const safeBgPath = fs.existsSync(bgPath) ? bgPath : path.join(PUBLIC_DIR, 'watermark.jpg');
        const safeAudioPath = fs.existsSync(audioPath) ? audioPath : '';
        const safeVocalsPath = fs.existsSync(vocalsPath) ? vocalsPath : audioPath;
        
        if (!safeAudioPath) {
          res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ error: 'Audio file not found on server' }));
          return;
        }
        
        console.log(`Starting background FFmpeg render for ${songNameClean}...`);
        
        // We will run the renders sequentially or concurrently.
        const [width, height] = resolution.split('x');
        
        // Spawn Karaoke Render
        const argsKaraoke = [
          '-y',
          '-i', safeAudioPath,
          '-loop', '1',
          '-i', safeBgPath,
          '-filter_complex', `[1:v]scale=${width}:${height},zoompan=z='zoom+0.0005':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=18000[v]`,
          '-map', '[v]',
          '-map', '0:a',
          '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p',
          '-shortest',
          outKaraokePath
        ];
        
        console.log("FFmpeg path:", ffmpegPath);
        console.log("FFmpeg Karaoke args:", argsKaraoke.join(' '));
        
        const ffmpegKaraoke = spawn(ffmpegPath, argsKaraoke);
        
        ffmpegKaraoke.on('close', (code1) => {
          console.log(`FFmpeg Karaoke finished with code ${code1}`);
          
          // Spawn Original Vocals Render
          const argsOriginal = [
            '-y',
            '-i', safeVocalsPath,
            '-loop', '1',
            '-i', safeBgPath,
            '-filter_complex', `[1:v]scale=${width}:${height},zoompan=z='zoom+0.0005':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=18000[v]`,
            '-map', '[v]',
            '-map', '0:a',
            '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p',
            '-shortest',
            outOriginalPath
          ];
          
          console.log("FFmpeg Original args:", argsOriginal.join(' '));
          const ffmpegOriginal = spawn(ffmpegPath, argsOriginal);
          
          ffmpegOriginal.on('close', (code2) => {
            console.log(`FFmpeg Original finished with code ${code2}`);
            
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({
              success: true,
              karaokeUrl: `/exports/${outKaraokeName}`,
              originalUrl: `/exports/${outOriginalName}`
            }));
          });
          
          ffmpegOriginal.on('error', (err) => {
            console.error("FFmpeg Original start error:", err);
            res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ error: `Original render failed: ${err.message}` }));
          });
        });
        
        ffmpegKaraoke.on('error', (err) => {
          console.error("FFmpeg Karaoke start error:", err);
          res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ error: `Karaoke render failed: ${err.message}` }));
        });
        
      } catch (e) {
        console.error("Render request parsing error:", e);
        res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // DELETE /api/image-library - Delete an image file
  if (req.method === 'DELETE' && decodedUrl.startsWith('/api/image-library')) {
    try {
      const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
      const filename = parsedUrl.searchParams.get('name');
      if (!filename) {
        res.writeHead(400, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
        res.end('Missing name parameter');
        return;
      }
      const targetPath = path.join(PUBLIC_DIR, 'image_library', path.basename(filename));
      if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath);
      }
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ success: true }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
      res.end(`Delete failed: ${e.message}`);
    }
    return;
  }

  // Serve local files via API endpoint for localhost bypass
  if (decodedUrl.startsWith('/api/file?')) {
    try {
      const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
      const targetPath = parsedUrl.searchParams.get('path');
      if (!targetPath) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Missing path parameter');
        return;
      }

      const resolvedPath = path.resolve(targetPath);
      if (!fs.existsSync(resolvedPath) || fs.statSync(resolvedPath).isDirectory()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('File Not Found');
        return;
      }

      const ext = path.extname(resolvedPath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      fs.readFile(resolvedPath, (err, content) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end(`500 Server Error: ${err.code}`);
        } else {
          res.writeHead(200, { 
            'Content-Type': contentType,
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(content);
        }
      });
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`500 API Error: ${e.message}`);
    }
    return;
  }

  let filePath = path.join(PUBLIC_DIR, decodedUrl);

  // If path is a directory, serve index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
    return;
  }

  // Get extension
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const stat = fs.statSync(filePath);
    const totalLength = stat.size;
    const range = req.headers.range;

    if (range && (ext === '.mp3' || ext === '.mp4' || ext === '.webm' || ext === '.wav' || ext === '.ogg')) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalLength - 1;

      if (start >= totalLength || end >= totalLength || start > end) {
        res.writeHead(416, { 'Content-Range': `bytes */${totalLength}`, 'Access-Control-Allow-Origin': '*' });
        res.end();
        return;
      }

      const chunksize = (end - start) + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${totalLength}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      });
      fileStream.pipe(res);
    } else {
      res.writeHead(200, { 
        'Content-Type': contentType,
        'Content-Length': totalLength,
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Access-Control-Allow-Origin': '*'
      });
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    }
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end(`500 Server Error: ${err.message}`);
  }
});

server.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`Karaoke Creation Engine Local Server Running!`);
  console.log(`Access the Dashboard here: http://localhost:${PORT}`);
  console.log(`==================================================\n`);
});
