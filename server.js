// Karaoke Creation Engine - Lightweight Local Server
// Built with native Node.js HTTP and FS APIs to avoid npm dependencies.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3005;
const PUBLIC_DIR = __dirname;

function hexToAssColor(hex) {
  if (!hex) return '&H00FFFFFF';
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  if (cleanHex.length !== 6) return '&H00FFFFFF';
  const r = cleanHex.substring(0, 2);
  const g = cleanHex.substring(2, 4);
  const b = cleanHex.substring(4, 6);
  return `&H00${b}${g}${r}`;
}

function generateAssSubtitles(config) {
  const metadata = config.metadata || {};
  const sysConfig = config.config || {};
  const lyrics = config.lyrics || [];
  const overlays = config.overlays || [];
  
  const fontFamily = sysConfig.fontFamily || 'Arial';
  
  // Convert colors
  const unsungAss = '&H00FFFFFF'; // White
  const leadAss = hexToAssColor(sysConfig.fontColor || '#06b6d4');
  const duetAss = hexToAssColor('#ff7b00');
  const duetA_Ass = hexToAssColor('#ff2a85');
  const duetB_Ass = hexToAssColor('#ff7f50');

  let assContent = `[Script Info]
Title: Karaoke Video - ${metadata.songName || 'Song'}
ScriptType: v4.00+
WrapStyle: 0
PlayResX: 1280
PlayResY: 720
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontFamily},44,${unsungAss},${leadAss},&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,4,0,2,10,10,120,1
Style: Lead,${fontFamily},44,${unsungAss},${leadAss},&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,4,0,2,10,10,120,1
Style: Duet,${fontFamily},44,${unsungAss},${duetAss},&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,4,0,2,10,10,120,1
Style: DuetA,${fontFamily},44,${unsungAss},${duetA_Ass},&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,4,0,2,10,10,120,1
Style: DuetB,${fontFamily},44,${unsungAss},${duetB_Ass},&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,4,0,2,10,10,120,1
Style: OverlayText,${fontFamily},26,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,3,0,5,10,10,10,1
Style: TitleCard,${fontFamily},46,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,4,0,5,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) seconds = 0;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const cs = Math.floor((seconds % 1) * 100);
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
  };

  const escapeAssText = (text) => {
    return (text || '')
      .replace(/\\/g, '\\\\')
      .replace(/[{}]/g, '')
      .replace(/\n/g, '\\N');
  };

  // 1. Add Lyrics
  const sortedLines = [...lyrics].sort((a, b) => {
    const aStart = a.words && a.words[0] ? a.words[0].startTime : 0;
    const bStart = b.words && b.words[0] ? b.words[0].startTime : 0;
    return aStart - bStart;
  });

  sortedLines.forEach(line => {
    if (!line.words || line.words.length === 0) return;

    const lineStart = line.words[0].startTime;
    const lineEnd = line.words[line.words.length - 1].endTime;

    const dialogueStart = Math.max(0, lineStart - 0.5);
    const dialogueEnd = lineEnd + 1.0;

    const startStr = formatTime(dialogueStart);
    const endStr = formatTime(dialogueEnd);

    const fadeTag = `{\\fad(500,500)}`;

    let speakerStyle = 'Lead';
    if (line.speaker === 'duet') speakerStyle = 'Duet';
    else if (line.speaker === 'duet_a') speakerStyle = 'DuetA';
    else if (line.speaker === 'duet_b') speakerStyle = 'DuetB';

    const isDuet = line.speaker === 'duet' || line.speaker === 'duet_a' || line.speaker === 'duet_b';
    const marginV = isDuet ? 520 : 120;

    let textAss = fadeTag;
    let lastTime = dialogueStart;

    line.words.forEach((wObj, idx) => {
      const gap = wObj.startTime - lastTime;
      if (gap > 0.01) {
        const gapCs = Math.round(gap * 100);
        textAss += `{\\kf${gapCs}} `;
      }
      
      const durationCs = Math.round((wObj.endTime - wObj.startTime) * 100);
      const cleanWord = wObj.word.replace(/[{}]/g, '');
      textAss += `{\\kf${durationCs}}${cleanWord} `;
      lastTime = wObj.endTime;
    });

    assContent += `Dialogue: 1,${startStr},${endStr},${speakerStyle},,0,0,${marginV},,${textAss.trim()}\n`;
  });

  // 2. Add Overlays
  overlays.forEach(ov => {
    if (ov.startTime >= ov.endTime) return;
    const startStr = formatTime(ov.startTime);
    const endStr = formatTime(ov.endTime);

    if (ov.type === 'text') {
      const cleanText = escapeAssText(ov.content || ov.text || '');
      const oWidth = ov.width || 600;
      const oHeight = ov.height || 80;
      const oX = ov.x !== undefined ? ov.x : (1280 - oWidth) / 2;
      const oY = ov.y !== undefined ? ov.y : 110;
      
      const centerX = Math.round(oX + oWidth / 2);
      const centerY = Math.round(oY + oHeight / 2);

      const colorHex = hexToAssColor(ov.fontColor || '#f97316');
      const fontSize = ov.fontSize || 24;
      const fontFam = ov.fontFamily || fontFamily;

      let alphaTag = '';
      if (ov.opacity !== undefined) {
        const alphaHex = Math.min(255, Math.max(0, 255 - Math.round(ov.opacity * 255))).toString(16).padStart(2, '0').toUpperCase();
        alphaTag = `\\1a&H${alphaHex}&`;
      }
      let shadowTag = '';
      if (ov.shadow !== undefined) {
        shadowTag = `\\shad${ov.shadow}`;
      }
      let fadTag = '\\fad(300,300)';
      if (ov.transition === 'none') {
        fadTag = '';
      }

      const posTag = `{\\pos(${centerX},${centerY})\\fs${fontSize}\\fn${fontFam}\\c${colorHex}${alphaTag}${shadowTag}${fadTag}}`;
      assContent += `Dialogue: 2,${startStr},${endStr},OverlayText,,0,0,0,,${posTag}${cleanText}\n`;
    } else if (ov.type === 'title-card') {
      const cleanText = escapeAssText(ov.text || '');
      const oWidth = ov.width || 640;
      const oHeight = ov.height || 170;
      const oX = ov.x !== undefined ? ov.x : (1280 - oWidth) / 2;
      const oY = ov.y !== undefined ? ov.y : 720 / 2 - 85;

      const centerX = Math.round(oX + oWidth / 2);
      const centerY = Math.round(oY + oHeight / 2);

      const posTag = `{\\pos(${centerX},${centerY})\\fad(800,800)}`;
      assContent += `Dialogue: 2,${startStr},${endStr},TitleCard,,0,0,0,,${posTag}${cleanText}\n`;
    }
  });

  return assContent;
}

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

const activeRenders = new Map();

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
        const keepDecoded = decodeURIComponent(keep || '');
        const songBase = keepDecoded.replace(' (Instrumental)', '').replace(/\.[^/.]+$/, '').trim();
        
        files.forEach(file => {
          const fileDecoded = decodeURIComponent(file);
          // Keep if it matches/contains the keep parameter, or contains the base song name
          const isKeep = file === keep || 
                         fileDecoded === keepDecoded || 
                         fileDecoded.includes(keepDecoded) || 
                         (songBase && fileDecoded.includes(songBase));
                         
          if (!isKeep) {
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
      writeStream.on('finish', () => {
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
      writeStream.on('finish', () => {
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

  // GET /api/render/status - Get status of background render job
  if (req.method === 'GET' && decodedUrl.startsWith('/api/render/status')) {
    try {
      const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
      const renderId = parsedUrl.searchParams.get('id');
      res.writeHead(200, { 
        'Content-Type': 'application/json', 
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      if (!renderId || !activeRenders.has(renderId)) {
        res.end(JSON.stringify({ status: 'failed', error: 'Render job ID not found' }));
        return;
      }
      res.end(JSON.stringify(activeRenders.get(renderId)));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
      res.end(`Failed to check status: ${e.message}`);
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
        const duration = parseFloat(data.duration) || 180;
        const exportMode = data.exportMode || 'both';
        
        if (!config || !config.config) {
          res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ error: 'Missing configuration' }));
          return;
        }

        const songNameClean = (config.metadata?.songName || 'song').replace(/[^a-zA-Z0-9]/g, '_');
        const backingFileName = config.config.audioUrl ? config.config.audioUrl.split('/').pop() : '';
        const vocalsFileName = data.vocalsUrl ? data.vocalsUrl.split('/').pop() : backingFileName;
        
        let bgFileName = '';
        if (config.config.imageBlocks && config.config.imageBlocks.length > 0) {
          const sortedBlocks = [...config.config.imageBlocks].sort((a, b) => a.startTime - b.startTime);
          const firstBlock = sortedBlocks[0];
          if (firstBlock && firstBlock.url) {
            bgFileName = firstBlock.url.split('/').pop();
          }
        }
        if (!bgFileName && config.config.bgUrl) {
          bgFileName = config.config.bgUrl.split('/').pop();
        }
        
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
        const hasBg = bgFileName && fs.existsSync(bgPath) && fs.statSync(bgPath).isFile();
        const safeBgPath = hasBg ? bgPath : '';
        const safeAudioPath = (backingFileName && fs.existsSync(audioPath) && fs.statSync(audioPath).isFile()) ? audioPath : '';
        const safeVocalsPath = (vocalsFileName && fs.existsSync(vocalsPath) && fs.statSync(vocalsPath).isFile()) ? vocalsPath : safeAudioPath;
        
        if (!safeAudioPath) {
          res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ error: 'Audio file not found on server' }));
          return;
        }
        
        const assFileName = `${songNameClean}_subtitles.ass`;
        const assPath = path.join(exportDir, assFileName);
        const assContent = generateAssSubtitles(config);
        fs.writeFileSync(assPath, assContent, 'utf8');
        
        const assEscaped = assPath.replace(/\\/g, '/').replace(/:/g, '\\:');
  
        console.log(`Starting background FFmpeg render for ${songNameClean}...`);
        
        // We will run the renders sequentially or concurrently.
        const [width, height] = resolution.split('x');
        
        const audioMode = data.audioMode || 'vocal-cut';
        
        // Determine background input parameters for FFmpeg
        let videoInput = [];
        let filterComplex = '';
        if (hasBg) {
          videoInput = ['-loop', '1', '-i', safeBgPath];
          filterComplex = `[1:v]scale=${width}:${height}[v];[v]ass='${assEscaped}'[v_sub]`;
        } else {
          // Use solid black generator instead of watermark.jpg
          videoInput = ['-f', 'lavfi', '-i', `color=c=black:s=${width}x${height}:r=25`];
          filterComplex = `[1:v]ass='${assEscaped}'[v_sub]`;
        }
  
        // Determine audio extraction filters for Karaoke version
        const audioFilters = [];
        if (audioMode === 'vocal-cut') {
          audioFilters.push('pan=stereo|c0=c0-c1|c1=c1-c0');
        } else if (audioMode === 'multiplex') {
          audioFilters.push('pan=stereo|c0=c0|c1=c0');
        }

        // Generate render job ID
        const renderId = 'render_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        activeRenders.set(renderId, { status: 'rendering', progress: 0 });

        // Immediately respond to client with the Job ID!
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ success: true, renderId: renderId, status: 'rendering' }));

        // Now spawn the render processes in the background!
        let ffmpegProcess1 = null;
        let ffmpegProcess2 = null;
        let isTimedOut = false;

        // Use a generous 5-minute timeout for background renders on Free Tier
        const killTimeout = setTimeout(() => {
          isTimedOut = true;
          console.error(`[Job ${renderId}] FFmpeg render timed out (5-minute limit)! Killing processes...`);
          if (ffmpegProcess1) {
            try { ffmpegProcess1.kill('SIGKILL'); } catch(e){}
          }
          if (ffmpegProcess2) {
            try { ffmpegProcess2.kill('SIGKILL'); } catch(e){}
          }
          activeRenders.set(renderId, { status: 'failed', error: 'Render job timed out (5-minute limit). Free tier resources were exhausted.' });
        }, 300000);

        const runOriginal = (karaokeUrl = null) => {
          const argsOriginal = [
            '-y',
            '-threads', '1',
            '-i', safeVocalsPath,
            ...videoInput,
            '-filter_complex', filterComplex,
            '-map', '[v_sub]',
            '-map', '0:a',
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-pix_fmt', 'yuv420p',
            '-t', duration.toString(),
            outOriginalPath
          ];
          
          console.log(`[Job ${renderId}] FFmpeg Original args:`, argsOriginal.join(' '));
          const ffmpegOriginal = spawn(ffmpegPath, argsOriginal);
          ffmpegProcess2 = ffmpegOriginal;
          
          ffmpegOriginal.stdout.on('data', (chunk) => {
            console.log(`[FFmpeg Original stdout] ${chunk.toString()}`);
          });
          ffmpegOriginal.stderr.on('data', (chunk) => {
            console.error(`[FFmpeg Original stderr] ${chunk.toString()}`);
          });
          
          ffmpegOriginal.on('close', (code2) => {
            console.log(`[Job ${renderId}] FFmpeg Original finished with code ${code2}`);
            if (isTimedOut) return;
            clearTimeout(killTimeout);
            if (code2 === 0) {
              activeRenders.set(renderId, {
                status: 'completed',
                karaokeUrl: karaokeUrl,
                originalUrl: `/exports/${outOriginalName}`
              });
            } else {
              activeRenders.set(renderId, { status: 'failed', error: `Original render encoding failed with exit code ${code2}` });
            }
          });
          
          ffmpegOriginal.on('error', (err) => {
            console.error(`[Job ${renderId}] FFmpeg Original start error:`, err);
            if (isTimedOut) return;
            clearTimeout(killTimeout);
            activeRenders.set(renderId, { status: 'failed', error: `Original render failed to start: ${err.message}` });
          });
        };

        if (exportMode === 'original') {
          runOriginal(null);
        } else {
          // Spawn Karaoke Render
          const argsKaraoke = [
            '-y',
            '-threads', '1',
            '-i', safeAudioPath,
            ...videoInput,
            '-filter_complex', filterComplex,
            '-map', '[v_sub]',
            '-map', '0:a'
          ];
          if (audioFilters.length > 0) {
            argsKaraoke.push('-af', audioFilters.join(','));
          }
          argsKaraoke.push(
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-pix_fmt', 'yuv420p',
            '-t', duration.toString(),
            outKaraokePath
          );
          
          console.log(`[Job ${renderId}] FFmpeg Karaoke args:`, argsKaraoke.join(' '));
          
          const ffmpegKaraoke = spawn(ffmpegPath, argsKaraoke);
          ffmpegProcess1 = ffmpegKaraoke;
          
          ffmpegKaraoke.stdout.on('data', (chunk) => {
            console.log(`[FFmpeg Karaoke stdout] ${chunk.toString()}`);
          });
          ffmpegKaraoke.stderr.on('data', (chunk) => {
            console.error(`[FFmpeg Karaoke stderr] ${chunk.toString()}`);
          });
          
          ffmpegKaraoke.on('close', (code1) => {
            console.log(`[Job ${renderId}] FFmpeg Karaoke finished with code ${code1}`);
            if (isTimedOut) return;
            if (code1 === 0) {
              if (exportMode === 'both') {
                runOriginal(`/exports/${outKaraokeName}`);
              } else {
                clearTimeout(killTimeout);
                activeRenders.set(renderId, {
                  status: 'completed',
                  karaokeUrl: `/exports/${outKaraokeName}`,
                  originalUrl: null
                });
              }
            } else {
              clearTimeout(killTimeout);
              activeRenders.set(renderId, { status: 'failed', error: `Karaoke render encoding failed with exit code ${code1}` });
            }
          });
          
          ffmpegKaraoke.on('error', (err) => {
            console.error(`[Job ${renderId}] FFmpeg Karaoke start error:`, err);
            if (isTimedOut) return;
            clearTimeout(killTimeout);
            activeRenders.set(renderId, { status: 'failed', error: `Karaoke render failed to start: ${err.message}` });
          });
        }
        
      } catch (e) {
        console.error("Render request parsing error:", e);
        if (!res.writableEnded) {
          res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ error: e.message }));
        }
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
