document.addEventListener('DOMContentLoaded', function () {
    const spinButton = document.getElementById('spin');
    const formPopup = document.getElementById('form-popup');
    const participantForm = document.getElementById('formularioParticipante');
    const errorMessage = document.getElementById('error-message');

    let intentosRestantes = 0;
    let spunNumbers = [];
    let totalSum = 0;
    let deactivatedNumbers = []; // Track deactivated numbers

    // Fetch deactivated numbers from the backend
    async function fetchDeactivatedNumbers() {
        try {
            const response = await fetch('http://localhost:3000/deactivated-numbers');
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            deactivatedNumbers = await response.json();
            console.log('Deactivated numbers:', deactivatedNumbers);
            updateRouletteWheel(); // Update the roulette wheel
        } catch (error) {
            console.error('Error fetching deactivated numbers:', error);
            errorMessage.innerText = 'Error fetching deactivated numbers. Please try again later.';
        }
    }

    // Update the roulette wheel to reflect deactivated numbers
    function updateRouletteWheel() {
        const canvas = document.getElementById("canvas");
        if (canvas.getContext) {
            const ctx = canvas.getContext("2d");
            const options = Array.from({ length: 250 }, (_, i) => i + 1);

            // Redraw the roulette wheel with deactivated numbers
            drawRouletteWheel(options, deactivatedNumbers);
        }
    }

    // Modify the drawRouletteWheel function to handle deactivated numbers
    function drawRouletteWheel(options, deactivatedNumbers) {
        const canvas = document.getElementById("canvas");
        if (canvas.getContext) {
            const outsideRadius = canvas.width / 2 - 20;
            const textRadius = outsideRadius - 50;
            const insideRadius = 50;

            ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            ctx.strokeStyle = "black";
            ctx.lineWidth = 2;
            ctx.font = 'bold 12px Helvetica, Arial';

            for (let i = 0; i < options.length; i++) {
                const angle = startAngle + i * arc;
                const isDeactivated = deactivatedNumbers.includes(options[i]);

                // Use a different color for deactivated numbers
                ctx.fillStyle = isDeactivated ? '#ccc' : getColor(i, options.length);

                ctx.beginPath();
                ctx.arc(canvas.width / 2, canvas.height / 2, outsideRadius, angle, angle + arc, false);
                ctx.arc(canvas.width / 2, canvas.height / 2, insideRadius, angle + arc, angle, true);
                ctx.stroke();
                ctx.fill();

                ctx.save();
                ctx.shadowOffsetX = -1;
                ctx.shadowOffsetY = -1;
                ctx.shadowBlur = 0;
                ctx.shadowColor = "rgb(220,220,220)";
                ctx.fillStyle = isDeactivated ? '#888' : 'black';
                ctx.translate(canvas.width / 2 + Math.cos(angle + arc / 2) * textRadius,
                    canvas.height / 2 + Math.sin(angle + arc / 2) * textRadius);
                ctx.rotate(angle + arc / 2 + Math.PI / 2);
                const text = options[i];
                ctx.fillText(text, -ctx.measureText(text).width / 2, 0);
                ctx.restore();
            }

            // Draw the arrow
            drawArrow();
        }
    }

    // Handle form submission
    participantForm.addEventListener('submit', async function (event) {
        event.preventDefault();

        const nombre = document.getElementById('nombre').value.trim();
        const boletos = parseInt(document.getElementById('boletos').value, 10);

        if (validateForm(nombre, boletos)) {
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

                // Update participant information
                document.getElementById('nombreParticipante').innerText = `👤 Participante: ${nombre}`;
                document.getElementById('intentosRestantes').innerText = `🔄 Intentos: ${boletos}`;
                intentosRestantes = boletos;

                // Hide the form popup after successful submission
                formPopup.style.display = "none";

                // Enable the spin button
                spinButton.disabled = false;

                // Fetch updated deactivated numbers
                await fetchDeactivatedNumbers();
            } catch (error) {
                console.error('Error:', error);
                errorMessage.innerText = 'Error submitting form. Please try again.';
            }
        } else {
            errorMessage.innerText = 'Por favor, complete todos los campos correctamente.';
        }
    });

    // Fetch deactivated numbers when the page loads
    fetchDeactivatedNumbers();

    // Validate form inputs
    function validateForm(nombre, boletos) {
        const nombrePattern = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ ]{2,50}$/;
        return nombrePattern.test(nombre) && boletos > 0;
    }

    // Sanitize input to prevent XSS
    function sanitizeInput(input) {
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }

    // Roulette wheel logic
    const options = Array.from({ length: 250 }, (_, i) => i + 1);
    let startAngle = 0;
    const arc = Math.PI / (options.length / 2);
    let spinTimeout = null;
    let spinTime = 0;
    let spinTimeTotal = 0;
    let ctx;
    let spinAngleStart = 0; // Declare and initialize spinAngleStart

    // Color generation functions
    function byte2Hex(n) {
        var nybHexString = "0123456789ABCDEF";
        return String(nybHexString.substr((n >> 4) & 0x0F, 1)) + nybHexString.substr(n & 0x0F, 1);
    }

    function RGB2Color(r, g, b) {
        return '#' + byte2Hex(r) + byte2Hex(g) + byte2Hex(b);
    }

    function getColor(item, maxitem) {
        var phase = 0;
        var center = 128;
        var width = 127;
        var frequency = Math.PI * 2 / maxitem;

        red = Math.sin(frequency * item + 2 + phase) * width + center;
        green = Math.sin(frequency * item + 0 + phase) * width + center;
        blue = Math.sin(frequency * item + 4 + phase) * width + center;

        return RGB2Color(red, green, blue);
    }

    function drawRouletteWheel() {
        var canvas = document.getElementById("canvas");
        if (canvas.getContext) {
            // Adjust canvas size based on container
            const container = document.querySelector('.ruleta-container');
            const containerWidth = container.clientWidth;
            const canvasSize = Math.min(containerWidth, 500); // Limit to 500px as per CSS
            canvas.width = canvasSize;
            canvas.height = canvasSize;

            var outsideRadius = canvas.width / 2 - 20;
            var textRadius = outsideRadius - 50;
            var insideRadius = 50;

            ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            ctx.strokeStyle = "black";
            ctx.lineWidth = 2;

            // Use a larger font size for better readability
            ctx.font = 'bold 14 sans-serif';

            for (var i = 0; i < options.length; i++) {
                var angle = startAngle + i * arc;
                ctx.fillStyle = getColor(i, options.length);

                ctx.beginPath();
                ctx.arc(canvas.width / 2, canvas.height / 2, outsideRadius, angle, angle + arc, false);
                ctx.arc(canvas.width / 2, canvas.height / 2, insideRadius, angle + arc, angle, true);
                ctx.stroke();
                ctx.fill();

                ctx.save();
                ctx.shadowOffsetX = -1;
                ctx.shadowOffsetY = -1;
                ctx.shadowBlur = 0;
                ctx.shadowColor = "rgb(220,220,220)";
                ctx.fillStyle = "black";

                // Adjust text positioning to ensure it's horizontal
                const textAngle = angle + arc / 2;
                const x = canvas.width / 2 + Math.cos(textAngle) * textRadius;
                const y = canvas.height / 2 + Math.sin(textAngle) * textRadius;

                ctx.translate(x, y);
                ctx.rotate(textAngle + Math.PI / 2); // Rotate text to be horizontal
                const text = options[i].toString();
                ctx.fillText(text, -ctx.measureText(text).width / 2, 0);
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
    }

    spinButton.addEventListener('click', function () {
        if (intentosRestantes > 0) {
            spinAngleStart = Math.random() * 10 + 10; // Initialize spinAngleStart here
            spinTime = 0;
            spinTimeTotal = Math.random() * 3 + 4 * 1000;
            rotateWheel();
            intentosRestantes--;
            document.getElementById('intentosRestantes').innerText = `🔄 Intentos: ${intentosRestantes}`;
        } else {
            alert('No tienes más intentos.');
        }
    });

    function rotateWheel() {
        spinTime += 30;
        if (spinTime >= spinTimeTotal) {
            stopRotateWheel();
            return;
        }
        var spinAngle = spinAngleStart - easeOut(spinTime, 0, spinAngleStart, spinTimeTotal);
        startAngle += (spinAngle * Math.PI / 180);
        drawRouletteWheel();
        spinTimeout = setTimeout(rotateWheel, 30);
    }

    function stopRotateWheel() {
        clearTimeout(spinTimeout);
        var degrees = startAngle * 180 / Math.PI + 90;
        var arcd = arc * 180 / Math.PI;
        var index = Math.floor((360 - degrees % 360) / arcd);
        var winner = options[index];

        // Add the spun number to the list
        spunNumbers.push(winner);
        totalSum += winner;

        // Update the UI
        document.getElementById('boletosObtenidos').innerText = `🎟️ Boletos: ${spunNumbers.join(', ')}`;
        document.getElementById('totalBoletos').innerText = `💰 Total: ${totalSum}`;
        document.getElementById('mensaje').innerText = `¡Tu boleto es el ${winner}!`;
        document.getElementById('mensaje').setAttribute("aria-hidden", "false");
    }

    function easeOut(t, b, c, d) {
        var ts = (t /= d) * t;
        var tc = ts * t;
        return b + c * (tc + -3 * ts + 3 * t);
    }

    // Initial draw of the roulette wheel
    drawRouletteWheel();

    // Adjust canvas size on window resize
    window.addEventListener('resize', drawRouletteWheel);
});