document.addEventListener('DOMContentLoaded', () => {
    // Form elements
    const form = document.getElementById('feedback-form');
    const messageEl = document.getElementById('response-message');
    const submitBtn = document.getElementById('submit-btn');

    // Drag and drop elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const dropZonePrompt = document.getElementById('drop-zone-prompt');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('image-preview');
    const imageName = document.getElementById('image-name');
    
    let uploadedFile = null;

    // !!! IMPORTANT: PASTE YOUR NEW GOOGLE APPS SCRIPT URL HERE !!!
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxP5sMDX7I7fjtjbw_QaFK9LhkBspZPrBWCBLj0BywWSW1fYrYVvmMk7zPyoX5jYu8z3A/exec'; 

    // --- Drag and Drop Logic ---

    // Open file selector when drop zone is clicked
    dropZone.addEventListener('click', () => fileInput.click());

    // Add highlighting effect when dragging over
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-blue-500', 'bg-blue-50');
    });

    // Remove highlighting effect
    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-blue-500', 'bg-blue-50');
    });

    // Handle the dropped file
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-blue-500', 'bg-blue-50');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });
    
    // Handle file selected from file input
    fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
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
        }
    }

    // --- Form Submission Logic ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;
        messageEl.textContent = 'Submitting...';

        const comment = form.querySelector('#comment').value;
        const email = form.querySelector('#email').value;
        
        let payload = { comment, email };

        // If a file was uploaded, convert it to Base64 and add to payload
        if (uploadedFile) {
            const reader = new FileReader();
            reader.readAsDataURL(uploadedFile);
            reader.onload = async () => {
                payload.imageBase64 = reader.result;
                payload.imageName = uploadedFile.name;
                payload.imageType = uploadedFile.type;
                await sendData(payload);
            };
            reader.onerror = () => {
                showError('Could not read the file.');
            };
        } else {
            await sendData(payload);
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
            
            showSuccess('Thank you for your feedback!');
            form.reset();
            resetDropZone();
        } catch (error) {
            showError('Failed to submit. Please try again later.');
        }
    }
    
    function resetDropZone() {
        uploadedFile = null;
        imagePreview.src = '';
        dropZonePrompt.classList.remove('hidden');
        imagePreviewContainer.classList.add('hidden');
    }

    function showSuccess(message) {
        messageEl.textContent = message;
        messageEl.style.color = 'green';
        submitBtn.disabled = false;
    }
    
    function showError(message) {
        messageEl.textContent = message;
        messageEl.style.color = 'red';
        submitBtn.disabled = false;
    }
});