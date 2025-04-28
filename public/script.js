document.addEventListener('DOMContentLoaded', function () {
    const spinButton = document.getElementById('spin');
    const formPopup = document.getElementById('form-popup');
    const participantForm = document.getElementById('formularioParticipante');
    const errorMessage = document.getElementById('error-message');

    let intentosRestantes = 0;
    let spunNumbers = [];
    let totalSum = 0;
    let deactivatedNumbers = [];
    let participantId;
    let availableNumbers = [];
    let arc;
    let ctx;
    let spinTimeout = null;
    let spinAngleStart = 0;
    let startAngle = 0;
    let spinTime = 0;
    let spinTimeTotal = 0;
    let animationFrameId = null;

    // Fetch deactivated numbers from the backend
    async function fetchDeactivatedNumbers() {
        try {
            const response = await fetch('/deactivated-numbers');
            if (!response.ok) throw new Error('Error fetching deactivated numbers');
            
            deactivatedNumbers = await response.json();
            updateAvailableNumbers();
            drawRouletteWheel();
        } catch (error) {
            console.error('Error:', error);
        }
    }

    // Update available numbers based on deactivated numbers
    function updateAvailableNumbers() {
        availableNumbers = Array.from({ length: 250 }, (_, i) => i + 1)
            .filter(num => !deactivatedNumbers.includes(num));
        arc = Math.PI / (availableNumbers.length / 2);
    }

    // Handle form submission
    participantForm.addEventListener('submit', async function (event) {
        event.preventDefault();

        const nombre = document.getElementById('nombre').value.trim();
        const boletos = parseInt(document.getElementById('boletos').value, 10);

        if (validateForm(nombre, boletos)) {
            try {
                const response = await fetch('/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre, boletos }),
                });

                if (!response.ok) throw new Error('Error submitting form');

                const data = await response.json();
                participantId = data.participant.id;

                document.getElementById('nombreParticipante').innerText = `👤 Participante: ${nombre}`;
                document.getElementById('intentosRestantes').innerText = `🔄 Intentos: ${boletos}`;
                intentosRestantes = boletos;

                formPopup.style.display = "none";
                spinButton.disabled = false;
                await fetchDeactivatedNumbers();
            } catch (error) {
                console.error('Error:', error);
                errorMessage.innerText = 'Error submitting form. Please try again.';
            }
        } else {
            errorMessage.innerText = 'Por favor, complete todos los campos correctamente.';
        }
    });

    // Validate form inputs
    function validateForm(nombre, boletos) {
        const nombrePattern = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ ]{2,50}$/;
        return nombrePattern.test(nombre) && boletos > 0;
    }

    // Generate HSL colors
    function getHSLColor(index, total) {
        const hue = (index * 360) / total;
        return `hsl(${hue}, 100%, 50%)`;
    }

    // Optimized wheel drawing function
    function drawRouletteWheel() {
        const canvas = document.getElementById("canvas");
        if (!canvas.getContext) return;

        ctx = canvas.getContext("2d");
        const outsideRadius = canvas.width / 2 - 32; // 2rem in pixels
        const textRadius = outsideRadius - 48; // 3rem in pixels
        const insideRadius = 16; // 1rem in pixels

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw only available numbers
        for (let i = 0; i < availableNumbers.length; i++) {
            const angle = startAngle + i * arc;
            
            ctx.fillStyle = getHSLColor(i, availableNumbers.length);
            
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, outsideRadius, angle, angle + arc, false);
            ctx.arc(canvas.width / 2, canvas.height / 2, insideRadius, angle + arc, angle, true);
            ctx.closePath();
            ctx.fill();
            
            // Draw number
            ctx.save();
            ctx.fillStyle = 'black';
            ctx.translate(
                canvas.width / 2 + Math.cos(angle + arc / 2) * textRadius,
                canvas.height / 2 + Math.sin(angle + arc / 2) * textRadius
            );
            ctx.rotate(angle + arc / 2);
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(availableNumbers[i].toString(), 0, 0);
            ctx.restore();
        }

        // Draw arrow
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

    // Spin button handler
    spinButton.addEventListener('click', function () {
        if (intentosRestantes > 0) {
            spinAngleStart = Math.random() * 10 + 10;
            spinTime = 0;
            spinTimeTotal = Math.random() * 2 + 2 * 1000; // Reduced spin time
            rotateWheel();
            intentosRestantes--;
            document.getElementById('intentosRestantes').innerText = `🔄 Intentos: ${intentosRestantes}`;
        } else {
            alert('No tienes más intentos.');
        }
    });

    // Optimized rotation using requestAnimationFrame
    function rotateWheel() {
        spinTime += 16; // ~60fps
        if (spinTime >= spinTimeTotal) {
            stopRotateWheel();
            return;
        }

        const spinAngle = spinAngleStart - easeOut(spinTime, 0, spinAngleStart, spinTimeTotal);
        startAngle += (spinAngle * Math.PI) / 180;
        
        // Only redraw every 3 frames for better performance
        if (spinTime % 48 === 0) {
            drawRouletteWheel();
        }
        
        animationFrameId = requestAnimationFrame(rotateWheel);
    }

    // Optimized stop function
    async function stopRotateWheel() {
        cancelAnimationFrame(animationFrameId);
        drawRouletteWheel(); // Final draw
        
        // Find a valid number
        let winner;
        let attempts = 0;
        const maxAttempts = 250;
        
        do {
            const degrees = (startAngle * 180) / Math.PI + 90;
            const arcd = arc * 180 / Math.PI;
            const index = Math.floor((360 - degrees % 360) / arcd) % availableNumbers.length;
            winner = availableNumbers[index];
            
            if (attempts++ > maxAttempts) break;
            startAngle += (arc * 0.1);
        } while (deactivatedNumbers.includes(winner));

        // Update UI and backend
        spunNumbers.push(winner);
        totalSum += winner;
        deactivatedNumbers.push(winner);
        updateAvailableNumbers();

        document.getElementById('boletosObtenidos').innerText = `🎟️ Boletos: ${spunNumbers.join(', ')}`;
        document.getElementById('totalBoletos').innerText = `💰 Total: ${totalSum}`;
        document.getElementById('mensaje').innerText = `¡Tu boleto es el número: ${winner}!`;
        document.getElementById('mensaje').setAttribute("aria-hidden", "false");

        try {
            // Update backend
            const updatePromises = [
                fetch('/update-deactivated-numbers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: participantId, deactivatedNumbers }),
                }),
                fetch('/update-tickets', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        id: participantId,
                        tickets: spunNumbers.join(','),
                        total: totalSum 
                    }),
                })
            ];

            await Promise.all(updatePromises);
        } catch (error) {
            console.error('Error:', error);
            errorMessage.innerText = 'Error updating data. Please try again.';
        }
    }

    // Easing function
    function easeOut(t, b, c, d) {
        t /= d;
        return c * (t * t * t + -3 * t * t + 3 * t) + b;
    }

    // Initial setup
    fetchDeactivatedNumbers();
    window.addEventListener('resize', drawRouletteWheel);
});