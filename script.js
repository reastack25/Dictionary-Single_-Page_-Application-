
const API_BASE_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en/';
const DEFAULT_WORDS = ['dictionary', 'eloquent', 'serendipity', 'resilient'];

// DOM ELEMENTS
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const resultsContent = document.getElementById('results-content');
const historyList = document.getElementById('history-list');
const loadingElement = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');
const errorText = document.getElementById('error-text');
const exampleWords = document.querySelectorAll('.example-word');

// APPLICATION STATE
let searchHistory = JSON.parse(localStorage.getItem('wordSearchHistory')) || [];
let currentAudio = null;

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
      
    // Initialize event listeners
    initializeEventListeners();
    
    // Load and display search history
    updateHistoryDisplay();
    
    // Load initial word
    const initialWord = searchHistory.length > 0 
        ? searchHistory[0].word 
        : DEFAULT_WORDS[Math.floor(Math.random() * DEFAULT_WORDS.length)];
    
    fetchWordData(initialWord);
});
// EVENT LISTENER SETUP
function initializeEventListeners() {
    // Form submission
    searchForm.addEventListener('submit', handleSearchSubmit);
    
    // Example word clicks
    exampleWords.forEach(word => {
        word.addEventListener('click', () => {
            searchInput.value = word.textContent;
            handleSearchSubmit(new Event('submit'));
        });
        
        // Keyboard accessibility for example words
        word.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                searchInput.value = word.textContent;
                handleSearchSubmit(new Event('submit'));
            }
        });
    });
    
    // History item clicks (event delegation)
    historyList.addEventListener('click', (e) => {
        const historyItem = e.target.closest('.history-item');
        if (historyItem) {
            const word = historyItem.querySelector('.history-word').textContent;
            searchInput.value = word;
            handleSearchSubmit(new Event('submit'));
        }
    });
}
// EVENT HANDLERS
function handleSearchSubmit(event) {
    event.preventDefault();
    
    const word = searchInput.value.trim();
    
    if (!word) {
        showError('Please enter a word to search.');
        searchInput.focus();
        return;
    }
    
    if (!/^[a-zA-Z\s-]+$/.test(word)) {
        showError('Please enter a valid English word (letters, spaces, and hyphens only).');
        return;
    }
    
    hideError();
    fetchWordData(word);
}
// API INTERACTION
async function fetchWordData(word) {
    // Stop any currently playing audio
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
    
    showLoading();
    
    try {
        // A slight delay to show loading state 
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const response = await fetch(`${API_BASE_URL}${encodeURIComponent(word)}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error(`The word "${word}" was not found in the dictionary. Please check the spelling.`);
            } else if (response.status === 429) {
                throw new Error('Too many requests. Please wait a moment before searching again.');
            } else {
                throw new Error(`Unable to fetch word data. Please try again. (Error: ${response.status})`);
            }
        }
        
        const data = await response.json();
        
        if (!data || !Array.isArray(data) || data.length === 0) {
            throw new Error(`No data found for "${word}".`);
        }
        
        displayWordData(data[0]);
        addToHistory(word);
        
    } catch (error) {
        console.error('Error fetching word data:', error);
        showError(error.message);
        displayEmptyState();
        
    } finally {
        hideLoading();
    }
}
// DATA DISPLAY FUNCTIONS
function displayWordData(wordData) {
    // Clear previous results
    resultsContent.innerHTML = '';
    
    // Create word header
    const wordHeader = document.createElement('div');
    wordHeader.className = 'word-header';
    
    const wordTitle = document.createElement('h2');
    wordTitle.className = 'word-title';
    wordTitle.textContent = wordData.word;
    wordTitle.id = 'current-word-title';
    
    const wordMeta = document.createElement('div');
    wordMeta.className = 'word-meta';
    
    // Create phonetic display
    const phonetic = document.createElement('div');
    phonetic.className = 'phonetic';
    
    const phoneticText = wordData.phonetic || 
                       (wordData.phonetics && wordData.phonetics[0]?.text) || 
                       '';
    
    if (phoneticText) {
        phonetic.innerHTML = `
            <i class="fas fa-volume-up" aria-hidden="true"></i>
            <span>${phoneticText}</span>
        `;
    }
    
    // Create audio button if audio is available
    let audioUrl = '';
    if (wordData.phonetics && wordData.phonetics.length > 0) {
        for (const phonetic of wordData.phonetics) {
            if (phonetic.audio && phonetic.audio.trim()) {
                audioUrl = phonetic.audio;
                break;
            }
        }
    }
    
    const audioButton = document.createElement('button');
    audioButton.className = 'audio-btn';
    audioButton.setAttribute('aria-label', `Play pronunciation of ${wordData.word}`);
    audioButton.innerHTML = '<i class="fas fa-play" aria-hidden="true"></i>';
    
    if (audioUrl) {
        audioButton.addEventListener('click', () => playAudio(audioUrl, audioButton));
        audioButton.title = `Play pronunciation of ${wordData.word}`;
    } else {
        audioButton.disabled = true;
        audioButton.title = 'Audio pronunciation not available';
    }
    
    wordMeta.appendChild(phonetic);
    wordMeta.appendChild(audioButton);
    wordHeader.appendChild(wordTitle);
    wordHeader.appendChild(wordMeta);
    resultsContent.appendChild(wordHeader);
    
    // Create meanings sections
    if (wordData.meanings && wordData.meanings.length > 0) {
        wordData.meanings.forEach((meaning, index) => {
            createMeaningSection(meaning, index);
        });
    } else {
        const noDefinitions = document.createElement('p');
        noDefinitions.textContent = 'No definitions found for this word.';
        noDefinitions.style.color = 'var(--gray)';
        noDefinitions.style.textAlign = 'center';
        noDefinitions.style.padding = '20px';
        resultsContent.appendChild(noDefinitions);
    }
    
    // Add API attribution
    const attribution = document.createElement('div');
    attribution.style.marginTop = '30px';
    attribution.style.paddingTop = '20px';
    attribution.style.borderTop = '1px solid var(--border)';
    attribution.style.fontSize = '0.9rem';
    attribution.style.color = 'var(--gray)';
    attribution.innerHTML = `
        <i class="fas fa-info-circle" aria-hidden="true"></i>
        Data provided by the <a href="https://dictionaryapi.dev/" target="_blank" rel="noopener noreferrer">Free Dictionary API</a>
    `;
    resultsContent.appendChild(attribution);
}

function createMeaningSection(meaning, index) {
    const meaningSection = document.createElement('section');
    meaningSection.className = 'meaning-section';
    meaningSection.setAttribute('aria-labelledby', `meaning-${index}`);
    
    // Part of speech
    const partOfSpeech = document.createElement('div');
    partOfSpeech.className = 'part-of-speech';
    partOfSpeech.textContent = meaning.partOfSpeech;
    partOfSpeech.id = `meaning-${index}`;
    meaningSection.appendChild(partOfSpeech);
    
    // Definitions
    if (meaning.definitions && meaning.definitions.length > 0) {
        meaning.definitions.slice(0, 5).forEach((definition, defIndex) => {
            const definitionItem = document.createElement('div');
            definitionItem.className = 'definition-item';
            
            const definitionText = document.createElement('div');
            definitionText.className = 'definition-text';
            definitionText.innerHTML = `
                <strong>${defIndex + 1}.</strong> ${definition.definition}
            `;
            definitionItem.appendChild(definitionText);
            
            // Example if available
            if (definition.example) {
                const example = document.createElement('div');
                example.className = 'example';
                example.innerHTML = `
                    <i class="quote-left" aria-hidden="true" style="margin-right: 5px;"></i>
                    ${definition.example}
                `;
                definitionItem.appendChild(example);
            }
            
            meaningSection.appendChild(definitionItem);
        });
    }
    
    // Synonyms if available
    if (meaning.synonyms && meaning.synonyms.length > 0) {
        const synonymsContainer = document.createElement('div');
        synonymsContainer.className = 'synonyms';
        
        const synonymsLabel = document.createElement('span');
        synonymsLabel.className = 'synonyms-label';
        synonymsLabel.textContent = 'Synonyms: ';
        synonymsContainer.appendChild(synonymsLabel);
        
        // Limit to 6 synonyms for display
        meaning.synonyms.slice(0, 6).forEach(synonym => {
            const synonymTag = document.createElement('span');
            synonymTag.className = 'synonym-tag';
            synonymTabIndex = '0';
            synonymTag.setAttribute('role', 'button');
            synonymTag.setAttribute('aria-label', `Search for synonym: ${synonym}`);
            synonymTag.textContent = synonym;
            
            synonymTag.addEventListener('click', () => {
                searchInput.value = synonym;
                handleSearchSubmit(new Event('submit'));
            });
            
            synonymTag.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    searchInput.value = synonym;
                    handleSearchSubmit(new Event('submit'));
                }
            });
            
            synonymsContainer.appendChild(synonymTag);
        });
        
        meaningSection.appendChild(synonymsContainer);
    }
    
    resultsContent.appendChild(meaningSection);
}

function displayEmptyState() {
    resultsContent.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-search" aria-hidden="true"></i>
            <h3>No Results Found</h3>
            <p>Try searching for a different word or check your spelling.</p>
            <p style="margin-top: 10px; font-size: 0.9rem;">
                Need inspiration? Try one of the example words above.
            </p>
        </div>
    `;
}
// AUDIO PLAYBACK
function playAudio(audioUrl, button) {
    // Stop any currently playing audio
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
    
    // Update button state
    const originalHTML = button.innerHTML;
    button.innerHTML = '<i class="spinner spin" aria-hidden="true"></i>';
    button.disabled = true;
    
    currentAudio = new Audio(audioUrl);
    
    currentAudio.addEventListener('canplaythrough', () => {
        button.disabled = false;
        button.innerHTML = '<i class="play" aria-hidden="true"></i>';
    });
    
    currentAudio.addEventListener('play', () => {
        button.innerHTML = '<i class="stop" aria-hidden="true"></i>';
        button.setAttribute('aria-label', 'Stop pronunciation');
    });
    
    currentAudio.addEventListener('pause', () => {
        button.innerHTML = '<i class="play" aria-hidden="true"></i>';
        button.setAttribute('aria-label', `Play pronunciation of ${document.getElementById('current-word-title')?.textContent || 'word'}`);
        currentAudio = null;
    });
    
    currentAudio.addEventListener('ended', () => {
        button.innerHTML = '<i class="play" aria-hidden="true"></i>';
        button.setAttribute('aria-label', `Play pronunciation of ${document.getElementById('current-word-title')?.textContent || 'word'}`);
        currentAudio = null;
    });
    
    currentAudio.addEventListener('error', () => {
        button.innerHTML = '<i class="exclamation-triangle" aria-hidden="true"></i>';
        button.disabled = true;
        button.title = 'Audio playback failed';
        currentAudio = null;
        
        // Reset button after 2 seconds
        setTimeout(() => {
            button.innerHTML = originalHTML;
            button.disabled = false;
        }, 2000);
    });
    
    currentAudio.play().catch(error => {
        console.error('Audio playback failed:', error);
        button.innerHTML = '<i class="exclamation-triangle" aria-hidden="true"></i>';
        button.disabled = true;
        
        setTimeout(() => {
            button.innerHTML = originalHTML;
            button.disabled = false;
        }, 2000);
    });
}

function addToHistory(word) {
    // Remove if already exists (case-insensitive)
    searchHistory = searchHistory.filter(item => 
        item.word.toLowerCase() !== word.toLowerCase()
    );
    
    // Add to beginning
    searchHistory.unshift({
        word: word,     
    });
    
    // Keep only last 8 items
    if (searchHistory.length > 8) {
        searchHistory = searchHistory.slice(0, 8);
    }
    
    // Save to localStorage
    localStorage.setItem('wordSearchHistory', JSON.stringify(searchHistory));
    
    // Update display
    updateHistoryDisplay();
}

function updateHistoryDisplay() {
    historyList.innerHTML = '';
    
    if (searchHistory.length === 0) {
        historyList.innerHTML = `
            <li class="empty-state" style="padding: 30px 20px;">
                <i class="fas fa-history" aria-hidden="true"></i>
                <h3>No Search History</h3>
                <p>Words you search will appear here for quick access.</p>
            </li>
        `;
        return;
    }
    
    searchHistory.forEach(item => {
        const historyItem = document.createElement('li');
        historyItem.className = 'history-item';
        historyItem.setAttribute('role', 'button');
        historyItem.setAttribute('tabindex', '0');
        historyItem.setAttribute('aria-label', `Search for ${item.word} again`);
        
        historyItem.innerHTML = `
            <div class="history-word">${item.word}</div>
        `;
        
        historyItem.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                searchInput.value = item.word;
                handleSearchSubmit(new Event('submit'));
            }
        });
        
        historyList.appendChild(historyItem);
    });
}
function showLoading() {
    loadingElement.style.display = 'block';
    resultsContent.style.opacity = '0.5';
}

function hideLoading() {
    loadingElement.style.display = 'none';
    resultsContent.style.opacity = '1';
}

function showError(message) {
    errorText.textContent = message;
    errorMessage.style.display = 'flex';
    
    // Auto-hide error after 6 seconds
    setTimeout(() => {
        if (errorMessage.style.display === 'flex') {
            errorMessage.style.display = 'none';
        }
    }, 6000);
}

function hideError() {
    errorMessage.style.display = 'none';
}