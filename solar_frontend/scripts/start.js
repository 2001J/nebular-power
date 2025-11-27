#!/usr/bin/env node
const { existsSync, cpSync, mkdirSync } = require('fs');
const { spawn } = require('child_process');
const path = require('path');

const cwd = process.cwd();
const standaloneServer = path.join(cwd, '.next/standalone/server.js');
const staticSrc = path.join(cwd, '.next/static');
const staticDest = path.join(cwd, '.next/standalone/.next/static');
const publicSrc = path.join(cwd, 'public');
const publicDest = path.join(cwd, '.next/standalone/public');

// Suppress deprecation warnings from dependencies
const nodeArgs = ['--no-deprecation'];

if (existsSync(standaloneServer)) {
  // Copy static files if they don't exist in standalone directory
  if (existsSync(staticSrc) && !existsSync(staticDest)) {
    console.log('Copying static files to standalone directory...');
    mkdirSync(path.dirname(staticDest), { recursive: true });
    cpSync(staticSrc, staticDest, { recursive: true });
  }
  
  // Copy public files if they don't exist in standalone directory
  if (existsSync(publicSrc) && !existsSync(publicDest)) {
    console.log('Copying public files to standalone directory...');
    cpSync(publicSrc, publicDest, { recursive: true });
  }
  
  console.log('Starting standalone server...');
  spawn('node', [...nodeArgs, standaloneServer], { 
    stdio: 'inherit',
    cwd: path.join(cwd, '.next/standalone')
  });
} else {
  console.log('Starting Next.js server...');
  spawn('next', ['start'], { stdio: 'inherit', shell: true });
}

