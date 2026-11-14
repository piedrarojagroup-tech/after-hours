'use strict';

const fs = require('node:fs');
const path = require('node:path');
const fail = (status, message) => Object.assign(new Error(message), { status });

function config(root) {
 const local = {};
 for (const file of ['.env', '.env.local']) {
  let contents;
  try {
   contents = fs.readFileSync(path.join(root, file), 'utf8');
  } catch (error) {
   if (error.code === 'ENOENT') continue;
   throw error;
  }
  for (const line of contents.replace(/^\uFEFF/, '').split(/\r?\n/)) {
   const entry = line.match(/^([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
   if (entry) local[entry[1]] = entry[2].replace(/^(["'])(.*)\1$/, '$2');
  }
 }
 return { ...local, ...process.env };
}

function textConnection(settings, selection) {
 const name = selection?.trim().toUpperCase() || 'OPENAI';
 if (name === 'OPENAI') return { name: 'OpenAI', key: settings.OPENAI_API_KEY, model: settings.OPENAI_CHAT_MODEL || 'gpt-4.1-mini' };
 if (!/^[A-Z][A-Z0-9_]*$/.test(name)) return { name: 'Custom provider' };
 const preset = {
  GEMINI: { label: 'Gemini', url: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-3.1-flash-lite' },
  MINIMAX: { label: 'MiniMax', url: 'https://api.minimax.io/v1', model: 'MiniMax-M3.1-Flash' },
 };
 const defaults = Object.hasOwn(preset, name) ? preset[name] : {};
 const key = settings[name + '_API_KEY'];
 const model = settings[name + '_CHAT_MODEL'] || defaults.model;
 const label = defaults.label || name;
 try {
  const url = new URL(settings[name + '_BASE_URL'] || defaults.url);
  const localhost = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
  if (!(url.protocol === 'https:' || (url.protocol === 'http:' && localhost)) || url.username || url.password || url.search || url.hash) return { name: label };
  const endpoint = url.href.replace(/\/+$/, '') + '/chat/completions';
  return { name: label, preset: name, key: key || (localhost ? '' : undefined), model, endpoint };
 } catch {
  return { name: label };
 }
}

function isConfigured(connection) {
 return Boolean(connection.model && connection.key !== undefined && (connection.endpoint || connection.key));
}
function createProviderFactory(fetchImpl = fetch) {
 async function request(url, key, body, timeout){
  const headers = {'Content-Type':'application/json'};
  if (key) headers.Authorization = 'Bearer ' + key;
  let r;try{r=await fetchImpl(url,{method:'POST',headers,body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(timeout)});}catch{throw fail(504,'The AI service did not respond. Your progress is unchanged. Try again when ready.');}
  if(!r.ok)throw fail(r.status===429?429:502,r.status===401?'AI account access was rejected. Check the server account setup.':r.status===429?'The AI service limit or account credit was reached. No automatic retry was made.':r.status===403?'This account cannot use the requested AI model. Check model access.':'The AI service could not complete this request. Try again when ready.');
  return r.json();
 }
 function providerFor(connection) {
  return async (endpoint, body, timeout) => {
   if (!connection.endpoint) return request('https://api.openai.com/v1/' + endpoint, connection.key, body, timeout);
   const format = body.text.format;
   const payload = {
    model: body.model,
    messages: [
     { role: 'system', content: body.instructions + '\nReturn exactly one JSON object matching this schema: ' + JSON.stringify(format.schema) },
     { role: 'user', content: body.input },
    ],
   };
   if (connection.preset === 'MINIMAX' && /^MiniMax-M3\.1-Flash/i.test(body.model)) payload.reasoning_effort = 'low';
   const data = await request(connection.endpoint, connection.key, payload, timeout);
   const content = data.choices?.[0]?.message?.content;
   if (typeof content !== 'string') throw fail(502, 'The selected provider did not return a usable text reply.');
   const stoppedThinking = content.replace(/^\s*<think>[\s\S]*?<\/think>\s*/i, '');
   const json = stoppedThinking.trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, '$1');
   return {output:[{content:[{type:'output_text',text:json}]}]};
  };
 }
 return providerFor;
}

module.exports = { config, textConnection, isConfigured, createProviderFactory };
