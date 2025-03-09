# wave-tools

An audio processing and analysis toolkit.

## Setup

```bash
bun install
```

## CLI

```bash
# Decode an audio file
bun run cli decode path/to/file.wav -f wav

# Transcode an MP3 file to WAV
bun run cli transcode path/to/file.mp3 -f mp3

# Analyze audio features
bun run cli analyze path/to/file.wav -f wav
```

## API

```ts
import { createAudioFileSource, analyzeAudioFile } from 'wave-tools';

// Create an audio source
const source = createAudioFileSource('path/to/file.wav', 'wav');

// Analyze the audio
const result = await analyzeAudioFile(source);
```
