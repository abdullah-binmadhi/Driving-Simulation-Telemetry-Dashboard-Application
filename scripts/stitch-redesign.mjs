#!/usr/bin/env node

import { StitchToolClient } from '@google/stitch-sdk';
import { config } from 'dotenv';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

config();
const apiKey = process.env.STITCH_API_KEY;
if (!apiKey) {
  console.error('STITCH_API_KEY not set in .env');
  process.exit(1);
}

const prompt = process.argv[2];
if (!prompt) {
  console.error('Usage: node scripts/stitch-redesign.mjs "your design prompt"');
  process.exit(1);
}

const deviceType = process.argv[3] || 'DESKTOP';

const client = new StitchToolClient({ apiKey, timeout: 300_000 });

function extractId(raw, prefix) {
  if (!raw) return null;
  const s = typeof raw === 'string' ? raw : JSON.stringify(raw);
  const m = s.match(new RegExp(prefix + '/(\\d+)'));
  return m ? m[1] : null;
}

function deepFind(obj, key) {
  if (!obj || typeof obj !== 'object') return null;
  for (const [k, v] of Object.entries(obj)) {
    if (k === key) return v;
    if (typeof v === 'object') {
      const found = deepFind(v, key);
      if (found) return found;
    }
  }
  return null;
}

try {
  // 1. Create a project
  console.log('Creating project...');
  const projectR = await client.callTool('create_project', {});
  let pid = extractId(projectR?.project?.id || projectR?.name, 'projects');
  pid ||= extractId(projectR?.content?.[0]?.text, 'projects');
  pid ||= projectR?.projectId;
  if (!pid) { console.error('Failed to get project ID:', JSON.stringify(projectR, null, 2)); await client.close(); process.exit(1); }
  console.log(`Project: ${pid}`);

  // 2. Generate screen
  console.log(`Generating: "${prompt.slice(0,60)}..." (${deviceType})`);
  const screenR = await client.callTool('generate_screen_from_text', { projectId: pid, prompt, deviceType });

  // 3. Find HTML download URL in the response
  const htmlUrl = deepFind(screenR, 'downloadUrl');
  if (htmlUrl) {
    console.log('Downloading HTML...');
    const resp = await fetch(htmlUrl);
    const html = await resp.text();
    const outDir = resolve(dirname(fileURLToPath(import.meta.url)), '../stitch-output');
    mkdirSync(outDir, { recursive: true });
    const outPath = resolve(outDir, 'redesign.html');
    writeFileSync(outPath, html);
    console.log(`\n✓ HTML saved to: ${outPath} (${(html.length / 1024).toFixed(0)} KB)`);
  } else {
    // Fallback: get screen by ID
    let sid = extractId(screenR?.screen?.id || screenR?.name, 'screens');
    sid ||= screenR?.projectId ? extractId(screenR?.content?.[0]?.text, 'screens') : null;
    if (sid) {
      const htmlR = await client.callTool('get_screen', { projectId: pid, screenId: sid });
      const htmlUrl2 = deepFind(htmlR, 'downloadUrl');
      if (htmlUrl2) {
        const resp = await fetch(htmlUrl2);
        const html = await resp.text();
        const outDir = resolve(dirname(fileURLToPath(import.meta.url)), '../stitch-output');
        mkdirSync(outDir, { recursive: true });
        const outPath = resolve(outDir, 'redesign.html');
        writeFileSync(outPath, html);
        console.log(`\n✓ HTML saved to: ${outPath} (${(html.length / 1024).toFixed(0)} KB)`);
      } else {
        console.log('No download URL found. Full result:', JSON.stringify(htmlR, null, 2));
      }
    } else {
      console.log('Screenshot URL:', deepFind(screenR, 'downloadUrl') || 'none');
    }
  }
} catch (err) {
  console.error('Stitch error:', err.message || err);
} finally {
  await client.close();
}
