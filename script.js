// fancy type
const baseNote = 36;
const PATTERN_HEIGHT = 8;
const SYMBOL_WIDTH = 8; // useless POS
const ROW_DELAY_MS = 60;
const WORD_DELAY_MS = 400;

let isPlaying = false;

/**
 * futurer futurer me, this hunka junk "creates a single, concatenated pattern array" -w3
 * @param {string[]} symbols
 * @returns {number[][]}
 */
function createWordPattern(symbols) {
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

/**
 * row by row by row by row by row by row 
 * @param {number[][]} pattern
 * @param {MIDIAccessOutput} output
 */
async function playWordBlock(pattern, output) {
  const currentWidth = pattern[0].length;
  const currentNoteMap = Array.from({ length: currentWidth }, (_, i) => baseNote + i);

  if (currentWidth > 88) {
    document.getElementById('status-message').textContent = `Word too long! Truncating to 88 notes.`;
  }

  for (const row of pattern) {
    // on
    for (let i = 0; i < currentWidth; i++) {
      if (row[i] === 1 && i < 88) {
        output.send([0x90, currentNoteMap[i], 0x7f]);
      }
    }

    await new Promise(r => setTimeout(r, ROW_DELAY_MS));

    for (let i = 0; i < currentWidth; i++) {
      if (row[i] === 1 && i < 88) {
        output.send([0x80, currentNoteMap[i], 0x00]);
      }
    }
  }
}

/**
 * process it yooooo
 * @param {string} message - to future me: this is the input message
 */
async function playMessageWordByWord(message) {
  if (isPlaying) return;
  isPlaying = true;

  const statusElement = document.getElementById('status-message');
  statusElement.textContent = "Connecting to MIDI...";

  let access;
  try {
    access = await navigator.requestMIDIAccess();
  } catch (e) {
    statusElement.textContent = "MIDI access failed. Ensure it's enabled in your browser.";
    isPlaying = false;
    return;
  }

  const outputs = Array.from(access.outputs.values());

  if (!outputs.length) {
    statusElement.textContent = "No MIDI output found. Connect a virtual MIDI device.";
    isPlaying = false;
    return;
  }

  const output = outputs[0];
  statusElement.textContent = `Using MIDI: ${output.name}`;

  const normalizedMessage = message.toUpperCase();

  const blocks = normalizedMessage
    .split(/\s+/)
    .filter(block => block.length > 0);

  for (let i = 0; i < blocks.length; i++) {
    const word = blocks[i];n
    const validChars = Array.from(word).filter(char => PATTERNS[char]);

    if (validChars.length > 0) {
      statusElement.textContent = `Playing: ${word}`;
      const wordPattern = createWordPattern(validChars);
      await playWordBlock(wordPattern, output);

      if (i < blocks.length - 1) {
        await new Promise(r => setTimeout(r, WORD_DELAY_MS));
      }
    }
  }

  statusElement.textContent = "Sequence finished.";
  setTimeout(() => { statusElement.textContent = ""; }, 3000);
  isPlaying = false;
}

function setupUI() {
  const inputElement = document.getElementById('message-input');
  const playButton = document.getElementById('play-button');
  
  function triggerPlay() {
    const message = inputElement.value.trim();
    if (message && !isPlaying) {
      playMessageWordByWord(message);
    } else if (!message) {
      document.getElementById('status-message').textContent = "Please enter a message.";
      setTimeout(() => { document.getElementById('status-message').textContent = ""; }, 2000);
    }
  }

  playButton.addEventListener('click', triggerPlay);
  inputElement.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      triggerPlay();
    }
  });
}

window.onload = setupUI;