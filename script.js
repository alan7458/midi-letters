import { loadPatterns, playMessageWordByWord, setPlayMode, isPlaying } from './engine.js';

let midiAccess = null;
let availableOutputs = [];
let selectedOutput = null; 

const STATUS_ELEMENT = document.getElementById('status-message');
const OUTPUT_SELECT = document.getElementById('midi-output-select');
const PLAY_BUTTON = document.getElementById('play-button');
const MESSAGE_INPUT = document.getElementById('message-input');
const MODE_BUTTON = document.getElementById('mode-button'); 

function enablePlayButton() {
    if (PLAY_BUTTON) {
        PLAY_BUTTON.disabled = false;
    }
}

async function setupMIDI() {
    if (STATUS_ELEMENT) STATUS_ELEMENT.textContent = "Requesting MIDI access...";
    try {
        midiAccess = await navigator.requestMIDIAccess();

        midiAccess.onstatechange = handleStateChange;

        handleStateChange(); 

    } catch (e) {
        if (STATUS_ELEMENT) STATUS_ELEMENT.textContent = "MIDI access failed. Ensure it's enabled in your browser.";
        console.error("MIDI Error:", e);
    }
}

function handleStateChange() {
    if (!OUTPUT_SELECT) return;

    OUTPUT_SELECT.innerHTML = ''; 
    availableOutputs = [];

    if (!midiAccess) return; 

    const outputs = Array.from(midiAccess.outputs.values());

    if (outputs.length === 0) {
        OUTPUT_SELECT.innerHTML = '<option value="">-- No MIDI Outputs Found --</option>';
        selectedOutput = null;
        if (PLAY_BUTTON) PLAY_BUTTON.disabled = true;

        handlePortSelection(); 
        return;
    }

    outputs.forEach(output => {
        availableOutputs.push(output);
        const option = document.createElement('option');
        option.value = output.id;
        option.textContent = output.name;
        OUTPUT_SELECT.appendChild(option);
    });

    const previousId = selectedOutput ? selectedOutput.id : null;
    selectedOutput = availableOutputs.find(output => output.id === previousId) || outputs[0];
    OUTPUT_SELECT.value = selectedOutput.id;

    handlePortSelection(); 
}

function handlePortSelection() {
    if (!OUTPUT_SELECT) return;

    const selectedId = OUTPUT_SELECT.value;
    selectedOutput = availableOutputs.find(output => output.id === selectedId);

    if (selectedOutput) {
        if (STATUS_ELEMENT) STATUS_ELEMENT.textContent = `Selected MIDI Output: ${selectedOutput.name}`;
        if (PLAY_BUTTON) PLAY_BUTTON.disabled = isPlaying;
    } else {
        if (STATUS_ELEMENT) STATUS_ELEMENT.textContent = 'Please select a MIDI port.';
        if (PLAY_BUTTON) PLAY_BUTTON.disabled = true;
    }
}

function handlePlayClick() {
    if (!selectedOutput) {
        if (STATUS_ELEMENT) STATUS_ELEMENT.textContent = "Error: Please select a valid MIDI output port.";
        return;
    }
    const message = MESSAGE_INPUT.value;

    if (PLAY_BUTTON) {
        PLAY_BUTTON.disabled = true;
    }

    playMessageWordByWord(message, selectedOutput, enablePlayButton); 
}

function handleModeToggle() {
    if (!MODE_BUTTON) return;
    const currentMode = MODE_BUTTON.getAttribute('data-mode');
    const newMode = currentMode === 'percussive' ? 'holding' : 'percussive';

    setPlayMode(newMode);
    MODE_BUTTON.setAttribute('data-mode', newMode);
    MODE_BUTTON.textContent = `Mode: ${newMode.charAt(0).toUpperCase() + newMode.slice(1)}`;
}

window.addEventListener('load', async () => {

    const patternsLoaded = await loadPatterns(STATUS_ELEMENT);

    if (patternsLoaded) {
        await setupMIDI();

        OUTPUT_SELECT.addEventListener('change', handlePortSelection);
        if (PLAY_BUTTON) PLAY_BUTTON.addEventListener('click', handlePlayClick);
        if (MODE_BUTTON) MODE_BUTTON.addEventListener('click', handleModeToggle);

        if (MESSAGE_INPUT) {
            MESSAGE_INPUT.addEventListener('keypress', (event) => {

                if (event.key === 'Enter') {
                    event.preventDefault(); 
                    handlePlayClick();
                }
            });
        }

        handleModeToggle();
    }
});