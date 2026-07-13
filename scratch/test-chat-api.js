const http = require('http');

const data = JSON.stringify({
  messages: [{ role: 'user', content: 'Hello RRGpt' }],
  model: 'gemini-1.5-flash',
  provider: 'google'
});

console.log('Sending test request to http://localhost:3000/api/chat...');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/chat',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`Response Status: ${res.statusCode}`);
  console.log(`Response Headers: ${JSON.stringify(res.headers, null, 2)}`);
  
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log('Received chunk:');
    console.log(chunk);
  });
  
  res.on('end', () => {
    console.log('Stream ended.');
  });
});

req.on('error', (error) => {
  console.error('Connection failed (is the dev server running?):', error.message);
});

req.write(data);
req.end();
