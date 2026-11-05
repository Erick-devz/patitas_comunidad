const formularioReporte = document.getElementById("formularioReporte");

formularioReporte.addEventListener("submit", function(evento) {
    evento.preventDefault();

    if (!formularioReporte.checkValidity()) {
        formularioReporte.reportValidity();
        return;
    }

    const tipoAnimal = document.getElementById("tipoAnimal").value.trim();
    const descripcion = document.getElementById("descripcion").value.trim();
    const zona = document.getElementById("zona").value.trim();

    if (tipoAnimal === "" || descripcion === "" || zona === "") {
        alert("Completa los datos obligatorios. No escribas solo espacios.");
        return;
    }

    alert("Los datos se revisaron correctamente. Todavía no se guardan; eso lo conectaremos después.");
});