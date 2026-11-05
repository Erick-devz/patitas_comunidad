require("dotenv").config();
const path = require("path");
const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const conexion = require("./database");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const puerto = process.env.PORT || 3000;

function esEnteroPositivo(valor) {
    const n = Number(valor);
    return Number.isInteger(n) && n > 0;
}

function textoValido(valor, min, max) {
    if (typeof valor !== "string") return false;
    const limpio = valor.trim();
    return limpio.length >= min && limpio.length <= max;
}

function correoValido(correo) {
    if (typeof correo !== "string") return false;
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(correo.trim()) && correo.trim().length <= 100;
}

function telefonoValido(telefono) {
    if (typeof telefono !== "string") return false;
    const limpio = telefono.trim();
    return /^[0-9+\-\s]{7,20}$/.test(limpio);
}


const sesiones = new Map(); 

function crearToken() {
    return crypto.randomBytes(24).toString("hex");
}

function sesionValida(token) {
    if (!token || !sesiones.has(token)) return false;
    if (Date.now() > sesiones.get(token)) {
        sesiones.delete(token);
        return false;
    }
    return true;
}

// Middleware: protege rutas de administrador
function requiereLogin(req, res, next) {
    const token = req.headers.authorization;
    if (!sesionValida(token)) {
        return res.status(401).json({
            mensaje: "Debes iniciar sesión para ver las solicitudes."
        });
    }
    next();
}

// ============================================
// 3. RUTA PRINCIPAL
// ============================================
app.get("/", (req, res) => {
    res.redirect("/html/index.html");
});

// ============================================
// 4. LOGIN DE ADMINISTRADOR
// ============================================
app.post("/api/login", async (req, res) => {
    const { usuario, password } = req.body;

    if (!usuario || !password) {
        return res.status(400).json({ mensaje: "Escribe usuario y contraseña." });
    }

    const adminUser = process.env.ADMIN_USER;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminUser || !adminPassword) {
        return res.status(500).json({ mensaje: "El acceso de administrador no está configurado." });
    }

    if (usuario.trim() !== adminUser || password !== adminPassword) {
        return res.status(401).json({ mensaje: "Usuario o contraseña incorrectos." });
    }

    const token = crearToken();
    sesiones.set(token, Date.now() + 2 * 60 * 60 * 1000); // 2 horas

    res.json({
        mensaje: "Inicio de sesión correcto.",
        token: token
    });
});

// ============================================
// 5. RUTAS PÚBLICAS
// ============================================

// Probar conexión a la base de datos
app.get("/api/prueba-db", async (req, res) => {
    try {
        const [filas] = await conexion.execute("SELECT DATABASE() AS baseConectada");
        res.json(filas[0]);
    } catch (error) {
        console.error("Error al conectar con MySQL:", error.message);
        res.status(500).json({ mensaje: "No se pudo conectar con la base de datos." });
    }
});

// Listar perritos disponibles para adopción
app.get("/api/perritos", async (req, res) => {
    try {
        const [perritos] = await conexion.execute(
            `SELECT a.idAnimal, a.nombre, a.edadAproximada AS edad,
                    a.descripcion, a.fotoUrl AS foto
             FROM animales AS a
             INNER JOIN reportes AS r ON r.idAnimal = a.idAnimal
             WHERE r.tipoReporte = ? AND r.estadoReporte = ?
             ORDER BY r.fechaReporte DESC`,
            ["adopcion", "publicado"]
        );
        res.json(perritos);
    } catch (error) {
        console.error("Error al consultar los perritos:", error.message);
        res.status(500).json({ mensaje: "No se pudieron cargar los perritos." });
    }
});

// Crear solicitud de adopción
app.post("/api/solicitudes-adopcion", async (req, res) => {
    const { idAnimal, nombrePersona, telefono, correo, mensaje } = req.body;

    // Validaciones del backend (no confiamos en el frontend)
    if (!esEnteroPositivo(idAnimal)) {
        return res.status(400).json({ mensaje: "El id del animal no es válido." });
    }
    if (!textoValido(nombrePersona, 3, 80)) {
        return res.status(400).json({ mensaje: "El nombre debe tener entre 3 y 80 caracteres." });
    }
    if (!telefonoValido(telefono)) {
        return res.status(400).json({ mensaje: "El teléfono no tiene un formato válido." });
    }
    if (!correoValido(correo)) {
        return res.status(400).json({ mensaje: "El correo no tiene un formato válido." });
    }
    if (!textoValido(mensaje, 5, 500)) {
        return res.status(400).json({ mensaje: "El mensaje debe tener entre 5 y 500 caracteres." });
    }

    try {
        await conexion.execute(
            `INSERT INTO solicitudesAdopcion
            (idAnimal, nombrePersona, telefono, correo, mensaje, estadoSolicitud)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                Number(idAnimal),
                nombrePersona.trim(),
                telefono.trim(),
                correo.trim(),
                mensaje.trim(),
                "pendiente"
            ]
        );
        res.status(201).json({ mensaje: "Tu solicitud se guardó correctamente." });
    } catch (error) {
        console.error("Error al guardar la solicitud:", error.message);

        if (error.code === "ER_NO_REFERENCED_ROW_2") {
            return res.status(400).json({ mensaje: "El animal indicado no existe." });
        }
        res.status(500).json({ mensaje: "No se pudo guardar la solicitud." });
    }
});

// ============================================
// 6. RUTAS PROTEGIDAS (necesitan login)
// ============================================

// Listar todas las solicitudes
app.get("/api/solicitudes-adopcion", requiereLogin, async (req, res) => {
    try {
        const [solicitudes] = await conexion.execute(
            `SELECT s.idSolicitud, s.nombrePersona, s.telefono, s.correo,
                    s.mensaje, s.estadoSolicitud, s.fechaSolicitud,
                    a.nombre AS nombreAnimal
             FROM solicitudesAdopcion AS s
             INNER JOIN animales AS a ON s.idAnimal = a.idAnimal
             ORDER BY s.fechaSolicitud DESC`
        );
        res.json(solicitudes);
    } catch (error) {
        console.error("Error al consultar solicitudes:", error.message);
        res.status(500).json({ mensaje: "No se pudieron consultar las solicitudes." });
    }
});

// Cambiar estado de una solicitud
app.patch("/api/solicitudes-adopcion/:id/estado", requiereLogin, async (req, res) => {
    const idSolicitud = Number(req.params.id);
    const { estadoSolicitud } = req.body;
    const estadosPermitidos = ["contactada", "aceptada", "rechazada"];

    if (!Number.isInteger(idSolicitud) || idSolicitud <= 0) {
        return res.status(400).json({ mensaje: "El número de solicitud no es válido." });
    }
    if (!estadosPermitidos.includes(estadoSolicitud)) {
        return res.status(400).json({ mensaje: "El estado enviado no es válido." });
    }

    try {
        const [resultado] = await conexion.execute(
            "UPDATE solicitudesAdopcion SET estadoSolicitud = ? WHERE idSolicitud = ?",
            [estadoSolicitud, idSolicitud]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ mensaje: "No se encontró esa solicitud." });
        }

        res.json({ mensaje: "El estado de la solicitud se actualizó a " + estadoSolicitud + "." });
    } catch (error) {
        console.error("Error al actualizar la solicitud:", error.message);
        res.status(500).json({ mensaje: "No se pudo actualizar la solicitud." });
    }
});

// ============================================
// 7. INICIAR SERVIDOR
// ============================================
app.listen(puerto, () => {
    console.log("Servidor iniciado en http://localhost:" + puerto);
});