export type Note = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';
export type Octave = -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type Mode = 'major' | 'minor' | 'dorian' | 'phrygian' | 'lydian' | 'mixolydian' | 'locrian';

export interface TimePoint {
  time: number;       // Time in seconds
  confidence: number; // Confidence score [0-1]
}

export interface TempoMarker extends TimePoint {
  bpm: number;      // Beats per minute
  strength: number; // Relative strength of the tempo [0-1]
}

export interface TempoData {
  average: number;        // Average BPM across the track
  markers: TempoMarker[]; // Array of tempo changes
  histogram: {            // Distribution of tempo values
    bins: number[];       // BPM values
    counts: number[];     // Frequency of each BPM
  };
  confidence: number;    // Overall tempo confidence [0-1]
}

export interface Beat extends TimePoint {
  position: number;     // Beat position in measure [1-max]
  isDownbeat: boolean;  // True if this is the first beat of a measure
  strength: number;     // Relative strength of the beat [0-1]
}

export interface BeatData {
  beats: Beat[];              // Array of detected beats
  averageTempo: number;       // Average tempo derived from beats
  medianInterBeatInterval: number; // Median time between beats
  confidence: number;         // Overall beat detection confidence [0-1]
}

export interface TimeSignatureMarker extends TimePoint {
  numerator: number;   // Top number in time signature
  denominator: number; // Bottom number in time signature
}

export interface TimeSignatureData {
  markers: TimeSignatureMarker[]; // Array of time signature changes
  dominant: {                     // Most prevalent time signature
    numerator: number;
    denominator: number;
    confidence: number;
  };
  confidence: number;             // Overall time signature confidence [0-1]
}

export interface PitchClass {
  note: Note;         // The detected note
  octave: Octave;     // Octave number
  frequency: number;  // Frequency in Hz
  amplitude: number;  // Amplitude [0-1]
  confidence: number; // Detection confidence [0-1]
}

export interface KeyMarker extends TimePoint {
  root: Note;        // Root note of the key
  mode: Mode;        // Mode/scale type
  strength: number;  // Key strength [0-1]
}

export interface KeyData {
  markers: KeyMarker[];   // Array of key changes
  dominant: {             // Most prevalent key
    root: Note;
    mode: Mode;
    confidence: number;
  };
  confidence: number;     // Overall key detection confidence [0-1]
}

export interface PitchData {
  fundamentalTrack: {      // Fundamental frequency over time
    times: number[];       // Time points in seconds
    frequencies: number[]; // Frequencies in Hz
    confidence: number[];  // Confidence per measurement
  };
  notes: {                  // Detected discrete notes
    pitch: PitchClass[];
    onset: number;          // Start time in seconds
    duration: number;       // Duration in seconds
    velocity: number;       // Note velocity/strength [0-1]
  }[];
  averagePitch: number;     // Average fundamental frequency
  confidence: number;       // Overall pitch detection confidence [0-1]
}

export interface SpectralFrame {
  time: number;           // Time in seconds
  centroid: number;       // Spectral centroid in Hz
  flatness: number;       // Spectral flatness [0-1]
  rolloff: number;        // Frequency below which 85% of spectrum energy lies
  flux: number;           // Amount of spectrum variation
  spread: number;         // Standard deviation of spectrum around centroid
  skewness: number;       // Asymmetry of spectrum around mean
  kurtosis: number;       // Peakedness of spectrum
  slope: number;          // Linear regression slope of spectrum
  crest: number;          // Ratio of max to mean magnitude
  entropy: number;        // Spectral entropy
  mfcc: number[];         // Mel-frequency cepstral coefficients
  chroma: number[];       // Chromagram energies
}

export interface SpectralData {
  frames: SpectralFrame[];    // Array of spectral measurements
  averages: {                 // Average spectral features
    centroid: number;
    flatness: number;
    rolloff: number;
    flux: number;
    spread: number;
    skewness: number;
    kurtosis: number;
    slope: number;
    crest: number;
    entropy: number;
  };
  confidence: number;         // Overall spectral analysis confidence [0-1]
}