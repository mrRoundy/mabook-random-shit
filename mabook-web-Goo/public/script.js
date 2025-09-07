// Front end/script.js

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { initializeBookshelf } from './bookshelf.js'; // Import the new function

// --- SUPABASE CLIENT (Used by both carousels) ---
const supabaseUrl = 'https://gyytvnpsjazrkcfxolxg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5eXR2bnBzamF6cmtjZnhvbHhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyODE4MjMsImV4cCI6MjA2OTg1NzgyM30.b58KbtxvgwzrRw_q-nSDE44a4fr-Ssxhx0MRDO9t3es';
const supabase = createClient(supabaseUrl, supabaseKey);


// --- HERO CAROUSEL LOGIC (Your existing code) ---
class BookCarousel {
    constructor() {
        this.carousel = document.querySelector('.book-carousel');
        this.loading = document.querySelector('.carousel-loading');
        this.books = [];
        this.currentIndex = 1;
        this.isAnimating = false;
        this.autoScrollInterval = null;
    }

    async init() {
        try {
            await this.fetchBooks();
            if (this.books.length > 0) {
                this.setupCarousel();
                this.startAutoScroll();
            }
        } catch (error) {
            console.error('Failed to initialize hero carousel:', error);
            this.loading.textContent = 'Failed to load books';
        }
    }

    async fetchBooks() {
        const { data, error } = await supabase
            .from('filtered_books')
            .select('image, title') // Also grab title for alt text
            .order('id', { ascending: true })
            .limit(10);

        if (error) throw error;
        this.books = data || [];
    }

    setupCarousel() {
        this.loading.style.display = 'none';
        this.carousel.style.display = 'flex';
        this.carousel.innerHTML = '';

        this.books.forEach(book => {
            const bookDiv = document.createElement('div');
            bookDiv.className = 'book-item';
            const img = document.createElement('img');
            img.src = book.image;
            img.alt = book.title || 'Book cover';
            img.loading = 'lazy';
            bookDiv.appendChild(img);
            this.carousel.appendChild(bookDiv);
        });

        // Cloning logic for infinite scroll
        if (this.books.length > 3) {
            const firstClones = Array.from(this.carousel.children).slice(0, 3).map(c => c.cloneNode(true));
            const lastClones = Array.from(this.carousel.children).slice(-3).map(c => c.cloneNode(true));
            lastClones.reverse().forEach(clone => this.carousel.insertBefore(clone, this.carousel.firstChild));
            firstClones.forEach(clone => this.carousel.appendChild(clone));
            this.currentIndex = 4;
            this.updateCarousel(false);
        }
    }

    updateCarousel(animate = true) {
        this.carousel.style.transition = animate ? 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)' : 'none';
        const offset = -this.currentIndex * 220 + 220;
        this.carousel.style.transform = `translateX(${offset}px)`;

        const items = this.carousel.querySelectorAll('.book-item');
        items.forEach((item, index) => {
            item.classList.remove('active', 'side');
            if (index === this.currentIndex) item.classList.add('active');
            else if (index === this.currentIndex - 1 || index === this.currentIndex + 1) item.classList.add('side');
        });

        if (animate) {
            this.isAnimating = true;
            setTimeout(() => {
                this.isAnimating = false;
                this.checkBoundaries();
            }, 800);
        }
    }

    checkBoundaries() {
        if (this.books.length <= 3) return;
        const originalLength = this.books.length;
        if (this.currentIndex >= originalLength + 3) {
            this.currentIndex = 3;
            this.updateCarousel(false);
        }
        if (this.currentIndex < 3) {
            this.currentIndex = originalLength + 2;
            this.updateCarousel(false);
        }
    }

    next() {
        if (this.isAnimating) return;
        this.currentIndex++;
        this.updateCarousel(true);
    }

    startAutoScroll() {
        if (this.autoScrollInterval) clearInterval(this.autoScrollInterval);
        this.autoScrollInterval = setInterval(() => this.next(), 2000);
        this.carousel.addEventListener('mouseenter', () => clearInterval(this.autoScrollInterval));
        this.carousel.addEventListener('mouseleave', () => this.startAutoScroll());
    }
}

// --- INITIALIZE EVERYTHING ON PAGE LOAD ---
document.addEventListener('DOMContentLoaded', () => {
    // Start the hero carousel
    const heroCarousel = new BookCarousel();
    heroCarousel.init();

    // Initialize the 3 genre bookshelves
    initializeBookshelf('finance-shelf', 'Finance', supabase);
    initializeBookshelf('mental-health-shelf', 'Mental Health', supabase);
    initializeBookshelf('habits-shelf', 'Habits', supabase);
});