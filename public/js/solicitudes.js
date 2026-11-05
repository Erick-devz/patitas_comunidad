function obtenerToken() {
    return sessionStorage.getItem("tokenAdmin");
}

function guardarToken(token) {
    sessionStorage.setItem("tokenAdmin", token);
}

function borrarToken() {
    sessionStorage.removeItem("tokenAdmin");
}

async function iniciarSesion() {
    const usuario = prompt("Usuario administrador:");
    if (usuario === null) return false;

    const password = prompt("Contraseña:");
    if (password === null) return false;

    try {
        const respuesta = await fetch("/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                usuario: usuario.trim(),
                password: password
            })
        });

        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            alert(resultado.mensaje || "No se pudo iniciar sesión.");
            return false;
        }

        guardarToken(resultado.token);
        alert("Sesión iniciada correctamente.");
        return true;
    } catch (error) {
        console.error("Error:", error.message);
        alert("No se pudo conectar con el servidor.");
        return false;
    }
}

async function cambiarEstado(idSolicitud, estadoNuevo) {
    const token = obtenerToken();

    try {
        const respuesta = await fetch(
            "/api/solicitudes-adopcion/" + idSolicitud + "/estado",
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": token
                },
                body: JSON.stringify({
                    estadoSolicitud: estadoNuevo
                })
            }
        );

        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(resultado.mensaje);
        }

        alert(resultado.mensaje);
        await cargarSolicitudes();
    } catch (error) {
        alert("No se pudo actualizar la solicitud.");
        console.error("Error:", error.message);
    }
}

async function cargarSolicitudes() {
    const lista = document.getElementById("listaSolicitudes");
    const token = obtenerToken();

    // Si no hay sesión, pedir login
    if (!token) {
        const ok = await iniciarSesion();
        if (!ok) {
            lista.textContent = "Debes iniciar sesión para ver las solicitudes.";
            return;
        }
    }

    try {
        const respuesta = await fetch("/api/solicitudes-adopcion", {
            headers: {
                "Authorization": obtenerToken()
            }
        });

        // Si el token expiró o es inválido
        if (respuesta.status === 401) {
            borrarToken();
            lista.textContent = "Sesión expirada. Recarga la página e inicia sesión otra vez.";
            return;
        }

        if (!respuesta.ok) {
            throw new Error("No se pudieron consultar las solicitudes.");
        }

        const solicitudes = await respuesta.json();
        lista.textContent = "";

        if (solicitudes.length === 0) {
            lista.textContent = "Todavía no hay solicitudes.";
            return;
        }

        solicitudes.forEach(function (solicitud) {
            const tarjeta = document.createElement("article");
            tarjeta.className = "tarjeta-perrito";

            const informacion = document.createElement("div");
            informacion.className = "info-perrito";

            const titulo = document.createElement("h3");
            titulo.textContent =
                solicitud.nombrePersona + " quiere adoptar a " +
                solicitud.nombreAnimal;

            const telefono = document.createElement("p");
            telefono.textContent = "Teléfono: " + solicitud.telefono;

            const correo = document.createElement("p");
            correo.textContent = "Correo: " + solicitud.correo;

            const mensaje = document.createElement("p");
            mensaje.textContent = "Mensaje: " + solicitud.mensaje;

            const estado = document.createElement("p");
            estado.textContent = "Estado: " + solicitud.estadoSolicitud;

            informacion.appendChild(titulo);
            informacion.appendChild(telefono);
            informacion.appendChild(correo);
            informacion.appendChild(mensaje);
            informacion.appendChild(estado);

            if (solicitud.estadoSolicitud === "pendiente") {
                const botonContactar = document.createElement("button");
                botonContactar.type = "button";
                botonContactar.textContent = "Marcar como contactada";

                botonContactar.addEventListener("click", function () {
                    cambiarEstado(solicitud.idSolicitud, "contactada");
                });

                informacion.appendChild(botonContactar);
            }

            if (solicitud.estadoSolicitud === "contactada") {
                const botonAceptar = document.createElement("button");
                botonAceptar.type = "button";
                botonAceptar.textContent = "Aceptar solicitud";

                botonAceptar.addEventListener("click", function () {
                    cambiarEstado(solicitud.idSolicitud, "aceptada");
                });

                const botonRechazar = document.createElement("button");
                botonRechazar.type = "button";
                botonRechazar.textContent = "Rechazar solicitud";

                botonRechazar.addEventListener("click", function () {
                    cambiarEstado(solicitud.idSolicitud, "rechazada");
                });

                informacion.appendChild(botonAceptar);
                informacion.appendChild(botonRechazar);
            }

            tarjeta.appendChild(informacion);
            lista.appendChild(tarjeta);
        });
    } catch (error) {
        console.error("Error:", error.message);
        lista.textContent = "No se pudieron cargar las solicitudes.";
    }
}

cargarSolicitudes();