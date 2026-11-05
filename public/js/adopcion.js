async function cargarPerritos() {
    const listaPerritos = document.getElementById("listaPerritos");

    try {
        const respuesta = await fetch("/api/perritos");

        if (!respuesta.ok) {
            throw new Error("El servidor no pudo cargar los perritos.");
        }

        const perritos = await respuesta.json();
        listaPerritos.textContent = "";

        if (perritos.length === 0) {
            listaPerritos.textContent = "Todavía no hay perritos publicados.";
            return;
        }

        perritos.forEach(function (perrito) {
            const tarjeta = document.createElement("article");
            tarjeta.className = "tarjeta-perrito";

            const foto = document.createElement("img");
            foto.src = perrito.foto;
            foto.alt = "Foto de " + perrito.nombre;
            foto.loading = "lazy";

            const informacion = document.createElement("div");
            informacion.className = "info-perrito";

            const nombre = document.createElement("h3");
            nombre.textContent = perrito.nombre;

            const edad = document.createElement("p");
            edad.textContent = "Edad: " + perrito.edad;

            const descripcion = document.createElement("p");
            descripcion.textContent = perrito.descripcion;

            const boton = document.createElement("button");
            boton.type = "button";
            boton.textContent = "Me interesa conocerlo";

            boton.addEventListener("click", async function () {
                const nombrePersona = prompt("¿Cuál es tu nombre?");
                if (nombrePersona === null) return;
                if (nombrePersona.trim().length < 3) {
                    alert("El nombre debe tener al menos 3 caracteres.");
                    return;
                }

                const telefono = prompt("Escribe tu teléfono:");
                if (telefono === null) return;
                if (!/^[0-9+\-\s]{7,20}$/.test(telefono.trim())) {
                    alert("El teléfono no es válido.");
                    return;
                }

                const correo = prompt("Escribe tu correo:");
                if (correo === null) return;
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
                    alert("El correo no es válido.");
                    return;
                }

                const mensaje = prompt("¿Por qué te interesa adoptar a " + perrito.nombre + "?");
                if (mensaje === null) return;
                if (mensaje.trim().length < 5) {
                    alert("El mensaje debe tener al menos 5 caracteres.");
                    return;
                }

                try {
                    const respuesta = await fetch("/api/solicitudes-adopcion", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            idAnimal: perrito.idAnimal,
                            nombrePersona: nombrePersona.trim(),
                            telefono: telefono.trim(),
                            correo: correo.trim(),
                            mensaje: mensaje.trim()
                        })
                    });

                    const resultado = await respuesta.json();

                    if (!respuesta.ok) {
                        throw new Error(resultado.mensaje || "No se pudo enviar la solicitud.");
                    }

                    alert(resultado.mensaje);
                } catch (error) {
                    alert(error.message);
                    console.error("Error:", error.message);
                }
            });

            informacion.appendChild(nombre);
            informacion.appendChild(edad);
            informacion.appendChild(descripcion);
            informacion.appendChild(boton);

            tarjeta.appendChild(foto);
            tarjeta.appendChild(informacion);
            listaPerritos.appendChild(tarjeta);
        });
    } catch (error) {
        console.error("Error:", error.message);
        listaPerritos.textContent = "No se pudieron cargar los perritos.";
    }
}

cargarPerritos();