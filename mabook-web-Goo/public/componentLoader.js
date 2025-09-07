function loadComponent(url, elementId, callback) {
    fetch(url)
        .then(response => response.text())
        .then(data => {
            document.getElementById(elementId).innerHTML = data;
            if (callback) callback();
        })
        .catch(error => console.error(`Error loading component ${url}:`, error));
}

function initializeNavbar() {
    const navLinks = document.querySelectorAll('.nav-links a');
    const capsule = document.querySelector('.nav-links .nav-capsule');
    if (!navLinks.length || !capsule) return;

    let isClickScrolling = false;
    let scrollTimeout;

    function moveCapsule(target) {
        if (!target) return;
        capsule.style.width = `${target.offsetWidth}px`;
        capsule.style.left = `${target.offsetLeft}px`;
        navLinks.forEach(link => link.classList.remove('active'));
        target.classList.add('active');
    }

    setTimeout(() => {
        const initialActiveLink = document.querySelector('.nav-links a.active') || navLinks[0];
        moveCapsule(initialActiveLink);
    }, 100);

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const href = e.target.getAttribute('href');
            // If the link is to another page, navigate there
            if (!href.startsWith('#')) {
                window.location.href = href;
                return;
            }
            // Otherwise, handle smooth scroll
            moveCapsule(e.target);
            isClickScrolling = true;
            const targetSection = document.querySelector(href);
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth' });
            }
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => { isClickScrolling = false; }, 1000);
        });
    });

    window.addEventListener('scroll', () => {
        if (isClickScrolling) return;
        const sections = Array.from(navLinks)
            .map(link => {
                const href = link.getAttribute('href');
                return href.startsWith('#') ? document.querySelector(href) : null;
            })
            .filter(Boolean);

        if (sections.length === 0) return;

        let currentSectionId = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            if (window.scrollY >= sectionTop - (window.innerHeight / 3)) {
                currentSectionId = section.getAttribute('id');
            }
        });

        const activeLink = document.querySelector(`.nav-links a[href="#${currentSectionId}"]`);
        if (activeLink && !activeLink.classList.contains('active')) {
            moveCapsule(activeLink);
        }
    });
}

// Automatically load the footer on all pages that include this script
document.addEventListener('DOMContentLoaded', () => {
    loadComponent('footer.html', 'footer-container', () => {
        const yearSpan = document.getElementById('footer-year');
        if (yearSpan) {
            yearSpan.textContent = new Date().getFullYear();
        }
    });
});