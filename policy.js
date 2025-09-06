function debounce(func, wait = 150, immediate = false) {
    let timeout;
    return function() {
        const context = this, args = arguments;
        const later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}

document.addEventListener('DOMContentLoaded', () => {
    document.body.style.overflow = 'auto';

    const sections = document.querySelectorAll('.policy-content section');
    const navLinks = document.querySelectorAll('.policy-sidebar .nav-link');
    if (navLinks.length === 0 || sections.length === 0) return;

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetSection = document.querySelector(this.getAttribute('href'));
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    });

    // The logic to update the active link
const updateActiveLink = (entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const activeId = entry.target.id;
            const activeLink = document.querySelector(`.policy-sidebar nav a[href="#${activeId}"]`);

            navLinks.forEach(link => link.classList.remove('active'));

            if (activeLink) {
                activeLink.classList.add('active');
                activeLink.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    });
};

// Create a debounced version of the update function
const debouncedUpdate = debounce(updateActiveLink, 1);

// Set up the observer to use the debounced function
const observer = new IntersectionObserver(debouncedUpdate, { rootMargin: '-45% 0px -45% 0px' });

    sections.forEach(section => observer.observe(section));
    // Randomized Contact Us link subjects
    const contactLink = document.querySelector('.contact-link');
    if (contactLink) {
        const subjects = window.location.pathname.includes('privacy.html')
            ? ["Question About My Data", "Feedback on Data Handling"]
            : ["Question Regarding the Terms of Service", "Feedback on the Terms"];
        
        contactLink.addEventListener('click', function(e) {
            e.preventDefault();
            const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
            const encodedSubject = encodeURIComponent(randomSubject);
            const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&to=mabook.official@gmail.com&su=${encodedSubject}`;
            window.open(gmailLink, '_blank');
        });
    }
});