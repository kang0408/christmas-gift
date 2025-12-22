/* ============================================
   MEMORY BOOK COMPONENT
   Handles the photo album with memories
   Enhanced with 3D page flip effects
   ============================================ */

class MemoryBook {
    constructor() {
        this.modal = document.getElementById('book-modal');
        this.pagesContainer = document.getElementById('book-pages');
        this.pageIndicator = document.getElementById('page-indicator');
        this.prevBtn = document.getElementById('prev-page');
        this.nextBtn = document.getElementById('next-page');
        this.closeBtn = document.getElementById('close-book');

        this.currentPage = 0;
        this.pages = [];
        this.isAnimating = false;

        // Page flip sound effect (base64 encoded short sound)
        this.pageFlipSound = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYZNIwl9AAAAAAAAAAAAAAAAAAAAAP/7kGQAAANUMEoFNMAAI0AmOAAAAQdYBGhTBAAKEAFpjgAABEADfAAxgpDFwMHtgEzSRpFQkySRm1Jrv/uMQ+J4eDhnBw8PDyOc5zn/87//O/+IeCBxAAAYHCDnMcxznOY5zm//znP/5znP//nOc5znOc5znREBBD/5znOc5znP/5zn//5znOf/znOc5zghCE5znOc5z/+c5//Oc5z/+c5znOc5znBCE5znOc5zn/85z/+c5zn/85znOc5znOCEJznOc5znP/5zn/85znP/5znOc5znOcEIP/5znOc5//Oc//nOc//nOc5znOc5wQg');

        // Initialize with sample memories
        // Replace these with your actual photos and messages!
        this.memories = [
            {
                photo: "./assets/photos/photo1.jpg", // Add your photo path: 'assets/photos/photo1.jpg'
                date: 'December 25, 2023',
                message: 'Our first Christmas together. I still remember the warmth of your smile when we exchanged gifts. That moment changed everything for me.'
            },
            {
                photo: "./assets/photos/photo2.jpg",
                date: 'February 14, 2024',
                message: 'Valentine\'s Day with you was magical. The candlelit dinner, the quiet moments, and the way you looked at me - I knew then that you were the one.'
            },
            {
                photo: "./assets/photos/photo3.jpg",
                date: 'June 15, 2024',
                message: 'Our summer adventure! Remember when we got lost and found that hidden beach? Sometimes getting lost leads us to the most beautiful places - just like how I found you.'
            },
            {
                photo: "./assets/photos/photo4.jpg",
                date: 'October 31, 2024',
                message: 'Halloween with my favorite person! Your costume was amazing, and your laugh that night is still my favorite sound in the world.'
            },
            {
                photo: "./assets/photos/photo5.jpg",
                date: 'December 25, 2024',
                message: 'Another Christmas with you, another year of beautiful memories. Thank you for being the greatest gift I\'ve ever received. I love you more than words can say. 💝'
            }
        ];

        this.init();
    }

    init() {
        this.createPages();
        this.bindEvents();
        this.updateNavigation();
    }

    createPages() {
        this.pagesContainer.innerHTML = '';

        this.memories.forEach((memory, index) => {
            const page = document.createElement('div');
            page.className = `book-page ${index === 0 ? 'active' : ''}`;
            page.setAttribute('data-page', index);

            page.innerHTML = `
                <div class="page-content">
                    <div class="page-photo">
                        ${memory.photo
                    ? `<img src="${memory.photo}" alt="Memory photo ${index + 1}">`
                    : `<div class="photo-placeholder">
                                <span class="placeholder-icon">📷</span>
                                <span class="placeholder-text">Add your photo here</span>
                               </div>`
                }
                    </div>
                    <div class="page-date">
                        <span class="date-icon">📅</span>
                        <span>${memory.date}</span>
                    </div>
                    <p class="page-message">${memory.message}</p>
                </div>
                <div class="page-number">${index + 1}</div>
            `;

            this.pagesContainer.appendChild(page);
            this.pages.push(page);
        });
    }

    bindEvents() {
        this.prevBtn.addEventListener('click', () => this.prevPage());
        this.nextBtn.addEventListener('click', () => this.nextPage());
        this.closeBtn.addEventListener('click', () => this.close());

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (this.isOpen() && !this.isAnimating) {
                if (e.key === 'ArrowLeft') this.prevPage();
                if (e.key === 'ArrowRight') this.nextPage();
                if (e.key === 'Escape') this.close();
            }
        });

        // Swipe support for mobile
        let touchStartX = 0;
        let touchEndX = 0;

        this.modal.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        });

        this.modal.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            if (!this.isAnimating) {
                this.handleSwipe(touchStartX, touchEndX);
            }
        });

        // Click on page to advance
        this.pagesContainer.addEventListener('click', (e) => {
            if (!this.isAnimating && e.target.closest('.book-page')) {
                const rect = this.pagesContainer.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const halfWidth = rect.width / 2;

                if (clickX > halfWidth) {
                    this.nextPage();
                } else {
                    this.prevPage();
                }
            }
        });
    }

    handleSwipe(startX, endX) {
        const threshold = 50;
        const diff = startX - endX;

        if (Math.abs(diff) > threshold) {
            if (diff > 0) {
                this.nextPage();
            } else {
                this.prevPage();
            }
        }
    }

    playPageFlipSound() {
        try {
            this.pageFlipSound.currentTime = 0;
            this.pageFlipSound.volume = 0.3;
            this.pageFlipSound.play().catch(() => { });
        } catch (e) {
            // Ignore audio errors
        }
    }

    goToPage(pageIndex, direction = 'next') {
        if (pageIndex < 0 || pageIndex >= this.pages.length) return;

        // Play flip sound
        this.playPageFlipSound();

        // Simply switch pages instantly
        this.pages[this.currentPage].classList.remove('active');
        this.pages[pageIndex].classList.add('active');

        this.currentPage = pageIndex;
        this.updateNavigation();
    }

    nextPage() {
        if (this.currentPage < this.pages.length - 1) {
            this.goToPage(this.currentPage + 1, 'next');
        }
    }

    prevPage() {
        if (this.currentPage > 0) {
            this.goToPage(this.currentPage - 1, 'prev');
        }
    }

    updateNavigation() {
        this.prevBtn.disabled = this.currentPage === 0;
        this.nextBtn.disabled = this.currentPage === this.pages.length - 1;
        this.pageIndicator.textContent = `Page ${this.currentPage + 1} of ${this.pages.length}`;
    }

    open() {
        this.modal.classList.remove('hidden');
        this.currentPage = 0;
        this.isAnimating = false;

        this.pages.forEach((page, index) => {
            page.classList.remove('flipping-out', 'flipping-in', 'flipping-back-out', 'flipping-back-in');
            page.classList.toggle('active', index === 0);
        });
        this.updateNavigation();

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        // Dispatch open event
        window.dispatchEvent(new CustomEvent('bookOpened'));
    }

    close() {
        this.modal.classList.add('hidden');
        document.body.style.overflow = '';

        // Dispatch custom event for main.js to handle
        window.dispatchEvent(new CustomEvent('bookClosed'));
    }

    isOpen() {
        return !this.modal.classList.contains('hidden');
    }

    // Method to update memories programmatically
    updateMemories(newMemories) {
        this.memories = newMemories;
        this.pages = [];
        this.currentPage = 0;
        this.createPages();
        this.updateNavigation();
    }
}

// Export for use in main.js
window.MemoryBook = MemoryBook;
