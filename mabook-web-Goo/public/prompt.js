/**
 * Manages the entire book recommendation application.
 */
class BookRecommendationSystem {
    constructor() {
        this.elements = {
            promptInput: document.getElementById('promptInput'),
            sendBtn: document.getElementById('sendBtn'),
            loading: document.getElementById('loading'),
            resultsContainer: document.getElementById('resultsContainer'),
            byHighlightsBtn: document.getElementById('byHighlightsBtn'),
            bySynopsisBtn: document.getElementById('bySynopsisBtn'),
        };
        this.debugMode = true;
        this.searchType = 'highlights'; // Default search type set to 'highlights'
        this.AVAILABLE_GENRES = [
            "Habits", "Finance", "Leadership", "Mental health", "Motivational",
            "Physical Health", "Time Management", "Communication", "Self-Discovery",
            "Decision making", "Creativity", "Cognitive intelligence", "Behaviour",
            "Emotional Intelligence", "Innovation", "Philosophy", "Entrepreneurship"
        ];
        this.API_BASE_URL = '';
        this.initializeEventListeners();
        this.checkServerHealth();
    }

    initializeEventListeners() {
        this.elements.sendBtn.addEventListener('click', () => this.handleSearch());
        this.elements.promptInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSearch();
            }
        });
        this.elements.promptInput.addEventListener('input', () => {
            const input = this.elements.promptInput;
            input.style.height = 'auto';
            input.style.height = `${input.scrollHeight}px`;
            this.elements.sendBtn.disabled = input.value.trim() === '';
            // Update send button style based on input
            if (input.value.trim() !== '') {
                this.elements.sendBtn.classList.remove('bg-neutral-100', 'text-neutral-400');
                this.elements.sendBtn.classList.add('bg-classic-green', 'text-white');
            } else {
                this.elements.sendBtn.classList.remove('bg-classic-green', 'text-white');
                this.elements.sendBtn.classList.add('bg-neutral-100', 'text-neutral-400');
            }
        });

        this.elements.byHighlightsBtn.addEventListener('click', () => {
            this.searchType = 'highlights';
            this.elements.byHighlightsBtn.classList.add('active');
            this.elements.bySynopsisBtn.classList.remove('active');
        });

        this.elements.bySynopsisBtn.addEventListener('click', () => {
            this.searchType = 'synopsis';
            this.elements.bySynopsisBtn.classList.add('active');
            this.elements.byHighlightsBtn.classList.remove('active');
        });
    }

    async handleSearch() {
        if (this.searchType === 'highlights') {
            await this.handleSearchByHighlights();
        } else {
            await this.handleSearchBySynopsis();
        }
    }

    async handleSearchBySynopsis() {
        const prompt = this.elements.promptInput.value.trim();
        if (!prompt) {
            this.showError('Please enter a prompt to get recommendations.');
            return;
        }

        this.showLoading(true);
        this.clearResults();

        try {
            const langDetectionPrompt = this.generateAIPrompt('languageDetection', prompt);
            const langResult = await this._callBackendAPI('/ai/analyze', { prompt: langDetectionPrompt });
            const detectedLang = langResult.language || 'en';
            this.log('Detected language:', detectedLang);

            const genrePrompt = this.generateAIPrompt('genreAnalysis', prompt, this.AVAILABLE_GENRES.join(', '));
            const genreResult = await this._callBackendAPI('/ai/analyze', { prompt: genrePrompt });
            const genres = genreResult.genres || [];
            this.log('Determined genres:', genres);
            if (genres.length === 0) throw new Error('No relevant genres found for your query.');

            const books = await this._callBackendAPI('/books/search-by-synopsis', { genres });
            this.log('Found books:', books.length);
            if (books.length === 0) throw new Error('No books found for the determined genres.');

            const synopsisData = books.map((book, index) => `ID: synopsis_${index} | Book: "${book.title}" | Synopsis: "${book.synopsis}"`).join('\n');
            const rankingPrompt = this.generateAIPrompt('synopsisRanking', prompt, null, synopsisData, books.length);
            const rankingResult = await this._callBackendAPI('/ai/analyze', { prompt: rankingPrompt });
            const selectedSynopsisIds = (rankingResult.recommendations || []).map(rec => rec.id);
            this.log('AI selected synopsis IDs:', selectedSynopsisIds);

            let recommendations = this._buildRecommendationsFromSynopsis(selectedSynopsisIds, books);
            this.log('Final recommendations count:', recommendations.length);
            if (recommendations.length === 0) throw new Error('No synopses match your query well enough.');

            if (detectedLang === 'id' && recommendations.length > 0) {
                recommendations = await this._translateSynopsis(recommendations);
                this.log('Translated recommendations:', recommendations);
            }

            this.displayRecommendations(recommendations);

        } catch (error) {
            this.log('Error in handleSearchBySynopsis:', error);
            this.showError(error.message || 'An error occurred while getting recommendations.');
        } finally {
            this.showLoading(false);
        }
    }
    
    async handleSearchByHighlights() {
        const prompt = this.elements.promptInput.value.trim();
        if (!prompt) {
            this.showError('Please enter a prompt to get recommendations.');
            return;
        }

        this.showLoading(true);
        this.clearResults();

        try {
            const langDetectionPrompt = this.generateAIPrompt('languageDetection', prompt);
            const langResult = await this._callBackendAPI('/ai/analyze', { prompt: langDetectionPrompt });
            const detectedLang = langResult.language || 'en';
            this.log('Detected language:', detectedLang);

            const genrePrompt = this.generateAIPrompt('genreAnalysis', prompt, this.AVAILABLE_GENRES.join(', '));
            const genreResult = await this._callBackendAPI('/ai/analyze', { prompt: genrePrompt });
            const genres = genreResult.genres || [];
            this.log('Determined genres:', genres);
            if (genres.length === 0) throw new Error('No relevant genres found for your query.');

            const books = await this._callBackendAPI('/books/search', { genres });
            this.log('Found books:', books.length);
            if (books.length === 0) throw new Error('No books found for the determined genres.');

            const allHighlights = this._extractAllHighlights(books);
            this.log('Total extracted highlights:', allHighlights.length);
            if (allHighlights.length === 0) throw new Error('No valid highlights found in the books.');

            const highlightData = allHighlights.map(h => `ID: ${h.id} | Book: "${h.bookTitle}" | Highlight: "${h.text}"`).join('\n');
            const rankingPrompt = this.generateAIPrompt('highlightRanking', prompt, null, highlightData, allHighlights.length);
            const rankingResult = await this._callBackendAPI('/ai/analyze', { prompt: rankingPrompt });
            const selectedHighlightIds = (rankingResult.recommendations || []).map(rec => rec.id);
            this.log('AI selected highlight IDs:', selectedHighlightIds);

            let recommendations = this._buildRecommendations(selectedHighlightIds, allHighlights);
            this.log('Final recommendations count:', recommendations.length);
            if (recommendations.length === 0) throw new Error('No highlights match your query well enough.');

            if (detectedLang === 'id' && recommendations.length > 0) {
                recommendations = await this._translateHighlights(recommendations);
                this.log('Translated recommendations:', recommendations);
            }

            this.displayRecommendations(recommendations);

        } catch (error) {
            this.log('Error in handleSearch:', error);
            this.showError(error.message || 'An error occurred while getting recommendations.');
        } finally {
            this.showLoading(false);
        }
    }
    
    async _translateSynopsis(recommendations) {
        const synopsisToTranslate = recommendations.map(rec => rec.highlight); // reusing highlight property
        const translationPrompt = this.generateAIPrompt('highlightTranslation', null, null, synopsisToTranslate);
        const translationResult = await this._callBackendAPI('/ai/analyze', { prompt: translationPrompt });

        if (!translationResult.translations || translationResult.translations.length !== recommendations.length) {
            this.log('Translation failed or returned mismatched count.');
            return recommendations; // Fallback to English if translation fails
        }

        return recommendations.map((rec, index) => {
            const translatedText = translationResult.translations[index];
            return {
                ...rec,
                highlight: translatedText || rec.highlight // Use translated text or fallback to original
            };
        });
    }

    async _translateHighlights(recommendations) {
        const highlightsToTranslate = recommendations.map(rec => rec.highlight);
        const translationPrompt = this.generateAIPrompt('highlightTranslation', null, null, highlightsToTranslate);
        const translationResult = await this._callBackendAPI('/ai/analyze', { prompt: translationPrompt });

        if (!translationResult.translations || translationResult.translations.length !== recommendations.length) {
            this.log('Translation failed or returned mismatched count.');
            return recommendations; // Fallback to English if translation fails
        }

        return recommendations.map((rec, index) => {
            const translatedText = translationResult.translations[index];
            return {
                ...rec,
                highlight: translatedText || rec.highlight // Use translated text or fallback to original
            };
        });
    }

    displayRecommendations(recommendations) {
        if (!recommendations || recommendations.length === 0) {
            this.showError('No relevant highlights found that match your query.');
            return;
        }
        const recommendationsHTML = recommendations
            .map((rec, index) => this._createRecommendationHTML(rec, index))
            .join('');
        this.elements.resultsContainer.innerHTML = recommendationsHTML;
        this.elements.resultsContainer.style.display = 'block';
    }

    _createRecommendationHTML(rec, index) {
        const { title, author, highlight } = rec;
        return `
            <div class="bg-white rounded-2xl p-6 mb-5 shadow-lg border-l-4 border-classic-green transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl relative">
                <div class="absolute top-4 right-4 bg-classic-green text-white text-xs px-2 py-1 rounded-full font-semibold">
                    #${index + 1} Best Match
                </div>
                <div class="text-base leading-relaxed text-neutral-800 bg-neutral-100 p-4 rounded-lg border-l-4 border-neutral-400 italic mb-4 pr-20">"${this.escapeHtml(highlight)}"</div>
                <div class="text-xl font-bold text-classic-green mb-2">${this.escapeHtml(title)}</div>
                <div class="text-base text-neutral-600 italic">by ${this.escapeHtml(author)}</div>
            </div>
        `;
    }

    showLoading(show) {
        this.elements.loading.style.display = show ? 'block' : 'none';
        this.elements.sendBtn.disabled = show;
    }

    clearResults() {
        this.elements.resultsContainer.style.display = 'none';
        this.elements.resultsContainer.innerHTML = '';
        document.querySelectorAll('.error-message').forEach(el => el.remove());
    }

    showError(message) {
        this.clearResults();
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message bg-classic-green bg-opacity-10 border border-classic-green text-classic-green p-4 rounded-lg my-5 text-center';
        errorDiv.textContent = message;
        this.elements.resultsContainer.parentNode.insertBefore(errorDiv, this.elements.resultsContainer);
        this.log('Error displayed:', message);
    }

    _extractAllHighlights(books) {
        const allHighlights = [];
        books.forEach((book, bookIndex) => {
            const highlights = this._parseHighlights(book.highlights);
            highlights.forEach((highlight, highlightIndex) => {
                allHighlights.push({
                    id: `highlight_${bookIndex}_${highlightIndex}`,
                    text: highlight,
                    bookTitle: book.title,
                    bookAuthor: book.author
                });
            });
        });
        return allHighlights;
    }

    _buildRecommendations(selectedIds, allHighlights) {
        const recommendations = [];
        for (const id of selectedIds) {
            const highlight = allHighlights.find(h => h.id === id);
            if (highlight) {
                recommendations.push({
                    title: highlight.bookTitle,
                    author: highlight.bookAuthor,
                    highlight: highlight.text
                });
            }
        }
        return recommendations;
    }
    
    _buildRecommendationsFromSynopsis(selectedIds, books) {
        const recommendations = [];
        const addedBookTitles = new Set(); // Keep track of book titles already added

        for (const id of selectedIds) {
            if (recommendations.length >= 5) {
                break; // Stop once we have 5 unique recommendations
            }

            const index = parseInt(id.split('_')[1]);
            const book = books[index];

            if (book && !addedBookTitles.has(book.title)) {
                recommendations.push({
                    title: book.title,
                    author: book.author,
                    highlight: book.synopsis // 'highlight' property is used for synopsis text
                });
                addedBookTitles.add(book.title);
            }
        }
        return recommendations;
    }


    async _callBackendAPI(endpoint, data, method = 'POST') {
        try {
            this.log(`Calling backend API: ${endpoint}`, { data, method });
            const config = {
                method: method,
                headers: { 'Content-Type': 'application/json' },
            };
            if (method !== 'GET') {
                config.body = JSON.stringify(data);
            }
            const response = await fetch(`${this.API_BASE_URL}/api${endpoint}`, config);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `API error (${response.status})`);
            }
            return await response.json();
        } catch (error) {
            this.log('Backend API call failed:', error);
            throw new Error(`Backend API call failed: ${error.message}`);
        }
    }

    async checkServerHealth() {
        try {
            const health = await this._callBackendAPI('/health', null, 'GET');
            this.log('Server health check:', health);
            // --- FIX: Check for the new environment variable keys from the updated backend ---
            if (!health.env.hasGroqKey1 || !health.env.hasGroqKey2 || !health.env.hasSupabaseUrl || !health.env.hasSupabaseKey) {
                this.showError('Server configuration incomplete.');
            }
        } catch (error) {
            this.showError('Cannot connect to backend server.');
        }
    }

    _parseHighlights(highlightsText) {
        if (!highlightsText || typeof highlightsText !== 'string') return [];
        const regex = /(["“])(.*?)(["”])/g;
        const matches = [...highlightsText.matchAll(regex)];
        if (matches.length > 0) {
            return matches.map(match => match[2].trim());
        }
        const singleHighlight = highlightsText.trim();
        return singleHighlight ? [singleHighlight] : [];
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    log(message, data = null) {
        if (this.debugMode) console.log(`[DEBUG] ${message}`, data || '');
    }

    generateAIPrompt(taskType, userPrompt, availableGenres = null, highlightData = null, totalCount = 0) {
        const prompts = {
            languageDetection: {
                role: "You are a highly accurate language identification AI.",
                task: "Analyze the user's query and determine if it is primarily written in English or Indonesian.",
                outputFormat: `
- Your response MUST be a valid JSON object.
- The JSON object must have a single key: "language".
- The value must be either "en" for English or "id" for Indonesian.
- Example for Indonesian: {"language": "id"}
- Example for English: {"language": "en"}
- Do NOT include any other text or explanations.`,
                content: `User query: "${userPrompt}"`
            },
            highlightTranslation: {
                role: "You are an expert translator specializing in conveying the nuanced meaning of book highlights from English to Indonesian.",
                task: "Translate EACH of the following English book highlights into Indonesian. Preserve the core wisdom, context, and tone of the original highlight. Return the translations in the exact same order as the input.",
                outputFormat: `
- Your response MUST be a valid JSON object.
- The JSON object must have a single key: "translations".
- The value must be an array of strings.
- Each string in the array must be the Indonesian translation of the corresponding highlight.
- The order of the translated strings must match the order of the original highlights.
- Example: {"translations": ["Terjemahan pertama.", "Terjemahan kedua."]}
- Do NOT include any other text, explanations, or markdown formatting.`,
                content: `Original English highlights (JSON array format):\n${JSON.stringify(highlightData)}`
            },
            genreAnalysis: {
                role: "You are a specialized AI assistant with expert knowledge of book genres and user intent analysis. You are fluent in both English and Indonesian.",
                context: `Available genres: ${availableGenres}`,
                task: `Analyze the user's query, which can be in English or Indonesian, and determine which book genres would be most relevant.`,
                process: `
1. First, detect the language of the user's query (English or Indonesian).
2. Carefully read the query to understand the user's needs, interests, or preferences, regardless of the language.
3. Scan the available genres for the best matches based on the query's meaning.
4. Prioritize genres where the benefits directly address the user's query.
5. Select a minimum of 1 and a maximum of 3 genres that are most relevant.
6. If the query is vague, choose the most general applicable genres.`,
                outputFormat: `
- Your response MUST be a valid JSON object.
- The JSON object must have a single key: "genres".
- The value of "genres" must be an array of strings.
- Each string must be the exact "Name" of a recommended genre from the provided list.
- Example: {"genres": ["Mental health", "Habits", "Leadership"]}
- If no matches: {"genres": []}
- Do NOT include any other text, explanations, or markdown formatting.`,
                content: `User query: "${userPrompt}"\n\nSelected genres:`
            },
            highlightRanking: {
                role: "You are an expert content analyst specializing in matching book insights to user queries with surgical precision. You are fluent in both English and Indonesian.",
                context: `You have ${totalCount} individual book highlights. Your task is to find the most relevant highlights that directly answer or address the user's specific query, which may be in English or Indonesian.`,
                task: `Select the TOP 5 most relevant highlights that best answer the user's query. The user's query can be in English or Indonesian.`,
                process: `
1. Analyze the user's query, whether it is in English or Indonesian, to identify their specific need, problem, or area of interest.
2. Evaluate each highlight for direct relevance to the query's meaning. How well does it answer or address what the user is asking?
3. Score each highlight: HIGH (directly answers query), MEDIUM (related/helpful), LOW (tangentially related).
4. Select only HIGH and strong MEDIUM scoring highlights.
5. Rank the selected highlights by relevance score (best matches first).
6. It's acceptable to select multiple highlights from the same book if they're all highly relevant.
7. Never select duplicate/identical highlights.
8. A maximum of 5 highlights is allowed, but fewer is acceptable if only a few are truly relevant.`,
                outputFormat: `
- Your response MUST be a valid JSON object.
- The JSON object must have a single key: "recommendations".
- The value must be an array of objects, each with an "id" field.
- Each "id" must match exactly one of the highlight IDs provided.
- Order by relevance (best match first).
- Example: {"recommendations": [{"id": "highlight_3"}, {"id": "highlight_7"}, {"id": "highlight_1"}]}
- Do NOT include any other text, explanations, or markdown formatting.`,
                content: `Available highlights:\n${highlightData}\n\nUser query: "${userPrompt}"\n\nBest matching highlights (ranked by relevance):`
            },
            synopsisRanking: {
                role: "You are an expert content analyst specializing in matching book synopses to user queries with surgical precision. You are fluent in both English and Indonesian.",
                context: `You have ${totalCount} individual book synopses. Your task is to find the most relevant synopses that directly address the user's specific query, which may be in English or Indonesian.`,
                task: `Select the TOP 5 most relevant synopses that best answer the user's query. The user's query can be in English or Indonesian.`,
                process: `
1. Analyze the user's query to identify their specific need, problem, or area of interest.
2. Evaluate each synopsis for direct relevance to the query's meaning.
3. Score each synopsis: HIGH (directly answers query), MEDIUM (related/helpful), LOW (tangentially related).
4. Select only HIGH and strong MEDIUM scoring synopses.
5. **CRITICAL RULE: Strongly prefer selecting synopses from different books. The final list should be as diverse as possible.**
6. Rank the selected synopses by relevance score (best matches first).
7. A maximum of 5 synopses is allowed, but fewer is acceptable if only a few are truly relevant.`,
                outputFormat: `
- Your response MUST be a valid JSON object.
- The JSON object must have a single key: "recommendations".
- The value must be an array of objects, once with an "id" field.
- Each "id" must match exactly one of the synopsis IDs provided.
- Order by relevance (best match first).
- Example: {"recommendations": [{"id": "synopsis_3"}, {"id": "synopsis_7"}, {"id": "synopsis_1"}]}
- Do NOT include any other text, explanations, or markdown formatting.`,
                content: `Available synopses:\n${highlightData}\n\nUser query: "${userPrompt}"\n\nBest matching synopses (ranked by relevance):`
            }
        };
        const selectedPrompt = prompts[taskType];
        if (!selectedPrompt) throw new Error(`Unknown task type: ${taskType}`);

        let promptString = `# ROLE\n${selectedPrompt.role}`;
        if (selectedPrompt.context) promptString += `\n\n# CONTEXT\n${selectedPrompt.context}`;
        if (selectedPrompt.task) promptString += `\n\n# TASK\n${selectedPrompt.task}`;
        if (selectedPrompt.process) promptString += `\n\n# PROCESS\n${selectedPrompt.process}`;
        if (selectedPrompt.outputFormat) promptString += `\n\n# OUTPUT FORMAT\n${selectedPrompt.outputFormat}`;
        if (selectedPrompt.content) promptString += `\n\n${selectedPrompt.content}`;

        return promptString;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Book Recommendation System...');
    new BookRecommendationSystem();

    const typingElement = document.querySelector('.typing-animation');

    typingElement.addEventListener('animationend', (event) => {
        if (event.animationName === 'typing') {
            typingElement.style.borderRightColor = 'transparent';
        }
    });

    // --- New code for search option toggle ---
    const byHighlightsBtn = document.getElementById('byHighlightsBtn');
    const bySynopsisBtn = document.getElementById('bySynopsisBtn');
    const optionBtns = [byHighlightsBtn, bySynopsisBtn];

    optionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            optionBtns.forEach(b => b.classList.remove('active'));
            // Add active class to the clicked button
            btn.classList.add('active');
        });
    });
    // --- End of new code ---
});