// engine.js
export const baseNote = 36;
export const PATTERN_HEIGHT = 8;
export const ROW_DELAY_MS = 60;
export const WORD_DELAY_MS = 10;

export let PATTERNS = {};
export let isPlaying = false;
export let playMode = 'percussive';

export function setPlayMode(mode) {
    playMode = mode;
}

export function createWordPattern(symbols) {
    const wordPattern = [];
    for (let r = 0; r < PATTERN_HEIGHT; r++) {
        let newRow = [];
        for (const char of symbols) {
            const pattern = PATTERNS[char] || PATTERNS[' '];
            newRow = newRow.concat(pattern[r]);
        }
        wordPattern.push(newRow);
    }
    return wordPattern;
}

export function getCharacterPatterns(symbols) {
    const charPatterns = [];
    for (const char of symbols) {
        const pattern = PATTERN_HEIGHT === (PATTERS[char] || []).length 
            ? PATTERS[char] 
            : PATTERS[' '];
        
        charPatterns.push(pattern);
    }
    return charPatterns;
}

export async function loadPatterns(statusElement) {
    if (statusElement) statusElement.textContent = "Loading patterns data...";

    try {
        const response = await fetch('patterns.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        PATTERNS = data.PATTERNS;

        if (statusElement) statusElement.textContent = "Data loaded. Ready to play!";
        setTimeout(() => { if (statusElement) statusElement.textContent = ""; }, 2000);
        return true;
    } catch (e) {
        if (statusElement) statusElement.textContent = `Error loading patterns: ${e.message}. Cannot run.`;
        return false;
    }
}

async function playWordBlock(pattern, output) {
    const currentWidth = pattern[0].length;
    const currentNoteMap = Array.from({ length: currentWidth }, (_, i) => baseNote + i);
    const maxNotes = Math.min(currentWidth, 88);

    const statusElement = document.getElementById('status-message');

    if (currentWidth > 88) {
        if (statusElement) statusElement.textContent = `Word too long! Truncating to 88 notes.`;
    }

    if (playMode === 'holding') {
        const notesHeld = Array(currentWidth).fill(false);

        const stopAllNotes = () => {
            for (let i = 0; i < maxNotes; i++) {
                if (notesHeld[i]) {
                    output.send([0x80, currentNoteMap[i], 0x00]);
                    notesHeld[i] = false;
                }
            }
        };

        for (let r = 0; r < pattern.length; r++) {
            const row = pattern[r];

            for (let i = 0; i < maxNotes; i++) {
                const patternValue = row[i];
                const note = currentNoteMap[i];

                if (patternValue === 1 && !notesHeld[i]) {
                    output.send([0x90, note, 0x7f]);
                    notesHeld[i] = true;
                } else if (patternValue === 0 && notesHeld[i]) {
                    output.send([0x80, note, 0x00]);
                    notesHeld[i] = false;
                }
            }
            await new Promise(r => setTimeout(r, ROW_DELAY_MS));
        }
        stopAllNotes();

    } else { 
        for (let r = 0; r < pattern.length; r++) {
            const row = pattern[r];

            for (let i = 0; i < maxNotes; i++) {
                if (row[i] === 1) {
                    output.send([0x90, currentNoteMap[i], 0x7f]);
                }
            }

            await new Promise(r => setTimeout(r, ROW_DELAY_MS));

            for (let i = 0; i < maxNotes; i++) {
                if (row[i] === 1) {
                    output.send([0x80, currentNoteMap[i], 0x00]);
                }
            }
        }
    }
}

export async function playMessageWordByWord(message, output, buttonEnableCallback) { 
    if (isPlaying) return;
    isPlaying = true;

    const statusElement = document.getElementById('status-message');

    if (!output) { 
        if (statusElement) statusElement.textContent = "Error: No MIDI output provided. Select a port.";
        isPlaying = false;
        buttonEnableCallback(); 
        return;
    }

    const currentModeText = playMode === 'holding' ? 'Holding' : 'Percussive';
    if (statusElement) statusElement.textContent = `Using MIDI: ${output.name} (Mode: ${currentModeText})`;

    const normalizedMessage = message.toUpperCase();

    const blocks = normalizedMessage
        .split(/\s+/)
        .filter(block => block.length > 0);

    for (let i = 0; i < blocks.length; i++) {
        const word = blocks[i];
        const validChars = Array.from(word).filter(char => PATTERNS[char]);

        if (validChars.length > 0) {
            if (statusElement) statusElement.textContent = `Playing: ${word} (Mode: ${currentModeText})`;
            
            const wordPattern = createWordPattern(validChars); 

            await playWordBlock(wordPattern, output);

            if (i < blocks.length - 1) {
                await new Promise(r => setTimeout(r, WORD_DELAY_MS));
            }
        }
    }

    if (statusElement) statusElement.textContent = "Sequence finished.";
    
    buttonEnableCallback(); 

    setTimeout(() => { if (statusElement) statusElement.textContent = ""; }, 3000);
    isPlaying = false;
}