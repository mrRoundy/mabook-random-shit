// Front end/bookshelf.js

/**
 * Initializes a bookshelf component.
 * @param {string} sectionId - The ID of the main <section> element for this bookshelf.
 * @param {string} genre - The book genre to fetch from Supabase.
 * @param {object} supabase - The initialized Supabase client.
 */
export function initializeBookshelf(sectionId, genre, supabase) {
    (async () => {
        async function fetchBooksByGenre(genreToFetch) {
    const { data, error } = await supabase
        .from('filtered_books')
        .select('title, author, image')
        // FIX: Searching the 'sub-genre' column for a match
        .ilike('sub-genre', `%${genreToFetch}%`)
        .limit(10);

    if (error) {
        console.error(`Error fetching books for genre "${genreToFetch}":`, error);
        return [];
    }
    return data;
}

        const booksData = await fetchBooksByGenre(genre);

        const sectionElement = document.getElementById(sectionId);
        if (!sectionElement) return;

        const bookshelf = sectionElement.querySelector('.bookshelf');
        const bookshelfWrapper = sectionElement.querySelector('.bookshelf-container');
        const scrollLeftBtn = sectionElement.querySelector('.scroll-btn[aria-label="Scroll left"]');
        const scrollRightBtn = sectionElement.querySelector('.scroll-btn[aria-label="Scroll right"]');

        if (!booksData || booksData.length === 0) {
            bookshelf.innerHTML = `<p style="color: #a0a0a0; text-align: center; width: 100%;">No books found for ${genre}.</p>`;
            scrollLeftBtn.style.display = 'none';
            scrollRightBtn.style.display = 'none';
            return;
        }

        function createBookElement(book) {
            const bookItem = document.createElement('div');
            bookItem.className = "book-item";
            bookItem.innerHTML = `
                <div class="book-wrapper-3d">
                    <div class="book-cover-3d">
                        <img src="${book.image}" alt="Cover of ${book.title}">
                    </div>
                    <div class="book-spine-3d">
                        <h4>${book.title}</h4>
                    </div>
                </div>
                <div class="book-info">
                    <h3>${book.title}</h3>
                    <p>by ${book.author || 'Unknown'}</p>
                </div>`;
            return bookItem;
        }

        const originalBookCount = booksData.length;
        const allBooksData = [...booksData, ...booksData]; // Duplicate for infinite scroll
        allBooksData.forEach(book => bookshelf.appendChild(createBookElement(book)));

        let currentIndex = 0;
        const transitionDuration = 800;

        function updateScrollPosition(transition = true) {
            const bookWidth = bookshelf.children[0].offsetWidth;
            const gap = parseFloat(window.getComputedStyle(bookshelf).gap);
            const scrollAmount = (bookWidth + gap) * currentIndex;
            bookshelf.style.transition = transition ? `transform ${transitionDuration}ms ease-in-out` : 'none';
            bookshelf.style.transform = `translateX(-${scrollAmount}px)`;
        }

        function scrollNext() {
            currentIndex++;
            updateScrollPosition();
            if (currentIndex >= originalBookCount) {
                setTimeout(() => {
                    currentIndex = 0;
                    updateScrollPosition(false);
                }, transitionDuration);
            }
        }

        function scrollPrev() {
            if (currentIndex <= 0) {
                currentIndex = originalBookCount;
                updateScrollPosition(false);
                setTimeout(() => { // Short delay to allow the position to reset
                    currentIndex--;
                    updateScrollPosition();
                }, 20);
            } else {
                currentIndex--;
                updateScrollPosition();
            }
        }

        scrollRightBtn.addEventListener('click', scrollNext);
        scrollLeftBtn.addEventListener('click', scrollPrev);

    })();
}