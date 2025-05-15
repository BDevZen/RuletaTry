document.addEventListener('DOMContentLoaded', function () {
    const spinButton = document.getElementById('spin');
    const formPopup = document.getElementById('form-popup');
    const participantForm = document.getElementById('formularioParticipante');
    const errorMessage = document.getElementById('error-message');

    let intentosRestantes = 0;
    let spunNumbers = []; // Track numbers spun on the roulette
    let totalSum = 0; // Track the total sum of spun numbers
    let deactivatedNumbers = []; // Track deactivated numbers
    let participantId; // Store the participant's ID

    // Initialize UI
    updateUI();

    // Fetch deactivated numbers from the backend
    async function fetchDeactivatedNumbers() {
        try {
            const response = await fetch('/deactivated-numbers');
            if (!response.ok) {
                throw new Error('Error fetching deactivated numbers');
            }
            deactivatedNumbers = await response.json();
            console.log('Deactivated numbers:', deactivatedNumbers);
            updateRouletteWheel(); // Update the roulette wheel
        } catch (error) {
            console.error('Error:', error);
            showError('Error loading numbers. Please refresh the page.');
        }
    }

    // Update all UI elements
    function updateUI() {
        document.getElementById('nombreParticipante').innerText = `👤 Participante: ${participantId ? 'Active' : 'None'}`;
        document.getElementById('intentosRestantes').innerText = `🔄 Intentos: ${intentosRestantes}`;
        document.getElementById('boletosObtenidos').innerText = `🎟️ Boletos: ${spunNumbers.join(', ') || 'None'}`;
        document.getElementById('totalBoletos').innerText = `💰 Total: ${totalSum}`;
        document.getElementById('mensaje').innerText = spunNumbers.length ? `Last number: ${spunNumbers[spunNumbers.length-1]}` : '';
        spinButton.disabled = intentosRestantes <= 0 || !participantId;
    }

    // Show error message
    function showError(message) {
        errorMessage.innerText = message;
        errorMessage.style.display = 'block';
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    }

    // Reset the application state
    function resetApp() {
        spunNumbers = [];
        totalSum = 0;
        participantId = null;
        intentosRestantes = 0;
        formPopup.style.display = "block";
        updateUI();
    }

    // Define updateRouletteWheel function
    // function updateRouletteWheel() {
    //     const canvas = document.getElementById("canvas");
    //     if (canvas.getContext) {
    //         const ctx = canvas.getContext("2d");
    //         const options = Array.from({ length: 250 }, (_, i) => i + 1);

    //         // Redraw the roulette wheel with deactivated numbers
    //         drawRouletteWheel(options, deactivatedNumbers);
    //     }
    // }

    // Handle form submission
    participantForm.addEventListener('submit', async function (event) {
        event.preventDefault();

        const nombre = document.getElementById('nombre').value.trim();
        const boletos = parseInt(document.getElementById('boletos').value, 10);
    
        if (!validateForm(nombre, boletos)) {
            showError('Por favor, complete todos los campos correctamente.');
            return;
        }

        try {
            // Send data to the backend
            const response = await fetch('/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ nombre, boletos }),
            });

            if (!response.ok) {
                throw new Error('Error submitting form');
            }

            const data = await response.json();
            console.log('Participant added:', data.participant);

            // Store the participant's ID
            participantId = data.participant.id;

            // Update participant information
            intentosRestantes = boletos;

            // Hide the form popup after successful submission
            formPopup.style.display = "none";

            // Enable the spin button
            updateUI();

            // Fetch updated deactivated numbers
            await fetchDeactivatedNumbers();
        } catch (error) {
            console.error('Error:', error);
            showError('Error submitting form. Please try again.');
        }
    });

    // Validate form inputs
    function validateForm(nombre, boletos) {
        const nombrePattern = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ ]{2,50}$/;
        return nombrePattern.test(nombre) && boletos > 0 && boletos <= 250;
    }

    // Sanitize input to prevent XSS
    function sanitizeInput(input) {
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }

    // Roulette wheel logic
    const options = [65, 69, 71, 72, 73, 77, 78, 82, 84, 94, 95, 98, 104, 112, 113, 115, 116, 120, 122, 124, 125, 126, 127, 128, 130, 133, 135, 137, 146, 147, 148, 149, 152, 153, 155, 156, 159, 162, 163, 164, 165, 166, 167, 170, 174, 179, 181, 183, 184, 185, 191, 192, 197, 198, 201, 202, 204, 208, 209, 212, 213, 215, 217, 218, 220, 221, 222, 224, 225, 230, 233, 235, 236, 237, 238, 240, 242, 243, 245, 246, 247, 248, 250];
    let startAngle = 0;
    const arc = Math.PI / (options.length / 2);
    let spinTimeout = null;
    let spinTime = 0;
    let spinTimeTotal = 0;
    let ctx;
    let spinAngleStart = 0; // Declare and initialize spinAngleStart

    // Function to generate HSL colors
    function getHSLColor(index, total) {
        const hue = (index * 360) / total; // Distribute hues evenly
        return `hsl(${hue}, 100%, 50%)`; // Full saturation and lightness
    }

    function drawRouletteWheel() {
        const canvas = document.getElementById("canvas");
        if (!canvas.getContext) return;

        const outsideRadius = canvas.width / 2 - 2 * 16; // Convert 2rem to pixels (1rem = 16px)
        const textRadius = outsideRadius - 3 * 16; // Convert 3rem to pixels
        const insideRadius = 1 * 16; // Convert 1rem to pixels

        ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Use HSL colors for the cells
        for (let i = 0; i < options.length; i++) {
            const angle = startAngle + i * arc;
            const isDeactivated = deactivatedNumbers.includes(options[i]);

            // Use a dark shade for deactivated numbers
            ctx.fillStyle = isDeactivated ? '#888' : getHSLColor(i, options.length);

            // Draw the cell (division)
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, outsideRadius, angle, angle + arc, false);
            ctx.arc(canvas.width / 2, canvas.height / 2, insideRadius, angle + arc, angle, true);
            ctx.closePath();
            ctx.fill();

            // Draw the number
            ctx.save();
            ctx.fillStyle = isDeactivated ? '#555' : 'black'; // Darker text for deactivated numbers
            ctx.translate(
                canvas.width / 2 + Math.cos(angle + arc / 2) * textRadius,
                canvas.height / 2 + Math.sin(angle + arc / 2) * textRadius
            );
            ctx.rotate(angle + arc / 2); // Rotate text to align horizontally
            const text = options[i].toString();
            ctx.font = 'bold 14px Arial'; // Use rem for font size
            ctx.textAlign = 'center'; // Center the text horizontally
            ctx.textBaseline = 'middle'; // Center the text vertically
            ctx.fillText(text, 0, 0); // Draw the text at the center
            ctx.restore();
        }

        // Draw the arrow
        ctx.fillStyle = "black";
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2 - 4, canvas.height / 2 - (outsideRadius + 5));
        ctx.lineTo(canvas.width / 2 + 4, canvas.height / 2 - (outsideRadius + 5));
        ctx.lineTo(canvas.width / 2 + 4, canvas.height / 2 - (outsideRadius - 5));
        ctx.lineTo(canvas.width / 2 + 9, canvas.height / 2 - (outsideRadius - 5));
        ctx.lineTo(canvas.width / 2 + 0, canvas.height / 2 - (outsideRadius - 13));
        ctx.lineTo(canvas.width / 2 - 9, canvas.height / 2 - (outsideRadius - 5));
        ctx.lineTo(canvas.width / 2 - 4, canvas.height / 2 - (outsideRadius - 5));
        ctx.lineTo(canvas.width / 2 - 4, canvas.height / 2 - (outsideRadius + 5));
        ctx.fill();
    }

    spinButton.addEventListener('click', function () {
        if (intentosRestantes <= 0) {
            showError('No tienes más intentos.');
            return;
        }
    
        const spinAngleStart = Math.random() * 10 + 10;
        spinTime = 0;
        spinTimeTotal = Math.random() * 3 + 4 * 1000;
        rotateWheel(spinAngleStart);
        intentosRestantes--;
        updateUI();
    });

    function rotateWheel() {
        spinTime += 30;
        if (spinTime >= spinTimeTotal) {
            stopRotateWheel();
            return;
        }
        const spinAngle = spinAngleStart - easeOut(spinTime, 0, spinAngleStart, spinTimeTotal);
        startAngle += (spinAngle * Math.PI) / 180;
        drawRouletteWheel();

        // Check if all numbers are deactivated
        // const availableNumbers = options.filter(num => !deactivatedNumbers.includes(num));
        // if (availableNumbers.length === 0) {
        //     clearTimeout(spinTimeout);
        //     alert('No hay más números disponibles para girar.');
        //     return;
        // }
        
        // Continue spinning until spinTimeTotal is reached
        if (spinTime < spinTimeTotal) {
            spinTimeout = setTimeout(rotateWheel, 30);
        } 
    }

    async function stopRotateWheel() {
        clearTimeout(spinTimeout);
        const degrees = (startAngle * 180) / Math.PI + 90;
        const arcd = arc * 180 / Math.PI;
        const index = Math.floor((360 - degrees % 360) / arcd);
        const winner = options[index];

        // Check if number is already spun
        if (spunNumbers.includes(winner)) {
            showError('Este número ya fue seleccionado. Girando nuevamente...');
            spinButton.click();
            return;
        }

        // Add the spun number to the list
        spunNumbers.push(winner);
        totalSum += winner;

        // Update the UI
        updateUI();

        // Redraw the roulette wheel to mark the deactivated number
        drawRouletteWheel();


        // Send the updated deactivated numbers to the backend
        try {
            const deactivatedResponse = await fetch('/update-deactivated-numbers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: participantId, // Ensure you have the participant's ID
                    deactivatedNumbers: [...deactivatedNumbers, winner]
                }),
            });

            // Update tickets and total
            const ticketsResponse = await fetch('/update-tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: participantId,
                    tickets: spunNumbers.join(','),
                    total: totalSum
                }),
            });

            if (!deactivatedResponse.ok || !ticketsResponse.ok) {
                throw new Error('Error updating data');
            }

            // Update UI with success
            document.getElementById('mensaje').innerText = `¡Tu boleto es el número: ${winner}!`;
            await fetchDeactivatedNumbers();
        } catch (error) {
            console.error('Error:', error);
            showError('Error updating data. Please try again.');
        }
    }

    // Reset button handler
    resetButton.addEventListener('click', resetApp);

    function easeOut(t, b, c, d) {
        t /= d;
        return c * (t * t * t + -3 * t * t + 3 * t) + b;
    }

    // Initial draw of the roulette wheel
    fetchDeactivatedNumbers();
    drawRouletteWheel();

    // Adjust canvas size on window resize
    window.addEventListener('resize', drawRouletteWheel);
});