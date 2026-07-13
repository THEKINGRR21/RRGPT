const { streamText } = require('c:/Users/RISHI RAMAN/Desktop/RRGpt/node_modules/ai');
const { createOpenAI } = require('c:/Users/RISHI RAMAN/Desktop/RRGpt/node_modules/@ai-sdk/openai');

const client = createOpenAI({ apiKey: 'dummy' });
const model = client('gpt-4o-mini');

try {
  const result = streamText({
    model,
    messages: [{ role: 'user', content: 'hello' }]
  });

  console.log('Result properties:', Object.getOwnPropertyNames(result));
  console.log('Result proto:', Object.getOwnPropertyNames(Object.getPrototypeOf(result)));

  result.then(resolved => {
    console.log('Resolved properties:', Object.getOwnPropertyNames(resolved));
    console.log('Resolved proto:', Object.getOwnPropertyNames(Object.getPrototypeOf(resolved)));
  }).catch(err => {
    console.log('Promise rejected with error:', err.message);
    console.log('Error stack:', err.stack);
  });
} catch (e) {
  console.error('Synchronous error:', e);
}
