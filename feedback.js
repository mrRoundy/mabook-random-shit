document.addEventListener('DOMContentLoaded', () => {
    // Form elements
    const form = document.getElementById('feedback-form');
    const messageEl = document.getElementById('response-message');
    const submitBtn = document.getElementById('submit-btn');
    const commentBox = document.getElementById('comment'); // Get the textarea

    // Drag and drop elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    // ... (rest of the variable declarations are the same)
    const dropZonePrompt = document.getElementById('drop-zone-prompt');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('image-preview');
    const imageName = document.getElementById('image-name');
    
    let uploadedFile = null;

    // !!! IMPORTANT: MAKE SURE THIS IS YOUR CORRECT DEPLOYED URL !!!
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxP5sMDX7I7fjtjbw_QaFK9LhkBspZPrBWCBLj0BywWSW1fYrYVvmMk7zPyoX5jYu8z3A/exec'; 

    // --- Auto-expanding Textarea Logic ---
    if (commentBox) {
        commentBox.addEventListener('input', () => {
            commentBox.style.height = 'auto'; // Reset height
            commentBox.style.height = `${commentBox.scrollHeight}px`; // Set to content height
        });
    }

    // --- Drag and Drop Logic ---

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-green-500', 'bg-green-50');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-green-500', 'bg-green-50');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-green-500', 'bg-green-50');
        const files = e.dataTransfer.files;
        if (files.length > 0) handleFile(files[0]);
    });
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleFile(e.target.files[0]);
    });

    function handleFile(file) {
        if (file && file.type.startsWith('image/')) {
            uploadedFile = file;
            imageName.textContent = file.name;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                dropZonePrompt.classList.add('hidden');
                imagePreviewContainer.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        } else {
            alert('Please select an image file.');
            uploadedFile = null;
        }
    }

    // --- Form Submission Logic ---
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        submitBtn.disabled = true;
        messageEl.textContent = 'Submitting...';

        const comment = form.querySelector('#comment').value;
        const email = form.querySelector('#email').value;
        
        let payload = { comment, email };

        if (uploadedFile) {
            const reader = new FileReader();
            reader.readAsDataURL(uploadedFile);
            reader.onload = () => {
                payload.imageBase64 = reader.result;
                payload.imageName = uploadedFile.name;
                payload.imageType = uploadedFile.type;
                sendData(payload);
            };
            reader.onerror = () => {
                showError('Could not read the file.');
            };
        } else {
            sendData(payload);
        }
    });
    
    async function sendData(payload) {
        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error('Network response was not ok.');
            }
            
            // On success, redirect to the thank you page
            window.location.href = 'thankyou.html';

        } catch (error) {
            showError('Failed to submit. Please try again later.');
        }
    }
    
    function showError(message) {
        messageEl.textContent = message;
        messageEl.style.color = 'red';
        submitBtn.disabled = false;
    }
});