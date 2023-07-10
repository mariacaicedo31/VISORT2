let mapa = L.map("contenedor-mapa").setView([3.4528117, -76.560031], 17)
//poner layers en el mapa
let basemap = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png?", {}).addTo(mapa)

var carto_light = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { attribution: '@OpenStreetMap, @CartoDB', subdomans: 'abcd', maxZoom: 24 });

var minimap = new L.control.minimap(carto_light,
  {
    toggleDisplay: true,
    minimized: false,
    position: "bottomleft"
  }).addTo(mapa);

//escala
//var escala = L.map('escala').setView([30.182505,-93.318665], 12);        
var escala = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  {
    maxZoom: 18,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(mapa);
L.control.betterscale().addTo(mapa);

//CAPA IDES WMS
var comunaWMS = L.tileLayer.wms('http://ws-idesc.cali.gov.co:8081/geoserver/idesc/wms', {
  layers: 'mc_comunas',
  format: 'image/svg',
  transparent: true,
  CQL_FILTER: "comuna=1"
}).addTo(mapa);

var selectedPunto = null;
var editarBtn = null;
var lat, lng;
var editar = true;
var nuevoMarcador = null;
var parques = [];
var restaurantes = [];
var bares = [];
var routingControl = null;

//Todo esto se ejecuta despues de cargar el html
window.addEventListener("DOMContentLoaded", function () {
  // Realiza una petición GET al backend local para obtener todos los puntos
  getPuntos();
  rutaBtn = document.getElementById("ruta-btn");
  rutaBtn.addEventListener("click", crearRuta);
  editarBtn = document.getElementById("editar-btn");
  editarBtn.addEventListener("click", editarPunto);
});

function editarPunto() {
  // Obtener los nuevos valores de los campos del formulario
  var nombre = document.getElementById("nombre").value;
  var tipo = document.getElementById("tipo").value;
  var descripcion = document.getElementById("descripcion").value;
  var cx = document.getElementById("cx").value;
  var cy = document.getElementById("cy").value;

  // Crear el objeto de datos a enviar en la solicitud de actualización
  var data = {
    punto: {
      nombre: nombre,
      tipo: tipo,
      descripcion: descripcion,
      cx: cx,
      cy: cy
    }
  };

  if (selectedPunto && editar) {
    fetch("http://localhost:3000/puntos/" + selectedPunto.id, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    })
      .then(function (response) {
        if (response.ok) {
          return response.json();
        } else {
          throw new Error("Error al actualizar el punto.");
        }
      })
      .then(function (updatedPunto) {
        // Actualizar la información del punto seleccionado
        selectedPunto.nombre = updatedPunto.nombre;
        selectedPunto.tipo = updatedPunto.tipo;
        selectedPunto.descripcion = updatedPunto.descripcion;
        selectedPunto.cx = updatedPunto.cx;
        selectedPunto.cy = updatedPunto.cy;

        // selectedPunto = updatedPunto;
        llenarCampos(updatedPunto);

        // Deshabilitar la edición de los campos del formulario
        deshabilitarCampos(true);
      })
      .catch(function (error) {
        console.error("Error de conexión:", error);
      });
  }
  else {
    fetch("http://localhost:3000/puntos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    })
      .then(function (response) {
        if (response.ok) {
          return response.json();
        } else {
          throw new Error("Error al actualizar el punto.");
        }
      })
      .then(function (updatedPunto) {
        // Actualizar la información del punto seleccionado
        selectedPunto = updatedPunto

        llenarCampos(updatedPunto);

        deshabilitarCampos(true);

        crearMarcador(updatedPunto);
        // agregarClickMarcador(nuevoMarcador, updatedPunto)
      })
      .catch(function (error) {
        console.error("Error de conexión:", error);
      });
  }
};

// para obtener las coordenadas del mapa al hacer click derecho
mapa.addEventListener('mousemove', function (ev) {
  lat = ev.latlng.lat;
  lng = ev.latlng.lng;
});

document.getElementById("contenedor-mapa").addEventListener("contextmenu", function (event) {
  // Prevent the browser's context menu from appearing
  event.preventDefault();

  // Add marker
  nuevoMarcador = L.marker([lat, lng]).addTo(mapa);
  limpiarCampos();
  editar = false;
  document.getElementById("editar-btn").innerHTML = "Crear";
  coordinates();
  deshabilitarCampos(false);
  return false; // To disable default popup.
});

function coordinates() {
  document.getElementById("cx").value = lng;
  document.getElementById("cy").value = lat;
}

function getPuntos() {

  fetch("http://localhost:3000/puntos")
    .then(function (response) {
      if (response.ok) {
        return response.json();
      } else {
        throw new Error("Error al obtener los puntos.");
      }
    })
    .then(function (data) {
      // Se recorre todos los puntos que vienen de base de datos para ponerlos en el mapa
      data.forEach(punto => {
        console.log(punto)
        crearMarcador(punto)
      });
    })
    .catch(function (error) {
      console.error("Error de conexión:", error);
    });
}

// Habilitar o dehabilitar la edición de los campos del formulario
function deshabilitarCampos(habilitar) {
  document.getElementById("nombre").readOnly = habilitar;
  document.getElementById("tipo").readOnly = habilitar;
  document.getElementById("descripcion").readOnly = habilitar;
  document.getElementById("cx").readOnly = habilitar;
  document.getElementById("cy").readOnly = habilitar;
}

// Llena los campos del formulario con el punto que le pasemos
function llenarCampos(punto) {
  document.getElementById("nombre").value = punto.nombre;
  document.getElementById("tipo").value = punto.tipo;
  document.getElementById("descripcion").value = punto.descripcion;
  document.getElementById("cx").value = punto.cx;
  document.getElementById("cy").value = punto.cy;
}

// Quita toda la información en el formulario
function limpiarCampos() {
  document.getElementById("nombre").value = '';
  document.getElementById("tipo").value = '';
  document.getElementById("descripcion").value = '';
  document.getElementById("cx").value = '';
  document.getElementById("cy").value = '';
}

// Agrega el evento click al marcador para mostrar el popup y agregar su información en el formulario de edición
function agregarClickMarcador(marcador, punto) {
  marcador.on("click", function (e) {
    document.getElementById("editar-btn").innerHTML = "Editar";
    editar = true;
    selectedPunto = punto
    marcador.bindPopup("<b>" + punto.nombre + "</b><br>" + punto.descripcion);

    llenarCampos(punto);

    deshabilitarCampos(false);
  });
}

function crearMarcador(punto) {
  let marker = null;
  if (punto.tipo == "bar") {
    bares.push(punto)
    marker = L.marker([parseFloat(punto.cy), parseFloat(punto.cx)], { icon: goldIcon }).addTo(mapa);
  }
  else if (punto.tipo == "restaurante") {
    restaurantes.push(punto)
    marker = L.marker([parseFloat(punto.cy), parseFloat(punto.cx)], { icon: orangeIcon }).addTo(mapa);
  }
  else if (punto.tipo == "parque") {
    parques.push(punto)
    console.log("test", parques)
    marker = L.marker([parseFloat(punto.cy), parseFloat(punto.cx)], { icon: greenIcon }).addTo(mapa);
  }
  else {
    marker = L.marker([parseFloat(punto.cy), parseFloat(punto.cx)]).addTo(mapa);
  }
  marker.bindPopup("<b>" + punto.nombre + "</b><br>" + punto.descripcion);
  agregarClickMarcador(marker, punto);
}

function crearRuta() {
  if(routingControl){
    mapa.removeControl(routingControl);
    routingControl = null;
  }
  let tipoRuta = document.getElementById("tipo-ruta").value;
  let list = []
  console.log('parques', parques)
  if (tipoRuta == "bar") {
    list = bares
  }
  else if (tipoRuta == "restaurante") {
    list = restaurantes
  }
  else if (tipoRuta == "parque") {
    list = parques
  }

  routingControl = L.Routing.control({
    waypoints: list.map(punto => L.latLng(punto.cy, punto.cx))
  }).addTo(mapa);
}
